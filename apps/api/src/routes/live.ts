import {
	matchIdParamsSchema,
	recordLiveEventSchema,
	updateMatchScoreSchema,
} from "@sports/schemas";
import { Elysia, t } from "elysia";
import { accessTokenJwt } from "../lib/jwt";
import {
	subscribeGroup,
	subscribeMatch,
	unsubscribeGroup,
	unsubscribeMatch,
} from "../lib/live";
import { DomainError } from "../services/errors";
import {
	findMatchById,
	recordLiveEvent,
	updateMatchScore,
} from "../services/match.service";
import { getMatchTournamentId } from "../services/scoped-ids.service";
import { findGroupById } from "../services/stage.service";
import { findTournamentMembership } from "../services/user.service";

// Helper: verifica token opcional del query y retorna payload o null
async function verifyToken(
	accessToken: { verify(token: string): Promise<unknown> },
	token?: string,
): Promise<{ sub: string; role: string } | null> {
	if (!token) return null;
	try {
		const payload = (await accessToken.verify(token)) as {
			sub?: string;
			role?: string;
		} | null;
		if (!payload?.sub) return null;
		return payload as { sub: string; role: string };
	} catch {
		return null;
	}
}

// Verifica que el usuario sea referee del torneo del partido (o admin global)
async function assertRefereeForMatch(
	userId: string,
	userRole: string | undefined,
	matchId: string,
): Promise<void> {
	if (userRole === "super_admin" || userRole === "admin") return;
	const tournamentId = await getMatchTournamentId(matchId);
	const membership = await findTournamentMembership(tournamentId, userId);
	if (membership?.role !== "referee") {
		throw DomainError.forbidden(
			"You need referee role in this tournament to write live events",
		);
	}
}

// Mensajes que un cliente puede enviar por el socket
const matchMessageSchema = t.Union([
	t.Object({
		type: t.Literal("score"),
		payload: updateMatchScoreSchema,
	}),
	t.Object({
		type: t.Literal("event"),
		payload: recordLiveEventSchema,
	}),
	t.Object({
		type: t.Literal("ping"),
	}),
]);

