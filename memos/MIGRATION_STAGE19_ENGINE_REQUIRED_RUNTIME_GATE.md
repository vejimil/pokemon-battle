# Stage 19 — Engine-required battle entry gate

This step removes user-facing legacy battle start paths from normal operation and makes the app honest about what can and cannot start.

## What changed

- Singles now require the bundled local Showdown-family Node engine.
- If the engine is unavailable, singles battle start is blocked instead of falling back to the old custom browser resolver.
- The user-facing legacy singles opt-in control was removed from the runtime panel.
- Doubles battle start is also blocked for now because there is not yet an engine-backed authoritative path.
- Team builder, Pokémon selection, move/item/ability/nature pickers, and language switching remain usable even when battle start is blocked.
- Runtime labels and status copy now describe blocked states explicitly instead of implying that the custom runtime is still an equivalent mode.
- Dynamax remains intentionally disabled.

## Why this step matters

The previous stage still allowed the UI to preserve a legacy singles fallback concept. That kept the product surface ambiguous: users could still end up thinking the old runtime was a supported battle mode.

This stage makes the product behavior match the migration goal:

- builder/UI layer
- engine-backed singles path
- blocked unsupported paths
- legacy runtime code retained only as migration residue, not as a normal mode

## What remains incomplete

- Doubles are still not migrated to the engine-backed path.
- Legacy custom runtime code still exists in `src/app.js`, but it is no longer exposed as a normal battle entry path.
- Full physical extraction of old custom battle logic into separate modules has not been completed yet.
