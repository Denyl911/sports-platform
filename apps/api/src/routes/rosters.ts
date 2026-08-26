// @ts-nocheck

import {
	addPlayerToRosterSchema,
	rosterCollectionParamsSchema,
	rosterEntryIdParamsSchema,
	selectPlayerSchema,
	selectTournamentRosterSchema,
	updateTournamentRosterSchema,
} from "@sports/schemas";
import { Elysia, t } from "elysia";
import { errorMessageSchema, successSchema } from "../lib/openapi-helpers";
import { jwtMiddleware } from "../middlewares/auth.middleware";
import {
	requireEditionRole,
	requireRosterEntryRole,
} from "../middlewares/role.guard";
import {
	addPlayerToRoster,
	listRoster,
	removePlayerFromRoster,
	updateRosterEntry,
} from "../services/roster.service";

const rosterWithPlayerSchema = t.Object({
	roster: selectTournamentRosterSchema,
	player: selectPlayerSchema,
});

export const rostersRoutes = new Elysia({
	prefix: "/editions/:editionId/teams/:teamId/roster",
	tags: ["Rosters"],
})
	.use(jwtMiddleware)
	.get("/", async ({ params }) => listRoster(params.editionId, params.teamId), {
		params: rosterCollectionParamsSchema,
		response: {
			200: t.Object({
				items: t.Array(rosterWithPlayerSchema),
				total: t.Integer(),
			}),
			400: errorMessageSchema,
			404: errorMessageSchema,
		},
		detail: {
			summary: "Listar plantel del equipo en la edición",
			description:
				"Lectura pública. Retorna `{ items: { roster, player }[], total }` ordenadas por dorsal y apellido.",
			tags: ["Rosters"],
		},
	})
	.post(
		"/",
		async ({ params, body }) =>
			addPlayerToRoster({
				...body,
				editionId: params.editionId,
				teamId: params.teamId,
			}),
		{
			auth: true,
			params: rosterCollectionParamsSchema,
			body: t.Omit(addPlayerToRosterSchema, ["editionId", "teamId"]),
			response: {
				200: selectTournamentRosterSchema,
				400: errorMessageSchema,
				401: errorMessageSchema,
				403: errorMessageSchema,
				404: errorMessageSchema,
				409: errorMessageSchema,
			},
			beforeHandle: requireEditionRole("organizer"),
			detail: {
				summary: "Añadir jugador al plantel",
				description:
					"Requiere `organizer` de la edición. Valida duplicado (409), único capitán y dorsal no repetido.",
				tags: ["Rosters"],
			},
		},
	);

export const rosterItemRoutes = new Elysia({
	prefix: "/rosters",
	tags: ["Rosters"],
})
	.use(jwtMiddleware)
	.patch(
		"/:id",
		async ({ params, body }) => updateRosterEntry(params.id, body),
		{
			auth: true,
			params: rosterEntryIdParamsSchema,
			body: updateTournamentRosterSchema,
			response: {
				200: selectTournamentRosterSchema,
				400: errorMessageSchema,
				401: errorMessageSchema,
				403: errorMessageSchema,
				404: errorMessageSchema,
				409: errorMessageSchema,
			},
			beforeHandle: requireRosterEntryRole("organizer"),
			detail: {
				summary: "Actualizar entrada del plantel",
				description:
					"Requiere `organizer` de la edición (resuelto vía roster). Valida capitán único y dorsal libre.",
				tags: ["Rosters"],
			},
		},
	)
	.delete(
		"/:id",
		async ({ params }) => {
			await removePlayerFromRoster(params.id);
			return { success: true };
		},
		{
			auth: true,
			params: rosterEntryIdParamsSchema,
			beforeHandle: requireRosterEntryRole("organizer"),
			response: {
				200: successSchema,
				401: errorMessageSchema,
				403: errorMessageSchema,
				404: errorMessageSchema,
			},
			detail: {
				summary: "Quitar jugador del plantel",
				description: "Requiere `organizer` de la edición.",
				tags: ["Rosters"],
			},
		},
	);
