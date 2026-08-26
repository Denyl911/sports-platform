import { Elysia } from "elysia";
import {
	insertPlayerSchema,
	playerSearchQuerySchema,
	playerIdParamsSchema,
	updatePlayerSchema,
} from "@sports/schemas";
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
	// Lectura pública (con búsqueda opcional por apellido)
	.get("/", async ({ query }) => listPlayers(query.search), {
		query: playerSearchQuerySchema,
	})
	.get("/:id", async ({ params }) => findPlayerById(params.id), {
		params: playerIdParamsSchema,
	})
	// Escritura: admin global u organizer
	.post("/", async ({ body }) => createPlayer(body), {
		auth: true,
		body: insertPlayerSchema,
		beforeHandle: requireGlobalRole("admin", "organizer"),
		detail: { summary: "Registrar jugador" },
	})
	.patch("/:id", async ({ params, body }) => updatePlayer(params.id, body), {
		auth: true,
		params: playerIdParamsSchema,
		body: updatePlayerSchema,
		beforeHandle: requireGlobalRole("admin", "organizer"),
		detail: { summary: "Actualizar jugador" },
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
			detail: { summary: "Eliminar jugador" },
		},
	);
