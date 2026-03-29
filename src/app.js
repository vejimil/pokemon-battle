import {loadLocalDex, LOCAL_NATURES, LOCAL_NATURE_ORDER, LOCAL_TYPE_IDS, LOCAL_TYPES, LOCAL_TYPE_CHART} from './local-dex.js';
import {KO_NAME_MAPS} from './i18n-ko-data.js';

const STORAGE_KEY = 'pkb-static-state-v1';
const SHOWDOWN_TARGET_HINTS = {
  normal: 'single-opponent',
  adjacentFoe: 'single-opponent',
  adjacentAlly: 'ally',
  adjacentAllyOrSelf: 'ally-or-self',
  allySide: 'ally-side',
  foeSide: 'opponent-side',
  allAdjacent: 'all-other-pokemon',
  allAdjacentFoes: 'all-opponents',
  all: 'all-pokemon',
  scripted: 'single-opponent',
  randomNormal: 'single-opponent',
  self: 'self',
  any: 'single-opponent',
};
const statOrder = ['hp', 'atk', 'def', 'spa', 'spd', 'spe'];
const statLabels = {hp: 'HP', atk: 'Atk', def: 'Def', spa: 'SpA', spd: 'SpD', spe: 'Spe'};
const statusNames = {brn: 'Burn', par: 'Paralysis', psn: 'Poison', tox: 'Toxic', slp: 'Sleep', frz: 'Freeze'};
const typeIds = LOCAL_TYPE_IDS;
const TYPES = LOCAL_TYPES;
const natureOrder = LOCAL_NATURE_ORDER;
const natures = LOCAL_NATURES;
const commonItems = [
  'Leftovers','Life Orb','Choice Band','Choice Specs','Choice Scarf','Focus Sash','Assault Vest','Sitrus Berry','Rocky Helmet','Expert Belt',
  'Lum Berry','Booster Energy','Heavy-Duty Boots','Air Balloon','Weakness Policy','Eviolite','Clear Amulet','Scope Lens','Muscle Band','Wise Glasses',
  'Mystic Water','Charcoal','Miracle Seed','Magnet','Black Glasses','Never-Melt Ice','Soft Sand','Dragon Fang','Pixie Plate','Poison Barb',
  'Silver Powder','Spell Tag','Sharp Beak','Twisted Spoon','Hard Stone','Silk Scarf','Metal Coat','Black Sludge'
];
const implementedAbilities = new Set(['intimidate','levitate','technician','adaptability','multiscale','flash-fire']);
const implementedItems = new Set(['leftovers','life-orb','choice-band','choice-specs','choice-scarf','focus-sash','assault-vest','sitrus-berry','rocky-helmet','expert-belt','lum-berry','eviolite','clear-amulet','scope-lens','muscle-band','wise-glasses','mystic-water','charcoal','miracle-seed','magnet','black-glasses','never-melt-ice','soft-sand','dragon-fang','pixie-plate','poison-barb','silver-powder','spell-tag','sharp-beak','twisted-spoon','hard-stone','silk-scarf','metal-coat','black-sludge']);
const BUILDER_ALLOWED_NONSTANDARD = new Set(['Past']);
const NONSTANDARD_REASON_LABELS = {
  Future: 'is marked as future / unreleased content in the loaded data.',
  CAP: 'belongs to CAP/custom content, not official cartridge data.',
  LGPE: 'belongs to the Let’s Go ruleset only.',
  Unobtainable: 'is marked unobtainable in the loaded data.',
  Gigantamax: 'is Gigantamax-only battle content and should not be chosen directly here.',
};
const targetHints = {
  'selected-pokemon': 'single-opponent',
  'random-opponent': 'single-opponent',
  'all-opponents': 'all-opponents',
  'all-other-pokemon': 'all-other-pokemon',
  'all-pokemon': 'all-pokemon',
  user: 'self',
  'user-and-allies': 'self-side',
  'user-or-ally': 'ally-or-self',
  ally: 'ally',
  'ally-side': 'ally-side',
  'users-field': 'self-side',
  'opponents-field': 'opponent-side',
  'entire-field': 'field',
  'specific-move': 'single-opponent',
  'selected-pokemon-me-first': 'single-opponent',
  'user-or-ally': 'ally-or-self',
};

const typeChart = LOCAL_TYPE_CHART;

const moveNameCache = [];
const speciesDataCache = new Map();
const moveDataCache = new Map();
const imageInfoCache = new Map();

const state = {
  runtimeReady: false,
  dex: null,
  dexSource: '',
  dexVersion: '',
  dataProvider: 'Local Showdown data',
  mode: 'singles',
  teamSize: 3,
  manifest: null,
  speciesChoices: [],
  playerNames: ['Player 1', 'Player 2'],
  teams: [[], []],
  selected: {player: 0, slot: 0},
  builderErrors: [],
  builderWarnings: [],
  currentMoveChoices: [],
  picker: {mode: '', moveIndex: null, options: []},
  battle: null,
  assetBase: {pokemon: './assets/Pokemon', items: './assets/items'},
};

const els = {};

function clearSpriteAnimation(container) {
  if (container?._spriteTimer) {
    clearInterval(container._spriteTimer);
    delete container._spriteTimer;
  }
}

function slugify(text) {
  return String(text || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}
function toId(text) {
  return String(text || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
}
function titleCase(text) {
  return String(text || '').split(/[-\s]+/).filter(Boolean).map(part => part[0]?.toUpperCase() + part.slice(1)).join('\n');
}
function humanizeSpriteId(id) {
  return String(id)
    .replace(/_female$/i, ' ♀')
    .replace(/_male$/i, ' ♂')
    .replace(/_\d+$/i, '')
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, c => c.toUpperCase());
}

const typeLabels = {
  normal: '노말 / Normal',
  fighting: '격투 / Fighting',
  flying: '비행 / Flying',
  poison: '독 / Poison',
  ground: '땅 / Ground',
  rock: '바위 / Rock',
  bug: '벌레 / Bug',
  ghost: '고스트 / Ghost',
  steel: '강철 / Steel',
  fire: '불꽃 / Fire',
  water: '물 / Water',
  grass: '풀 / Grass',
  electric: '전기 / Electric',
  psychic: '에스퍼 / Psychic',
  ice: '얼음 / Ice',
  dragon: '드래곤 / Dragon',
  dark: '악 / Dark',
  fairy: '페어리 / Fairy',
  stellar: '스텔라 / Stellar',
};
const genderLabels = {
  '': '자동 / Auto',
  M: '수컷 / Male',
  F: '암컷 / Female',
  N: '무성 / Genderless',
};
const statusLabels = {
  brn: '화상 / Burn',
  par: '마비 / Paralysis',
  psn: '독 / Poison',
  tox: '맹독 / Toxic',
  slp: '잠듦 / Sleep',
  frz: '얼음 / Freeze',
};
const reverseNameMaps = Object.fromEntries(
  Object.entries(KO_NAME_MAPS).map(([kind, map]) => {
    const reverse = new Map();
    for (const [english, korean] of Object.entries(map || {})) {
      const candidates = [
        english,
        korean,
        `${korean} / ${english}`,
        `${english} / ${korean}`,
      ];
      for (const candidate of candidates) {
        const id = toId(candidate);
        if (id) reverse.set(id, english);
      }
    }
    return [kind, reverse];
  })
);
function bilingualLabel(korean, english) {
  if (!korean || korean === english) return english || korean || '';
  return `${korean} / ${english}`;
}
function getLocalizedName(kind, english) {
  if (!english) return '';
  return KO_NAME_MAPS?.[kind]?.[english] || english;
}
function displayEntity(kind, english) {
  if (!english) return '';
  return bilingualLabel(getLocalizedName(kind, english), english);
}
function displayType(typeName) {
  return typeLabels[typeName] || bilingualLabel(titleCase(typeName), titleCase(typeName));
}
function displayGender(gender) {
  return genderLabels[gender ?? ''] || gender || genderLabels[''];
}
function displayStatus(status) {
  return statusLabels[status] || statusNames[status] || status;
}
function displaySpeciesName(name) {
  return displayEntity('species', name);
}
function displayMoveName(name) {
  return displayEntity('moves', name);
}
function displayItemName(name) {
  return displayEntity('items', name);
}
function displayAbilityName(name) {
  return displayEntity('abilities', name);
}
function displayNatureName(name) {
  return displayEntity('natures', name);
}
function normalizeLocalizedInput(kind, value, fallbackChoices = []) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const direct = reverseNameMaps[kind]?.get(toId(raw));
  if (direct) return direct;
  const split = raw.split('/').map(part => part.trim()).filter(Boolean);
  for (const piece of split) {
    const fromSplit = reverseNameMaps[kind]?.get(toId(piece));
    if (fromSplit) return fromSplit;
  }
  for (const choice of fallbackChoices) {
    if (toId(choice.english || choice.label || choice.name) === toId(raw)) return choice.english || choice.label || choice.name;
    if (toId(choice.display) === toId(raw)) return choice.english || choice.label || choice.name;
    if (toId(choice.korean) === toId(raw)) return choice.english || choice.label || choice.name;
  }
  return raw;
}
function makeChoice(kind, english, extra = {}) {
  return {
    english,
    korean: getLocalizedName(kind, english),
    display: displayEntity(kind, english),
    ...extra,
  };
}
function setDatalistOptions(el, choices) {
  el.innerHTML = (choices || []).map(choice => {
    const value = choice.display || choice.english || '';
    const label = choice.english && choice.display !== choice.english ? choice.english : '';
    return `<option value="${value}"${label ? ` label="${label}"` : ''}></option>`;
  }).join('\n');
}
function getCurrentMoveChoices(mon = getSelectedMon()) {
  if (!mon?.data?.learnset?.length || !state.dex) return [];
  const out = [];
  const seen = new Set();
  for (const moveId of mon.data.learnset) {
    const move = state.dex.moves.get(moveId);
    if (!move?.exists || !isDexSupported(move) || move.isZ || move.isMax) continue;
    if (seen.has(move.name)) continue;
    seen.add(move.name);
    out.push(makeChoice('moves', move.name));
  }
  return out.sort((a, b) => a.english.localeCompare(b.english));
}
function rebuildMoveDatalist(mon = getSelectedMon()) {
  const choices = getCurrentMoveChoices(mon);
  state.currentMoveChoices = choices;
  setDatalistOptions(els.moveList, choices);
  return choices;
}
function showPicker(mode, moveIndex = null) {
  let options = [];
  let title = '선택 / Select';
  if (mode === 'species') {
    options = state.speciesChoices;
    title = '포켓몬 선택 / Choose Pokémon';
  } else if (mode === 'move') {
    const mon = getSelectedMon();
    options = getCurrentMoveChoices(mon);
    title = `기술 선택 / Choose Move ${Number.isInteger(moveIndex) ? moveIndex + 1 : ''}`.trim();
  }
  state.picker = {mode, moveIndex, options};
  els.pickerTitle.textContent = title;
  els.pickerSearch.value = '';
  els.pickerModal.classList.remove('hidden');
  renderPickerOptions();
  els.pickerSearch.focus();
}
function hidePicker() {
  if (!els.pickerModal) return;
  els.pickerModal.classList.add('hidden');
}
function renderPickerOptions() {
  const picker = state.picker || {options: []};
  const query = toId(els.pickerSearch?.value || '');
  const filtered = (picker.options || []).filter(option => {
    if (!query) return true;
    return [option.display, option.english, option.korean].some(value => toId(value).includes(query));
  });
  els.pickerList.innerHTML = '';
  els.pickerEmpty.textContent = filtered.length ? '' : '검색 결과가 없습니다. / No results found.';
  for (const option of filtered) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'picker-option';
    button.innerHTML = `<strong>${option.display}</strong>${option.display !== option.english ? `<small>${option.english}</small>` : ''}`;
    button.addEventListener('click', async () => {
      const mon = getSelectedMon();
      if (picker.mode === 'species') {
        mon.species = option.english;
        mon.displaySpecies = option.english;
        await hydrateSelectedSpecies();
        await renderValidation();
      } else if (picker.mode === 'move' && Number.isInteger(picker.moveIndex)) {
        mon.moves[picker.moveIndex] = option.english;
        saveState();
        renderEditor();
        await renderValidation();
      }
      hidePicker();
    });
    els.pickerList.appendChild(button);
  }
}
function dataSourceLabel() {
  return state.dex ? `Local Dex ${state.dexVersion || ''}`.trim() : state.dataProvider;
}
function isAllowedNonstandard(value) {
  return !value || BUILDER_ALLOWED_NONSTANDARD.has(value);
}
function explainNonstandard(value) {
  return NONSTANDARD_REASON_LABELS[value] || `is marked as ${value} in the loaded data.`;
}
function isDexSupported(entry) {
  return Boolean(entry?.exists) && isAllowedNonstandard(entry?.isNonstandard) && !entry?.tier?.includes?.('Unreleased');
}
function getDexSpeciesEntry(name) {
  if (!state.dex) return null;
  const species = state.dex.species.get(name);
  return species?.exists ? species : null;
}
function getFullLearnsetIds(speciesName) {
  if (!state.dex) return [];
  const species = state.dex.species.get(speciesName);
  if (!species?.exists || !state.dex.species.getFullLearnset) return [];
  const learnset = state.dex.species.getFullLearnset(species.id);
  if (Array.isArray(learnset)) return learnset.map(toId);
  if (learnset && typeof learnset === 'object') return Object.keys(learnset).map(toId);
  return [];
}
function formatTargetFromDex(target) {
  return SHOWDOWN_TARGET_HINTS[target] || 'single-opponent';
}
function extractSecondaryAilment(move) {
  const pool = [move.secondary, ...(Array.isArray(move.secondaries) ? move.secondaries : [])].filter(Boolean);
  for (const entry of pool) {
    if (entry.status) return {ailment: entry.status, chance: entry.chance || 100};
  }
  if (move.status) return {ailment: move.status, chance: 100};
  return {ailment: '', chance: 0};
}
function extractSecondaryBoosts(move) {
  const pool = [move.secondary, ...(Array.isArray(move.secondaries) ? move.secondaries : [])].filter(Boolean);
  for (const entry of pool) {
    if (entry.boosts) return {boosts: entry.boosts, chance: entry.chance || 100};
  }
  if (move.boosts) return {boosts: move.boosts, chance: 100};
  return {boosts: null, chance: 0};
}
function formatPokemonDisplayName(name) {
  return String(name || '').replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}
