const STORAGE_KEY = 'pkb-static-state-v1';
const POKEAPI = 'https://pokeapi.co/api/v2';
const statOrder = ['hp', 'atk', 'def', 'spa', 'spd', 'spe'];
const statLabels = {hp: 'HP', atk: 'Atk', def: 'Def', spa: 'SpA', spd: 'SpD', spe: 'Spe'};
const statusNames = {brn: 'Burn', par: 'Paralysis', psn: 'Poison', tox: 'Toxic', slp: 'Sleep', frz: 'Freeze'};
const typeIds = {
  normal: 1, fighting: 2, flying: 3, poison: 4, ground: 5, rock: 6,
  bug: 7, ghost: 8, steel: 9, fire: 10, water: 11, grass: 12,
  electric: 13, psychic: 14, ice: 15, dragon: 16, dark: 17, fairy: 18,
};
const TYPES = Object.keys(typeIds);
const natureOrder = ['Hardy','Lonely','Brave','Adamant','Naughty','Bold','Docile','Relaxed','Impish','Lax','Timid','Hasty','Serious','Jolly','Naive','Modest','Mild','Quiet','Bashful','Rash','Calm','Gentle','Sassy','Careful','Quirky'];
const natures = {
  Hardy:{plus:null,minus:null}, Lonely:{plus:'atk',minus:'def'}, Brave:{plus:'atk',minus:'spe'}, Adamant:{plus:'atk',minus:'spa'}, Naughty:{plus:'atk',minus:'spd'},
  Bold:{plus:'def',minus:'atk'}, Docile:{plus:null,minus:null}, Relaxed:{plus:'def',minus:'spe'}, Impish:{plus:'def',minus:'spa'}, Lax:{plus:'def',minus:'spd'},
  Timid:{plus:'spe',minus:'atk'}, Hasty:{plus:'spe',minus:'def'}, Serious:{plus:null,minus:null}, Jolly:{plus:'spe',minus:'spa'}, Naive:{plus:'spe',minus:'spd'},
  Modest:{plus:'spa',minus:'atk'}, Mild:{plus:'spa',minus:'def'}, Quiet:{plus:'spa',minus:'spe'}, Bashful:{plus:null,minus:null}, Rash:{plus:'spa',minus:'spd'},
  Calm:{plus:'spd',minus:'atk'}, Gentle:{plus:'spd',minus:'def'}, Sassy:{plus:'spd',minus:'spe'}, Careful:{plus:'spd',minus:'spa'}, Quirky:{plus:null,minus:null},
};
const commonItems = [
  'Leftovers','Life Orb','Choice Band','Choice Specs','Choice Scarf','Focus Sash','Assault Vest','Sitrus Berry','Rocky Helmet','Expert Belt',
  'Lum Berry','Booster Energy','Heavy-Duty Boots','Air Balloon','Weakness Policy','Eviolite','Clear Amulet','Scope Lens','Muscle Band','Wise Glasses',
  'Mystic Water','Charcoal','Miracle Seed','Magnet','Black Glasses','Never-Melt Ice','Soft Sand','Dragon Fang','Pixie Plate','Poison Barb',
  'Silver Powder','Spell Tag','Sharp Beak','Twisted Spoon','Hard Stone','Silk Scarf','Metal Coat','Black Sludge'
];
const implementedAbilities = new Set(['intimidate','levitate','technician','adaptability','multiscale','flash-fire']);
const implementedItems = new Set(['leftovers','life-orb','choice-band','choice-specs','choice-scarf','focus-sash','assault-vest','sitrus-berry','rocky-helmet','expert-belt','lum-berry','eviolite','clear-amulet','scope-lens','muscle-band','wise-glasses','mystic-water','charcoal','miracle-seed','magnet','black-glasses','never-melt-ice','soft-sand','dragon-fang','pixie-plate','poison-barb','silver-powder','spell-tag','sharp-beak','twisted-spoon','hard-stone','silk-scarf','metal-coat','black-sludge']);
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

