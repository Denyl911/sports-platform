
import { uuid, varchar, text } from "drizzle-orm/pg-core/columns";
import { pgTable } from "drizzle-orm/pg-core/table";

export const clubs = pgTable("clubs", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  logoUrl: text("logo_url"),
});
