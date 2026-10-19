// @ts-nocheck

import {
	insertPlayerSchema,
	playerIdParamsSchema,
	playerSearchQuerySchema,
	selectPlayerSchema,
	updatePlayerSchema,
} from "@sports/schemas";
import { Elysia, t } from "elysia";
import { errorMessageSchema, successSchema } from "../lib/openapi-helpers";
import { jwtMiddleware } from "../middlewares/auth.middleware";
import { requireGlobalRole } from "../middlewares/role.guard";
import {
	createPlayer,
	deletePlayer,
	findPlayerById,
	listPlayers,
	updatePlayer,
} from "../services/player.service";

export const playersRoutes = new Elysia({
	prefix: "/players",
	tags: ["Players"],
})
	.use(jwtMiddleware)
	.get("/", async ({ query }) => listPlayers(query), {
		query: playerSearchQuerySchema,
		response: {
			200: t.Object({ items: t.Array(selectPlayerSchema), total: t.Integer() }),
			400: errorMessageSchema,
		},
		detail: {
			summary: "Listar jugadores",
			description:
				"Lectura pública. Query opcional `search` filtra por apellido. Retorna `{ items, total }`.",
			tags: ["Players"],
		},
	})
	.get("/:id", async ({ params }) => findPlayerById(params.id), {
		params: playerIdParamsSchema,
		response: {
			200: selectPlayerSchema,
			400: errorMessageSchema,
			404: errorMessageSchema,
		},
		detail: {
			summary: "Obtener jugador por ID",
			description: "Lectura pública. 404 si no existe.",
			tags: ["Players"],
		},
	})
	.post("/", async ({ body }) => createPlayer(body), {
		auth: true,
		body: insertPlayerSchema,
		response: {
			200: selectPlayerSchema,
			400: errorMessageSchema,
			401: errorMessageSchema,
			403: errorMessageSchema,
			409: errorMessageSchema,
		},
		beforeHandle: requireGlobalRole("admin", "organizer"),
		detail: {
			summary: "Registrar jugador",
			description:
				"Requiere rol global `admin` u `organizer`. 409 si `idCardNumber` ya existe.",
			tags: ["Players"],
		},
	})
	.patch("/:id", async ({ params, body }) => updatePlayer(params.id, body), {
		auth: true,
		params: playerIdParamsSchema,
		body: updatePlayerSchema,
		response: {
			200: selectPlayerSchema,
			400: errorMessageSchema,
			401: errorMessageSchema,
			403: errorMessageSchema,
			404: errorMessageSchema,
			409: errorMessageSchema,
		},
		beforeHandle: requireGlobalRole("admin", "organizer"),
		detail: {
			summary: "Actualizar jugador",
			description:
				"Requiere rol global `admin` u `organizer`. 409 si `idCardNumber` colisiona.",
			tags: ["Players"],
		},
	})
	.delete(
		"/:id",
		async ({ params }) => {
			await deletePlayer(params.id);
			return { success: true };
		},
		{
			auth: true,
			params: playerIdParamsSchema,
			beforeHandle: requireGlobalRole("admin"),
			response: {
				200: successSchema,
				401: errorMessageSchema,
				403: errorMessageSchema,
				404: errorMessageSchema,
				409: errorMessageSchema,
			},
			detail: {
				summary: "Eliminar jugador",
				description:
					"Solo `admin` global. 409 si está referenciado por eventos o plantillas.",
				tags: ["Players"],
			},
		},
	);
