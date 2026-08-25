import {
	createInsertSchema,
	createSelectSchema,
	createUpdateSchema,
} from "drizzle-orm/typebox-legacy";
import { type Static, t } from "elysia";
import {
	clubs,
	teams,
	players,
	stageTeamRegistrations,
	tournamentRosters,
} from "@sports/db/tables";

// ==========================================
// 1. ESQUEMAS CRUD BASE (Generados desde DB)
// ==========================================

export const selectClubSchema = createSelectSchema(clubs);
export const insertClubSchema = createInsertSchema(clubs);
export const updateClubSchema = createUpdateSchema(clubs);

export const selectTeamSchema = createSelectSchema(teams);
export const insertTeamSchema = createInsertSchema(teams);
export const updateTeamSchema = createUpdateSchema(teams);

export const selectPlayerSchema = createSelectSchema(players);
export const insertPlayerSchema = createInsertSchema(players, {
	birthDate: t.Optional(t.String({ format: "date" })),
});
export const updatePlayerSchema = createUpdateSchema(players);

export const selectStageTeamRegistrationSchema = createSelectSchema(
	stageTeamRegistrations,
);
export const insertStageTeamRegistrationSchema = createInsertSchema(
	stageTeamRegistrations,
);

export const selectTournamentRosterSchema =
	createSelectSchema(tournamentRosters);
export const insertTournamentRosterSchema =
	createInsertSchema(tournamentRosters);
export const updateTournamentRosterSchema =
	createUpdateSchema(tournamentRosters);

// ==========================================
// 2. DTOs PARA ENDPOINTS Y FORMULARIOS
// ==========================================

// Parámetros de ruta: /clubs/:id | /teams/:id | /players/:id
export const clubIdParamsSchema = t.Object({
	id: t.String({ format: "uuid" }),
});
export const teamIdParamsSchema = t.Object({
	id: t.String({ format: "uuid" }),
});
export const playerIdParamsSchema = t.Object({
	id: t.String({ format: "uuid" }),
});

// Query params para filtros: /teams?clubId=...&category=...
export const teamFilterQuerySchema = t.Object({
	clubId: t.Optional(t.String({ format: "uuid" })),
	category: t.Optional(t.String({ minLength: 1, maxLength: 50 })),
});

// Payload para registrar un equipo en una etapa (grupo opcional)
export const registerTeamInStageSchema = t.Object({
	stageId: t.String({ format: "uuid" }),
	groupId: t.Optional(t.String({ format: "uuid" })),
	teamId: t.String({ format: "uuid" }),
	seedNumber: t.Optional(t.Integer({ minimum: 1 })),
});

// Payload para inscribir un jugador en el plantel de una edición
export const addPlayerToRosterSchema = t.Pick(insertTournamentRosterSchema, [
	"editionId",
	"teamId",
	"playerId",
	"jerseyNumber",
	"position",
	"isCaptain",
]);

// ==========================================
// 3. TIPOS TYPESCRIPT INFERIDOS
// ==========================================

export type Club = Static<typeof selectClubSchema>;
export type InsertClub = Static<typeof insertClubSchema>;
export type UpdateClub = Static<typeof updateClubSchema>;
export type Team = Static<typeof selectTeamSchema>;
export type InsertTeam = Static<typeof insertTeamSchema>;
export type UpdateTeam = Static<typeof updateTeamSchema>;
export type Player = Static<typeof selectPlayerSchema>;
export type InsertPlayer = Static<typeof insertPlayerSchema>;
export type UpdatePlayer = Static<typeof updatePlayerSchema>;
export type StageTeamRegistration = Static<
	typeof selectStageTeamRegistrationSchema
>;
export type RegisterTeamInStage = Static<typeof registerTeamInStageSchema>;
export type TournamentRoster = Static<typeof selectTournamentRosterSchema>;
export type UpdateTournamentRoster = Static<
	typeof updateTournamentRosterSchema
>;
export type AddPlayerToRoster = Static<typeof addPlayerToRosterSchema>;
export type TeamFilterQuery = Static<typeof teamFilterQuerySchema>;
