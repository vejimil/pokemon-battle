import fs from 'fs';
import path from 'path';
import {fileURLToPath} from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJsonIfChanged(filePath, payload) {
  const next = `${JSON.stringify(payload, null, 2)}\n`;
  const prev = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : '';
  if (prev === next) return false;
  fs.writeFileSync(filePath, next);
  return true;
}

function listPngStems(dirPath) {
  if (!fs.existsSync(dirPath) || !fs.statSync(dirPath).isDirectory()) return [];
  return fs.readdirSync(dirPath)
    .filter(name => name.toLowerCase().endsWith('.png'))
    .map(name => path.basename(name, '.png').toLowerCase())
    .sort((a, b) => a.localeCompare(b, 'en', {sensitivity: 'base'}));
}

function upsertManifestItemsArray(manifestPath, items) {
  const current = fs.existsSync(manifestPath) ? readJson(manifestPath) : {};
  const next = (current && typeof current === 'object' && !Array.isArray(current))
    ? {...current, items}
    : {items};
  return writeJsonIfChanged(manifestPath, next);
}

function main() {
  const targets = [
    {
      label: 'current-items',
      dirPath: path.join(ROOT, 'assets', 'items'),
      manifestPath: path.join(ROOT, 'assets', 'manifest.json'),
      asRootManifest: true,
    },
    {
      label: 'pokerogue-items',
      dirPath: path.join(ROOT, 'assets', 'pokerogue', 'items'),
      manifestPath: path.join(ROOT, 'assets', 'pokerogue', 'items', 'manifest.json'),
      asRootManifest: false,
    },
    {
      label: 'pokerogue-images-items',
      dirPath: path.join(ROOT, 'assets', 'pokerogue', 'images', 'items'),
      manifestPath: path.join(ROOT, 'assets', 'pokerogue', 'images', 'items', 'manifest.json'),
      asRootManifest: false,
      optional: true,
    },
  ];

  for (const target of targets) {
    const items = listPngStems(target.dirPath);
    if (!items.length && target.optional && !fs.existsSync(target.dirPath)) {
      console.log(`[skip] ${target.label} (directory missing): ${target.dirPath}`);
      continue;
    }
    const changed = target.asRootManifest
      ? upsertManifestItemsArray(target.manifestPath, items)
      : writeJsonIfChanged(target.manifestPath, {items});
    console.log(`[${changed ? 'updated' : 'ok'}] ${target.label}: ${items.length} items`);
  }
}

main();
