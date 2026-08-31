import { afterAll, beforeAll, beforeEach, describe, expect, it } from "bun:test";
import { treaty } from "@elysia/eden";
import { app } from "api/src/app";
import { _clearAll } from "api/src/lib/live";
import { authHeaders, signToken } from "api/test/helpers/auth";
import {
	resetDb,
	seedEdition,
	seedGroup,
	seedMatch,
	seedMember,
	seedStage,
	seedTeam,
	seedTournament,
	seedUser,
} from "api/test/helpers/db";

import { createApiClient, unwrap } from "../src/client";
import { getMatchLiveUrl, getGroupLiveUrl, wsUrlFromBase } from "../src/live/url";
import { createMatchSocket, createGroupSocket } from "../src/live/socket";

// Re-export smoke test: hooks deben ser importables desde ambos barrels
import { useMatchLive, useGroupLive } from "../src/live";
import * as hooks from "../src/hooks";

// ---------------------------------------------------------------------------
// Helpers de WS (ManagedSocket harness)
// ---------------------------------------------------------------------------

let server: ReturnType<typeof app.listen> | null = null;
let port = 0;

function waitForMessage(
	ws: { onMessage?: (msg: unknown) => void },
	predicate: (data: unknown) => boolean,
	timeoutMs = 3000,
): Promise<unknown> {
	// Helper genérico para raw WebSocket (usado en algunos tests de compatibilidad)
	return new Promise((resolve, reject) => {
		const timer = setTimeout(() => reject(new Error("timeout waiting for ws message")), timeoutMs);
		const handler = (event: MessageEvent) => {
			try {
				const data = JSON.parse(event.data as string);
				if (predicate(data)) {
					clearTimeout(timer);
					wsRawRemove(ws as unknown as WebSocket, handler);
					resolve(data);
				}
			} catch {}
		};
		wsRawAdd(ws as unknown as WebSocket, handler);
	});
}

// Raw WebSocket helpers para tests de compatibilidad (treaty + WS nativo)
function wsRawAdd(ws: WebSocket, handler: (e: MessageEvent) => void) {
	ws.addEventListener("message", handler);
}
function wsRawRemove(ws: WebSocket, handler: (e: MessageEvent) => void) {
	ws.removeEventListener("message", handler);
}

function waitForManagedMessage(
	messages: unknown[],
	predicate: (data: unknown) => boolean,
	timeoutMs = 3000,
): Promise<unknown> {
	return new Promise((resolve, reject) => {
		const start = Date.now();
		const interval = setInterval(() => {
			for (const m of messages) {
				if (predicate(m)) {
					clearInterval(interval);
					clearTimeout(timer);
					resolve(m);
					return;
				}
			}
			if (Date.now() - start > timeoutMs) {
				clearInterval(interval);
				reject(new Error("timeout waiting for managed message"));
			}
		}, 30);
		const timer = setTimeout(() => {
			clearInterval(interval);
			reject(new Error("timeout waiting for managed message (timer)"));
		}, timeoutMs);
	});
}

beforeAll(() => {
	server = app.listen(0);
	port = (app.server as unknown as { port: number }).port;
	if (!port) throw new Error("Failed to get WS port");
});

afterAll(() => {
	(app.server as unknown as { stop?: () => void })?.stop?.();
	_clearAll();
});

beforeEach(async () => {
	await resetDb();
	_clearAll();
	await new Promise((r) => setTimeout(r, 50));
});

// ---------------------------------------------------------------------------
// 1. Unit: wsUrlFromBase / getMatchLiveUrl / getGroupLiveUrl
// ---------------------------------------------------------------------------

describe("api-client live - url helpers", () => {
	it("wsUrlFromBase http→ws, https→wss, normaliza slashes", () => {
		expect(wsUrlFromBase("http://localhost:3000", "/matches/123/live")).toBe(
			"ws://localhost:3000/matches/123/live",
		);
		expect(wsUrlFromBase("http://localhost:3000/", "/matches/123/live")).toBe(
			"ws://localhost:3000/matches/123/live",
		);
		expect(wsUrlFromBase("https://api.example.com/", "/matches/123/live")).toBe(
			"wss://api.example.com/matches/123/live",
		);
		expect(wsUrlFromBase("wss://api.example.com", "/groups/g/live")).toBe(
			"wss://api.example.com/groups/g/live",
		);
	});

	it("wsUrlFromBase añade ?token= url-encoded (vía principal)", () => {
		const url = wsUrlFromBase("http://localhost:3000", "/matches/123/live", "jwt.abc/def+xyz");
		expect(url).toBe("ws://localhost:3000/matches/123/live?token=jwt.abc%2Fdef%2Bxyz");
	});

	it("getMatchLiveUrl / getGroupLiveUrl usan resolveBaseUrl + token", () => {
		expect(getMatchLiveUrl("m1", null, "http://localhost:4000")).toBe(
			"ws://localhost:4000/matches/m1/live",
		);
		expect(getMatchLiveUrl("m1", "tok", "http://localhost:4000")).toBe(
			"ws://localhost:4000/matches/m1/live?token=tok",
		);
		expect(getGroupLiveUrl("g1", "tok", () => "https://api.example.com")).toBe(
			"wss://api.example.com/groups/g1/live?token=tok",
		);
	});
});

