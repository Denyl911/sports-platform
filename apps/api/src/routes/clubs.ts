import { Elysia, t } from "elysia";
import {
	clubIdParamsSchema,
	insertClubSchema,
	updateClubSchema,
} from "@sports/schemas";
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
	// Lectura pública
	.get("/", async () => listClubs())
	.get("/:id", async ({ params }) => findClubById(params.id), {
		params: clubIdParamsSchema,
	})
	// Escritura: admin global u organizer de cualquier torneo
	.post("/", async ({ body }) => createClub(body), {
		auth: true,
		body: insertClubSchema,
		beforeHandle: requireGlobalRole("admin", "organizer"),
		detail: { summary: "Crear club" },
	})
	.patch("/:id", async ({ params, body }) => updateClub(params.id, body), {
		auth: true,
		params: clubIdParamsSchema,
		body: updateClubSchema,
		beforeHandle: requireGlobalRole("admin", "organizer"),
		detail: { summary: "Actualizar club" },
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
				200: t.Object({ success: t.Boolean() }),
				404: t.Object({ message: t.String() }),
			},
			detail: { summary: "Eliminar club" },
		},
	);
