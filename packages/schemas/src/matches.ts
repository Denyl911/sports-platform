import {
	createInsertSchema,
	createSelectSchema,
	createUpdateSchema,
} from "drizzle-orm/typebox-legacy";
import { type Static, t } from "elysia";
import { matches, matchEvents, matchPeriods } from "@sports/db/tables";

// ==========================================
// 1. ESQUEMAS CRUD BASE (Generados desde DB)
// ==========================================

// Esquema de lectura completo (coincide con SELECT * FROM matches)
export const selectMatchSchema = createSelectSchema(matches);

// Esquema de inserción con refinamiento de campos opcionales/formatos
export const insertMatchSchema = createInsertSchema(matches, {
	scheduledAt: t.Optional(t.String({ format: "date-time" })),
	metadata: t.Optional(t.Record(t.String(), t.Unknown())),
});

// Esquema de actualización parcial
export const updateMatchSchema = createUpdateSchema(matches);

// Campos administrativos que el organizer puede editar vía PATCH /matches/:id.
// Los equipos SÍ se permiten aquí pero se validan contra las inscripciones de la etapa.
// El marcador/estado de juego NO va aquí: se gestiona por /matches/:id/score (referee).
export const updateMatchInfoSchema = t.Object({
	roundNumber: t.Optional(t.Integer({ minimum: 1 })),
	matchNumber: t.Optional(t.Union([t.Integer({ minimum: 1 }), t.Null()])),
	groupId: t.Optional(t.Union([t.String({ format: "uuid" }), t.Null()])),
	scheduledAt: t.Optional(t.Union([t.String({ format: "date-time" }), t.Null()])),
	venueId: t.Optional(t.Union([t.String({ format: "uuid" }), t.Null()])),
	homeTeamId: t.Optional(t.Union([t.String({ format: "uuid" }), t.Null()])),
	awayTeamId: t.Optional(t.Union([t.String({ format: "uuid" }), t.Null()])),
	metadata: t.Optional(t.Record(t.String(), t.Unknown())),
	// El organizer solo puede cancelar por esta vía; el resto de transiciones
	// pasa por el endpoint de marcador (rol referee)
	status: t.Optional(t.Literal("cancelled")),
});

// Payload de creación: insert base + tournamentId explícito (guard RBAC e integridad etapa↔torneo)
export const createMatchSchema = t.Intersect([
	insertMatchSchema,
	t.Object({
		tournamentId: t.String({ format: "uuid" }),
	}),
]);

// Periodos y Eventos
export const selectMatchPeriodSchema = createSelectSchema(matchPeriods);
export const insertMatchPeriodSchema = createInsertSchema(matchPeriods);

export const selectMatchEventSchema = createSelectSchema(matchEvents);
export const insertMatchEventSchema = createInsertSchema(matchEvents);

// ==========================================
// 2. DTOs PARA ENDPOINTS Y FORMULARIOS
// ==========================================

// Parámetros de ruta: /matches/:id
export const matchIdParamsSchema = t.Object({
	id: t.String({ format: "uuid" }),
});

// Query params para filtros: /matches?stageId=...&groupId=...&status=...
export const matchFilterQuerySchema = t.Object({
	stageId: t.Optional(t.String({ format: "uuid" })),
	groupId: t.Optional(t.String({ format: "uuid" })),
	tournamentId: t.Optional(t.String({ format: "uuid" })),
	editionId: t.Optional(t.String({ format: "uuid" })),
	status: t.Optional(
		t.Union([
			t.Literal("scheduled"),
			t.Literal("in_progress"),
			t.Literal("paused"),
			t.Literal("finished"),
			t.Literal("cancelled"),
			t.Literal("walkover"),
		]),
	),
	limit: t.Optional(t.Numeric({ minimum: 1, maximum: 100, default: 20 })),
	offset: t.Optional(t.Numeric({ minimum: 0, default: 0 })),
});

// Payload específico para actualizar marcador en vivo
const matchStatusLiteral = t.Union([
	t.Literal("scheduled"),
	t.Literal("in_progress"),
	t.Literal("paused"),
	t.Literal("finished"),
	t.Literal("cancelled"),
	t.Literal("walkover"),
]);

export const updateMatchScoreSchema = t.Object({
	homeScore: t.Integer({ minimum: 0 }),
	awayScore: t.Integer({ minimum: 0 }),
	status: matchStatusLiteral,
	winnerTeamId: t.Optional(t.String({ format: "uuid" })),
	periodNumber: t.Optional(t.Integer({ minimum: 1 })),
	periodType: t.Optional(
		t.Union([
			t.Literal("regular"),
			t.Literal("overtime"),
			t.Literal("extra_time"),
			t.Literal("penalties"),
			t.Literal("break"),
		]),
	),
});

// Payload para registrar un evento en tiempo real
export const recordLiveEventSchema = t.Object({
	teamId: t.String({ format: "uuid" }),
	playerId: t.Optional(t.String({ format: "uuid" })),
	assistPlayerId: t.Optional(t.String({ format: "uuid" })),
	periodNumber: t.Integer({ minimum: 1 }),
	minuteOrSecond: t.Integer({ minimum: 0 }),
	eventType: t.String({ minLength: 2, maxLength: 40 }),
	eventValue: t.Optional(t.Integer({ default: 1 })),
	metadata: t.Optional(t.Record(t.String(), t.Unknown())),
});

// Payloads para programación y sede
export const matchVenueUpdateSchema = t.Object({
	venueId: t.String({ format: "uuid" }),
});
export const matchScheduleUpdateSchema = t.Object({
	scheduledAt: t.String({ format: "date-time" }),
});

// ==========================================
// 3. TIPOS TYPESCRIPT INFERIDOS
// ==========================================

export type Match = Static<typeof selectMatchSchema>;
export type InsertMatch = Static<typeof insertMatchSchema>;
export type CreateMatch = Static<typeof createMatchSchema>;
export type UpdateMatch = Static<typeof updateMatchSchema>;
export type UpdateMatchInfo = Static<typeof updateMatchInfoSchema>;
export type UpdateMatchScore = Static<typeof updateMatchScoreSchema>;
export type RecordLiveEvent = Static<typeof recordLiveEventSchema>;
export type MatchVenueUpdate = Static<typeof matchVenueUpdateSchema>;
export type MatchScheduleUpdate = Static<typeof matchScheduleUpdateSchema>;
export type MatchFilterQuery = Static<typeof matchFilterQuerySchema>;
