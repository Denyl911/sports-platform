
import { uuid, varchar, date } from "drizzle-orm/pg-core/columns";
import { pgTable } from "drizzle-orm/pg-core/table";

export const players = pgTable("players", {
  id: uuid("id").defaultRandom().primaryKey(),
  firstName: varchar("first_name", { length: 60 }).notNull(),
  lastName: varchar("last_name", { length: 60 }).notNull(),
  birthDate: date("birth_date"),
  idCardNumber: varchar("id_card_number", { length: 30 }).unique(),
});
