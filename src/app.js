import {loadLocalDex, LOCAL_NATURES, LOCAL_NATURE_ORDER, LOCAL_TYPE_IDS, LOCAL_TYPES, LOCAL_TYPE_CHART} from './local-dex.js';
import {KO_NAME_MAPS} from './i18n-ko-data.js';
import {OFFICIAL_KO_SPECIES, OFFICIAL_KO_ITEMS} from './i18n-ko-official.js';
import {probeShowdownLocalServer, startShowdownLocalSinglesBattle, submitShowdownLocalSinglesChoices, isShowdownLocalBattle} from './engine/showdown-local-bridge.js';
import {Aliases} from './data/aliases.js';

const STORAGE_KEY = 'pkb-static-state-v3';
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
const implementedAbilities = new Set(['intimidate','levitate','technician','adaptability','multiscale','flash-fire','sticky-hold']);
const implementedItems = new Set(['leftovers','lifeorb','choiceband','choicespecs','choicescarf','focussash','assaultvest','sitrusberry','rockyhelmet','expertbelt','lumberry','eviolite','clearamulet','scopelens','muscleband','wiseglasses','mysticwater','charcoal','miracleseed','magnet','blackglasses','nevermeltice','softsand','dragonfang','pixieplate','poisonbarb','silverpowder','spelltag','sharpbeak','twistedspoon','hardstone','silkscarf','metalcoat','blacksludge','heavydutyboots','airballoon','damprock','heatrock','smoothrock','icyrock','terrainextender','lightclay']);
const VALIDATION_PROFILES = {
  open: {
    id: 'open',
    label: '자유 규칙 / Open custom',
    description: '프로젝트 전체 범위를 넓게 허용합니다. 중복 종족 / 도구는 경고만 띄웁니다. / Broad project-scope validation. Duplicate species and items stay as warnings only.',
    enforceSpeciesClause: false,
    enforceItemClause: false,
    forcedLevel: null,
    recommendedMode: null,
  },
  standardsingles: {
    id: 'standardsingles',
    label: '스탠다드 싱글 느낌 / Standard-style singles',
    description: '싱글용 기본 클로즈를 더 엄격하게 적용합니다. 종족 중복은 불가이며 도구 중복은 허용합니다. / Stricter singles-style clauses: Species Clause on, Item Clause off.',
    enforceSpeciesClause: true,
    enforceItemClause: false,
    forcedLevel: null,
    recommendedMode: 'singles',
  },
  vgcdoubles: {
    id: 'vgcdoubles',
    label: 'VGC 스타일 더블 / VGC-style doubles',
    description: '더블 + 종족 클로즈 + 도구 클로즈 + 레벨 50 고정 검증을 적용합니다. / Doubles with Species Clause, Item Clause, and fixed level 50 validation.',
    enforceSpeciesClause: true,
    enforceItemClause: true,
    forcedLevel: 50,
    recommendedMode: 'doubles',
  },
};

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
const MOVE_FLAG_LABELS = Object.freeze({
  contact: ['접촉', 'Contact'],
  protect: ['방어 영향', 'Affected by Protect'],
  reflectable: ['매직코트 반사', 'Reflectable'],
  bypasssub: ['대타 관통', 'Bypasses Substitute'],
  mirror: ['미러무브 가능', 'Mirror Move'],
  heal: ['회복 계열', 'Healing move'],
  sound: ['소리 기술', 'Sound move'],
  powder: ['가루 기술', 'Powder move'],
  pulse: ['파동 기술', 'Pulse move'],
  punch: ['주먹 기술', 'Punch move'],
  bite: ['물기 기술', 'Biting move'],
  slicing: ['베기 기술', 'Slicing move'],
  bullet: ['탄/폭탄 기술', 'Ball/Bomb move'],
  dance: ['춤 기술', 'Dance move'],
  wind: ['바람 기술', 'Wind move'],
  snatch: ['가로채기 대상', 'Snatchable'],
  recharge: ['다음 턴 쉬기', 'Needs recharge'],
});
const VOLATILE_STATUS_LABELS = Object.freeze({
  encore: ['앵콜 상태', 'Encore'],
  leechseed: ['씨뿌리기', 'Leech Seed'],
  confusion: ['혼란', 'Confusion'],
  flinch: ['풀죽음', 'Flinch'],
  protect: ['방어', 'Protect'],
  substitute: ['대타출동', 'Substitute'],
  yawn: ['하품', 'Yawn'],
  taunt: ['도발', 'Taunt'],
  disable: ['금지', 'Disable'],
  torment: ['괴롭힘', 'Torment'],
  embargo: ['금제', 'Embargo'],
  nightmare: ['악몽', 'Nightmare'],
});
const SIDE_CONDITION_LABELS = Object.freeze({
  stealthrock: ['스텔스록', 'Stealth Rock'],
  spikes: ['압정뿌리기', 'Spikes'],
  toxicspikes: ['독압정', 'Toxic Spikes'],
  stickyweb: ['끈적끈적네트', 'Sticky Web'],
  tailwind: ['순풍', 'Tailwind'],
  reflect: ['리플렉터', 'Reflect'],
  lightscreen: ['빛의장막', 'Light Screen'],
  auroraveil: ['오로라베일', 'Aurora Veil'],
});
const WEATHER_LABELS = Object.freeze({
  rain: ['비', 'Rain'],
  raindance: ['비', 'Rain'],
  primordialsea: ['폭우', 'Heavy Rain'],
  sun: ['쾌청', 'Sun'],
  sunnyday: ['쾌청', 'Sun'],
  desolateland: ['강한 햇살', 'Harsh Sun'],
  sand: ['모래바람', 'Sandstorm'],
  sandstorm: ['모래바람', 'Sandstorm'],
  snow: ['눈', 'Snow'],
  hail: ['싸라기눈', 'Hail'],
});
const TERRAIN_LABELS = Object.freeze({
  electricterrain: ['일렉트릭필드', 'Electric Terrain'],
  grassyterrain: ['그래스필드', 'Grassy Terrain'],
  mistyterrain: ['미스트필드', 'Misty Terrain'],
  psychicterrain: ['사이코필드', 'Psychic Terrain'],
});

const typeChart = LOCAL_TYPE_CHART;

const moveNameCache = [];
const speciesDataCache = new Map();
const moveDataCache = new Map();
const itemDataCache = new Map();
const imageInfoCache = new Map();

const FORM_ASSET_OVERRIDES = Object.freeze({
  'Eevee-Gmax': 'EEVEE_2',
  'Greninja-Bond': 'GRENINJA_2',
  'Greninja-Ash': 'GRENINJA_2',
  'Greninja-Mega': 'GRENINJA_3',
  'Pikachu-Rock-Star': 'PIKACHU_3',
  'Pikachu-Belle': 'PIKACHU_4',
  'Pikachu-Pop-Star': 'PIKACHU_5',
  'Pikachu-PhD': 'PIKACHU_6',
  'Pikachu-Libre': 'PIKACHU_7',
  'Pikachu-Gmax': 'PIKACHU_17',
  'Zygarde-10%': 'ZYGARDE_1',
  'Zygarde-Complete': 'ZYGARDE_3',
  'Zygarde-Mega': 'ZYGARDE_5',
});
const EXPLICIT_ONLY_FORM_FAMILIES = new Set(['EEVEE', 'GRENINJA', 'PIKACHU']);

const MAX_MOVE_NAMES = Object.freeze({
  normal: 'Max Strike',
  fighting: 'Max Knuckle',
  flying: 'Max Airstream',
  poison: 'Max Ooze',
  ground: 'Max Quake',
  rock: 'Max Rockfall',
  bug: 'Max Flutterby',
  ghost: 'Max Phantasm',
  steel: 'Max Steelspike',
  fire: 'Max Flare',
  water: 'Max Geyser',
  grass: 'Max Overgrowth',
  electric: 'Max Lightning',
  psychic: 'Max Mindstorm',
  ice: 'Max Hailstorm',
  dragon: 'Max Wyrmwind',
  dark: 'Max Darkness',
  fairy: 'Max Starfall',
  stellar: 'Max Strike',
});
const GENERIC_Z_MOVE_NAMES = Object.freeze({
  normal: 'Breakneck Blitz',
  fighting: 'All-Out Pummeling',
  flying: 'Supersonic Skystrike',
  poison: 'Acid Downpour',
  ground: 'Tectonic Rage',
  rock: 'Continental Crush',
  bug: 'Savage Spin-Out',
  ghost: 'Never-Ending Nightmare',
  steel: 'Corkscrew Crash',
  fire: 'Inferno Overdrive',
  water: 'Hydro Vortex',
  grass: 'Bloom Doom',
  electric: 'Gigavolt Havoc',
  psychic: 'Shattered Psyche',
  ice: 'Subzero Slammer',
  dragon: 'Devastating Drake',
  dark: 'Black Hole Eclipse',
  fairy: 'Twinkle Tackle',
  stellar: 'Breakneck Blitz',
});
const DYNAMAX_BANNED_SPECIES = new Set(['zacian', 'zamazenta', 'eternatus']);
const TERA_LOW_POWER_EXEMPT_MOVES = new Set([
  'waterspout','eruption','electroball','gyroball','heatcrash','heavyslam','grassknot','lowkick','flail','reversal','wringout','crushgrip','storedpower','powertrip','magnitude','naturalgift','present','spitup','trumpcard','weatherball','terrainpulse','risingvoltage','dragonenergy'
]);

const PROTECT_MOVE_IDS = new Set(['protect','detect','maxguard','spikyshield','kingsshield','banefulbunker','silktrap','burningbulwark','obstruct']);
const SCREEN_MOVE_IDS = new Set(['reflect','lightscreen','auroraveil']);
const CHOICE_ITEM_IDS = new Set(['choiceband','choicespecs','choicescarf']);
const STRUGGLE_MOVE = Object.freeze({
  id: 'struggle',
  name: 'Struggle',
  apiName: 'struggle',
  power: 50,
  accuracy: 100,
  pp: 1,
  priority: 0,
  type: 'typeless',
  category: 'physical',
  target: 'single-opponent',
  critRate: 0,
  drain: 0,
  healing: 0,
  minHits: 1,
  maxHits: 1,
  ailment: 'none',
  ailmentChance: 0,
  flinchChance: 0,
  statChance: 0,
  statChanges: [],
  effectChance: 0,
  metaCategory: '',
  isNonstandard: null,
  isZ: false,
  isMax: false,
  zBasePower: 0,
  zBoosts: {},
  zEffect: '',
  maxBasePower: 0,
  flags: {protect: true, contact: true},
  sideCondition: '',
  weather: '',
  terrain: '',
  stallingMove: false,
  breaksProtect: false,
  selfSwitch: '',
  forceSwitch: false,
  recoil: 25,
  selfBoosts: {},
  selfAilment: '',
  selfVolatileStatus: '',
});