export const liveRoutes = new Elysia({ tags: ["Live"] })
	.use(accessTokenJwt)
	.ws("/matches/:id/live", {
		params: matchIdParamsSchema,
		query: t.Object({
			token: t.Optional(
				t.String({
					description:
						"Access token opcional; requerido solo para enviar score/event (referee). Preferir header Authorization.",
				}),
			),
		}),
		headers: t.Object({
			authorization: t.Optional(t.String({ description: "Bearer token" })),
			"sec-websocket-protocol": t.Optional(t.String()),
		}),
		body: matchMessageSchema,
		detail: {
			summary: "WebSocket en vivo del partido",
			description:
				'Canal `match:{id}`. Lectura pública: cualquier cliente suscrito recibe `{ type: "score" | "event" }` emitidos tras `PATCH /matches/:id/score` y `POST /matches/:id/events`, más `{ type: "connected" }` al suscribirse. Escritura vía mensaje `{"type":"score","payload":UpdateMatchScore}` o `{"type":"event","payload":RecordLiveEvent}` requiere `Authorization: Bearer <accessToken>` o `Sec-WebSocket-Protocol: <token>` o `?token=<accessToken>` de un `referee` del torneo (o `admin`/`super_admin`). Ver `README.md` para ejemplos con `new WebSocket("ws://host/matches/:id/live", { headers: { Authorization: "Bearer ..." } })` o `new WebSocket("ws://host/matches/:id/live", [token])`.',
			tags: ["Live"],
		},
		async beforeHandle({ params, query, accessToken, set }) {
			// Valida existencia del partido antes del upgrade
			try {
				await findMatchById(params.id);
			} catch (e) {
				if (e instanceof DomainError && e.status === 404) {
					set.status = 404;
					return { message: e.message };
				}
				throw e;
			}
			// Token opcional para lectura; si viene inválido no se bloquea la suscripción
			// (la escritura sí exige token válido + referee)
			void query;
			void accessToken;
		},
		open(ws) {
			const { id: matchId } = ws.data.params as { id: string };
			subscribeMatch(
				matchId,
				ws as unknown as import("bun").ServerWebSocket<unknown>,
			);
			ws.send(
				JSON.stringify({ type: "connected", channel: `match:${matchId}` }),
			);
		},
		close(ws) {
			const { id: matchId } = ws.data.params as { id: string };
			unsubscribeMatch(
				matchId,
				ws as unknown as import("bun").ServerWebSocket<unknown>,
			);
		},
		async message(ws, body) {
			const { id: matchId } = ws.data.params as { id: string };
			const rawWs = ws as unknown as import("bun").ServerWebSocket<unknown>;
			const accessToken = (
				ws.data as { accessToken?: { verify(t: string): Promise<unknown> } }
			).accessToken;
			// Token puede venir por Authorization header, Sec-WebSocket-Protocol o query ?token= (fallback)
			const headers = (ws.data.headers ?? {}) as Record<
				string,
				string | undefined
			>;
			const query = (ws.data.query ?? {}) as { token?: string };
			let token: string | undefined;
			const authHeader = headers.authorization ?? headers.Authorization;
			if (authHeader?.startsWith("Bearer ")) token = authHeader.slice(7);
			else if (headers["sec-websocket-protocol"])
				token = headers["sec-websocket-protocol"];
			else if (headers["Sec-WebSocket-Protocol"])
				token = headers["Sec-WebSocket-Protocol"];
			else token = query.token;

			if (!accessToken) {
				rawWs.send(
					JSON.stringify({ type: "error", message: "Auth not available" }),
				);
				return;
			}

			if (body.type === "ping") {
				rawWs.send(JSON.stringify({ type: "pong" }));
				return;
			}

			// Escritura: exige token + rol referee
			const payload = await verifyToken(accessToken, token);
			if (!payload) {
				rawWs.send(
					JSON.stringify({
						type: "error",
						message: "Token requerido para escribir",
					}),
				);
				return;
			}

			try {
				await assertRefereeForMatch(payload.sub, payload.role, matchId);

				if (body.type === "score") {
					const updated = await updateMatchScore(
						matchId,
						body.payload as never,
					);
					// El broadcast lo hace el service (publishMatch); aquí solo ack
					rawWs.send(
						JSON.stringify({ type: "ack", action: "score", data: updated }),
					);
				} else if (body.type === "event") {
					const event = await recordLiveEvent(matchId, body.payload as never);
					rawWs.send(
						JSON.stringify({ type: "ack", action: "event", data: event }),
					);
				}
			} catch (e) {
				const message = e instanceof DomainError ? e.message : "Internal error";
				rawWs.send(JSON.stringify({ type: "error", message }));
			}
		},
	})
	.ws("/groups/:groupId/live", {
		params: t.Object({ groupId: t.String({ format: "uuid" }) }),
		query: t.Object({
			token: t.Optional(
				t.String({ description: "Opcional, no requerido para lectura" }),
			),
		}),
		headers: t.Object({
			authorization: t.Optional(t.String()),
			"sec-websocket-protocol": t.Optional(t.String()),
		}),
		detail: {
			summary: "WebSocket de standings del grupo",
			description:
				'Canal `group:{groupId}`. Solo lectura: emite `{ type: "standing", groupId, payload: Standing[] }` tras cada `POST /groups/:groupId/standings/recalculate` (disparado automáticamente al finalizar un partido con grupo). Suscripción pública vía `ws://host/groups/:groupId/live`.',
			tags: ["Live"],
		},
		async beforeHandle({ params, set }) {
			try {
				await findGroupById(params.groupId);
			} catch (e) {
				if (e instanceof DomainError && e.status === 404) {
					set.status = 404;
					return { message: e.message };
				}
				throw e;
			}
		},
		open(ws) {
			const { groupId } = ws.data.params as { groupId: string };
			subscribeGroup(
				groupId,
				ws as unknown as import("bun").ServerWebSocket<unknown>,
			);
			ws.send(
				JSON.stringify({ type: "connected", channel: `group:${groupId}` }),
			);
		},
		close(ws) {
			const { groupId } = ws.data.params as { groupId: string };
			unsubscribeGroup(
				groupId,
				ws as unknown as import("bun").ServerWebSocket<unknown>,
			);
		},
		message(ws, _body) {
			// Canal de standings es solo lectura
			(ws as unknown as import("bun").ServerWebSocket<unknown>).send(
				JSON.stringify({ type: "error", message: "Read-only channel" }),
			);
		},
	});

// Re-export para que los services puedan publicar sin importar app (evita ciclo)
export { publishGroup, publishMatch } from "../lib/live";
