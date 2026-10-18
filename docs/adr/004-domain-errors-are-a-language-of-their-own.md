# Domain errors are a language of their own

**Status:** accepted
**Topic:** api-errors

## Context

A service that speaks HTTP is a service that cannot be called anywhere else. The first draft of this rule is written into `apps/api/src/services/errors.ts` as a comment: *"Errores de dominio libres de HTTP. El service lanza, el controller traduce."* The question this ADR settles is where each failure lives: what the service throws, what the route answers, and what the client reads.

## Decision

Every failure the domain causes is thrown as a **`DomainError`** from `apps/api/src/services/errors.ts`: a message in the domain's words (`CONTEXT.md`) and a status. The factories are the vocabulary — `badRequest`, `unauthorized`, `forbidden`, `notFound`, `conflict` — and services never construct HTTP-shaped objects, never read a request, never know Elysia.

The translation happens once: `middlewares/error.middleware.ts` catches and writes the status and message; the 500 is for what no `DomainError` names. Each route then *declares* its failure contract in its `response:` map — `400: errorMessageSchema`, `404: errorMessageSchema`, whatever it can answer — so the OpenAPI document promises the failures, the client's types carry them, and a status the route did not declare is a contract bug, not an undocumented behavior.

What each status means in this vocabulary:

| Status | Means | Example refusal |
|---|---|---|
| `400` | the write is wrong in the domain's terms | invalid status transition, team not registered in the stage |
| `401` | there is no caller | missing/invalid token |
| `403` | there is a caller, without the role | viewer asking for the score endpoint |
| `404` | the named thing does not exist | match id that resolves to nothing |
| `409` | the write collides with known state | duplicate registration |

The `DomainError` message is user-facing: it names the thing in vocabulary words, never a table name or a SQL fragment.

## What was rejected

- **Throwing plain `Error`s and letting the middleware guess.** The middleware would be inventing the mapping per message string — an error table without a program.
- **Services returning union failure types.** It moves the same decision into every caller and ties services to response shapes; the throw is the seam, and the route map is the record.
- **HTTP-aware services.** A service importing Elysia (or Elysia types) can no longer be reused by a worker or a script; the boundary is what makes the domain layer testable outside the server.

## Consequences

A new failure mode is one factory call in the service and one row in the calling routes' `response` maps. The pending mechanical check (`docs/todo.md` P2) pins the whole table: every error answer that leaves `apps/api` went through the middleware and matches a declared `response` shape, so a route cannot grow an undeclared error.
