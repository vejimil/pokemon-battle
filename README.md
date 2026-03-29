# PKB

A GitHub Pages-ready local 2-player Pokémon-style battle builder and pass-and-play battle prototype.

## What is included

- Singles and doubles setup flow
- Player name setup
- Team builder with 3 Pokémon per side in singles, 4 in doubles
- Species lookup, move lookup, item lookup, ability selection, nature selection, IV/EV editing, level, shiny flag, and Tera type
- Validation for common team-building constraints
- Animated uploaded Pokémon sprites rendered from strip-style PNGs
- Uploaded item icons, type icons, and status overlays used locally
- Browser battle flow with turn selection, speed/priority ordering, damage, switching, fainting, and battle log
- Showdown-compatible Dex loading for local species / move / item / ability data when CDN access is available
- Learnset-aware validation and saved-team rehydration on startup
- Local save via `localStorage`

## Asset usage

This project uses the uploaded assets as local static files:

- `Animated Pokemon Sprites.zip`
- `Animated Pokemon System.zip`
- `items.zip`
- `types.zip`

They are extracted into `assets/` and referenced directly by the app.

## Runtime data source

The app now tries to load a Showdown-compatible Dex runtime in the browser first. When that succeeds, species, moves, abilities, items, and learnset checks come from that Dex layer.

If the CDN runtime cannot be loaded, the project falls back to the older PokéAPI path for species and move lookups so the prototype still boots.

This means the deployed site should still be opened with internet access.

## Files

- `index.html` — app shell
- `styles.css` — UI styling
- `src/app.js` — builder, validation, sprite animation, and battle logic
- `assets/manifest.json` — generated sprite manifest
- `assets/...` — extracted local assets

## GitHub Pages deployment

1. Create a new GitHub repository.
2. Upload every file from this folder to the repository root.
3. Commit and push.
4. In GitHub, open **Settings → Pages**.
5. Under **Build and deployment**, choose **Deploy from a branch**.
6. Select the `main` branch and `/ (root)`.
7. Save.
8. Wait for GitHub Pages to publish the site.

## Notes about scope

This build is a polished prototype rather than a full competitive simulator.

Included:
- Team building structure close to the requested PKB flow
- Stat calculation from IV/EV/nature/level
- Practical turn-based battle loop
- Singles and doubles layout
- Animated uploaded sprites and local icon usage

Not fully exhaustive yet:
- Full cartridge-accurate battle simulator behavior for every move, ability, item, field effect, and edge case
- Full Showdown TeamValidator / simulator integration for format-accurate legality and battle resolution
- Full move animation VFX or battle sound design
- Every advanced mechanic from every generation

## Optional extra assets for a fuller version later

If you want a more complete presentation pass later, these would help most:

- Battle background images
- Hit / status / KO sound effects
- Move VFX sprite sheets
- UI frame assets for a more authentic battle HUD
