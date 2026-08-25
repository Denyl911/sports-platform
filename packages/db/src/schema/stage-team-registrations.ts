
import { uuid, integer } from "drizzle-orm/pg-core/columns";
import { pgTable } from "drizzle-orm/pg-core/table";
import { stageGroups } from "./stage-groups";
import { teams } from "./teams";
import { unique } from "drizzle-orm/pg-core/unique-constraint";

export const stageTeamRegistrations = pgTable(
  "stage_team_registrations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    groupId: uuid("group_id")
      .references(() => stageGroups.id, { onDelete: "cascade" })
      .notNull(),
    teamId: uuid("team_id")
      .references(() => teams.id, { onDelete: "cascade" })
      .notNull(),
    seedNumber: integer("seed_number"),
  },
  (t) => [
    unique("stage_team_unique").on(t.groupId, t.teamId),
  ]
);
