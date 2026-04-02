import fs from 'fs';
import path from 'path';
import {fileURLToPath} from 'url';
import {createRequire} from 'module';
import {loadLocalDex} from '../src/local-dex.js';
import {EXTERNALLY_VERIFIED_CURRENT_ITEMS_IN_LOCAL_DATA, EXTERNALLY_VERIFIED_CURRENT_ITEMS_ABSENT_FROM_LOCAL_DATA} from '../src/current-official-items.js';

const require = createRequire(import.meta.url);
const {ShowdownEngineService} = require('../server/showdown-engine.cjs');

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'assets', 'manifest.json'), 'utf8'));
const {Dex} = await loadLocalDex();
const dex = Dex.mod ? Dex.mod('gen9') : Dex;

const OFFICIAL_FUTURE_MEGA_ABILITIES = Object.freeze({
  'Meganium-Mega': 'Mega Sol',
  'Emboar-Mega': 'Mold Breaker',
  'Feraligatr-Mega': 'Dragonize',
});

function toId(text) {
  return String(text || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function normalizeAssetKey(text) {
  return String(text || '').toUpperCase().replace(/[^A-Z0-9]+/g, '');
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
      families.set(baseId, {baseId, baseExists: false, numeric: new Map(), genders: {}, rawAssetIds: []});
    }
    const family = families.get(baseId);
    family.rawAssetIds.push(id);
    if (!suffix) family.baseExists = true;
    else if (/^\d+$/.test(suffix)) family.numeric.set(Number(suffix), id);
    else family.genders[suffix.toLowerCase()] = id;
  }
  return families;
}

const assetFamilies = parseAssetFamilies(manifest?.pokemon?.front || []);

function resolveAssetFamily(baseSpecies) {
  const target = normalizeAssetKey(baseSpecies);
  for (const family of assetFamilies.values()) {
    if (normalizeAssetKey(family.baseId) === target) return family;
  }
  return null;
}

function getRepresentativeSpriteIds(baseSpecies) {
  const family = resolveAssetFamily(baseSpecies);
  if (!family) return {startSpriteId: '', megaSpriteId: ''};
  const numeric = Array.from(family.numeric.entries()).sort((a, b) => a[0] - b[0]).map(([, id]) => id);
  return {
    startSpriteId: family.baseExists ? family.baseId : (numeric[0] || ''),
    megaSpriteId: numeric[0] || '',
  };
}

function buildStats(level, baseStats, nature = {}) {
  const ivs = {hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31};
  const evs = {hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0};
  const out = {};
  for (const stat of ['hp', 'atk', 'def', 'spa', 'spd', 'spe']) {
    const base = Number(baseStats?.[stat] || 0);
    const iv = Number(ivs[stat] || 0);
    const ev = Number(evs[stat] || 0);
    if (stat === 'hp') {
      out.hp = Math.floor(((2 * base + iv + Math.floor(ev / 4)) * level) / 100) + level + 10;
      continue;
    }
    const natureBoost = nature.plus === stat ? 1.1 : nature.minus === stat ? 0.9 : 1;
    out[stat] = Math.floor((Math.floor(((2 * base + iv + Math.floor(ev / 4)) * level) / 100) + 5) * natureBoost);
  }
  return out;
}

function expectedProjectMegaAbility(speciesName) {
  const species = dex.species.get(speciesName);
  if (species?.isNonstandard !== 'Future') return Object.values(species?.abilities || {}).find(Boolean) || '';
  const official = OFFICIAL_FUTURE_MEGA_ABILITIES[speciesName];
  if (official) return official;
  const base = dex.species.get(species?.baseSpecies || species?.changesFrom || speciesName);
  return base?.abilities?.H || Object.values(species?.abilities || {}).find(Boolean) || '';
}

function basePayloadMon(species, item, moves, ability = '', ui = {}) {
  return {
    species,
    name: species,
    item,
    ability,
    moves,
    nature: 'Hardy',
    gender: '',
    level: 50,
    shiny: false,
    evs: {hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0},
    ivs: {hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31},
    teraType: '',
    ui,
  };
}

