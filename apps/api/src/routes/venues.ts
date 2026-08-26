import { Elysia, t } from "elysia";
import {
	insertVenueSchema,
	updateVenueSchema,
	venueIdParamsSchema,
} from "@sports/schemas";
import { jwtMiddleware } from "../middlewares/auth.middleware";
import { requireGlobalRole } from "../middlewares/role.guard";
import {
	createVenue,
	deleteVenue,
	findVenueById,
	listVenues,
	updateVenue,
} from "../services/venue.service";

export const venuesRoutes = new Elysia({ prefix: "/venues", tags: ["Venues"] })
	.use(jwtMiddleware)
	// Lectura pública
	.get("/", async () => listVenues())
	.get("/:id", async ({ params }) => findVenueById(params.id), {
		params: venueIdParamsSchema,
	})
	// Escritura: solo administración global
	.post("/", async ({ body }) => createVenue(body), {
		auth: true,
		body: insertVenueSchema,
		beforeHandle: requireGlobalRole("admin"),
		detail: { summary: "Crear sede" },
	})
	.patch("/:id", async ({ params, body }) => updateVenue(params.id, body), {
		auth: true,
		params: venueIdParamsSchema,
		body: updateVenueSchema,
		beforeHandle: requireGlobalRole("admin"),
		detail: { summary: "Actualizar sede" },
	})
	.delete(
		"/:id",
		async ({ params }) => {
			await deleteVenue(params.id);
			return { success: true };
		},
		{
			auth: true,
			params: venueIdParamsSchema,
			beforeHandle: requireGlobalRole("admin"),
			response: {
				200: t.Object({ success: t.Boolean() }),
				404: t.Object({ message: t.String() }),
			},
			detail: { summary: "Eliminar sede" },
		},
	);
