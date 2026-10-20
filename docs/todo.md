# Todo

Every concrete item open in the repository, worth doing and not needed right now: ranked P0–P3 by what it costs users or the project, never by who has asked. Nothing here waits for a caller; an entry is judged by the use case it opens or the cost it removes.

**Rules of this file.** An entry opens with its whole claim in bold and closes with a `Needs:` or `What would settle it:` line, which is what makes a blocker that has quietly stopped being one findable. **Nothing built and nothing decided stays here**: when something ships its entry leaves entirely (no strikethrough, no "done"); what was learned moves to [`history.md`](./history.md), and what is a decision already made goes in [`decided.md`](./decided.md). A defect is never left off. A small thing that opens no use case and is not needed now is not added.

---

## P2

**The migration ledger is empty.** `packages/db/drizzle/` has no generated migrations — `db:generate` has never been run — and every schema build today comes from `db:push` (tests, CI's service container). That is fine while nothing is deployed; the moment an environment exists that runs `db:migrate`, it has nothing to apply.
Needs: the first `bun run db:generate` against the current schema, with the generated files committed and CI keeping `db:push` for its ephemeral base; what would settle it is `db:migrate` on a fresh instance producing the same schema `db:push` does.

**CI's `check` gate is a mutating scan.** The workspace `check` scripts run `biome check --write`; in CI the fixes are written to a throwaway filesystem and the run can pass green over formatting drift that a local run would have fixed. A gate that quietly auto-repairs the thing it checks is weaker than the same check without the flag.
Needs: a non-mutating variant for CI (`biome check` without `--write`, keeping the local `--write` ergonomics); what would settle it is a deliberately misformatted file landing in a PR and the gate going red on it.

**Manual match writes can double-book a team or a court.** The generator spaces matches so a team plays once per jornada and a court hosts one match per slot, but `PATCH /matches/:id`, `PATCH /matches/:id/schedule` and `PATCH /matches/:id/venue` do not check whether the new date/time collides with another match of the same team or the same `venueId` + `fieldNumber`. A manual edit can produce an impossible fixture that the public site then shows.
Needs: a conflict check on every scheduling and venue write (same team at the same instant, same court at the same instant; overlapping intervals if `matchDurationMinutes` becomes a column), with a Spanish `DomainError` that names the colliding match; what would settle it is a test that tries to schedule two matches of one team at the same time and gets 409.

## P3

**Budget rows cover the public lists only.** `apps/api/test/query-budgets.test.ts` pins the eight list calls at their measured costs (every one: 2 — items plus the envelope's total). Detail reads (`GET /matches/:id` with its relations), `GET /:id` pairings elsewhere, and filtered writes-adjacent reads have no rows, so an N+1 there ships as green as ever.
Needs: a row per read as each earns scrutiny — the row is one label, one measured count, one call; what would settle it is any endpoint whose first row is measured and pinned.

**The RBAC sweep is file-grained.** The guard check in `scripts/checks.ts` pairs a `require<Role>` guard with a route *file*: a file that already guarded one mutation can grow a second without one and the sweep stays green. The real contract is per endpoint, not per file.
Needs: per-endpoint pairing (each `.post/.patch/.put/.delete` resolved to the builder chain that carries it), with the same `PUBLIC_MUTATIONS` escape; what would settle it is a test fixture with two mutations in one file, one guarded and one not, going red.
