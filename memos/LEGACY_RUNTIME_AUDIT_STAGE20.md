# Stage 20 legacy runtime audit

This stage intentionally did **not** re-enable any legacy battle path.

## What was isolated out of `src/app.js`

The old browser-side custom battle runtime was moved into `src/legacy-custom-runtime-audit.js` for audit/reference purposes, including:

- legacy battle construction helpers
- legacy move-resolution chain
- legacy switch / item / status / damage / end-of-turn helpers
- legacy choice-panel / pending-choice helpers
- legacy victory and cleanup flow

## What `src/app.js` now does instead

`src/app.js` now stays focused on:

- builder/UI state
- runtime status and blocked-state messaging
- engine-authoritative singles flow
- rendering the current supported engine battle path

If a non-engine legacy battle state somehow appears, the UI now shows an explicit blocked/audit-only message instead of silently continuing through an unsupported user path.

## Safe removals done in this pass

- dead legacy fallback checkbox wiring and DOM bindings
- unused `runtimePolicy.allowLegacySinglesFallback` state residue
- legacy-runtime caution/warning branches that no longer apply to any selectable user runtime
- legacy item/ability implementation-note branches that assumed a selectable legacy battle path

## Intentionally kept in `src/app.js`

The following stayed because they are still shared by supported UI or engine-backed flow:

- runtime descriptors / blocked-state messaging
- engine request / pending-choice helpers
- supported battle rendering
- hazard / side-condition display helpers used by the battle UI
- builder validation, localization, and asset/dex flow

## Current supported truth after this stage

- singles = local engine required
- doubles = blocked until engine-backed
- Dynamax = still intentionally disabled
- no user-facing legacy singles fallback
