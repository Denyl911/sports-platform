# AGENTS.md - @sports/schemas

> TODO: Actualizar esquemas a nuevas tablas

Package de esquemas de validación en tiempo de ejecución, DTOs (Data Transfer Objects) e inferencia de tipos TypeScript compartidos utilizando **TypeBox** (a través de `drizzle-orm/typebox-legacy` y `elysia`).

---

## 1. Propósito y Alcance del Package

- **Responsabilidad única:** Fuente única de verdad (*Single Source of Truth*) para la validación de datos de entrada/salida (HTTP, WebSockets) y tipado estático de la plataforma deportiva.
- **Consumidores:**
  - `apps/api` (Validación de rutas, query params, headers, bodies y respuestas en ElysiaJS).
  - `packages/api-client` (Tipado y contratos para Eden Treaty y hooks de TanStack Query).
  - `apps/web` y `apps/mobile` (Validación de formularios en cliente y tipado de estados).
- **Dependencias upstream:** `@sports/db` (obtiene las definiciones de tablas y enums).

---

## 2. Convenciones de Código y Arquitectura

### Modularidad por Dominio
- Cada archivo en `src/` agrupa los esquemas y tipos de una entidad o dominio específico en formato kebab-case (ej. `matches.ts`, `tournaments.ts`, `teams.ts`, `standings.ts`).
- **Barrel Export Obligatorio:** Todos los esquemas y tipos exportados en cada módulo deben re-exportarse en `src/index.ts`.

### Nomenclatura Estricta
- **Esquemas TypeBox:** `camelCase` con sufijo descriptivo:
  - Base DB: `select[Entity]Schema`, `insert[Entity]Schema`, `update[Entity]Schema` (ej. `selectMatchSchema`, `insertTournamentSchema`).
  - DTOs de Rutas: `[entity]IdParamsSchema`, `[entity]FilterQuerySchema`, `update[Entity]ScoreSchema`.
- **Tipos TypeScript Inferidos:** `PascalCase` idéntico al concepto (ej. `Match`, `InsertMatch`, `MatchFilterQuery`, `RecordLiveEvent`).

### Derivación de Esquemas
1. **Nunca redeclarar tablas completas manualmente:** Genera siempre los esquemas base de lectura/escritura utilizando `createSelectSchema`, `createInsertSchema` y `createUpdateSchema` de `drizzle-orm/typebox-legacy`.
2. **Refinamiento de campos:** Usa las utilidades de TypeBox (`t.Object`, `t.Pick`, `t.Omit`, `t.Partial`, `t.Optional`, `t.Union`) de `elysia` o `drizzle-orm/typebox-legacy` para refinar tipos de fechas, UUIDs o payloads específicos.

---

## 3. Estructura de Directorios

```text
packages/schemas/
├── src/
│   ├── sports.ts                # Esquemas y DTOs de deportes y canchas
│   ├── tournaments.ts           # Torneos, ediciones, fases y grupos
│   ├── teams.ts                 # Clubes, equipos, jugadores y plantillas
│   ├── matches.ts               # Partidos, periodos, marcadores y eventos en vivo
│   ├── standings.ts             # Tablas de posiciones y clasificaciones
│   ├── common.ts                # Esquemas globales reutilizables (paginación, UUID params, etc.)
│   └── index.ts                 # Barrel export de todos los esquemas y tipos
├── package.json
└── tsconfig.json