function normalizeAssetFamilyKey(name) {
  return toId(name).toUpperCase();
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
function parseAssetFamilies(list = []) {
  const families = new Map();
  for (const rawId of list) {
    const id = String(rawId || '');
    const match = /^(.+?)(?:_(female|male|\d+))?$/i.exec(id);
    if (!match) continue;
    const baseId = match[1];
    const suffix = match[2] || '';
    if (!families.has(baseId)) {
      families.set(baseId, {
        baseId,
        baseExists: false,
        numeric: new Map(),
        genders: {},
        rawAssetIds: [],
      });
    }
    const family = families.get(baseId);
    family.rawAssetIds.push(id);
    if (!suffix) family.baseExists = true;
    else if (/^\d+$/.test(suffix)) family.numeric.set(Number(suffix), id);
    else family.genders[suffix.toLowerCase()] = id;
  }
  for (const family of families.values()) {
    family.rawAssetIds.sort((a, b) => a.localeCompare(b, undefined, {numeric: true}));
  }
  return families;
}
function buildFamilyFormNames(baseSpeciesName, familySpeciesNames, baseEntry) {
  const ordered = [];
  const seen = new Set();
  const pushName = (name) => {
    const key = toId(name);
    if (!key || seen.has(key) || key === toId(baseSpeciesName)) return;
    seen.add(key);
    ordered.push(name);
  };
  for (const name of baseEntry?.formeOrder || []) pushName(name);
  const extras = (familySpeciesNames || []).filter(name => {
    const key = toId(name);
    return key && key !== toId(baseSpeciesName) && !seen.has(key);
  }).sort((a, b) => {
    const aName = String(a).replace(new RegExp(`^${baseSpeciesName}-`, 'i'), '');
    const bName = String(b).replace(new RegExp(`^${baseSpeciesName}-`, 'i'), '');
    return aName.localeCompare(bName, undefined, {numeric: true});
  });
  extras.forEach(pushName);
  return uniqueNames(ordered);
}
function buildAssetDex() {
  if (!state.manifest?.pokemon?.front?.length || !state.dex) {
    state.assetDex = null;
    state.speciesChoices = [];
    state.allSpeciesChoices = [];
    return;
  }

  const frontFamilies = parseAssetFamilies(state.manifest.pokemon.front);
  const allSpecies = state.dex.species.all().filter(species => species?.exists);
  const familyLookup = new Map();
  const speciesByBase = new Map();
  for (const species of allSpecies) {
    const baseSpeciesName = species.baseSpecies || species.name;
    if (!speciesByBase.has(baseSpeciesName)) speciesByBase.set(baseSpeciesName, []);
    speciesByBase.get(baseSpeciesName).push(species.name);
    const assetKey = normalizeAssetFamilyKey(baseSpeciesName);
    if (!familyLookup.has(assetKey)) familyLookup.set(assetKey, baseSpeciesName);
  }

  const assetDex = {
    families: new Map(),
    familyBySpecies: new Map(),
    speciesToAsset: new Map(),
    allSpeciesChoices: [],
  };

  for (const [assetBaseId, assetFamily] of frontFamilies.entries()) {
    const baseSpeciesName = familyLookup.get(assetBaseId) || humanizeSpriteId(assetBaseId);
    const baseEntry = state.dex.species.get(baseSpeciesName);
    const familySpeciesNames = uniqueNames([baseSpeciesName, ...(speciesByBase.get(baseSpeciesName) || [])]);
    const orderedForms = buildFamilyFormNames(baseSpeciesName, familySpeciesNames, baseEntry);
    const speciesToAsset = new Map();
    const assetToSpecies = new Map();

    if (assetFamily.baseExists) {
      speciesToAsset.set(baseSpeciesName, assetBaseId);
      assetToSpecies.set(assetBaseId, baseSpeciesName);
    }

    if (!EXPLICIT_ONLY_FORM_FAMILIES.has(assetBaseId)) {
      const numericAssetIds = Array.from(assetFamily.numeric.entries())
        .sort((a, b) => a[0] - b[0])
        .map(([, assetId]) => assetId);
      for (const [index, formName] of orderedForms.entries()) {
        const assetId = numericAssetIds[index];
        if (assetId) {
          speciesToAsset.set(formName, assetId);
          assetToSpecies.set(assetId, formName);
        }
      }
    }

    for (const [speciesName, assetId] of Object.entries(FORM_ASSET_OVERRIDES)) {
      const speciesData = state.dex.species.get(speciesName);
      const speciesBase = speciesData?.exists ? (speciesData.baseSpecies || speciesData.name) : speciesName.split('-')[0];
      if (toId(speciesBase) !== toId(baseSpeciesName)) continue;
      if (!assetFamily.rawAssetIds.includes(assetId)) continue;
      speciesToAsset.set(speciesName, assetId);
      assetToSpecies.set(assetId, speciesName);
    }

    const unresolvedFormOrder = orderedForms.filter(name => !speciesToAsset.has(name));
    if (orderedForms.length === 1 && unresolvedFormOrder.length === 1 && assetFamily.numeric.size === 1) {
      const onlyAssetId = Array.from(assetFamily.numeric.values())[0];
      speciesToAsset.set(unresolvedFormOrder[0], onlyAssetId);
      assetToSpecies.set(onlyAssetId, unresolvedFormOrder[0]);
    }

    const allFormChoices = familySpeciesNames.map(speciesName => {
      const speciesData = state.dex.species.get(speciesName);
      const requirementLocked = Boolean(
        speciesData?.requiredItem
        || speciesData?.requiredItems?.length
        || speciesData?.requiredMove
        || speciesData?.requiredAbility
        || speciesData?.requiredTeraType
      );
      const selectable = Boolean(speciesData?.exists) && !speciesData.battleOnly;
      const selectableManual = Boolean(speciesData?.exists) && !speciesData?.battleOnly && (!requirementLocked || speciesName === baseSpeciesName);
      const assetId = speciesToAsset.get(speciesName) || '';
      const display = displaySpeciesName(speciesName);
      return {
        speciesName: speciesData?.name || speciesName,
        display,
        assetId,
        selectable,
        selectableManual,
        hasAsset: Boolean(assetId),
        battleOnly: Boolean(speciesData?.battleOnly),
        requirementLocked,
      };
    });
    const formChoices = allFormChoices.filter(choice => choice.selectableManual || choice.speciesName === baseSpeciesName);

    const assetChoices = [];
    if (assetFamily.baseExists) {
      assetChoices.push({
        id: assetBaseId,
        display: `${displaySpeciesName(assetToSpecies.get(assetBaseId) || baseSpeciesName)} · ${assetBaseId}`,
      });
    }
    const numericEntries = Array.from(assetFamily.numeric.entries()).sort((a, b) => a[0] - b[0]);
    for (const [, assetId] of numericEntries) {
      assetChoices.push({
        id: assetId,
        display: `${displaySpeciesName(assetToSpecies.get(assetId) || humanizeSpriteId(assetId))} · ${assetId}`,
      });
    }
    for (const genderKey of ['female', 'male']) {
      if (assetFamily.genders[genderKey]) {
        assetChoices.push({
          id: assetFamily.genders[genderKey],
          display: `${displaySpeciesName(baseSpeciesName)} ${genderKey === 'female' ? '♀' : '♂'} · ${assetFamily.genders[genderKey]}`,
        });
      }
    }

    const family = {
      assetBaseId,
      baseSpeciesName,
      assetFamily,
      formChoices,
      allFormChoices,
      assetChoices,
      speciesToAsset,
      assetToSpecies,
    };
    assetDex.families.set(baseSpeciesName, family);
    for (const speciesName of familySpeciesNames) {
      assetDex.familyBySpecies.set(speciesName, family);
      if (speciesToAsset.has(speciesName)) assetDex.speciesToAsset.set(speciesName, speciesToAsset.get(speciesName));
      const speciesData = state.dex.species.get(speciesName);
      if (speciesData?.exists && !speciesData.battleOnly) {
        assetDex.allSpeciesChoices.push(makeChoice('species', speciesData.name, {
          family: baseSpeciesName,
          assetId: speciesToAsset.get(speciesData.name) || '',
        }));
      }
    }
  }

  const baseChoices = Array.from(assetDex.families.values())
    .map(family => makeChoice('species', family.baseSpeciesName, {
      assetId: family.assetBaseId,
      family: family.baseSpeciesName,
      formSearchTerms: uniqueNames((family.allFormChoices || []).flatMap(choice => [
        choice?.speciesName,
        displaySpeciesName(choice?.speciesName || ''),
      ])),
    }))
    .sort((a, b) => a.english.localeCompare(b.english));

  state.assetDex = assetDex;
  state.speciesChoices = baseChoices;
  state.allSpeciesChoices = uniqueNames(assetDex.allSpeciesChoices.map(choice => choice.english))
    .map(name => assetDex.allSpeciesChoices.find(choice => choice.english === name))
    .sort((a, b) => a.english.localeCompare(b.english));
}
function getFamilyForSpecies(speciesName) {
  if (!state.assetDex) return null;
  const normalized = normalizeLocalizedInput('species', speciesName, state.allSpeciesChoices || state.speciesChoices || []);
  if (state.assetDex.familyBySpecies.has(normalized)) return state.assetDex.familyBySpecies.get(normalized);
  const data = state.dex?.species?.get(normalized);
  if (data?.exists) return state.assetDex.familyBySpecies.get(data.baseSpecies || data.name) || null;
  return null;
}
function resolveSpeciesSelection(rawValue) {
  const normalized = normalizeLocalizedInput('species', rawValue, state.allSpeciesChoices || state.speciesChoices || []);
  if (!normalized) return {baseSpeciesName: '', speciesName: '', family: null};
  const speciesData = state.dex?.species?.get(normalized);
  if (speciesData?.exists) {
    const speciesName = speciesData.name;
    const baseSpeciesName = speciesData.baseSpecies || speciesName;
    return {
      speciesName,
      baseSpeciesName,
      family: getFamilyForSpecies(speciesName) || getFamilyForSpecies(baseSpeciesName),
    };
  }
  const family = getFamilyForSpecies(normalized);
  const baseSpeciesName = family?.baseSpeciesName || normalized;
  return {speciesName: baseSpeciesName, baseSpeciesName, family};
}
function isRequirementLockedBuilderForm(speciesData) {
  return Boolean(
    speciesData?.requiredItem
    || speciesData?.requiredItems?.length
    || speciesData?.requiredMove
    || speciesData?.requiredAbility
    || speciesData?.requiredTeraType
  );
}
function isSelectableManualBuilderForm(speciesData, baseSpeciesName = '') {
  if (!speciesData?.exists) return false;
  if (speciesData.battleOnly) return false;
  if ((speciesData.baseSpecies || speciesData.name) === speciesData.name) return true;
  if ((speciesData.name || '') === baseSpeciesName) return true;
  return !isRequirementLockedBuilderForm(speciesData);
}
function getFormChoicesForSpecies(baseSpeciesName) {
  const family = getFamilyForSpecies(baseSpeciesName);
  if (!family) return [];
  return (family.allFormChoices || family.formChoices || []).filter(choice => {
    const speciesData = state.dex?.species?.get(choice.speciesName);
    return isSelectableManualBuilderForm(speciesData, family.baseSpeciesName);
  });
}
function sanitizeManualFormSpecies(mon, baseSpeciesName = '') {
  const choices = getFormChoicesForSpecies(baseSpeciesName);
  const raw = normalizeLocalizedInput('species', mon?.manualFormSpecies || mon?.formSpecies || mon?.species || baseSpeciesName, state.allSpeciesChoices || state.speciesChoices || []);
  const matched = choices.find(choice => toId(choice.speciesName) === toId(raw));
  return matched?.speciesName || baseSpeciesName;
}
function matchesAutomaticFormRequirements(speciesData, mon) {
  if (!speciesData?.exists) return false;
  const requiredItems = [speciesData.requiredItem, ...(speciesData.requiredItems || [])].filter(Boolean);
  const hasItemRequirement = requiredItems.length > 0;
  const hasMoveRequirement = Boolean(speciesData.requiredMove);
  const hasAbilityRequirement = Boolean(speciesData.requiredAbility);
  const hasTeraRequirement = Boolean(speciesData.requiredTeraType);
  if (!hasItemRequirement && !hasMoveRequirement && !hasAbilityRequirement && !hasTeraRequirement) return false;
  if (speciesData.battleOnly && !hasItemRequirement) return false;
  if (hasItemRequirement && !requiredItems.some(item => toId(item) === toId(mon?.item))) return false;
  if (hasMoveRequirement && !(mon?.moves || []).some(move => toId(move) === toId(speciesData.requiredMove))) return false;
  if (hasAbilityRequirement && toId(mon?.ability) !== toId(speciesData.requiredAbility)) return false;
  if (hasTeraRequirement && toId(mon?.teraType) !== toId(speciesData.requiredTeraType)) return false;
  return true;
}
function resolveAutomaticBuilderSpecies(mon, manualSpecies = '') {
  const family = getFamilyForSpecies(manualSpecies || mon?.baseSpecies || mon?.species || '');
  if (!family || !state.dex) return manualSpecies || mon?.baseSpecies || '';
  const candidates = (family.allFormChoices || family.formChoices || [])
    .map(choice => state.dex.species.get(choice.speciesName))
    .filter(speciesData => speciesData?.exists && matchesAutomaticFormRequirements(speciesData, mon));
  return candidates[0]?.name || manualSpecies || family.baseSpeciesName;
}
function getAutoSpriteIdForSpecies(speciesName, gender = '', baseSpeciesName = '') {
  const family = getFamilyForSpecies(speciesName || baseSpeciesName);
  if (!family) return '';
  const resolvedSpecies = normalizeLocalizedInput('species', speciesName || baseSpeciesName, state.allSpeciesChoices || state.speciesChoices || []) || speciesName || baseSpeciesName || family.baseSpeciesName;
  let assetId = family.speciesToAsset.get(resolvedSpecies) || family.speciesToAsset.get(baseSpeciesName) || family.assetBaseId;
  if (gender && toId(resolvedSpecies) === toId(family.baseSpeciesName)) {
    const genderAsset = family.assetFamily.genders[gender === 'F' ? 'female' : gender === 'M' ? 'male' : ''];
    if (genderAsset) assetId = genderAsset;
  }
  return assetId || '';
}
function syncMonSprite(mon) {
  const autoId = getAutoSpriteIdForSpecies(mon.formSpecies || mon.species || mon.manualFormSpecies || mon.baseSpecies, mon.gender, mon.baseSpecies);
  mon.spriteOverrideId = '';
  mon.spriteAutoId = autoId;
  mon.spriteId = autoId || '';
}
function renderFormSelectors(mon) {
  if (!els.formeSelect) return;
  const family = getFamilyForSpecies(mon.manualFormSpecies || mon.baseSpecies || mon.formSpecies || mon.species);
  const formChoices = family ? getFormChoicesForSpecies(family.baseSpeciesName) : [];
  els.formeSelect.innerHTML = formChoices.length
    ? formChoices.map(choice => `<option value="${choice.speciesName}">${choice.display}${choice.hasAsset ? '' : ' · 에셋 없음 / no sprite'}</option>`).join('\n')
    : '<option value="">기본 폼만 사용 / Base form only</option>';
  els.formeSelect.disabled = !formChoices.length;
  const selectedForm = formChoices.find(choice => toId(choice.speciesName) === toId(mon.manualFormSpecies || mon.baseSpecies || mon.species))
    ? formChoices.find(choice => toId(choice.speciesName) === toId(mon.manualFormSpecies || mon.baseSpecies || mon.species)).speciesName
    : (formChoices[0]?.speciesName || '');
  if (selectedForm) els.formeSelect.value = selectedForm;
  else if (!formChoices.length) els.formeSelect.value = '';
}
function applySpeciesSelection(mon, speciesName) {
  const resolved = resolveSpeciesSelection(speciesName);
  const nextBaseSpecies = resolved.baseSpeciesName || speciesName || '';
  const nextManualSpecies = sanitizeManualFormSpecies({manualFormSpecies: resolved.speciesName || speciesName || nextBaseSpecies}, nextBaseSpecies);
  mon.baseSpecies = nextBaseSpecies;
  mon.manualFormSpecies = nextManualSpecies;
  mon.formSpecies = nextManualSpecies || nextBaseSpecies;
  mon.species = mon.formSpecies || mon.baseSpecies;
  mon.displaySpecies = mon.formSpecies || mon.baseSpecies;
  mon.spriteOverrideId = '';
}
function isMegaSpeciesName(speciesName = '') {
  return /-mega/i.test(speciesName);
}
function getMegaCandidateForMon(mon) {
  const family = getFamilyForSpecies(mon.baseSpecies || mon.species);
  if (!family || !mon?.item) return null;
  const candidates = family.formChoices.filter(choice => /-mega/i.test(choice.speciesName));
  const matched = candidates.find(choice => {
    const species = state.dex.species.get(choice.speciesName);
    return species?.exists && species.requiredItem && toId(species.requiredItem) === toId(mon.item);
  });
  if (!matched) return null;
  const species = state.dex.species.get(matched.speciesName);
  return species?.exists ? {speciesName: species.name, assetId: matched.assetId || getAutoSpriteIdForSpecies(species.name, mon.gender, family.baseSpeciesName)} : null;
}
function calcStatsForSpeciesData(mon, speciesData) {
  return calcStats({
    ...mon,
    data: {stats: {...(speciesData?.stats || {})}},
  });
}
function applyBattleFormChange(mon, speciesData, spriteId = '') {
  if (!mon || !speciesData) return;
  const hpRatio = mon.maxHp > 0 ? mon.hp / mon.maxHp : 1;
  const recalculated = calcStatsForSpeciesData(mon, speciesData);
  mon.originalData = speciesData;
  mon.baseSpecies = speciesData.baseSpecies || speciesData.name;
  mon.species = speciesData.name;
  mon.formSpecies = speciesData.name;
  mon.types = [...(speciesData.types || [])];
  mon.originalTypes = [...(speciesData.types || [])];
  mon.ability = Object.values(speciesData.abilityMap || {}).filter(Boolean)[0] || speciesData.requiredAbility || mon.ability;
  mon.stats = recalculated;
  mon.maxHp = recalculated?.hp || mon.maxHp;
  mon.hp = Math.max(1, Math.min(mon.maxHp, Math.floor(mon.maxHp * hpRatio)));
  mon.spriteAutoId = spriteId || getAutoSpriteIdForSpecies(speciesData.name, mon.gender, mon.baseSpecies);
  mon.spriteId = mon.spriteAutoId;
}
function preserveHpRatio(mon, nextMaxHp, {allowZero = false} = {}) {
  if (!mon) return;
  const ratio = mon.maxHp > 0 ? mon.hp / mon.maxHp : 1;
  mon.maxHp = Math.max(1, Math.floor(nextMaxHp || 1));
  if (allowZero && mon.hp <= 0) {
    mon.hp = 0;
    return;
  }
  mon.hp = Math.max(1, Math.min(mon.maxHp, Math.round(mon.maxHp * ratio)));
}
function findResolvedFormAsset(baseSpeciesName, formSuffix) {
  const family = getFamilyForSpecies(baseSpeciesName);
  if (!family) return null;
  const targetId = toId(`${baseSpeciesName}-${formSuffix}`);
  return family.formChoices.find(choice => toId(choice.speciesName) === targetId && choice.assetId) || null;
}
function getGigantamaxAssetId(mon) {
  const resolved = findResolvedFormAsset(mon?.baseSpecies || mon?.species, 'Gmax');
  return resolved?.assetId || '';
}
function hasStabType(mon, moveType) {
  return (mon?.originalTypes || []).includes(moveType) || (mon?.types || []).includes(moveType);
}
function getStabMultiplier(mon, moveType) {
  if (!moveType || !mon) return 1;
  const abilityId = slugify(mon.ability);
  const teraType = mon.terastallized ? toId(mon.teraType) : '';
  const originalTypes = mon.originalTypes || [];
  const currentTypes = mon.types || [];
  if (!teraType) {
    if (!currentTypes.includes(moveType)) return 1;
    return abilityId === 'adaptability' ? 2 : 1.5;
  }
  const matchesOriginal = originalTypes.includes(moveType);
  const matchesTera = teraType === moveType;
  if (matchesOriginal && matchesTera) return abilityId === 'adaptability' ? 2.25 : 2;
  if (matchesTera) return abilityId === 'adaptability' ? 2 : 1.5;
  if (matchesOriginal) return abilityId === 'adaptability' ? 2 : 1.5;
  return 1;
}
function teraPowerBoostApplies(mon, move) {
  if (!mon?.terastallized || !move?.power || move.power >= 60) return false;
  if (move.priority > 0) return false;
  if ((move.maxHits || 1) > 1) return false;
  return !TERA_LOW_POWER_EXEMPT_MOVES.has(toId(move.baseMoveName || move.name));
}
function getBattleMoveType(mon, move) {
  if (toId(move?.baseMoveName || move?.name) === 'terablast' && mon?.terastallized && mon.teraType) return toId(mon.teraType);
  return toId(move?.type);
}
function getBattleMoveCategory(mon, move) {
  if (toId(move?.baseMoveName || move?.name) === 'terablast' && mon?.terastallized) {
    return getModifiedStat(mon, 'atk') > getModifiedStat(mon, 'spa') ? 'physical' : 'special';
  }
  return move?.category || 'status';
}
function getDefaultZMovePower(basePower) {
  if (basePower >= 140) return 200;
  if (basePower >= 130) return 195;
  if (basePower >= 120) return 190;
  if (basePower >= 110) return 185;
  if (basePower >= 100) return 180;
  if (basePower >= 90) return 175;
  if (basePower >= 80) return 160;
  if (basePower >= 70) return 140;
  if (basePower >= 60) return 120;
  return 100;
}
function getDefaultMaxMovePower(move) {
  if (!move || move.category === 'status') return 0;
  if (move.maxBasePower) return move.maxBasePower;
  const bp = move.power || 0;
  const lighterTypes = new Set(['fighting', 'poison']);
  const type = toId(move.type);
  if (bp >= 150) return lighterTypes.has(type) ? 100 : 150;
  if (bp >= 110) return lighterTypes.has(type) ? 95 : 140;
  if (bp >= 75) return lighterTypes.has(type) ? 90 : 130;
  if (bp >= 65) return lighterTypes.has(type) ? 85 : 120;
  if (bp >= 55) return lighterTypes.has(type) ? 80 : 110;
  if (bp >= 45) return lighterTypes.has(type) ? 75 : 100;
  return lighterTypes.has(type) ? 70 : 90;
}
function getMaxMoveName(mon, move) {
  if (!move || move.category === 'status') return 'Max Guard';
  if (mon?.gmaxMove && mon?.gigantamaxed) return mon.gmaxMove;
  return MAX_MOVE_NAMES[toId(move.type)] || 'Max Strike';
}
function canDynamax(mon, side) {
  if (state.battle && isShowdownLocalBattle(state.battle)) return false;
  if (!mon || mon.fainted || mon.dynamaxed) return false;
  if (side?.dynamaxUsed) return false;
  if (DYNAMAX_BANNED_SPECIES.has(toId(mon.baseSpecies || mon.species))) return false;
  return true;
}
function applyDynamax(mon) {
  if (!mon || mon.dynamaxed) return;
  mon.dynamaxed = true;
  mon.dynamaxTurns = 3;
  mon.gigantamaxed = Boolean(mon.gmaxMove && getGigantamaxAssetId(mon));
  mon.preDynamaxSpriteId = mon.spriteId;
  const gmaxAssetId = mon.gigantamaxed ? getGigantamaxAssetId(mon) : '';
  preserveHpRatio(mon, mon.baseMaxHp * 2);
  if (gmaxAssetId) {
    mon.spriteAutoId = gmaxAssetId;
    mon.spriteId = gmaxAssetId;
  }
}
function clearDynamax(mon) {
  if (!mon?.dynamaxed) return;
  mon.dynamaxed = false;
  mon.dynamaxTurns = 0;
  mon.gigantamaxed = false;
  preserveHpRatio(mon, mon.baseMaxHp, {allowZero: true});
  if (mon.preDynamaxSpriteId) {
    mon.spriteAutoId = mon.preDynamaxSpriteId;
    mon.spriteId = mon.preDynamaxSpriteId;
  }
  mon.preDynamaxSpriteId = '';
}
function getMaxMoveSecondaryEffect(moveType) {
  const type = toId(moveType);
  if (type === 'fighting') return {kind: 'self-boost', stat: 'atk', amount: 1};
  if (type === 'poison') return {kind: 'self-boost', stat: 'spa', amount: 1};
  if (type === 'flying') return {kind: 'self-boost', stat: 'spe', amount: 1};
  if (type === 'ground') return {kind: 'self-boost', stat: 'spd', amount: 1};
  if (type === 'steel') return {kind: 'self-boost', stat: 'def', amount: 1};
  if (type === 'bug') return {kind: 'foe-drop', stat: 'spa', amount: -1};
  if (type === 'ghost') return {kind: 'foe-drop', stat: 'def', amount: -1};
  if (type === 'dark') return {kind: 'foe-drop', stat: 'spd', amount: -1};
  if (type === 'dragon') return {kind: 'foe-drop', stat: 'atk', amount: -1};
  if (type === 'normal') return {kind: 'foe-drop', stat: 'spe', amount: -1};
  return null;
}
function currentBattleWeather() {
  return state.battle?.weather || '';
}
function currentBattleTerrain() {
  return state.battle?.terrain || '';
}
function getHeldItemId(mon, {ignoreSuppression = false} = {}) {
  if (!mon?.item) return '';
  if (!ignoreSuppression && mon?.volatile?.embargoTurns > 0) return '';
  return slugify(mon.item);
}
function isItemSuppressed(mon) {
  return Boolean(mon?.item) && getHeldItemId(mon) === '';
}
function getAbilityId(mon) {
  return slugify(mon?.ability || '');
}
function moveHasFlag(move, flag) {
  return Boolean(move?.flags?.[flag]);
}
function isSoundMove(move) {
  return moveHasFlag(move, 'sound');
}
function isPunchingMove(move) {
  return moveHasFlag(move, 'punch');
}
function isBitingMove(move) {
  return moveHasFlag(move, 'bite');
}
function isPulseMove(move) {
  return moveHasFlag(move, 'pulse');
}
function isSlicingMove(move) {
  return moveHasFlag(move, 'slicing');
}
function isWindMove(move) {
  return moveHasFlag(move, 'wind');
}
function isPowderMove(move) {
  return moveHasFlag(move, 'powder');
}
function isBulletMove(move) {
  return moveHasFlag(move, 'bullet');
}
function uproarPreventsSleep(mon) {
  return anyActiveUproar() && getAbilityId(mon) !== 'soundproof';
}
function causesContactEffects(attacker, move) {
  if (!moveHasFlag(move, 'contact')) return false;
  const itemId = getHeldItemId(attacker);
  if (itemId === 'protectivepads') return false;
  if (itemId === 'punchingglove' && isPunchingMove(move)) return false;
  return true;
}
function targetHasAdditionalEffectProtection(target) {
  const abilityId = getAbilityId(target);
  if (abilityId === 'shielddust') return true;
  if (getHeldItemId(target) === 'covertcloak') return true;
  return false;
}
function isImmuneToPowderMove(target) {
  return Boolean(target && ((target.types || []).includes('grass') || getAbilityId(target) === 'overcoat' || getHeldItemId(target) === 'safetygoggles'));
}
function handleTagBasedMoveImmunity(attacker, target, move) {
  if (!target || target.fainted || !move) return false;
  if (isSoundMove(move) && getAbilityId(target) === 'soundproof') {
    addLog(`${displaySpeciesName(target.species)}의 방음 / Soundproof 때문에 ${displayMoveName(move.name)}가 통하지 않았다. / ${target.species}'s Soundproof blocked ${move.name}.`);
    return true;
  }
  if (isBulletMove(move) && getAbilityId(target) === 'bulletproof') {
    addLog(`${displaySpeciesName(target.species)}의 방탄 / Bulletproof 때문에 ${displayMoveName(move.name)}가 통하지 않았다. / ${target.species}'s Bulletproof blocked ${move.name}.`);
    return true;
  }
  if (isPowderMove(move) && isImmuneToPowderMove(target)) {
    addLog(`${displaySpeciesName(target.species)}은(는) 가루 기술에 면역이라 ${displayMoveName(move.name)}가 통하지 않았다. / ${target.species} is immune to powder moves, so ${move.name} failed.`);
    return true;
  }
  if (isWindMove(move) && getAbilityId(target) === 'windrider') {
    target.boosts.atk = clamp((target.boosts.atk || 0) + 1, -6, 6);
    addLog(`${displaySpeciesName(target.species)}의 풍승 / Wind Rider가 바람 기술을 막고 공격을 올렸다! / ${target.species}'s Wind Rider blocked the wind move and boosted Attack!`, 'accent');
    return true;
  }
  return false;
}
function shouldUseSingleAccuracyCheck(attacker, move) {
  if (!move?.multiaccuracy) return true;
  return getHeldItemId(attacker) === 'loadeddice';
}
function getPerHitMoveVariant(move, hitNumber) {
  const moveId = toId(move?.baseMoveName || move?.name || move?.id);
  if (moveId === 'tripleaxel') return {...move, power: 20 * hitNumber};
  if (moveId === 'triplekick') return {...move, power: 10 * hitNumber};
  return move;
}
function applyCrashDamage(mon, move) {
  if (!mon || mon.fainted || !move?.hasCrashDamage) return;
  const crash = Math.max(1, Math.floor((mon.baseMaxHp || mon.maxHp) / 2));
  mon.hp = Math.max(0, mon.hp - crash);
  addLog(`${displaySpeciesName(mon.species)}은(는) 기술 실패 반동으로 크게 부딪혔다! / ${mon.species} kept going and crashed!`);
}
function moveHasHealingEffect(move) {
  const moveId = toId(move?.baseMoveName || move?.name || move?.id);
  return Boolean(move?.healing > 0 || move?.drain > 0 || move?.flags?.heal || ['rest','swallow','shoreup','strengthsap','junglehealing','lifedew','floralhealing','healpulse','recover','roost','milkdrink','softboiled','moonlight','morningsun','synthesis','wish'].includes(moveId));
}
function anyActiveUproar() {
  if (!state.battle) return false;
  return state.battle.players.some(side => getActiveMonsForSide(side).some(mon => mon?.volatile?.uproarTurns > 0 && !mon.fainted));
}
function getSourceSideActiveRecipient(player) {
  const side = getSideForPlayer(player);
  return getActiveMonsForSide(side)[0] || null;
}
function clearStockpile(mon) {
  if (!mon?.volatile?.stockpileLayers) return;
  const layers = mon.volatile.stockpileLayers || 0;
  mon.volatile.stockpileLayers = 0;
  if (layers > 0) {
    mon.boosts.def = clamp((mon.boosts.def || 0) - layers, -6, 6);
    mon.boosts.spd = clamp((mon.boosts.spd || 0) - layers, -6, 6);
  }
}
function clearBattleVolatile(mon, key) {
  if (!mon?.volatile || !(key in mon.volatile)) return;
  delete mon.volatile[key];
}
function isMoveBlockedByTorment(mon, moveIndex = null, moveName = '') {
  if (!mon?.volatile?.tormentTurns || !mon?.lastMoveMeta?.moveName) return false;
  const lastName = mon.lastMoveMeta.moveName || mon.lastMoveMeta.moveId || '';
  if (moveName && toId(lastName) === toId(moveName)) return true;
  if (Number.isInteger(moveIndex)) {
    const slot = mon.moveSlots?.[moveIndex];
    if (slot && toId(slot.name) === toId(lastName)) return true;
  }
  return false;
}
function isMoveBlockedByHealBlock(mon, move) {
  return Boolean(mon?.volatile?.healBlockTurns > 0) && moveHasHealingEffect(move);
}
function tryApplyConfusion(target, turns = 0, sourceLabel = 'confusion') {
  if (!target || target.fainted) return false;
  target.volatile = target.volatile || {};
  if (target.volatile.confusionTurns > 0) return false;
  target.volatile.confusionTurns = turns || (2 + Math.floor(Math.random() * 4));
  addLog(`${displaySpeciesName(target.species)}은(는) 혼란에 빠졌다! / ${target.species} became confused!`);
  return true;
}
function applyPerishSongToTarget(target) {
  if (!target || target.fainted) return false;
  target.volatile = target.volatile || {};
  if (target.volatile.perishSongTurns > 0 || getAbilityId(target) === 'soundproof') return false;
  target.volatile.perishSongTurns = 4;
  addLog(`${displaySpeciesName(target.species)}의 멸망의노래 / Perish Song 카운트가 시작되었다. / ${target.species}'s perish count fell to 3.`, 'accent');
  return true;
}
function applyVolatileStatusMove(user, target, move) {
  if (!target || target.fainted) return false;
  const moveId = toId(move?.baseMoveName || move?.name || move?.id);
  target.volatile = target.volatile || {};
  if (target.volatile?.substituteHp > 0 && target.id !== user?.id && !move.flags?.bypasssub) {
    addLog(`${displaySpeciesName(target.species)}의 대타출동 / Substitute가 ${displayMoveName(move.name)}를 막았다. / ${target.species}'s substitute blocked ${move.name}.`);
    return true;
  }
  if (moveId === 'yawn') {
    if (target.status || target.volatile.yawnTurns > 0 || uproarPreventsSleep(target)) return false;
    target.volatile.yawnTurns = 2;
    addLog(`${displaySpeciesName(target.species)}은(는) 하품 / Yawn 때문에 졸리기 시작했다. / ${target.species} grew drowsy.`);
    return true;
  }
  if (moveId === 'leechseed') {
    if (target.types.includes('grass') || target.volatile.leechSeeded) return false;
    target.volatile.leechSeeded = true;
    target.volatile.leechSeedSourcePlayer = user?.player ?? 0;
    addLog(`${displaySpeciesName(target.species)}에게 씨뿌리기 / Leech Seed가 심어졌다. / ${target.species} was seeded.`);
    return true;
  }
  if (moveId === 'torment') {
    if (target.volatile.tormentTurns > 0) return false;
    target.volatile.tormentTurns = 3;
    addLog(`${displaySpeciesName(target.species)}은(는) 괴롭힘 / Torment 상태가 되었다. / ${target.species} was subjected to Torment.`, 'accent');
    return true;
  }
  if (moveId === 'healblock') {
    if (target.volatile.healBlockTurns > 0) return false;
    target.volatile.healBlockTurns = 5;
    addLog(`${displaySpeciesName(target.species)}은(는) 회복봉인 / Heal Block 상태가 되었다. / ${target.species} was prevented from healing.`, 'accent');
    return true;
  }
  if (moveId === 'embargo') {
    if (target.volatile.embargoTurns > 0) return false;
    target.volatile.embargoTurns = 5;
    clearChoiceLock(target);
    addLog(`${displaySpeciesName(target.species)}은(는) 금제 / Embargo 상태가 되었다. / ${target.species} can no longer use its held item.`, 'accent');
    return true;
  }
  if (moveId === 'nightmare') {
    if (target.status !== 'slp' || target.volatile.nightmare) return false;
    target.volatile.nightmare = true;
    addLog(`${displaySpeciesName(target.species)}은(는) 악몽 / Nightmare에 시달리기 시작했다. / ${target.species} began having a nightmare.`, 'accent');
    return true;
  }
  if (move.volatileStatus === 'confusion') return tryApplyConfusion(target);
  return false;
}
function isGrounded(mon) {
  if (!mon || mon.fainted) return false;
  if (mon.volatile?.magnetRiseTurns > 0) return false;
  if ((mon.types || []).includes('flying')) return false;
  if (slugify(mon.ability) === 'levitate') return false;
  if (getHeldItemId(mon) === 'airballoon' && !mon.volatile?.airBalloonPopped) return false;
  return true;
}
function groundedMonsOnField() {
  if (!state.battle) return [];
  return state.battle.players.flatMap(side => side.active.map(idx => side.team[idx])).filter(mon => mon && !mon.fainted && isGrounded(mon));
}
function weatherDisplayLabel(weather) {
  return localizedWeatherLabel(weather || '');
}
function terrainDisplayLabel(terrain) {
  return localizedTerrainLabel(terrain || '');
}
function previewMoveForUi(mon, move) {
  if (!move) return null;
  const previewMon = mon || null;
  const weather = currentBattleWeather();
  const terrain = currentBattleTerrain();
  let type = getBattleMoveType(previewMon, move) || move.type;
  let category = getBattleMoveCategory(previewMon, move) || move.category;
  let power = move.power || 0;
  let name = move.name;
  let accuracy = move.accuracy;
  const moveId = toId(move?.baseMoveName || move?.name || move?.id);
  if (moveId === 'weatherball' && weather) {
    const weatherTypes = {sun: 'fire', rain: 'water', sand: 'rock', snow: 'ice'};
    type = weatherTypes[weather] || type;
    power = 100;
  }
  if (moveId === 'terrainpulse' && terrain && isGrounded(previewMon)) {
    const terrainTypes = {electricterrain: 'electric', grassyterrain: 'grass', mistyterrain: 'fairy', psychicterrain: 'psychic'};
    type = terrainTypes[terrain] || type;
    power = 100;
  }
  if (moveId === 'thunder' || moveId === 'hurricane') {
    if (weather === 'rain') accuracy = 100;
    else if (weather === 'sun') accuracy = 50;
  }
  if (moveId === 'blizzard' && weather === 'snow') accuracy = 100;
  if ((moveId === 'solarbeam' || moveId === 'solarblade') && weather && weather !== 'sun') power = Math.floor(power / 2);
  if (moveId === 'expandingforce' && terrain === 'psychicterrain' && isGrounded(previewMon)) power = Math.floor(power * 1.5);
  if (previewMon?.dynamaxed) {
    name = getMaxMoveName(previewMon, move);
    power = getDefaultMaxMovePower(move);
    accuracy = move.category !== 'status' ? 100 : move.accuracy;
  }
  if (previewMon?.terastallized && teraPowerBoostApplies(previewMon, {...move, type})) power = Math.max(power, 60);
  return {name, type, category, power, accuracy};
}
function canUseZMoveWithMove(mon, side, move, item) {
  if (!mon || !side || !move || !item) return false;
  if (side.zUsed || mon.fainted || mon.dynamaxed || mon.megaUsed) return false;
  if (move.isZ || move.isMax) return false;
  if (move.category === 'status' && !item.zMove) return false;
  if (item.itemUser?.length && !item.itemUser.some(name => toId(name) === toId(mon.baseSpecies || mon.species) || toId(name) === toId(mon.species))) return false;
  if (item.zMoveFrom && toId(item.zMoveFrom) !== toId(move.name)) return false;
  if (item.zMoveType && toId(item.zMoveType) !== toId(getBattleMoveType(mon, move))) return false;
  return Boolean(item.zMove || item.zMoveType || item.zMoveFrom);
}

const state = {
  runtimeReady: false,
  dex: null,
  dexSource: '',
  dexVersion: '',
  dataProvider: 'Local Showdown data',
  language: 'ko',
  mode: 'singles',
  teamSize: 3,
  validationProfile: 'open',
  manifest: null,
  speciesChoices: [],
  allSpeciesChoices: [],
  assetDex: null,
  playerNames: ['Player 1', 'Player 2'],
  teams: [[], []],
  selected: {player: 0, slot: 0},
  builderErrors: [],
  builderWarnings: [],
  itemChoices: [],
  natureChoices: [],
  allMoveChoices: [],
  currentMoveChoices: [],
  picker: {mode: '', moveIndex: null, options: [], emptyHint: '', detailOption: null},
  battle: null,
  assetBase: {pokemon: './assets/Pokemon', items: './assets/items'},
  showdownLocal: {available: false, checked: false, skipped: false, bundledNodeServer: false, engineApiOrigin: '', probeMode: 'uninitialized'},
};

const els = {};
let pickerReturnFocusEl = null;

function getBundledServerContext() {
  const raw = window.__PKB_SERVER_CONTEXT__ || {};
  return {
    bundledNodeServer: Boolean(raw.bundledNodeServer),
    engineApiOrigin: String(raw.engineApiOrigin || ''),
    probeMode: String(raw.engineProbeMode || (raw.bundledNodeServer ? 'bundled-node-server' : 'static-preview-or-file')),
  };
}
async function initializeShowdownLocalStatus() {
  const context = getBundledServerContext();
  if (!context.bundledNodeServer) {
    state.showdownLocal = {
      available: false,
      checked: false,
      skipped: true,
      bundledNodeServer: false,
      engineApiOrigin: context.engineApiOrigin,
      probeMode: context.probeMode,
      error: '',
      note: 'Skipped the engine probe because this page is not being served by the bundled Node runtime.',
    };
    return state.showdownLocal;
  }
  const probe = await probeShowdownLocalServer();
  state.showdownLocal = {
    ...probe,
    checked: true,
    skipped: false,
    bundledNodeServer: true,
    engineApiOrigin: context.engineApiOrigin || window.location.origin || '',
    probeMode: context.probeMode,
  };
  return state.showdownLocal;
}
function buildShowdownStatusNote() {
  const status = state.showdownLocal || {};
  if (status.available) {
    return `로컬 Showdown 엔진 / Local Showdown engine: 연결됨 / connected (${status.engine || 'local Node service'})<br>싱글 배틀 시작 시에는 커스텀 판정 대신 로컬 Showdown-family 엔진 경로를 우선 사용합니다. / Singles battles now prefer the local Showdown-family engine path instead of the custom resolver.`;
  }
  if (status.bundledNodeServer) {
    return `로컬 Showdown 엔진 / Local Showdown engine: 현재 사용할 수 없음 / currently unavailable<br>이 페이지는 번들된 Node 서버에서 열렸지만 엔진 API 확인에 실패했습니다. 현재는 커스텀 전투 런타임으로 동작합니다. / This page is running through the bundled Node server, but the engine API check failed, so the app will currently use the custom battle runtime.${status.error ? `<br>Probe error: ${status.error}` : ''}`;
  }
  return `로컬 Showdown 엔진 / Local Showdown engine: 정적 미리보기에서는 자동 확인하지 않음 / not auto-probed in static preview<br>현재 페이지는 번들된 Node 서버가 아닌 정적 미리보기/파일 경로에서 열려 있으므로 \`/api/engine/status\`를 호출하지 않습니다. 현재는 커스텀 전투 런타임으로 동작하며, 로컬 엔진 경로를 쓰려면 \`npm start\`로 서버를 실행한 뒤 그 서버 주소에서 열어야 합니다. / This page is being opened from a static preview or file path instead of the bundled Node server, so the app does not call \`/api/engine/status\`. It uses the custom runtime here; run \`npm start\` and open the app from that server to use the local engine path.`;
}

const UI_STRINGS = Object.freeze({
  ko: {
    title: 'PKB — 포켓몬 로컬 배틀 빌더',
    hero_eyebrow: '로컬 2인 배틀 프로토타입',
    hero_copy: '업로드한 스프라이트와 아이콘, 로컬 배틀 데이터를 불러와 두 팀을 직접 만든 뒤, 브라우저에서 바로 번갈아 조작하는 배틀을 플레이합니다.',
    lang_label: '언어',
    meta_mode: '배틀 모드',
    meta_engine: '엔진',
    meta_engine_value: 'Showdown Dex + 커스텀 배틀 런타임',
    runtime_title: '런타임',
    reset_storage_btn: '저장 데이터 초기화',
    runtime_loading: '시뮬레이터 런타임, Dex 데이터, 업로드된 에셋을 불러오는 중…',
    setup_title: '설정',
    mode_singles: '싱글',
    mode_doubles: '더블',
    player1_name_label: '플레이어 1 이름',
    player2_name_label: '플레이어 2 이름',
    validation_profile_label: '검증 프로필',
    validation_profile_note: '현재 빌더에서 적용할 규칙 묶음을 고릅니다.',
    roster_title: '팀 슬롯',
    copy_prev_btn: '이전 슬롯 복사',
    randomize_slot_btn: '랜덤 슬롯 생성',
    no_species_selected: '포켓몬 미선택',
    species_label: '포켓몬',
    forme_label: '폼',
    nickname_label: '별명',
    item_label: '도구',
    ability_label: '특성',
    nature_label: '성격',
    gender_label: '성별',
    gender_auto: '자동',
    gender_male: '수컷',
    gender_female: '암컷',
    gender_genderless: '무성',
    level_label: '레벨',
    tera_type_label: '테라 타입',
    shiny_label: '색이 다른 포켓몬',
    species_status_default: '포켓몬을 선택하면 배틀 데이터를 불러옵니다.',
    ability_note_default: '포켓몬을 선택하면 특성 목록이 표시됩니다.',
    item_note_default: '지닌 도구가 없습니다.',
    moves_title: '기술',
    moves_note: '기술은 정확히 4개 선택해야 합니다.',
    move1_label: '기술 1',
    move2_label: '기술 2',
    move3_label: '기술 3',
    move4_label: '기술 4',
    browse_btn: '선택',
    ev_title: '노력치',
    iv_title: '개체값',
    iv_note: '각 능력치는 0~31 범위여야 합니다.',
    validation_summary_default: '두 팀을 모두 완성하면 배틀을 시작할 수 있습니다.',
    export_teams_btn: '팀 내보내기',
    start_battle_btn: '배틀 시작',
    battle_title: '배틀',
    back_to_builder_btn: '빌더로 돌아가기',
    restart_battle_btn: '배틀 재시작',
    turn_waiting: '대기 중',
    turn_label: '턴',
    battle_field_status_none: '날씨 없음 · 지형 없음',
    choice_title_p1: '플레이어 1 행동 선택',
    choice_title_p2: '플레이어 2 행동 선택',
    choice_status_none: '아직 선택 없음',
    battle_log_title: '배틀 로그',
    clear_btn: '지우기',
    current_selections_title: '현재 선택',
    picker_title_default: '선택',
    picker_close_btn: '닫기',
    picker_search_placeholder: '검색',
  },
  en: {
    title: 'PKB — Local Pokémon Battle Builder',
    hero_eyebrow: 'Local 2-player battle prototype',
    hero_copy: 'Load the uploaded sprites, icons, and local battle data, build two custom teams, and play a pass-and-play battle directly in the browser.',
    lang_label: 'Language',
    meta_mode: 'Battle mode',
    meta_engine: 'Engine',
    meta_engine_value: 'Showdown Dex + custom battle runtime',
    runtime_title: 'Runtime',
    reset_storage_btn: 'Reset saved data',
    runtime_loading: 'Loading simulator runtime, Dex data, and uploaded assets…',
    setup_title: 'Setup',
    mode_singles: 'Singles',
    mode_doubles: 'Doubles',
    player1_name_label: 'Player 1 name',
    player2_name_label: 'Player 2 name',
    validation_profile_label: 'Validation profile',
    validation_profile_note: 'Choose which validation ruleset the builder should enforce.',
    roster_title: 'Roster',
    copy_prev_btn: 'Copy previous slot',
    randomize_slot_btn: 'Randomize slot',
    no_species_selected: 'No species selected',
    species_label: 'Species',
    forme_label: 'Forme',
    nickname_label: 'Nickname',
    item_label: 'Item',
    ability_label: 'Ability',
    nature_label: 'Nature',
    gender_label: 'Gender',
    gender_auto: 'Auto',
    gender_male: 'Male',
    gender_female: 'Female',
    gender_genderless: 'Genderless',
    level_label: 'Level',
    tera_type_label: 'Tera type',
    shiny_label: 'Shiny',
    species_status_default: 'Choose a species to load battle data.',
    ability_note_default: 'Select a species to load its ability list.',
    item_note_default: 'No held item selected.',
    moves_title: 'Moves',
    moves_note: 'Pick exactly four moves.',
    move1_label: 'Move 1',
    move2_label: 'Move 2',
    move3_label: 'Move 3',
    move4_label: 'Move 4',
    browse_btn: 'Browse',
    ev_title: 'EVs',
    iv_title: 'IVs',
    iv_note: 'Each stat must stay between 0 and 31.',
    validation_summary_default: 'Finish both teams to unlock battle start.',
    export_teams_btn: 'Export teams',
    start_battle_btn: 'Start battle',
    battle_title: 'Battle',
    back_to_builder_btn: 'Back to builder',
    restart_battle_btn: 'Restart battle',
    turn_waiting: 'Waiting',
    turn_label: 'Turn',
    battle_field_status_none: 'No weather · No terrain',
    choice_title_p1: 'Player 1 choices',
    choice_title_p2: 'Player 2 choices',
    choice_status_none: 'No request yet',
    battle_log_title: 'Battle log',
    clear_btn: 'Clear',
    current_selections_title: 'Current selections',
    picker_title_default: 'Select',
    picker_close_btn: 'Close',
    picker_search_placeholder: 'Search',
  },
});

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
const LOCALIZED_NAME_MAPS = {
  ...KO_NAME_MAPS,
  species: {
    ...(KO_NAME_MAPS?.species || {}),
    ...OFFICIAL_KO_SPECIES,
  },
  items: {
    ...(KO_NAME_MAPS?.items || {}),
    ...Object.fromEntries(Object.entries(OFFICIAL_KO_ITEMS || {}).filter(([, value]) => value)),
  },
};
const FORM_SUFFIX_TRANSLATIONS = {
  Alola: '알로라',
  Galar: '가라르',
  Hisui: '히스이',
  Paldea: '팔데아',
  Mega: '메가',
  'Mega-X': '메가X',
  'Mega-Y': '메가Y',
  Primal: '원시',
  Origin: '오리진',
  Altered: '어나더',
  Therian: '영물',
  Incarnate: '화신',
  Attack: '어택',
  Defense: '디펜스',
  Speed: '스피드',
  Black: '블랙',
  White: '화이트',
  Resolute: '각오의모습',
  Pirouette: '스텝폼',
  Blade: '블레이드폼',
  Shield: '실드폼',
  Complete: '퍼펙트폼',
  '10%': '10%폼',
  '50%': '50%폼',
  Ash: '지우개굴닌자',
  School: '군집의모습',
  Solo: '단독의모습',
  Busted: '들킨모습',
  Disguised: '평상시의모습',
  Dusk: '황혼',
  Midnight: '한밤중',
  Midday: '한낮',
  Rapid: '날쌘모습',
  RapidStrike: '연격의태세',
  'Rapid-Strike': '연격의태세',
  SingleStrike: '일격의태세',
  'Single-Strike': '일격의태세',
  Crowned: '왕의 모습',
  Hero: '히어로',
  Zero: '영웅',
  Ordinary: '보통의모습',
  Aria: '보이스폼',
  Zen: '달마모드',
  Hangry: '배고픈모습',
  Noice: '나이스페이스',
  Ice: '백마탄모습',
  Shadow: '흑마탄모습',
  DuskMane: '황혼의갈기',
  'Dusk-Mane': '황혼의갈기',
  DawnWings: '새벽의날개',
  'Dawn-Wings': '새벽의날개',
  Ultra: '울트라',
  Gmax: '거다이맥스',
  Bloodmoon: '진홍빛보름달',
  Wellspring: '우물',
  Hearthflame: '화덕',
  Cornerstone: '주춧돌',
  Teal: '벽록',
  Stellar: '스텔라',
};
function normalizeSearchText(text) {
  return String(text || '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[’'`]/g, '')
    .replace(/♀/g, ' female ')
    .replace(/♂/g, ' male ')
    .replace(/&/g, ' and ')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}
function normalizeSearchKey(text) {
  return normalizeSearchText(text).replace(/\s+/g, '');
}
function getAliasNamesForEntity(english = '') {
  const canonicalId = toId(english);
  if (!canonicalId) return [];
  const out = [];
  for (const [aliasId, target] of Object.entries(Aliases || {})) {
    if (toId(target) !== canonicalId) continue;
    if (!/[a-z]/i.test(aliasId)) continue;
    out.push(aliasId);
    out.push(aliasId.replace(/-/g, ' '));
  }
  return uniqueNames(out);
}
function buildChoiceSearchTerms(kind, english, choice = {}) {
  const candidates = new Set([
    english,
    choice.english,
    choice.korean,
    choice.display,
    choice.label,
    choice.name,
    getLocalizedName(kind, english),
  ]);
  if (kind === 'species') {
    candidates.add(getLocalizedSpeciesFallback(english));
    candidates.add(String(english || '').replace(/-/g, ' '));
    for (const alias of getAliasNamesForEntity(english)) candidates.add(alias);
    for (const formName of choice.formSearchTerms || []) candidates.add(formName);
    for (const extra of choice.extraSearchTerms || []) candidates.add(extra);
  }
  return Array.from(candidates).map(value => String(value || '').trim()).filter(Boolean);
}
function refreshChoiceSearchIndex(choice, kind = '') {
  if (!choice) return choice;
  const terms = buildChoiceSearchTerms(kind, choice.english || choice.label || choice.name || '', choice);
  choice.searchTerms = terms;
  choice.searchTexts = terms.map(normalizeSearchText).filter(Boolean);
  choice.searchKeys = terms.map(normalizeSearchKey).filter(Boolean);
  return choice;
}
const reverseNameMaps = Object.fromEntries(
  Object.entries(LOCALIZED_NAME_MAPS).map(([kind, map]) => {
    const reverse = new Map();
    for (const [english, korean] of Object.entries(map || {})) {
      const candidates = [
        english,
        korean,
        `${korean} / ${english}`,
        `${english} / ${korean}`,
        String(english || '').replace(/-/g, ' '),
      ];
      if (kind === 'species') candidates.push(getLocalizedSpeciesFallback(english));
      for (const candidate of candidates) {
        const key = normalizeSearchKey(candidate);
        if (key) reverse.set(key, english);
      }
    }
    return [kind, reverse];
  })
);
function lang(ko, en) {
  return state.language === 'en' ? (en || ko || '') : (ko || en || '');
}
function bilingualLabel(korean, english) {
  return lang(korean, english);
}
function hasHangul(text) {
  return /[가-힣]/.test(String(text || ''));
}
function localizeText(text, language = state.language) {
  let out = String(text ?? '');
  if (!out || !out.includes('/')) return out;
  const sep = ' / ';
  const positions = [];
  let searchIndex = 0;
  while (true) {
    const idx = out.indexOf(sep, searchIndex);
    if (idx === -1) break;
    positions.push(idx);
    searchIndex = idx + sep.length;
  }
  for (let i = positions.length - 1; i >= 0; i -= 1) {
    const idx = positions[i];
    const left = out.slice(0, idx).trim();
    const right = out.slice(idx + sep.length).trim();
    if (!left || !right) continue;
    const leftHangul = hasHangul(left);
    const rightHangul = hasHangul(right);
    if (leftHangul !== rightHangul) {
      out = language === 'ko' ? (leftHangul ? left : right) : (leftHangul ? right : left);
      break;
    }
  }
  const inlinePattern = /([^/]{1,80}?)\s*\/\s*([^/]{1,80})/g;
  for (let pass = 0; pass < 6 && out.includes('/'); pass += 1) {
    const next = out.replace(inlinePattern, (match, left, right) => {
      const leftHangul = hasHangul(left);
      const rightHangul = hasHangul(right);
      if (leftHangul === rightHangul) return match;
      return language === 'ko' ? (leftHangul ? left.trim() : right.trim()) : (leftHangul ? right.trim() : left.trim());
    });
    if (next === out) break;
    out = next;
  }
  return out.replace(/\s{2,}/g, ' ').trim();
}
function t(key, vars = {}) {
  const template = UI_STRINGS[state.language]?.[key] ?? UI_STRINGS.ko[key] ?? key;
  return String(template).replace(/\{(\w+)\}/g, (_, name) => String(vars[name] ?? ''));
}
function applyLanguageToStaticUi() {
  document.documentElement.lang = state.language === 'en' ? 'en' : 'ko';
  document.title = t('title');
  document.querySelectorAll('[data-i18n]').forEach(node => {
    const key = node.getAttribute('data-i18n');
    if (key) node.textContent = t(key);
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(node => {
    const key = node.getAttribute('data-i18n-placeholder');
    if (key) node.placeholder = t(key);
  });
}
function syncLanguageControls() {
  if (els.langKoBtn) els.langKoBtn.classList.toggle('active', state.language === 'ko');
  if (els.langEnBtn) els.langEnBtn.classList.toggle('active', state.language === 'en');
}
function relocalizeChoices(choices = [], kind = '') {
  for (const choice of choices) {
    if (!choice?.english) continue;
    choice.korean = getLocalizedName(kind, choice.english);
    choice.display = displayEntity(kind, choice.english);
    refreshChoiceSearchIndex(choice, kind);
  }
}
function relocalizeChoiceCaches() {
  relocalizeChoices(state.speciesChoices, 'species');
  relocalizeChoices(state.allSpeciesChoices, 'species');
  relocalizeChoices(state.itemChoices, 'items');
  relocalizeChoices(state.allMoveChoices, 'moves');
  relocalizeChoices(state.currentMoveChoices, 'moves');
  relocalizeChoices(state.natureChoices, 'natures');
  if (state.picker?.mode === 'species') relocalizeChoices(state.picker.options, 'species');
  if (state.picker?.mode === 'move') relocalizeChoices(state.picker.options, 'moves');
  if (state.picker?.mode === 'item') relocalizeChoices(state.picker.options, 'items');
  if (state.picker?.mode === 'ability') relocalizeChoices(state.picker.options, 'abilities');
  if (state.picker?.mode === 'nature') relocalizeChoices(state.picker.options, 'natures');
}
function setLanguage(language) {
  const next = language === 'en' ? 'en' : 'ko';
  if (state.language === next) return;
  state.language = next;
  relocalizeChoiceCaches();
  buildStaticLists();
  renderAll();
  if (!els.pickerModal?.classList.contains('hidden')) {
    const picker = state.picker || {};
    if (picker.mode === 'move' && picker.detailOption) renderMoveDetail(picker.detailOption);
    else if (picker.mode === 'move') resetPickerDetail();
    renderPickerOptions();
  }
  saveState();
}

function isSuspiciousLocalization(english, localized) {
  if (!localized) return true;
  if (toId(localized) === toId(english)) return true;
  if (!hasHangul(localized) && !/[♀♂]/.test(String(localized || ''))) return true;
  return false;
}
function translateFormSuffix(suffix = '') {
  if (!suffix) return '';
  const exact = FORM_SUFFIX_TRANSLATIONS[suffix];
  if (exact) return exact;
  const compact = suffix.replace(/[^A-Za-z0-9%]+/g, '');
  if (FORM_SUFFIX_TRANSLATIONS[compact]) return FORM_SUFFIX_TRANSLATIONS[compact];
  return suffix.replace(/-/g, ' ');
}
function getLocalizedSpeciesFallback(english) {
  if (!english) return '';
  const speciesData = state.dex?.species?.get?.(english);
  const baseEnglish = speciesData?.exists ? (speciesData.baseSpecies || speciesData.name) : String(english).split('-')[0];
  const baseKorean = LOCALIZED_NAME_MAPS?.species?.[baseEnglish] || KO_NAME_MAPS?.species?.[baseEnglish] || baseEnglish;
  const forme = speciesData?.forme || (String(english).includes('-') ? String(english).split('-').slice(1).join('-') : '');
  if (!forme) return baseKorean;
  const translated = translateFormSuffix(forme);
  if (['Alola', 'Galar', 'Hisui', 'Paldea'].includes(forme)) return `${translated} ${baseKorean}`;
  if (forme === 'Mega') return `메가${baseKorean}`;
  if (forme === 'Mega-X' || forme === 'Mega-Y') return `${translated}${baseKorean}`;
  if (forme === 'Gmax') return `${translated} ${baseKorean}`;
  return `${baseKorean} (${translated})`;
}
function getLocalizedName(kind, english) {
  if (!english) return '';
  const localized = LOCALIZED_NAME_MAPS?.[kind]?.[english] || KO_NAME_MAPS?.[kind]?.[english] || '';
  if (kind === 'species' && isSuspiciousLocalization(english, localized)) return getLocalizedSpeciesFallback(english) || english;
  if (kind === 'items' && isSuspiciousLocalization(english, localized)) return localized || english;
  return localized || english;
}
function displayEntity(kind, english) {
  if (!english) return '';
  return bilingualLabel(getLocalizedName(kind, english), english);
}
function displayType(typeName) {
  return localizeText(typeLabels[typeName] || bilingualLabel(titleCase(typeName), titleCase(typeName)));
}
function displayGender(gender) {
  return localizeText(genderLabels[gender ?? ''] || gender || genderLabels['']);
}
function displayStatus(status) {
  return localizeText(statusLabels[status] || statusNames[status] || status);
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
  const direct = reverseNameMaps[kind]?.get(normalizeSearchKey(raw));
  if (direct) return direct;
  const split = raw.split('/').map(part => part.trim()).filter(Boolean);
  for (const piece of split) {
    const fromSplit = reverseNameMaps[kind]?.get(normalizeSearchKey(piece));
    if (fromSplit) return fromSplit;
  }
  const normalizedRawKey = normalizeSearchKey(raw);
  for (const choice of fallbackChoices) {
    refreshChoiceSearchIndex(choice, kind);
    const english = choice.english || choice.label || choice.name;
    if (!english) continue;
    if ((choice.searchKeys || []).includes(normalizedRawKey)) return english;
  }
  return raw;
}
function normalizeBuilderSpeciesInput(value) {
  return normalizeLocalizedInput('species', value, state.speciesChoices || []);
}
function makeChoice(kind, english, extra = {}) {
  const choice = {
    english,
    korean: getLocalizedName(kind, english),
    display: displayEntity(kind, english),
    kind,
    ...extra,
  };
  return refreshChoiceSearchIndex(choice, kind);
}
function sortChoicesForLanguage(choices = []) {
  return [...(choices || [])].sort((a, b) => {
    const left = state.language === 'en' ? (a?.english || a?.display || '') : (a?.korean || a?.display || a?.english || '');
    const right = state.language === 'en' ? (b?.english || b?.display || '') : (b?.korean || b?.display || b?.english || '');
    return left.localeCompare(right, state.language === 'ko' ? 'ko' : 'en', {numeric: true, sensitivity: 'base'});
  });
}
function setDatalistOptions(el, choices) {
  el.innerHTML = sortChoicesForLanguage(choices).map(choice => {
    const value = choice.display || choice.english || '';
    return `<option value="${value}"></option>`;
  }).join('\n');
}
function buildPickerSubtitle(option, mode) {
  const alternate = state.language === 'en'
    ? (option.korean && option.korean !== option.english ? option.korean : '')
    : (option.english && option.english !== option.korean ? option.english : '');
  if (mode === 'move' && option.meta) {
    const details = [option.meta.type && displayType(option.meta.type), option.meta.categoryLabel, option.meta.powerLabel, option.meta.accuracyLabel].filter(Boolean);
    return [alternate, details.join(' · ')].filter(Boolean).join(' · ');
  }
  return alternate;
}
function rankPickerOption(option, rawQuery = '') {
  if (!rawQuery) return {matched: true, score: 1000};
  const queryText = normalizeSearchText(rawQuery);
  const queryKey = normalizeSearchKey(rawQuery);
  if (!queryKey) return {matched: true, score: 1000};
  let best = Number.POSITIVE_INFINITY;
  const texts = option.searchTexts || [];
  const keys = option.searchKeys || [];
  for (let i = 0; i < texts.length; i += 1) {
    const text = texts[i] || '';
    const key = keys[i] || normalizeSearchKey(text);
    if (!text && !key) continue;
    if (key === queryKey || text === queryText) best = Math.min(best, 0);
    else if (text.startsWith(queryText)) best = Math.min(best, 1);
    else if (text.split(' ').some(part => part.startsWith(queryText))) best = Math.min(best, 2);
    else if (text.includes(queryText)) best = Math.min(best, 3);
    else if (key.includes(queryKey)) best = Math.min(best, 4);
  }
  return {matched: Number.isFinite(best), score: best};
}
function filterPickerOptions(options = [], rawQuery = '') {
  const ranked = [];
  for (const option of options) {
    const rankedMatch = rankPickerOption(option, rawQuery);
    if (!rankedMatch.matched) continue;
    ranked.push({option, score: rankedMatch.score});
  }
  ranked.sort((a, b) => {
    if (a.score !== b.score) return a.score - b.score;
    const left = state.language === 'en' ? (a.option.english || a.option.display || '') : (a.option.korean || a.option.display || a.option.english || '');
    const right = state.language === 'en' ? (b.option.english || b.option.display || '') : (b.option.korean || b.option.display || b.option.english || '');
    return left.localeCompare(right, state.language === 'ko' ? 'ko' : 'en', {numeric: true, sensitivity: 'base'});
  });
  return ranked.map(entry => entry.option);
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
    out.push(makeChoice('moves', move.name, {
      meta: {
        type: String(move.type || '').toLowerCase(),
        categoryLabel: move.category ? lang(
          move.category === 'Status' ? '변화' : (move.category === 'Physical' ? '물리' : '특수'),
          move.category
        ) : '',
        powerLabel: move.basePower ? lang(`위력 ${move.basePower}`, `Power ${move.basePower}`) : lang('위력 —', 'Power —'),
        accuracyLabel: move.accuracy === true ? lang('명중 반드시', 'Accuracy sure-hit') : lang(`명중 ${move.accuracy || '—'}`, `Accuracy ${move.accuracy || '—'}`),
      },
    }));
  }
  return sortChoicesForLanguage(out);
}
function getCurrentAbilityChoices(mon = getSelectedMon()) {
  return sortChoicesForLanguage((mon?.data?.abilities || []).map(name => makeChoice('abilities', name)));
}
function getNatureChoices() {
  return sortChoicesForLanguage((state.natureChoices || []).length ? state.natureChoices : natureOrder.map(name => makeChoice('natures', name)));
}
function rebuildMoveDatalist(mon = getSelectedMon()) {
  const choices = getCurrentMoveChoices(mon);
  state.currentMoveChoices = choices;
  setDatalistOptions(els.moveList, choices);
  return choices;
}
function describeStatChangeMap(boosts = {}) {
  const parts = [];
  for (const stat of statOrder) {
    const change = Number(boosts?.[stat] || 0);
    if (!change) continue;
    const label = localizeText(statLabels[stat]);
    parts.push(state.language === 'ko'
      ? `${label} ${change > 0 ? '+' : ''}${change}`
      : `${label} ${change > 0 ? '+' : ''}${change}`);
  }
  return parts;
}
function displayTargetHint(target = '') {
  const mapped = SHOWDOWN_TARGET_HINTS[target] || targetHints[target] || target || 'normal';
  return localizeText({
    'single-opponent': '상대 1마리 / Single opponent',
    'all-opponents': '상대 전체 / All opponents',
    'all-other-pokemon': '다른 포켓몬 전체 / All other Pokémon',
    'all-pokemon': '필드 전체 / All Pokémon',
    'self': '자신 / Self',
    'ally': '아군 1마리 / One ally',
    'ally-or-self': '아군 또는 자신 / Ally or self',
    'ally-side': '아군 필드 / Ally side',
    'self-side': '자신 필드 / Self side',
    'opponent-side': '상대 필드 / Opponent side',
    field: '필드 전체 / Entire field',
  }[mapped] || `${mapped}`);
}
function localizedMoveFlagLabel(flag = '') {
  const label = MOVE_FLAG_LABELS[flag];
  return label ? lang(label[0], label[1]) : localizeText(flag);
}
function localizedVolatileLabel(status = '') {
  const label = VOLATILE_STATUS_LABELS[status];
  return label ? lang(label[0], label[1]) : localizeText(status);
}
function localizedSideConditionLabel(condition = '') {
  const label = SIDE_CONDITION_LABELS[toId(condition)];
  return label ? lang(label[0], label[1]) : localizeText(condition);
}
function localizedWeatherLabel(weather = '') {
  const label = WEATHER_LABELS[toId(weather)];
  return label ? lang(label[0], label[1]) : localizeText(weather);
}
function localizedTerrainLabel(terrain = '') {
  const label = TERRAIN_LABELS[toId(terrain)];
  return label ? lang(label[0], label[1]) : localizeText(terrain);
}
function buildMoveEffectSummary(move) {
  if (!move?.exists) return lang('기술 정보를 찾을 수 없습니다.', 'Move data could not be found.');
  const lines = [];
  if (move.category === 'Status') lines.push(lang('변화기입니다.', 'Status move.'));
  if (move.status) lines.push(lang(`${displayStatus(move.status)} 상태이상을 겁니다.`, `Inflicts ${displayStatus(move.status)}.`));
  if (move.volatileStatus) lines.push(lang(`${localizedVolatileLabel(move.volatileStatus)} 상태를 겁니다.`, `Applies ${localizedVolatileLabel(move.volatileStatus)}.`));
  if (move.sideCondition) lines.push(lang(`${localizedSideConditionLabel(move.sideCondition)}를 설치합니다.`, `Sets ${localizedSideConditionLabel(move.sideCondition)}.`));
  if (move.weather) lines.push(lang(`${localizedWeatherLabel(move.weather)} 날씨를 만듭니다.`, `Sets ${localizedWeatherLabel(move.weather)}.`));
  if (move.terrain) lines.push(lang(`${localizedTerrainLabel(move.terrain)}을 전개합니다.`, `Sets ${localizedTerrainLabel(move.terrain)}.`));
  if (move.forceSwitch) lines.push(lang('명중하면 상대를 교체시킵니다.', 'Forces the target to switch on hit.'));
  if (move.selfSwitch) lines.push(lang('사용 후 교체합니다.', 'Switches the user out after use.'));
  if (move.stallingMove) lines.push(lang('연속 사용 시 실패 확률이 커지는 방어 계열 기술입니다.', 'Protection-style move that becomes less reliable if used repeatedly.'));
  if (move.willCrit || Number(move.critRatio) > 1) lines.push(lang('급소 확률이 높습니다.', 'Has an elevated critical-hit rate.'));
  if (Array.isArray(move.multiHit)) lines.push(lang(`${move.multiHit[0]}~${move.multiHit[1]}번 연속 공격합니다.`, `Hits ${move.multiHit[0]}-${move.multiHit[1]} times.`));
  if (Array.isArray(move.drain) && move.drain[1]) lines.push(lang(`가한 피해의 약 ${Math.round((move.drain[0] / move.drain[1]) * 100)}%를 회복합니다.`, `Restores about ${Math.round((move.drain[0] / move.drain[1]) * 100)}% of damage dealt.`));
  if (Array.isArray(move.recoil) && move.recoil[1]) lines.push(lang(`사용자도 반동 피해를 받습니다.`, 'The user takes recoil damage.'));
  if (Array.isArray(move.heal) && move.heal[1]) lines.push(lang(`최대 HP의 약 ${Math.round((move.heal[0] / move.heal[1]) * 100)}%를 회복합니다.`, `Restores about ${Math.round((move.heal[0] / move.heal[1]) * 100)}% max HP.`));
  const selfBoosts = describeStatChangeMap(move.boosts);
  if (selfBoosts.length) lines.push(lang(`능력치 변화: ${selfBoosts.join(', ')}.`, `Stat changes: ${selfBoosts.join(', ')}.`));
  const selfSecondaryBoosts = describeStatChangeMap(move.secondary?.self?.boosts);
  if (selfSecondaryBoosts.length) lines.push(lang(`명중 후 사용자 능력치 추가 변화: ${selfSecondaryBoosts.join(', ')}.`, `On hit, user stat changes: ${selfSecondaryBoosts.join(', ')}.`));
  const targetSecondaryBoosts = describeStatChangeMap(move.secondary?.boosts);
  if (targetSecondaryBoosts.length) lines.push(lang(`추가 효과 능력치 변화: ${targetSecondaryBoosts.join(', ')}.`, `Secondary stat changes: ${targetSecondaryBoosts.join(', ')}.`));
  if (move.secondary?.chance && move.secondary?.status) lines.push(lang(`${move.secondary.chance}% 확률로 ${displayStatus(move.secondary.status)}를 겁니다.`, `${move.secondary.chance}% chance to inflict ${displayStatus(move.secondary.status)}.`));
  if (move.secondary?.chance && move.secondary?.volatileStatus) lines.push(lang(`${move.secondary.chance}% 확률로 ${localizedVolatileLabel(move.secondary.volatileStatus)} 상태를 겁니다.`, `${move.secondary.chance}% chance to apply ${localizedVolatileLabel(move.secondary.volatileStatus)}.`));
  if (move.secondary?.chance && move.secondary?.self?.volatileStatus) lines.push(lang(`명중 시 ${move.secondary.chance}% 확률로 사용자에게 ${localizedVolatileLabel(move.secondary.self.volatileStatus)} 효과가 생깁니다.`, `On hit, ${move.secondary.chance}% chance to apply ${localizedVolatileLabel(move.secondary.self.volatileStatus)} to the user.`));
  if (!lines.length) {
    lines.push(move.category === 'Status'
      ? lang('특수한 상태/필드/보조 효과를 다루는 기술입니다.', 'Applies a utility, status, or field effect.')
      : lang('직접적인 부가 효과는 데이터에 명시되지 않은 기본 공격기입니다.', 'Primarily a direct attacking move with no extra effect listed in the local data.'));
  }
  return lines.join('\n');
}
function getPickerCurrentValue(picker = state.picker || {}, mon = getSelectedMon()) {
  if (!picker || !mon) return '';
  if (picker.mode === 'species') return mon.baseSpecies || mon.species || '';
  if (picker.mode === 'move' && Number.isInteger(picker.moveIndex)) return mon.moves?.[picker.moveIndex] || '';
  if (picker.mode === 'item') return mon.item || '';
  if (picker.mode === 'ability') return mon.ability || '';
  if (picker.mode === 'nature') return mon.nature || '';
  return '';
}
function isPickerOptionSelected(option, picker = state.picker || {}, mon = getSelectedMon()) {
  return toId(option?.english) === toId(getPickerCurrentValue(picker, mon));
}
function resetPickerDetail() {
  if (!els.pickerDetail) return;
  if (state.picker) state.picker.detailOption = null;
  const isMoveMode = (state.picker?.mode === 'move');
  els.pickerDetail.classList.toggle('hidden', !isMoveMode);
  if (els.pickerDetailPlaceholder) {
    els.pickerDetailPlaceholder.textContent = lang('기술 상세를 보려면 기술의 정보 버튼을 누르세요.', 'Press a move info button to inspect its details.');
    els.pickerDetailPlaceholder.classList.toggle('hidden', !isMoveMode ? true : false);
  }
  els.pickerDetailContent?.classList.add('hidden');
  if (els.pickerDetailName) els.pickerDetailName.textContent = '—';
  if (els.pickerDetailAlt) els.pickerDetailAlt.textContent = '—';
  if (els.pickerDetailMeta) els.pickerDetailMeta.innerHTML = '';
  if (els.pickerDetailDesc) els.pickerDetailDesc.textContent = '';
  if (els.pickerDetailFlags) els.pickerDetailFlags.innerHTML = '';
}
function renderMoveDetail(option) {
  if (!els.pickerDetail || state.picker?.mode !== 'move') return;
  const move = state.dex?.moves?.get?.(option?.english || '');
  if (!move?.exists) {
    resetPickerDetail();
    if (els.pickerDetailPlaceholder) {
      els.pickerDetailPlaceholder.textContent = lang('기술 상세 데이터를 불러오지 못했습니다.', 'Move detail data could not be loaded.');
      els.pickerDetailPlaceholder.classList.remove('hidden');
    }
    return;
  }
  state.picker.detailOption = option;
  els.pickerDetail.classList.remove('hidden');
  els.pickerDetailPlaceholder?.classList.add('hidden');
  els.pickerDetailContent?.classList.remove('hidden');
  if (els.pickerDetailName) els.pickerDetailName.textContent = option.display || displayMoveName(move.name);
  if (els.pickerDetailAlt) {
    const alternate = state.language === 'en'
      ? (option.korean && option.korean !== option.english ? option.korean : '')
      : (option.english && option.english !== option.korean ? option.english : '');
    els.pickerDetailAlt.textContent = alternate || lang('기술 상세', 'Move details');
  }
  const metaChips = [
    `${lang('타입', 'Type')}: ${displayType(move.type)}`,
    `${lang('분류', 'Category')}: ${move.category ? lang(move.category === 'Status' ? '변화' : (move.category === 'Physical' ? '물리' : '특수'), move.category) : '—'}`,
    `${lang('위력', 'Power')}: ${move.basePower || '—'}`,
    `${lang('명중', 'Accuracy')}: ${move.accuracy === true ? lang('반드시', 'Sure-hit') : (move.accuracy || '—')}`,
    `${lang('PP', 'PP')}: ${move.pp || '—'}`,
    `${lang('우선도', 'Priority')}: ${Number(move.priority || 0)}`,
    `${lang('대상', 'Target')}: ${displayTargetHint(move.target)}`,
  ];
  els.pickerDetailMeta.innerHTML = metaChips.map(text => `<span class="picker-detail-chip">${text}</span>`).join('');
  els.pickerDetailDesc.textContent = buildMoveEffectSummary(move);
  const flagChips = [];
  for (const [flag, enabled] of Object.entries(move.flags || {})) {
    if (!enabled) continue;
    flagChips.push(localizedMoveFlagLabel(flag));
  }
  if (move.secondary?.chance) flagChips.push(lang(`추가효과 ${move.secondary.chance}%`, `Secondary ${move.secondary.chance}%`));
  els.pickerDetailFlags.innerHTML = flagChips.map(text => `<span class="picker-detail-chip">${text}</span>`).join('');
}
function getPickerFallbackFocusTarget(picker = state.picker || {}) {
  if (picker.mode === 'species') return els.browseSpeciesBtn || els.speciesInput || document.body;
  if (picker.mode === 'move' && Number.isInteger(picker.moveIndex)) {
    return els.browseMoveBtns?.[picker.moveIndex] || els.moveInputs?.[picker.moveIndex] || document.body;
  }
  if (picker.mode === 'item') return els.browseItemBtn || els.itemInput || document.body;
  if (picker.mode === 'ability') return els.browseAbilityBtn || els.abilitySelect || document.body;
  if (picker.mode === 'nature') return els.browseNatureBtn || els.natureSelect || document.body;
  return document.body;
}
function setPickerModalOpen(isOpen) {
  if (!els.pickerModal) return;
  els.pickerModal.classList.toggle('hidden', !isOpen);
  els.pickerModal.setAttribute('aria-hidden', isOpen ? 'false' : 'true');
  document.body.classList.toggle('picker-open', isOpen);
  if (isOpen) {
    els.pickerModal.removeAttribute('inert');
    els.pageShell?.setAttribute('inert', '');
  } else {
    els.pickerModal.setAttribute('inert', '');
    els.pageShell?.removeAttribute('inert');
  }
}
function focusPickerReturnTarget(picker = state.picker || {}) {
  const saved = pickerReturnFocusEl;
  const fallback = getPickerFallbackFocusTarget(picker);
  pickerReturnFocusEl = null;
  const target = saved && document.contains(saved) ? saved : fallback;
  if (target && typeof target.focus === 'function') {
    requestAnimationFrame(() => {
      if (document.contains(target)) target.focus({preventScroll: true});
    });
  }
}
function showPicker(mode, moveIndex = null, triggerEl = null) {
  let options = [];
  let title = lang('선택', 'Select');
  let emptyHint = lang('검색 결과가 없습니다.', 'No results found.');
  if (mode === 'species') {
    options = state.speciesChoices;
    title = lang('포켓몬 선택', 'Choose Pokémon');
  } else if (mode === 'move') {
    const mon = getSelectedMon();
    options = getCurrentMoveChoices(mon);
    title = Number.isInteger(moveIndex)
      ? lang(`기술 ${moveIndex + 1} 선택`, `Choose Move ${moveIndex + 1}`)
      : lang('기술 선택', 'Choose move');
    if (!mon?.data) emptyHint = lang('먼저 포켓몬을 선택하면 배울 수 있는 기술 목록이 표시됩니다.', 'Choose a species first to load its learnable moves.');
    else if (!options.length) emptyHint = lang('포켓몬 데이터는 불러왔지만 기술 목록이 비어 있습니다. 종족을 다시 선택해 보세요.', 'The species data loaded, but its move list is empty. Try reselecting the species.');
  } else if (mode === 'item') {
    options = state.itemChoices || [];
    title = lang('도구 선택', 'Choose Item');
  } else if (mode === 'ability') {
    const mon = getSelectedMon();
    options = getCurrentAbilityChoices(mon);
    title = lang('특성 선택', 'Choose Ability');
    if (!mon?.data) emptyHint = lang('먼저 포켓몬을 선택하면 특성 목록이 표시됩니다.', 'Choose a species first to load its abilities.');
  } else if (mode === 'nature') {
    options = getNatureChoices();
    title = lang('성격 선택', 'Choose Nature');
  }
  pickerReturnFocusEl = triggerEl && typeof triggerEl.focus === 'function'
    ? triggerEl
    : (document.activeElement && typeof document.activeElement.focus === 'function' ? document.activeElement : null);
  state.picker = {mode, moveIndex, options, emptyHint, detailOption: null};
  els.pickerTitle.textContent = title;
  els.pickerSearch.value = '';
  setPickerModalOpen(true);
  resetPickerDetail();
  renderPickerOptions();
  els.pickerList.scrollTop = 0;
  requestAnimationFrame(() => {
    els.pickerSearch?.focus({preventScroll: true});
  });
}
function hidePicker({restoreFocus = true} = {}) {
  if (!els.pickerModal) return;
  const picker = state.picker || {};
  const active = document.activeElement;
  if (active && els.pickerModal.contains(active) && typeof active.blur === 'function') {
    active.blur();
  }
  setPickerModalOpen(false);
  if (restoreFocus) focusPickerReturnTarget(picker);
}
function renderPickerOptions() {
  const picker = state.picker || {options: [], emptyHint: ''};
  const query = els.pickerSearch?.value || '';
  const filtered = filterPickerOptions(picker.options || [], query);
  els.pickerList.innerHTML = '';
  els.pickerEmpty.textContent = filtered.length ? '' : (picker.emptyHint || lang('검색 결과가 없습니다.', 'No results found.'));
  for (const option of filtered) {
    const wrap = document.createElement('div');
    wrap.className = `picker-option${isPickerOptionSelected(option, picker) ? ' active' : ''}`;
    const subtitle = buildPickerSubtitle(option, picker.mode);
    const applyOption = async () => {
      const mon = getSelectedMon();
      if (picker.mode === 'species') {
        applySpeciesSelection(mon, option.english);
        mon.displaySpecies = mon.formSpecies || mon.species;
        mon.spriteOverrideId = '';
        await hydrateSelectedSpecies();
        await renderValidation();
      } else if (picker.mode === 'move' && Number.isInteger(picker.moveIndex)) {
        mon.moves[picker.moveIndex] = option.english;
        saveState();
        renderEditor();
        await renderValidation();
      } else if (picker.mode === 'item') {
        mon.item = option.english;
        await hydrateSelectedSpecies();
        await renderValidation();
      } else if (picker.mode === 'ability') {
        mon.ability = option.english;
        await hydrateSelectedSpecies();
        await renderValidation();
      } else if (picker.mode === 'nature') {
        mon.nature = option.english;
        renderEditor();
        saveState();
        await renderValidation();
      }
      hidePicker();
    };
    if (picker.mode === 'move') {
      wrap.innerHTML = `
        <div class="picker-option-row">
          <div class="picker-option-main">
            <button type="button" class="picker-option-select">
              <strong>${option.display}</strong>
              ${subtitle ? `<small>${subtitle}</small>` : ''}
            </button>
          </div>
          <div class="picker-option-actions">
            <button type="button" class="ghost-btn small picker-detail-btn">${lang('정보', 'Info')}</button>
          </div>
        </div>`;
      const selectBtn = wrap.querySelector('.picker-option-select');
      selectBtn?.addEventListener('click', applyOption);
      const detailBtn = wrap.querySelector('.picker-detail-btn');
      detailBtn?.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        renderMoveDetail(option);
      });
    } else {
      wrap.innerHTML = `<button type="button" class="picker-option-select">${subtitle ? `<strong>${option.display}</strong><small>${subtitle}</small>` : `<strong>${option.display}</strong>`}</button>`;
      wrap.querySelector('.picker-option-select')?.addEventListener('click', applyOption);
    }
    els.pickerList.appendChild(wrap);
  }
  const detailStillVisible = picker.detailOption && filtered.some(option => toId(option.english) === toId(picker.detailOption.english));
  if (detailStillVisible) renderMoveDetail(picker.detailOption);
  else if (picker.mode === 'move') resetPickerDetail();
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
    species: '', baseSpecies: '', manualFormSpecies: '', formSpecies: '', displaySpecies: '', spriteId: '', spriteAutoId: '', spriteOverrideId: '', shiny: false, level: 100,
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
    if (getHeldItemId(mon) === 'choicescarf') value = Math.floor(value * 1.5);
    if (getSideForMon(mon)?.sideConditions?.tailwindTurns > 0) value = Math.floor(value * 2);
    if (state.battle?.weather === 'sun' && slugify(mon.ability) === 'chlorophyll') value = Math.floor(value * 2);
    if (state.battle?.weather === 'rain' && slugify(mon.ability) === 'swiftswim') value = Math.floor(value * 2);
    if (state.battle?.weather === 'sand' && slugify(mon.ability) === 'sandrush') value = Math.floor(value * 2);
    if (state.battle?.weather === 'snow' && slugify(mon.ability) === 'slushrush') value = Math.floor(value * 2);
  }
  if (stat === 'def' && getHeldItemId(mon) === 'eviolite' && mon.data?.evolves) value = Math.floor(value * 1.5);
  if (stat === 'def' && state.battle?.weather === 'snow' && mon.types.includes('ice')) value = Math.floor(value * 1.5);
  if (stat === 'spd' && getHeldItemId(mon) === 'assaultvest') value = Math.floor(value * 1.5);
  if (stat === 'spd' && state.battle?.weather === 'sand' && mon.types.includes('rock')) value = Math.floor(value * 1.5);
  return value;
}
function typeEffectiveness(moveType, defender) {
  if (!moveType || moveType === 'typeless') return 1;
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
  els.runtimeStatus.textContent = localizeText(message);
  els.runtimeStatus.className = `runtime-status ${type}`;
  els.runtimeNotes.innerHTML = String(notes || '').split('<br>').map(part => localizeText(part)).join('<br>');
}
function saveState() {
  const snapshot = {
    mode: state.mode,
    validationProfile: state.validationProfile,
    language: state.language,
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
    state.validationProfile = VALIDATION_PROFILES[parsed.validationProfile] ? parsed.validationProfile : 'open';
    state.language = parsed.language === 'en' ? 'en' : 'ko';
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
  state.manifest = await fetchJson('./assets/manifest.json');
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
    eggGroups: Array.isArray(species.eggGroups) ? [...species.eggGroups] : [],
    canGigantamax: species.canGigantamax || '',
    abilityMap: {...(species.abilities || {})},
    learnsetLineage: state.dex.species.getLearnsetLineage(species.id).map(entry => ({
      ...entry,
      speciesName: state.dex.species.get(entry.id)?.name || entry.id,
    })),
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
async function getItemData(itemName) {
  const key = slugify(itemName);
  if (!key) throw new Error('Item is blank');
  if (itemDataCache.has(key)) return itemDataCache.get(key);
  if (!state.dex) throw new Error('Local Dex failed to load.');
  const item = state.dex.items.get(itemName);
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
function joinReadableList(values, displayFn = (value) => value) {
  const list = Array.from(new Set((values || []).filter(Boolean).map(displayFn)));
  if (!list.length) return '';
  if (list.length === 1) return list[0];
  if (list.length === 2) return `${list[0]} ${lang('또는', 'or')} ${list[1]}`;
  return `${list.slice(0, -1).join(', ')}, ${lang('또는', 'or')} ${list[list.length - 1]}`;
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

function getValidationProfile() {
  return VALIDATION_PROFILES[state.validationProfile] || VALIDATION_PROFILES.open;
}
function renderValidationProfileNote() {
  if (!els.validationProfileSelect) return;
  els.validationProfileSelect.value = state.validationProfile;
  const profile = getValidationProfile();
  if (els.validationProfileNote) {
    const modeNote = profile.recommendedMode && profile.recommendedMode !== state.mode
      ? lang(
        ` 현재 모드는 ${state.mode === 'singles' ? '싱글' : '더블'}입니다. 이 프로필은 ${profile.recommendedMode === 'singles' ? '싱글' : '더블'}을 권장합니다.`,
        ` Current mode is ${state.mode === 'singles' ? 'Singles' : 'Doubles'}. This profile is intended for ${profile.recommendedMode === 'singles' ? 'Singles' : 'Doubles'}.`,
      )
      : '';
    els.validationProfileNote.textContent = `${localizeText(profile.description)}${modeNote}`;
  }
}
function isSpeciesBreedable(speciesData) {
  const eggGroups = Array.isArray(speciesData?.eggGroups) ? speciesData.eggGroups.map(group => String(group)) : [];
  if (!eggGroups.length) return false;
  return !eggGroups.includes('Undiscovered') && !eggGroups.includes('Ditto');
}
function getAbilityNamesForEvent(monData, eventData) {
  if (!monData) return [];
  if (Array.isArray(eventData?.abilities) && eventData.abilities.length) return eventData.abilities.map(String);
  if (eventData?.isHidden === true) {
    return monData.abilityMap?.H ? [monData.abilityMap.H] : [];
  }
  if (eventData?.isHidden === false) {
    return Object.entries(monData.abilityMap || {})
      .filter(([slot]) => slot !== 'H' && slot !== 'S')
      .map(([, name]) => name)
      .filter(Boolean);
  }
  return Object.values(monData.abilityMap || {}).filter(Boolean);
}
function getMoveEventCandidates(mon, moveId) {
  const lineage = Array.isArray(mon?.data?.learnsetLineage) ? mon.data.learnsetLineage : [];
  const out = [];
  for (const entry of lineage) {
    const directSources = Array.isArray(entry?.learnset?.[moveId]) ? entry.learnset[moveId] : [];
    for (const source of directSources) {
      const match = String(source).match(/^(\d)S(\d+)$/);
      if (!match) continue;
      const eventIndex = Number(match[2]);
      const eventData = entry?.eventData?.[eventIndex] || null;
      out.push({
        sourceCode: String(source),
        generation: Number(match[1]),
        eventIndex,
        speciesId: entry?.id || '',
        speciesName: entry?.speciesName || entry?.id || '',
        eventData,
      });
    }
  }
  return out;
}
function eventCandidateMatchesMon(candidate, mon, requiredMoves = []) {
  const eventData = candidate?.eventData;
  if (!eventData) return {ok: false, reasons: ['event metadata missing']};
  const reasons = [];
  if (eventData.gender && mon.gender && mon.gender !== eventData.gender) reasons.push(`requires gender ${displayGender(eventData.gender)}`);
  if (eventData.nature && mon.nature && toId(mon.nature) !== toId(eventData.nature)) reasons.push(`requires nature ${displayNatureName(eventData.nature)}`);
  if (eventData.shiny && !mon.shiny) reasons.push('requires a shiny event');
  const allowedAbilities = getAbilityNamesForEvent(mon.data, eventData);
  if (allowedAbilities.length && mon.ability && !allowedAbilities.some(name => toId(name) === toId(mon.ability))) {
    reasons.push(`requires ability ${joinReadableList(allowedAbilities, displayAbilityName)}`);
  }
  for (const [stat, exactIv] of Object.entries(eventData.ivs || {})) {
    const chosenIv = Number(mon.ivs?.[stat] ?? 31);
    if (chosenIv !== Number(exactIv)) reasons.push(`requires ${statLabels[stat] || stat.toUpperCase()} IV ${exactIv}`);
  }
  if (eventData.perfectIVs) {
    const perfectCount = statOrder.filter(stat => Number(mon.ivs?.[stat] ?? 31) === 31).length;
    if (perfectCount < Number(eventData.perfectIVs)) reasons.push(`requires at least ${eventData.perfectIVs} perfect IVs`);
  }
  if (eventData.level && Number(mon.level || 100) < Number(eventData.level)) reasons.push(`minimum obtainable level is ${eventData.level}`);
  const eventMoves = Array.isArray(eventData.moves) ? eventData.moves.map(toId) : [];
  if (requiredMoves.length && !requiredMoves.every(move => eventMoves.includes(toId(move)))) reasons.push('event bundle does not contain all required event-only moves together');
  return {ok: reasons.length === 0, reasons};
}
function validateEventMoveCombination(mon, prefix, warnings, errors) {
  const chosenMoves = mon.moves.filter(Boolean);
  if (!chosenMoves.length || !mon?.data) return;
  const eventOnlyMoves = [];
  for (const moveName of chosenMoves) {
    const moveId = toId(moveName);
    const sourceInfo = summarizeLearnsetSources(mon.data.learnsetSources?.[moveId]);
    if (sourceInfo.eventOnly) eventOnlyMoves.push({name: moveName, id: moveId});
  }
  if (!eventOnlyMoves.length) return;

  const bundleMoves = eventOnlyMoves.map(move => move.id);
  const matchingCandidates = [];
  const missingMetadataMoves = [];
  const incompatibleReasons = [];

  for (const move of eventOnlyMoves) {
    const candidates = getMoveEventCandidates(mon, move.id);
    if (!candidates.length || candidates.every(candidate => !candidate.eventData)) {
      missingMetadataMoves.push(move.name);
      continue;
    }
    for (const candidate of candidates) {
      const result = eventCandidateMatchesMon(candidate, mon, bundleMoves);
      if (result.ok) {
        matchingCandidates.push({moveName: move.name, candidate});
      } else {
        incompatibleReasons.push(`${displayMoveName(move.name)} → ${candidate.speciesName || mon.data.name} ${candidate.sourceCode}: ${result.reasons.join(', ')}`);
      }
    }
  }

  if (missingMetadataMoves.length) {
    warnings.push(`${prefix}: ${joinReadableList(missingMetadataMoves, displayMoveName)} 기술은 이벤트 전용으로 보이지만, 현재 로컬 데이터에서 정확한 이벤트 상세를 모두 해석하지 못했습니다. / ${missingMetadataMoves.join(', ')} appear event-only, but the current local parser could not fully resolve their event metadata.`);
  }

  if (!matchingCandidates.length) {
    const detail = incompatibleReasons.length
      ? ` 세부 사유 예시 / example reasons: ${incompatibleReasons.slice(0, 3).join(' ; ')}.`
      : '';
    if (eventOnlyMoves.length === 1 && !missingMetadataMoves.length) {
      errors.push(`${prefix}: ${displayMoveName(eventOnlyMoves[0].name)} 기술의 이벤트 조건이 현재 설정과 맞지 않습니다. / The chosen build does not satisfy the resolved event requirements for ${eventOnlyMoves[0].name}.${detail}`);
    } else if (eventOnlyMoves.length > 1 && !isSpeciesBreedable(mon.data)) {
      errors.push(`${prefix}: ${joinReadableList(eventOnlyMoves.map(move => move.name), displayMoveName)} 기술 조합은 공통 이벤트 배포와 맞지 않습니다. / This event-only move combination does not line up with a single compatible distribution for ${mon.data.name}.${detail}`);
    } else {
      warnings.push(`${prefix}: ${joinReadableList(eventOnlyMoves.map(move => move.name), displayMoveName)} 기술 조합은 이벤트 출처 충돌 가능성이 있습니다. / This event-only move combination may be source-incompatible.${detail}`);
    }
    return;
  }

  const uniqueSources = Array.from(new Set(matchingCandidates.map(entry => `${entry.candidate.speciesId}:${entry.candidate.sourceCode}`)));
  const matchingBundle = matchingCandidates.some(entry => eventCandidateMatchesMon(entry.candidate, mon, bundleMoves).ok);
  if (eventOnlyMoves.length > 1 && uniqueSources.length > 1 && !matchingBundle) {
    if (isSpeciesBreedable(mon.data)) warnings.push(`${prefix}: 이벤트 전용 기술이 여러 배포에 흩어져 있습니다. / The chosen event-only moves come from different distributions. 교배 / 세대 이동으로 가능한지까지는 아직 완전 검증하지 못합니다. / Full breeding-transfer compatibility is not modeled yet.`);
    else errors.push(`${prefix}: 이벤트 전용 기술들이 서로 다른 배포에 흩어져 있어 함께 사용할 수 없습니다. / The chosen event-only moves come from different one-off distributions and do not appear to be simultaneously legal.`);
  }
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
function collectTeamDiagnostics(team, playerIndex) {
  const warnings = [];
  const errors = [];
  const profile = getValidationProfile();
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
    if (slots.length > 1) {
      const msg = `${state.playerNames[playerIndex]}: 같은 포켓몬 ${displaySpeciesName(label)} 이(가) 슬롯 ${slots.join(', ')}에 중복되어 있습니다. / duplicate species (${label}) in slots ${slots.join(', ')}.`;
      (profile.enforceSpeciesClause ? errors : warnings).push(profile.enforceSpeciesClause ? `${msg} 현재 검증 프로필에서는 Species Clause로 금지됩니다. / This validation profile enforces Species Clause.` : `${msg} 이 프로필에서는 경고만 표시합니다. / This profile only warns about it.`);
    }
  }
  for (const {label, slots} of itemBuckets.values()) {
    if (slots.length > 1) {
      const msg = `${state.playerNames[playerIndex]}: 같은 지닌 도구 ${displayItemName(label)} 이(가) 슬롯 ${slots.join(', ')}에 중복되어 있습니다. / duplicate held item (${label}) in slots ${slots.join(', ')}.`;
      (profile.enforceItemClause ? errors : warnings).push(profile.enforceItemClause ? `${msg} 현재 검증 프로필에서는 Item Clause로 금지됩니다. / This validation profile enforces Item Clause.` : `${msg} 이 프로필에서는 경고만 표시합니다. / This profile only warns about it.`);
    }
  }
  if (profile.recommendedMode && profile.recommendedMode !== state.mode) {
    warnings.push(`${state.playerNames[playerIndex]} 팀: 현재 검증 프로필은 ${profile.recommendedMode === 'singles' ? '싱글 / Singles' : '더블 / Doubles'}용입니다. / The selected validation profile is intended for ${profile.recommendedMode}.`);
  }
  return {errors, warnings};
}

function getBaseSpriteId(speciesInput) {
  const resolved = resolveSpeciesSelection(speciesInput);
  if (!resolved.family) return '';
  return getAutoSpriteIdForSpecies(resolved.speciesName || resolved.baseSpeciesName, '', resolved.baseSpeciesName);
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
    langKoBtn: document.getElementById('lang-ko-btn'),
    langEnBtn: document.getElementById('lang-en-btn'),
    runtimeNotes: document.getElementById('runtime-notes'),
    modeSinglesBtn: document.getElementById('mode-singles-btn'),
    modeDoublesBtn: document.getElementById('mode-doubles-btn'),
    validationProfileSelect: document.getElementById('validation-profile-select'),
    validationProfileNote: document.getElementById('validation-profile-note'),
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
    formeSelect: document.getElementById('forme-select'),
    spriteVariantSelect: document.getElementById('sprite-variant-select'),
    speciesStatus: document.getElementById('species-status'),
    nicknameInput: document.getElementById('nickname-input'),
    abilitySelect: document.getElementById('ability-select'),
    browseAbilityBtn: document.getElementById('browse-ability-btn'),
    natureSelect: document.getElementById('nature-select'),
    browseNatureBtn: document.getElementById('browse-nature-btn'),
    genderSelect: document.getElementById('gender-select'),
    itemInput: document.getElementById('item-input'),
    browseItemBtn: document.getElementById('browse-item-btn'),
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
    battleFieldStatus: document.getElementById('battle-field-status'),
    battleLog: document.getElementById('battle-log'),
    pendingChoices: document.getElementById('pending-choices'),
    clearLogBtn: document.getElementById('clear-log-btn'),
    speciesList: document.getElementById('species-list'),
    itemList: document.getElementById('item-list'),
    moveList: document.getElementById('move-list'),
    pageShell: document.querySelector('.page-shell'),
    browseSpeciesBtn: document.getElementById('browse-species-btn'),
    browseMoveBtns: [0,1,2,3].map(i => document.getElementById(`browse-move${i + 1}-btn`)),
    pickerModal: document.getElementById('picker-modal'),
    pickerTitle: document.getElementById('picker-title'),
    pickerSearch: document.getElementById('picker-search'),
    pickerList: document.getElementById('picker-list'),
    pickerEmpty: document.getElementById('picker-empty'),
    pickerDetail: document.getElementById('picker-detail'),
    pickerDetailPlaceholder: document.getElementById('picker-detail-placeholder'),
    pickerDetailContent: document.getElementById('picker-detail-content'),
    pickerDetailName: document.getElementById('picker-detail-name'),
    pickerDetailAlt: document.getElementById('picker-detail-alt'),
    pickerDetailMeta: document.getElementById('picker-detail-meta'),
    pickerDetailDesc: document.getElementById('picker-detail-desc'),
    pickerDetailFlags: document.getElementById('picker-detail-flags'),
    pickerCloseBtn: document.getElementById('picker-close-btn'),
  });
}
function buildStaticLists() {
  relocalizeChoiceCaches();
  setDatalistOptions(els.speciesList, state.speciesChoices);
  const dexItems = state.dex
    ? state.dex.items.all().filter(item => isDexSupported(item)).map(item => item.name)
    : [];
  const allItems = Array.from(new Set([...commonItems, ...dexItems]));
  state.itemChoices = sortChoicesForLanguage(allItems.map(item => makeChoice('items', item)));
  setDatalistOptions(els.itemList, state.itemChoices);
  state.allMoveChoices = sortChoicesForLanguage(moveNameCache.map(name => makeChoice('moves', name)));
  setDatalistOptions(els.moveList, state.allMoveChoices);
  state.natureChoices = sortChoicesForLanguage(natureOrder.map(name => makeChoice('natures', name)));
  if (els.validationProfileSelect) {
    els.validationProfileSelect.innerHTML = Object.values(VALIDATION_PROFILES).map(profile => `<option value="${profile.id}">${localizeText(profile.label)}</option>`).join('\n');
  }
  els.natureSelect.innerHTML = state.natureChoices.map(choice => `<option value="${choice.english}">${choice.display}</option>`).join('\n');
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
  if (mon.shiny) flags.push(lang('색이 다른 포켓몬', 'Shiny'));
  if (mon.gender === 'M') flags.push(displayGender('M'));
  if (mon.gender === 'F') flags.push(displayGender('F'));
  if (mon.gender === 'N') flags.push(displayGender('N'));
  flags.push(lang(`레벨 ${mon.level || 100}`, `Level ${mon.level || 100}`));
  if (mon.teraType) flags.push(lang(`테라 ${displayType(mon.teraType)}`, `Tera ${displayType(mon.teraType)}`));
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
      const species = displaySpeciesName(mon.data?.name || mon.displaySpecies || mon.species) || lang(`슬롯 ${slot + 1}`, `Slot ${slot + 1}`);
      const moveCount = mon.moves.filter(Boolean).length;
      const title = mon.nickname?.trim() || species;
      const abilityLabel = mon.ability ? displayAbilityName(mon.ability) : lang('특성 없음', 'No ability');
      const subline = mon.nickname?.trim()
        ? `${species} · ${abilityLabel} · ${lang('기술', 'Moves')} ${moveCount}/4`
        : `${abilityLabel} · ${lang('기술', 'Moves')} ${moveCount}/4`;
      meta.innerHTML = `<div class="slot-name">${title}</div><div class="slot-sub">${subline}</div>`;
      button.appendChild(meta);
      container.appendChild(button);
    });
  });
  els.teamSizeNote.textContent = state.language === 'ko'
    ? `각 플레이어는 포켓몬 ${state.teamSize}마리를 만든다.`
    : `Each player builds ${state.teamSize} Pokémon.`;
  els.heroModeLabel.textContent = state.mode === 'singles'
    ? lang('싱글 · 3마리', 'Singles · 3 Pokémon')
    : lang('더블 · 4마리', 'Doubles · 4 Pokémon');
}
function implementedAbilityNote(name) {
  const id = slugify(name);
  if (!id) return lang('포켓몬을 선택하면 특성을 고를 수 있습니다.', "Select one of the Pokémon's native abilities.");
  if (implementedAbilities.has(id)) return state.language === 'ko'
    ? `${displayAbilityName(name)} 특성은 현재 전투에서 구현되어 있습니다.`
    : `${displayAbilityName(name)} is implemented in battle.`;
  return state.language === 'ko'
    ? `${displayAbilityName(name)} 특성은 저장되고 표시되지만, 고유 발동 로직은 아직 완전하지 않습니다.`
    : `${displayAbilityName(name)} is stored and shown in battle, but its custom triggers are not fully implemented yet.`;
}
function implementedItemNote(name) {
  const id = slugify(name);
  if (!id) return lang('지닌 도구가 없습니다.', 'No held item selected.');
  if (implementedItems.has(id)) return state.language === 'ko'
    ? `${displayItemName(name)} 도구는 현재 배틀 효과가 구현되어 있습니다.`
    : `${displayItemName(name)} has a battle effect in this build.`;
  return state.language === 'ko'
    ? `${displayItemName(name)} 도구는 아이콘과 함께 표시되지만, 배틀 효과는 아직 완전하지 않습니다.`
    : `${displayItemName(name)} is shown with its icon, but its battle effect is not fully implemented yet.`;
}
async function hydrateSelectedSpecies() {
  const mon = getSelectedMon();
  const rawSelection = mon.manualFormSpecies || mon.formSpecies || mon.species || mon.baseSpecies || mon.displaySpecies;
  const resolved = resolveSpeciesSelection(rawSelection);
  if (!resolved.baseSpeciesName) {
    mon.data = null;
    mon.displaySpecies = mon.species || '';
    mon.baseSpecies = '';
    mon.manualFormSpecies = '';
    mon.formSpecies = '';
    mon.spriteId = '';
    mon.spriteAutoId = '';
    mon.spriteOverrideId = '';
    mon.ability = '';
    mon.moves = mon.moves || ['', '', '', ''];
    if (!mon.teraType) mon.teraType = 'normal';
    if (els.speciesStatus) els.speciesStatus.textContent = mon.species
      ? lang('업로드된 스프라이트와 일치하는 포켓몬이 없습니다.', 'No uploaded sprite matched that species name.')
      : lang('포켓몬을 선택하면 로컬 전투 데이터를 불러옵니다.', 'Choose a species to load local battle data.');
    saveState();
    renderAll();
    return;
  }

  mon.baseSpecies = resolved.baseSpeciesName;
  mon.manualFormSpecies = sanitizeManualFormSpecies(mon, resolved.baseSpeciesName);
  mon.formSpecies = resolveAutomaticBuilderSpecies(mon, mon.manualFormSpecies || resolved.baseSpeciesName) || mon.manualFormSpecies || resolved.baseSpeciesName;
  mon.species = mon.formSpecies;
  if (els.speciesStatus) els.speciesStatus.textContent = lang('로컬 전투 데이터에서 포켓몬 정보를 불러오는 중…', 'Loading species data from local battle data…');
  try {
    const data = await getSpeciesData(mon.formSpecies);
    mon.data = data;
    mon.species = data.name;
    mon.formSpecies = data.name;
    mon.baseSpecies = data.baseSpecies || resolved.baseSpeciesName || data.name;
    mon.manualFormSpecies = sanitizeManualFormSpecies(mon, mon.baseSpecies);
    mon.displaySpecies = data.name;
    if (!mon.ability || !data.abilities.includes(mon.ability)) mon.ability = data.abilities[0] || '';
    if (!mon.teraType) mon.teraType = data.types[0] || 'normal';
    rebuildMoveDatalist(mon);
    syncMonSprite(mon);
    if (els.speciesStatus) {
      const spriteNote = mon.spriteId ? lang(` · 스프라이트 ${mon.spriteId}`, ` · Sprite ${mon.spriteId}`) : lang(' · 스프라이트 없음', ' · No sprite mapped');
      const formNote = mon.manualFormSpecies && toId(mon.manualFormSpecies) !== toId(mon.formSpecies)
        ? lang(` · 자동 폼 ${displaySpeciesName(mon.formSpecies)}`, ` · Auto form ${displaySpeciesName(mon.formSpecies)}`)
        : '';
      els.speciesStatus.textContent = state.language === 'ko'
        ? `${displaySpeciesName(data.name)} 불러옴 · ${data.types.map(displayType).join(' · ')}${spriteNote}${formNote}`
        : `${displaySpeciesName(data.name)} loaded · ${data.types.map(displayType).join(' · ')}${spriteNote}${formNote}`;
    }
  } catch (error) {
    mon.data = null;
    mon.displaySpecies = mon.formSpecies || mon.species || '';
    syncMonSprite(mon);
    if (els.speciesStatus) els.speciesStatus.textContent = lang('로컬 전투 데이터에서 포켓몬 정보를 불러오지 못했습니다.', 'Species data could not be loaded from local battle data.');
  }
  saveState();
  renderAll();
}

function renderEditor() {
  const mon = getSelectedMon();
  rebuildMoveDatalist(mon);
  const displayName = mon.nickname?.trim() || displaySpeciesName(mon.displaySpecies || mon.species) || t('no_species_selected');
  els.editorTitle.textContent = state.language === 'ko'
    ? `${state.playerNames[state.selected.player]} · 슬롯 ${state.selected.slot + 1}`
    : `${state.playerNames[state.selected.player]} · Slot ${state.selected.slot + 1}`;
  els.editorSubtitle.textContent = lang('포켓몬, 사전 선택 폼, 기술, 능력치, 지닌 도구, 성격, 특성, 테라 타입을 설정하세요.', 'Set species, pre-battle forme, moves, stats, item, nature, ability, and tera type.');
  els.speciesInput.value = displaySpeciesName(mon.baseSpecies || mon.species || '');
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
  syncMonSprite(mon);
  renderFormSelectors(mon);
  if (els.speciesStatus) {
    if (mon.data?.types?.length) {
      const formNote = mon.manualFormSpecies && toId(mon.manualFormSpecies) !== toId(mon.formSpecies)
        ? lang(` · 자동 폼 ${displaySpeciesName(mon.formSpecies)}`, ` · Auto form ${displaySpeciesName(mon.formSpecies)}`)
        : '';
      const spriteNote = mon.spriteId ? lang(` · 스프라이트 ${mon.spriteId}`, ` · Sprite ${mon.spriteId}`) : '';
      els.speciesStatus.textContent = state.language === 'ko'
        ? `${displaySpeciesName(mon.data.name)} 불러옴 · ${mon.data.types.map(displayType).join(' · ')}${spriteNote}${formNote}`
        : `${displaySpeciesName(mon.data.name)} loaded · ${mon.data.types.map(displayType).join(' · ')}${spriteNote}${formNote}`;
    }
    else if (mon.spriteId) els.speciesStatus.textContent = lang('로컬 전투 데이터에서 포켓몬 정보를 불러오지 못했습니다.', 'Species data could not be loaded from local battle data.');
    else if (mon.species || mon.displaySpecies) els.speciesStatus.textContent = lang('업로드된 스프라이트와 일치하는 포켓몬이 없습니다.', 'No uploaded sprite matched that species name.');
    else els.speciesStatus.textContent = lang('포켓몬을 선택하면 로컬 전투 데이터를 불러옵니다.', 'Choose a species to load local battle data.');
  }
  els.editorAbilityNote.textContent = mon.ability ? implementedAbilityNote(mon.ability) : lang('포켓몬을 선택하면 특성 목록이 로드됩니다.', 'Select a species to load its ability list.');
  els.editorAbilityEffect.textContent = implementedItemNote(mon.item);
  els.abilitySelect.innerHTML = getCurrentAbilityChoices(mon).map(choice => `<option value="${choice.english}">${choice.display}</option>`).join('') || `<option value="">${lang('특성 없음', 'No abilities loaded')}</option>`;
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
  els.evTotal.textContent = state.language === 'ko' ? `합계: ${evTotal} / 510` : `Total: ${evTotal} / 510`;
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
  const profile = getValidationProfile();
  if (profile.forcedLevel && Number(mon.level || 0) !== profile.forcedLevel) errors.push(`${prefix}: 현재 검증 프로필에서는 레벨 ${profile.forcedLevel}만 허용합니다. / The selected validation profile requires level ${profile.forcedLevel}.`);
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
      errors.push(`${prefix}: ${speciesLabel}은(는) 전투 중 전용 폼입니다. / ${mon.data.name} is a battle-only form. ${displaySpeciesName(Array.isArray(mon.data.battleOnly) ? mon.data.battleOnly[0] : mon.data.battleOnly)} 또는 기본 폼을 팀 편집기에서 사용하세요. / Use its listed base form in the builder until that specific runtime transformation is implemented.`);
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
      warnings.push(`${prefix}: ${speciesLabel}은(는) 조건부 폼입니다. / ${mon.data.name} is a condition-based form. 이 빌드는 실제 업로드 스프라이트와 폼 매핑을 연결하며, 메가진화처럼 일부 변신은 전투 중 처리하지만 모든 폼 전환 연출이 완성된 것은 아닙니다. / This build now resolves uploaded sprite forms and handles some transformations such as Mega Evolution, but not every mid-battle form change is fully modeled yet.`);
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
        if (sourceInfo.eventOnly) warnings.push(`${prefix}: ${displayMoveName(loadedMove.name)} 기술은 로컬 learnset 기준 이벤트 전용으로 보입니다. / ${loadedMove.name} appears event-only in the loaded learnset sources. 아래의 이벤트 출처 검사가 추가 조건을 계속 확인합니다. / Additional event-source checks below will validate stricter compatibility where possible.`);
        else if (sourceInfo.legacyOnly) warnings.push(`${prefix}: ${displayMoveName(loadedMove.name)} 기술은 구세대 출처만 확인됩니다. / ${loadedMove.name} only appears through older-generation learnset sources. 세대 이동/출처 호환성 검증은 아직 구현되지 않았습니다. / Transfer/source compatibility is not modeled yet.`);
      }
    } catch (error) {
      errors.push(`${prefix}: 기술 ${displayMoveName(move)} 정보를 불러오지 못했습니다. / move “${move}” could not be loaded.`);
    }
  }
  validateEventMoveCombination(mon, prefix, warnings, errors);
  return {errors, warnings};
}

async function rehydrateTeams() {
  for (const team of state.teams) {
    for (const mon of team) {
      if (!mon.species && !mon.displaySpecies && !mon.baseSpecies) continue;
      const source = mon.manualFormSpecies || mon.formSpecies || mon.species || mon.baseSpecies || mon.displaySpecies;
      const resolved = resolveSpeciesSelection(source);
      if (!resolved.baseSpeciesName) continue;
      mon.baseSpecies = resolved.baseSpeciesName;
      mon.manualFormSpecies = sanitizeManualFormSpecies(mon, resolved.baseSpeciesName);
      mon.formSpecies = resolveAutomaticBuilderSpecies(mon, mon.manualFormSpecies || resolved.baseSpeciesName) || mon.manualFormSpecies || resolved.baseSpeciesName;
      mon.species = mon.formSpecies;
      try {
        const data = await getSpeciesData(mon.formSpecies);
        mon.data = data;
        mon.displaySpecies = data.name;
        mon.baseSpecies = data.baseSpecies || mon.baseSpecies || data.name;
        mon.manualFormSpecies = sanitizeManualFormSpecies(mon, mon.baseSpecies);
        if (!mon.ability || !data.abilities.includes(mon.ability)) mon.ability = data.abilities[0] || '';
        if (!mon.teraType) mon.teraType = data.types[0] || 'normal';
      } catch (error) {
        mon.data = null;
      }
      syncMonSprite(mon);
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
    const teamDiagnostics = collectTeamDiagnostics(team, playerIndex);
    allErrors.push(...teamDiagnostics.errors);
    allWarnings.push(...teamDiagnostics.warnings);
  }
  state.builderErrors = allErrors;
  state.builderWarnings = Array.from(new Set(allWarnings));
  if (allErrors.length) {
    els.builderErrors.classList.remove('hidden');
    els.builderErrors.textContent = allErrors.map(localizeText).join('\n');
    els.validationSummary.textContent = state.language === 'ko'
      ? `배틀 시작 전 해결할 문제 ${allErrors.length}개가 남아 있습니다.${state.builderWarnings.length ? ` 경고 ${state.builderWarnings.length}개도 함께 확인하세요.` : ''}`
      : `${allErrors.length} issue${allErrors.length === 1 ? '' : 's'} remaining before battle can start.${state.builderWarnings.length ? ` ${state.builderWarnings.length} warning${state.builderWarnings.length === 1 ? '' : 's'} also noted.` : ''}`;
    els.startBattleBtn.disabled = true;
  } else {
    els.builderErrors.classList.add('hidden');
    els.builderErrors.textContent = '';
    els.validationSummary.textContent = state.builderWarnings.length
      ? lang(`팀이 기본 검증을 통과했습니다. 고급 출처/엔진 제한 관련 경고 ${state.builderWarnings.length}개가 있습니다.`, `Teams pass validation. ${state.builderWarnings.length} warning${state.builderWarnings.length === 1 ? '' : 's'} note advanced source/runtime limits.`)
      : lang('양쪽 팀이 유효합니다. 배틀을 시작할 수 있습니다.', 'Both teams are valid. Battle start is ready.');
    els.startBattleBtn.disabled = false;
  }

  if (els.builderWarnings) {
    if (state.builderWarnings.length) {
      els.builderWarnings.classList.remove('hidden');
      els.builderWarnings.textContent = state.builderWarnings.map(localizeText).join('\n');
    } else {
      els.builderWarnings.classList.add('hidden');
      els.builderWarnings.textContent = '';
    }
  }
}
function wireEditorEvents() {
  els.langKoBtn?.addEventListener('click', () => setLanguage('ko'));
  els.langEnBtn?.addEventListener('click', () => setLanguage('en'));
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
  els.validationProfileSelect?.addEventListener('change', async () => {
    state.validationProfile = VALIDATION_PROFILES[els.validationProfileSelect.value] ? els.validationProfileSelect.value : 'open';
    renderValidationProfileNote();
    await renderValidation();
    saveState();
  });
  els.player1Name.addEventListener('input', syncPlayerNames);
  els.player2Name.addEventListener('input', syncPlayerNames);
  els.speciesInput.addEventListener('change', async () => {
    const mon = getSelectedMon();
    applySpeciesSelection(mon, normalizeBuilderSpeciesInput(els.speciesInput.value.trim()));
    mon.displaySpecies = mon.formSpecies || mon.species;
    mon.spriteOverrideId = '';
    await hydrateSelectedSpecies();
    await renderValidation();
  });
  els.formeSelect?.addEventListener('change', async () => {
    const mon = getSelectedMon();
    const nextForm = els.formeSelect.value || mon.baseSpecies || mon.species;
    if (!nextForm) return;
    mon.manualFormSpecies = nextForm;
    mon.formSpecies = nextForm;
    mon.species = nextForm;
    mon.spriteOverrideId = '';
    await hydrateSelectedSpecies();
    await renderValidation();
  });
  els.browseSpeciesBtn?.addEventListener('click', (event) => showPicker('species', null, event.currentTarget));
  els.browseItemBtn?.addEventListener('click', (event) => showPicker('item', null, event.currentTarget));
  els.nicknameInput?.addEventListener('input', () => {
    const mon = getSelectedMon();
    mon.nickname = els.nicknameInput.value.trim();
    renderEditor();
    renderRoster();
    saveState();
  });
  els.browseAbilityBtn?.addEventListener('click', (event) => showPicker('ability', null, event.currentTarget));
  els.abilitySelect.addEventListener('change', async () => {
    const mon = getSelectedMon();
    mon.ability = els.abilitySelect.value;
    await hydrateSelectedSpecies();
    await renderValidation();
  });
  els.browseNatureBtn?.addEventListener('click', (event) => showPicker('nature', null, event.currentTarget));
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
  els.itemInput.addEventListener('change', async () => {
    const mon = getSelectedMon();
    mon.item = normalizeLocalizedInput('items', els.itemInput.value.trim(), state.itemChoices || []) || els.itemInput.value.trim();
    await hydrateSelectedSpecies();
    await renderValidation();
  });
  els.levelInput.addEventListener('input', () => {
    const mon = getSelectedMon();
    mon.level = clamp(Number(els.levelInput.value || 100), 1, 100);
    renderEditor();
    saveState();
    renderValidation();
  });
  els.teraSelect.addEventListener('change', async () => {
    const mon = getSelectedMon();
    mon.teraType = els.teraSelect.value;
    await hydrateSelectedSpecies();
    await renderValidation();
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
      const moveChoices = getCurrentMoveChoices(mon);
      mon.moves[idx] = normalizeLocalizedInput('moves', input.value.trim(), moveChoices) || input.value.trim();
      await hydrateSelectedSpecies();
      await renderValidation();
    });
  });
  els.browseMoveBtns?.forEach((btn, idx) => btn.addEventListener('click', (event) => showPicker('move', idx, event.currentTarget)));
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
    applySpeciesSelection(mon, picked.english);
    mon.displaySpecies = mon.formSpecies || mon.species;
    mon.spriteOverrideId = '';
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
    state.validationProfile = 'open';
    state.playerNames = ['Player 1','Player 2'];
    els.player1Name.value = 'Player 1';
    els.player2Name.value = 'Player 2';
    rebuildTeamSize();
    resetTeams();
    renderAll();
  });
}


function normalizeShowdownStartSpecies(mon) {
  const chosen = mon.displaySpecies || mon.formSpecies || mon.species || '';
  if (!chosen) return '';
  if (mon?.data?.battleOnly || /-mega/i.test(chosen) || /-primal/i.test(chosen) || /-gmax/i.test(chosen)) {
    return mon.data?.changesFrom || mon.baseSpecies || mon.data?.baseSpecies || chosen;
  }
  return chosen;
}

async function buildShowdownPayloadMon(mon, player, slot) {
  const startSpecies = normalizeShowdownStartSpecies(mon);
  const startSpeciesData = startSpecies ? await getSpeciesData(startSpecies).catch(() => null) : null;
  const battleBaseSpecies = startSpeciesData?.baseSpecies || mon.baseSpecies || mon.data?.baseSpecies || startSpecies || mon.species;
  const startSpriteId = getAutoSpriteIdForSpecies(startSpecies, mon.gender || '', battleBaseSpecies) || mon.spriteAutoId || mon.spriteId || '';
  const megaCandidate = getMegaCandidateForMon(mon);
  const megaSpriteId = megaCandidate?.speciesName
    ? (megaCandidate.assetId || getAutoSpriteIdForSpecies(megaCandidate.speciesName, mon.gender || '', mon.baseSpecies || mon.species || battleBaseSpecies))
    : '';
  return {
    species: startSpecies,
    name: mon.nickname || startSpecies,
    item: mon.item || '',
    ability: mon.ability || '',
    moves: deepClone(mon.moves || []),
    nature: mon.nature || '',
    gender: mon.gender || '',
    level: Number(mon.level || 100),
    shiny: Boolean(mon.shiny),
    happiness: 255,
    evs: deepClone(mon.evs || {hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0}),
    ivs: deepClone(mon.ivs || {hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31}),
    teraType: mon.teraType || startSpeciesData?.types?.[0] || '',
    ui: {
      id: `${player}-${slot}`,
      player,
      slot,
      nickname: mon.nickname || '',
      displaySpecies: mon.displaySpecies || mon.formSpecies || mon.species || startSpecies,
      baseSpecies: mon.baseSpecies || mon.data?.baseSpecies || battleBaseSpecies,
      selectedSpriteId: mon.spriteId || mon.spriteAutoId || startSpriteId,
      startSpriteId,
      megaSpecies: megaCandidate?.speciesName || '',
      megaSpriteId: megaSpriteId || '',
      spriteAutoId: mon.spriteAutoId || startSpriteId,
      shiny: Boolean(mon.shiny),
      item: mon.item || '',
      ability: mon.ability || '',
      nature: mon.nature || '',
      gender: mon.gender || '',
      level: Number(mon.level || 100),
      teraType: mon.teraType || startSpeciesData?.types?.[0] || '',
      evs: deepClone(mon.evs || {hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0}),
      ivs: deepClone(mon.ivs || {hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31}),
      data: {
        name: startSpecies,
        baseSpecies: battleBaseSpecies,
        types: deepClone(startSpeciesData?.types || mon.data?.types || []),
        canGigantamax: mon.data?.canGigantamax || '',
        battleOnly: mon.data?.battleOnly || '',
        changesFrom: mon.data?.changesFrom || '',
      },
    },
  };
}

async function buildShowdownBattlePayload() {
  return {
    mode: 'singles',
    players: await Promise.all([0, 1].map(async player => ({
      name: state.playerNames[player],
      team: await Promise.all(state.teams[player].map((mon, slot) => buildShowdownPayloadMon(mon, player, slot))),
    }))),
  };
}

async function buildBattleMon(mon, player, slot) {
  const stats = calcStats(mon);
  const moveSlots = await Promise.all((mon.moves || []).map(async (moveName) => {
    const move = await getMoveData(moveName).catch(() => null);
    const maxPp = move ? Math.max(1, Math.floor((move.pp || 1) * 8 / 5)) : 1;
    return {name: moveName, pp: maxPp, maxPp};
  }));
  return {
    id: `${player}-${slot}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    player,
    slot,
    species: mon.displaySpecies || mon.formSpecies || mon.species,
    baseSpecies: mon.baseSpecies || mon.data?.baseSpecies || mon.data?.name || mon.species,
    formSpecies: mon.formSpecies || mon.displaySpecies || mon.species,
    nickname: mon.nickname || '',
    gender: mon.gender || '',
    spriteId: mon.spriteId,
    spriteAutoId: mon.spriteAutoId || mon.spriteId,
    shiny: mon.shiny,
    level: mon.level,
    nature: mon.nature,
    evs: deepClone(mon.evs),
    ivs: deepClone(mon.ivs),
    item: mon.item,
    ability: mon.ability,
    teraType: mon.teraType,
    moves: deepClone(mon.moves),
    moveSlots,
    baseMoves: deepClone(mon.moves),
    types: deepClone(mon.data.types),
    originalTypes: deepClone(mon.data.types),
    stats,
    baseMaxHp: stats.hp,
    maxHp: stats.hp,
    hp: stats.hp,
    boosts: {atk:0,def:0,spa:0,spd:0,spe:0},
    status: '',
    sleepTurns: 0,
    toxicCounter: 0,
    protect: false,
    protectCounter: 0,
    usedProtectMoveThisTurn: false,
    choiceLockMove: '',
    choiceLockMoveIndex: null,
    choiceLockSource: '',
    fainted: false,
    terastallized: false,
    teraUsed: false,
    dynamaxed: false,
    dynamaxTurns: 0,
    gigantamaxed: false,
    preDynamaxSpriteId: '',
    megaUsed: isMegaSpeciesName(mon.data?.name || mon.formSpecies || mon.species),
    gmaxMove: mon.data?.canGigantamax || '',
    volatile: {actedThisTurn: false},
    lastMoveUsed: '',
    lastMoveMeta: null,
    lastMoveTurn: 0,
    originalData: mon.data,
  };
}
async function startEngineAuthoritativeSinglesBattle() {
  const payload = await buildShowdownBattlePayload();
  return adoptEngineBattleSnapshot(await startShowdownLocalSinglesBattle(payload));
}
async function startCustomRuntimeBattle() {
  const battle = {
    mode: state.mode,
    turn: 1,
    winner: null,
    players: await Promise.all([0,1].map(async player => ({
      name: state.playerNames[player],
      team: await Promise.all(state.teams[player].map((mon, slot) => buildBattleMon(mon, player, slot))),
      active: state.mode === 'singles' ? [0] : [0,1],
      choices: {},
      mustSwitch: [],
      megaUsed: state.teams[player].some(mon => isMegaSpeciesName(mon.data?.name || mon.formSpecies || mon.species)),
      teraUsed: false,
      zUsed: false,
      dynamaxUsed: false,
      hazards: {stealthRock: false, spikes: 0, toxicSpikes: 0, stickyWeb: false},
      sideConditions: {reflectTurns: 0, lightScreenTurns: 0, auroraVeilTurns: 0, tailwindTurns: 0},
    }))),
    weather: '',
    weatherTurns: 0,
    terrain: '',
    terrainTurns: 0,
    trickRoomTurns: 0,
    log: [{text: '배틀 시작! 양쪽 팀이 전장에 나왔습니다. / Battle started. Both teams enter the field.', tone: 'accent'}],
  };
  state.battle = battle;
  ensureBattleUiState(battle);
  applyStartOfBattleAbilities();
  return battle;
}
function cloneEngineBattleSnapshot(snapshot) {
  if (!snapshot) return null;
  return {
    ...snapshot,
    players: (snapshot.players || []).map(side => ({
      ...side,
      active: Array.isArray(side.active) ? [...side.active] : [],
      team: (side.team || []).map(mon => mon ? {
        ...mon,
        boosts: {...(mon.boosts || {atk: 0, def: 0, spa: 0, spd: 0, spe: 0})},
        volatile: {...(mon.volatile || {})},
        moveSlots: Array.isArray(mon.moveSlots)
          ? mon.moveSlots.map(slot => slot ? {...slot} : slot)
          : [],
      } : mon),
      choices: {},
      mustSwitch: [],
      request: side.request || null,
    })),
    log: Array.isArray(snapshot.log) ? [...snapshot.log] : [],
  };
}
function adoptEngineBattleSnapshot(snapshot) {
  const battle = ensureBattleUiState(cloneEngineBattleSnapshot(snapshot));
  if (!battle) return null;
  clearEnginePendingChoices(battle);
  battle.resolvingTurn = false;
  battle.sourceOfTruth = 'engine';
  return battle;
}
async function startBattle() {
  await renderValidation();
  if (state.builderErrors.length) return;

  if (state.mode === 'singles' && state.showdownLocal?.available) {
    try {
      state.battle = await startEngineAuthoritativeSinglesBattle();
      els.battlePanel.classList.remove('hidden');
      renderBattle();
      return;
    } catch (error) {
      console.error('Local Showdown singles engine failed, falling back to custom runtime.', error);
      showRuntime(
        '로컬 Showdown 싱글 엔진 연결에 실패해 커스텀 런타임으로 되돌립니다. / Failed to use the local Showdown singles engine, falling back to the custom runtime.',
        'error',
        `Engine error: ${error.message}`
      );
    }
  }

  if (state.mode === 'singles' && !state.showdownLocal?.available && state.showdownLocal?.bundledNodeServer) {
    showRuntime(
      '로컬 Showdown 엔진을 사용할 수 없어 커스텀 런타임으로 배틀을 시작합니다. / The local Showdown engine is unavailable, so the battle will start with the custom runtime.',
      'ready',
      buildShowdownStatusNote()
    );
  }

  state.battle = await startCustomRuntimeBattle();
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
          if (target && !target.fainted && getHeldItemId(target) !== 'clearamulet') {
            target.boosts.atk = clamp((target.boosts.atk || 0) - 1, -6, 6);
            addLog(`${mon.species}'s Intimidate lowers ${target.species}'s Attack.`, 'accent');
          }
        });
      }
    }
  }
}
function addLog(text, tone = '') {
  state.battle.log.unshift({text, rawText: text, tone});
}
function describeHazards(side) {
  if (!side?.hazards) return lang('없음', 'None');
  const parts = [];
  if (side.hazards.stealthRock) parts.push('Stealth Rock');
  if (side.hazards.spikes) parts.push(`Spikes ${side.hazards.spikes}`);
  if (side.hazards.toxicSpikes) parts.push(`Toxic Spikes ${side.hazards.toxicSpikes}`);
  if (side.hazards.stickyWeb) parts.push('Sticky Web');
  return parts.length ? parts.join(', ') : lang('없음', 'None');
}
function describeSideConditions(side) {
  if (!side?.sideConditions) return lang('없음', 'None');
  const parts = [];
  if (side.sideConditions.reflectTurns > 0) parts.push(`Reflect ${side.sideConditions.reflectTurns}`);
  if (side.sideConditions.lightScreenTurns > 0) parts.push(`Light Screen ${side.sideConditions.lightScreenTurns}`);
  if (side.sideConditions.auroraVeilTurns > 0) parts.push(`Aurora Veil ${side.sideConditions.auroraVeilTurns}`);
  if (side.sideConditions.tailwindTurns > 0) parts.push(`Tailwind ${side.sideConditions.tailwindTurns}`);
  return parts.length ? parts.join(', ') : lang('없음', 'None');
}
function getSideForPlayer(player) {
  return state.battle?.players?.[player] || null;
}
function getSideForMon(mon) {
  if (!state.battle || mon?.player == null) return null;
  return state.battle.players[mon.player] || null;
}
function getRawDexItem(itemName = '') {
  if (!state.dex || !itemName) return null;
  const item = state.dex.items.get(itemName);
  return item?.exists ? item : null;
}
function getRawDexSpecies(speciesName = '') {
  if (!state.dex || !speciesName) return null;
  const species = state.dex.species.get(speciesName);
  return species?.exists ? species : null;
}
function clearChoiceLock(mon) {
  if (!mon) return;
  mon.choiceLockMove = '';
  mon.choiceLockMoveIndex = null;
  mon.choiceLockSource = '';
}
function clearDisable(mon) {
  if (mon?.volatile?.disable) delete mon.volatile.disable;
}
function isMoveDisabled(mon, moveIndex = null, moveName = '') {
  const disabled = mon?.volatile?.disable;
  if (!disabled || disabled.turns <= 0) return false;
  if (Number.isInteger(moveIndex) && disabled.moveIndex === moveIndex) return true;
  if (moveName && toId(disabled.moveName) === toId(moveName)) return true;
  const slot = Number.isInteger(disabled.moveIndex) ? mon?.moveSlots?.[disabled.moveIndex] : null;
  return Boolean(slot && toId(slot.name) === toId(disabled.moveName) && (!Number.isInteger(moveIndex) || moveIndex === disabled.moveIndex));
}
function syncChoiceLockWithItem(mon) {
  if (!mon) return;
  if (!CHOICE_ITEM_IDS.has(getHeldItemId(mon))) clearChoiceLock(mon);
}
function recordLastMoveUsed(mon, move) {
  if (!mon || !move) return;
  mon.lastMoveUsed = move?.baseMoveName || move?.name || '';
  mon.lastMoveMeta = {
    moveId: toId(move?.baseMoveName || move?.name || move?.id),
    moveName: move?.baseMoveName || move?.name || '',
    usedZ: Boolean(move?.useZ),
    usedMax: Boolean(move?.useMax),
    category: move?.category || '',
  };
  mon.lastMoveTurn = state.battle?.turn || 0;
}
function getChoiceIndexForMon(mon) {
  const side = getSideForMon(mon);
  if (!side || !mon?.id) return -1;
  return side.team.findIndex(member => member?.id === mon.id);
}
function getPendingChoiceForMon(mon) {
  const side = getSideForMon(mon);
  const index = getChoiceIndexForMon(mon);
  if (!side || index < 0) return null;
  return side.choices?.[index] || null;
}
function createEmptyBattleChoice() {
  return {kind:'', move:'', moveIndex:null, target:null, switchTo:null, tera:false, mega:false, z:false, dynamax:false};
}
function ensureBattleUiState(battle = state.battle) {
  if (!battle) return null;
  battle.pendingChoices = battle.pendingChoices || {p1: {}, p2: {}};
  battle.pendingChoices.p1 = battle.pendingChoices.p1 || {};
  battle.pendingChoices.p2 = battle.pendingChoices.p2 || {};
  if (typeof battle.resolvingTurn !== 'boolean') battle.resolvingTurn = false;
  return battle;
}
function getEngineSideId(player) {
  return `p${player + 1}`;
}
function getEngineRequestForPlayer(player, battle = state.battle) {
  return battle?.players?.[player]?.request || null;
}
function getEngineRequestSide(player, battle = state.battle) {
  return getEngineRequestForPlayer(player, battle)?.side || null;
}
function getEngineRequestSideEntries(player, battle = state.battle) {
  const requestSide = getEngineRequestSide(player, battle);
  return Array.isArray(requestSide?.pokemon) ? requestSide.pokemon : [];
}
function isEngineRequestSideEntryFainted(entry) {
  const condition = String(entry?.condition || '').toLowerCase();
  return Boolean(entry?.fainted) || condition.includes(' fnt');
}
function isEngineForceSwitchRequest(request) {
  return Array.isArray(request?.forceSwitch) && request.forceSwitch.some(Boolean);
}
function isEngineActionableRequest(request) {
  if (!request || request.wait || request.teamPreview) return false;
  if (isEngineForceSwitchRequest(request)) return true;
  return Array.isArray(request.active) && request.active.length > 0;
}
function getEngineActionSlots(player, battle = state.battle) {
  const side = battle?.players?.[player];
  const request = side?.request;
  const active = Array.isArray(side?.active) ? side.active : [];
  if (isEngineForceSwitchRequest(request)) {
    return request.forceSwitch
      .map((required, requestSlot) => (required ? (active[requestSlot] ?? requestSlot) : null))
      .filter(slot => Number.isInteger(slot));
  }
  if (Array.isArray(request?.active) && request.active.length) {
    return request.active.map((_, requestSlot) => active[requestSlot] ?? requestSlot);
  }
  return [];
}
function getEnginePendingChoice(player, slot, battle = state.battle) {
  ensureBattleUiState(battle);
  return battle?.pendingChoices?.[getEngineSideId(player)]?.[slot] || null;
}
function setEnginePendingChoice(player, slot, choice, battle = state.battle) {
  ensureBattleUiState(battle);
  battle.pendingChoices[getEngineSideId(player)][slot] = choice;
}
function clearEnginePendingChoice(player, slot, battle = state.battle) {
  if (!battle?.pendingChoices?.[getEngineSideId(player)]) return;
  delete battle.pendingChoices[getEngineSideId(player)][slot];
}
function clearEnginePendingChoicesForPlayer(player, battle = state.battle) {
  if (!battle?.pendingChoices) return;
  battle.pendingChoices[getEngineSideId(player)] = {};
}
function clearEnginePendingChoices(battle = state.battle) {
  if (!battle) return;
  battle.pendingChoices = {p1: {}, p2: {}};
}
function getEngineRequestSlotForActiveIndex(player, activeIndex, battle = state.battle) {
  return getEngineActionSlots(player, battle).indexOf(activeIndex);
}
function getEngineMoveRequest(player, requestSlot = 0, battle = state.battle) {
  const request = getEngineRequestForPlayer(player, battle);
  return Array.isArray(request?.active) ? (request.active[requestSlot] || null) : null;
}
function normalizeEnginePendingChoice(player, slot, battle = state.battle) {
  const rawChoice = getEnginePendingChoice(player, slot, battle);
  if (!rawChoice?.kind) return createEmptyBattleChoice();
  const request = getEngineRequestForPlayer(player, battle);
  const requestSlot = getEngineRequestSlotForActiveIndex(player, slot, battle);
  if (!isEngineActionableRequest(request) || requestSlot < 0) {
    clearEnginePendingChoice(player, slot, battle);
    return createEmptyBattleChoice();
  }

  const switchOptions = getEngineSwitchOptions(player, slot, battle);
  const hasSwitchTarget = Number.isInteger(rawChoice.switchTo) && switchOptions.some(({index}) => index === rawChoice.switchTo);
  if (isEngineForceSwitchRequest(request)) {
    if (!hasSwitchTarget || rawChoice.kind !== 'switch') {
      clearEnginePendingChoice(player, slot, battle);
      return createEmptyBattleChoice();
    }
    const sanitized = {...createEmptyBattleChoice(), kind: 'switch', switchTo: rawChoice.switchTo};
    setEnginePendingChoice(player, slot, sanitized, battle);
    return sanitized;
  }

  if (rawChoice.kind === 'switch') {
    if (!canEngineSwitchNormally(player, requestSlot, battle) || !hasSwitchTarget) {
      clearEnginePendingChoice(player, slot, battle);
      return createEmptyBattleChoice();
    }
    const sanitized = {...createEmptyBattleChoice(), kind: 'switch', switchTo: rawChoice.switchTo};
    setEnginePendingChoice(player, slot, sanitized, battle);
    return sanitized;
  }

  if (rawChoice.kind !== 'move' || !Number.isInteger(rawChoice.moveIndex)) {
    clearEnginePendingChoice(player, slot, battle);
    return createEmptyBattleChoice();
  }

  const moveRequest = getEngineMoveRequest(player, requestSlot, battle);
  const moveInfo = Array.isArray(moveRequest?.moves) ? (moveRequest.moves[rawChoice.moveIndex] || null) : null;
  const zInfo = Array.isArray(moveRequest?.canZMove) ? moveRequest.canZMove[rawChoice.moveIndex] : null;
  const pp = Number.isFinite(moveInfo?.pp) ? moveInfo.pp : 0;
  if (!moveInfo || moveInfo.disabled || pp <= 0) {
    clearEnginePendingChoice(player, slot, battle);
    return createEmptyBattleChoice();
  }

  const sanitized = {
    ...createEmptyBattleChoice(),
    kind: 'move',
    move: moveInfo.move || rawChoice.move || '',
    moveIndex: rawChoice.moveIndex,
    target: null,
    mega: Boolean(rawChoice.mega && moveRequest?.canMegaEvo),
    tera: Boolean(rawChoice.tera && moveRequest?.canTerastallize),
    z: Boolean(rawChoice.z && zInfo),
    dynamax: Boolean(rawChoice.dynamax && moveRequest?.canDynamax),
  };
  if (sanitized.z && sanitized.dynamax) sanitized.dynamax = false;
  setEnginePendingChoice(player, slot, sanitized, battle);
  return sanitized;
}
function getEngineDraftChoice(player, slot, battle = state.battle) {
  return normalizeEnginePendingChoice(player, slot, battle);
}
function canEngineSwitchNormally(player, requestSlot = 0, battle = state.battle) {
  const moveRequest = getEngineMoveRequest(player, requestSlot, battle);
  if (!moveRequest) return false;
  return !moveRequest.trapped && !moveRequest.maybeTrapped;
}
function getEngineSwitchOptions(player, activeIndex, battle = state.battle, {allowLegacyFallback = false} = {}) {
  const side = battle?.players?.[player];
  if (!side) return [];

  const request = getEngineRequestForPlayer(player, battle);
  const requestEntries = getEngineRequestSideEntries(player, battle);
  if (requestEntries.length) {
    return requestEntries
      .map((entry, index) => ({entry, mon: side.team[index], index}))
      .filter(({entry, mon, index}) => (
        mon &&
        index !== activeIndex &&
        !isEngineRequestSideEntryFainted(entry) &&
        !side.active.includes(index)
      ))
      .map(({mon, index}) => ({mon, index}));
  }

  if (isEngineActionableRequest(request) || !allowLegacyFallback) return [];

  return side.team
    .map((mon, index) => ({mon, index}))
    .filter(({mon, index}) => mon && !mon.fainted && !side.active.includes(index) && index !== activeIndex);
}
function pruneEnginePendingChoices(battle = state.battle) {
  if (!isShowdownLocalBattle(battle)) return;
  ensureBattleUiState(battle);
  for (const player of [0, 1]) {
    const request = getEngineRequestForPlayer(player, battle);
    if (!isEngineActionableRequest(request)) {
      clearEnginePendingChoicesForPlayer(player, battle);
      continue;
    }
    const sideId = getEngineSideId(player);
    const actionSlots = new Set(getEngineActionSlots(player, battle));
    const pending = {...(battle.pendingChoices?.[sideId] || {})};
    Object.keys(pending).forEach(rawSlot => {
      const slot = Number(rawSlot);
      if (!Number.isInteger(slot) || !actionSlots.has(slot)) {
        clearEnginePendingChoice(player, slot, battle);
        return;
      }
      normalizeEnginePendingChoice(player, slot, battle);
    });
  }
}
function getEngineChoiceSummary(player, slot, battle = state.battle) {
  const choice = normalizeEnginePendingChoice(player, slot, battle);
  if (!choice?.kind) return lang('대기 중', 'Pending');
  const side = battle?.players?.[player];
  if (choice.kind === 'switch' && Number.isInteger(choice.switchTo)) {
    const target = side?.team?.[choice.switchTo];
    return state.language === 'ko' ? `교체 → ${displaySpeciesName(target?.species || '')}` : `Switch → ${displaySpeciesName(target?.species || '')}`;
  }
  if (choice.kind === 'move') {
    const requestSlot = Math.max(0, getEngineRequestSlotForActiveIndex(player, slot, battle));
    const moveRequest = getEngineMoveRequest(player, requestSlot, battle);
    const zInfo = Array.isArray(moveRequest?.canZMove) ? moveRequest.canZMove[choice.moveIndex] : null;
    let text = choice.z && zInfo?.move ? displayMoveName(zInfo.move) : displayMoveName(choice.move);
    if (choice.mega) text += state.language === 'ko' ? ' · 메가진화' : ' · Mega';
    if (choice.tera) text += state.language === 'ko' ? ' · 테라' : ' · Tera';
    if (choice.z) text += ' · Z';
    if (choice.dynamax) text += state.language === 'ko' ? ' · 다이맥스' : ' · Dynamax';
    return text;
  }
  return lang('대기 중', 'Pending');
}
function getEnginePlayersNeedingAction(battle = state.battle) {
  return [0, 1].filter(player => isEngineActionableRequest(getEngineRequestForPlayer(player, battle)));
}
function canAutoResolveEngineTurn(battle = state.battle) {
  if (!isShowdownLocalBattle(battle) || battle?.winner || battle?.resolvingTurn) return false;
  pruneEnginePendingChoices(battle);
  const players = battle?.players || [];
  if (!players.length) return false;
  let actionableCount = 0;
  for (let player = 0; player < players.length; player += 1) {
    const request = getEngineRequestForPlayer(player, battle);
    if (!request) return false;
    if (!isEngineActionableRequest(request)) continue;
    actionableCount += 1;
    if (!isPlayerReady(player)) return false;
  }
  return actionableCount > 0;
}
function getEngineTurnChipState(player, battle = state.battle) {
  if (battle?.winner) return {done: true, text: lang('배틀 종료', 'Battle finished')};
  const request = getEngineRequestForPlayer(player, battle);
  if (!request) return {done: false, text: lang('요청 대기', 'Awaiting request')};
  if (request.wait) return {done: true, text: lang('대기 중', 'Waiting')};
  if (isEngineForceSwitchRequest(request)) {
    return isPlayerReady(player)
      ? {done: true, text: lang('교체 확정', 'Switch locked')}
      : {done: false, text: lang('교체 선택', 'Choose switch')};
  }
  return isPlayerReady(player)
    ? {done: true, text: lang('선택 완료', 'Choice locked')}
    : {done: false, text: lang('선택 중', 'Selecting')};
}
function renderEngineSinglesChoicePanel(player, container, statusEl, titleEl) {
  const battle = ensureBattleUiState(state.battle);
  pruneEnginePendingChoices(battle);
  const side = battle.players[player];
  const request = side.request;
  titleEl.textContent = state.language === 'ko' ? `${side.name} 행동 선택` : `${side.name} choices`;
  container.innerHTML = '';

  if (battle.winner) {
    statusEl.textContent = lang('배틀이 종료되었습니다.', 'The battle has ended.');
    return;
  }
  if (!request) {
    statusEl.textContent = lang('엔진 요청을 기다리는 중입니다.', 'Waiting for an engine request.');
    return;
  }
  if (request.teamPreview) {
    statusEl.textContent = lang('팀 프리뷰는 시작 시 자동 처리되었습니다.', 'Team preview was resolved automatically at battle start.');
    return;
  }
  if (request.wait) {
    statusEl.textContent = lang('상대의 선택 또는 교체를 기다리는 중입니다.', 'Waiting for the opposing side to finish its choice.');
    const note = document.createElement('div');
    note.className = 'small-note';
    note.textContent = lang('현재 이 플레이어는 입력할 행동이 없습니다.', 'This side has no action to submit right now.');
    container.appendChild(note);
    return;
  }

  const actionSlots = getEngineActionSlots(player, battle);
  statusEl.textContent = isEngineForceSwitchRequest(request)
    ? lang('기절한 포켓몬의 교체 대상을 엔진 요청대로 선택하세요.', 'Choose the forced switch target required by the engine.')
    : lang('이번 턴 행동은 엔진 요청과 현재 스냅샷을 기준으로 선택됩니다.', 'This turn is chosen directly from the engine request and current snapshot.');

  actionSlots.forEach((activeIndex, requestSlot) => {
    const mon = side.team[activeIndex];
    const choice = getEngineDraftChoice(player, activeIndex, battle);
    const section = document.createElement('div');
    section.className = 'choice-section';
    section.innerHTML = `<h4>${displaySpeciesName(mon?.species || 'Pokémon')}</h4>${getBattleBadgeText(mon) ? `<div class="battle-inline-flags">${getBattleBadgeText(mon)}</div>` : ''}`;

    const statusHints = [];
    if (mon?.volatile?.substituteHp > 0) statusHints.push(`대타출동 / Substitute ${mon.volatile.substituteHp} HP`);
    if (mon?.volatile?.confusionTurns > 0) statusHints.push(`혼란 / Confusion ${mon.volatile.confusionTurns}`);
    if (mon?.volatile?.tauntTurns > 0) statusHints.push(`도발 / Taunt ${mon.volatile.tauntTurns}`);
    if (mon?.volatile?.encoreTurns > 0) statusHints.push(`앵콜 / Encore ${mon.volatile.encoreTurns}`);
    if (mon?.volatile?.disable?.turns > 0) statusHints.push(`금지 / Disable → ${displayMoveName(mon.volatile.disable.moveName)} (${mon.volatile.disable.turns})`);
    if (mon?.volatile?.tormentTurns > 0) statusHints.push(`괴롭힘 / Torment ${mon.volatile.tormentTurns}`);
    if (mon?.volatile?.healBlockTurns > 0) statusHints.push(`회복봉인 / Heal Block ${mon.volatile.healBlockTurns}`);
    if (statusHints.length) {
      const forcedNote = document.createElement('div');
      forcedNote.className = 'small-note';
      forcedNote.style.marginTop = '8px';
      forcedNote.textContent = statusHints.join(' · ');
      section.appendChild(forcedNote);
    }

    if (isEngineForceSwitchRequest(request)) {
      const switchWrap = document.createElement('div');
      switchWrap.className = 'choice-buttons';
      getEngineSwitchOptions(player, activeIndex, battle).forEach(({mon: option, index}) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = `choice-btn ${choice.kind === 'switch' && choice.switchTo === index ? 'selected' : ''}`;
        btn.innerHTML = `<strong>${displaySpeciesName(option.species)}</strong><small>HP ${option.hp}/${option.maxHp}</small>`;
        btn.addEventListener('click', () => {
          setEnginePendingChoice(player, activeIndex, {
            ...createEmptyBattleChoice(),
            kind: 'switch',
            switchTo: index,
          }, battle);
          renderBattle();
        });
        switchWrap.appendChild(btn);
      });
      if (!switchWrap.childElementCount) {
        const empty = document.createElement('div');
        empty.className = 'small-note';
        empty.textContent = '교체 가능한 포켓몬이 없습니다. / No switch target is available.';
        section.appendChild(empty);
      } else {
        section.appendChild(switchWrap);
      }
      container.appendChild(section);
      return;
    }

    if (!mon) {
      const note = document.createElement('div');
      note.className = 'small-note';
      note.textContent = '현재 전투 포켓몬 정보가 엔진 스냅샷에 없습니다. / Current active Pokémon data is missing from the engine snapshot.';
      section.appendChild(note);
      container.appendChild(section);
      return;
    }

    if (mon.fainted) {
      const note = document.createElement('div');
      note.className = 'small-note';
      note.textContent = '기절 상태입니다. 엔진이 강제 교체 요청을 보낼 때만 교체를 선택할 수 있습니다. / This Pokémon is fainted. A replacement can only be chosen when the engine sends a force-switch request.';
      section.appendChild(note);
      container.appendChild(section);
      return;
    }

    const moveRequest = getEngineMoveRequest(player, requestSlot, battle);
    if (!moveRequest) {
      const note = document.createElement('div');
      note.className = 'small-note';
      note.textContent = '현재 행동 요청이 없습니다. 엔진의 다음 요청을 기다리는 중입니다. / There is no active move request right now. Waiting for the next engine request.';
      section.appendChild(note);
      container.appendChild(section);
      return;
    }
    const moveButtons = document.createElement('div');
    moveButtons.className = 'choice-buttons';
    (moveRequest?.moves || []).forEach((moveInfo, moveIndex) => {
      const slotInfo = mon.moveSlots?.[moveIndex] || null;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `choice-btn ${choice.kind === 'move' && choice.moveIndex === moveIndex ? 'selected' : ''}`;
      const moveName = moveInfo?.move || slotInfo?.name || '';
      const pp = Number.isFinite(moveInfo?.pp) ? moveInfo.pp : (slotInfo?.pp ?? 0);
      const maxPp = Number.isFinite(moveInfo?.maxpp) ? moveInfo.maxpp : (slotInfo?.maxPp ?? 0);
      const disabled = Boolean(moveInfo?.disabled);
      btn.disabled = disabled || pp <= 0;
      if (btn.disabled) btn.classList.add('disabled');
      btn.innerHTML = `<strong>${displayMoveName(moveName)}</strong><small>불러오는 중… / Loading… · PP ${pp}/${maxPp}${disabled ? ' · 엔진 비활성 / Engine-disabled' : ''}</small>`;
      Promise.resolve(getMoveData(moveName).catch(() => null)).then(moveData => {
        if (!btn.isConnected) return;
        const preview = moveData ? describeMoveForBattle(mon, moveData, choice) : null;
        btn.innerHTML = `<strong>${displayMoveName(moveName)}</strong><small>${displayType(preview?.type || moveData?.type || '')} · ${preview?.category || moveData?.category || '—'}${preview?.power ? ` · ${preview.power} BP` : ''}${preview?.accuracy ? ` · ${preview.accuracy}%` : ''} · PP ${pp}/${maxPp}${disabled ? ' · 엔진 비활성 / Engine-disabled' : ''}</small>`;
      });
      if (!btn.disabled) {
        btn.addEventListener('click', () => {
          const previous = getEngineDraftChoice(player, activeIndex, battle);
          const canZMove = Array.isArray(moveRequest?.canZMove) && Boolean(moveRequest.canZMove[moveIndex]);
          setEnginePendingChoice(player, activeIndex, {
            ...previous,
            kind: 'move',
            move: moveName,
            moveIndex,
            switchTo: null,
            target: null,
            z: previous.z && canZMove,
            mega: previous.mega && Boolean(moveRequest?.canMegaEvo),
            tera: previous.tera && Boolean(moveRequest?.canTerastallize),
            dynamax: previous.dynamax && Boolean(moveRequest?.canDynamax),
          }, battle);
          renderBattle();
        });
      }
      moveButtons.appendChild(btn);
    });
    section.appendChild(moveButtons);

    const toggles = document.createElement('div');
    toggles.className = 'toggle-row';

    if (moveRequest?.canTerastallize) {
      const teraBtn = document.createElement('button');
      teraBtn.type = 'button';
      teraBtn.className = `toggle-pill ${choice.tera ? 'active' : ''}`;
      teraBtn.textContent = `테라스탈 / Terastallize (${displayType(moveRequest.canTerastallize)})`;
      teraBtn.addEventListener('click', () => {
        const previous = getEngineDraftChoice(player, activeIndex, battle);
        setEnginePendingChoice(player, activeIndex, {
          ...previous,
          tera: !previous.tera,
        }, battle);
        renderBattle();
      });
      toggles.appendChild(teraBtn);
    }

    if (moveRequest?.canMegaEvo) {
      const megaBtn = document.createElement('button');
      megaBtn.type = 'button';
      megaBtn.className = `toggle-pill ${choice.mega ? 'active' : ''}`;
      megaBtn.textContent = '메가진화 / Mega Evolution';
      megaBtn.addEventListener('click', () => {
        const previous = getEngineDraftChoice(player, activeIndex, battle);
        setEnginePendingChoice(player, activeIndex, {
          ...previous,
          mega: !previous.mega,
        }, battle);
        renderBattle();
      });
      toggles.appendChild(megaBtn);
    }

    if (moveRequest?.canDynamax) {
      const dynaBtn = document.createElement('button');
      dynaBtn.type = 'button';
      dynaBtn.className = `toggle-pill ${choice.dynamax ? 'active' : ''}`;
      dynaBtn.textContent = '다이맥스 / Dynamax';
      dynaBtn.addEventListener('click', () => {
        const previous = getEngineDraftChoice(player, activeIndex, battle);
        setEnginePendingChoice(player, activeIndex, {
          ...previous,
          dynamax: !previous.dynamax,
          z: previous.z && previous.dynamax ? false : previous.z,
        }, battle);
        renderBattle();
      });
      toggles.appendChild(dynaBtn);
    }

    if (choice.kind === 'move' && Number.isInteger(choice.moveIndex)) {
      const zInfo = Array.isArray(moveRequest?.canZMove) ? moveRequest.canZMove[choice.moveIndex] : null;
      if (zInfo) {
        const zBtn = document.createElement('button');
        zBtn.type = 'button';
        zBtn.className = `toggle-pill ${choice.z ? 'active' : ''}`;
        zBtn.textContent = `Z기술 / Z-Move (${displayMoveName(zInfo.move || 'Z-Move')})`;
        zBtn.addEventListener('click', () => {
          const previous = getEngineDraftChoice(player, activeIndex, battle);
          setEnginePendingChoice(player, activeIndex, {
            ...previous,
            z: !previous.z,
            dynamax: previous.dynamax && previous.z ? false : previous.dynamax,
          }, battle);
          renderBattle();
        });
        toggles.appendChild(zBtn);
      }
    }

    const canSwitch = canEngineSwitchNormally(player, requestSlot, battle) && getEngineSwitchOptions(player, activeIndex, battle).length > 0;
    const switchBtn = document.createElement('button');
    switchBtn.type = 'button';
    switchBtn.className = 'toggle-pill';
    switchBtn.textContent = '교체 / Switch';
    switchBtn.disabled = !canSwitch;
    switchBtn.addEventListener('click', () => {
      const previous = getEngineDraftChoice(player, activeIndex, battle);
      setEnginePendingChoice(player, activeIndex, {
        ...createEmptyBattleChoice(),
        kind: 'switch',
        switchTo: Number.isInteger(previous.switchTo) ? previous.switchTo : null,
      }, battle);
      renderBattle();
    });
    toggles.appendChild(switchBtn);
    section.appendChild(toggles);

    if (choice.kind === 'switch') {
      const switchWrap = document.createElement('div');
      switchWrap.className = 'choice-buttons';
      getEngineSwitchOptions(player, activeIndex, battle).forEach(({mon: option, index}) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = `choice-btn ${choice.switchTo === index ? 'selected' : ''}`;
        btn.innerHTML = `<strong>${displaySpeciesName(option.species)}</strong><small>HP ${option.hp}/${option.maxHp}</small>`;
        btn.addEventListener('click', () => {
          setEnginePendingChoice(player, activeIndex, {
            ...createEmptyBattleChoice(),
            kind: 'switch',
            switchTo: index,
          }, battle);
          renderBattle();
        });
        switchWrap.appendChild(btn);
      });
      section.appendChild(switchWrap);
    }

    container.appendChild(section);
  });
}
function isSpeciesLockedItem(mon, item) {
  if (!mon || !item) return false;
  const itemId = toId(item.id || item.name || item);
  const species = getRawDexSpecies(mon.species) || getRawDexSpecies(mon.formSpecies) || getRawDexSpecies(mon.baseSpecies) || mon.originalData || null;
  const requiredItems = new Set([
    species?.requiredItem,
    ...(species?.requiredItems || []),
    mon?.originalData?.requiredItem,
    ...(mon?.originalData?.requiredItems || []),
  ].filter(Boolean).map(toId));
  if (requiredItems.has(itemId)) return true;
  const baseSpeciesId = toId(mon.baseSpecies || species?.baseSpecies || mon.species);
  if (item.megaStone) return true;
  if (item.zMove) return true;
  if (item.onPlate && baseSpeciesId === 'arceus') return true;
  if (item.onMemory && baseSpeciesId === 'silvally') return true;
  if (item.onDrive && baseSpeciesId === 'genesect') return true;
  if ((itemId === 'griseousorb' || itemId === 'griseouscore') && baseSpeciesId === 'giratina') return true;
  if ((itemId === 'rustedsword' || itemId === 'rustedshield') && ['zacian','zamazenta'].includes(baseSpeciesId)) return true;
  if (itemId.endsWith('mask') && baseSpeciesId === 'ogerpon') return true;
  return false;
}
function canRemoveHeldItem(mon, source = null) {
  if (!mon?.item) return false;
  const item = getRawDexItem(mon.item);
  if (!item) return true;
  if (source && source.id !== mon.id && slugify(mon.ability) === 'stickyhold') return false;
  if (isSpeciesLockedItem(mon, item)) return false;
  return true;
}
function tryRemoveHeldItem(mon, source = null, reason = 'effect') {
  if (!mon?.item) return null;
  if (!canRemoveHeldItem(mon, source)) {
    if (source && source.id !== mon.id && slugify(mon.ability) === 'stickyhold') {
      addLog(`${displaySpeciesName(mon.species)}의 점착 / Sticky Hold 때문에 도구를 빼앗을 수 없었다. / ${mon.species}'s Sticky Hold kept its item from being removed.`);
    }
    return null;
  }
  const removedItem = mon.item;
  mon.item = '';
  syncChoiceLockWithItem(mon);
  return removedItem;
}
function trySetHeldItem(mon, itemName = '') {
  if (!mon) return false;
  mon.item = itemName || '';
  syncChoiceLockWithItem(mon);
  return true;
}
function hasUsableNonDisabledMove(mon) {
  return Boolean(mon?.moveSlots?.some((slot, index) => slot && slot.pp > 0 && !isMoveDisabled(mon, index, slot.name)));
}
function getActiveMonsForSide(side) {
  return (side?.active || []).map(index => side.team[index]).filter(mon => mon && !mon.fainted);
}
async function isTargetAboutToUseDamagingMove(target) {
  if (!target || target.fainted || target.volatile?.actedThisTurn || target.volatile?.mustRecharge) return false;
  const pendingChoice = getPendingChoiceForMon(target);
  if (!pendingChoice || pendingChoice.kind !== 'move') return false;
  const forcedMove = getForcedMoveChoice(target);
  const resolvedChoice = forcedMove
    ? {...pendingChoice, move: forcedMove.moveName, moveIndex: forcedMove.moveIndex, target: pendingChoice.target}
    : pendingChoice;
  const baseMove = resolvedChoice.moveIndex === -1
    ? STRUGGLE_MOVE
    : await getMoveData(resolvedChoice.move).catch(() => null);
  if (!baseMove) return false;
  if (resolvedChoice.moveIndex !== -1 && isMoveDisabled(target, resolvedChoice.moveIndex, baseMove.name) && !forcedMove) return false;
  const side = getSideForMon(target);
  const runtimeMove = await buildResolvedMove(target, side, resolvedChoice, baseMove);
  return runtimeMove.category !== 'status';
}
function clearSwitchVolatile(mon) {
  if (!mon) return;
  mon.boosts = {atk:0,def:0,spa:0,spd:0,spe:0};
  mon.protect = false;
  mon.protectCounter = 0;
  mon.usedProtectMoveThisTurn = false;
  clearChoiceLock(mon);
  if (mon.status === 'tox') mon.toxicCounter = 1;
  mon.volatile = {
    airBalloonPopped: mon.volatile?.airBalloonPopped || false,
    flashFire: mon.volatile?.flashFire || false,
    usedSitrus: mon.volatile?.usedSitrus || false,
  };
  mon.lastMoveTurn = 0;
  mon.lastMoveUsed = '';
  mon.lastMoveMeta = null;
}
function getForcedMoveChoice(mon) {
  if (!mon || mon.fainted) return null;
  const encore = mon.volatile?.encore;
  if (encore && Number.isInteger(encore.moveIndex) && encore.moveIndex >= 0) {
    const slot = mon.moveSlots?.[encore.moveIndex];
    if (slot && toId(slot.name) === toId(encore.moveName)) {
      return {moveIndex: encore.moveIndex, moveName: slot.name, source: 'encore', hasPp: slot.pp > 0};
    }
  }
  if (mon.choiceLockMove && Number.isInteger(mon.choiceLockMoveIndex) && CHOICE_ITEM_IDS.has(getHeldItemId(mon))) {
    const slot = mon.moveSlots?.[mon.choiceLockMoveIndex];
    if (slot && toId(slot.name) === toId(mon.choiceLockMove)) {
      return {moveIndex: mon.choiceLockMoveIndex, moveName: slot.name, source: 'choice', hasPp: slot.pp > 0};
    }
  }
  if (mon.volatile?.uproarTurns > 0 && Number.isInteger(mon.volatile?.uproarMoveIndex)) {
    const slot = mon.moveSlots?.[mon.volatile.uproarMoveIndex];
    if (slot && toId(slot.name) === toId(mon.volatile.uproarMoveName || 'Uproar')) {
      return {moveIndex: mon.volatile.uproarMoveIndex, moveName: slot.name, source: 'uproar', hasPp: slot.pp > 0};
    }
  }
  return null;
}
function clearSubstitute(mon) {
  if (!mon?.volatile?.substituteHp) return;
  delete mon.volatile.substituteHp;
  addLog(`${displaySpeciesName(mon.species)}의 대타출동 / Substitute가 사라졌다. / ${mon.species}'s substitute faded.`);
}
function renderBattleFieldStatus() {
  if (!els.battleFieldStatus || !state.battle) return;
  const battle = state.battle;
  const parts = [];
  if (battle.weather) parts.push(`${weatherDisplayLabel(battle.weather)} (${battle.weatherTurns})`);
  if (battle.terrain) parts.push(`${terrainDisplayLabel(battle.terrain)} (${battle.terrainTurns})`);
  if (battle.trickRoomTurns > 0) parts.push(lang(`트릭룸 (${battle.trickRoomTurns})`, `Trick Room (${battle.trickRoomTurns})`));
  parts.push(state.language === 'ko' ? `${battle.players[0].name} 함정: ${describeHazards(battle.players[0])}` : `${battle.players[0].name} Hazards: ${describeHazards(battle.players[0])}`);
  parts.push(state.language === 'ko' ? `${battle.players[1].name} 함정: ${describeHazards(battle.players[1])}` : `${battle.players[1].name} Hazards: ${describeHazards(battle.players[1])}`);
  parts.push(state.language === 'ko' ? `${battle.players[0].name} 진영: ${describeSideConditions(battle.players[0])}` : `${battle.players[0].name} Side: ${describeSideConditions(battle.players[0])}`);
  parts.push(state.language === 'ko' ? `${battle.players[1].name} 진영: ${describeSideConditions(battle.players[1])}` : `${battle.players[1].name} Side: ${describeSideConditions(battle.players[1])}`);
  els.battleFieldStatus.textContent = parts.join(' · ');
}
function setBattleWeather(weather, source = null, turns = null) {
  if (!state.battle) return;
  const normalized = toId(weather);
  state.battle.weather = normalized;
  if (!normalized) {
    state.battle.weatherTurns = 0;
    addLog('날씨 효과가 사라졌다. / The weather returned to normal.');
    return;
  }
  const itemId = source ? getHeldItemId(source) : '';
  const baseTurns = turns ?? ((normalized === 'rain' && itemId === 'damprock') || (normalized === 'sun' && itemId === 'heatrock') || (normalized === 'sand' && itemId === 'smoothrock') || (normalized === 'snow' && itemId === 'icyrock') ? 8 : 5);
  state.battle.weatherTurns = baseTurns;
  addLog(`${weatherDisplayLabel(normalized)} 상태가 전장을 덮었다. / ${weatherDisplayLabel(normalized)} took over the field.`, 'accent');
}
function setBattleTerrain(terrain, source = null, turns = null) {
  if (!state.battle) return;
  const normalized = toId(terrain);
  state.battle.terrain = normalized;
  if (!normalized) {
    state.battle.terrainTurns = 0;
    addLog('지형 효과가 사라졌다. / The terrain returned to normal.');
    return;
  }
  const itemId = source ? getHeldItemId(source) : '';
  const baseTurns = turns ?? (itemId === 'terrainextender' ? 8 : 5);
  state.battle.terrainTurns = baseTurns;
  addLog(`${terrainDisplayLabel(normalized)} 상태가 전장을 덮었다. / ${terrainDisplayLabel(normalized)} covered the field.`, 'accent');
}
function getBattleMoveSlot(mon, choice) {
  if (!mon?.moveSlots || !choice || !Number.isInteger(choice.moveIndex) || choice.moveIndex < 0) return null;
  return mon.moveSlots[choice.moveIndex] || null;
}
function hasUsableMoves(mon) {
  return Boolean(mon?.moveSlots?.some(slot => slot && slot.pp > 0));
}
function consumeMovePp(mon, choice) {
  const slot = getBattleMoveSlot(mon, choice);
  if (!slot) return null;
  if (slot.pp <= 0) return null;
  slot.pp = Math.max(0, slot.pp - 1);
  return slot;
}
function clearSideHazards(side) {
  if (!side?.hazards) return;
  side.hazards.stealthRock = false;
  side.hazards.spikes = 0;
  side.hazards.toxicSpikes = 0;
  side.hazards.stickyWeb = false;
}
function applySideConditionMove(player, move) {
  const moveId = toId(move?.baseMoveName || move?.name || move?.id);
  const foeSide = state.battle.players[1 - player];
  if (!foeSide?.hazards) return false;
  if (moveId === 'stealthrock') {
    if (foeSide.hazards.stealthRock) return true;
    foeSide.hazards.stealthRock = true;
    addLog(`${foeSide.name} 진영에 스텔스록 / Stealth Rock이 깔렸다. / Pointed stones float around ${foeSide.name}'s side.`, 'accent');
    return true;
  }
  if (moveId === 'spikes') {
    if (foeSide.hazards.spikes >= 3) return true;
    foeSide.hazards.spikes += 1;
    addLog(`${foeSide.name} 진영에 압정뿌리기 / Spikes가 ${foeSide.hazards.spikes}층 깔렸다. / Spikes were scattered on ${foeSide.name}'s side.`, 'accent');
    return true;
  }
  if (moveId === 'toxicspikes') {
    if (foeSide.hazards.toxicSpikes >= 2) return true;
    foeSide.hazards.toxicSpikes += 1;
    addLog(`${foeSide.name} 진영에 독압정 / Toxic Spikes가 ${foeSide.hazards.toxicSpikes}층 깔렸다. / Toxic Spikes were scattered on ${foeSide.name}'s side.`, 'accent');
    return true;
  }
  if (moveId === 'stickyweb') {
    if (foeSide.hazards.stickyWeb) return true;
    foeSide.hazards.stickyWeb = true;
    addLog(`${foeSide.name} 진영에 끈적끈적네트 / Sticky Web이 깔렸다. / A Sticky Web was laid out on ${foeSide.name}'s side.`, 'accent');
    return true;
  }
  return false;
}
function applyEntryHazards(player, mon) {
  if (!state.battle || !mon || mon.fainted) return;
  const side = state.battle.players[player];
  const hazards = side?.hazards;
  if (!hazards) return;
  if (getHeldItemId(mon) === 'heavydutyboots') {
    addLog(`${displaySpeciesName(mon.species)}은(는) 헤비듀티부츠 / Heavy-Duty Boots 덕분에 함정의 영향을 받지 않았다. / ${mon.species} ignored entry hazards with Heavy-Duty Boots.`);
    return;
  }
  const grounded = isGrounded(mon);
  const hpBase = mon.baseMaxHp || mon.maxHp;
  if (hazards.stealthRock) {
    const rockMult = typeEffectiveness('rock', mon);
    const dmg = rockMult === 0 ? 0 : Math.max(1, Math.floor((hpBase / 8) * rockMult));
    if (dmg > 0) {
      mon.hp = Math.max(0, mon.hp - dmg);
      addLog(`${displaySpeciesName(mon.species)}은(는) 스텔스록 / Stealth Rock 때문에 데미지를 입었다. / ${mon.species} was hurt by Stealth Rock.`);
    }
  }
  if (grounded && hazards.spikes > 0) {
    const ratios = {1: 1/8, 2: 1/6, 3: 1/4};
    const dmg = Math.max(1, Math.floor(hpBase * (ratios[hazards.spikes] || 1/4)));
    mon.hp = Math.max(0, mon.hp - dmg);
    addLog(`${displaySpeciesName(mon.species)}은(는) 압정뿌리기 / Spikes 때문에 데미지를 입었다. / ${mon.species} was hurt by Spikes.`);
  }
  if (grounded && hazards.toxicSpikes > 0) {
    if (mon.types.includes('poison')) {
      hazards.toxicSpikes = 0;
      addLog(`${displaySpeciesName(mon.species)}이(가) 독압정 / Toxic Spikes를 흡수했다. / ${mon.species} absorbed the Toxic Spikes.`, 'accent');
    } else if (!mon.types.includes('steel')) {
      applyAilment(mon, hazards.toxicSpikes >= 2 ? 'bad-poison' : 'poison', 100);
    }
  }
  if (grounded && hazards.stickyWeb) {
    applyBoost(mon, 'spe', -1, `${displaySpeciesName(mon.species)}의 스피드가 끈적끈적네트 / Sticky Web 때문에 떨어졌다. / ${mon.species}'s Speed fell due to Sticky Web.`);
  }
  if (mon.hp <= 0) {
    mon.hp = 0;
    mon.fainted = true;
    addLog(`${displaySpeciesName(mon.species)}은(는) 함정 때문에 쓰러졌다. / ${mon.species} fainted from entry hazards.`, 'win');
  }
}
function handleSuccessfulHitUtilities(user, targets, move) {
  const moveId = toId(move?.baseMoveName || move?.name || move?.id);
  const player = user?.player ?? 0;
  if (moveId === 'rapidspin' && targets.length) {
    clearSideHazards(state.battle.players[player]);
    applyBoost(user, 'spe', 1, `${displaySpeciesName(user.species)}의 스피드가 올랐다. / ${user.species}'s Speed rose.`);
    addLog(`${displaySpeciesName(user.species)}은(는) 자신의 필드 함정을 제거했다. / ${user.species} cleared away hazards from its side.`);
  }
  if (moveId === 'defog') {
    clearSideHazards(state.battle.players[0]);
    clearSideHazards(state.battle.players[1]);
    ['reflectTurns','lightScreenTurns','auroraVeilTurns'].forEach(key => {
      state.battle.players[0].sideConditions[key] = 0;
      state.battle.players[1].sideConditions[key] = 0;
    });
    if (state.battle.terrain) {
      state.battle.terrain = '';
      state.battle.terrainTurns = 0;
      addLog('디포그 / Defog로 지형 효과도 사라졌다. / Defog also cleared the terrain.');
    }
    addLog('디포그 / Defog로 양쪽 필드의 함정과 장막이 정리되었다. / Defog cleared hazards and screens from both sides.');
  }
  if (move.forceSwitch && targets.length && state.mode === 'singles') {
    const target = targets[0];
    const foeSide = state.battle.players[target.player];
    const replacement = switchOptionsFor(target.player, true)[0];
    if (replacement) {
      const currentIndex = foeSide.active[0];
      performSwitch(target.player, currentIndex, replacement.index);
    }
  }
}
function applyMoveSelfEffects(user, move) {
  if (move?.selfVolatileStatus === 'mustrecharge' && user && !user.fainted && user.hp > 0) {
    user.volatile = user.volatile || {};
    user.volatile.mustRecharge = true;
  }
  if (user && !user.fainted && user.hp > 0) {
    const moveId = toId(move?.baseMoveName || move?.name || move?.id);
    if (moveId === 'uproar' && !user.volatile.uproarTurns) {
      const slotIndex = user.moveSlots?.findIndex(slot => slot && toId(slot.name) === toId(move.baseMoveName || move.name)) ?? -1;
      user.volatile.uproarTurns = 3;
      user.volatile.uproarMoveName = move.baseMoveName || move.name;
      user.volatile.uproarMoveIndex = slotIndex;
    }
    if (moveId === 'destinybond') user.volatile.destinyBond = true;
    if (moveId === 'grudge') user.volatile.grudge = true;
  }
  const boosts = move?.selfBoosts || {};
  const statMap = {attack:'atk', defense:'def', 'special-attack':'spa', 'special-defense':'spd', speed:'spe'};
  for (const [rawStat, amount] of Object.entries(boosts)) {
    const stat = statMap[rawStat] || statMap[slugify(rawStat)] || rawStat;
    if (!(stat in (user?.boosts || {}))) continue;
    user.boosts[stat] = clamp((user.boosts[stat] || 0) + amount, -6, 6);
    addLog(`${displaySpeciesName(user.species)}의 ${statLabels[stat] || stat}이(가) ${amount > 0 ? '올랐다' : '떨어졌다'}. / ${user.species}'s ${stat.toUpperCase()} ${amount > 0 ? 'rose' : 'fell'}.`);
  }
  if (move?.selfAilment) applyAilment(user, move.selfAilment, 100);
}
function afterMoveResolution(user, hitTargets, move, totalDamage) {
  const moveId = toId(move?.baseMoveName || move?.name || move?.id);
  recordLastMoveUsed(user, move);
  applyMoveSelfEffects(user, move);
  if (move.category === 'status') return;
  if (hitTargets.length) {
    if (move.weather) {
      const weatherMap = {raindance: 'rain', sunnyday: 'sun', sandstorm: 'sand', snowscape: 'snow'};
      setBattleWeather(weatherMap[moveId] || move.weather, user);
    }
    if (move.terrain) {
      const terrainMap = {electricterrain: 'electricterrain', grassyterrain: 'grassyterrain', mistyterrain: 'mistyterrain', psychicterrain: 'psychicterrain'};
      setBattleTerrain(terrainMap[moveId] || move.terrain, user);
    }
    if (move.useMax) {
      const moveType = toId(move.type);
      if (moveType === 'fire') setBattleWeather('sun', user, 5);
      if (moveType === 'water') setBattleWeather('rain', user, 5);
      if (moveType === 'rock') setBattleWeather('sand', user, 5);
      if (moveType === 'ice') setBattleWeather('snow', user, 5);
      if (moveType === 'electric') setBattleTerrain('electricterrain', user, 5);
      if (moveType === 'grass') setBattleTerrain('grassyterrain', user, 5);
      if (moveType === 'psychic') setBattleTerrain('psychicterrain', user, 5);
      if (moveType === 'fairy') setBattleTerrain('mistyterrain', user, 5);
    }
    applySideConditionMove(user.player, move);
    handleSuccessfulHitUtilities(user, hitTargets, move);
  }
  if (getHeldItemId(user) === 'shellbell' && totalDamage > 0 && !user.fainted) {
    const heal = Math.max(1, Math.floor(totalDamage / 8));
    user.hp = Math.min(user.maxHp, user.hp + heal);
    addLog(`${displaySpeciesName(user.species)}은(는) 조개껍질방울 / Shell Bell로 HP를 회복했다. / ${user.species} restored HP with Shell Bell.`);
  }
  if (moveId === 'struggle') {
    const recoil = Math.max(1, Math.floor((user.baseMaxHp || user.maxHp) / 4));
    user.hp = Math.max(0, user.hp - recoil);
    addLog(`${displaySpeciesName(user.species)}은(는) 발버둥 / Struggle 반동을 받았다. / ${user.species} was damaged by recoil from Struggle.`);
  } else if (move.recoil && totalDamage > 0) {
    const recoil = Math.max(1, Math.floor(totalDamage * (move.recoil / 100)));
    user.hp = Math.max(0, user.hp - recoil);
    addLog(`${displaySpeciesName(user.species)}은(는) 반동 데미지를 입었다. / ${user.species} was hit by recoil.`);
  }
  if (user.hp <= 0) {
    user.hp = 0;
    user.fainted = true;
    addLog(`${displaySpeciesName(user.species)}은(는) 쓰러졌다. / ${user.species} fainted.`, 'win');
  }
}
function getActiveMons(player) {
  const side = state.battle.players[player];
  return side.active.map(idx => side.team[idx]).filter(Boolean);
}
function getBattleBadgeText(mon) {
  if (!mon) return '';
  const parts = [];
  if (mon.megaUsed || /-mega/i.test(mon.species || '')) parts.push(lang('메가', 'Mega'));
  if (mon.terastallized) parts.push(lang(`테라 ${displayType(mon.teraType || '')}`, `Tera ${displayType(mon.teraType || '')}`));
  if (mon.dynamaxed) parts.push(mon.gigantamaxed ? lang('거다이맥스', 'G-Max') : lang('다이맥스', 'Dynamax'));
  if (parts.length) return parts.join(' · ');
  return '';
}

