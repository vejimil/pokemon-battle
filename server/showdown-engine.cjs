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

const BOOST_LABELS = Object.freeze({
  atk: '공격 / Attack',
  def: '방어 / Defense',
  spa: '특수공격 / Sp. Atk',
  spd: '특수방어 / Sp. Def',
  spe: '스피드 / Speed',
  accuracy: '명중 / Accuracy',
  evasion: '회피 / Evasion',
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

function applyProjectFuturePatchesToDex(dex) {
  if (!dex) return;
  applyFutureAbilityRuntimePatches(dex);
  applyFutureMegaSpeciesMetadataPatches(dex);
  applyProjectMegaAbilityRulesToDex(dex);
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

function logIdentKeyFromProtocol(raw = '') {
  const m = /^(p[12][a-z]?):/i.exec(String(raw || '').trim());
  return m ? String(m[1] || '').toLowerCase() : '';
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


function normalizeLogTextFromLine(line, logCtx = null) {
  const parts = String(line || '').split('|');
  const tag = parts[1] || '';
  const a = parts[2] || '';
  const b = parts[3] || '';
  const c = parts[4] || '';

  switch (tag) {
    case 'turn':
      if (logCtx?.faintedIdents?.clear) logCtx.faintedIdents.clear();
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
      if (logCtx?.faintedIdents?.add) {
        const key = logIdentKeyFromProtocol(a);
        if (key) logCtx.faintedIdents.add(key);
      }
      return {text: `${displayNameForPokemonProtocol(a)} 기절! / ${displayNameForPokemonProtocol(a)} fainted.`, tone: 'accent'};
    case '-damage':
      return {text: `${displayNameForPokemonProtocol(a)} HP → ${displayCondition(b)}`, tone: ''};
    case '-heal':
      return {text: `${displayNameForPokemonProtocol(a)} 회복 / healed → ${displayCondition(b)}`, tone: ''};
    case '-status':
      return {text: `${displayNameForPokemonProtocol(a)} 상태이상: ${b} / status ${b}`, tone: ''};
    case '-curestatus':
      return {text: `${displayNameForPokemonProtocol(a)} 상태 회복 / cured ${b}`, tone: ''};
    case '-ability': {
      const source = displayNameForPokemonProtocol(a);
      const detail = c ? ` (${c})` : '';
      return {text: `${source} 특성 발동: ${b}${detail} / ${source} ability activated: ${b}${detail}.`, tone: 'accent'};
    }
    case '-boost': {
      const source = displayNameForPokemonProtocol(a);
      const stat = BOOST_LABELS[toId(b)] || b;
      const amount = Number(c || 0);
      return {text: `${source} ${stat} +${amount} / ${source} ${stat} rose by ${amount}.`, tone: 'accent'};
    }
    case '-unboost': {
      const source = displayNameForPokemonProtocol(a);
      const stat = BOOST_LABELS[toId(b)] || b;
      const amount = Number(c || 0);
      return {text: `${source} ${stat} -${amount} / ${source} ${stat} fell by ${amount}.`, tone: 'accent'};
    }
    case '-weather':
      // Use `a` (parts[2]) unconditionally — `b` may be '[upkeep]' on tick lines, which must NOT be shown as weather name.
      return a === 'none' ? null : {text: `날씨: ${a} / Weather: ${a}`, tone: 'accent'};
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
    case 'detailschange': {
      const key = logIdentKeyFromProtocol(a);
      const faintedBeforeFormChange = key && logCtx?.faintedIdents?.has?.(key);
      const silent = parts.slice(4).some(part => /^\[silent\]$/i.test(String(part || '').trim()));
      if (silent || faintedBeforeFormChange) return null;
      return {text: `${displayNameForPokemonProtocol(a)} 폼 변화 → ${b} / forme change → ${b}`, tone: 'accent'};
    }
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

// ---------------------------------------------------------------------------
// Structured event builder (M1/M2 — Sprint 1)
// ---------------------------------------------------------------------------

/**
 * Parse a Showdown protocol ident token like "p1a: Pikachu" into side/slot.
 * Returns { side: 'p1'|'p2', slot: 0 } (slot is always 0 for singles).
 */
function parseIdentForEvent(token) {
  const m = /^(p[12])([a-z])?:/.exec(String(token || ''));
  if (!m) return {side: 'p1', slot: 0};
  const letterSlot = m[2] ? m[2].charCodeAt(0) - 97 : 0;
  return {side: m[1], slot: letterSlot};
}

/**
 * Parse a condition string like "120/300" or "120/300 brn" into { hp, maxHp }.
 */
function parseConditionForEvent(token) {
  const raw = String(token || '').trim();
  const m = /^(\d+)(?:\/(\d+))?/.exec(raw);
  if (!m) return {hp: 0, maxHp: 0, status: ''};
  const suffix = raw.slice(m[0].length).trim();
  const statusToken = suffix
    .split(/\s+/)
    .find(part => /^(brn|par|psn|tox|slp|frz|fnt)$/i.test(part));
  return {
    hp: Number(m[1]),
    maxHp: m[2] !== undefined ? Number(m[2]) : Number(m[1]),
    status: statusToken ? String(statusToken).toLowerCase() : '',
  };
}

/**
 * Parse species name from the details token like "Pikachu, L50, M" → "Pikachu".
 */
function parseDetailsSpeciesForEvent(token) {
  return String(token || '').split(',')[0].trim();
}

/**
 * Convert structured events from Showdown protocol lines.
 * Returns an array of zero or more event objects.
 *
 * ctx shape (mutable, persists across calls within one turn resolution):
 *   ctx.turn          {number|null}
 *   ctx.seq           {number}  — monotonic counter
 *   ctx.hpCache       {Map<string, {hp,maxHp}>}
 *   ctx.pendingCrit   {Map<string, boolean>}
 *   ctx.pendingHitResult {Map<string, string>}
 */
function normalizeEventsFromLine(line, ctx) {
  const parts = String(line || '').split('|');
  if (parts[0] !== '') return [];  // malformed
  const tag = parts[1] || '';

  switch (tag) {
    case 'turn': {
      const newTurn = Number(parts[2]) || 0;
      const out = [];
      if (ctx.turn !== null) {
        out.push({type: 'turn_end', turn: ctx.turn, seq: ctx.seq++});
      }
      ctx.turn = newTurn;
      out.push({type: 'turn_start', turn: ctx.turn, seq: ctx.seq++});
      return out;
    }

    case 'switch':
    case 'drag': {
      const id = parseIdentForEvent(parts[2]);
      const species = parseDetailsSpeciesForEvent(parts[3]);
      const cond = parseConditionForEvent(parts[4]);
      // Seed hpCache so the first -damage can compute delta
      ctx.hpCache.set(parts[2], {hp: cond.hp, maxHp: cond.maxHp});
      return [{
        type: 'switch_in',
        turn: ctx.turn,
        seq: ctx.seq++,
        side: id.side,
        slot: id.slot,
        species,
        hpAfter: cond.hp,
        maxHp: cond.maxHp,
        status: cond.status,
        cause: tag === 'drag' ? 'drag' : 'switch',
        fromBall: tag === 'switch',
      }];
    }

    case 'move': {
      const id = parseIdentForEvent(parts[2]);
      const targetRaw = parts[4];
      const targetId = targetRaw ? parseIdentForEvent(targetRaw) : null;
      return [{
        type: 'move_use',
        turn: ctx.turn,
        seq: ctx.seq++,
        actor: {side: id.side, slot: id.slot},
        move: parts[3] || '',
        target: targetId,
      }];
    }

    case 'faint': {
      const id = parseIdentForEvent(parts[2]);
      return [{
        type: 'faint',
        turn: ctx.turn,
        seq: ctx.seq++,
        side: id.side,
        slot: id.slot,
      }];
    }

    case '-damage':
    case '-heal': {
      const id = parseIdentForEvent(parts[2]);
      const identKey = parts[2];
      const cond = parseConditionForEvent(parts[3]);
      const prev = ctx.hpCache.get(identKey);
      const prevHp = prev ? prev.hp : cond.hp;
      const maxHp = prev ? prev.maxHp : cond.maxHp;
      const amount = Math.abs(prevHp - cond.hp);
      ctx.hpCache.set(identKey, {hp: cond.hp, maxHp});
      if (tag === '-damage') {
        const critical = ctx.pendingCrit.get(identKey) ?? false;
        const hitResult = ctx.pendingHitResult.get(identKey) ?? 'effective';
        ctx.pendingCrit.delete(identKey);
        ctx.pendingHitResult.delete(identKey);
        return [{
          type: 'damage',
          turn: ctx.turn,
          seq: ctx.seq++,
          target: {side: id.side, slot: id.slot},
          hpAfter: cond.hp,
          maxHp,
          amount,
          status: cond.status,
          hitResult,
          critical,
        }];
      } else {
        return [{
          type: 'heal',
          turn: ctx.turn,
          seq: ctx.seq++,
          target: {side: id.side, slot: id.slot},
          hpAfter: cond.hp,
          maxHp,
          amount,
          status: cond.status,
        }];
      }
    }

    // Accumulators: set flag, consumed by next -damage line
    case '-crit': {
      ctx.pendingCrit.set(parts[2], true);
      return [];
    }
    case '-supereffective': {
      ctx.pendingHitResult.set(parts[2], 'super');
      return [];
    }
    case '-resisted': {
      ctx.pendingHitResult.set(parts[2], 'not_very');
      return [];
    }
    case '-immune': {
      const id = parseIdentForEvent(parts[2]);
      return [{type: 'immune', turn: ctx.turn, seq: ctx.seq++, target: {side: id.side, slot: id.slot}}];
    }

    case '-ability': {
      const id = parseIdentForEvent(parts[2]);
      return [{
        type: 'ability_show',
        turn: ctx.turn,
        seq: ctx.seq++,
        side: id.side,
        slot: id.slot,
        ability: parts[3] || '',
        passive: false,
      }];
    }

    case '-weather': {
      const weatherName = parts[2];
      const isUpkeep = parts[3] === '[upkeep]';
      if (weatherName === 'none') {
        return [{type: 'weather_end', turn: ctx.turn, seq: ctx.seq++}];
      }
      const weatherEvents = [];
      // Generate ability_show when weather is triggered by an ability
      // e.g. "|-weather|SunnyDay|[from] ability: Drought|[of] p1a: Groudon"
      if (!isUpkeep) {
        const fromAbilityTag = parts.slice(3).find(p => /^\[from\] ability:/i.test(p));
        if (fromAbilityTag) {
          const abilityName = fromAbilityTag.replace(/^\[from\] ability:\s*/i, '').trim();
          const ofTag = parts.slice(3).find(p => /^\[of\]/i.test(p));
          const ident = ofTag ? ofTag.replace(/^\[of\]\s*/i, '').trim() : '';
          const id = ident ? parseIdentForEvent(ident) : {side: 'p1', slot: 0};
          weatherEvents.push({type: 'ability_show', turn: ctx.turn, seq: ctx.seq++, side: id.side, slot: id.slot, ability: abilityName, passive: false});
        }
      }
      weatherEvents.push({
        type: isUpkeep ? 'weather_tick' : 'weather_start',
        turn: ctx.turn,
        seq: ctx.seq++,
        weather: weatherName,
      });
      return weatherEvents;
    }

    case '-fieldstart': {
      const terrainEvents = [];
      // Generate ability_show when terrain is triggered by an ability
      // e.g. "|-fieldstart|move: Electric Terrain|[from] ability: Electric Surge|[of] p1a: Tapu Koko"
      const fromAbilityTag = parts.slice(3).find(p => /^\[from\] ability:/i.test(p));
      if (fromAbilityTag) {
        const abilityName = fromAbilityTag.replace(/^\[from\] ability:\s*/i, '').trim();
        const ofTag = parts.slice(3).find(p => /^\[of\]/i.test(p));
        const ident = ofTag ? ofTag.replace(/^\[of\]\s*/i, '').trim() : '';
        const id = ident ? parseIdentForEvent(ident) : {side: 'p1', slot: 0};
        terrainEvents.push({type: 'ability_show', turn: ctx.turn, seq: ctx.seq++, side: id.side, slot: id.slot, ability: abilityName, passive: false});
      }
      const effectId = parts[3] || parts[2];
      terrainEvents.push({type: 'terrain_start', turn: ctx.turn, seq: ctx.seq++, effect: effectId, raw: parts[2]});
      return terrainEvents;
    }
    case '-fieldend': {
      const effectId = parts[3] || parts[2];
      return [{type: 'terrain_end', turn: ctx.turn, seq: ctx.seq++, effect: effectId, raw: parts[2]}];
    }

    case '-status': {
      const id = parseIdentForEvent(parts[2]);
      return [{type: 'status_apply', turn: ctx.turn, seq: ctx.seq++, target: {side: id.side, slot: id.slot}, status: parts[3] || ''}];
    }
    case '-curestatus': {
      const id = parseIdentForEvent(parts[2]);
      return [{type: 'status_cure', turn: ctx.turn, seq: ctx.seq++, target: {side: id.side, slot: id.slot}, status: parts[3] || ''}];
    }

    case '-boost': {
      const id = parseIdentForEvent(parts[2]);
      return [{type: 'boost', turn: ctx.turn, seq: ctx.seq++, target: {side: id.side, slot: id.slot}, stat: parts[3] || '', amount: Number(parts[4]) || 0}];
    }
    case '-unboost': {
      const id = parseIdentForEvent(parts[2]);
      return [{type: 'unboost', turn: ctx.turn, seq: ctx.seq++, target: {side: id.side, slot: id.slot}, stat: parts[3] || '', amount: Number(parts[4]) || 0}];
    }

    case '-sidestart': {
      const side = /^p[12]/.exec(parts[2] || '')?.[0] ?? '';
      return [{type: 'side_start', turn: ctx.turn, seq: ctx.seq++, side, effect: parts[3] || ''}];
    }
    case '-sideend': {
      const side = /^p[12]/.exec(parts[2] || '')?.[0] ?? '';
      return [{type: 'side_end', turn: ctx.turn, seq: ctx.seq++, side, effect: parts[3] || ''}];
    }

    case '-fail': {
      // Move failed (e.g. Protect already used, no valid target, etc.)
      // parts[2] may be empty (field-level fail) or an ident (pokemon-level fail)
      const id = parts[2] ? parseIdentForEvent(parts[2]) : null;
      return [{type: 'move_fail', turn: ctx.turn, seq: ctx.seq++, actor: id ? {side: id.side, slot: id.slot} : null, reason: parts[3] || ''}];
    }

    case '-activate': {
      const id = parseIdentForEvent(parts[2]);
      return [{type: 'effect_activate', turn: ctx.turn, seq: ctx.seq++, target: {side: id.side, slot: id.slot}, effect: parts[3] || ''}];
    }
    case '-singleturn': {
      const id = parseIdentForEvent(parts[2]);
      return [{type: 'single_turn_effect', turn: ctx.turn, seq: ctx.seq++, target: {side: id.side, slot: id.slot}, effect: parts[3] || ''}];
    }

    case 'miss': {
      const id = parseIdentForEvent(parts[2]);
      return [{type: 'miss', turn: ctx.turn, seq: ctx.seq++, target: {side: id.side, slot: id.slot}}];
    }
    case '-miss': {
      const id = parseIdentForEvent(parts[2]);
      return [{type: 'miss', turn: ctx.turn, seq: ctx.seq++, target: {side: id.side, slot: id.slot}}];
    }
    case 'cant': {
      const id = parseIdentForEvent(parts[2]);
      return [{type: 'cant_move', turn: ctx.turn, seq: ctx.seq++, actor: {side: id.side, slot: id.slot}, reason: parts[3] || ''}];
    }

    case 'callback': {
      return [{type: 'callback_event', turn: ctx.turn, seq: ctx.seq++, reason: parts[2] || ''}];
    }

    case 'win': {
      const out = [];
      if (ctx.turn !== null) {
        out.push({type: 'turn_end', turn: ctx.turn, seq: ctx.seq++});
        ctx.turn = null;
      }
      out.push({type: 'battle_end', seq: ctx.seq++, winner: parts[2] || ''});
      return out;
    }

    case '-mega':
    case '-zpower':
    case '-terastallize':
    case '-formechange':
    case 'detailschange': {
      const id = parseIdentForEvent(parts[2]);
      const detailsSpecies = parseDetailsSpeciesForEvent(parts[3] || '');
      const identSpecies = displayNameForPokemonProtocol(parts[2] || '');
      const identLooksLikeForm = /-(mega|mega-x|mega-y|primal|ultra)\b/i.test(identSpecies);
      const silent = parts.slice(4).some(part => /^\[silent\]$/i.test(String(part || '').trim()));
      const fromTag = parts
        .slice(4)
        .find(part => /^\[from\]\s*/i.test(String(part || '').trim()));
      const fromSource = fromTag
        ? String(fromTag || '').trim().replace(/^\[from\]\s*/i, '').trim()
        : '';
      let trigger = '';
      if (/^ability\s*:/i.test(fromSource)) trigger = 'ability';
      else if (/^item\s*:/i.test(fromSource)) trigger = 'item';
      else if (/^move\s*:/i.test(fromSource)) trigger = 'move';
      else if (/^weather\b/i.test(fromSource)) trigger = 'weather';
      const toSpecies = tag === 'detailschange'
        ? (detailsSpecies || identSpecies || '')
        : tag === '-formechange'
          ? detailsSpecies
          : tag === '-mega'
            ? (identLooksLikeForm ? identSpecies : '')
            : '';
      return [{
        type: 'forme_change',
        turn: ctx.turn,
        seq: ctx.seq++,
        target: {side: id.side, slot: id.slot},
        to: parts[3] || '',
        toSpecies,
        mechanism: tag,
        silent,
        trigger,
        fromSource,
      }];
    }

    // Raw passthrough for unknown/debug/meta tags
    case 'error':
      return [{type: 'engine_error', turn: ctx.turn, seq: ctx.seq++, message: parts[2] || ''}];

    default:
      // meta/control/unknown tags — passthrough, never silent-drop
      return [{type: 'raw_event', turn: ctx.turn, seq: ctx.seq++, tag, raw: line}];
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
    // Event stream state (M1)
    this.eventsBuffer = [];
    this._evtCtx = {turn: null, seq: 0, hpCache: new Map(), pendingCrit: new Map(), pendingHitResult: new Map()};
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
      const logCtx = {faintedIdents: new Set()};
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
          const entry = normalizeLogTextFromLine(line, logCtx);
          if (entry) this.logEntries.unshift(entry);
          this.protocol.push(line);
          for (const ev of normalizeEventsFromLine(line, this._evtCtx)) this.eventsBuffer.push(ev);
        }
      } else {
        const lines = body.split('\n').filter(Boolean).filter(line => line !== '|split|p1' && line !== '|split|p2');
        let previous = '';
        for (const line of lines) {
          if (line === previous) continue;
          previous = line;
          if (line.startsWith('|request|')) continue;
          const entry = normalizeLogTextFromLine(line, logCtx);
          if (entry) this.logEntries.unshift(entry);
          this.protocol.push(line);
          for (const ev of normalizeEventsFromLine(line, this._evtCtx)) this.eventsBuffer.push(ev);
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
    applyProjectFuturePatchesToDex(this.stream?.dex);
    applyProjectFuturePatchesToDex(this.stream?.battle?.dex);
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
    // Reset event buffer and per-turn accumulators.
    // hpCache is intentionally preserved across turns — it tracks current HP for delta calculation.
    this.eventsBuffer = [];
    this._evtCtx.pendingCrit = new Map();
    this._evtCtx.pendingHitResult = new Map();
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
      events: [...this.eventsBuffer],
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
    patchPokemonEffectiveWeatherForMegaSol();
    applyProjectFuturePatchesToDex(Dex);
    try {
      applyProjectFuturePatchesToDex(Dex.mod('gen9'));
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
