// audit-metrics-drift.mjs
// Automatically identifies pokemon with high risk of metrics drift:
//   - fallback-only coverage (no exact metrics entry)
//   - extreme frontY / shadowFrontY / shadowBackY outliers (shadow anchor risk)
//   - large frame-size mismatch when using fallback
//
// Output: reports/metrics-drift.json
// Usage: node scripts/audit-metrics-drift.mjs

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

// ── PBS parser (mirrors pokemon-metrics.js / verify-metrics-parity.mjs) ─────

const METRICS_FILES = [
  path.join(root, 'assets', 'Pokemon', 'PBS', 'pokemon_metrics.txt'),
  path.join(root, 'assets', 'Pokemon', 'PBS', 'pokemon_metrics_forms.txt'),
  path.join(root, 'assets', 'Pokemon', 'PBS', 'pokemon_metrics_female.txt'),
  path.join(root, 'assets', 'Pokemon', 'PBS', 'pokemon_metrics_Gen_9_Pack.txt'),
  path.join(root, 'assets', 'Pokemon', 'PBS', 'pokemon_metrics_gmax.txt'),
];

function headerToKey(header) {
  const inner = header.slice(1, -1);
  const parts = inner.split(',').map(v => v.trim());
  const species = (parts[0] || '').toUpperCase();
  const form    = (parts[1] || '').toUpperCase();
  const gender  = (parts[2] || '').toUpperCase();
  let key = species;
  if (form)   key += `_${form}`;
  if (gender) key += `_${gender}`;
  return key;
}

