
import { uuid, varchar, jsonb, integer } from "drizzle-orm/pg-core/columns";
import { pgTable } from "drizzle-orm/pg-core/table";
import { tournamentEditions } from "./tournament-editions";
import { stageTypeEnum } from "./enums";

export const tournamentStages = pgTable("tournament_stages", {
  id: uuid("id").defaultRandom().primaryKey(),
  editionId: uuid("edition_id")
    .references(() => tournamentEditions.id, { onDelete: "cascade" })
    .notNull(),
  name: varchar("name", { length: 50 }).notNull(),
  stageType: stageTypeEnum("stage_type").notNull(),
  sequenceOrder: integer("sequence_order").default(1).notNull(),
  advancementRules: jsonb("advancement_rules").default({}).notNull(),
});