async function runSingles(team1Mon, team2Mon) {
  const engine = new ShowdownEngineService();
  return engine.startSingles({
    players: [
      {name: 'P1', team: [team1Mon]},
      {name: 'P2', team: [team2Mon]},
    ],
  });
}

async function testMegaCase(baseSpecies, itemName) {
  const beforeSpecies = dex.species.get(baseSpecies);
  const megaSpeciesName = dex.items.get(itemName)?.megaStone?.[baseSpecies] || dex.items.get(itemName)?.megaStone || '';
  const megaSpecies = dex.species.get(megaSpeciesName);
  const expectedAbility = expectedProjectMegaAbility(megaSpecies.name);
  const expectedStats = buildStats(50, megaSpecies.baseStats, {});
  const {startSpriteId, megaSpriteId} = getRepresentativeSpriteIds(baseSpecies);
  const start = await runSingles(
    basePayloadMon(baseSpecies, itemName, ['Protect'], beforeSpecies.abilities?.['0'] || '', {
      id: '0-0',
      player: 0,
      slot: 0,
      displaySpecies: baseSpecies,
      baseSpecies,
      selectedSpriteId: startSpriteId,
      startSpriteId,
      megaSpecies: megaSpecies.name,
      megaSpriteId,
      shiny: false,
      item: itemName,
      ability: beforeSpecies.abilities?.['0'] || '',
      nature: 'Hardy',
      gender: '',
      level: 50,
      teraType: '',
      evs: {hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0},
      ivs: {hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31},
      data: {name: baseSpecies, baseSpecies, types: beforeSpecies.types || [], canGigantamax: '', battleOnly: ''},
    }),
    basePayloadMon('Magikarp', '', ['Splash'], 'Swift Swim', {
      id: '1-0', player: 1, slot: 0, displaySpecies: 'Magikarp', baseSpecies: 'Magikarp', selectedSpriteId: 'MAGIKARP', startSpriteId: 'MAGIKARP', megaSpecies: '', megaSpriteId: '', shiny: false, item: '', ability: 'Swift Swim', nature: 'Hardy', gender: '', level: 50, teraType: '', evs: {hp:0,atk:0,def:0,spa:0,spd:0,spe:0}, ivs:{hp:31,atk:31,def:31,spa:31,spd:31,spe:31}, data:{name:'Magikarp', baseSpecies:'Magikarp', types:['Water'], canGigantamax:'', battleOnly:''}
    })
  );
  const after = await new ShowdownEngineService().chooseSingles ? null : null;
  const engine = new ShowdownEngineService();
  let snap = await engine.startSingles({players:[{name:'P1',team:[basePayloadMon(baseSpecies,itemName,['Protect'],beforeSpecies.abilities?.['0']||'', {id:'0-0',player:0,slot:0,displaySpecies:baseSpecies,baseSpecies,selectedSpriteId:startSpriteId,startSpriteId,megaSpecies:megaSpecies.name,megaSpriteId,shiny:false,item:itemName,ability:beforeSpecies.abilities?.['0']||'',nature:'Hardy',gender:'',level:50,teraType:'',evs:{hp:0,atk:0,def:0,spa:0,spd:0,spe:0},ivs:{hp:31,atk:31,def:31,spa:31,spd:31,spe:31},data:{name:baseSpecies,baseSpecies,types:beforeSpecies.types || [],canGigantamax:'',battleOnly:''}})]},{name:'P2',team:[basePayloadMon('Magikarp','',['Splash'],'Swift Swim',{id:'1-0',player:1,slot:0,displaySpecies:'Magikarp',baseSpecies:'Magikarp',selectedSpriteId:'MAGIKARP',startSpriteId:'MAGIKARP',megaSpecies:'',megaSpriteId:'',shiny:false,item:'',ability:'Swift Swim',nature:'Hardy',gender:'',level:50,teraType:'',evs:{hp:0,atk:0,def:0,spa:0,spd:0,spe:0},ivs:{hp:31,atk:31,def:31,spa:31,spd:31,spe:31},data:{name:'Magikarp',baseSpecies:'Magikarp',types:['Water'],canGigantamax:'',battleOnly:''}})]}]});
  const beforeMon = snap.players[0].team[0];
  snap = await engine.chooseSingles(snap.id, {p1: 'move 1 mega', p2: 'move 1'});
  const afterMon = snap.players[0].team[0];
  return {
    baseSpecies,
    itemName,
    megaSpecies: megaSpecies.name,
    before: {species: beforeMon.species, ability: beforeMon.ability, stats: beforeMon.stats, spriteId: beforeMon.spriteId || beforeMon.spriteAutoId || ''},
    after: {species: afterMon.species, ability: afterMon.ability, stats: afterMon.stats, spriteId: afterMon.spriteId || afterMon.spriteAutoId || '', baseSpecies: afterMon.baseSpecies},
    expected: {ability: expectedAbility, stats: expectedStats, megaSpriteId},
    checks: {
      speciesChanged: toId(afterMon.species) === toId(megaSpecies.name),
      abilityMatchesProjectRule: afterMon.ability === expectedAbility,
      statsMatchMegaSpecies: JSON.stringify(afterMon.stats) === JSON.stringify(expectedStats),
      spriteSwitchedToRepresentativeMegaAsset: Boolean(megaSpriteId) && (afterMon.spriteId === megaSpriteId || afterMon.spriteAutoId === megaSpriteId),
    },
  };
}

