# Read endpoints pin their round-trip budget

**Status:** accepted
**Topic:** performance

## Context

"Queries per request" is one of the four load-bearing axes in `AGENTS.md`, but for a long time nothing measured it — an N+1 read endpoint passes `check-types`, passes `bun run test`, passes review, and pays in production at the first tournament with real data. Drizzle's logger can observe every round trip, but it needed a shape where counting costs production nothing and the budgets are one honest table next to the tests that enforce them, not a number hidden inside an assertion.

## Decision

**The ledger is opt-in, collected by the database package itself.** `packages/db/src/index.ts` passes a custom `logger` to the Drizzle instance; every call pays one environment check, and only when `DRIZZLE_COUNT=1` is set (which the budget test sets) do queries accumulate in the exported `queryLedger` array. Production collects nothing; no wrapper object, no second client, no indirection.

**The budgets are a visible table in `apps/api/test/query-budgets.test.ts`**, one row per read call: its label, its budget, and how the call is made. Seeding happens *before* the ledger window, so each count is the route's own doing (the JWT auth's user lookup included — everything on the request, so the number a PR declares is the number production pays). On failure the message prints the queries that ran, bounded, which is the diagnostic.

**A budget moves by measurement, never by edit-and-hope.** Running the suite prints every count when it exceeds the row; the process for raising one is: measure, put the new number in the row, and declare the axis spend in the pull request's table. The baseline discovered before any row existed: **every list endpoint costs exactly 2 round trips — the `items` select plus the `total` count of the `{ items, total }` envelope.** That pair, `Promise.all`'d but two round trips, is the floor every list starts from; it is not a violation, it is the envelope's own shape, and it is now pinned so it cannot silently become 3.

## What was rejected

- **Always-on collection with a knob to filter it out later.** A ledger filling in production is a memory leak waiting for the first high-traffic week, and the filter knob ends up the thing nobody remembers to set.
- **A second Drizzle client just for tests.** Tests must exercise the instance production runs; a parallel client measuring a different code path measures itself, not the route.
- **Proxies or monkey-patches over `db`.** They intercept the wrong layer (or fail silently on Drizzle's internal fast paths) and make the expense opaque; the logger hook is the mechanism the library itself provides.
- **Static SQL counting (grep the services).** It counts statements, not round trips — the exact lie that lets a loop of awaits pass while `Promise.all` reads as one.

## Consequences

Adding a read endpoint means adding a row — the table is the declaration that the endpoint's cost was measured. Detail and filtered reads get rows as they earn scrutiny (the current table covers the public lists; expanding it is a `docs/todo.md` item, not an omission hidden here). The count is the *test's* currency: if Drizzle's internals change what a "query" means, the numbers move and the rows must be re-measured — the honest kind of drift, caught by the suite printing what changed.
