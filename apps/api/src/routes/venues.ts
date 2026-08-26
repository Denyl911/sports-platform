import {
	insertVenueSchema,
	selectVenueSchema,
	updateVenueSchema,
	venueIdParamsSchema,
} from "@sports/schemas";
import { Elysia, t } from "elysia";
import { errorMessageSchema, successSchema } from "../lib/openapi-helpers";
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
	.get("/", async () => listVenues(), {
		response: {
			200: t.Object({ items: t.Array(selectVenueSchema), total: t.Integer() }),
		},
		detail: {
			summary: "Listar sedes",
			description: "Lectura pública. Retorna `{ items, total }`.",
			tags: ["Venues"],
		},
	})
	.get("/:id", async ({ params }) => findVenueById(params.id), {
		params: venueIdParamsSchema,
		response: {
			200: selectVenueSchema,
			400: errorMessageSchema,
			404: errorMessageSchema,
		},
		detail: {
			summary: "Obtener sede por ID",
			description: "Lectura pública. 400 si `id` no es UUID. 404 si no existe.",
			tags: ["Venues"],
		},
	})
	.post("/", async ({ body }) => createVenue(body), {
		auth: true,
		body: insertVenueSchema,
		response: {
			200: selectVenueSchema,
			400: errorMessageSchema,
			401: errorMessageSchema,
			403: errorMessageSchema,
		},
		beforeHandle: requireGlobalRole("admin"),
		detail: {
			summary: "Crear sede",
			description: "Solo `admin` global.",
			tags: ["Venues"],
		},
	})
	.patch("/:id", async ({ params, body }) => updateVenue(params.id, body), {
		auth: true,
		params: venueIdParamsSchema,
		body: updateVenueSchema,
		response: {
			200: selectVenueSchema,
			400: errorMessageSchema,
			401: errorMessageSchema,
			403: errorMessageSchema,
			404: errorMessageSchema,
		},
		beforeHandle: requireGlobalRole("admin"),
		detail: {
			summary: "Actualizar sede",
			description: "Solo `admin` global.",
			tags: ["Venues"],
		},
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
				200: successSchema,
				401: errorMessageSchema,
				403: errorMessageSchema,
				404: errorMessageSchema,
				409: errorMessageSchema,
			},
			detail: {
				summary: "Eliminar sede",
				description:
					"Solo `admin` global. 409 si está referenciada por partidos.",
				tags: ["Venues"],
			},
		},
	);
