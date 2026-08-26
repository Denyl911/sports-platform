import { Elysia } from "elysia";
import {
	insertMatchSchema,
	matchFilterQuerySchema,
	matchIdParamsSchema,
	matchScheduleUpdateSchema,
	matchVenueUpdateSchema,
	recordLiveEventSchema,
	updateMatchSchema,
	updateMatchScoreSchema,
} from "@sports/schemas";
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
	// ==========================================
	// Lectura pública (sitio SSR)
	// ==========================================
	.get("/", async ({ query }) => listMatches(query), {
		query: matchFilterQuerySchema,
	})
	.get("/:id", async ({ params }) => findMatchById(params.id), {
		params: matchIdParamsSchema,
	})
	// ==========================================
	// Creación: organizer del torneo (tournamentId viene en el body)
	// ==========================================
	.post("/", async ({ body }) => createMatch(body), {
		auth: true,
		body: insertMatchSchema,
		beforeHandle: requireTournamentRole("organizer"),
		detail: { summary: "Crear partido" },
	})
	// ==========================================
	// Gestión: organizer del torneo del partido
	// ==========================================
	.patch("/:id", async ({ params, body }) => updateMatch(params.id, body), {
		auth: true,
		params: matchIdParamsSchema,
		body: updateMatchSchema,
		beforeHandle: requireMatchRole("organizer"),
		detail: { summary: "Actualizar partido" },
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
			beforeHandle: requireMatchRole("organizer"),
			detail: { summary: "Eliminar partido" },
		},
	)
	.patch(
		"/:id/venue",
		async ({ params, body }) => assignVenue(params.id, body.venueId),
		{
			auth: true,
			params: matchIdParamsSchema,
			body: matchVenueUpdateSchema,
			beforeHandle: requireMatchRole("organizer"),
			detail: { summary: "Asignar sede al partido" },
		},
	)
	.patch(
		"/:id/schedule",
		async ({ params, body }) => scheduleMatch(params.id, body.scheduledAt),
		{
			auth: true,
			params: matchIdParamsSchema,
			body: matchScheduleUpdateSchema,
			beforeHandle: requireMatchRole("organizer"),
			detail: { summary: "Programar fecha y hora del partido" },
		},
	)
	// ==========================================
	// Marcador y eventos en vivo: referee del torneo
	// ==========================================
	.patch(
		"/:id/score",
		async ({ params, body }) => updateMatchScore(params.id, body),
		{
			auth: true,
			params: matchIdParamsSchema,
			body: updateMatchScoreSchema,
			beforeHandle: requireMatchRole("referee"),
			detail: { summary: "Actualizar marcador en vivo" },
		},
	)
	.post(
		"/:id/events",
		async ({ params, body }) => recordLiveEvent(params.id, body),
		{
			auth: true,
			params: matchIdParamsSchema,
			body: recordLiveEventSchema,
			beforeHandle: requireMatchRole("referee"),
			detail: { summary: "Registrar evento en vivo" },
		},
	);
