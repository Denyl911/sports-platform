
import { uuid, varchar } from "drizzle-orm/pg-core/columns";
import { pgTable } from "drizzle-orm/pg-core/table";
import { tournamentStages } from "./tournament-stages";

export const stageGroups = pgTable("stage_groups", {
  id: uuid("id").defaultRandom().primaryKey(),
  stageId: uuid("stage_id")
    .references(() => tournamentStages.id, { onDelete: "cascade" })
    .notNull(),
  name: varchar("name", { length: 50 }).notNull(),
});
