import fs from 'fs';
import path from 'path';
import {createRequire} from 'module';

const require = createRequire(import.meta.url);
const {Dex} = require('../node_modules/@pkmn/sim');
const {ShowdownEngineService} = require('../server/showdown-engine.cjs');

function toId(text) {
  return String(text || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function normalizeAssetFamilyKey(name) {
  return toId(name).toUpperCase();
}

function uniqueNames(values = []) {
  const out = [];
  const seen = new Set();
  for (const value of values) {
    const key = toId(value);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(value);
  }
  return out;
}

function humanizeSpriteId(id = '') {
  return String(id || '').replace(/_/g, '-');
}

function parseAssetFamilies(list = []) {
  const families = new Map();
  for (const rawId of list) {
    const id = String(rawId || '');
    if (/^.+?_\d+_(female|male)$/i.test(id)) continue;
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

function resolveAssetBaseSpeciesName(assetBaseId, familyLookup = new Map()) {
  const normalizedKey = normalizeAssetFamilyKey(assetBaseId);
  return familyLookup.get(normalizedKey) || humanizeSpriteId(assetBaseId);
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

function isDexSupported(entry) {
  return Boolean(entry?.exists) && (entry?.isNonstandard == null || entry.isNonstandard === 'Past') && !entry?.tier?.includes?.('Unreleased');
}

function isBattleOnlyBuilderForm(speciesData) {
  if (!speciesData?.exists) return false;
  if (speciesData.battleOnly) return true;
  return new Set(['mega', 'megax', 'megay', 'primal', 'gmax']).has(toId(speciesData.forme || ''));
}

function isAutoResolvedItemBuilderForm(speciesData) {
  if (!isDexSupported(speciesData)) return false;
  if (isBattleOnlyBuilderForm(speciesData)) return false;
  const hasRequiredItem = Boolean(speciesData?.requiredItem || speciesData?.requiredItems?.length);
  if (!hasRequiredItem) return false;
  return Boolean(speciesData?.changesFrom || (speciesData?.baseSpecies && speciesData.baseSpecies !== speciesData.name));
}

function isAutoResolvedMoveBuilderForm(speciesData) {
  if (!isDexSupported(speciesData)) return false;
  if (isBattleOnlyBuilderForm(speciesData)) return false;
  if (!speciesData?.requiredMove) return false;
  return Boolean(speciesData?.changesFrom || (speciesData?.baseSpecies && speciesData.baseSpecies !== speciesData.name));
}

function isAutoResolvedBuilderForm(speciesData) {
  return isAutoResolvedItemBuilderForm(speciesData) || isAutoResolvedMoveBuilderForm(speciesData);
}

function isSelectableManualBuilderForm(speciesData, baseSpeciesName = '') {
  if (!isDexSupported(speciesData)) return false;
  if (isBattleOnlyBuilderForm(speciesData)) return false;
  if ((speciesData.baseSpecies || speciesData.name) === speciesData.name) return true;
  if ((speciesData.name || '') === baseSpeciesName) return true;
  if (isAutoResolvedBuilderForm(speciesData)) return false;
  return !(speciesData?.requiredItem || speciesData?.requiredItems?.length || speciesData?.requiredMove || speciesData?.requiredAbility || speciesData?.requiredTeraType);
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

function buildFamilyAssetMap(dex, rootDir, baseSpeciesName) {
  const frontDir = path.join(rootDir, 'assets', 'Pokemon', 'Front');
  const backDir = path.join(rootDir, 'assets', 'Pokemon', 'Back');
  const frontIds = fs.readdirSync(frontDir).filter(name => name.endsWith('.png')).map(name => path.basename(name, '.png'));
  const backIds = new Set(fs.readdirSync(backDir).filter(name => name.endsWith('.png')).map(name => path.basename(name, '.png')));
  const usableAssetIds = new Set(frontIds.filter(id => backIds.has(id)));
  const frontFamilies = parseAssetFamilies(frontIds);
  const allSpecies = dex.species.all().filter(species => species?.exists);
  const familyLookup = new Map();
  const speciesByBase = new Map();
  for (const species of allSpecies) {
    const baseName = species.baseSpecies || species.name;
    if (!speciesByBase.has(baseName)) speciesByBase.set(baseName, []);
    speciesByBase.get(baseName).push(species.name);
    const assetKey = normalizeAssetFamilyKey(baseName);
    if (!familyLookup.has(assetKey)) familyLookup.set(assetKey, baseName);
  }
  const assetBaseId = normalizeAssetFamilyKey(baseSpeciesName);
  const assetFamily = frontFamilies.get(assetBaseId);
  const resolvedBaseSpeciesName = resolveAssetBaseSpeciesName(assetBaseId, familyLookup);
  const baseEntry = dex.species.get(resolvedBaseSpeciesName);
  const familySpeciesNames = uniqueNames([resolvedBaseSpeciesName, ...(speciesByBase.get(resolvedBaseSpeciesName) || [])]);
  const orderedForms = buildFamilyFormNames(resolvedBaseSpeciesName, familySpeciesNames, baseEntry);
  const orderedRenderableForms = orderedForms.filter(speciesName => isRenderableAssetMappedForm(dex.species.get(speciesName)));
  const manualAssignableForms = orderedRenderableForms.filter(speciesName => isSelectableManualBuilderForm(dex.species.get(speciesName), resolvedBaseSpeciesName));
  const autoAssignableForms = orderedRenderableForms.filter(speciesName => !manualAssignableForms.includes(speciesName) && isAutoResolvedBuilderForm(dex.species.get(speciesName)));
  const hiddenAssignableForms = orderedRenderableForms.filter(speciesName => !manualAssignableForms.includes(speciesName) && !autoAssignableForms.includes(speciesName));
  const assetAssignmentOrder = uniqueNames([...manualAssignableForms, ...autoAssignableForms, ...hiddenAssignableForms]);
  const speciesToAsset = new Map();
  if (assetFamily?.baseExists && usableAssetIds.has(assetBaseId)) speciesToAsset.set(resolvedBaseSpeciesName, assetBaseId);
  const numericAssetIds = Array.from(assetFamily?.numeric?.entries?.() || [])
    .sort((a, b) => a[0] - b[0])
    .map(([, assetId]) => assetId)
    .filter(assetId => usableAssetIds.has(assetId));
  assetAssignmentOrder.forEach((formName, index) => {
    const assetId = numericAssetIds[index];
    if (assetId) speciesToAsset.set(formName, assetId);
  });
  return {resolvedBaseSpeciesName, assetAssignmentOrder, speciesToAsset};
}

function buildBattlePayloadMon(dex, baseSpecies, itemName, assetMap) {
  const item = dex.items.get(itemName);
  const megaSpecies = typeof item?.megaStone === 'string' ? item.megaStone : item?.megaStone?.[baseSpecies] || '';
  const baseSpeciesData = dex.species.get(baseSpecies);
  const startSpriteId = assetMap.speciesToAsset.get(baseSpecies) || normalizeAssetFamilyKey(baseSpecies);
  const megaSpriteId = assetMap.speciesToAsset.get(megaSpecies) || startSpriteId;
  return {
    species: baseSpecies,
    name: baseSpecies,
    item: itemName,
    ability: Object.values(baseSpeciesData.abilities || {}).find(Boolean) || '',
    moves: ['Protect'],
    nature: 'Hardy',
    gender: '',
    level: 50,
    shiny: false,
    teraType: baseSpeciesData.types?.[0] || '',
    evs: {hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0},
    ivs: {hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31},
    ui: {
      id: '0-0',
      player: 0,
      slot: 0,
      displaySpecies: baseSpecies,
      baseSpecies,
      selectedSpriteId: startSpriteId,
      startSpriteId,
      megaSpecies,
      megaSpriteId,
      shiny: false,
      item: itemName,
      ability: Object.values(baseSpeciesData.abilities || {}).find(Boolean) || '',
      nature: 'Hardy',
      gender: '',
      level: 50,
      teraType: baseSpeciesData.types?.[0] || '',
      evs: {hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0},
      ivs: {hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31},
      data: {
        name: baseSpecies,
        baseSpecies,
        types: [...(baseSpeciesData.types || [])],
        canGigantamax: '',
        battleOnly: '',
      },
    },
  };
}

function foePayload() {
  return {
    species: 'Magikarp',
    name: 'Magikarp',
    item: '',
    ability: 'Swift Swim',
    moves: ['Splash'],
    nature: 'Hardy',
    gender: '',
    level: 50,
    shiny: false,
    teraType: 'Water',
    evs: {hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0},
    ivs: {hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31},
    ui: {
      id: '1-0',
      player: 1,
      slot: 0,
      displaySpecies: 'Magikarp',
      baseSpecies: 'Magikarp',
      selectedSpriteId: 'MAGIKARP',
      startSpriteId: 'MAGIKARP',
      megaSpecies: '',
      megaSpriteId: '',
      shiny: false,
      item: '',
      ability: 'Swift Swim',
      nature: 'Hardy',
      gender: '',
      level: 50,
      teraType: 'Water',
      evs: {hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0},
      ivs: {hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31},
      data: {
        name: 'Magikarp',
        baseSpecies: 'Magikarp',
        types: ['Water'],
        canGigantamax: '',
        battleOnly: '',
      },
    },
  };
}

async function runCase(engine, dex, rootDir, baseSpecies, itemName) {
  const assetMap = buildFamilyAssetMap(dex, rootDir, baseSpecies);
  const teamMon = buildBattlePayloadMon(dex, baseSpecies, itemName, assetMap);
  let snapshot = await engine.startSingles({players: [{name: 'P1', team: [teamMon]}, {name: 'P2', team: [foePayload()]}]});
  snapshot = await engine.chooseSingles(snapshot.id, {p1: 'move 1 mega', p2: 'move 1'});
  const after = snapshot.players[0].team[0];
  return {
    baseSpecies,
    itemName,
    mappedMegaSpecies: teamMon.ui.megaSpecies,
    mappedMegaSpriteId: teamMon.ui.megaSpriteId,
    mappedStartSpriteId: teamMon.ui.startSpriteId,
    afterSpecies: after.species,
    afterSpriteId: after.spriteId,
    afterAbility: after.ability,
    megaUsed: after.megaUsed,
  };
}

const rootDir = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const dex = Dex.forFormat('gen9customgame');
const engine = new ShowdownEngineService();
const cases = [
  ['Garchomp', 'Garchompite'],
  ['Garchomp', 'Garchompite Z'],
  ['Absol', 'Absolite Z'],
];
const results = [];
for (const [baseSpecies, itemName] of cases) {
  results.push(await runCase(engine, dex, rootDir, baseSpecies, itemName));
}
process.stdout.write(JSON.stringify({results}, null, 2));
