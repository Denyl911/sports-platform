/**
 * Tipos compartidos para el api-client.
 * Re-exporta contratos de `@sports/schemas` y helpers de Treaty.
 */

import type { Treaty } from "@elysia/eden";
import type { App } from "../../../apps/api/src/app";

// ---------------------------------------------------------------------------
// Re-exports de schemas (Single Source of Truth)
// ---------------------------------------------------------------------------
export type * from "@sports/schemas";

// ---------------------------------------------------------------------------
// Helpers de paginación y envoltorios (coherentes con apps/api)
// ---------------------------------------------------------------------------

/** Respuesta paginada estándar `{ items, total }` de los listados (tournaments, matches, etc.) */
export type Paginated<T> = {
	items: T[];
	total: number;
};

/** Respuesta de error estándar `{ message }` del `errorMiddleware` */
export type ApiErrorBody = { message: string };

/** Treaty tipado contra `App` — útil para extender el cliente */
export type TreatyApp = Treaty.Create<App>;

/** Extrae el tipo `data` de una respuesta Treaty */
export type TreatyData<T extends Promise<{ data: unknown }>> =
	Awaited<T> extends { data: infer D } ? D : never;

/** Utilidad para handlers delgados: firma del treaty ya tipada */
export type { App };
