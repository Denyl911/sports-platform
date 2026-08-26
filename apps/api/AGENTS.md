# AGENTS.md - apps/api

Servidor backend HTTP REST y WebSocket de alto rendimiento para la plataforma deportiva multideporte, desarrollado con **Bun**, **ElysiaJS**, **Drizzle ORM** y **TypeBox**.

---

## 1. Propósito y Alcance de la Aplicación

- **Responsabilidad principal:** Exponer endpoints RESTful, documentación OpenAPI automática y canales WebSocket para transmisión de marcadores y eventos en tiempo real.
- **Consumidores:** 
  - `packages/api-client` (genera el cliente tipado con Eden Treaty para `apps/web` y `apps/mobile`).
  - Clientes externos mediante REST estándar y WebSockets.
- **Punto de exportación crítico:** `export type App = typeof app;` en `src/app.ts` es el contrato de tipos fundamental para todo el monorepo.

---

## 2. Convenciones de Código y Arquitectura

### Modularidad por Rutas
- Cada recurso reside en un módulo independiente dentro de `src/routes/` (ej. `tournaments.ts`, `matches.ts`, `teams.ts`, `standings.ts`).
- Cada submódulo debe instanciar un `new Elysia({ prefix: '/...', tags: '...' })` y exportarse como plugin.
- Las rutas se componen en la instancia central en `src/app.ts` usando `.use()`. `src/index.ts` es solo el entrypoint que ejecuta `app.listen(resolvePort())`.

### Separación de Responsabilidades
1. **Rutas (`src/routes/`):** Declaración de endpoints, inyección de esquemas de validación (`params`, `query`, `body`, `response`), middleware de autenticación y mapeo de respuestas HTTP.
2. **Servicios (`src/services/`):** Lógica de negocio pura, cálculos de tablas de posiciones, cruces de llaves y transacciones de base de datos con `@sports/db`.
3. **Tiempo Real (`src/ws/`):** Gestión de suscripciones WebSocket (ej. canales por partido `match:{id}`).

### Validación y Type-Safety Estricto
- **Prohibido validar manualmente con `if`:** Toda validación de parámetros, query strings, payloads y formatos de respuesta debe usar los esquemas importados desde `@sports/schemas`.
- **Inferencia completa de Eden Treaty:** No tipar manualmente los retornos con `Promise<any>`. Dejar que Elysia y Drizzle infieran el tipo de retorno exacto para que Eden Treaty lo propague a la Web y la App Móvil.

---

## 3. Estructura de Directorios

```text
apps/api/
├── src/
│   ├── lib/                     # Configuración de librerías y helpers
│   │   ├── jwt.ts               # Setup y configuración de @elysia/jwt (fail-fast en producción)
│   │   ├── config.ts            # resolvePort / resolveCorsOrigins (testeables)
│   │   └── ws.ts                # Helpers y utilidades de publicación WebSocket (futuro)
│   │
│   ├── middlewares/             # Guards, macros, hooks globales y control de acceso
│   │   ├── auth.middleware.ts   # Macro `auth`: verificación de token y derivación de usuario
│   │   ├── error.middleware.ts  # Manejador global de errores (DomainError, VALIDATION, PG 23503/23505)
│   │   └── role.guard.ts        # Guards RBAC: globalRole + roles scoped por torneo
│   │
│   ├── routes/                  # Controladores y endpoints REST agrupados por dominio
│   │   ├── auth.ts              # /auth (login, refresh, change-password)
│   │   ├── tournaments.ts       # /tournaments (CRUD, ediciones, etapas, grupos)
│   │   ├── teams.ts             # /teams (CRUD)
│   │   ├── matches.ts           # /matches (calendario, marcador en vivo, eventos)
│   │   └── ...                  # clubs, players, venues, sports, users, rosters, registrations, standings
│   │
│   ├── services/                # Lógica de negocio y consultas de base de datos
│   │
│   ├── app.ts                   # Instancia principal SIN listener + export de `App`
│   └── index.ts                 # Entrypoint: app.listen(resolvePort())
├── test/                        # Suites bun:test + treaty(app) — ver sección Testing
├── bunfig.toml                  # preload de test/setup.ts
├── package.json
└── tsconfig.json
```

## 4. Testing

Suite completa con `bun:test` + `treaty(app)` (Eden Treaty sobre la instancia, sin red). Ver `README.md` para el setup de la DB de pruebas.

### Comandos
- `bun test` — todas las suites.
- `bun run test:types` — type-safety end-to-end del contrato Eden (`tsc --noEmit`).
- `bunx turbo test --filter=api` / `bun run test` (raíz) — vía turbo.

### Convenciones obligatorias
- **Aislamiento:** cada suite usa `beforeEach(resetDb)` (`reset()` de drizzle-seed → TRUNCATE CASCADE). DB efímera `sports_platform_test`, forzada por el preload `test/setup.ts`.
- **Datos:** factories deterministas de `test/helpers/db.ts` (`seedUser({role})`, `seedTournament()`, `seedMatch()`...). Nada de datos aleatorios para RBAC.
- **Auth:** firmar tokens directamente con `helpers/auth.ts::authHeaders(user)`; los flujos login/refresh se prueban E2E aparte.
- **Params de ruta con sintaxis de llamada:** `api.matches({ id }).score.patch(...)` — NO indexado (`api.matches[id]` rompe el tipado).
- **Trampas de Eden Treaty:** en `.delete()/.post()` sin body, un único objeto como primer argumento se interpreta como *data*, no como config. Usar `.delete(undefined, { headers })`.

### Lecciones aprendidas (no regresar)
- Hooks de plugins requieren `{ as: "global" }` para aplicar a las rutas del app principal (`error.middleware.ts`).
- El SQLSTATE de bun-sql está en `errno`; Drizzle envuelve el error en `DrizzleQueryError.cause`. El middleware lo detecta por formato `\d{5}`.
- No reutilizar propiedades de `createInsertSchema` como valores de esquema (crashea `mapSchema` de Elysia); declarar literales inline.
- Dentro de una transacción Drizzle, leer SIEMPRE con `tx`, nunca con `db`.
