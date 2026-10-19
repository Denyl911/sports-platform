import { stageQualifiersSchema, stageRefParamsSchema } from "@sports/schemas";
import { Elysia } from "elysia";
import { errorMessageSchema } from "../lib/openapi-helpers";
import { jwtMiddleware } from "../middlewares/auth.middleware";
import { listStageQualifiers } from "../services/advancement.service";

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
	);
