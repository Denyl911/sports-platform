import { t } from "elysia";

// Query params de paginación reutilizables
export const paginationQuerySchema = t.Object({
	limit: t.Optional(t.Numeric({ minimum: 1, maximum: 100, default: 20 })),
	offset: t.Optional(t.Numeric({ minimum: 0, default: 0 })),
});

// Envelope estándar para todos los listados de la API
export interface PaginatedResponse<T> {
	items: T[];
	total: number;
}
