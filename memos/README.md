# PKB

## Current runtime status

- User-facing singles run only through the bundled local Showdown-family engine path.
- If the bundled local Node server is unavailable, singles battle start stays blocked while the builder remains usable.
- Doubles are still blocked until an engine-backed path exists.
- Dynamax remains intentionally disabled because there is no verified authoritative path for it in the current build.
- `src/legacy-custom-runtime-audit.js` is retained only as audit/reference residue and is not part of the supported runtime flow.

A GitHub Pages-ready local 2-player Pokémon-style battle builder and pass-and-play battle prototype.

## What is included

- Singles and doubles setup flow
- Player name setup
- Team builder with 3 Pokémon per side in singles, 4 in doubles
- Species lookup, move lookup, item lookup, ability selection, nature selection, IV/EV editing, level, shiny flag, and Tera type
- Validation for common team-building constraints
- Learnset-aware validation using vendored local data
- Stronger validator-style legality checks for nonstandard flags, form requirements, item / ability legality, Tera type, gender, team warnings, validation-profile clauses, and event-only move bundle checks
- Animated uploaded Pokémon sprites rendered from strip-style PNGs
- Uploaded item icons, type icons, and status overlays used locally
- Browser battle flow with singles-first turn selection, switching, speed/priority ordering, damage, status handling, fainting, winner checks, and battle log
- Local save via `localStorage`

## Stage 4: legality / validator strengthening

This build no longer depends on PokéAPI or a live Dex CDN at runtime for core species / move / item / ability / learnset data.

Vendored local data now ships inside `src/data/`:

- `pokedex.js`
- `learnsets.js`
- `moves.js`
- `abilities.js`
- `items.js`
- `aliases.js`
- `formats-data.js`
- `natures.js`
- `conditions.js`
- `rulesets.js`
- `tags.js`
- `typechart.js`

`src/local-dex.js` wraps those vendored modules into a browser-friendly local Dex layer used by the app.

## Asset usage

This project still expects your already-extracted local asset folders to remain present in `assets/`.

Typical local assets used by this build:

- Pokémon front / back / shiny strip sprites
- Item icons
- Type icons
- Status overlays
- `assets/manifest.json`

This ZIP is code-only, so those asset files are **not included** here.

## Files

- `index.html` — app shell
- `styles.css` — UI styling
- `src/app.js` — builder, validation, sprite animation, and battle logic
- `src/local-dex.js` — browser-side local Dex wrapper
- `src/data/*.js` — vendored local battle/building data modules
- `scripts/generate-local-data.cjs` — helper script used to convert upstream source files into browser modules

## GitHub Pages deployment

1. Keep your existing project root.
2. Preserve your current `assets/` folder exactly as it is.
3. Copy the files from this ZIP over your project files.
4. Commit and push.
5. In GitHub, open **Settings → Pages**.
6. Under **Build and deployment**, choose **Deploy from a branch**.
7. Select the `main` branch and `/ (root)`.
8. Save.
9. Wait for GitHub Pages to publish the site.

## Notes about scope

This build now localizes the main builder data layer and adds a stronger validator layer, but it is still not a full competitive simulator yet.

Included now:
- Local species / moves / items / abilities / learnsets / aliases / formats data / natures / conditions / rulesets / tags / type chart loading
- Validator-style team-building checks driven by that vendored data
- Nonstandard filtering that keeps Past-tagged legacy content available while blocking unsupported categories like CAP / Future / Unobtainable
- Requirement checks for special forms (required item / move / ability / Tera type) plus battle-only form blocking
- Learnset source warnings for legacy-only or event-only move sources
- Saved-team rehydration against the localized Dex on startup
- Local asset rendering and browser battle prototype flow

Still not fully exhaustive yet:
- Full cartridge-accurate battle simulator behavior for every move, ability, item, field effect, and edge case
- Full Showdown TeamValidator integration for format-accurate legality
- Full simulator replacement for the current custom battle runtime
- Full move animation VFX or battle sound design
- Every advanced mechanic from every generation integrated into battle resolution

## Optional next steps

The best next milestone after this build is:

1. Continue deeper TeamValidator parity for exact source combinations, event constraints, and format-specific clauses
2. Full simulator integration for battle resolution
3. Continue deeper singles parity (weather / terrain / PP / hazards / move coverage), then extend doubles and refine Mega / Z-Move / Dynamax / Terastal edge cases


## Stage 13: local Showdown-family singles migration

This build now contains a **local Node-backed Showdown-family singles engine path**.

What it means:

- Running `npm start` serves the existing app and a local battle-core API together.
- When that local server is available, **singles battles** use the Showdown-family engine path first.
- If the server is not running, the app automatically falls back to the old custom browser battle runtime.
- Doubles are still on the old custom runtime in this stage.

New files for this stage:

- `server/server.cjs`
- `server/showdown-engine.cjs`
- `src/engine/showdown-local-bridge.js`
- `MIGRATION_STAGE13_LOCAL_SHOWDOWN_SINGLES.md`

Important current limitation:

- The migrated singles path currently uses `gen9customgame`.
- This supports **Mega Evolution, Z-Moves, and Terastallization** in the local engine path.
- **Dynamax is not yet available** in this Gen 9 engine path and remains a later migration/custom-extension task.

### Local run for the migrated path

1. Keep your existing `assets/` folder in place.
2. Open the project root in a terminal.
3. Run `npm start`.
4. Open `http://localhost:4173`.

This ZIP is still code-only and does not include your asset folders.
