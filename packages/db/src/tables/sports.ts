import { sql } from "drizzle-orm";
import { jsonb, varchar, boolean, integer } from "drizzle-orm/pg-core/columns";
import { pgTable } from "drizzle-orm/pg-core/table";
import { check } from "drizzle-orm/pg-core/checks";

export const sports = pgTable(
  "sports",
  {
    id: varchar("id", { length: 32 }).primaryKey(),
    name: varchar("name", { length: 50 }).notNull(),
    hasDraws: boolean("has_draws").default(true).notNull(),
    periodName: varchar("period_name", { length: 20 }).default("half").notNull(),
    regularPeriods: integer("regular_periods").default(2).notNull(),
    scoringRules: jsonb("scoring_rules").$type<Record<string, number>>().default({}).notNull(),
  },
  (t) => [
    check("regular_periods_positive", sql`${t.regularPeriods} > 0`),
  ]
);