async function testArceusPlate(itemName, expectedType) {
  const snap = await runSingles(
    basePayloadMon('Arceus', itemName, ['Recover'], 'Multitype'),
    basePayloadMon('Magikarp', '', ['Splash'], 'Swift Swim')
  );
  const mon = snap.players[0].team[0];
  return {itemName, expectedType: expectedType.toLowerCase(), species: mon.species, types: mon.types, pass: mon.types.includes(expectedType.toLowerCase())};
}

async function testSilvallyMemory(itemName, expectedType) {
  const snap = await runSingles(
    basePayloadMon('Silvally', itemName, ['Recover'], 'RKS System'),
    basePayloadMon('Magikarp', '', ['Splash'], 'Swift Swim')
  );
  const mon = snap.players[0].team[0];
  return {itemName, expectedType: expectedType.toLowerCase(), species: mon.species, types: mon.types, pass: mon.types.includes(expectedType.toLowerCase())};
}

async function testGenesectDrive(itemName, expectedType) {
  const snap = await runSingles(
    basePayloadMon('Genesect', itemName, ['Techno Blast'], 'Download'),
    basePayloadMon('Magikarp', '', ['Splash'], 'Swift Swim')
  );
  const mon = snap.players[0].team[0];
  const item = dex.items.get(itemName);
  return {
    itemName,
    expectedType: expectedType.toLowerCase(),
    expectedSpecies: item.forcedForme || `Genesect-${expectedType === 'Electric' ? 'Shock' : expectedType === 'Fire' ? 'Burn' : expectedType === 'Ice' ? 'Chill' : 'Douse'}`,
    species: mon.species,
    onDrive: String(item.onDrive || '').toLowerCase(),
    pass: String(item.onDrive || '').toLowerCase() === expectedType.toLowerCase() && /genesect/i.test(mon.species),
  };
}

function resolveAutomaticForm(baseSpecies, {item = '', moves = []} = {}) {
  const candidates = dex.species.all().filter(species => species?.exists && (species.baseSpecies || species.name) === baseSpecies);
  const ordered = [];
  const base = dex.species.get(baseSpecies);
  for (const name of base?.formeOrder || []) {
    const match = candidates.find(species => species.name === name);
    if (match) ordered.push(match);
  }
  for (const species of candidates) if (!ordered.includes(species)) ordered.push(species);
  for (const species of ordered) {
    const requiredItems = [species.requiredItem, ...(species.requiredItems || [])].filter(Boolean);
    if (requiredItems.length && !requiredItems.some(req => toId(req) === toId(item))) continue;
    if (species.requiredMove && !moves.some(move => toId(move) === toId(species.requiredMove))) continue;
    if (!requiredItems.length && !species.requiredMove) continue;
    return species.name;
  }
  return baseSpecies;
}

