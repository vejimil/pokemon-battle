const {ShowdownEngineService} = require('../server/showdown-engine.cjs');

function buildMon(species, moves, extra = {}) {
  return {
    species,
    name: species,
    item: extra.item || '',
    ability: extra.ability || '',
    nature: extra.nature || 'Hardy',
    level: Number(extra.level || 100),
    shiny: Boolean(extra.shiny),
    teraType: extra.teraType || undefined,
    moves: [...moves],
    evs: {hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0},
    ivs: {hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31},
    ui: {
      species,
      displaySpecies: species,
      data: {name: species, baseSpecies: species, types: []},
    },
  };
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function runKoForcedSwitchCase() {
  const service = new ShowdownEngineService();
  const start = await service.startSingles({
    players: [
      {name: 'P1', team: [buildMon('Mewtwo', ['Psychic', 'Recover', 'Ice Beam', 'Protect']), buildMon('Bulbasaur', ['Tackle'])]},
      {name: 'P2', team: [buildMon('Magikarp', ['Splash', 'Tackle']), buildMon('Bulbasaur', ['Tackle'])]},
    ],
  });
  const next = await service.chooseSingles(start.id, {p1: 'move 1', p2: 'move 1'});
  assert(next.players[0].request?.wait === true, 'P1 should be in wait state after KO forced-switch turn.');
  assert(Array.isArray(next.players[1].request?.forceSwitch) && next.players[1].request.forceSwitch[0] === true, 'P2 should receive a force-switch request after KO.');
  assert(next.players[1].team[next.players[1].active[0]]?.fainted === true, 'The active P2 Pokémon should be fainted before replacement.');
  return 'KO -> force switch + opposing wait state';
}

async function runDisableAndPpCase() {
  const service = new ShowdownEngineService();
  let snapshot = await service.startSingles({
    players: [
      {name: 'P1', team: [buildMon('Slowbro', ['Disable', 'Protect', 'Slack Off', 'Surf'])]},
      {name: 'P2', team: [buildMon('Persian', ['Scratch', 'Growl', 'Protect', 'Fake Out'])]},
    ],
  });
  const startingScratch = snapshot.players[1].request?.active?.[0]?.moves?.find(move => move.id === 'scratch');
  assert(startingScratch?.pp > 0, 'Scratch should start with PP.');
  snapshot = await service.chooseSingles(snapshot.id, {p1: 'move 1', p2: 'move 1'});
  const nextScratch = snapshot.players[1].request?.active?.[0]?.moves?.find(move => move.id === 'scratch');
  assert(nextScratch?.pp === startingScratch.pp - 1, 'Scratch PP should decrease by 1 after use.');
  assert(nextScratch?.disabled === true, 'Scratch should be disabled by Disable on the next request.');
  return 'disabled move + PP depletion reflected in request';
}

async function runTrapCase() {
  const service = new ShowdownEngineService();
  const snapshot = await service.startSingles({
    players: [
      {name: 'P1', team: [buildMon('Dugtrio', ['Earthquake', 'Protect'], {ability: 'Arena Trap'}), buildMon('Bulbasaur', ['Tackle'])]},
      {name: 'P2', team: [buildMon('Pikachu', ['Thunderbolt', 'Protect']), buildMon('Bulbasaur', ['Tackle'])]},
    ],
  });
  const request = snapshot.players[1].request?.active?.[0];
  assert(Boolean(request?.trapped || request?.maybeTrapped), 'The trapped side should receive trapped/maybeTrapped in the engine request.');
  return 'trapped state reflected in request';
}

async function main() {
  const checks = [];
  checks.push(await runKoForcedSwitchCase());
  checks.push(await runDisableAndPpCase());
  checks.push(await runTrapCase());
  console.log('Verified:');
  for (const item of checks) console.log(`- ${item}`);
}

main().catch(error => {
  console.error('Verification failed:', error.message || error);
  process.exit(1);
});
