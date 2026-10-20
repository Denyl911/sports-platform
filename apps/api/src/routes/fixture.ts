import {
	fixtureGenerationResultSchema,
	generateFixtureSchema,
	stageFixtureSchema,
	stageRefParamsSchema,
} from "@sports/schemas";
import { Elysia, t } from "elysia";
import { errorMessageSchema } from "../lib/openapi-helpers";
import { jwtMiddleware } from "../middlewares/auth.middleware";
import { requireStageRole } from "../middlewares/role.guard";
import {
	generateRoundRobinFixture,
	listStageFixture,
} from "../services/fixture.service";

export const fixtureRoutes = new Elysia({
	prefix: "/stages",
	tags: ["Fixture"],
})
	.use(jwtMiddleware)
	.get(
		"/:stageId/fixture",
		async ({ params }) => listStageFixture(params.stageId),
		{
			params: stageRefParamsSchema,
			response: {
				200: stageFixtureSchema,
				400: errorMessageSchema,
				404: errorMessageSchema,
			},
			detail: {
				summary: "Fixture completo de la etapa",
				description:
					"Lectura pública. Devuelve todos los partidos de la etapa ordenados por jornada (`roundNumber`), fecha y número de partido, con equipos y sede resueltos. No se pagina: el fixture de una etapa está acotado por sus equipos. 2 round trips, fijados por `query-budgets.test.ts` (ADR 008).",
				tags: ["Fixture"],
			},
		},
	)
	.post(
		"/:stageId/fixture",
		async ({ params, body, query }) =>
			generateRoundRobinFixture(params.stageId, body, query.force === "true"),
		{
			auth: true,
			params: stageRefParamsSchema,
			body: generateFixtureSchema,
			query: t.Object({
				force: t.Optional(t.String()),
			}),
			response: {
				200: fixtureGenerationResultSchema,
				400: errorMessageSchema,
				401: errorMessageSchema,
				403: errorMessageSchema,
				404: errorMessageSchema,
				409: errorMessageSchema,
			},
			beforeHandle: requireStageRole("organizer"),
			detail: {
				summary: "Generar el fixture de una liguilla",
				description:
					"Requiere `organizer` de la etapa. Genera una liguilla por grupo (o una sola si no hay grupos) con el método del círculo, alternativa local/visitante y, si `doubleRound`, la vuelta invertida. `startDate` e `intervalDays` reparten las jornadas; `kickoffTimes`, `matchDurationMinutes`, `venueId` y `fieldNumbers` asignan fecha, hora y cancha. `timeZone` es la zona IANA del organizador (por defecto UTC). 409 si ya hay partidos; `?force=true` regenera solo si ninguno empezó. Solo etapas `round_robin`: la eliminación directa usa `POST /stages/:stageId/bracket`.",
				tags: ["Fixture"],
			},
		},
	);