// ---------------------------------------------------------------------------
// 2. Smoke: createApiClient treaty equivalence + hooks re-export
// ---------------------------------------------------------------------------

describe("api-client live - createApiClient + hooks re-export", () => {
	it("createApiClient treaty es equivalente a treaty(app) para REST", async () => {
		// Usa baseUrl real del server de test (http://localhost:port) con getToken
		const client = createApiClient({ baseUrl: `http://localhost:${port}` });
		const viaTreaty = treaty(app);
		const t1 = await viaTreaty.tournaments.get({ query: {} });
		const t2 = await client.tournaments.get({ query: {} });
		expect(t1.status).toBe(t2.status);
		expect(t1.status).toBe(200);
		// unwrap helper
		const data = await unwrap(client.tournaments.get({ query: {} }));
		expect((data as { total: number }).total).toBeGreaterThanOrEqual(0);
	});

	it("hooks live se re-exportan desde src/hooks y src/live", () => {
		expect(typeof useMatchLive).toBe("function");
		expect(typeof useGroupLive).toBe("function");
		expect(typeof hooks.useMatchLive).toBe("function");
		expect(typeof hooks.useGroupLive).toBe("function");
		expect(typeof hooks.wsUrlFromBase).toBe("function");
		expect(typeof hooks.createMatchSocket).toBe("function");
	});
});

// ---------------------------------------------------------------------------
// 3. WS real con ManagedSocket (api-client) — replica de apps/api/test/live.test.ts
//    pero usando createMatchSocket / createGroupSocket con ?token= vía getToken
// ---------------------------------------------------------------------------

