# Sports Platform

Working brief for AI agents and developers on the multi-sport tournament platform monorepo. This file holds what a session needs every time; anything needed once in a while lives in its own file and is linked from here.

## What this is

A platform for organizing multi-sport tournaments (football, basketball, volleyball, …), with:

- **Public SSR site** (`apps/web`, TanStack Start): results, fixture, standings, live scores.
- **Admin dashboard** (`apps/web`): tournaments, fixture, referee assignment, statistics capture.
- **API** (`apps/api`, Bun + Elysia): REST, WebSockets (live), OpenAPI.

Everything shares one idea, and it is the important one:

> **Types travel from the database to the client without ever being copied.**

Drizzle tables → TypeBox schemas *derived* from the tables (`drizzle-orm/typebox-legacy`, `@sports/schemas`) → Elysia routes validated and documented from those schemas → Eden treaty client typed against the app type (`@sports/api-client`). A drift between layers is a typecheck failure, not a 500 at 3 am.

Four places carry context this file does not repeat:

- **[`CONTEXT.md`](./CONTEXT.md)**: the domain and code vocabulary, each term with the words it refuses (Spanish; keep it in code, comments, errors and commits).
- **[`docs/adr/`](./docs/adr/)**: the binding decisions, each naming the alternative it rejected. A change to a decision edits its ADR in place (ADR 006). Check here before proposing a design change: "why not X?" usually has an answer on file.
- **[`docs/decided.md`](./docs/decided.md)**: questions answered and features refused, with their reason, in one line each.
- **[`docs/history.md`](./docs/history.md)** and **[`docs/todo.md`](./docs/todo.md)**: lessons learned and items open, with the rules of each file in its header.

## Guiding principles

These come before everything below, and a proposal that breaks one says which and why.

1. **The contract travels.** Adding a field never needs three edits in three places. A hand-written mirror of anything derivable is the bug, and adding one is a regression even if it compiles.
2. **Be objective.** A claim rests on code read or a number measured, and says which. Report a result that went the wrong way as plainly as one that went the right way.
3. **The clean solution over the quick one.** A bad shape that gets fixed instead of replaced keeps producing more of itself. Breaking changes are allowed and must be paid now, in a `CHANGELOG.md` entry, rather than carried forever.
4. **Nothing load-bearing lives only in your head, only in a commit body, or only in this session.** A decision goes in an ADR, a lesson in `docs/history.md`, and anything that is a rule gets enforced by a scan: `scripts/checks.ts` runs the layering matrix, the raw-throw scan, the RBAC pairing, the ADR shape and the doc links (`docs/adr/007`); the type system and the test suite run the rest.
5. **Health before feature.** A test that cannot run, a failing `bun run check-types`, or a CI that does not exist beats any new endpoint. You may not commit on top of a red gate.

## Who works here

The repository is written to be worked on by somebody who did not write it, a person or a model. Decisions and their rejected alternatives are on file; the vocabulary is fixed; the questions answered and the refusals with their reasons are in [`docs/decided.md`](./docs/decided.md). Propose work in the shape the [pull request template](./.github/PULL_REQUEST_TEMPLATE.md) asks: one decision, its axis spent, its tests and its documentation.

## Layout

The repository is apps and packages, not one library. One question decides where code goes: **does it talk to the database?** Services do; routes never touch it; no app imports another app's code — the only door is type-only imports of `api/src/*` inside `@sports/api-client` (ADR 003), which is what makes the contract travel. All of this is a check, not a paragraph: `bun run layering` ([`docs/adr/007`](./docs/adr/007-the-gate-is-one-program-of-scans.md)).

| Layer | Files | What it is |
|---|---|---|
| **App (API)** | `apps/api/src/` | Bun + Elysia: routes, middlewares, services, lib. Serves REST + WebSockets + OpenAPI. |
| **App (Web)** | `apps/web/src/` | TanStack Start: public SSR site and admin dashboard. Talks to the API only through `@sports/api-client`. |
| **Package (db)** | `packages/db/` | Drizzle ORM (Postgres). `src/tables/`, `src/relations.ts`, migrations in `drizzle/` (generated only). |
| **Package (schemas)** | `packages/schemas/` | TypeBox contracts derived from the tables. No zod, no hand-written DTO mirrors. |
| **Package (api-client)** | `packages/api-client/` | Eden treaty client typed against `api/src/app`; TanStack Query hooks per domain; live WebSocket helpers. |
| **Package (ui)** | `packages/ui/` | Shared React components (Tailwind, shadcn/ui). No domain logic, no API calls. |
| **Package (tsconfig)** | `packages/tsconfig/` | Base `tsconfig.json`s (`base.json`) every workspace extends. Type rules live here, once. |

Internal boundaries of `apps/api/src/` (enforced by `bun run layering`):

