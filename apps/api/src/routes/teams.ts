import { Elysia } from "elysia";
import {
	insertTeamSchema,
	teamFilterQuerySchema,
	teamIdParamsSchema,
	updateTeamSchema,
} from "@sports/schemas";
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
	// Lectura pública
	.get("/", async ({ query }) => listTeams(query), {
		query: teamFilterQuerySchema,
	})
	.get("/:id", async ({ params }) => findTeamById(params.id), {
		params: teamIdParamsSchema,
	})
	// Escritura: admin global u organizer
	.post("/", async ({ body }) => createTeam(body), {
		auth: true,
		body: insertTeamSchema,
		beforeHandle: requireGlobalRole("admin", "organizer"),
		detail: { summary: "Crear equipo" },
	})
	.patch("/:id", async ({ params, body }) => updateTeam(params.id, body), {
		auth: true,
		params: teamIdParamsSchema,
		body: updateTeamSchema,
		beforeHandle: requireGlobalRole("admin", "organizer"),
		detail: { summary: "Actualizar equipo" },
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
			detail: { summary: "Eliminar equipo" },
		},
	);
