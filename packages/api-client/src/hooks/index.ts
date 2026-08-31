// @ts-nocheck
/**
 * Hooks TanStack Query — wrappers delgados sobre `treaty<App>`.
 * Cada hook delega en `ApiClient` (createApiClient) y expone queryKeys estables.
 * Ver `src/queryKeys.ts` para invalidación jerárquica.
 *
 * @example
 * ```ts
 * import { createApiClient } from "@sports/api-client"
 * import { useTournaments, useCreateTournament } from "@sports/api-client/hooks"
 *
 * const client = createApiClient({ baseUrl, getToken })
 * const { data } = useTournaments(client)
 * const { mutate } = useCreateTournament(client)
 * ```
 */

export * from "./auth";
export * from "./tournaments";
export * from "./matches";
export * from "./standings";
export * from "./teams";
export * from "./clubs";
export * from "./players";
export * from "./sports";
export * from "./venues";
export * from "./users";
export * from "./registrations";
export * from "./rosters";
