# Authorization is an ownership lookup, not a field the client names

**Status:** accepted
**Topic:** auth

## Context

The platform is scoped: a user may be `organizer` of tournament A and nothing of tournament B. Every mutating request therefore has to answer "which tournament does this entity belong to, and what is the caller there?" before the service runs. The obvious cheap shapes put that answer in the wrong place: trusting `tournamentId` from the request body, or filtering rows in a middleware from session claims alone — both allow a caller with a valid token to act outside their scope, and neither is testable per endpoint.

## Decision

Authorization is resolved by **ownership lookup**: for the entity named in the request, a service in `scoped-ids.service.ts` walks the parent chain to its tournament — `match → stage → edition → tournament`, one lookup per entity kind — and `middlewares/role.guard.ts` checks the caller's membership role in that tournament. The lookups and the guard are the only writers of authorization decisions.

Concretely, for every mutating route:

1. `jwtMiddleware` authenticates and attaches `userId`.
2. `require<Domain>Role("organizer", …)` resolves the entity's tournament via `scoped-ids.service` and refuses with `DomainError.forbidden` when the membership does not carry the role.
3. The service refuses what no role discipline can see individually: illegal state transitions, registrations into a closed stage, teams not registered in the match's stage — `DomainError.badRequest` at the business seam.

List endpoints filter by the same chain in the query (`editionId` and `tournamentId` joins), so a read layer cannot leak what the write layer refuses (ADR 004 keeps what comes out a `DomainError`).

## What was rejected

- **Trusting `tournamentId` from the body.** It is kept as an explicit field in create contracts (`createMatchSchema`) so the guard's result and the payload agree — but it guards nothing; the lookup does. A client that lies about it gets the lookup's answer, never a write.
- **Filtering rows in middleware from session claims.** A middleware sees nothing of the entity being touched; it can only decide from arguments it guesses. And a middleware-scoped decision is never exercised per endpoint in tests.
- **A per-row `tenantId` column and one global filter.** The scope is the tournament and its chain, which the relations already express; a second denormalized column would have two versions of the truth the moment the chain moves.

## Consequences

A new entity kind ships with three things: its table, a `get<Entity>TournamentId` lookup in `scoped-ids.service.ts`, and a `require<Entity>Role` guard — a route that skips the guard is the bug, and the sweep in `docs/todo.md` P2 exists to catch it once mechanical. The cost of resolution is one indexed query per mutation, which is the price of "the caller may not lie"; it is not counted against the queries-per-request axis for endpoints whose budget already includes the lookup.
