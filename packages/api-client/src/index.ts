/**
 * @sports/api-client — Cliente RPC Eden Treaty + Hooks TanStack Query
 *
 * Thin wrappers sobre `treaty<App>` (`apps/api/src/app.ts:80`) con
 * TanStack Query para web (TanStack Start) y mobile (Tauri).
 *
 * @example
 * ```ts
 * import { createApiClient, unwrap } from "@sports/api-client"
 * import { useTournaments } from "@sports/api-client/hooks"
 *
 * const client = createApiClient({
 *   baseUrl: import.meta.env.VITE_API_URL,
 *   getToken: () => localStorage.getItem("accessToken"),
 *   onUnauthorized: () => window.location.href = "/login"
 * })
 *
 * // Treaty directo (thin)
 * const { data } = await client.tournaments.get({ query: {} })
 * const tournaments = await unwrap(client.tournaments.get({ query: {} }))
 *
 * // Hook
 * const { data } = useTournaments(client)
 * ```
 */

export { resolveBaseUrl, getDefaultApiUrl } from "./config";
export {
	createApiClient,
	unwrap,
	unwrapSafe,
	getApiErrorMessage,
	ApiError,
	isApiError,
} from "./client";
export type { ApiClient, ApiClientOptions } from "./client";
export type { App, Paginated, ApiErrorBody, TreatyApp } from "./types";
export { queryKeys } from "./queryKeys";
export * from "./queryKeys";
