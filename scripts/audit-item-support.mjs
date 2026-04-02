import fs from 'fs';
import path from 'path';
import {fileURLToPath} from 'url';
import {loadLocalDex} from '../src/local-dex.js';
import {KO_NAME_MAPS} from '../src/i18n-ko-data.js';
import {OFFICIAL_KO_ITEMS} from '../src/i18n-ko-official.js';
import {EXTERNALLY_VERIFIED_CURRENT_ITEMS_IN_LOCAL_DATA, EXTERNALLY_VERIFIED_CURRENT_ITEMS_ABSENT_FROM_LOCAL_DATA} from '../src/current-official-items.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'assets', 'manifest.json'), 'utf8'));
const assetSet = new Set(manifest.items || []);
const {Dex} = await loadLocalDex();

const BUILDER_ALLOWED_NONSTANDARD = new Set(['Past']);
const commonItems = [
  'Leftovers','Life Orb','Choice Band','Choice Specs','Choice Scarf','Focus Sash','Assault Vest','Sitrus Berry','Rocky Helmet','Expert Belt',
  'Lum Berry','Booster Energy','Heavy-Duty Boots','Air Balloon','Weakness Policy','Eviolite','Clear Amulet','Scope Lens','Muscle Band','Wise Glasses',
  'Mystic Water','Charcoal','Miracle Seed','Magnet','Black Glasses','Never-Melt Ice','Soft Sand','Dragon Fang','Pixie Plate','Poison Barb',
  'Silver Powder','Spell Tag','Sharp Beak','Twisted Spoon','Hard Stone','Silk Scarf','Metal Coat','Black Sludge'
];

const slugify = (text) => String(text || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
const toId = (text) => String(text || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
const CURRENT_OFFICIAL_ITEM_ID_SET = new Set(EXTERNALLY_VERIFIED_CURRENT_ITEMS_IN_LOCAL_DATA.map(name => toId(name)));
const CURRENT_OFFICIAL_ABSENT_ITEM_ID_SET = new Set(EXTERNALLY_VERIFIED_CURRENT_ITEMS_ABSENT_FROM_LOCAL_DATA.map(name => toId(name)));
const hasHangul = (text) => /[\u3131-\u318E\uAC00-\uD7A3]/.test(String(text || ''));
const ITEM_LOCALIZATION_OVERRIDES = {'Berserk Gene': '버서크유전자'};
const getLocalizedItem = (name) => ITEM_LOCALIZATION_OVERRIDES[name] || OFFICIAL_KO_ITEMS?.[name] || KO_NAME_MAPS?.items?.[name] || '';
const isSuspiciousLocalization = (english, localized) => {
  if (!localized) return true;
  if (toId(localized) === toId(english)) return true;
  if (!hasHangul(localized) && !/[♀♂]/.test(String(localized || ''))) return true;
  return false;
};
const isDexSupported = (entry) => Boolean(entry?.exists) && (!entry?.isNonstandard || BUILDER_ALLOWED_NONSTANDARD.has(entry?.isNonstandard) || (entry?.isNonstandard === 'Future' && CURRENT_OFFICIAL_ITEM_ID_SET.has(toId(entry?.name || '')))) && !entry?.tier?.includes?.('Unreleased');
const classifyIcon = (name) => {
  const slug = slugify(name);
  if (!slug) return {iconState: 'none', assetId: ''};
  if (assetSet.has(slug)) return {iconState: 'direct', assetId: slug};
  if (assetSet.has(`${slug}--held`)) return {iconState: 'held-variant', assetId: `${slug}--held`};
  if (assetSet.has(`${slug}--bag`)) return {iconState: 'bag-variant', assetId: `${slug}--bag`};
  return {iconState: 'none', assetId: ''};
};

const allItems = Dex.items.all();
const supported = allItems.filter(isDexSupported);
const filteredOut = allItems.filter(item => item?.exists && !isDexSupported(item)).map(item => ({name: item.name, isNonstandard: item.isNonstandard || '', tier: item.tier || ''}));
const pickerItems = Array.from(new Set([...commonItems, ...supported.map(item => item.name)]));
const hiddenSupported = supported.filter(item => !pickerItems.some(name => toId(name) === toId(item.name)));
const iconBuckets = {direct: [], 'held-variant': [], 'bag-variant': [], none: []};
const suspiciousLocalization = [];
for (const item of supported) {
  const icon = classifyIcon(item.name);
  iconBuckets[icon.iconState].push({name: item.name, assetId: icon.assetId});
  const localized = getLocalizedItem(item.name);
  if (isSuspiciousLocalization(item.name, localized)) suspiciousLocalization.push({name: item.name, localized});
}

const verifiedCurrentFuturePresent = EXTERNALLY_VERIFIED_CURRENT_ITEMS_IN_LOCAL_DATA.filter(name => { const entry = Dex.items.get(name); return entry?.exists; }).map(name => ({name, icon: classifyIcon(name).iconState}));
const verifiedCurrentAbsent = EXTERNALLY_VERIFIED_CURRENT_ITEMS_ABSENT_FROM_LOCAL_DATA.filter(name => !Dex.items.get(name)?.exists).map(name => ({name, classifiedAs: CURRENT_OFFICIAL_ABSENT_ITEM_ID_SET.has(toId(name)) ? 'absent-from-local-data' : 'unknown'}));
const summary = {
  counts: {
    allItems: allItems.length,
    supportedItems: supported.length,
    filteredOut: filteredOut.length,
    pickerItems: pickerItems.length,
    hiddenSupported: hiddenSupported.length,
    directIcons: iconBuckets.direct.length,
    heldVariantIcons: iconBuckets['held-variant'].length,
    bagVariantIcons: iconBuckets['bag-variant'].length,
    missingIcons: iconBuckets.none.length,
    suspiciousLocalization: suspiciousLocalization.length,
    externallyVerifiedCurrentPresentInLocalData: verifiedCurrentFuturePresent.length,
    externallyVerifiedCurrentAbsentFromLocalData: verifiedCurrentAbsent.length,
  },
  samples: {
    filteredOut: filteredOut.slice(0, 20),
    heldVariantIcons: iconBuckets['held-variant'].slice(0, 40),
    bagVariantIcons: iconBuckets['bag-variant'].slice(0, 20),
    missingIcons: iconBuckets.none.slice(0, 60),
    suspiciousLocalization: suspiciousLocalization.slice(0, 20),
    externallyVerifiedCurrentPresentInLocalData: verifiedCurrentFuturePresent,
    externallyVerifiedCurrentAbsentFromLocalData: verifiedCurrentAbsent,
  },
};
console.log(JSON.stringify(summary, null, 2));
