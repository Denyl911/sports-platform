import { Elysia, t } from "elysia";
import {
	insertSportEventTypeSchema,
	insertSportSchema,
	sportEventTypeFilterQuerySchema,
	sportEventTypeParamsSchema,
	sportIdParamsSchema,
	updateSportEventTypeSchema,
	updateSportSchema,
} from "@sports/schemas";
import { jwtMiddleware } from "../middlewares/auth.middleware";
import { requireGlobalRole } from "../middlewares/role.guard";
import {
	createSport,
	createSportEventType,
	deleteSport,
	deleteSportEventType,
	findSportById,
	listSportEventTypes,
	listSports,
	updateSport,
	updateSportEventType,
} from "../services/sport.service";

export const sportsRoutes = new Elysia({ prefix: "/sports", tags: ["Sports"] })
	.use(jwtMiddleware)
	// Lectura pública (catálogo SSR)
	.get("/", async () => listSports())
	.get("/:id", async ({ params }) => findSportById(params.id), {
		params: sportIdParamsSchema,
	})
	.get(
		"/:id/event-types",
		async ({ params, query }) =>
			listSportEventTypes({ ...query, sportId: params.id }),
		{
			params: sportIdParamsSchema,
			query: sportEventTypeFilterQuerySchema,
		},
	)
	// Escritura: solo administración global
	.post("/", async ({ body }) => createSport(body), {
		auth: true,
		body: insertSportSchema,
		beforeHandle: requireGlobalRole("admin"),
		detail: { summary: "Crear deporte" },
	})
	.patch("/:id", async ({ params, body }) => updateSport(params.id, body), {
		auth: true,
		params: sportIdParamsSchema,
		body: updateSportSchema,
		beforeHandle: requireGlobalRole("admin"),
		detail: { summary: "Actualizar deporte" },
	})
	.delete(
		"/:id",
		async ({ params }) => {
			await deleteSport(params.id);
			return { success: true };
		},
		{
			auth: true,
			params: sportIdParamsSchema,
			beforeHandle: requireGlobalRole("admin"),
			response: {
				200: t.Object({ success: t.Boolean() }),
				404: t.Object({ message: t.String() }),
			},
			detail: { summary: "Eliminar deporte" },
		},
	)
	.post(
		"/:id/event-types",
		async ({ params, body }) =>
			createSportEventType({ ...body, sportId: params.id }),
		{
			auth: true,
			params: sportIdParamsSchema,
			body: t.Omit(insertSportEventTypeSchema, ["sportId"]),
			beforeHandle: requireGlobalRole("admin"),
			detail: { summary: "Crear tipo de evento del deporte" },
		},
	)
	.patch(
		"/event-types/:eventTypeId",
		async ({ params, body }) => updateSportEventType(params.eventTypeId, body),
		{
			auth: true,
			params: sportEventTypeParamsSchema,
			body: updateSportEventTypeSchema,
			beforeHandle: requireGlobalRole("admin"),
			detail: { summary: "Actualizar tipo de evento" },
		},
	)
	.delete(
		"/event-types/:eventTypeId",
		async ({ params }) => {
			await deleteSportEventType(params.eventTypeId);
			return { success: true };
		},
		{
			auth: true,
			params: sportEventTypeParamsSchema,
			beforeHandle: requireGlobalRole("admin"),
			detail: { summary: "Eliminar tipo de evento" },
		},
	);
