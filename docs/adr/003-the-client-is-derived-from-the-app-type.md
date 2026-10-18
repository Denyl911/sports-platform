# The client is derived from the app type

**Status:** accepted
**Topic:** contract

## Context

The API's consumers — the web app today, the mobile app when it lands — need to call endpoints with types that move when the API moves. The usual answer is a generated OpenAPI client or hand-written mirror types, both of which are second copies whose drift is found at runtime, in a browser, by a user. Eden treaty offers a different mechanics: call the app via a client that is the app type, not a description of it.

## Decision

`@sports/api-client` is the only door to the API. Its `client.ts` instantiates `treaty` against `import type { App } from "api/src/app"` — a type-only import of the real Elysia instance (the API is a `devDependency` of the client package via `workspace:*`). Calls resolve their URL, verbs, params, query and response types from that instance; errors are normalized once as `ApiError` (status + parsed value), so callers handle one failure shape.

**Type-only imports of `api/src/*` are the package's contract surface, and the whole of it.** The door does not name one file only: `live/types.ts` re-exports `LiveMessage` from `api/src/lib/live` (type-only, erased at build) so the shared live vocabulary has one definition — the server's — instead of a mirrored interface in the client. Everything else the server says travels through `App`. `bun run layering` (ADR 007) enforces the surface: a runtime import of `api/src/*` in this package fails the check.

Above the treaty client, the package organizes what callers actually use:

- **Hooks per domain** (`hooks/matches.ts`, `hooks/standings.ts`, …) — TanStack Query wrappers for reads and mutations, so query keys, invalidation and retries are decided here and nowhere else.
- **Centralized `queryKeys.ts`** — a key is written once; a component never invents one.
- **Live helpers** (`live/`) — the WebSocket subscription shape for match and group streams, consumed by `useMatchLive` and `useGroupLive`.

No component in `apps/web` fetches directly; no runtime mirror of an API type exists outside this package. The invariants table in `AGENTS.md` calls this axis "the client weight is zero": what the type system can carry, the client carries.

## What was rejected

- **A generated OpenAPI client per app.** It is a third copy of the truth plus a codegen step in every build; the drift moves from the type system to the generator's version pin.
- **Hand-written mirror types in `apps/web` (and mobile later).** The failure mode this decision exists to kill: an endpoint changes shape, two apps compile green, and the bug is a screen rendering `undefined`.
- **Raw `fetch` wrappers at the call site.** Ten ways to build a URL, no shared error shape, and no types.
- **Live helper types mirrored by hand.** The first draft of this decision named only `App` as the door, and `live/` would need its own `LiveMessage` copy to work at all; a mirrored message type is one more surface that drifts when a server field is added. The door was widened to type-only imports of `api/src/*` instead, and the mirror refused.

## Consequences

Renaming or reshaping an endpoint in `apps/api` fails `turbo run check-types` in every consumer in one pass — typecheck is the migration test, and it is why breaking contract changes are cheap to make honestly here. The cost: `@sports/api-client` cannot compile detached from `apps/api` (the type import is the deal), and the API must keep `App` exported as its whole route tree — an app assembled from route modules that skips one is a silent gap in the client, which the `integrity`/route-coverage intent of the test suite is expected to notice.
