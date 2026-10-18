# An ADR is the rule in force

**Status:** accepted
**Topic:** process

## Context

The repository's working model (see `AGENTS.md`) is built to be worked on by somebody who did not write it, a person or a model. That only holds if decisions are on file — and if a formula is ever applied in the wrong order, decisions are on file in a shape that lies. One decision that gets narrowed, corrected or reversed tends to become *Amends* or *Supersedes* files, and then reading one decision means reading its chain, and the rule actually in force is whatever the last link says, cited apart from the rest.

## Decision

**An ADR says the rule in force.** A change to a decision edits that ADR in place: the Decision section states the rule as it holds now, and the position it replaced moves under "What was rejected", with the evidence that moved it. A new number is for a decision that did not exist before, not for a new version of an old one. A new decision that changes part of an older one edits the older one in the same change, so each ADR says the rule in force.

Every ADR opens with `**Status:**` and `**Topic:**` lines, followed by Context, Decision, What was rejected, and Consequences — a document that only describes what was built is a description, not a decision, and it does not get written.

## What was rejected

- **Revision files** (`Amends`, `Supersedes`). The chain problem the decision exists to prevent; a "rule in force" spread over files is a rule nobody can cite honestly.
- **One ADR per topic.** A decision that names the alternative it rejected is not the same as its neighbours' decisions, and merging them files the rejected alternatives under the wrong rules.

## Consequences

Numbering is append-only; deleting a false ADR leaves a gap and re-points citations. Today the format is held by review; a mechanical `adr-check` that refuses a non-`NNN-slug.md` name, two ADRs with one number, or a missing `Status`/`Topic` line is scheduled in `docs/todo.md` (P3), per the standing principle: a rule somebody runs, over a rule somebody reads.
