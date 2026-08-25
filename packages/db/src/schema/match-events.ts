
import { sql } from "drizzle-orm";
import { integer, jsonb, uuid, varchar } from "drizzle-orm/pg-core/columns";
import { pgTable } from "drizzle-orm/pg-core/table";
import { index } from "drizzle-orm/pg-core/indexes";
import { check } from "drizzle-orm/pg-core/checks";
import { matches } from "./matches";
import { teams } from "./teams";
import { players } from "./players";

export const matchEvents = pgTable(
  "match_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    matchId: uuid("match_id")
      .references(() => matches.id, { onDelete: "cascade" })
      .notNull(),
    teamId: uuid("team_id").references(() => teams.id),
    playerId: uuid("player_id").references(() => players.id),
    assistPlayerId: uuid("assist_player_id").references(() => players.id),

    periodNumber: integer("period_number"),
    minuteOrSecond: integer("minute_or_second"),

    eventType: varchar("event_type", { length: 40 }).notNull(),
    eventValue: integer("event_value").default(1).notNull(),
    metadata: jsonb("metadata").default({}).notNull(),
  },
  (t) => [
    check("event_value_positive", sql`${t.eventValue} > 0`),
    check(
      "minute_or_second_non_negative",
      sql`${t.minuteOrSecond} IS NULL OR ${t.minuteOrSecond} >= 0`
    ),
    // Índices de consulta (críticos para tiempo real)
    index("match_events_match_id_idx").on(t.matchId),
    index("match_events_player_id_idx").on(t.playerId),
  ]
);