function clamp(num, min, max) {
  return Math.max(min, Math.min(max, num));
}
function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}
function createEmptyMon() {
  return {
    species: '', displaySpecies: '', spriteId: '', shiny: false, level: 100,
    nickname: '', gender: '',
    nature: 'Jolly', item: 'Leftovers', ability: '', teraType: 'normal',
    moves: ['', '', '', ''],
    evs: {hp:0, atk:0, def:0, spa:0, spd:0, spe:0},
    ivs: {hp:31, atk:31, def:31, spa:31, spd:31, spe:31},
    data: null,
  };
}
function resetTeams() {
  state.teams = [0,1].map(() => Array.from({length: state.teamSize}, () => createEmptyMon()));
  state.selected = {player: 0, slot: 0};
}
function rebuildTeamSize() {
  state.teamSize = state.mode === 'singles' ? 3 : 4;
  state.teams = [0,1].map(p => {
    const prev = state.teams[p] || [];
    return Array.from({length: state.teamSize}, (_, i) => prev[i] ? prev[i] : createEmptyMon());
  });
  if (state.selected.slot >= state.teamSize) state.selected.slot = state.teamSize - 1;
}
function natureMultiplier(natureName, stat) {
  const n = natures[natureName] || natures.Hardy;
  if (n.plus === stat) return 1.1;
  if (n.minus === stat) return 0.9;
  return 1;
}
function calcStats(mon) {
  if (!mon?.data?.stats) return null;
  const base = mon.data.stats;
  const level = Number(mon.level || 100);
  const stats = {};
  for (const stat of statOrder) {
    const baseStat = base[stat] || 0;
    const iv = clamp(Number(mon.ivs?.[stat] ?? 31), 0, 31);
    const ev = clamp(Number(mon.evs?.[stat] ?? 0), 0, 252);
    if (stat === 'hp') {
      if (baseStat === 1) {
        stats.hp = 1;
      } else {
        stats.hp = Math.floor(((2 * baseStat + iv + Math.floor(ev / 4)) * level) / 100) + level + 10;
      }
    } else {
      const raw = Math.floor(((2 * baseStat + iv + Math.floor(ev / 4)) * level) / 100) + 5;
      stats[stat] = Math.floor(raw * natureMultiplier(mon.nature, stat));
    }
  }
  return stats;
}
function statStageMultiplier(stage) {
  const s = clamp(stage, -6, 6);
  if (s >= 0) return (2 + s) / 2;
  return 2 / (2 + Math.abs(s));
}
function getModifiedStat(mon, stat) {
  let value = mon.stats[stat];
  if (stat !== 'hp') value = Math.max(1, Math.floor(value * statStageMultiplier(mon.boosts[stat] || 0)));
  if (stat === 'spe') {
    if (mon.status === 'par') value = Math.floor(value * 0.5);
    if (toId(mon.item) === 'choicescarf') value = Math.floor(value * 1.5);
  }
  if (stat === 'def' && toId(mon.item) === 'eviolite' && mon.data?.evolves) value = Math.floor(value * 1.5);
  if (stat === 'spd' && toId(mon.item) === 'assaultvest') value = Math.floor(value * 1.5);
  return value;
}
function typeEffectiveness(moveType, defender) {
  const chart = typeChart[moveType] || {};
  return defender.types.reduce((mult, t) => mult * (chart[t] ?? 1), 1);
}
function hpPercent(mon) {
  return mon.maxHp ? Math.max(0, (mon.hp / mon.maxHp) * 100) : 0;
}
function hpFillClass(mon) {
  const pct = hpPercent(mon);
  if (pct <= 25) return 'low';
  if (pct <= 50) return 'mid';
  return '';
}
function getStatusIcon(status) {
  if (!status) return '';
  const file = {
    brn:'BURN.png', frz:'FROZEN.png', par:'PARALYSIS.png', psn:'POISON.png', tox:'POISON.png'
  }[status];
  return file ? `./assets/system/status/${file}` : '';
}
function showRuntime(message, type = 'loading', notes = '') {
  els.runtimeStatus.textContent = message;
  els.runtimeStatus.className = `runtime-status ${type}`;
  els.runtimeNotes.innerHTML = notes;
}
function saveState() {
  const snapshot = {
    mode: state.mode,
    playerNames: state.playerNames,
    teams: state.teams.map(team => team.map(mon => ({...mon, data: null}))),
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
}
function loadSavedState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    state.mode = parsed.mode === 'doubles' ? 'doubles' : 'singles';
    state.teamSize = state.mode === 'doubles' ? 4 : 3;
    state.playerNames = Array.isArray(parsed.playerNames) ? parsed.playerNames.slice(0,2).map(v => v || 'Player') : ['Player 1','Player 2'];
    rebuildTeamSize();
    if (Array.isArray(parsed.teams)) {
      state.teams = [0,1].map(player => Array.from({length: state.teamSize}, (_, slot) => {
        const mon = createEmptyMon();
        return Object.assign(mon, parsed.teams[player]?.[slot] || {});
      }));
    }
  } catch (error) {
    console.warn('Failed to load saved state', error);
    resetTeams();
  }
}
async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.json();
}
async function loadManifest() {
  const manifest = await fetchJson('./assets/manifest.json');
  state.manifest = manifest;
  const ids = Array.from(new Set(manifest.pokemon.front
    .filter(id => !/_female$/i.test(id) && !/_male$/i.test(id) && !/_\d+$/i.test(id) && id !== '000')
    .sort()));
  state.speciesChoices = ids.map(id => {
    const english = humanizeSpriteId(id);
    return {id, english, korean: getLocalizedName('species', english), display: displaySpeciesName(english)};
  });
}
async function pathExists(url) {
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
async function detectAssetBases() {
  const samplePokemon = state.manifest?.pokemon?.front?.find(id => id && id !== '000') || 'GENGAR';
  const pokemonBases = ['./assets/Pokemon', './assets/pokemon', 'assets/Pokemon', 'assets/pokemon'];
  for (const base of pokemonBases) {
    const probe = `${base}/Front/${samplePokemon}.png`;
    if (await pathExists(probe)) {
      state.assetBase.pokemon = base;
      break;
    }
  }

  const sampleItem = slugify((state.manifest?.items || []).find(Boolean) || 'leftovers');
  const itemBases = ['./assets/items', 'assets/items'];
  for (const base of itemBases) {
    const probe = `${base}/${sampleItem}.png`;
    if (await pathExists(probe)) {
      state.assetBase.items = base;
      break;
    }
  }
}
async function loadDataProvider() {
  const runtime = await loadLocalDex();
  state.dex = runtime.Dex.mod ? runtime.Dex.mod('gen9') : runtime.Dex;
  state.dexSource = runtime.source;
  state.dexVersion = runtime.version;
  state.dataProvider = 'Local Showdown data';
}
async function loadMoveNames() {
  if (!state.dex) throw new Error('Local Dex failed to load.');
  const names = state.dex.moves.all()
    .filter(move => isDexSupported(move) && !move.isZ && !move.isMax)
    .map(move => move.name)
    .sort((a, b) => a.localeCompare(b));
  moveNameCache.splice(0, moveNameCache.length, ...names);
}
async function getSpeciesData(speciesName) {
  const key = slugify(speciesName);
  if (speciesDataCache.has(key)) return speciesDataCache.get(key);
  if (!state.dex) throw new Error('Local Dex failed to load.');

  const species = state.dex.species.get(speciesName);
  if (!species?.exists) throw new Error(`Species not found in local data: ${speciesName}`);

  const abilityNames = Object.values(species.abilities || {}).filter(Boolean);
  const fullLearnset = state.dex.species.getFullLearnset(species.id) || {};
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
  };
  speciesDataCache.set(key, data);
  return data;
}
async function getMoveData(moveName) {
  const key = slugify(moveName);
  if (!key) throw new Error('Move is blank');
  if (moveDataCache.has(key)) return moveDataCache.get(key);
  if (!state.dex) throw new Error('Local Dex failed to load.');

  const move = state.dex.moves.get(moveName);
  if (!move?.exists) throw new Error(`Move not found in local data: ${moveName}`);

  const secondaryStatus = extractSecondaryAilment(move);
  const secondaryBoosts = extractSecondaryBoosts(move);
  const result = {
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
    flags: {...(move.flags || {})},
  };
  moveDataCache.set(key, result);
  return result;
}
function joinReadableList(values, displayFn = (value) => value) {
  const list = Array.from(new Set((values || []).filter(Boolean).map(displayFn)));
  if (!list.length) return '';
  if (list.length === 1) return list[0];
  if (list.length === 2) return `${list[0]} 또는 / or ${list[1]}`;
  return `${list.slice(0, -1).join(', ')}, 또는 / or ${list[list.length - 1]}`;
}
function matchesListedName(value, choices) {
  const id = toId(value);
  return Boolean(id) && (choices || []).some(choice => toId(choice) === id);
}
function summarizeLearnsetSources(sources) {
  const normalized = (sources || []).map(source => String(source));
  const hasCurrentGen = normalized.some(source => source.startsWith('9'));
  const hasEvent = normalized.some(source => /^\dS/.test(source));
  const eventOnly = normalized.length > 0 && normalized.every(source => /^\dS/.test(source));
  const legacyOnly = normalized.length > 0 && !hasCurrentGen;
  return {normalized, hasCurrentGen, hasEvent, eventOnly, legacyOnly};
}
function validateGenderChoice(mon, prefix, errors) {
  if (!mon.data) return;
  const chosenGender = mon.gender || '';
  const fixedGender = mon.data.gender || '';
  const speciesLabel = displaySpeciesName(mon.data.name);
  if (fixedGender) {
    if (chosenGender && chosenGender !== fixedGender) errors.push(`${prefix}: ${speciesLabel} 포켓몬은 ${displayGender(fixedGender)} 성별이어야 합니다. / ${mon.data.name} must use gender ${displayGender(fixedGender)}.`);
    return;
  }
  if (chosenGender === 'N') errors.push(`${prefix}: ${speciesLabel} 포켓몬은 무성별이 아닙니다. / ${mon.data.name} is not genderless.`);
  if (chosenGender && !['M', 'F'].includes(chosenGender)) errors.push(`${prefix}: 성별은 자동 / Auto, 수컷 / Male, 암컷 / Female 중 하나여야 합니다. / gender must be Auto, Male, or Female.`);
}
function collectTeamWarnings(team, playerIndex) {
  const warnings = [];
  const speciesBuckets = new Map();
  const itemBuckets = new Map();
  team.forEach((mon, slotIndex) => {
    const speciesLabel = mon.data?.name || mon.displaySpecies || mon.species || '';
    const speciesKey = toId(mon.data?.apiName || speciesLabel);
    if (!speciesKey) return;
    if (!speciesBuckets.has(speciesKey)) speciesBuckets.set(speciesKey, {label: speciesLabel, slots: []});
    speciesBuckets.get(speciesKey).slots.push(slotIndex + 1);

    const itemKey = toId(mon.item);
    if (itemKey) {
      if (!itemBuckets.has(itemKey)) itemBuckets.set(itemKey, {label: mon.item, slots: []});
      itemBuckets.get(itemKey).slots.push(slotIndex + 1);
    }
  });
  for (const {label, slots} of speciesBuckets.values()) {
    if (slots.length > 1) warnings.push(`${state.playerNames[playerIndex]}: 같은 포켓몬 ${displaySpeciesName(label)} 이(가) 슬롯 ${slots.join(', ')}에 중복되어 있습니다. / duplicate species (${label}) in slots ${slots.join(', ')}. This build allows it, but many formats do not.`);
  }
  for (const {label, slots} of itemBuckets.values()) {
    if (slots.length > 1) warnings.push(`${state.playerNames[playerIndex]}: 같은 지닌 도구 ${displayItemName(label)} 이(가) 슬롯 ${slots.join(', ')}에 중복되어 있습니다. / duplicate held item (${label}) in slots ${slots.join(', ')}. This build allows it, but VGC-style Item Clause would not.`);
  }
  return warnings;
}

