import {createRequire} from 'node:module';
import {resolveFormChangePresentation} from '../src/battle-presentation/form-change-presentation.js';

const require = createRequire(import.meta.url);
const {ShowdownEngineService} = require('../server/showdown-engine.cjs');

function baseFields() {
  return {
    nature: 'Hardy',
    gender: '',
    level: 100,
    shiny: false,
    happiness: 255,
    evs: {hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0},
    ivs: {hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31},
  };
}

function makeUi(player, slot, displaySpecies, selectedSpriteId, extra = {}) {
  return {
    id: `${player}-${slot}`,
    player,
    slot,
    displaySpecies,
    baseSpecies: extra.baseSpecies || displaySpecies,
    selectedSpriteId,
    startSpriteId: extra.startSpriteId || selectedSpriteId,
    shiny: false,
    item: extra.item || '',
    ability: extra.ability || '',
    nature: 'Hardy',
    gender: '',
    level: 100,
    teraType: extra.teraType || 'Normal',
    evs: baseFields().evs,
    ivs: baseFields().ivs,
    data: {
      name: displaySpecies,
      baseSpecies: extra.baseSpecies || displaySpecies,
      types: extra.types || ['normal'],
      canGigantamax: '',
      battleOnly: extra.battleOnly || '',
      changesFrom: extra.changesFrom || '',
    },
    ...extra,
  };
}

function makeMon(species, item, ability, moves, teraType, ui) {
  return {
    species,
    item,
    ability,
    moves,
    teraType,
    ...baseFields(),
    ui,
  };
}

function printCheck(label, pass, detail = '') {
  console.log(` - ${pass ? 'OK' : 'NO'}: ${label}${detail ? ` :: ${detail}` : ''}`);
  return pass;
}

async function runDualMegaKoScenario() {
  const service = new ShowdownEngineService();
  let snapshot = await service.startSingles({
    formatid: 'gen9customgame@@@+pokemontag:past,+pokemontag:future',
    players: [
      {
        name: 'P1',
        team: [makeMon(
          'Abomasnow',
          'Abomasite',
          'Snow Warning',
          ['Leaf Storm', 'Tackle', 'Protect', 'Ice Shard'],
          'Grass',
          makeUi(0, 0, 'Abomasnow', 'ABOMASNOW', {
            item: 'Abomasite',
            ability: 'Snow Warning',
            teraType: 'Grass',
            types: ['grass', 'ice'],
            megaSpecies: 'Abomasnow-Mega',
            megaSpriteId: 'ABOMASNOW_1',
          }),
        )],
      },
      {
        name: 'P2',
        team: [makeMon(
          'Charizard',
          'Charizardite Y',
          'Blaze',
          ['Flamethrower', 'Protect', 'Air Slash', 'Solar Beam'],
          'Fire',
          makeUi(1, 0, 'Charizard', 'CHARIZARD', {
            item: 'Charizardite Y',
            ability: 'Blaze',
            teraType: 'Fire',
            types: ['fire', 'flying'],
            megaSpecies: 'Charizard-Mega-Y',
            megaSpriteId: 'CHARIZARD_2',
          }),
        )],
      },
    ],
  });
  snapshot = await service.chooseSingles(snapshot.id, {p1: 'move 1 mega', p2: 'move 1 mega'});
  return snapshot.events || [];
}

function findEvent(events, predicate) {
  return (events || []).find(predicate) || null;
}

async function verifyDualMegaImmediateKo() {
  const events = await runDualMegaKoScenario();
  const p1Mega = findEvent(events, ev => ev.type === 'forme_change' && ev?.target?.side === 'p1' && ev.toSpecies === 'Abomasnow-Mega');
  const p2Mega = findEvent(events, ev => ev.type === 'forme_change' && ev?.target?.side === 'p2' && ev.toSpecies === 'Charizard-Mega-Y');
  const p1SilentRevert = findEvent(events, ev => ev.type === 'forme_change' && ev?.target?.side === 'p1' && ev.toSpecies === 'Abomasnow' && ev.silent);
  const p1Faint = findEvent(events, ev => ev.type === 'faint' && ev.side === 'p1');

  const p1Branch = resolveFormChangePresentation(p1Mega || {}, {
    playerSide: 'p1',
    side: 'p1',
    isActive: true,
    isVisible: true,
    uiMode: 'command',
  });
  const p2Branch = resolveFormChangePresentation(p2Mega || {}, {
    playerSide: 'p1',
    side: 'p2',
    isActive: true,
    isVisible: true,
    uiMode: 'command',
  });
  const silentBranch = resolveFormChangePresentation(p1SilentRevert || {}, {
    playerSide: 'p1',
    side: 'p1',
    isActive: false,
    isVisible: false,
    uiMode: 'command',
  });

  const checks = [
    printCheck('dual mega events are present', Boolean(p1Mega && p2Mega), `events=${events.length}`),
    printCheck('immediate KO event is present after form changes', Boolean(p1Faint), p1Faint ? `seq=${p1Faint.seq}` : ''),
    printCheck('player mega routes to FormChange-like branch', p1Branch.kind === 'form', JSON.stringify(p1Branch)),
    printCheck('opponent mega routes to QuietFormChange-like branch', p2Branch.kind === 'quiet', JSON.stringify(p2Branch)),
    printCheck('post-KO silent detailschange disables animation', silentBranch.shouldAnimate === false, JSON.stringify(silentBranch)),
  ];
  return checks.every(Boolean);
}

function verifyPartyModalItemTrigger() {
  const branch = resolveFormChangePresentation({
    type: 'forme_change',
    mechanism: '-formechange',
    trigger: 'item',
    toSpecies: 'Kyogre-Primal',
    silent: false,
  }, {
    playerSide: 'p1',
    side: 'p1',
    isActive: false,
    isVisible: false,
    uiMode: 'party',
  });

  const checks = [
    printCheck('party item-trigger maps to FormChange branch', branch.kind === 'form', JSON.stringify(branch)),
    printCheck('party item-trigger marks modal=true', branch.modal === true, JSON.stringify(branch)),
    printCheck('party item-trigger keeps animation even when off-field', branch.shouldAnimate === true, JSON.stringify(branch)),
  ];
  return checks.every(Boolean);
}

function verifyInactiveInvisibleFormChange() {
  const branch = resolveFormChangePresentation({
    type: 'forme_change',
    mechanism: 'detailschange',
    trigger: 'ability',
    toSpecies: 'Darmanitan-Zen',
    silent: false,
  }, {
    playerSide: 'p1',
    side: 'p2',
    isActive: false,
    isVisible: false,
    uiMode: 'command',
  });

  const checks = [
    printCheck('inactive ability form change maps to quiet branch', branch.kind === 'quiet', JSON.stringify(branch)),
    printCheck('inactive/invisible form change skips animation', branch.shouldAnimate === false, JSON.stringify(branch)),
  ];
  return checks.every(Boolean);
}

(async () => {
  const results = [];

  console.log('\n[Case] Dual mega + immediate KO');
  results.push(await verifyDualMegaImmediateKo());

  console.log('\n[Case] Party item-trigger modal form change');
  results.push(verifyPartyModalItemTrigger());

  console.log('\n[Case] Inactive/invisible form change');
  results.push(verifyInactiveInvisibleFormChange());

  const allPass = results.every(Boolean);
  console.log(`\n[BA-20 verify] ${allPass ? 'PASS' : 'FAIL'}`);
  if (!allPass) process.exitCode = 1;
})();
