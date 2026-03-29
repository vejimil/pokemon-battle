# PKB

A GitHub Pages-ready local 2-player Pokémon-style battle builder and pass-and-play battle prototype.

## What is included

- Singles and doubles setup flow
- Player name setup
- Team builder with 3 Pokémon per side in singles, 4 in doubles
- Species lookup, move lookup, item lookup, ability selection, nature selection, IV/EV editing, level, shiny flag, and Tera type
- Validation for common team-building constraints
- Learnset-aware validation using vendored local data
- Animated uploaded Pokémon sprites rendered from strip-style PNGs
- Uploaded item icons, type icons, and status overlays used locally
- Browser battle flow with turn selection, speed/priority ordering, damage, switching, fainting, and battle log
- Local save via `localStorage`

## Stage 3: full data localization

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

This build now localizes the main builder data layer, but it is still not a full competitive simulator yet.

Included now:
- Local species / moves / items / abilities / learnsets / aliases / formats data / natures / conditions / rulesets / tags / type chart loading
- Team-building validation driven by that vendored data
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

1. Full legality layer / TeamValidator-equivalent integration
2. Full simulator integration for battle resolution
3. Expanded mechanic support for Mega Evolution, Z-Moves, Dynamax, and complete Terastal handling
