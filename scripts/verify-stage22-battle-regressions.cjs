const fs = require('fs');
const path = require('path');
const {ShowdownEngineService} = require('../server/showdown-engine.cjs');

const root = path.resolve(__dirname, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'assets', 'manifest.json'), 'utf8'));
const FORMAT = 'gen9customgame@@@+pokemontag:past,+pokemontag:future';

function toId(text) {
  return String(text || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
}
function hasSprite(spriteId, kind = 'front') {
  const list = manifest?.pokemon?.[kind] || [];
  return Array.isArray(list) && list.includes(spriteId);
}
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
function makeUi(player, slot, displaySpecies, baseSpecies, selectedSpriteId, extra = {}) {
  return {
    id: `${player}-${slot}`,
    player,
    slot,
    displaySpecies,
    baseSpecies,
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
      baseSpecies,
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
function foeMon(overrides = {}) {
  const species = overrides.species || 'Bulbasaur';
  const item = overrides.item || '';
  const ability = overrides.ability || 'Overgrow';
  const moves = overrides.moves || ['Protect', 'Growl', 'Tackle', 'Sunny Day'];
  const teraType = overrides.teraType || 'Grass';
  const types = overrides.types || ['grass', 'poison'];
  const spriteId = overrides.spriteId || species.toUpperCase().replace(/[^A-Z0-9]+/g, '_');
  return makeMon(
    species,
    item,
    ability,
    moves,
    teraType,
    makeUi(1, 0, species, overrides.baseSpecies || species, spriteId, {
      item,
      ability,
      teraType,
      types,
      ...(overrides.ui || {}),
    })
  );
}
async function runBattle(p1Mon, p1Choice, p2Choice = 'move 1', p2Mon = foeMon()) {
  const service = new ShowdownEngineService();
  let snapshot = await service.startSingles({
    formatid: FORMAT,
    players: [
      {name: 'P1', team: [p1Mon]},
      {name: 'P2', team: [p2Mon]},
    ],
  });
  const request = snapshot.players?.[0]?.request?.active?.[0] || {};
  snapshot = await service.chooseSingles(snapshot.id, {p1: p1Choice, p2: p2Choice});
  return {request, snapshot, mon: snapshot.players?.[0]?.team?.[0] || null, foe: snapshot.players?.[1]?.team?.[0] || null};
}
function printCheck(label, pass, detail = '') {
  console.log(` - ${pass ? 'OK' : 'NO'}: ${label}${detail ? ` :: ${detail}` : ''}`);
  return pass;
}
function printBlock(title, checks) {
  const pass = checks.every(Boolean);
  console.log(`\n[${pass ? 'PASS' : 'FAIL'}] ${title}`);
  return pass;
}

(async () => {
  const results = [];

  {
    const meganium = makeMon(
      'Meganium',
      'Meganiumite',
      'Overgrow',
      ['Solar Beam', 'Synthesis', 'Protect', 'Tackle'],
      'Grass',
      makeUi(0, 0, 'Meganium', 'Meganium', 'MEGANIUM', {
        item: 'Meganiumite',
        ability: 'Overgrow',
        teraType: 'Grass',
        types: ['grass'],
        megaSpecies: 'Meganium-Mega',
        megaSpriteId: 'MEGANIUM_1',
      })
    );
    const {request, snapshot, mon, foe} = await runBattle(meganium, 'move 1 mega', 'move 3');
    const checks = [
      printCheck('request exposes canMegaEvo', Boolean(request.canMegaEvo)),
      printCheck('species becomes Meganium-Mega', toId(mon?.species) === 'meganiummega', mon?.species),
      printCheck('ability becomes Mega Sol', toId(mon?.ability) === 'megasol', mon?.ability),
      printCheck('Solar Beam fires immediately after Mega Evolution', (foe?.hp || 0) < (foe?.maxHp || 0), `${foe?.hp}/${foe?.maxHp}`),
      printCheck('battle weather is harsh sunlight/desolate land', toId(snapshot.weather) === 'desolateland', snapshot.weather),
      printCheck('Mega sprite asset exists locally', hasSprite('MEGANIUM_1', 'front') && hasSprite('MEGANIUM_1', 'back')),
    ];
    results.push(printBlock('Mega Meganium runtime effect', checks));
  }


  {
    const feraligatr = makeMon(
      'Feraligatr',
      'Feraligite',
      'Torrent',
      ['Tackle', 'Protect', 'Crunch', 'Dragon Dance'],
      'Water',
      makeUi(0, 0, 'Feraligatr', 'Feraligatr', 'FERALIGATR', {
        item: 'Feraligite',
        ability: 'Torrent',
        teraType: 'Water',
        types: ['water'],
        megaSpecies: 'Feraligatr-Mega',
        megaSpriteId: 'FERALIGATR_1',
      })
    );
    const gastly = foeMon({
      species: 'Gastly',
      ability: 'Levitate',
      moves: ['Lick', 'Confuse Ray', 'Mean Look', 'Spite'],
      teraType: 'Ghost',
      types: ['ghost', 'poison'],
      spriteId: 'GASTLY',
    });
    const {request, mon, foe} = await runBattle(feraligatr, 'move 1 mega', 'move 1', gastly);
    const checks = [
      printCheck('request exposes canMegaEvo for Feraligatr', Boolean(request.canMegaEvo)),
      printCheck('species becomes Feraligatr-Mega', toId(mon?.species) === 'feraligatrmega', mon?.species),
      printCheck('ability becomes Dragonize', toId(mon?.ability) === 'dragonize', mon?.ability),
      printCheck('Dragonize lets Tackle hit Gastly', (foe?.hp || 0) < (foe?.maxHp || 0), `${foe?.hp}/${foe?.maxHp}`),
    ];
    results.push(printBlock('Mega Feraligatr runtime effect', checks));
  }

  {
    const emboar = makeMon(
      'Emboar',
      'Emboarite',
      'Blaze',
      ['Earthquake', 'Protect', 'Flare Blitz', 'Wild Charge'],
      'Fire',
      makeUi(0, 0, 'Emboar', 'Emboar', 'EMBOAR', {
        item: 'Emboarite',
        ability: 'Blaze',
        teraType: 'Fire',
        types: ['fire', 'fighting'],
        megaSpecies: 'Emboar-Mega',
        megaSpriteId: 'EMBOAR_1',
      })
    );
    const rotom = foeMon({
      species: 'Rotom',
      ability: 'Levitate',
      moves: ['Thunderbolt', 'Will-O-Wisp', 'Protect', 'Hex'],
      teraType: 'Electric',
      types: ['electric', 'ghost'],
      spriteId: 'ROTOM',
    });
    const {request, mon, foe} = await runBattle(emboar, 'move 1 mega', 'move 1', rotom);
    const checks = [
      printCheck('request exposes canMegaEvo for Emboar', Boolean(request.canMegaEvo)),
      printCheck('species becomes Emboar-Mega', toId(mon?.species) === 'emboarmega', mon?.species),
      printCheck('ability becomes Mold Breaker', toId(mon?.ability) === 'moldbreaker', mon?.ability),
      printCheck('Mold Breaker lets Earthquake hit Levitate Rotom', (foe?.hp || 0) < (foe?.maxHp || 0), `${foe?.hp}/${foe?.maxHp}`),
    ];
    results.push(printBlock('Mega Emboar runtime effect', checks));
  }

  for (const [title, species, item, expectedSpecies, expectedAbility, expectedSprite] of [
    ['Primal Kyogre sprite truth', 'Kyogre', 'Blue Orb', 'Kyogre-Primal', 'Primordial Sea', 'KYOGRE_1'],
    ['Primal Groudon sprite truth', 'Groudon', 'Red Orb', 'Groudon-Primal', 'Desolate Land', 'GROUDON_1'],
  ]) {
    const types = species === 'Kyogre' ? ['water'] : ['ground', 'fire'];
    const ability = species === 'Kyogre' ? 'Drizzle' : 'Drought';
    const {snapshot, mon} = await runBattle(
      makeMon(
        species,
        item,
        ability,
        ['Protect', 'Rest', 'Sleep Talk', 'Tackle'],
        types[0],
        makeUi(0, 0, species, species, species.toUpperCase(), {
          item,
          ability,
          teraType: types[0],
          types,
        })
      ),
      'move 1',
      'move 1'
    );
    const checks = [
      printCheck(`species becomes ${expectedSpecies}`, toId(mon?.species) === toId(expectedSpecies), mon?.species),
      printCheck(`ability becomes ${expectedAbility}`, toId(mon?.ability) === toId(expectedAbility), mon?.ability),
      printCheck(`snapshot spriteId is ${expectedSprite}`, mon?.spriteId === expectedSprite, mon?.spriteId),
      printCheck(`snapshot spriteAutoId is ${expectedSprite}`, mon?.spriteAutoId === expectedSprite, mon?.spriteAutoId),
      printCheck('weather snapshot is populated', Boolean(snapshot.weather), snapshot.weather),
      printCheck(`${expectedSprite} asset exists locally`, hasSprite(expectedSprite, 'front') && hasSprite(expectedSprite, 'back')),
    ];
    results.push(printBlock(title, checks));
  }

  {
    const {request, snapshot, mon} = await runBattle(
      makeMon(
        'Eevee',
        'Normalium Z',
        'Run Away',
        ['Quick Attack', 'Tackle', 'Protect', 'Helping Hand'],
        'Normal',
        makeUi(0, 0, 'Eevee', 'Eevee', 'EEVEE', {
          item: 'Normalium Z',
          ability: 'Run Away',
          teraType: 'Normal',
          types: ['normal'],
        })
      ),
      'move 1 zmove',
      'move 1'
    );
    const zLog = (snapshot.log || []).map(line => line.rawText || line.text || '').join('\n');
    const checks = [
      printCheck('request exposes ordinary Z-Move options', Array.isArray(request.canZMove) && request.canZMove.some(Boolean), JSON.stringify(request.canZMove || null)),
      printCheck('turn log records Z-Power activation', /Z파워 발동|unleashed Z-Power/i.test(zLog)),
      printCheck('turn log records the converted Z-Move name', /Breakneck Blitz/i.test(zLog)),
      printCheck('side tracks Z usage', Boolean(snapshot.players?.[0]?.zUsed), String(snapshot.players?.[0]?.zUsed)),
      printCheck('base species remains stable after Z-Move use', toId(mon?.species) === 'eevee', mon?.species),
    ];
    results.push(printBlock('Ordinary Z-Move pipeline', checks));
  }

  {
    const duskMane = makeMon(
      'Necrozma-Dusk-Mane',
      'Ultranecrozium Z',
      'Prism Armor',
      ['Photon Geyser', 'Protect', 'Earthquake', 'Sunsteel Strike'],
      'Psychic',
      makeUi(0, 0, 'Necrozma-Dusk-Mane', 'Necrozma', 'NECROZMA_1', {
        item: 'Ultranecrozium Z',
        ability: 'Prism Armor',
        teraType: 'Psychic',
        types: ['psychic', 'steel'],
        ultraSpecies: 'Necrozma-Ultra',
        ultraSpriteId: 'NECROZMA_3',
        changesFrom: 'Necrozma',
      })
    );
    const {request, mon} = await runBattle(duskMane, 'move 1 ultra', 'move 1');
    const checks = [
      printCheck('request exposes Ultra Burst', Boolean(request.canUltraBurst), String(request.canUltraBurst)),
      printCheck('species becomes Necrozma-Ultra', toId(mon?.species) === 'necrozmaultra', mon?.species),
      printCheck('snapshot sprite is NECROZMA_3', mon?.spriteId === 'NECROZMA_3', mon?.spriteId),
      printCheck('ability becomes Neuroforce', toId(mon?.ability) === 'neuroforce', mon?.ability),
      printCheck('Ultra sprite asset exists locally', hasSprite('NECROZMA_3', 'front') && hasSprite('NECROZMA_3', 'back')),
    ];
    results.push(printBlock('Ultra Necrozma support', checks));
  }

  {
    const ray = makeMon(
      'Rayquaza',
      '',
      'Air Lock',
      ['Dragon Ascent', 'Protect', 'Extreme Speed', 'Earthquake'],
      'Dragon',
      makeUi(0, 0, 'Rayquaza', 'Rayquaza', 'RAYQUAZA', {
        ability: 'Air Lock',
        teraType: 'Dragon',
        types: ['dragon', 'flying'],
        megaSpecies: 'Rayquaza-Mega',
        megaSpriteId: 'RAYQUAZA_1',
      })
    );
    const {request, mon} = await runBattle(ray, 'move 1 mega', 'move 1');
    const checks = [
      printCheck('request exposes canMegaEvo without Mega Stone', Boolean(request.canMegaEvo), String(request.canMegaEvo)),
      printCheck('species becomes Rayquaza-Mega', toId(mon?.species) === 'rayquazamega', mon?.species),
      printCheck('ability becomes Delta Stream', toId(mon?.ability) === 'deltastream', mon?.ability),
      printCheck('Mega sprite asset exists locally', hasSprite('RAYQUAZA_1', 'front') && hasSprite('RAYQUAZA_1', 'back')),
    ];
    results.push(printBlock('Mega Rayquaza special condition', checks));
  }

  const passed = results.every(Boolean);
  console.log(`\nOverall: ${passed ? 'PASS' : 'FAIL'}`);
  if (!passed) process.exitCode = 1;
})();
