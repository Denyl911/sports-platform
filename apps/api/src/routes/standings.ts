import { Elysia } from "elysia";
import {
	groupRefParamsSchema,
	standingRowIdParamsSchema,
	updateStandingRowSchema,
} from "@sports/schemas";
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

export const standingsRoutes = new Elysia({
	prefix: "/groups",
	tags: ["Standings"],
})
	.use(jwtMiddleware)
	// Lectura pública (tablas SSR)
	.get(
		"/:groupId/standings",
		async ({ params }) => getStandings(params.groupId),
		{ params: groupRefParamsSchema },
	)
	// Recálculo: statistician u organizer del torneo
	.post(
		"/:groupId/standings/recalculate",
		async ({ params }) => recalculateGroupStandings(params.groupId),
		{
			auth: true,
			params: groupRefParamsSchema,
			beforeHandle: requireGroupRole("statistician", "organizer"),
			detail: { summary: "Recalcular tabla de posiciones del grupo" },
		},
	);

export const standingItemRoutes = new Elysia({
	prefix: "/standings",
	tags: ["Standings"],
})
	.use(jwtMiddleware)
	// Ajuste manual: statistician u organizer
	.patch(
		"/:id",
		async ({ params, body }) => updateStandingRow(params.id, body),
		{
			auth: true,
			params: standingRowIdParamsSchema,
			body: updateStandingRowSchema,
			beforeHandle: requireStandingRowRole("statistician", "organizer"),
			detail: { summary: "Ajuste manual de fila de posiciones" },
		},
	);
