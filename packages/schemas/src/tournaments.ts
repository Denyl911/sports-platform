import {
	createInsertSchema,
	createSelectSchema,
	createUpdateSchema,
} from "drizzle-orm/typebox-legacy";
import { t, type Static } from "elysia";
import {
	tournaments,
	tournamentEditions,
	tournamentStages,
	stageGroups,
} from "@sports/db/tables";

export const selectTournamentSchema = createSelectSchema(tournaments);
export const insertTournamentSchema = createInsertSchema(tournaments);
export const updateTournamentSchema = createUpdateSchema(tournaments);

export const selectTournamentEditionSchema =
	createSelectSchema(tournamentEditions);
export const insertTournamentEditionSchema =
	createInsertSchema(tournamentEditions);
export const updateTournamentEditionSchema =
	createUpdateSchema(tournamentEditions);

export const selectTournamentStageSchema = createSelectSchema(tournamentStages);
export const insertTournamentStageSchema = createInsertSchema(tournamentStages);
export const updateTournamentStageSchema = createUpdateSchema(tournamentStages);

export const selectStageGroupSchema = createSelectSchema(stageGroups);
export const insertStageGroupSchema = createInsertSchema(stageGroups);
export const updateStageGroupSchema = createUpdateSchema(stageGroups);

// ==========================================
// DTOs PARA ENDPOINTS Y FORMULARIOS
// ==========================================

export const tournamentIdParamsSchema = t.Object({
	id: t.String({ format: "uuid" }),
});
export const editionIdParamsSchema = t.Object({
	id: t.String({ format: "uuid" }),
});
export const stageIdParamsSchema = t.Object({
	id: t.String({ format: "uuid" }),
});
export const groupIdParamsSchema = t.Object({
	id: t.String({ format: "uuid" }),
});
export const registrationIdParamsSchema = t.Object({
	id: t.String({ format: "uuid" }),
});

// Referencias para rutas anidadas (la clave del param coincide con el nombre del recurso)
export const tournamentRefParamsSchema = t.Object({
	tournamentId: t.String({ format: "uuid" }),
});
export const editionRefParamsSchema = t.Object({
	editionId: t.String({ format: "uuid" }),
});
export const stageRefParamsSchema = t.Object({
	stageId: t.String({ format: "uuid" }),
});
export const groupRefParamsSchema = t.Object({
	groupId: t.String({ format: "uuid" }),
});

// Query params para filtros: /tournaments?sportId=...
export const tournamentFilterQuerySchema = t.Object({
	sportId: t.Optional(t.String({ minLength: 1, maxLength: 32 })),
});

export type TournamentFilterQuery = Static<typeof tournamentFilterQuerySchema>;
export type Tournament = Static<typeof selectTournamentSchema>;
export type InsertTournament = Static<typeof insertTournamentSchema>;
export type UpdateTournament = Static<typeof updateTournamentSchema>;
export type TournamentEdition = Static<typeof selectTournamentEditionSchema>;
export type InsertTournamentEdition = Static<
	typeof insertTournamentEditionSchema
>;
export type UpdateTournamentEdition = Static<
	typeof updateTournamentEditionSchema
>;
export type TournamentStage = Static<typeof selectTournamentStageSchema>;
export type InsertTournamentStage = Static<typeof insertTournamentStageSchema>;
export type UpdateTournamentStage = Static<typeof updateTournamentStageSchema>;
export type StageGroup = Static<typeof selectStageGroupSchema>;
export type InsertStageGroup = Static<typeof insertStageGroupSchema>;
export type UpdateStageGroup = Static<typeof updateStageGroupSchema>;
