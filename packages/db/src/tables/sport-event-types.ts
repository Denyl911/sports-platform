import { boolean, integer, uuid, varchar } from "drizzle-orm/pg-core/columns";
import { pgTable } from "drizzle-orm/pg-core/table";
import { unique } from "drizzle-orm/pg-core/unique-constraint";
import { sports } from "./sports";

export const sportEventTypes = pgTable(
  "sport_event_types",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sportId: varchar("sport_id", { length: 32 })
      .references(() => sports.id, { onDelete: "cascade" })
      .notNull(),
    code: varchar("code", { length: 40 }).notNull(),
    name: varchar("name", { length: 60 }).notNull(),
    affectsScore: boolean("affects_score").default(false).notNull(),
    defaultValue: integer("default_value").default(1).notNull(),
  },
  (t) => [unique("sport_event_type_unique").on(t.sportId, t.code)]
);
