
import { uuid, integer, timestamp } from "drizzle-orm/pg-core/columns";
import { pgTable } from "drizzle-orm/pg-core/table";
import { stageGroups } from "./stage-groups";
import { teams } from "./teams";
import { unique } from "drizzle-orm/pg-core/unique-constraint";

export const stageStandings = pgTable(
  "stage_standings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    groupId: uuid("group_id")
      .references(() => stageGroups.id, { onDelete: "cascade" })
      .notNull(),
    teamId: uuid("team_id")
      .references(() => teams.id, { onDelete: "cascade" })
      .notNull(),

    played: integer("played").default(0).notNull(),
    won: integer("won").default(0).notNull(),
    drawn: integer("drawn").default(0).notNull(),
    lost: integer("lost").default(0).notNull(),

    points: integer("points").default(0).notNull(),

    scoreFor: integer("score_for").default(0).notNull(),
    scoreAgainst: integer("score_against").default(0).notNull(),
    scoreDifference: integer("score_difference").default(0).notNull(),

    bonusPoints: integer("bonus_points").default(0).notNull(),
    rankPosition: integer("rank_position"),

    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    unique("stage_team_standings_unique").on(t.groupId, t.teamId),
  ]
);
