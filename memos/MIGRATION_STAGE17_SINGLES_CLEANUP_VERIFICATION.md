# Stage 17 — Singles authority cleanup / verification pass

This pass continues the Showdown-local singles migration by reducing remaining frontend authority in the live singles path.

## What changed

- `src/app.js`
  - Added `clearEnginePendingChoicesForPlayer()` so non-actionable sides no longer retain stale pending engine drafts.
  - Tightened `getEngineSwitchOptions()` so actionable singles requests no longer fall back to frontend-reconstructed switch options when `request.side.pokemon` is unavailable.
  - Added `pruneEnginePendingChoices()` and called it from the live singles render/readiness/resolve flow so stale pending choices are actively sanitized against the current engine request before UI rendering and before submission.
  - Kept the legacy/custom battle path separate; these new changes only affect the local Showdown-authoritative singles path.

- `scripts/verify-stage17-engine-singles.cjs`
  - Added a small Node verification script for focused engine-side checks.

## Focused verification run

Executed locally against the vendored Showdown-family engine service:

- KO -> forced switch request appears for the fainted side
- Opposing side enters wait state during that forced-switch step
- Disabled move and PP depletion are reflected in the next engine request
- Trapped / maybeTrapped is reflected in the engine request

Run again with:

```bash
node scripts/verify-stage17-engine-singles.cjs
```

## Still not fully verified here

These were tightened in code, but not browser-click tested inside this environment:

- wait-state panel showing no actionable controls in the live UI
- stale pending choice clearing across repeated request refreshes from the rendered browser flow
- request/snapshot-driven UI behavior across multiple manual turn boundaries in the actual frontend

Those should be the next live manual verification targets before moving on.
