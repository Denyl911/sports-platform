# React-bits comes in vendored, on one animation runtime, dressed in tokens

**Status:** accepted
**Topic:** ui, dependencies

## Context

Fases 2–3: the identity layer arrives — headline animation, animated list, live marker countup, marquee. The team is implementing an existing asset library: they implement the [react-bits](https://github.com/DavidHDev/react-bits) components, in their `packages/ui`. Vendoring is decided by the plan — what was left open is how they integrate, since two of the six add-on packages that its CLI pulled in (`gsap`, `@hugeicons/react`) attempted to impose their own runtime and icon set.

## Decision

**One animation runtime: `motion`.** The bits land vendored through `@react-bits/*-TS-TW` (shadcn registry), but a bit that drags a second animation engine gets rewritten to use the same engine as the rest: `SplitText` ships rewritten on `motion/react`. `CountUp` (motion) stays as-is; `AnimatedList` (pure React) stays as-is.

**Zero new icon libraries.** `@hugeicons/react` was only brought in to paint the demo sample items; the engine never reads it. `packages/ui` will continue to prefer `lucide-react`.

**The color language is that of `styles.css` only.** The dark/light THEMES of the registry (hex per mode) are replaced with a token map (`--surface-strong`, `--line`, `--sea-ink`, `--lagoon`, …); the site's mode decides the appearance, the bit knows nothing about modes. Every new bit goes through this step to enter `src/components/bits/`.

**License on record.** react-bits is **MIT + Commons Clause 1.0**: allowed to use bits in this product (open or paid); prohibited to sell, sub-license, or redistribute the components themselves (alone or as a bundle). Before importing new bits: read the same license.

## What was rejected

- **Vendor `SplitText` as it comes (gsap + @gsap/react).** Two coexisting animation runtimes for one headline is a dependency that buys its own use. The motion rewrite covers the subset used (rise/fade/blur/pop, chars/words, view/load, loop); if re-implementing fills up and begins to grow, it is read back as a signal to evaluate gsap for the whole package — that ADR will be ammended only if that scenario is paid in full.
- **Hand-write each effect with no anchor.** Re-inventing battle-tested easing/reveal logic is a ticket drawn for a small bug; the vendored engine that survives (CountUp, AnimatedList) shows what is worth reusing.
- **Allowing palette per bit.** It is exactly the drift between layers that the repo refuses twice over; the tokens are the SSOT.
- **Suppression comments in the vendor places.** `noArrayIndexKey` walks with `strict` for the repo, but in `src/components/bits/` it goes down to `warn` via override in `biome.json`: react-bits engines (CountUp roll slots, AnimatedList rows) identify rows positionally and interior JSX anchors cover half the case. The cutoff point is that directory; a bit is not written outside of it with indices "because the override tolerates it".

## Consequences

`packages/ui` gains `motion` (runtime) + `gsap`-less chain. `components.json` in `packages/ui` is the vendor config: new bits go through `bunx shadcn@latest add "@react-bits/<Name>-TS-TW"` followed by token pass and relative import check. The SSR comes for free in the stance already taken here (motion/React only effects client-side); a bit that requires WebGL/three only comes in lazy + justified in its ADR.
