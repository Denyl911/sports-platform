import { Elysia, t } from "elysia";
import {
	editionIdParamsSchema,
	groupIdParamsSchema,
	groupRefParamsSchema,
	insertStageGroupSchema,
	insertTournamentEditionSchema,
	insertTournamentSchema,
	insertTournamentStageSchema,
	stageIdParamsSchema,
	stageRefParamsSchema,
	editionRefParamsSchema,
	tournamentFilterQuerySchema,
	tournamentRefParamsSchema,
	updateStageGroupSchema,
	updateTournamentEditionSchema,
	updateTournamentSchema,
	updateTournamentStageSchema,
} from "@sports/schemas";
import { jwtMiddleware } from "../middlewares/auth.middleware";
import {
	requireEditionRole,
	requireGlobalRole,
	requireGroupRole,
	requireStageRole,
	requireTournamentRole,
} from "../middlewares/role.guard";
import {
	createEdition,
	deleteEdition,
	listEditionsByTournament,
	updateEdition,
} from "../services/edition.service";
import {
	createGroup,
	createStage,
	deleteGroup,
	deleteStage,
	listGroupsByStage,
	listStagesByEdition,
	updateGroup,
	updateStage,
} from "../services/stage.service";
import {
	createTournament,
	deleteTournament,
	findTournamentById,
	listTournaments,
	updateTournament,
} from "../services/tournament.service";

export const tournamentsRoutes = new Elysia({
	prefix: "/tournaments",
	tags: ["Tournaments"],
})
	.use(jwtMiddleware)
	// ==========================================
	// Torneos
	// ==========================================
	.get("/", async ({ query }) => listTournaments(query.sportId), {
		query: tournamentFilterQuerySchema,
	})
	.get(
		"/:tournamentId",
		async ({ params }) => findTournamentById(params.tournamentId),
		{ params: tournamentRefParamsSchema },
	)
	.post("/", async ({ body }) => createTournament(body), {
		auth: true,
		body: insertTournamentSchema,
		beforeHandle: requireGlobalRole("admin"),
		detail: { summary: "Crear torneo" },
	})
	.patch(
		"/:tournamentId",
		async ({ params, body }) => updateTournament(params.tournamentId, body),
		{
			auth: true,
			params: tournamentRefParamsSchema,
			body: updateTournamentSchema,
			beforeHandle: requireGlobalRole("admin"),
			detail: { summary: "Actualizar torneo" },
		},
	)
	.delete(
		"/:tournamentId",
		async ({ params }) => {
			await deleteTournament(params.tournamentId);
			return { success: true };
		},
		{
			auth: true,
			params: tournamentRefParamsSchema,
			beforeHandle: requireGlobalRole("admin"),
			response: {
				200: t.Object({ success: t.Boolean() }),
				404: t.Object({ message: t.String() }),
			},
			detail: { summary: "Eliminar torneo" },
		},
	)
	// ==========================================
	// Ediciones
	// ==========================================
	.get(
		"/:tournamentId/editions",
		async ({ params }) => listEditionsByTournament(params.tournamentId),
		{ params: tournamentRefParamsSchema },
	)
	.post(
		"/:tournamentId/editions",
		async ({ params, body }) =>
			createEdition({ ...body, tournamentId: params.tournamentId }),
		{
			auth: true,
			params: tournamentRefParamsSchema,
			body: t.Omit(insertTournamentEditionSchema, ["tournamentId"]),
			beforeHandle: requireTournamentRole("organizer"),
			detail: { summary: "Crear edición del torneo" },
		},
	)
	.patch(
		"/editions/:editionId",
		async ({ params, body }) => updateEdition(params.editionId, body),
		{
			auth: true,
			params: editionRefParamsSchema,
			body: updateTournamentEditionSchema,
			beforeHandle: requireEditionRole("organizer"),
			detail: { summary: "Actualizar edición" },
		},
	)
	.delete(
		"/editions/:editionId",
		async ({ params }) => {
			await deleteEdition(params.editionId);
			return { success: true };
		},
		{
			auth: true,
			params: editionRefParamsSchema,
			beforeHandle: requireEditionRole("organizer"),
			response: {
				200: t.Object({ success: t.Boolean() }),
				404: t.Object({ message: t.String() }),
			},
			detail: { summary: "Eliminar edición" },
		},
	)
	// ==========================================
	// Etapas
	// ==========================================
	.get(
		"/editions/:editionId/stages",
		async ({ params }) => listStagesByEdition(params.editionId),
		{ params: editionRefParamsSchema },
	)
	.post(
		"/editions/:editionId/stages",
		async ({ params, body }) =>
			createStage({ ...body, editionId: params.editionId }),
		{
			auth: true,
			params: editionRefParamsSchema,
			body: t.Omit(insertTournamentStageSchema, ["editionId"]),
			beforeHandle: requireEditionRole("organizer"),
			detail: { summary: "Crear etapa" },
		},
	)
	.patch(
		"/stages/:stageId",
		async ({ params, body }) => updateStage(params.stageId, body),
		{
			auth: true,
			params: stageRefParamsSchema,
			body: updateTournamentStageSchema,
			beforeHandle: requireStageRole("organizer"),
			detail: { summary: "Actualizar etapa" },
		},
	)
	.delete(
		"/stages/:stageId",
		async ({ params }) => {
			await deleteStage(params.stageId);
			return { success: true };
		},
		{
			auth: true,
			params: stageRefParamsSchema,
			beforeHandle: requireStageRole("organizer"),
			response: {
				200: t.Object({ success: t.Boolean() }),
				404: t.Object({ message: t.String() }),
			},
			detail: { summary: "Eliminar etapa" },
		},
	)
	// ==========================================
	// Grupos
	// ==========================================
	.get(
		"/stages/:stageId/groups",
		async ({ params }) => listGroupsByStage(params.stageId),
		{ params: stageRefParamsSchema },
	)
	.post(
		"/stages/:stageId/groups",
		async ({ params, body }) =>
			createGroup({ ...body, stageId: params.stageId }),
		{
			auth: true,
			params: stageRefParamsSchema,
			body: t.Omit(insertStageGroupSchema, ["stageId"]),
			beforeHandle: requireStageRole("organizer"),
			detail: { summary: "Crear grupo" },
		},
	)
	.patch(
		"/groups/:groupId",
		async ({ params, body }) => updateGroup(params.groupId, body),
		{
			auth: true,
			params: groupRefParamsSchema,
			body: updateStageGroupSchema,
			beforeHandle: requireGroupRole("organizer"),
			detail: { summary: "Actualizar grupo" },
		},
	)
	.delete(
		"/groups/:groupId",
		async ({ params }) => {
			await deleteGroup(params.groupId);
			return { success: true };
		},
		{
			auth: true,
			params: groupRefParamsSchema,
			beforeHandle: requireGroupRole("organizer"),
			response: {
				200: t.Object({ success: t.Boolean() }),
				404: t.Object({ message: t.String() }),
			},
			detail: { summary: "Eliminar grupo" },
		},
	);
