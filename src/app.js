import {LOCAL_NATURES, LOCAL_NATURE_ORDER, LOCAL_TYPE_IDS, LOCAL_TYPES, LOCAL_TYPE_CHART} from './local-dex.js';
import {KO_NAME_MAPS} from './i18n-ko-data.js';
import {OFFICIAL_KO_SPECIES, OFFICIAL_KO_ITEMS} from './i18n-ko-official.js';
import {OFFICIAL_KO_LOCALE_NAMES} from './i18n-ko-locales.js';
import {probeShowdownLocalServer, startShowdownLocalSinglesBattle, submitShowdownLocalSinglesChoices, isShowdownLocalBattle} from './engine/showdown-local-bridge.js';
import {Aliases} from './data/aliases.js';
import {EXTERNALLY_VERIFIED_CURRENT_ITEMS_ABSENT_FROM_LOCAL_DATA, EXTERNALLY_VERIFIED_ITEM_KO_ALIASES} from './current-official-items.js';
import {resolveItemIconUrl, applyPokerogueAtlasFrameToElement, POKEROGUE_ASSET_PATHS} from './pokerogue-assets.js';
import {createPhaserBattleController} from './phaser-battle-controller.js';
import {loadPokemonMetrics, getMetricsForSprite, DBK_DEFAULTS, calcDbkAnimationDelayMs} from './pokerogue-transplant-runtime/runtime/pokemon-metrics.js';
import {BattleTimelineExecutor} from './battle-presentation/timeline.js';
import {resolveFormChangePresentation} from './battle-presentation/form-change-presentation.js';
import {createBattleLocaleManager} from './battle-i18n/locale-manager.js';
import {SHOWDOWN_TARGET_HINTS, statOrder, statLabels, statusNames, commonItems, VALIDATION_PROFILES, BUILDER_ALLOWED_NONSTANDARD, NONSTANDARD_REASON_LABELS, ASSET_BASE_SPECIES_ALIASES, BUILDER_BATTLE_ONLY_FORM_SUFFIXES, ENGINE_AUTHORITATIVE_SINGLES_FORMAT, OFFICIALLY_CONFIRMED_FUTURE_MEGA_ABILITIES, targetHints, MOVE_FLAG_LABELS, VOLATILE_STATUS_LABELS, SIDE_CONDITION_LABELS, WEATHER_LABELS, TERRAIN_LABELS, SPECIAL_ITEM_LINKED_FORM_OVERRIDES, SPECIAL_MOVE_LINKED_FORM_OVERRIDES, FORM_ASSET_OVERRIDES, EXPLICIT_ONLY_FORM_FAMILIES, MAX_MOVE_NAMES, GENERIC_Z_MOVE_NAMES, DYNAMAX_BANNED_SPECIES, TERA_LOW_POWER_EXEMPT_MOVES, PROTECT_MOVE_IDS, SCREEN_MOVE_IDS, CHOICE_ITEM_IDS, STRUGGLE_MOVE, MEGA_FORM_MOVE_REPLACEMENTS} from './battle-constants.js';
import {setDex, getDex, moveNameCache, CURRENT_OFFICIAL_ITEM_ID_SET, CURRENT_OFFICIAL_ABSENT_ITEM_ID_SET, isAllowedNonstandard, isDexSupported, extractSecondaryAilment, extractSecondaryBoosts, formatTargetFromDex, isFutureMegaSpeciesData, applyFutureMegaSpeciesMetadataPatches, resolveProjectMegaAbilityName, applyProjectMegaAbilityRulesToDex, fetchJson, pathExists, loadManifest, detectAssetBases, loadDataProvider, loadMoveNames, getSpeciesData, getMoveData, getItemData} from './dex-data.js';

const STORAGE_KEY = 'pkb-static-state-v3';

const BATTLE_BGM_TRACKS = ['battle_aether_boss','battle_aether_grunt','battle_alola_champion','battle_alola_elite','battle_aqua_magma_boss','battle_aqua_magma_grunt','battle_bb_elite','battle_champion_alder','battle_champion_geeta','battle_champion_iris','battle_champion_kieran','battle_champion_kukui','battle_champion_nemona','battle_colress','battle_final','battle_final_encounter','battle_flare_boss','battle_flare_grunt','battle_galactic_admin','battle_galactic_boss','battle_galactic_grunt','battle_galar_champion','battle_galar_elite','battle_galar_gym','battle_hoenn_champion_g5','battle_hoenn_champion_g6','battle_hoenn_elite','battle_hoenn_gym','battle_jacinthe','battle_johto_champion','battle_johto_gym','battle_kalos_champion','battle_kalos_elite','battle_kalos_gym','battle_kanto_champion','battle_kanto_gym','battle_legendary_arceus','battle_legendary_birds_galar','battle_legendary_calyrex','battle_legendary_deoxys','battle_legendary_dia_pal','battle_legendary_dusk_dawn','battle_legendary_entei','battle_legendary_eternatus_p1','battle_legendary_eternatus_p2','battle_legendary_giratina','battle_legendary_glas_spec','battle_legendary_gro_kyo','battle_legendary_ho_oh','battle_legendary_kanto','battle_legendary_kor_mir','battle_legendary_kyurem','battle_legendary_lake_trio','battle_legendary_loyal_three','battle_legendary_lugia','battle_legendary_mew','battle_legendary_ogerpon','battle_legendary_origin_forme','battle_legendary_pecharunt','battle_legendary_raikou','battle_legendary_rayquaza','battle_legendary_regis_g5','battle_legendary_regis_g6','battle_legendary_res_zek','battle_legendary_riders','battle_legendary_ruinous','battle_legendary_sinnoh','battle_legendary_sol_lun','battle_legendary_suicune','battle_legendary_tapu','battle_legendary_terapagos','battle_legendary_ub','battle_legendary_ultra_nec','battle_legendary_unova','battle_legendary_xern_yvel','battle_legendary_zac_zam','battle_macro_boss','battle_macro_grunt','battle_mustard','battle_oleana','battle_paldea_elite','battle_paldea_gym','battle_plasma_boss','battle_plasma_grunt','battle_rival','battle_rival_2','battle_rival_3','battle_rival_3_afd','battle_rocket_boss','battle_rocket_grunt','battle_rogue_mega','battle_sinnoh_champion','battle_sinnoh_gym','battle_skull_admin','battle_skull_boss','battle_skull_grunt','battle_star_admin','battle_star_boss','battle_star_grunt','battle_trainer','battle_trainer_afd','battle_unova_elite','battle_unova_gym','battle_wild','battle_wild_strong'];

// Battle presentation feature flags (Sprint 1 — all false by default)
// Exposed on window so the browser console can toggle them: window.FLAGS.battlePresentationV2 = true
const FLAGS = window.FLAGS = {
  battlePresentationV2: true,  // timeline executor (Sprint 2b: on by default)
  battleDualViewV1: true,      // split UI: top=P1, bottom=P2 (no pass-device perspective switching)
  battleAudioV1: false,        // audio manager SE routing
  battleLocaleV1: true,        // namespace-based battle messages
  battleMsgActionTagsV1: false, // @d/@s message tag parser
};
const typeIds = LOCAL_TYPE_IDS;
const TYPES = LOCAL_TYPES;
const natureOrder = LOCAL_NATURE_ORDER;
const natures = LOCAL_NATURES;

const typeChart = LOCAL_TYPE_CHART;

