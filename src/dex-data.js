import {loadLocalDex} from './local-dex.js';
import {EXTERNALLY_VERIFIED_CURRENT_ITEMS_IN_LOCAL_DATA, EXTERNALLY_VERIFIED_CURRENT_ITEMS_ABSENT_FROM_LOCAL_DATA} from './current-official-items.js';
import {OFFICIALLY_CONFIRMED_FUTURE_MEGA_ABILITIES, BUILDER_ALLOWED_NONSTANDARD, SHOWDOWN_TARGET_HINTS} from './battle-constants.js';

function toId(text) {
  return String(text || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
}
function slugify(text) {
  return String(text || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}
function uniqueNames(values) {
  const out = [];
  const seen = new Set();
  for (const value of values || []) {
    const key = toId(value);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(value);
  }
  return out;
}

export const CURRENT_OFFICIAL_ITEM_ID_SET = new Set(EXTERNALLY_VERIFIED_CURRENT_ITEMS_IN_LOCAL_DATA.map(toId));
export const CURRENT_OFFICIAL_ABSENT_ITEM_ID_SET = new Set(EXTERNALLY_VERIFIED_CURRENT_ITEMS_ABSENT_FROM_LOCAL_DATA.map(toId));

let _dex = null;
const speciesDataCache = new Map();
const moveDataCache = new Map();
const itemDataCache = new Map();
export const moveNameCache = [];

export function setDex(dex) { _dex = dex; }
export function getDex() { return _dex; }

export function isAllowedNonstandard(value, entry = null, kind = '') {
  if (!value) return true;
  if (BUILDER_ALLOWED_NONSTANDARD.has(value)) return true;
  const entryName = typeof entry === 'string' ? entry : (entry?.name || '');
  if (kind === 'items' && value === 'Future' && CURRENT_OFFICIAL_ITEM_ID_SET.has(toId(entryName))) return true;
  return false;
}
export function isDexSupported(entry, kind = '') {
  return Boolean(entry?.exists) && isAllowedNonstandard(entry?.isNonstandard, entry, kind) && !entry?.tier?.includes?.('Unreleased');
}
export function extractSecondaryAilment(move) {
  const pool = [move.secondary, ...(Array.isArray(move.secondaries) ? move.secondaries : [])].filter(Boolean);
  for (const entry of pool) {
    if (entry.status) return {ailment: entry.status, chance: entry.chance || 100};
  }
  if (move.status) return {ailment: move.status, chance: 100};
  return {ailment: '', chance: 0};
}
export function extractSecondaryBoosts(move) {
  const pool = [move.secondary, ...(Array.isArray(move.secondaries) ? move.secondaries : [])].filter(Boolean);
  for (const entry of pool) {
    if (entry.boosts) return {boosts: entry.boosts, chance: entry.chance || 100};
  }
  if (move.boosts) return {boosts: move.boosts, chance: 100};
  return {boosts: null, chance: 0};
}
export function formatTargetFromDex(target) {
  return SHOWDOWN_TARGET_HINTS[target] || 'single-opponent';
}

export function isFutureMegaSpeciesData(species) {
  if (!species?.exists) return false;
  if (species.isNonstandard !== 'Future') return false;
  const formeId = toId(species.forme || '');
  return formeId === 'mega' || /-mega/i.test(species.name || '');
}
export function applyFutureMegaSpeciesMetadataPatches(dex) {
  if (!dex?.species?.all) return;
  for (const species of dex.species.all()) {
    if (!isFutureMegaSpeciesData(species)) continue;
    const battleOnly = species.battleOnly || species.changesFrom || species.baseSpecies || species.name;
    species.isMega = true;
    if (!species.battleOnly && battleOnly) species.battleOnly = battleOnly;
    if (species.id && dex?.data?.Pokedex?.[species.id]) {
      dex.data.Pokedex[species.id].isMega = true;
      if (!dex.data.Pokedex[species.id].battleOnly && battleOnly) dex.data.Pokedex[species.id].battleOnly = battleOnly;
    }
  }
}
export function resolveProjectMegaAbilityName(dex, species) {
  if (!species?.exists) return '';
  const official = OFFICIALLY_CONFIRMED_FUTURE_MEGA_ABILITIES[species.name];
  if (official) return official;
  const baseSpeciesName = species.baseSpecies || species.changesFrom || species.name;
  const baseSpecies = dex?.species?.get?.(baseSpeciesName);
  const hiddenAbility = baseSpecies?.exists ? String(baseSpecies.abilities?.H || '').trim() : '';
  if (hiddenAbility) return hiddenAbility;
  return Object.values(species.abilities || {}).find(Boolean) || '';
}
export function applyProjectMegaAbilityRulesToDex(dex) {
  if (!dex?.species?.all) return;
  for (const species of dex.species.all()) {
    if (!isFutureMegaSpeciesData(species)) continue;
    const nextAbility = resolveProjectMegaAbilityName(dex, species);
    if (!nextAbility) continue;
    species.abilities = {0: nextAbility};
    if (species.id && dex?.data?.Pokedex?.[species.id]) {
      dex.data.Pokedex[species.id].abilities = {0: nextAbility};
    }
  }
}

export async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.json();
}
export async function pathExists(url) {
  try {
    const res = await fetch(url, {method: 'HEAD', cache: 'no-store'});
    if (res.ok) return true;
    if (res.status === 405) {
      const retry = await fetch(url, {cache: 'no-store'});
      return retry.ok;
    }
    return false;
  } catch (error) {
    return false;
  }
}
export async function loadManifest() {
  return fetchJson('./assets/manifest.json');
}
export async function detectAssetBases(manifest) {
  const result = {};
  const samplePokemon = manifest?.pokemon?.front?.find(id => id && id !== '000') || 'GENGAR';
  const pokemonBases = ['./assets/Pokemon', './assets/pokemon', 'assets/Pokemon', 'assets/pokemon'];
  for (const base of pokemonBases) {
    const probe = `${base}/Front/${samplePokemon}.png`;
    if (await pathExists(probe)) {
      result.pokemon = base;
      break;
    }
  }
  const sampleItem = slugify((manifest?.items || []).find(Boolean) || 'leftovers');
  const itemBases = ['./assets/items', 'assets/items'];
  for (const base of itemBases) {
    const probe = `${base}/${sampleItem}.png`;
    if (await pathExists(probe)) {
      result.items = base;
      break;
    }
  }
  return result;
}
export async function loadDataProvider() {
  const runtime = await loadLocalDex();
  const dex = runtime.Dex.mod ? runtime.Dex.mod('gen9') : runtime.Dex;
  applyFutureMegaSpeciesMetadataPatches(dex);
  applyProjectMegaAbilityRulesToDex(dex);
  speciesDataCache.clear();
  setDex(dex);
  return {source: runtime.source, version: runtime.version};
}
export async function loadMoveNames() {
  if (!_dex) throw new Error('Local Dex failed to load.');
  const names = _dex.moves.all()
    .filter(move => isDexSupported(move) && !move.isZ && !move.isMax)
    .map(move => move.name)
    .sort((a, b) => a.localeCompare(b));
  moveNameCache.splice(0, moveNameCache.length, ...names);
}
export async function getSpeciesData(speciesName) {
  const key = slugify(speciesName);
  if (speciesDataCache.has(key)) return speciesDataCache.get(key);
  if (!_dex) throw new Error('Local Dex failed to load.');
  const species = _dex.species.get(speciesName);
  if (!species?.exists) throw new Error(`Species not found in local data: ${speciesName}`);
  const abilityNames = uniqueNames(Object.values(species.abilities || {}).filter(Boolean));
  const fullLearnset = _dex.species.getFullLearnset(species.id) || {};
  const learnsetSources = Object.fromEntries(Object.entries(fullLearnset).map(([moveId, sources]) => [toId(moveId), Array.isArray(sources) ? [...sources] : []]));
  const data = {
    id: species.num || 0,
    name: species.name,
    apiName: species.id,
    baseSpecies: species.baseSpecies || species.name,
    forme: species.forme || '',
    types: [...(species.types || [])].map(type => type.toLowerCase()),
    abilities: abilityNames,
    stats: {...species.baseStats},
    weight: species.weightkg || 0,
    evolves: Boolean(species.evos?.length),
    learnset: Object.keys(learnsetSources),
    learnsetSources,
    requiredItem: species.requiredItem || '',
    requiredItems: Array.isArray(species.requiredItems) ? [...species.requiredItems] : [],
    requiredMove: species.requiredMove || '',
    requiredAbility: species.requiredAbility || '',
    requiredTeraType: species.requiredTeraType ? String(species.requiredTeraType).toLowerCase() : '',
    battleOnly: species.battleOnly || '',
    changesFrom: species.changesFrom || '',
    isNonstandard: species.isNonstandard ?? null,
    tier: species.tier ?? '',
    doublesTier: species.doublesTier ?? '',
    natDexTier: species.natDexTier ?? '',
    gender: species.gender || '',
    genderRatio: species.genderRatio ? {...species.genderRatio} : null,
    eggGroups: Array.isArray(species.eggGroups) ? [...species.eggGroups] : [],
    canGigantamax: species.canGigantamax || '',
    abilityMap: {...(species.abilities || {})},
    learnsetLineage: _dex.species.getLearnsetLineage(species.id).map(entry => ({
      ...entry,
      speciesName: _dex.species.get(entry.id)?.name || entry.id,
    })),
  };
  speciesDataCache.set(key, data);
  return data;
}
export async function getMoveData(moveName) {
  const key = slugify(moveName);
  if (!key) throw new Error('Move is blank');
  if (moveDataCache.has(key)) return moveDataCache.get(key);
  if (!_dex) throw new Error('Local Dex failed to load.');
  const move = _dex.moves.get(moveName);
  if (!move?.exists) throw new Error(`Move not found in local data: ${moveName}`);
  const secondaryStatus = extractSecondaryAilment(move);
  const secondaryBoosts = extractSecondaryBoosts(move);
  const result = {
    id: move.id,
    name: move.name,
    apiName: move.id,
    power: move.basePower || 0,
    accuracy: move.accuracy === true ? 100 : (move.accuracy || 100),
    pp: move.pp || 0,
    priority: move.priority || 0,
    type: String(move.type || '').toLowerCase(),
    category: String(move.category || '').toLowerCase(),
    target: formatTargetFromDex(move.target),
    critRate: move.critRatio ? Math.max(0, Number(move.critRatio) - 1) : 0,
    drain: Array.isArray(move.drain) ? Math.round((move.drain[0] / move.drain[1]) * 100) : 0,
    healing: Array.isArray(move.heal) ? Math.round((move.heal[0] / move.heal[1]) * 100) : 0,
    minHits: Array.isArray(move.multihit) ? move.multihit[0] : (move.multihit || 1),
    maxHits: Array.isArray(move.multihit) ? move.multihit[1] : (move.multihit || 1),
    ailment: secondaryStatus.ailment,
    ailmentChance: secondaryStatus.chance,
    flinchChance: move.secondary?.volatileStatus === 'flinch' ? (move.secondary?.chance || 100) : 0,
    statChance: secondaryBoosts.chance,
    statChanges: Object.entries(secondaryBoosts.boosts || move.boosts || {}).map(([stat, change]) => ({stat, change})),
    effectChance: move.secondary?.chance || move.secondaries?.[0]?.chance || 0,
    metaCategory: move.category === 'Status' ? 'status' : '',
    isNonstandard: move.isNonstandard ?? null,
    isZ: Boolean(move.isZ),
    isMax: Boolean(move.isMax),
    zBasePower: move.zMove?.basePower || 0,
    zBoosts: move.zMove?.boost ? {...move.zMove.boost} : {},
    zEffect: move.zMove?.effect || '',
    maxBasePower: move.maxMove?.basePower || 0,
    flags: {...(move.flags || {})},
    sideCondition: move.sideCondition || '',
    weather: move.weather || '',
    terrain: move.terrain || '',
    stallingMove: Boolean(move.stallingMove),
    breaksProtect: Boolean(move.breaksProtect),
    selfSwitch: move.selfSwitch || '',
    forceSwitch: Boolean(move.forceSwitch),
    recoil: Array.isArray(move.recoil) ? Math.round((move.recoil[0] / move.recoil[1]) * 100) : 0,
    hasCrashDamage: Boolean(move.hasCrashDamage),
    multiaccuracy: Boolean(move.multiaccuracy),
    selfBoosts: {...(move.self?.boosts || move.selfBoost?.boosts || {})},
    selfAilment: move.self?.status || '',
    selfVolatileStatus: move.self?.volatileStatus || '',
    volatileStatus: move.volatileStatus || '',
    secondaryVolatileStatus: move.secondary?.volatileStatus || move.secondaries?.[0]?.volatileStatus || '',
  };
  moveDataCache.set(key, result);
  return result;
}
export async function getItemData(itemName) {
  const key = slugify(itemName);
  if (!key) throw new Error('Item is blank');
  if (itemDataCache.has(key)) return itemDataCache.get(key);
  if (!_dex) throw new Error('Local Dex failed to load.');
  const item = _dex.items.get(itemName);
  if (!item?.exists) throw new Error(`Item not found in local data: ${itemName}`);
  const result = {
    name: item.name,
    apiName: item.id,
    zMove: item.zMove,
    zMoveType: item.zMoveType ? String(item.zMoveType).toLowerCase() : '',
    zMoveFrom: item.zMoveFrom || '',
    itemUser: Array.isArray(item.itemUser) ? [...item.itemUser] : [],
    megaStone: item.megaStone ? {...item.megaStone} : null,
  };
  itemDataCache.set(key, result);
  return result;
}
