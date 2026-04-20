import fs from 'fs';
import path from 'path';
import {fileURLToPath} from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

function toSortedUnique(values = []) {
  return Array.from(new Set(values.map(value => String(value || '').toLowerCase()).filter(Boolean)))
    .sort((a, b) => a.localeCompare(b, 'en', {sensitivity: 'base'}));
}

function listPngStems(dirPath) {
  if (!fs.existsSync(dirPath) || !fs.statSync(dirPath).isDirectory()) return null;
  return toSortedUnique(
    fs.readdirSync(dirPath)
      .filter(name => name.toLowerCase().endsWith('.png'))
      .map(name => path.basename(name, '.png'))
  );
}

function readManifestItems(manifestPath, {root = false} = {}) {
  if (!fs.existsSync(manifestPath)) return null;
  const payload = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const raw = root
    ? (Array.isArray(payload?.items) ? payload.items : [])
    : (Array.isArray(payload?.items) ? payload.items : (Array.isArray(payload) ? payload : []));
  return toSortedUnique(raw);
}

function diff(expected = [], actual = []) {
  const expectedSet = new Set(expected);
  const actualSet = new Set(actual);
  const missing = expected.filter(value => !actualSet.has(value));
  const extra = actual.filter(value => !expectedSet.has(value));
  return {missing, extra};
}

function main() {
  const targets = [
    {
      label: 'current-items',
      dirPath: path.join(ROOT, 'assets', 'items'),
      manifestPath: path.join(ROOT, 'assets', 'manifest.json'),
      rootManifest: true,
      optional: false,
    },
    {
      label: 'pokerogue-items',
      dirPath: path.join(ROOT, 'assets', 'pokerogue', 'items'),
      manifestPath: path.join(ROOT, 'assets', 'pokerogue', 'items', 'manifest.json'),
      rootManifest: false,
      optional: false,
    },
    {
      label: 'pokerogue-images-items',
      dirPath: path.join(ROOT, 'assets', 'pokerogue', 'images', 'items'),
      manifestPath: path.join(ROOT, 'assets', 'pokerogue', 'images', 'items', 'manifest.json'),
      rootManifest: false,
      optional: true,
    },
  ];

  let hasError = false;

  for (const target of targets) {
    const files = listPngStems(target.dirPath);
    if (files == null && target.optional) {
      console.log(`[skip] ${target.label} (directory missing): ${target.dirPath}`);
      continue;
    }
    if (files == null) {
      console.error(`[fail] ${target.label} directory missing: ${target.dirPath}`);
      hasError = true;
      continue;
    }

    const manifestItems = readManifestItems(target.manifestPath, {root: target.rootManifest});
    if (manifestItems == null) {
      console.error(`[fail] ${target.label} manifest missing: ${target.manifestPath}`);
      hasError = true;
      continue;
    }

    const {missing, extra} = diff(files, manifestItems);
    if (!missing.length && !extra.length) {
      console.log(`[ok] ${target.label}: ${files.length} items`);
      continue;
    }

    hasError = true;
    console.error(`[fail] ${target.label}: drift detected`);
    console.error(`  missing in manifest (${missing.length}): ${missing.slice(0, 20).join(', ')}`);
    console.error(`  extra in manifest (${extra.length}): ${extra.slice(0, 20).join(', ')}`);
  }

  if (hasError) process.exitCode = 1;
}

main();
