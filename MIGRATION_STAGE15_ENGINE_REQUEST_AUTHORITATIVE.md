# Stage 15 – Singles request ownership tightened further

This step continues the singles-only migration toward a fully engine-authoritative flow without expanding the old custom resolver.

## Main changes

- Engine snapshots are now adopted through a dedicated normalization path instead of being dropped directly into `state.battle`.
- Engine battles explicitly clear legacy `side.choices` / `mustSwitch` state so old custom choice paths stop acting as a hidden fallback source.
- Pending engine choices are now validated against the **current engine request** before readiness, summaries, and auto-submit logic trust them.
- Invalid stale pending choices are pruned when the request changes (for example: disabled move, missing switch target, no longer-switchable state).
- Engine auto-resolution now requires a complete actionable request state instead of just “both sides look ready enough”.
- The bridge no longer reads legacy custom `players[x].choices` when submitting engine choices; engine submission now comes only from `battle.pendingChoices`.
- Custom-runtime fallback is still available, but its initialization is isolated from the engine-authoritative singles start path.

## Files changed

- `src/app.js`
- `src/engine/showdown-local-bridge.js`

## What this improves

- Reduces remaining conflict between old custom singles state and engine-owned request flow.
- Makes move/switch readiness depend on what the engine currently allows, not just on a previously clicked UI value.
- Prevents accidental submission from stale local choice state after forced-switch / wait / refreshed-request transitions.
- Tightens the single-source-of-truth boundary for singles without touching doubles yet.

## Still intentionally not covered here

- Doubles migration
- Full cleanup/removal of every old custom battle helper
- Final unified local data-source pass for every builder/runtime path
- Complete all-gimmick project-owned local rules layer beyond the current engine path
