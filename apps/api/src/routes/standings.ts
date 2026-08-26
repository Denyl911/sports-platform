// @ts-nocheck

import {
	groupRefParamsSchema,
	selectStageStandingSchema,
	selectTeamSchema,
	standingRowIdParamsSchema,
	updateStandingRowSchema,
} from "@sports/schemas";
import { Elysia, t } from "elysia";
import { errorMessageSchema } from "../lib/openapi-helpers";
import { jwtMiddleware } from "../middlewares/auth.middleware";
import {
	requireGroupRole,
	requireStandingRowRole,
} from "../middlewares/role.guard";
import {
	getStandings,
	recalculateGroupStandings,
	updateStandingRow,
} from "../services/standings.service";

const standingWithTeamSchema = t.Object({
	standing: selectStageStandingSchema,
	team: selectTeamSchema,
});

export const standingsRoutes = new Elysia({
	prefix: "/groups",
	tags: ["Standings"],
})
	.use(jwtMiddleware)
	.get(
		"/:groupId/standings",
		async ({ params }) => getStandings(params.groupId),
		{
			params: groupRefParamsSchema,
			response: {
				200: t.Object({
					items: t.Array(standingWithTeamSchema),
					total: t.Integer(),
				}),
				400: errorMessageSchema,
				404: errorMessageSchema,
			},
			detail: {
				summary: "Obtener tabla de posiciones del grupo",
				description:
					"Lectura pública. Retorna `{ items: { standing, team }[], total }` ordenadas por `rankPosition`, puntos, diferencia y goles a favor.",
				tags: ["Standings"],
			},
		},
	)
	.post(
		"/:groupId/standings/recalculate",
		async ({ params }) => recalculateGroupStandings(params.groupId),
		{
			auth: true,
			params: groupRefParamsSchema,
			response: {
				200: t.Array(selectStageStandingSchema),
				400: errorMessageSchema,
				401: errorMessageSchema,
				403: errorMessageSchema,
				404: errorMessageSchema,
			},
			beforeHandle: requireGroupRole("statistician", "organizer"),
			detail: {
				summary: "Recalcular tabla de posiciones del grupo",
				description:
					"Requiere rol `statistician` u `organizer` en el torneo del grupo. Recalcula a partir de partidos `finished`, respeta `hasDraws` y reglas de `scoringRules` del deporte, y asigna `rankPosition`. Emite por WebSocket `group:{groupId}`.",
				tags: ["Standings"],
			},
		},
	);

export const standingItemRoutes = new Elysia({
	prefix: "/standings",
	tags: ["Standings"],
})
	.use(jwtMiddleware)
	.patch(
		"/:id",
		async ({ params, body }) => updateStandingRow(params.id, body),
		{
			auth: true,
			params: standingRowIdParamsSchema,
			body: updateStandingRowSchema,
			response: {
				200: selectStageStandingSchema,
				400: errorMessageSchema,
				401: errorMessageSchema,
				403: errorMessageSchema,
				404: errorMessageSchema,
			},
			beforeHandle: requireStandingRowRole("statistician", "organizer"),
			detail: {
				summary: "Ajuste manual de fila de posiciones",
				description:
					"Requiere `statistician` u `organizer` del torneo. Permite corrección manual; el siguiente recálculo la sobrescribe.",
				tags: ["Standings"],
			},
		},
	);
