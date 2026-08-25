import {
	createInsertSchema,
	createSelectSchema,
	createUpdateSchema,
} from "drizzle-orm/typebox-legacy";
import { type Static, t } from "elysia";
import { stageStandings } from "@sports/db/tables";

// ==========================================
// 1. ESQUEMAS CRUD BASE (Generados desde DB)
// ==========================================

export const selectStageStandingSchema = createSelectSchema(stageStandings);
export const insertStageStandingSchema = createInsertSchema(stageStandings);
export const updateStageStandingSchema = createUpdateSchema(stageStandings);

// ==========================================
// 2. DTOs PARA ENDPOINTS Y FORMULARIOS
// ==========================================

// Query params para consultar la tabla: /standings?groupId=...
export const standingsFilterQuerySchema = t.Object({
	groupId: t.String({ format: "uuid" }),
});

// Payload para recalcular/ajustar manualmente una fila de posiciones
export const updateStandingRowSchema = t.Partial(
	t.Pick(updateStageStandingSchema, [
		"played",
		"won",
		"drawn",
		"lost",
		"points",
		"scoreFor",
		"scoreAgainst",
		"scoreDifference",
		"bonusPoints",
		"rankPosition",
	]),
);

// ==========================================
// 3. TIPOS TYPESCRIPT INFERIDOS
// ==========================================

export type StageStanding = Static<typeof selectStageStandingSchema>;
export type InsertStageStanding = Static<typeof insertStageStandingSchema>;
export type UpdateStageStanding = Static<typeof updateStageStandingSchema>;
export type StandingsFilterQuery = Static<typeof standingsFilterQuerySchema>;
export type UpdateStandingRow = Static<typeof updateStandingRowSchema>;
