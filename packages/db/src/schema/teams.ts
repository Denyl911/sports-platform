
import { uuid, varchar } from "drizzle-orm/pg-core/columns";
import { pgTable } from "drizzle-orm/pg-core/table";
import { clubs } from "./clubs";

export const teams = pgTable("teams", {
  id: uuid("id").defaultRandom().primaryKey(),
  clubId: uuid("club_id").references(() => clubs.id, { onDelete: "set null" }),
  name: varchar("name", { length: 100 }).notNull(),
  category: varchar("category", { length: 50 }),
});
