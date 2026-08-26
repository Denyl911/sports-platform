# Sports Platform — API

Backend REST para la plataforma deportiva multideporte. **Bun** + **Elysia** + **Drizzle ORM (PostgreSQL)** + TypeBox, con contratos end-to-end para Eden Treaty (`export type App`).

## Requisitos

- [Bun](https://bun.sh) ≥ 1.4
- [Podman](https://podman.io) o Docker, con la imagen `postgres:16`

## Variables de entorno

Copiar `.env.example` a `.env`:

| Variable | Descripción |
|---|---|
| `JWT_ACCESS_SECRET` | Secreto del access token (obligatorio en producción; sin fallback) |
| `JWT_REFRESH_SECRET` | Secreto del refresh token (ídem) |
| `DATABASE_URL` | Cadena de conexión PostgreSQL |
| `PORT` | Puerto HTTP (default `3000`) |
| `CORS_ALLOWED_ORIGINS` | Orígenes separados por coma; si falta, se permite todo (warning en producción) |

> ⚠️ En producción, si faltan los secretos JWT la API **se niega a arrancar**.

## Desarrollo

```bash
# 1. Levantar PostgreSQL (o reutilizar un contenedor existente)
podman run -d --name mi_postgres \
  -e POSTGRES_USER=sports_user \
  -e POSTGRES_PASSWORD=sports_user_password \
  -e POSTGRES_DB=sports_platform \
  -p 5432:5432 postgres:16

# 2. Aplicar el schema (desde packages/db)
cd ../../packages/db && bun --bun run db:push

# 3. Arrancar la API
cd ../../apps/api && bun run dev
```

Docs interactivas: `http://localhost:3000/docs`.

## WebSockets en vivo

Canales `Elysia.ws` con `uWebSockets` (Bun). Lectura pública sin token; escritura solo `referee` del torneo (o `admin`/`super_admin`).

- `ws://host/matches/:id/live?token=<accessToken>` — Suscripción al partido. El servidor emite `{ type: "connected" }` al abrir, luego `{ type: "score", matchId, payload: Match }` tras `PATCH /matches/:id/score` y `{ type: "event", matchId, payload: MatchEvent }` tras `POST /matches/:id/events` (también `{ type: "standing" }` indirecto al recalcular grupo). Mensajes del cliente `{"type":"score","payload":UpdateMatchScore}` o `{"type":"event","payload":RecordLiveEvent}` requieren `?token` de `referee`; `{"type":"ping"}` responde `pong`.
- `ws://host/groups/:groupId/live` — Solo lectura. Emite `{ type: "standing", groupId, payload: Standing[] }` tras `POST /groups/:groupId/standings/recalculate` (disparado automáticamente al finalizar un partido con grupo).

Ejemplo navegador:

```js
const ws = new WebSocket(`ws://localhost:3000/matches/${id}/live`);
ws.onmessage = e => console.log(JSON.parse(e.data));
// Para escribir como árbitro:
const ws2 = new WebSocket(`ws://localhost:3000/matches/${id}/live?token=${accessToken}`);
ws2.onopen = () => ws2.send(JSON.stringify({ type: "event", payload: { teamId, periodNumber: 1, minuteOrSecond: 10, eventType: "goal" } }));
```

## Testing

Los tests usan **`treaty(app)`** de Eden sobre la instancia de Elysia directamente (sin red) contra una base de datos efímera `sports_platform_test`, creada en la misma instancia de Postgres.

### Setup (una sola vez)

```bash
# Crear la DB de pruebas en el contenedor ya corriendo
podman exec mi_postgres psql -U sports_user -d sports_platform \
  -c "CREATE DATABASE sports_platform_test OWNER sports_user"

# Aplicar el schema a la DB de pruebas
cd packages/db
DATABASE_URL="postgresql://sports_user:sports_user_password@localhost:5432/sports_platform_test" \
  bun --bun run db:push
```

### Ejecutar

```bash
bun test              # todas las suites (apps/api)
bun run test          # desde la raíz del monorepo (vía turbo)
bun run test:types    # type-safety end-to-end del contrato Eden
```

### Cómo funciona

- `test/setup.ts` es un **preload** (registrado en `bunfig.toml`): define los secretos JWT y fuerza `DATABASE_URL` hacia `sports_platform_test` antes de que cualquier módulo lea el entorno.
- Cada suite hace `beforeEach(resetDb)` — `reset()` de `drizzle-seed` ejecuta `TRUNCATE ... CASCADE`.
- Los datos se generan con factories deterministas (`test/helpers/db.ts`) porque RBAC exige roles/emails exactos.
- Los tokens se firman directamente vía `helpers/auth.ts` (sin pasar por `/login`), salvo en las pruebas E2E de auth.
- El Logestic está desactivado en `src/app.ts` para no ensuciar la salida de tests.

## Estructura

```text
apps/api/
├── src/
│   ├── lib/            # jwt, config (PORT/CORS), helpers
│   ├── middlewares/    # auth (macro `auth`), role guards RBAC, error handler global
│   ├── routes/         # controladores por dominio (plugins de Elysia)
│   ├── services/       # lógica de negocio y queries Drizzle
│   ├── app.ts          # instancia de Elysia SIN listener + export type App
│   └── index.ts        # entrypoint: app.listen(resolvePort())
└── test/               # suites bun:test + treaty(app)
```
