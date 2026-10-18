# State machines are explicit tables

**Status:** accepted
**Topic:** domain-state

## Context

Resource state has two shapes: a set of legal values, and the transitions between them. A status column with an `assertHasOneOfTheValues` check catches the first shape only; the second — can a match go from `paused` to `finished`? can a registration be withdrawn after the stage started? — walks straight into `if`-chains in the endpoints that need it, written per call site, and a transition added where it is needed instead of where it belongs doubles them silently.

## Decision

A resource whose state is a machine carries a **named transition table**, and every writer consults it through one assert. `match.service.ts` pins the pattern:

```ts
const MATCH_STATUS_TRANSITIONS: Record<string, string[]> = {
	scheduled: ["in_progress", "cancelled", "walkover"],
	in_progress: ["paused", "finished", "cancelled", "walkover"],
	...
	finished: [],   // terminal states are explicit, not "no case matched"
};
```

`assertMatchStatusTransition(current, next)` refuses anything outside the row, including `current === next` being allowed. A new transition is an **edit of the table plus the test row that pins it** — never an extra branch at the endpoint that happened to need it. The vocabulary list in `CONTEXT.md` says the same for humans: no boolean status flags (`isLive`, `isFinished`), no new status without its table row.

## What was rejected

- **Boolean flags beside the status.** Two answers to one question, and a birthday for "half live" states.
- **Transitions in route or client code.** The client checks what it needs for its UI, but the server consults the table; the client's copy is a convenience, never the guard.
- **An enum alone without the adjacency.** Legal values stop the first bug; legal movements stop the second.

## Consequences

When another resource grows a machine (registration state, stage lifecycle), it gets the same shape: one `RESOURCE_STATUS_TRANSITIONS`, one assert, and its terminal states spelled out. The test for each machine is a table read both ways: every transition in the table passes, every absent one is refused — which is also why terminal states are written even when their row is empty, so nothing decides "not listed" by accident.
