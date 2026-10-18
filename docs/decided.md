# Decided

Questions answered, gaps kept as the rule, and features refused with their reason. One entry, a sentence or two; if deciding it took a design argument with an alternative worth naming, it gets an [ADR](./adr/) instead and this file links to it. A question answered here does not get re-argued without new evidence in `docs/adr/`.

Anything still open belongs in [`todo.md`](./todo.md) with its `Needs:` line; a refusal that might be reversed one day also names what would change it.

---

**Why is there no ESLint or Prettier?** Biome is the single tool for lint, format and organize-imports (`biome.json`, `turbo`'s `check` task). Two tools doing overlapping work disagree with each other and with the formatter; one tool, one config, one command. Reconsider only if a rule Biome cannot express becomes load-bearing.

**Why do tests run against a real Postgres instead of mocking the database?** The tests go through the real app (`treaty(app)`), so they exercise routes, guards, services and SQL in one pass; mocking `@sports/db` would test the mock. A throwaway database (`sports_platform_test`, pinned by `apps/api/test/setup.ts`) is cheap, and it is what makes "a column change is one commit" checkable. A `DomainError`-unit test that wants no database may exist, but a route test is not that test.

**Why is there no `apps/mobile` yet, if `biome.json` already ignores its paths?** The mobile app (Tauri) is planned, not built. The ignore rules are written ahead so a landing directory does not start as a lint failure. Anything else that treats the app as existing (docs, CI, contracts) waits for the directory.

**Why does the API accept `tournamentId` in create bodies if the guard resolves it anyway?** The explicit field (ADR 002's pattern in `@sports/schemas`) makes the create contract carry what the write commits to, and lets integrity checks compare the payload against the resolved chain. It is a declaration, not an authorization: a client that lies gets the guard's answer.

**Why is the standing of a group recalculated on every score write instead of a nightly job?** The standings are the product's most-read page and must not lag the score a viewer just saw; a full recalculation per write is bounded by the group's size. The `docs/todo.md` P2 query-budget test is where a cheaper shape earns its place if the cost grows.
