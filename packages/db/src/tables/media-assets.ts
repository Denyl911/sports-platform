import {
	boolean,
	integer,
	timestamp,
	uuid,
	varchar,
} from "drizzle-orm/pg-core/columns";
import { index } from "drizzle-orm/pg-core/indexes";
import { pgTable } from "drizzle-orm/pg-core/table";
import { users } from "./users";

/**
 * Assets multimedia (imágenes y videos) subidos a S3.
 * La URL se genera como `${S3_PUBLIC_URL}/${bucket}/${key}`.
 */
export const mediaAssets = pgTable(
	"media_assets",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		key: varchar("key", { length: 500 }).notNull().unique(),
		originalName: varchar("original_name", { length: 255 }).notNull(),
		mimeType: varchar("mime_type", { length: 100 }).notNull(),
		sizeBytes: integer("size_bytes").notNull(),
		mediaType: varchar("media_type", { length: 20 }).notNull(), // "image" | "video"
		uploadedBy: uuid("uploaded_by")
			.references(() => users.id)
			.notNull(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
	},
	(t) => [index("media_assets_uploaded_by_idx").on(t.uploadedBy)],
);

/**
 * Relación entre una entidad (torneo, edición, partido, equipo, club, jugador, etc.)
 * y sus assets multimedia. Soporta destacadas y orden de visualización.
 */
export const entityMedia = pgTable(
	"entity_media",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		entityType: varchar("entity_type", { length: 30 }).notNull(), // "tournament" | "edition" | "match" | "team" | "club" | "player" | "venue" | "user"
		entityId: uuid("entity_id").notNull(),
		mediaId: uuid("media_id")
			.references(() => mediaAssets.id, { onDelete: "cascade" })
			.notNull(),
		isFeatured: boolean("is_featured").default(false).notNull(),
		displayOrder: integer("display_order").default(0).notNull(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
	},
	(t) => [
		// Un asset solo puede estar asociado una vez a la misma entidad
		index("entity_media_unique").on(t.entityType, t.entityId, t.mediaId),
		index("entity_media_entity_idx").on(t.entityType, t.entityId),
	],
);
