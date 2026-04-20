import fs from 'fs/promises';
import path from 'path';
import {fileURLToPath} from 'url';

import {loadLocalDex, LOCAL_DEX_VERSION} from '../src/local-dex.js';
import {KO_NAME_MAPS} from '../src/i18n-ko-data.js';
import {OFFICIAL_KO_SPECIES, OFFICIAL_KO_ITEMS} from '../src/i18n-ko-official.js';
import {OFFICIAL_KO_LOCALE_NAMES} from '../src/i18n-ko-locales.js';
import {EXTERNALLY_VERIFIED_ITEM_KO_ALIASES} from '../src/current-official-items.js';
import {isDexSupported} from '../src/dex-data.js';
import {MOVE_FLAG_LABELS, VOLATILE_STATUS_LABELS, SIDE_CONDITION_LABELS, WEATHER_LABELS, TERRAIN_LABELS} from '../src/battle-constants.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const reportPath = path.join(repoRoot, 'reports', 'language-completeness-audit.json');
const appJsPath = path.join(repoRoot, 'src', 'app.js');

const KO_NAME_PATCHES = {
  moves: {
    'Paleo Wave': '팔레오웨이브',
    'Shadow Strike': '섀도스트라이크',
    'Polar Flare': '폴라플레어',
  },
  abilities: {
    'No Ability': '특성없음',
    'Embody Aspect (Cornerstone)': '체현(주춧돌)',
    'Embody Aspect (Hearthflame)': '체현(화덕)',
    'Embody Aspect (Teal)': '체현(벽록)',
    'Embody Aspect (Wellspring)': '체현(우물)',
    "Mind's Eye": '심안',
    Mountaineer: '등산가',
    Rebound: '리바운드',
    Persistent: '집요',
  },
};

const LOCALIZED_NAME_MAPS = {
  ...KO_NAME_MAPS,
  moves: {
    ...(KO_NAME_MAPS?.moves || {}),
    ...(OFFICIAL_KO_LOCALE_NAMES?.moves || {}),
    ...(KO_NAME_PATCHES?.moves || {}),
  },
  abilities: {
    ...(KO_NAME_MAPS?.abilities || {}),
    ...(OFFICIAL_KO_LOCALE_NAMES?.abilities || {}),
    ...(KO_NAME_PATCHES?.abilities || {}),
  },
  species: {
    ...(KO_NAME_MAPS?.species || {}),
    ...(OFFICIAL_KO_LOCALE_NAMES?.species || {}),
    ...OFFICIAL_KO_SPECIES,
  },
  items: {
    ...(KO_NAME_MAPS?.items || {}),
    ...Object.fromEntries(Object.entries(OFFICIAL_KO_ITEMS || {}).filter(([, value]) => value)),
    'Berserk Gene': '버서크유전자',
    'Loaded Dice': '속임수 주사위',
  },
};

