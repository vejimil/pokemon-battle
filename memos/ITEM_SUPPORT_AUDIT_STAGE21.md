# Stage 21 — Item support / exposure audit

Focus of this pass:
- audit local item data exposure
- audit picker/search visibility
- audit local item icon support against the uploaded asset manifest
- fix honest UI presentation where data exists but icon support is missing or variant-named

Implemented in this pass:
- item icon resolution now checks direct item slugs plus `--held` and `--bag` manifest variants
- Z-Crystal item icons now resolve through the held-item variant instead of failing on plain slug lookup
- item picker gained an Info button + detail panel, similar to move detail, for honest item support inspection
- picker subtitles now surface when an item uses a variant icon or has no local icon asset
- editor item icon now explicitly shows `No icon` / `아이콘 없음` instead of a silent dash when the item has no matching local icon
- builder item note now includes local UI support truth before the runtime note
- Korean localization override added for `Berserk Gene` -> `버서크유전자`
- reusable audit script added: `npm run audit:items`

Current audit counts from the local repo state:
- all local items: 583
- supported items exposed by current builder rules: 533
- filtered out by current builder support rules: 50
- supported items hidden from picker: 0
- supported items with direct local icons: 336
- supported items using held-variant icons: 35
- supported items using bag-only icons: 0 in current supported set
- supported items with no local icon asset in the uploaded pack: 162
- suspicious Korean item localizations after override: 0

Interpretation:
- the main fixed bug was not missing local item data; it was item icon path resolution
- the second major issue was honesty: many items are mechanically present/searchable but the uploaded icon pack simply lacks matching files
- current builder filtering is intentional for Future / Unobtainable / CAP entries, not a search bug