async function testKeldeoSecretSword() {
  const resolved = resolveAutomaticForm('Keldeo', {moves: ['Secret Sword', 'Surf', 'Protect', 'Icy Wind']});
  const snap = await runSingles(
    basePayloadMon(resolved, '', ['Secret Sword', 'Surf', 'Protect', 'Icy Wind'], 'Justified'),
    basePayloadMon('Magikarp', '', ['Splash'], 'Swift Swim')
  );
  const mon = snap.players[0].team[0];
  return {resolvedBuilderSpecies: resolved, battleSpecies: mon.species, pass: toId(resolved) === toId('Keldeo-Resolute') && toId(mon.species) === toId('Keldeo-Resolute')};
}

const currentItemEntries = EXTERNALLY_VERIFIED_CURRENT_ITEMS_IN_LOCAL_DATA.map(name => {
  const item = dex.items.get(name);
  return {
    name,
    exists: Boolean(item?.exists),
    isNonstandard: item?.isNonstandard || '',
    category: item?.megaStone ? 'mega-stone' : item?.zMove ? 'z-crystal' : item?.onPlate ? 'plate' : item?.onDrive ? 'drive' : item?.onMemory ? 'memory' : 'other',
  };
});

const megaCases = [
  ['Meganium', 'Meganiumite'],
  ['Emboar', 'Emboarite'],
  ['Feraligatr', 'Feraligite'],
  ['Glimmora', 'Glimmoranite'],
  ['Baxcalibur', 'Baxcalibrite'],
  ['Chesnaught', 'Chesnaughtite'],
  ['Gardevoir', 'Gardevoirite'],
];

const megaAudit = [];
for (const [species, item] of megaCases) megaAudit.push(await testMegaCase(species, item));

const arceusAudit = [];
for (const item of dex.items.all().filter(item => item?.exists && item.onPlate).sort((a, b) => a.name.localeCompare(b.name))) {
  arceusAudit.push(await testArceusPlate(item.name, item.onPlate));
}

const silvallyAudit = [];
for (const item of dex.items.all().filter(item => item?.exists && item.onMemory).sort((a, b) => a.name.localeCompare(b.name))) {
  silvallyAudit.push(await testSilvallyMemory(item.name, item.onMemory));
}

const genesectAudit = [];
for (const item of dex.items.all().filter(item => item?.exists && item.onDrive).sort((a, b) => a.name.localeCompare(b.name))) {
  genesectAudit.push(await testGenesectDrive(item.name, item.onDrive));
}


