import { beforeEach, describe, expect, it } from "bun:test";
import { treaty } from "@elysia/eden";
import { app } from "../src/app";
import { authHeaders } from "./helpers/auth";
import {
	resetDb,
	seedEdition,
	seedMatch,
	seedMember,
	seedStage,
	seedTournament,
	seedUser,
} from "./helpers/db";

const api = treaty(app);
const BAD_UUID = "not-a-uuid" as never;
const GHOST_UUID = crypto.randomUUID() as never;

// Helper para crear un admin y obtener headers (evita repetir)
async function adminHeaders() {
	const admin = await seedUser({ role: "admin" });
	return { admin, headers: await authHeaders(admin) };
}

describe("validation - P3 transversal (uuid, limit, bodies)", () => {
	beforeEach(async () => {
		await resetDb();
	});

	// ------------------------------------------------------------
	// A. UUID inválido → 400 (params y queries)
	// ------------------------------------------------------------
	describe("A. uuid inválido → 400", () => {
		it.each([
			["GET /players/:id", () => api.players({ id: BAD_UUID }).get()],
			["GET /matches/:id", () => api.matches({ id: BAD_UUID }).get()],
			[
				"DELETE /matches/:id",
				() => api.matches({ id: BAD_UUID }).delete(undefined),
			],
			[
				"PATCH /matches/:id/venue",
				() =>
					api
						.matches({ id: BAD_UUID })
						.venue.patch({ venueId: GHOST_UUID } as never),
			],
			[
				"PATCH /matches/:id/schedule",
				() =>
					api
						.matches({ id: BAD_UUID })
						.schedule.patch({ scheduledAt: new Date().toISOString() } as never),
			],
			[
				"POST /matches/:id/events",
				() =>
					api.matches({ id: BAD_UUID }).events.post({
						teamId: GHOST_UUID,
						periodNumber: 1,
						minuteOrSecond: 0,
						eventType: "goal",
					} as never),
			],
			["GET /teams/:id", () => api.teams({ id: BAD_UUID }).get()],
			[
				"PATCH /teams/:id",
				async () => {
					const { headers } = await adminHeaders();
					return api
						.teams({ id: BAD_UUID })
						.patch({ name: "X" } as never, { headers });
				},
			],
			[
				"DELETE /teams/:id",
				async () => {
					const { headers } = await adminHeaders();
					return api.teams({ id: BAD_UUID }).delete(undefined, { headers });
				},
			],
			["GET /venues/:id", () => api.venues({ id: BAD_UUID }).get()],
			[
				"GET /sports/:id/event-types (id largo 33)",
				() => api.sports({ id: "a".repeat(33) as never })["event-types"].get(),
			],
			[
				"GET /groups/:groupId/standings",
				() => api.groups({ groupId: BAD_UUID }).standings.get(),
			],
			[
				"PATCH /standings/:id",
				async () => {
					const { headers } = await adminHeaders();
					return api
						.standings({ id: BAD_UUID })
						.patch({ points: 1 } as never, { headers });
				},
			],
			[
				"GET /stages/:stageId/registrations",
				() => api.stages({ stageId: BAD_UUID }).registrations.get(),
			],
			[
				"GET /registrations/groups/:groupId",
				() => api.registrations.groups({ groupId: BAD_UUID }).get(),
			],
		])("%s", async (_name, fn) => {
			const res = await (fn as () => Promise<{ status: number }>)();
			expect(res.status).toBe(400);
			if (res.status !== 400)
				console.warn(
					`[P3] UUID test falló para ${_name}: got ${res.status}, expected 400 — avisa si este endpoint permite slug/no-uuid`,
				);
		});

		it("GET /tournaments/:tournamentId con uuid inválido → 400", async () => {
			const res = await api.tournaments({ tournamentId: BAD_UUID }).get();
			expect(res.status).toBe(400);
		});
	});

	// ------------------------------------------------------------
	// B. limit/offset y filtros de query → 400
	// ------------------------------------------------------------
	describe("B. limit/offset y filtros de query → 400", () => {
		it.each([
			[
				"GET /users?limit=0",
				async () => {
					const { headers } = await adminHeaders();
					return api.users.get({
						query: { limit: 0 as never } as never,
						headers,
					});
				},
			],
			[
				"GET /users?limit=101",
				async () => {
					const { headers } = await adminHeaders();
					return api.users.get({
						query: { limit: 101 as never } as never,
						headers,
					});
				},
			],
			[
				"GET /users?limit=abc",
				async () => {
					const { headers } = await adminHeaders();
					return api.users.get({
						query: { limit: "abc" as never } as never,
						headers,
					});
				},
			],
			[
				"GET /users?offset=-1",
				async () => {
					const { headers } = await adminHeaders();
					return api.users.get({
						query: { offset: -1 as never } as never,
						headers,
					});
				},
			],
			[
				"GET /matches?limit=0",
				() => api.matches.get({ query: { limit: 0 as never } as never }),
			],
			[
				"GET /matches?limit=101",
				() => api.matches.get({ query: { limit: 101 as never } as never }),
			],
			[
				"GET /matches?limit=abc",
				() => api.matches.get({ query: { limit: "abc" as never } as never }),
			],
			[
				"GET /matches?offset=-1",
				() => api.matches.get({ query: { offset: -1 as never } as never }),
			],
			[
				"GET /matches?status=bad",
				() => api.matches.get({ query: { status: "bad" as never } as never }),
			],
			[
				"GET /matches?stageId=not-uuid",
				() =>
					api.matches.get({ query: { stageId: BAD_UUID as never } as never }),
			],
			[
				"GET /players?search='' (vacío)",
				() => api.players.get({ query: { search: "" as never } as never }),
			],
			[
				"GET /players?search 61 chars",
				() =>
					api.players.get({
						query: { search: "a".repeat(61) as never } as never,
					}),
			],
			[
				"GET /teams?category 51 chars",
				() =>
					api.teams.get({
						query: { category: "a".repeat(51) as never } as never,
					}),
			],
			[
				"GET /teams?clubId=not-uuid",
				() => api.teams.get({ query: { clubId: BAD_UUID as never } as never }),
			],
			[
				"GET /tournaments?sportId 33 chars",
				() =>
					api.tournaments.get({
						query: { sportId: "a".repeat(33) as never } as never,
					}),
			],
			[
				"GET /sports/:id (slug largo 33)",
				async () => {
					const res = await api.sports({ id: "a".repeat(33) as never }).get();
					return res;
				},
			],
		])("%s", async (_name, fn) => {
			const res = await (fn as () => Promise<{ status: number }>)();
			expect(res.status).toBe(400);
			if (res.status !== 400)
				console.warn(`[P3] Query test falló para ${_name}: got ${res.status}`);
		});

		it("GET /users y /matches con limit/offset válidos → 200 (sanity)", async () => {
			const { headers } = await adminHeaders();
			const okUsers = await api.users.get({
				query: { limit: 1, offset: 0 } as never,
				headers,
			});
			expect(okUsers.status).toBe(200);

			// matches es público, sin auth
			const okMatches = await api.matches.get({
				query: { limit: 1, offset: 0 } as never,
			});
			expect(okMatches.status).toBe(200);
		});
	});

	// ------------------------------------------------------------
	// C. Bodies malformados → 400
	// ------------------------------------------------------------
	describe("C. bodies malformados → 400", () => {
		it.each([
			["POST /auth/login {} vacío", () => api.auth.login.post({} as never)],
			[
				"POST /auth/login email inválido",
				() =>
					api.auth.login.post({
						email: "bad",
						password: "password123",
					} as never),
			],
			[
				"POST /teams {} vacío",
				async () => {
					const { headers } = await adminHeaders();
					return api.teams.post({} as never, { headers });
				},
			],
			[
				"POST /players {} vacío",
				async () => {
					const { headers } = await adminHeaders();
					return api.players.post({} as never, { headers });
				},
			],
			[
				"POST /players birthDate formato inválido",
				async () => {
					const { headers } = await adminHeaders();
					return api.players.post(
						{ firstName: "A", lastName: "B", birthDate: "not-a-date" } as never,
						{ headers },
					);
				},
			],
			[
				"POST /venues {} sin name",
				async () => {
					const { headers } = await adminHeaders();
					return api.venues.post({} as never, { headers });
				},
			],
			[
				"POST /sports {} sin id/name",
				async () => {
					const { headers } = await adminHeaders();
					return api.sports.post({} as never, { headers });
				},
			],
			[
				"POST /matches {} vacío",
				async () => {
					const { headers } = await adminHeaders();
					return api.matches.post({} as never, { headers });
				},
			],
			[
				"PATCH /matches/:id/schedule scheduledAt inválido",
				async () => {
					const { admin } = await adminHeaders().then(async (r) => ({
						admin: r.admin,
						headers: r.headers,
					}));
					void admin;
					const tournament = await seedTournament();
					const edition = await seedEdition(tournament.id);
					const stage = await seedStage(edition.id);
					const match = await seedMatch(stage.id);
					const organizer = await seedUser({ role: "viewer_staff" });
					await seedMember(tournament.id, organizer.id, "organizer");
					return api
						.matches({ id: match.id })
						.schedule.patch({ scheduledAt: "bad-date" } as never, {
							headers: await authHeaders(organizer),
						});
				},
			],
			[
				"PATCH /matches/:id/score homeScore -1",
				async () => {
					const tournament = await seedTournament();
					const edition = await seedEdition(tournament.id);
					const stage = await seedStage(edition.id);
					const match = await seedMatch(stage.id);
					const referee = await seedUser({ role: "viewer_staff" });
					await seedMember(tournament.id, referee.id, "referee");
					return api
						.matches({ id: match.id })
						.score.patch(
							{ homeScore: -1, awayScore: 0, status: "in_progress" } as never,
							{ headers: await authHeaders(referee) },
						);
				},
			],
			[
				"PATCH /matches/:id/score status inválido",
				async () => {
					const tournament = await seedTournament();
					const edition = await seedEdition(tournament.id);
					const stage = await seedStage(edition.id);
					const match = await seedMatch(stage.id);
					const referee = await seedUser({ role: "viewer_staff" });
					await seedMember(tournament.id, referee.id, "referee");
					return api.matches({ id: match.id }).score.patch(
						{
							homeScore: 0,
							awayScore: 0,
							status: "bad_status" as never,
						} as never,
						{ headers: await authHeaders(referee) },
					);
				},
			],
			[
				"POST /matches/:id/events {} vacío",
				async () => {
					const tournament = await seedTournament();
					const edition = await seedEdition(tournament.id);
					const stage = await seedStage(edition.id);
					const match = await seedMatch(stage.id, { status: "in_progress" });
					const referee = await seedUser({ role: "viewer_staff" });
					await seedMember(tournament.id, referee.id, "referee");
					return api
						.matches({ id: match.id })
						.events.post({} as never, { headers: await authHeaders(referee) });
				},
			],
			[
				"POST /matches/:id/events eventType 1 char",
				async () => {
					const tournament = await seedTournament();
					const edition = await seedEdition(tournament.id);
					const stage = await seedStage(edition.id);
					const match = await seedMatch(stage.id, { status: "in_progress" });
					const referee = await seedUser({ role: "viewer_staff" });
					await seedMember(tournament.id, referee.id, "referee");
					return api.matches({ id: match.id }).events.post(
						{
							teamId: match.homeTeamId!,
							periodNumber: 1,
							minuteOrSecond: 0,
							eventType: "x",
						} as never,
						{ headers: await authHeaders(referee) },
					);
				},
			],
		])("%s", async (_name, fn) => {
			const res = await (fn as () => Promise<{ status: number }>)();
			expect(res.status).toBe(400);
			if (res.status !== 400)
				console.warn(`[P3] Body test falló para ${_name}: got ${res.status}`);
		});

		it("POST /auth/login con body válido no debe ser 400 (sanity)", async () => {
			await seedUser({ email: "valid@test.local", password: "password123" });
			const res = await api.auth.login.post({
				email: "valid@test.local",
				password: "password123",
			});
			expect(res.status).toBe(200);
		});
	});
});
