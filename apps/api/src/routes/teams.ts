// @ts-nocheck

import {
	insertTeamSchema,
	selectTeamSchema,
	teamFilterQuerySchema,
	teamIdParamsSchema,
	updateTeamSchema,
} from "@sports/schemas";
import { Elysia, t } from "elysia";
import { errorMessageSchema, successSchema } from "../lib/openapi-helpers";
import { jwtMiddleware } from "../middlewares/auth.middleware";
import { requireGlobalRole } from "../middlewares/role.guard";
import {
	createTeam,
	deleteTeam,
	findTeamById,
	listTeams,
	updateTeam,
} from "../services/team.service";

export const teamsRoutes = new Elysia({ prefix: "/teams", tags: ["Teams"] })
	.use(jwtMiddleware)
	.get("/", async ({ query }) => listTeams(query), {
		query: teamFilterQuerySchema,
		response: {
			200: t.Object({ items: t.Array(selectTeamSchema), total: t.Integer() }),
			400: errorMessageSchema,
		},
		detail: {
			summary: "Listar equipos",
			description:
				"Lectura pública. Filtros: `clubId`, `category`. Retorna `{ items, total }`.",
			tags: ["Teams"],
		},
	})
	.get("/:id", async ({ params }) => findTeamById(params.id), {
		params: teamIdParamsSchema,
		response: {
			200: selectTeamSchema,
			400: errorMessageSchema,
			404: errorMessageSchema,
		},
		detail: {
			summary: "Obtener equipo por ID",
			description: "Lectura pública. 404 si no existe.",
			tags: ["Teams"],
		},
	})
	.post("/", async ({ body }) => createTeam(body), {
		auth: true,
		body: insertTeamSchema,
		response: {
			200: selectTeamSchema,
			400: errorMessageSchema,
			401: errorMessageSchema,
			403: errorMessageSchema,
			404: errorMessageSchema,
		},
		beforeHandle: requireGlobalRole("admin", "organizer"),
		detail: {
			summary: "Crear equipo",
			description:
				"Requiere rol global `admin` u `organizer`. 404 si `clubId` no existe.",
			tags: ["Teams"],
		},
	})
	.patch("/:id", async ({ params, body }) => updateTeam(params.id, body), {
		auth: true,
		params: teamIdParamsSchema,
		body: updateTeamSchema,
		response: {
			200: selectTeamSchema,
			400: errorMessageSchema,
			401: errorMessageSchema,
			403: errorMessageSchema,
			404: errorMessageSchema,
		},
		beforeHandle: requireGlobalRole("admin", "organizer"),
		detail: {
			summary: "Actualizar equipo",
			description: "Requiere rol global `admin` u `organizer`.",
			tags: ["Teams"],
		},
	})
	.delete(
		"/:id",
		async ({ params }) => {
			await deleteTeam(params.id);
			return { success: true };
		},
		{
			auth: true,
			params: teamIdParamsSchema,
			beforeHandle: requireGlobalRole("admin"),
			response: {
				200: successSchema,
				401: errorMessageSchema,
				403: errorMessageSchema,
				404: errorMessageSchema,
				409: errorMessageSchema,
			},
			detail: {
				summary: "Eliminar equipo",
				description:
					"Solo `admin` global. 409 si está referenciado por inscripciones o partidos.",
				tags: ["Teams"],
			},
		},
	);
