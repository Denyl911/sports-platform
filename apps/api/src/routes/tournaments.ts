// @ts-nocheck
import {
	editionRefParamsSchema,
	groupRefParamsSchema,
	insertStageGroupSchema,
	insertTournamentEditionSchema,
	insertTournamentSchema,
	insertTournamentStageSchema,
	selectStageGroupSchema,
	selectTournamentEditionSchema,
	selectTournamentMemberSchema,
	selectTournamentSchema,
	selectTournamentStageSchema,
	stageRefParamsSchema,
	tournamentFilterQuerySchema,
	tournamentMembersFilterQuerySchema,
	tournamentRefParamsSchema,
	updateStageGroupSchema,
	updateTournamentEditionSchema,
	updateTournamentSchema,
	updateTournamentStageSchema,
	userPublicSchema,
} from "@sports/schemas";
import { Elysia, t } from "elysia";
import { errorMessageSchema, successSchema } from "../lib/openapi-helpers";
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
import { DomainError } from "../services/errors";
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
import {
	findTournamentMembership,
	listTournamentMembers,
} from "../services/user.service";

export const tournamentsRoutes = new Elysia({
	prefix: "/tournaments",
	tags: ["Tournaments"],
})
	.use(jwtMiddleware)
	.get("/", async ({ query }) => listTournaments(query), {
		query: tournamentFilterQuerySchema,
		response: {
			200: t.Object({
				items: t.Array(selectTournamentSchema),
				total: t.Integer(),
			}),
			400: errorMessageSchema,
		},
		detail: {
			summary: "Listar torneos",
			description:
				"Lectura pública. Filtra por `sportId`. Retorna `{ items, total }`.",
			tags: ["Tournaments"],
		},
	})
	.get(
		"/:tournamentId",
		async ({ params }) => findTournamentById(params.tournamentId),
		{
			params: tournamentRefParamsSchema,
			response: {
				200: selectTournamentSchema,
				400: errorMessageSchema,
				404: errorMessageSchema,
			},
			detail: {
				summary: "Obtener torneo por ID",
				description: "Lectura pública. 404 si no existe.",
				tags: ["Tournaments"],
			},
		},
	)
	.get(
		"/:tournamentId/members/me",
		async ({ params, userId }) => {
			const membership = await findTournamentMembership(
				params.tournamentId,
				userId,
			);
			if (!membership)
				throw DomainError.notFound(
					`No membership for tournament '${params.tournamentId}'`,
				);
			return membership;
		},
		{
			auth: true,
			params: tournamentRefParamsSchema,
			response: {
				200: selectTournamentMemberSchema,
				401: errorMessageSchema,
				404: errorMessageSchema,
			},
			detail: {
				summary: "Mi membresía en el torneo",
				description:
					"Requiere auth. Retorna la membresía del usuario autenticado en el torneo, o 404 si no es miembro.",
				tags: ["Tournaments"],
			},
		},
	)
	.post("/", async ({ body }) => createTournament(body), {
		auth: true,
		body: insertTournamentSchema,
		response: {
			200: selectTournamentSchema,
			400: errorMessageSchema,
			401: errorMessageSchema,
			403: errorMessageSchema,
			404: errorMessageSchema,
		},
		beforeHandle: requireGlobalRole("admin"),
		detail: {
			summary: "Crear torneo",
			description: "Requiere rol global `admin`. Valida que `sportId` exista.",
			tags: ["Tournaments"],
		},
	})
	.patch(
		"/:tournamentId",
		async ({ params, body }) => updateTournament(params.tournamentId, body),
		{
			auth: true,
			params: tournamentRefParamsSchema,
			body: updateTournamentSchema,
			response: {
				200: selectTournamentSchema,
				400: errorMessageSchema,
				401: errorMessageSchema,
				403: errorMessageSchema,
				404: errorMessageSchema,
			},
			beforeHandle: requireGlobalRole("admin"),
			detail: {
				summary: "Actualizar torneo",
				description:
					"Requiere rol global `admin`. Permite cambiar `sportId` (validado) y metadatos.",
				tags: ["Tournaments"],
			},
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
				200: successSchema,
				401: errorMessageSchema,
				403: errorMessageSchema,
				404: errorMessageSchema,
				409: errorMessageSchema,
			},
			detail: {
				summary: "Eliminar torneo",
				description: "Solo `admin` global. 409 si tiene ediciones asociadas.",
				tags: ["Tournaments"],
			},
		},
	)
	.get(
		"/:tournamentId/editions",
		async ({ params }) => listEditionsByTournament(params.tournamentId),
		{
			params: tournamentRefParamsSchema,
			response: {
				200: t.Object({
					items: t.Array(selectTournamentEditionSchema),
					total: t.Integer(),
				}),
				400: errorMessageSchema,
				404: errorMessageSchema,
			},
			detail: {
				summary: "Listar ediciones del torneo",
				description:
					"Lectura pública. Retorna `{ items, total }` ordenadas por fecha de inicio.",
				tags: ["Tournaments"],
			},
		},
	)
	.post(
		"/:tournamentId/editions",
		async ({ params, body }) =>
			createEdition({ ...body, tournamentId: params.tournamentId }),
		{
			auth: true,
			params: tournamentRefParamsSchema,
			body: t.Omit(insertTournamentEditionSchema, ["tournamentId"]),
			response: {
				200: selectTournamentEditionSchema,
				400: errorMessageSchema,
				401: errorMessageSchema,
				403: errorMessageSchema,
				404: errorMessageSchema,
			},
			beforeHandle: requireTournamentRole("organizer"),
			detail: {
				summary: "Crear edición del torneo",
				description:
					"Requiere rol `organizer` en el torneo. Valida que `startDate <= endDate`.",
				tags: ["Tournaments"],
			},
		},
	)
	.patch(
		"/editions/:editionId",
		async ({ params, body }) => updateEdition(params.editionId, body),
		{
			auth: true,
			params: editionRefParamsSchema,
			body: updateTournamentEditionSchema,
			response: {
				200: selectTournamentEditionSchema,
				400: errorMessageSchema,
				401: errorMessageSchema,
				403: errorMessageSchema,
				404: errorMessageSchema,
			},
			beforeHandle: requireEditionRole("organizer"),
			detail: {
				summary: "Actualizar edición",
				description:
					"Requiere `organizer` de la edición. Valida transiciones de `status` (`draft→registration→in_progress→finished→archived`, `cancelled` terminal).",
				tags: ["Tournaments"],
			},
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
				200: successSchema,
				401: errorMessageSchema,
				403: errorMessageSchema,
				404: errorMessageSchema,
				409: errorMessageSchema,
			},
			detail: {
				summary: "Eliminar edición",
				description:
					"Requiere `organizer` de la edición. 409 si tiene etapas asociadas.",
				tags: ["Tournaments"],
			},
		},
	)
	.get(
		"/editions/:editionId/stages",
		async ({ params }) => listStagesByEdition(params.editionId),
		{
			params: editionRefParamsSchema,
			response: {
				200: t.Object({
					items: t.Array(selectTournamentStageSchema),
					total: t.Integer(),
				}),
				400: errorMessageSchema,
				404: errorMessageSchema,
			},
			detail: {
				summary: "Listar etapas de la edición",
				description:
					"Lectura pública. Ordenadas por `sequenceOrder`. Retorna `{ items, total }`.",
				tags: ["Tournaments"],
			},
		},
	)
	.post(
		"/editions/:editionId/stages",
		async ({ params, body }) =>
			createStage({ ...body, editionId: params.editionId }),
		{
			auth: true,
			params: editionRefParamsSchema,
			body: t.Omit(insertTournamentStageSchema, ["editionId"]),
			response: {
				200: selectTournamentStageSchema,
				400: errorMessageSchema,
				401: errorMessageSchema,
				403: errorMessageSchema,
				404: errorMessageSchema,
				409: errorMessageSchema,
			},
			beforeHandle: requireEditionRole("organizer"),
			detail: {
				summary: "Crear etapa",
				description:
					"Requiere `organizer` de la edición. 409 si `sequenceOrder` ya existe en la edición.",
				tags: ["Tournaments"],
			},
		},
	)
	.patch(
		"/stages/:stageId",
		async ({ params, body }) => updateStage(params.stageId, body),
		{
			auth: true,
			params: stageRefParamsSchema,
			body: updateTournamentStageSchema,
			response: {
				200: selectTournamentStageSchema,
				400: errorMessageSchema,
				401: errorMessageSchema,
				403: errorMessageSchema,
				404: errorMessageSchema,
			},
			beforeHandle: requireStageRole("organizer"),
			detail: {
				summary: "Actualizar etapa",
				description: "Requiere `organizer` de la etapa.",
				tags: ["Tournaments"],
			},
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
				200: successSchema,
				401: errorMessageSchema,
				403: errorMessageSchema,
				404: errorMessageSchema,
				409: errorMessageSchema,
			},
			detail: {
				summary: "Eliminar etapa",
				description:
					"Requiere `organizer` de la etapa. 409 si tiene grupos o partidos asociados.",
				tags: ["Tournaments"],
			},
		},
	)
	.get(
		"/stages/:stageId/groups",
		async ({ params }) => listGroupsByStage(params.stageId),
		{
			params: stageRefParamsSchema,
			response: {
				200: t.Object({
					items: t.Array(selectStageGroupSchema),
					total: t.Integer(),
				}),
				400: errorMessageSchema,
				404: errorMessageSchema,
			},
			detail: {
				summary: "Listar grupos de la etapa",
				description: "Lectura pública. Retorna `{ items, total }`.",
				tags: ["Tournaments"],
			},
		},
	)
	.post(
		"/stages/:stageId/groups",
		async ({ params, body }) =>
			createGroup({ ...body, stageId: params.stageId }),
		{
			auth: true,
			params: stageRefParamsSchema,
			body: t.Omit(insertStageGroupSchema, ["stageId"]),
			response: {
				200: selectStageGroupSchema,
				400: errorMessageSchema,
				401: errorMessageSchema,
				403: errorMessageSchema,
				404: errorMessageSchema,
				409: errorMessageSchema,
			},
			beforeHandle: requireStageRole("organizer"),
			detail: {
				summary: "Crear grupo",
				description:
					"Requiere `organizer` de la etapa. 409 si el nombre ya existe en la etapa.",
				tags: ["Tournaments"],
			},
		},
	)
	.patch(
		"/groups/:groupId",
		async ({ params, body }) => updateGroup(params.groupId, body),
		{
			auth: true,
			params: groupRefParamsSchema,
			body: updateStageGroupSchema,
			response: {
				200: selectStageGroupSchema,
				400: errorMessageSchema,
				401: errorMessageSchema,
				403: errorMessageSchema,
				404: errorMessageSchema,
				409: errorMessageSchema,
			},
			beforeHandle: requireGroupRole("organizer"),
			detail: {
				summary: "Actualizar grupo",
				description:
					"Requiere `organizer` del grupo (resuelto vía etapa→edición→torneo).",
				tags: ["Tournaments"],
			},
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
				200: successSchema,
				401: errorMessageSchema,
				403: errorMessageSchema,
				404: errorMessageSchema,
				409: errorMessageSchema,
			},
			detail: {
				summary: "Mi membresía en el torneo",
				description:
					"Requiere auth. Retorna la membresía del usuario autenticado en el torneo, o 404 si no es miembro.",
				tags: ["Tournaments"],
			},
		},
	)
	.get(
		"/:tournamentId/members",
		async ({ params, query }) =>
			listTournamentMembers(params.tournamentId, { role: query.role }),
		{
			auth: true,
			params: tournamentRefParamsSchema,
			query: tournamentMembersFilterQuerySchema,
			response: {
				200: t.Object({
					items: t.Array(
						t.Object({
							membership: selectTournamentMemberSchema,
							user: userPublicSchema,
						}),
					),
					total: t.Integer(),
				}),
				400: errorMessageSchema,
				401: errorMessageSchema,
				403: errorMessageSchema,
				404: errorMessageSchema,
			},
			beforeHandle: requireTournamentRole("organizer"),
			detail: {
				summary: "Listar miembros del torneo",
				description:
					"Requiere `organizer` en el torneo (o `admin` global). Filtro opcional `role`. Retorna `{ items: { membership, user }[], total }` sin `passwordHash`.",
				tags: ["Tournaments"],
			},
		},
	);
