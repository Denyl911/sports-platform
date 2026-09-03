# @sports/api-client

Cliente RPC **Eden Treaty** (`apps/api/src/app.ts:80` `export type App`) + **Hooks TanStack Query** compartidos para `apps/web` (TanStack Start) y `apps/mobile` (Tauri).

## Instalación (workspace)

```bash
bun install
```

`package.json` exports:

```json
{
  "exports": {
    ".": "./src/index.ts",
    "./hooks": "./src/hooks/index.ts",
    "./live": "./src/live/index.ts"
  }
}
```

## Comandos

```bash
bun run test          # bun test (usa test/setup.ts: JWT secrets + DATABASE_URL de pruebas)
bun run test:types    # tsc --noEmit
bun run lint          # biome lint .
bun run format        # biome format --write .
bun run check         # biome check --write .
```

## Uso básico (treaty delgado)

```ts
import { createApiClient, unwrap } from "@sports/api-client";

const client = createApiClient({
  baseUrl: import.meta.env.VITE_API_URL, // o () => ... para SSR
  getToken: () => localStorage.getItem("accessToken"),
  onUnauthorized: () => (window.location.href = "/login"),
});

// REST thin wrapper (tipado App)
const { data: tournaments } = await client.tournaments.get({ query: {} });
const data = await unwrap(client.tournaments.get({ query: {} }));
// POST con auth ya inyectada (client headers hook)
await unwrap(client.tournaments.post({ sportId, name } as never));
```

`createApiClient` usa `treaty<App>(resolveBaseUrl(baseUrl), { headers: async () => ({Authorization: Bearer token}), onResponse: 401→onUnauthorized })` (`src/client.ts`, `src/config.ts` `resolveBaseUrl` prioriza `override` → `import.meta.env.VITE_API_URL` → `process.env` → `http://localhost:3000`).

`unwrap` lanza `ApiError` (`status`, `value`, `response`); `unwrapSafe` retorna `{ data, error, status, response }` sin lanzar; `getApiErrorMessage` extrae el mensaje; `isApiError` es type-guard.

## QueryKeys

Factories estables en `src/queryKeys.ts` (`queryKeys.*`), una por dominio: `tournaments`, `editions`, `stages`, `groups`, `matches`, `standings`, `teams`, `clubs`, `players`, `sports`, `venues`, `users`, `memberships` (incluye `myMembership(tournamentId)`), `registrations`, `rosters`, `auth`. Las mutaciones invalidan su dominio (`score` → `standingKeys.all()`).

## Hooks TanStack Query

```ts
import { createApiClient } from "@sports/api-client";
import { useTournaments, useCreateTournament } from "@sports/api-client/hooks";
// o live también desde hooks:
import { useMatchLive } from "@sports/api-client/hooks";

const client = createApiClient({ baseUrl, getToken });

function TournamentsPage() {
  const { data, isPending } = useTournaments(client, { sportId });
  const { mutate } = useCreateTournament(client);
  return <button onClick={() => mutate({ sportId, name: "Copa" })}>crear</button>;
}
```

Todos los hooks reciben `client: ApiClient` como primer argumento y son thin wrappers `useQuery`/`useMutation` sobre treaty. Dominios en `src/hooks/`: `auth` (`useLogin`, `useRefresh`, `useChangePassword`, `useMyTournamentMembership`), `tournaments` (+ `editions`/`stages`/`groups`), `matches` (`useMatches`, `useMatch`, `useCreateMatch`, `useUpdateMatchScore`, `useRecordLiveEvent`, …), `standings` (`useStandings`, `useRecalculateStandings`, `useUpdateStandingRow`), `teams`, `clubs`, `players`, `sports`, `venues`, `users`, `registrations`, `rosters`. `src/hooks/index.ts` también re-exporta `live/*`.

## Live

Servidor `apps/api/src/lib/live.ts` tipa `LiveMessage` (`score|event|standing|connected|ack|pong|error`) y `apps/api/src/routes/live.ts` expone `ws("/matches/:id/live")` y `ws("/groups/:groupId/live")` con `beforeHandle` 404, `open` `subscribe` + `connected`, `message` resuelve `token` `Authorization > Sec-WebSocket-Protocol > ?token=`, `ws("/groups/...")` solo lectura.

Cliente `src/live/`:

