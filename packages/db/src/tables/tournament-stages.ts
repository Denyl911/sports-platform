import { sql } from "drizzle-orm";
import { check } from "drizzle-orm/pg-core/checks";
import { integer, jsonb, uuid, varchar } from "drizzle-orm/pg-core/columns";
import { index, uniqueIndex } from "drizzle-orm/pg-core/indexes";
import { pgTable } from "drizzle-orm/pg-core/table";
import { stageTypeEnum } from "./enums";
import { tournamentEditions } from "./tournament-editions";

/**
 * Reglas de avance de la etapa: cuántos equipos bajan de ESTA etapa a la
 * siguiente (la de menor `sequenceOrder` mayor dentro de la edición — el
 * orden ya está en la tabla, la regla no repite el destino).
 *
 * Vive en jsonb porque su forma depende de la forma del destino; v1 solo
 * conoce "N por grupo" hacia una etapa de eliminación directa.
 */
export interface AdvancementRules {
	/** Cuántos equipos por grupo pasan. Ausente o 0: la etapa no alimenta a nadie. */
	qualifyPerGroup?: number;
	/** Cómo se cruzan en la llave: `cross` = A1 vs B2 · `linear` = A1 vs B1. */
	seeding?: "cross" | "linear";
}

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
