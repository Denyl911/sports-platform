# The gate is one program of scans, and CI runs it

**Status:** accepted
**Topic:** process

## Context

`AGENTS.md` states rules an import graph can verify: routes never touch `@sports/db`, services are free of HTTP, the only cross-app imports are type-only, a mutating route carries its guard. A paragraph nobody executes is the thing that rots — the same session that wrote the brief had already caught a gate that was red-on-name (`check-types` calling `turbo run check-types`) on `main`. But nilo's model teaches the other half of the lesson too: `checks/main.zig` is one program with a subcommand per rule, declared beside the table it enforces, not five scripts with five conventions and five ways to be forgotten.

## Decision

All repository checks live in one Bun program, [`scripts/checks.ts`](../../scripts/checks.ts), one subcommand per rule, and a `gate` subcommand that runs them all and refuses on any violation:

- **`layering`** — the import matrix of `AGENTS.md`'s layout, executable: every import of every file in a declared region must be one the region's rule allows (allowlist, not denylist — the next import must earn its place). Cross-app type-only imports are the only door between apps (ADR 003).
- **`errors`** — the static half of ADR 004: nothing in `services/` or `middlewares/` throws a raw error; a non-`DomainError` throw leaves as a 500. (`lib/` may throw raw: the server refusing to *start* is config, not a request failure.)
- **`rbac`** — every route file that mutates carries its `require<Role>` guard, or a `PUBLIC_MUTATIONS` row in the program names why it is public. The sweep prints the guarded inventory, so the pairing is reviewable in the same output.
- **`adr`** — file shape (`NNN-slug.md`, `**Status:**`, `**Topic:**`, no number in the title, no `Amends:`/`Supersedes:` headers — ADR 006's edit-in-place) and every cited ADR number has its file, in the three-digit form.
- **`docs`** — every relative markdown link from the root files and `docs/` resolves to a real path, and every `docs/todo.md` entry under a `P` tier carries its `Needs:`/`What would settle it:` line.
- **`web-fetch`** — the call-site half of ADR 003: no raw `fetch()`, `new WebSocket()`, `new EventSource()` or `XMLHttpRequest` anywhere in `apps/web/src`. The import matrix pins what the web app may *reach*; this scan pins that the reach is the client package's too — at runtime, where imports cannot see. The live sockets and the token refresh ride `@sports/api-client` (`createApiClient`/`useMatchLive`); a web-app exception would be a row in this program naming its reason, none exists.
- **`glyphs`** — the other half of the icon rule: no `→`, `←`, `✓`, `▸`, `▾`, `×`, `☰`, `ℹ` or `•` drawn as text anywhere in `apps/web/src` or `packages/ui/src`. An icon is `lucide` through `@sports/ui` (ADR 009, [`icon.ts`](../../packages/ui/src/components/ui/icon.ts)): restyleable, resizable, and silent to the screen reader while the control keeps its name — a character typed into JSX is none of those, and it was what every admin affordance used before this scan. The one shape the rule cannot reach is `<option>`: a select label holds text, not elements, so the sort labels keep their arrow. That exemption is a condition in the loop with its reason beside it, not a silenced check.

**Refusals name the rule, not just the fact** — the output says why the shape is wrong and where the escape hatch (`PUBLIC_MUTATIONS`, an ADR edit) lives, so the next session can fix the world instead of the check.

**CI runs the gate on every pull request and on `main`**: `bun run gate` = `bun scripts/checks.ts gate` (the scans, which need no database) followed by `turbo run check typecheck test` (which need the Postgres service container). A newly declared public mutation or a narrowed layer rule is a row plus a reason, in this file or the ADR it amends in place — never a silenced check.

## What was rejected

- **One script per rule scattered in `scripts/`.** Five entry points, five argument conventions, and nothing that runs them together; `gate` existing as a subcommand is what makes "run the checks" a step a person or a model actually does.
- **Turbo tasks for the scans.** A turbo task requires the workspace's `package.json` to declare it, so a repo-level scan either runs once per workspace or needs a fake package. The scans read the repository; root `package.json` scripts call them directly.
- **Denylist rules.** A denylist says what was wrong yesterday; an allowlist says what a region is *for*. `api/route imports "@sports/db"` being refused is stated once as "may import a schema, a service, a middleware or lib".
- **Trusting review for the pairing of mutation and guard.** `rbac.test.ts` covers the routes it names; the sweep is what fires the day a route file grows a `.post(` without its guard.

## Consequences

The checks' own discipline has a cost: a scan that reads imports by regex can be fooled by a shape it did not expect, so a refusal that names a case which is actually right is fixed by widening the *rule with a reason* (comment beside the table), not by special-casing in the loop. The gate is now the definition of green: locally `bun run gate`, in CI the same command with the Postgres service — a PR that is green means every declared rule ran, not that somebody read a diff.
