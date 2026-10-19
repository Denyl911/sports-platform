import { t } from "elysia";

// Query params de paginación reutilizables. Sin límiteCrudo la lista
// responde TODAS las filas (comportamiento existente); con limit/offset,
// ventana. El default de 20 por página lo decide el cliente admin.
export const paginationQuerySchema = t.Object({
	limit: t.Optional(t.Numeric({ minimum: 1, maximum: 100 })),
	offset: t.Optional(t.Numeric({ minimum: 0 })),
});

// Envelope estándar para todos los listados de la API
export interface PaginatedResponse<T> {
	items: T[];
	total: number;
}
