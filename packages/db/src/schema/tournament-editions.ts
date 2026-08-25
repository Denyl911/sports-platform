
import { uuid, varchar, date } from "drizzle-orm/pg-core/columns";
import { pgTable } from "drizzle-orm/pg-core/table";
import { tournaments } from "./tournaments";

export const tournamentEditions = pgTable("tournament_editions", {
  id: uuid("id").defaultRandom().primaryKey(),
  tournamentId: uuid("tournament_id")
    .references(() => tournaments.id, { onDelete: "cascade" })
    .notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  category: varchar("category", { length: 50 }).notNull(),
  startDate: date("start_date"),
  endDate: date("end_date"),
  status: varchar("status", { length: 20 }).default("draft").notNull(),
});
