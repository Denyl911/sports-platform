import {
	stageGroups,
	tournamentEditions,
	tournamentStages,
	tournaments,
} from "@sports/db/tables";
import {
	createInsertSchema,
	createSelectSchema,
	createUpdateSchema,
} from "drizzle-orm/typebox-legacy";
import { type Static, t } from "elysia";
import { selectTeamSchema } from "./teams";

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
// `insertTournamentStageSchema` y `updateTournamentStageSchema` se declaran en
// la sección "Avance" (override del campo jsonb `advancementRules`).

export const selectStageGroupSchema = createSelectSchema(stageGroups);
export const insertStageGroupSchema = createInsertSchema(stageGroups);
export const updateStageGroupSchema = createUpdateSchema(stageGroups);

// ==========================================
// ==========================================
// Avance entre etapas
// ==========================================

export const advancementRulesSchema = t.Object({
	qualifyPerGroup: t.Optional(t.Integer({ minimum: 1, maximum: 32 })),
	seeding: t.Optional(t.Union([t.Literal("cross"), t.Literal("linear")])),
});

export const insertTournamentStageSchema = createInsertSchema(
	tournamentStages,
	{
		advancementRules: t.Optional(advancementRulesSchema),
	},
);
export const updateTournamentStageSchema = createUpdateSchema(
	tournamentStages,
	{
		advancementRules: t.Optional(advancementRulesSchema),
	},
);

export const stageQualifierSchema = t.Object({
	groupId: t.String({ format: "uuid" }),
	groupName: t.String(),
	position: t.Integer({ minimum: 1 }),
	qualified: t.Boolean(),
	team: t.Pick(selectTeamSchema, ["id", "name"]),
});

export const stageQualifiersSchema = t.Object({
	rule: t.Union([advancementRulesSchema, t.Null()]),
	items: t.Array(stageQualifierSchema),
});

export const advanceStageResultSchema = t.Object({
	synced: t.Boolean(),
	reason: t.Union([t.String(), t.Null()]),
	registered: t.Integer({ minimum: 0 }),
});

export const generateBracketResultSchema = t.Object({
	created: t.Integer({ minimum: 0 }),
	rounds: t.Integer({ minimum: 1 }),
	byes: t.Integer({ minimum: 0 }),
});

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
	sort: t.Optional(t.Union([t.Literal("name"), t.Literal("createdAt")])),
	order: t.Optional(t.Union([t.Literal("asc"), t.Literal("desc")])),
	limit: t.Optional(t.Numeric({ minimum: 1, maximum: 100 })),
	offset: t.Optional(t.Numeric({ minimum: 0 })),
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
export type AdvancementRulesInput = Static<typeof advancementRulesSchema>;
export type StageQualifier = Static<typeof stageQualifierSchema>;
export type StageQualifiers = Static<typeof stageQualifiersSchema>;
export type AdvanceStageResult = Static<typeof advanceStageResultSchema>;
export type GenerateBracketResult = Static<typeof generateBracketResultSchema>;