const imageInfoCache = new Map();
let fallbackMetricsPromise = null;

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
function parseAssetIdParts(rawId = '') {
  const id = String(rawId || '').trim();
  if (!id) return null;
  const numericGender = /^(.+?)_(\d+)_(female|male)$/i.exec(id);
  if (numericGender) {
    return {
      id,
      baseId: numericGender[1],
      form: Number(numericGender[2]),
      gender: numericGender[3].toLowerCase(),
      kind: 'numericGender',
    };
  }
  const basic = /^(.+?)(?:_(female|male|\d+))?$/i.exec(id);
  if (!basic) return null;
  const baseId = basic[1];
  const suffix = basic[2] || '';
  if (!suffix) return {id, baseId, kind: 'base'};
  if (/^\d+$/.test(suffix)) {
    return {id, baseId, form: Number(suffix), kind: 'numeric'};
  }
  if (/^(female|male)$/i.test(suffix)) {
    return {id, baseId, gender: suffix.toLowerCase(), kind: 'gender'};
  }
  return null;
}
function parseAssetFamilies(list = []) {
  const families = new Map();
  for (const rawId of list) {
    const parsed = parseAssetIdParts(rawId);
    if (!parsed) continue;
    const {id, baseId} = parsed;
    if (!families.has(baseId)) {
      families.set(baseId, {
        baseId,
        baseExists: false,
        numeric: new Map(),
        genders: {},
        numericGenders: new Map(),
        rawAssetIds: [],
      });
    }
    const family = families.get(baseId);
    family.rawAssetIds.push(id);
    switch (parsed.kind) {
      case 'base':
        family.baseExists = true;
        break;
      case 'numeric':
        family.numeric.set(parsed.form, id);
        break;
      case 'gender':
        family.genders[parsed.gender] = id;
        break;
      case 'numericGender':
        family.numericGenders.set(`${parsed.form}:${parsed.gender}`, id);
        break;
    }
  }
  for (const family of families.values()) {
    family.rawAssetIds.sort((a, b) => a.localeCompare(b, undefined, {numeric: true}));
  }
  return families;
}
function resolveAssetBaseSpeciesName(assetBaseId, familyLookup = new Map()) {
  const normalizedKey = normalizeAssetFamilyKey(assetBaseId);
  return familyLookup.get(normalizedKey) || ASSET_BASE_SPECIES_ALIASES[normalizedKey] || humanizeSpriteId(assetBaseId);
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

  const frontIds = new Set(state.manifest.pokemon.front || []);
  const backIds = new Set(state.manifest.pokemon.back || []);
  const usableAssetIds = new Set(Array.from(frontIds).filter(id => id && backIds.has(id)));
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
    const baseSpeciesName = resolveAssetBaseSpeciesName(assetBaseId, familyLookup);
    const baseEntry = state.dex.species.get(baseSpeciesName);
    if (!isDexSupported(baseEntry)) continue;
    const familySpeciesNames = uniqueNames([baseSpeciesName, ...(speciesByBase.get(baseSpeciesName) || [])]);
    const orderedForms = buildFamilyFormNames(baseSpeciesName, familySpeciesNames, baseEntry);
    const orderedRenderableForms = orderedForms.filter(speciesName => isRenderableAssetMappedForm(state.dex.species.get(speciesName)));
    const manualAssignableForms = orderedRenderableForms.filter(speciesName => {
      const speciesData = state.dex.species.get(speciesName);
      return isSelectableManualBuilderForm(speciesData, baseSpeciesName);
    });
    const autoAssignableForms = orderedRenderableForms.filter(speciesName => {
      const speciesData = state.dex.species.get(speciesName);
      return !manualAssignableForms.includes(speciesName) && isAutoResolvedBuilderForm(speciesData);
    });
    const hiddenAssignableForms = orderedRenderableForms.filter(speciesName => !manualAssignableForms.includes(speciesName) && !autoAssignableForms.includes(speciesName));
    const assetAssignmentOrder = uniqueNames([...manualAssignableForms, ...autoAssignableForms, ...hiddenAssignableForms]);
    const speciesToAsset = new Map();
    const assetToSpecies = new Map();

    if (assetFamily.baseExists && usableAssetIds.has(assetBaseId)) {
      speciesToAsset.set(baseSpeciesName, assetBaseId);
      assetToSpecies.set(assetBaseId, baseSpeciesName);
    }

    if (!EXPLICIT_ONLY_FORM_FAMILIES.has(assetBaseId)) {
      const numericAssetIds = Array.from(assetFamily.numeric.entries())
        .sort((a, b) => a[0] - b[0])
        .map(([, assetId]) => assetId)
        .filter(assetId => usableAssetIds.has(assetId));
      for (const [index, formName] of assetAssignmentOrder.entries()) {
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
      if (!usableAssetIds.has(assetId)) continue;
      if (!assetFamily.rawAssetIds.includes(assetId)) continue;
      speciesToAsset.set(speciesName, assetId);
      assetToSpecies.set(assetId, speciesName);
    }

    const unresolvedFormOrder = assetAssignmentOrder.filter(name => !speciesToAsset.has(name));
    const usableNumericAssetIds = Array.from(assetFamily.numeric.values()).filter(assetId => usableAssetIds.has(assetId));
    if (assetAssignmentOrder.length === 1 && unresolvedFormOrder.length === 1 && usableNumericAssetIds.length === 1) {
      const onlyAssetId = usableNumericAssetIds[0];
      speciesToAsset.set(unresolvedFormOrder[0], onlyAssetId);
      assetToSpecies.set(onlyAssetId, unresolvedFormOrder[0]);
    }

    assetToSpecies.clear();
    for (const [speciesName, assignedAssetId] of speciesToAsset.entries()) {
      if (assignedAssetId) assetToSpecies.set(assignedAssetId, speciesName);
    }

    const allFormChoices = familySpeciesNames
      .map(speciesName => {
        const speciesData = state.dex.species.get(speciesName);
        const supported = isDexSupported(speciesData);
        const renderable = isRenderableAssetMappedForm(speciesData);
        const requirementLocked = isRequirementLockedBuilderForm(speciesData);
        const assetId = speciesToAsset.get(speciesName) || '';
        const display = displaySpeciesName(speciesName);
        return {
          speciesName: speciesData?.name || speciesName,
          display,
          assetId,
          selectable: supported && !isBattleOnlyBuilderForm(speciesData),
          selectableManual: isSelectableManualBuilderForm(speciesData, baseSpeciesName),
          searchableManual: isSearchableManualBuilderForm(speciesData, baseSpeciesName),
          autoResolvedItemForm: isAutoResolvedItemBuilderForm(speciesData),
          hasAsset: Boolean(assetId),
          battleOnly: isBattleOnlyBuilderForm(speciesData),
          requirementLocked,
          supported,
          renderable,
        };
      })
      .filter(choice => (choice.supported || choice.renderable) && (choice.hasAsset || choice.speciesName === baseSpeciesName));
    const manualFormChoices = allFormChoices.filter(choice => choice.hasAsset && choice.selectableManual);
    const formChoices = manualFormChoices.filter(choice => choice.speciesName !== baseSpeciesName);
    const searchableFormChoices = allFormChoices.filter(choice => choice.hasAsset && choice.searchableManual);

    if (!speciesToAsset.get(baseSpeciesName)) {
      const fallbackBaseAssetId = searchableFormChoices.find(choice => choice.speciesName === baseSpeciesName)?.assetId || '';
      if (!fallbackBaseAssetId) continue;
    }

    const assetChoices = [];
    if (assetFamily.baseExists && usableAssetIds.has(assetBaseId)) {
      assetChoices.push({
        id: assetBaseId,
        display: `${displaySpeciesName(assetToSpecies.get(assetBaseId) || baseSpeciesName)} · ${assetBaseId}`,
      });
    }
    const numericEntries = Array.from(assetFamily.numeric.entries())
      .filter(([, assetId]) => usableAssetIds.has(assetId))
      .sort((a, b) => a[0] - b[0]);
    for (const [, assetId] of numericEntries) {
      assetChoices.push({
        id: assetId,
        display: `${displaySpeciesName(assetToSpecies.get(assetId) || humanizeSpriteId(assetId))} · ${assetId}`,
      });
    }
    const numericGenderEntries = Array.from(assetFamily.numericGenders.entries())
      .filter(([, assetId]) => usableAssetIds.has(assetId))
      .sort((a, b) => {
        const [aForm, aGender] = a[0].split(':');
        const [bForm, bGender] = b[0].split(':');
        const byForm = Number(aForm) - Number(bForm);
        if (byForm !== 0) return byForm;
        return aGender.localeCompare(bGender);
      });
    for (const [formGender, assetId] of numericGenderEntries) {
      const [, genderKey] = formGender.split(':');
      assetChoices.push({
        id: assetId,
        display: `${displaySpeciesName(assetToSpecies.get(assetId) || humanizeSpriteId(assetId))} ${genderKey === 'female' ? '♀' : '♂'} · ${assetId}`,
      });
    }
    for (const genderKey of ['female', 'male']) {
      if (assetFamily.genders[genderKey] && usableAssetIds.has(assetFamily.genders[genderKey])) {
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
      manualFormChoices,
      allFormChoices,
      searchableFormChoices,
      assetChoices,
      speciesToAsset,
      assetToSpecies,
    };
    assetDex.families.set(baseSpeciesName, family);
    for (const speciesName of familySpeciesNames) {
      assetDex.familyBySpecies.set(speciesName, family);
      if (speciesToAsset.has(speciesName)) assetDex.speciesToAsset.set(speciesName, speciesToAsset.get(speciesName));
      const speciesData = state.dex.species.get(speciesName);
      if (isSearchableManualBuilderForm(speciesData, baseSpeciesName) && speciesToAsset.has(speciesData.name)) {
        assetDex.allSpeciesChoices.push(makeChoice('species', speciesData.name, {
          family: baseSpeciesName,
          assetId: speciesToAsset.get(speciesData.name) || '',
        }));
      }
    }
  }

  const baseChoices = Array.from(assetDex.families.values())
    .filter(family => family.speciesToAsset.get(family.baseSpeciesName))
    .map(family => makeChoice('species', family.baseSpeciesName, {
      assetId: family.speciesToAsset.get(family.baseSpeciesName) || family.assetBaseId,
      family: family.baseSpeciesName,
      formSearchTerms: uniqueNames((family.searchableFormChoices || []).flatMap(choice => [
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
function isBattleOnlyBuilderForm(speciesData) {
  if (!speciesData?.exists) return false;
  if (speciesData.battleOnly) return true;
  return BUILDER_BATTLE_ONLY_FORM_SUFFIXES.has(toId(speciesData.forme || ''));
}
function isAutoResolvedItemBuilderForm(speciesData) {
  if (!isDexSupported(speciesData)) return false;
  if (isBattleOnlyBuilderForm(speciesData)) return false;
  const baseSpeciesName = speciesData?.baseSpecies || speciesData?.name || '';
  const isSpecialItemLinkedFamily = Boolean(
    speciesData?.name
    && speciesData?.name !== baseSpeciesName
    && SPECIAL_ITEM_LINKED_FORM_OVERRIDES[toId(baseSpeciesName)]
  );
  const hasRequiredItem = Boolean(speciesData?.requiredItem || speciesData?.requiredItems?.length || isSpecialItemLinkedFamily);
  if (!hasRequiredItem) return false;
  return Boolean(speciesData?.changesFrom || (speciesData?.baseSpecies && speciesData.baseSpecies !== speciesData.name));
}
function isAutoResolvedMoveBuilderForm(speciesData) {
  if (!isDexSupported(speciesData)) return false;
  if (isBattleOnlyBuilderForm(speciesData)) return false;
  const baseSpeciesName = speciesData?.baseSpecies || speciesData?.name || '';
  const isSpecialMoveLinkedFamily = Boolean(
    speciesData?.name
    && speciesData?.name !== baseSpeciesName
    && SPECIAL_MOVE_LINKED_FORM_OVERRIDES[toId(baseSpeciesName)]
  );
  if (!speciesData?.requiredMove && !isSpecialMoveLinkedFamily) return false;
  return Boolean(speciesData?.changesFrom || (speciesData?.baseSpecies && speciesData.baseSpecies !== speciesData.name));
}
function isAutoResolvedBuilderForm(speciesData) {
  return isAutoResolvedItemBuilderForm(speciesData) || isAutoResolvedMoveBuilderForm(speciesData);
}
function isRenderableAssetMappedForm(speciesData) {
  if (isDexSupported(speciesData)) return true;
  if (!speciesData?.exists) return false;
  if (speciesData.isNonstandard !== 'Future') return false;
  const formeId = toId(speciesData.forme || '');
  const name = String(speciesData.name || '');
  const isMegaLike = formeId.includes('mega') || /-mega/i.test(name);
  if (!isMegaLike) return false;
  return Boolean(
    speciesData.requiredItem
    || speciesData.requiredItems?.length
    || speciesData.battleOnly
    || speciesData.changesFrom
    || (speciesData.baseSpecies && speciesData.baseSpecies !== speciesData.name)
  );
}
function isSelectableManualBuilderForm(speciesData, baseSpeciesName = '') {
  if (!isDexSupported(speciesData)) return false;
  if (isBattleOnlyBuilderForm(speciesData)) return false;
  if ((speciesData.baseSpecies || speciesData.name) === speciesData.name) return true;
  if ((speciesData.name || '') === baseSpeciesName) return true;
  if (isAutoResolvedBuilderForm(speciesData)) return false;
  return !isRequirementLockedBuilderForm(speciesData);
}
function isSearchableManualBuilderForm(speciesData, baseSpeciesName = '') {
  return isSelectableManualBuilderForm(speciesData, baseSpeciesName);
}
function getFormChoicesForSpecies(baseSpeciesName, {includeBase = true} = {}) {
  const family = getFamilyForSpecies(baseSpeciesName);
  if (!family) return [];
  const choices = includeBase ? (family.manualFormChoices || family.formChoices || []) : (family.formChoices || []);
  return [...choices];
}
function sanitizeManualFormSpecies(mon, baseSpeciesName = '') {
  const choices = getFormChoicesForSpecies(baseSpeciesName, {includeBase: true});
  const raw = normalizeLocalizedInput('species', mon?.manualFormSpecies || mon?.formSpecies || mon?.species || baseSpeciesName, state.allSpeciesChoices || state.speciesChoices || []);
  const matched = choices.find(choice => toId(choice.speciesName) === toId(raw));
  return matched?.speciesName || baseSpeciesName;
}
function getSpecialLinkedFormSpecies(baseSpeciesName = '', {item = '', moves = []} = {}) {
  const baseId = toId(baseSpeciesName);
  if (!baseId) return '';
  const itemId = toId(item);
  const itemLinked = SPECIAL_ITEM_LINKED_FORM_OVERRIDES[baseId];
  if (itemLinked && itemId && itemLinked[itemId]) return itemLinked[itemId];
  const moveLinked = SPECIAL_MOVE_LINKED_FORM_OVERRIDES[baseId];
  if (moveLinked) {
    for (const moveName of moves || []) {
      const moveId = toId(moveName);
      if (moveId && moveLinked[moveId]) return moveLinked[moveId];
    }
  }
  return '';
}
function resolveSpecialLinkedFormSpeciesForMon(mon, baseSpeciesName = '') {
  const explicitBase = baseSpeciesName
    || mon?.baseSpecies
    || mon?.originalData?.baseSpecies
    || mon?.data?.baseSpecies
    || mon?.species
    || mon?.formSpecies
    || mon?.displaySpecies
    || '';
  return getSpecialLinkedFormSpecies(explicitBase, {item: mon?.item || '', moves: mon?.moves || []});
}
function matchesAutomaticFormRequirements(speciesData, mon) {
  if (!isAutoResolvedBuilderForm(speciesData)) return false;
  const baseSpeciesName = speciesData?.baseSpecies || speciesData?.name || '';
  const specialLinkedSpecies = resolveSpecialLinkedFormSpeciesForMon(mon, baseSpeciesName);
  if (specialLinkedSpecies) return toId(speciesData?.name) === toId(specialLinkedSpecies);
  const requiredItems = [speciesData.requiredItem, ...(speciesData.requiredItems || [])].filter(Boolean);
  if (requiredItems.length && !requiredItems.some(item => toId(item) === toId(mon?.item))) return false;
  const requiredMove = speciesData?.requiredMove || '';
  if (requiredMove && !((mon?.moves || []).some(move => toId(move) === toId(requiredMove)))) return false;
  return Boolean(requiredItems.length || requiredMove);
}
function resolveAutomaticBuilderSpecies(mon, manualSpecies = '') {
  const family = getFamilyForSpecies(manualSpecies || mon?.baseSpecies || mon?.species || '');
  if (!family || !state.dex) return manualSpecies || mon?.baseSpecies || '';
  const specialLinkedSpecies = resolveSpecialLinkedFormSpeciesForMon(mon, family.baseSpeciesName);
  if (specialLinkedSpecies) {
    const specialSpeciesData = state.dex.species.get(specialLinkedSpecies);
    if (specialSpeciesData?.exists && !isBattleOnlyBuilderForm(specialSpeciesData)) return specialSpeciesData.name;
    return manualSpecies || family.baseSpeciesName;
  }
  const candidates = (family.allFormChoices || family.formChoices || [])
    .map(choice => state.dex.species.get(choice.speciesName))
    .filter(speciesData => speciesData?.exists && matchesAutomaticFormRequirements(speciesData, mon));
  return candidates[0]?.name || manualSpecies || family.baseSpeciesName;
}
function getAutoSpriteIdForSpecies(speciesName, gender = '', baseSpeciesName = '') {
  // Reserve the spare Mimikyu asset for the busted form so Disguise flips the
  // battle sprite instead of reusing the disguised sprite family entry.
  const speciesId = toId(speciesName || baseSpeciesName || '');
  if (speciesId === 'mimikyubusted' || speciesId === 'mimikyubustedtotem') return 'MIMIKYU_1';
  // Ogerpon tera forms have assets at indices 8-11, misaligned from dex form order — hardcode.
  if (speciesId === 'ogerpontealtera') return 'OGERPON_8';
  if (speciesId === 'ogerponwellspringtera') return 'OGERPON_9';
  if (speciesId === 'ogerponhearthflametera') return 'OGERPON_10';
  if (speciesId === 'ogerponcornerstonetera') return 'OGERPON_11';
  const family = getFamilyForSpecies(speciesName || baseSpeciesName);
  if (!family) return '';
  const resolvedSpecies = normalizeLocalizedInput('species', speciesName || baseSpeciesName, state.allSpeciesChoices || state.speciesChoices || []) || speciesName || baseSpeciesName || family.baseSpeciesName;
  let assetId = family.speciesToAsset.get(resolvedSpecies) || family.speciesToAsset.get(baseSpeciesName) || family.assetBaseId;
  const genderKey = gender === 'F' ? 'female' : gender === 'M' ? 'male' : '';
  if (genderKey) {
    const numericMatch = /^(.+?)_(\d+)$/i.exec(assetId || '');
    if (numericMatch) {
      const numericGenderAsset = family.assetFamily.numericGenders?.get(`${Number(numericMatch[2])}:${genderKey}`);
      if (numericGenderAsset) assetId = numericGenderAsset;
    } else if (toId(resolvedSpecies) === toId(family.baseSpeciesName)) {
      const genderAsset = family.assetFamily.genders[genderKey];
      if (genderAsset) assetId = genderAsset;
    }
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
  const formChoices = family ? getFormChoicesForSpecies(family.baseSpeciesName, {includeBase: true}) : [];
  const hasAlternates = formChoices.length > 1;
  els.formeSelect.innerHTML = hasAlternates
    ? formChoices.map(choice => `<option value="${choice.speciesName}">${choice.display}</option>`).join('\n')
    : '<option value="">기본 폼만 사용 / Base form only</option>';
  els.formeSelect.disabled = !hasAlternates;
  const matchingChoice = formChoices.find(choice => toId(choice.speciesName) === toId(mon.manualFormSpecies || mon.baseSpecies || mon.species));
  const selectedForm = matchingChoice ? matchingChoice.speciesName : (hasAlternates ? (formChoices[0]?.speciesName || '') : '');
  if (selectedForm) els.formeSelect.value = selectedForm;
  else if (!hasAlternates) els.formeSelect.value = '';
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
function resolveCommittedSpeciesInput(rawValue) {
  const resolved = resolveSpeciesSelection(rawValue);
  const committedName = resolved.speciesName || resolved.baseSpeciesName || '';
  if (!committedName) return '';
  const speciesData = state.dex?.species?.get?.(committedName);
  if (!speciesData?.exists) return '';
  return speciesData.name;
}
async function commitSpeciesInputSelection(selectedPlayer = state.selected.player, selectedSlot = state.selected.slot) {
  if (state.selected.player !== selectedPlayer || state.selected.slot !== selectedSlot) return false;
  const mon = getSelectedMon();
  if (!mon) return false;
  const committedName = resolveCommittedSpeciesInput(els.speciesInput?.value || '');
  if (!committedName) return false;
  const currentSpeciesName = mon.data?.name || mon.formSpecies || mon.species || mon.baseSpecies || '';
  if (toId(currentSpeciesName) === toId(committedName)) return false;
  applySpeciesSelection(mon, committedName);
  await hydrateSelectedSpecies({render: false, persist: false});
  randomizeLearnsetMoves(mon);
  renderEditor();
  renderRoster();
  await renderValidation();
  saveState();
  return true;
}
function isMegaSpeciesName(speciesName = '') {
  return /-mega/i.test(speciesName);
}
function randomizeLearnsetMoves(mon) {
  const movePool = getCurrentMoveChoices(mon).map(choice => choice.english);
  const shuffledMoves = [...movePool];
  for (let i = shuffledMoves.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffledMoves[i], shuffledMoves[j]] = [shuffledMoves[j], shuffledMoves[i]];
  }
  const uniqueMoves = [];
  for (const moveName of shuffledMoves) {
    if (!uniqueMoves.includes(moveName)) uniqueMoves.push(moveName);
    if (uniqueMoves.length === 4) break;
  }
  mon.moves = Array.from({length: 4}, (_, idx) => uniqueMoves[idx] || '');
  return mon.moves;
}
function resolveMegaSpeciesNameFromItem(mon) {
  const item = state.dex?.items?.get?.(mon?.item || '');
  if (!item?.exists || !item.megaStone) return '';
  if (typeof item.megaStone === 'string') return item.megaStone;
  const candidateKeys = uniqueNames([
    mon?.formSpecies,
    mon?.species,
    mon?.manualFormSpecies,
    mon?.baseSpecies,
    mon?.originalData?.baseSpecies,
    mon?.originalData?.name,
  ]).map(name => normalizeLocalizedInput('species', name, state.allSpeciesChoices || state.speciesChoices || []) || name);
  for (const key of candidateKeys) {
    const direct = item.megaStone[key];
    if (direct) return direct;
    const speciesData = state.dex?.species?.get?.(key);
    const baseSpecies = speciesData?.exists ? (speciesData.baseSpecies || speciesData.name) : '';
    if (baseSpecies && item.megaStone[baseSpecies]) return item.megaStone[baseSpecies];
  }
  for (const value of Object.values(item.megaStone || {})) {
    if (value) return value;
  }
  return '';
}
function getMegaCandidateForMon(mon) {
  if (!state.dex) return null;
  const resolvedMegaSpecies = resolveMegaSpeciesNameFromItem(mon);
  if (resolvedMegaSpecies) {
    const species = state.dex.species.get(resolvedMegaSpecies);
    if (species?.exists) {
      const family = getFamilyForSpecies(species.name) || getFamilyForSpecies(species.baseSpecies || mon.baseSpecies || mon.species);
      const assetId = getAutoSpriteIdForSpecies(species.name, mon.gender, species.baseSpecies || mon.baseSpecies || mon.species || '')
        || family?.speciesToAsset?.get?.(species.name)
        || '';
      return {speciesName: species.name, assetId};
    }
  }
  const family = getFamilyForSpecies(mon.baseSpecies || mon.species);
  if (!family) return null;
  const heldItem = state.dex.items.get(mon?.item || '');
  const heldItemIsZCrystal = Boolean(heldItem?.exists && (heldItem.zMove || heldItem.zMoveType || heldItem.zMoveFrom));
  const candidates = (family.allFormChoices || family.formChoices || []).filter(choice => /-mega/i.test(choice.speciesName));
  const matched = candidates.find(choice => {
    const species = state.dex.species.get(choice.speciesName);
    if (!species?.exists) return false;
    if (species.requiredItem) return toId(species.requiredItem) === toId(mon.item);
    if (species.requiredMove) {
      if (heldItemIsZCrystal) return false;
      return (mon?.moves || []).some(move => toId(move) === toId(species.requiredMove));
    }
    return false;
  });
  if (!matched) return null;
  const species = state.dex.species.get(matched.speciesName);
  return species?.exists ? {speciesName: species.name, assetId: matched.assetId || getAutoSpriteIdForSpecies(species.name, mon.gender, family.baseSpeciesName)} : null;
}
function getPrimalCandidateForMon(mon) {
  if (!state.dex) return null;
  const itemId = toId(mon?.item || '');
  const baseSpecies = uniqueNames([
    mon?.baseSpecies,
    mon?.species,
    mon?.formSpecies,
    mon?.manualFormSpecies,
    mon?.originalData?.baseSpecies,
    mon?.originalData?.name,
  ]).find(Boolean) || '';
  let primalSpeciesName = '';
  if (itemId === 'blueorb' && toId(baseSpecies) === 'kyogre') primalSpeciesName = 'Kyogre-Primal';
  if (itemId === 'redorb' && toId(baseSpecies) === 'groudon') primalSpeciesName = 'Groudon-Primal';
  if (!primalSpeciesName) return null;
  const species = state.dex.species.get(primalSpeciesName);
  if (!species?.exists) return null;
  return {
    speciesName: species.name,
    assetId: getAutoSpriteIdForSpecies(species.name, mon.gender, species.baseSpecies || baseSpecies || mon.species || ''),
  };
}
function getUltraBurstCandidateForMon(mon) {
  if (!state.dex) return null;
  if (toId(mon?.item || '') !== 'ultranecroziumz') return null;
  const candidateKeys = uniqueNames([
    mon?.formSpecies,
    mon?.species,
    mon?.manualFormSpecies,
    mon?.baseSpecies,
    mon?.originalData?.name,
    mon?.originalData?.baseSpecies,
  ]).map(name => normalizeLocalizedInput('species', name, state.allSpeciesChoices || state.speciesChoices || []) || name);
  const canUltraBurst = candidateKeys.some(name => ['necrozmaduskmane', 'necrozmadawnwings', 'necrozma'].includes(toId(name)));
  if (!canUltraBurst) return null;
  const species = state.dex.species.get('Necrozma-Ultra');
  if (!species?.exists) return null;
  return {
    speciesName: species.name,
    assetId: getAutoSpriteIdForSpecies(species.name, mon.gender, species.baseSpecies || 'Necrozma'),
  };
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
  return (family.allFormChoices || family.formChoices || []).find(choice => toId(choice.speciesName) === targetId && choice.assetId) || null;
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
  if (!runtimeSupportsDynamax()) return false;
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
  const displayName = displayBattleSpeciesName(mon);
  addLog(`${displayName}은(는) 기술 실패 반동으로 크게 부딪혔다! / ${displayName} kept going and crashed!`);
}
function moveHasHealingEffect(move) {
  const moveId = toId(move?.baseMoveName || move?.name || move?.id);
  return Boolean(move?.healing > 0 || move?.drain > 0 || move?.flags?.heal || ['rest','swallow','shoreup','strengthsap','junglehealing','lifedew','floralhealing','healpulse','recover','roost','milkdrink','softboiled','moonlight','morningsun','synthesis','wish'].includes(moveId));
}
function getActiveMonsForSide(side) {
  return (side?.active || []).map(index => side.team[index]).filter(Boolean);
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
function describeMoveForBattle(mon, move, choice = null) {
  if (!move) return null;
  const previewMon = {
    ...(mon || {}),
    terastallized: Boolean(choice?.tera || mon?.terastallized),
    dynamaxed: Boolean(choice?.dynamax || mon?.dynamaxed),
    gigantamaxed: Boolean(mon?.gigantamaxed),
  };
  let preview = previewMoveForUi(previewMon, move) || {
    name: move.name,
    type: move.type,
    category: move.category,
    power: move.power || 0,
    accuracy: move.accuracy,
  };
  if (choice?.z && move.category !== 'status') {
    preview = {
      ...preview,
      name: move.zMoveName || move.zMove?.name || preview.name,
      power: move.zBasePower || getDefaultZMovePower(move.power || 0),
      accuracy: 100,
    };
  }
  return preview;
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
  battleUi: {
    perspective: 0,
    modeByPlayer: {0: 'command', 1: 'command'},
    moveDetailByPlayer: {0: {}, 1: {}},
    inputLocked: false,
    timelineSpriteOverrides: {},
    passPrompt: '',
    lastFlyoutKey: '',
    flyoutTimer: null,
  },
  assetBase: {pokemon: './assets/Pokemon', items: './assets/items'},
  showdownLocal: {available: false, checked: false, skipped: false, bundledNodeServer: false, engineApiOrigin: '', probeMode: 'uninitialized'},
};

const els = {};
let pickerReturnFocusEl = null;
const phaserBattleRenderers = { 0: null, 1: null };
const battleLocaleManager = createBattleLocaleManager({
  language: 'ko',
  namespaces: ['battle', 'ability-trigger', 'move-trigger', 'weather', 'terrain', 'arena-tag', 'status-effect', 'pokemon-info'],
});

function getPhaserBattleRenderer(player = 0) {
  return phaserBattleRenderers[player] || null;
}

function getPrimaryBattleScene() {
  return getPhaserBattleRenderer(0)?.scene
    ?? getPhaserBattleRenderer(1)?.scene
    ?? null;
}

function getTimelineExecutorConfigs() {
  const p1Scene = () => getPhaserBattleRenderer(0)?.scene ?? null;
  const p2Scene = () => getPhaserBattleRenderer(1)?.scene ?? null;
  const dualView = FLAGS.battleDualViewV1 === true;
  if (dualView && p1Scene() && p2Scene()) {
    return [
      { scene: p1Scene, playerSide: 'p1', audioEnabled: true },
      { scene: p2Scene, playerSide: 'p2', audioEnabled: false },
    ];
  }
  const perspective = clamp(Number(state.battleUi?.perspective || 0), 0, 1);
  return [{ scene: () => getPrimaryBattleScene(), playerSide: perspective === 1 ? 'p2' : 'p1', audioEnabled: true }];
}

function getTimelineSpriteOverride(side) {
  const ui = state.battleUi || (state.battleUi = {});
  ui.timelineSpriteOverrides = ui.timelineSpriteOverrides || {};
  return ui.timelineSpriteOverrides[side] || null;
}

function setTimelineSpriteOverride(side, value) {
  if (side !== 'p1' && side !== 'p2') return;
  const ui = state.battleUi || (state.battleUi = {});
  ui.timelineSpriteOverrides = ui.timelineSpriteOverrides || {};
  if (value && value.spriteId) {
    ui.timelineSpriteOverrides[side] = {
      spriteId: String(value.spriteId || ''),
      shiny: Boolean(value.shiny),
    };
    return;
  }
  delete ui.timelineSpriteOverrides[side];
}

function clearTimelineSpriteOverrides() {
  const ui = state.battleUi || (state.battleUi = {});
  ui.timelineSpriteOverrides = {};
}

function resolveTimelineEventSideSlot(ev) {
  if (!ev) return null;
  if (ev.type === 'switch_in') {
    return {
      side: ev.side,
      slot: Number.isInteger(ev.slot) ? ev.slot : 0,
    };
  }
  return {
    side: ev?.target?.side,
    slot: Number.isInteger(ev?.target?.slot) ? ev.target.slot : 0,
  };
}

function resolveTimelineEventMon(ev, battle = state.battle, { fallbackSpecies = '' } = {}) {
  if (!battle?.players || !ev) return null;
  const sideSlot = resolveTimelineEventSideSlot(ev);
  const sideId = sideSlot?.side;
  if (sideId !== 'p1' && sideId !== 'p2') return null;
  const sideIndex = sideId === 'p2' ? 1 : 0;
  const slot = sideSlot.slot;
  const side = battle.players?.[sideIndex];
  if (!side?.team?.length) return null;

  const activeTeamIndex = side.active?.[slot];
  const activeMon = Number.isInteger(activeTeamIndex) && side.team[activeTeamIndex]
    ? side.team[activeTeamIndex]
    : null;

  const speciesId = toId(
    ev?.toSpecies
    || ev?.species
    || (ev?.type === 'forme_change' ? '' : ev?.to)
    || fallbackSpecies
    || ''
  );
  const speciesMatches = [];
  if (speciesId) {
    for (const mon of side.team) {
      if (!mon) continue;
      const ids = [
        toId(getBattleRenderSpeciesName(mon) || ''),
        toId(mon.formSpecies || ''),
        toId(mon.species || ''),
        toId(mon.baseSpecies || ''),
      ];
      if (ids.includes(speciesId)) speciesMatches.push(mon);
    }
  }
  if (speciesMatches.length) {
    if (ev?.type === 'terastallize') {
      const teraMatch = speciesMatches.find(mon => mon?.terastallized);
      if (teraMatch) return teraMatch;
    }
    if (ev?.type === 'dynamax_start') {
      const dynaMatch = speciesMatches.find(mon => mon?.dynamaxed);
      if (dynaMatch) return dynaMatch;
    }
    if (activeMon && speciesMatches.includes(activeMon)) return activeMon;
    return speciesMatches[0];
  }

  return activeMon || side.team.find(Boolean) || null;
}

function resolveTimelineSwitchSpriteOverride(ev, battle = state.battle) {
  if (!ev || ev.type !== 'switch_in') return null;
  const mon = resolveTimelineEventMon(ev, battle);
  const switchSpecies = String(ev.species || '').trim();
  let spriteId = '';
  let shiny = false;
  if (switchSpecies) {
    const baseSpecies = mon?.baseSpecies || mon?.originalData?.baseSpecies || switchSpecies;
    spriteId = getAutoSpriteIdForSpecies(switchSpecies, mon?.gender || '', baseSpecies);
    shiny = Boolean(mon?.shiny);
  }
  if (!spriteId && mon) {
    spriteId = resolveBattleRenderSpriteId(mon);
    shiny = Boolean(mon.shiny);
  }
  if (!spriteId) return null;
  return { spriteId, shiny };
}

function buildTimelineStaticInfoPatch(mon) {
  if (!mon) return null;
  const info = buildBattleInfoModelFromMon(mon);
  return {
    displayName: info.displayName,
    levelLabel: info.levelLabel,
    types: info.types,
    gender: info.gender,
    shiny: info.shiny,
    teraType: info.teraType,
    dynamaxed: Boolean(info.dynamaxed),
    gigantamaxed: Boolean(info.gigantamaxed),
    badges: info.badges,
  };
}

function resolveTimelineEventVisualState(ev, { playerSide = 'p1', battle = state.battle, initialNames = {} } = {}) {
  if (!ev || !battle?.players) return null;
  const sideSlot = resolveTimelineEventSideSlot(ev);
  const side = sideSlot?.side;
  if (side !== 'p1' && side !== 'p2') return null;
  const sideIndex = side === 'p2' ? 1 : 0;
  const sideState = battle.players?.[sideIndex] || null;
  const perspective = playerSide === 'p2' ? 1 : 0;
  const fallbackSpecies = String(initialNames?.[`${side}_${sideSlot.slot}`] || '');
  const mon = resolveTimelineEventMon(ev, battle, { fallbackSpecies });
  const activeTeamIndex = Number.isInteger(sideState?.active?.[sideSlot.slot])
    ? sideState.active[sideSlot.slot]
    : -1;
  const teamIndex = mon && Array.isArray(sideState?.team)
    ? sideState.team.indexOf(mon)
    : -1;
  const isActive = Number.isInteger(activeTeamIndex) && activeTeamIndex >= 0 && teamIndex === activeTeamIndex;
  // The timeline plays against the adopted post-turn snapshot, so hp/fainted can
  // already reflect future events (e.g. KO later in the same turn). For presentation
  // branching we only gate visibility by "currently active" here, then refine using
  // timeline slot state at playback time.
  const isVisible = Boolean(isActive);
  const infoPatch = buildTimelineStaticInfoPatch(mon) || {};
  if (ev.type === 'forme_change') {
    // Forme change name comes from event stream (detailschange) and can differ from
    // the final snapshot (e.g. KO + silent detailschange in the same turn).
    delete infoPatch.displayName;
  }
  let spriteId = '';
  let shiny = false;

  if (ev.type === 'switch_in') {
    const override = getTimelineSpriteOverride(side);
    spriteId = String(override?.spriteId || '');
    shiny = Boolean(override?.shiny);
  }
  if (!spriteId && ev.type === 'dynamax_start' && mon && ev.gigantamaxed) {
    const gmaxSpriteId = getGigantamaxAssetId(mon);
    if (gmaxSpriteId) {
      spriteId = gmaxSpriteId;
      shiny = Boolean(mon.shiny);
    }
  }
  if (!spriteId && ev.type === 'dynamax_end' && mon) {
    const preDynamaxSpriteId = String(mon.preDynamaxSpriteId || '');
    if (preDynamaxSpriteId) {
      spriteId = preDynamaxSpriteId;
      shiny = Boolean(mon.shiny);
    }
  }
  if (!spriteId && ev.type === 'forme_change') {
    const formSpecies = String(ev.toSpecies || '').trim();
    if (formSpecies) {
      const baseSpecies = mon?.baseSpecies || mon?.originalData?.baseSpecies || formSpecies;
      const formSpriteId = getAutoSpriteIdForSpecies(formSpecies, mon?.gender || '', baseSpecies);
      if (formSpriteId) {
        spriteId = formSpriteId;
        shiny = Boolean(mon?.shiny);
      }
    }
  }
  if (!spriteId && mon) {
    spriteId = resolveBattleRenderSpriteId(mon);
    shiny = Boolean(mon.shiny);
  }
  const facing = sideIndex === perspective ? 'back' : 'front';
  const spriteUrl = spriteId ? spritePath(spriteId, facing, shiny) : '';
  const localPlayerIndex = playerSide === 'p2' ? 1 : 0;
  const localUi = getBattleUiState(battle);
  const localUiMode = localUi?.modeByPlayer?.[localPlayerIndex] || '';
  const formChangePresentation = ev.type === 'forme_change'
    ? resolveFormChangePresentation(ev, {
      playerSide,
      side,
      isActive,
      isVisible,
      uiMode: localUiMode,
    })
    : null;
  return {
    side,
    slot: sideSlot.slot,
    spriteUrl,
    infoPatch: Object.keys(infoPatch).length ? infoPatch : null,
    formChangePresentation,
  };
}

function collectTimelineInitialSlotInfo(battle = state.battle) {
  const initialSlotInfo = {};
  if (!battle?.players) return initialSlotInfo;
  battle.players.forEach((side, index) => {
    const sideId = index === 1 ? 'p2' : 'p1';
    (side.active || []).forEach((teamIndex, slot) => {
      const mon = side.team?.[teamIndex];
      if (!mon) return;
      initialSlotInfo[`${sideId}_${slot}`] = buildBattleInfoModelFromMon(mon, index);
    });
  });
  return initialSlotInfo;
}

function primeTimelineSpriteOverrides(events = [], battle = state.battle) {
  clearTimelineSpriteOverrides();
  if (!Array.isArray(events) || !events.length) return;
  events
    .filter(ev => ev?.type === 'switch_in' && (ev.side === 'p1' || ev.side === 'p2'))
    .forEach(ev => {
      const override = resolveTimelineSwitchSpriteOverride(ev, battle);
      if (override) setTimelineSpriteOverride(ev.side, override);
    });
}

async function playTimelineAcrossActiveViews(events = [], { initialNames = {}, initialSlotInfo = {}, onComplete = () => {}, onInputRequired = () => {}, preHideSwitchInSides = false } = {}) {
  // Do not trigger an immediate render here: at turn-resolution time state.battle
  // already points to the adopted post-turn snapshot, and forcing a render would
  // pre-apply HP/sprite end-state before timeline animations play.
  setBattleInputLocked(true, state.battle, { rerender: false });
  // Keep selection windows hidden immediately even when full battle re-render is skipped.
  forceBattleMessageOnlyUiDuringLock(state.battle);
  let completed = false;
  clearTimelineSpriteOverrides();
  if (!Array.isArray(events) || !events.length) {
    setBattleInputLocked(false, state.battle, { rerender: false });
    completed = true;
    onComplete();
    return;
  }
  try {
    const localeEnabled = FLAGS.battleLocaleV1 === true;
    const localeLanguage = state.language || 'ko';
    if (localeEnabled) {
      battleLocaleManager.setLanguage(localeLanguage);
      await battleLocaleManager.loadLocale(localeLanguage);
    }
    primeTimelineSpriteOverrides(events, state.battle);
    const configs = getTimelineExecutorConfigs().filter(cfg => cfg.scene());
    if (!configs.length) {
      setBattleInputLocked(false, state.battle, { rerender: false });
      completed = true;
      onComplete();
      return;
    }
    let inputHandled = false;
    const handleInputRequired = requestType => {
      if (inputHandled) return;
      inputHandled = true;
      onInputRequired(requestType);
    };
    const switchInSides = [...new Set(
      events
        // Mid-turn switch_in preloading can pre-hide/pre-swap battlers too early.
        // Only pre-prepare sides when caller explicitly asks for pre-hide flow
        // (initial battle summon sequence).
        .filter(ev => preHideSwitchInSides && ev?.type === 'switch_in' && ev?.fromBall)
        .map(ev => ev.side)
        .filter(side => side === 'p1' || side === 'p2')
    )];
    if (switchInSides.length) {
      await Promise.all(configs.flatMap(cfg => {
        const scene = cfg.scene?.();
        if (!scene?.prepareSwitchInBattler) return [];
        const perspective = cfg.playerSide === 'p2' ? 1 : 0;
        return switchInSides.map(async side => {
          const override = getTimelineSpriteOverride(side);
          if (!override?.spriteId) return;
          const sideIndex = side === 'p2' ? 1 : 0;
          const facing = sideIndex === perspective ? 'back' : 'front';
          const spriteUrl = spritePath(override.spriteId, facing, Boolean(override.shiny));
          try {
            await scene.prepareSwitchInBattler(side, spriteUrl);
          } catch (_error) {}
        });
      }));
    }
    if (preHideSwitchInSides) {
      const switchSides = [...new Set(
        events
          .filter(ev => ev?.type === 'switch_in' && ev?.fromBall)
          .map(ev => ev.side)
          .filter(side => side === 'p1' || side === 'p2')
      )];
      for (const cfg of configs) {
        const scene = cfg.scene?.();
        if (!scene?.concealBattler) continue;
        switchSides.forEach(side => {
          try { scene.concealBattler(side); } catch (_error) {}
        });
      }
    }
    const executors = configs.map(cfg => new BattleTimelineExecutor({
      onComplete: () => {},
      applySnapshot: () => {},
      onInputRequired: handleInputRequired,
      initialNames,
      initialSlotInfo,
      localeManager: localeEnabled ? battleLocaleManager : null,
      localeLanguage,
      resolveVisualState: ev => resolveTimelineEventVisualState(ev, {
        playerSide: cfg.playerSide,
        battle: state.battle,
        initialNames,
      }),
      // BA-26: battle-facing species display uses base species (form prefix/suffix hidden)
      localizeMonName: name => localizeBattleSpeciesName(name) || name,
      // BA-26 exception: forme_change presentation message should keep form labels.
      localizeMonNameWithForm: name => displaySpeciesName(name) || name,
      localizeMoveName: name => displayMoveName(name) || name,
      localizeAbilityName: name => displayAbilityName(name) || name,
      ...cfg,
    }));
    await Promise.all(executors.map(executor => executor.play(events)));
    setBattleInputLocked(false, state.battle, { rerender: false });
    completed = true;
    onComplete();
  } finally {
    if (!completed && isBattleInputLocked(state.battle)) {
      setBattleInputLocked(false, state.battle, { rerender: true });
    }
  }
}

function hidePhaserBattleRenderers() {
  [0, 1].forEach(player => {
    try { getPhaserBattleRenderer(player)?.hide?.(); } catch (_error) {}
  });
}

function destroyPhaserBattleRenderers() {
  [0, 1].forEach(player => {
    try { getPhaserBattleRenderer(player)?.destroy?.(); } catch (_error) {}
    phaserBattleRenderers[player] = null;
  });
}

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
    return `로컬 Showdown 엔진 / Local Showdown engine: 연결됨 / connected (${status.engine || 'local Node service'})<br>${lang('싱글 배틀은 이 번들된 로컬 Node 엔진이 있을 때만 시작할 수 있습니다.', 'Singles battles only start when this bundled local Node engine is available.')}`;
  }
  if (status.bundledNodeServer) {
    return `로컬 Showdown 엔진 / Local Showdown engine: 현재 사용할 수 없음 / currently unavailable<br>${lang('이 페이지는 번들된 Node 서버에서 열렸지만 엔진 API 확인에 실패했습니다. 정확한 싱글 배틀은 차단되며, 팀 빌더만 계속 사용할 수 있습니다.', 'This page is running through the bundled Node server, but the engine API check failed. Accurate singles battles are blocked, while the team builder remains available.')}${status.error ? `<br>Probe error: ${status.error}` : ''}`;
  }
  return `로컬 Showdown 엔진 / Local Showdown engine: 정적 미리보기에서는 자동 확인하지 않음 / not auto-probed in static preview<br>${lang('현재 페이지는 번들된 Node 서버가 아닌 정적 미리보기/파일 경로에서 열려 있으므로 `npm start`로 로컬 서버를 띄우기 전까지 싱글 배틀을 시작하지 않습니다. 팀 빌더와 선택 UI는 계속 사용할 수 있습니다.', 'This page is being opened from a static preview or file path instead of the bundled Node server, so singles battles will not start until you run `npm start` and open the local server build. The team builder and selection UI stay available.')}`;
}

function getEngineAuthoritativeSinglesRuntimeDescriptor() {
  return {
    id: 'engine-authoritative-singles',
    title: lang('엔진 필수 싱글', 'Engine-required singles'),
    badge: lang('엔진 싱글', 'Engine singles'),
    badgeTone: 'ready',
    heroLabel: lang('로컬 Showdown 싱글 엔진 필수', 'Local Showdown singles required'),
    detail: `${buildShowdownStatusNote()}<br>${lang('싱글 배틀 판정의 실제 기준은 브라우저 커스텀 로직이 아니라 번들된 로컬 Node 엔진입니다.', 'Singles battle resolution is driven by the bundled local Node engine rather than browser custom logic.')}<br>${lang('다이맥스 토글은 엔진 요청에 canDynamax가 제공되는 포맷에서만 노출됩니다.', 'The Dynamax toggle appears only in formats where engine requests provide canDynamax.')}`,
    startAllowed: true,
    startBlockedReason: '',
    startMessage: lang('로컬 Showdown 엔진 필수 싱글 배틀을 시작합니다.', 'Starting an engine-required singles battle through the local Showdown engine.'),
  };
}

function getBlockedSinglesRuntimeDescriptor(extraReason = '') {
  const reasonLine = extraReason ? `<br>${extraReason}` : '';
  return {
    id: 'blocked-singles-awaiting-engine',
    title: lang('싱글 대기 중', 'Singles waiting for engine'),
    badge: lang('엔진 필요', 'Engine required'),
    badgeTone: 'warning',
    heroLabel: lang('로컬 엔진이 필요한 싱글', 'Singles require the local engine'),
    detail: `${buildShowdownStatusNote()}<br>${lang('지원되는 싱글 배틀은 번들된 로컬 엔진이 준비된 경우에만 열립니다.', 'Supported singles battles only open when the bundled local engine is available.')}<br>${lang('다이맥스 토글은 엔진 요청에 canDynamax가 제공되는 포맷에서만 노출됩니다.', 'The Dynamax toggle appears only in formats where engine requests provide canDynamax.')}${reasonLine}`,
    startAllowed: false,
    startBlockedReason: lang('싱글 배틀은 번들된 로컬 Showdown 엔진이 준비된 경우에만 시작할 수 있습니다.', 'Singles battles can start only when the bundled local Showdown engine is available.'),
    startMessage: '',
  };
}

function getBlockedDoublesRuntimeDescriptor() {
  return {
    id: 'blocked-doubles-awaiting-engine',
    title: lang('더블 마이그레이션 대기 중', 'Doubles migration pending'),
    badge: lang('더블 보류', 'Doubles blocked'),
    badgeTone: 'warning',
    heroLabel: lang('엔진 마이그레이션 전 더블', 'Doubles awaiting engine migration'),
    detail: `${lang('더블은 아직 로컬 엔진으로 마이그레이션되지 않았습니다.', 'Doubles have not been migrated to the local engine yet.')}<br>${lang('팀 빌더와 선택 UI는 계속 사용할 수 있지만, 실제 더블 배틀 시작은 엔진 경로가 준비될 때까지 차단됩니다.', 'The team builder and selection UI remain available, but actual doubles battle start stays blocked until an engine-backed path is ready.')}<br>${lang('지원되지 않는 브라우저 배틀 실행 경로는 사용자용 정상 모드로 노출하지 않습니다.', 'Unsupported browser battle execution paths are not exposed as user-facing normal modes.')}<br>${lang('다이맥스 토글은 엔진 요청에 canDynamax가 제공되는 포맷에서만 노출됩니다.', 'The Dynamax toggle appears only in formats where engine requests provide canDynamax.')}`,
    startAllowed: false,
    startBlockedReason: lang('더블 배틀은 아직 엔진 기반 경로가 없으므로 현재 빌드에서는 시작할 수 없습니다.', 'Doubles battles cannot start in the current build because there is no engine-backed path yet.'),
    startMessage: '',
  };
}

function getSelectedBattleRuntimeDescriptor() {
  if (state.mode === 'singles') {
    return state.showdownLocal?.available
      ? getEngineAuthoritativeSinglesRuntimeDescriptor()
      : getBlockedSinglesRuntimeDescriptor();
  }
  return getBlockedDoublesRuntimeDescriptor();
}

function applyBattleRuntimeInfo(battle, descriptor) {
  if (!battle || !descriptor) return battle;
  battle.runtimeInfo = {
    id: descriptor.id,
    title: descriptor.title,
    badge: descriptor.badge,
    badgeTone: descriptor.badgeTone,
    heroLabel: descriptor.heroLabel,
    detail: descriptor.detail,
    engineAuthoritative: descriptor.id === 'engine-authoritative-singles',
    availability: descriptor.startAllowed ? 'available' : 'blocked',
  };
  battle.sourceOfTruth = battle.runtimeInfo.engineAuthoritative ? 'engine' : 'blocked-no-runtime';
  return battle;
}

function getDisplayedRuntimeDescriptor() {
  const runtimeId = state.battle?.runtimeInfo?.id || '';
  if (runtimeId === 'engine-authoritative-singles') return getEngineAuthoritativeSinglesRuntimeDescriptor();
  if (runtimeId === 'blocked-singles-awaiting-engine') return getBlockedSinglesRuntimeDescriptor();
  if (runtimeId === 'blocked-doubles-awaiting-engine') return getBlockedDoublesRuntimeDescriptor();
  return getSelectedBattleRuntimeDescriptor();
}

function syncRuntimeModeUi() {
  const selected = getSelectedBattleRuntimeDescriptor();
  const displayed = getDisplayedRuntimeDescriptor();
  if (els.heroEngineValue) els.heroEngineValue.textContent = localizeText(selected.heroLabel);
  if (els.runtimeModeBadge) {
    els.runtimeModeBadge.textContent = localizeText(selected.badge);
    els.runtimeModeBadge.className = `turn-chip ${selected.badgeTone || ''}`.trim();
  }
  if (els.runtimeModeTitle) els.runtimeModeTitle.textContent = localizeText(selected.title);
  if (els.runtimeModeDetail) {
    els.runtimeModeDetail.innerHTML = String(selected.detail || '').split('<br>').map(part => localizeText(part)).join('<br>');
  }
  if (els.battleRuntimeChip) {
    if (state.battle) {
      els.battleRuntimeChip.hidden = false;
      els.battleRuntimeChip.textContent = localizeText(displayed.badge || displayed.title || 'Runtime');
      els.battleRuntimeChip.className = `turn-chip ${displayed.badgeTone || ''}`.trim();
      els.battleRuntimeChip.title = localizeText(displayed.title || '');
    } else {
      els.battleRuntimeChip.hidden = true;
    }
  }
}

function runtimeSupportsDynamax() {
  const battle = state.battle;
  if (!battle?.players) return false;
  const hasRequestToggle = battle.players.some((_, player) => {
    const request = getEngineRequestForPlayer(player, battle);
    if (!request?.active || !Array.isArray(request.active)) return false;
    return request.active.some(entry => Boolean(entry?.canDynamax));
  });
  if (hasRequestToggle) return true;
  const formatId = String(battle?.engineMeta?.formatid || '').toLowerCase();
  return formatId.startsWith('gen8');
}

function canUseDynamaxNow(moveRequest = null) {
  return Boolean(moveRequest?.canDynamax && runtimeSupportsDynamax());
}

function getDynamaxUnavailableReason(moveRequest = null) {
  if (canUseDynamaxNow(moveRequest)) return '';
  if (!runtimeSupportsDynamax()) {
    return lang(
      '현재 배틀 포맷에서는 다이맥스를 사용할 수 없습니다.',
      'Dynamax is unavailable in the current battle format.'
    );
  }
  return lang(
    '이 턴에는 다이맥스를 사용할 수 없습니다.',
    'Dynamax is unavailable for this turn.'
  );
}

const UI_STRINGS = Object.freeze({
  ko: {
    title: 'PKB — 포켓몬 로컬 배틀 빌더',
    hero_eyebrow: '로컬 2인 배틀 프로토타입',
    hero_copy: '업로드한 스프라이트와 로컬 배틀 데이터를 불러와 두 팀을 직접 만든 뒤, 브라우저에서 바로 번갈아 조작하는 배틀을 플레이합니다.',
    lang_label: '언어',
    meta_mode: '배틀 모드',
    meta_engine: '엔진',
    meta_engine_value: '로컬 Showdown 엔진 필수 싱글',
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
    meta_engine_value: 'Local Showdown engine required for singles',
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
function resolveDexEntityName(kind, rawValue = '') {
  const raw = String(rawValue || '').trim();
  if (!raw) return '';
  const dexCollection = kind === 'moves'
    ? state.dex?.moves
    : kind === 'abilities'
      ? state.dex?.abilities
      : kind === 'species'
        ? state.dex?.species
        : kind === 'items'
          ? state.dex?.items
          : null;
  const tryGet = (candidate = '') => {
    if (!candidate || !dexCollection?.get) return '';
    const entry = dexCollection.get(candidate);
    return entry?.exists && entry?.name ? entry.name : '';
  };
  const direct = tryGet(raw);
  if (direct) return direct;
  const id = toId(raw);
  if (id) {
    const byId = tryGet(id);
    if (byId) return byId;
  }
  if (kind === 'moves' && id) {
    // Showdown request sometimes sends pseudo ids like return102/frustration102.
    const stripped = id.replace(/\d+$/, '');
    if (stripped && stripped !== id) {
      const byStripped = tryGet(stripped);
      if (byStripped) return byStripped;
    }
  }
  return raw;
}
function resolveCanonicalDisplayName(kind, english = '') {
  const raw = String(english || '').trim();
  if (!raw) return '';
  if (kind === 'moves' || kind === 'abilities' || kind === 'species' || kind === 'items') {
    return resolveDexEntityName(kind, raw);
  }
  return raw;
}
const EXPLICIT_ITEM_ALIAS_REVERSE = new Map(Object.entries(EXTERNALLY_VERIFIED_ITEM_KO_ALIASES || {}).flatMap(([english, aliases]) => (aliases || []).map(alias => [normalizeSearchKey(alias), english])));
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
  Droopy: '처진모습',
  Stretchy: '뻗은모습',
  Roaming: '배회폼',
  Artisan: '진품',
  Masterpiece: '걸작',
  Terastal: '테라스탈',
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
function getGeneratedItemSearchAliases(english = '') {
  const aliases = new Set(EXTERNALLY_VERIFIED_ITEM_KO_ALIASES?.[english] || []);
  const item = state.dex?.items?.get?.(english);
  if (item?.exists && item.megaStone) {
    const itemUsers = Array.isArray(item.itemUser) ? item.itemUser.filter(Boolean) : [];
    const candidateUser = itemUsers[0] || Object.keys(item.megaStone || {})[0] || '';
    const userSpecies = candidateUser ? state.dex?.species?.get?.(candidateUser) : null;
    const baseSpecies = userSpecies?.exists ? (userSpecies.baseSpecies || userSpecies.name) : candidateUser;
    const baseKorean = getLocalizedName('species', baseSpecies || '');
    const suffixMatch = String(english || '').match(/\s*([XYZ])$/i);
    const suffix = suffixMatch ? suffixMatch[1].toUpperCase() : '';
    if (baseKorean && hasHangul(baseKorean)) aliases.add(`${baseKorean}나이트${suffix}`);
  }
  return Array.from(aliases);
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
  if (kind === 'items') {
    for (const alias of getGeneratedItemSearchAliases(english)) candidates.add(alias);
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
  refreshOpenPickerForCurrentLanguage();
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
  const canonicalEnglish = resolveCanonicalDisplayName('species', english) || String(english || '');
  const speciesData = state.dex?.species?.get?.(canonicalEnglish);
  const baseEnglish = speciesData?.exists ? (speciesData.baseSpecies || speciesData.name) : String(canonicalEnglish).split('-')[0];
  const baseKorean = LOCALIZED_NAME_MAPS?.species?.[baseEnglish] || KO_NAME_MAPS?.species?.[baseEnglish] || baseEnglish;
  const forme = speciesData?.forme || (String(canonicalEnglish).includes('-') ? String(canonicalEnglish).split('-').slice(1).join('-') : '');
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
  const canonicalEnglish = resolveCanonicalDisplayName(kind, english) || String(english || '');
  const localized = LOCALIZED_NAME_MAPS?.[kind]?.[english]
    || LOCALIZED_NAME_MAPS?.[kind]?.[canonicalEnglish]
    || KO_NAME_MAPS?.[kind]?.[english]
    || KO_NAME_MAPS?.[kind]?.[canonicalEnglish]
    || '';
  if (kind === 'species' && isSuspiciousLocalization(canonicalEnglish, localized)) return getLocalizedSpeciesFallback(canonicalEnglish) || canonicalEnglish;
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
}
function displayEntity(kind, english) {
  if (!english) return '';
  const canonicalEnglish = resolveCanonicalDisplayName(kind, english) || String(english || '');
  return bilingualLabel(getLocalizedName(kind, canonicalEnglish), canonicalEnglish);
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
  if (kind === 'items') {
    const extra = EXPLICIT_ITEM_ALIAS_REVERSE.get(normalizeSearchKey(raw));
    if (extra) return extra;
  }
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
  if (mode === 'item') {
    const support = getItemUiSupport(option.english);
    const tags = [];
    if (support.isCurrentOfficialOverride) tags.push(lang('최신 공식 반영', 'Current official'));
    if (support.isMegaStone) tags.push(lang('메가스톤', 'Mega Stone'));
    if (support.isZCrystal) tags.push(lang('Z크리스탈', 'Z-Crystal'));
    if (support.isFormLinked && !support.isMegaStone && !support.isZCrystal) tags.push(lang('폼 연동', 'Form-linked'));
    if (support.isNonstandard === 'Past') tags.push(lang('Past 허용', 'Past allowed'));
    return [alternate, tags.join(' · ')].filter(Boolean).join(' · ');
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
  const mode = state.picker?.mode || '';
  const detailEnabled = mode === 'move' || mode === 'item';
  els.pickerDetail.classList.toggle('hidden', !detailEnabled);
  if (els.pickerDetailPlaceholder) {
    if (mode === 'item') els.pickerDetailPlaceholder.textContent = lang('도구 상세를 보려면 도구의 정보 버튼을 누르세요.', 'Press an item info button to inspect its details.');
    else els.pickerDetailPlaceholder.textContent = lang('기술 상세를 보려면 기술의 정보 버튼을 누르세요.', 'Press a move info button to inspect its details.');
    els.pickerDetailPlaceholder.classList.toggle('hidden', !detailEnabled);
  }
  els.pickerDetailContent?.classList.add('hidden');
  if (els.pickerDetailName) els.pickerDetailName.textContent = '—';
  if (els.pickerDetailAlt) els.pickerDetailAlt.textContent = '—';
  clearPickerDetailIcon();
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
function getPickerConfig(mode, moveIndex = null, mon = getSelectedMon()) {
  let options = [];
  let title = lang('선택', 'Select');
  let emptyHint = lang('검색 결과가 없습니다.', 'No results found.');
  if (mode === 'species') {
    options = state.speciesChoices || [];
    title = lang('포켓몬 선택', 'Choose Pokémon');
  } else if (mode === 'move') {
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
    options = getCurrentAbilityChoices(mon);
    title = lang('특성 선택', 'Choose Ability');
    if (!mon?.data) emptyHint = lang('먼저 포켓몬을 선택하면 특성 목록이 표시됩니다.', 'Choose a species first to load its abilities.');
  } else if (mode === 'nature') {
    options = getNatureChoices();
    title = lang('성격 선택', 'Choose Nature');
  }
  return {mode, moveIndex, options, title, emptyHint};
}
function refreshOpenPickerForCurrentLanguage() {
  if (!els.pickerModal || els.pickerModal.classList.contains('hidden')) return;
  const previousPicker = state.picker || {};
  const config = getPickerConfig(previousPicker.mode, previousPicker.moveIndex, getSelectedMon());
  state.picker = {
    ...previousPicker,
    ...config,
    detailOption: previousPicker.detailOption || null,
  };
  if (els.pickerTitle) els.pickerTitle.textContent = config.title;
  renderPickerOptions();
  if (config.mode === 'move' || config.mode === 'item') {
    const detailEnglish = previousPicker.detailOption?.english;
    if (detailEnglish) {
      const matched = (state.picker.options || []).find(option => toId(option?.english) === toId(detailEnglish));
      const detailOption = matched || makeChoice(config.mode === 'move' ? 'moves' : 'items', detailEnglish);
      if (config.mode === 'move') renderMoveDetail(detailOption);
      else renderItemDetail(detailOption);
    } else {
      resetPickerDetail();
    }
  } else {
    resetPickerDetail();
  }
}
function showPicker(mode, moveIndex = null, triggerEl = null) {
  const config = getPickerConfig(mode, moveIndex, getSelectedMon());
  pickerReturnFocusEl = triggerEl && typeof triggerEl.focus === 'function'
    ? triggerEl
    : (document.activeElement && typeof document.activeElement.focus === 'function' ? document.activeElement : null);
  state.picker = {
    mode: config.mode,
    moveIndex: config.moveIndex,
    options: config.options,
    emptyHint: config.emptyHint,
    detailOption: null,
  };
  els.pickerTitle.textContent = config.title;
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
    if (picker.mode === 'move' || picker.mode === 'item') {
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
        if (picker.mode === 'move') renderMoveDetail(option);
        else renderItemDetail(option);
      });
    } else {
      wrap.innerHTML = `<button type="button" class="picker-option-select">${subtitle ? `<strong>${option.display}</strong><small>${subtitle}</small>` : `<strong>${option.display}</strong>`}</button>`;
      wrap.querySelector('.picker-option-select')?.addEventListener('click', applyOption);
    }
    els.pickerList.appendChild(wrap);
  }
  const detailStillVisible = picker.detailOption && filtered.some(option => toId(option.english) === toId(picker.detailOption.english));
  if (detailStillVisible) {
    if (picker.mode === 'move') renderMoveDetail(picker.detailOption);
    else if (picker.mode === 'item') renderItemDetail(picker.detailOption);
  } else if (picker.mode === 'move' || picker.mode === 'item') resetPickerDetail();
}
function dataSourceLabel() {
  return state.dex ? `Local Dex ${state.dexVersion || ''}`.trim() : state.dataProvider;
}
function explainNonstandard(value) {
  return NONSTANDARD_REASON_LABELS[value] || `is marked as ${value} in the loaded data.`;
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
  // Linux 파일시스템은 대소문자 구분 — Icons 폴더 파일명은 모두 대문자 (예: KLEFKI.png)
  return `${state.assetBase.pokemon}/${folder}/${(spriteId || '').toUpperCase()}.png`;
}
function resolveBattleDisplayBaseSpecies(speciesName = '') {
  const raw = String(speciesName || '').trim();
  if (!raw) return '';
  const normalized = normalizeLocalizedInput('species', raw, state.allSpeciesChoices || state.speciesChoices || []);
  const speciesData = state.dex?.species?.get?.(normalized);
  if (speciesData?.exists) return speciesData.baseSpecies || speciesData.name || normalized;
  return normalized || raw;
}
function getBattleDisplaySpeciesName(mon, fallback = 'Pokémon') {
  if (!mon) return fallback;
  const raw = String(
    mon.baseSpecies
    || mon.originalData?.baseSpecies
    || mon.data?.baseSpecies
    || mon.species
    || mon.formSpecies
    || mon.displaySpecies
    || mon.originalData?.name
    || fallback
  ).trim();
  return resolveBattleDisplayBaseSpecies(raw) || fallback;
}
function localizeBattleSpeciesName(speciesName = '') {
  const baseSpecies = resolveBattleDisplayBaseSpecies(speciesName);
  return displaySpeciesName(baseSpecies || speciesName);
}
function displayBattleSpeciesName(mon, fallback = 'Pokémon') {
  return displaySpeciesName(getBattleDisplaySpeciesName(mon, fallback));
}
function getBattleRenderSpeciesName(mon) {
  if (!mon) return '';
  const directSpecies = mon.formSpecies || mon.species || mon.displaySpecies || mon.originalData?.name || mon.baseSpecies || mon.originalData?.baseSpecies || '';
  const specialLinkedSpecies = resolveSpecialLinkedFormSpeciesForMon(mon, mon.baseSpecies || mon.originalData?.baseSpecies || directSpecies);
  return specialLinkedSpecies || directSpecies;
}
function doesSpriteIdMatchSpeciesFamily(spriteId, speciesName = '', baseSpeciesName = '') {
  if (!spriteId) return false;
  const family = getFamilyForSpecies(speciesName || baseSpeciesName);
  if (!family?.assetFamily) return false;
  const spriteIdKey = String(spriteId || '').trim();
  if (!spriteIdKey) return false;
  if (family.assetFamily.baseExists && family.assetBaseId === spriteIdKey) return true;
  if (family.assetFamily.rawAssetIds?.includes(spriteIdKey)) return true;
  return false;
}
function resolveBattleRenderSpriteId(mon) {
  if (!mon) return '';
  const speciesName = getBattleRenderSpeciesName(mon);
  const baseSpeciesName = mon.baseSpecies || mon.originalData?.baseSpecies || speciesName;
  const isTransformedSpecies = Boolean(toId(speciesName) && toId(baseSpeciesName) && toId(speciesName) !== toId(baseSpeciesName));
  const gigantamaxSprite = mon.dynamaxed && mon.gigantamaxed ? getGigantamaxAssetId(mon) : '';
  const snapshotFormSprite = [
    mon.megaUsed && mon.megaSpriteId && (!mon.megaSpecies || toId(mon.megaSpecies) === toId(speciesName)) ? mon.megaSpriteId : '',
    mon.primalSpriteId && (!mon.primalSpecies || toId(mon.primalSpecies) === toId(speciesName)) ? mon.primalSpriteId : '',
    mon.ultraSpriteId && (!mon.ultraSpecies || toId(mon.ultraSpecies) === toId(speciesName)) ? mon.ultraSpriteId : '',
  ].find(Boolean) || '';
  const exactAutoSpriteId = getAutoSpriteIdForSpecies(speciesName, mon.gender || '', baseSpeciesName);
  if (gigantamaxSprite) return gigantamaxSprite;
  if (isTransformedSpecies && exactAutoSpriteId && doesSpriteIdMatchSpeciesFamily(exactAutoSpriteId, speciesName, baseSpeciesName)) return exactAutoSpriteId;
  if (snapshotFormSprite && doesSpriteIdMatchSpeciesFamily(snapshotFormSprite, speciesName, baseSpeciesName)) return snapshotFormSprite;
  const candidate = mon.spriteId || mon.spriteAutoId || '';
  if (doesSpriteIdMatchSpeciesFamily(candidate, speciesName, baseSpeciesName)) return candidate;
  if (exactAutoSpriteId && doesSpriteIdMatchSpeciesFamily(exactAutoSpriteId, speciesName, baseSpeciesName)) return exactAutoSpriteId;
  return snapshotFormSprite || candidate || exactAutoSpriteId || '';
}
function normalizeBattleMonSprite(mon) {
  if (!mon) return mon;
  const resolvedSpriteId = resolveBattleRenderSpriteId(mon);
  if (!resolvedSpriteId) return mon;
  if (mon.spriteId !== resolvedSpriteId) mon.spriteId = resolvedSpriteId;
  if (!mon.spriteAutoId || !doesSpriteIdMatchSpeciesFamily(mon.spriteAutoId, getBattleRenderSpeciesName(mon), mon.baseSpecies || mon.originalData?.baseSpecies || '')) {
    mon.spriteAutoId = resolvedSpriteId;
  }
  return mon;
}
function parseEngineRequestEntryShiny(entry) {
  if (!entry) return null;
  if (typeof entry.shiny === 'boolean') return entry.shiny;
  const details = String(entry.details || '').trim();
  if (!details) return null;
  return /(?:^|,\s*)shiny(?:,|$)/i.test(details);
}
function normalizeBattleShinyState(battle) {
  if (!battle?.players) return battle;
  battle.players.forEach((side, player) => {
    const requestEntries = getEngineRequestSideEntries(player, battle);
    if (!requestEntries.length) return;
    requestEntries.forEach((entry, requestIndex) => {
      const teamIndex = Number.isInteger(entry?.teamIndex) ? entry.teamIndex : requestIndex;
      const mon = side?.team?.[teamIndex];
      if (!mon) return;
      const requestShiny = parseEngineRequestEntryShiny(entry);
      if (typeof requestShiny === 'boolean') mon.shiny = requestShiny;
    });
  });
  return battle;
}
function normalizeBattleSpriteState(battle) {
  if (!battle?.players) return battle;
  normalizeBattleShinyState(battle);
  battle.players.forEach(side => {
    (side?.team || []).forEach(mon => normalizeBattleMonSprite(mon));
  });
  return battle;
}
function getBattleActiveIndices(player, battle = state.battle) {
  const side = battle?.players?.[player];
  if (!side) return [];
  const requestEntries = getEngineRequestSideEntries(player, battle);
  const requestActive = requestEntries
    .filter(entry => entry?.active)
    .map(entry => Number(entry.teamIndex))
    .filter(index => Number.isInteger(index) && index >= 0);
  if (requestActive.length) return requestActive;
  return Array.isArray(side.active) ? side.active.filter(index => Number.isInteger(index) && index >= 0) : [];
}
function getItemUiSupport(itemName = '') {
  const english = normalizeLocalizedInput('items', itemName, state.itemChoices || []) || String(itemName || '').trim();
  const slug = slugify(english);
  const item = state.dex?.items?.get?.(english || itemName || '') || null;
  const existsInDex = Boolean(item?.exists);
  const isExposed = Boolean((state.itemChoices || []).some(choice => toId(choice?.english) === toId(english)));
  const isCurrentOfficialOverride = Boolean(item?.isNonstandard === 'Future' && CURRENT_OFFICIAL_ITEM_ID_SET.has(toId(item?.name || english)));
  const isKnownCurrentButAbsentLocally = !existsInDex && CURRENT_OFFICIAL_ABSENT_ITEM_ID_SET.has(slug);
  const isZCrystal = Boolean(item?.zMove || item?.zMoveType || item?.zMoveFrom);
  const isMegaStone = Boolean(item?.megaStone);
  const isFormLinked = Boolean(item?.itemUser?.length || /(?:plate|memory|drive|mask|orb|core|globe|rusted|griseous)/i.test(String(item?.id || slug)));
  return {
    english,
    slug,
    existsInDex,
    isExposed,
    isZCrystal,
    isMegaStone,
    isCurrentOfficialOverride,
    isKnownCurrentButAbsentLocally,
    isFormLinked,
    isNonstandard: item?.isNonstandard || '',
    item,
  };
}

function renderItemIconPreview(container, itemName, options = {}) {
  if (!container) return;
  const cleanName = String(itemName || '').trim();
  const token = `${cleanName}|${Date.now()}|${Math.random().toString(36).slice(2)}`;
  container.dataset.itemIconToken = token;
  container.innerHTML = '';
  container.hidden = !cleanName || /^no item$/i.test(cleanName);
  if (container.hidden) return;

  const iconWrap = document.createElement('span');
  iconWrap.className = 'item-chip-media';
  iconWrap.textContent = '…';
  container.appendChild(iconWrap);

  const labelText = options.label || '';
  if (labelText) {
    const label = document.createElement('span');
    label.className = 'item-chip-label';
    label.textContent = labelText;
    container.appendChild(label);
  }

  resolveItemIconUrl(cleanName).then(url => {
    if (!container.isConnected || container.dataset.itemIconToken !== token) return;
    iconWrap.innerHTML = '';
    if (!url) {
      iconWrap.classList.add('missing');
      iconWrap.textContent = '?';
      if (options.hideWhenMissing) container.hidden = true;
      return;
    }
    const image = document.createElement('img');
    image.src = url;
    image.alt = options.alt || displayItemName(cleanName);
    image.loading = 'lazy';
    iconWrap.classList.remove('missing');
    iconWrap.appendChild(image);
  });
}

function renderSelectedItemPreview(mon) {
  if (!els.editorItemPreview) return;
  renderItemIconPreview(els.editorItemPreview, mon?.item || '', {
    label: mon?.item ? displayItemName(mon.item) : '',
    hideWhenMissing: false,
  });
}

function clearPickerDetailIcon() {
  if (!els.pickerDetailIcon) return;
  els.pickerDetailIcon.innerHTML = '';
  els.pickerDetailIcon.hidden = true;
}

async function renderTeraButtonIcon(element, teraType = '') {
  if (!element) return;
  const typeId = toId(teraType || 'unknown') || 'unknown';
  element.classList.remove('missing');
  element.textContent = '';
  const ok = await applyPokerogueAtlasFrameToElement(element, 'button_tera', typeId, {width: 24, height: 28});
  if (!ok) {
    element.classList.add('missing');
    element.textContent = 'T';
  }
}

function getPokerogueAssetAuditSummary() {
  return {
    items: POKEROGUE_ASSET_PATHS.pokerogueItems.slice(),
    ui: POKEROGUE_ASSET_PATHS.ui.slice(),
    effects: POKEROGUE_ASSET_PATHS.effects.slice(),
    arenas: POKEROGUE_ASSET_PATHS.arenas.slice(),
    battleAnims: POKEROGUE_ASSET_PATHS.battleAnims.slice(),
    animData: POKEROGUE_ASSET_PATHS.animData.slice(),
    fonts: POKEROGUE_ASSET_PATHS.fonts.slice(),
  };
}

function buildItemSupportSummary(itemName = '') {
  const support = getItemUiSupport(itemName);
  if (!slugify(itemName)) return lang('지닌 도구가 없습니다.', 'No held item selected.');
  const lines = [];
  if (support.existsInDex) {
    lines.push(lang(
      '이 아이템은 현재 로컬 Dex 데이터에 존재하며 빌더와 엔진 필수 싱글 경로에서 그대로 사용됩니다.',
      'This item exists in the current local Dex data and is used directly by the builder and the engine-required singles path.'
    ));
  } else if (support.isKnownCurrentButAbsentLocally) {
    lines.push(lang(
      '이 아이템은 외부 기준으로 현재 아이템으로 분류되지만, 현재 로컬 데이터 번들에는 아직 없어 빌더에서 노출되지 않습니다.',
      'This item is treated as a current item by the external verification list, but it is not yet present in the local data bundle and therefore is not exposed in the builder.'
    ));
  } else {
    lines.push(lang(
      '이 아이템은 현재 로컬 Dex 데이터에서 확인되지 않았습니다.',
      'This item could not be confirmed in the current local Dex data.'
    ));
  }
  if (support.isCurrentOfficialOverride) {
    lines.push(lang(
      '로컬 데이터에는 아직 Future로 남아 있지만, 외부 검증 기준으로 현재 공식 아이템으로 분류되어 빌더에서 허용됩니다.',
      'It is still tagged Future in the local data, but it is treated as a current official item by the external verification baseline and is therefore allowed in the builder.'
    ));
  } else if (support.isNonstandard === 'Past') {
    lines.push(lang(
      '로컬 데이터에서 Past로 분류되어 있으며, 현재 빌더 정책상 계속 허용됩니다.',
      'It is marked Past in the local data and remains allowed under the current builder policy.'
    ));
  }
  if (support.isZCrystal) {
    lines.push(lang('Z기술 조건이 연결된 Z크리스탈 계열 아이템입니다.', 'This is a Z-Crystal item linked to Z-Move behavior.'));
  }
  if (support.isMegaStone) {
    lines.push(lang('메가진화와 연결된 메가스톤 계열 아이템입니다.', 'This is a Mega Stone item linked to Mega Evolution.'));
  }
  if (support.isFormLinked && !support.isZCrystal && !support.isMegaStone) {
    lines.push(lang('폼/종족 전용 조건이 연결된 지닌 도구일 수 있습니다.', 'This may be a form- or species-linked held item.'));
  }
  return lines.join(' ');
}
function renderItemDetail(option) {
  if (!els.pickerDetail || state.picker?.mode !== 'item') return;
  const item = state.dex?.items?.get?.(option?.english || '');
  if (!item?.exists) {
    resetPickerDetail();
    if (els.pickerDetailPlaceholder) {
      els.pickerDetailPlaceholder.textContent = lang('도구 상세 데이터를 불러오지 못했습니다.', 'Item detail data could not be loaded.');
      els.pickerDetailPlaceholder.classList.remove('hidden');
    }
    return;
  }
  const support = getItemUiSupport(item.name);
  state.picker.detailOption = option;
  els.pickerDetail.classList.remove('hidden');
  els.pickerDetailPlaceholder?.classList.add('hidden');
  els.pickerDetailContent?.classList.remove('hidden');
  if (els.pickerDetailName) els.pickerDetailName.textContent = option.display || displayItemName(item.name);
  renderItemIconPreview(els.pickerDetailIcon, item.name, {hideWhenMissing: true, alt: displayItemName(item.name)});
  if (els.pickerDetailAlt) {
    const alternate = state.language === 'en'
      ? (option.korean && option.korean !== option.english ? option.korean : '')
      : (option.english && option.english !== option.korean ? option.english : '');
    els.pickerDetailAlt.textContent = alternate || lang('도구 상세', 'Item details');
  }
  const statusLabel = support.isCurrentOfficialOverride
    ? lang('외부 검증으로 현재 공식 허용', 'Externally verified current official')
    : (item.isNonstandard
      ? (item.isNonstandard === 'Past' ? lang('Past 허용', 'Past allowed') : item.isNonstandard)
      : lang('표준', 'Standard'));
  const metaChips = [
    `${lang('상태', 'Status')}: ${statusLabel}`,
    `${lang('데이터', 'Data')}: ${support.existsInDex ? lang('로컬 Dex 존재', 'Present in local Dex') : lang('로컬 Dex 없음', 'Missing from local Dex')}`,
    `${lang('노출', 'Exposure')}: ${support.isExposed ? lang('빌더 표시', 'Shown in builder') : lang('빌더 숨김', 'Hidden from builder')}`,
    `${lang('세대', 'Gen')}: ${item.gen || '—'}`,
    `${lang('번호', 'Num')}: ${item.num || '—'}`,
  ];
  els.pickerDetailMeta.innerHTML = metaChips.map(text => `<span class="picker-detail-chip">${text}</span>`).join('');
  els.pickerDetailDesc.textContent = buildItemSupportSummary(item.name);
  const flagChips = [];
  if (support.isZCrystal) flagChips.push(lang('Z크리스탈', 'Z-Crystal'));
  if (support.isMegaStone) flagChips.push(lang('메가스톤', 'Mega Stone'));
  if (support.isFormLinked && !support.isZCrystal && !support.isMegaStone) flagChips.push(lang('폼 연동 가능', 'Form-linked'));
  if (support.isCurrentOfficialOverride) flagChips.push(lang('최신 공식 반영', 'Current official'));
  els.pickerDetailFlags.innerHTML = flagChips.map(text => `<span class="picker-detail-chip">${text}</span>`).join('');
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
async function getFallbackMetrics() {
  if (fallbackMetricsPromise) return fallbackMetricsPromise;
  fallbackMetricsPromise = loadPokemonMetrics().catch(() => null);
  return fallbackMetricsPromise;
}
async function renderAnimatedSprite(container, {spriteId, facing='front', shiny=false, size='large'}) {
  clearSpriteAnimation(container);
  container.innerHTML = '';
  container.className = `sprite-shell ${size}`;
  const renderToken = (Number(container._spriteRenderToken || 0) + 1);
  container._spriteRenderToken = renderToken;
  container.dataset.spriteId = spriteId || '';
  container.dataset.spriteFacing = facing || 'front';
  container.dataset.spriteShiny = shiny ? '1' : '0';
  if (!spriteId) {
    delete container.dataset.spriteSrc;
    container.textContent = '—';
    return;
  }
  const url = spritePath(spriteId, facing, shiny);
  container.dataset.spriteSrc = url;
  try {
    const [info, metricsMap] = await Promise.all([
      ensureImageInfo(url),
      getFallbackMetrics(),
    ]);
    if (container._spriteRenderToken !== renderToken) return;
    const metrics = getMetricsForSprite(spriteId, metricsMap);
    const isFront = facing !== 'back';
    const defaultScale = isFront ? DBK_DEFAULTS.frontScale : DBK_DEFAULTS.backScale;
    const metricScale = isFront ? metrics?.frontScale : metrics?.backScale;
    const scaleMultiplier = Number.isFinite(metricScale) && metricScale > 0
      ? metricScale / defaultScale
      : 1;
    const canvas = document.createElement('canvas');
    const baseScale = size === 'large' ? Math.min(2.4, 190 / info.frame) : Math.min(1.4, 56 / info.frame);
    const scale = baseScale * Math.max(0.5, Math.min(scaleMultiplier, 3));
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
      if (container._spriteRenderToken !== renderToken) return;
      let frame = 0;
      const draw = () => {
        if (container._spriteRenderToken !== renderToken) return;
        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(img, frame * info.frame, 0, info.frame, info.height, 0, 0, width, height);
        frame = (frame + 1) % info.count;
      };
      draw();
      const animSpeed = isFront ? (metrics?.animFront ?? 2) : (metrics?.animBack ?? 2);
      const delay = calcDbkAnimationDelayMs(animSpeed);
      if (info.count > 1 && delay > 0) {
        const timer = setInterval(() => {
          if (!container.isConnected || canvas !== container.firstChild || container._spriteRenderToken !== renderToken) {
            clearInterval(timer);
            return;
          }
          draw();
        }, delay);
        container._spriteTimer = timer;
      }
    };
    img.src = url;
    if (container._spriteRenderToken !== renderToken) return;
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
    runtimeModeBadge: document.getElementById('runtime-mode-badge'),
    runtimeModeTitle: document.getElementById('runtime-mode-title'),
    runtimeModeDetail: document.getElementById('runtime-mode-detail'),
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
    heroEngineValue: document.getElementById('hero-engine-value'),
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
    battlePerspectiveP1Btn: document.getElementById('battle-perspective-p1'),
    battlePerspectiveP2Btn: document.getElementById('battle-perspective-p2'),
    battlePerspectiveBanner: document.getElementById('battle-perspective-banner'),
    battleSideP1: document.getElementById('battle-side-p1'),
    battleSideP2: document.getElementById('battle-side-p2'),
    battleInfoP1: document.getElementById('battle-info-p1'),
    battleInfoP2: document.getElementById('battle-info-p2'),
    battleTrayP1: document.getElementById('battle-tray-p1'),
    battleTrayP2: document.getElementById('battle-tray-p2'),
    battleAbilityFlyout: document.getElementById('battle-ability-flyout'),
    battleBottom: document.getElementById('battle-bottom'),
    battleMessageWindow: document.getElementById('battle-message-window'),
    battleStateWindow: document.getElementById('battle-state-window'),
    battleDebugSummary: document.getElementById('battle-debug-summary'),
    turnNumber: document.getElementById('turn-number'),
    battleFieldStatus: document.getElementById('battle-field-status'),
    battlePhaserRoot: document.getElementById('battle-phaser-root'),
    battlePhaserMountP1: document.getElementById('battle-phaser-mount-p1'),
    battlePhaserMountP2: document.getElementById('battle-phaser-mount-p2'),
    battlePhaserLabelP1: document.getElementById('battle-phaser-label-p1'),
    battlePhaserLabelP2: document.getElementById('battle-phaser-label-p2'),
    battlePhaserStatus: document.getElementById('battle-phaser-status'),
    battleExitFullscreenBtn: document.getElementById('battle-exit-fullscreen-btn'),
    battleLog: document.getElementById('battle-log'),
    pendingChoices: document.getElementById('pending-choices'),
    clearLogBtn: document.getElementById('clear-log-btn'),
    battleRuntimeChip: document.getElementById('battle-runtime-chip'),
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
    pickerDetailIcon: document.getElementById('picker-detail-icon'),
    editorItemPreview: document.getElementById('editor-item-preview'),
    pickerCloseBtn: document.getElementById('picker-close-btn'),
  });
}
function buildStaticLists() {
  relocalizeChoiceCaches();
  const dexItems = state.dex
    ? state.dex.items.all().filter(item => isDexSupported(item, 'items')).map(item => item.name)
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
  if (els.rosterP1Name) els.rosterP1Name.textContent = state.playerNames[0];
  if (els.rosterP2Name) els.rosterP2Name.textContent = state.playerNames[1];
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
      const slotBadges = document.createElement('div');
      slotBadges.className = 'slot-badges';
      if (mon.item) {
        const itemBadge = document.createElement('div');
        itemBadge.className = 'item-mini-badge';
        renderItemIconPreview(itemBadge, mon.item, {label: displayItemName(mon.item), hideWhenMissing: false});
        slotBadges.appendChild(itemBadge);
      }
      if (slotBadges.childElementCount) meta.appendChild(slotBadges);
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
  const runtime = getSelectedBattleRuntimeDescriptor();
  if (!slugify(name)) return lang('포켓몬을 선택하면 특성을 고를 수 있습니다.', "Select one of the Pokémon's native abilities.");
  if (runtime.id === 'engine-authoritative-singles') {
    return state.language === 'ko'
      ? `${displayAbilityName(name)} 특성 판정은 현재 선택된 엔진 필수 싱글 경로에서 로컬 Showdown 엔진이 담당한다. 팀 빌더 표시는 참고용이며 실제 전투 판정은 엔진 스냅샷과 요청을 따른다.`
      : `${displayAbilityName(name)} is resolved by the local Showdown engine in the current engine-required singles path. Builder labels are informational only; real battle behavior follows the engine request and snapshot.`;
  }
  return state.language === 'ko'
    ? `${displayAbilityName(name)} 특성은 팀 빌더에서는 저장되고 검증되지만, 현재 선택된 런타임은 배틀 시작이 차단된 상태이다.`
    : `${displayAbilityName(name)} is stored and validated in the team builder, but the currently selected runtime is blocked from battle start.`;
}
function implementedItemNote(name) {
  const runtime = getSelectedBattleRuntimeDescriptor();
  if (!slugify(name)) return lang('지닌 도구가 없습니다.', 'No held item selected.');
  const supportSummary = buildItemSupportSummary(name);
  const runtimeSummary = runtime.id === 'engine-authoritative-singles'
    ? (state.language === 'ko'
      ? `${displayItemName(name)} 도구 판정은 현재 선택된 엔진 필수 싱글 경로에서 로컬 Showdown 엔진이 담당한다. 팀 빌더 표시는 참고용이며 실제 전투 판정은 엔진 스냅샷과 요청을 따른다.`
      : `${displayItemName(name)} is resolved by the local Showdown engine in the current engine-required singles path. Builder labels are informational only; real battle behavior follows the engine request and snapshot.`)
    : (state.language === 'ko'
      ? `${displayItemName(name)} 도구는 팀 빌더에서는 저장되고 검증되지만, 현재 선택된 런타임은 배틀 시작이 차단된 상태이다.`
      : `${displayItemName(name)} is stored and validated in the team builder, but the currently selected runtime is blocked from battle start.`);
  return [supportSummary, runtimeSummary].filter(Boolean).join(' ');
}
async function hydrateSelectedSpecies(options = {}) {
  const {render = true, persist = true} = options;
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
    if (persist) saveState();
    if (render) renderAll();
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
    enforceMonRequiredTeraType(mon, data);
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
  if (persist) saveState();
  if (render) renderAll();
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
  enforceMonRequiredTeraType(mon, mon.data);
  const requiredTeraType = resolveRequiredTeraTypeFromSpeciesData(mon.data);
  els.teraSelect.value = mon.teraType || 'normal';
  els.teraSelect.disabled = Boolean(requiredTeraType);
  els.teraSelect.title = requiredTeraType
    ? lang(
      `${displaySpeciesName(mon.data?.name || mon.species || '')}은(는) ${displayType(requiredTeraType)} 테라 타입으로 고정됩니다.`,
      `${mon.data?.name || mon.species || 'This species'} is locked to ${displayType(requiredTeraType)} Tera type.`
    )
    : '';
  els.shinyCheckbox.checked = Boolean(mon.shiny);
  els.moveInputs.forEach((input, idx) => input.value = displayMoveName(mon.moves[idx] || ''));
  els.editorSpeciesName.textContent = displayName;
  els.editorTypeRow.innerHTML = '';
  (mon.data?.types || []).forEach(type => els.editorTypeRow.appendChild(createTypePill(type)));
  renderEditorFlags(mon);
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
  renderSelectedItemPreview(mon);
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
    if (mon.data.isNonstandard && !isAllowedNonstandard(mon.data.isNonstandard, mon.data, 'species')) {
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
    if (!item?.exists) {
      if (CURRENT_OFFICIAL_ABSENT_ITEM_ID_SET.has(toId(mon.item))) {
        errors.push(`${prefix}: ${displayItemName(mon.item)} 은(는) 현재 공식 아이템으로 외부 검증되었지만, 이 로컬 데이터 번들에는 아직 포함되지 않았습니다. / ${mon.item} is a currently official item verified externally, but it is still absent from this local data bundle.`);
      } else {
        errors.push(`${prefix}: ${itemLabel} 도구는 유효하지 않습니다. / ${mon.item} is not a valid item.`);
      }
    }
    else if (!isAllowedNonstandard(item.isNonstandard, item, 'items')) errors.push(`${prefix}: ${displayItemName(item.name)} ${explainNonstandard(item.isNonstandard)}`);
  }

  if (state.dex && mon.ability) {
    const ability = state.dex.abilities.get(mon.ability);
    if (!ability?.exists) errors.push(`${prefix}: ${abilityLabel} 특성은 유효하지 않습니다. / ${mon.ability} is not a valid ability.`);
    else if (!isAllowedNonstandard(ability.isNonstandard, ability, 'abilities')) errors.push(`${prefix}: ${displayAbilityName(ability.name)} ${explainNonstandard(ability.isNonstandard)}`);
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
      if (!isAllowedNonstandard(loadedMove.isNonstandard, loadedMove, 'moves')) {
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

  const runtime = getSelectedBattleRuntimeDescriptor();
  const runtimeBlocked = !runtime.startAllowed;

  if (allErrors.length) {
    els.builderErrors.classList.remove('hidden');
    els.builderErrors.textContent = allErrors.map(localizeText).join('\n');
    els.validationSummary.textContent = state.language === 'ko'
      ? `배틀 시작 전 해결할 문제 ${allErrors.length}개가 남아 있습니다.${state.builderWarnings.length ? ` 경고 ${state.builderWarnings.length}개도 함께 확인하세요.` : ''}`
      : `${allErrors.length} issue${allErrors.length === 1 ? '' : 's'} remaining before battle can start.${state.builderWarnings.length ? ` ${state.builderWarnings.length} warning${state.builderWarnings.length === 1 ? '' : 's'} also noted.` : ''}`;
    els.startBattleBtn.disabled = true;
    els.startBattleBtn.title = '';
  } else {
    els.builderErrors.classList.add('hidden');
    els.builderErrors.textContent = '';
    if (runtimeBlocked) {
      els.validationSummary.textContent = lang(
        `팀은 유효하지만 현재 선택된 배틀 경로는 ${runtime.title} 상태입니다. ${runtime.startBlockedReason}`,
        `Teams are valid, but the currently selected battle path is ${runtime.title}. ${runtime.startBlockedReason}`
      );
      els.startBattleBtn.disabled = true;
      els.startBattleBtn.title = localizeText(runtime.startBlockedReason || runtime.title);
    } else {
      els.validationSummary.textContent = state.builderWarnings.length
        ? lang(`팀이 기본 검증을 통과했습니다. 엔진 필수 싱글 경로로 시작할 수 있으며, 고급 출처/런타임 주의 ${state.builderWarnings.length}개가 있습니다.`, `Teams pass validation. Engine-required singles can start, with ${state.builderWarnings.length} advanced source/runtime warning${state.builderWarnings.length === 1 ? '' : 's'}.`)
        : lang('양쪽 팀이 유효합니다. 엔진 필수 싱글 배틀을 시작할 수 있습니다.', 'Both teams are valid. Engine-required singles battle start is ready.');
      els.startBattleBtn.disabled = false;
      els.startBattleBtn.title = '';
    }
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
    if (!(await commitSpeciesInputSelection())) renderEditor();
  });
  els.speciesInput.addEventListener('keydown', async (event) => {
    if (event.key !== 'Enter' || event.isComposing) return;
    event.preventDefault();
    if (!(await commitSpeciesInputSelection())) renderEditor();
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
    const requiredTeraType = resolveRequiredTeraTypeFromSpeciesData(mon?.data);
    mon.teraType = requiredTeraType || els.teraSelect.value;
    if (requiredTeraType) els.teraSelect.value = requiredTeraType;
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
    await hydrateSelectedSpecies({render: false, persist: false});
    if (mon.data?.abilities?.length) {
      mon.ability = mon.data.abilities[Math.floor(Math.random() * mon.data.abilities.length)] || mon.data.abilities[0] || '';
    }
    randomizeLearnsetMoves(mon);
    if (!mon.teraType) mon.teraType = mon.data?.types?.[0] || 'normal';
    renderEditor();
    renderRoster();
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

function resolveShowdownStartAbility(mon, startSpeciesData) {
  const selectedAbility = String(mon?.ability || '').trim();
  if (!startSpeciesData?.exists) return selectedAbility;
  const allowed = uniqueNames([
    ...Object.values(startSpeciesData.abilities || {}).filter(Boolean),
    startSpeciesData.requiredAbility || '',
  ].filter(Boolean));
  if (!allowed.length) return selectedAbility;
  if (!selectedAbility) return allowed[0] || '';
  if (allowed.some(name => toId(name) === toId(selectedAbility))) return selectedAbility;
  return allowed[0] || selectedAbility;
}
function resolveRequiredTeraTypeFromSpeciesData(speciesData) {
  const baseSpeciesId = toId(speciesData?.baseSpecies || speciesData?.name || '');
  if (baseSpeciesId !== 'ogerpon') return '';
  const required = toId(speciesData?.requiredTeraType || '');
  return TYPES.includes(required) ? required : '';
}
function enforceMonRequiredTeraType(mon, speciesData = mon?.data) {
  if (!mon) return false;
  const required = resolveRequiredTeraTypeFromSpeciesData(speciesData);
  if (!required) return false;
  if (toId(mon.teraType) === required) return false;
  mon.teraType = required;
  return true;
}

async function buildShowdownPayloadMon(mon, player, slot) {
  const startSpecies = normalizeShowdownStartSpecies(mon);
  const startSpeciesData = startSpecies ? await getSpeciesData(startSpecies).catch(() => null) : null;
  const explicitGigantamaxChoice = /-gmax/i.test(String(mon.displaySpecies || mon.formSpecies || mon.species || ''));
  const hasGigantamaxFactor = Boolean(startSpeciesData?.canGigantamax || mon?.data?.canGigantamax);
  const intendsGigantamax = hasGigantamaxFactor || explicitGigantamaxChoice;
  const startAbility = resolveShowdownStartAbility(mon, startSpeciesData);
  const requiredTeraType = resolveRequiredTeraTypeFromSpeciesData(startSpeciesData);
  const resolvedTeraType = requiredTeraType || toId(mon.teraType || startSpeciesData?.types?.[0] || '') || '';
  const battleBaseSpecies = startSpeciesData?.baseSpecies || mon.baseSpecies || mon.data?.baseSpecies || startSpecies || mon.species;
  const startSpriteId = getAutoSpriteIdForSpecies(startSpecies, mon.gender || '', battleBaseSpecies) || mon.spriteAutoId || mon.spriteId || '';
  const megaCandidate = getMegaCandidateForMon(mon);
  const primalCandidate = getPrimalCandidateForMon(mon);
  const ultraBurstCandidate = getUltraBurstCandidateForMon(mon);
  const megaSpriteId = megaCandidate?.speciesName
    ? (megaCandidate.assetId || getAutoSpriteIdForSpecies(megaCandidate.speciesName, mon.gender || '', mon.baseSpecies || mon.species || battleBaseSpecies))
    : '';
  const primalSpriteId = primalCandidate?.speciesName
    ? (primalCandidate.assetId || getAutoSpriteIdForSpecies(primalCandidate.speciesName, mon.gender || '', mon.baseSpecies || mon.species || battleBaseSpecies))
    : '';
  const ultraSpriteId = ultraBurstCandidate?.speciesName
    ? (ultraBurstCandidate.assetId || getAutoSpriteIdForSpecies(ultraBurstCandidate.speciesName, mon.gender || '', mon.baseSpecies || mon.species || battleBaseSpecies))
    : '';
  return {
    species: startSpecies,
    name: mon.nickname || startSpecies,
    item: mon.item || '',
    ability: startAbility,
    moves: deepClone(mon.moves || []),
    nature: mon.nature || '',
    gender: mon.gender || '',
    level: Number(mon.level || 100),
    shiny: Boolean(mon.shiny),
    gigantamax: intendsGigantamax,
    happiness: 255,
    evs: deepClone(mon.evs || {hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0}),
    ivs: deepClone(mon.ivs || {hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31}),
    teraType: resolvedTeraType,
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
      primalSpecies: primalCandidate?.speciesName || '',
      primalSpriteId: primalSpriteId || '',
      ultraSpecies: ultraBurstCandidate?.speciesName || '',
      ultraSpriteId: ultraSpriteId || '',
      spriteAutoId: mon.spriteAutoId || startSpriteId,
      shiny: Boolean(mon.shiny),
      item: mon.item || '',
      ability: startAbility,
      nature: mon.nature || '',
      gender: mon.gender || '',
      level: Number(mon.level || 100),
      teraType: resolvedTeraType,
      evs: deepClone(mon.evs || {hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0}),
      ivs: deepClone(mon.ivs || {hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31}),
      data: {
        name: startSpecies,
        baseSpecies: battleBaseSpecies,
        types: deepClone(startSpeciesData?.types || mon.data?.types || []),
        canGigantamax: startSpeciesData?.canGigantamax || mon.data?.canGigantamax || '',
        battleOnly: mon.data?.battleOnly || '',
        changesFrom: mon.data?.changesFrom || '',
      },
    },
  };
}

async function buildShowdownBattlePayload() {
  return {
    mode: 'singles',
    formatid: ENGINE_AUTHORITATIVE_SINGLES_FORMAT,
    players: await Promise.all([0, 1].map(async player => ({
      name: state.playerNames[player],
      team: await Promise.all(state.teams[player].map((mon, slot) => buildShowdownPayloadMon(mon, player, slot))),
    }))),
  };
}

async function startEngineAuthoritativeSinglesBattle() {
  const payload = await buildShowdownBattlePayload();
  return applyBattleRuntimeInfo(
    adoptEngineBattleSnapshot(await startShowdownLocalSinglesBattle(payload)),
    getEngineAuthoritativeSinglesRuntimeDescriptor()
  );
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
    events: Array.isArray(snapshot.events) ? [...snapshot.events] : [],
  };
}
function adoptEngineBattleSnapshot(snapshot) {
  const battle = ensureBattleUiState(cloneEngineBattleSnapshot(snapshot));
  if (!battle) return null;
  normalizeBattleSpriteState(battle);
  clearEnginePendingChoices(battle);
  battle.resolvingTurn = false;
  applyBattleRuntimeInfo(battle, getEngineAuthoritativeSinglesRuntimeDescriptor());
  return battle;
}
// Battle start is engine-authoritative for singles and explicitly blocked otherwise.
async function startBattle() {
  await renderValidation();
  if (state.builderErrors.length) return;

  const runtime = getSelectedBattleRuntimeDescriptor();
  if (!runtime.startAllowed) {
    showRuntime(
      lang(
        '현재 선택된 배틀은 정확한 엔진 경로가 준비될 때까지 시작이 차단됩니다.',
        'The currently selected battle is blocked until its accurate engine-backed path is available.'
      ),
      'warning',
      `${runtime.detail}<br>${runtime.startBlockedReason}`
    );
    renderAll();
    return;
  }

  if (runtime.id !== 'engine-authoritative-singles') {
    showRuntime(
      lang(
        '현재 빌드에서는 엔진 필수 싱글만 시작할 수 있습니다.',
        'Only engine-required singles can start in the current build.'
      ),
      'warning',
      `${runtime.detail}<br>${runtime.startBlockedReason}`
    );
    renderAll();
    return;
  }

  try {
    resetBattlePresentationState();
    state.battle = await startEngineAuthoritativeSinglesBattle();
    showRuntime(runtime.startMessage, 'ready', runtime.detail);
    els.battlePanel.classList.remove('hidden');
    renderBattle();

    // BA-2: play initial switch_in events (cries etc.) through the timeline executor.
    // Wait for Phaser scene + audio to be ready first, then fire events in background.
    if (FLAGS.battlePresentationV2 && Array.isArray(state.battle?.events) && state.battle.events.length > 0) {
      await syncPhaserBattleRenderer(state.battle);
      getPrimaryBattleScene()?.audio?.playRandomBattleBgm?.(BATTLE_BGM_TRACKS).catch(() => {});
      playTimelineAcrossActiveViews(state.battle.events, {
        onComplete: () => {
          clearTimelineSpriteOverrides();
          renderBattle();
        },
        initialNames: {},
        preHideSwitchInSides: true,
      }).catch(error => {
        console.warn('[BattleTimeline] initial play failed:', error);
      });  // fire-and-forget; don't block return
    }

    return;
  } catch (error) {
    console.error('Local Showdown singles engine start failed.', error);
    state.showdownLocal = {
      ...(state.showdownLocal || {}),
      available: false,
      error: error.message || String(error),
    };
    const blocked = getBlockedSinglesRuntimeDescriptor(`Engine start error: ${error.message}`);
    showRuntime(
      lang(
        '로컬 Showdown 싱글 엔진 시작에 실패했습니다. 싱글 시작은 차단되며 팀 빌더만 계속 사용할 수 있습니다.',
        'Starting the local Showdown singles engine failed. Singles start is blocked and only the team builder remains available.'
      ),
      'error',
      `${blocked.detail}<br>Engine error: ${error.message}`
    );
    renderAll();
  }
}
// Battle log / snapshot helpers used by the supported engine-backed battle panel.
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
  return {kind:'', move:'', moveIndex:null, target:null, switchTo:null, tera:false, mega:false, ultra:false, z:false, dynamax:false};
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
function isEngineSingleMoveRequest(moveRequest) {
  const moves = Array.isArray(moveRequest?.moves) ? moveRequest.moves : [];
  if (moves.length !== 1) return false;
  const onlyMove = moves[0] || null;
  return Boolean(onlyMove && !onlyMove.disabled && toId(onlyMove?.id || onlyMove?.move || ''));
}
function isEngineForcedContinuationRequest(moveRequest) {
  return isEngineSingleMoveRequest(moveRequest);
}
function isEngineMoveButtonSelectable(moveRequest, moveInfo, moveIndex = 0) {
  if (!moveInfo || moveInfo.disabled) return false;
  const isLockedSingleMove = isEngineSingleMoveRequest(moveRequest) && moveIndex === 0;
  if (isLockedSingleMove) return true;
  const moveId = toId(moveInfo?.id || moveInfo?.move || '');
  if (moveId === 'recharge') return true;
  if (!Number.isFinite(moveInfo?.pp)) return false;
  return moveInfo.pp > 0;
}
function getEngineForcedMoveChoice(moveRequest) {
  if (!isEngineSingleMoveRequest(moveRequest)) return null;
  const onlyMove = moveRequest.moves[0] || null;
  return {
    ...createEmptyBattleChoice(),
    kind: 'move',
    move: onlyMove?.move || 'Locked move',
    moveIndex: 0,
  };
}
function getAvailableEngineZMoveOptions(moveRequest) {
  return Array.isArray(moveRequest?.canZMove)
    ? moveRequest.canZMove.map((info, index) => info ? {index, info} : null).filter(Boolean)
    : [];
}
function resolveEngineMoveName(rawMoveName = '') {
  const raw = String(rawMoveName || '').trim();
  if (!raw) return '';
  return resolveCanonicalDisplayName('moves', raw);
}
function getEngineMaxMoveEntry(moveRequest, moveIndex) {
  const maxMoves = moveRequest?.maxMoves?.maxMoves;
  if (!Array.isArray(maxMoves)) return null;
  return maxMoves[moveIndex] || null;
}
function isEngineDynamaxMoveMode(choice, mon, moveRequest) {
  if (!moveRequest) return false;
  if (choice?.dynamax) return true;
  if (mon?.dynamaxed) return true;
  return Boolean(Array.isArray(moveRequest?.maxMoves?.maxMoves) && !moveRequest?.canDynamax);
}
function getMegaFormMoveReplacement(mon, baseMoveName, choice = null) {
  const baseMoveId = toId(baseMoveName);
  const formId = toId(mon?.formSpecies || mon?.species || '');
  const megaFormId = toId(mon?.megaSpecies || '');

  // After actual mega evolution: forward lookup (original base move -> replacement)
  if (MEGA_FORM_MOVE_REPLACEMENTS[formId]?.[baseMoveId]) {
    return MEGA_FORM_MOVE_REPLACEMENTS[formId][baseMoveId];
  }

  // Before mega evolution, preview the replacement only when mega is currently armed.
  if (choice?.mega && megaFormId && MEGA_FORM_MOVE_REPLACEMENTS[megaFormId]?.[baseMoveId]) {
    return MEGA_FORM_MOVE_REPLACEMENTS[megaFormId][baseMoveId];
  }

  return null;
}
function getEngineDisplayMoveName(moveRequest, moveIndex, baseMoveName, choice = null, mon = null) {
  const zModeActive = Boolean(choice?.z && getAvailableEngineZMoveOptions(moveRequest).length);
  if (zModeActive && Array.isArray(moveRequest?.canZMove) && moveRequest.canZMove[moveIndex]?.move) {
    return resolveEngineMoveName(moveRequest.canZMove[moveIndex].move);
  }
  if (isEngineDynamaxMoveMode(choice, mon, moveRequest)) {
    const maxMove = getEngineMaxMoveEntry(moveRequest, moveIndex);
    if (maxMove?.move) return resolveEngineMoveName(maxMove.move);
  }
  const megaReplacement = getMegaFormMoveReplacement(mon, baseMoveName, choice);
  if (megaReplacement) return megaReplacement;
  return resolveEngineMoveName(baseMoveName);
}
function buildEngineMoveChoiceFromDraft(player, activeIndex, moveIndex, battle = state.battle) {
  const requestSlot = getEngineRequestSlotForActiveIndex(player, activeIndex, battle);
  if (requestSlot < 0) return null;
  const moveRequest = getEngineMoveRequest(player, requestSlot, battle);
  const moveInfo = Array.isArray(moveRequest?.moves) ? (moveRequest.moves[moveIndex] || null) : null;
  if (!isEngineMoveButtonSelectable(moveRequest, moveInfo, moveIndex)) return null;
  const previous = getEngineDraftChoice(player, activeIndex, battle);
  const canZMove = Array.isArray(moveRequest?.canZMove) && Boolean(moveRequest.canZMove[moveIndex]);
  const isForcedContinuation = isEngineForcedContinuationRequest(moveRequest);
  const zModeActive = !isForcedContinuation && Boolean(previous?.z) && getAvailableEngineZMoveOptions(moveRequest).length > 0;
  return {
    ...createEmptyBattleChoice(),
    kind: 'move',
    move: moveInfo?.move || previous?.move || '',
    moveIndex,
    switchTo: null,
    target: null,
    z: Boolean(zModeActive && canZMove),
    mega: !isForcedContinuation && Boolean(previous?.mega && moveRequest?.canMegaEvo),
    ultra: !isForcedContinuation && Boolean(previous?.ultra && moveRequest?.canUltraBurst),
    tera: !isForcedContinuation && Boolean(previous?.tera && moveRequest?.canTerastallize),
    dynamax: !isForcedContinuation && Boolean(previous?.dynamax && moveRequest?.canDynamax),
  };
}
function toggleEngineDraftFlag(player, activeIndex, flag, battle = state.battle) {
  const requestSlot = getEngineRequestSlotForActiveIndex(player, activeIndex, battle);
  if (requestSlot < 0) return false;
  const moveRequest = getEngineMoveRequest(player, requestSlot, battle);
  if (!moveRequest || isEngineForcedContinuationRequest(moveRequest)) return false;
  const previous = getEngineDraftChoice(player, activeIndex, battle);
  const next = {...previous};
  if (flag === 'mega') {
    if (!moveRequest?.canMegaEvo) return false;
    next.mega = !previous.mega;
    if (next.mega) next.ultra = false;
  } else if (flag === 'ultra') {
    if (!moveRequest?.canUltraBurst) return false;
    next.ultra = !previous.ultra;
    if (next.ultra) {
      next.mega = false;
      next.tera = false;
      next.z = false;
      next.dynamax = false;
    }
  } else if (flag === 'tera') {
    if (!moveRequest?.canTerastallize) return false;
    next.tera = !previous.tera;
    if (next.tera) next.dynamax = false;
  } else if (flag === 'dynamax') {
    if (!moveRequest?.canDynamax || !runtimeSupportsDynamax()) return false;
    next.dynamax = !previous.dynamax;
    if (next.dynamax) {
      next.tera = false;
      next.z = false;
      next.ultra = false;
    }
  } else if (flag === 'z') {
    const availableZMoves = getAvailableEngineZMoveOptions(moveRequest);
    if (!availableZMoves.length) return false;
    next.z = !previous.z;
    if (next.z) {
      next.dynamax = false;
      const selectedMoveCanBecomeZ = previous.kind === 'move'
        && Number.isInteger(previous.moveIndex)
        && Boolean(Array.isArray(moveRequest?.canZMove) && moveRequest.canZMove[previous.moveIndex]);
      if (!selectedMoveCanBecomeZ) {
        next.kind = '';
        next.move = '';
        next.moveIndex = null;
        next.target = null;
        next.switchTo = null;
      }
    }
  } else {
    return false;
  }
  setEnginePendingChoice(player, activeIndex, next, battle);
  return true;
}
function seedEngineForcedPendingChoices(battle = state.battle) {
  ensureBattleUiState(battle);
  for (const player of [0, 1]) {
    const request = getEngineRequestForPlayer(player, battle);
    if (!isEngineActionableRequest(request)) continue;
    for (const activeIndex of getEngineActionSlots(player, battle)) {
      normalizeEnginePendingChoice(player, activeIndex, battle);
    }
  }
}
function normalizeEnginePendingChoice(player, slot, battle = state.battle) {
  const rawChoice = getEnginePendingChoice(player, slot, battle);
  const request = getEngineRequestForPlayer(player, battle);
  const requestSlot = getEngineRequestSlotForActiveIndex(player, slot, battle);
  if (!isEngineActionableRequest(request) || requestSlot < 0) {
    clearEnginePendingChoice(player, slot, battle);
    return createEmptyBattleChoice();
  }

  const moveRequest = getEngineMoveRequest(player, requestSlot, battle);
  const forcedMoveChoice = getEngineForcedMoveChoice(moveRequest);
  if (forcedMoveChoice) {
    setEnginePendingChoice(player, slot, forcedMoveChoice, battle);
    return forcedMoveChoice;
  }
  if (!rawChoice) return createEmptyBattleChoice();
  if (!rawChoice.kind) {
    if (isEngineForceSwitchRequest(request)) {
      clearEnginePendingChoice(player, slot, battle);
      return createEmptyBattleChoice();
    }
    const sanitizedDraft = {
      ...createEmptyBattleChoice(),
      mega: Boolean(rawChoice.mega && moveRequest?.canMegaEvo),
      ultra: Boolean(rawChoice.ultra && moveRequest?.canUltraBurst),
      tera: Boolean(rawChoice.tera && moveRequest?.canTerastallize),
      z: Boolean(rawChoice.z && getAvailableEngineZMoveOptions(moveRequest).length),
      dynamax: Boolean(rawChoice.dynamax && moveRequest?.canDynamax && runtimeSupportsDynamax()),
    };
    if (sanitizedDraft.tera && sanitizedDraft.dynamax) sanitizedDraft.dynamax = false;
    if (!sanitizedDraft.mega && !sanitizedDraft.ultra && !sanitizedDraft.tera && !sanitizedDraft.z && !sanitizedDraft.dynamax) {
      clearEnginePendingChoice(player, slot, battle);
      return createEmptyBattleChoice();
    }
    setEnginePendingChoice(player, slot, sanitizedDraft, battle);
    return sanitizedDraft;
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
    const switchOptionsExist = switchOptions.length > 0;
    if (!canEngineSwitchNormally(player, requestSlot, battle) || !switchOptionsExist) {
      clearEnginePendingChoice(player, slot, battle);
      return createEmptyBattleChoice();
    }
    if (!Number.isInteger(rawChoice.switchTo)) {
      const sanitizedDraft = {...createEmptyBattleChoice(), kind: 'switch', switchTo: null};
      setEnginePendingChoice(player, slot, sanitizedDraft, battle);
      return sanitizedDraft;
    }
    if (!hasSwitchTarget) {
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

  const moveInfo = Array.isArray(moveRequest?.moves) ? (moveRequest.moves[rawChoice.moveIndex] || null) : null;
  const zInfo = Array.isArray(moveRequest?.canZMove) ? moveRequest.canZMove[rawChoice.moveIndex] : null;
  if (!isEngineMoveButtonSelectable(moveRequest, moveInfo, rawChoice.moveIndex)) {
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
    ultra: Boolean(rawChoice.ultra && moveRequest?.canUltraBurst),
    tera: Boolean(rawChoice.tera && moveRequest?.canTerastallize),
    z: Boolean(rawChoice.z && zInfo),
    dynamax: Boolean(rawChoice.dynamax && moveRequest?.canDynamax && runtimeSupportsDynamax()),
  };
  if (sanitized.z && sanitized.dynamax) sanitized.dynamax = false;
  if (sanitized.tera && sanitized.dynamax) sanitized.dynamax = false;
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
function getEngineSwitchOptions(player, activeIndex, battle = state.battle) {
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

  if (isEngineActionableRequest(request)) return [];

  return [];
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
  if (!choice?.kind) {
    const requestSlot = Math.max(0, getEngineRequestSlotForActiveIndex(player, slot, battle));
    const moveRequest = getEngineMoveRequest(player, requestSlot, battle);
    if (choice?.z && getAvailableEngineZMoveOptions(moveRequest).length) {
      return lang('Z기술 선택 모드', 'Z-Move mode');
    }
    return lang('대기 중', 'Pending');
  }
  const side = battle?.players?.[player];
  if (choice.kind === 'switch') {
    if (!Number.isInteger(choice.switchTo)) return lang('교체 대상 선택 중', 'Choosing switch target');
    const target = side?.team?.[choice.switchTo];
    return state.language === 'ko' ? `교체 → ${displaySpeciesName(target?.species || '')}` : `Switch → ${displaySpeciesName(target?.species || '')}`;
  }
  if (choice.kind === 'move') {
    const requestSlot = Math.max(0, getEngineRequestSlotForActiveIndex(player, slot, battle));
    const moveRequest = getEngineMoveRequest(player, requestSlot, battle);
    const mon = side?.team?.[slot] || null;
    const zInfo = Array.isArray(moveRequest?.canZMove) ? moveRequest.canZMove[choice.moveIndex] : null;
    const displayMove = getEngineDisplayMoveName(moveRequest, choice.moveIndex, choice.move, choice, mon);
    let text = choice.z && zInfo?.move ? displayMoveName(resolveEngineMoveName(zInfo.move)) : displayMoveName(displayMove || choice.move);
    if (choice.mega) text += state.language === 'ko' ? ' · 메가진화' : ' · Mega';
    if (choice.ultra) text += state.language === 'ko' ? ' · 울트라버스트' : ' · Ultra Burst';
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
  seedEngineForcedPendingChoices(battle);
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
    section.innerHTML = `<h4>${displayBattleSpeciesName(mon)}</h4>${getBattleBadgeText(mon) ? `<div class="battle-inline-flags">${getBattleBadgeText(mon)}</div>` : ''}`;

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
        btn.innerHTML = `<strong>${displayBattleSpeciesName(option)}</strong><small>HP ${option.hp}/${option.maxHp}</small>`;
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
    const forcedContinuation = isEngineForcedContinuationRequest(moveRequest);
    if (forcedContinuation) {
      const forcedNote = document.createElement('div');
      forcedNote.className = 'small-note';
      forcedNote.style.marginTop = '8px';
      forcedNote.textContent = '이 턴은 엔진이 강제한 연속 행동입니다. 별도 클릭 없이 자동으로 잠기며, 상대 선택이 끝나면 바로 진행됩니다. / This turn is an engine-locked continuation. It auto-locks without an extra click and advances as soon as the opposing side is ready.';
      section.appendChild(forcedNote);
    }
    const availableZMoves = getAvailableEngineZMoveOptions(moveRequest);
    const zModeActive = !forcedContinuation && Boolean(choice.z && availableZMoves.length);

    const toggles = document.createElement('div');
    toggles.className = 'toggle-row';

    if (!forcedContinuation && moveRequest?.canTerastallize) {
      const teraBtn = document.createElement('button');
      teraBtn.type = 'button';
      teraBtn.className = `toggle-pill toggle-pill-tera ${choice.tera ? 'active' : ''}`;
      const teraIcon = document.createElement('span');
      teraIcon.className = 'tera-toggle-icon';
      teraBtn.appendChild(teraIcon);
      const teraCopy = document.createElement('span');
      teraCopy.className = 'toggle-pill-copy';
      teraCopy.innerHTML = `<span>테라스탈 / Terastallize</span><small>${displayType(moveRequest.canTerastallize)}</small>`;
      teraBtn.appendChild(teraCopy);
      renderTeraButtonIcon(teraIcon, moveRequest.canTerastallize);
      teraBtn.addEventListener('click', () => {
        if (!toggleEngineDraftFlag(player, activeIndex, 'tera', battle)) return;
        renderBattle();
      });
      toggles.appendChild(teraBtn);
    }

    if (!forcedContinuation && availableZMoves.length) {
      const zBtn = document.createElement('button');
      zBtn.type = 'button';
      zBtn.className = `toggle-pill ${choice.z ? 'active' : ''}`;
      zBtn.textContent = zModeActive
        ? 'Z기술 선택 중 / Z-Move Mode'
        : `Z기술 / Z-Move (${availableZMoves.length})`;
      zBtn.addEventListener('click', () => {
        if (!toggleEngineDraftFlag(player, activeIndex, 'z', battle)) return;
        renderBattle();
      });
      toggles.appendChild(zBtn);
    }

    if (!forcedContinuation && moveRequest?.canMegaEvo) {
      const megaBtn = document.createElement('button');
      megaBtn.type = 'button';
      megaBtn.className = `toggle-pill ${choice.mega ? 'active' : ''}`;
      megaBtn.textContent = '메가진화 / Mega Evolution';
      megaBtn.addEventListener('click', () => {
        if (!toggleEngineDraftFlag(player, activeIndex, 'mega', battle)) return;
        renderBattle();
      });
      toggles.appendChild(megaBtn);
    }

    if (!forcedContinuation && moveRequest?.canUltraBurst) {
      const ultraBtn = document.createElement('button');
      ultraBtn.type = 'button';
      ultraBtn.className = `toggle-pill ${choice.ultra ? 'active' : ''}`;
      ultraBtn.textContent = '울트라버스트 / Ultra Burst';
      ultraBtn.addEventListener('click', () => {
        if (!toggleEngineDraftFlag(player, activeIndex, 'ultra', battle)) return;
        renderBattle();
      });
      toggles.appendChild(ultraBtn);
    }

    if (!forcedContinuation) {
      const canUseDynamax = canUseDynamaxNow(moveRequest);
      const dynamaxReason = getDynamaxUnavailableReason(moveRequest);
      const dynaBtn = document.createElement('button');
      dynaBtn.type = 'button';
      dynaBtn.className = `toggle-pill ${choice.dynamax && canUseDynamax ? 'active' : ''}`;
      dynaBtn.textContent = '다이맥스 / Dynamax';
      dynaBtn.disabled = !canUseDynamax;
      if (dynamaxReason) dynaBtn.title = dynamaxReason;
      if (!dynaBtn.disabled) {
        dynaBtn.addEventListener('click', () => {
          if (!toggleEngineDraftFlag(player, activeIndex, 'dynamax', battle)) return;
          renderBattle();
        });
      }
      toggles.appendChild(dynaBtn);
    }

    const canSwitch = !forcedContinuation && canEngineSwitchNormally(player, requestSlot, battle) && getEngineSwitchOptions(player, activeIndex, battle).length > 0;
    const switchBtn = document.createElement('button');
    switchBtn.type = 'button';
    switchBtn.className = `toggle-pill ${choice.kind === 'switch' ? 'active' : ''}`;
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

    if (!forcedContinuation && availableZMoves.length) {
      const zHint = document.createElement('div');
      zHint.className = 'small-note';
      zHint.style.marginTop = '8px';
      zHint.textContent = zModeActive
        ? lang(
          'Z모드가 활성화되었습니다. 지금 Z기술로 바뀔 수 있는 기술만 선택할 수 있습니다. 다시 누르면 일반 기술 목록으로 돌아갑니다.',
          'Z mode is active. Only moves that can become Z-Moves are selectable now. Tap the toggle again to return to the normal move list.'
        )
        : lang(
          '이 포켓몬은 Z기술을 사용할 수 있습니다. 먼저 Z 버튼을 누른 뒤, 호환되는 기술을 선택하세요.',
          'This Pokémon can use a Z-Move. Activate Z mode first, then choose one of the compatible moves.'
        );
      section.appendChild(zHint);
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
      const isLockedSingleMove = forcedContinuation && moveIndex === 0;
      const canZHere = Boolean(Array.isArray(moveRequest?.canZMove) && moveRequest.canZMove[moveIndex]);
      const selectable = isEngineMoveButtonSelectable(moveRequest, moveInfo, moveIndex) && (!zModeActive || canZHere);
      const zInfo = canZHere ? moveRequest.canZMove[moveIndex] : null;
      const displayMove = getEngineDisplayMoveName(moveRequest, moveIndex, moveName, choice, mon);
      btn.disabled = !selectable || forcedContinuation;
      if (btn.disabled) btn.classList.add('disabled');
      if (isLockedSingleMove && choice.kind === 'move' && choice.moveIndex === moveIndex) btn.classList.remove('disabled');
      const ppLabel = Number.isFinite(moveInfo?.pp) || Number.isFinite(slotInfo?.pp)
        ? `PP ${pp}/${maxPp}`
        : (isLockedSingleMove
          ? lang('연속 행동 / Locked continuation', 'Locked continuation')
          : 'PP —');
      const zLabel = zModeActive
        ? (canZHere ? ' · Z 선택 / Z armed' : ' · Z 불가 / Z unavailable')
        : (canZHere ? ' · Z 가능 / Z ready' : '');
      btn.innerHTML = `<strong>${displayMoveName(displayMove)}</strong><small>불러오는 중… / Loading… · ${ppLabel}${zLabel}${disabled ? ' · 엔진 비활성 / Engine-disabled' : ''}</small>`;
      Promise.resolve(getMoveData(displayMove || moveName).catch(() => null)).then(moveData => {
        if (!btn.isConnected) return;
        const previewChoice = zModeActive && canZHere
          ? {...choice, kind: 'move', move: moveName, moveIndex, z: true}
          : (choice.kind === 'move' && choice.moveIndex === moveIndex ? choice : null);
        const preview = moveData ? describeMoveForBattle(mon, moveData, previewChoice) : null;
        const ppLabel = Number.isFinite(moveInfo?.pp) || Number.isFinite(slotInfo?.pp)
          ? `PP ${pp}/${maxPp}`
          : (isLockedSingleMove
            ? lang('연속 행동 / Locked continuation', 'Locked continuation')
            : 'PP —');
        btn.innerHTML = `<strong>${displayMoveName(displayMove)}</strong><small>${displayType(preview?.type || moveData?.type || '')} · ${preview?.category || moveData?.category || '—'}${preview?.power ? ` · ${preview.power} BP` : ''}${preview?.accuracy ? ` · ${preview.accuracy}%` : ''} · ${ppLabel}${zLabel}${disabled ? ' · 엔진 비활성 / Engine-disabled' : ''}</small>`;
      });
      if (!btn.disabled) {
        btn.addEventListener('click', () => {
          const nextChoice = buildEngineMoveChoiceFromDraft(player, activeIndex, moveIndex, battle);
          if (!nextChoice) return;
          setEnginePendingChoice(player, activeIndex, nextChoice, battle);
          renderBattle();
        });
      }
      moveButtons.appendChild(btn);
    });
    section.appendChild(moveButtons);

    if (choice.kind === 'switch') {
      const switchWrap = document.createElement('div');
      switchWrap.className = 'choice-buttons';
      getEngineSwitchOptions(player, activeIndex, battle).forEach(({mon: option, index}) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = `choice-btn ${choice.switchTo === index ? 'selected' : ''}`;
        btn.innerHTML = `<strong>${displayBattleSpeciesName(option)}</strong><small>HP ${option.hp}/${option.maxHp}</small>`;
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
function renderBattleFieldStatus() {
  if (!els.battleFieldStatus || !state.battle) return;
  const battle = state.battle;
  const parts = [];
  if (battle.weather) parts.push(`${weatherDisplayLabel(battle.weather)} (${battle.weatherTurns})`);
  if (battle.terrain) parts.push(`${terrainDisplayLabel(battle.terrain)} (${battle.terrainTurns})`);
  if (battle.trickRoomTurns > 0) parts.push(lang(`트릭룸 (${battle.trickRoomTurns})`, `Trick Room (${battle.trickRoomTurns})`));

  const p1Hazards = describeHazards(battle.players[0]);
  const p2Hazards = describeHazards(battle.players[1]);
  const p1Side = describeSideConditions(battle.players[0]);
  const p2Side = describeSideConditions(battle.players[1]);

  if (p1Hazards && !/^없음$/i.test(p1Hazards) && !/^none$/i.test(p1Hazards)) {
    parts.push(state.language === 'ko' ? `${battle.players[0].name} 함정 ${p1Hazards}` : `${battle.players[0].name} hazards ${p1Hazards}`);
  }
  if (p2Hazards && !/^없음$/i.test(p2Hazards) && !/^none$/i.test(p2Hazards)) {
    parts.push(state.language === 'ko' ? `${battle.players[1].name} 함정 ${p2Hazards}` : `${battle.players[1].name} hazards ${p2Hazards}`);
  }
  if (p1Side && !/^없음$/i.test(p1Side) && !/^none$/i.test(p1Side)) {
    parts.push(state.language === 'ko' ? `${battle.players[0].name} 진영 ${p1Side}` : `${battle.players[0].name} side ${p1Side}`);
  }
  if (p2Side && !/^없음$/i.test(p2Side) && !/^none$/i.test(p2Side)) {
    parts.push(state.language === 'ko' ? `${battle.players[1].name} 진영 ${p2Side}` : `${battle.players[1].name} side ${p2Side}`);
  }

  els.battleFieldStatus.textContent = parts.join(' · ') || lang('날씨 없음 · 지형 없음', 'No weather · No terrain');
}
function getActiveMons(player, battle = state.battle) {
  const side = battle?.players?.[player];
  if (!side) return [];
  return getBattleActiveIndices(player, battle).map(idx => side.team[idx]).filter(Boolean);
}
function getBattleBadgeText(mon) {
  if (!mon) return '';
  const parts = [];
  if (mon.megaUsed || /-mega/i.test(mon.species || '')) parts.push(lang('메가', 'Mega'));
  if (/-primal/i.test(mon.species || '')) parts.push(lang('원시회귀', 'Primal'));
  if (/-ultra/i.test(mon.species || '')) parts.push(lang('울트라버스트', 'Ultra Burst'));
  if (mon.terastallized) parts.push(lang(`테라 ${displayType(mon.teraType || '')}`, `Tera ${displayType(mon.teraType || '')}`));
  if (mon.dynamaxed) parts.push(mon.gigantamaxed ? lang('거다이맥스', 'G-Max') : lang('다이맥스', 'Dynamax'));
  if (parts.length) return parts.join(' · ');
  return '';
}

function getBattleUiState(battle = state.battle) {
  if (!battle) return null;
  const ui = state.battleUi || (state.battleUi = {});
  if (!Number.isInteger(ui.perspective)) ui.perspective = 0;
  ui.modeByPlayer = ui.modeByPlayer || {0: 'command', 1: 'command'};
  ui.moveDetailByPlayer = ui.moveDetailByPlayer || {0: {}, 1: {}};
  if (typeof ui.inputLocked !== 'boolean') ui.inputLocked = false;
  ui.timelineSpriteOverrides = ui.timelineSpriteOverrides || {};
  if (typeof ui.passPrompt !== 'string') ui.passPrompt = '';
  if (typeof ui.lastFlyoutKey !== 'string') ui.lastFlyoutKey = '';
  if (!('flyoutTimer' in ui)) ui.flyoutTimer = null;
  return ui;
}

function isBattleInputLocked(battle = state.battle) {
  const ui = getBattleUiState(battle);
  return Boolean(ui?.inputLocked);
}

function setBattleInputLocked(locked, battle = state.battle, { rerender = false } = {}) {
  const ui = getBattleUiState(battle);
  if (!ui) return;
  ui.inputLocked = Boolean(locked);
  if (rerender) renderBattle();
}

function forceBattleMessageOnlyUiDuringLock(battle = state.battle) {
  const ui = getBattleUiState(battle);
  if (!ui || !battle) return;
  const perspective = clamp(Number(ui.perspective || 0), 0, 1);
  renderBattleMessagesWindow(battle, perspective);
  renderBattleBottomWindows(battle, perspective);
  // Phaser transplant UI mode constants: MESSAGE = 0 (ui-mode.js)
  getTimelineExecutorConfigs().forEach(cfg => {
    const scene = cfg.scene?.();
    if (!scene?.ui?.setMode) return;
    try { scene.ui.setMode(0); } catch (_error) {}
  });
}

function getDefaultBattleUiModeForPlayer(player, battle = state.battle) {
  const request = getEngineRequestForPlayer(player, battle);
  if (battle?.winner) return 'message';
  if (!request || request.wait || request.teamPreview) return 'message';
  if (isEngineForceSwitchRequest(request)) return 'party';
  return 'command';
}

function getBattleDisplayMode(player, battle = state.battle) {
  const ui = getBattleUiState(battle);
  const mode = ui?.modeByPlayer?.[player] || getDefaultBattleUiModeForPlayer(player, battle);
  if (ui?.inputLocked && ['command', 'fight', 'party', 'target'].includes(mode)) return 'message';
  return mode;
}

function syncBattleUiState(battle = state.battle) {
  const ui = getBattleUiState(battle);
  if (!ui || !battle) return ui;
  const dualView = FLAGS.battleDualViewV1 === true;
  const actionablePlayers = isShowdownLocalBattle(battle) ? getEnginePlayersNeedingAction(battle) : [];
  if (!dualView) {
    if (actionablePlayers.length && !actionablePlayers.includes(ui.perspective)) {
      ui.perspective = actionablePlayers[0];
    } else if (!actionablePlayers.length) {
      ui.perspective = clamp(Number(ui.perspective || 0), 0, 1);
    }
  } else {
    ui.perspective = clamp(Number(ui.perspective || 0), 0, 1);
    ui.passPrompt = '';
  }
  [0, 1].forEach(player => {
    const defaultMode = getDefaultBattleUiModeForPlayer(player, battle);
    const request = getEngineRequestForPlayer(player, battle);
    const current = ui.modeByPlayer[player] || defaultMode;
    if (battle.winner || !request || request.wait || request.teamPreview) {
      ui.modeByPlayer[player] = 'message';
      return;
    }
    if (ui.inputLocked && ['command', 'fight', 'party', 'target'].includes(current)) {
      ui.modeByPlayer[player] = current;
      return;
    }
    if (isEngineForceSwitchRequest(request)) {
      // Only force 'party' if the player has NOT yet committed a choice.
      // Without this guard, syncBattleUiState re-enters after handleBattleChoiceCommitted
      // and overwrites mode='message' back to 'party', preventing the screen from closing.
      if (!isPlayerReady(player)) {
        ui.modeByPlayer[player] = 'party';
      }
      return;
    }
    if (current === 'party' && !getEngineSwitchOptions(player, getEngineActionSlots(player, battle)[0] ?? 0, battle).length) {
      ui.modeByPlayer[player] = 'command';
      return;
    }
    ui.modeByPlayer[player] = ['message', 'command', 'fight', 'party', 'target'].includes(current) ? current : defaultMode;
  });
  return ui;
}

function setBattlePerspective(player, {prompt = ''} = {}) {
  const ui = getBattleUiState(state.battle);
  if (!ui) return;
  ui.perspective = clamp(Number(player || 0), 0, 1);
  ui.passPrompt = prompt || '';
  renderBattle();
}

function setBattleUiMode(player, mode, {rerender = true} = {}) {
  const ui = getBattleUiState(state.battle);
  if (!ui) return;
  ui.modeByPlayer[player] = mode;
  if (rerender) renderBattle();
}

function resetBattlePresentationState({perspective = 0, passPrompt = ''} = {}) {
  const ui = state.battleUi || (state.battleUi = {});
  ui.perspective = clamp(Number(perspective || 0), 0, 1);
  ui.modeByPlayer = {0: 'command', 1: 'command'};
  ui.moveDetailByPlayer = {0: {}, 1: {}};
  ui.inputLocked = false;
  ui.timelineSpriteOverrides = {};
  ui.passPrompt = passPrompt || '';
  ui.lastFlyoutKey = '';
  if (ui.flyoutTimer) clearTimeout(ui.flyoutTimer);
  ui.flyoutTimer = null;
  els.battleAbilityFlyout?.classList.remove('show');
  els.battleAbilityFlyout?.classList.add('hidden');
}

function handleBattleChoiceCommitted(player, battle = state.battle) {
  const ui = getBattleUiState(battle);
  if (!ui || !battle) return;
  if (ui.inputLocked) return;
  ui.modeByPlayer[player] = 'message';

  // Dual-view mode: both player screens stay visible simultaneously.
  // Do not switch perspective or display pass-device prompts.
  if (FLAGS.battleDualViewV1) {
    ui.passPrompt = '';
    const actionablePlayers = isShowdownLocalBattle(battle) ? getEnginePlayersNeedingAction(battle) : [];
    actionablePlayers.forEach(nextPlayer => {
      if (Number.isInteger(nextPlayer) && nextPlayer !== player) {
        ui.modeByPlayer[nextPlayer] = getDefaultBattleUiModeForPlayer(nextPlayer, battle);
      }
    });
    return;
  }

  const actionablePlayers = isShowdownLocalBattle(battle) ? getEnginePlayersNeedingAction(battle) : [];
  if (!actionablePlayers.length) {
    ui.passPrompt = '';
    return;
  }
  const nextPlayer = actionablePlayers.find(index => index !== player);
  if (Number.isInteger(nextPlayer)) {
    ui.perspective = nextPlayer;
    ui.modeByPlayer[nextPlayer] = getDefaultBattleUiModeForPlayer(nextPlayer, battle);
    ui.passPrompt = lang(
      `이제 ${battle.players[nextPlayer].name} 차례입니다. 기기를 넘겨 주세요.`,
      `It is now ${battle.players[nextPlayer].name}'s turn. Pass the device.`
    );
    return;
  }
  ui.perspective = player;
  ui.passPrompt = '';
}

function renderBattlePerspectiveTabs(battle) {
  const ui = getBattleUiState(battle);
  if (!ui) return;
  els.battlePerspectiveP1Btn?.classList.toggle('active', ui.perspective === 0);
  els.battlePerspectiveP2Btn?.classList.toggle('active', ui.perspective === 1);
  if (els.battlePerspectiveP1Btn) els.battlePerspectiveP1Btn.textContent = battle.players?.[0]?.name || 'P1';
  if (els.battlePerspectiveP2Btn) els.battlePerspectiveP2Btn.textContent = battle.players?.[1]?.name || 'P2';
  if (els.battlePerspectiveBanner) {
    const chip = isShowdownLocalBattle(battle) ? getEngineTurnChipState(ui.perspective, battle) : {text: ''};
    const playerLabel = battle.players?.[ui.perspective]?.name || `P${ui.perspective + 1}`;
    els.battlePerspectiveBanner.textContent = ui.passPrompt || `${playerLabel} · ${chip.text || lang('배틀 화면', 'Battle screen')}`;
  }
}

function renderBattleMessagesWindow(battle, player) {
  if (!els.battleMessageWindow) return;
  const inputLocked = isBattleInputLocked(battle);
  const request = getEngineRequestForPlayer(player, battle);
  const currentMode = getBattleDisplayMode(player, battle);
  const activeIndex = getEngineActionSlots(player, battle)[0] ?? getBattleActiveIndices(player, battle)[0] ?? 0;
  const activeMon = battle?.players?.[player]?.team?.[activeIndex] || null;
  const pokemonName = displayBattleSpeciesName(activeMon);
  const promptText = battle.winner
    ? lang('배틀이 종료되었습니다.', 'The battle has ended.')
    : !request
      ? lang('엔진 요청을 기다리는 중입니다.', 'Waiting for an engine request.')
      : request.wait
        ? lang('상대의 입력 또는 턴 진행을 기다리는 중입니다.', 'Waiting for the opposing input or turn resolution.')
        : isEngineForceSwitchRequest(request)
          ? lang('교체할 포켓몬을 선택하세요.', 'Choose a replacement Pokémon.')
          : currentMode === 'command'
            ? lang(`${pokemonName}, 무엇을 할까?`, `What will ${pokemonName} do?`)
            : currentMode === 'fight'
              ? lang('기술을 선택하세요.', 'Choose a move.')
              : currentMode === 'party'
                ? lang('교체할 포켓몬을 선택하세요.', 'Choose a Pokémon to switch in.')
                  : currentMode === 'target'
                    ? lang('대상을 선택하세요.', 'Choose a target.')
                    : currentMode === 'message'
                    ? (inputLocked ? '' : lang('상대의 턴을 기다리는 중...', "Waiting for opponent's turn..."))
                    : lang('행동을 선택하세요.', 'Choose an action.');
  const messageLines = (battle.log || []).slice(0, 2).map(line => localizeText(line.rawText || line.text || '').trim()).filter(Boolean);
  // BA-21: waiting for opponent — waiting message takes priority over battle.log lines
  const waitingForOpponent = !inputLocked && !battle.winner && currentMode === 'message' && Boolean(request);
  const usePromptAsPrimary = currentMode === 'command' || waitingForOpponent || !messageLines.length;
  const primaryText = usePromptAsPrimary ? promptText : messageLines[0];
  const secondaryText = waitingForOpponent
    ? ''
    : usePromptAsPrimary
      ? (messageLines[0] || '')
      : (messageLines[1] || (inputLocked ? '' : (promptText !== primaryText ? promptText : '')));
  const showPromptIcon = !inputLocked && !battle.winner && !waitingForOpponent && Boolean(request) && !request.wait;
  els.battleMessageWindow.innerHTML = `
    <div class="pkbattle-message-stack ${currentMode === 'command' ? 'is-command' : ''}">
      <div class="pkbattle-message-primary">${primaryText}</div>
      ${secondaryText ? `<div class="pkbattle-message-secondary">${secondaryText}</div>` : ''}
      ${showPromptIcon ? '<span class="pkbattle-message-prompt-icon" aria-hidden="true"></span>' : ''}
    </div>`;
  if (showPromptIcon) {
    renderPokeroguePromptIcon(els.battleMessageWindow.querySelector('.pkbattle-message-prompt-icon'));
  }
}

function maybeShowBattleAbilityFlyout(battle) {
  const ui = getBattleUiState(battle);
  const flyout = els.battleAbilityFlyout;
  if (!ui || !flyout) return;
  const latest = battle?.log?.[0];
  const text = localizeText(latest?.rawText || latest?.text || '').trim();
  if (!text) return;
  const looksLikeFlyout = latest?.tone === 'accent' || /ability|특성|intimidate|download|sword|드라이브|테라|mega|ultra|dynamax/i.test(text);
  if (!looksLikeFlyout) return;
  const key = `${battle.turn}|${text}`;
  if (ui.lastFlyoutKey === key) return;
  ui.lastFlyoutKey = key;
  flyout.textContent = text;
  const lower = text.toLowerCase();
  const playerName = (battle.players?.[0]?.name || '').toLowerCase();
  const enemyName = (battle.players?.[1]?.name || '').toLowerCase();
  const playerMonNames = getActiveMons(0, battle).map(mon => String(displayBattleSpeciesName(mon, '')).toLowerCase());
  const enemyMonNames = getActiveMons(1, battle).map(mon => String(displayBattleSpeciesName(mon, '')).toLowerCase());
  const playerSide = [playerName, ...playerMonNames].some(token => token && lower.includes(token));
  const enemySide = [enemyName, ...enemyMonNames].some(token => token && lower.includes(token));
  flyout.className = `pkbattle-ability-flyout ${enemySide && !playerSide ? 'enemy' : 'player'} show`;
  flyout.classList.remove('hidden');
  if (ui.flyoutTimer) clearTimeout(ui.flyoutTimer);
  ui.flyoutTimer = setTimeout(() => {
    if (!els.battleAbilityFlyout) return;
    els.battleAbilityFlyout.classList.remove('show');
    els.battleAbilityFlyout.classList.add('hidden');
  }, 1800);
}

function renderPokerogueTypeIcon(element, typeName = '') {
  if (!element) return;
  const normalized = toId(typeName || '') || 'unknown';
  applyPokerogueAtlasFrameToElement(element, 'types', normalized, {width: 32, height: 14}).catch(() => {
    element.textContent = displayType(typeName || 'unknown');
  });
}

function renderBattleInfoTypeIcon(element, typeName = '', {player = false, slot = 0} = {}) {
  if (!element) return;
  const normalized = toId(typeName || '') || 'unknown';
  const atlasName = player
    ? (slot > 0 ? 'pbinfo_player_type2' : 'pbinfo_player_type1')
    : (slot > 0 ? 'pbinfo_enemy_type2' : 'pbinfo_enemy_type1');
  applyPokerogueAtlasFrameToElement(element, atlasName, normalized, {width: 20, height: 12}).catch(() => {
    renderPokerogueTypeIcon(element, typeName);
  });
}

function renderPokeroguePromptIcon(element, frame = '1') {
  if (!element) return;
  applyPokerogueAtlasFrameToElement(element, 'prompt', String(frame || '1'), {width: 7, height: 8}).catch(() => {
    element.textContent = '›';
  });
}

function renderPokerogueCategoryIcon(element, category = '') {
  if (!element) return;
  const normalized = /special/i.test(category) ? 'special' : /status/i.test(category) ? 'status' : 'physical';
  applyPokerogueAtlasFrameToElement(element, 'categories', normalized, {width: 28, height: 11}).catch(() => {
    element.textContent = normalized;
  });
}

function renderBattleInfoBox(player, container, mon) {
  if (!container) return;
  if (!mon) {
    container.innerHTML = `<div class="pkbattle-info-inner"><div class="pkbattle-name-row"><strong>${lang('빈 자리', 'No battler')}</strong></div></div>`;
    return;
  }
  const displayName = displayBattleSpeciesName(mon);
  const badgeText = getBattleBadgeText(mon);
  const statusHtml = mon.status
    ? `<span class="pkbattle-status-pill">${getStatusIcon(mon.status) ? `<img src="${getStatusIcon(mon.status)}" alt="${mon.status}"/>` : ''}${displayStatus(mon.status)}</span>`
    : '';
  const levelLabel = Number.isFinite(mon.level) ? `Lv ${mon.level}` : '';
  const expPct = Number.isFinite(mon.levelExp) && Number.isFinite(mon.levelTotalExp) && mon.levelTotalExp > 0
    ? clamp((mon.levelExp / mon.levelTotalExp) * 100, 0, 100)
    : 0;
  container.innerHTML = `
    <div class="pkbattle-info-inner">
      <div class="pkbattle-name-row"><strong>${displayName}</strong><span class="pkbattle-level">${levelLabel}</span></div>
      <div class="pkbattle-subrow">
        <span class="pkbattle-subrow-left">${statusHtml}</span>
        <span class="pkbattle-subrow-right"><span class="pkbattle-type-icons"></span></span>
      </div>
      <div class="pkbattle-hp-row">
        <div class="pkbattle-hp-track"><div class="pkbattle-hp-fill ${hpFillClass(mon)}" style="width:${hpPercent(mon)}%"></div></div>
        <div class="pkbattle-hp-meta"><span>HP ${mon.hp}/${mon.maxHp}</span><span>${mon.fainted ? lang('기절', 'Fainted') : ''}</span></div>
        ${player === 0 ? `<div class="pkbattle-exp-track"><div class="pkbattle-exp-fill" style="width:${expPct}%"></div></div>` : ''}
      </div>
      ${badgeText ? `<div class="pkbattle-badge-line">${badgeText.split(' · ').map(text => `<span class="pkbattle-mini-badge">${text}</span>`).join('')}</div>` : ''}
    </div>`;
  const typeRow = container.querySelector('.pkbattle-type-icons');
  (mon.types || []).slice(0, 2).forEach((typeName, index) => {
    const icon = document.createElement('span');
    icon.className = 'pkbattle-type-icon';
    typeRow?.appendChild(icon);
    renderBattleInfoTypeIcon(icon, typeName, {player: player === 0, slot: index});
  });
}

function renderBattlePokeballTray(player, container, battle = state.battle) {
  if (!container || !battle) return;
  const side = battle.players?.[player];
  if (!side) {
    container.innerHTML = '';
    return;
  }
  const activeSet = new Set(getBattleActiveIndices(player, battle));
  container.innerHTML = '<div class="pkbattle-pbtray-balls"></div>';
  const wrap = container.firstElementChild;
  for (let index = 0; index < 6; index += 1) {
    const ball = document.createElement('span');
    ball.className = `pkbattle-pbball ${activeSet.has(index) ? 'active' : ''}`;
    wrap?.appendChild(ball);
    const mon = side.team?.[index];
    const frame = !mon ? 'empty' : !mon.hp || mon.fainted ? 'faint' : mon.status ? 'status' : 'ball';
    applyPokerogueAtlasFrameToElement(ball, 'pb_tray_ball', frame, {width: 14, height: 14}).catch(() => {
      ball.textContent = '•';
    });
  }
}

function renderBattleDebugPanel(battle) {
  if (els.battleDebugSummary) {
    const runtimeLabel = localizeText(els.battleRuntimeChip?.textContent || '');
    const winnerLabel = battle.winner ? lang(`승자: ${battle.winner}`, `Winner: ${battle.winner}`) : lang('아직 승자 없음', 'No winner yet');
    const actionable = isShowdownLocalBattle(battle) ? getEnginePlayersNeedingAction(battle).map(player => battle.players[player]?.name || `P${player + 1}`) : [];
    els.battleDebugSummary.textContent = `${runtimeLabel} · ${winnerLabel} · ${lang('행동 필요', 'Needs action')}: ${actionable.join(', ') || lang('없음', 'None')}`;
  }
  els.battleLog.innerHTML = (battle.log || []).map(line => `<div class="log-line ${line.tone || ''}">${localizeText(line.rawText || line.text)}</div>`).join('');
  renderPendingChoices();
}

function buildMoveDetailFallback(mon, moveInfo, moveRequest, choice, moveData, moveIndex) {
  const previewChoice = choice?.kind === 'move' && choice.moveIndex === moveIndex ? choice : null;
  return moveData ? describeMoveForBattle(mon, moveData, previewChoice) : {
    type: moveData?.type || moveInfo?.type || '',
    category: moveData?.category || '',
    power: moveData?.basePower || '',
    accuracy: moveData?.accuracy || '',
  };
}


function buildLocalMoveUiData(moveName = '') {
  const move = state.dex?.moves?.get?.(moveName);
  if (!move?.exists) return null;
  return {
    id: move.id,
    name: move.name,
    type: String(move.type || '').toLowerCase(),
    category: String(move.category || '').toLowerCase(),
    power: move.basePower || 0,
    accuracy: move.accuracy === true ? 100 : (move.accuracy || 100),
    shortDesc: move.shortDesc || move.desc || '',
    desc: move.desc || move.shortDesc || '',
    zMoveName: move.zMove?.name || '',
    zBasePower: move.zMove?.basePower || move.zMovePower || getDefaultZMovePower(move.basePower || 0),
  };
}

function buildPhaserMoveDetailModel(mon, moveInfo, slotInfo, moveRequest, choice, moveIndex) {
  const moveName = moveInfo?.move || slotInfo?.name || '';
  const displayMove = getEngineDisplayMoveName(moveRequest, moveIndex, moveName, choice, mon);
  const moveData = buildLocalMoveUiData(displayMove || moveName);
  const preview = buildMoveDetailFallback(mon, moveInfo, moveRequest, choice, moveData, moveIndex) || {};
  const zInfo = Array.isArray(moveRequest?.canZMove) ? moveRequest.canZMove[moveIndex] : null;
  const resolvedType = toId(preview?.type || moveData?.type || '') || 'unknown';
  const resolvedCategory = toId(preview?.category || moveData?.category || 'status') || 'status';
  const accuracyValue = preview?.accuracy ?? moveData?.accuracy;
  const ppCurrent = Number.isFinite(moveInfo?.pp) ? moveInfo.pp : (slotInfo?.pp ?? null);
  const ppMax     = Number.isFinite(moveInfo?.maxpp) ? moveInfo.maxpp : (slotInfo?.maxPp ?? null);
  const ppRatio   = (ppMax > 0 && ppCurrent !== null) ? clamp(ppCurrent / ppMax, 0, 1) : null;
  return {
    name: displayMoveName(preview?.name || ((choice?.z && zInfo?.move) ? zInfo.move : displayMove || moveName || lang('기술 없음', 'No move'))),
    type: resolvedType,
    typeLabel: displayType(preview?.type || moveData?.type || '') || '—',
    category: ['physical', 'special', 'status'].includes(resolvedCategory) ? resolvedCategory : 'status',
    ppLabel: `${ppCurrent ?? '—'}/${ppMax ?? '—'}`,
    ppRatio,
    powerLabel: `${preview?.power ?? moveData?.power ?? '—'}`,
    accuracyLabel: `${accuracyValue ?? '—'}`,
    description: localizeText(moveData?.shortDesc || moveData?.desc || lang('설명 없음', 'No move description available.')),
  };
}

function renderBattleFightWindow(battle, player) {
  const container = els.battleStateWindow;
  if (!container) return;
  const side = battle.players[player];
  const activeIndex = getEngineActionSlots(player, battle)[0] ?? getBattleActiveIndices(player, battle)[0] ?? 0;
  const requestSlot = Math.max(0, getEngineRequestSlotForActiveIndex(player, activeIndex, battle));
  const mon = side?.team?.[activeIndex];
  const moveRequest = getEngineMoveRequest(player, requestSlot, battle);
  const choice = getEngineDraftChoice(player, activeIndex, battle);
  const availableZMoves = getAvailableEngineZMoveOptions(moveRequest);
  const forcedContinuation = isEngineForcedContinuationRequest(moveRequest);
  const inputLocked = isBattleInputLocked(battle);
  const ui = getBattleUiState(battle);
  if (!Number.isInteger(ui.moveDetailByPlayer[player]?.[activeIndex])) ui.moveDetailByPlayer[player][activeIndex] = 0;
  const detailIndex = clamp(Number(ui.moveDetailByPlayer[player][activeIndex] || 0), 0, Math.max(((moveRequest?.moves || []).length || 1) - 1, 0));
  const canSwitch = !forcedContinuation && canEngineSwitchNormally(player, requestSlot, battle) && getEngineSwitchOptions(player, activeIndex, battle).length > 0;
  container.innerHTML = `
    <div class="pkbattle-fight-shell pkbattle-window-layout-fight">
      <div class="pkbattle-fight-main">
        <div class="pkbattle-move-grid" id="pkbattle-move-grid"></div>
      </div>
      <aside class="pkbattle-fight-detail" id="pkbattle-fight-detail"></aside>
    </div>`;

  const moveGrid = container.querySelector('#pkbattle-move-grid');
  const detailPanel = container.querySelector('#pkbattle-fight-detail');

  function renderFightDetailActions() {
    const actions = detailPanel.querySelector('.pkbattle-fight-detail-actions');
    if (!actions) return;
    actions.innerHTML = '';

    const backBtn = document.createElement('button');
    backBtn.type = 'button';
    backBtn.className = 'pkbattle-inline-action';
    backBtn.textContent = lang('뒤로', 'Back');
    backBtn.disabled = inputLocked;
    if (!inputLocked) backBtn.addEventListener('click', () => setBattleUiMode(player, 'command'));
    actions.appendChild(backBtn);

    const switchBtn = document.createElement('button');
    switchBtn.type = 'button';
    switchBtn.className = `pkbattle-inline-action ${choice.kind === 'switch' ? 'active' : ''}`;
    switchBtn.disabled = inputLocked || !canSwitch;
    switchBtn.textContent = lang('포켓몬', 'Pokémon');
    if (!switchBtn.disabled) switchBtn.addEventListener('click', () => setBattleUiMode(player, 'party'));
    actions.appendChild(switchBtn);

    if (!forcedContinuation && moveRequest?.canTerastallize) {
      const teraBtn = document.createElement('button');
      teraBtn.type = 'button';
      teraBtn.className = `pkbattle-inline-action pkbattle-inline-action-gimmick ${choice.tera ? 'active' : ''}`;
      teraBtn.innerHTML = `<span class="pkbattle-tera-icon"></span><span>${lang('테라', 'Tera')}</span>`;
      teraBtn.disabled = inputLocked;
      renderTeraButtonIcon(teraBtn.querySelector('.pkbattle-tera-icon'), moveRequest.canTerastallize);
      if (!teraBtn.disabled) {
        teraBtn.addEventListener('click', () => {
          if (!toggleEngineDraftFlag(player, activeIndex, 'tera', battle)) return;
          renderBattle();
        });
      }
      actions.appendChild(teraBtn);
    }

    const gimmickFlags = [
      ['z', availableZMoves.length, 'Z'],
      ['mega', moveRequest?.canMegaEvo, 'Mega'],
      ['ultra', moveRequest?.canUltraBurst, 'Ultra'],
    ];
    gimmickFlags.forEach(([flag, enabled, label]) => {
      if (!enabled || forcedContinuation) return;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `pkbattle-inline-action pkbattle-inline-action-gimmick ${choice[flag] ? 'active' : ''}`;
      btn.textContent = label;
      btn.disabled = inputLocked;
      if (!btn.disabled) {
        btn.addEventListener('click', () => {
          if (!toggleEngineDraftFlag(player, activeIndex, flag, battle)) return;
          renderBattle();
        });
      }
      actions.appendChild(btn);
    });
    if (!forcedContinuation) {
      const canUseDynamax = canUseDynamaxNow(moveRequest);
      const dynamaxReason = getDynamaxUnavailableReason(moveRequest);
      const dmaxBtn = document.createElement('button');
      dmaxBtn.type = 'button';
      dmaxBtn.className = `pkbattle-inline-action pkbattle-inline-action-gimmick ${choice.dynamax && canUseDynamax ? 'active' : ''}`;
      dmaxBtn.textContent = 'Dmax';
      dmaxBtn.disabled = inputLocked || !canUseDynamax;
      if (dynamaxReason) dmaxBtn.title = dynamaxReason;
      if (!dmaxBtn.disabled) {
        dmaxBtn.addEventListener('click', () => {
          if (!toggleEngineDraftFlag(player, activeIndex, 'dynamax', battle)) return;
          renderBattle();
        });
      }
      actions.appendChild(dmaxBtn);
    }
  }

  function updateMoveDetail(idx) {
    ui.moveDetailByPlayer[player][activeIndex] = idx;
    const moveInfo = moveRequest?.moves?.[idx] || null;
    const slotInfo = mon?.moveSlots?.[idx] || null;
    const moveName = moveInfo?.move || slotInfo?.name || '';
    const activeChoice = getEngineDraftChoice(player, activeIndex, battle);
    const displayedMoveName = getEngineDisplayMoveName(moveRequest, idx, moveName, activeChoice, mon);
    detailPanel.innerHTML = `<div class="pkbattle-window-note">${lang('불러오는 중…', 'Loading…')}</div>`;
    Promise.resolve(getMoveData(moveName).catch(() => null)).then(moveData => {
      if (!detailPanel.isConnected) return;
      const preview = buildMoveDetailFallback(mon, moveInfo, moveRequest, activeChoice, moveData, idx);
      const resolvedCategory = preview?.category || moveData?.category || '—';
      const resolvedName = displayMoveName(preview?.name || displayedMoveName || moveName || lang('기술 없음', 'No move'));
      detailPanel.innerHTML = `
        <div class="pkbattle-detail-top">
          <div class="pkbattle-detail-name-wrap">
            <strong>${resolvedName}</strong>
            <span class="pkbattle-detail-type">${displayType(preview?.type || moveData?.type || '') || '—'}</span>
          </div>
          <span class="pkbattle-category-icon pkbattle-detail-category" aria-hidden="true"></span>
        </div>
        <div class="pkbattle-detail-stats">
          <div class="pkbattle-detail-stat"><span class="pkbattle-detail-stat-label">PP</span><span>${Number.isFinite(moveInfo?.pp) ? moveInfo.pp : (slotInfo?.pp ?? '—')}/${Number.isFinite(moveInfo?.maxpp) ? moveInfo.maxpp : (slotInfo?.maxPp ?? '—')}</span></div>
          <div class="pkbattle-detail-stat"><span class="pkbattle-detail-stat-label">${lang('위력', 'Power')}</span><span>${preview?.power ?? moveData?.basePower ?? '—'}</span></div>
          <div class="pkbattle-detail-stat"><span class="pkbattle-detail-stat-label">${lang('명중', 'Accuracy')}</span><span>${preview?.accuracy ?? moveData?.accuracy ?? '—'}</span></div>
        </div>
        <div class="pkbattle-detail-desc">${localizeText(moveData?.shortDesc || moveData?.desc || lang('설명 없음', 'No move description available.'))}</div>
        <div class="pkbattle-fight-detail-actions"></div>`;
      renderPokerogueCategoryIcon(detailPanel.querySelector('.pkbattle-detail-category'), resolvedCategory);
      renderFightDetailActions();
    });
  }

  (moveRequest?.moves || []).forEach((moveInfo, moveIndex) => {
    const slotInfo = mon?.moveSlots?.[moveIndex] || null;
    const moveName = moveInfo?.move || slotInfo?.name || '';
    const displayedMoveName = getEngineDisplayMoveName(moveRequest, moveIndex, moveName, choice, mon);
    const selectable = isEngineMoveButtonSelectable(moveRequest, moveInfo, moveIndex) && (!(choice.z && availableZMoves.length) || Boolean(moveRequest.canZMove?.[moveIndex]));
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `pkbattle-move-card pkbattle-move-textline ${choice.kind === 'move' && choice.moveIndex === moveIndex ? 'active' : ''}`;
    button.disabled = inputLocked || !selectable || forcedContinuation;
    button.innerHTML = `<strong>${displayMoveName(displayedMoveName)}</strong>`;
    Promise.resolve(getMoveData(moveName).catch(() => null)).then(moveData => {
      if (!button.isConnected) return;
      const preview = buildMoveDetailFallback(mon, moveInfo, moveRequest, choice, moveData, moveIndex);
      const moveType = displayType(preview?.type || moveData?.type || '') || '—';
      const pp = `${Number.isFinite(moveInfo?.pp) ? moveInfo.pp : (slotInfo?.pp ?? '—')}/${Number.isFinite(moveInfo?.maxpp) ? moveInfo.maxpp : (slotInfo?.maxPp ?? '—')}`;
      button.innerHTML = `<strong>${displayMoveName(preview?.name || displayedMoveName || moveName)}</strong><small>${moveType} · PP ${pp}</small>`;
    });
    button.addEventListener('mouseenter', () => updateMoveDetail(moveIndex));
    button.addEventListener('focus', () => updateMoveDetail(moveIndex));
    if (!button.disabled) {
      button.addEventListener('click', () => {
        if (isBattleInputLocked(battle)) return;
        const nextChoice = buildEngineMoveChoiceFromDraft(player, activeIndex, moveIndex, battle);
        if (!nextChoice) return;
        setEnginePendingChoice(player, activeIndex, nextChoice, battle);
        handleBattleChoiceCommitted(player, battle);
        renderBattle();
      });
    }
    moveGrid.appendChild(button);
  });
  updateMoveDetail(detailIndex);
}

function renderBattleCommandWindow(battle, player) {
  const container = els.battleStateWindow;
  if (!container) return;
  const side = battle.players[player];
  const activeIndex = getEngineActionSlots(player, battle)[0] ?? getBattleActiveIndices(player, battle)[0] ?? 0;
  const mon = side?.team?.[activeIndex];
  const requestSlot = Math.max(0, getEngineRequestSlotForActiveIndex(player, activeIndex, battle));
  const moveRequest = getEngineMoveRequest(player, requestSlot, battle);
  const canSwitch = canEngineSwitchNormally(player, requestSlot, battle) && getEngineSwitchOptions(player, activeIndex, battle).length > 0;
  const inputLocked = isBattleInputLocked(battle);
  const selectedChoice = getEngineDraftChoice(player, activeIndex, battle);
  container.innerHTML = `
    <div class="pkbattle-command-body pkbattle-command-shell" data-species="${displayBattleSpeciesName(mon)}">
      <div class="pkbattle-command-grid" id="pkbattle-command-grid"></div>
    </div>`;
  const grid = container.querySelector('#pkbattle-command-grid');
  const shell = container.querySelector('.pkbattle-command-shell');

  if (moveRequest?.canTerastallize && shell) {
    const teraChip = document.createElement('button');
    teraChip.type = 'button';
    teraChip.className = `pkbattle-command-tera-btn ${selectedChoice.tera ? 'active' : ''}`;
    teraChip.title = `${lang('테라스탈', 'Terastallize')} · ${displayType(moveRequest.canTerastallize)}`;
    teraChip.setAttribute('aria-label', teraChip.title);
    teraChip.innerHTML = `<span class="pkbattle-tera-icon"></span>`;
    teraChip.disabled = inputLocked;
    renderTeraButtonIcon(teraChip.querySelector('.pkbattle-tera-icon'), moveRequest.canTerastallize);
    if (!teraChip.disabled) {
      teraChip.addEventListener('click', () => {
        if (!toggleEngineDraftFlag(player, activeIndex, 'tera', battle)) return;
        renderBattle();
      });
    }
    shell.appendChild(teraChip);
  }

  const commands = [
    {key: 'fight', title: lang('싸운다', 'Fight'), disabled: inputLocked, onClick: () => setBattleUiMode(player, 'fight')},
    {key: 'ball', title: lang('볼', 'Ball'), disabled: true, onClick: null},
    {key: 'pokemon', title: lang('포켓몬', 'Pokémon'), disabled: inputLocked || !canSwitch, onClick: () => setBattleUiMode(player, 'party')},
    {key: 'run', title: lang('도망', 'Run'), disabled: true, onClick: null},
  ];

  commands.forEach((command, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `pkbattle-command-btn pkbattle-command-${command.key} ${index === 0 ? 'active' : ''}`;
    button.disabled = command.disabled;
    button.innerHTML = `<strong>${command.title}</strong>`;
    if (!command.disabled && command.onClick) button.addEventListener('click', command.onClick);
    grid.appendChild(button);
  });
}

function renderBattlePartyWindow(battle, player) {
  const container = els.battleStateWindow;
  if (!container) return;
  const side = battle.players[player];
  const request = getEngineRequestForPlayer(player, battle);
  const activeIndex = getEngineActionSlots(player, battle)[0] ?? getBattleActiveIndices(player, battle)[0] ?? 0;
  const requestSlot = Math.max(0, getEngineRequestSlotForActiveIndex(player, activeIndex, battle));
  const forced = isEngineForceSwitchRequest(request);
  const options = getEngineSwitchOptions(player, activeIndex, battle);
  const inputLocked = isBattleInputLocked(battle);
  container.innerHTML = `
    <div class="pkbattle-party-body pkbattle-party-layout pkbattle-party-layout-rogue">
      <div class="pkbattle-party-heading">
        <strong>${side?.name || `P${player + 1}`}</strong>
        <small>${forced ? lang('강제 교체', 'Forced switch') : lang('포켓몬 교체', 'Switch Pokémon')}</small>
      </div>
      <div class="pkbattle-party-grid-wrap">
        <div class="pkbattle-party-grid" id="pkbattle-party-grid"></div>
      </div>
      <div class="pkbattle-party-footer" id="pkbattle-party-footer"></div>
    </div>`;
  const footer = container.querySelector('#pkbattle-party-footer');
  const grid = container.querySelector('#pkbattle-party-grid');
  if (!forced) {
    const backBtn = document.createElement('button');
    backBtn.type = 'button';
    backBtn.className = 'pkbattle-inline-action';
    backBtn.textContent = lang('취소', 'Cancel');
    backBtn.disabled = inputLocked;
    if (!inputLocked) backBtn.addEventListener('click', () => setBattleUiMode(player, 'command'));
    footer.appendChild(backBtn);
  } else {
    const forcedNote = document.createElement('div');
    forcedNote.className = 'pkbattle-window-note';
    forcedNote.textContent = lang('엔진이 교체를 요구하므로 취소할 수 없습니다.', 'The engine requires a replacement, so this cannot be cancelled.');
    footer.appendChild(forcedNote);
  }
  if (!options.length) {
    grid.innerHTML = `<div class="pkbattle-window-note">${lang('교체 가능한 포켓몬이 없습니다.', 'No switch target is available.')}</div>`;
    return;
  }
  const currentChoice = getEngineDraftChoice(player, activeIndex, battle);
  options.forEach(({mon, index}) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `pkbattle-party-card ${currentChoice.kind === 'switch' && currentChoice.switchTo === index ? 'active' : ''}`;
    button.disabled = inputLocked;
    const sprite = document.createElement('div');
    button.appendChild(sprite);
    renderAnimatedSprite(sprite, {spriteId: resolveBattleRenderSpriteId(mon), facing: 'front', shiny: mon.shiny, size: 'small'});
    const content = document.createElement('div');
    content.className = 'pkbattle-party-card-body';
    const badgeText = getBattleBadgeText(mon);
    content.innerHTML = `<div class="pkbattle-party-card-topline"><strong>${displayBattleSpeciesName(mon)}</strong>${mon.status ? `<span class="pkbattle-status-pill">${getStatusIcon(mon.status) ? `<img src="${getStatusIcon(mon.status)}" alt="${mon.status}"/>` : ''}${displayStatus(mon.status)}</span>` : ''}</div>
      <div class="pkbattle-party-card-meta">${badgeText ? `<span class="pkbattle-mini-badge">${badgeText}</span>` : `<span class="pkbattle-mini-badge">${lang('교체 가능', 'Ready to switch')}</span>`}</div>
      <div class="pkbattle-party-card-hp-row"><span class="pkbattle-party-card-hptext">HP ${mon.hp}/${mon.maxHp}</span><div class="hp-bar"><div class="hp-fill ${hpFillClass(mon)}" style="width:${hpPercent(mon)}%"></div></div></div>`;
    button.appendChild(content);
    if (!button.disabled) {
      button.addEventListener('click', () => {
        if (isBattleInputLocked(battle)) return;
        setEnginePendingChoice(player, activeIndex, {...createEmptyBattleChoice(), kind: 'switch', switchTo: index}, battle);
        handleBattleChoiceCommitted(player, battle);
        renderBattle();
      });
    }
    grid.appendChild(button);
  });
}

function renderBattleTargetWindow(battle, player) {
  const container = els.battleStateWindow;
  if (!container) return;
  container.innerHTML = `
    <div class="pkbattle-target-body pkbattle-party-layout">
      <div class="pkbattle-party-sidebar">
        <div class="pkbattle-command-summary">
          <strong>${battle.players?.[player]?.name || `P${player + 1}`}</strong>
          <small>${lang('대상 선택', 'Target select')}</small>
        </div>
        <div class="pkbattle-window-note">${lang(
          '현재 엔진 필수 싱글 경로에서는 대상 선택이 별도 화면으로 노출되지 않습니다. 구조만 유지하고 실제 전투 진실은 엔진 요청을 따릅니다.',
          'The current engine-required singles path does not expose a separate target-select screen. The structural role is preserved while battle truth still comes from engine requests.'
        )}</div>
        <div class="pkbattle-action-row"><button type="button" class="pkbattle-action-btn pkbattle-action-btn-back"><strong>${lang('뒤로', 'Back')}</strong><small>${lang('명령 창으로 돌아갑니다.', 'Return to the command window.')}</small></button></div>
      </div>
      <div class="pkbattle-party-grid-wrap">
        <div class="pkbattle-target-placeholder">${lang('향후 더블 배틀의 대상 선택 모드를 위해 이 자리와 역할을 남겨 둡니다.', 'This role and space are kept for future doubles target-selection flow.')}</div>
      </div>
    </div>`;
  container.querySelector('button')?.addEventListener('click', () => setBattleUiMode(player, 'command'));
}

function renderBattleBottomWindows(battle, player) {
  const ui = getBattleUiState(battle);
  const bottom = els.battleBottom;
  const container = els.battleStateWindow;
  if (!ui || !bottom || !container) return;
  const mode = getBattleDisplayMode(player, battle);
  bottom.classList.remove('mode-message', 'mode-command', 'mode-fight', 'mode-party', 'mode-target');
  bottom.classList.add(`mode-${mode}`);
  container.className = 'pkbattle-window pkbattle-state-window';
  container.dataset.mode = mode;
  container.innerHTML = '';

  const showMessageWindow = mode === 'message' || mode === 'command';
  els.battleMessageWindow?.classList.toggle('hidden', !showMessageWindow);

  if (mode === 'message') {
    container.classList.add('hidden');
    return;
  }
  container.classList.remove('hidden');
  if (mode === 'fight') {
    renderBattleFightWindow(battle, player);
    return;
  }
  if (mode === 'party') {
    renderBattlePartyWindow(battle, player);
    return;
  }
  if (mode === 'target') {
    renderBattleTargetWindow(battle, player);
    return;
  }
  renderBattleCommandWindow(battle, player);
}


function getBattleFieldStatusText(battle = state.battle) {
  if (!battle) return lang('날씨 없음 · 지형 없음', 'No weather · No terrain');
  const parts = [];
  if (battle.weather) parts.push(`${weatherDisplayLabel(battle.weather)} (${battle.weatherTurns})`);
  if (battle.terrain) parts.push(`${terrainDisplayLabel(battle.terrain)} (${battle.terrainTurns})`);
  if (battle.trickRoomTurns > 0) parts.push(lang(`트릭룸 (${battle.trickRoomTurns})`, `Trick Room (${battle.trickRoomTurns})`));
  const p1Hazards = describeHazards(battle.players[0]);
  const p2Hazards = describeHazards(battle.players[1]);
  const p1Side = describeSideConditions(battle.players[0]);
  const p2Side = describeSideConditions(battle.players[1]);
  if (p1Hazards && !/^없음$/i.test(p1Hazards) && !/^none$/i.test(p1Hazards)) parts.push(state.language === 'ko' ? `${battle.players[0].name} 함정 ${p1Hazards}` : `${battle.players[0].name} hazards ${p1Hazards}`);
  if (p2Hazards && !/^없음$/i.test(p2Hazards) && !/^none$/i.test(p2Hazards)) parts.push(state.language === 'ko' ? `${battle.players[1].name} 함정 ${p2Hazards}` : `${battle.players[1].name} hazards ${p2Hazards}`);
  if (p1Side && !/^없음$/i.test(p1Side) && !/^none$/i.test(p1Side)) parts.push(state.language === 'ko' ? `${battle.players[0].name} 진영 ${p1Side}` : `${battle.players[0].name} side ${p1Side}`);
  if (p2Side && !/^없음$/i.test(p2Side) && !/^none$/i.test(p2Side)) parts.push(state.language === 'ko' ? `${battle.players[1].name} 진영 ${p2Side}` : `${battle.players[1].name} side ${p2Side}`);
  return parts.join(' · ') || lang('날씨 없음 · 지형 없음', 'No weather · No terrain');
}
function updateBattleAbilityBarState(battle) {
  const ui = getBattleUiState(battle);
  if (!ui) return {visible: false, text: '', side: 'player'};
  const now = Date.now();
  const latest = battle?.log?.[0];
  const text = localizeText(latest?.rawText || latest?.text || '').trim();
  if (text) {
    const looksLikeFlyout = latest?.tone === 'accent' || /ability|특성|intimidate|download|sword|shield|drive|burst|tera|mega|ultra|dynamax|불요의 검|특성/i.test(text);
    const key = `${battle.turn}|${text}`;
    if (looksLikeFlyout && ui.lastFlyoutKey !== key) {
      ui.lastFlyoutKey = key;
      const lower = text.toLowerCase();
      const playerName = (battle.players?.[0]?.name || '').toLowerCase();
      const enemyName = (battle.players?.[1]?.name || '').toLowerCase();
      const playerMonNames = getActiveMons(0, battle).map(mon => String(displayBattleSpeciesName(mon, '')).toLowerCase());
      const enemyMonNames = getActiveMons(1, battle).map(mon => String(displayBattleSpeciesName(mon, '')).toLowerCase());
      const playerSide = [playerName, ...playerMonNames].some(token => token && lower.includes(token));
      const enemySide = [enemyName, ...enemyMonNames].some(token => token && lower.includes(token));
      ui.currentFlyout = {
        text,
        side: enemySide && !playerSide ? 'enemy' : 'player',
        expiresAt: now + 1800,
      };
    }
  }
  if (ui.currentFlyout?.expiresAt > now) return {visible: true, text: ui.currentFlyout.text, side: ui.currentFlyout.side || 'player'};
  ui.currentFlyout = null;
  return {visible: false, text: '', side: 'player'};
}

function buildBattleMessageModel(battle, player) {
  const inputLocked = isBattleInputLocked(battle);
  const request = getEngineRequestForPlayer(player, battle);
  const currentMode = getBattleDisplayMode(player, battle);
  const activeIndex = getEngineActionSlots(player, battle)[0] ?? getBattleActiveIndices(player, battle)[0] ?? 0;
  const activeMon = battle?.players?.[player]?.team?.[activeIndex] || null;
  const pokemonName = displayBattleSpeciesName(activeMon);
  const promptText = battle.winner
    ? lang('배틀이 종료되었습니다.', 'The battle has ended.')
    : !request
      ? lang('엔진 요청을 기다리는 중입니다.', 'Waiting for an engine request.')
      : request.wait
        ? lang('상대의 입력 또는 턴 진행을 기다리는 중입니다.', 'Waiting for the opposing input or turn resolution.')
        : isEngineForceSwitchRequest(request)
          ? lang('교체할 포켓몬을 선택하세요.', 'Choose a replacement Pokémon.')
          : currentMode === 'command'
            ? lang(`${pokemonName}, 무엇을 할까?`, `What will ${pokemonName} do?`)
            : currentMode === 'fight'
              ? lang('기술을 선택하세요.', 'Choose a move.')
              : currentMode === 'party'
                ? lang('교체할 포켓몬을 선택하세요.', 'Choose a Pokémon to switch in.')
                : currentMode === 'target'
                  ? lang('대상을 선택하세요.', 'Choose a target.')
                  : currentMode === 'message'
                    ? (inputLocked ? '' : lang('상대의 턴을 기다리는 중...', "Waiting for opponent's turn..."))
                    : lang('행동을 선택하세요.', 'Choose an action.');
  const messageLines = (battle.log || []).slice(0, 2).map(line => localizeText(line.rawText || line.text || '').trim()).filter(Boolean);
  const interactiveMode = !inputLocked && !battle.winner && !request?.wait && ['command', 'fight', 'party', 'target'].includes(currentMode);
  // BA-21: player committed and waiting for opponent — waiting message takes priority over battle.log lines
  const waitingForOpponent = !inputLocked && !battle.winner && currentMode === 'message' && Boolean(request);
  const usePromptAsPrimary = interactiveMode || waitingForOpponent || !messageLines.length;
  const primaryText = usePromptAsPrimary ? promptText : messageLines[0];
  const secondaryText = (interactiveMode || waitingForOpponent)
    ? ''
    : usePromptAsPrimary
      ? (messageLines[0] || '')
      : (messageLines[1] || (inputLocked ? '' : (promptText !== primaryText ? promptText : '')));
  return {
    primary: primaryText,
    secondary: secondaryText,
    showPrompt: !inputLocked && !interactiveMode && !waitingForOpponent && !battle.winner && Boolean(messageLines.length || (request?.wait && promptText)),
  };
}

function buildBattleInfoModelFromMon(mon, player = Number(mon?.player ?? 0)) {
  if (!mon) {
    return {
      displayName: lang('빈 자리', 'No battler'),
      levelLabel: '',
      types: [],
      statusLabel: '',
      hpLabel: '',
      hpPercent: 0,
      expPercent: 0,
      badges: [],
      fainted: false,
    };
  }
  const expPct = Number.isFinite(mon.levelExp) && Number.isFinite(mon.levelTotalExp) && mon.levelTotalExp > 0
    ? clamp((mon.levelExp / mon.levelTotalExp) * 100, 0, 100)
    : 0;
  return {
    displayName: displayBattleSpeciesName(mon),
    levelLabel: Number.isFinite(mon.level) ? String(mon.level) : '',
    types: (mon.types || []).map(type => toId(type)),
    statusLabel: mon.status ? displayStatus(mon.status) : '',
    statusEffect: mon.status || '',
    hpLabel: `${mon.hp}/${mon.maxHp}`,
    hp: mon.hp,
    maxHp: mon.maxHp,
    hpPercent: hpPercent(mon),
    expPercent: expPct,
    gender: mon.gender || '',
    shiny: Boolean(mon.shiny),
    teraType: mon.terastallized ? toId(mon.teraType || '') : '',
    dynamaxed: Boolean(mon.dynamaxed),
    gigantamaxed: Boolean(mon.gigantamaxed),
    badges: getBattleBadgeText(mon) ? getBattleBadgeText(mon).split(' · ') : [],
    fainted: Boolean(mon.fainted),
    spriteUrl: spritePath(resolveBattleRenderSpriteId(mon), player === 0 ? 'back' : 'front', mon.shiny),
  };
}

function buildBattleInfoModel(player, battle = state.battle) {
  const mon = getActiveMons(player, battle)[0] || null;
  return buildBattleInfoModelFromMon(mon, player);
}

function buildBattleTrayModel(player, battle = state.battle) {
  const side = battle?.players?.[player];
  const activeSet = new Set(getBattleActiveIndices(player, battle));
  return Array.from({length: 6}, (_, index) => {
    const mon = side?.team?.[index];
    const stateLabel = !mon ? 'empty' : activeSet.has(index) ? 'active' : (!mon.hp || mon.fainted) ? 'faint' : mon.status ? 'status' : 'ball';
    return {state: stateLabel};
  });
}

function buildPhaserCommandWindowModel(battle, player) {
  const side = battle.players[player];
  const activeIndex = getEngineActionSlots(player, battle)[0] ?? getBattleActiveIndices(player, battle)[0] ?? 0;
  const mon = side?.team?.[activeIndex];
  const requestSlot = Math.max(0, getEngineRequestSlotForActiveIndex(player, activeIndex, battle));
  const moveRequest = getEngineMoveRequest(player, requestSlot, battle);
  const canSwitch = canEngineSwitchNormally(player, requestSlot, battle) && getEngineSwitchOptions(player, activeIndex, battle).length > 0;
  const inputLocked = isBattleInputLocked(battle);
  const selectedChoice = getEngineDraftChoice(player, activeIndex, battle);
  const pokemonName = displayBattleSpeciesName(mon);
  return {
    mode: 'command',
    fieldIndex: requestSlot,
    title: `${side?.name || `P${player + 1}`} · ${pokemonName}`,
    prompt: lang(`${pokemonName}, 무엇을 할까?`, `What will ${pokemonName} do?`),
    commands: [
      {label: lang('싸운다', 'Fight'), sublabel: lang('기술 선택', 'Choose a move'), disabled: inputLocked, active: selectedChoice.kind !== 'switch', action: {type: 'command', key: 'fight'}},
      {label: lang('볼', 'Ball'), sublabel: lang('사용 안 함', 'Unused'), disabled: true, action: null},
      {label: lang('포켓몬', 'Pokémon'), sublabel: canSwitch ? lang('교체', 'Switch') : lang('불가', 'Unavailable'), disabled: inputLocked || !canSwitch, active: selectedChoice.kind === 'switch', action: {type: 'command', key: 'party'}},
      {label: lang('도망', 'Run'), sublabel: lang('사용 안 함', 'Unused'), disabled: true, action: null},
    ],
    teraToggle: moveRequest?.canTerastallize ? {
      label: 'Tera',
      type: toId(moveRequest.canTerastallize) || 'unknown',
      active: Boolean(selectedChoice.tera),
      disabled: inputLocked,
      action: {type: 'toggle', flag: 'tera'},
    } : null,
  };
}

function buildPhaserFightWindowModel(battle, player) {
  const side = battle.players[player];
  const activeIndex = getEngineActionSlots(player, battle)[0] ?? getBattleActiveIndices(player, battle)[0] ?? 0;
  const requestSlot = Math.max(0, getEngineRequestSlotForActiveIndex(player, activeIndex, battle));
  const mon = side?.team?.[activeIndex];
  const moveRequest = getEngineMoveRequest(player, requestSlot, battle);
  const choice = getEngineDraftChoice(player, activeIndex, battle);
  const availableZMoves = getAvailableEngineZMoveOptions(moveRequest);
  const forcedContinuation = isEngineForcedContinuationRequest(moveRequest);
  const inputLocked = isBattleInputLocked(battle);
  const canSwitch = !forcedContinuation && canEngineSwitchNormally(player, requestSlot, battle) && getEngineSwitchOptions(player, activeIndex, battle).length > 0;
  const ui = getBattleUiState(battle);
  ui.moveDetailByPlayer = ui.moveDetailByPlayer || {0: {}, 1: {}};
  if (!Number.isInteger(ui.moveDetailByPlayer[player]?.[activeIndex])) ui.moveDetailByPlayer[player][activeIndex] = 0;
  const moveEntries = (moveRequest?.moves || []).slice(0, 4);
  const detailIndex = clamp(Number(ui.moveDetailByPlayer[player][activeIndex] || 0), 0, Math.max(moveEntries.length - 1, 0));
  const moves = moveEntries.map((moveInfo, moveIndex) => {
    const slotInfo = mon?.moveSlots?.[moveIndex];
    const moveName = moveInfo?.move || slotInfo?.name || '—';
    const displayedMoveName = getEngineDisplayMoveName(moveRequest, moveIndex, moveName, choice, mon);
    return {
      label: displayMoveName(displayedMoveName || moveName),
      sublabel: `${displayType(moveInfo?.type || slotInfo?.type || '') || '—'} · PP ${Number.isFinite(moveInfo?.pp) ? moveInfo.pp : (slotInfo?.pp ?? '—')}/${Number.isFinite(moveInfo?.maxpp) ? moveInfo.maxpp : (slotInfo?.maxPp ?? '—')}`,
      disabled: inputLocked || !isEngineMoveButtonSelectable(moveRequest, moveInfo, moveIndex),
      active: choice.kind === 'move' && choice.moveIndex === moveIndex,
      focused: detailIndex === moveIndex,
      action: {type: 'move', moveIndex},
      focusAction: {type: 'focus-move', moveIndex},
    };
  });
  const toggles = [];
  if (!forcedContinuation && moveRequest?.canTerastallize) toggles.push({label: 'Tera', active: Boolean(choice.tera), disabled: inputLocked, action: {type: 'toggle', flag: 'tera'}, kind: 'tera', type: toId(moveRequest.canTerastallize) || 'unknown'});
  if (!forcedContinuation && availableZMoves.length) toggles.push({label: 'Z', active: Boolean(choice.z), disabled: inputLocked, action: {type: 'toggle', flag: 'z'}, kind: 'text'});
  if (!forcedContinuation && moveRequest?.canMegaEvo) toggles.push({label: lang('메가', 'Mega'), active: Boolean(choice.mega), disabled: inputLocked, action: {type: 'toggle', flag: 'mega'}, kind: 'text'});
  if (!forcedContinuation && moveRequest?.canUltraBurst) toggles.push({label: lang('울트라', 'Ultra'), active: Boolean(choice.ultra), disabled: inputLocked, action: {type: 'toggle', flag: 'ultra'}, kind: 'text'});
  if (!forcedContinuation) {
    const canUseDynamax = canUseDynamaxNow(moveRequest);
    toggles.push({
      label: 'Dmax',
      active: Boolean(choice.dynamax && canUseDynamax),
      disabled: inputLocked || !canUseDynamax,
      action: canUseDynamax ? {type: 'toggle', flag: 'dynamax'} : null,
      kind: 'text',
    });
  }
  const detailMoveInfo = moveEntries[detailIndex] || null;
  const detailSlotInfo = mon?.moveSlots?.[detailIndex] || null;
  const detail = buildPhaserMoveDetailModel(mon, detailMoveInfo, detailSlotInfo, moveRequest, choice, detailIndex);
  return {
    mode: 'fight',
    fieldIndex: requestSlot,
    title: `${displayBattleSpeciesName(mon)} · ${lang('기술', 'Moves')}`,
    moves,
    toggles,
    detail,
    footerActions: [
      {label: lang('뒤로', 'Back'), disabled: inputLocked, action: {type: 'command', key: 'command'}},
      {label: lang('교체', 'Switch'), disabled: inputLocked || !canSwitch, action: {type: 'command', key: 'party'}},
    ],
  };
}

function buildPhaserPartyWindowModel(battle, player) {
  const side = battle.players[player];
  const request = getEngineRequestForPlayer(player, battle);
  const activeIndex = getEngineActionSlots(player, battle)[0] ?? getBattleActiveIndices(player, battle)[0] ?? 0;
  const requestSlot = Math.max(0, getEngineRequestSlotForActiveIndex(player, activeIndex, battle));
  const forced = isEngineForceSwitchRequest(request);
  const inputLocked = isBattleInputLocked(battle);
  const options = getEngineSwitchOptions(player, activeIndex, battle);
  const optionMap = new Map(options.map(({mon, index}) => [index, mon]));
  const activeSet = new Set(getBattleActiveIndices(player, battle));
  const currentChoice = getEngineDraftChoice(player, activeIndex, battle);
  return {
    mode: 'party',
    fieldIndex: requestSlot,
    title: `${side?.name || `P${player + 1}`} · ${forced ? lang('강제 교체', 'Forced switch') : lang('교체', 'Switch')}`,
    subtitle: forced
      ? lang('엔진이 교체를 요구하고 있습니다.', 'The engine requires a replacement.')
      : lang('교체할 포켓몬을 선택하세요.', 'Choose the Pokémon to switch in.'),
    partyOptions: (side?.team || []).slice(0, 6).map((mon, index) => {
      if (!mon) {
        return {
          label: lang('빈 슬롯', 'Empty slot'),
          sublabel: '',
          hpPercent: 0,
          hpLabel: '',
          disabled: true,
          active: false,
          action: null,
        };
      }
      const canSwitchTo = optionMap.has(index);
      const fainted = !mon.hp || mon.fainted;
      const hpPercent = mon.maxHp ? Math.max(0, Math.min(100, (mon.hp / mon.maxHp) * 100)) : 0;
      let sublabel = '';
      if (activeSet.has(index)) sublabel += ` · ${lang('전투 중', 'Active')}`;
      else if (fainted) sublabel += ` · ${lang('기절', 'Fainted')}`;
      else if (mon.status) sublabel += ` · ${displayStatus(mon.status)}`;
      return {
        label: displayBattleSpeciesName(mon),
        sublabel,
        hpPercent,
        hpLabel: `${mon.hp}/${mon.maxHp}`,
        level: Number.isFinite(mon.level) ? mon.level : null,
        gender: mon.gender || '',
        statusEffect: mon.status || '',
        fainted: Boolean(fainted),
        iconUrl: iconPath(resolveBattleRenderSpriteId(mon), Boolean(mon.shiny)),
        disabled: inputLocked || !canSwitchTo,
        active: currentChoice.kind === 'switch' && currentChoice.switchTo === index,
        action: !inputLocked && canSwitchTo ? {type: 'switch', switchTo: index} : null,
      };
    }),
    footerActions: forced ? [] : [{label: lang('뒤로', 'Back'), disabled: inputLocked, action: {type: 'command', key: 'command'}}],
  };
}

function buildPhaserTargetWindowModel() {
  return {
    mode: 'target',
    fieldIndex: 0,
    title: lang('대상 선택', 'Target select'),
    placeholder: lang(
      '현재 엔진 필수 싱글 경로에서는 대상 선택이 별도 화면으로 노출되지 않습니다. 이 자리는 향후 더블용 구조 자리만 남겨 둔 상태입니다.',
      'The current engine-required singles path does not expose a separate target-select screen. This space is kept as honest structure for future doubles support.'
    ),
    footerActions: [{label: lang('뒤로', 'Back'), disabled: false, action: {type: 'command', key: 'command'}}],
  };
}

function buildPhaserMessageWindowModel(battle, player) {
  const inputLocked = isBattleInputLocked(battle);
  const request = getEngineRequestForPlayer(player, battle);
  const latestLine = localizeText(battle?.log?.[0]?.rawText || battle?.log?.[0]?.text || '').trim();
  return {
    mode: 'message',
    title: `${battle.players?.[player]?.name || `P${player + 1}`}`,
    // BA-21: any non-null request while in message mode means player committed; show waiting text.
    placeholder: battle.winner
      ? lang('배틀이 종료되었습니다.', 'The battle has ended.')
      : inputLocked
        ? (latestLine || lang('배틀 메시지 재생 중...', 'Playing battle messages...'))
      : request
        ? lang('상대의 턴을 기다리는 중...', "Waiting for opponent's turn...")
        : lang('엔진 요청을 기다리는 중입니다.', 'Waiting for an engine request.'),
  };
}

function resolveSpriteUrlForBattleSide(sideIndex, perspective, mon, isRenderable) {
  const sideId = sideIndex === 1 ? 'p2' : 'p1';
  const facing = sideIndex === perspective ? 'back' : 'front';
  if (isRenderable && mon) {
    const spriteId = resolveBattleRenderSpriteId(mon);
    if (spriteId) return spritePath(spriteId, facing, Boolean(mon.shiny));
  }
  const override = getTimelineSpriteOverride(sideId);
  if (override?.spriteId) return spritePath(override.spriteId, facing, Boolean(override.shiny));
  return '';
}

function buildPkbPokerogueUiModel(battle, forcedPerspective = null) {
  const ui = syncBattleUiState(battle);
  const useForcedPerspective = Number.isInteger(forcedPerspective);
  const perspective = useForcedPerspective
    ? clamp(Number(forcedPerspective), 0, 1)
    : (ui?.perspective ?? 0);
  const allyPlayer = perspective;
  const enemyPlayer = perspective === 0 ? 1 : 0;
  const mode = getBattleDisplayMode(perspective, battle);
  const bannerChip = isShowdownLocalBattle(battle) ? getEngineTurnChipState(perspective, battle) : {text: ''};
  let stateWindow = buildPhaserMessageWindowModel(battle, perspective);
  if (mode === 'command') stateWindow = buildPhaserCommandWindowModel(battle, perspective);
  else if (mode === 'fight') stateWindow = buildPhaserFightWindowModel(battle, perspective);
  else if (mode === 'party') stateWindow = buildPhaserPartyWindowModel(battle, perspective);
  else if (mode === 'target') stateWindow = buildPhaserTargetWindowModel(battle, perspective);
  const enemyInfo = buildBattleInfoModel(enemyPlayer, battle);
  const playerInfo = buildBattleInfoModel(allyPlayer, battle);
  const enemyMon = getActiveMons(enemyPlayer, battle)[0] || null;
  const playerMon = getActiveMons(allyPlayer, battle)[0] || null;
  const enemyRenderable = Boolean(enemyMon && Number(enemyMon.hp || 0) > 0 && !enemyMon.fainted);
  const playerRenderable = Boolean(playerMon && Number(playerMon.hp || 0) > 0 && !playerMon.fainted);
  const rawAbilityBar = updateBattleAbilityBarState(battle);
  const abilityBar = rawAbilityBar?.visible ? {
    ...rawAbilityBar,
    side: perspective === 0 ? rawAbilityBar.side : (rawAbilityBar.side === 'player' ? 'enemy' : 'player'),
  } : rawAbilityBar;
  return {
    turn: battle.turn,
    perspective,
    language: state.language || 'ko',
    perspectiveOptions: FLAGS.battleDualViewV1 && useForcedPerspective
      ? []
      : [
        {label: battle.players?.[0]?.name || 'P1', active: perspective === 0, action: {type: 'perspective', player: 0}},
        {label: battle.players?.[1]?.name || 'P2', active: perspective === 1, action: {type: 'perspective', player: 1}},
      ],
    turnChip: `${lang('턴', 'Turn')} ${battle.turn}`,
    bannerText: (FLAGS.battleDualViewV1 && useForcedPerspective)
      ? `${battle.players?.[perspective]?.name || `P${perspective + 1}`} · ${bannerChip.text || lang('배틀 화면', 'Battle screen')}`
      : (ui?.passPrompt || `${battle.players?.[perspective]?.name || `P${perspective + 1}`} · ${bannerChip.text || lang('배틀 화면', 'Battle screen')}`),
    fieldStatus: getBattleFieldStatusText(battle),
    message: buildBattleMessageModel(battle, perspective),
    enemyInfo,
    playerInfo,
    enemySprite: {
      url: resolveSpriteUrlForBattleSide(enemyPlayer, perspective, enemyMon, enemyRenderable),
      mount: 'enemy',
      terastallized: Boolean(enemyInfo?.teraType),
      teraType: enemyInfo?.teraType || '',
      dynamaxed: Boolean(enemyMon?.dynamaxed),
      gigantamaxed: Boolean(enemyMon?.gigantamaxed),
    },
    playerSprite: {
      url: resolveSpriteUrlForBattleSide(allyPlayer, perspective, playerMon, playerRenderable),
      mount: 'player',
      terastallized: Boolean(playerInfo?.teraType),
      teraType: playerInfo?.teraType || '',
      dynamaxed: Boolean(playerMon?.dynamaxed),
      gigantamaxed: Boolean(playerMon?.gigantamaxed),
    },
    enemyTray: buildBattleTrayModel(enemyPlayer, battle),
    playerTray: buildBattleTrayModel(allyPlayer, battle),
    abilityBar,
    stateWindow,
  };
}

function dispatchPkbPokerogueUiAction(action, { playerOverride = null } = {}) {
  const battle = ensureBattleUiState(state.battle);
  if (!battle || !action) return;
  const ui = getBattleUiState(battle);
  const player = Number.isInteger(playerOverride) ? clamp(Number(playerOverride), 0, 1) : (ui?.perspective ?? 0);
  if (isBattleInputLocked(battle) && action.type !== 'perspective') return;
  const activeIndex = getEngineActionSlots(player, battle)[0] ?? getBattleActiveIndices(player, battle)[0] ?? 0;
  if (action.type === 'perspective') {
    if (FLAGS.battleDualViewV1 && Number.isInteger(playerOverride)) return;
    setBattlePerspective(action.player);
    return;
  }
  if (action.type === 'command') {
    const nextMode = action.key === 'party' ? 'party' : action.key === 'fight' ? 'fight' : 'command';
    setBattleUiMode(player, nextMode);
    return;
  }
  if (action.type === 'focus-move') {
    ui.moveDetailByPlayer = ui.moveDetailByPlayer || {0: {}, 1: {}};
    ui.moveDetailByPlayer[player][activeIndex] = clamp(Number(action.moveIndex || 0), 0, 3);
    renderBattle();
    return;
  }
  if (action.type === 'toggle') {
    if (!toggleEngineDraftFlag(player, activeIndex, action.flag, battle)) return;
    renderBattle();
    return;
  }
  if (action.type === 'move') {
    if (isBattleInputLocked(battle)) return;
    const nextChoice = buildEngineMoveChoiceFromDraft(player, activeIndex, action.moveIndex, battle);
    if (!nextChoice) return;
    setEnginePendingChoice(player, activeIndex, nextChoice, battle);
    handleBattleChoiceCommitted(player, battle);
    renderBattle();
    return;
  }
  if (action.type === 'switch') {
    if (isBattleInputLocked(battle)) return;
    setEnginePendingChoice(player, activeIndex, {...createEmptyBattleChoice(), kind: 'switch', switchTo: action.switchTo}, battle);
    handleBattleChoiceCommitted(player, battle);
    renderBattle();
  }
}

function enterBattleFullscreen() {
  if (!els.battlePhaserRoot) return;
  els.battlePhaserRoot.classList.add('battle-fullscreen');
  els.battlePhaserRoot.hidden = false;
  if (els.battleExitFullscreenBtn) els.battleExitFullscreenBtn.hidden = false;
}

function exitBattleFullscreen() {
  if (!els.battlePhaserRoot) return;
  els.battlePhaserRoot.classList.remove('battle-fullscreen');
  if (els.battleExitFullscreenBtn) els.battleExitFullscreenBtn.hidden = true;
}

async function syncPhaserBattleRenderer(battle) {
  if (!els.battlePanel) return false;
  if (!battle) {
    els.battlePanel.classList.remove('is-phaser-active');
    exitBattleFullscreen();
    if (els.battlePhaserRoot) els.battlePhaserRoot.hidden = true;
    hidePhaserBattleRenderers();
    return false;
  }

  const dualView = FLAGS.battleDualViewV1 === true;
  if (els.battlePhaserLabelP1) {
    els.battlePhaserLabelP1.textContent = battle.players?.[0]?.name || 'Player 1';
  }
  if (els.battlePhaserLabelP2) {
    els.battlePhaserLabelP2.textContent = battle.players?.[1]?.name || 'Player 2';
  }

  try {
    if (dualView) {
      exitBattleFullscreen();
      if (!getPhaserBattleRenderer(0) && els.battlePhaserMountP1) {
        phaserBattleRenderers[0] = createPhaserBattleController({ mount: els.battlePhaserMountP1 });
      }
      if (!getPhaserBattleRenderer(1) && els.battlePhaserMountP2) {
        phaserBattleRenderers[1] = createPhaserBattleController({ mount: els.battlePhaserMountP2 });
      }
      const p1Renderer = getPhaserBattleRenderer(0);
      const p2Renderer = getPhaserBattleRenderer(1);
      if (!p1Renderer || !p2Renderer) return false;

      const modelP1 = buildPkbPokerogueUiModel(battle, 0);
      const modelP2 = buildPkbPokerogueUiModel(battle, 1);
      await Promise.all([
        p1Renderer.show(modelP1, { onAction: action => dispatchPkbPokerogueUiAction(action, { playerOverride: 0 }) }),
        p2Renderer.show(modelP2, { onAction: action => dispatchPkbPokerogueUiAction(action, { playerOverride: 1 }) }),
      ]);
      if (els.battlePhaserRoot) els.battlePhaserRoot.hidden = false;
      if (els.battlePhaserStatus) els.battlePhaserStatus.hidden = true;
    } else {
      if (!getPhaserBattleRenderer(0) && els.battlePhaserMountP1) {
        phaserBattleRenderers[0] = createPhaserBattleController({ mount: els.battlePhaserMountP1, statusEl: els.battlePhaserStatus });
      }
      const renderer = getPhaserBattleRenderer(0);
      if (!renderer) return false;
      const model = buildPkbPokerogueUiModel(battle);
      enterBattleFullscreen();
      await renderer.show(model, { onAction: action => dispatchPkbPokerogueUiAction(action) });
    }
    els.battlePanel.classList.add('is-phaser-active');
    return true;
  } catch (error) {
    console.error('Phaser battle renderer activation failed.', error);
    exitBattleFullscreen();
    if (els.battlePhaserStatus) {
      els.battlePhaserStatus.hidden = false;
      els.battlePhaserStatus.dataset.tone = 'error';
      els.battlePhaserStatus.textContent = `Phaser battle renderer error: ${error.message}`;
    }
    destroyPhaserBattleRenderers();
    if (els.battlePhaserRoot) els.battlePhaserRoot.hidden = true;
    els.battlePanel.classList.remove('is-phaser-active');
    return false;
  }
}

function renderBattle() {
  const battle = ensureBattleUiState(state.battle);
  if (!battle) return;
  normalizeBattleSpriteState(battle);
  syncRuntimeModeUi();
  if (isShowdownLocalBattle(battle)) pruneEnginePendingChoices(battle);
  const ui = syncBattleUiState(battle);
  const perspective = ui?.perspective ?? 0;
  if (els.turnNumber) els.turnNumber.textContent = battle.turn;
  renderBattlePerspectiveTabs(battle);
  renderBattleFieldStatus();
  renderBattleDebugPanel(battle);

  syncPhaserBattleRenderer(battle).then(active => {
    if (active) return;
    renderSideSprites(0, els.battleSideP1, 'back');
    renderSideSprites(1, els.battleSideP2, 'front');
    renderBattleInfoBox(0, els.battleInfoP1, getActiveMons(0, battle)[0] || null);
    renderBattleInfoBox(1, els.battleInfoP2, getActiveMons(1, battle)[0] || null);
    renderBattlePokeballTray(0, els.battleTrayP1, battle);
    renderBattlePokeballTray(1, els.battleTrayP2, battle);
    renderBattleMessagesWindow(battle, perspective);
    renderBattleBottomWindows(battle, perspective);
    maybeShowBattleAbilityFlyout(battle);
  }).catch(error => {
    console.error('Battle renderer sync failed.', error);
  });

  const allSet = isShowdownLocalBattle(battle)
    ? canAutoResolveEngineTurn(battle)
    : [0, 1].every(player => isPlayerReady(player));
  if (allSet && !battle.winner && !battle.resolvingTurn && !isBattleInputLocked(battle)) resolveTurn();
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
    renderAnimatedSprite(holder, {spriteId: resolveBattleRenderSpriteId(mon), facing, shiny: mon.shiny, size: 'large'});
  });
}
function renderBattleTeam(player, container) {
  const side = state.battle.players[player];
  const activeIndices = new Set(getBattleActiveIndices(player));
  container.innerHTML = '';
  side.team.forEach((mon, index) => {
    const card = document.createElement('div');
    card.className = 'battle-team-card';
    const sprite = document.createElement('div');
    card.appendChild(sprite);
    renderAnimatedSprite(sprite, {spriteId: resolveBattleRenderSpriteId(mon), facing:'front', shiny: mon.shiny, size:'small'});
    const summary = document.createElement('div');
    summary.className = 'mon-summary';
    summary.innerHTML = `<div class="mon-name-line"><strong>${displayBattleSpeciesName(mon)}</strong>${mon.status ? `<span class="status-badge">${getStatusIcon(mon.status) ? `<img src="${getStatusIcon(mon.status)}" alt="${mon.status}"/>` : ''}${displayStatus(mon.status)}</span>` : ''}</div>
      ${getBattleBadgeText(mon) ? `<div class="battle-inline-flags">${getBattleBadgeText(mon)}</div>` : ''}
      <div class="hp-bar"><div class="hp-fill ${hpFillClass(mon)}" style="width:${hpPercent(mon)}%"></div></div>
      <div class="mon-sub">HP ${mon.hp}/${mon.maxHp}${activeIndices.has(index) ? ' · 전투 중 / Active' : ''}${mon.fainted ? ' · 기절 / Fainted' : ''}${mon.dynamaxed ? ` · ${mon.dynamaxTurns}턴 / ${mon.dynamaxTurns} turns` : ''}${mon.volatile?.substituteHp ? ` · 대타 ${mon.volatile.substituteHp} / Sub ${mon.volatile.substituteHp}` : ''}</div>`;
    if (mon.item) {
      const badges = document.createElement('div');
      badges.className = 'mon-badges';
      const itemBadge = document.createElement('div');
      itemBadge.className = 'battle-item-badge';
      renderItemIconPreview(itemBadge, mon.item, {label: displayItemName(mon.item), hideWhenMissing: false});
      badges.appendChild(itemBadge);
      summary.appendChild(badges);
    }
    card.appendChild(summary);
    container.appendChild(card);
  });
}
// Unsupported-runtime safeguards remain only to keep stale or partial battle state honest.
function renderChoicePanel(player, container, statusEl, titleEl) {
  if (isShowdownLocalBattle(state.battle)) {
    renderEngineSinglesChoicePanel(player, container, statusEl, titleEl);
    return;
  }
  const sideName = state.battle?.players?.[player]?.name || (player === 0 ? state.playerNames[0] : state.playerNames[1]);
  titleEl.textContent = state.language === 'ko' ? `${sideName} 선택` : `${sideName} choices`;
  statusEl.textContent = lang(
    '현재 배틀 상태는 지원되는 사용자용 선택 UI를 제공하지 않습니다.',
    'The current battle state does not provide a supported user-facing choice UI.'
  );
  container.innerHTML = `<div class="helper-note">${lang(
    '싱글은 로컬 엔진 필수이며, 더블은 엔진 경로가 준비될 때까지 시작이 차단됩니다.',
    'Singles require the local engine, and doubles stay blocked until an engine-backed route exists.'
  )}</div>`;
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
  return false;
}
function isPlayerReady(player) {
  if (isShowdownLocalBattle(state.battle)) {
    const request = getEngineRequestForPlayer(player);
    if (!isEngineActionableRequest(request)) return true;
    return getEngineActionSlots(player).every(activeIndex => isChoiceComplete(player, activeIndex));
  }
  return false;
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
        rows.push(`<div class="pending-card"><strong>${mon ? displayBattleSpeciesName(mon) : side.name}</strong>${getEngineChoiceSummary(player, activeIndex, battle)}</div>`);
      });
    });
    els.pendingChoices.innerHTML = rows.join('');
    return;
  }
  els.pendingChoices.innerHTML = `<div class="pending-card">${lang(
    '현재 배틀 상태에는 지원되는 사용자용 대기 UI가 없습니다.',
    'The current battle state has no supported user-facing pending-choice UI.'
  )}</div>`;
}
async function resolveEngineTurn(battle = state.battle) {
  const moveAnimationHints = {};
  const normalizeMoveCategoryForAnim = category => {
    const id = toId(category || '');
    return id === 'physical' || id === 'special' ? id : 'status';
  };
  [0, 1].forEach(player => {
    const actionSlots = getEngineActionSlots(player, battle);
    actionSlots.forEach((activeIndex, requestSlot) => {
      const choice = getEngineDraftChoice(player, activeIndex, battle);
      if (choice?.kind !== 'move') return;
      const moveRequest = getEngineMoveRequest(player, requestSlot, battle);
      const moveInfo = Array.isArray(moveRequest?.moves) ? moveRequest.moves[choice.moveIndex] : null;
      const baseMove = resolveEngineMoveName(moveInfo?.move || choice.move || '');
      if (!baseMove) return;
      const hintKey = `${getEngineSideId(player)}_${requestSlot}`;
      if (choice?.dynamax) {
        moveAnimationHints[hintKey] = { kind: 'dynamax', baseMove };
        return;
      }
      if (choice?.z) {
        const dexCategory = state.dex?.moves?.get?.(baseMove)?.category || '';
        const dexType = state.dex?.moves?.get?.(baseMove)?.type || '';
        moveAnimationHints[hintKey] = {
          kind: 'zmove',
          baseMove,
          category: normalizeMoveCategoryForAnim(moveInfo?.category || dexCategory),
          moveType: toId(moveInfo?.type || dexType || ''),
        };
      }
    });
  });
  pruneEnginePendingChoices(battle);
  seedEngineForcedPendingChoices(battle);
  const nextSnapshot = await submitShowdownLocalSinglesChoices({battleId: battle.id, battle});
  if (Array.isArray(nextSnapshot?.events) && nextSnapshot.events.length) {
    nextSnapshot.events.forEach(ev => {
      if (ev?.type !== 'move_use') return;
      const side = ev.actor?.side;
      const slot = Number.isInteger(ev.actor?.slot) ? ev.actor.slot : 0;
      const hintKey = `${side}_${slot}`;
      const hint = moveAnimationHints[hintKey];
      const moveId = toId(ev.move || '');
      if (moveId.startsWith('max') || moveId.startsWith('gmax')) {
        let animationMove = String(hint?.kind === 'dynamax' ? hint.baseMove : '').trim();
        if (!animationMove && (side === 'p1' || side === 'p2')) {
          const sideIndex = side === 'p2' ? 1 : 0;
          const actorSide = nextSnapshot.players?.[sideIndex];
          const teamIndex = Number.isInteger(actorSide?.active?.[slot]) ? actorSide.active[slot] : -1;
          const actorMon = Number.isInteger(teamIndex) && teamIndex >= 0 ? actorSide?.team?.[teamIndex] : null;
          animationMove = resolveEngineMoveName(actorMon?.lastMoveUsed || '');
        }
        if (animationMove && toId(animationMove) !== moveId) {
          ev.animationMove = animationMove;
        }
        if (hint?.kind === 'dynamax') delete moveAnimationHints[hintKey];
        return;
      }

      if (hint?.kind !== 'zmove') return;
      const zCategory = hint.category || 'status';
      let zAnimationMove = '';
      if (zCategory === 'physical') zAnimationMove = 'Giga Impact';
      else if (zCategory === 'special') zAnimationMove = 'Hyper Beam';
      else zAnimationMove = hint.baseMove || resolveEngineMoveName(ev.move || '');
      if (zAnimationMove) {
        ev.animationMove = zAnimationMove;
      }
      if (zCategory === 'status') {
        ev.animationScale = 1.35;
      }
      ev.zMove = true;
      ev.zMoveCategory = zCategory;
      ev.zMoveBaseMove = hint.baseMove || '';
      ev.zMoveType = hint.moveType || '';
      delete moveAnimationHints[hintKey];
    });
  }
  const adoptedBattle = adoptEngineBattleSnapshot(nextSnapshot);

  if (FLAGS.battlePresentationV2 && Array.isArray(adoptedBattle?.events) && adoptedBattle.events.length > 0) {
    // Presentation V2: play events sequentially, then apply final snapshot via onComplete.

    // Capture active pokemon names from the PREVIOUS state before overwriting.
    // Gives move_use/faint messages the right species name for turns 2+ (no switch_in events).
    const initialNames = {};
    const initialSlotInfo = collectTimelineInitialSlotInfo(state.battle);
    if (state.battle?.players) {
      state.battle.players.forEach((side, idx) => {
        const sideId = idx === 0 ? 'p1' : 'p2';
        (side.active || []).forEach((teamIdx, slot) => {
          const mon = side.team?.[teamIdx];
          if (mon) initialNames[`${sideId}_${slot}`] = mon.species || mon.formSpecies || '';
        });
      });
    }

    state.battle = adoptedBattle;
    await playTimelineAcrossActiveViews(adoptedBattle.events, {
      onComplete: () => {
        // New turn starting: always reset perspective to p1 and clear modes so the
        // player-side UI is shown first, regardless of what perspective was active
        // during the previous turn's forced-switch flow.
        const ui = getBattleUiState(state.battle);
        if (ui) {
          ui.perspective = 0;
          ui.modeByPlayer = { 0: 'command', 1: 'command' };
          ui.passPrompt = '';
        }
        clearTimelineSpriteOverrides();
        renderBattle();
      },
      initialNames,
      initialSlotInfo,
    });
  } else {
    // Presentation V1 (default): apply snapshot immediately
    state.battle = adoptedBattle;
    clearTimelineSpriteOverrides();
  }
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
  if (battle.log) {
    battle.log.unshift({
      text: lang(
        '현재 배틀 상태에는 지원되는 턴 해석 경로가 없습니다. 싱글은 로컬 엔진, 더블은 향후 엔진 마이그레이션이 필요합니다.',
        'The current battle state has no supported turn-resolution path. Singles use the local engine, and doubles still require future engine migration.'
      ),
      tone: 'accent',
    });
  }
  battle.resolvingTurn = false;
  renderBattle();
}
// Supported battle wiring: engine-backed singles only.
function wireBattleEvents() {
  els.startBattleBtn.addEventListener('click', startBattle);
  els.backToBuilderBtn.addEventListener('click', () => {
    state.battle = null;
    resetBattlePresentationState();
    exitBattleFullscreen();
    hidePhaserBattleRenderers();
    if (els.battlePhaserRoot) els.battlePhaserRoot.hidden = true;
    els.battlePanel.classList.remove('is-phaser-active');
    els.battlePanel.classList.add('hidden');
    syncRuntimeModeUi();
  });
  els.restartBattleBtn.addEventListener('click', () => {
    resetBattlePresentationState();
    startBattle();
  });
  // Fullscreen exit: button click or ESC key
  if (els.battleExitFullscreenBtn) {
    els.battleExitFullscreenBtn.addEventListener('click', () => {
      exitBattleFullscreen();
    });
  }
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && els.battlePhaserRoot?.classList.contains('battle-fullscreen')) {
      exitBattleFullscreen();
    }
  });
  els.battlePerspectiveP1Btn?.addEventListener('click', () => setBattlePerspective(0));
  els.battlePerspectiveP2Btn?.addEventListener('click', () => setBattlePerspective(1));
  els.clearLogBtn.addEventListener('click', () => {
    if (!state.battle) return;
    state.battle.log = [];
    resetBattlePresentationState({perspective: getBattleUiState(state.battle)?.perspective || 0});
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
  syncRuntimeModeUi();
  renderValidation();
  if (state.battle) renderBattle();
  syncRuntimeModeUi();
}
async function bootstrap() {
  bindElements();
  applyLanguageToStaticUi();
  syncLanguageControls();
  showRuntime('업로드한 에셋과 현지화된 전투 데이터를 불러오는 중… / Loading uploaded assets and fully localized battle data…', 'loading');
  window.__PKB_POKEROGUE_ASSET_AUDIT__ = getPokerogueAssetAuditSummary();
  resetTeams();
  state.manifest = await loadManifest();
  const assetPaths = await detectAssetBases(state.manifest);
  if (assetPaths.pokemon) state.assetBase.pokemon = assetPaths.pokemon;
  if (assetPaths.items) state.assetBase.items = assetPaths.items;
  loadSavedState();
  const {source: dexSource, version: dexVersion} = await loadDataProvider();
  state.dex = getDex();
  state.dexSource = dexSource;
  state.dexVersion = dexVersion;
  state.dataProvider = 'Local Showdown data';
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
    `포켓몬 스프라이트 경로 / Pokémon sprite base: ${state.assetBase.pokemon}<br>데이터 공급원 / Data provider: ${dataSourceLabel()}${state.dexSource ? `<br>Dex source: ${state.dexSource}` : ''}<br>${lang(`외부 검증 기준 현재 공식이지만 로컬 데이터에 아직 없는 아이템 수 / current official items still absent from the local data bundle: ${EXTERNALLY_VERIFIED_CURRENT_ITEMS_ABSENT_FROM_LOCAL_DATA.length}`, `Current official items verified externally but still absent from the local data bundle: ${EXTERNALLY_VERIFIED_CURRENT_ITEMS_ABSENT_FROM_LOCAL_DATA.length}`)}<br>${showdownStatusNote}<br>${lang('이 빌드는 종족 / learnset / 기술 / 아이템 / 특성 / 포맷 / 성격 / 상태 / 타입 상성의 로컬 데이터를 불러오고, 저장된 팀을 그 로컬 Dex 기준으로 복원하며, 이벤트 전용 기술 묶음 검사와 검증 프로필 기반 Species Clause / Item Clause / 레벨 50 강제까지 더 강한 validator를 사용합니다. 아이템 표시는 이제 텍스트 전용으로 정리되어, 사용자용 UI에서 아이콘 누락 여부를 더 이상 노출하지 않습니다. 이번 단계에서는 싱글을 로컬 Showdown 엔진 필수 경로로 고정했고, 더블은 엔진 기반 경로가 준비될 때까지 차단하며, 다른 지원되지 않는 브라우저 배틀 실행 경로는 사용자용 정상 모드에 노출하지 않습니다.', 'This build loads vendored local data for species / learnsets / moves / items / abilities / formats / natures / conditions / type chart, restores saved teams against that local Dex, and runs a stronger validator including event-only move bundle checks and profile-based Species Clause / Item Clause / level-50 enforcement. Item presentation is now text-only, so missing-icon state is no longer exposed in the normal user-facing UI. In this step, singles are locked to the local Showdown engine-required path, doubles stay blocked until an engine-backed route exists, and unsupported browser battle execution paths are kept out of user-facing normal mode.')}`
  );
  syncRuntimeModeUi();
}

bootstrap().catch(error => {
  console.error(error);
  showRuntime(
    '시작에 실패했습니다. 브라우저 콘솔과 로컬 데이터 모듈을 확인하세요. / Startup failed. Check the browser console and local data modules.',
    'error',
    `Error: ${error.message}`
  );
});
