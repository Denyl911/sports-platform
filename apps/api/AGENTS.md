# AGENTS.md - apps/api

Servidor backend HTTP REST y WebSocket de alto rendimiento para la plataforma deportiva multideporte, desarrollado con **Bun**, **ElysiaJS**, **Drizzle ORM** y **TypeBox**.

---

## 1. Propósito y Alcance de la Aplicación

- **Responsabilidad principal:** Exponer endpoints RESTful, documentación OpenAPI automática y canales WebSocket para transmisión de marcadores y eventos en tiempo real.
- **Consumidores:** 
  - `packages/api-client` (genera el cliente tipado con Eden Treaty para `apps/web` y `apps/mobile`).
  - Clientes externos mediante REST estándar y WebSockets.
- **Punto de exportación crítico:** `export type App = typeof app;` en `src/index.ts` es el contrato de tipos fundamental para todo el monorepo.

---

## 2. Convenciones de Código y Arquitectura

### Modularidad por Rutas
- Cada recurso reside en un módulo independiente dentro de `src/routes/` (ej. `tournaments.ts`, `matches.ts`, `teams.ts`, `standings.ts`).
- Cada submódulo debe instanciar un `new Elysia({ prefix: '/...', tags: '...' })` y exportarse como plugin.
- Las rutas se componen en la instancia central en `src/index.ts` usando `.use()`.

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
│   ├── lib/                     # Configuración de librerías, plugins de Elysia y clientes
│   │   ├── jwt.ts               # Setup y configuración de @elysiajs/jwt
│   │   └── ws.ts                # Helpers y utilidades de publicación WebSocket
│   │
│   ├── middlewares/             # Guards, macros, hooks globales y control de acceso
│   │   ├── auth.middleware.ts   # Verificación de sesión/token y derivación de usuario
│   │   ├── error.middleware.ts  # Manejador global de excepciones y respuestas HTTP de error
│   │   └── role.guard.ts        # Guardias de autorización para administradores / árbitros
│   │
│   ├── routes/                  # Controladores y endpoints REST agrupados por dominio
│   │   ├── auth.ts              # /auth (login, registro, refresh)
│   │   ├── tournaments.ts       # /tournaments (CRUD, etapas, grupos)
│   │   ├── teams.ts             # /teams (clubes, plantillas, jugadores)
│   │   ├── matches.ts           # /matches (calendario, actualización de marcador)
│   │   ├── standings.ts         # /standings (clasificación por grupo)
│   │   └── ws.ts                # Endpoints de conexión WebSocket
│   │
│   ├── services/                # Lógica de negocio y consultas de base de datos
│   │   ├── tournament.service.ts
│   │   ├── match.service.ts
│   │   └── standings.service.ts
│   │
│   ├── utils/                   # Funciones utilitarias puras y helpers
│   │   └── date-formatter.ts
│   │
│   └── index.ts                 # Instancia principal de Elysia y export de `App`
├── package.json
└── tsconfig.json
