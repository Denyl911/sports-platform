# AGENTS.md - @sports/db

Package de persistencia, definición de esquemas y migraciones de base de datos para la plataforma deportiva multideporte utilizando **Drizzle ORM (PostgreSQL)**.

---

## 1. Propósito y Alcance del Package

- **Responsabilidad única:** Definición de tablas, relaciones, enums, índices y cliente de conexión a PostgreSQL.
- **Consumidores:** 
  - `@sports/schemas` (extrae esquemas de validación TypeBox desde aquí).
  - `apps/api` (ejecuta queries y mutaciones vía Drizzle ORM).
- **Puntos de entrada expuestos:**
  - `@sports/db` -> Instancia del cliente Drizzle (`db`) y utilidades de conexión.
  - `@sports/db/schema` -> Exportación centralizada de todas las tablas y enums.

---

## 2. Convenciones de Código y Arquitectura

### Estructura de Archivos
- **Un archivo por tabla:** Cada entidad reside en su propio archivo dentro de `src/schema/` en formato kebab-case (ej. `tournament-stages.ts`, `match-events.ts`).
- **Enums aislados:** Todos los `pgEnum` se declaran en `src/schema/enums.ts`.
- **Barrel Export Obligatorio:** Todo nuevo archivo dentro de `src/schema/` **debe** re-exportarse en `src/schema/index.ts`.

### Nomenclatura de Base de Datos
- **Tablas:** Plural, snake_case (ej. `tournament_editions`, `match_periods`).
- **Columnas en SQL:** snake_case (ej. `home_score`, `created_at`).
- **Propiedades en TypeScript:** camelCase (ej. `homeScore`, `createdAt`).
- **Claves Primarias:** UUID generados por defecto (`uuid("id").defaultRandom().primaryKey()`) o slugs únicos (ej. `sports.id` -> `'soccer'`).
- **Claves Foráneas:** Sufijo `Id` en TS y `_id` en SQL con acciones de eliminación explícitas (`onDelete: 'cascade'` o `onDelete: 'set null'`).

---

## 3. Estructura de Directorios

```text
packages/db/
├── drizzle/                    # Archivos SQL generados automáticamente por drizzle-kit
├── src/
│   ├── tables/                 # Definición modular de tablas
│   │   ├── enums.ts            # stageTypeEnum, matchStatusEnum, etc.
│   │   ├── sports.ts
│   │   ├── venues.ts
│   │   ├── tournaments.ts
│   │   ├── tournament-editions.ts
│   │   ├── tournament-stages.ts
│   │   ├── stage-groups.ts
│   │   ├── clubs.ts
│   │   ├── teams.ts
│   │   ├── players.ts
│   │   ├── stage-team-registrations.ts
│   │   ├── tournament-rosters.ts
│   │   ├── matches.ts
│   │   ├── match-periods.ts
│   │   ├── match-events.ts
│   │   ├── stage-standings.ts
│   │   └── index.ts            # Barrel export de todo el schema
│   ├── index.ts                # Inicialización y export del cliente `db`
│   └── types.ts                # Inferencias globales de Drizzle (InferSelectModel, InferInsertModel)
├── drizzle.config.ts           # Configuración de Drizzle Kit
├── package.json
└── tsconfig.json
