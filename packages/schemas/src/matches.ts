import { matchEvents, matches, matchPeriods } from "@sports/db/tables";
import {
	createInsertSchema,
	createSelectSchema,
	createUpdateSchema,
} from "drizzle-orm/typebox-legacy";
import { type Static, t } from "elysia";
import { selectVenueSchema } from "./sports";
import { selectTeamSchema } from "./teams";

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
	scheduledAt: t.Optional(
		t.Union([t.String({ format: "date-time" }), t.Null()]),
	),
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
// 1bis. RESPUESTAS DE LECTURA CON RELACIONES
// ==========================================
// Lo que viaja en una respuesta de partido se declara aquí: la relación no
// declarada hace que el cliente reciba el campo por casualidad y lo mate un
// cast. Cada relación extra es presupuesto — su fila en query-budgets la
// paga (ADR 008).

// Referencia ligera para listados: la lista de partidos no necesita el cuerpo
// completo del equipo, solo la identidad que muestra la tarjeta.
export const matchTeamRefSchema = t.Pick(selectTeamSchema, ["id", "name"]);

// GET /matches (lista): partido con los dos participantes resueltos
// (nullable: en llaves los equipos pueden definirse después).
// NOTA: la composición es un único t.Object (spread de properties del esquema
// derivado); t.Intersect rompe el compilador de validación de respuesta de
// Elysia aquí ("Could not create expected value" → 400 en runtime).
export const matchWithTeamsSchema = t.Object({
	...selectMatchSchema.properties,
	homeTeam: t.Union([matchTeamRefSchema, t.Null()]),
	awayTeam: t.Union([matchTeamRefSchema, t.Null()]),
});

// GET /matches/:id (detalle): las relaciones que MATCH_RELATIONS ya trae de
// vuelta, declaradas. Es el detalle por página: una sola llamada, sin
// consultas client-side para venue ni nombres.
export const matchDetailSchema = t.Object({
	...selectMatchSchema.properties,
	// El deporte del torneo, para que el cliente sepa qué tipos de evento
	// puede registrar (el catálogo lo define el deporte, no el partido).
	sportId: t.String({ minLength: 1, maxLength: 32 }),
	homeTeam: t.Union([selectTeamSchema, t.Null()]),
	awayTeam: t.Union([selectTeamSchema, t.Null()]),
	winnerTeam: t.Union([selectTeamSchema, t.Null()]),
	venue: t.Union([selectVenueSchema, t.Null()]),
	periods: t.Array(selectMatchPeriodSchema),
	events: t.Array(selectMatchEventSchema),
});

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
	// Sin default en el contrato: cuando el cliente no manda un valor, manda el
	// `defaultValue` del tipo de evento del deporte (un triple suma 3). Un
	// default fijo acá lo pisaba y todo evento puntuable valía 1.
	eventValue: t.Optional(t.Integer({ minimum: 0 })),
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
export type MatchWithTeams = Static<typeof matchWithTeamsSchema>;
export type MatchDetail = Static<typeof matchDetailSchema>;
export type InsertMatch = Static<typeof insertMatchSchema>;
export type CreateMatch = Static<typeof createMatchSchema>;
export type UpdateMatch = Static<typeof updateMatchSchema>;
export type UpdateMatchInfo = Static<typeof updateMatchInfoSchema>;
export type UpdateMatchScore = Static<typeof updateMatchScoreSchema>;
export type RecordLiveEvent = Static<typeof recordLiveEventSchema>;
export type MatchVenueUpdate = Static<typeof matchVenueUpdateSchema>;
export type MatchScheduleUpdate = Static<typeof matchScheduleUpdateSchema>;
export type MatchFilterQuery = Static<typeof matchFilterQuerySchema>;