function toId(text) {
  return String(text || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function hasHangul(text) {
  return /[가-힣]/.test(String(text || ''));
}

function isSuspiciousLocalization(english, localized) {
  if (!localized) return true;
  if (toId(localized) === toId(english)) return true;
  if (!hasHangul(localized) && !/[♀♂]/.test(String(localized || ''))) return true;
  return false;
}

async function loadFormSuffixTranslations() {
  const source = await fs.readFile(appJsPath, 'utf8');
  const match = source.match(/const FORM_SUFFIX_TRANSLATIONS = (\{[\s\S]*?\n\});/);
  if (!match) throw new Error('FORM_SUFFIX_TRANSLATIONS not found in src/app.js');
  return Function(`return (${match[1]});`)();
}

function createCanonicalResolver(dex) {
  return function resolveCanonicalDisplayName(kind, english) {
    if (!english) return '';
    const raw = String(english);
    if (kind === 'species') {
      const data = dex.species.get(raw);
      return data?.exists ? (data.name || raw) : raw;
    }
    if (kind === 'moves') {
      const data = dex.moves.get(raw);
      return data?.exists ? (data.name || raw) : raw;
    }
    if (kind === 'abilities') {
      const data = dex.abilities.get(raw);
      return data?.exists ? (data.name || raw) : raw;
    }
    if (kind === 'items') {
      const data = dex.items.get(raw);
      return data?.exists ? (data.name || raw) : raw;
    }
    return raw;
  };
}

function translateFormSuffix(formMap, suffix = '') {
  if (!suffix) return '';
  if (formMap[suffix]) return formMap[suffix];
  const compact = suffix.replace(/[^A-Za-z0-9%]+/g, '');
  if (formMap[compact]) return formMap[compact];
  return suffix.replace(/-/g, ' ');
}

function createSpeciesFallbackGetter(dex, resolveCanonicalDisplayName, formMap) {
  return function getLocalizedSpeciesFallback(english) {
    if (!english) return '';
    const canonicalEnglish = resolveCanonicalDisplayName('species', english) || String(english || '');
    const speciesData = dex.species.get(canonicalEnglish);
    const baseEnglish = speciesData?.exists
      ? (speciesData.baseSpecies || speciesData.name)
      : String(canonicalEnglish).split('-')[0];
    const baseKorean = LOCALIZED_NAME_MAPS?.species?.[baseEnglish] || KO_NAME_MAPS?.species?.[baseEnglish] || baseEnglish;
    const forme = speciesData?.forme || (String(canonicalEnglish).includes('-') ? String(canonicalEnglish).split('-').slice(1).join('-') : '');
    if (!forme) return baseKorean;
    const translated = translateFormSuffix(formMap, forme);
    if (['Alola', 'Galar', 'Hisui', 'Paldea'].includes(forme)) return `${translated} ${baseKorean}`;
    if (forme === 'Mega') return `메가${baseKorean}`;
    if (forme === 'Mega-X' || forme === 'Mega-Y') return `${translated}${baseKorean}`;
    if (forme === 'Gmax') return `${translated} ${baseKorean}`;
    return `${baseKorean} (${translated})`;
  };
}

function createGeneratedItemAliasGetter(dex, getLocalizedName) {
  return function getGeneratedItemSearchAliases(english = '') {
    const aliases = new Set(EXTERNALLY_VERIFIED_ITEM_KO_ALIASES?.[english] || []);
    const item = dex?.items?.get?.(english);
    if (item?.exists && item.megaStone) {
      const itemUsers = Array.isArray(item.itemUser) ? item.itemUser.filter(Boolean) : [];
      const candidateUser = itemUsers[0] || Object.keys(item.megaStone || {})[0] || '';
      const userSpecies = candidateUser ? dex?.species?.get?.(candidateUser) : null;
      const baseSpecies = userSpecies?.exists ? (userSpecies.baseSpecies || userSpecies.name) : candidateUser;
      const baseKorean = getLocalizedName('species', baseSpecies || '');
      const suffixMatch = String(english || '').match(/\s*([XYZ])$/i);
      const suffix = suffixMatch ? suffixMatch[1].toUpperCase() : '';
      if (baseKorean && hasHangul(baseKorean)) aliases.add(`${baseKorean}나이트${suffix}`);
    }
    return Array.from(aliases);
  };
}

function auditBilingualLabelMap(name, map) {
  const issues = [];
  for (const [key, pair] of Object.entries(map || {})) {
    if (!Array.isArray(pair) || pair.length < 2) {
      issues.push({map: name, key, issue: 'missing_pair'});
      continue;
    }
    const [ko, en] = pair;
    if (!String(ko || '').trim()) issues.push({map: name, key, issue: 'missing_ko'});
    if (!String(en || '').trim()) issues.push({map: name, key, issue: 'missing_en'});
    if (String(ko || '').trim() && !hasHangul(ko)) issues.push({map: name, key, issue: 'ko_not_hangul', value: ko});
    if (String(en || '').trim() && hasHangul(en)) issues.push({map: name, key, issue: 'en_has_hangul', value: en});
  }
  return issues;
}

function summarizeLeaks(leaks, sampleSize = 30) {
  return {
    count: leaks.length,
    sample: leaks.slice(0, sampleSize),
  };
}

async function main() {
  const formSuffixTranslations = await loadFormSuffixTranslations();
  const runtime = await loadLocalDex();
  const dex = runtime.Dex.mod ? runtime.Dex.mod('gen9') : runtime.Dex;

  const resolveCanonicalDisplayName = createCanonicalResolver(dex);
  const getLocalizedSpeciesFallback = createSpeciesFallbackGetter(dex, resolveCanonicalDisplayName, formSuffixTranslations);

  const getLocalizedName = (() => {
    let getGeneratedItemSearchAliases = () => [];

    const fn = (kind, english) => {
      if (!english) return '';
      const canonicalEnglish = resolveCanonicalDisplayName(kind, english) || String(english || '');
      const localized = LOCALIZED_NAME_MAPS?.[kind]?.[english]
        || LOCALIZED_NAME_MAPS?.[kind]?.[canonicalEnglish]
        || KO_NAME_MAPS?.[kind]?.[english]
        || KO_NAME_MAPS?.[kind]?.[canonicalEnglish]
        || '';
      if (kind === 'species' && isSuspiciousLocalization(canonicalEnglish, localized)) {
        return getLocalizedSpeciesFallback(canonicalEnglish) || canonicalEnglish;
      }
      if (kind === 'items' && isSuspiciousLocalization(canonicalEnglish, localized)) {
        const generatedAliases = getGeneratedItemSearchAliases(canonicalEnglish);
        const generatedKorean = generatedAliases.find(alias => hasHangul(alias));
        return EXTERNALLY_VERIFIED_ITEM_KO_ALIASES?.[canonicalEnglish]?.[0]
          || EXTERNALLY_VERIFIED_ITEM_KO_ALIASES?.[english]?.[0]
          || generatedKorean
          || generatedAliases[0]
          || localized
          || canonicalEnglish;
      }
      return localized || canonicalEnglish;
    };

    getGeneratedItemSearchAliases = createGeneratedItemAliasGetter(dex, fn);
    return fn;
  })();

  const leaksFor = (kind, entries, filter = () => true) => {
    const leaks = [];
    for (const entry of entries) {
      if (!filter(entry)) continue;
      if (!isDexSupported(entry, kind)) continue;
      const english = entry.name;
      const localized = getLocalizedName(kind, english);
      if (!hasHangul(localized) && !/[♀♂]/.test(localized)) leaks.push({english, localized});
    }
    return leaks;
  };

  const speciesLeaks = leaksFor('species', dex.species.all());
  const moveLeaks = leaksFor('moves', dex.moves.all(), move => !move.isZ && !move.isMax);
  const abilityLeaks = leaksFor('abilities', dex.abilities.all());
  const itemLeaks = leaksFor('items', dex.items.all());

  const labelIssues = [
    ...auditBilingualLabelMap('MOVE_FLAG_LABELS', MOVE_FLAG_LABELS),
    ...auditBilingualLabelMap('VOLATILE_STATUS_LABELS', VOLATILE_STATUS_LABELS),
    ...auditBilingualLabelMap('SIDE_CONDITION_LABELS', SIDE_CONDITION_LABELS),
    ...auditBilingualLabelMap('WEATHER_LABELS', WEATHER_LABELS),
    ...auditBilingualLabelMap('TERRAIN_LABELS', TERRAIN_LABELS),
  ];

  const report = {
    generatedAt: new Date().toISOString(),
    dexVersion: LOCAL_DEX_VERSION,
    summary: {
      species: summarizeLeaks(speciesLeaks),
      moves: summarizeLeaks(moveLeaks),
      abilities: summarizeLeaks(abilityLeaks),
      items: summarizeLeaks(itemLeaks),
      labelIssues: summarizeLeaks(labelIssues),
    },
  };

  await fs.mkdir(path.dirname(reportPath), {recursive: true});
  await fs.writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

  const totalLeakCount =
    speciesLeaks.length +
    moveLeaks.length +
    abilityLeaks.length +
    itemLeaks.length +
    labelIssues.length;

  if (totalLeakCount > 0) {
    console.error('[audit-language-completeness] leaks found');
    console.error(`- species: ${speciesLeaks.length}`);
    console.error(`- moves: ${moveLeaks.length}`);
    console.error(`- abilities: ${abilityLeaks.length}`);
    console.error(`- items: ${itemLeaks.length}`);
    console.error(`- label issues: ${labelIssues.length}`);
    process.exit(1);
  }

  console.log('[audit-language-completeness] ok');
  console.log(`- report: ${path.relative(repoRoot, reportPath)}`);
}

main().catch(error => {
  console.error('[audit-language-completeness] failed');
  console.error(error);
  process.exit(1);
});

