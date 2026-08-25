import { uuid, varchar, text, timestamp } from "drizzle-orm/pg-core/columns";
import { pgTable } from "drizzle-orm/pg-core/table";
import { sports } from "./sports";

export const tournaments = pgTable("tournaments", {
  id: uuid("id").defaultRandom().primaryKey(),
  sportId: varchar("sport_id", { length: 32 })
    .references(() => sports.id)
    .notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
