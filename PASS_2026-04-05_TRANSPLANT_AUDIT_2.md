# PKB Pokerogue UI Transplant Audit Pass 2

This pass continues the transplant path and removes more of the old scene/controller-owned custom HUD logic.

## Pokerogue files compared in this pass

- `src/ui/ui.ts`
- `src/enums/ui-mode.ts`
- `src/ui/handlers/ui-handler.ts`
- `src/ui/handlers/message-ui-handler.ts`
- `src/ui/handlers/battle-message-ui-handler.ts`
- `src/ui/handlers/command-ui-handler.ts`
- `src/ui/handlers/fight-ui-handler.ts`
- `src/ui/handlers/party-ui-handler.ts`
- `src/ui/battle-info/battle-info.ts`
- `src/ui/battle-info/enemy-battle-info.ts`
- `src/ui/battle-info/player-battle-info.ts`

## Structural changes in PKB

- Split the former monolithic `src/pokerogue-ui-transplant.js` into module boundaries closer to Pokerogue:
  - `src/pokerogue-ui/modes.js`
  - `src/pokerogue-ui/shared/ui-handler.js`
  - `src/pokerogue-ui/shared/message-ui-handler.js`
  - `src/pokerogue-ui/handlers.js`
  - `src/pokerogue-ui/battle-info.js`
  - `src/pokerogue-ui/ui-root.js`
  - `src/pokerogue-ui/dependency-map.js`
  - `src/pokerogue-ui/index.js`
- Kept `src/pokerogue-ui-transplant.js` only as a compatibility barrel export so the project does not regress while imports are being cleaned.
- Rewrote `src/phaser-battle-controller.js` into a lean scene/controller shell that now delegates UI ownership to the transplant root instead of keeping old duplicated render code inside the scene.

## What is now closer structurally

- Single UI root owns battle handlers.
- Handler boundaries are now explicit instead of embedded in the scene.
- Enemy/player battle info ownership is isolated.
- Party, fight, command, and message handlers are no longer mixed into the scene/controller path.
- A dependency map now records what is directly transplantable, what requires PKB adapters, and what is still blocked by Pokerogue runtime coupling.

## Current blockers

Direct drop-in reuse of Pokerogue handler classes is still blocked by deep dependencies on:

- `globalScene`
- Pokerogue `UiMode` stack / transition flow
- Pokerogue button/input enums
- phase/lifecycle ownership in Pokerogue battle flow
- richer Pokemon instance methods used by battle-info and party handlers

These are adapter / architecture blockers, not cosmetic blockers.