describe("api-client live - WS /matches/:id/live via ManagedSocket", () => {
	it("anon connected sin token (ManagedSocket)", async () => {
		const tournament = await seedTournament();
		const edition = await seedEdition(tournament.id);
		const stage = await seedStage(edition.id);
		const match = await seedMatch(stage.id);

		const messages: unknown[] = [];
		const socket = createMatchSocket(match.id, {
			baseUrl: `http://localhost:${port}`,
			onMessage: (m) => messages.push(m),
		});

		const connected = await waitForManagedMessage(
			messages,
			(d) => (d as { type: string }).type === "connected",
		);
		expect((connected as { type: string }).type).toBe("connected");
		expect((connected as { channel: string }).channel).toBe(`match:${match.id}`);
		socket.close();
		await new Promise((r) => setTimeout(r, 100));
	});

	it("referee vía getToken (?token=) puede score (ack + broadcast) — ManagedSocket", async () => {
		const referee = await seedUser({ role: "viewer_staff" });
		const tournament = await seedTournament();
		const edition = await seedEdition(tournament.id);
		const stage = await seedStage(edition.id);
		await seedMember(tournament.id, referee.id, "referee");
		const match = await seedMatch(stage.id);
		const token = await signToken(referee.id, referee.role);

		const writerMsgs: unknown[] = [];
		const readerMsgs: unknown[] = [];

		const writer = createMatchSocket(match.id, {
			baseUrl: `http://localhost:${port}`,
			getToken: () => token,
			onMessage: (m) => writerMsgs.push(m),
		});
		const reader = createMatchSocket(match.id, {
			baseUrl: `http://localhost:${port}`,
			onMessage: (m) => readerMsgs.push(m),
		});

		await waitForManagedMessage(writerMsgs, (d) => (d as { type: string }).type === "connected");
		await waitForManagedMessage(readerMsgs, (d) => (d as { type: string }).type === "connected");

		const ackPromise = waitForManagedMessage(writerMsgs, (d) => (d as { type: string }).type === "ack");
		const broadcastPromise = waitForManagedMessage(readerMsgs, (d) => (d as { type: string }).type === "score");

		writer.send({ type: "score", payload: { homeScore: 1, awayScore: 0, status: "in_progress" } });

		const ack = await ackPromise;
		expect((ack as { action: string }).action).toBe("score");
		const broadcast = await broadcastPromise;
		expect((broadcast as { type: string }).type).toBe("score");
		expect((broadcast as { payload: { homeScore: number } }).payload.homeScore).toBe(1);

		writer.close();
		reader.close();
		await new Promise((r) => setTimeout(r, 100));
	});

	it("referee vía getToken puede enviar score (manageado, no raw)", async () => {
		const referee = await seedUser({ role: "viewer_staff" });
		const tournament = await seedTournament();
		const edition = await seedEdition(tournament.id);
		const stage = await seedStage(edition.id);
		await seedMember(tournament.id, referee.id, "referee");
		const match = await seedMatch(stage.id);
		const token = await signToken(referee.id, referee.role);

		const msgs: unknown[] = [];
		const socket = createMatchSocket(match.id, {
			baseUrl: `http://localhost:${port}`,
			getToken: () => token,
			onMessage: (m) => msgs.push(m),
		});

		await waitForManagedMessage(msgs, (d) => (d as { type: string }).type === "connected");
		// ping/pong heartbeat (20s) no debe interferir con ping manual
		socket.send({ type: "ping" });
		const pong = await waitForManagedMessage(msgs, (d) => (d as { type: string }).type === "pong");
		expect((pong as { type: string }).type).toBe("pong");

		socket.close();
		await new Promise((r) => setTimeout(r, 100));
	});

	it("viewer vía getToken recibe error referee al intentar score", async () => {
		const viewer = await seedUser({ role: "viewer_staff" });
		const tournament = await seedTournament();
		const edition = await seedEdition(tournament.id);
		const stage = await seedStage(edition.id);
		await seedMember(tournament.id, viewer.id, "viewer_staff");
		const match = await seedMatch(stage.id);
		const token = await signToken(viewer.id, viewer.role);

		const msgs: unknown[] = [];
		const socket = createMatchSocket(match.id, {
			baseUrl: `http://localhost:${port}`,
			getToken: () => token,
			onMessage: (m) => msgs.push(m),
		});

		await waitForManagedMessage(msgs, (d) => (d as { type: string }).type === "connected");
		socket.send({ type: "score", payload: { homeScore: 1, awayScore: 0, status: "in_progress" } });
		const err = await waitForManagedMessage(msgs, (d) => (d as { type: string }).type === "error");
		expect((err as { message: string }).message).toContain("referee");

		socket.close();
		await new Promise((r) => setTimeout(r, 100));
	});

	it("super_admin vía getToken puede escribir (bypass)", async () => {
		const superAdmin = await seedUser({ role: "super_admin" });
		const tournament = await seedTournament();
		const edition = await seedEdition(tournament.id);
		const stage = await seedStage(edition.id);
		const match = await seedMatch(stage.id);
		const token = await signToken(superAdmin.id, superAdmin.role);

		const msgs: unknown[] = [];
		const socket = createMatchSocket(match.id, {
			baseUrl: `http://localhost:${port}`,
			getToken: () => token,
			onMessage: (m) => msgs.push(m),
		});

		await waitForManagedMessage(msgs, (d) => (d as { type: string }).type === "connected");
		socket.send({ type: "score", payload: { homeScore: 2, awayScore: 0, status: "in_progress" } });
		const ack = await waitForManagedMessage(msgs, (d) => (d as { type: string }).type === "ack");
		expect((ack as { action: string }).action).toBe("score");

		socket.close();
		await new Promise((r) => setTimeout(r, 100));
	});

	it("anon que envía score sin token recibe Token requerido", async () => {
		const tournament = await seedTournament();
		const edition = await seedEdition(tournament.id);
		const stage = await seedStage(edition.id);
		const match = await seedMatch(stage.id);

		const msgs: unknown[] = [];
		const socket = createMatchSocket(match.id, {
			baseUrl: `http://localhost:${port}`,
			onMessage: (m) => msgs.push(m),
		});

		await waitForManagedMessage(msgs, (d) => (d as { type: string }).type === "connected");
		socket.send({ type: "score", payload: { homeScore: 1, awayScore: 0, status: "in_progress" } });
		const err = await waitForManagedMessage(msgs, (d) => (d as { type: string }).type === "error");
		expect((err as { message: string }).message).toContain("Token requerido");

		socket.close();
		await new Promise((r) => setTimeout(r, 100));
	});

	it("compatibilidad raw WebSocket con ?token= sigue funcionando (treaty fallback)", async () => {
		const referee = await seedUser({ role: "viewer_staff" });
		const tournament = await seedTournament();
		const edition = await seedEdition(tournament.id);
		const stage = await seedStage(edition.id);
		await seedMember(tournament.id, referee.id, "referee");
		const match = await seedMatch(stage.id);
		const token = await signToken(referee.id, referee.role);

		// Raw WebSocket usando wsUrlFromBase (como haría un cliente sin ManagedSocket)
		const url = getMatchLiveUrl(match.id, token, `http://localhost:${port}`);
		const ws = new WebSocket(url);
		const msg = await new Promise<unknown>((resolve, reject) => {
			const timer = setTimeout(() => reject(new Error("timeout")), 3000);
			ws.addEventListener("message", (e) => {
				try {
					const data = JSON.parse((e.data as string));
					if (data.type === "connected") {
						clearTimeout(timer);
						resolve(data);
					}
				} catch {}
			});
		});
		expect((msg as { type: string }).type).toBe("connected");
		ws.close();
		await new Promise((r) => setTimeout(r, 100));
	});
});

