const {BattleStreams, Dex, Pokemon} = require('../node_modules/@pkmn/sim');
const {randomUUID} = require('crypto');

const weatherMap = Object.freeze({
  raindance: 'rain',
  sunnyday: 'sun',
  primordialsea: 'primordialsea',
  desolateland: 'desolateland',
  deltastream: 'deltastream',
  sandstorm: 'sand',
  snowscape: 'snow',
});

const OFFICIALLY_CONFIRMED_FUTURE_MEGA_ABILITIES = Object.freeze({
  'Meganium-Mega': 'Mega Sol',
  'Emboar-Mega': 'Mold Breaker',
  'Feraligatr-Mega': 'Dragonize',
});

const SNAPSHOT_FORM_SPRITE_OVERRIDES = Object.freeze({
  'Kyogre-Primal': 'KYOGRE_1',
  'Groudon-Primal': 'GROUDON_1',
  'Necrozma-Dusk-Mane': 'NECROZMA_1',
  'Necrozma-Dawn-Wings': 'NECROZMA_2',
  'Necrozma-Ultra': 'NECROZMA_3',
});

const RUNTIME_FUTURE_ABILITY_PATCHES = Object.freeze({
  dragonize: {
    isNonstandard: 'Future',
    onModifyTypePriority: -1,
    onModifyType(move, pokemon) {
      const noModifyType = ['judgment', 'multiattack', 'naturalgift', 'revelationdance', 'technoblast', 'terrainpulse', 'weatherball'];
      if (move.type === 'Normal' && (!noModifyType.includes(move.id) || this.activeMove?.isMax) && !(move.isZ && move.category !== 'Status') && !(move.name === 'Tera Blast' && pokemon.terastallized)) {
        move.type = 'Dragon';
        move.typeChangerBoosted = this.effect;
      }
    },
    onBasePowerPriority: 23,
    onBasePower(basePower, pokemon, target, move) {
      if (move.typeChangerBoosted === this.effect) return this.chainModify([4915, 4096]);
    },
    flags: {},
    name: 'Dragonize',
    rating: 4,
    num: 312,
  },
  megasol: {
    isNonstandard: 'Future',
    onStart(source) {
      this.field.setWeather('desolateland');
    },
    onAnySetWeather(target, source, weather) {
      const strongWeathers = ['desolateland', 'primordialsea', 'deltastream'];
      if (this.field.getWeather().id === 'desolateland' && !strongWeathers.includes(weather.id)) return false;
    },
    onEnd(pokemon) {
      if (this.field.weatherState.source !== pokemon) return;
      for (const target of this.getAllActive()) {
        if (target === pokemon) continue;
        if (target.hasAbility('megasol')) {
          this.field.weatherState.source = target;
          return;
        }
      }
      this.field.clearWeather();
    },
    flags: {},
    name: 'Mega Sol',
    rating: 4.5,
    num: 311,
  },
});

let futureAbilityRuntimePatched = false;

function applyFutureAbilityRuntimePatches(dex) {
  if (!dex?.data?.Abilities) return;
  for (const [abilityId, definition] of Object.entries(RUNTIME_FUTURE_ABILITY_PATCHES)) {
    dex.data.Abilities[abilityId] = {...definition};
  }
}

