import { sql } from "drizzle-orm";
import { check } from "drizzle-orm/pg-core/checks";
import { boolean, integer, jsonb, varchar } from "drizzle-orm/pg-core/columns";
import { pgTable } from "drizzle-orm/pg-core/table";

export const sports = pgTable(
	"sports",
	{
		id: varchar("id", { length: 32 }).primaryKey(),
		name: varchar("name", { length: 50 }).notNull(),
		hasDraws: boolean("has_draws").default(true).notNull(),
		periodName: varchar("period_name", { length: 20 })
			.default("half")
			.notNull(),
		regularPeriods: integer("regular_periods").default(2).notNull(),
		icon: varchar("icon", { length: 50 }),
		scoringRules: jsonb("scoring_rules")
			.$type<Record<string, number>>()
			.default({})
			.notNull(),
	},
	(t) => [check("regular_periods_positive", sql`${t.regularPeriods} > 0`)],
);
