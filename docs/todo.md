# Todo

Every concrete item open in the repository, worth doing and not needed right now: ranked P0–P3 by what it costs users or the project, never by who has asked. Nothing here waits for a caller; an entry is judged by the use case it opens or the cost it removes.

**Rules of this file.** An entry opens with its whole claim in bold and closes with a `Needs:` or `What would settle it:` line, which is what makes a blocker that has quietly stopped being one findable. **Nothing built and nothing decided stays here**: when something ships its entry leaves entirely (no strikethrough, no "done"); what was learned moves to [`history.md`](./history.md), and what is a decision already made goes in [`decided.md`](./decided.md). A defect is never left off. A small thing that opens no use case and is not needed now is not added.

---

## P1

**The repository has no CI.** Nothing green is checked on a PR or on `main`: `turbo run check`, `check-types` and `test` exist and run locally only, so a broken gate can be pushed and discovered at deploy — the failure the testing stack was built to prevent.
Needs: a workflow that runs the three commands against an ephemeral Postgres on every PR; what would settle it is the first red-run-caught-on-a-PR.

**The layering rule is text, not a check.** `AGENTS.md` states who imports whom (routes↛db, services-only SQL, no app-to-app runtime imports except the type-only contract import). A paragraph nobody runs is the thing that rots.
Needs: a `check-layering` script (Biome-level import scan) whose enforcement table lives beside the layout; what would settle it is the first refusal naming a violator.

## P2

**No endpoint has a declared query budget.** "A read endpoint answers with the round trips its test declares" is an `AGENTS.md` invariant with no test behind it, so an N+1 ships as silently as any green code.
Needs: a Drizzle query-count test over the read endpoints (per-endpoint table in a visible file); what would settle it is the first test row whose count goes one up and fails red.

**The error contract has no discriminator.** "Every failure that leaves `apps/api` is a `DomainError` translated by the middleware and matches a declared `response:` shape" (ADR 004) is held by review; a service that throws a plain `Error` green-lights as a 500.
Needs: a test that walks the route tree and either records a `DomainError` for each failure path or fails naming the route.

**A systematic RBAC sweep does not exist.** `rbac.test.ts` covers the routes it names; an entity whose `require<Entity>Role` guard got skipped in a new route is found by reading, not by the suite.
Needs: a sweep that pairs every mutating route with its guard and names the one missing it (`docs/adr/002-authorization-is-an-ownership-lookup.md` is the rule).

## P3

**ADR and doc format are held by review only.** ADR naming (`NNN-slug.md`), the `Status:`/`Topic:` lines, and the `docs/` conventions of `AGENTS.md` have no check yet.
Needs: the `adr-check` / `docs-check` scripts from the layering-check work (P1) once its pattern exists.

**The client's "zero weight" invariant is review-only.** No lint rule refuses a direct fetch in another app or a runtime mirror of API types outside `@sports/api-client`.
Needs: a Biome rule/lint pass, which is the same pattern as `check-layering`.
