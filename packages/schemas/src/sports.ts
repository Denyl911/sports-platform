import {
  createInsertSchema,
  createSelectSchema,
  createUpdateSchema,
} from "drizzle-orm/typebox-legacy";
import { type Static, t } from "elysia";
import { sports, venues } from "../../db/src/tables";

// ==========================================
// 1. ESQUEMAS CRUD BASE (Generados desde DB)
// ==========================================

export const selectSportSchema = createSelectSchema(sports);
export const insertSportSchema = createInsertSchema(sports, {
  scoringRules: t.Optional(t.Record(t.String(), t.Number())),
});
export const updateSportSchema = createUpdateSchema(sports);

export const selectVenueSchema = createSelectSchema(venues);
export const insertVenueSchema = createInsertSchema(venues);
export const updateVenueSchema = createUpdateSchema(venues);

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

// ==========================================
// 3. TIPOS TYPESCRIPT INFERIDOS
// ==========================================

export type Sport = Static<typeof selectSportSchema>;
export type InsertSport = Static<typeof insertSportSchema>;
export type UpdateSport = Static<typeof updateSportSchema>;
export type Venue = Static<typeof selectVenueSchema>;
export type InsertVenue = Static<typeof insertVenueSchema>;
export type UpdateVenue = Static<typeof updateVenueSchema>;
