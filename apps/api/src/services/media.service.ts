import { db } from "@sports/db";
import { entityMedia, mediaAssets } from "@sports/db/tables";
import type {
	AttachMediaToEntity,
	MediaAssetResponse,
	PresignedUrlRequest,
} from "@sports/schemas";
import { S3Client } from "bun";
import { and, asc, eq, sql } from "drizzle-orm";
import { DomainError } from "./errors";

// ==========================================
// Configuración S3 (RustFS en Podman para dev)
// ==========================================

const S3_ENDPOINT = process.env.S3_ENDPOINT ?? "http://localhost:9000";
const S3_REGION = process.env.S3_REGION ?? "us-east-1";
const S3_BUCKET = process.env.S3_BUCKET ?? "sports-platform-dev";

const S3_PUBLIC_URL =
	process.env.S3_PUBLIC_URL ?? `${S3_ENDPOINT}/${S3_BUCKET}`;
const PRESIGNED_URL_EXPIRY = 300; // 5 minutos

// ==========================================
// Cliente S3 (bindings nativos de Bun)
// ==========================================

/**
 * Bun habla S3 sin SDK: firma las URLs en local (sin petición de red) y sube,
 * lee, lista y borra objetos contra cualquier servicio compatible. Las
 * credenciales salen de S3_ACCESS_KEY_ID / S3_SECRET_ACCESS_KEY (o de AWS_*);
 * aquí se aceptan además los nombres cortos del compose para dev.
 */
const s3 = new S3Client({
	accessKeyId:
		process.env.S3_ACCESS_KEY_ID ?? process.env.S3_ACCESS_KEY ?? "minioadmin",
	secretAccessKey:
		process.env.S3_SECRET_ACCESS_KEY ??
		process.env.S3_SECRET_KEY ??
		"minioadmin",
	endpoint: S3_ENDPOINT,
	region: S3_REGION,
	bucket: S3_BUCKET,
});

// ==========================================
// Claves y URLs
// ==========================================

function generateMediaKey(fileName: string, mediaType: string): string {
	const ext = fileName.split(".").pop() ?? "";
	const timestamp = Date.now();
	const random = Math.random().toString(36).substring(2, 10);
	return `${mediaType}s/${timestamp}-${random}.${ext}`;
}

// ==========================================
// Servicio de media
// ==========================================

export async function createPresignedUploadUrl(
	data: PresignedUrlRequest,
	userId: string,
) {
	const key = generateMediaKey(data.fileName, data.mediaType);
	const uploadUrl = s3.presign(key, {
		method: "PUT",
		expiresIn: PRESIGNED_URL_EXPIRY,
	});
	const publicUrl = `${S3_PUBLIC_URL}/${key}`;

	// Registrar el asset en la DB
	const mediaTypeValue = data.mediaType;
	await db.insert(mediaAssets).values({
		key,
		originalName: data.fileName,
		mimeType: data.mimeType,
		sizeBytes: data.fileSize,
		mediaType: sql`${mediaTypeValue}`,
		uploadedBy: userId,
	});

	return {
		uploadUrl,
		mediaKey: key,
		publicUrl,
		expiresIn: PRESIGNED_URL_EXPIRY,
	} as const;
}

export async function getMediaAsset(id: string): Promise<MediaAssetResponse> {
	const [asset] = await db
		.select()
		.from(mediaAssets)
		.where(eq(mediaAssets.id, id))
		.limit(1);

	if (!asset) throw DomainError.notFound(`Media asset '${id}' not found`);

	return {
		id: asset.id,
		key: asset.key,
		originalName: asset.originalName,
		mimeType: asset.mimeType,
		sizeBytes: asset.sizeBytes,
		mediaType: asset.mediaType as "image" | "video",
		publicUrl: `${S3_PUBLIC_URL}/${asset.key}`,
		createdAt: asset.createdAt.toISOString(),
	};
}

export async function attachMediaToEntity(data: AttachMediaToEntity) {
	// Verificar que el asset existe
	const [asset] = await db
		.select({ id: mediaAssets.id })
		.from(mediaAssets)
		.where(eq(mediaAssets.id, data.mediaId))
		.limit(1);
	if (!asset)
		throw DomainError.notFound(`Media asset '${data.mediaId}' not found`);

	const [created] = await db
		.insert(entityMedia)
		.values({
			entityType: data.entityType,
			entityId: data.entityId,
			mediaId: data.mediaId,
			isFeatured: data.isFeatured ?? false,
			displayOrder: data.displayOrder ?? 0,
		})
		.returning();

	return created;
}

export async function listEntityMedia(entityType: string, entityId: string) {
	const items = await db
		.select({
			id: entityMedia.id,
			entityType: entityMedia.entityType,
			entityId: entityMedia.entityId,
			isFeatured: entityMedia.isFeatured,
			displayOrder: entityMedia.displayOrder,
			media: {
				id: mediaAssets.id,
				key: mediaAssets.key,
				originalName: mediaAssets.originalName,
				mimeType: mediaAssets.mimeType,
				sizeBytes: mediaAssets.sizeBytes,
				mediaType: sql`${mediaAssets.mediaType}`.as("media_type"),
				publicUrl: sql`${S3_PUBLIC_URL}/${mediaAssets.key}`.as("public_url"),
				createdAt: sql`${mediaAssets.createdAt}`.as("created_at"),
			},
		})
		.from(entityMedia)
		.innerJoin(mediaAssets, eq(entityMedia.mediaId, mediaAssets.id))
		.where(
			and(
				eq(entityMedia.entityType, entityType),
				eq(entityMedia.entityId, entityId),
			),
		)
		.orderBy(asc(entityMedia.displayOrder), asc(entityMedia.createdAt));

	return items;
}

export async function removeMediaFromEntity(id: string) {
	const [existing] = await db
		.select({ id: entityMedia.id })
		.from(entityMedia)
		.where(eq(entityMedia.id, id))
		.limit(1);
	if (!existing) throw DomainError.notFound(`Entity media '${id}' not found`);

	await db.delete(entityMedia).where(eq(entityMedia.id, id));
	return { success: true };
}

export async function updateEntityMedia(
	id: string,
	data: { isFeatured?: boolean; displayOrder?: number },
) {
	const [existing] = await db
		.select({ id: entityMedia.id })
		.from(entityMedia)
		.where(eq(entityMedia.id, id))
		.limit(1);
	if (!existing) throw DomainError.notFound(`Entity media '${id}' not found`);

	const [updated] = await db
		.update(entityMedia)
		.set(data)
		.where(eq(entityMedia.id, id))
		.returning();

	return updated;
}
