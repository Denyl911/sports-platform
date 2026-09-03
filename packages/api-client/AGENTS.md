# AGENTS.md - @sports/api-client

Cliente RPC **Eden Treaty** tipado contra `apps/api` + **hooks TanStack Query** compartidos para `apps/web` y `apps/mobile`, desarrollado con **Elysia Eden**, **TanStack Query** y **TypeBox** (vía `@sports/schemas`).

---

## 1. Propósito y Alcance del Package

- **Responsabilidad principal:** Única capa de acceso a la API: factory `createApiClient` (treaty + auth), factories de `queryKeys`, hooks por dominio y sockets live (`useMatchLive` / `useGroupLive`).
- **Consumidores:**
  - `apps/web` (TanStack Start: singleton en `src/lib/api.ts`, loaders SSR + hooks CSR).
  - `apps/mobile` (Tauri: mismo import, WebSocket nativo o plugin).
- **Contrato de tipos:** `import type { App } from "api/src/app"` (`apps/api` vía `devDependency` `workspace:*`, solo tipos). No importar runtime de `apps/api`.

---

## 2. Convenciones de Código y Arquitectura

### Thin Wrappers, Sin Lógica de Negocio
- Cada hook recibe `client: ApiClient` como primer argumento y delega en `treaty` + `unwrap`. No hardcodear URLs ni tokens; el token llega por `getToken()` del llamador.
- Errores: `unwrap` (lanza `ApiError`) por defecto; `unwrapSafe` solo cuando se maneja 404/409 sin `try/catch`. Mensajes con `getApiErrorMessage(err)`.
- **Invalidación:** cada mutación invalida su dominio en `onSuccess` (`score` → `standingKeys.all()`). Mantener el mapeo `queryKeys.*` existente.

### Type-Safety Sin Supresores
- **Cero `// @ts-nocheck` y `// @ts-ignore` en `src/`.** Los `@ts-expect-error` puntuales con comentario de justificación son aceptables (fallan solos si el error desaparece); hoy el conteo es cero.
- **Bodies con `@sports/schemas` reales** (`InsertClub`, `UpdateMatchScore`, …), nunca `Record<string, unknown>`. Si falta el tipo, añadirlo en `packages/schemas` (p. ej. `PlayerSearchQuery`, `RegistrationGroupUpdate`). Los POST anidados omiten el id del padre con `Omit<>` (`CreateEditionBody`, `AddPlayerBody`).
- **`mutationFn` con destructuring siempre anotado** (`({ id, body }: { id: string; body: X })`): sin anotación, el spread `options as unknown as object` hace que `TVariables` colapse a `void` (`TS2339`).
- **`onSuccess` con 4 args** (`(data, vars, onMutateResult, context)`) y reenvío directo a `options?.onSuccess?.(...)`: TanStack Query v5 pasa `(data, variables, onMutateResult, context)`; castear a `never` rompe la llamada (`TS2349`).
- **Declaraciones globales en el archivo que las usa** (p. ej. `declare global { var __viteEnv }` en `config.ts`): los `.d.ts` no importados no entran al programa de los consumidores (`apps/web`), y `tsc` allí es más estricto (`noUnusedLocals`/`noUnusedParameters`).
- Verificar siempre con `tsc` del package **y** de `apps/web` (`bunx tsc --noEmit -p apps/web/tsconfig.json`), que es más estricto.

### Modularidad por Dominio
- Un archivo por dominio en `src/hooks/` (`tournaments.ts`, `matches.ts`, `standings.ts`, …) y factories en `src/queryKeys.ts`.
- **Barrel Export Obligatorio:** todo hook nuevo debe re-exportarse en `src/hooks/index.ts` (que además re-exporta `live/*`); `src/index.ts` re-exporta `live`, `queryKeys`, `client`, `config`, `types`.
- `src/live/` separado: `types.ts` (tipos), `url.ts` (URLs), `socket.ts` (`ManagedSocket`), `useMatchLive.ts` / `useGroupLive.ts` (hooks).

### Auth y Tiempo Real
- Auth **en el cliente**: `createApiClient({ getToken, onUnauthorized })` inyecta `Authorization: Bearer` por request y dispara `onUnauthorized` en 401. Pasar siempre el getter (`getStoredAccessToken`), nunca el token resuelto (rota en refresh/reconexión).
- Live: vía principal `?token=` (`getMatchLiveUrl` / `getGroupLiveUrl`); `Sec-WebSocket-Protocol` solo como fallback. `getToken()` se re-evalúa en cada reconexión. `updateCache: true` por defecto; `heartbeat 20s < idleTimeout:30`. SSR guard vía `useEffect`, sin `window` check manual.
- **Peer `react`:** los hooks viven tras `peerDependencies.react`; no añadir providers con estado global aquí (el `QueryClientProvider` vive en cada app).

---

## 3. Estructura de Directorios

```text
packages/api-client/
├── src/
│   ├── client.ts      # createApiClient, ApiError, unwrap/unwrapSafe
│   ├── config.ts      # resolveBaseUrl (override → VITE_API_URL → process.env → localhost:3000)
│   ├── queryKeys.ts   # factories por dominio (incluye memberships.myMembership)
│   ├── types.ts       # re-export @sports/schemas
│   ├── live/          # types, url, socket (ManagedSocket), useMatchLive/useGroupLive, index
│   ├── hooks/         # auth, tournaments, matches, standings, teams, clubs, players,
│   │                   # sports, venues, users, registrations, rosters + index (re-export live)
│   └── index.ts       # barrel: client + config + live + queryKeys + types
├── test/
│   ├── live.test.ts   # unit url + smoke treaty + WS real contra app.listen(0)
│   └── setup.ts       # preload JWT secrets + DATABASE_URL de pruebas
├── bunfig.toml
└── package.json       # exports ".", "./hooks", "./live"
```

## 4. Testing

Suite con `bun:test` contra la app real (`app.listen(0)`, sin mocks de red). Ver `README.md` para el setup de la DB de pruebas.

### Comandos
- `bun test` / `bun test test/live.test.ts` — suites del package.
- `bun run test:types` — type-safety del contrato Eden (`tsc --noEmit`).
- `bun run lint|format|check` — Biome.

### Convenciones obligatorias
- **Aislamiento:** `beforeEach(resetDb)` + `_clearAll()` de `apps/api/src/lib/live`; DB efímera `sports_platform_test` forzada por `test/setup.ts`.
- **Auth en tests:** `signToken` / `authHeaders` de `apps/api/test/helpers`; `getToken: () => token` para `?token=` en `createMatchSocket`.
- **Nuevos hooks:** añadir caso en `test/live.test.ts` si tocan live/URL, o verificar `tsc` si solo re-exportan.
