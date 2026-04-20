// Pokemon sprite display metrics loader.
// Parses PBS-format pokemon_metrics files which define per-species offset, scale,
// shadow placement, and animation speed for battler sprites.
//
// Coordinate conventions (Pokemon Essentials / RPG Maker XP):
//   FrontSprite x, y  — enemy side: x = horizontal offset, y = vertical offset from base
//   BackSprite  x, y  — player side: same
//   ShadowSprite x, backY, frontY — shadow offset from the base ground line
//   ShadowSize  n     — 0 = no shadow; negative = smaller shadow; positive = larger
//   AnimationSpeed back[, front]  — DBK delay formula: ((speed / 2.0) * frameDelayMs)
//
// In Phaser logical coordinates (origin 0.5,1 = bottom-center):
//   spriteX = baseX + pbsX
//   spriteY = baseY + pbsY   (positive pbsY moves sprite down = larger Phaser y)
//   shadowX = baseX + shadowPbsX
//   shadowY = baseY + shadowFrontY (or shadowBackY for player side)

export const DBK_DEFAULTS = Object.freeze({
  frontScale: 1,
  backScale: 1,
  frameDelayMs: 90,
  showPlayerSideShadows: false,
});

// Usage map (for reference when extending):
//   battle-shell-scene.js renderBattlerSprite() — per-species offset/shadow in battle.
//   app.js renderPokemonSpritePreview()         — team builder preview frames.
// Files loaded (later overrides earlier):
//   pokemon_metrics.txt           — gens 1-8 base species
//   pokemon_metrics_forms.txt     — non-gen-9 form variants (mega, regional, etc.)
//   pokemon_metrics_female.txt    — gender splits
//   pokemon_metrics_Gen_9_Pack.txt — gen 9 species + forms (Terapagos, etc.)
//   pokemon_metrics_gmax.txt      — Gigantamax forms (used by dynamax presentation)
// Lookup falls back from (SPECIES_FORM_GENDER) → (SPECIES_FORM) → (SPECIES).

const METRICS_FILES = [
  './assets/Pokemon/PBS/pokemon_metrics.txt',
  './assets/Pokemon/PBS/pokemon_metrics_forms.txt',
  './assets/Pokemon/PBS/pokemon_metrics_female.txt',
  './assets/Pokemon/PBS/pokemon_metrics_Gen_9_Pack.txt',
  './assets/Pokemon/PBS/pokemon_metrics_gmax.txt',
];

let metricsCache = null;
let metricsLoadPromise = null;

// Convert a PBS header like [SPECIES,N,female] to a lookup key like "SPECIES_N_FEMALE".
function headerToKey(header) {
  const inner = header.slice(1, -1);
  const parts = inner.split(',').map(p => p.trim());
  const species = (parts[0] || '').toUpperCase();
  const form    = (parts[1] || '').toUpperCase();
  const gender  = (parts[2] || '').toUpperCase();
  let key = species;
  if (form)   key += `_${form}`;
  if (gender) key += `_${gender}`;
  return key;
}

function parseOneFile(text) {
  const result = new Map();
  let currentKey = null;
  let current = null;

  for (const rawLine of text.split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    if (line.startsWith('[')) {
      if (currentKey !== null) result.set(currentKey, current);
      currentKey = headerToKey(line);
      current = {};
      continue;
    }

    if (current === null) continue;

    const eq = line.indexOf('=');
    if (eq < 0) continue;

    const key  = line.slice(0, eq).trim();
    const vals = line.slice(eq + 1).split(',').map(v => Number(v.trim()));

    switch (key) {
      // PBS standard FrontSprite/BackSprite = x, y. A third column appears in
      // some community files (Gen 9 Pack, forms) but is NOT a scale multiplier —
      // small species like Pichu/Tatsugiri and oversized Mega Chandelure/Terapagos
      // all share value "2", which rules out scale semantics. Ignore extra columns.
      case 'FrontSprite':
        current.frontX     = vals[0] ?? 0;
        current.frontY     = vals[1] ?? 0;
        break;
      case 'BackSprite':
        current.backX      = vals[0] ?? 0;
        current.backY      = vals[1] ?? 0;
        break;
      case 'ShadowSprite':
        current.shadowX      = vals[0] ?? 0;
        current.shadowBackY  = vals[1] ?? 0;
        current.shadowFrontY = vals[2] ?? 0;
        break;
      case 'ShadowSize':
        current.shadowSize = vals[0];
        break;
      case 'AnimationSpeed':
        current.animBack  = vals[0] ?? 2;
        current.animFront = vals.length > 1 ? (vals[1] ?? 2) : (vals[0] ?? 2);
        break;
      case 'SuperShinyHue':
        current.superShinyHue = vals[0] ?? 0;
        break;
    }
  }
  if (currentKey !== null) result.set(currentKey, current);
  return result;
}

// Load and parse all metrics files. Returns a combined Map (later files override earlier).
export async function loadPokemonMetrics() {
  if (metricsCache) return metricsCache;
  if (metricsLoadPromise) return metricsLoadPromise;

  metricsLoadPromise = (async () => {
    const combined = new Map();
    // Preserve file priority order: later files in METRICS_FILES override earlier ones.
    for (const url of METRICS_FILES) {
      try {
        const res = await fetch(url);
        if (!res.ok) continue;
        const text = await res.text();
        for (const [k, v] of parseOneFile(text)) combined.set(k, v);
      } catch (_) { /* non-critical: missing file or parse error */ }
    }
    metricsCache = combined;
    return combined;
  })();

  return metricsLoadPromise;
}

// Resolve a sprite ID (e.g. "CHARIZARD_1", "RAICHU_female") to a metrics entry.
// Falls back from specific form/gender to base species.
export function getMetricsForSprite(spriteId, metricsMap) {
  if (!metricsMap || !spriteId) return null;
  const id = spriteId.toUpperCase();

  // Try exact match first.
  if (metricsMap.has(id)) return metricsMap.get(id);

  // For form/gender variants try progressively less specific keys.
  const parts = id.split('_');
  for (let len = parts.length - 1; len >= 1; len--) {
    const key = parts.slice(0, len).join('_');
    if (metricsMap.has(key)) return metricsMap.get(key);
  }

  return null;
}

// DBK animation formula:
// delay(ms) = ((speed / 2.0) * frameDelayMs)
export function calcDbkAnimationDelayMs(speed, frameDelayMs = DBK_DEFAULTS.frameDelayMs) {
  const n = Number(speed);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.max(1, Math.round((n / 2) * frameDelayMs));
}
