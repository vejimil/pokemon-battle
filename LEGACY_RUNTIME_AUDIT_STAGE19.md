# Legacy runtime audit — Stage 19

This audit identifies major legacy custom battle sections that still remain in `src/app.js` after blocking user-facing legacy battle entry.

## Legacy custom battle entry remnants

- `startCustomRuntimeBattle(...)`
  - Still constructs the old browser-side battle object.
  - No longer used by normal battle start in this stage.

## Legacy custom battle-resolution path

These functions remain primarily for the older browser battle runtime and are no longer part of the intended supported product path:

- `resolveTurn(...)` fallback branch when the battle is not engine-backed
- `performSwitch(...)`
- `triggerSwitchInEffects(...)`
- `performMove(...)` and its helper chain
- end-of-turn / hazard / weather / terrain / volatile-resolution helpers tied to the custom runtime flow

## Why they still remain

- Doubles migration is not complete yet.
- Removing them immediately without finishing engine-backed doubles would be too risky for the current step.
- The current goal is to stop exposing these paths to the user before deleting or extracting them.

## Recommended next isolation step

1. Move the remaining browser custom battle-resolution helpers into a dedicated legacy module.
2. Keep only engine-backed singles entry in `src/app.js`.
3. Decide whether doubles will be engine-backed next or kept blocked until that migration lands.
4. After engine-backed doubles exists, delete the old custom battle runtime entry and resolution chain.
