import { boolean, integer, timestamp, uuid, varchar } from "drizzle-orm/pg-core/columns";
import { index } from "drizzle-orm/pg-core/indexes";
import { pgTable } from "drizzle-orm/pg-core/table";
import { mediaAssets } from "./media-assets";

/**
 * Relación entre una entidad (torneo, edición, partido, equipo, club, jugador, etc.)
 * y sus assets multimedia. Soporta destacadas y orden de visualización.
 */
export const entityMedia = pgTable(
	"entity_media",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		entityType: varchar("entity_type", { length: 30 }).notNull(),
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
		index("entity_media_unique").on(t.entityType, t.entityId, t.mediaId),
		index("entity_media_entity_idx").on(t.entityType, t.entityId),
	],
);
