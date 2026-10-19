import {
	attachMediaToEntitySchema,
	mediaAssetResponseSchema,
	presignedUrlRequestSchema,
	presignedUrlResponseSchema,
} from "@sports/schemas";
import { Elysia, t } from "elysia";
import { errorMessageSchema, successSchema } from "../lib/openapi-helpers";
import { jwtMiddleware } from "../middlewares/auth.middleware";
import { requireGlobalRole } from "../middlewares/role.guard";
import {
	attachMediaToEntity,
	createPresignedUploadUrl,
	getMediaAsset,
	listEntityMedia,
	removeMediaFromEntity,
	updateEntityMedia,
} from "../services/media.service";

export const mediaRoutes = new Elysia({ prefix: "/media", tags: ["Media"] })
	.use(jwtMiddleware)
	.post(
		"/presigned-url",
		async ({ body, userId }) => {
			return createPresignedUploadUrl(body, userId);
		},
		{
			auth: true,
			body: presignedUrlRequestSchema,
			response: {
				200: presignedUrlResponseSchema,
				400: errorMessageSchema,
				401: errorMessageSchema,
			},
			detail: {
				summary: "Generar URL prefirmada para upload a S3",
				description:
					"Genera una URL prefirmada para subir un archivo directamente a S3. El frontend sube el archivo a esta URL y luego registra el asset con POST /media/attach.",
				tags: ["Media"],
			},
		},
	)
	.post(
		"/attach",
		async ({ body }) => {
			await attachMediaToEntity(body);
			return { success: true };
		},
		{
			auth: true,
			body: attachMediaToEntitySchema,
			beforeHandle: requireGlobalRole("admin", "organizer"),
			response: {
				200: successSchema,
				400: errorMessageSchema,
				401: errorMessageSchema,
				403: errorMessageSchema,
				404: errorMessageSchema,
			},
			detail: {
				summary: "Asociar un asset a una entidad",
				description:
					"Asocia un asset multimedia (imagen o video) a una entidad (torneo, edición, partido, equipo, club, jugador, etc.).",
				tags: ["Media"],
			},
		},
	)
	.get(
		"/entity/:entityType/:entityId",
		async ({ params }) => {
			return { items: await listEntityMedia(params.entityType, params.entityId) };
		},
		{
			response: {
				200: t.Object({ items: t.Array(t.Record(t.String(), t.Any())) }),
				400: errorMessageSchema,
			},
			detail: {
				summary: "Listar media de una entidad",
				description:
					"Lista todos los assets multimedia asociados a una entidad específica.",
				tags: ["Media"],
			},
		},
	)
	.get(
		"/:id",
		async ({ params }) => getMediaAsset(params.id),
		{
			response: {
				200: mediaAssetResponseSchema,
				400: errorMessageSchema,
				404: errorMessageSchema,
			},
			detail: {
				summary: "Obtener un asset multimedia",
				description: "Obtiene la información de un asset multimedia por su ID.",
				tags: ["Media"],
			},
		},
	)
	.delete(
		"/entity-media/:id",
		async ({ params }) => removeMediaFromEntity(params.id),
		{
			auth: true,
			beforeHandle: requireGlobalRole("admin", "organizer"),
			response: {
				200: successSchema,
				400: errorMessageSchema,
				401: errorMessageSchema,
				403: errorMessageSchema,
				404: errorMessageSchema,
			},
			detail: {
				summary: "Desasociar un asset de una entidad",
				description:
					"Elimina la asociación entre un asset multimedia y una entidad. El asset no se elimina de S3.",
				tags: ["Media"],
			},
		},
	)
	.patch(
		"/entity-media/:id",
		async ({ params, body }) => {
			await updateEntityMedia(params.id, body as { isFeatured?: boolean; displayOrder?: number });
			return { success: true };
		},
		{
			auth: true,
			beforeHandle: requireGlobalRole("admin", "organizer"),
			response: {
				200: successSchema,
				400: errorMessageSchema,
				401: errorMessageSchema,
				403: errorMessageSchema,
				404: errorMessageSchema,
			},
			detail: {
				summary: "Actualizar asociación de media",
				description:
					"Actualiza las propiedades de una asociación de media (destacado, orden).",
				tags: ["Media"],
			},
		},
	);
