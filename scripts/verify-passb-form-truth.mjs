import fs from 'fs';
import path from 'path';
import {fileURLToPath} from 'url';
import {createRequire} from 'module';

const require = createRequire(import.meta.url);
const {ShowdownEngineService} = require('../server/showdown-engine.cjs');

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'assets', 'manifest.json'), 'utf8'));
const ENGINE_FORMAT = 'gen9customgame@@@+pokemontag:past,+pokemontag:future';

function toId(text) {
  return String(text || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function hasSpriteAsset(spriteId, kind = 'Front') {
  const list = manifest?.pokemon?.[kind.toLowerCase()] || manifest?.pokemon?.[kind] || [];
  return Array.isArray(list) && list.includes(spriteId);
}

function makeMon(species, item, moves, ability, ui = {}) {
  return {
    species,
    name: species,
    item,
    ability,
    moves,
    nature: 'Hardy',
    gender: '',
    level: 100,
    shiny: false,
    evs: {hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0},
    ivs: {hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31},
    teraType: 'Normal',
    ui,
  };
}

const FOE = makeMon('Magikarp', '', ['Splash', 'Protect', 'Tackle', 'Flail'], 'Swift Swim', {
  displaySpecies: 'Magikarp',
  baseSpecies: 'Magikarp',
  startSpriteId: 'MAGIKARP',
  selectedSpriteId: 'MAGIKARP',
});

function resolveAutomaticForm(baseSpecies, {item = '', moves = []} = {}) {
  const moveIds = (moves || []).map(toId);
  if (toId(baseSpecies) === 'keldeo' && moveIds.includes('secretsword')) return 'Keldeo-Resolute';
  const engine = new ShowdownEngineService();
  const dex = engine.dex || null;
  if (!dex) return baseSpecies;
  const base = dex.species.get(baseSpecies);
  if (!base?.exists) return baseSpecies;
  const candidates = dex.species.all().filter(species => species?.exists && (species.baseSpecies || species.name) === baseSpecies);
  const ordered = [];
  for (const name of base?.formeOrder || []) {
    const match = candidates.find(species => species.name === name);
    if (match) ordered.push(match);
  }
  for (const species of candidates) if (!ordered.includes(species)) ordered.push(species);
  for (const species of ordered) {
    const requiredItems = [species.requiredItem, ...(species.requiredItems || [])].filter(Boolean);
    if (requiredItems.length && !requiredItems.some(req => toId(req) === toId(item))) continue;
    if (species.requiredMove && !(moves || []).some(move => toId(move) === toId(species.requiredMove))) continue;
    if (!requiredItems.length && !species.requiredMove) continue;
    return species.name;
  }
  return baseSpecies;
}

async function startBattle(p1Mon) {
  const engine = new ShowdownEngineService();
  return engine.startSingles({
    formatid: ENGINE_FORMAT,
    players: [
      {name: 'P1', team: [p1Mon]},
      {name: 'P2', team: [FOE]},
    ],
  });
}

async function runChoice(p1Mon, choice) {
  const engine = new ShowdownEngineService();
  let snap = await engine.startSingles({
    formatid: ENGINE_FORMAT,
    players: [
      {name: 'P1', team: [p1Mon]},
      {name: 'P2', team: [FOE]},
    ],
  });
  const request = snap.players?.[0]?.request?.active?.[0] || {};
  snap = await engine.chooseSingles(snap.id, {p1: choice, p2: 'move 1'});
  return {request, after: snap.players?.[0]?.team?.[0] || null, log: snap.log || []};
}

function printResult(name, checks) {
  const passed = checks.every(check => check.pass);
  console.log(`\n[${passed ? 'PASS' : 'FAIL'}] ${name}`);
  for (const check of checks) {
    console.log(` - ${check.pass ? 'OK' : 'NO'}: ${check.label}${check.detail ? ` :: ${check.detail}` : ''}`);
  }
  return passed;
}

const results = [];

{
  const {request, after} = await runChoice(
    makeMon('Meganium', 'Meganiumite', ['Protect', 'Giga Drain', 'Leech Seed', 'Earth Power'], 'Overgrow', {
      displaySpecies: 'Meganium',
      baseSpecies: 'Meganium',
      startSpriteId: 'MEGANIUM',
      selectedSpriteId: 'MEGANIUM',
      megaSpecies: 'Meganium-Mega',
      megaSpriteId: 'MEGANIUM_1',
    }),
    'move 1 mega'
  );
  results.push(printResult('Mega Meganium ability truth', [
    {label: 'request exposes canMegaEvo', pass: Boolean(request.canMegaEvo)},
    {label: 'species becomes Meganium-Mega', pass: toId(after?.species) === 'meganiummega', detail: after?.species},
    {label: 'ability becomes Mega Sol', pass: toId(after?.ability) === 'megasol', detail: after?.ability},
    {label: 'Mega sprite asset exists locally', pass: hasSpriteAsset('MEGANIUM_1', 'front') && hasSpriteAsset('MEGANIUM_1', 'back')},
  ]));
}

{
  const {request, after} = await runChoice(
    makeMon('Rayquaza', '', ['Dragon Ascent', 'Protect', 'Extreme Speed', 'Earthquake'], 'Air Lock', {
      displaySpecies: 'Rayquaza',
      baseSpecies: 'Rayquaza',
      startSpriteId: 'RAYQUAZA',
      selectedSpriteId: 'RAYQUAZA',
      megaSpecies: 'Rayquaza-Mega',
      megaSpriteId: 'RAYQUAZA_1',
    }),
    'move 1 mega'
  );
  results.push(printResult('Mega Rayquaza special condition', [
    {label: 'request exposes canMegaEvo without a Mega Stone', pass: Boolean(request.canMegaEvo)},
    {label: 'species becomes Rayquaza-Mega', pass: toId(after?.species) === 'rayquazamega', detail: after?.species},
    {label: 'ability becomes Delta Stream', pass: toId(after?.ability) === 'deltastream', detail: after?.ability},
    {label: 'Mega sprite asset exists locally', pass: hasSpriteAsset('RAYQUAZA_1', 'front') && hasSpriteAsset('RAYQUAZA_1', 'back')},
  ]));
}

for (const [label, species, item, move, expectedSpecies, expectedAbility, expectedSprite] of [
  ['Primal Kyogre', 'Kyogre', 'Blue Orb', 'Surf', 'Kyogre-Primal', 'Primordial Sea', 'KYOGRE_1'],
  ['Primal Groudon', 'Groudon', 'Red Orb', 'Precipice Blades', 'Groudon-Primal', 'Desolate Land', 'GROUDON_1'],
]) {
  const {after} = await runChoice(
    makeMon(species, item, [move, 'Protect', 'Tackle', 'Rest'], species === 'Kyogre' ? 'Drizzle' : 'Drought', {
      displaySpecies: species,
      baseSpecies: species,
      startSpriteId: species.toUpperCase(),
      selectedSpriteId: species.toUpperCase(),
    }),
    'move 1'
  );
  results.push(printResult(label, [
    {label: `species becomes ${expectedSpecies}`, pass: toId(after?.species) === toId(expectedSpecies), detail: after?.species},
    {label: `ability becomes ${expectedAbility}`, pass: toId(after?.ability) === toId(expectedAbility), detail: after?.ability},
    {label: `${expectedSprite} asset exists locally`, pass: hasSpriteAsset(expectedSprite, 'front') && hasSpriteAsset(expectedSprite, 'back')},
  ]));
}

{
  const {request, after} = await runChoice(
    makeMon('Necrozma-Dusk-Mane', 'Ultranecrozium Z', ['Photon Geyser', 'Protect', 'Earthquake', 'Sunsteel Strike'], 'Prism Armor', {
      displaySpecies: 'Necrozma-Dusk-Mane',
      baseSpecies: 'Necrozma',
      startSpriteId: 'NECROZMA_1',
      selectedSpriteId: 'NECROZMA_1',
    }),
    'move 1 ultra'
  );
  results.push(printResult('Ultra Necrozma support', [
    {label: 'request exposes canUltraBurst', pass: Boolean(request.canUltraBurst)},
    {label: 'species becomes Necrozma-Ultra', pass: toId(after?.species) === 'necrozmaultra', detail: after?.species},
    {label: 'ability becomes Neuroforce', pass: toId(after?.ability) === 'neuroforce', detail: after?.ability},
    {label: 'Ultra sprite asset exists locally', pass: hasSpriteAsset('NECROZMA_3', 'front') && hasSpriteAsset('NECROZMA_3', 'back')},
  ]));
}

{
  const start = await startBattle(
    makeMon('Silvally', 'Fairy Memory', ['Multi-Attack', 'Protect', 'Rest', 'Sleep Talk'], 'RKS System', {
      displaySpecies: 'Silvally',
      baseSpecies: 'Silvally',
      startSpriteId: 'SILVALLY',
      selectedSpriteId: 'SILVALLY',
    })
  );
  const mon = start.players?.[0]?.team?.[0] || null;
  results.push(printResult('Silvally memory-linked form truth', [
    {label: 'species resolves to a Silvally form', pass: /silvally/i.test(mon?.species || ''), detail: mon?.species},
    {label: 'type includes Fairy', pass: Array.isArray(mon?.types) && mon.types.includes('fairy'), detail: JSON.stringify(mon?.types || [])},
  ]));
}

{
  const resolvedSpecies = resolveAutomaticForm('Keldeo', {moves: ['Secret Sword', 'Surf', 'Protect', 'Icy Wind']});
  const start = await startBattle(
    makeMon(resolvedSpecies, '', ['Secret Sword', 'Surf', 'Protect', 'Icy Wind'], 'Justified', {
      displaySpecies: resolvedSpecies,
      baseSpecies: 'Keldeo',
      startSpriteId: 'KELDEO_1',
      selectedSpriteId: 'KELDEO_1',
    })
  );
  const mon = start.players?.[0]?.team?.[0] || null;
  results.push(printResult('Keldeo Resolute truth', [
    {label: 'builder-side automatic form resolves to Keldeo-Resolute', pass: toId(resolvedSpecies) === 'keldeoresolute', detail: resolvedSpecies},
    {label: 'battle starts as Keldeo-Resolute', pass: toId(mon?.species) === 'keldeoresolute', detail: mon?.species},
    {label: 'Resolute sprite asset exists locally', pass: hasSpriteAsset('KELDEO_1', 'front') && hasSpriteAsset('KELDEO_1', 'back')},
  ]));
}

{
  const start = await startBattle(
    makeMon('Arceus', 'Splash Plate', ['Recover', 'Judgment', 'Protect', 'Calm Mind'], 'Multitype', {
      displaySpecies: 'Arceus-Water',
      baseSpecies: 'Arceus',
      startSpriteId: 'ARCEUS_11',
      selectedSpriteId: 'ARCEUS_11',
    })
  );
  const mon = start.players?.[0]?.team?.[0] || null;
  results.push(printResult('Arceus linked plate regression', [
    {label: 'type includes Water', pass: Array.isArray(mon?.types) && mon.types.includes('water'), detail: JSON.stringify(mon?.types || [])},
    {label: 'Water plate sprite asset exists locally', pass: hasSpriteAsset('ARCEUS_11', 'front') && hasSpriteAsset('ARCEUS_11', 'back')},
  ]));
}

{
  const start = await startBattle(
    makeMon('Genesect-Douse', 'Douse Drive', ['Techno Blast', 'Protect', 'Ice Beam', 'U-turn'], 'Download', {
      displaySpecies: 'Genesect-Douse',
      baseSpecies: 'Genesect',
      startSpriteId: 'GENESECT_1',
      selectedSpriteId: 'GENESECT_1',
    })
  );
  const mon = start.players?.[0]?.team?.[0] || null;
  results.push(printResult('Genesect linked drive regression', [
    {label: 'species remains a Genesect drive form', pass: /genesect/i.test(mon?.species || ''), detail: mon?.species},
    {label: 'drive-linked sprite asset exists locally', pass: hasSpriteAsset('GENESECT_1', 'front') && hasSpriteAsset('GENESECT_1', 'back')},
  ]));
}

const failed = results.filter(pass => !pass).length;
console.log(`\nSummary: ${results.length - failed}/${results.length} checks passed.`);
if (failed) process.exit(1);