function parseOneFile(text) {
  const out = new Map();
  let currentKey = null;
  let current = null;
  for (const rawLine of text.split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    if (line.startsWith('[')) {
      if (currentKey !== null) out.set(currentKey, current);
      currentKey = headerToKey(line);
      current = {};
      continue;
    }
    if (!current) continue;
    const eq = line.indexOf('=');
    if (eq < 0) continue;
    const key  = line.slice(0, eq).trim();
    const vals = line.slice(eq + 1).split(',').map(v => Number(v.trim()));
    switch (key) {
      case 'FrontSprite':
        current.frontX = vals[0] ?? 0;
        current.frontY = vals[1] ?? 0;
        if (Number.isFinite(vals[2]) && vals[2] > 0) current.frontScale = vals[2];
        break;
      case 'BackSprite':
        current.backX = vals[0] ?? 0;
        current.backY = vals[1] ?? 0;
        if (Number.isFinite(vals[2]) && vals[2] > 0) current.backScale = vals[2];
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
  if (currentKey !== null) out.set(currentKey, current);
  return out;
}

function loadCombinedMetrics() {
  const combined = new Map();
  for (const file of METRICS_FILES) {
    if (!fs.existsSync(file)) continue;
    const text = fs.readFileSync(file, 'utf8');
    for (const [key, value] of parseOneFile(text)) combined.set(key, value);
  }
  return combined;
}

function resolveMetrics(spriteId, metrics) {
  if (!spriteId) return { type: 'miss', key: '' };
  const id = String(spriteId).toUpperCase();
  if (metrics.has(id)) return { type: 'exact', key: id };
  const parts = id.split('_');
  for (let len = parts.length - 1; len >= 1; len--) {
    const key = parts.slice(0, len).join('_');
    if (metrics.has(key)) return { type: 'fallback', key };
  }
  return { type: 'miss', key: '' };
}

// ── Thresholds for outlier detection ─────────────────────────────────────────

const THRESHOLDS = {
  frontY_high:        20,  // |frontY| >= this → high risk shadow anchor
  frontY_medium:      10,
  shadowY_high:       15,  // |shadowFrontY| or |shadowBackY|
  shadowY_medium:     8,
  frontX_high:        10,  // |frontX| >= this → horizontal shadow drift
  frontX_medium:      5,
};

// ── Main ──────────────────────────────────────────────────────────────────────

const manifest = JSON.parse(fs.readFileSync(path.join(root, 'assets', 'manifest.json'), 'utf8'));
const frontIds = (manifest?.pokemon?.front || []).filter(id => id && id !== '000');
const metrics  = loadCombinedMetrics();

const results = [];

for (const id of frontIds) {
  const resolved = resolveMetrics(id, metrics);
  const entry    = resolved.type !== 'miss' ? metrics.get(resolved.key) : null;

  const reasons = [];
  let score = 0;

  // Coverage type
  if (resolved.type === 'fallback') {
    reasons.push('fallback_coverage');
    score += 1;
  } else if (resolved.type === 'miss') {
    reasons.push('no_metrics');
    score += 3;
  }

  if (entry) {
    const frontY       = Math.abs(entry.frontY ?? 0);
    const shadowFrontY = Math.abs(entry.shadowFrontY ?? 0);
    const shadowBackY  = Math.abs(entry.shadowBackY ?? 0);
    const frontX       = Math.abs(entry.frontX ?? 0);

    if (frontY >= THRESHOLDS.frontY_high) {
      reasons.push('frontY_outlier_high');
      score += 4;
    } else if (frontY >= THRESHOLDS.frontY_medium) {
      reasons.push('frontY_outlier_medium');
      score += 2;
    }

    if (shadowFrontY >= THRESHOLDS.shadowY_high || shadowBackY >= THRESHOLDS.shadowY_high) {
      reasons.push('shadow_anchor_risk_high');
      score += 3;
    } else if (shadowFrontY >= THRESHOLDS.shadowY_medium || shadowBackY >= THRESHOLDS.shadowY_medium) {
      reasons.push('shadow_anchor_risk_medium');
      score += 1;
    }

    if (frontX >= THRESHOLDS.frontX_high) {
      reasons.push('frontX_outlier_high');
      score += 2;
    } else if (frontX >= THRESHOLDS.frontX_medium) {
      reasons.push('frontX_outlier_medium');
      score += 1;
    }

    // Floating / large pokemon: extreme frontY with no shadow → visual mismatch risk
    if (entry.shadowSize === 0 && frontY >= THRESHOLDS.frontY_medium) {
      reasons.push('floating_no_shadow');
      score += 2;
    }
  }

  if (reasons.length === 0) continue; // no issues

  const severity = score >= 6 ? 'high' : score >= 3 ? 'medium' : 'low';

  results.push({
    id,
    severity,
    score,
    matchType: resolved.type,
    matchKey:  resolved.key,
    reasons,
    metrics: entry ? {
      frontX:       entry.frontX      ?? 0,
      frontY:       entry.frontY      ?? 0,
      backX:        entry.backX       ?? 0,
      backY:        entry.backY       ?? 0,
      shadowX:      entry.shadowX     ?? 0,
      shadowFrontY: entry.shadowFrontY ?? 0,
      shadowBackY:  entry.shadowBackY  ?? 0,
      shadowSize:   entry.shadowSize   ?? 1,
    } : null,
  });
}

// Sort: severity desc, then score desc
const ORDER = { high: 0, medium: 1, low: 2 };
results.sort((a, b) => ORDER[a.severity] - ORDER[b.severity] || b.score - a.score);

const summary = {
  total:    results.length,
  high:     results.filter(r => r.severity === 'high').length,
  medium:   results.filter(r => r.severity === 'medium').length,
  low:      results.filter(r => r.severity === 'low').length,
  top50:    results.slice(0, 50).map(r => r.id),
};

const output = { generatedAt: new Date().toISOString(), summary, entries: results };

const outPath = path.join(root, 'reports', 'metrics-drift.json');
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(output, null, 2));

console.log(`\nMetrics drift audit complete`);
console.log(` - total flagged: ${summary.total}`);
console.log(` - high: ${summary.high}  medium: ${summary.medium}  low: ${summary.low}`);
console.log(` - report: ${outPath}`);
console.log(`\nTop 20 high-risk entries:`);
results.filter(r => r.severity === 'high').slice(0, 20).forEach(r => {
  console.log(`  [${r.severity.toUpperCase()}] ${r.id.padEnd(30)} score=${r.score} reasons=${r.reasons.join(',')}`);
});