async function testMegaAbilityEffects() {
  const solarEngine = new ShowdownEngineService();
  let solar = await solarEngine.startSingles({players:[
    {name:'P1', team:[basePayloadMon('Meganium','Meganiumite',['Solar Beam'],'Overgrow',{id:'0-0',player:0,slot:0,displaySpecies:'Meganium',baseSpecies:'Meganium',selectedSpriteId:'MEGANIUM',startSpriteId:'MEGANIUM',megaSpecies:'Meganium-Mega',megaSpriteId:'MEGANIUM_1',shiny:false,item:'Meganiumite',ability:'Overgrow',nature:'Hardy',gender:'',level:50,teraType:'',evs:{hp:0,atk:0,def:0,spa:0,spd:0,spe:0},ivs:{hp:31,atk:31,def:31,spa:31,spd:31,spe:31},data:{name:'Meganium',baseSpecies:'Meganium',types:['Grass'],canGigantamax:'',battleOnly:''}})]},
    {name:'P2', team:[basePayloadMon('Magikarp','',['Splash'],'Swift Swim',{id:'1-0',player:1,slot:0,displaySpecies:'Magikarp',baseSpecies:'Magikarp',selectedSpriteId:'MAGIKARP',startSpriteId:'MAGIKARP',megaSpecies:'',megaSpriteId:'',shiny:false,item:'',ability:'Swift Swim',nature:'Hardy',gender:'',level:50,teraType:'',evs:{hp:0,atk:0,def:0,spa:0,spd:0,spe:0},ivs:{hp:31,atk:31,def:31,spa:31,spd:31,spe:31},data:{name:'Magikarp',baseSpecies:'Magikarp',types:['Water'],canGigantamax:'',battleOnly:''}})]},
  ]});
  solar = await solarEngine.chooseSingles(solar.id, {p1:'move 1 mega', p2:'move 1'});

  const dragonizeEngine = new ShowdownEngineService();
  let dragonize = await dragonizeEngine.startSingles({players:[
    {name:'P1', team:[basePayloadMon('Feraligatr','Feraligite',['Tackle'],'Torrent',{id:'0-0',player:0,slot:0,displaySpecies:'Feraligatr',baseSpecies:'Feraligatr',selectedSpriteId:'FERALIGATR',startSpriteId:'FERALIGATR',megaSpecies:'Feraligatr-Mega',megaSpriteId:'FERALIGATR_1',shiny:false,item:'Feraligite',ability:'Torrent',nature:'Hardy',gender:'',level:50,teraType:'',evs:{hp:0,atk:0,def:0,spa:0,spd:0,spe:0},ivs:{hp:31,atk:31,def:31,spa:31,spd:31,spe:31},data:{name:'Feraligatr',baseSpecies:'Feraligatr',types:['Water'],canGigantamax:'',battleOnly:''}})]},
    {name:'P2', team:[basePayloadMon('Dragonite','',['Splash'],'Inner Focus',{id:'1-0',player:1,slot:0,displaySpecies:'Dragonite',baseSpecies:'Dragonite',selectedSpriteId:'DRAGONITE',startSpriteId:'DRAGONITE',megaSpecies:'',megaSpriteId:'',shiny:false,item:'',ability:'Inner Focus',nature:'Hardy',gender:'',level:50,teraType:'',evs:{hp:0,atk:0,def:0,spa:0,spd:0,spe:0},ivs:{hp:31,atk:31,def:31,spa:31,spd:31,spe:31},data:{name:'Dragonite',baseSpecies:'Dragonite',types:['Dragon','Flying'],canGigantamax:'',battleOnly:''}})]},
  ]});
  dragonize = await dragonizeEngine.chooseSingles(dragonize.id, {p1:'move 1 mega', p2:'move 1'});

  return {
    megaSol: {
      afterAbility: solar.players[0].team[0].ability,
      immediateSolarBeamObserved: solar.log.some(entry => /Solar Beam/i.test(entry.text)) && !solar.log.some(entry => /must recharge|charge/i.test(entry.text)),
      foeFaintedSameTurn: solar.log.some(entry => /fainted/i.test(entry.text) && /Magikarp/i.test(entry.text)),
    },
    dragonize: {
      afterAbility: dragonize.players[0].team[0].ability,
      superEffectiveTackleObserved: dragonize.log.some(entry => /super effective/i.test(entry.text) && /Dragonite/i.test(entry.text)),
    },
  };
}

const report = {
  summary: {
    externallyVerifiedCurrentPresentInLocalData: currentItemEntries.filter(entry => entry.exists).length,
    externallyVerifiedCurrentAbsentFromLocalData: EXTERNALLY_VERIFIED_CURRENT_ITEMS_ABSENT_FROM_LOCAL_DATA.length,
    megaCasesChecked: megaAudit.length,
    megaCasesPassingAll: megaAudit.filter(entry => Object.values(entry.checks).every(Boolean)).length,
    arceusPlateCases: arceusAudit.length,
    arceusPlatePasses: arceusAudit.filter(entry => entry.pass).length,
    genesectDriveCases: genesectAudit.length,
    genesectDrivePasses: genesectAudit.filter(entry => entry.pass).length,
    silvallyMemoryCases: silvallyAudit.length,
    silvallyMemoryPasses: silvallyAudit.filter(entry => entry.pass).length,
  },
  currentItemEntries,
  absentCurrentItems: EXTERNALLY_VERIFIED_CURRENT_ITEMS_ABSENT_FROM_LOCAL_DATA,
  megaAudit,
  arceusAudit,
  genesectAudit,
  silvallyAudit,
  keldeoAudit: await testKeldeoSecretSword(),
  megaAbilityEffectAudit: await testMegaAbilityEffects(),
};

console.log(JSON.stringify(report, null, 2));
