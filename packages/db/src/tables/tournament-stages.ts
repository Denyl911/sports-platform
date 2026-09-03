import { sql } from "drizzle-orm";
import { check } from "drizzle-orm/pg-core/checks";
import { integer, jsonb, uuid, varchar } from "drizzle-orm/pg-core/columns";
import { index, uniqueIndex } from "drizzle-orm/pg-core/indexes";
import { pgTable } from "drizzle-orm/pg-core/table";
import { stageTypeEnum } from "./enums";
import { tournamentEditions } from "./tournament-editions";

export const tournamentStages = pgTable(
	"tournament_stages",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		editionId: uuid("edition_id")
			.references(() => tournamentEditions.id, { onDelete: "cascade" })
			.notNull(),
		name: varchar("name", { length: 50 }).notNull(),
		stageType: stageTypeEnum("stage_type").notNull(),
		sequenceOrder: integer("sequence_order").default(1).notNull(),
		advancementRules: jsonb("advancement_rules").default({}).notNull(),
	},
	(t) => [
		// Una etapa no puede repetir sequence_order dentro de la misma edición
		uniqueIndex("stage_sequence_unique").on(t.editionId, t.sequenceOrder),
		check("sequence_order_positive", sql`${t.sequenceOrder} > 0`),
		// Índices de consulta
		index("tournament_stages_edition_id_idx").on(t.editionId),
	],
);
