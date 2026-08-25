
import { sql } from "drizzle-orm";
import { uuid, varchar, date } from "drizzle-orm/pg-core/columns";
import { pgTable } from "drizzle-orm/pg-core/table";
import { check } from "drizzle-orm/pg-core/checks";
import { index } from "drizzle-orm/pg-core/indexes";

export const players = pgTable(
  "players",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    firstName: varchar("first_name", { length: 60 }).notNull(),
    lastName: varchar("last_name", { length: 60 }).notNull(),
    birthDate: date("birth_date"),
    idCardNumber: varchar("id_card_number", { length: 30 }).unique(),
  },
  (t) => [
    check("birth_date_past", sql`${t.birthDate} IS NULL OR ${t.birthDate} <= CURRENT_DATE`),
    index("players_last_name_idx").on(t.lastName),
  ]
);