function getBaseSpriteId(speciesInput) {
  const guessRaw = String(speciesInput || '').trim();
  if (!guessRaw) return '';
  const guess = normalizeLocalizedInput('species', guessRaw, state.speciesChoices);
  const byId = state.speciesChoices.find(entry => entry.id === guess.toUpperCase());
  if (byId) return byId.id;
  const normalized = guess.toUpperCase().replace(/[^A-Z0-9]+/g, '_');
  const direct = state.manifest.pokemon.front.includes(normalized) ? normalized : '';
  if (direct) return direct;
  const labelMatch = state.speciesChoices.find(entry =>
    toId(entry.english) === toId(guess) ||
    toId(entry.display) === toId(guessRaw) ||
    toId(entry.korean) === toId(guessRaw)
  );
  return labelMatch?.id || '';
}
function spritePath(spriteId, facing = 'front', shiny = false) {
  const folder = facing === 'back'
    ? shiny ? 'Back shiny' : 'Back'
    : shiny ? 'Front shiny' : 'Front';
  return `${state.assetBase.pokemon}/${folder}/${spriteId}.png`;
}
function iconPath(spriteId, shiny = false) {
  const folder = shiny ? 'Icons shiny' : 'Icons';
  return `${state.assetBase.pokemon}/${folder}/${spriteId}.png`;
}
function itemIconPath(itemName) {
  const slug = slugify(itemName);
  return slug ? `${state.assetBase.items}/${slug}.png` : '';
}
function typeIconPath(typeName, small = false) {
  const idx = typeIds[typeName];
  if (!idx) return '';
  return `./assets/types/${small ? 'small/' : ''}${idx}.png`;
}
function createTypePill(type) {
  const url = typeIconPath(type, true);
  if (!url) {
    const span = document.createElement('span');
    span.className = 'type-chip-text';
    span.textContent = titleCase(type);
    return span;
  }
  const img = document.createElement('img');
  img.src = url;
  img.alt = type;
  img.loading = 'lazy';
  img.className = 'type-chip';
  img.onerror = () => {
    const span = document.createElement('span');
    span.className = 'type-chip-text';
    span.textContent = titleCase(type);
    img.replaceWith(span);
  };
  return img;
}
async function ensureImageInfo(url) {
  if (imageInfoCache.has(url)) return imageInfoCache.get(url);
  const info = await new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const frame = img.height;
      const count = Math.max(1, Math.floor(img.width / frame));
      resolve({width: img.width, height: img.height, frame, count});
    };
    img.onerror = () => reject(new Error(`Failed to load ${url}`));
    img.src = url;
  });
  imageInfoCache.set(url, info);
  return info;
}
async function renderAnimatedSprite(container, {spriteId, facing='front', shiny=false, size='large'}) {
  clearSpriteAnimation(container);
  container.innerHTML = '';
  container.className = `sprite-shell ${size}`;
  if (!spriteId) {
    container.textContent = '—';
    return;
  }
  const url = spritePath(spriteId, facing, shiny);
  try {
    const info = await ensureImageInfo(url);
    const canvas = document.createElement('canvas');
    const scale = size === 'large' ? Math.min(2.4, 190 / info.frame) : Math.min(1.4, 56 / info.frame);
    const width = Math.max(24, Math.floor(info.frame * scale));
    const height = Math.max(24, Math.floor(info.height * scale));
    canvas.width = width;
    canvas.height = height;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    const img = new Image();
    img.onload = () => {
      let frame = 0;
      const draw = () => {
        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(img, frame * info.frame, 0, info.frame, info.height, 0, 0, width, height);
        frame = (frame + 1) % info.count;
      };
      draw();
      if (info.count > 1) {
        const timer = setInterval(() => {
          if (!container.isConnected || canvas !== container.firstChild) {
            clearInterval(timer);
            return;
          }
          draw();
        }, 120);
        container._spriteTimer = timer;
      }
    };
    img.src = url;
    container.appendChild(canvas);
  } catch (error) {
    container.textContent = 'Sprite missing';
  }
}
function bindElements() {
  Object.assign(els, {
    runtimeStatus: document.getElementById('runtime-status'),
    runtimeNotes: document.getElementById('runtime-notes'),
    modeSinglesBtn: document.getElementById('mode-singles-btn'),
    modeDoublesBtn: document.getElementById('mode-doubles-btn'),
    player1Name: document.getElementById('player1-name'),
    player2Name: document.getElementById('player2-name'),
    rosterP1: document.getElementById('roster-p1'),
    rosterP2: document.getElementById('roster-p2'),
    rosterP1Name: document.getElementById('roster-p1-name'),
    rosterP2Name: document.getElementById('roster-p2-name'),
    teamSizeNote: document.getElementById('team-size-note'),
    heroModeLabel: document.getElementById('hero-mode-label'),
    editorTitle: document.getElementById('editor-title'),
    editorSubtitle: document.getElementById('editor-subtitle'),
    editorSprite: document.getElementById('editor-sprite'),
    editorSpeciesName: document.getElementById('editor-species-name'),
    editorTypeRow: document.getElementById('editor-type-row'),
    editorFlags: document.getElementById('editor-flags'),
    editorAbilityNote: document.getElementById('editor-ability-note'),
    editorAbilityEffect: document.getElementById('editor-ability-effect'),
    speciesInput: document.getElementById('species-input'),
    speciesStatus: document.getElementById('species-status'),
    nicknameInput: document.getElementById('nickname-input'),
    abilitySelect: document.getElementById('ability-select'),
    natureSelect: document.getElementById('nature-select'),
    genderSelect: document.getElementById('gender-select'),
    itemInput: document.getElementById('item-input'),
    itemIcon: document.getElementById('item-icon'),
    levelInput: document.getElementById('level-input'),
    teraSelect: document.getElementById('tera-select'),
    shinyCheckbox: document.getElementById('shiny-checkbox'),
    moveInputs: [1,2,3,4].map(i => document.getElementById(`move${i}-input`)),
    evGrid: document.getElementById('ev-grid'),
    ivGrid: document.getElementById('iv-grid'),
    evTotal: document.getElementById('ev-total'),
    builderErrors: document.getElementById('builder-errors'),
    builderWarnings: document.getElementById('builder-warnings'),
    validationSummary: document.getElementById('validation-summary'),
    startBattleBtn: document.getElementById('start-battle-btn'),
    copyPrevBtn: document.getElementById('copy-prev-btn'),
    randomizeSlotBtn: document.getElementById('randomize-slot-btn'),
    exportTeamsBtn: document.getElementById('export-teams-btn'),
    resetStorageBtn: document.getElementById('reset-storage-btn'),
    battlePanel: document.getElementById('battle-panel'),
    backToBuilderBtn: document.getElementById('back-to-builder-btn'),
    restartBattleBtn: document.getElementById('restart-battle-btn'),
    battleP1Name: document.getElementById('battle-p1-name'),
    battleP2Name: document.getElementById('battle-p2-name'),
    battleP1Turn: document.getElementById('battle-p1-turn'),
    battleP2Turn: document.getElementById('battle-p2-turn'),
    battleSideP1: document.getElementById('battle-side-p1'),
    battleSideP2: document.getElementById('battle-side-p2'),
    battleTeamP1: document.getElementById('battle-team-p1'),
    battleTeamP2: document.getElementById('battle-team-p2'),
    choiceP1: document.getElementById('choice-p1'),
    choiceP2: document.getElementById('choice-p2'),
    choiceP1Status: document.getElementById('choice-p1-status'),
    choiceP2Status: document.getElementById('choice-p2-status'),
    choiceP1Title: document.getElementById('choice-p1-title'),
    choiceP2Title: document.getElementById('choice-p2-title'),
    turnNumber: document.getElementById('turn-number'),
    battleLog: document.getElementById('battle-log'),
    pendingChoices: document.getElementById('pending-choices'),
    clearLogBtn: document.getElementById('clear-log-btn'),
    speciesList: document.getElementById('species-list'),
    itemList: document.getElementById('item-list'),
    moveList: document.getElementById('move-list'),
    browseSpeciesBtn: document.getElementById('browse-species-btn'),
    browseMoveBtns: [0,1,2,3].map(i => document.getElementById(`browse-move${i + 1}-btn`)),
    pickerModal: document.getElementById('picker-modal'),
    pickerTitle: document.getElementById('picker-title'),
    pickerSearch: document.getElementById('picker-search'),
    pickerList: document.getElementById('picker-list'),
    pickerEmpty: document.getElementById('picker-empty'),
    pickerCloseBtn: document.getElementById('picker-close-btn'),
  });
}
function buildStaticLists() {
  setDatalistOptions(els.speciesList, state.speciesChoices);
  const dexItems = state.dex
    ? state.dex.items.all().filter(item => isDexSupported(item)).map(item => item.name)
    : [];
  const allItems = Array.from(new Set([...commonItems, ...dexItems, ...(state.manifest.items || []).map(humanizeSpriteId)])).sort((a, b) => a.localeCompare(b));
  state.itemChoices = allItems.map(item => makeChoice('items', item));
  setDatalistOptions(els.itemList, state.itemChoices);
  state.allMoveChoices = moveNameCache.map(name => makeChoice('moves', name));
  setDatalistOptions(els.moveList, state.allMoveChoices);
  els.natureSelect.innerHTML = natureOrder.map(name => `<option value="${name}">${displayNatureName(name)}</option>`).join('\n');
  els.teraSelect.innerHTML = TYPES.map(type => `<option value="${type}">${displayType(type)}</option>`).join('\n');
}
function renderItemIcon(itemName) {
  if (!els.itemIcon) return;
  els.itemIcon.innerHTML = '';
  const url = itemIconPath(itemName);
  if (!url || !itemName) {
    els.itemIcon.textContent = '—';
    return;
  }
  const img = document.createElement('img');
  img.src = url;
  img.alt = displayItemName(itemName);
  img.loading = 'lazy';
  img.onerror = () => {
    els.itemIcon.textContent = '—';
  };
  els.itemIcon.appendChild(img);
}
function renderEditorFlags(mon) {
  if (!els.editorFlags) return;
  const flags = [];
  if (mon.shiny) flags.push('색이 다른 포켓몬 / Shiny');
  if (mon.gender === 'M') flags.push(displayGender('M'));
  if (mon.gender === 'F') flags.push(displayGender('F'));
  if (mon.gender === 'N') flags.push(displayGender('N'));
  flags.push(`레벨 / Level ${mon.level || 100}`);
  if (mon.teraType) flags.push(`테라 / Tera ${displayType(mon.teraType)}`);
  els.editorFlags.innerHTML = flags.map(flag => `<span class="flag-chip">${flag}</span>`).join('\n');
}
function createStatInputs(gridEl, prefix, values, onChange) {
  gridEl.innerHTML = '';
  for (const stat of statOrder) {
    const wrap = document.createElement('label');
    wrap.className = 'stat-input';
    wrap.innerHTML = `<span>${statLabels[stat]}</span>`;
    const input = document.createElement('input');
    input.type = 'number';
    input.min = prefix === 'ev' ? 0 : 0;
    input.max = prefix === 'ev' ? 252 : 31;
    input.value = values[stat];
    input.addEventListener('input', () => onChange(stat, Number(input.value)));
    wrap.appendChild(input);
    gridEl.appendChild(wrap);
  }
}
function getSelectedMon() {
  return state.teams[state.selected.player][state.selected.slot];
}
function syncPlayerNames() {
  state.playerNames = [els.player1Name.value.trim() || 'Player 1', els.player2Name.value.trim() || 'Player 2'];
  els.rosterP1Name.textContent = state.playerNames[0];
  els.rosterP2Name.textContent = state.playerNames[1];
  els.battleP1Name.textContent = state.playerNames[0];
  els.battleP2Name.textContent = state.playerNames[1];
  saveState();
}
function renderRoster() {
  [els.rosterP1, els.rosterP2].forEach((container, player) => {
    container.innerHTML = '';
    state.teams[player].forEach((mon, slot) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `slot-btn ${state.selected.player === player && state.selected.slot === slot ? 'active' : ''}`;
      button.addEventListener('click', () => {
        state.selected = {player, slot};
        renderAll();
      });
      const sprite = document.createElement('div');
      button.appendChild(sprite);
      renderAnimatedSprite(sprite, {spriteId: mon.spriteId, facing: 'front', shiny: mon.shiny, size: 'small'});
      const meta = document.createElement('div');
      meta.className = 'slot-meta';
      const species = displaySpeciesName(mon.data?.name || mon.displaySpecies || mon.species) || `슬롯 / Slot ${slot + 1}`;
      const moveCount = mon.moves.filter(Boolean).length;
      const title = mon.nickname?.trim() || species;
      const abilityLabel = mon.ability ? displayAbilityName(mon.ability) : '특성 없음 / No ability';
      const subline = mon.nickname?.trim()
        ? `${species} · ${abilityLabel} · 기술 / Moves ${moveCount}/4`
        : `${abilityLabel} · 기술 / Moves ${moveCount}/4`;
      meta.innerHTML = `<div class="slot-name">${title}</div><div class="slot-sub">${subline}</div>`;
      button.appendChild(meta);
      container.appendChild(button);
    });
  });
  els.teamSizeNote.textContent = `각 플레이어는 포켓몬 ${state.teamSize}마리를 만든다. / Each player builds ${state.teamSize} Pokémon.`;
  els.heroModeLabel.textContent = state.mode === 'singles' ? '싱글 / Singles · 3마리 / 3 Pokémon' : '더블 / Doubles · 4마리 / 4 Pokémon';
}
function implementedAbilityNote(name) {
  const id = slugify(name);
  if (!id) return '포켓몬을 선택하면 특성을 고를 수 있습니다. / Select one of the Pokémon’s native abilities.';
  if (implementedAbilities.has(id)) return `${displayAbilityName(name)} 특성은 현재 전투에서 구현되어 있습니다. / ${name} is implemented in battle.`;
  return `${displayAbilityName(name)} 특성은 저장되고 표시되지만, 고유 발동 로직은 아직 완전하지 않습니다. / ${name} is stored and shown in battle, but its custom triggers are not fully implemented yet.`;
}
function implementedItemNote(name) {
  const id = slugify(name);
  if (!id) return '지닌 도구가 없습니다. / No held item selected.';
  if (implementedItems.has(id)) return `${displayItemName(name)} 도구는 현재 배틀 효과가 구현되어 있습니다. / ${name} has a battle effect in this build.`;
  return `${displayItemName(name)} 도구는 아이콘과 함께 표시되지만, 배틀 효과는 아직 완전하지 않습니다. / ${name} is shown with its icon, but its battle effect is not fully implemented yet.`;
}
async function hydrateSelectedSpecies() {
  const mon = getSelectedMon();
  const normalizedSpecies = normalizeLocalizedInput('species', mon.species || mon.displaySpecies, state.speciesChoices);
  if (normalizedSpecies) mon.species = normalizedSpecies;
  const spriteId = getBaseSpriteId(mon.species || mon.displaySpecies);
  if (!spriteId) {
    mon.data = null;
    mon.displaySpecies = mon.species || '';
    mon.spriteId = '';
    mon.ability = '';
    mon.moves = mon.moves || ['', '', '', ''];
    if (!mon.teraType) mon.teraType = 'normal';
    if (els.speciesStatus) els.speciesStatus.textContent = mon.species
      ? '업로드된 스프라이트와 일치하는 포켓몬이 없습니다. / No uploaded sprite matched that species name.'
      : '포켓몬을 선택하면 로컬 전투 데이터를 불러옵니다. / Choose a species to load local battle data.';
    saveState();
    renderAll();
    return;
  }
  mon.spriteId = spriteId;
  mon.displaySpecies = humanizeSpriteId(spriteId);
  if (els.speciesStatus) els.speciesStatus.textContent = '로컬 전투 데이터에서 포켓몬 정보를 불러오는 중… / Loading species data from local battle data…';
  try {
    const data = await getSpeciesData(mon.displaySpecies);
    mon.data = data;
    mon.species = data.name;
    mon.displaySpecies = data.name;
    if (!mon.ability || !data.abilities.includes(mon.ability)) mon.ability = data.abilities[0] || '';
    if (!mon.teraType) mon.teraType = data.types[0] || 'normal';
    rebuildMoveDatalist(mon);
    if (els.speciesStatus) els.speciesStatus.textContent = `${displaySpeciesName(data.name)} 불러옴 · ${data.types.map(displayType).join(' · ')}`;
  } catch (error) {
    mon.data = null;
    if (els.speciesStatus) els.speciesStatus.textContent = '로컬 전투 데이터에서 포켓몬 정보를 불러오지 못했습니다. / Species data could not be loaded from local battle data.';
  }
  saveState();
  renderAll();
}
function renderEditor() {
  const mon = getSelectedMon();
  rebuildMoveDatalist(mon);
  const displayName = mon.nickname?.trim() || displaySpeciesName(mon.displaySpecies || mon.species) || '포켓몬 미선택 / No species selected';
  els.editorTitle.textContent = `${state.playerNames[state.selected.player]} · 슬롯 / Slot ${state.selected.slot + 1}`;
  els.editorSubtitle.textContent = '포켓몬, 기술, 능력치, 지닌 도구, 성격, 특성, 테라 타입을 설정하세요. / Set species, moves, stats, item, nature, ability, and tera type.';
  els.speciesInput.value = displaySpeciesName(mon.displaySpecies || mon.species || '');
  if (els.nicknameInput) els.nicknameInput.value = mon.nickname || '';
  els.itemInput.value = displayItemName(mon.item || '');
  els.levelInput.value = mon.level;
  els.natureSelect.value = mon.nature || 'Jolly';
  if (els.genderSelect) els.genderSelect.value = mon.gender || '';
  els.teraSelect.value = mon.teraType || 'normal';
  els.shinyCheckbox.checked = Boolean(mon.shiny);
  els.moveInputs.forEach((input, idx) => input.value = displayMoveName(mon.moves[idx] || ''));
  els.editorSpeciesName.textContent = displayName;
  els.editorTypeRow.innerHTML = '';
  (mon.data?.types || []).forEach(type => els.editorTypeRow.appendChild(createTypePill(type)));
  renderEditorFlags(mon);
  renderItemIcon(mon.item);
  if (els.speciesStatus) {
    if (mon.data?.types?.length) els.speciesStatus.textContent = `${displaySpeciesName(mon.data.name)} 불러옴 · ${mon.data.types.map(displayType).join(' · ')}`;
    else if (mon.spriteId) els.speciesStatus.textContent = '로컬 전투 데이터에서 포켓몬 정보를 불러오지 못했습니다. / Species data could not be loaded from local battle data.';
    else if (mon.species || mon.displaySpecies) els.speciesStatus.textContent = '업로드된 스프라이트와 일치하는 포켓몬이 없습니다. / No uploaded sprite matched that species name.';
    else els.speciesStatus.textContent = '포켓몬을 선택하면 로컬 전투 데이터를 불러옵니다. / Choose a species to load local battle data.';
  }
  els.editorAbilityNote.textContent = mon.ability ? implementedAbilityNote(mon.ability) : '포켓몬을 선택하면 특성 목록이 로드됩니다. / Select a species to load its ability list.';
  els.editorAbilityEffect.textContent = implementedItemNote(mon.item);
  els.abilitySelect.innerHTML = (mon.data?.abilities || []).map(name => `<option value="${name}">${displayAbilityName(name)}</option>`).join('') || '<option value="">특성 없음 / No abilities loaded</option>';
  els.abilitySelect.value = mon.ability || '';
  renderAnimatedSprite(els.editorSprite, {spriteId: mon.spriteId, facing: 'front', shiny: mon.shiny, size: 'large'});
  createStatInputs(els.evGrid, 'ev', mon.evs, (stat, value) => {
    mon.evs[stat] = clamp(Number.isFinite(value) ? value : 0, 0, 252);
    renderEditor();
    saveState();
    renderValidation();
  });
  createStatInputs(els.ivGrid, 'iv', mon.ivs, (stat, value) => {
    mon.ivs[stat] = clamp(Number.isFinite(value) ? value : 31, 0, 31);
    renderEditor();
    saveState();
    renderValidation();
  });
  const evTotal = Object.values(mon.evs).reduce((sum, value) => sum + Number(value || 0), 0);
  els.evTotal.textContent = `합계 / Total: ${evTotal} / 510`;
}
async function validateMon(mon, playerIndex, slotIndex) {
  const errors = [];
  const warnings = [];
  const prefix = `${state.playerNames[playerIndex]} 슬롯 / Slot ${slotIndex + 1}`;
  const speciesLabel = displaySpeciesName(mon.data?.name || mon.displaySpecies || mon.species || '');
  const itemLabel = displayItemName(mon.item || '');
  const abilityLabel = displayAbilityName(mon.ability || '');

  if (!mon.displaySpecies && !mon.species) errors.push(`${prefix}: 포켓몬을 선택하세요. / choose a Pokémon.`);
  if (!mon.spriteId) errors.push(`${prefix}: 업로드된 스프라이트와 일치하는 포켓몬이어야 합니다. / species must match an available uploaded sprite.`);
  if (!mon.data) errors.push(`${prefix}: 포켓몬 데이터가 아직 없습니다. / species data is still missing.`);

  const evTotal = Object.values(mon.evs).reduce((sum, value) => sum + Number(value || 0), 0);
  if (evTotal > 510) errors.push(`${prefix}: EV 총합은 510을 넘을 수 없습니다. / EV total exceeds 510.`);
  for (const stat of statOrder) {
    const ev = Number(mon.evs[stat] ?? 0);
    const iv = Number(mon.ivs[stat] ?? 31);
    if (!Number.isInteger(ev)) errors.push(`${prefix}: ${statLabels[stat]} EV는 정수여야 합니다. / ${statLabels[stat]} EV must be an integer.`);
    if (!Number.isInteger(iv)) errors.push(`${prefix}: ${statLabels[stat]} IV는 정수여야 합니다. / ${statLabels[stat]} IV must be an integer.`);
    if (ev > 252 || ev < 0) errors.push(`${prefix}: ${statLabels[stat]} EV는 0~252 범위여야 합니다. / ${statLabels[stat]} EV must stay between 0 and 252.`);
    if (iv > 31 || iv < 0) errors.push(`${prefix}: ${statLabels[stat]} IV는 0~31 범위여야 합니다. / ${statLabels[stat]} IV must stay between 0 and 31.`);
  }

  if (!Number.isInteger(Number(mon.level || 0)) || mon.level < 1 || mon.level > 100) errors.push(`${prefix}: 레벨은 1~100 사이여야 합니다. / level must stay between 1 and 100.`);
  if (!natures[mon.nature]) errors.push(`${prefix}: ${displayNatureName(mon.nature || 'Blank')} 성격은 유효하지 않습니다. / ${mon.nature || 'Blank'} is not a valid nature.`);
  if (!TYPES.includes(toId(mon.teraType))) errors.push(`${prefix}: ${displayType(mon.teraType || 'Blank')} 테라 타입은 유효하지 않습니다. / ${mon.teraType || 'Blank'} is not a valid Tera type.`);

  if (!mon.ability) errors.push(`${prefix}: 특성을 선택하세요. / choose an ability.`);
  if (mon.data?.abilities?.length && mon.ability && !mon.data.abilities.includes(mon.ability)) errors.push(`${prefix}: ${abilityLabel} 특성은 ${speciesLabel}의 유효한 특성이 아닙니다. / ${mon.ability} is not a valid ability for ${mon.data.name}.`);
  validateGenderChoice(mon, prefix, errors);

  if (mon.data) {
    if (mon.data.isNonstandard && !isAllowedNonstandard(mon.data.isNonstandard)) {
      errors.push(`${prefix}: ${speciesLabel} ${explainNonstandard(mon.data.isNonstandard)}`);
    }
    if (mon.data.battleOnly) {
      errors.push(`${prefix}: ${speciesLabel}은(는) 전투 중 전용 폼입니다. / ${mon.data.name} is a battle-only form. ${displaySpeciesName(mon.data.battleOnly)} 또는 기본 폼을 팀 편집기에서 사용하세요. / Use ${mon.data.battleOnly} or its base form in the builder until form-change logic is added.`);
    }
    const requiredItems = [mon.data.requiredItem, ...(mon.data.requiredItems || [])].filter(Boolean);
    if (requiredItems.length && !matchesListedName(mon.item, requiredItems)) {
      errors.push(`${prefix}: ${speciesLabel}은(는) ${joinReadableList(requiredItems, displayItemName)} 도구가 필요합니다. / ${mon.data.name} requires ${joinReadableList(requiredItems)}.`);
    }
    if (mon.data.requiredMove && !mon.moves.some(move => toId(move) === toId(mon.data.requiredMove))) {
      errors.push(`${prefix}: ${speciesLabel}은(는) ${displayMoveName(mon.data.requiredMove)} 기술이 필요합니다. / ${mon.data.name} requires ${mon.data.requiredMove} in its moveset.`);
    }
    if (mon.data.requiredAbility && toId(mon.ability) !== toId(mon.data.requiredAbility)) {
      errors.push(`${prefix}: ${speciesLabel}은(는) ${displayAbilityName(mon.data.requiredAbility)} 특성이 필요합니다. / ${mon.data.name} requires the ability ${mon.data.requiredAbility}.`);
    }
    if (mon.data.requiredTeraType && toId(mon.teraType) !== toId(mon.data.requiredTeraType)) {
      errors.push(`${prefix}: ${speciesLabel}은(는) ${displayType(mon.data.requiredTeraType)} 테라 타입이 필요합니다. / ${mon.data.name} requires Tera type ${titleCase(mon.data.requiredTeraType)}.`);
    }
    if (requiredItems.length || mon.data.requiredMove || mon.data.requiredAbility || mon.data.requiredTeraType) {
      warnings.push(`${prefix}: ${speciesLabel}은(는) 조건부 폼입니다. / ${mon.data.name} is a condition-based form. 이 빌드는 선택된 폼을 직접 저장하지만 전투 중 변신 연출은 아직 없습니다. / This build stores the chosen form directly and does not yet animate mid-battle transformations.`);
    }
  }

  if (state.dex && mon.item) {
    const item = state.dex.items.get(mon.item);
    if (!item?.exists) errors.push(`${prefix}: ${itemLabel} 도구는 유효하지 않습니다. / ${mon.item} is not a valid item.`);
    else if (!isAllowedNonstandard(item.isNonstandard)) errors.push(`${prefix}: ${displayItemName(item.name)} ${explainNonstandard(item.isNonstandard)}`);
    else if (!implementedItems.has(slugify(item.name))) warnings.push(`${prefix}: ${displayItemName(item.name)} 도구는 빌더에서는 합법이지만 현재 전투 엔진에서 특수 효과가 완전히 구현되지 않았습니다. / ${item.name} is legal in the builder, but its special battle behavior is not fully implemented in the current custom runtime.`);
  }

  if (state.dex && mon.ability) {
    const ability = state.dex.abilities.get(mon.ability);
    if (!ability?.exists) errors.push(`${prefix}: ${abilityLabel} 특성은 유효하지 않습니다. / ${mon.ability} is not a valid ability.`);
    else if (!isAllowedNonstandard(ability.isNonstandard)) errors.push(`${prefix}: ${displayAbilityName(ability.name)} ${explainNonstandard(ability.isNonstandard)}`);
    else if (!implementedAbilities.has(slugify(ability.name))) warnings.push(`${prefix}: ${displayAbilityName(ability.name)} 특성은 빌더에서는 합법이지만 현재 전투 엔진에서 발동 로직이 완전히 구현되지 않았습니다. / ${ability.name} is legal in the builder, but its full triggered behavior is not implemented in the current custom runtime.`);
  }

  const chosenMoves = mon.moves.filter(Boolean);
  if (chosenMoves.length !== 4) errors.push(`${prefix}: 기술은 정확히 4개여야 합니다. / pick exactly four moves.`);
  const moveIds = chosenMoves.map(toId);
  if (new Set(moveIds).size !== moveIds.length) errors.push(`${prefix}: 중복 기술은 허용되지 않습니다. / duplicate moves are not allowed.`);
  const learnsetIds = new Set(mon.data?.learnset || []);
  const learnsetSources = mon.data?.learnsetSources || {};
  for (const move of chosenMoves) {
    try {
      const loadedMove = await getMoveData(move);
      const moveId = toId(loadedMove.apiName || loadedMove.name);
      if (loadedMove.isZ || loadedMove.isMax) {
        errors.push(`${prefix}: ${displayMoveName(loadedMove.name)} 기술은 전투 중 생성되는 특수 기술이므로 기본 기술칸에 넣을 수 없습니다. / ${loadedMove.name} is battle-generated special move content and should not be selected as a base moveslot.`);
      }
      if (!isAllowedNonstandard(loadedMove.isNonstandard)) {
        errors.push(`${prefix}: ${displayMoveName(loadedMove.name)} ${explainNonstandard(loadedMove.isNonstandard)}`);
      }
      if (state.dex && learnsetIds.size && !learnsetIds.has(moveId)) {
        errors.push(`${prefix}: ${displayMoveName(loadedMove.name)} 기술은 ${speciesLabel}의 로컬 learnset에 없습니다. / ${loadedMove.name} is not in ${mon.data?.name || mon.displaySpecies}'s loaded learnset.`);
      } else {
        const sourceInfo = summarizeLearnsetSources(learnsetSources[moveId]);
        if (sourceInfo.eventOnly) warnings.push(`${prefix}: ${displayMoveName(loadedMove.name)} 기술은 로컬 learnset 기준 이벤트 전용으로 보입니다. / ${loadedMove.name} appears event-only in the loaded learnset sources. 정확한 이벤트/출처 조합 검증은 아직 구현되지 않았습니다. / Exact event/source compatibility is not modeled yet.`);
        else if (sourceInfo.legacyOnly) warnings.push(`${prefix}: ${displayMoveName(loadedMove.name)} 기술은 구세대 출처만 확인됩니다. / ${loadedMove.name} only appears through older-generation learnset sources. 세대 이동/출처 호환성 검증은 아직 구현되지 않았습니다. / Transfer/source compatibility is not modeled yet.`);
      }
    } catch (error) {
      errors.push(`${prefix}: 기술 ${displayMoveName(move)} 정보를 불러오지 못했습니다. / move “${move}” could not be loaded.`);
    }
  }
  return {errors, warnings};
}

