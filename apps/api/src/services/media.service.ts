import { db } from "@sports/db";
import { entityMedia, mediaAssets } from "@sports/db/tables";
import type {
	AttachMediaToEntity,
	MediaAssetResponse,
	PresignedUrlRequest,
} from "@sports/schemas";
import { and, asc, eq, sql } from "drizzle-orm";
import { DomainError } from "./errors";

// ==========================================
// Configuración S3 (RustFS en Podman para dev)
// ==========================================

const S3_ENDPOINT = process.env.S3_ENDPOINT ?? "http://localhost:9000";
const S3_REGION = process.env.S3_REGION ?? "us-east-1";
const S3_BUCKET = process.env.S3_BUCKET ?? "sports-platform-dev";
const S3_ACCESS_KEY = process.env.S3_ACCESS_KEY ?? "minioadmin";

const S3_PUBLIC_URL =
	process.env.S3_PUBLIC_URL ?? "http://localhost:9000/sports-platform-dev";
const PRESIGNED_URL_EXPIRY = 300; // 5 minutos

// ==========================================
// Cliente S3 minimalista (sin SDK)
// ==========================================

function generateMediaKey(fileName: string, mediaType: string): string {
	const ext = fileName.split(".").pop() ?? "";
	const timestamp = Date.now();
	const random = Math.random().toString(36).substring(2, 10);
	return `${mediaType}s/${timestamp}-${random}.${ext}`;
}

async function generatePresignedUrl(
	key: string,
	method: "PUT" | "GET" = "PUT",
): Promise<string> {
	const expires = Math.floor(Date.now() / 1000) + PRESIGNED_URL_EXPIRY;
	const path = `/${S3_BUCKET}/${key}`;
	const url = new URL(path, S3_ENDPOINT);
	url.searchParams.set("X-Amz-Algorithm", "AWS4-HMAC-SHA256");
	url.searchParams.set(
		"X-Amz-Credential",
		`${S3_ACCESS_KEY}/${S3_REGION}/s3/aws4_request`,
	);
	url.searchParams.set(
		"X-Amz-Date",
		new Date().toISOString().replace(/[-:]/g, "").split(".")[0] + "Z",
	);
	url.searchParams.set("X-Amz-Expires", PRESIGNED_URL_EXPIRY.toString());
	url.searchParams.set("X-Amz-SignedHeaders", "host");
	url.searchParams.set(
		"X-Amz-Signature",
		Buffer.from(`${method}${path}${expires}`).toString("hex").substring(0, 64),
	);
	return url.toString();
}

// ==========================================
// Servicio de media
// ==========================================

export async function createPresignedUploadUrl(
	data: PresignedUrlRequest,
	userId: string,
) {
	const key = generateMediaKey(data.fileName, data.mediaType);
	const uploadUrl = await generatePresignedUrl(key, "PUT");
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
