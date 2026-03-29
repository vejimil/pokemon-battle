# Stage 14 – Singles becomes more engine-authoritative

This step keeps the existing builder/UI/asset pipeline, but pushes the singles battle flow further toward the local Showdown-family engine as the source of truth.

## Main changes

- Singles choice UI now reads the local engine `request` object first.
- Turn resolution now submits only the sides that actually have an actionable engine request.
- `wait` vs `forceSwitch` vs `active move request` are separated cleanly.
- Pending local UI choices for engine battles are isolated in `battle.pendingChoices` instead of pretending the engine snapshot itself owns them.
- Battle refresh remains snapshot-driven after every engine response.
- Old custom singles choice assumptions were left in place only for the fallback custom runtime path.

## Files changed

- `src/app.js`
- `src/engine/showdown-local-bridge.js`

## What this improves

- Disabled moves now follow engine requests instead of only custom UI logic.
- Forced switch flow no longer incorrectly requires both players to submit a choice.
- Waiting sides are shown as waiting instead of being treated like unresolved custom-turn state.
- Singles readiness / auto-submit is now driven by engine-request actionability.

## Still intentionally not covered here

- Doubles migration
- Full project-owned combined Mega / Z / Dynamax / Tera rules layer beyond what the local engine path currently supports
- Final cleanup/removal of every old custom battle path
