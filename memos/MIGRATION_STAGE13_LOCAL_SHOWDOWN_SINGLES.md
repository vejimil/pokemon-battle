# Stage 13: Local Showdown-family singles migration

This stage changes the migration direction from "keep extending the custom singles resolver" to:

- preserve the current UI / team builder / localization / asset mapping structure
- move battle resolution behind an engine boundary
- use a local Node-backed Showdown-family simulator path for singles first
- keep the custom browser runtime as a fallback when the local engine service is not running

## What was added

### Local battle core service

- `server/server.cjs`
  - serves the existing static app
  - exposes `/api/engine/status`
  - exposes `/api/battle/start`
  - exposes `/api/battle/choice`

- `server/showdown-engine.cjs`
  - starts a local `@pkmn/sim` `BattleStream`
  - auto-submits team preview order for singles
  - stores battle sessions in memory
  - converts simulator state into the frontend battle-state shape
  - keeps a localized battle log derived from protocol lines

### Frontend bridge

- `src/engine/showdown-local-bridge.js`
  - probes the local engine server
  - starts a singles battle through the server
  - serializes current UI choices into Showdown command strings
  - submits singles turn choices back to the server

### App integration

`src/app.js` now:

- probes `/api/engine/status` during bootstrap
- prefers the local Showdown-family engine for singles when available
- falls back to the existing custom runtime when the server is unavailable
- serializes builder teams into a battle-core payload without throwing away current UI data
- prevents the current local-Showdown singles path from showing a Dynamax toggle

## Current behavior

### Singles

When the local server is running with `npm start`:

- singles battle start goes through the Showdown-family engine path
- move / switch / mega / tera / z-move choices are sent to the local engine
- battle state is re-snapshotted back into the existing UI
- the current team builder, Korean/English labels, and sprite mapping structure stay in place

### Doubles

- still uses the old custom in-browser runtime
- not migrated in this stage

## Important scope note

The current singles migration uses `gen9customgame`.

That means:

- Mega Evolution: available
- Z-Moves: available
- Terastallization: available
- Dynamax: not available in this Gen 9 path

So this stage is a **real engine migration step**, but **not yet the final hybrid all-gimmicks solution**.

## Why this structure

This keeps the project intact while isolating the battle core behind a clean boundary:

- browser UI remains yours
- current sprite / asset rules remain yours
- team builder remains yours
- battle correctness starts moving onto a Showdown-family engine path

## Next recommended step

1. stabilize singles UI against simulator requests more deeply
2. expand protocol-to-UI mapping for more exact volatile / field / forced-choice cases
3. decide the long-term path for Dynamax + legacy mechanic coexistence
4. move doubles onto the same engine boundary
