# Schemas are derived from tables, never written

**Status:** accepted
**Topic:** contract

## Context

A typed API has three places where the shape of a resource can live: the database schema, the request/response validation, and the client's types. Written by hand, each copy drifts: a column exists in Postgres, a zod schema forgets it, the client types a stale version, and the mistake surfaces as a runtime error in production instead of a typecheck failure. The repository already chose Drizzle (tables), Elysia + TypeBox (validation) and Eden (client) — the question was whether `@sports/schemas` describes resources or *is* them.

## Decision

`@sports/schemas` derives the base contracts from `@sports/db/tables` with `drizzle-orm/typebox-legacy`: `createSelectSchema` for reads, `createInsertSchema` with refinements for writes, `createUpdateSchema` for partial updates. `selectMatchSchema` is literally `createSelectSchema(matches)` — one line, no field named by hand.

Hand-written TypeBox appears only where a route's real contract differs from a table's row shape, and never duplicates the table:

- `createMatchSchema` intersects the derived insert schema with an explicit `tournamentId` — the field the guard needs that the table does not carry (ADR 002).
- `updateMatchInfoSchema` is the organizer's curated PATCH contract: it deliberately omits score fields (they travel by the referee endpoint) and admits only the `cancelled` transition by this route (ADR 005).

Everything crosses one boundary: `packages/schemas/src/index.ts` re-exports the domains, and every consumer imports from `@sports/schemas`, never from a private module of it.

## What was rejected

- **Hand-written DTOs (TypeBox or zod) per route.** The three-copies drift above, exact shape observed in every project that does it.
- **A second runtime validator.** zod would bring a second validation language beside TypeBox for no gain: Elysia already validates, provides the static type and feeds OpenAPI from the same schema.
- **Derived schemas with no hand-written escape.** Real contracts differ from row shapes (cross-field rules, unions with `null` for PATCH). The escape exists and is narrow; it is the rule, not the door being open, that keeps `@sports/schemas` honest.

## Consequences

Adding a column is: edit the table, run `drizzle-kit generate`, and every layer re-derives — route validation, OpenAPI document and client types all move with one edit at the source. The cost is that `@sports/schemas` is pinned to `drizzle-orm`'s derivation API (`drizzle-orm/typebox-legacy`), which the root `package.json` already overrides to `1.0.0-rc.4`; a Drizzle upgrade is a contract upgrade, checked by `turbo run check-types`.