- **routes/** import schemas, services, middlewares and `lib/` only. A route never touches `@sports/db`, never calls another route, never holds domain logic.
- **services/** import `@sports/db`, `@sports/schemas` and other services. They throw `DomainError` and are the only place SQL is written.
- **middlewares/** import services (for guard lookups). `role.guard.ts` resolves an entity to its tournament and checks membership (ADR 002).
- **lib/** is shared machinery (config, jwt, live, openapi helpers). It imports nothing from routes.

A pending large change is a directory that does not exist yet: `apps/mobile` (Tauri). The biome ignores already reserve it; treat it as not existing until it does ([`docs/decided.md`](./docs/decided.md)).

## Commands

```sh
bun install                            # once

bun run check                          # biome check, every workspace
bun run check-types                    # tsc --noEmit, every workspace
bun run test                           # bun test, every workspace (real Postgres, see below)
bun run layering                       # import matrix check (scripts/checks.ts layering)
bun run checks                         # every scan: layering, errors, rbac, adr, docs
bun run gate                           # checks + check + check-types + test — what CI runs

bun run dev                            # both apps, turbo-managed
bun run dev --filter=api               # one app (the web dev server re-checks types on save)

cd packages/db && bun run db:generate  # drizzle-kit generate (the ledger is empty — docs/todo.md P2)
cd packages/db && bun run db:push      # push schema straight (that is how tests build it today)
cd packages/db && bun run db:studio    # drizzle studio
```

**The tests run against a real Postgres.** `apps/api/test/setup.ts` pins `DATABASE_URL` to `sports_platform_test` on the local instance (`postgresql://sports_user:sports_user_password@localhost:5432`) unless the variable already targets that database, and `packages/api-client`'s E2E suite preloads the same setup via its own `bunfig.toml` — one test world, one database, which is why Turbo's `^test` ordering runs the suites in sequence. A Postgres reachable at `localhost:5432` (Docker/Podman) is the only external dependency; nothing is mocked (see [`docs/decided.md`](./docs/decided.md)). Read the exit code, not the word "failed": one green run needs `bun run gate` passing.

## Invariants that are load-bearing

These are the four axes a change may spend, the analogue of a performance budget. **A change declares which axis it spends when it is proposed, not after it lands** — the pull request template asks for the numbers.

| Axis | Rule | Held today by |
|---|---|---|
| Queries per request | A read endpoint answers with the round trips its test declares. A new N+1 is a regression, even if it passes end-to-end ([`docs/adr/008`](./docs/adr/008-read-endpoints-pin-their-round-trip-budget.md)). | `apps/api/test/query-budgets.test.ts` — the public lists are pinned at 2 (items + envelope total); detail reads are open (`docs/todo.md` P3) |
| Authorization rides the row | Every write names its tournament and the guard resolves it through the chain entity → stage → edition → tournament (ADR 002). List queries filter the same chain; there is no endpoint whose security lives only in the client. | `apps/api/test/rbac.test.ts` and `integrity.test.ts` (behaviour), `bun run rbac-check` (the pairing sweep; file-grained today, `docs/todo.md` P3) |
| The error contract is single | Services throw `DomainError` only, with a status and a user-readable message. Routes never throw raw errors; each route's `response:` map declares which statuses it can answer and with which shape (`errorMessageSchema`) (ADR 004). | `bun run errors-check` (static) + `apps/api/test/error-contract.test.ts` (through the real app) |
| The client weight is zero | No runtime mirror of API types outside `@sports/api-client`. A web component never fetches directly, mobile included when it lands (ADR 003). | `bun run layering` (the import matrix — web reaches the API only through the client); direct `fetch` inside components is review today (`docs/todo.md` P3) |

Plus one standing rule about change shape: **a column change is one commit** that touches `packages/db`, lets `@sports/schemas` re-derive, and acknowledges the effects in routes and client hooks — not a series of separate patches hoping they meet.

## Conventions

**Commits are conventional.** `feat`, `fix`, `perf`, `docs`, `test`, `build`, `chore`, with `!` for a break. The subject says what changed, not which files: `fix: stop roster endpoint returning teams outside the stage`.

**Tests are behaviour sentences.** `bun test` runs through the real app (`treaty(app)` in tests, never a mocked superset): name the test after the behaviour it pins — `it("a match cannot move to finished while paused")`. Seeds live in `test/helpers/db.ts`; a test that needs a state another test also needs seeds it there, not inline.

**Error messages are a feature.** A `DomainError` message is user-readable in Spanish, says what is wrong in the domain's words (`CONTEXT.md`), and never leaks a table name or a SQL fragment. When it changes wording, check no test or client string depended on the old one.

**Doc comments say why, and name the ADR.** A module whose header is its design rationale beats a paragraph re-stated three places.

**Vocabulary is `CONTEXT.md`'s.** Edición not "temporada", alcance not "tenant", marcador not "puntos". In code, comments, error messages, commits and docs alike.

**No secrets in the repo.** `.env` files are local; `test/setup.ts` pins test secrets; production is configured by the deploy target, never by a committed file. See [`docs/decided.md`](./docs/decided.md).

## Refused on the record

- **ESLint/Prettier**: Biome covers lint, format and organize-imports in one tool (`docs/decided.md`).
- **A client that imports another app's runtime**: the only cross-app import is the type-only one in `api-client` (ADR 003).
- **`apps/mobile` before it exists**: write the ignore rules, not the app.
- **Hand-written schema mirrors or zod anywhere**: ADR 001.

None of this is closed company policy: a refusal is one ADR away from being a decision. The move is to write that ADR, not to open a PR that does the thing first.

## Where things go

| What you have | Where it goes |
|---|---|
| a design decision and the alternative it rejected | a new file in `docs/adr/`, or an edit to the ADR it changes (in place, per ADR 006) |
| a question answered, or a feature refused with its reason | `docs/decided.md` |
| a lesson (something measured, a premise that turned out false, a mode of failure caught) | `docs/history.md`, one paragraph |
| a concrete item still open | `docs/todo.md`, in the tier P0–P3 its cost puts it |
| what a user has to change | `CHANGELOG.md`, under `## Unreleased` |

## Running this project's services

`bun run dev` starts both apps under turbo and restarts on save. Prefer it over running one dev server in the background: with one server you only see that server's output, and the error is usually in another one. When a test run fails to connect, suspect the Postgres container before suspecting the test.

- Posts a live connection? `apps/api` exposes `/live` for match WebSocket fanout; start the API first when driving it by hand.
- Migrations: today the schema is built with `db:push` — the migration ledger is empty and `db:generate` has never run (`docs/todo.md` P2); do not tell anybody `db:migrate` yet.
- A red gate is a stop, not a note: never commit on top of a failing `bun run gate`.
