import fs from 'fs';
import path from 'path';
import {fileURLToPath} from 'url';
import {loadLocalDex} from '../src/local-dex.js';
import {
  EXTERNALLY_VERIFIED_CURRENT_ITEMS_IN_LOCAL_DATA,
  EXTERNALLY_VERIFIED_CURRENT_ITEMS_ABSENT_FROM_LOCAL_DATA,
} from '../src/current-official-items.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const ITEM_DIRS = Object.freeze({
  currentItems: path.resolve(root, 'assets/items'),
  pokerogueItems: path.resolve(root, 'assets/pokerogue/items'),
  pokerogueImagesItems: path.resolve(root, 'assets/pokerogue/images/items'),
});

function toId(text) {
  return String(text || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function unique(values) {
  return Array.from(new Set((values || []).filter(Boolean)));
}

function normalizeStem(value, separator = '-') {
  const sep = separator === '_' ? '_' : '-';
  return String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[’'`]/g, '')
    .replace(/&/g, 'and')
    .replace(/\+/g, 'plus')
    .replace(/[^a-z0-9]+/g, sep)
    .replace(new RegExp(`${sep}{2,}`, 'g'), sep)
    .replace(new RegExp(`^${sep}+|${sep}+$`, 'g'), '');
}

function buildItemStemCandidates(itemName = '') {
  const raw = String(itemName || '').trim();
  if (!raw || /^no item$/i.test(raw)) return [];
  const dash = normalizeStem(raw, '-');
  const underscore = normalizeStem(raw, '_');
  const compact = normalizeStem(raw, '').replace(/[^a-z0-9]/g, '');
  const existingDash = raw.toLowerCase().replace(/\.png$/i, '');
  const existingUnderscore = existingDash.replace(/-/g, '_');
  const existingDashAgain = existingDash.replace(/_/g, '-');
  return unique([dash, underscore, compact, existingDash, existingUnderscore, existingDashAgain]);
}

function collectDirectoryStems(dirPath) {
  if (!fs.existsSync(dirPath) || !fs.statSync(dirPath).isDirectory()) return new Set();
  const stems = new Set();
  for (const file of fs.readdirSync(dirPath)) {
    if (!file.toLowerCase().endsWith('.png')) continue;
    stems.add(file.slice(0, -4).toLowerCase());
  }
  return stems;
}

function buildIdIndex(dirStemsByKey) {
  const out = new Map();
  for (const [dirKey, stems] of Object.entries(dirStemsByKey)) {
    for (const stem of stems) {
      const id = toId(stem);
      if (!id) continue;
      if (!out.has(id)) out.set(id, []);
      out.get(id).push({dir: dirKey, stem});
    }
  }
  return out;
}

function classifyMissingGroup(itemName = '') {
  const text = String(itemName || '');
  if (/^TR\d{2}$/i.test(text)) return 'tr-record';
  if (/^Hyper\s+/i.test(text)) return 'hyper-item';
  if (/^Fossilized\s+/i.test(text)) return 'fossilized';
  if (/\b(?:ite|nite|z)\b/i.test(text) || /(ite|nite| Z)$/i.test(text)) return 'stone-z-crystal';
  if (/\b(?:Boots|Pack|Shield|Amulet|Cloak|Glove|Spray|Service|Feather)\b/i.test(text)) return 'modern-battle-item';
  return 'other';
}

function compareGroup(a, b) {
  const rank = ['modern-battle-item', 'stone-z-crystal', 'tr-record', 'fossilized', 'hyper-item', 'other'];
  return rank.indexOf(a) - rank.indexOf(b);
}

function resolveIconForItem(itemName, dirStemsByKey) {
  const stems = buildItemStemCandidates(itemName);
  for (const stem of stems) {
    for (const [dirKey, dirStems] of Object.entries(dirStemsByKey)) {
      if (dirStems.has(stem)) {
        return {found: true, dir: dirKey, stem, variant: 'direct', candidates: stems};
      }
    }
  }
  for (const stem of stems) {
    for (const [dirKey, dirStems] of Object.entries(dirStemsByKey)) {
      if (dirStems.has(`${stem}--held`)) {
        return {found: true, dir: dirKey, stem: `${stem}--held`, variant: 'held', candidates: stems};
      }
      if (dirStems.has(`${stem}--bag`)) {
        return {found: true, dir: dirKey, stem: `${stem}--bag`, variant: 'bag', candidates: stems};
      }
    }
  }
  return {found: false, dir: '', stem: '', variant: 'none', candidates: stems};
}

async function main() {
  const {Dex} = await loadLocalDex();

  const dirStemsByKey = Object.fromEntries(
    Object.entries(ITEM_DIRS).map(([key, value]) => [key, collectDirectoryStems(value)])
  );

  const idIndex = buildIdIndex(dirStemsByKey);
  const currentOfficialFutureIdSet = new Set(EXTERNALLY_VERIFIED_CURRENT_ITEMS_IN_LOCAL_DATA.map(toId));

  const isDexSupportedItem = (entry) => Boolean(entry?.exists)
    && (
      !entry?.isNonstandard
      || entry.isNonstandard === 'Past'
      || (entry.isNonstandard === 'Future' && currentOfficialFutureIdSet.has(toId(entry?.name || '')))
    )
    && !entry?.tier?.includes?.('Unreleased');

  const supported = Dex.items.all().filter(isDexSupportedItem);
  const resolved = [];
  const missing = [];

  for (const item of supported) {
    const icon = resolveIconForItem(item.name, dirStemsByKey);
    if (icon.found) {
      resolved.push({
        name: item.name,
        dir: icon.dir,
        stem: icon.stem,
        variant: icon.variant,
      });
      continue;
    }

    const idAliases = idIndex.get(toId(item.name)) || [];
    missing.push({
      name: item.name,
      group: classifyMissingGroup(item.name),
      idAliasCandidates: idAliases,
      stemCandidates: icon.candidates,
      isFutureCurrentOfficial: currentOfficialFutureIdSet.has(toId(item.name)),
      isExternallyAbsentFromLocalData: EXTERNALLY_VERIFIED_CURRENT_ITEMS_ABSENT_FROM_LOCAL_DATA.some(name => toId(name) === toId(item.name)),
    });
  }

  const resolvedByDir = Object.fromEntries(Object.keys(ITEM_DIRS).map(key => [key, 0]));
  const resolvedByVariant = {direct: 0, held: 0, bag: 0};
  for (const row of resolved) {
    resolvedByDir[row.dir] += 1;
    resolvedByVariant[row.variant] += 1;
  }

  const missingByGroup = {};
  for (const row of missing) {
    missingByGroup[row.group] = (missingByGroup[row.group] || 0) + 1;
  }

  const report = {
    generatedAt: new Date().toISOString(),
    inputs: {
      itemDirs: ITEM_DIRS,
      totalFilesByDir: Object.fromEntries(Object.entries(dirStemsByKey).map(([key, stems]) => [key, stems.size])),
      supportedItems: supported.length,
    },
    summary: {
      resolvedItems: resolved.length,
      missingItems: missing.length,
      resolvedByDir,
      resolvedByVariant,
      missingByGroup: Object.fromEntries(Object.entries(missingByGroup).sort((a, b) => b[1] - a[1])),
      futureCurrentOfficialMissing: missing.filter(row => row.isFutureCurrentOfficial).length,
      idAliasPossibleMissing: missing.filter(row => row.idAliasCandidates.length > 0).length,
    },
    missing: missing
      .sort((a, b) => compareGroup(a.group, b.group) || a.name.localeCompare(b.name, 'en', {sensitivity: 'base'})),
    resolvedSample: resolved
      .sort((a, b) => a.name.localeCompare(b.name, 'en', {sensitivity: 'base'}))
      .slice(0, 120),
  };

  const outPath = path.resolve(root, 'reports/item-sprite-audit.json');
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2));

  console.log(`Wrote ${outPath}`);
  console.log(JSON.stringify(report.summary, null, 2));
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
