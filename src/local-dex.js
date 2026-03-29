import {Pokedex} from './data/pokedex.js';
import {Learnsets} from './data/learnsets.js';
import {Moves} from './data/moves.js';
import {Abilities} from './data/abilities.js';
import {Items} from './data/items.js';
import {Aliases} from './data/aliases.js';
import {FormatsData} from './data/formats-data.js';
import {TypeChart} from './data/typechart.js';
import {Natures} from './data/natures.js';
import {Conditions} from './data/conditions.js';
import {Rulesets} from './data/rulesets.js';
import {Tags} from './data/tags.js';

export const LOCAL_DEX_VERSION = 'smogon-pokemon-showdown-master-2026-03-29';
export const LOCAL_DEX_SOURCE = 'vendored local Showdown data modules';

function toId(text) {
  return String(text || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function unique(values) {
  return Array.from(new Set(values));
}

const DEFAULT_TYPE_IDS = Object.freeze({
  normal: 1,
  fighting: 2,
  flying: 3,
  poison: 4,
  ground: 5,
  rock: 6,
  bug: 7,
  ghost: 8,
  steel: 9,
  fire: 10,
  water: 11,
  grass: 12,
  electric: 13,
  psychic: 14,
  ice: 15,
  dragon: 16,
  dark: 17,
  fairy: 18,
  stellar: 19,
});

export const LOCAL_TYPE_IDS = DEFAULT_TYPE_IDS;
export const LOCAL_TYPES = Object.keys(LOCAL_TYPE_IDS);

function buildSimpleTypeChart() {
  const attackChart = {};
  for (const type of LOCAL_TYPES) attackChart[type] = {};

  for (const [defTypeId, defData] of Object.entries(TypeChart)) {
    const damageTaken = defData?.damageTaken || {};
    const defender = toId(defTypeId);
    if (!attackChart.normal && defender !== 'normal') {
      continue;
    }
    for (const [attackTypeName, code] of Object.entries(damageTaken)) {
      const attacker = toId(attackTypeName);
      if (!LOCAL_TYPES.includes(attacker)) continue;
      let mult = 1;
      if (code === 1) mult = 2;
      else if (code === 2) mult = 0.5;
      else if (code === 3) mult = 0;
      attackChart[attacker][defender] = mult;
    }
  }
  return attackChart;
}

export const LOCAL_TYPE_CHART = buildSimpleTypeChart();

function buildNatureMap() {
  const out = {};
  for (const [id, nature] of Object.entries(Natures)) {
    out[nature.name] = {plus: nature.plus || null, minus: nature.minus || null, id};
  }
  return out;
}

export const LOCAL_NATURES = buildNatureMap();
export const LOCAL_NATURE_ORDER = [
  'Hardy','Lonely','Brave','Adamant','Naughty',
  'Bold','Docile','Relaxed','Impish','Lax',
  'Timid','Hasty','Serious','Jolly','Naive',
  'Modest','Mild','Quiet','Bashful','Rash',
  'Calm','Gentle','Sassy','Careful','Quirky',
];

const speciesCache = new Map();
const moveCache = new Map();
const itemCache = new Map();
const abilityCache = new Map();
const learnsetCache = new Map();

function resolveAliasTarget(name) {
  const id = toId(name);
  if (!id) return '';
  const alias = Aliases[id];
  return alias ? toId(alias) : id;
}

function resolveTableEntry(table, name) {
  const id = toId(name);
  if (!id) return {id: '', raw: null};
  if (table[id]) return {id, raw: table[id]};
  const aliasId = resolveAliasTarget(name);
  if (aliasId && table[aliasId]) return {id: aliasId, raw: table[aliasId]};
  return {id, raw: null};
}

function buildSpeciesEntry(id, raw) {
  if (speciesCache.has(id)) return speciesCache.get(id);
  if (!raw) {
    const miss = {exists: false, id, name: ''};
    speciesCache.set(id, miss);
    return miss;
  }

  const formatData = FormatsData[id] || {};
  const abilities = {...(raw.abilities || {})};
  const entry = {
    ...raw,
    ...formatData,
    exists: true,
    id,
    name: raw.name || formatData.name || id,
    num: raw.num || 0,
    types: [...(raw.types || [])],
    abilities,
    baseStats: {...(raw.baseStats || {})},
    weightkg: raw.weightkg || 0,
    evos: [...(raw.evos || [])],
    isNonstandard: raw.isNonstandard ?? formatData.isNonstandard ?? null,
    tier: formatData.tier ?? raw.tier ?? null,
    doublesTier: formatData.doublesTier ?? raw.doublesTier ?? null,
    natDexTier: formatData.natDexTier ?? raw.natDexTier ?? null,
  };
  speciesCache.set(id, entry);
  return entry;
}

function buildMoveEntry(id, raw) {
  if (moveCache.has(id)) return moveCache.get(id);
  if (!raw) {
    const miss = {exists: false, id, name: ''};
    moveCache.set(id, miss);
    return miss;
  }
  const entry = {
    ...raw,
    exists: true,
    id,
    name: raw.name || id,
    type: raw.type || '',
    category: raw.category || '',
  };
  moveCache.set(id, entry);
  return entry;
}

function buildItemEntry(id, raw) {
  if (itemCache.has(id)) return itemCache.get(id);
  if (!raw) {
    const miss = {exists: false, id, name: ''};
    itemCache.set(id, miss);
    return miss;
  }
  const entry = {
    ...raw,
    exists: true,
    id,
    name: raw.name || id,
    isNonstandard: raw.isNonstandard ?? null,
  };
  itemCache.set(id, entry);
  return entry;
}

function buildAbilityEntry(id, raw) {
  if (abilityCache.has(id)) return abilityCache.get(id);
  if (!raw) {
    const miss = {exists: false, id, name: ''};
    abilityCache.set(id, miss);
    return miss;
  }
  const entry = {
    ...raw,
    exists: true,
    id,
    name: raw.name || id,
    isNonstandard: raw.isNonstandard ?? null,
  };
  abilityCache.set(id, entry);
  return entry;
}

function mergeLearnsetInto(target, source) {
  if (!source) return;
  for (const [moveId, sources] of Object.entries(source)) {
    target[moveId] = unique([...(target[moveId] || []), ...(Array.isArray(sources) ? sources : [])]);
  }
}

function buildFullLearnset(id, seen = new Set()) {
  if (!id) return {};
  if (learnsetCache.has(id)) return learnsetCache.get(id);
  if (seen.has(id)) return {};
  seen.add(id);

  const merged = {};
  const species = Pokedex[id] || null;
  if (species) {
    if (species.prevo) mergeLearnsetInto(merged, buildFullLearnset(toId(species.prevo), seen));
    if (species.baseSpecies && toId(species.baseSpecies) !== id) {
      mergeLearnsetInto(merged, buildFullLearnset(toId(species.baseSpecies), seen));
    }
    if (species.changesFrom) mergeLearnsetInto(merged, buildFullLearnset(toId(species.changesFrom), seen));
  }
  mergeLearnsetInto(merged, Learnsets[id]?.learnset || {});
  learnsetCache.set(id, merged);
  return merged;
}

const speciesApi = {
  get(name) {
    const {id, raw} = resolveTableEntry(Pokedex, name);
    return buildSpeciesEntry(id, raw);
  },
  all() {
    return Object.entries(Pokedex).map(([id, raw]) => buildSpeciesEntry(id, raw));
  },
  getFullLearnset(name) {
    const species = this.get(name);
    if (!species?.exists) return null;
    return buildFullLearnset(species.id);
  },
};

const movesApi = {
  get(name) {
    const {id, raw} = resolveTableEntry(Moves, name);
    return buildMoveEntry(id, raw);
  },
  all() {
    return Object.entries(Moves).map(([id, raw]) => buildMoveEntry(id, raw));
  },
};

const itemsApi = {
  get(name) {
    const {id, raw} = resolveTableEntry(Items, name);
    return buildItemEntry(id, raw);
  },
  all() {
    return Object.entries(Items).map(([id, raw]) => buildItemEntry(id, raw));
  },
};

const abilitiesApi = {
  get(name) {
    const {id, raw} = resolveTableEntry(Abilities, name);
    return buildAbilityEntry(id, raw);
  },
  all() {
    return Object.entries(Abilities).map(([id, raw]) => buildAbilityEntry(id, raw));
  },
};

const Dex = {
  species: speciesApi,
  moves: movesApi,
  items: itemsApi,
  abilities: abilitiesApi,
  data: {
    Pokedex,
    Learnsets,
    Moves,
    Abilities,
    Items,
    Aliases,
    FormatsData,
    TypeChart,
    Natures,
    Conditions,
    Rulesets,
    Tags,
  },
  mod() {
    return Dex;
  },
};

export async function loadLocalDex() {
  return {
    Dex,
    source: LOCAL_DEX_SOURCE,
    version: LOCAL_DEX_VERSION,
  };
}
