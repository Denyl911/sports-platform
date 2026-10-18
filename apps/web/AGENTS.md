# AGENTS.md - apps/web

Sitio público SSR + Dashboard Admin para la plataforma deportiva multideporte, desarrollado con **TanStack Start**, **TanStack Router**, **TanStack Query** y **Tailwind CSS**.

---

## 1. Propósito y Alcance de la Aplicación

- **Responsabilidad principal:** Sitio público (resultados, cruces, tablas, marcadores en vivo) y dashboard admin (torneos, fixture, árbitros, estadísticas) sobre la API REST + WebSockets.
- **Consumidores:** Navegadores (SSR + CSR). Comparte contratos con `apps/mobile` vía `packages/api-client` y UI vía `packages/ui`.
- **Fuente de tipos:** `packages/api-client` (`treaty<App>` contra `apps/api`) y `@sports/schemas`. No redefinir tipos del dominio en `apps/web`.

---

## 2. Convenciones de Código y Arquitectura

### File-Based Routing
- Cada ruta es un archivo en `src/routes/` con `createFileRoute("<path>")`. Layouts: `admin.tsx` (sidebar + `RoleGuard` + `<Outlet/>`).
- Tras añadir/mover rutas, regenerar con `bun run generate-routes` (`tsr generate`). Nunca editar `src/routeTree.gen.ts` a mano.
- El router se crea en `src/router.tsx` con `context: { queryClient }`; los loaders lo consumen vía `context`.

### Separación de Responsabilidades
1. **Rutas (`src/routes/`):** Declaración de `loader` + componente. Público usa `loader` + `useSuspenseQuery`; admin usa hooks CSR de `@sports/api-client/hooks` sin `loader`.
2. **Lib (`src/lib/`):** `api.ts` (singleton `createApiClient` + tokens), `auth.tsx` (`AuthProvider`, `useAuth`), `queryClient.ts` (`getQueryClient` per-request en SSR, singleton en browser).
3. **Proveedores (`src/providers/AppProviders.tsx`):** `QueryClientProvider` (reusa el del router context) + `ReactQueryDevtools` solo en `DEV`.
4. **Componentes (`src/components/`):** `Header` (nav role-aware), `RoleGuard` (guard + `useCanTournamentRole`), `ThemeToggle`.

### Datos y Type-Safety
- **Loaders públicos:** `qc.query({ queryKey: queryKeys.*, queryFn: () => unwrap(api.*), staleTime: "static" })` y el componente repite la misma key con `useSuspenseQuery`. Misma key en ambos lados. No usar `ensureQueryData` (deprecado, se elimina en la próxima major de TanStack Query).
- **Mutaciones admin:** hooks de `@sports/api-client/hooks` con `api` de `src/lib/api.ts`; errores con `getApiErrorMessage(err)`. Bodies con tipos reales (los hooks ya están tipados con `@sports/schemas`); prohibidos `as never` y `// @ts-nocheck` en rutas nuevas.
- **IDs padre sin GET single:** la API no tiene GET single de stage/edition; `editionId`/`tournamentId` viajan por **search params** desde la página padre (`Link … search={{ … }}`), nunca con inputs manuales ni queries a rutas inexistentes.
- **Tiempo real:** `useMatchLive` / `useGroupLive` de `@sports/api-client/live` con `getToken: getStoredAccessToken`. Nunca pasar el token directo; siempre el getter (rota en reconexión).
- **La red viaja por el cliente:** ni `fetch`, ni `new WebSocket`, ni `new EventSource`, ni `XMLHttpRequest` en `apps/web/src` — `bun scripts/checks.ts web-fetch` en el gate lo refusa (ADR 003). El refresh de token en `lib/api.ts` monta un *cliente desnudo* (`createApiClient` sin `getToken`/`onUnauthorized`): el 401 del refresh no puede re-disparar `onUnauthorized`.
- **Estilos:** Tokens y utilidades en `packages/ui/src/styles.css` (SSOT). `src/styles.css` solo importa. Componentes desde `@sports/ui`.

---

## 3. Estructura de Directorios

```text
apps/web/
├── src/
│   ├── routes/                # File-based routing
│   │   ├── __root.tsx         # Shell SSR: theme script + AppProviders + AuthProvider
│   │   ├── index.tsx          # Home | about.tsx
│   │   ├── auth/              # login.tsx, register.tsx
│   │   ├── tournaments/       # index.tsx, $tournamentId.tsx
│   │   ├── editions/          # $editionId.tsx
│   │   ├── stages/            # $stageId.tsx
│   │   ├── groups/            # $groupId.tsx
│   │   ├── standings/         # $groupId.tsx (+ useGroupLive)
│   │   ├── matches/           # index.tsx, $matchId.tsx (+ useMatchLive)
│   │   ├── teams|players|venues|sports/  # index.tsx + $id.tsx
│   │   └── admin/             # Layout + dashboard + CRUD por dominio
│   ├── lib/
│   │   ├── api.ts             # Singleton Eden + localStorage + refresh en 401
│   │   ├── auth.tsx           # AuthProvider + useAuth (hasRole, super_admin bypass)
│   │   └── queryClient.ts     # getQueryClient / createQueryClient
│   ├── providers/
│   │   └── AppProviders.tsx   # QueryClientProvider + ReactQueryDevtools
│   ├── components/            # Header, Footer, RoleGuard, ThemeToggle
│   ├── router.tsx             # getRouter: routeTree + context { queryClient }
│   ├── routeTree.gen.ts       # Generado — no editar
│   └── styles.css             # Importa @sports/ui/src/styles.css
├── vite.config.ts             # tailwindcss() + tanstackStart() + nitro()
├── tsr.config.json
└── package.json
```

## 4. Comandos y Verificación

- `bun run dev` — desarrollo (`vite dev --port 3000`, requiere `VITE_API_URL` a `apps/api`).
- `bun run generate-routes` — regenerar tras cambios en `src/routes`.
- `bun run build` — build cliente + SSR + Nitro. Verificar tras cambios de rutas o providers.
- `bunx tsc --noEmit --project apps/web/tsconfig.json`
- Lint/formato con Biome (`bun run lint|format|check`).