function renderBattle() {
  const battle = ensureBattleUiState(state.battle);
  if (!battle) return;
  if (isShowdownLocalBattle(battle)) pruneEnginePendingChoices(battle);
  els.turnNumber.textContent = battle.turn;
  els.battleP1Name.textContent = battle.players[0].name;
  els.battleP2Name.textContent = battle.players[1].name;
  renderSideSprites(0, els.battleSideP1, 'back');
  renderSideSprites(1, els.battleSideP2, 'front');
  renderBattleTeam(0, els.battleTeamP1);
  renderBattleTeam(1, els.battleTeamP2);
  renderChoicePanel(0, els.choiceP1, els.choiceP1Status, els.choiceP1Title);
  renderChoicePanel(1, els.choiceP2, els.choiceP2Status, els.choiceP2Title);
  els.battleLog.innerHTML = battle.log.map(line => `<div class="log-line ${line.tone || ''}">${localizeText(line.rawText || line.text)}</div>`).join('');
  renderPendingChoices();
  renderBattleFieldStatus();
  const allSet = isShowdownLocalBattle(battle)
    ? canAutoResolveEngineTurn(battle)
    : [0,1].every(player => isPlayerReady(player));
  const p1Chip = isShowdownLocalBattle(battle)
    ? getEngineTurnChipState(0, battle)
    : {done: isPlayerReady(0), text: isPlayerReady(0) ? lang('선택 완료', 'Choice locked') : lang('선택 중', 'Selecting')};
  const p2Chip = isShowdownLocalBattle(battle)
    ? getEngineTurnChipState(1, battle)
    : {done: isPlayerReady(1), text: isPlayerReady(1) ? lang('선택 완료', 'Choice locked') : lang('선택 중', 'Selecting')};
  els.battleP1Turn.className = `turn-chip ${p1Chip.done ? 'done' : 'wait'}`;
  els.battleP2Turn.className = `turn-chip ${p2Chip.done ? 'done' : 'wait'}`;
  els.battleP1Turn.textContent = p1Chip.text;
  els.battleP2Turn.textContent = p2Chip.text;
  if (allSet && !battle.winner && !battle.resolvingTurn) resolveTurn();
}

