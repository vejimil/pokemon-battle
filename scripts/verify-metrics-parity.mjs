import fs from 'fs';
import path from 'path';
import {fileURLToPath} from 'url';
import {DBK_DEFAULTS, calcDbkAnimationDelayMs} from '../src/pokerogue-transplant-runtime/runtime/pokemon-metrics.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

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
  const form = (parts[1] || '').toUpperCase();
  const gender = (parts[2] || '').toUpperCase();
  let key = species;
  if (form) key += `_${form}`;
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
    const key = line.slice(0, eq).trim();
    const vals = line.slice(eq + 1).split(',').map(v => Number(v.trim()));
    switch (key) {
      case 'FrontSprite':
        current.frontScale = Number.isFinite(vals[2]) ? vals[2] : undefined;
        break;
      case 'BackSprite':
        current.backScale = Number.isFinite(vals[2]) ? vals[2] : undefined;
        break;
      case 'ShadowSize':
        current.shadowSize = vals[0];
        break;
      case 'AnimationSpeed':
        current.animBack = vals[0] ?? 2;
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
  if (!spriteId) return {type: 'miss', key: ''};
  const id = String(spriteId).toUpperCase();
  if (metrics.has(id)) return {type: 'exact', key: id};
  const parts = id.split('_');
  for (let len = parts.length - 1; len >= 1; len--) {
    const key = parts.slice(0, len).join('_');
    if (metrics.has(key)) return {type: 'fallback', key};
  }
  return {type: 'miss', key: ''};
}

function check(label, pass, detail = '') {
  console.log(` - ${pass ? 'OK' : 'NO'}: ${label}${detail ? ` :: ${detail}` : ''}`);
  return pass;
}

const manifest = JSON.parse(fs.readFileSync(path.join(root, 'assets', 'manifest.json'), 'utf8'));
const frontIds = (manifest?.pokemon?.front || []).filter(id => id && id !== '000');
const metrics = loadCombinedMetrics();

let exact = 0;
let fallback = 0;
let miss = 0;
for (const id of frontIds) {
  const r = resolveMetrics(id, metrics);
  if (r.type === 'exact') exact += 1;
  else if (r.type === 'fallback') fallback += 1;
  else miss += 1;
}

const femaleIds = frontIds.filter(id => /_female$/i.test(id));
let femaleExact = 0;
for (const id of femaleIds) {
  if (resolveMetrics(id, metrics).type === 'exact') femaleExact += 1;
}

const nidoranChecks = ['NIDORANfE', 'NIDORANmA'].map(id => ({
  id,
  resolved: resolveMetrics(id, metrics),
}));

const delays = [1, 2, 3, 4].map(v => calcDbkAnimationDelayMs(v, DBK_DEFAULTS.frameDelayMs));

const metricsSource = fs.readFileSync(path.join(root, 'src', 'pokerogue-transplant-runtime', 'runtime', 'pokemon-metrics.js'), 'utf8');
const sceneSource = fs.readFileSync(path.join(root, 'src', 'pokerogue-transplant-runtime', 'scene', 'battle-shell-scene.js'), 'utf8');
const appSource = fs.readFileSync(path.join(root, 'src', 'app.js'), 'utf8');

const checks = [];
checks.push(check('combined metrics map is non-empty', metrics.size > 0, `size=${metrics.size}`));
checks.push(check('female sprite exact metrics hits are non-zero', femaleExact > 0, `exact=${femaleExact}/${femaleIds.length}`));
checks.push(check('NIDORANfE resolves (not miss)', nidoranChecks[0].resolved.type !== 'miss', nidoranChecks[0].resolved.type));
checks.push(check('NIDORANmA resolves (not miss)', nidoranChecks[1].resolved.type !== 'miss', nidoranChecks[1].resolved.type));
checks.push(check('DBK animation delay is monotonic (1 < 2 < 3 < 4)', delays[0] < delays[1] && delays[1] < delays[2] && delays[2] < delays[3], delays.join(' < ')));
checks.push(check('parser uppercases species/form/gender keys', /parts\[0\].*toUpperCase\(\)/.test(metricsSource) && /parts\[1\].*toUpperCase\(\)/.test(metricsSource) && /parts\[2\].*toUpperCase\(\)/.test(metricsSource)));
checks.push(check('metrics loader preserves declared file override order', !metricsSource.includes('Promise.allSettled') && metricsSource.includes('for (const url of METRICS_FILES)')));
checks.push(check('scene uses DBK default scales (2/3)', sceneSource.includes('DBK_DEFAULTS.frontScale') && sceneSource.includes('DBK_DEFAULTS.backScale')));
checks.push(check('scene shadow logic uses zero-only hide rule', sceneSource.includes('rawShadowSize !== 0')));
checks.push(check('scene player-side shadow toggle is wired', sceneSource.includes('DBK_DEFAULTS.showPlayerSideShadows')));
checks.push(check('asset family parser supports numeric+gender ids', appSource.includes('numericGenders') && appSource.includes('_(\\d+)_(female|male)')));
checks.push(check('DOM fallback uses DBK delay formula helper', appSource.includes('calcDbkAnimationDelayMs(animSpeed)')));

console.log('\n[INFO] Coverage snapshot');
console.log(` - front_total=${frontIds.length}`);
console.log(` - exact=${exact}`);
console.log(` - fallback=${fallback}`);
console.log(` - miss=${miss}`);

const passed = checks.every(Boolean);
console.log(`\nSummary: ${passed ? 'PASS' : 'FAIL'} (${checks.filter(Boolean).length}/${checks.length})`);
if (!passed) process.exit(1);
