import { Elysia, t } from "elysia";
import { accessTokenJwt } from "../lib/jwt";
import {
	publishGroup,
	publishMatch,
	subscribeGroup,
	subscribeMatch,
	unsubscribeGroup,
	unsubscribeMatch,
} from "../lib/live";
import { DomainError } from "../services/errors";
import { getMatchTournamentId } from "../services/scoped-ids.service";
import { recordLiveEvent, updateMatchScore } from "../services/match.service";
import { findMatchById } from "../services/match.service";
import { findGroupById } from "../services/stage.service";
import { findTournamentMembership } from "../services/user.service";
import {
	matchIdParamsSchema,
	recordLiveEventSchema,
	updateMatchScoreSchema,
} from "@sports/schemas";

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
	if (!membership || membership.role !== "referee") {
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
	// Canal por partido: lectura pública, escritura solo referee del torneo
	.ws("/matches/:id/live", {
		params: matchIdParamsSchema,
		query: t.Object({
			token: t.Optional(t.String()),
		}),
		body: matchMessageSchema,
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
			const { token } = ws.data.query as { token?: string };
			const rawWs = ws as unknown as import("bun").ServerWebSocket<unknown>;
			const accessToken = (
				ws.data as { accessToken?: { verify(t: string): Promise<unknown> } }
			).accessToken;

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
	// Canal por grupo: tabla de posiciones en vivo (solo lectura/broadcast)
	.ws("/groups/:groupId/live", {
		params: t.Object({ groupId: t.String({ format: "uuid" }) }),
		query: t.Object({
			token: t.Optional(t.String()),
		}),
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