- `wsUrlFromBase` / `getMatchLiveUrl` / `getGroupLiveUrl` (`src/live/url.ts`): `http→ws`, `https→wss`, `?token=` url-encoded (vía principal, compatible browser + `@tauri-apps/plugin-websocket`).
- `createMatchSocket` / `createGroupSocket` (`src/live/socket.ts`): `ManagedSocket` con `getToken()` re-evaluado en cada reconexión, backoff `500*2^n` + jitter ≤30s, `heartbeat 20s < idleTimeout:30`, `visibilitychange`/`online` pause, `Sec-WebSocket-Protocol` fallback, Tauri `import("@tauri-apps/plugin-websocket")` dinámico.
- `useMatchLive` / `useGroupLive` (`src/live/useMatchLive.ts`): `useQueryClient` cache (`updateCache:true` default) → `setQueryData(matchKeys.detail)` / `invalidateQueries(standingKeys)`, `status` (`idle|connecting|open|reconnecting|closed|error`), `sendScore`/`sendEvent` (referee), `reconnect`, `isOpen`. SSR guard vía `useEffect` (no `window` check manual).

```ts
// Web (TanStack Start, CSR)
import { useMatchLive } from "@sports/api-client/live";
import { useGroupLive } from "@sports/api-client/hooks"; // también re-exportado

function MatchLive({ matchId }: { matchId: string }) {
  const live = useMatchLive(matchId, {
    getToken: () => localStorage.getItem("accessToken"),
    onScore: (m) => console.log(m.payload),
    updateCache: true,
  });
  return (
    <div>
      {live.status} {live.isOpen ? "●" : "○"}
      <button onClick={() => live.sendScore({ homeScore: 1, awayScore: 0, status: "in_progress" })}>
        gol
      </button>
    </div>
  );
}

function GroupLive({ groupId }: { groupId: string }) {
  const live = useGroupLive(groupId, { onStanding: (m) => console.log(m) });
  return <span>{live.status}</span>;
}
```

```ts
// Mobile (Tauri) — mismo import, WebView WebSocket nativo; fallback plugin si es necesario
import { useMatchLive } from "@sports/api-client/live";
const live = useMatchLive(matchId, {
  baseUrl: "https://api.sports.example.com",
  getToken: () => localStorage.getItem("accessToken"),
});
```

`src/hooks/index.ts` re-exporta `live/*` para `import { useMatchLive } from "@sports/api-client/hooks"` y `src/index.ts` hace `export * from "./live"` para `from "@sports/api-client"`.

## Testing

- `test/setup.ts` + `bunfig.toml` preload `JWT_*_SECRET` y `DATABASE_URL=sports_platform_test` (igual que `apps/api/test/setup.ts`).
- `test/live.test.ts`: unit `wsUrlFromBase`/`getMatchLiveUrl`, smoke `createApiClient` vs `treaty(app)` + `unwrap`, hooks re-export, WS real `createMatchSocket`/`createGroupSocket` con `app.listen(0)` + `resetDb` + `seed*` + `signToken` (anon, referee `?token=` `ack+broadcast`, ping/pong, viewer 403, super_admin bypass, anon 401, raw `new WebSocket(getMatchLiveUrl(...,token))` compat, group `standing` tras `recalculate`, `Read-only`, ghost 404, `idleTimeout 30`).

```bash
# en @sports/api-client
bun test test/live.test.ts
# en root (turbo)
DATABASE_URL="postgresql://sports_user:sports_user_password@localhost:5432/sports_platform_test" bun test
```

## Estructura

```text
packages/api-client/
├── src/
│   ├── client.ts      # createApiClient, ApiError, unwrap/unwrapSafe
│   ├── config.ts      # resolveBaseUrl
│   ├── queryKeys.ts   # factories por dominio
│   ├── types.ts       # re-export @sports/schemas
│   ├── live/
│   │   ├── types.ts   # LiveMessage, LiveStatus, UseMatchLiveOptions
│   │   ├── url.ts     # wsUrlFromBase, getMatchLiveUrl
│   │   ├── socket.ts  # ManagedSocket
│   │   ├── useMatchLive.ts / useGroupLive.ts
│   │   └── index.ts
│   ├── hooks/
│   │   ├── auth.ts / tournaments.ts / matches.ts / standings.ts / teams.ts / ...
│   │   └── index.ts   # barrel + re-export live
│   └── index.ts
├── test/
│   ├── live.test.ts
│   └── setup.ts
├── bunfig.toml
└── package.json
```
