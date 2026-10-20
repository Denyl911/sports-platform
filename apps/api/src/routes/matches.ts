// @ts-nocheck

import {
	createMatchSchema,
	matchDetailSchema,
	matchFilterQuerySchema,
	matchIdParamsSchema,
	matchScheduleUpdateSchema,
	matchVenueUpdateSchema,
	matchWithTeamsSchema,
	recordLiveEventSchema,
	selectMatchEventSchema,
	selectMatchSchema,
	updateMatchInfoSchema,
	updateMatchScoreSchema,
} from "@sports/schemas";
import { Elysia, t } from "elysia";
import { errorMessageSchema, successSchema } from "../lib/openapi-helpers";
import { jwtMiddleware } from "../middlewares/auth.middleware";
import {
	requireMatchRole,
	requireTournamentRole,
} from "../middlewares/role.guard";
import {
	assignVenue,
	createMatch,
	deleteMatch,
	findMatchById,
	listMatches,
	recordLiveEvent,
	scheduleMatch,
	updateMatch,
	updateMatchScore,
} from "../services/match.service";

export const matchesRoutes = new Elysia({
	prefix: "/matches",
	tags: ["Matches"],
})
	.use(jwtMiddleware)
	.get("/", async ({ query }) => listMatches(query), {
		query: matchFilterQuerySchema,
		response: {
			200: t.Object({
				items: t.Array(matchWithTeamsSchema),
				total: t.Integer(),
			}),
			400: errorMessageSchema,
		},
		detail: {
			summary: "Listar partidos",
			description:
				"Lectura pública. Filtros: `stageId`, `groupId`, `tournamentId`, `editionId`, `status`, `from`/`to` (rango ISO sobre `scheduledAt`, ambos inclusive). Paginado con `limit`/`offset`. Retorna `{ items, total }` con `items[].homeTeam`, `items[].awayTeam` y `items[].venue` resueltos (`{ id, name }`, null si aún no se definen).",
			tags: ["Matches"],
		},
	})
	.get("/:id", async ({ params }) => findMatchById(params.id), {
		params: matchIdParamsSchema,
		response: {
			200: matchDetailSchema,
			400: errorMessageSchema,
			404: errorMessageSchema,
		},
		detail: {
			summary: "Obtener partido por ID",
			description:
				"Lectura pública. Incluye periodos, eventos, sede y equipos resueltos (`homeTeam`, `awayTeam`, `winnerTeam`; null si aún no se definen). 404 si no existe.",
			tags: ["Matches"],
		},
	})
	.post("/", async ({ body }) => createMatch(body), {
		auth: true,
		body: createMatchSchema,
		response: {
			200: selectMatchSchema,
			400: errorMessageSchema,
			401: errorMessageSchema,
			403: errorMessageSchema,
			404: errorMessageSchema,
			409: errorMessageSchema,
		},
		beforeHandle: requireTournamentRole("organizer"),
		detail: {
			summary: "Crear partido",
			description:
				"Requiere rol `organizer` en el torneo (`tournamentId` del body). Valida que la etapa pertenezca al torneo y que el grupo pertenezca a la etapa. Equipos deben estar inscritos en la etapa.",
			tags: ["Matches"],
		},
	})
	.patch("/:id", async ({ params, body }) => updateMatch(params.id, body), {
		auth: true,
		params: matchIdParamsSchema,
		body: updateMatchInfoSchema,
		response: {
			200: selectMatchSchema,
			400: errorMessageSchema,
			401: errorMessageSchema,
			403: errorMessageSchema,
			404: errorMessageSchema,
			409: errorMessageSchema,
		},
		beforeHandle: requireMatchRole("organizer"),
		detail: {
			summary: "Actualizar partido",
			description:
				"Requiere `organizer` del torneo del partido. Solo permite campos administrativos; `status` solo admite `cancelled`. Cambios de equipos deben venir en par y estar inscritos. `fieldNumber` se valida contra `venues.fieldCount`; quitar la sede limpia la cancha.",
			tags: ["Matches"],
		},
	})
	.delete(
		"/:id",
		async ({ params }) => {
			await deleteMatch(params.id);
			return { success: true };
		},
		{
			auth: true,
			params: matchIdParamsSchema,
			response: {
				200: successSchema,
				401: errorMessageSchema,
				403: errorMessageSchema,
				404: errorMessageSchema,
				409: errorMessageSchema,
			},
			beforeHandle: requireMatchRole("organizer"),
			detail: {
				summary: "Eliminar partido",
				description:
					"Requiere `organizer` del torneo del partido. 409 si tiene dependencias referenciadas.",
				tags: ["Matches"],
			},
		},
	)
	.patch(
		"/:id/venue",
		async ({ params, body }) =>
			assignVenue(params.id, body.venueId, body.fieldNumber),
		{
			auth: true,
			params: matchIdParamsSchema,
			body: matchVenueUpdateSchema,
			response: {
				200: selectMatchSchema,
				400: errorMessageSchema,
				401: errorMessageSchema,
				403: errorMessageSchema,
				404: errorMessageSchema,
			},
			beforeHandle: requireMatchRole("organizer"),
			detail: {
				summary: "Asignar sede al partido",
				description:
					"Requiere `organizer` del torneo. Valida que la sede exista y, si se manda `fieldNumber`, que la cancha exista dentro de la sede.",
				tags: ["Matches"],
			},
		},
	)
	.patch(
		"/:id/schedule",
		async ({ params, body }) => scheduleMatch(params.id, body.scheduledAt),
		{
			auth: true,
			params: matchIdParamsSchema,
			body: matchScheduleUpdateSchema,
			response: {
				200: selectMatchSchema,
				400: errorMessageSchema,
				401: errorMessageSchema,
				403: errorMessageSchema,
				404: errorMessageSchema,
			},
			beforeHandle: requireMatchRole("organizer"),
			detail: {
				summary: "Programar fecha y hora del partido",
				description:
					"Requiere `organizer` del torneo. `scheduledAt` debe ser ISO date-time.",
				tags: ["Matches"],
			},
		},
	)
	.patch(
		"/:id/score",
		async ({ params, body }) => updateMatchScore(params.id, body),
		{
			auth: true,
			params: matchIdParamsSchema,
			body: updateMatchScoreSchema,
			response: {
				200: selectMatchSchema,
				400: errorMessageSchema,
				401: errorMessageSchema,
				403: errorMessageSchema,
				404: errorMessageSchema,
				409: errorMessageSchema,
			},
			beforeHandle: requireMatchRole("referee"),
			detail: {
				summary: "Actualizar marcador en vivo",
				description:
					"Requiere rol `referee` del torneo. Valida transiciones de `status` (`scheduled→in_progress→paused→finished`, `walkover` exige `winnerTeamId`). Soporta `periodNumber`/`periodType` (`regular`, `overtime`, `extra_time`, `penalties`, `break`). Al finalizar, recalcula standings y emite por WebSocket `match:{id}` y `group:{groupId}`.",
				tags: ["Matches"],
			},
		},
	)
	.post(
		"/:id/events",
		async ({ params, body }) => recordLiveEvent(params.id, body),
		{
			auth: true,
			params: matchIdParamsSchema,
			body: recordLiveEventSchema,
			response: {
				200: selectMatchEventSchema,
				400: errorMessageSchema,
				401: errorMessageSchema,
				403: errorMessageSchema,
				404: errorMessageSchema,
			},
			beforeHandle: requireMatchRole("referee"),
			detail: {
				summary: "Registrar evento en vivo",
				description:
					"Requiere `referee` del torneo. El partido debe estar `in_progress` y el `teamId` ser participante. Valida `eventType` contra el catálogo del deporte. Si `affectsScore`, recalcula marcador y emite por WebSocket.",
				tags: ["Matches"],
			},
		},
	);
