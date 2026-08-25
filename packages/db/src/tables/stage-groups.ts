import { sql } from "drizzle-orm";
import { uuid, varchar } from "drizzle-orm/pg-core/columns";
import { pgTable } from "drizzle-orm/pg-core/table";
import { unique } from "drizzle-orm/pg-core/unique-constraint";
import { check } from "drizzle-orm/pg-core/checks";
import { index } from "drizzle-orm/pg-core/indexes";
import { tournamentStages } from "./tournament-stages";

export const stageGroups = pgTable(
	"stage_groups",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		stageId: uuid("stage_id")
			.references(() => tournamentStages.id, { onDelete: "cascade" })
			.notNull(),
		name: varchar("name", { length: 50 }).notNull(),
	},
	(t) => [
		unique("stage_group_name_unique").on(t.stageId, t.name),
		// Índices de consulta
		index("stage_groups_stage_id_idx").on(t.stageId),
		check("group_name_not_empty", sql`length(trim(${t.name})) > 0`),
	],
);