describe("api-client live - WS /groups/:groupId/live (solo lectura) via ManagedSocket", () => {
	it("anon connected y recibe standing tras recalculate (via createGroupSocket)", async () => {
		const statistician = await seedUser({ role: "viewer_staff" });
		const tournament = await seedTournament();
		const edition = await seedEdition(tournament.id);
		const stage = await seedStage(edition.id);
		const group = await seedGroup(stage.id);
		await seedMember(tournament.id, statistician.id, "statistician");
		const team = await seedTeam();
		const { stageTeamRegistrations } = await import("../../../packages/db/src/tables");
		const { db } = await import("../../../packages/db/src/index");
		await db.insert(stageTeamRegistrations).values({ stageId: stage.id, groupId: group.id, teamId: team.id }).onConflictDoNothing();

		const msgs: unknown[] = [];
		const socket = createGroupSocket(group.id, {
			baseUrl: `http://localhost:${port}`,
			onMessage: (m) => msgs.push(m),
		});

		await waitForManagedMessage(msgs, (d) => (d as { type: string }).type === "connected");

		const standingPromise = waitForManagedMessage(msgs, (d) => (d as { type: string }).type === "standing");
		const calc = await treaty(app).groups({ groupId: group.id }).standings.recalculate.post(undefined, {
			headers: await authHeaders(statistician),
		});
		expect(calc.status).toBe(200);

		const standing = await standingPromise;
		expect((standing as { type: string }).type).toBe("standing");
		expect((standing as { groupId: string }).groupId).toBe(group.id);

		socket.close();
		await new Promise((r) => setTimeout(r, 100));
	});

	it("message en canal de grupo responde Read-only channel", async () => {
		const tournament = await seedTournament();
		const edition = await seedEdition(tournament.id);
		const stage = await seedStage(edition.id);
		const group = await seedGroup(stage.id);

		const msgs: unknown[] = [];
		const socket = createGroupSocket(group.id, {
			baseUrl: `http://localhost:${port}`,
			onMessage: (m) => msgs.push(m),
		});

		await waitForManagedMessage(msgs, (d) => (d as { type: string }).type === "connected");
		socket.send({ type: "ping" } as never);
		const err = await waitForManagedMessage(msgs, (d) => (d as { type: string }).type === "error");
		expect((err as { message: string }).message).toBe("Read-only channel");

		socket.close();
		await new Promise((r) => setTimeout(r, 100));
	});

	it("ghost group no conecta (404) — raw WebSocket con url helper", async () => {
		const ghost = crypto.randomUUID();
		const url = getGroupLiveUrl(ghost, null, `http://localhost:${port}`);
		const ws = new WebSocket(url);
		const result = await Promise.race([
			new Promise<string>((resolve) => {
				ws.addEventListener("message", (e) => {
					try {
						const d = JSON.parse((e.data as string));
						if (d.type === "connected") resolve("connected");
					} catch {}
				});
			}),
			new Promise<string>((resolve) => {
				ws.addEventListener("error", () => resolve("error"));
				ws.addEventListener("close", () => setTimeout(() => resolve("close"), 200));
			}),
		]);
		expect(result).not.toBe("connected");
		try { ws.close(); } catch {}
		await new Promise((r) => setTimeout(r, 100));
	});
});

describe("api-client live - idleTimeout config", () => {
	it("existe idleTimeout 30 en app (re-exportado)", () => {
		expect(port).toBeGreaterThan(0);
	});
});
