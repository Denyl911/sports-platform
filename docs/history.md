# How this project was built

Not what shipped, which is [`CHANGELOG.md`](../CHANGELOG.md), and not what is coming, which is [`todo.md`](./todo.md). This file is what was *learned*: the lessons that would change what somebody does next time, each with the case that taught it and a link to where the full account lives. The binding decisions are in [`adr/`](./adr/), the questions answered in [`decided.md`](./decided.md).

**How an entry is written.** One lesson, one paragraph: the lesson in bold, then the case in a sentence or two, then the link. It goes under the theme it teaches, not under the release or the round that found it, and a lesson learned a second time adds its case to the entry that is already here rather than opening a new one. No release narrative, no list of what a round fixed, no story an ADR already tells. If an entry would not change what somebody does next time, it does not belong here.

## Themes

- **What is measured** — numbers and how they were taken (the first one will be a query-count baseline per endpoint, grouped with `docs/todo.md` P2).
- **Measuring** — ways the instrument lied and how it was caught.
- **Where it came from** — what the architecture was modelled on, and what changed that mind.

## Health

**A gate that is never run is not a gate — it is a script people believe in.** The root `check-types` entry called `turbo run check-types`, and Turbo's task is named `typecheck`: the type gate had been red-on-name from wherever it was introduced, invisible because nothing at the root ran it until it was walked as part of writing the working brief. The same indirection hid a second layer: two workspaces ran `tsc` without declaring `typescript` and passed through a hoisted binary they did not ask for. Both are one-line honest fixes (point the root script at the real task; declare the dependency where it runs), and the lesson compiles to a habit: every command the brief tells an agent to trust is run once, on `main`, before it becomes an instruction.