const typeChart = {
  normal:{rock:0.5,ghost:0,steel:0.5},
  fighting:{normal:2,ice:2,rock:2,dark:2,steel:2,poison:0.5,flying:0.5,psychic:0.5,bug:0.5,fairy:0.5,ghost:0},
  flying:{fighting:2,bug:2,grass:2,rock:0.5,steel:0.5,electric:0.5},
  poison:{grass:2,fairy:2,poison:0.5,ground:0.5,rock:0.5,ghost:0.5,steel:0},
  ground:{fire:2,electric:2,poison:2,rock:2,steel:2,bug:0.5,grass:0.5,flying:0},
  rock:{fire:2,ice:2,flying:2,bug:2,fighting:0.5,ground:0.5,steel:0.5},
  bug:{grass:2,psychic:2,dark:2,fighting:0.5,flying:0.5,poison:0.5,ghost:0.5,steel:0.5,fire:0.5,fairy:0.5},
  ghost:{psychic:2,ghost:2,dark:0.5,normal:0},
  steel:{ice:2,rock:2,fairy:2,steel:0.5,fire:0.5,water:0.5,electric:0.5},
  fire:{grass:2,ice:2,bug:2,steel:2,fire:0.5,water:0.5,rock:0.5,dragon:0.5},
  water:{fire:2,ground:2,rock:2,water:0.5,grass:0.5,dragon:0.5},
  grass:{water:2,ground:2,rock:2,fire:0.5,grass:0.5,poison:0.5,flying:0.5,bug:0.5,dragon:0.5,steel:0.5},
  electric:{water:2,flying:2,electric:0.5,grass:0.5,dragon:0.5,ground:0},
  psychic:{fighting:2,poison:2,psychic:0.5,steel:0.5,dark:0},
  ice:{grass:2,ground:2,flying:2,dragon:2,fire:0.5,water:0.5,ice:0.5,steel:0.5},
  dragon:{dragon:2,steel:0.5,fairy:0},
  dark:{psychic:2,ghost:2,fighting:0.5,dark:0.5,fairy:0.5},
  fairy:{fighting:2,dragon:2,dark:2,fire:0.5,poison:0.5,steel:0.5},
};

const moveNameCache = [];
const speciesDataCache = new Map();
const moveDataCache = new Map();
const imageInfoCache = new Map();

const state = {
  runtimeReady: false,
  mode: 'singles',
  teamSize: 3,
  manifest: null,
  speciesChoices: [],
  playerNames: ['Player 1', 'Player 2'],
  teams: [[], []],
  selected: {player: 0, slot: 0},
  builderErrors: [],
  battle: null,
};

const els = {};

