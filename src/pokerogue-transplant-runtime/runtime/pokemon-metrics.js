// Pokemon sprite display metrics loader.
// Parses PBS-format pokemon_metrics files which define per-species offset, scale,
// shadow placement, and animation speed for battler sprites.
//
// Coordinate conventions (Pokemon Essentials / RPG Maker XP):
//   FrontSprite x, y  — enemy side: x = horizontal offset, y = pixels to lift above base
//   BackSprite  x, y  — player side: same
//   ShadowSprite x, backY, frontY — shadow offset from the base ground line
//   ShadowSize  n     — ≤0 = no shadow, undefined = default, 2 = larger
//   AnimationSpeed back[, front]  — 0 = static, 1 = slow, 2 = normal (120ms), 3 = fast
//
// In Phaser logical coordinates (origin 0.5,1 = bottom-center):
//   spriteX = baseX + pbsX
//   spriteY = baseY - pbsY   (positive pbsY lifts sprite up = smaller Phaser y)
//   shadowX = baseX + shadowPbsX
//   shadowY = baseY + shadowFrontY (or shadowBackY for player side)

const METRICS_FILES = [
  './assets/Pokemon/PBS/pokemon_metrics.txt',
  './assets/Pokemon/PBS/pokemon_metrics_forms.txt',
  './assets/Pokemon/PBS/pokemon_metrics_female.txt',
  './assets/Pokemon/PBS/pokemon_metrics_Gen_9_Pack.txt',
  './assets/Pokemon/PBS/pokemon_metrics_gmax.txt',
];

let metricsCache = null;
let metricsLoadPromise = null;

// Convert a PBS header like [SPECIES,N,female] to a lookup key like "SPECIES_N_female".
function headerToKey(header) {
  const inner = header.slice(1, -1);
  const parts = inner.split(',').map(p => p.trim());
  const species = parts[0];
  const form    = parts[1] || '';
  const gender  = parts[2] || '';
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
      case 'FrontSprite':
        current.frontX     = vals[0] ?? 0;
        current.frontY     = vals[1] ?? 0;
        if (vals[2] !== undefined) current.frontScale = vals[2];
        break;
      case 'BackSprite':
        current.backX      = vals[0] ?? 0;
        current.backY      = vals[1] ?? 0;
        if (vals[2] !== undefined) current.backScale = vals[2];
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
    await Promise.allSettled(
      METRICS_FILES.map(async url => {
        try {
          const res = await fetch(url);
          if (!res.ok) return;
          const text = await res.text();
          for (const [k, v] of parseOneFile(text)) combined.set(k, v);
        } catch (_) { /* non-critical: missing file or parse error */ }
      })
    );
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