function renderSideSprites(player, container, facing) {
  container.innerHTML = '';
  getActiveMons(player).forEach(mon => {
    const shell = document.createElement('div');
    shell.className = `battle-sprite-shell ${mon?.dynamaxed ? 'dynamaxed' : ''}`;
    if (mon?.gigantamaxed) shell.classList.add('gigantamaxed');
    const holder = document.createElement('div');
    shell.appendChild(holder);
    const badgeText = getBattleBadgeText(mon);
    if (badgeText) {
      const badge = document.createElement('div');
      badge.className = 'battle-gimmick-badge';
      badge.textContent = badgeText;
      shell.appendChild(badge);
    }
    container.appendChild(shell);
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
      ${getBattleBadgeText(mon) ? `<div class="battle-inline-flags">${getBattleBadgeText(mon)}</div>` : ''}
      <div class="hp-bar"><div class="hp-fill ${hpFillClass(mon)}" style="width:${hpPercent(mon)}%"></div></div>
      <div class="mon-sub">HP ${mon.hp}/${mon.maxHp}${side.active.includes(index) ? ' · 전투 중 / Active' : ''}${mon.fainted ? ' · 기절 / Fainted' : ''}${mon.dynamaxed ? ` · ${mon.dynamaxTurns}턴 / ${mon.dynamaxTurns} turns` : ''}${mon.volatile?.substituteHp ? ` · 대타 ${mon.volatile.substituteHp} / Sub ${mon.volatile.substituteHp}` : ''}</div>`;
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
    if (!side.choices[activeIndex]) side.choices[activeIndex] = {kind:'', move:'', moveIndex:null, target:null, switchTo:null, tera:false, mega:false, z:false, dynamax:false};
  });
}
function renderChoicePanel(player, container, statusEl, titleEl) {
  if (isShowdownLocalBattle(state.battle)) {
    renderEngineSinglesChoicePanel(player, container, statusEl, titleEl);
    return;
  }
  const side = state.battle.players[player];
  ensureChoiceObjects(player);
  titleEl.textContent = `${side.name} 선택 / Choice`;
  container.innerHTML = '';
  const mustSwitchCount = side.active.filter(index => side.team[index]?.fainted).length;
  statusEl.textContent = mustSwitchCount
    ? '기절한 전투 포켓몬의 교체 대상을 선택하세요. / Choose replacements for fainted active Pokémon.'
    : `행동 가능한 전투 포켓몬 ${side.active.length}마리 준비 완료. / ${side.active.length} active Pokémon ready to act.`;

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
          side.choices[activeIndex] = {kind:'switch', switchTo:index, moveIndex:null, target:null, tera:false, mega:false, z:false, dynamax:false};
          renderBattle();
        });
        switchWrap.appendChild(btn);
      });
      section.appendChild(switchWrap);
      container.appendChild(section);
      continue;
    }

    const choice = side.choices[activeIndex];
    if (choice.z && choice.dynamax) choice.dynamax = false;
    section.innerHTML = `<h4>${displaySpeciesName(mon.species)}</h4>${getBattleBadgeText(mon) ? `<div class="battle-inline-flags">${getBattleBadgeText(mon)}</div>` : ''}`;

    const moveButtons = document.createElement('div');
    moveButtons.className = 'choice-buttons';
    const forcedMove = getForcedMoveChoice(mon);
    const lockedOutToStruggle = Boolean(forcedMove && (forcedMove.hasPp === false || isMoveDisabled(mon, forcedMove.moveIndex, forcedMove.moveName)));
    const usableMoveCount = mon.moveSlots?.filter((slot, index) => slot && slot.pp > 0 && !isMoveDisabled(mon, index, slot.name) && !isMoveBlockedByTorment(mon, index, slot.name)).length || 0;
    const statusHints = [];
    if (mon.volatile?.tauntTurns > 0) statusHints.push(`도발 / Taunt ${mon.volatile.tauntTurns}`);
    if (mon.volatile?.substituteHp > 0) statusHints.push(`대타출동 / Substitute ${mon.volatile.substituteHp} HP`);
    if (mon.volatile?.confusionTurns > 0) statusHints.push(`혼란 / Confusion ${mon.volatile.confusionTurns}`);
    if (mon.volatile?.tormentTurns > 0) statusHints.push(`괴롭힘 / Torment ${mon.volatile.tormentTurns}`);
    if (mon.volatile?.healBlockTurns > 0) statusHints.push(`회복봉인 / Heal Block ${mon.volatile.healBlockTurns}`);
    if (mon.volatile?.embargoTurns > 0) statusHints.push(`금제 / Embargo ${mon.volatile.embargoTurns}`);
    if (mon.volatile?.yawnTurns > 0) statusHints.push(`하품 / Yawn ${mon.volatile.yawnTurns}`);
    if (mon.volatile?.leechSeeded) statusHints.push(`씨뿌리기 / Leech Seed`);
    if (mon.volatile?.magnetRiseTurns > 0) statusHints.push(`전자부유 / Magnet Rise ${mon.volatile.magnetRiseTurns}`);
    if (mon.volatile?.aquaRing) statusHints.push(`아쿠아링 / Aqua Ring`);
    if (mon.volatile?.ingrain) statusHints.push(`뿌리박기 / Ingrain`);
    if (mon.volatile?.nightmare) statusHints.push(`악몽 / Nightmare`);
    if (mon.volatile?.perishSongTurns > 0) statusHints.push(`멸망의노래 / Perish Song ${mon.volatile.perishSongTurns - 1}`);
    if (mon.volatile?.stockpileLayers > 0) statusHints.push(`비축하기 / Stockpile ${mon.volatile.stockpileLayers}`);
    if (mon.volatile?.uproarTurns > 0) statusHints.push(`소란 / Uproar ${mon.volatile.uproarTurns}`);
    if (mon.volatile?.destinyBond) statusHints.push(`길동무 / Destiny Bond`);
    if (mon.volatile?.grudge) statusHints.push(`원한 / Grudge`);
    if (mon.volatile?.disable?.turns > 0) statusHints.push(`금지 / Disable → ${displayMoveName(mon.volatile.disable.moveName)} (${mon.volatile.disable.turns})`);
    if (forcedMove?.source === 'encore') statusHints.push(`앵콜 / Encore → ${displayMoveName(forcedMove.moveName)}`);
    if (forcedMove?.source === 'choice') statusHints.push(`구애 잠금 / Choice lock → ${displayMoveName(forcedMove.moveName)}`);
    if (statusHints.length) {
      const forcedNote = document.createElement('div');
      forcedNote.className = 'small-note';
      forcedNote.style.marginTop = '8px';
      forcedNote.textContent = statusHints.join(' · ');
      section.appendChild(forcedNote);
    }
    (mon.moveSlots || []).forEach(async (slot, moveIndex) => {
      const moveName = slot?.name;
      if (!moveName) return;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `choice-btn ${choice.kind === 'move' && choice.moveIndex === moveIndex ? 'selected' : ''}`;
      btn.disabled = slot.pp <= 0;
      if (slot.pp <= 0) btn.classList.add('disabled');
      btn.innerHTML = `<strong>${displayMoveName(moveName)}</strong><small>기술 데이터를 불러오는 중… / Loading move data…</small>`;
      moveButtons.appendChild(btn);
      try {
        const move = await getMoveData(moveName);
        const preview = previewMoveForUi(mon, move);
        const taunted = mon.volatile?.tauntTurns > 0 && (preview?.category || move.category) === 'status';
        const avBlocked = getHeldItemId(mon) === 'assaultvest' && (preview?.category || move.category) === 'status';
        const tormentBlocked = isMoveBlockedByTorment(mon, moveIndex, move.name);
        const healBlocked = isMoveBlockedByHealBlock(mon, preview || move);
        const forcedLocked = forcedMove && forcedMove.moveIndex !== moveIndex;
        const disabledMove = isMoveDisabled(mon, moveIndex, move.name);
        btn.innerHTML = `<strong>${displayMoveName(preview?.name || move.name)}</strong><small>${displayType(preview?.type || move.type)} · ${preview?.category || move.category}${preview?.power ? ` · ${preview.power} BP` : ''}${preview?.accuracy ? ` · ${preview.accuracy}%` : ''} · PP ${slot.pp}/${slot.maxPp}${taunted ? ' · 도발 봉인 / Taunt' : ''}${avBlocked ? ' · AV 봉인 / Assault Vest' : ''}${disabledMove ? ' · 금지 / Disable' : ''}${tormentBlocked ? ' · 괴롭힘 / Torment' : ''}${healBlocked ? ' · 회복봉인 / Heal Block' : ''}${forcedLocked ? ' · 잠김 / Locked' : ''}</small>`;
        if (taunted || avBlocked || disabledMove || tormentBlocked || healBlocked || forcedLocked) {
          btn.disabled = true;
          btn.classList.add('disabled');
        }
        if (!btn.disabled) {
          btn.addEventListener('click', () => {
            side.choices[activeIndex] = {
              kind:'move',
              move: move.name,
              moveIndex,
              target: null,
              switchTo:null,
              tera: choice.tera || false,
              mega: choice.mega || false,
              z: choice.z || false,
              dynamax: choice.dynamax || false,
            };
            renderBattle();
          });
        }
      } catch (error) {
        btn.innerHTML = `<strong>${displayMoveName(moveName)}</strong><small>불러올 수 없음 / Unavailable · PP ${slot.pp}/${slot.maxPp}</small>`;
      }
    });
    if (!usableMoveCount || lockedOutToStruggle) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `choice-btn ${choice.kind === 'move' && choice.moveIndex === -1 ? 'selected' : ''}`;
      btn.innerHTML = `<strong>발버둥 / Struggle</strong><small>${lockedOutToStruggle ? '잠긴 기술의 PP가 없어 자동 해금 / Unlocked because the locked move is out of PP' : '남은 PP가 없어 자동 해금 / Unlocked because no PP remains'}</small>`;
      btn.addEventListener('click', () => {
        side.choices[activeIndex] = {
          kind: 'move',
          move: STRUGGLE_MOVE.name,
          moveIndex: -1,
          target: null,
          switchTo: null,
          tera: false,
          mega: false,
          z: false,
          dynamax: false,
        };
        renderBattle();
      });
      moveButtons.appendChild(btn);
    }
    section.appendChild(moveButtons);

    const toggles = document.createElement('div');
    toggles.className = 'toggle-row';

    const teraBtn = document.createElement('button');
    teraBtn.type = 'button';
    teraBtn.className = `toggle-pill ${choice.tera ? 'active' : ''}`;
    teraBtn.textContent = `테라스탈 / Terastallize (${displayType(mon.teraType)})`;
    teraBtn.disabled = mon.teraUsed || (side.teraUsed && !choice.tera);
    teraBtn.addEventListener('click', () => {
      choice.tera = !choice.tera;
      renderBattle();
    });
    toggles.appendChild(teraBtn);

    const megaOption = getMegaCandidateForMon(mon);
    if (megaOption && !mon.megaUsed) {
      const megaBtn = document.createElement('button');
      megaBtn.type = 'button';
      megaBtn.className = `toggle-pill ${choice.mega ? 'active' : ''}`;
      megaBtn.textContent = '메가진화 / Mega Evolution';
      megaBtn.disabled = Boolean(side.megaUsed) && !choice.mega;
      megaBtn.addEventListener('click', () => {
        choice.mega = !choice.mega;
        if (choice.mega) choice.z = false;
        renderBattle();
      });
      toggles.appendChild(megaBtn);
    }

    if (mon.dynamaxed) {
      const dynaState = document.createElement('span');
      dynaState.className = 'toggle-pill active';
      dynaState.textContent = `다이맥스 유지 중 / Dynamax (${mon.dynamaxTurns})`;
      toggles.appendChild(dynaState);
    } else if (canDynamax(mon, side)) {
      const dynaBtn = document.createElement('button');
      dynaBtn.type = 'button';
      dynaBtn.className = `toggle-pill ${choice.dynamax ? 'active' : ''}`;
      dynaBtn.textContent = '다이맥스 / Dynamax';
      dynaBtn.addEventListener('click', () => {
        choice.dynamax = !choice.dynamax;
        if (choice.dynamax) choice.z = false;
        renderBattle();
      });
      toggles.appendChild(dynaBtn);
    }

    if (choice.kind === 'move' && choice.move && choice.moveIndex !== -1) {
      const zBtn = document.createElement('button');
      zBtn.type = 'button';
      zBtn.className = `toggle-pill ${choice.z ? 'active' : ''}`;
      zBtn.textContent = 'Z기술 / Z-Move';
      zBtn.disabled = true;
      toggles.appendChild(zBtn);
      Promise.all([getMoveData(choice.move), getItemData(mon.item).catch(() => null)]).then(([move, item]) => {
        if (!container.isConnected || !zBtn.isConnected) return;
        const valid = item && canUseZMoveWithMove(mon, side, move, item);
        if (!valid) {
          zBtn.remove();
          if (choice.z) {
            choice.z = false;
            renderBattle();
          }
          return;
        }
        const zName = typeof item.zMove === 'string' ? item.zMove : (move.category === 'status' ? `Z-${move.name}` : (GENERIC_Z_MOVE_NAMES[getBattleMoveType(mon, move)] || 'Z-Move'));
        zBtn.disabled = Boolean(side.zUsed) && !choice.z;
        zBtn.className = `toggle-pill ${choice.z ? 'active' : ''}`;
        zBtn.textContent = `Z기술 / Z-Move (${displayMoveName(zName)})`;
        zBtn.onclick = () => {
          choice.z = !choice.z;
          if (choice.z) choice.dynamax = false;
          renderBattle();
        };
      });
    }

    const switchBtn = document.createElement('button');
    switchBtn.type = 'button';
    switchBtn.className = 'toggle-pill';
    switchBtn.textContent = '교체 / Switch';
    switchBtn.addEventListener('click', () => {
      side.choices[activeIndex] = {kind:'switch', switchTo:null, moveIndex:null, target:null, tera:false, mega:false, z:false, dynamax:false};
      renderBattle();
    });
    toggles.appendChild(switchBtn);
    section.appendChild(toggles);

    if (choice.kind === 'move' && choice.move) {
      const helper = document.createElement('div');
      helper.className = 'small-note';
      helper.style.marginTop = '10px';
      helper.textContent = lang('기술 선택됨.', 'Move selected.');
      section.appendChild(helper);
      Promise.resolve(choice.moveIndex === -1 ? STRUGGLE_MOVE : getMoveData(choice.move)).then(move => {
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
          side.choices[activeIndex] = {kind:'switch', switchTo:index, moveIndex:null, target:null, tera:false, mega:false, z:false, dynamax:false};
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
  if (isShowdownLocalBattle(state.battle)) {
    pruneEnginePendingChoices(state.battle);
    const request = getEngineRequestForPlayer(player);
    if (!isEngineActionableRequest(request)) return true;
    const choice = normalizeEnginePendingChoice(player, activeIndex);
    if (!choice?.kind) return false;
    if (isEngineForceSwitchRequest(request)) return choice.kind === 'switch' && Number.isInteger(choice.switchTo);
    if (choice.kind === 'switch') return Number.isInteger(choice.switchTo);
    if (choice.kind === 'move') return Number.isInteger(choice.moveIndex);
    return false;
  }
  const side = state.battle.players[player];
  const mon = side.team[activeIndex];
  const choice = side.choices[activeIndex];
  if (!choice) return false;
  if (!mon || mon.fainted) return choice.kind === 'switch' && Number.isInteger(choice.switchTo);
  if (choice.kind === 'switch') return Number.isInteger(choice.switchTo);
  if (choice.kind === 'move') {
    const move = choice.moveIndex === -1 ? STRUGGLE_MOVE : moveDataCache.get(slugify(choice.move));
    if (!move) return false;
    const options = targetOptionsFor(player, activeIndex, move);
    if (options.length > 1) return Boolean(choice.target);
    return true;
  }
  return false;
}
function isPlayerReady(player) {
  if (isShowdownLocalBattle(state.battle)) {
    const request = getEngineRequestForPlayer(player);
    if (!isEngineActionableRequest(request)) return true;
    return getEngineActionSlots(player).every(activeIndex => isChoiceComplete(player, activeIndex));
  }
  const side = state.battle.players[player];
  return side.active.every(activeIndex => isChoiceComplete(player, activeIndex));
}
function renderPendingChoices() {
  const battle = state.battle;
  if (isShowdownLocalBattle(battle)) {
    pruneEnginePendingChoices(battle);
    const rows = [];
    battle.players.forEach((side, player) => {
      const request = getEngineRequestForPlayer(player, battle);
      if (!request) {
        rows.push(`<div class="pending-card"><strong>${side.name}</strong>${lang('엔진 요청 대기 중', 'Awaiting engine request')}</div>`);
        return;
      }
      if (request.wait) {
        rows.push(`<div class="pending-card"><strong>${side.name}</strong>${lang('상대 행동 대기 중', 'Waiting for the other side')}</div>`);
        return;
      }
      const actionSlots = getEngineActionSlots(player, battle);
      if (!actionSlots.length) {
        rows.push(`<div class="pending-card"><strong>${side.name}</strong>${lang('현재 제출할 행동 없음', 'No action to submit')}</div>`);
        return;
      }
      actionSlots.forEach(activeIndex => {
        const mon = side.team[activeIndex];
        rows.push(`<div class="pending-card"><strong>${mon ? displaySpeciesName(mon.species) : side.name}</strong>${getEngineChoiceSummary(player, activeIndex, battle)}</div>`);
      });
    });
    els.pendingChoices.innerHTML = rows.join('');
    return;
  }
  const rows = [];
  battle.players.forEach((side) => {
    side.active.forEach(activeIndex => {
      const mon = side.team[activeIndex];
      const choice = side.choices[activeIndex];
      let textChoice = lang('대기 중', 'Pending');
      if (choice?.kind === 'switch' && Number.isInteger(choice.switchTo)) textChoice = state.language === 'ko' ? `교체 → ${displaySpeciesName(side.team[choice.switchTo].species)}` : `Switch → ${displaySpeciesName(side.team[choice.switchTo].species)}`;
      if (choice?.kind === 'move') textChoice = choice.target ? `${displayMoveName(choice.move)} → ${displaySpeciesName(battle.players[choice.target.player].team[choice.target.slot].species)}` : displayMoveName(choice.move);
      if (choice?.kind === 'move' && choice?.mega) textChoice += state.language === 'ko' ? ' · 메가진화' : ' · Mega';
      if (choice?.kind === 'move' && choice?.tera) textChoice += state.language === 'ko' ? ' · 테라' : ' · Tera';
      if (choice?.kind === 'move' && choice?.z) textChoice += ' · Z';
      if (choice?.kind === 'move' && choice?.dynamax) textChoice += state.language === 'ko' ? ' · 다이맥스' : ' · Dynamax';
      rows.push(`<div class="pending-card"><strong>${mon ? displaySpeciesName(mon.species) : lang('빈 슬롯', 'Empty slot')}</strong>${textChoice}</div>`);
    });
  });
  els.pendingChoices.innerHTML = rows.join('');
}
async function resolveEngineTurn(battle = state.battle) {
  pruneEnginePendingChoices(battle);
  const nextSnapshot = await submitShowdownLocalSinglesChoices({battleId: battle.id, battle});
  state.battle = adoptEngineBattleSnapshot(nextSnapshot);
}
async function resolveTurn() {
  const battle = ensureBattleUiState(state.battle);
  if (!battle || battle.resolvingTurn) return;
  battle.resolvingTurn = true;
  if (isShowdownLocalBattle(battle)) {
    try {
      await resolveEngineTurn(battle);
      renderBattle();
    } catch (error) {
      console.error('Failed to resolve Showdown-local singles turn', error);
      if (state.battle?.log) {
        state.battle.log.unshift({text: `엔진 턴 처리 실패 / Engine turn resolution failed: ${error.message}`, tone: 'accent'});
      }
      if (battle === state.battle) battle.resolvingTurn = false;
      renderBattle();
    }
    return;
  }

  battle.players.forEach(side => side.team.forEach(mon => {
    if (!mon) return;
    mon.volatile = mon.volatile || {};
    mon.volatile.actedThisTurn = false;
  }));
  const queue = [];
  for (const [player, side] of battle.players.entries()) {
    for (const activeIndex of side.active) {
      const mon = side.team[activeIndex];
      const choice = side.choices[activeIndex];
      if (!choice) continue;
      if (choice.kind === 'switch') {
        queue.push({priority: 100, speed: 0, player, activeIndex, mon, choice});
        continue;
      }
      if (choice.kind !== 'move' || !mon || mon.fainted) continue;
      const move = choice.moveIndex === -1 ? STRUGGLE_MOVE : await getMoveData(choice.move);
      let speed = mon && !mon.fainted ? getModifiedStat(mon, 'spe') : 0;
      if (choice.mega && !mon.megaUsed && !side.megaUsed) {
        const megaCandidate = getMegaCandidateForMon(mon);
        if (megaCandidate) {
          const megaData = await getSpeciesData(megaCandidate.speciesName).catch(() => null);
          const projectedStats = megaData ? calcStatsForSpeciesData(mon, megaData) : null;
          if (projectedStats?.spe) speed = Math.max(1, Math.floor(projectedStats.spe * statStageMultiplier(mon.boosts.spe || 0)));
        }
      }
            let priority = move.priority || 0;
      if (choice.dynamax && move.category === 'status') priority = 4;
      queue.push({priority, speed, player, activeIndex, mon, choice, move});
    }
  }
  queue.sort((a, b) => {
    const priorityDiff = (b.priority || 0) - (a.priority || 0);
    if (priorityDiff) return priorityDiff;
    const speedDiff = (state.battle?.trickRoomTurns > 0)
      ? ((a.speed || 0) - (b.speed || 0))
      : ((b.speed || 0) - (a.speed || 0));
    if (speedDiff) return speedDiff;
    return Math.random() - 0.5;
  });
  for (const action of queue) {
    if (battle.winner) break;
    if (action.mon?.volatile) action.mon.volatile.actedThisTurn = true;
    if (action.choice.kind === 'switch') performSwitch(action.player, action.activeIndex, action.choice.switchTo);
    else if (action.choice.kind === 'move') await performMove(action);
    fillFaintedActives();
    determineWinner();
  }
  endOfTurn();
  determineWinner();
  battle.players.forEach(side => side.choices = {});
  battle.turn += 1;
  battle.resolvingTurn = false;
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
    if (leaving.dynamaxed) clearDynamax(leaving);
    clearSwitchVolatile(leaving);
  }
  side.active[currentPosition] = targetIndex;
  addLog(`${side.name} 측은 ${leaving ? displaySpeciesName(leaving.species) : '포켓몬 / a Pokémon'}를 회수하고 ${displaySpeciesName(incoming.species)}를 내보냈다. / ${side.name} withdrew ${leaving?.species || 'a Pokémon'} and sent out ${incoming.species}.`, 'accent');
  triggerSwitchInEffects(player, incoming);
}
function triggerSwitchInEffects(player, mon) {
  if (!mon || mon.fainted) return;
  applyEntryHazards(player, mon);
  if (mon.fainted) return;
  if (slugify(mon.ability) === 'intimidate') {
    state.battle.players[1-player].active.forEach(idx => {
      const target = state.battle.players[1-player].team[idx];
      if (target && !target.fainted && getHeldItemId(target) !== 'clearamulet') {
        target.boosts.atk = clamp((target.boosts.atk || 0) - 1, -6, 6);
        addLog(`${displaySpeciesName(mon.species)}의 위협 / Intimidate! ${displaySpeciesName(target.species)}의 공격이 떨어졌다. / ${mon.species}'s Intimidate lowers ${target.species}'s Attack.`, 'accent');
      }
    });
  }
}
function rollHitCount(attacker, move) {
  const moveId = toId(move?.baseMoveName || move?.name || move?.id);
  const minHits = move?.minHits || 1;
  const maxHits = move?.maxHits || 1;
  if (maxHits <= minHits) return Math.max(1, minHits);
  if (getHeldItemId(attacker) === 'loadeddice') {
    if (moveId === 'populationbomb') return 4 + Math.floor(Math.random() * 7);
    if (maxHits === 5 && minHits === 2) return Math.random() < 0.5 ? 4 : 5;
  }
  return minHits + Math.floor(Math.random() * (maxHits - minHits + 1));
}
function applyBoost(target, stat, amount, text) {
  if (!target?.boosts || !(stat in target.boosts)) return;
  target.boosts[stat] = clamp((target.boosts[stat] || 0) + amount, -6, 6);
  if (text) addLog(text);
}
function applyZStatusBonus(user, move) {
  const boosts = move?.zBoosts || {};
  for (const [stat, amount] of Object.entries(boosts)) {
    if (stat in (user?.boosts || {})) user.boosts[stat] = clamp((user.boosts[stat] || 0) + amount, -6, 6);
  }
  if (Object.keys(boosts).length) addLog(`${displaySpeciesName(user.species)}이(가) Z파워로 능력치 보너스를 얻었다. / ${user.species} gained a Z-Power stat bonus.`);
  if (move?.zEffect === 'heal') {
    user.hp = user.maxHp;
    addLog(`${displaySpeciesName(user.species)}의 HP가 가득 회복되었다. / ${user.species} restored all of its HP.`);
  }
  if (move?.zEffect === 'clearnegativeboost') {
    Object.keys(user.boosts).forEach(stat => {
      if (user.boosts[stat] < 0) user.boosts[stat] = 0;
    });
    addLog(`${displaySpeciesName(user.species)}의 낮아진 능력치가 초기화되었다. / ${user.species}'s lowered stats were reset.`);
  }
}
function applyMaxMoveBonus(user, targets, move) {
  const effect = getMaxMoveSecondaryEffect(move?.type);
  if (!effect) return;
  if (effect.kind === 'self-boost') {
    applyBoost(user, effect.stat, effect.amount, `${displaySpeciesName(user.species)}의 ${statLabels[effect.stat] || effect.stat}이(가) 올랐다. / ${user.species}'s ${effect.stat.toUpperCase()} rose.`);
    return;
  }
  for (const target of targets) {
    if (!target || target.fainted) continue;
    applyBoost(target, effect.stat, effect.amount, `${displaySpeciesName(target.species)}의 ${statLabels[effect.stat] || effect.stat}이(가) 떨어졌다. / ${target.species}'s ${effect.stat.toUpperCase()} fell.`);
  }
}
async function buildResolvedMove(mon, side, choice, baseMove) {
  const runtimeMove = {
    ...baseMove,
    baseMoveName: baseMove.name,
    name: baseMove.name,
    type: getBattleMoveType(mon, baseMove) || baseMove.type,
    category: getBattleMoveCategory(mon, baseMove) || baseMove.category,
    power: baseMove.power || 0,
    accuracy: baseMove.accuracy || 100,
    useZ: false,
    useMax: false,
    partialProtect: false,
    bypassAccuracy: false,
  };
  const weather = state.battle?.weather || '';
  const terrain = state.battle?.terrain || '';
  const moveId = toId(baseMove?.baseMoveName || baseMove?.name || baseMove?.id);
  if (moveId === 'weatherball' && weather) {
    const weatherTypes = {sun: 'fire', rain: 'water', sand: 'rock', snow: 'ice'};
    runtimeMove.type = weatherTypes[weather] || runtimeMove.type;
    runtimeMove.power = 100;
  }
  if (moveId === 'terrainpulse' && terrain && isGrounded(mon)) {
    const terrainTypes = {electricterrain: 'electric', grassyterrain: 'grass', mistyterrain: 'fairy', psychicterrain: 'psychic'};
    runtimeMove.type = terrainTypes[terrain] || runtimeMove.type;
    runtimeMove.power = 100;
  }
  if (moveId === 'thunder' || moveId === 'hurricane') {
    if (weather === 'rain') runtimeMove.accuracy = 100;
    if (weather === 'sun') runtimeMove.accuracy = 50;
  }
  if (moveId === 'blizzard' && weather === 'snow') runtimeMove.accuracy = 100;
  if ((moveId === 'solarbeam' || moveId === 'solarblade') && weather && weather !== 'sun') runtimeMove.power = Math.floor(runtimeMove.power / 2);
  if (mon?.terastallized && teraPowerBoostApplies(mon, runtimeMove)) runtimeMove.power = Math.max(runtimeMove.power, 60);
  if (mon?.dynamaxed || choice?.dynamax) {
    runtimeMove.useMax = true;
    runtimeMove.name = getMaxMoveName(mon, baseMove);
    runtimeMove.type = getBattleMoveType(mon, baseMove) || baseMove.type;
    runtimeMove.category = baseMove.category === 'status' ? 'status' : getBattleMoveCategory(mon, baseMove);
    runtimeMove.power = getDefaultMaxMovePower(baseMove);
    runtimeMove.accuracy = 100;
    runtimeMove.priority = baseMove.category === 'status' ? 4 : baseMove.priority;
    runtimeMove.target = baseMove.category === 'status' ? 'self' : baseMove.target;
    runtimeMove.drain = 0;
    runtimeMove.ailment = 'none';
    runtimeMove.ailmentChance = 0;
    runtimeMove.statChanges = [];
    runtimeMove.statChance = 0;
    runtimeMove.minHits = 1;
    runtimeMove.maxHits = 1;
    return runtimeMove;
  }
  if (choice?.z) {
    const item = await getItemData(mon.item).catch(() => null);
    if (item && canUseZMoveWithMove(mon, side, baseMove, item)) {
      runtimeMove.useZ = true;
      runtimeMove.name = typeof item.zMove === 'string' ? item.zMove : (baseMove.category === 'status' ? `Z-${baseMove.name}` : (GENERIC_Z_MOVE_NAMES[runtimeMove.type] || 'Z-Move'));
      runtimeMove.partialProtect = baseMove.category !== 'status';
      runtimeMove.bypassAccuracy = baseMove.category !== 'status';
      if (baseMove.category !== 'status') {
        runtimeMove.power = baseMove.zBasePower || getDefaultZMovePower(baseMove.power || 0);
        runtimeMove.accuracy = 100;
        runtimeMove.drain = 0;
        runtimeMove.ailment = 'none';
        runtimeMove.ailmentChance = 0;
        runtimeMove.statChanges = [];
        runtimeMove.statChance = 0;
        runtimeMove.minHits = 1;
        runtimeMove.maxHits = 1;
      }
    }
  }
  return runtimeMove;
}
async function performMove(action) {
  const {player, mon, choice, move: baseMove} = action;
  if (!mon || mon.fainted) return;
  const side = state.battle.players[player];
  const currentIndex = side.active.find(idx => side.team[idx].id === mon.id) ?? action.activeIndex;
  const currentMon = side.team[currentIndex];
  if (!currentMon || currentMon.fainted) return;
  currentMon.volatile = currentMon.volatile || {};
  currentMon.volatile.actedThisTurn = true;

  const check = canMove(currentMon);
  if (!check.ok) {
    addLog(check.reason);
    return;
  }
  if (check.wake) addLog(`${displaySpeciesName(currentMon.species)}은(는) 잠에서 깼다! / ${currentMon.species} woke up!`);
  if (currentMon.volatile?.confusionTurns > 0) {
    addLog(`${displaySpeciesName(currentMon.species)}은(는) 혼란 상태다. / ${currentMon.species} is confused.`);
    currentMon.volatile.confusionTurns = Math.max(0, currentMon.volatile.confusionTurns - 1);
    if (currentMon.volatile.confusionTurns <= 0) {
      delete currentMon.volatile.confusionTurns;
      addLog(`${displaySpeciesName(currentMon.species)}은(는) 혼란에서 회복했다. / ${currentMon.species} snapped out of confusion.`);
    } else if (Math.random() < (1 / 3)) {
      const selfHit = Math.max(1, Math.floor((currentMon.baseMaxHp || currentMon.maxHp) / 8));
      currentMon.hp = Math.max(0, currentMon.hp - selfHit);
      addLog(`${displaySpeciesName(currentMon.species)}이(가) 혼란으로 자신을 공격했다! / ${currentMon.species} hurt itself in its confusion!`);
      if (currentMon.hp <= 0) {
        currentMon.hp = 0;
        currentMon.fainted = true;
        addLog(`${displaySpeciesName(currentMon.species)}은(는) 쓰러졌다. / ${currentMon.species} fainted.`, 'win');
      }
      return;
    }
  }

  let moveChoice = choice;
  let resolvedBaseMove = baseMove;
  const forcedMove = getForcedMoveChoice(currentMon);
  if (forcedMove && choice.moveIndex !== forcedMove.moveIndex) {
    moveChoice = {...choice, move: forcedMove.moveName, moveIndex: forcedMove.moveIndex, target: choice.target};
    resolvedBaseMove = await getMoveData(forcedMove.moveName).catch(() => STRUGGLE_MOVE);
    const forcedLabel = forcedMove.source === 'encore' ? '앵콜 / Encore' : (forcedMove.source === 'choice' ? '구애 잠금 / Choice lock' : '소란 / Uproar');
    addLog(`${displaySpeciesName(currentMon.species)}은(는) ${forcedLabel} 때문에 ${displayMoveName(forcedMove.moveName)}밖에 쓸 수 없다. / ${currentMon.species} is forced to use ${forcedMove.moveName}.`);
  }
  const moveSlot = getBattleMoveSlot(currentMon, moveChoice);
  if (moveChoice.moveIndex === -1) {
    moveChoice = {...choice, tera:false, mega:false, z:false, dynamax:false};
    resolvedBaseMove = STRUGGLE_MOVE;
  } else if (!moveSlot || moveSlot.pp <= 0) {
    if (hasUsableMoves(currentMon) && !forcedMove) {
      addLog(`${displaySpeciesName(currentMon.species)}의 선택한 기술 PP가 없다. / ${currentMon.species} has no PP left for that move.`);
      return;
    }
    moveChoice = {...choice, move: STRUGGLE_MOVE.name, moveIndex:-1, tera:false, mega:false, z:false, dynamax:false};
    resolvedBaseMove = STRUGGLE_MOVE;
  }

  const selectedDisabledMove = moveChoice.moveIndex !== -1 && isMoveDisabled(currentMon, moveChoice.moveIndex, resolvedBaseMove?.name || moveChoice.move);
  if (selectedDisabledMove) {
    if (forcedMove) {
      moveChoice = {...moveChoice, move: STRUGGLE_MOVE.name, moveIndex: -1, tera: false, mega: false, z: false, dynamax: false};
      resolvedBaseMove = STRUGGLE_MOVE;
    } else {
      addLog(`${displaySpeciesName(currentMon.species)}의 ${displayMoveName(resolvedBaseMove?.name || moveChoice.move)}는 금지 / Disable 상태라 사용할 수 없다. / ${currentMon.species}'s ${resolvedBaseMove?.name || moveChoice.move} is disabled.`);
      return;
    }
  }
  const tormentedMove = moveChoice.moveIndex !== -1 && isMoveBlockedByTorment(currentMon, moveChoice.moveIndex, resolvedBaseMove?.name || moveChoice.move);
  if (tormentedMove) {
    if (forcedMove) {
      moveChoice = {...moveChoice, move: STRUGGLE_MOVE.name, moveIndex: -1, tera: false, mega: false, z: false, dynamax: false};
      resolvedBaseMove = STRUGGLE_MOVE;
    } else {
      addLog(`${displaySpeciesName(currentMon.species)}은(는) 괴롭힘 / Torment 때문에 같은 기술을 연속으로 사용할 수 없다. / ${currentMon.species} can't use the same move twice due to Torment.`);
      return;
    }
  }
  if (moveChoice.moveIndex !== -1 && isMoveBlockedByHealBlock(currentMon, resolvedBaseMove)) {
    addLog(`${displaySpeciesName(currentMon.species)}은(는) 회복봉인 / Heal Block 때문에 그 기술을 사용할 수 없다. / ${currentMon.species} can't use that move because of Heal Block.`);
    return;
  }

  const moveId = toId(resolvedBaseMove?.baseMoveName || resolvedBaseMove?.name || resolvedBaseMove?.id);
  if (currentMon.volatile?.destinyBond && moveId !== 'destinybond') delete currentMon.volatile.destinyBond;
  if (currentMon.volatile?.grudge && moveId !== 'grudge') delete currentMon.volatile.grudge;
  const isProtectMove = PROTECT_MOVE_IDS.has(moveId);
  currentMon.usedProtectMoveThisTurn = isProtectMove;
  if (!isProtectMove) currentMon.protectCounter = 0;

  if (moveChoice.mega && !currentMon.megaUsed && !side.megaUsed) {
    const megaCandidate = getMegaCandidateForMon(currentMon);
    if (megaCandidate) {
      const megaData = await getSpeciesData(megaCandidate.speciesName).catch(() => null);
      if (megaData) {
        const beforeName = currentMon.species;
        applyBattleFormChange(currentMon, megaData, megaCandidate.assetId);
        currentMon.megaUsed = true;
        side.megaUsed = true;
        addLog(`${displaySpeciesName(beforeName)}이(가) 메가진화했다! / ${beforeName} Mega Evolved into ${megaData.name}!`, 'accent');
      }
    }
  }
  if (moveChoice.tera && !currentMon.teraUsed && !side.teraUsed) {
    currentMon.types = [currentMon.teraType];
    currentMon.terastallized = true;
    currentMon.teraUsed = true;
    side.teraUsed = true;
    addLog(`${displaySpeciesName(currentMon.species)}이(가) ${displayType(currentMon.teraType)} 테라스탈했다! / ${currentMon.species} Terastallized into ${titleCase(currentMon.teraType)}-type!`, 'accent');
  }
  if (moveChoice.dynamax && canDynamax(currentMon, side)) {
    applyDynamax(currentMon);
    side.dynamaxUsed = true;
    addLog(`${displaySpeciesName(currentMon.species)}이(가) ${currentMon.gigantamaxed ? '거다이맥스 / Gigantamax' : '다이맥스 / Dynamax'}했다! / ${currentMon.species} ${currentMon.gigantamaxed ? 'Gigantamaxed' : 'Dynamaxed'}!`, 'accent');
  }

  const move = await buildResolvedMove(currentMon, side, moveChoice, resolvedBaseMove);
  if (currentMon.volatile?.tauntTurns > 0 && move.category === 'status') {
    addLog(`${displaySpeciesName(currentMon.species)}은(는) 도발 / Taunt 때문에 변화기를 사용할 수 없다. / ${currentMon.species} can't use status moves due to Taunt.`);
    return;
  }
  if (getHeldItemId(currentMon) === 'assaultvest' && move.category === 'status') {
    addLog(`${displaySpeciesName(currentMon.species)}은(는) 돌격조끼 / Assault Vest 때문에 변화기를 사용할 수 없다. / ${currentMon.species} can't use status moves while holding Assault Vest.`);
    return;
  }
  if (moveId === 'spitup') {
    const stockpileLayers = currentMon.volatile?.stockpileLayers || 0;
    if (!stockpileLayers) {
      addLog('토해내기 / Spit Up가 실패했다. / Spit Up failed.');
      return;
    }
    move.power = 100 * stockpileLayers;
    clearStockpile(currentMon);
  }
  if (move.useZ) side.zUsed = true;
  if (moveChoice.moveIndex !== -1) consumeMovePp(currentMon, moveChoice);
  let targets = resolveTargets(player, currentIndex, moveChoice, move);
  if (!targets.length) {
    recordLastMoveUsed(currentMon, move);
    addLog(`${displaySpeciesName(currentMon.species)}의 ${displayMoveName(move.name)}! 그러나 맞힐 대상이 없었다. / ${currentMon.species} used ${move.name}, but there was no valid target.`);
    return;
  }

  addLog(`${displaySpeciesName(currentMon.species)}의 ${displayMoveName(move.name)}! / ${currentMon.species} used ${move.name}.`, 'accent');
  if (moveId === 'suckerpunch') {
    const target = targets.find(candidate => candidate && !candidate.fainted);
    const willAttack = target ? await isTargetAboutToUseDamagingMove(target) : false;
    if (!willAttack) {
      recordLastMoveUsed(currentMon, move);
      addLog(`기습 / Sucker Punch가 실패했다. / Sucker Punch failed.`);
      return;
    }
  }
  if (!move.useZ && !move.useMax && CHOICE_ITEM_IDS.has(getHeldItemId(currentMon)) && moveChoice.moveIndex >= 0) {
    currentMon.choiceLockMove = resolvedBaseMove.name;
    currentMon.choiceLockMoveIndex = moveChoice.moveIndex;
    currentMon.choiceLockSource = getHeldItemId(currentMon);
  }
  if (isProtectMove) {
    const successRate = currentMon.protectCounter > 0 ? (1 / (3 ** currentMon.protectCounter)) : 1;
    currentMon.protectCounter += 1;
    if (Math.random() < successRate) {
      currentMon.protect = true;
      addLog(`${displaySpeciesName(currentMon.species)}은(는) 이번 턴 보호 상태다. / ${currentMon.species} is protected this turn.`);
      if (move.useZ && move.category === 'status') applyZStatusBonus(currentMon, move);
    } else {
      addLog(`${displaySpeciesName(currentMon.species)}의 보호 기술이 실패했다. / ${currentMon.species}'s protection move failed.`);
    }
    recordLastMoveUsed(currentMon, move);
    return;
  }

  const protectedTargets = [];
  const validTargets = [];
  for (const target of targets) {
    if (!target || target.fainted) continue;
    if (player !== target.player && move.flags?.protect && target.protect) {
      if (move.breaksProtect) {
        target.protect = false;
        addLog(`${displaySpeciesName(target.species)}의 보호가 뚫렸다! / ${target.species}'s protection was broken!`, 'accent');
      } else {
        protectedTargets.push(target);
        continue;
      }
    }
    if (player !== target.player && state.battle?.terrain === 'psychicterrain' && move.priority > 0 && isGrounded(target)) {
      addLog(`${terrainDisplayLabel('psychicterrain')} 때문에 우선도 기술이 막혔다. / Psychic Terrain blocked the priority move.`);
      continue;
    }
    validTargets.push(target);
  }
  for (const target of protectedTargets) {
    addLog(`${displaySpeciesName(target.species)}은(는) 자신을 보호했다. / ${target.species} protected itself.`);
  }
  targets = validTargets;
  if (!targets.length && move.target !== 'opponent-side' && move.target !== 'self-side' && move.target !== 'ally-side') {
    recordLastMoveUsed(currentMon, move);
    return;
  }

  if (move.category === 'status') {
    applyStatusMove(currentMon, targets, move);
    if (move.useZ) applyZStatusBonus(currentMon, move);
    afterMoveResolution(currentMon, targets, move, 0);
    return;
  }

  const aliveTargets = [];
  let totalDamageDealt = 0;
  let anyHitConnected = false;
  let crashEligibleFailure = false;
  for (const target of targets) {
    if (!target || target.fainted) continue;
    if (handleTagBasedMoveImmunity(currentMon, target, move)) {
      crashEligibleFailure = crashEligibleFailure || move.hasCrashDamage;
      continue;
    }
    const singleAccuracyCheck = shouldUseSingleAccuracyCheck(currentMon, move);
    const baseAccuracy = move.accuracy || 100;
    if (!move.bypassAccuracy && singleAccuracyCheck && Math.random() * 100 >= baseAccuracy) {
      addLog(`${displaySpeciesName(currentMon.species)}의 ${displayMoveName(move.name)}는 ${displaySpeciesName(target.species)}에게 빗나갔다. / ${currentMon.species}'s ${move.name} missed ${target.species}.`);
      crashEligibleFailure = crashEligibleFailure || move.hasCrashDamage;
      continue;
    }
    const hits = rollHitCount(currentMon, move);
    let totalDamage = 0;
    let lastDamageInfo = null;
    for (let hit = 0; hit < hits; hit += 1) {
      if (target.hp <= 0) break;
      const hitMove = getPerHitMoveVariant(move, hit + 1);
      if (!move.bypassAccuracy && !singleAccuracyCheck) {
        const hitAccuracy = hitMove.accuracy || 100;
        if (Math.random() * 100 >= hitAccuracy) {
          if (hit === 0) {
            addLog(`${displaySpeciesName(currentMon.species)}의 ${displayMoveName(move.name)}는 ${displaySpeciesName(target.species)}에게 빗나갔다. / ${currentMon.species}'s ${move.name} missed ${target.species}.`);
            crashEligibleFailure = crashEligibleFailure || move.hasCrashDamage;
          }
          break;
        }
      }
      const damageInfo = computeDamage(currentMon, target, hitMove, targets.length > 1);
      let damage = damageInfo.damage;
      if (getAbilityId(target) === 'multiscale' && target.hp === target.maxHp) damage = Math.floor(damage * 0.5);
      if (getAbilityId(target) === 'flashfire' && getBattleMoveType(currentMon, hitMove) === 'fire') {
        addLog(`${displaySpeciesName(target.species)}의 타오르는불꽃 / Flash Fire가 공격을 흡수했다. / ${target.species}'s Flash Fire absorbed the attack.`);
        target.volatile.flashFire = true;
        damage = 0;
        if (hit === 0) crashEligibleFailure = crashEligibleFailure || move.hasCrashDamage;
        break;
      }
      if (getAbilityId(target) === 'levitate' && getBattleMoveType(currentMon, hitMove) === 'ground') {
        addLog(`${displaySpeciesName(target.species)}은(는) 부유 / Levitate 덕분에 땅 타입 기술을 피했다. / ${target.species} avoided the Ground-type move thanks to Levitate.`);
        damage = 0;
        if (hit === 0) crashEligibleFailure = crashEligibleFailure || move.hasCrashDamage;
        break;
      }
      if (getHeldItemId(target) === 'airballoon' && !target.volatile?.airBalloonPopped && getBattleMoveType(currentMon, hitMove) === 'ground') {
        addLog(`${displaySpeciesName(target.species)}의 풍선 / Air Balloon 때문에 땅 타입 기술이 통하지 않았다. / ${target.species}'s Air Balloon made it immune to the Ground-type attack.`);
        damage = 0;
        if (hit === 0) crashEligibleFailure = crashEligibleFailure || move.hasCrashDamage;
        break;
      }
      if (getHeldItemId(target) === 'focussash' && target.hp === target.maxHp && damage >= target.hp) {
        damage = target.hp - 1;
        addLog(`${displaySpeciesName(target.species)}은(는) 기합의띠 / Focus Sash로 버텼다! / ${target.species} endured with Focus Sash!`, 'accent');
      }
      if (target.protect && move.partialProtect) damage = Math.max(1, Math.floor(damage * 0.25));
      if (target.volatile?.substituteHp > 0 && !hitMove.flags?.bypasssub) {
        const subDamage = Math.max(0, damage);
        target.volatile.substituteHp = Math.max(0, target.volatile.substituteHp - subDamage);
        totalDamage += subDamage;
        totalDamageDealt += subDamage;
        lastDamageInfo = damageInfo;
        anyHitConnected = anyHitConnected || subDamage > 0;
        addLog(`${displaySpeciesName(target.species)}의 대타출동 / Substitute가 공격을 대신 맞았다. / ${target.species}'s substitute took the hit.`);
        if (target.volatile.substituteHp <= 0) clearSubstitute(target);
        continue;
      }
      target.hp = Math.max(0, target.hp - Math.max(0, damage));
      totalDamage += Math.max(0, damage);
      totalDamageDealt += Math.max(0, damage);
      lastDamageInfo = damageInfo;
      anyHitConnected = anyHitConnected || damage > 0;
      if (damageInfo.crit) addLog('급소에 맞았다! / A critical hit!');
      if (move.drain && damage > 0) {
        if (currentMon.volatile?.healBlockTurns > 0) {
          addLog(`${displaySpeciesName(currentMon.species)}은(는) 회복봉인 / Heal Block 때문에 HP를 회복할 수 없었다. / ${currentMon.species} could not heal because of Heal Block.`);
        } else {
          const heal = Math.max(1, Math.floor(damage * (move.drain / 100)));
          currentMon.hp = Math.min(currentMon.maxHp, currentMon.hp + heal);
          addLog(`${displaySpeciesName(currentMon.species)}의 HP가 ${heal} 회복되었다. / ${currentMon.species} restored ${heal} HP.`);
        }
      }
      maybeApplySecondary(currentMon, target, hitMove);
      if (moveId === 'knockoff' && damage > 0) {
        const removedItem = tryRemoveHeldItem(target, currentMon, 'knockoff');
        if (removedItem) addLog(`${displaySpeciesName(target.species)}의 ${displayItemName(removedItem)}이(가) 탁쳐서떨구기 / Knock Off로 떨어졌다. / ${target.species} lost its ${removedItem} to Knock Off.`);
      }
      if (!target.volatile?.airBalloonPopped && getHeldItemId(target) === 'airballoon' && damage > 0) {
        target.volatile.airBalloonPopped = true;
        addLog(`${displaySpeciesName(target.species)}의 풍선 / Air Balloon이 터졌다! / ${target.species}'s Air Balloon popped!`);
      }
      if (target.hp <= 0) {
        target.fainted = true;
        target.hp = 0;
        addLog(`${displaySpeciesName(target.species)}은(는) 쓰러졌다. / ${target.species} fainted.`, 'win');
        if (target.volatile?.grudge && moveChoice.moveIndex >= 0) {
          const attackerSlot = currentMon.moveSlots?.[moveChoice.moveIndex];
          if (attackerSlot) {
            attackerSlot.pp = 0;
            addLog(`${displaySpeciesName(target.species)}의 원한 / Grudge 때문에 ${displayMoveName(attackerSlot.name)}의 PP가 0이 되었다. / ${attackerSlot.name} lost all its PP due to Grudge.`);
          }
          delete target.volatile.grudge;
        }
        if (target.volatile?.destinyBond && currentMon.hp > 0) {
          currentMon.hp = 0;
          currentMon.fainted = true;
          addLog(`${displaySpeciesName(target.species)}의 길동무 / Destiny Bond로 ${displaySpeciesName(currentMon.species)}도 함께 쓰러졌다. / ${currentMon.species} took its foe down with Destiny Bond!`, 'win');
          delete target.volatile.destinyBond;
        }
        break;
      }
    }
    if (totalDamage > 0) {
      addLog(`${displaySpeciesName(target.species)}의 HP가 ${totalDamage}만큼 줄었다${lastDamageInfo?.effectivenessText ? ` (${lastDamageInfo.effectivenessText})` : ''}. / ${target.species} lost ${totalDamage} HP${lastDamageInfo?.effectivenessText ? ` (${lastDamageInfo.effectivenessText})` : ''}.`);
      aliveTargets.push(target);
    }
    if (getHeldItemId(currentMon) === 'lifeorb' && totalDamage > 0) {
      const recoil = Math.max(1, Math.floor(currentMon.baseMaxHp / 10));
      currentMon.hp = Math.max(0, currentMon.hp - recoil);
      addLog(`${displaySpeciesName(currentMon.species)}은(는) 생명의구슬 / Life Orb 반동으로 데미지를 입었다. / ${currentMon.species} was hurt by Life Orb.`);
    }
    if (getHeldItemId(target) === 'rockyhelmet' && totalDamage > 0 && move.category === 'physical' && causesContactEffects(currentMon, move)) {
      const recoil = Math.max(1, Math.floor(currentMon.baseMaxHp / 6));
      currentMon.hp = Math.max(0, currentMon.hp - recoil);
      addLog(`${displaySpeciesName(currentMon.species)}은(는) 울퉁불퉁멧 / Rocky Helmet 때문에 데미지를 입었다. / ${currentMon.species} was hurt by Rocky Helmet.`);
    }
  }
  if (move.hasCrashDamage && crashEligibleFailure && !anyHitConnected && targets.length) {
    applyCrashDamage(currentMon, move);
  }
  if (move.useMax) applyMaxMoveBonus(currentMon, aliveTargets, move);
  afterMoveResolution(currentMon, aliveTargets, move, totalDamageDealt);
  if (currentMon.hp <= 0) {
    currentMon.hp = 0;
    currentMon.fainted = true;
    addLog(`${displaySpeciesName(currentMon.species)}은(는) 쓰러졌다. / ${currentMon.species} fainted.`, 'win');
  }
}
function canMove(mon) {
  if (!mon || mon.fainted) return {ok:false, reason:'기절 상태입니다. / Fainted.'};
  if (mon.volatile?.mustRecharge) {
    delete mon.volatile.mustRecharge;
    return {ok:false, reason:`${displaySpeciesName(mon.species)}은(는) 재충전이 필요하다. / ${mon.species} must recharge.`};
  }
  if (mon.volatile?.flinch) {
    delete mon.volatile.flinch;
    return {ok:false, reason:`${displaySpeciesName(mon.species)}은(는) 풀죽어서 움직일 수 없다. / ${mon.species} flinched and couldn't move.`};
  }
  if (mon.status === 'slp') {
    if (uproarPreventsSleep(mon)) {
      mon.status = '';
      mon.sleepTurns = 0;
      return {ok:true, wake:true};
    }
    mon.sleepTurns = Math.max(0, (mon.sleepTurns || 1) - 1);
    if (mon.sleepTurns > 0) return {ok:false, reason:`${displaySpeciesName(mon.species)}은(는) 잠들어 있다. / ${mon.species} is asleep.`};
    mon.status = '';
    return {ok:true, wake:true};
  }
  if (mon.status === 'frz' && Math.random() < 0.8) return {ok:false, reason:`${displaySpeciesName(mon.species)}은(는) 얼어붙어 움직일 수 없다. / ${mon.species} is frozen solid.`};
  if (mon.status === 'par' && Math.random() < 0.25) return {ok:false, reason:`${displaySpeciesName(mon.species)}은(는) 몸이 저려 움직일 수 없다. / ${mon.species} is fully paralyzed.`};
  return {ok:true};
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
  const moveId = toId(move?.baseMoveName || move?.name || move?.id);
  const userSide = getSideForMon(user);
  if (applySideConditionMove(user.player, move)) return;
  if (move.weather) {
    const weatherMap = {raindance: 'rain', sunnyday: 'sun', sandstorm: 'sand', snowscape: 'snow'};
    setBattleWeather(weatherMap[moveId] || move.weather, user);
    return;
  }
  if (move.terrain) {
    const terrainMap = {electricterrain: 'electricterrain', grassyterrain: 'grassyterrain', mistyterrain: 'mistyterrain', psychicterrain: 'psychicterrain'};
    setBattleTerrain(terrainMap[moveId] || move.terrain, user);
    return;
  }
  if (moveId === 'trickroom') {
    if (state.battle.trickRoomTurns > 0) {
      state.battle.trickRoomTurns = 0;
      addLog('트릭룸 / Trick Room이 해제되었다. / Trick Room was removed.', 'accent');
    } else {
      state.battle.trickRoomTurns = 5;
      addLog('트릭룸 / Trick Room이 펼쳐졌다. / Trick Room twisted the dimensions!', 'accent');
    }
    return;
  }
  if (moveId === 'tailwind' && userSide?.sideConditions) {
    userSide.sideConditions.tailwindTurns = 4;
    addLog(`${state.battle.players[user.player].name} 측에 순풍 / Tailwind가 불기 시작했다. / Tailwind blew from ${state.battle.players[user.player].name}'s side.`, 'accent');
    getActiveMonsForSide(userSide).forEach(mon => {
      if (getAbilityId(mon) === 'windrider') {
        mon.boosts.atk = clamp((mon.boosts.atk || 0) + 1, -6, 6);
        addLog(`${displaySpeciesName(mon.species)}의 풍승 / Wind Rider로 공격이 올랐다! / ${mon.species}'s Wind Rider boosted its Attack!`, 'accent');
      }
    });
    return;
  }
  if (moveId === 'reflect' && userSide?.sideConditions) {
    userSide.sideConditions.reflectTurns = getHeldItemId(user) === 'lightclay' ? 8 : 5;
    addLog(`${state.battle.players[user.player].name} 측에 리플렉터 / Reflect가 전개되었다. / Reflect protected ${state.battle.players[user.player].name}'s side.`, 'accent');
    return;
  }
  if (moveId === 'lightscreen' && userSide?.sideConditions) {
    userSide.sideConditions.lightScreenTurns = getHeldItemId(user) === 'lightclay' ? 8 : 5;
    addLog(`${state.battle.players[user.player].name} 측에 빛의장막 / Light Screen이 전개되었다. / Light Screen protected ${state.battle.players[user.player].name}'s side.`, 'accent');
    return;
  }
  if (moveId === 'auroraveil' && userSide?.sideConditions) {
    if (state.battle.weather !== 'snow') {
      addLog('오로라베일 / Aurora Veil은 눈 상태에서만 사용할 수 있다. / Aurora Veil only works during snow.');
      return;
    }
    userSide.sideConditions.auroraVeilTurns = getHeldItemId(user) === 'lightclay' ? 8 : 5;
    addLog(`${state.battle.players[user.player].name} 측에 오로라베일 / Aurora Veil이 전개되었다. / Aurora Veil protected ${state.battle.players[user.player].name}'s side.`, 'accent');
    return;
  }
  if (moveId === 'substitute') {
    const cost = Math.floor((user.baseMaxHp || user.maxHp) / 4);
    if (cost <= 0 || user.hp <= cost) {
      addLog(`${displaySpeciesName(user.species)}은(는) 대타출동 / Substitute를 만들 HP가 부족하다. / ${user.species} does not have enough HP for Substitute.`);
      return;
    }
    if (user.volatile?.substituteHp > 0) {
      addLog(`${displaySpeciesName(user.species)}은(는) 이미 대타출동 / Substitute를 세워 두었다. / ${user.species} already has a substitute.`);
      return;
    }
    user.hp = Math.max(1, user.hp - cost);
    user.volatile.substituteHp = cost;
    addLog(`${displaySpeciesName(user.species)}이(가) 대타출동 / Substitute를 만들었다. / ${user.species} put up a substitute!`, 'accent');
    return;
  }
  if (moveId === 'taunt') {
    const target = targets.find(Boolean);
    if (!target || target.fainted) return;
    if (handleTagBasedMoveImmunity(user, target, move)) return;
    if (target.volatile?.substituteHp > 0 && !move.flags?.bypasssub) {
      addLog(`${displaySpeciesName(target.species)}의 대타출동 / Substitute가 도발을 막았다. / ${target.species}'s substitute blocked Taunt.`);
      return;
    }
    target.volatile.tauntTurns = 3;
    addLog(`${displaySpeciesName(target.species)}은(는) 도발 / Taunt 상태가 되었다. / ${target.species} fell for the taunt!`, 'accent');
    return;
  }
  if (moveId === 'encore') {
    const target = targets.find(Boolean);
    if (target && handleTagBasedMoveImmunity(user, target, move)) return;
    const lastMove = target?.lastMoveUsed;
    if (target?.volatile?.substituteHp > 0 && !move.flags?.bypasssub) {
      addLog(`${displaySpeciesName(target.species)}의 대타출동 / Substitute가 앵콜을 막았다. / ${target.species}'s substitute blocked Encore.`);
      return;
    }
    if (!target || !lastMove) {
      addLog('앵콜 / Encore가 실패했다. / Encore failed.');
      return;
    }
    const moveIndex = target.moveSlots?.findIndex(slot => slot && toId(slot.name) === toId(lastMove)) ?? -1;
    const slot = moveIndex >= 0 ? target.moveSlots[moveIndex] : null;
    if (!slot || slot.pp <= 0) {
      addLog('앵콜 / Encore가 실패했다. / Encore failed.');
      return;
    }
    target.volatile.encore = {moveName: slot.name, moveIndex, turns: 3};
    addLog(`${displaySpeciesName(target.species)}은(는) 앵콜 / Encore로 ${displayMoveName(slot.name)}에 묶였다. / ${target.species} received an encore!`, 'accent');
    return;
  }
  if (moveId === 'disable') {
    const target = targets.find(Boolean);
    if (target && handleTagBasedMoveImmunity(user, target, move)) return;
    const lastMoveMeta = target?.lastMoveMeta;
    const lastMove = target?.lastMoveUsed;
    if (!target || !lastMove || !lastMoveMeta || lastMoveMeta.usedZ || lastMoveMeta.usedMax || lastMoveMeta.moveId === 'struggle') {
      addLog('금지 / Disable가 실패했다. / Disable failed.');
      return;
    }
    const moveIndex = target.moveSlots?.findIndex(slot => slot && toId(slot.name) === toId(lastMove)) ?? -1;
    const slot = moveIndex >= 0 ? target.moveSlots[moveIndex] : null;
    if (!slot || slot.pp <= 0) {
      addLog('금지 / Disable가 실패했다. / Disable failed.');
      return;
    }
    const pendingChoice = getPendingChoiceForMon(target);
    const duration = pendingChoice?.kind === 'move' && !target.volatile?.actedThisTurn ? 4 : 5;
    target.volatile.disable = {moveName: slot.name, moveIndex, turns: duration};
    addLog(`${displaySpeciesName(target.species)}의 ${displayMoveName(slot.name)}가 금지 / Disable 상태가 되었다. / ${target.species}'s ${slot.name} was disabled.`, 'accent');
    return;
  }
  if (moveId === 'trick' || moveId === 'switcheroo') {
    const target = targets.find(Boolean);
    if (target && handleTagBasedMoveImmunity(user, target, move)) return;
    if (!target || target.fainted) {
      addLog(`${displayMoveName(move.name)}가 실패했다. / ${move.name} failed.`);
      return;
    }
    if (target.volatile?.substituteHp > 0 && !move.flags?.bypasssub) {
      addLog(`${displaySpeciesName(target.species)}의 대타출동 / Substitute가 ${displayMoveName(move.name)}를 막았다. / ${target.species}'s substitute blocked ${move.name}.`);
      return;
    }
    const userItem = user.item || '';
    const targetItem = target.item || '';
    if (!userItem && !targetItem) {
      addLog(`${displayMoveName(move.name)}가 실패했다. / ${move.name} failed.`);
      return;
    }
    if ((targetItem && !canRemoveHeldItem(target, user)) || (userItem && !canRemoveHeldItem(user, target))) {
      if (targetItem && slugify(target.ability) === 'stickyhold') {
        addLog(`${displaySpeciesName(target.species)}의 점착 / Sticky Hold 때문에 도구를 바꿀 수 없었다. / ${target.species}'s Sticky Hold prevented the item swap.`);
      } else {
        addLog(`${displayMoveName(move.name)}가 실패했다. / ${move.name} failed.`);
      }
      return;
    }
    clearChoiceLock(user);
    clearChoiceLock(target);
    trySetHeldItem(user, targetItem);
    trySetHeldItem(target, userItem);
    addLog(`${displaySpeciesName(user.species)}와(과) ${displaySpeciesName(target.species)}의 도구가 뒤바뀌었다. / ${user.species} and ${target.species} switched items.`, 'accent');
    return;
  }
  if (moveId === 'perishsong') {
    const applied = targets.filter(target => applyPerishSongToTarget(target)).length;
    if (!applied) addLog('멸망의노래 / Perish Song가 실패했다. / Perish Song failed.');
    return;
  }
  if (moveId === 'magnetrise') {
    if (user.volatile?.magnetRiseTurns > 0) {
      addLog('전자부유 / Magnet Rise가 실패했다. / Magnet Rise failed.');
      return;
    }
    user.volatile.magnetRiseTurns = 5;
    addLog(`${displaySpeciesName(user.species)}이(가) 전자부유 / Magnet Rise로 공중에 떴다. / ${user.species} levitated with Magnet Rise.`, 'accent');
    return;
  }
  if (moveId === 'aquaring') {
    if (user.volatile?.aquaRing) {
      addLog('아쿠아링 / Aqua Ring이 실패했다. / Aqua Ring failed.');
      return;
    }
    user.volatile.aquaRing = true;
    addLog(`${displaySpeciesName(user.species)} 주변에 아쿠아링 / Aqua Ring이 생겼다. / ${user.species} surrounded itself with a veil of water.`, 'accent');
    return;
  }
  if (moveId === 'ingrain') {
    if (user.volatile?.ingrain) {
      addLog('뿌리박기 / Ingrain이 실패했다. / Ingrain failed.');
      return;
    }
    user.volatile.ingrain = true;
    addLog(`${displaySpeciesName(user.species)}이(가) 뿌리를 내렸다. / ${user.species} planted its roots.`, 'accent');
    return;
  }
  if (moveId === 'stockpile') {
    const layers = user.volatile?.stockpileLayers || 0;
    if (layers >= 3) {
      addLog('비축하기 / Stockpile이 실패했다. / Stockpile failed.');
      return;
    }
    user.volatile.stockpileLayers = layers + 1;
    user.boosts.def = clamp((user.boosts.def || 0) + 1, -6, 6);
    user.boosts.spd = clamp((user.boosts.spd || 0) + 1, -6, 6);
    addLog(`${displaySpeciesName(user.species)}이(가) 비축하기 / Stockpile을 ${user.volatile.stockpileLayers}회 쌓았다. / ${user.species} stockpiled ${user.volatile.stockpileLayers}.`, 'accent');
    return;
  }
  if (moveId === 'swallow') {
    const layers = user.volatile?.stockpileLayers || 0;
    if (!layers) {
      addLog('꿀꺽 / Swallow가 실패했다. / Swallow failed.');
      return;
    }
    if (user.volatile?.healBlockTurns > 0) {
      addLog(`${displaySpeciesName(user.species)}은(는) 회복봉인 / Heal Block 때문에 HP를 회복할 수 없다. / ${user.species} cannot restore HP because of Heal Block.`);
      return;
    }
    const ratio = layers === 1 ? 0.25 : (layers === 2 ? 0.5 : 1);
    const heal = Math.max(1, Math.floor((user.baseMaxHp || user.maxHp) * ratio));
    user.hp = Math.min(user.maxHp, user.hp + heal);
    clearStockpile(user);
    addLog(`${displaySpeciesName(user.species)}이(가) 꿀꺽 / Swallow로 HP를 회복했다. / ${user.species} restored HP with Swallow.`);
    return;
  }
  if (moveId === 'spitup') {
    const target = targets.find(Boolean);
    const layers = user.volatile?.stockpileLayers || 0;
    if (!target || !layers) {
      addLog('토해내기 / Spit Up가 실패했다. / Spit Up failed.');
      return;
    }
    move.power = 100 * layers;
    clearStockpile(user);
  }
  if (['yawn','leechseed','torment','healblock','embargo','nightmare'].includes(moveId) || move.volatileStatus === 'confusion') {
    const applied = applyVolatileStatusMove(user, targets.find(Boolean), move);
    if (!applied) addLog(`${displayMoveName(move.name)}가 실패했다. / ${move.name} failed.`);
    return;
  }
  if (moveId === 'defog') {
    handleSuccessfulHitUtilities(user, targets, move);
    return;
  }
  if (move.forceSwitch && targets.length && state.mode === 'singles') {
    handleSuccessfulHitUtilities(user, targets, move);
    return;
  }
  if (move.healing) {
    if (user.volatile?.healBlockTurns > 0) {
      addLog(`${displaySpeciesName(user.species)}은(는) 회복봉인 / Heal Block 때문에 HP를 회복할 수 없다. / ${user.species} cannot restore HP because of Heal Block.`);
      return;
    }
    const healBase = user.baseMaxHp || user.maxHp;
    const heal = Math.max(1, Math.floor(healBase * (move.healing / 100)));
    user.hp = Math.min(user.maxHp, user.hp + heal);
    addLog(`${displaySpeciesName(user.species)}의 HP가 ${heal} 회복되었다. / ${user.species} restored ${heal} HP.`);
  }
  if (move.statChanges.length) {
    const applyToSelf = ['self','self-side'].includes(move.target) || (move.metaCategory === 'net-good-stats' && move.target !== 'single-opponent');
    const recipients = applyToSelf ? [user] : targets.filter(target => {
      if (target.volatile?.substituteHp > 0 && target.id !== user.id && !move.flags?.bypasssub) {
        addLog(`${displaySpeciesName(target.species)}의 대타출동 / Substitute가 변화를 막았다. / ${target.species}'s substitute blocked the status move.`);
        return false;
      }
      return true;
    });
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
    targets.forEach(target => {
      if (target.volatile?.substituteHp > 0 && target.id !== user.id && !move.flags?.bypasssub) {
        addLog(`${displaySpeciesName(target.species)}의 대타출동 / Substitute가 상태이상을 막았다. / ${target.species}'s substitute blocked the status condition.`);
        return;
      }
      applyAilment(target, move.ailment, 100);
    });
  }
}
function maybeApplySecondary(user, target, move) {
  if (target?.volatile?.substituteHp > 0 && !move.flags?.bypasssub) return;
  if (targetHasAdditionalEffectProtection(target)) return;
  if (move.ailment && move.ailment !== 'none' && move.ailmentChance > 0) applyAilment(target, move.ailment, move.ailmentChance);
  if (move.flinchChance > 0 && !target?.volatile?.actedThisTurn && Math.random() * 100 < move.flinchChance) {
    target.volatile = target.volatile || {};
    target.volatile.flinch = true;
    addLog(`${displaySpeciesName(target.species)}은(는) 풀죽었다! / ${target.species} flinched!`);
  }
  if (move.secondaryVolatileStatus === 'confusion' && Math.random() * 100 < (move.effectChance || 100)) {
    tryApplyConfusion(target);
  }
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
  if (status === 'slp' && uproarPreventsSleep(target)) {
    addLog('소란 / Uproar 때문에 잠들지 않았다. / The uproar kept it awake.');
    return;
  }
  if (state.battle?.terrain === 'electricterrain' && status === 'slp' && isGrounded(target)) {
    addLog(`${terrainDisplayLabel('electricterrain')} 때문에 잠들지 않았다. / Electric Terrain prevented sleep.`);
    return;
  }
  if (state.battle?.terrain === 'mistyterrain' && isGrounded(target)) {
    addLog(`${terrainDisplayLabel('mistyterrain')} 때문에 상태이상이 막혔다. / Misty Terrain prevented the status condition.`);
    return;
  }
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
  const category = getBattleMoveCategory(attacker, move);
  const physical = category === 'physical';
  let atk = getModifiedStat(attacker, physical ? 'atk' : 'spa');
  let def = getModifiedStat(defender, physical ? 'def' : 'spd');
  const moveId = toId(move?.baseMoveName || move?.name || move?.id);
  const moveType = getBattleMoveType(attacker, move);
  let power = move.power || 0;
  const weather = state.battle?.weather || '';
  const terrain = state.battle?.terrain || '';
  if (moveId === 'risingvoltage' && terrain === 'electricterrain' && isGrounded(defender)) power *= 2;
  if (moveId === 'expandingforce' && terrain === 'psychicterrain' && isGrounded(attacker)) power = Math.floor(power * 1.5);
  if ((moveId === 'earthquake' || moveId === 'bulldoze' || moveId === 'magnitude') && terrain === 'grassyterrain' && isGrounded(defender)) power = Math.floor(power * 0.5);
  if (slugify(attacker.ability) === 'technician' && power <= 60 && !move.useZ && !move.useMax) power = Math.floor(power * 1.5);
  if (getAbilityId(attacker) === 'ironfist' && isPunchingMove(move)) power = Math.floor(power * 1.2);
  if (getAbilityId(attacker) === 'strongjaw' && isBitingMove(move)) power = Math.floor(power * 1.5);
  if (getAbilityId(attacker) === 'megalauncher' && isPulseMove(move)) power = Math.floor(power * 1.5);
  if (getAbilityId(attacker) === 'sharpness' && isSlicingMove(move)) power = Math.floor(power * 1.5);
  if (getHeldItemId(attacker) === 'punchingglove' && isPunchingMove(move)) power = Math.floor(power * 1.1);
  if (getHeldItemId(attacker) === 'choiceband' && physical) atk = Math.floor(atk * 1.5);
  if (getHeldItemId(attacker) === 'choicespecs' && !physical) atk = Math.floor(atk * 1.5);
  if (moveId === 'knockoff' && defender?.item && canRemoveHeldItem(defender, attacker)) power = Math.floor(power * 1.5);
  if (getHeldItemId(attacker) === 'muscleband' && physical) power = Math.floor(power * 1.1);
  if (getHeldItemId(attacker) === 'wiseglasses' && !physical) power = Math.floor(power * 1.1);
  const typeBoostItems = {
    mysticwater:'water', charcoal:'fire', miracleseed:'grass', magnet:'electric', blackglasses:'dark', nevermeltice:'ice', softsand:'ground', dragonfang:'dragon', pixieplate:'fairy', poisonbarb:'poison', silverpowder:'bug', spelltag:'ghost', sharpbeak:'flying', twistedspoon:'psychic', hardstone:'rock', silkscarf:'normal', metalcoat:'steel'
  };
  if (typeBoostItems[getHeldItemId(attacker)] === moveType) power = Math.floor(power * 1.2);
  if (weather === 'sun') {
    if (moveType === 'fire') power = Math.floor(power * 1.5);
    if (moveType === 'water') power = Math.floor(power * 0.5);
  }
  if (weather === 'rain') {
    if (moveType === 'water') power = Math.floor(power * 1.5);
    if (moveType === 'fire') power = Math.floor(power * 0.5);
  }
  if (terrain === 'electricterrain' && moveType === 'electric' && isGrounded(attacker)) power = Math.floor(power * 1.3);
  if (terrain === 'grassyterrain' && moveType === 'grass' && isGrounded(attacker)) power = Math.floor(power * 1.3);
  if (terrain === 'psychicterrain' && moveType === 'psychic' && isGrounded(attacker)) power = Math.floor(power * 1.3);
  let damage = Math.floor(Math.floor(Math.floor((2 * attacker.level / 5 + 2) * power * atk / Math.max(1, def)) / 50) + 2);
  const defenderSide = getSideForMon(defender);
  if (physical && defenderSide?.sideConditions?.reflectTurns > 0) damage = Math.floor(damage * 0.5);
  if (!physical && defenderSide?.sideConditions?.lightScreenTurns > 0) damage = Math.floor(damage * 0.5);
  if (defenderSide?.sideConditions?.auroraVeilTurns > 0) damage = Math.floor(damage * 0.5);
  if (physical && attacker.status === 'brn') damage = Math.floor(damage * 0.5);
  const stab = getStabMultiplier(attacker, moveType);
  if (slugify(attacker.ability) === 'flashfire' && attacker.volatile.flashFire && moveType === 'fire') damage = Math.floor(damage * 1.5);
  let effectiveness = typeEffectiveness(moveType, defender);
  if (terrain === 'mistyterrain' && moveType === 'dragon' && isGrounded(defender)) damage = Math.floor(damage * 0.5);
  if (getHeldItemId(attacker) === 'expertbelt' && effectiveness > 1) damage = Math.floor(damage * 1.2);
  const critChance = move.critRate > 0 ? Math.min(50, 12.5 * (move.critRate + 1)) : (getHeldItemId(attacker) === 'scopelens' ? 12.5 : 4.167);
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
        triggerSwitchInEffects(player, replacement.mon);
        return replacement.index;
      }
      return activeIndex;
    });
  });
}
function endOfTurn() {
  const battle = state.battle;
  battle.players.forEach(side => {
    getActiveMonsForSide(side).forEach(mon => {
      const hpBase = mon.baseMaxHp || mon.maxHp;
      if (!mon.usedProtectMoveThisTurn) mon.protectCounter = 0;
      mon.usedProtectMoveThisTurn = false;
      mon.protect = false;
      const faintIfNeeded = () => {
        if (mon.hp > 0) return false;
        mon.hp = 0;
        mon.fainted = true;
        if (mon.dynamaxed) clearDynamax(mon);
        addLog(`${displaySpeciesName(mon.species)}은(는) 쓰러졌다. / ${mon.species} fainted.`, 'win');
        return true;
      };
      if (mon.volatile?.aquaRing && mon.hp > 0) {
        const heal = Math.max(1, Math.floor(hpBase / 16));
        mon.hp = Math.min(mon.maxHp, mon.hp + heal);
        addLog(`${displaySpeciesName(mon.species)}은(는) 아쿠아링 / Aqua Ring으로 HP를 회복했다. / ${mon.species} restored HP with Aqua Ring.`);
      }
      if (mon.volatile?.ingrain && mon.hp > 0) {
        const heal = Math.max(1, Math.floor(hpBase / 16));
        mon.hp = Math.min(mon.maxHp, mon.hp + heal);
        addLog(`${displaySpeciesName(mon.species)}은(는) 뿌리박기 / Ingrain으로 HP를 회복했다. / ${mon.species} restored HP with Ingrain.`);
      }
      if (mon.volatile?.leechSeeded && mon.hp > 0) {
        const drain = Math.max(1, Math.floor(hpBase / 8));
        mon.hp = Math.max(0, mon.hp - drain);
        addLog(`${displaySpeciesName(mon.species)}은(는) 씨뿌리기 / Leech Seed 때문에 HP를 빼앗겼다. / ${mon.species}'s health was sapped by Leech Seed.`);
        const recipient = getSourceSideActiveRecipient(mon.volatile.leechSeedSourcePlayer);
        if (recipient && !recipient.fainted && recipient.hp > 0) {
          recipient.hp = Math.min(recipient.maxHp, recipient.hp + drain);
          addLog(`${displaySpeciesName(recipient.species)}이(가) 씨뿌리기 / Leech Seed로 HP를 회복했다. / ${recipient.species} absorbed health with Leech Seed.`);
        }
        if (faintIfNeeded()) return;
      }
      if (mon.volatile?.nightmare) {
        if (mon.status === 'slp') {
          const dmg = Math.max(1, Math.floor(hpBase / 4));
          mon.hp = Math.max(0, mon.hp - dmg);
          addLog(`${displaySpeciesName(mon.species)}은(는) 악몽 / Nightmare 때문에 괴로워했다. / ${mon.species} is locked in a nightmare.`);
          if (faintIfNeeded()) return;
        } else {
          delete mon.volatile.nightmare;
        }
      }
      if (battle.weather === 'sand' && !['rock','ground','steel'].some(type => mon.types.includes(type))) {
        const dmg = Math.max(1, Math.floor(hpBase / 16));
        mon.hp = Math.max(0, mon.hp - dmg);
        addLog(`${displaySpeciesName(mon.species)}은(는) 모래바람 / Sandstorm 때문에 데미지를 입었다. / ${mon.species} was buffeted by the sandstorm.`);
        if (faintIfNeeded()) return;
      }
      if (mon.status === 'brn') {
        const dmg = Math.max(1, Math.floor(hpBase / 16));
        mon.hp = Math.max(0, mon.hp - dmg);
        addLog(`${displaySpeciesName(mon.species)}은(는) 화상 데미지를 입었다. / ${mon.species} was hurt by its burn.`);
        if (faintIfNeeded()) return;
      }
      if (mon.status === 'psn') {
        const dmg = Math.max(1, Math.floor(hpBase / 8));
        mon.hp = Math.max(0, mon.hp - dmg);
        addLog(`${displaySpeciesName(mon.species)}은(는) 독 데미지를 입었다. / ${mon.species} was hurt by poison.`);
        if (faintIfNeeded()) return;
      }
      if (mon.status === 'tox') {
        mon.toxicCounter = Math.max(1, mon.toxicCounter || 1);
        const dmg = Math.max(1, Math.floor(hpBase * mon.toxicCounter / 16));
        mon.hp = Math.max(0, mon.hp - dmg);
        addLog(`${displaySpeciesName(mon.species)}은(는) 맹독 데미지를 입었다. / ${mon.species} was hurt by toxic poison.`);
        mon.toxicCounter += 1;
        if (faintIfNeeded()) return;
      }
      if (battle.terrain === 'grassyterrain' && isGrounded(mon) && mon.hp > 0) {
        const heal = Math.max(1, Math.floor(hpBase / 16));
        mon.hp = Math.min(mon.maxHp, mon.hp + heal);
        addLog(`${displaySpeciesName(mon.species)}은(는) 그래스필드 / Grassy Terrain으로 HP를 회복했다. / ${mon.species} was healed by Grassy Terrain.`);
      }
      if (getHeldItemId(mon) === 'leftovers' && !mon.fainted) {
        const heal = Math.max(1, Math.floor(hpBase / 16));
        mon.hp = Math.min(mon.maxHp, mon.hp + heal);
        addLog(`${displaySpeciesName(mon.species)}은(는) 먹다남은음식 / Leftovers로 HP를 조금 회복했다. / ${mon.species} restored a little HP with Leftovers.`);
      }
      if (getHeldItemId(mon) === 'blacksludge') {
        const amount = Math.max(1, Math.floor(hpBase / 16));
        if (mon.types.includes('poison')) {
          mon.hp = Math.min(mon.maxHp, mon.hp + amount);
          addLog(`${displaySpeciesName(mon.species)}은(는) 검은오물 / Black Sludge로 HP를 회복했다. / ${mon.species} restored HP with Black Sludge.`);
        } else {
          mon.hp = Math.max(0, mon.hp - amount);
          addLog(`${displaySpeciesName(mon.species)}은(는) 검은오물 / Black Sludge 때문에 데미지를 입었다. / ${mon.species} was hurt by Black Sludge.`);
          if (faintIfNeeded()) return;
        }
      }
      if (getHeldItemId(mon) === 'sitrusberry' && mon.hp > 0 && mon.hp <= mon.maxHp / 2 && !mon.volatile.usedSitrus) {
        const heal = Math.max(1, Math.floor(hpBase / 4));
        mon.hp = Math.min(mon.maxHp, mon.hp + heal);
        mon.volatile.usedSitrus = true;
        addLog(`${displaySpeciesName(mon.species)}은(는) 오랭열매 / Sitrus Berry로 HP를 회복했다. / ${mon.species} restored HP with Sitrus Berry.`);
      }
      if (mon.dynamaxed) {
        mon.dynamaxTurns = Math.max(0, mon.dynamaxTurns - 1);
        if (mon.dynamaxTurns <= 0) {
          clearDynamax(mon);
          addLog(`${displaySpeciesName(mon.species)}의 다이맥스가 풀렸다. / ${mon.species} returned to normal size.`);
        }
      }
    });
  });
  battle.players.forEach(side => {
    ['reflectTurns','lightScreenTurns','auroraVeilTurns','tailwindTurns'].forEach(key => {
      if (side.sideConditions?.[key] > 0) side.sideConditions[key] = Math.max(0, side.sideConditions[key] - 1);
    });
    getActiveMonsForSide(side).forEach(mon => {
      if (mon.volatile?.tauntTurns > 0) mon.volatile.tauntTurns = Math.max(0, mon.volatile.tauntTurns - 1);
      if (mon.volatile?.tauntTurns === 0) delete mon.volatile.tauntTurns;
      if (mon.volatile?.tormentTurns > 0) mon.volatile.tormentTurns = Math.max(0, mon.volatile.tormentTurns - 1);
      if (mon.volatile?.tormentTurns === 0) delete mon.volatile.tormentTurns;
      if (mon.volatile?.healBlockTurns > 0) mon.volatile.healBlockTurns = Math.max(0, mon.volatile.healBlockTurns - 1);
      if (mon.volatile?.healBlockTurns === 0) delete mon.volatile.healBlockTurns;
      if (mon.volatile?.embargoTurns > 0) mon.volatile.embargoTurns = Math.max(0, mon.volatile.embargoTurns - 1);
      if (mon.volatile?.embargoTurns === 0) delete mon.volatile.embargoTurns;
      if (mon.volatile?.magnetRiseTurns > 0) mon.volatile.magnetRiseTurns = Math.max(0, mon.volatile.magnetRiseTurns - 1);
      if (mon.volatile?.magnetRiseTurns === 0) delete mon.volatile.magnetRiseTurns;
      if (mon.volatile?.yawnTurns > 0) {
        mon.volatile.yawnTurns = Math.max(0, mon.volatile.yawnTurns - 1);
        if (mon.volatile.yawnTurns === 0) {
          delete mon.volatile.yawnTurns;
          if (!mon.status && !uproarPreventsSleep(mon)) applyAilment(mon, 'sleep', 100);
        }
      }
      if (mon.volatile?.encore?.turns > 0) mon.volatile.encore.turns = Math.max(0, mon.volatile.encore.turns - 1);
      if (mon.volatile?.encore?.turns === 0) delete mon.volatile.encore;
      if (mon.volatile?.disable?.turns > 0) mon.volatile.disable.turns = Math.max(0, mon.volatile.disable.turns - 1);
      if (mon.volatile?.disable?.turns === 0) delete mon.volatile.disable;
      if (mon.volatile?.perishSongTurns > 0) {
        mon.volatile.perishSongTurns = Math.max(0, mon.volatile.perishSongTurns - 1);
        if (mon.volatile.perishSongTurns > 0) {
          addLog(`${displaySpeciesName(mon.species)}의 멸망의노래 / Perish Song 카운트가 ${mon.volatile.perishSongTurns - 1}(으)로 줄었다. / ${mon.species}'s perish count fell to ${Math.max(0, mon.volatile.perishSongTurns - 1)}.`);
        } else {
          mon.hp = 0;
          mon.fainted = true;
          addLog(`${displaySpeciesName(mon.species)}은(는) 멸망의노래 / Perish Song 때문에 쓰러졌다. / ${mon.species} perished!`, 'win');
        }
      }
      if (mon.volatile?.uproarTurns > 0) {
        mon.volatile.uproarTurns = Math.max(0, mon.volatile.uproarTurns - 1);
        if (mon.volatile.uproarTurns <= 0) {
          delete mon.volatile.uproarTurns;
          delete mon.volatile.uproarMoveIndex;
          delete mon.volatile.uproarMoveName;
          addLog(`${displaySpeciesName(mon.species)}의 소란 / Uproar가 멈췄다. / ${mon.species} calmed down.`);
        }
      }
      if (mon.volatile?.flinch) delete mon.volatile.flinch;
    });
  });
  if (anyActiveUproar()) {
    battle.players.forEach(side => getActiveMonsForSide(side).forEach(mon => {
      if (mon.status === 'slp' && getAbilityId(mon) !== 'soundproof') {
        mon.status = '';
        mon.sleepTurns = 0;
        addLog(`${displaySpeciesName(mon.species)}은(는) 소란 / Uproar 때문에 잠에서 깼다! / ${mon.species} woke up because of the uproar!`);
      }
    }));
  }
  if (battle.trickRoomTurns > 0) {
    battle.trickRoomTurns = Math.max(0, battle.trickRoomTurns - 1);
    if (battle.trickRoomTurns === 0) addLog('트릭룸 / Trick Room 효과가 끝났다. / Trick Room wore off.');
  }
  if (battle.weather) {
    battle.weatherTurns = Math.max(0, battle.weatherTurns - 1);
    if (battle.weatherTurns <= 0) {
      const endedWeather = battle.weather;
      battle.weather = '';
      addLog(`${weatherDisplayLabel(endedWeather)} 효과가 끝났다. / ${weatherDisplayLabel(endedWeather)} wore off.`);
    }
  }
  if (battle.terrain) {
    battle.terrainTurns = Math.max(0, battle.terrainTurns - 1);
    if (battle.terrainTurns <= 0) {
      const endedTerrain = battle.terrain;
      battle.terrain = '';
      addLog(`${terrainDisplayLabel(endedTerrain)} 효과가 끝났다. / ${terrainDisplayLabel(endedTerrain)} wore off.`);
    }
  }
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
  applyLanguageToStaticUi();
  syncLanguageControls();
  els.modeSinglesBtn.classList.toggle('active', state.mode === 'singles');
  els.modeDoublesBtn.classList.toggle('active', state.mode === 'doubles');
  renderValidationProfileNote();
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
  applyLanguageToStaticUi();
  syncLanguageControls();
  showRuntime('업로드한 에셋과 현지화된 전투 데이터를 불러오는 중… / Loading uploaded assets and fully localized battle data…', 'loading');
  resetTeams();
  await loadManifest();
  await detectAssetBases();
  loadSavedState();
  await loadDataProvider();
  await initializeShowdownLocalStatus();
  buildAssetDex();
  await loadMoveNames();
  await rehydrateTeams();
  buildStaticLists();
  wireEditorEvents();
  wireBattleEvents();
  renderAll();
  state.runtimeReady = true;
  const showdownStatusNote = buildShowdownStatusNote();
  showRuntime(
    '준비 완료. 로컬 에셋과 현지화된 전투 데이터가 연결되었습니다. / Runtime ready. Local assets, localized battle data, and form-aware sprite resolution are connected.',
    'ready',
    `포켓몬 스프라이트 경로 / Pokémon sprite base: ${state.assetBase.pokemon}<br>아이템 아이콘 경로 / Item icon base: ${state.assetBase.items}<br>데이터 공급원 / Data provider: ${dataSourceLabel()}${state.dexSource ? `<br>Dex source: ${state.dexSource}` : ''}<br>${showdownStatusNote}<br>이 빌드는 이제 종족 / learnset / 기술 / 아이템 / 특성 / 포맷 / 성격 / 상태 / 타입 상성의 로컬 데이터를 불러오고, 저장된 팀을 그 로컬 Dex 기준으로 복원하며, 레거시 기믹에 필요한 Past 태그 데이터를 허용하고, learnset / nonstandard / 폼 조건 / 아이템 / 특성 / 테라 타입 / 성별 / 팀 단위 경고뿐 아니라, 이벤트 전용 기술 묶음 검사와 검증 프로필 기반 Species Clause / Item Clause / 레벨 50 강제까지 더 강한 validator를 사용합니다. / This build now loads fully vendored local data for species / learnsets / moves / items / abilities / formats / natures / conditions / type chart, restores saved teams against that local Dex on startup, allows Past-tagged data needed for legacy mechanics, and runs a stronger validator for learnsets, nonstandard flags, form requirements, items, abilities, Tera type, gender, event-only move bundle checks, and profile-based Species Clause / Item Clause / level-50 enforcement. 이번 단계의 마이그레이션에서는 싱글 배틀 UI를 로컬 Showdown-family Node 코어의 request / snapshot 흐름 우선으로 재구성했으며, 현재 UI / 팀 빌더 / 로컬화 / 스프라이트 매핑 구조는 최대한 유지합니다. / This migration step makes the singles battle UI follow the local Showdown-family Node core through request-first and snapshot-driven flow while preserving the current UI, builder, localization, and sprite-mapping structure as much as possible.`
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