function slugify(text) {
  return String(text || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}
function toId(text) {
  return String(text || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
}
function titleCase(text) {
  return String(text || '').split(/[-\s]+/).filter(Boolean).map(part => part[0]?.toUpperCase() + part.slice(1)).join(' ');
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
  state.speciesChoices = ids.map(id => ({id, label: humanizeSpriteId(id)}));
}
async function loadMoveNames() {
  const data = await fetchJson(`${POKEAPI}/move?limit=2000`);
  moveNameCache.splice(0, moveNameCache.length, ...data.results.map(entry => formatPokemonDisplayName(entry.name)));
}
async function getSpeciesData(speciesName) {
  const key = slugify(speciesName);
  if (speciesDataCache.has(key)) return speciesDataCache.get(key);
  const pokemon = await fetchJson(`${POKEAPI}/pokemon/${key}`);
  const species = await fetchJson(pokemon.species.url);
  const evo = species.evolves_from_species?.name || null;
  const abilities = pokemon.abilities.map(slot => formatPokemonDisplayName(slot.ability.name));
  const stats = {};
  pokemon.stats.forEach(entry => {
    const map = {hp:'hp', attack:'atk', defense:'def', 'special-attack':'spa', 'special-defense':'spd', speed:'spe'};
    stats[map[entry.stat.name]] = entry.base_stat;
  });
  const data = {
    id: pokemon.id,
    name: formatPokemonDisplayName(pokemon.name),
    apiName: pokemon.name,
    types: pokemon.types.sort((a,b)=>a.slot-b.slot).map(t => t.type.name),
    abilities,
    stats,
    weight: pokemon.weight / 10,
    evolves: !evo && species.evolves_from_species === null ? pokemon.species.name !== species.name : Boolean(species.evolves_from_species || species.evolves_to?.length),
  };
  speciesDataCache.set(key, data);
  return data;
}
async function getMoveData(moveName) {
  const key = slugify(moveName);
  if (!key) throw new Error('Move is blank');
  if (moveDataCache.has(key)) return moveDataCache.get(key);
  const data = await fetchJson(`${POKEAPI}/move/${key}`);
  const result = {
    name: formatPokemonDisplayName(data.name),
    apiName: data.name,
    power: data.power || 0,
    accuracy: data.accuracy || 100,
    pp: data.pp || 0,
    priority: data.priority || 0,
    type: data.type.name,
    category: data.damage_class.name,
    target: targetHints[data.target.name] || 'single-opponent',
    critRate: data.meta?.crit_rate || 0,
    drain: data.meta?.drain || 0,
    healing: data.meta?.healing || 0,
    minHits: data.meta?.min_hits || 1,
    maxHits: data.meta?.max_hits || 1,
    ailment: data.meta?.ailment?.name || '',
    ailmentChance: data.meta?.ailment_chance || 0,
    flinchChance: data.meta?.flinch_chance || 0,
    statChance: data.meta?.stat_chance || 0,
    statChanges: (data.stat_changes || []).map(entry => ({stat: entry.stat.name, change: entry.change})),
    effectChance: data.effect_chance || 0,
    metaCategory: data.meta?.category?.name || '',
  };
  moveDataCache.set(key, result);
  return result;
}
function getBaseSpriteId(speciesInput) {
  const guess = String(speciesInput || '').trim();
  if (!guess) return '';
  const byId = state.speciesChoices.find(entry => entry.id === guess.toUpperCase());
  if (byId) return byId.id;
  const normalized = guess.toUpperCase().replace(/[^A-Z0-9]+/g, '_');
  const direct = state.manifest.pokemon.front.includes(normalized) ? normalized : '';
  if (direct) return direct;
  const labelMatch = state.speciesChoices.find(entry => toId(entry.label) === toId(guess));
  return labelMatch?.id || '';
}
function spritePath(spriteId, facing = 'front', shiny = false) {
  const folder = facing === 'back'
    ? shiny ? 'Back shiny' : 'Back'
    : shiny ? 'Front shiny' : 'Front';
  return `./assets/pokemon/${folder}/${spriteId}.png`;
}
function iconPath(spriteId, shiny = false) {
  const folder = shiny ? 'Icons shiny' : 'Icons';
  return `./assets/pokemon/${folder}/${spriteId}.png`;
}
function itemIconPath(itemName) {
  const slug = slugify(itemName);
  return slug ? `./assets/items/${slug}.png` : '';
}
function typeIconPath(typeName, small = false) {
  const idx = typeIds[typeName];
  if (!idx) return '';
  return `./assets/types/${small ? 'small/' : ''}${idx}.png`;
}
function createTypePill(type) {
  const img = document.createElement('img');
  img.src = typeIconPath(type, true);
  img.alt = type;
  img.loading = 'lazy';
  img.className = 'type-chip';
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
      if (info.count > 1) setInterval(draw, 120);
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
    editorAbilityNote: document.getElementById('editor-ability-note'),
    editorAbilityEffect: document.getElementById('editor-ability-effect'),
    speciesInput: document.getElementById('species-input'),
    speciesStatus: document.getElementById('species-status'),
    abilitySelect: document.getElementById('ability-select'),
    natureSelect: document.getElementById('nature-select'),
    itemInput: document.getElementById('item-input'),
    levelInput: document.getElementById('level-input'),
    teraSelect: document.getElementById('tera-select'),
    shinyCheckbox: document.getElementById('shiny-checkbox'),
    moveInputs: [1,2,3,4].map(i => document.getElementById(`move${i}-input`)),
    evGrid: document.getElementById('ev-grid'),
    ivGrid: document.getElementById('iv-grid'),
    evTotal: document.getElementById('ev-total'),
    builderErrors: document.getElementById('builder-errors'),
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
  });
}
function buildStaticLists() {
  els.speciesList.innerHTML = state.speciesChoices.map(entry => `<option value="${entry.label}"></option>`).join('');
  const allItems = Array.from(new Set([...commonItems, ...(state.manifest.items || []).map(humanizeSpriteId)])).sort();
  els.itemList.innerHTML = allItems.map(item => `<option value="${item}"></option>`).join('');
  els.moveList.innerHTML = moveNameCache.map(name => `<option value="${name}"></option>`).join('');
  els.natureSelect.innerHTML = natureOrder.map(name => `<option value="${name}">${name}</option>`).join('');
  els.teraSelect.innerHTML = TYPES.map(type => `<option value="${type}">${titleCase(type)}</option>`).join('');
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
      const species = mon.displaySpecies || `Slot ${slot + 1}`;
      const moveCount = mon.moves.filter(Boolean).length;
      meta.innerHTML = `<div class="slot-name">${species}</div><div class="slot-sub">${mon.ability || 'No ability'} · ${moveCount}/4 moves</div>`;
      button.appendChild(meta);
      container.appendChild(button);
    });
  });
  els.teamSizeNote.textContent = `Each player builds ${state.teamSize} Pokémon.`;
  els.heroModeLabel.textContent = state.mode === 'singles' ? 'Singles · 3 Pokémon' : 'Doubles · 4 Pokémon';
}
function implementedAbilityNote(name) {
  const id = slugify(name);
  if (!id) return 'Select one of the Pokémon’s native abilities.';
  if (implementedAbilities.has(id)) return `${name} is implemented in battle.`;
  return `${name} is stored and shown in battle. Generic abilities without custom triggers do not override baseline combat rules yet.`;
}
function implementedItemNote(name) {
  const id = slugify(name);
  if (!id) return 'No held item selected.';
  if (implementedItems.has(id)) return `${name} has a battle effect in this build.`;
  return `${name} is displayed with its icon. Unimplemented held items are cosmetic for now.`;
}
async function hydrateSelectedSpecies() {
  const mon = getSelectedMon();
  const spriteId = getBaseSpriteId(mon.species || mon.displaySpecies);
  if (!spriteId) {
    mon.data = null;
    mon.displaySpecies = mon.species || '';
    mon.spriteId = '';
    renderEditor();
    return;
  }
  mon.spriteId = spriteId;
  mon.displaySpecies = humanizeSpriteId(spriteId);
  els.speciesStatus.textContent = 'Loading species data…';
  try {
    const data = await getSpeciesData(mon.displaySpecies);
    mon.data = data;
    if (!mon.ability || !data.abilities.includes(mon.ability)) mon.ability = data.abilities[0] || '';
    if (!mon.teraType) mon.teraType = data.types[0] || 'normal';
    els.speciesStatus.textContent = `${data.name} loaded · ${data.types.map(titleCase).join(' / ')}`;
  } catch (error) {
    mon.data = null;
    els.speciesStatus.textContent = 'Species data could not be loaded from PokéAPI.';
  }
  saveState();
  renderAll();
}
function renderEditor() {
  const mon = getSelectedMon();
  els.editorTitle.textContent = `${state.playerNames[state.selected.player]} · Slot ${state.selected.slot + 1}`;
  els.editorSubtitle.textContent = 'Set species, moves, stats, item, nature, ability, and tera type.';
  els.speciesInput.value = mon.displaySpecies || mon.species || '';
  els.itemInput.value = mon.item || '';
  els.levelInput.value = mon.level;
  els.natureSelect.value = mon.nature || 'Jolly';
  els.teraSelect.value = mon.teraType || 'normal';
  els.shinyCheckbox.checked = Boolean(mon.shiny);
  els.moveInputs.forEach((input, idx) => input.value = mon.moves[idx] || '');
  els.editorSpeciesName.textContent = mon.displaySpecies || 'No species selected';
  els.editorTypeRow.innerHTML = '';
  (mon.data?.types || []).forEach(type => els.editorTypeRow.appendChild(createTypePill(type)));
  els.editorAbilityNote.textContent = mon.ability ? implementedAbilityNote(mon.ability) : 'Select a species to load its ability list.';
  els.editorAbilityEffect.textContent = implementedItemNote(mon.item);
  els.abilitySelect.innerHTML = (mon.data?.abilities || []).map(name => `<option value="${name}">${name}</option>`).join('') || '<option value="">No abilities loaded</option>';
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
  els.evTotal.textContent = `Total: ${evTotal} / 510`;
}
async function validateMon(mon, playerIndex, slotIndex) {
  const errors = [];
  if (!mon.displaySpecies && !mon.species) errors.push(`${state.playerNames[playerIndex]} slot ${slotIndex + 1}: choose a Pokémon.`);
  if (!mon.spriteId) errors.push(`${state.playerNames[playerIndex]} slot ${slotIndex + 1}: species must match an available uploaded sprite.`);
  if (!mon.data) errors.push(`${state.playerNames[playerIndex]} slot ${slotIndex + 1}: species data is still missing.`);
  const evTotal = Object.values(mon.evs).reduce((sum, value) => sum + Number(value || 0), 0);
  if (evTotal > 510) errors.push(`${state.playerNames[playerIndex]} slot ${slotIndex + 1}: EV total exceeds 510.`);
  for (const stat of statOrder) {
    if ((mon.evs[stat] ?? 0) > 252) errors.push(`${state.playerNames[playerIndex]} slot ${slotIndex + 1}: ${statLabels[stat]} EV exceeds 252.`);
    if ((mon.ivs[stat] ?? 31) > 31 || (mon.ivs[stat] ?? 31) < 0) errors.push(`${state.playerNames[playerIndex]} slot ${slotIndex + 1}: ${statLabels[stat]} IV must stay between 0 and 31.`);
  }
  if (mon.level < 1 || mon.level > 100) errors.push(`${state.playerNames[playerIndex]} slot ${slotIndex + 1}: level must stay between 1 and 100.`);
  if (!mon.ability) errors.push(`${state.playerNames[playerIndex]} slot ${slotIndex + 1}: choose an ability.`);
  if (mon.moves.filter(Boolean).length !== 4) errors.push(`${state.playerNames[playerIndex]} slot ${slotIndex + 1}: pick exactly four moves.`);
  for (const move of mon.moves.filter(Boolean)) {
    try {
      await getMoveData(move);
    } catch (error) {
      errors.push(`${state.playerNames[playerIndex]} slot ${slotIndex + 1}: move “${move}” could not be loaded.`);
    }
  }
  return errors;
}
async function renderValidation() {
  const allErrors = [];
  for (const [playerIndex, team] of state.teams.entries()) {
    for (const [slotIndex, mon] of team.entries()) {
      const errors = await validateMon(mon, playerIndex, slotIndex);
      allErrors.push(...errors);
    }
  }
  state.builderErrors = allErrors;
  if (allErrors.length) {
    els.builderErrors.classList.remove('hidden');
    els.builderErrors.textContent = allErrors.join('\n');
    els.validationSummary.textContent = `${allErrors.length} issue${allErrors.length === 1 ? '' : 's'} remaining before battle can start.`;
    els.startBattleBtn.disabled = true;
  } else {
    els.builderErrors.classList.add('hidden');
    els.builderErrors.textContent = '';
    els.validationSummary.textContent = 'Both teams are valid. Battle start is ready.';
    els.startBattleBtn.disabled = false;
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
    mon.species = els.speciesInput.value.trim();
    await hydrateSelectedSpecies();
    await renderValidation();
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
  els.itemInput.addEventListener('input', () => {
    const mon = getSelectedMon();
    mon.item = els.itemInput.value.trim();
    renderEditor();
    saveState();
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
    saveState();
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
      mon.moves[idx] = input.value.trim();
      saveState();
      await renderValidation();
    });
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
    const pool = ['Pikachu','Charizard','Garchomp','Dragonite','Gengar','Corviknight','Rotom','Gholdengo','Volcarona','Kingambit','Azumarill','Tyranitar','Meowscarada','Hydreigon','Mimikyu','Talonflame'];
    const moves = ['Thunderbolt','Protect','Ice Beam','Earthquake','Shadow Ball','Flamethrower','Close Combat','U-turn','Recover','Swords Dance','Nasty Plot','Leaf Blade','Play Rough','Surf','Body Press','Dragon Dance','Roost','Will-O-Wisp','Air Slash','Iron Head','Moonblast','Draco Meteor'];
    const items = commonItems;
    const mon = getSelectedMon();
    mon.species = pool[Math.floor(Math.random() * pool.length)];
    mon.item = items[Math.floor(Math.random() * items.length)];
    mon.nature = natureOrder[Math.floor(Math.random() * natureOrder.length)];
    mon.shiny = Math.random() < 0.1;
    mon.moves = Array.from({length:4}, () => moves[Math.floor(Math.random() * moves.length)]);
    await hydrateSelectedSpecies();
    renderEditor();
    await renderValidation();
    saveState();
  });
  els.exportTeamsBtn.addEventListener('click', () => {
    const lines = state.teams.flatMap((team, player) => team.map((mon, slot) => {
      const stats = calcStats(mon);
      return `${state.playerNames[player]} - Slot ${slot + 1}\n${mon.displaySpecies || mon.species} @ ${mon.item || 'No Item'}\nAbility: ${mon.ability}\nLevel: ${mon.level}\nTera Type: ${titleCase(mon.teraType || 'normal')}\n${mon.nature} Nature\nEVs: ${statOrder.map(stat => `${mon.evs[stat]} ${statLabels[stat]}`).join(' / ')}\nIVs: ${statOrder.map(stat => `${mon.ivs[stat]} ${statLabels[stat]}`).join(' / ')}\nStats: ${stats ? statOrder.map(stat => `${statLabels[stat]} ${stats[stat]}`).join(' / ') : 'pending'}\n- ${mon.moves.join('\n- ')}\n`;
    }));
    navigator.clipboard.writeText(lines.join('\n'));
    els.validationSummary.textContent = 'Teams exported to your clipboard.';
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
    log: [{text: 'Battle started. Both teams enter the field.', tone: 'accent'}],
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
  els.battleLog.innerHTML = battle.log.map(line => `<div class="log-line ${line.tone || ''}">${line.text}</div>`).join('');
  renderPendingChoices();
  const allSet = [0,1].every(player => isPlayerReady(player));
  els.battleP1Turn.className = `turn-chip ${isPlayerReady(0) ? 'done' : 'wait'}`;
  els.battleP2Turn.className = `turn-chip ${isPlayerReady(1) ? 'done' : 'wait'}`;
  els.battleP1Turn.textContent = isPlayerReady(0) ? 'Choice locked' : 'Selecting';
  els.battleP2Turn.textContent = isPlayerReady(1) ? 'Choice locked' : 'Selecting';
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
    summary.innerHTML = `<div class="mon-name-line"><strong>${mon.species}</strong>${mon.status ? `<span class="status-badge">${getStatusIcon(mon.status) ? `<img src="${getStatusIcon(mon.status)}" alt="${mon.status}"/>` : ''}${statusNames[mon.status] || mon.status}</span>` : ''}</div>
      <div class="hp-bar"><div class="hp-fill ${hpFillClass(mon)}" style="width:${hpPercent(mon)}%"></div></div>
      <div class="mon-sub">HP ${mon.hp}/${mon.maxHp}${side.active.includes(index) ? ' · Active' : ''}${mon.fainted ? ' · Fainted' : ''}</div>`;
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
  titleEl.textContent = `${side.name} choice`;
  container.innerHTML = '';
  const mustSwitchCount = side.active.filter(index => side.team[index]?.fainted).length;
  statusEl.textContent = mustSwitchCount ? 'Choose replacements for fainted active Pokémon.' : `${side.active.length} active Pokémon ready to act.`;
  for (const activeIndex of side.active) {
    const mon = side.team[activeIndex];
    const section = document.createElement('div');
    section.className = 'choice-section';
    if (!mon || mon.fainted) {
      section.innerHTML = `<h4>Replacement required</h4>`;
      const switchWrap = document.createElement('div');
      switchWrap.className = 'choice-buttons';
      switchOptionsFor(player, true).forEach(({mon: option, index}) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'choice-btn';
        btn.innerHTML = `<strong>${option.species}</strong><small>HP ${option.hp}/${option.maxHp}</small>`;
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
    section.innerHTML = `<h4>${mon.species}</h4>`;
    const moveButtons = document.createElement('div');
    moveButtons.className = 'choice-buttons';
    mon.moves.forEach(async (moveName) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `choice-btn ${choice.kind === 'move' && choice.move === moveName ? 'selected' : ''}`;
      btn.innerHTML = `<strong>${moveName}</strong><small>Loading move data…</small>`;
      moveButtons.appendChild(btn);
      try {
        const move = await getMoveData(moveName);
        btn.innerHTML = `<strong>${move.name}</strong><small>${titleCase(move.type)} · ${move.category}${move.power ? ` · ${move.power} BP` : ''}${move.accuracy ? ` · ${move.accuracy}%` : ''}</small>`;
        btn.addEventListener('click', () => {
          side.choices[activeIndex] = {kind:'move', move: move.name, target: null, tera: choice.tera || false};
          renderBattle();
        });
      } catch (error) {
        btn.innerHTML = `<strong>${moveName}</strong><small>Unavailable</small>`;
      }
    });
    section.appendChild(moveButtons);

    const toggles = document.createElement('div');
    toggles.className = 'toggle-row';
    const teraBtn = document.createElement('button');
    teraBtn.type = 'button';
    teraBtn.className = `toggle-pill ${choice.tera ? 'active' : ''}`;
    teraBtn.textContent = `Terastallize (${titleCase(mon.teraType)})`;
    teraBtn.disabled = mon.teraUsed;
    teraBtn.addEventListener('click', () => {
      choice.tera = !choice.tera;
      renderBattle();
    });
    toggles.appendChild(teraBtn);
    const switchBtn = document.createElement('button');
    switchBtn.type = 'button';
    switchBtn.className = 'toggle-pill';
    switchBtn.textContent = 'Switch';
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
      helper.textContent = 'Move selected.';
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
            btn.textContent = option.label;
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
        btn.innerHTML = `<strong>${option.species}</strong><small>HP ${option.hp}/${option.maxHp}</small>`;
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
      let text = 'Pending';
      if (choice?.kind === 'switch' && Number.isInteger(choice.switchTo)) text = `Switch → ${side.team[choice.switchTo].species}`;
      if (choice?.kind === 'move') text = choice.target ? `${choice.move} → ${battle.players[choice.target.player].team[choice.target.slot].species}` : choice.move;
      rows.push(`<div class="pending-card"><strong>${mon?.species || 'Empty slot'}</strong>${text}</div>`);
    });
  });
  els.pendingChoices.innerHTML = rows.join('');
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
  addLog(`${side.name} withdrew ${leaving?.species || 'a Pokémon'} and sent out ${incoming.species}.`, 'accent');
  if (slugify(incoming.ability) === 'intimidate') {
    state.battle.players[1-player].active.forEach(idx => {
      const target = state.battle.players[1-player].team[idx];
      if (target && !target.fainted && slugify(target.item) !== 'clear-amulet') {
        target.boosts.atk = clamp((target.boosts.atk || 0) - 1, -6, 6);
        addLog(`${incoming.species}'s Intimidate lowers ${target.species}'s Attack.`, 'accent');
      }
    });
  }
}
function canMove(mon) {
  if (!mon || mon.fainted) return {ok:false, reason:'Fainted'};
  if (mon.status === 'slp') {
    mon.sleepTurns = Math.max(0, (mon.sleepTurns || 1) - 1);
    if (mon.sleepTurns > 0) return {ok:false, reason:`${mon.species} is asleep.`};
    mon.status = '';
    return {ok:true, wake:true};
  }
  if (mon.status === 'frz' && Math.random() < 0.8) return {ok:false, reason:`${mon.species} is frozen solid.`};
  if (mon.status === 'par' && Math.random() < 0.25) return {ok:false, reason:`${mon.species} is fully paralyzed.`};
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
    addLog(`${currentMon.species} Terastallized into ${titleCase(currentMon.teraType)}-type!`, 'accent');
  }
  const targets = resolveTargets(player, action.activeIndex, choice, move);
  if (!targets.length) {
    addLog(`${currentMon.species} used ${move.name}, but there was no valid target.`);
    return;
  }
  addLog(`${currentMon.species} used ${move.name}.`, 'accent');
  if (['protect','detect'].includes(slugify(move.name))) {
    currentMon.protect = true;
    addLog(`${currentMon.species} is protected this turn.`);
    return;
  }
  if (move.category === 'status') {
    applyStatusMove(currentMon, targets, move);
    return;
  }
  for (const target of targets) {
    if (!target || target.fainted) continue;
    if (target.protect && player !== target.player) {
      addLog(`${target.species} protected itself.`);
      continue;
    }
    const accuracy = move.accuracy || 100;
    if (Math.random() * 100 >= accuracy) {
      addLog(`${currentMon.species}'s ${move.name} missed ${target.species}.`);
      continue;
    }
    const damageInfo = computeDamage(currentMon, target, move, targets.length > 1);
    let damage = damageInfo.damage;
    if (slugify(target.ability) === 'multiscale' && target.hp === target.maxHp) damage = Math.floor(damage * 0.5);
    if (slugify(target.ability) === 'flash-fire' && move.type === 'fire') {
      addLog(`${target.species}'s Flash Fire absorbed the attack.`);
      target.volatile.flashFire = true;
      continue;
    }
    if (slugify(target.ability) === 'levitate' && move.type === 'ground') {
      addLog(`${target.species} avoided the Ground-type move thanks to Levitate.`);
      continue;
    }
    if (slugify(target.item) === 'focus-sash' && target.hp === target.maxHp && damage >= target.hp) {
      damage = target.hp - 1;
      addLog(`${target.species} endured with Focus Sash!`, 'accent');
    }
    target.hp = Math.max(0, target.hp - Math.max(1, damage));
    addLog(`${target.species} lost ${damage} HP${damageInfo.effectivenessText ? ` (${damageInfo.effectivenessText})` : ''}.`);
    if (damageInfo.crit) addLog('A critical hit!');
    if (move.drain) {
      const heal = Math.max(1, Math.floor(damage * (move.drain / 100)));
      currentMon.hp = Math.min(currentMon.maxHp, currentMon.hp + heal);
      addLog(`${currentMon.species} restored ${heal} HP.`);
    }
    if (slugify(currentMon.item) === 'life-orb') {
      const recoil = Math.max(1, Math.floor(currentMon.maxHp / 10));
      currentMon.hp = Math.max(0, currentMon.hp - recoil);
      addLog(`${currentMon.species} was hurt by Life Orb.`);
    }
    if (slugify(target.item) === 'rocky-helmet' && move.category === 'physical') {
      const recoil = Math.max(1, Math.floor(currentMon.maxHp / 6));
      currentMon.hp = Math.max(0, currentMon.hp - recoil);
      addLog(`${currentMon.species} was hurt by Rocky Helmet.`);
    }
    maybeApplySecondary(currentMon, target, move);
    if (target.hp <= 0) {
      target.fainted = true;
      target.hp = 0;
      addLog(`${target.species} fainted.`, 'win');
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
    addLog(`${user.species} restored ${heal} HP.`);
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
      addLog(`${target.species}'s stats changed.`);
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
    addLog(`${target.species}'s stats changed from the secondary effect.`);
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
  addLog(`${target.species} is now ${statusNames[status].toLowerCase()}.`);
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
    effectivenessText = 'No effect';
  } else if (effectiveness >= 2) effectivenessText = 'Super effective';
  else if (effectiveness < 1) effectivenessText = 'Not very effective';
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
        addLog(`${side.name} sends out ${replacement.mon.species}.`, 'accent');
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
        addLog(`${mon.species} was hurt by its burn.`);
      }
      if (mon.status === 'psn') {
        const dmg = Math.max(1, Math.floor(mon.maxHp / 8));
        mon.hp = Math.max(0, mon.hp - dmg);
        addLog(`${mon.species} was hurt by poison.`);
      }
      if (mon.status === 'tox') {
        mon.toxicCounter = Math.max(1, mon.toxicCounter + 1);
        const dmg = Math.max(1, Math.floor(mon.maxHp * mon.toxicCounter / 16));
        mon.hp = Math.max(0, mon.hp - dmg);
        addLog(`${mon.species} was hurt by toxic poison.`);
      }
      if (slugify(mon.item) === 'leftovers' && !mon.fainted) {
        const heal = Math.max(1, Math.floor(mon.maxHp / 16));
        mon.hp = Math.min(mon.maxHp, mon.hp + heal);
        addLog(`${mon.species} restored a little HP with Leftovers.`);
      }
      if (slugify(mon.item) === 'black-sludge' && mon.types.includes('poison')) {
        const heal = Math.max(1, Math.floor(mon.maxHp / 16));
        mon.hp = Math.min(mon.maxHp, mon.hp + heal);
        addLog(`${mon.species} restored HP with Black Sludge.`);
      }
      if (slugify(mon.item) === 'sitrus-berry' && mon.hp > 0 && mon.hp <= mon.maxHp / 2 && !mon.volatile.usedSitrus) {
        const heal = Math.max(1, Math.floor(mon.maxHp / 4));
        mon.hp = Math.min(mon.maxHp, mon.hp + heal);
        mon.volatile.usedSitrus = true;
        addLog(`${mon.species} restored HP with Sitrus Berry.`);
      }
      if (mon.hp <= 0) {
        mon.hp = 0;
        mon.fainted = true;
        addLog(`${mon.species} fainted.`, 'win');
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
    battle.winner = 'Draw';
    addLog('Both teams are out of usable Pokémon. Draw game.', 'win');
    return;
  }
  battle.winner = alive[0] ? battle.players[0].name : battle.players[1].name;
  addLog(`${battle.winner} wins the battle!`, 'win');
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
  showRuntime('Loading uploaded assets, sprite manifest, and PokéAPI move list…', 'loading');
  resetTeams();
  await loadManifest();
  loadSavedState();
  await loadMoveNames();
  buildStaticLists();
  wireEditorEvents();
  wireBattleEvents();
  renderAll();
  state.runtimeReady = true;
  showRuntime(
    'Runtime ready. The app is GitHub Pages-safe and uses your uploaded sprite, type, item, and status assets locally.',
    'ready',
    'Battle data for species and moves is loaded from PokéAPI at runtime. The current build supports singles and doubles, animated uploaded sprites, IV/EV + nature stat calculation, turn order by priority and speed, Terastallization, and a practical subset of held-item / ability effects.'
  );
}

bootstrap().catch(error => {
  console.error(error);
  showRuntime(
    'Startup failed. Check the browser console and confirm that the site can reach PokéAPI.',
    'error',
    `Error: ${error.message}`
  );
});
