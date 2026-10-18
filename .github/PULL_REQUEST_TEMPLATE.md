<!--
One decision per pull request. A branch that carries two gets reviewed as two, so open two.

The title is the commit subject: `type: imperative sentence about the effect`, with `feat`, `fix`, `perf`, `docs`, `test`, `build` or `chore`, and a `!` for a break. Say what changed, not which files.

The sections below are what AGENTS.md asks every change to carry. A section that does not apply is one line saying why, not a blank.
-->

## What changes, and why

<!-- Two or three sentences: what a caller can do now that they could not, or what stopped being wrong. The long version belongs in the ADR or CHANGELOG, not here. -->

## The decision

<!-- A design change is an ADR (docs/adr/, NNN-slug.md): Decision, What was rejected, Consequences. A change to an existing decision edits that ADR in place, never "Amends". Take the next free number on main and write it here so the reviewer can confirm it is still free at merge. If nothing about the design changed, say "none" and name the ADR that already covers this. -->

ADR: [pending — assign before opening the PR]

## What it spends

<!-- The four axes of AGENTS.md's "Invariants that are load-bearing". Fill the rows this change touches, with the number and how it was measured. "Nothing moved" is an answer, once the relevant tests still pass. A `docs:` or `test:`-only change replaces the table with that one line. -->

| Axis | Before | After | How measured |
|---|---|---|---|
| Queries per request | | | |
| Authorization rides the row | | | |
| Error contract | | | |
| Client weight | | | |

## Error contract

<!-- Every new failure mode: the DomainError factory used, the message (domain words, user-readable), and the routes whose response: map gained a status row. A new failure answering an undeclared status is this section being forgotten. -->

## Tests

<!-- bun test runs the real app: name behaviour sentences, seed through test/helpers. Anything touching state machines gets both directions: the table's transitions pass, the absent ones are refused. -->

- [ ] `bun run check` passes
- [ ] `bun run check-types` passes
- [ ] `bun run test` passes (real Postgres up)
- [ ] new routes covered via `treaty(app)`: happy path + every `DomainError` path the contract declares

## Documentation

<!-- Documentation is part of the change, not a follow-up. Tick what this change touched. -->

- [ ] `docs/adr/`: the decision, and the alternative it beat (or edits it in place)
- [ ] `docs/history.md`: a lesson (number measured, premise that turned out false)
- [ ] `docs/todo.md`: entries added for what is open, removed for what this closes
- [ ] `docs/decided.md`: a question answered or a feature refused with its reason
- [ ] `CHANGELOG.md`, under `## Unreleased`: what a user has to change
- [ ] `docs/reference`-style pages: n/a (this repo uses ADR + CHANGELOG)
- [ ] none of these, because:

## Before asking for review

- [ ] one decision in this pull request, and the title names it
- [ ] the words are `CONTEXT.md`'s (edición not temporada, alcance not tenant, marcador not puntos)
- [ ] a column change ships as one commit touching `packages/db` + schemas re-derivation + acknowledged consumers
- [ ] no red gate underneath: this PR does not ride on a failing `check-types` or `test`
