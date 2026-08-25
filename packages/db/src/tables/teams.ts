import { sql } from "drizzle-orm";
import { uuid, varchar } from "drizzle-orm/pg-core/columns";
import { pgTable } from "drizzle-orm/pg-core/table";
import { check } from "drizzle-orm/pg-core/checks";
import { index } from "drizzle-orm/pg-core/indexes";
import { clubs } from "./clubs";

export const teams = pgTable(
	"teams",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		clubId: uuid("club_id").references(() => clubs.id, {
			onDelete: "set null",
		}),
		name: varchar("name", { length: 100 }).notNull(),
		category: varchar("category", { length: 50 }),
	},
	(t) => [
		// Índices de consulta
		index("teams_club_id_idx").on(t.clubId),
		index("teams_category_idx").on(t.category),
		check("team_name_not_empty", sql`length(trim(${t.name})) > 0`),
	],
);
