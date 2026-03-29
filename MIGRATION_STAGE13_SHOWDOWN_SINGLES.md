# Stage 13 — First Showdown-family singles migration step

## What was separated conceptually in this codebase

### 1) UI / rendering / input
Still primarily in `src/app.js`:
- DOM binding and event wiring
- editor / roster rendering
- battle screen rendering
- sprite animation / asset display
- localized labels and bilingual UI presentation

### 2) Team / state serialization
New module:
- `src/engine/showdown-serialization.js`

Responsibilities:
- convert builder-team objects into Showdown-compatible team sets
- pack those sets into packed-team strings
- convert current UI choice objects into Showdown command strings

### 3) Battle-resolution engine path
New module:
- `src/engine/showdown-singles-engine.js`

Responsibilities:
- load a Showdown-family simulator stream in the browser
- start a Gen 9 Custom Game battle with the current built teams
- submit singles turn choices through that engine
- parse core protocol output and expose a sync snapshot for the existing UI

## Exact current migration boundary

`src/app.js` remains the host shell and UI coordinator.

For singles:
- battle start now tries the Showdown-family engine path first
- turn submission now routes through the Showdown-family engine when available
- the existing battle screen is updated from the simulator snapshot

For doubles:
- still uses the existing legacy custom runtime

## Why this is the first safe migration step

This preserves:
- current project layout
- current team builder
- Korean/English display layer
- sprite and asset mapping rules
- code-only deployment model

while replacing the most important part first:
- authoritative singles turn resolution path

## Next recommended step

1. Make singles choice UI request-driven from simulator state
2. Sync exact PP / disabled / forced switch / move-target legality from requests
3. Expand protocol-to-UI state syncing for side conditions, hazards, boosts, and volatile states
4. After singles is stable, add doubles through the same engine boundary
