
import { sql } from "drizzle-orm";
import { integer, uuid, varchar, boolean } from "drizzle-orm/pg-core/columns";
import { pgTable } from "drizzle-orm/pg-core/table";
import { check } from "drizzle-orm/pg-core/checks";
import { unique } from "drizzle-orm/pg-core/unique-constraint";
import { index, uniqueIndex } from "drizzle-orm/pg-core/indexes";
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
    // Un solo capitán por equipo en cada edición
    uniqueIndex("roster_single_captain_unique")
      .on(t.editionId, t.teamId)
      .where(sql`${t.isCaptain}`),
    check(
      "jersey_number_valid",
      sql`${t.jerseyNumber} IS NULL OR (${t.jerseyNumber} >= 0 AND ${t.jerseyNumber} <= 99)`
    ),
    // Índices de consulta
    index("tournament_rosters_player_id_idx").on(t.playerId),
  ]
);