function patchPokemonEffectiveWeatherForMegaSol() {
  if (futureAbilityRuntimePatched) return;
  const original = Pokemon.prototype.effectiveWeather;
  Pokemon.prototype.effectiveWeather = function patchedEffectiveWeather() {
    let weather = original.call(this);
    if (!weather && this?.hasAbility?.('megasol')) weather = 'desolateland';
    return weather;
  };
  futureAbilityRuntimePatched = true;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function toId(text) {
  return String(text || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function displayNameForPokemonProtocol(raw = '') {
  const parts = String(raw).split(': ');
  return parts.length > 1 ? parts.slice(1).join(': ') : raw;
}

function displayCondition(cond = '') {
  return String(cond || '').replace(/\btox\b/g, 'tox').trim();
}

function mapTargetHint(target) {
  const id = toId(target);
  if (id === 'self') return 'self';
  if (id === 'adjacentally') return 'ally';
  if (id === 'adjacentallyorself') return 'ally-or-self';
  if (id === 'alladjacentfoes') return 'all-opponents';
  if (id === 'adjacentfoe' || id === 'normal' || id === 'randomnormal') return 'single-opponent';
  if (id === 'foeside') return 'opponent-side';
  if (id === 'allyside' || id === 'usersside') return 'ally-side';
  if (id === 'alladjacent') return 'all-other-pokemon';
  if (id === 'all') return 'all-pokemon';
  return 'single-opponent';
}

function resolveBattleFormUiSpriteId(speciesName, ui = {}) {
  const speciesId = toId(speciesName);
  if (!speciesId) return ui.startSpriteId || ui.selectedSpriteId || '';
  if (ui.megaSpriteId && ui.megaSpecies && toId(ui.megaSpecies) === speciesId) return ui.megaSpriteId;
  if (ui.primalSpriteId && ui.primalSpecies && toId(ui.primalSpecies) === speciesId) return ui.primalSpriteId;
  if (ui.ultraSpriteId && ui.ultraSpecies && toId(ui.ultraSpecies) === speciesId) return ui.ultraSpriteId;
  const explicitSprite = SNAPSHOT_FORM_SPRITE_OVERRIDES[speciesName];
  if (explicitSprite) return explicitSprite;
  if (ui.displaySpecies === speciesName && ui.selectedSpriteId) return ui.selectedSpriteId;
  return ui.startSpriteId || ui.selectedSpriteId || '';
}

function battleOnlyShouldNormalize(mon, chosen) {
  const id = toId(chosen);
  if (mon?.data?.battleOnly) return true;
  return id.includes('mega') || id.includes('primal') || id.endsWith('gmax');
}

function isFutureMegaSpecies(species) {
  if (!species?.exists) return false;
  if (species.isNonstandard !== 'Future') return false;
  const formeId = toId(species.forme || '');
  return formeId === 'mega' || /-mega/i.test(species.name || '');
}

function resolveProjectMegaAbilityName(dex, species) {
  if (!species?.exists) return '';
  const official = OFFICIALLY_CONFIRMED_FUTURE_MEGA_ABILITIES[species.name];
  if (official) return official;
  const baseSpeciesName = species.baseSpecies || species.changesFrom || species.name;
  const baseSpecies = dex?.species?.get?.(baseSpeciesName);
  const hiddenAbility = baseSpecies?.exists ? String(baseSpecies.abilities?.H || '').trim() : '';
  if (hiddenAbility) return hiddenAbility;
  return Object.values(species.abilities || {}).find(Boolean) || '';
}

function applyProjectMegaAbilityRulesToDex(dex) {
  if (!dex?.species?.all) return;
  for (const species of dex.species.all()) {
    if (!isFutureMegaSpecies(species)) continue;
    const nextAbility = resolveProjectMegaAbilityName(dex, species);
    if (!nextAbility) continue;
    species.abilities = {0: nextAbility};
    if (species.id && dex?.data?.Pokedex?.[species.id]) {
      dex.data.Pokedex[species.id].abilities = {0: nextAbility};
    }
  }
}

function applyFutureMegaSpeciesMetadataPatches(dex) {
  if (!dex?.species?.all) return;
  for (const species of dex.species.all()) {
    if (!isFutureMegaSpecies(species)) continue;
    const battleOnly = species.battleOnly || species.changesFrom || species.baseSpecies || species.name;
    species.isMega = true;
    if (!species.battleOnly && battleOnly) species.battleOnly = battleOnly;
    if (species.id && dex?.data?.Pokedex?.[species.id]) {
      dex.data.Pokedex[species.id].isMega = true;
      if (!dex.data.Pokedex[species.id].battleOnly && battleOnly) dex.data.Pokedex[species.id].battleOnly = battleOnly;
    }
  }
}

function resolveSnapshotBaseSpeciesName(pokemon, ui = {}) {
  return pokemon?.species?.baseSpecies
    || pokemon?.baseSpecies?.baseSpecies
    || (pokemon?.baseSpecies?.name && pokemon.baseSpecies.name !== pokemon?.species?.name ? pokemon.baseSpecies.name : '')
    || ui?.baseSpecies
    || pokemon?.species?.name
    || ui?.displaySpecies
    || '';
}


function normalizeLogTextFromLine(line) {
  const parts = String(line || '').split('|');
  const tag = parts[1] || '';
  const a = parts[2] || '';
  const b = parts[3] || '';
  const c = parts[4] || '';

  switch (tag) {
    case 'turn':
      return {text: `턴 ${a} / Turn ${a}`, tone: 'accent'};
    case 'switch':
    case 'drag':
      return {text: `${displayNameForPokemonProtocol(a)} 등장! / ${displayNameForPokemonProtocol(a)} entered the field.`, tone: 'accent'};
    case 'move': {
      const source = displayNameForPokemonProtocol(a);
      const move = b || '';
      const target = c ? displayNameForPokemonProtocol(c) : '';
      return {text: target ? `${source}의 ${move}! → ${target} / ${source} used ${move} on ${target}.` : `${source}의 ${move}! / ${source} used ${move}.`, tone: ''};
    }
    case 'faint':
      return {text: `${displayNameForPokemonProtocol(a)} 기절! / ${displayNameForPokemonProtocol(a)} fainted.`, tone: 'accent'};
    case '-damage':
      return {text: `${displayNameForPokemonProtocol(a)} HP → ${displayCondition(b)}`, tone: ''};
    case '-heal':
      return {text: `${displayNameForPokemonProtocol(a)} 회복 / healed → ${displayCondition(b)}`, tone: ''};
    case '-status':
      return {text: `${displayNameForPokemonProtocol(a)} 상태이상: ${b} / status ${b}`, tone: ''};
    case '-curestatus':
      return {text: `${displayNameForPokemonProtocol(a)} 상태 회복 / cured ${b}`, tone: ''};
    case '-weather':
      return {text: `날씨: ${b || a} / Weather: ${b || a}`, tone: 'accent'};
    case '-fieldstart':
      return {text: `필드 효과 시작: ${b || a} / Field effect started: ${b || a}`, tone: 'accent'};
    case '-fieldend':
      return {text: `필드 효과 종료: ${b || a} / Field effect ended: ${b || a}`, tone: 'accent'};
    case '-sidestart':
      return {text: `${a} 측 효과 시작: ${b} / ${a} side effect started: ${b}`, tone: 'accent'};
    case '-sideend':
      return {text: `${a} 측 효과 종료: ${b} / ${a} side effect ended: ${b}`, tone: 'accent'};
    case '-start':
      return {text: `${displayNameForPokemonProtocol(a)} 효과 시작: ${b} / effect started: ${b}`, tone: ''};
    case '-end':
      return {text: `${displayNameForPokemonProtocol(a)} 효과 종료: ${b} / effect ended: ${b}`, tone: ''};
    case '-mega':
      return {text: `${displayNameForPokemonProtocol(a)} 메가진화! / ${displayNameForPokemonProtocol(a)} Mega Evolved!`, tone: 'accent'};
    case '-zpower':
      return {text: `${displayNameForPokemonProtocol(a)} Z파워 발동! / ${displayNameForPokemonProtocol(a)} unleashed Z-Power!`, tone: 'accent'};
    case '-terastallize':
      return {text: `${displayNameForPokemonProtocol(a)} 테라스탈! / ${displayNameForPokemonProtocol(a)} Terastallized!`, tone: 'accent'};
    case '-formechange':
    case 'detailschange':
      return {text: `${displayNameForPokemonProtocol(a)} 폼 변화 → ${b} / forme change → ${b}`, tone: 'accent'};
    case '-supereffective':
      return {text: `${displayNameForPokemonProtocol(a)}에게 효과 굉장함! / It's super effective on ${displayNameForPokemonProtocol(a)}!`, tone: 'accent'};
    case '-resisted':
      return {text: `${displayNameForPokemonProtocol(a)}에게 효과 별로. / It's not very effective on ${displayNameForPokemonProtocol(a)}.`, tone: ''};
    case '-immune':
      return {text: `${displayNameForPokemonProtocol(a)}에게 통하지 않음. / It had no effect on ${displayNameForPokemonProtocol(a)}.`, tone: ''};
    case 'miss':
      return {text: `${displayNameForPokemonProtocol(a)}의 공격이 빗나감! / ${displayNameForPokemonProtocol(a)} missed ${displayNameForPokemonProtocol(b)}.`, tone: ''};
    case 'cant':
      return {text: `${displayNameForPokemonProtocol(a)}은(는) 행동할 수 없다. / ${displayNameForPokemonProtocol(a)} couldn't move.`, tone: ''};
    case 'win':
      return {text: `${a} 승리! / ${a} wins the battle!`, tone: 'win'};
    case 'error':
      return {text: `엔진 오류 / Engine error: ${a}`, tone: 'accent'};
    default:
      return null;
  }
}

function mapVolatiles(volatiles = {}) {
  const out = {};
  for (const [key, value] of Object.entries(volatiles || {})) {
    if (!value || typeof value !== 'object') {
      out[key] = true;
      continue;
    }
    out[key] = {};
    if (typeof value.duration === 'number') out[key].turns = value.duration;
    if (typeof value.counter === 'number') out[key].counter = value.counter;
    if (typeof value.layers === 'number') out[key].layers = value.layers;
    if (value.move) out[key].moveName = value.move;
    if (value.sourceSlot) out[key].sourceSlot = value.sourceSlot;
  }
  if (volatiles.protect) out.protect = {turns: volatiles.protect.duration || 1};
  if (volatiles.substitute) out.substituteHp = volatiles.substitute.hp || 1;
  if (volatiles.confusion) out.confusionTurns = volatiles.confusion.duration || 1;
  if (volatiles.taunt) out.tauntTurns = volatiles.taunt.duration || 1;
  if (volatiles.encore) out.encoreTurns = volatiles.encore.duration || 1;
  if (volatiles.disable) out.disable = {turns: volatiles.disable.duration || 1, moveName: volatiles.disable.move || ''};
  if (volatiles.torment) out.tormentTurns = volatiles.torment.duration || 1;
  if (volatiles.healblock) out.healBlockTurns = volatiles.healblock.duration || 1;
  if (volatiles.embargo) out.embargoTurns = volatiles.embargo.duration || 1;
  if (volatiles.yawn) out.yawnTurns = volatiles.yawn.duration || 1;
  if (volatiles.leechseed) out.leechSeeded = true;
  if (volatiles.magnetrise) out.magnetRiseTurns = volatiles.magnetrise.duration || 1;
  if (volatiles.aquaring) out.aquaRing = true;
  if (volatiles.ingrain) out.ingrain = true;
  if (volatiles.nightmare) out.nightmare = true;
  if (volatiles.perishsong) out.perishSongTurns = volatiles.perishsong.duration || 1;
  if (volatiles.stockpile) out.stockpileLayers = volatiles.stockpile.layers || 1;
  if (volatiles.uproar) out.uproarTurns = volatiles.uproar.duration || 1;
  if (volatiles.destinybond) out.destinyBond = true;
  if (volatiles.grudge) out.grudge = true;
  return out;
}

function mapHazards(sideConditions = {}) {
  return {
    stealthRock: Boolean(sideConditions.stealthrock),
    spikes: Number(sideConditions.spikes?.layers || 0),
    toxicSpikes: Number(sideConditions.toxicspikes?.layers || 0),
    stickyWeb: Boolean(sideConditions.stickyweb),
  };
}

function mapSideConditionTurns(sideConditions = {}) {
  return {
    reflectTurns: Number(sideConditions.reflect?.duration || 0),
    lightScreenTurns: Number(sideConditions.lightscreen?.duration || 0),
    auroraVeilTurns: Number(sideConditions.auroraveil?.duration || 0),
    tailwindTurns: Number(sideConditions.tailwind?.duration || 0),
  };
}

function buildUiSourceMatchKey(entry = {}) {
  const evs = entry?.evs || {};
  const ivs = entry?.ivs || {};
  return JSON.stringify({
    species: toId(entry?.species || ''),
    name: toId(entry?.name || entry?.nickname || entry?.species || ''),
    item: toId(entry?.item || ''),
    ability: toId(entry?.ability || ''),
    moves: Array.isArray(entry?.moves) ? entry.moves.map(move => toId(move)).join('|') : '',
    nature: toId(entry?.nature || ''),
    gender: toId(entry?.gender || ''),
    level: Number(entry?.level || 100),
    shiny: Boolean(entry?.shiny),
    teraType: toId(entry?.teraType || ''),
    evs: ['hp', 'atk', 'def', 'spa', 'spd', 'spe'].map(stat => Number(evs?.[stat] || 0)).join(','),
    ivs: ['hp', 'atk', 'def', 'spa', 'spd', 'spe'].map(stat => Number(ivs?.[stat] ?? 31)).join(','),
  });
}

function buildPokemonUiMatchKey(pokemon) {
  return buildUiSourceMatchKey({
    species: pokemon?.set?.species || pokemon?.species?.name || '',
    name: pokemon?.name || pokemon?.set?.name || pokemon?.species?.name || '',
    item: pokemon?.item || pokemon?.set?.item || '',
    ability: pokemon?.baseAbility || pokemon?.ability || pokemon?.set?.ability || '',
    moves: Array.isArray(pokemon?.set?.moves) ? pokemon.set.moves : pokemon?.baseMoveSlots?.map(slot => slot?.move || slot?.id) || [],
    nature: pokemon?.set?.nature || '',
    gender: pokemon?.gender || pokemon?.set?.gender || '',
    level: Number(pokemon?.level || pokemon?.set?.level || 100),
    shiny: Boolean(pokemon?.set?.shiny),
    teraType: pokemon?.teraType || pokemon?.set?.teraType || '',
    evs: pokemon?.set?.evs || {},
    ivs: pokemon?.set?.ivs || {},
  });
}

function createUiSourceMatcher(uiTeam = []) {
  const entries = uiTeam.map((sourceMon, sourceIndex) => ({
    sourceMon,
    sourceIndex,
    key: buildUiSourceMatchKey(sourceMon),
    used: false,
  }));

  return function matchUiSourceForPokemon(pokemon) {
    const exactKey = buildPokemonUiMatchKey(pokemon);
    let entry = entries.find(candidate => !candidate.used && candidate.key === exactKey) || null;
    if (!entry) {
      const speciesId = toId(pokemon?.species?.name || pokemon?.set?.species || '');
      const nameId = toId(pokemon?.name || pokemon?.set?.name || pokemon?.species?.name || '');
      entry = entries.find(candidate => {
        if (candidate.used) return false;
        const source = candidate.sourceMon || {};
        return toId(source.species || '') === speciesId && toId(source.name || source.nickname || source.species || '') === nameId;
      }) || null;
    }
    if (!entry) entry = entries.find(candidate => !candidate.used) || null;
    if (entry) entry.used = true;
    return entry || {sourceMon: {}, sourceIndex: -1, key: '', used: false};
  };
}

function parseRequestPokemonShiny(details = '') {
  return /(?:^|,\s*)shiny(?:,|$)/i.test(String(details || '').trim());
}

function reorderArrayByTargetIndices(items = [], targetIndices = [], fallbackLength = 0) {
  const size = Math.max(fallbackLength, items.length, targetIndices.reduce((max, index) => (
    Number.isInteger(index) ? Math.max(max, index + 1) : max
  ), 0));
  const out = new Array(size).fill(null);
  const usedTargets = new Set();
  const spill = [];

  items.forEach((item, index) => {
    const targetIndex = targetIndices[index];
    if (Number.isInteger(targetIndex) && targetIndex >= 0 && !usedTargets.has(targetIndex) && !out[targetIndex]) {
      out[targetIndex] = item;
      usedTargets.add(targetIndex);
      return;
    }
    spill.push(item);
  });

  for (let index = 0; index < out.length && spill.length; index += 1) {
    if (!out[index]) out[index] = spill.shift();
  }

  while (spill.length) out.push(spill.shift());
  return out;
}

class ShowdownLocalSinglesSession {
  constructor(payload = {}) {
    this.id = randomUUID();
    this.mode = 'singles';
    this.formatid = payload.formatid || 'gen9customgame@@@+pokemontag:past,+pokemontag:future';
    this.players = payload.players || [];
    this.stream = new BattleStreams.BattleStream({keepAlive: true});
    this.requests = {p1: null, p2: null};
    this.logEntries = [{text: '로컬 Showdown 싱글 엔진으로 배틀 시작 / Battle started with the local Showdown singles engine.', tone: 'accent'}];
    this.protocol = [];
    this.rawOutputs = [];
  }

  write(line) {
    this.stream.write(line);
  }

  async drainOutputs(settleMs = 0) {
    if (settleMs) await sleep(settleMs);
    const queue = this.stream?._queue;
    const items = [];
    while (queue?.items?.length) {
      items.push(String(queue.items.shift()));
    }
    if (items.length) this.processOutputs(items);
    return items;
  }

  processOutputs(outputs) {
    for (const output of outputs) {
      this.rawOutputs.push(output);
      const [header, ...rest] = output.split('\n');
      const body = rest.join('\n');
      if (header === 'sideupdate') {
        const sideId = rest[0];
        const sideBody = rest.slice(1).join('\n');
        for (const line of sideBody.split('\n')) {
          if (!line) continue;
          if (line.startsWith('|request|')) {
            const json = line.slice('|request|'.length);
            try {
              this.requests[sideId] = JSON.parse(json);
            } catch {
              this.requests[sideId] = null;
            }
            continue;
          }
          const entry = normalizeLogTextFromLine(line);
          if (entry) this.logEntries.unshift(entry);
          this.protocol.push(line);
        }
      } else {
        const lines = body.split('\n').filter(Boolean).filter(line => line !== '|split|p1' && line !== '|split|p2');
        let previous = '';
        for (const line of lines) {
          if (line === previous) continue;
          previous = line;
          if (line.startsWith('|request|')) continue;
          const entry = normalizeLogTextFromLine(line);
          if (entry) this.logEntries.unshift(entry);
          this.protocol.push(line);
        }
      }
      if (this.logEntries.length > 120) this.logEntries.length = 120;
      if (this.protocol.length > 500) this.protocol = this.protocol.slice(-500);
    }
  }

  buildTeamPreviewCommand(team) {
    return `team ${team.map((_, index) => String(index + 1)).join('')}`;
  }

  start() {
    this.write(`>start ${JSON.stringify({formatid: this.formatid, debug: true})}`);
    this.players.forEach((player, index) => {
      const slot = `p${index + 1}`;
      const team = (player.team || []).map(mon => ({
        species: mon.species,
        name: mon.name || mon.species,
        item: mon.item || '',
        ability: mon.ability || '',
        moves: Array.isArray(mon.moves) ? mon.moves.filter(Boolean) : [],
        nature: mon.nature || '',
        gender: mon.gender || '',
        evs: mon.evs || {hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0},
        ivs: mon.ivs || {hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31},
        level: Number(mon.level || 100),
        shiny: Boolean(mon.shiny),
        teraType: mon.teraType || undefined,
      }));
      this.write(`>player ${slot} ${JSON.stringify({name: player.name || `Player ${index + 1}`, team})}`);
    });
  }

  async initialize() {
    this.start();
    await this.drainOutputs(5);
    if (this.requests.p1?.teamPreview || this.requests.p2?.teamPreview) {
      this.write(`>p1 ${this.buildTeamPreviewCommand(this.players[0]?.team || [])}`);
      this.write(`>p2 ${this.buildTeamPreviewCommand(this.players[1]?.team || [])}`);
      await this.drainOutputs(5);
    }
    return this.snapshot();
  }

  async choose(choiceMap = {}) {
    const p1 = choiceMap.p1 || '';
    const p2 = choiceMap.p2 || '';
    if (p1) this.write(`>p1 ${p1}`);
    if (p2) this.write(`>p2 ${p2}`);
    await this.drainOutputs(5);
    return this.snapshot();
  }

  snapshot() {
    const battle = this.stream.battle;
    const players = battle.sides.slice(0, 2).map((side, playerIndex) => {
      const uiTeam = this.players[playerIndex]?.team || [];
      const matchUiSourceForPokemon = createUiSourceMatcher(uiTeam);
      const mappedEntries = side.pokemon.map((pokemon, engineOrderIndex) => {
        const match = matchUiSourceForPokemon(pokemon);
        const sourceMon = match?.sourceMon || {};
        const ui = sourceMon.ui || sourceMon || {};
        const stableSlot = Number.isInteger(match?.sourceIndex) && match.sourceIndex >= 0 ? match.sourceIndex : engineOrderIndex;
        const dexItem = battle.dex.items.get(pokemon.item || ui.item || '');
        const dexAbility = battle.dex.abilities.get(pokemon.ability || ui.ability || '');
        const speciesName = pokemon.species?.name || ui.displaySpecies || ui.species || '';
        const isMegaSpecies = Boolean(pokemon.species?.isMega || /-Mega/i.test(speciesName));
        const spriteId = resolveBattleFormUiSpriteId(speciesName, ui);
        return {
          engineOrderIndex,
          stableSlot,
          pokemon,
          mon: {
            id: ui.id || `${playerIndex}-${stableSlot}`,
            player: playerIndex,
            slot: stableSlot,
            species: speciesName,
            baseSpecies: resolveSnapshotBaseSpeciesName(pokemon, ui),
            formSpecies: speciesName,
            nickname: ui.nickname || (pokemon.name !== speciesName ? pokemon.name : ''),
            spriteId,
            spriteAutoId: spriteId || ui.startSpriteId || ui.selectedSpriteId || '',
            startSpriteId: ui.startSpriteId || ui.selectedSpriteId || spriteId,
            megaSpecies: ui.megaSpecies || '',
            megaSpriteId: ui.megaSpriteId || '',
            primalSpecies: ui.primalSpecies || '',
            primalSpriteId: ui.primalSpriteId || '',
            ultraSpecies: ui.ultraSpecies || '',
            ultraSpriteId: ui.ultraSpriteId || '',
            shiny: Boolean((pokemon?.set && typeof pokemon.set.shiny !== 'undefined') ? pokemon.set.shiny : ui.shiny),
            level: pokemon.level,
            nature: ui.nature || '',
            evs: ui.evs || {hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0},
            ivs: ui.ivs || {hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31},
            item: dexItem?.exists ? dexItem.name : (ui.item || ''),
            ability: dexAbility?.exists ? dexAbility.name : (ui.ability || ''),
            teraType: pokemon.teraType || ui.teraType || '',
            moves: pokemon.baseMoveSlots.map(slot => battle.dex.moves.get(slot.id)?.name || slot.move),
            moveSlots: pokemon.moveSlots.map(slot => ({
              name: battle.dex.moves.get(slot.id)?.name || slot.move,
              pp: slot.pp,
              maxPp: slot.maxpp,
              target: mapTargetHint(slot.target),
              disabled: Boolean(slot.disabled),
            })),
            baseMoves: pokemon.baseMoveSlots.map(slot => battle.dex.moves.get(slot.id)?.name || slot.move),
            types: pokemon.getTypes().map(type => String(type).toLowerCase()),
            originalTypes: (pokemon.baseTypes || []).map(type => String(type).toLowerCase()),
            stats: {
              hp: pokemon.baseMaxhp,
              atk: pokemon.storedStats.atk,
              def: pokemon.storedStats.def,
              spa: pokemon.storedStats.spa,
              spd: pokemon.storedStats.spd,
              spe: pokemon.storedStats.spe,
            },
            baseMaxHp: pokemon.baseMaxhp,
            maxHp: pokemon.maxhp,
            hp: Math.max(0, pokemon.hp),
            boosts: {...pokemon.boosts},
            status: pokemon.status || '',
            sleepTurns: Number(pokemon.statusState?.time || 0),
            toxicCounter: Number(pokemon.statusState?.stage || 0),
            protect: Boolean(pokemon.volatiles.protect),
            protectCounter: Number(pokemon.volatiles.protect?.counter || 0),
            usedProtectMoveThisTurn: toId(pokemon.moveThisTurn) === 'protect',
            choiceLockMove: '',
            choiceLockMoveIndex: null,
            choiceLockSource: '',
            fainted: Boolean(pokemon.fainted || pokemon.hp <= 0),
            terastallized: Boolean(pokemon.terastallized),
            teraUsed: side.pokemon.some(mon => Boolean(mon.terastallized)),
            dynamaxed: Boolean(pokemon.volatiles.dynamax) || pokemon.maxhp > pokemon.baseMaxhp,
            dynamaxTurns: Number(pokemon.volatiles.dynamax?.duration || 0),
            gigantamaxed: Boolean(pokemon.gigantamax),
            preDynamaxSpriteId: ui.startSpriteId || spriteId,
            megaUsed: Boolean(isMegaSpecies),
            gmaxMove: pokemon.canGigantamax || '',
            volatile: mapVolatiles(pokemon.volatiles),
            lastMoveUsed: pokemon.lastMoveUsed ? (battle.dex.moves.get(pokemon.lastMoveUsed)?.name || pokemon.lastMoveUsed) : '',
            lastMoveMeta: null,
            lastMoveTurn: pokemon.activeTurns || 0,
            originalData: ui.data || {name: speciesName, baseSpecies: pokemon.baseSpecies?.name || speciesName, types: (pokemon.baseTypes || []).map(type => String(type).toLowerCase()), canGigantamax: pokemon.canGigantamax || ''},
          },
        };
      });
      const stableSlotsByEngineIndex = mappedEntries.map(entry => entry.stableSlot);
      const team = reorderArrayByTargetIndices(
        mappedEntries.map(entry => entry.mon),
        stableSlotsByEngineIndex,
        Math.max(uiTeam.length, mappedEntries.length)
      ).filter(Boolean);
      const active = side.active
        .map(activePokemon => mappedEntries.find(entry => entry.pokemon === activePokemon)?.stableSlot ?? -1)
        .filter(index => index >= 0);
      const rawRequest = this.requests[`p${playerIndex + 1}`] || null;
      const request = rawRequest ? {
        ...rawRequest,
        side: rawRequest.side ? {
          ...rawRequest.side,
          pokemon: reorderArrayByTargetIndices(
            Array.isArray(rawRequest.side.pokemon)
              ? rawRequest.side.pokemon.map((entry, engineOrderIndex) => ({
                ...entry,
                teamIndex: stableSlotsByEngineIndex[engineOrderIndex] ?? engineOrderIndex,
                engineOrderIndex,
                shiny: parseRequestPokemonShiny(entry?.details || ''),
              }))
              : [],
            stableSlotsByEngineIndex,
            team.length
          ).filter(Boolean),
        } : rawRequest.side,
      } : null;
      return {
        name: side.name,
        team,
        active,
        choices: {},
        mustSwitch: [],
        megaUsed: team.some(mon => mon.megaUsed),
        teraUsed: team.some(mon => mon.terastallized),
        zUsed: Boolean(side.zMoveUsed),
        dynamaxUsed: false,
        hazards: mapHazards(side.sideConditions),
        sideConditions: mapSideConditionTurns(side.sideConditions),
        request,
      };
    });

    return {
      id: this.id,
      engine: 'showdown-local-singles',
      mode: 'singles',
      turn: battle.turn,
      winner: battle.winner || null,
      players,
      weather: weatherMap[battle.field.weather] || '',
      weatherTurns: Number(battle.field.weatherState?.duration || 0),
      terrain: toId(battle.field.terrain || ''),
      terrainTurns: Number(battle.field.terrainState?.duration || 0),
      trickRoomTurns: Number(battle.field.pseudoWeather?.trickroom?.duration || 0),
      log: [...this.logEntries],
      engineMeta: {
        engineName: '@pkmn/sim (vendored local package)',
        formatid: this.formatid,
        supportsSingles: true,
        supportsDoubles: false,
        notes: 'Stage 1 migration path: singles only. Current engine path supports Gen 9 Custom Game battle flow with Showdown-family resolution. Mega Evolution, Z-Moves, and Terastallization are available in this format; Dynamax is not supported in Gen 9 formats and remains a later custom-extension task.',
      },
    };
  }
}

class ShowdownEngineService {
  constructor() {
    this.sessions = new Map();
    applyFutureAbilityRuntimePatches(Dex);
    patchPokemonEffectiveWeatherForMegaSol();
    applyFutureMegaSpeciesMetadataPatches(Dex);
    applyProjectMegaAbilityRulesToDex(Dex);
    try {
      const gen9Dex = Dex.mod('gen9');
      applyFutureAbilityRuntimePatches(gen9Dex);
      applyFutureMegaSpeciesMetadataPatches(gen9Dex);
      applyProjectMegaAbilityRulesToDex(gen9Dex);
    } catch {}
  }

  status() {
    return {
      available: true,
      engine: '@pkmn/sim vendored local package',
      version: '0.10.7',
      modeSupport: ['singles'],
      formatid: 'gen9customgame@@@+pokemontag:past,+pokemontag:future',
      note: 'Local Node-backed Showdown-family singles engine is available.',
    };
  }

  async startSingles(payload) {
    const session = new ShowdownLocalSinglesSession(payload);
    this.sessions.set(session.id, session);
    const snapshot = await session.initialize();
    return snapshot;
  }

  async chooseSingles(id, choiceMap) {
    const session = this.sessions.get(id);
    if (!session) {
      const error = new Error('Battle session not found. Restart the battle.');
      error.statusCode = 404;
      throw error;
    }
    return session.choose(choiceMap);
  }
}

module.exports = {ShowdownEngineService, battleOnlyShouldNormalize};
