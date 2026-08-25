import {
  createInsertSchema,
  createSelectSchema,
} from "drizzle-orm/typebox-legacy";
import { t, type Static } from "elysia";
import {
  tournaments,
  tournamentEditions,
  tournamentStages,
  stageGroups,
} from "../../db/src/tables";

export const selectTournamentSchema = createSelectSchema(tournaments);
export const insertTournamentSchema = createInsertSchema(tournaments);

export const selectTournamentEditionSchema = createSelectSchema(tournamentEditions);
export const insertTournamentEditionSchema = createInsertSchema(tournamentEditions);

export const selectTournamentStageSchema = createSelectSchema(tournamentStages);
export const insertTournamentStageSchema = createInsertSchema(tournamentStages);

export const selectStageGroupSchema = createSelectSchema(stageGroups);
export const insertStageGroupSchema = createInsertSchema(stageGroups);

export type Tournament = Static<typeof selectTournamentSchema>;
export type InsertTournament = Static<typeof insertTournamentSchema>;
export type TournamentEdition = Static<typeof selectTournamentEditionSchema>;
export type TournamentStage = Static<typeof selectTournamentStageSchema>;
export type StageGroup = Static<typeof selectStageGroupSchema>;
