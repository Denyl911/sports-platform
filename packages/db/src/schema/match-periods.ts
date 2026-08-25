
import { uuid, integer, varchar } from "drizzle-orm/pg-core/columns";
import { pgTable } from "drizzle-orm/pg-core/table";
import { unique } from "drizzle-orm/pg-core/unique-constraint";
import { matches } from "./matches";

export const matchPeriods = pgTable(
  "match_periods",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    matchId: uuid("match_id")
      .references(() => matches.id, { onDelete: "cascade" })
      .notNull(),
    periodNumber: integer("period_number").notNull(),
    periodType: varchar("period_type", { length: 20 }).default("regular").notNull(),
    homeScore: integer("home_score").default(0).notNull(),
    awayScore: integer("away_score").default(0).notNull(),
  },
  (t) => [
    unique("match_period_unique").on(t.matchId, t.periodNumber, t.periodType),
  ]
);
