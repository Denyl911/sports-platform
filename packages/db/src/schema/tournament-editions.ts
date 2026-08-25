import { sql } from "drizzle-orm";
import { date, timestamp, uuid, varchar } from "drizzle-orm/pg-core/columns";
import { pgTable } from "drizzle-orm/pg-core/table";
import { index } from "drizzle-orm/pg-core/indexes";
import { check } from "drizzle-orm/pg-core/checks";
import { tournaments } from "./tournaments";
import { editionStatusEnum } from "./enums";

export const tournamentEditions = pgTable(
  "tournament_editions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tournamentId: uuid("tournament_id")
      .references(() => tournaments.id, { onDelete: "cascade" })
      .notNull(),
    name: varchar("name", { length: 100 }).notNull(),
    category: varchar("category", { length: 50 }).notNull(),
    startDate: date("start_date"),
    endDate: date("end_date"),
    status: editionStatusEnum("status").default("draft").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    check("edition_dates_valid", sql`${t.startDate} IS NULL OR ${t.endDate} IS NULL OR ${t.startDate} <= ${t.endDate}`),
    // Índices de consulta
    index("tournament_editions_tournament_id_idx").on(t.tournamentId),
  ]
);
