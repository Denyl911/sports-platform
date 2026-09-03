# Sports Platform — Web

Sitio público SSR + Dashboard Admin para la plataforma deportiva multideporte. Consulta de torneos, fixture, tablas de posiciones y marcadores en vivo, más gestión de torneos, fixture, árbitros y estadísticas.

Stack: **TanStack Start** (SSR + Nitro) + **TanStack Router** (file-based) + **TanStack Query** + **Tailwind CSS v4** + **Eden Treaty** (`@sports/api-client`).

## Requisitos

```bash
bun install
```

Variables de entorno (ver `.env.example` si existe, o crear `.env`):

```bash
VITE_API_URL=http://localhost:3000   # URL base de apps/api
```

La API debe estar corriendo (`apps/api`, `bun run dev` en `apps/api`).

## Comandos

```bash
bun run dev              # vite dev --port 3000
bun run build            # vite build (cliente + SSR + Nitro)
bun run preview          # vista previa del build
bun run generate-routes  # tsr generate — regenerar src/routeTree.gen.ts
bun run lint             # biome lint
bun run format           # biome format
bun run check            # biome check
```

`src/routeTree.gen.ts` está generado — no editar a mano. Tras añadir/mover archivos en `src/routes`, correr `generate-routes`.

## Estructura

```text
apps/web/
├── src/
│   ├── routes/            # File-based routing (TanStack Router)
│   │   ├── __root.tsx     # Shell SSR: theme script + AppProviders + AuthProvider + Header/Footer
│   │   ├── index.tsx      # Home público
│   │   ├── about.tsx      # About
│   │   ├── auth/          # login.tsx, register.tsx (formularios, sin loader)
│   │   ├── tournaments/   # index.tsx (SSR list), $tournamentId.tsx (detail + ediciones)
│   │   ├── editions/      # $editionId.tsx (stages)
│   │   ├── stages/        # $stageId.tsx (grupos + partidos, Bracket si single_elimination)
│   │   ├── groups/        # $groupId.tsx (standings, solo lectura)
│   │   ├── standings/     # $groupId.tsx (standings + useGroupLive)
│   │   ├── matches/       # index.tsx (filtro status), $matchId.tsx (detail + useMatchLive)
│   │   ├── teams/players/venues/sports/  # index.tsx (list) + $id.tsx (detail)
│   │   └── admin/         # Layout RoleGuard + dashboard + CRUD por dominio
│   │       ├── index.tsx              # Dashboard
│   │       ├── tournaments/           # index.tsx, $tournamentId.tsx
│   │       ├── editions/$editionId.tsx
│   │       ├── stages/$stageId.tsx    # grupos, inscripciones, fixture, roster
│   │       ├── matches/$matchId.tsx   # tabs: score / events / venue / schedule / info
│   │       ├── standings/$groupId.tsx # recalculate + ajuste manual
│   │       └── venues|clubs|teams|players|sports|users/  # index.tsx + $id.tsx
│   ├── lib/
│   │   ├── api.ts         # Singleton createApiClient + tokens localStorage + refresh en 401
│   │   ├── auth.tsx       # AuthProvider: user, login, register, logout, refresh, hasRole
│   │   └── queryClient.ts # getQueryClient (per-request en SSR, singleton en browser)
│   ├── providers/
│   │   └── AppProviders.tsx  # QueryClientProvider (del router context) + ReactQueryDevtools
│   ├── components/
│   │   ├── Header.tsx     # Nav role-aware (Torneos, Partidos, Admin si aplica)
│   │   ├── Footer.tsx
│   │   ├── RoleGuard.tsx  # Guard global + useCanTournamentRole (membership real)
│   │   └── ThemeToggle.tsx
│   ├── router.tsx         # getRouter: routeTree + context { queryClient }
│   └── styles.css         # Importa @sports/ui/src/styles.css (tokens SSOT)
├── vite.config.ts         # tailwindcss() + tanstackStart() + nitro()
├── tsr.config.json
└── package.json
```

## Patrones de datos

Público (SSR): cada ruta usa `loader` con `qc.ensureQueryData({ queryKey: queryKeys.* })` y el componente usa `useSuspenseQuery` con la misma key. El `queryClient` llega por router context (`router.tsx` → `AppProviders`).

```tsx
export const Route = createFileRoute("/tournaments/")({
  loader: async ({ context }) => {
    const qc = (context as { queryClient: QueryClient }).queryClient;
    await qc.ensureQueryData({
      queryKey: queryKeys.tournaments.list(),
      queryFn: () => unwrap(api.tournaments.get({ query: {} as never })),
    });
  },
  component: TournamentsPage,
});
```

Admin (CSR): sin `loader`; usa hooks de `@sports/api-client/hooks` (`useCreateTournament`, `useUpdateMatchScore`, …) con `api` de `src/lib/api.ts`. Todas las rutas admin usan `// @ts-nocheck` por la inferencia `void` de `UseMutationOptions` con `mutateAsync({ x, body })`.

Tiempo real: `useMatchLive(matchId, { getToken: getStoredAccessToken })` y `useGroupLive(groupId, …)` de `@sports/api-client/live`. Token vía `?token=` (principal). Ver `packages/api-client/README.md`.

## Auth y RBAC

`src/lib/auth.tsx` expone `useAuth()` (`user`, `isAuthenticated`, `login`, `register`, `logout`, `refresh`, `hasRole`). Tokens en `localStorage` (`accessToken`, `refreshToken`); `onUnauthorized` en `src/lib/api.ts` intenta `POST /auth/refresh` una vez y si falla limpia tokens y redirige a `/auth/login`.

`RoleGuard` (`src/components/RoleGuard.tsx`) protege `/admin` (roles `admin`, `organizer`, `super_admin`, `referee`, `statistician`). `useCanTournamentRole(tournamentId, ...roles)` consulta `GET /tournaments/:id/members/me` y hace bypass para `super_admin`/`admin`. El check real siempre es la API (401/403).

## Estilos

Tailwind CSS v4 vía plugin de Vite (sin `tailwind.config.js`). Los tokens (`--sea-ink`, `--lagoon`, …) y utilidades (`.island-shell`, `.demo-*`) viven en `packages/ui/src/styles.css` e importados desde `src/styles.css`. Componentes desde `@sports/ui` (`Button`, `Card`, `MatchCard`, `StandingsTable`, …).

## Deploy con Nitro

```bash
bun run build
node .output/server/index.mjs
```

El build genera cliente + SSR + Nitro (`preset: node-server`). Para otros presets/hosts ver https://v3.nitro.build/deploy.
