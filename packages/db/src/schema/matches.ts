
import { uuid, integer, varchar, timestamp, jsonb, boolean } from "drizzle-orm/pg-core/columns";
import { pgTable } from "drizzle-orm/pg-core/table";
import { AnyPgColumn } from "drizzle-orm/pg-core/columns";
import { stageGroups } from "./stage-groups";
import { teams } from "./teams";
import { venues } from "./venues";
import { matchStatusEnum } from "./enums";

export const matches = pgTable("matches", {
  id: uuid("id").defaultRandom().primaryKey(),
  groupId: uuid("group_id")
    .references(() => stageGroups.id, { onDelete: "cascade" })
    .notNull(),
  roundNumber: integer("round_number").default(1).notNull(),
  matchNumber: integer("match_number"),

  homeTeamId: uuid("home_team_id").references(() => teams.id),
  awayTeamId: uuid("away_team_id").references(() => teams.id),

  venueId: uuid("venue_id").references(() => venues.id),
  scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
  status: matchStatusEnum("status").default("scheduled").notNull(),

  homeScore: integer("home_score").default(0).notNull(),
  awayScore: integer("away_score").default(0).notNull(),

  // Progresión de llaves (Self-references)
  nextMatchId: uuid("next_match_id").references((): AnyPgColumn => matches.id),
  loserNextMatchId: uuid("loser_next_match_id").references((): AnyPgColumn => matches.id),

  metadata: jsonb("metadata").default({}).notNull(),
});
