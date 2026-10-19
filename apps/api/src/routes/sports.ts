// @ts-nocheck

import {
	insertSportEventTypeSchema,
	insertSportSchema,
	selectSportEventTypeSchema,
	selectSportSchema,
	sportEventTypeFilterQuerySchema,
	sportEventTypeParamsSchema,
	sportFilterQuerySchema,
	sportIdParamsSchema,
	updateSportEventTypeSchema,
	updateSportSchema,
} from "@sports/schemas";
import { Elysia, t } from "elysia";
import { errorMessageSchema, successSchema } from "../lib/openapi-helpers";
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
	.get("/", async ({ query }) => listSports(query), {
		query: sportFilterQuerySchema,
		response: {
			200: t.Object({ items: t.Array(selectSportSchema), total: t.Integer() }),
		},
		detail: {
			summary: "Listar deportes",
			description:
				"Lectura pública. Catálogo de deportes soportados. Retorna `{ items, total }`.",
			tags: ["Sports"],
		},
	})
	.get("/:id", async ({ params }) => findSportById(params.id), {
		params: sportIdParamsSchema,
		response: {
			200: selectSportSchema,
			404: errorMessageSchema,
		},
		detail: {
			summary: "Obtener deporte por ID",
			description:
				"Lectura pública. `id` es el slug (ej. `football`). 404 si no existe.",
			tags: ["Sports"],
		},
	})
	.get(
		"/:id/event-types",
		async ({ params, query }) =>
			listSportEventTypes({ ...query, sportId: params.id }),
		{
			params: sportIdParamsSchema,
			query: sportEventTypeFilterQuerySchema,
			response: {
				200: t.Object({
					items: t.Array(selectSportEventTypeSchema),
					total: t.Integer(),
				}),
				400: errorMessageSchema,
				404: errorMessageSchema,
			},
			detail: {
				summary: "Listar tipos de evento del deporte",
				description:
					"Lectura pública. Filtra por `affectsScore`. Retorna `{ items, total }`.",
				tags: ["Sports"],
			},
		},
	)
	.post("/", async ({ body }) => createSport(body), {
		auth: true,
		body: insertSportSchema,
		response: {
			200: selectSportSchema,
			400: errorMessageSchema,
			401: errorMessageSchema,
			403: errorMessageSchema,
			409: errorMessageSchema,
		},
		beforeHandle: requireGlobalRole("admin"),
		detail: {
			summary: "Crear deporte",
			description: "Solo `admin` global. 409 si el `id` ya existe.",
			tags: ["Sports"],
		},
	})
	.patch("/:id", async ({ params, body }) => updateSport(params.id, body), {
		auth: true,
		params: sportIdParamsSchema,
		body: updateSportSchema,
		response: {
			200: selectSportSchema,
			400: errorMessageSchema,
			401: errorMessageSchema,
			403: errorMessageSchema,
			404: errorMessageSchema,
		},
		beforeHandle: requireGlobalRole("admin"),
		detail: {
			summary: "Actualizar deporte",
			description: "Solo `admin` global.",
			tags: ["Sports"],
		},
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
				200: successSchema,
				401: errorMessageSchema,
				403: errorMessageSchema,
				404: errorMessageSchema,
				409: errorMessageSchema,
			},
			detail: {
				summary: "Eliminar deporte",
				description:
					"Solo `admin` global. 409 si está referenciado por torneos.",
				tags: ["Sports"],
			},
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
			response: {
				200: selectSportEventTypeSchema,
				400: errorMessageSchema,
				401: errorMessageSchema,
				403: errorMessageSchema,
				404: errorMessageSchema,
				409: errorMessageSchema,
			},
			beforeHandle: requireGlobalRole("admin"),
			detail: {
				summary: "Crear tipo de evento del deporte",
				description:
					"Solo `admin` global. 409 si el `code` ya existe para ese deporte.",
				tags: ["Sports"],
			},
		},
	)
	.patch(
		"/event-types/:eventTypeId",
		async ({ params, body }) => updateSportEventType(params.eventTypeId, body),
		{
			auth: true,
			params: sportEventTypeParamsSchema,
			body: updateSportEventTypeSchema,
			response: {
				200: selectSportEventTypeSchema,
				400: errorMessageSchema,
				401: errorMessageSchema,
				403: errorMessageSchema,
				404: errorMessageSchema,
				409: errorMessageSchema,
			},
			beforeHandle: requireGlobalRole("admin"),
			detail: {
				summary: "Actualizar tipo de evento",
				description: "Solo `admin` global.",
				tags: ["Sports"],
			},
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
			response: {
				200: successSchema,
				401: errorMessageSchema,
				403: errorMessageSchema,
				404: errorMessageSchema,
				409: errorMessageSchema,
			},
			detail: {
				summary: "Eliminar tipo de evento",
				description:
					"Solo `admin` global. 409 si está referenciado por eventos de partido.",
				tags: ["Sports"],
			},
		},
	);
