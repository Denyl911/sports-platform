// @ts-nocheck

import {
	clubIdParamsSchema,
	insertClubSchema,
	selectClubSchema,
	updateClubSchema,
} from "@sports/schemas";
import { Elysia, t } from "elysia";
import { errorMessageSchema, successSchema } from "../lib/openapi-helpers";
import { jwtMiddleware } from "../middlewares/auth.middleware";
import { requireGlobalRole } from "../middlewares/role.guard";
import {
	createClub,
	deleteClub,
	findClubById,
	listClubs,
	updateClub,
} from "../services/team.service";

export const clubsRoutes = new Elysia({ prefix: "/clubs", tags: ["Clubs"] })
	.use(jwtMiddleware)
	.get("/", async () => listClubs(), {
		response: {
			200: t.Object({ items: t.Array(selectClubSchema), total: t.Integer() }),
		},
		detail: {
			summary: "Listar clubes",
			description:
				"Lectura pública. Retorna `{ items, total }`. Sin paginación por query.",
			tags: ["Clubs"],
		},
	})
	.get("/:id", async ({ params }) => findClubById(params.id), {
		params: clubIdParamsSchema,
		response: {
			200: selectClubSchema,
			400: errorMessageSchema,
			404: errorMessageSchema,
		},
		detail: {
			summary: "Obtener club por ID",
			description:
				"Lectura pública. 400 si el `id` no es UUID válido. 404 si el club no existe.",
			tags: ["Clubs"],
		},
	})
	.post("/", async ({ body }) => createClub(body), {
		auth: true,
		body: insertClubSchema,
		response: {
			200: selectClubSchema,
			400: errorMessageSchema,
			401: errorMessageSchema,
			403: errorMessageSchema,
			409: errorMessageSchema,
		},
		beforeHandle: requireGlobalRole("admin", "organizer"),
		detail: {
			summary: "Crear club",
			description:
				"Requiere rol global `admin` u `organizer`. 409 si el nombre ya existe.",
			tags: ["Clubs"],
		},
	})
	.patch("/:id", async ({ params, body }) => updateClub(params.id, body), {
		auth: true,
		params: clubIdParamsSchema,
		body: updateClubSchema,
		response: {
			200: selectClubSchema,
			400: errorMessageSchema,
			401: errorMessageSchema,
			403: errorMessageSchema,
			404: errorMessageSchema,
		},
		beforeHandle: requireGlobalRole("admin", "organizer"),
		detail: {
			summary: "Actualizar club",
			description: "Requiere rol global `admin` u `organizer`.",
			tags: ["Clubs"],
		},
	})
	.delete(
		"/:id",
		async ({ params }) => {
			await deleteClub(params.id);
			return { success: true };
		},
		{
			auth: true,
			params: clubIdParamsSchema,
			beforeHandle: requireGlobalRole("admin"),
			response: {
				200: successSchema,
				401: errorMessageSchema,
				403: errorMessageSchema,
				404: errorMessageSchema,
				409: errorMessageSchema,
			},
			detail: {
				summary: "Eliminar club",
				description:
					"Solo `admin` global. 409 si tiene equipos asociados (FK `23503`).",
				tags: ["Clubs"],
			},
		},
	);
