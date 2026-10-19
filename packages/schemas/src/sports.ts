import { sportEventTypes, sports, venues } from "@sports/db/tables";
import {
	createInsertSchema,
	createSelectSchema,
	createUpdateSchema,
} from "drizzle-orm/typebox-legacy";
import { type Static, t } from "elysia";

// ==========================================
// 1. ESQUEMAS CRUD BASE (Generados desde DB)
// ==========================================

export const selectSportSchema = createSelectSchema(sports);

// Extend Sport type with icon field
export type SportWithIcon = Static<typeof selectSportSchema> & {
	icon?: string | null;
};
export const insertSportSchema = createInsertSchema(sports, {
	scoringRules: t.Optional(t.Record(t.String(), t.Number())),
	icon: t.Optional(t.String({ minLength: 1, maxLength: 50 })),
});
export const updateSportSchema = createUpdateSchema(sports, {
	scoringRules: t.Optional(t.Record(t.String(), t.Number())),
	icon: t.Optional(t.String({ minLength: 1, maxLength: 50 })),
});

export const selectVenueSchema = createSelectSchema(venues);
export const insertVenueSchema = createInsertSchema(venues, {
	latitude: t.Optional(t.Number({ minimum: -90, maximum: 90 })),
	longitude: t.Optional(t.Number({ minimum: -180, maximum: 180 })),
});
export const updateVenueSchema = createUpdateSchema(venues, {
	latitude: t.Optional(t.Number({ minimum: -90, maximum: 90 })),
	longitude: t.Optional(t.Number({ minimum: -180, maximum: 180 })),
});

export const selectSportEventTypeSchema = createSelectSchema(sportEventTypes);
export const insertSportEventTypeSchema = createInsertSchema(sportEventTypes);
export const updateSportEventTypeSchema = createUpdateSchema(sportEventTypes);

// ==========================================
// 2. DTOs PARA ENDPOINTS Y FORMULARIOS
// ==========================================

// Parámetros de ruta: /sports/:id (slug) | /venues/:id
export const sportIdParamsSchema = t.Object({
	id: t.String({ minLength: 1, maxLength: 32 }),
});
export const venueIdParamsSchema = t.Object({
	id: t.String({ format: "uuid" }),
});
export const sportEventTypeParamsSchema = t.Object({
	eventTypeId: t.String({ format: "uuid" }),
});

// Query params para el catálogo de eventos de un deporte. El deporte viaja en
// la ruta (`/sports/:id/event-types`), no en la query: repetirlo invitaba a
// contradecirlo, y el cliente que no lo repetía recibía un 400.
export const sportEventTypeFilterQuerySchema = t.Object({
	affectsScore: t.Optional(t.Boolean()),
});

// Query params para filtros: /sports?search=...&limit=...&offset=...
export const sportFilterQuerySchema = t.Object({
	search: t.Optional(t.String({ minLength: 1, maxLength: 60 })),
	order: t.Optional(t.Union([t.Literal("asc"), t.Literal("desc")])),
	limit: t.Optional(t.Numeric({ minimum: 1, maximum: 100 })),
	offset: t.Optional(t.Numeric({ minimum: 0 })),
});

// Query params para filtros: /venues?search=...&limit=...&offset=...
export const venueFilterQuerySchema = t.Object({
	search: t.Optional(t.String({ minLength: 1, maxLength: 60 })),
	order: t.Optional(t.Union([t.Literal("asc"), t.Literal("desc")])),
	limit: t.Optional(t.Numeric({ minimum: 1, maximum: 100 })),
	offset: t.Optional(t.Numeric({ minimum: 0 })),
});

// ==========================================
// 3. TIPOS TYPESCRIPT INFERIDOS
// ==========================================

export type Sport = Static<typeof selectSportSchema> & { icon?: string | null };
export type InsertSport = Static<typeof insertSportSchema>;
export type UpdateSport = Static<typeof updateSportSchema>;
export type Venue = Static<typeof selectVenueSchema>;
export type SportFilterQuery = Static<typeof sportFilterQuerySchema>;
export type VenueFilterQuery = Static<typeof venueFilterQuerySchema>;
export type InsertVenue = Static<typeof insertVenueSchema>;
export type UpdateVenue = Static<typeof updateVenueSchema>;
export type SportEventType = Static<typeof selectSportEventTypeSchema>;
export type InsertSportEventType = Static<typeof insertSportEventTypeSchema>;
export type UpdateSportEventType = Static<typeof updateSportEventTypeSchema>;
export type SportEventTypeFilterQuery = Static<
	typeof sportEventTypeFilterQuerySchema
>;
