
import { uuid, integer, varchar, boolean } from "drizzle-orm/pg-core/columns";
import { pgTable } from "drizzle-orm/pg-core/table";
import { unique } from "drizzle-orm/pg-core/unique-constraint";
import { players } from "./players";
import { teams } from "./teams";
import { tournamentEditions } from "./tournament-editions";

export const tournamentRosters = pgTable(
  "tournament_rosters",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    editionId: uuid("edition_id")
      .references(() => tournamentEditions.id, { onDelete: "cascade" })
      .notNull(),
    teamId: uuid("team_id")
      .references(() => teams.id, { onDelete: "cascade" })
      .notNull(),
    playerId: uuid("player_id")
      .references(() => players.id, { onDelete: "cascade" })
      .notNull(),
    jerseyNumber: integer("jersey_number"),
    position: varchar("position", { length: 30 }),
    isCaptain: boolean("is_captain").default(false).notNull(),
  },
  (t) => [
    unique("roster_unique").on(t.editionId, t.teamId, t.playerId),
  ]
);