async function rehydrateTeams() {
  for (const team of state.teams) {
    for (const mon of team) {
      if (!mon.species && !mon.displaySpecies) continue;
      const spriteId = getBaseSpriteId(mon.species || mon.displaySpecies);
      if (!spriteId) continue;
      mon.spriteId = spriteId;
      mon.displaySpecies = humanizeSpriteId(spriteId);
      try {
        const data = await getSpeciesData(mon.displaySpecies);
        mon.data = data;
        if (!mon.ability || !data.abilities.includes(mon.ability)) mon.ability = data.abilities[0] || '';
        if (!mon.teraType) mon.teraType = data.types[0] || 'normal';
      } catch (error) {
        mon.data = null;
      }
    }
  }
}

async function renderValidation() {
  const allErrors = [];
  const allWarnings = [];
  for (const [playerIndex, team] of state.teams.entries()) {
    for (const [slotIndex, mon] of team.entries()) {
      const result = await validateMon(mon, playerIndex, slotIndex);
      allErrors.push(...result.errors);
      allWarnings.push(...result.warnings);
    }
    allWarnings.push(...collectTeamWarnings(team, playerIndex));
  }
  state.builderErrors = allErrors;
  state.builderWarnings = Array.from(new Set(allWarnings));
  if (allErrors.length) {
    els.builderErrors.classList.remove('hidden');
    els.builderErrors.textContent = allErrors.join('\n');
    els.validationSummary.textContent = `배틀 시작 전 해결할 문제 ${allErrors.length}개가 남아 있습니다. / ${allErrors.length} issue${allErrors.length === 1 ? '' : 's'} remaining before battle can start.${state.builderWarnings.length ? ` 경고 / warning ${state.builderWarnings.length}개도 함께 확인하세요. / ${state.builderWarnings.length} warning${state.builderWarnings.length === 1 ? '' : 's'} also noted.` : ''}`;
    els.startBattleBtn.disabled = true;
  } else {
    els.builderErrors.classList.add('hidden');
    els.builderErrors.textContent = '';
    els.validationSummary.textContent = state.builderWarnings.length
      ? `팀이 기본 검증을 통과했습니다. / Teams pass validation. 고급 출처/엔진 제한 관련 경고 ${state.builderWarnings.length}개가 있습니다. / ${state.builderWarnings.length} warning${state.builderWarnings.length === 1 ? '' : 's'} note advanced source/runtime limits.`
      : '양쪽 팀이 유효합니다. / Both teams are valid. 배틀을 시작할 수 있습니다. / Battle start is ready.';
    els.startBattleBtn.disabled = false;
  }

  if (els.builderWarnings) {
    if (state.builderWarnings.length) {
      els.builderWarnings.classList.remove('hidden');
      els.builderWarnings.textContent = state.builderWarnings.join('\n');
    } else {
      els.builderWarnings.classList.add('hidden');
      els.builderWarnings.textContent = '';
    }
  }
}
function wireEditorEvents() {
  els.modeSinglesBtn.addEventListener('click', () => {
    state.mode = 'singles';
    rebuildTeamSize();
    renderAll();
    saveState();
  });
  els.modeDoublesBtn.addEventListener('click', () => {
    state.mode = 'doubles';
    rebuildTeamSize();
    renderAll();
    saveState();
  });
  els.player1Name.addEventListener('input', syncPlayerNames);
  els.player2Name.addEventListener('input', syncPlayerNames);
  els.speciesInput.addEventListener('change', async () => {
    const mon = getSelectedMon();
    const normalized = normalizeLocalizedInput('species', els.speciesInput.value.trim(), state.speciesChoices);
    mon.species = normalized || els.speciesInput.value.trim();
    mon.displaySpecies = mon.species;
    await hydrateSelectedSpecies();
    await renderValidation();
  });
  els.browseSpeciesBtn?.addEventListener('click', () => showPicker('species'));
  els.nicknameInput?.addEventListener('input', () => {
    const mon = getSelectedMon();
    mon.nickname = els.nicknameInput.value.trim();
    renderEditor();
    renderRoster();
    saveState();
  });
  els.abilitySelect.addEventListener('change', () => {
    const mon = getSelectedMon();
    mon.ability = els.abilitySelect.value;
    renderEditor();
    saveState();
    renderValidation();
  });
  els.natureSelect.addEventListener('change', () => {
    const mon = getSelectedMon();
    mon.nature = els.natureSelect.value;
    renderEditor();
    saveState();
    renderValidation();
  });
  els.genderSelect?.addEventListener('change', () => {
    const mon = getSelectedMon();
    mon.gender = els.genderSelect.value;
    renderEditor();
    saveState();
    renderValidation();
  });
  els.itemInput.addEventListener('change', () => {
    const mon = getSelectedMon();
    mon.item = normalizeLocalizedInput('items', els.itemInput.value.trim(), state.itemChoices || []) || els.itemInput.value.trim();
    renderEditor();
    saveState();
    renderValidation();
  });
  els.levelInput.addEventListener('input', () => {
    const mon = getSelectedMon();
    mon.level = clamp(Number(els.levelInput.value || 100), 1, 100);
    renderEditor();
    saveState();
    renderValidation();
  });
  els.teraSelect.addEventListener('change', () => {
    const mon = getSelectedMon();
    mon.teraType = els.teraSelect.value;
    renderEditor();
    saveState();
    renderValidation();
  });
  els.shinyCheckbox.addEventListener('change', () => {
    const mon = getSelectedMon();
    mon.shiny = els.shinyCheckbox.checked;
    renderEditor();
    renderRoster();
    saveState();
  });
  els.moveInputs.forEach((input, idx) => {
    input.addEventListener('change', async () => {
      const mon = getSelectedMon();
      const moveChoices = [...getCurrentMoveChoices(mon), ...(state.allMoveChoices || [])];
      mon.moves[idx] = normalizeLocalizedInput('moves', input.value.trim(), moveChoices) || input.value.trim();
      saveState();
      renderEditor();
      await renderValidation();
    });
  });
  els.browseMoveBtns?.forEach((btn, idx) => btn.addEventListener('click', () => showPicker('move', idx)));
  els.pickerCloseBtn?.addEventListener('click', hidePicker);
  els.pickerModal?.addEventListener('click', (event) => {
    if (event.target === els.pickerModal) hidePicker();
  });
  els.pickerSearch?.addEventListener('input', renderPickerOptions);
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !els.pickerModal?.classList.contains('hidden')) hidePicker();
  });
  els.copyPrevBtn.addEventListener('click', () => {
    if (state.selected.slot === 0) return;
    const source = deepClone(state.teams[state.selected.player][state.selected.slot - 1]);
    source.data = state.teams[state.selected.player][state.selected.slot - 1].data;
    state.teams[state.selected.player][state.selected.slot] = source;
    renderAll();
    saveState();
  });
  els.randomizeSlotBtn.addEventListener('click', async () => {
    const mon = getSelectedMon();
    const candidates = [...state.speciesChoices];
    for (let i = candidates.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
    }
    const picked = candidates.find(choice => getBaseSpriteId(choice.english)) || candidates[0];
    if (!picked) return;
    mon.species = picked.english;
    mon.displaySpecies = picked.english;
    mon.item = commonItems[Math.floor(Math.random() * commonItems.length)] || '';
    mon.nature = natureOrder[Math.floor(Math.random() * natureOrder.length)] || mon.nature;
    mon.gender = '';
    mon.shiny = Math.random() < 0.1;
    mon.nickname = '';
    mon.level = 100;
    await hydrateSelectedSpecies();
    if (mon.data?.abilities?.length) {
      mon.ability = mon.data.abilities[Math.floor(Math.random() * mon.data.abilities.length)] || mon.data.abilities[0] || '';
    }
    const movePool = getCurrentMoveChoices(mon).map(choice => choice.english);
    const uniqueMoves = [];
    const shuffledMoves = [...movePool];
    for (let i = shuffledMoves.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledMoves[i], shuffledMoves[j]] = [shuffledMoves[j], shuffledMoves[i]];
    }
    for (const moveName of shuffledMoves) {
      if (!uniqueMoves.includes(moveName)) uniqueMoves.push(moveName);
      if (uniqueMoves.length === 4) break;
    }
    mon.moves = Array.from({length: 4}, (_, idx) => uniqueMoves[idx] || '');
    if (!mon.teraType) mon.teraType = mon.data?.types?.[0] || 'normal';
    renderEditor();
    await renderValidation();
    saveState();
  });
  els.exportTeamsBtn.addEventListener('click', () => {
    const lines = state.teams.flatMap((team, player) => team.map((mon, slot) => {
      const stats = calcStats(mon);
      const headerSpecies = displaySpeciesName(mon.displaySpecies || mon.species);
      const headerName = mon.nickname?.trim() ? `${mon.nickname} (${headerSpecies})` : headerSpecies;
      const extraTags = [displayGender(mon.gender || ''), mon.shiny ? '이로치 / Shiny' : ''].filter(Boolean).join(' · ');
      const rows = [
        `${state.playerNames[player]} - 슬롯 / Slot ${slot + 1}`,
        `${headerName} @ ${displayItemName(mon.item || 'No Item')}`,
        `특성 / Ability: ${displayAbilityName(mon.ability)}`,
        `레벨 / Level: ${mon.level}${extraTags ? ` · ${extraTags}` : ''}`,
        `테라 타입 / Tera Type: ${displayType(mon.teraType || 'normal')}`,
        `${displayNatureName(mon.nature)} 성격 / Nature`,
        `EVs: ${statOrder.map(stat => `${mon.evs[stat]} ${statLabels[stat]}`).join(' / ')}`,
        `IVs: ${statOrder.map(stat => `${mon.ivs[stat]} ${statLabels[stat]}`).join(' / ')}`,
        `능력치 / Stats: ${stats ? statOrder.map(stat => `${statLabels[stat]} ${stats[stat]}`).join(' / ') : '계산 대기 / pending'}`,
        ...mon.moves.map(move => `- ${displayMoveName(move)}`),
        '',
      ];
      return rows.join('\n');
    }));
    navigator.clipboard.writeText(lines.join('\n'));
    els.validationSummary.textContent = '팀을 클립보드로 복사했습니다. / Teams exported to your clipboard.';
  });
  els.resetStorageBtn.addEventListener('click', () => {
    localStorage.removeItem(STORAGE_KEY);
    state.mode = 'singles';
    state.playerNames = ['Player 1','Player 2'];
    els.player1Name.value = 'Player 1';
    els.player2Name.value = 'Player 2';
    rebuildTeamSize();
    resetTeams();
    renderAll();
  });
}

