# Decided

Questions answered, gaps kept as the rule, and features refused with their reason. One entry, a sentence or two; if deciding it took a design argument with an alternative worth naming, it gets an [ADR](./adr/) instead and this file links to it. A question answered here does not get re-argued without new evidence in `docs/adr/`.

Anything still open belongs in [`todo.md`](./todo.md) with its `Needs:` line; a refusal that might be reversed one day also names what would change it.

---

**Why is there no ESLint or Prettier?** Biome is the single tool for lint, format and organize-imports (`biome.json`, `turbo`'s `check` task). Two tools doing overlapping work disagree with each other and with the formatter; one tool, one config, one command. Reconsider only if a rule Biome cannot express becomes load-bearing.

**Why do tests run against a real Postgres instead of mocking the database?** The tests go through the real app (`treaty(app)`), so they exercise routes, guards, services and SQL in one pass; mocking `@sports/db` would test the mock. A throwaway database (`sports_platform_test`, pinned by `apps/api/test/setup.ts`) is cheap, and it is what makes "a column change is one commit" checkable. A `DomainError`-unit test that wants no database may exist, but a route test is not that test.

**Why is there no `apps/mobile` yet, if `biome.json` already ignores its paths?** The mobile app (Tauri) is planned, not built. The ignore rules are written ahead so a landing directory does not start as a lint failure. Anything else that treats the app as existing (docs, CI, contracts) waits for the directory.

**Why does the API accept `tournamentId` in create bodies if the guard resolves it anyway?** The explicit field (ADR 002's pattern in `@sports/schemas`) makes the create contract carry what the write commits to, and lets integrity checks compare the payload against the resolved chain. It is a declaration, not an authorization: a client that lies gets the guard's answer.

**Why is the standing of a group recalculated on every score write instead of a nightly job?** The standings are the product's most-read page and must not lag the score a viewer just saw; a full recalculation per write is bounded by the group's size. The `docs/todo.md` P2 query-budget test is where a cheaper shape earns its place if the cost grows.

**Why is the checks program in `scripts/` called by root scripts instead of being a turbo task?** The scans read the whole repository, not a workspace's build output; a turbo task needs the declaring script inside each workspace's `package.json`, which would either run the scan once per workspace or invent a fake package to host it. One program, one subcommand per rule, root `package.json` scripts pointing at it ([`docs/adr/007`](./adr/007-the-gate-is-one-program-of-scans.md)).

**Why does `packages/api-client`'s test suite preload `apps/api/test/setup.ts`?** The live suite is a genuine E2E: it drives the real `api/src/app` against the real test database, so it needs the same environment the API's own tests pin (NODE_ENV, JWT secrets, `sports_platform_test`). Declaring the environment twice is how the two copies drift; one preload, borrowed by `bunfig.toml`, keeps one source of truth — and Turbo's `^test` ordering keeps the two suites, which share the one database, from truncating it under each other's feet.

**Why is the query ledger opt-in (`DRIZZLE_COUNT=1`) instead of always on?** A ledger that fills during production traffic is a memory leak with a schedule, and the budget only needs the number inside the test's window. The logger hook is Drizzle's own mechanism; with the flag off, every query pays one env check and nothing is stored ([`docs/adr/008`](./adr/008-read-endpoints-pin-their-round-trip-budget.md)).
**Why does `packages/ui` carry `motion` even though the effects could hand-render with CSS?** The bits (react-bits vendored) need staggered reveals, in-view mounting and spring-ish timers in DOM: recreating each one with raw CSS repeats the miniature physics in every bit and drifts. A PR's guidance for what enters `src/components/bits/`: vendored, with tokens, and without a second runtime — [ADR 009](./adr/009-react-bits-comes-in-vendored-on-one-runtime-in-tokens.md). react-bits is MIT + Commons Clause: usable in the product, not resealable as a component product.

