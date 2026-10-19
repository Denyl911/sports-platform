import { type Static, t } from "elysia";

/**
 * Schemas TypeBox para el sistema de imágenes y videos.
 */

export const mediaTypeSchema = t.Union([t.Literal("image"), t.Literal("video")]);

export const presignedUrlRequestSchema = t.Object({
	fileName: t.String({ minLength: 1, maxLength: 255 }),
	mimeType: t.String({ minLength: 1, maxLength: 100 }),
	mediaType: mediaTypeSchema,
	fileSize: t.Integer({ minimum: 1, maximum: 52_428_800 }), // 5MB max
});

export const presignedUrlResponseSchema = t.Object({
	uploadUrl: t.String(),
	mediaKey: t.String(),
	publicUrl: t.String(),
	expiresIn: t.Integer(),
});

export const attachMediaToEntitySchema = t.Object({
	entityType: t.String({ minLength: 1, maxLength: 30 }),
	entityId: t.String({ format: "uuid" }),
	mediaId: t.String({ format: "uuid" }),
	isFeatured: t.Optional(t.Boolean()),
	displayOrder: t.Optional(t.Integer({ minimum: 0 })),
});

export const mediaAssetResponseSchema = t.Object({
	id: t.String({ format: "uuid" }),
	key: t.String(),
	originalName: t.String(),
	mimeType: t.String(),
	sizeBytes: t.Integer(),
	mediaType: mediaTypeSchema,
	publicUrl: t.String(),
	createdAt: t.String({ format: "date-time" }),
});

export const entityMediaResponseSchema = t.Object({
	id: t.String({ format: "uuid" }),
	entityType: t.String(),
	entityId: t.String({ format: "uuid" }),
	media: mediaAssetResponseSchema,
	isFeatured: t.Boolean(),
	displayOrder: t.Integer(),
});

// ==========================================
// TIPOS TYPESCRIPT INFERIDOS
// ==========================================

export type MediaType = Static<typeof mediaTypeSchema>;
export type PresignedUrlRequest = Static<typeof presignedUrlRequestSchema>;
export type PresignedUrlResponse = Static<typeof presignedUrlResponseSchema>;
export type AttachMediaToEntity = Static<typeof attachMediaToEntitySchema>;
export type MediaAssetResponse = Static<typeof mediaAssetResponseSchema>;
export type EntityMediaResponse = Static<typeof entityMediaResponseSchema>;