function buildBattleMon(mon, player, slot) {
  const stats = calcStats(mon);
  return {
    id: `${player}-${slot}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    player,
    slot,
    species: mon.displaySpecies || mon.species,
    nickname: mon.nickname || '',
    gender: mon.gender || '',
    spriteId: mon.spriteId,
    shiny: mon.shiny,
    level: mon.level,
    nature: mon.nature,
    item: mon.item,
    ability: mon.ability,
    teraType: mon.teraType,
    moves: deepClone(mon.moves),
    types: deepClone(mon.data.types),
    originalTypes: deepClone(mon.data.types),
    stats,
    maxHp: stats.hp,
    hp: stats.hp,
    boosts: {atk:0,def:0,spa:0,spd:0,spe:0},
    status: '',
    sleepTurns: 0,
    toxicCounter: 0,
    protect: false,
    fainted: false,
    teraUsed: false,
    volatile: {},
    originalData: mon.data,
  };
}
async function startBattle() {
  await renderValidation();
  if (state.builderErrors.length) return;
  state.battle = {
    mode: state.mode,
    turn: 1,
    winner: null,
    players: [0,1].map(player => ({
      name: state.playerNames[player],
      team: state.teams[player].map((mon, slot) => buildBattleMon(mon, player, slot)),
      active: state.mode === 'singles' ? [0] : [0,1],
      choices: {},
      mustSwitch: [],
    })),
    log: [{text: '배틀 시작! 양쪽 팀이 전장에 나왔습니다. / Battle started. Both teams enter the field.', tone: 'accent'}],
  };
  applyStartOfBattleAbilities();
  els.battlePanel.classList.remove('hidden');
  renderBattle();
}
function applyStartOfBattleAbilities() {
  const battle = state.battle;
  for (const side of battle.players) {
    for (const idx of side.active) {
      const mon = side.team[idx];
      if (!mon || mon.fainted) continue;
      if (slugify(mon.ability) === 'intimidate') {
        const foe = battle.players[1 - side.team[idx].player];
        foe.active.forEach(foeIdx => {
          const target = foe.team[foeIdx];
          if (target && !target.fainted && slugify(target.item) !== 'clear-amulet') {
            target.boosts.atk = clamp((target.boosts.atk || 0) - 1, -6, 6);
            addLog(`${mon.species}'s Intimidate lowers ${target.species}'s Attack.`, 'accent');
          }
        });
      }
    }
  }
}
function addLog(text, tone = '') {
  state.battle.log.unshift({text, tone});
}
function getActiveMons(player) {
  const side = state.battle.players[player];
  return side.active.map(idx => side.team[idx]).filter(Boolean);
}
function renderBattle() {
  const battle = state.battle;
  if (!battle) return;
  els.turnNumber.textContent = battle.turn;
  els.battleP1Name.textContent = battle.players[0].name;
  els.battleP2Name.textContent = battle.players[1].name;
  renderSideSprites(0, els.battleSideP1, 'back');
  renderSideSprites(1, els.battleSideP2, 'front');
  renderBattleTeam(0, els.battleTeamP1);
  renderBattleTeam(1, els.battleTeamP2);
  renderChoicePanel(0, els.choiceP1, els.choiceP1Status, els.choiceP1Title);
  renderChoicePanel(1, els.choiceP2, els.choiceP2Status, els.choiceP2Title);
  els.battleLog.innerHTML = battle.log.map(line => `<div class="log-line ${line.tone || ''}">${line.text}</div>`).join('\n');
  renderPendingChoices();
  const allSet = [0,1].every(player => isPlayerReady(player));
  els.battleP1Turn.className = `turn-chip ${isPlayerReady(0) ? 'done' : 'wait'}`;
  els.battleP2Turn.className = `turn-chip ${isPlayerReady(1) ? 'done' : 'wait'}`;
  els.battleP1Turn.textContent = isPlayerReady(0) ? '선택 완료 / Choice locked' : '선택 중 / Selecting';
  els.battleP2Turn.textContent = isPlayerReady(1) ? '선택 완료 / Choice locked' : '선택 중 / Selecting';
  if (allSet && !battle.winner) resolveTurn();
}
function renderSideSprites(player, container, facing) {
  container.innerHTML = '';
  getActiveMons(player).forEach(mon => {
    const holder = document.createElement('div');
    container.appendChild(holder);
    renderAnimatedSprite(holder, {spriteId: mon.spriteId, facing, shiny: mon.shiny, size: 'large'});
  });
}
function renderBattleTeam(player, container) {
  const side = state.battle.players[player];
  container.innerHTML = '';
  side.team.forEach((mon, index) => {
    const card = document.createElement('div');
    card.className = 'battle-team-card';
    const sprite = document.createElement('div');
    card.appendChild(sprite);
    renderAnimatedSprite(sprite, {spriteId: mon.spriteId, facing:'front', shiny: mon.shiny, size:'small'});
    const summary = document.createElement('div');
    summary.className = 'mon-summary';
    summary.innerHTML = `<div class="mon-name-line"><strong>${displaySpeciesName(mon.species)}</strong>${mon.status ? `<span class="status-badge">${getStatusIcon(mon.status) ? `<img src="${getStatusIcon(mon.status)}" alt="${mon.status}"/>` : ''}${displayStatus(mon.status)}</span>` : ''}</div>
      <div class="hp-bar"><div class="hp-fill ${hpFillClass(mon)}" style="width:${hpPercent(mon)}%"></div></div>
      <div class="mon-sub">HP ${mon.hp}/${mon.maxHp}${side.active.includes(index) ? ' · 전투 중 / Active' : ''}${mon.fainted ? ' · 기절 / Fainted' : ''}</div>`;
    card.appendChild(summary);
    container.appendChild(card);
  });
}
function switchOptionsFor(player, excludeActive = true) {
  const side = state.battle.players[player];
  return side.team.map((mon, index) => ({mon, index}))
    .filter(({mon, index}) => !mon.fainted && (!excludeActive || !side.active.includes(index)));
}
function targetOptionsFor(player, actionMonIndex, move) {
  const foe = state.battle.players[1 - player];
  const ally = state.battle.players[player];
  const options = [];
  if (move.target === 'single-opponent') {
    foe.active.forEach(index => {
      const mon = foe.team[index];
      if (mon && !mon.fainted) options.push({player: 1 - player, slot: index, label: mon.species});
    });
  } else if (move.target === 'ally') {
    ally.active.forEach(index => {
      if (index === actionMonIndex) return;
      const mon = ally.team[index];
      if (mon && !mon.fainted) options.push({player, slot:index, label: mon.species});
    });
  } else if (move.target === 'ally-or-self') {
    ally.active.forEach(index => {
      const mon = ally.team[index];
      if (mon && !mon.fainted) options.push({player, slot:index, label: mon.species});
    });
  }
  return options;
}
function ensureChoiceObjects(player) {
  const side = state.battle.players[player];
  side.active.forEach(activeIndex => {
    if (!side.choices[activeIndex]) side.choices[activeIndex] = {kind:'', move:'', target:null, switchTo:null, tera:false};
  });
}
function renderChoicePanel(player, container, statusEl, titleEl) {
  const side = state.battle.players[player];
  ensureChoiceObjects(player);
  titleEl.textContent = `${side.name} 선택 / Choice`;
  container.innerHTML = '';
  const mustSwitchCount = side.active.filter(index => side.team[index]?.fainted).length;
  statusEl.textContent = mustSwitchCount ? '기절한 전투 포켓몬의 교체 대상을 선택하세요. / Choose replacements for fainted active Pokémon.' : `행동 가능한 전투 포켓몬 ${side.active.length}마리 준비 완료. / ${side.active.length} active Pokémon ready to act.`;
  for (const activeIndex of side.active) {
    const mon = side.team[activeIndex];
    const section = document.createElement('div');
    section.className = 'choice-section';
    if (!mon || mon.fainted) {
      section.innerHTML = `<h4>교체 필요 / Replacement required</h4>`;
      const switchWrap = document.createElement('div');
      switchWrap.className = 'choice-buttons';
      switchOptionsFor(player, true).forEach(({mon: option, index}) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'choice-btn';
        btn.innerHTML = `<strong>${displaySpeciesName(option.species)}</strong><small>HP ${option.hp}/${option.maxHp}</small>`;
        btn.addEventListener('click', () => {
          side.choices[activeIndex] = {kind:'switch', switchTo:index};
          renderBattle();
        });
        switchWrap.appendChild(btn);
      });
      section.appendChild(switchWrap);
      container.appendChild(section);
      continue;
    }
    const choice = side.choices[activeIndex];
    section.innerHTML = `<h4>${displaySpeciesName(mon.species)}</h4>`;
    const moveButtons = document.createElement('div');
    moveButtons.className = 'choice-buttons';
    mon.moves.forEach(async (moveName) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `choice-btn ${choice.kind === 'move' && choice.move === moveName ? 'selected' : ''}`;
      btn.innerHTML = `<strong>${displayMoveName(moveName)}</strong><small>기술 데이터를 불러오는 중… / Loading move data…</small>`;
      moveButtons.appendChild(btn);
      try {
        const move = await getMoveData(moveName);
        btn.innerHTML = `<strong>${displayMoveName(move.name)}</strong><small>${displayType(move.type)} · ${move.category}${move.power ? ` · ${move.power} BP` : ''}${move.accuracy ? ` · ${move.accuracy}%` : ''}</small>`;
        btn.addEventListener('click', () => {
          side.choices[activeIndex] = {kind:'move', move: move.name, target: null, tera: choice.tera || false};
          renderBattle();
        });
      } catch (error) {
        btn.innerHTML = `<strong>${displayMoveName(moveName)}</strong><small>불러올 수 없음 / Unavailable</small>`;
      }
    });
    section.appendChild(moveButtons);

    const toggles = document.createElement('div');
    toggles.className = 'toggle-row';
    const teraBtn = document.createElement('button');
    teraBtn.type = 'button';
    teraBtn.className = `toggle-pill ${choice.tera ? 'active' : ''}`;
    teraBtn.textContent = `테라스탈 / Terastallize (${displayType(mon.teraType)})`;
    teraBtn.disabled = mon.teraUsed;
    teraBtn.addEventListener('click', () => {
      choice.tera = !choice.tera;
      renderBattle();
    });
    toggles.appendChild(teraBtn);
    const switchBtn = document.createElement('button');
    switchBtn.type = 'button';
    switchBtn.className = 'toggle-pill';
    switchBtn.textContent = '교체 / Switch';
    switchBtn.addEventListener('click', () => {
      side.choices[activeIndex] = {kind:'switch', switchTo:null};
      renderBattle();
    });
    toggles.appendChild(switchBtn);
    section.appendChild(toggles);

    if (choice.kind === 'move' && choice.move) {
      const helper = document.createElement('div');
      helper.className = 'small-note';
      helper.style.marginTop = '10px';
      helper.textContent = '기술 선택됨. / Move selected.';
      section.appendChild(helper);
      getMoveData(choice.move).then(move => {
        const options = targetOptionsFor(player, activeIndex, move);
        if (options.length > 1) {
          const grid = document.createElement('div');
          grid.className = 'target-grid';
          options.forEach(option => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = `target-btn ${choice.target?.player === option.player && choice.target?.slot === option.slot ? 'active' : ''}`;
            btn.textContent = displaySpeciesName(option.label);
            btn.addEventListener('click', () => {
              side.choices[activeIndex].target = {player: option.player, slot: option.slot};
              renderBattle();
            });
            grid.appendChild(btn);
          });
          section.appendChild(grid);
        } else if (options.length === 1 && !choice.target) {
          choice.target = {player: options[0].player, slot: options[0].slot};
        }
      });
    }

    if (choice.kind === 'switch') {
      const switchWrap = document.createElement('div');
      switchWrap.className = 'choice-buttons';
      switchOptionsFor(player, true).forEach(({mon: option, index}) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = `choice-btn ${choice.switchTo === index ? 'selected' : ''}`;
        btn.innerHTML = `<strong>${displaySpeciesName(option.species)}</strong><small>HP ${option.hp}/${option.maxHp}</small>`;
        btn.addEventListener('click', () => {
          side.choices[activeIndex] = {kind:'switch', switchTo:index};
          renderBattle();
        });
        switchWrap.appendChild(btn);
      });
      section.appendChild(switchWrap);
    }

    container.appendChild(section);
  }
}
function isChoiceComplete(player, activeIndex) {
  const side = state.battle.players[player];
  const mon = side.team[activeIndex];
  const choice = side.choices[activeIndex];
  if (!choice) return false;
  if (!mon || mon.fainted) return choice.kind === 'switch' && Number.isInteger(choice.switchTo);
  if (choice.kind === 'switch') return Number.isInteger(choice.switchTo);
  if (choice.kind === 'move') {
    const move = moveDataCache.get(slugify(choice.move));
    if (!move) return false;
    const options = targetOptionsFor(player, activeIndex, move);
    if (options.length > 1) return Boolean(choice.target);
    return true;
  }
  return false;
}
function isPlayerReady(player) {
  const side = state.battle.players[player];
  return side.active.every(activeIndex => isChoiceComplete(player, activeIndex));
}
function renderPendingChoices() {
  const battle = state.battle;
  const rows = [];
  battle.players.forEach((side, player) => {
    side.active.forEach(activeIndex => {
      const mon = side.team[activeIndex];
      const choice = side.choices[activeIndex];
      let text = '대기 중 / Pending';
      if (choice?.kind === 'switch' && Number.isInteger(choice.switchTo)) text = `교체 / Switch → ${displaySpeciesName(side.team[choice.switchTo].species)}`;
      if (choice?.kind === 'move') text = choice.target ? `${displayMoveName(choice.move)} → ${displaySpeciesName(battle.players[choice.target.player].team[choice.target.slot].species)}` : displayMoveName(choice.move);
      rows.push(`<div class="pending-card"><strong>${mon ? displaySpeciesName(mon.species) : '빈 슬롯 / Empty slot'}</strong>${text}</div>`);
    });
  });
  els.pendingChoices.innerHTML = rows.join('\n');
}
async function resolveTurn() {
  const battle = state.battle;
  const queue = [];
  for (const [player, side] of battle.players.entries()) {
    for (const activeIndex of side.active) {
      const mon = side.team[activeIndex];
      const choice = side.choices[activeIndex];
      if (!choice) continue;
      if (choice.kind === 'switch') {
        queue.push({priority: 100, speed: 0, player, activeIndex, mon, choice});
      } else if (choice.kind === 'move') {
        const move = await getMoveData(choice.move);
        const priority = move.priority || 0;
        const speed = mon && !mon.fainted ? getModifiedStat(mon, 'spe') : 0;
        queue.push({priority, speed, player, activeIndex, mon, choice, move});
      }
    }
  }
  queue.sort((a, b) => b.priority - a.priority || b.speed - a.speed || Math.random() - 0.5);
  for (const action of queue) {
    if (battle.winner) break;
    if (action.choice.kind === 'switch') performSwitch(action.player, action.activeIndex, action.choice.switchTo);
    if (action.choice.kind === 'move') await performMove(action);
    fillFaintedActives();
    determineWinner();
  }
  endOfTurn();
  determineWinner();
  battle.players.forEach(side => side.choices = {});
  battle.turn += 1;
  renderBattle();
}
function performSwitch(player, activeIndex, targetIndex) {
  const side = state.battle.players[player];
  const currentPosition = side.active.indexOf(activeIndex);
  if (currentPosition === -1 || !Number.isInteger(targetIndex)) return;
  const incoming = side.team[targetIndex];
  if (!incoming || incoming.fainted) return;
  const leaving = side.team[activeIndex];
  if (leaving) {
    leaving.boosts = {atk:0,def:0,spa:0,spd:0,spe:0};
    leaving.protect = false;
  }
  side.active[currentPosition] = targetIndex;
  addLog(`${side.name} 측은 ${leaving ? displaySpeciesName(leaving.species) : '포켓몬 / a Pokémon'}를 회수하고 ${displaySpeciesName(incoming.species)}를 내보냈다. / ${side.name} withdrew ${leaving?.species || 'a Pokémon'} and sent out ${incoming.species}.`, 'accent');
  if (slugify(incoming.ability) === 'intimidate') {
    state.battle.players[1-player].active.forEach(idx => {
      const target = state.battle.players[1-player].team[idx];
      if (target && !target.fainted && slugify(target.item) !== 'clear-amulet') {
        target.boosts.atk = clamp((target.boosts.atk || 0) - 1, -6, 6);
        addLog(`${displaySpeciesName(incoming.species)}의 위협 / Intimidate! ${displaySpeciesName(target.species)}의 공격이 떨어졌다. / ${incoming.species}'s Intimidate lowers ${target.species}'s Attack.`, 'accent');
      }
    });
  }
}
function canMove(mon) {
  if (!mon || mon.fainted) return {ok:false, reason:'기절 상태입니다. / Fainted.'};
  if (mon.status === 'slp') {
    mon.sleepTurns = Math.max(0, (mon.sleepTurns || 1) - 1);
    if (mon.sleepTurns > 0) return {ok:false, reason:`${displaySpeciesName(mon.species)}은(는) 잠들어 있다. / ${mon.species} is asleep.`};
    mon.status = '';
    return {ok:true, wake:true};
  }
  if (mon.status === 'frz' && Math.random() < 0.8) return {ok:false, reason:`${displaySpeciesName(mon.species)}은(는) 얼어붙어 움직일 수 없다. / ${mon.species} is frozen solid.`};
  if (mon.status === 'par' && Math.random() < 0.25) return {ok:false, reason:`${displaySpeciesName(mon.species)}은(는) 몸이 저려 움직일 수 없다. / ${mon.species} is fully paralyzed.`};
  return {ok:true};
}
async function performMove(action) {
  const {player, mon, choice, move} = action;
  if (!mon || mon.fainted) return;
  const side = state.battle.players[player];
  const currentMon = side.team[side.active.find(idx => side.team[idx].id === mon.id) ?? action.activeIndex];
  if (!currentMon || currentMon.fainted) return;
  const check = canMove(currentMon);
  if (!check.ok) {
    addLog(check.reason);
    return;
  }
  if (choice.tera && !currentMon.teraUsed) {
    currentMon.types = [currentMon.teraType];
    currentMon.teraUsed = true;
    addLog(`${displaySpeciesName(currentMon.species)}이(가) ${displayType(currentMon.teraType)} 테라스탈했다! / ${currentMon.species} Terastallized into ${titleCase(currentMon.teraType)}-type!`, 'accent');
  }
  const targets = resolveTargets(player, action.activeIndex, choice, move);
  if (!targets.length) {
    addLog(`${displaySpeciesName(currentMon.species)}의 ${displayMoveName(move.name)}! 그러나 맞힐 대상이 없었다. / ${currentMon.species} used ${move.name}, but there was no valid target.`);
    return;
  }
  addLog(`${displaySpeciesName(currentMon.species)}의 ${displayMoveName(move.name)}! / ${currentMon.species} used ${move.name}.`, 'accent');
  if (['protect','detect'].includes(slugify(move.name))) {
    currentMon.protect = true;
    addLog(`${displaySpeciesName(currentMon.species)}은(는) 이번 턴 보호 상태다. / ${currentMon.species} is protected this turn.`);
    return;
  }
  if (move.category === 'status') {
    applyStatusMove(currentMon, targets, move);
    return;
  }
  for (const target of targets) {
    if (!target || target.fainted) continue;
    if (target.protect && player !== target.player) {
      addLog(`${displaySpeciesName(target.species)}은(는) 자신을 보호했다. / ${target.species} protected itself.`);
      continue;
    }
    const accuracy = move.accuracy || 100;
    if (Math.random() * 100 >= accuracy) {
      addLog(`${displaySpeciesName(currentMon.species)}의 ${displayMoveName(move.name)}는 ${displaySpeciesName(target.species)}에게 빗나갔다. / ${currentMon.species}'s ${move.name} missed ${target.species}.`);
      continue;
    }
    const damageInfo = computeDamage(currentMon, target, move, targets.length > 1);
    let damage = damageInfo.damage;
    if (slugify(target.ability) === 'multiscale' && target.hp === target.maxHp) damage = Math.floor(damage * 0.5);
    if (slugify(target.ability) === 'flash-fire' && move.type === 'fire') {
      addLog(`${displaySpeciesName(target.species)}의 타오르는불꽃 / Flash Fire가 공격을 흡수했다. / ${target.species}'s Flash Fire absorbed the attack.`);
      target.volatile.flashFire = true;
      continue;
    }
    if (slugify(target.ability) === 'levitate' && move.type === 'ground') {
      addLog(`${displaySpeciesName(target.species)}은(는) 부유 / Levitate 덕분에 땅 타입 기술을 피했다. / ${target.species} avoided the Ground-type move thanks to Levitate.`);
      continue;
    }
    if (slugify(target.item) === 'focus-sash' && target.hp === target.maxHp && damage >= target.hp) {
      damage = target.hp - 1;
      addLog(`${displaySpeciesName(target.species)}은(는) 기합의띠 / Focus Sash로 버텼다! / ${target.species} endured with Focus Sash!`, 'accent');
    }
    target.hp = Math.max(0, target.hp - Math.max(1, damage));
    addLog(`${displaySpeciesName(target.species)}의 HP가 ${damage}만큼 줄었다${damageInfo.effectivenessText ? ` (${damageInfo.effectivenessText})` : ''}. / ${target.species} lost ${damage} HP${damageInfo.effectivenessText ? ` (${damageInfo.effectivenessText})` : ''}.`);
    if (damageInfo.crit) addLog('급소에 맞았다! / A critical hit!');
    if (move.drain) {
      const heal = Math.max(1, Math.floor(damage * (move.drain / 100)));
      currentMon.hp = Math.min(currentMon.maxHp, currentMon.hp + heal);
      addLog(`${displaySpeciesName(currentMon.species)}의 HP가 ${heal} 회복되었다. / ${currentMon.species} restored ${heal} HP.`);
    }
    if (slugify(currentMon.item) === 'life-orb') {
      const recoil = Math.max(1, Math.floor(currentMon.maxHp / 10));
      currentMon.hp = Math.max(0, currentMon.hp - recoil);
      addLog(`${displaySpeciesName(currentMon.species)}은(는) 생명의구슬 / Life Orb 반동으로 데미지를 입었다. / ${currentMon.species} was hurt by Life Orb.`);
    }
    if (slugify(target.item) === 'rocky-helmet' && move.category === 'physical') {
      const recoil = Math.max(1, Math.floor(currentMon.maxHp / 6));
      currentMon.hp = Math.max(0, currentMon.hp - recoil);
      addLog(`${displaySpeciesName(currentMon.species)}은(는) 울퉁불퉁멧 / Rocky Helmet 때문에 데미지를 입었다. / ${currentMon.species} was hurt by Rocky Helmet.`);
    }
    maybeApplySecondary(currentMon, target, move);
    if (target.hp <= 0) {
      target.fainted = true;
      target.hp = 0;
      addLog(`${displaySpeciesName(target.species)}은(는) 쓰러졌다. / ${target.species} fainted.`, 'win');
    }
  }
}
function resolveTargets(player, activeIndex, choice, move) {
  const battle = state.battle;
  if (move.target === 'self') return [battle.players[player].team[activeIndex]];
  if (move.target === 'ally-side' || move.target === 'self-side') return battle.players[player].active.map(idx => battle.players[player].team[idx]).filter(mon => mon && !mon.fainted);
  if (move.target === 'opponent-side') return battle.players[1-player].active.map(idx => battle.players[1-player].team[idx]).filter(mon => mon && !mon.fainted);
  if (move.target === 'all-opponents') return battle.players[1-player].active.map(idx => battle.players[1-player].team[idx]).filter(mon => mon && !mon.fainted);
  if (move.target === 'all-other-pokemon') return [...battle.players[player].active, ...battle.players[1-player].active].map((idx, i) => i < battle.players[player].active.length ? battle.players[player].team[idx] : battle.players[1-player].team[idx]).filter(mon => mon && !mon.fainted && mon.id !== battle.players[player].team[activeIndex].id);
  if (move.target === 'ally' || move.target === 'ally-or-self') {
    if (choice.target) return [battle.players[choice.target.player].team[choice.target.slot]].filter(Boolean);
    const fallback = targetOptionsFor(player, activeIndex, move)[0];
    return fallback ? [battle.players[fallback.player].team[fallback.slot]] : [battle.players[player].team[activeIndex]];
  }
  if (choice.target) return [battle.players[choice.target.player].team[choice.target.slot]].filter(Boolean);
  return [battle.players[1-player].team[battle.players[1-player].active[0]]].filter(Boolean);
}
function applyStatusMove(user, targets, move) {
  if (move.healing) {
    const heal = Math.max(1, Math.floor(user.maxHp * (move.healing / 100)));
    user.hp = Math.min(user.maxHp, user.hp + heal);
    addLog(`${displaySpeciesName(user.species)}의 HP가 ${heal} 회복되었다. / ${user.species} restored ${heal} HP.`);
  }
  if (move.statChanges.length) {
    const applyToSelf = ['self','self-side'].includes(move.target) || ['swagger','close-combat'].includes(slugify(move.name)) === false && move.metaCategory === 'net-good-stats';
    const recipients = applyToSelf ? [user] : targets;
    recipients.forEach(target => {
      move.statChanges.forEach(change => {
        const statMap = {attack:'atk', defense:'def', 'special-attack':'spa', 'special-defense':'spd', speed:'spe'};
        const stat = statMap[change.stat] || statMap[slugify(change.stat)] || change.stat;
        if (!target.boosts[stat] && target.boosts[stat] !== 0) return;
        target.boosts[stat] = clamp((target.boosts[stat] || 0) + change.change, -6, 6);
      });
      addLog(`${displaySpeciesName(target.species)}의 능력치가 변했다. / ${target.species}'s stats changed.`);
    });
  }
  if (move.ailment && move.ailment !== 'none') {
    targets.forEach(target => applyAilment(target, move.ailment, 100));
  }
}
function maybeApplySecondary(user, target, move) {
  if (move.ailment && move.ailment !== 'none' && move.ailmentChance > 0) applyAilment(target, move.ailment, move.ailmentChance);
  if (move.statChanges.length && move.statChance > 0 && Math.random() * 100 < move.statChance) {
    move.statChanges.forEach(change => {
      const statMap = {attack:'atk', defense:'def', 'special-attack':'spa', 'special-defense':'spd', speed:'spe'};
      const stat = statMap[change.stat] || change.stat;
      target.boosts[stat] = clamp((target.boosts[stat] || 0) + change.change, -6, 6);
    });
    addLog(`${displaySpeciesName(target.species)}의 능력치가 추가 효과로 변했다. / ${target.species}'s stats changed from the secondary effect.`);
  }
}
function applyAilment(target, ailment, chance) {
  if (target.fainted || target.status) return;
  if (Math.random() * 100 >= chance) return;
  const map = {burn:'brn', paralysis:'par', poison:'psn', sleep:'slp', freeze:'frz', 'bad-poison':'tox'};
  const status = map[ailment] || '';
  if (!status) return;
  if (status === 'par' && target.types.includes('electric')) return;
  if ((status === 'psn' || status === 'tox') && (target.types.includes('poison') || target.types.includes('steel'))) return;
  if (status === 'brn' && target.types.includes('fire')) return;
  if (status === 'frz' && target.types.includes('ice')) return;
  target.status = status;
  if (status === 'slp') target.sleepTurns = 2 + Math.floor(Math.random() * 2);
  if (status === 'tox') target.toxicCounter = 1;
  addLog(`${displaySpeciesName(target.species)}은(는) ${displayStatus(status)} 상태가 되었다. / ${target.species} is now ${statusNames[status].toLowerCase()}.`);
}
function computeDamage(attacker, defender, move, spread = false) {
  const physical = move.category === 'physical';
  let atk = getModifiedStat(attacker, physical ? 'atk' : 'spa');
  let def = getModifiedStat(defender, physical ? 'def' : 'spd');
  const moveType = move.type;
  let power = move.power || 0;
  if (slugify(attacker.ability) === 'technician' && power <= 60) power = Math.floor(power * 1.5);
  if (slugify(attacker.item) === 'choiceband' && physical) atk = Math.floor(atk * 1.5);
  if (slugify(attacker.item) === 'choicespecs' && !physical) atk = Math.floor(atk * 1.5);
  if (slugify(attacker.item) === 'muscleband' && physical) power = Math.floor(power * 1.1);
  if (slugify(attacker.item) === 'wiseglasses' && !physical) power = Math.floor(power * 1.1);
  const typeBoostItems = {
    'mysticwater':'water','charcoal':'fire','miracleseed':'grass','magnet':'electric','blackglasses':'dark','nevermeltice':'ice','softsand':'ground','dragonfang':'dragon','pixieplate':'fairy','poisonbarb':'poison','silverpowder':'bug','spelltag':'ghost','sharpbeak':'flying','twistedspoon':'psychic','hardstone':'rock','silkscarf':'normal','metalcoat':'steel'
  };
  if (typeBoostItems[slugify(attacker.item)] === moveType) power = Math.floor(power * 1.2);
  let damage = Math.floor(Math.floor(Math.floor((2 * attacker.level / 5 + 2) * power * atk / Math.max(1, def)) / 50) + 2);
  if (physical && attacker.status === 'brn') damage = Math.floor(damage * 0.5);
  let stab = attacker.types.includes(moveType) ? 1.5 : 1;
  if (slugify(attacker.ability) === 'adaptability' && attacker.types.includes(moveType)) stab = 2;
  if (slugify(attacker.ability) === 'flash-fire' && attacker.volatile.flashFire && moveType === 'fire') damage = Math.floor(damage * 1.5);
  let effectiveness = typeEffectiveness(moveType, defender);
  if (slugify(attacker.item) === 'expertbelt' && effectiveness > 1) damage = Math.floor(damage * 1.2);
  const critChance = move.critRate > 0 ? Math.min(50, 12.5 * (move.critRate + 1)) : (slugify(attacker.item) === 'scopelens' ? 12.5 : 4.167);
  const crit = Math.random() * 100 < critChance;
  if (crit) damage = Math.floor(damage * 1.5);
  if (spread) damage = Math.floor(damage * 0.75);
  damage = Math.floor(damage * stab * effectiveness * (0.85 + Math.random() * 0.15));
  damage = Math.max(1, damage);
  let effectivenessText = '';
  if (effectiveness === 0) {
    damage = 0;
    effectivenessText = '효과가 없다 / No effect';
  } else if (effectiveness >= 2) effectivenessText = '효과가 굉장했다 / Super effective';
  else if (effectiveness < 1) effectivenessText = '효과가 별로인 듯하다 / Not very effective';
  return {damage, crit, effectivenessText};
}
function fillFaintedActives() {
  const battle = state.battle;
  battle.players.forEach((side, player) => {
    side.active = side.active.map(activeIndex => {
      const mon = side.team[activeIndex];
      if (mon && !mon.fainted) return activeIndex;
      const replacement = switchOptionsFor(player, true)[0];
      if (replacement) {
        addLog(`${side.name} 측은 ${displaySpeciesName(replacement.mon.species)}를 내보냈다. / ${side.name} sends out ${replacement.mon.species}.`, 'accent');
        return replacement.index;
      }
      return activeIndex;
    });
  });
}
function endOfTurn() {
  const battle = state.battle;
  battle.players.forEach(side => {
    side.team.forEach(mon => {
      if (!mon || mon.fainted) return;
      mon.protect = false;
      if (mon.status === 'brn') {
        const dmg = Math.max(1, Math.floor(mon.maxHp / 16));
        mon.hp = Math.max(0, mon.hp - dmg);
        addLog(`${displaySpeciesName(mon.species)}은(는) 화상 데미지를 입었다. / ${mon.species} was hurt by its burn.`);
      }
      if (mon.status === 'psn') {
        const dmg = Math.max(1, Math.floor(mon.maxHp / 8));
        mon.hp = Math.max(0, mon.hp - dmg);
        addLog(`${displaySpeciesName(mon.species)}은(는) 독 데미지를 입었다. / ${mon.species} was hurt by poison.`);
      }
      if (mon.status === 'tox') {
        mon.toxicCounter = Math.max(1, mon.toxicCounter + 1);
        const dmg = Math.max(1, Math.floor(mon.maxHp * mon.toxicCounter / 16));
        mon.hp = Math.max(0, mon.hp - dmg);
        addLog(`${displaySpeciesName(mon.species)}은(는) 맹독 데미지를 입었다. / ${mon.species} was hurt by toxic poison.`);
      }
      if (slugify(mon.item) === 'leftovers' && !mon.fainted) {
        const heal = Math.max(1, Math.floor(mon.maxHp / 16));
        mon.hp = Math.min(mon.maxHp, mon.hp + heal);
        addLog(`${displaySpeciesName(mon.species)}은(는) 먹다남은음식 / Leftovers로 HP를 조금 회복했다. / ${mon.species} restored a little HP with Leftovers.`);
      }
      if (slugify(mon.item) === 'black-sludge' && mon.types.includes('poison')) {
        const heal = Math.max(1, Math.floor(mon.maxHp / 16));
        mon.hp = Math.min(mon.maxHp, mon.hp + heal);
        addLog(`${displaySpeciesName(mon.species)}은(는) 검은오물 / Black Sludge로 HP를 회복했다. / ${mon.species} restored HP with Black Sludge.`);
      }
      if (slugify(mon.item) === 'sitrus-berry' && mon.hp > 0 && mon.hp <= mon.maxHp / 2 && !mon.volatile.usedSitrus) {
        const heal = Math.max(1, Math.floor(mon.maxHp / 4));
        mon.hp = Math.min(mon.maxHp, mon.hp + heal);
        mon.volatile.usedSitrus = true;
        addLog(`${displaySpeciesName(mon.species)}은(는) 오랭열매 / Sitrus Berry로 HP를 회복했다. / ${mon.species} restored HP with Sitrus Berry.`);
      }
      if (mon.hp <= 0) {
        mon.hp = 0;
        mon.fainted = true;
        addLog(`${displaySpeciesName(mon.species)}은(는) 쓰러졌다. / ${mon.species} fainted.`, 'win');
      }
    });
  });
  fillFaintedActives();
}
function determineWinner() {
  const battle = state.battle;
  if (battle.winner) return;
  const alive = battle.players.map(side => side.team.some(mon => !mon.fainted));
  if (alive[0] && alive[1]) return;
  if (!alive[0] && !alive[1]) {
    battle.winner = '무승부 / Draw';
    addLog('양쪽 팀 모두 싸울 수 있는 포켓몬이 없습니다. 무승부! / Both teams are out of usable Pokémon. Draw game.', 'win');
    return;
  }
  battle.winner = alive[0] ? battle.players[0].name : battle.players[1].name;
  addLog(`${battle.winner} 승리! / ${battle.winner} wins the battle!`, 'win');
}
function wireBattleEvents() {
  els.startBattleBtn.addEventListener('click', startBattle);
  els.backToBuilderBtn.addEventListener('click', () => {
    state.battle = null;
    els.battlePanel.classList.add('hidden');
  });
  els.restartBattleBtn.addEventListener('click', () => startBattle());
  els.clearLogBtn.addEventListener('click', () => {
    if (!state.battle) return;
    state.battle.log = [];
    renderBattle();
  });
}
function renderAll() {
  els.modeSinglesBtn.classList.toggle('active', state.mode === 'singles');
  els.modeDoublesBtn.classList.toggle('active', state.mode === 'doubles');
  els.player1Name.value = state.playerNames[0];
  els.player2Name.value = state.playerNames[1];
  syncPlayerNames();
  renderRoster();
  renderEditor();
  renderValidation();
  if (state.battle) renderBattle();
}
async function bootstrap() {
  bindElements();
  showRuntime('업로드한 에셋과 현지화된 전투 데이터를 불러오는 중… / Loading uploaded assets and fully localized battle data…', 'loading');
  resetTeams();
  await loadManifest();
  await detectAssetBases();
  loadSavedState();
  await loadDataProvider();
  await loadMoveNames();
  await rehydrateTeams();
  buildStaticLists();
  wireEditorEvents();
  wireBattleEvents();
  renderAll();
  state.runtimeReady = true;
  showRuntime(
    '준비 완료. 로컬 에셋과 현지화된 전투 데이터가 연결되었습니다. / Runtime ready. Local assets and localized battle data are connected.',
    'ready',
    `포켓몬 스프라이트 경로 / Pokémon sprite base: ${state.assetBase.pokemon}<br>아이템 아이콘 경로 / Item icon base: ${state.assetBase.items}<br>데이터 공급원 / Data provider: ${dataSourceLabel()}${state.dexSource ? `<br>Dex source: ${state.dexSource}` : ''}<br>이 빌드는 이제 종족 / learnset / 기술 / 아이템 / 특성 / 포맷 / 성격 / 상태 / 타입 상성의 로컬 데이터를 불러오고, 저장된 팀을 그 로컬 Dex 기준으로 복원하며, 레거시 기믹에 필요한 Past 태그 데이터를 허용하고, learnset / nonstandard / 폼 조건 / 아이템 / 특성 / 테라 타입 / 성별 / 팀 단위 경고까지 더 강한 validator를 사용합니다. / This build now loads fully vendored local data for species / learnsets / moves / items / abilities / formats / natures / conditions / type chart, restores saved teams against that local Dex on startup, allows Past-tagged data needed for legacy mechanics, and runs a stronger validator for learnsets, nonstandard flags, form requirements, items, abilities, Tera type, gender, and team-level warnings. 전투 판정은 아직 프로젝트의 커스텀 런타임을 사용하므로, 카트리지 수준의 완전한 시뮬레이터 통합은 다음 단계입니다. / Battle resolution is still the project’s custom runtime, so full cartridge-accurate simulator integration remains the next milestone.`
  );
}

bootstrap().catch(error => {
  console.error(error);
  showRuntime(
    '시작에 실패했습니다. 브라우저 콘솔과 로컬 데이터 모듈을 확인하세요. / Startup failed. Check the browser console and local data modules.',
    'error',
    `Error: ${error.message}`
  );
});
