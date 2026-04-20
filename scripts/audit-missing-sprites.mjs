import fs from 'fs';
import path from 'path';
import {fileURLToPath} from 'url';
import {createRequire} from 'module';
import {ASSET_BASE_SPECIES_ALIASES, FORM_ASSET_OVERRIDES, EXPLICIT_ONLY_FORM_FAMILIES} from '../src/battle-constants.js';

const require = createRequire(import.meta.url);
const {Dex} = require('../node_modules/@pkmn/sim');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

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
  return familyLookup.get(normalizedKey) || ASSET_BASE_SPECIES_ALIASES[normalizedKey] || assetBaseId;
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

function listPngIds(dir) {
  return fs.readdirSync(dir)
    .filter(name => name.toLowerCase().endsWith('.png'))
    .map(name => path.basename(name, '.png'));
}

function main() {
  const dex = Dex.mod('gen9');

  const frontDir = path.join(ROOT, 'assets', 'Pokemon', 'Front');
  const backDir = path.join(ROOT, 'assets', 'Pokemon', 'Back');
  const frontIds = listPngIds(frontDir);
  const backIds = listPngIds(backDir);
  const frontSet = new Set(frontIds);
  const backSet = new Set(backIds);
  const usableAssetIds = new Set(frontIds.filter(id => backSet.has(id)));

  const frontOnly = frontIds.filter(id => !backSet.has(id));
  const backOnly = backIds.filter(id => !frontSet.has(id));

  const frontFamilies = parseAssetFamilies(frontIds);
  const allSpecies = dex.species.all().filter(species => species?.exists);

  const familyLookup = new Map();
  const speciesByBase = new Map();
  for (const species of allSpecies) {
    const baseSpeciesName = species.baseSpecies || species.name;
    if (!speciesByBase.has(baseSpeciesName)) speciesByBase.set(baseSpeciesName, []);
    speciesByBase.get(baseSpeciesName).push(species.name);
    const assetKey = normalizeAssetFamilyKey(baseSpeciesName);
    if (!familyLookup.has(assetKey)) familyLookup.set(assetKey, baseSpeciesName);
  }

  const unresolvedRenderableForms = [];
  const familyDiagnostics = [];

  for (const [assetBaseId, assetFamily] of frontFamilies.entries()) {
    const baseSpeciesName = resolveAssetBaseSpeciesName(assetBaseId, familyLookup);
    const baseEntry = dex.species.get(baseSpeciesName);
    if (!isDexSupported(baseEntry)) continue;

    const familySpeciesNames = uniqueNames([baseSpeciesName, ...(speciesByBase.get(baseSpeciesName) || [])]);
    const orderedForms = buildFamilyFormNames(baseSpeciesName, familySpeciesNames, baseEntry);
    const orderedRenderableForms = orderedForms.filter(speciesName => isRenderableAssetMappedForm(dex.species.get(speciesName)));

    const manualAssignableForms = orderedRenderableForms.filter(speciesName => {
      const speciesData = dex.species.get(speciesName);
      return isSelectableManualBuilderForm(speciesData, baseSpeciesName);
    });
    const autoAssignableForms = orderedRenderableForms.filter(speciesName => {
      const speciesData = dex.species.get(speciesName);
      return !manualAssignableForms.includes(speciesName) && isAutoResolvedBuilderForm(speciesData);
    });
    const hiddenAssignableForms = orderedRenderableForms.filter(speciesName => !manualAssignableForms.includes(speciesName) && !autoAssignableForms.includes(speciesName));
    const assetAssignmentOrder = uniqueNames([...manualAssignableForms, ...autoAssignableForms, ...hiddenAssignableForms]);

    const speciesToAsset = new Map();
    if (assetFamily.baseExists && usableAssetIds.has(assetBaseId)) {
      speciesToAsset.set(baseSpeciesName, assetBaseId);
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
        }
      }
    }

    for (const [speciesName, assetId] of Object.entries(FORM_ASSET_OVERRIDES)) {
      const speciesData = dex.species.get(speciesName);
      const speciesBase = speciesData?.exists ? (speciesData.baseSpecies || speciesData.name) : speciesName.split('-')[0];
      if (toId(speciesBase) !== toId(baseSpeciesName)) continue;
      if (!usableAssetIds.has(assetId)) continue;
      if (!assetFamily.rawAssetIds.includes(assetId)) continue;
      speciesToAsset.set(speciesName, assetId);
    }

    const unresolvedFormOrder = assetAssignmentOrder.filter(name => !speciesToAsset.has(name));
    const usableNumericAssetIds = Array.from(assetFamily.numeric.values()).filter(assetId => usableAssetIds.has(assetId));
    if (assetAssignmentOrder.length === 1 && unresolvedFormOrder.length === 1 && usableNumericAssetIds.length === 1) {
      const onlyAssetId = usableNumericAssetIds[0];
      speciesToAsset.set(unresolvedFormOrder[0], onlyAssetId);
    }

    const unresolvedRenderable = orderedRenderableForms.filter(name => !speciesToAsset.has(name));
    if (unresolvedRenderable.length) {
      unresolvedRenderable.forEach(name => unresolvedRenderableForms.push({
        baseSpecies: baseSpeciesName,
        species: name,
        assetBaseId,
        availableAssets: assetFamily.rawAssetIds,
      }));
    }

    if (unresolvedRenderable.length || unresolvedFormOrder.length) {
      familyDiagnostics.push({
        baseSpecies: baseSpeciesName,
        assetBaseId,
        assignmentOrder: assetAssignmentOrder,
        unresolvedAssignmentOrder: unresolvedFormOrder,
        unresolvedRenderable,
        availableAssets: assetFamily.rawAssetIds,
      });
    }
  }

  const overrideAssetMissing = [];
  for (const [speciesName, assetId] of Object.entries(FORM_ASSET_OVERRIDES)) {
    const hasFront = frontSet.has(assetId);
    const hasBack = backSet.has(assetId);
    if (hasFront && hasBack) continue;
    overrideAssetMissing.push({species: speciesName, assetId, hasFront, hasBack});
  }

  const report = {
    generatedAt: new Date().toISOString(),
    summary: {
      frontCount: frontIds.length,
      backCount: backIds.length,
      usableCount: usableAssetIds.size,
      frontOnlyCount: frontOnly.length,
      backOnlyCount: backOnly.length,
      unresolvedRenderableCount: unresolvedRenderableForms.length,
      overrideAssetMissingCount: overrideAssetMissing.length,
      diagnosticsFamilies: familyDiagnostics.length,
    },
    frontOnly,
    backOnly,
    unresolvedRenderableForms,
    overrideAssetMissing,
    familyDiagnostics,
  };

  const outPath = path.join(ROOT, 'reports', 'missing-sprite-audit.json');
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2));

  console.log(`Wrote ${outPath}`);
  console.log(JSON.stringify(report.summary, null, 2));
}

main();
