import {
	advanceStageResultSchema,
	stageQualifiersSchema,
	stageRefParamsSchema,
} from "@sports/schemas";
import { Elysia } from "elysia";
import { errorMessageSchema } from "../lib/openapi-helpers";
import { jwtMiddleware } from "../middlewares/auth.middleware";
import { requireStageRole } from "../middlewares/role.guard";
import {
	listStageQualifiers,
	syncAdvancement,
} from "../services/advancement.service";

export const advancementRoutes = new Elysia({
	prefix: "/stages",
	tags: ["Advancement"],
})
	.use(jwtMiddleware)
	.get(
		"/:stageId/qualifiers",
		async ({ params }) => listStageQualifiers(params.stageId),
		{
			params: stageRefParamsSchema,
			response: {
				200: stageQualifiersSchema,
				400: errorMessageSchema,
				404: errorMessageSchema,
			},
			detail: {
				summary: "Previa de clasificados de la etapa",
				description:
					"Lectura pública. La posición de cada equipo inscrito con grupo (puntos, diferencia, a favor, id) y la regla de avance aplicada: `qualified` marca a los que pasan a la etapa siguiente. La regla viaja en `rule` (`null` si la etapa no alimenta a nadie). 2 round trips, fijados por `query-budgets.test.ts` (ADR 008).",
				tags: ["Advancement"],
			},
		},
	)
	.post(
		"/:stageId/advance",
		async ({ params }) => syncAdvancement(params.stageId),
		{
			auth: true,
			params: stageRefParamsSchema,
			response: {
				200: advanceStageResultSchema,
				400: errorMessageSchema,
				401: errorMessageSchema,
				403: errorMessageSchema,
				404: errorMessageSchema,
			},
			beforeHandle: requireStageRole("organizer"),
			detail: {
				summary: "Materializar los clasificados en la etapa siguiente",
				description:
					"Requiere `organizer` de la etapa. Recomputa los clasificados (regla + tabla) y los inscribe en la etapa siguiente (la de menor `sequenceOrder` mayor), ajustando `seedNumber` y quitando los que ya no clasifican. No-op si la etapa no tiene regla, no hay etapa siguiente, o la etapa siguiente ya empezó (razón en `reason`).",
				tags: ["Advancement"],
			},
		},
	);
