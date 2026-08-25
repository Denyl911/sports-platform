
import { uuid, varchar, text, integer } from "drizzle-orm/pg-core/columns";
import { pgTable } from "drizzle-orm/pg-core/table";

export const venues = pgTable("venues", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  address: text("address"),
  fieldCount: integer("field_count").default(1).notNull(),
});
