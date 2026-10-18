# Sports Platform

Plataforma integral para la organización de torneos deportivos multideporte (fútbol, básquetbol, voleibol…): resultados, cruces, tablas de posiciones y marcadores en vivo para el público, y un dashboard para organizarlos.

## Qué hay dentro

Todo comparte una idea: **los tipos viajan de la base de datos al cliente sin copiarse**. Tablas Drizzle → esquemas TypeBox *derivados* de esas tablas → routes Elysia validados y documentados desde los mismos esquemas → cliente Eden tipado contra el tipo de la App. Un desajuste entre capas es un error de typecheck, no un 500 en producción.

```text
apps/
  api/          # API Bun + Elysia: REST, WebSockets (live), OpenAPI
  web/          # TanStack Start: sitio público SSR + dashboard admin
packages/
  db/           # @sports/db — esquemas Drizzle (PostgreSQL), migraciones generadas
  schemas/      # @sports/schemas — contratos TypeBox derivados de las tablas
  api-client/   # @sports/api-client — cliente Eden + hooks TanStack Query + live
  ui/           # @sports/ui — componentes React compartidos (Tailwind, shadcn/ui)
  tsconfig/     # @sports/tsconfig — tsconfig base compartidos por todos los workspaces
```

*(Hay sin decidir: `apps/mobile` (Tauri) está planeado, no construido.)*

## Herramientas

- [Bun](https://bun.sh/) como runtime, gestor de paquetes y runner de tests
- [Turborepo](https://turborepo.dev/) para el grafo de tareas y caché
- [Biome](https://biomejs.dev/) para lint, formato y organize-imports — una sola herramienta (`docs/decided.md`)

## Empezar

```sh
bun install

# Postgres debe estar corriendo en localhost:5432 (Docker/Podman);
# los tests usan una base efímera `sports_platform_test` que el propio
# setup de apps/api fija.

bun run dev            # ambos apps con restart al guardar
bun run check          # biome check, todos los workspaces
bun run check-types    # tsc --noEmit, todos los workspaces
bun run test           # bun test, todos los workspaces

# Migraciones (packages/db):
bun run db:generate    # desde el esquema; nunca a mano
bun run db:migrate
```

Un build específico, por filtro:

```sh
bun run build --filter=api
bun run test --filter=api
```

## Lectura en orden

| | |
|---|---|
| [`AGENTS.md`](./AGENTS.md) | el brief de trabajo: principios, capas, comandos, invariantes, convenciones |
| [`CONTEXT.md`](./CONTEXT.md) | el vocabulario del dominio y del código, y las palabras que este repo no usa |
| [`docs/adr/`](./docs/adr/) | las decisiones de diseño, cada una con la alternativa que rechazó |
| [`docs/decided.md`](./docs/decided.md) | preguntas respondidas y features negadas con su razón |
| [`docs/history.md`](./docs/history.md) | lecciones del camino (no un changelog) |
| [`docs/todo.md`](./docs/todo.md) | lo que está abierto, ranked P0–P3 |
| [`CHANGELOG.md`](./CHANGELOG.md) | lo que un usuario tiene que cambiar |

## Contribuir

Se trabaja mejor con agentes que con parches a ciegas: [`AGENTS.md`](./AGENTS.md) es el brief y el [`pull request template`](./.github/PULL_REQUEST_TEMPLATE.md) es el contrato que todo cambio trae (un eje gastado, su contrato de error, sus tests y su documentación). Un cambio = una decisión = un PR.
