
// Legacy custom browser battle-runtime code isolated from src/app.js during the
// careful Stage 20 migration audit. This module is intentionally NOT part of the
// supported user-facing runtime path. Singles require the local Showdown engine,
// and doubles remain blocked until an engine-backed path exists.
//
// Purpose:
// - preserve the old custom runtime logic for dependency/audit review
// - keep src/app.js focused on UI / builder / engine coordination
// - avoid silently re-enabling legacy singles fallback
//
// Notes:
// - this factory expects the caller to inject the same helpers/state objects that
//   src/app.js used when this code originally lived inline.
// - the current app build does not import or execute this module in normal flow.
//
// Current classification for audit purposes:
// - definitelyDeadInCurrentAppFlow:
//   renderChoicePanel, renderPendingChoices, isChoiceComplete, isPlayerReady,
//   startCustomRuntimeBattle, resolveLegacyTurn
// - temporaryAuditReferenceCore:
//   buildBattleMon, buildResolvedMove, performMove, resolveTargets,
//   applyStatusMove, computeDamage, endOfTurn, determineWinner
// - potentialSharedHelpersToRehomeLater:
//   isSpeciesLockedItem, canRemoveHeldItem, tryRemoveHeldItem, trySetHeldItem,
//   clearSwitchVolatile, getForcedMoveChoice, setBattleWeather, setBattleTerrain,
//   applyEntryHazards, applySideConditionMove

export const LEGACY_CUSTOM_RUNTIME_AUDIT_CLASSIFICATION = Object.freeze({
  definitelyDeadInCurrentAppFlow: [
    'renderChoicePanel',
    'renderPendingChoices',
    'isChoiceComplete',
    'isPlayerReady',
    'startCustomRuntimeBattle',
    'resolveLegacyTurn',
  ],
  temporaryAuditReferenceCore: [
    'buildBattleMon',
    'buildResolvedMove',
    'performMove',
    'resolveTargets',
    'applyStatusMove',
    'computeDamage',
    'endOfTurn',
    'determineWinner',
  ],
  potentialSharedHelpersToRehomeLater: [
    'isSpeciesLockedItem',
    'canRemoveHeldItem',
    'tryRemoveHeldItem',
    'trySetHeldItem',
    'clearSwitchVolatile',
    'getForcedMoveChoice',
    'setBattleWeather',
    'setBattleTerrain',
    'applyEntryHazards',
    'applySideConditionMove',
  ],
});

export function createLegacyCustomRuntimeAudit(deps = {}) {
  const {
    state, els,
    lang, clamp, deepClone,
    calcStats, getMoveData,
    isMegaSpeciesName, ensureBattleUiState, displaySpeciesName, displayMoveName,
    displayType, addLog, getHeldItemId, getAbilityId, displayStatus, renderBattle,
    currentBattleWeather, currentBattleTerrain, getBattleMoveType, getBattleMoveCategory,
    getDefaultZMovePower, getDefaultMaxMovePower, getMaxMoveName, canDynamax,
    applyDynamax, clearDynamax, getMaxMoveSecondaryEffect, moveDataCache,
    getModifiedStat, getMegaCandidateForMon, getSpeciesData, calcStatsForSpeciesData,
    statStageMultiplier, STRUGGLE_MOVE, weatherDisplayLabel, terrainDisplayLabel,
    CHOICE_ITEM_IDS, slugify, toId, createEmptyBattleChoice, getActiveMons,
    resolveDamageText, renderAnimatedSprite, hpFillClass, hpPercent, getBattleBadgeText,
    localizedWeatherLabel, localizedTerrainLabel, localizeText,
    isGrounded, targetHints, SHOWDOWN_TARGET_HINTS,
    handleTagBasedMoveImmunity, shouldUseSingleAccuracyCheck, getPerHitMoveVariant,
    applyCrashDamage, moveHasHealingEffect, anyActiveUproar, getSourceSideActiveRecipient,
    clearStockpile, clearBattleVolatile, isMoveBlockedByTorment, isMoveBlockedByHealBlock,
    tryApplyConfusion, applyPerishSongToTarget, applyVolatileStatusMove,
    getRawDexItem, getRawDexSpecies, clearChoiceLock, clearDisable, isMoveDisabled,
    syncChoiceLockWithItem, recordLastMoveUsed
  } = deps;

async function buildBattleMon(mon, player, slot) {
  const stats = calcStats(mon);
  const moveSlots = await Promise.all((mon.moves || []).map(async (moveName) => {
    const move = await getMoveData(moveName).catch(() => null);
    const maxPp = move ? Math.max(1, Math.floor((move.pp || 1) * 8 / 5)) : 1;
    return {name: moveName, pp: maxPp, maxPp};
  }));
  return {
    id: `${player}-${slot}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    player,
    slot,
    species: mon.displaySpecies || mon.formSpecies || mon.species,
    baseSpecies: mon.baseSpecies || mon.data?.baseSpecies || mon.data?.name || mon.species,
    formSpecies: mon.formSpecies || mon.displaySpecies || mon.species,
    nickname: mon.nickname || '',
    gender: mon.gender || '',
    spriteId: mon.spriteId,
    spriteAutoId: mon.spriteAutoId || mon.spriteId,
    shiny: mon.shiny,
    level: mon.level,
    nature: mon.nature,
    evs: deepClone(mon.evs),
    ivs: deepClone(mon.ivs),
    item: mon.item,
    ability: mon.ability,
    teraType: mon.teraType,
    moves: deepClone(mon.moves),
    moveSlots,
    baseMoves: deepClone(mon.moves),
    types: deepClone(mon.data.types),
    originalTypes: deepClone(mon.data.types),
    stats,
    baseMaxHp: stats.hp,
    maxHp: stats.hp,
    hp: stats.hp,
    boosts: {atk:0,def:0,spa:0,spd:0,spe:0},
    status: '',
    sleepTurns: 0,
    toxicCounter: 0,
    protect: false,
    protectCounter: 0,
    usedProtectMoveThisTurn: false,
    choiceLockMove: '',
    choiceLockMoveIndex: null,
    choiceLockSource: '',
    fainted: false,
    terastallized: false,
    teraUsed: false,
    dynamaxed: false,
    dynamaxTurns: 0,
    gigantamaxed: false,
    preDynamaxSpriteId: '',
    megaUsed: isMegaSpeciesName(mon.data?.name || mon.formSpecies || mon.species),
    gmaxMove: mon.data?.canGigantamax || '',
    volatile: {actedThisTurn: false},
    lastMoveUsed: '',
    lastMoveMeta: null,
    lastMoveTurn: 0,
    originalData: mon.data,
  };
}
async function startCustomRuntimeBattle(descriptor = null) {
  const battle = {
    mode: state.mode,
    turn: 1,
    winner: null,
    players: await Promise.all([0,1].map(async player => ({
      name: state.playerNames[player],
      team: await Promise.all(state.teams[player].map((mon, slot) => buildBattleMon(mon, player, slot))),
      active: state.mode === 'singles' ? [0] : [0,1],
      choices: {},
      mustSwitch: [],
      megaUsed: state.teams[player].some(mon => isMegaSpeciesName(mon.data?.name || mon.formSpecies || mon.species)),
      teraUsed: false,
      zUsed: false,
      dynamaxUsed: false,
      hazards: {stealthRock: false, spikes: 0, toxicSpikes: 0, stickyWeb: false},
      sideConditions: {reflectTurns: 0, lightScreenTurns: 0, auroraVeilTurns: 0, tailwindTurns: 0},
    }))),
    weather: '',
    weatherTurns: 0,
    terrain: '',
    terrainTurns: 0,
    trickRoomTurns: 0,
    log: [{text: '배틀 시작! 양쪽 팀이 전장에 나왔습니다. / Battle started. Both teams enter the field.', tone: 'accent'}],
  };
  if (descriptor) applyBattleRuntimeInfo(battle, descriptor);
  state.battle = battle;
  ensureBattleUiState(battle);
  applyStartOfBattleAbilities();
  return battle;
}
function applyStartOfBattleAbilities() {
  const battle = state.battle;
  for (const side of battle.players) {
    for (const idx of side.active) {
      const mon = side.team[idx];
      if (!mon || mon.fainted) continue;
      if (slugify(mon.ability) === 'intimidate') {
        const foe = battle.players[1 - side.team[idx].player];
        foe.active.forEach(foeIdx => {
          const target = foe.team[foeIdx];
          if (target && !target.fainted && getHeldItemId(target) !== 'clearamulet') {
            target.boosts.atk = clamp((target.boosts.atk || 0) - 1, -6, 6);
            addLog(`${mon.species}'s Intimidate lowers ${target.species}'s Attack.`, 'accent');
          }
        });
      }
    }
  }
}
function isSpeciesLockedItem(mon, item) {
  if (!mon || !item) return false;
  const itemId = toId(item.id || item.name || item);
  const species = getRawDexSpecies(mon.species) || getRawDexSpecies(mon.formSpecies) || getRawDexSpecies(mon.baseSpecies) || mon.originalData || null;
  const requiredItems = new Set([
    species?.requiredItem,
    ...(species?.requiredItems || []),
    mon?.originalData?.requiredItem,
    ...(mon?.originalData?.requiredItems || []),
  ].filter(Boolean).map(toId));
  if (requiredItems.has(itemId)) return true;
  const baseSpeciesId = toId(mon.baseSpecies || species?.baseSpecies || mon.species);
  if (item.megaStone) return true;
  if (item.zMove) return true;
  if (item.onPlate && baseSpeciesId === 'arceus') return true;
  if (item.onMemory && baseSpeciesId === 'silvally') return true;
  if (item.onDrive && baseSpeciesId === 'genesect') return true;
  if ((itemId === 'griseousorb' || itemId === 'griseouscore') && baseSpeciesId === 'giratina') return true;
  if ((itemId === 'rustedsword' || itemId === 'rustedshield') && ['zacian','zamazenta'].includes(baseSpeciesId)) return true;
  if (itemId.endsWith('mask') && baseSpeciesId === 'ogerpon') return true;
  return false;
}
function canRemoveHeldItem(mon, source = null) {
  if (!mon?.item) return false;
  const item = getRawDexItem(mon.item);
  if (!item) return true;
  if (source && source.id !== mon.id && slugify(mon.ability) === 'stickyhold') return false;
  if (isSpeciesLockedItem(mon, item)) return false;
  return true;
}
function tryRemoveHeldItem(mon, source = null) {
  if (!mon?.item) return null;
  if (!canRemoveHeldItem(mon, source)) {
    if (source && source.id !== mon.id && slugify(mon.ability) === 'stickyhold') {
      addLog(`${displaySpeciesName(mon.species)}의 점착 / Sticky Hold 때문에 도구를 빼앗을 수 없었다. / ${mon.species}'s Sticky Hold kept its item from being removed.`);
    }
    return null;
  }
  const removedItem = mon.item;
  mon.item = '';
  syncChoiceLockWithItem(mon);
  return removedItem;
}
function trySetHeldItem(mon, itemName = '') {
  if (!mon) return false;
  mon.item = itemName || '';
  syncChoiceLockWithItem(mon);
  return true;
}
function hasUsableNonDisabledMove(mon) {
  return Boolean(mon?.moveSlots?.some((slot, index) => slot && slot.pp > 0 && !isMoveDisabled(mon, index, slot.name)));
}
function getActiveMonsForSide(side) {
  return (side?.active || []).map(index => side.team[index]).filter(mon => mon && !mon.fainted);
}
async function isTargetAboutToUseDamagingMove(target) {
  if (!target || target.fainted || target.volatile?.actedThisTurn || target.volatile?.mustRecharge) return false;
  const pendingChoice = getPendingChoiceForMon(target);
  if (!pendingChoice || pendingChoice.kind !== 'move') return false;
  const forcedMove = getForcedMoveChoice(target);
  const resolvedChoice = forcedMove
    ? {...pendingChoice, move: forcedMove.moveName, moveIndex: forcedMove.moveIndex, target: pendingChoice.target}
    : pendingChoice;
  const baseMove = resolvedChoice.moveIndex === -1
    ? STRUGGLE_MOVE
    : await getMoveData(resolvedChoice.move).catch(() => null);
  if (!baseMove) return false;
  if (resolvedChoice.moveIndex !== -1 && isMoveDisabled(target, resolvedChoice.moveIndex, baseMove.name) && !forcedMove) return false;
  const side = getSideForMon(target);
  const runtimeMove = await buildResolvedMove(target, side, resolvedChoice, baseMove);
  return runtimeMove.category !== 'status';
}
function clearSwitchVolatile(mon) {
  if (!mon) return;
  mon.boosts = {atk:0,def:0,spa:0,spd:0,spe:0};
  mon.protect = false;
  mon.protectCounter = 0;
  mon.usedProtectMoveThisTurn = false;
  clearChoiceLock(mon);
  if (mon.status === 'tox') mon.toxicCounter = 1;
  mon.volatile = {
    airBalloonPopped: mon.volatile?.airBalloonPopped || false,
    flashFire: mon.volatile?.flashFire || false,
    usedSitrus: mon.volatile?.usedSitrus || false,
  };
  mon.lastMoveTurn = 0;
  mon.lastMoveUsed = '';
  mon.lastMoveMeta = null;
}
function getForcedMoveChoice(mon) {
  if (!mon || mon.fainted) return null;
  const encore = mon.volatile?.encore;
  if (encore && Number.isInteger(encore.moveIndex) && encore.moveIndex >= 0) {
    const slot = mon.moveSlots?.[encore.moveIndex];
    if (slot && toId(slot.name) === toId(encore.moveName)) {
      return {moveIndex: encore.moveIndex, moveName: slot.name, source: 'encore', hasPp: slot.pp > 0};
    }
  }
  if (mon.choiceLockMove && Number.isInteger(mon.choiceLockMoveIndex) && CHOICE_ITEM_IDS.has(getHeldItemId(mon))) {
    const slot = mon.moveSlots?.[mon.choiceLockMoveIndex];
    if (slot && toId(slot.name) === toId(mon.choiceLockMove)) {
      return {moveIndex: mon.choiceLockMoveIndex, moveName: slot.name, source: 'choice', hasPp: slot.pp > 0};
    }
  }
  if (mon.volatile?.uproarTurns > 0 && Number.isInteger(mon.volatile?.uproarMoveIndex)) {
    const slot = mon.moveSlots?.[mon.volatile.uproarMoveIndex];
    if (slot && toId(slot.name) === toId(mon.volatile.uproarMoveName || 'Uproar')) {
      return {moveIndex: mon.volatile.uproarMoveIndex, moveName: slot.name, source: 'uproar', hasPp: slot.pp > 0};
    }
  }
  return null;
}
function clearSubstitute(mon) {
  if (!mon?.volatile?.substituteHp) return;
  delete mon.volatile.substituteHp;
  addLog(`${displaySpeciesName(mon.species)}의 대타출동 / Substitute가 사라졌다. / ${mon.species}'s substitute faded.`);
}
function setBattleWeather(weather, source = null, turns = null) {
  if (!state.battle) return;
  const normalized = toId(weather);
  state.battle.weather = normalized;
  if (!normalized) {
    state.battle.weatherTurns = 0;
    addLog('날씨 효과가 사라졌다. / The weather returned to normal.');
    return;
  }
  const itemId = source ? getHeldItemId(source) : '';
  const baseTurns = turns ?? ((normalized === 'rain' && itemId === 'damprock') || (normalized === 'sun' && itemId === 'heatrock') || (normalized === 'sand' && itemId === 'smoothrock') || (normalized === 'snow' && itemId === 'icyrock') ? 8 : 5);
  state.battle.weatherTurns = baseTurns;
  addLog(`${weatherDisplayLabel(normalized)} 상태가 전장을 덮었다. / ${weatherDisplayLabel(normalized)} took over the field.`, 'accent');
}
function setBattleTerrain(terrain, source = null, turns = null) {
  if (!state.battle) return;
  const normalized = toId(terrain);
  state.battle.terrain = normalized;
  if (!normalized) {
    state.battle.terrainTurns = 0;
    addLog('지형 효과가 사라졌다. / The terrain returned to normal.');
    return;
  }
  const itemId = source ? getHeldItemId(source) : '';
  const baseTurns = turns ?? (itemId === 'terrainextender' ? 8 : 5);
  state.battle.terrainTurns = baseTurns;
  addLog(`${terrainDisplayLabel(normalized)} 상태가 전장을 덮었다. / ${terrainDisplayLabel(normalized)} covered the field.`, 'accent');
}
function getBattleMoveSlot(mon, choice) {
  if (!mon?.moveSlots || !choice || !Number.isInteger(choice.moveIndex) || choice.moveIndex < 0) return null;
  return mon.moveSlots[choice.moveIndex] || null;
}
function hasUsableMoves(mon) {
  return Boolean(mon?.moveSlots?.some(slot => slot && slot.pp > 0));
}
function consumeMovePp(mon, choice) {
  const slot = getBattleMoveSlot(mon, choice);
  if (!slot) return null;
  if (slot.pp <= 0) return null;
  slot.pp = Math.max(0, slot.pp - 1);
  return slot;
}
function clearSideHazards(side) {
  if (!side?.hazards) return;
  side.hazards.stealthRock = false;
  side.hazards.spikes = 0;
  side.hazards.toxicSpikes = 0;
  side.hazards.stickyWeb = false;
}
function applySideConditionMove(player, move) {
  const moveId = toId(move?.baseMoveName || move?.name || move?.id);
  const foeSide = state.battle.players[1 - player];
  if (!foeSide?.hazards) return false;
  if (moveId === 'stealthrock') {
    if (foeSide.hazards.stealthRock) return true;
    foeSide.hazards.stealthRock = true;
    addLog(`${foeSide.name} 진영에 스텔스록 / Stealth Rock이 깔렸다. / Pointed stones float around ${foeSide.name}'s side.`, 'accent');
    return true;
  }
  if (moveId === 'spikes') {
    if (foeSide.hazards.spikes >= 3) return true;
    foeSide.hazards.spikes += 1;
    addLog(`${foeSide.name} 진영에 압정뿌리기 / Spikes가 ${foeSide.hazards.spikes}층 깔렸다. / Spikes were scattered on ${foeSide.name}'s side.`, 'accent');
    return true;
  }
  if (moveId === 'toxicspikes') {
    if (foeSide.hazards.toxicSpikes >= 2) return true;
    foeSide.hazards.toxicSpikes += 1;
    addLog(`${foeSide.name} 진영에 독압정 / Toxic Spikes가 ${foeSide.hazards.toxicSpikes}층 깔렸다. / Toxic Spikes were scattered on ${foeSide.name}'s side.`, 'accent');
    return true;
  }
  if (moveId === 'stickyweb') {
    if (foeSide.hazards.stickyWeb) return true;
    foeSide.hazards.stickyWeb = true;
    addLog(`${foeSide.name} 진영에 끈적끈적네트 / Sticky Web이 깔렸다. / A Sticky Web was laid out on ${foeSide.name}'s side.`, 'accent');
    return true;
  }
  return false;
}
function applyEntryHazards(player, mon) {
  if (!state.battle || !mon || mon.fainted) return;
  const side = state.battle.players[player];
  const hazards = side?.hazards;
  if (!hazards) return;
  if (getHeldItemId(mon) === 'heavydutyboots') {
    addLog(`${displaySpeciesName(mon.species)}은(는) 헤비듀티부츠 / Heavy-Duty Boots 덕분에 함정의 영향을 받지 않았다. / ${mon.species} ignored entry hazards with Heavy-Duty Boots.`);
    return;
  }
  const grounded = isGrounded(mon);
  const hpBase = mon.baseMaxHp || mon.maxHp;
  if (hazards.stealthRock) {
    const rockMult = typeEffectiveness('rock', mon);
    const dmg = rockMult === 0 ? 0 : Math.max(1, Math.floor((hpBase / 8) * rockMult));
    if (dmg > 0) {
      mon.hp = Math.max(0, mon.hp - dmg);
      addLog(`${displaySpeciesName(mon.species)}은(는) 스텔스록 / Stealth Rock 때문에 데미지를 입었다. / ${mon.species} was hurt by Stealth Rock.`);
    }
  }
  if (grounded && hazards.spikes > 0) {
    const ratios = {1: 1/8, 2: 1/6, 3: 1/4};
    const dmg = Math.max(1, Math.floor(hpBase * (ratios[hazards.spikes] || 1/4)));
    mon.hp = Math.max(0, mon.hp - dmg);
    addLog(`${displaySpeciesName(mon.species)}은(는) 압정뿌리기 / Spikes 때문에 데미지를 입었다. / ${mon.species} was hurt by Spikes.`);
  }
  if (grounded && hazards.toxicSpikes > 0) {
    if (mon.types.includes('poison')) {
      hazards.toxicSpikes = 0;
      addLog(`${displaySpeciesName(mon.species)}이(가) 독압정 / Toxic Spikes를 흡수했다. / ${mon.species} absorbed the Toxic Spikes.`, 'accent');
    } else if (!mon.types.includes('steel')) {
      applyAilment(mon, hazards.toxicSpikes >= 2 ? 'bad-poison' : 'poison', 100);
    }
  }
  if (grounded && hazards.stickyWeb) {
    applyBoost(mon, 'spe', -1, `${displaySpeciesName(mon.species)}의 스피드가 끈적끈적네트 / Sticky Web 때문에 떨어졌다. / ${mon.species}'s Speed fell due to Sticky Web.`);
  }
  if (mon.hp <= 0) {
    mon.hp = 0;
    mon.fainted = true;
    addLog(`${displaySpeciesName(mon.species)}은(는) 함정 때문에 쓰러졌다. / ${mon.species} fainted from entry hazards.`, 'win');
  }
}
function handleSuccessfulHitUtilities(user, targets, move) {
  const moveId = toId(move?.baseMoveName || move?.name || move?.id);
  const player = user?.player ?? 0;
  if (moveId === 'rapidspin' && targets.length) {
    clearSideHazards(state.battle.players[player]);
    applyBoost(user, 'spe', 1, `${displaySpeciesName(user.species)}의 스피드가 올랐다. / ${user.species}'s Speed rose.`);
    addLog(`${displaySpeciesName(user.species)}은(는) 자신의 필드 함정을 제거했다. / ${user.species} cleared away hazards from its side.`);
  }
  if (moveId === 'defog') {
    clearSideHazards(state.battle.players[0]);
    clearSideHazards(state.battle.players[1]);
    ['reflectTurns','lightScreenTurns','auroraVeilTurns'].forEach(key => {
      state.battle.players[0].sideConditions[key] = 0;
      state.battle.players[1].sideConditions[key] = 0;
    });
    if (state.battle.terrain) {
      state.battle.terrain = '';
      state.battle.terrainTurns = 0;
      addLog('디포그 / Defog로 지형 효과도 사라졌다. / Defog also cleared the terrain.');
    }
    addLog('디포그 / Defog로 양쪽 필드의 함정과 장막이 정리되었다. / Defog cleared hazards and screens from both sides.');
  }
  if (move.forceSwitch && targets.length && state.mode === 'singles') {
    const target = targets[0];
    const foeSide = state.battle.players[target.player];
    const replacement = switchOptionsFor(target.player, true)[0];
    if (replacement) {
      const currentIndex = foeSide.active[0];
      performSwitch(target.player, currentIndex, replacement.index);
    }
  }
}
function applyMoveSelfEffects(user, move) {
  if (move?.selfVolatileStatus === 'mustrecharge' && user && !user.fainted && user.hp > 0) {
    user.volatile = user.volatile || {};
    user.volatile.mustRecharge = true;
  }
  if (user && !user.fainted && user.hp > 0) {
    const moveId = toId(move?.baseMoveName || move?.name || move?.id);
    if (moveId === 'uproar' && !user.volatile.uproarTurns) {
      const slotIndex = user.moveSlots?.findIndex(slot => slot && toId(slot.name) === toId(move.baseMoveName || move.name)) ?? -1;
      user.volatile.uproarTurns = 3;
      user.volatile.uproarMoveName = move.baseMoveName || move.name;
      user.volatile.uproarMoveIndex = slotIndex;
    }
    if (moveId === 'destinybond') user.volatile.destinyBond = true;
    if (moveId === 'grudge') user.volatile.grudge = true;
  }
  const boosts = move?.selfBoosts || {};
  const statMap = {attack:'atk', defense:'def', 'special-attack':'spa', 'special-defense':'spd', speed:'spe'};
  for (const [rawStat, amount] of Object.entries(boosts)) {
    const stat = statMap[rawStat] || statMap[slugify(rawStat)] || rawStat;
    if (!(stat in (user?.boosts || {}))) continue;
    user.boosts[stat] = clamp((user.boosts[stat] || 0) + amount, -6, 6);
    addLog(`${displaySpeciesName(user.species)}의 ${statLabels[stat] || stat}이(가) ${amount > 0 ? '올랐다' : '떨어졌다'}. / ${user.species}'s ${stat.toUpperCase()} ${amount > 0 ? 'rose' : 'fell'}.`);
  }
  if (move?.selfAilment) applyAilment(user, move.selfAilment, 100);
}
function afterMoveResolution(user, hitTargets, move, totalDamage) {
  const moveId = toId(move?.baseMoveName || move?.name || move?.id);
  recordLastMoveUsed(user, move);
  applyMoveSelfEffects(user, move);
  if (move.category === 'status') return;
  if (hitTargets.length) {
    if (move.weather) {
      const weatherMap = {raindance: 'rain', sunnyday: 'sun', sandstorm: 'sand', snowscape: 'snow'};
      setBattleWeather(weatherMap[moveId] || move.weather, user);
    }
    if (move.terrain) {
      const terrainMap = {electricterrain: 'electricterrain', grassyterrain: 'grassyterrain', mistyterrain: 'mistyterrain', psychicterrain: 'psychicterrain'};
      setBattleTerrain(terrainMap[moveId] || move.terrain, user);
    }
    if (move.useMax) {
      const moveType = toId(move.type);
      if (moveType === 'fire') setBattleWeather('sun', user, 5);
      if (moveType === 'water') setBattleWeather('rain', user, 5);
      if (moveType === 'rock') setBattleWeather('sand', user, 5);
      if (moveType === 'ice') setBattleWeather('snow', user, 5);
      if (moveType === 'electric') setBattleTerrain('electricterrain', user, 5);
      if (moveType === 'grass') setBattleTerrain('grassyterrain', user, 5);
      if (moveType === 'psychic') setBattleTerrain('psychicterrain', user, 5);
      if (moveType === 'fairy') setBattleTerrain('mistyterrain', user, 5);
    }
    applySideConditionMove(user.player, move);
    handleSuccessfulHitUtilities(user, hitTargets, move);
  }
  if (getHeldItemId(user) === 'shellbell' && totalDamage > 0 && !user.fainted) {
    const heal = Math.max(1, Math.floor(totalDamage / 8));
    user.hp = Math.min(user.maxHp, user.hp + heal);
    addLog(`${displaySpeciesName(user.species)}은(는) 조개껍질방울 / Shell Bell로 HP를 회복했다. / ${user.species} restored HP with Shell Bell.`);
  }
  if (moveId === 'struggle') {
    const recoil = Math.max(1, Math.floor((user.baseMaxHp || user.maxHp) / 4));
    user.hp = Math.max(0, user.hp - recoil);
    addLog(`${displaySpeciesName(user.species)}은(는) 발버둥 / Struggle 반동을 받았다. / ${user.species} was damaged by recoil from Struggle.`);
  } else if (move.recoil && totalDamage > 0) {
    const recoil = Math.max(1, Math.floor(totalDamage * (move.recoil / 100)));
    user.hp = Math.max(0, user.hp - recoil);
    addLog(`${displaySpeciesName(user.species)}은(는) 반동 데미지를 입었다. / ${user.species} was hit by recoil.`);
  }
  if (user.hp <= 0) {
    user.hp = 0;
    user.fainted = true;
    addLog(`${displaySpeciesName(user.species)}은(는) 쓰러졌다. / ${user.species} fainted.`, 'win');
  }
}
function switchOptionsFor(player, excludeActive = true) {
  const side = state.battle.players[player];
  return side.team.map((mon, index) => ({mon, index}))
    .filter(({mon, index}) => !mon.fainted && (!excludeActive || !side.active.includes(index)));
}
function targetOptionsFor(player, actionMonIndex, move) {
  const foe = state.battle.players[1 - player];
  const ally = state.battle.players[player];
  const options = [];
  if (move.target === 'single-opponent') {
    foe.active.forEach(index => {
      const mon = foe.team[index];
      if (mon && !mon.fainted) options.push({player: 1 - player, slot: index, label: mon.species});
    });
  } else if (move.target === 'ally') {
    ally.active.forEach(index => {
      if (index === actionMonIndex) return;
      const mon = ally.team[index];
      if (mon && !mon.fainted) options.push({player, slot:index, label: mon.species});
    });
  } else if (move.target === 'ally-or-self') {
    ally.active.forEach(index => {
      const mon = ally.team[index];
      if (mon && !mon.fainted) options.push({player, slot:index, label: mon.species});
    });
  }
  return options;
}
function ensureChoiceObjects(player) {
  const side = state.battle.players[player];
  side.active.forEach(activeIndex => {
    if (!side.choices[activeIndex]) side.choices[activeIndex] = {kind:'', move:'', moveIndex:null, target:null, switchTo:null, tera:false, mega:false, z:false, dynamax:false};
  });
}
function renderChoicePanel(player, container, statusEl, titleEl) {
  if (isShowdownLocalBattle(state.battle)) {
    renderEngineSinglesChoicePanel(player, container, statusEl, titleEl);
    return;
  }
  const side = state.battle.players[player];
  ensureChoiceObjects(player);
  titleEl.textContent = `${side.name} 선택 / Choice`;
  container.innerHTML = '';
  const mustSwitchCount = side.active.filter(index => side.team[index]?.fainted).length;
  statusEl.textContent = mustSwitchCount
    ? '기절한 전투 포켓몬의 교체 대상을 선택하세요. / Choose replacements for fainted active Pokémon.'
    : `행동 가능한 전투 포켓몬 ${side.active.length}마리 준비 완료. / ${side.active.length} active Pokémon ready to act.`;

  for (const activeIndex of side.active) {
    const mon = side.team[activeIndex];
    const section = document.createElement('div');
    section.className = 'choice-section';

    if (!mon || mon.fainted) {
      section.innerHTML = `<h4>교체 필요 / Replacement required</h4>`;
      const switchWrap = document.createElement('div');
      switchWrap.className = 'choice-buttons';
      switchOptionsFor(player, true).forEach(({mon: option, index}) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'choice-btn';
        btn.innerHTML = `<strong>${displaySpeciesName(option.species)}</strong><small>HP ${option.hp}/${option.maxHp}</small>`;
        btn.addEventListener('click', () => {
          side.choices[activeIndex] = {kind:'switch', switchTo:index, moveIndex:null, target:null, tera:false, mega:false, z:false, dynamax:false};
          renderBattle();
        });
        switchWrap.appendChild(btn);
      });
      section.appendChild(switchWrap);
      container.appendChild(section);
      continue;
    }

    const choice = side.choices[activeIndex];
    if (choice.z && choice.dynamax) choice.dynamax = false;
    section.innerHTML = `<h4>${displaySpeciesName(mon.species)}</h4>${getBattleBadgeText(mon) ? `<div class="battle-inline-flags">${getBattleBadgeText(mon)}</div>` : ''}`;

    const moveButtons = document.createElement('div');
    moveButtons.className = 'choice-buttons';
    const forcedMove = getForcedMoveChoice(mon);
    const lockedOutToStruggle = Boolean(forcedMove && (forcedMove.hasPp === false || isMoveDisabled(mon, forcedMove.moveIndex, forcedMove.moveName)));
    const usableMoveCount = mon.moveSlots?.filter((slot, index) => slot && slot.pp > 0 && !isMoveDisabled(mon, index, slot.name) && !isMoveBlockedByTorment(mon, index, slot.name)).length || 0;
    const statusHints = [];
    if (mon.volatile?.tauntTurns > 0) statusHints.push(`도발 / Taunt ${mon.volatile.tauntTurns}`);
    if (mon.volatile?.substituteHp > 0) statusHints.push(`대타출동 / Substitute ${mon.volatile.substituteHp} HP`);
    if (mon.volatile?.confusionTurns > 0) statusHints.push(`혼란 / Confusion ${mon.volatile.confusionTurns}`);
    if (mon.volatile?.tormentTurns > 0) statusHints.push(`괴롭힘 / Torment ${mon.volatile.tormentTurns}`);
    if (mon.volatile?.healBlockTurns > 0) statusHints.push(`회복봉인 / Heal Block ${mon.volatile.healBlockTurns}`);
    if (mon.volatile?.embargoTurns > 0) statusHints.push(`금제 / Embargo ${mon.volatile.embargoTurns}`);
    if (mon.volatile?.yawnTurns > 0) statusHints.push(`하품 / Yawn ${mon.volatile.yawnTurns}`);
    if (mon.volatile?.leechSeeded) statusHints.push(`씨뿌리기 / Leech Seed`);
    if (mon.volatile?.magnetRiseTurns > 0) statusHints.push(`전자부유 / Magnet Rise ${mon.volatile.magnetRiseTurns}`);
    if (mon.volatile?.aquaRing) statusHints.push(`아쿠아링 / Aqua Ring`);
    if (mon.volatile?.ingrain) statusHints.push(`뿌리박기 / Ingrain`);
    if (mon.volatile?.nightmare) statusHints.push(`악몽 / Nightmare`);
    if (mon.volatile?.perishSongTurns > 0) statusHints.push(`멸망의노래 / Perish Song ${mon.volatile.perishSongTurns - 1}`);
    if (mon.volatile?.stockpileLayers > 0) statusHints.push(`비축하기 / Stockpile ${mon.volatile.stockpileLayers}`);
    if (mon.volatile?.uproarTurns > 0) statusHints.push(`소란 / Uproar ${mon.volatile.uproarTurns}`);
    if (mon.volatile?.destinyBond) statusHints.push(`길동무 / Destiny Bond`);
    if (mon.volatile?.grudge) statusHints.push(`원한 / Grudge`);
    if (mon.volatile?.disable?.turns > 0) statusHints.push(`금지 / Disable → ${displayMoveName(mon.volatile.disable.moveName)} (${mon.volatile.disable.turns})`);
    if (forcedMove?.source === 'encore') statusHints.push(`앵콜 / Encore → ${displayMoveName(forcedMove.moveName)}`);
    if (forcedMove?.source === 'choice') statusHints.push(`구애 잠금 / Choice lock → ${displayMoveName(forcedMove.moveName)}`);
    if (statusHints.length) {
      const forcedNote = document.createElement('div');
      forcedNote.className = 'small-note';
      forcedNote.style.marginTop = '8px';
      forcedNote.textContent = statusHints.join(' · ');
      section.appendChild(forcedNote);
    }
    (mon.moveSlots || []).forEach(async (slot, moveIndex) => {
      const moveName = slot?.name;
      if (!moveName) return;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `choice-btn ${choice.kind === 'move' && choice.moveIndex === moveIndex ? 'selected' : ''}`;
      btn.disabled = slot.pp <= 0;
      if (slot.pp <= 0) btn.classList.add('disabled');
      btn.innerHTML = `<strong>${displayMoveName(moveName)}</strong><small>기술 데이터를 불러오는 중… / Loading move data…</small>`;
      moveButtons.appendChild(btn);
      try {
        const move = await getMoveData(moveName);
        const preview = previewMoveForUi(mon, move);
        const taunted = mon.volatile?.tauntTurns > 0 && (preview?.category || move.category) === 'status';
        const avBlocked = getHeldItemId(mon) === 'assaultvest' && (preview?.category || move.category) === 'status';
        const tormentBlocked = isMoveBlockedByTorment(mon, moveIndex, move.name);
        const healBlocked = isMoveBlockedByHealBlock(mon, preview || move);
        const forcedLocked = forcedMove && forcedMove.moveIndex !== moveIndex;
        const disabledMove = isMoveDisabled(mon, moveIndex, move.name);
        btn.innerHTML = `<strong>${displayMoveName(preview?.name || move.name)}</strong><small>${displayType(preview?.type || move.type)} · ${preview?.category || move.category}${preview?.power ? ` · ${preview.power} BP` : ''}${preview?.accuracy ? ` · ${preview.accuracy}%` : ''} · PP ${slot.pp}/${slot.maxPp}${taunted ? ' · 도발 봉인 / Taunt' : ''}${avBlocked ? ' · AV 봉인 / Assault Vest' : ''}${disabledMove ? ' · 금지 / Disable' : ''}${tormentBlocked ? ' · 괴롭힘 / Torment' : ''}${healBlocked ? ' · 회복봉인 / Heal Block' : ''}${forcedLocked ? ' · 잠김 / Locked' : ''}</small>`;
        if (taunted || avBlocked || disabledMove || tormentBlocked || healBlocked || forcedLocked) {
          btn.disabled = true;
          btn.classList.add('disabled');
        }
        if (!btn.disabled) {
          btn.addEventListener('click', () => {
            side.choices[activeIndex] = {
              kind:'move',
              move: move.name,
              moveIndex,
              target: null,
              switchTo:null,
              tera: choice.tera || false,
              mega: choice.mega || false,
              z: choice.z || false,
              dynamax: choice.dynamax || false,
            };
            renderBattle();
          });
        }
      } catch (error) {
        btn.innerHTML = `<strong>${displayMoveName(moveName)}</strong><small>불러올 수 없음 / Unavailable · PP ${slot.pp}/${slot.maxPp}</small>`;
      }
    });
    if (!usableMoveCount || lockedOutToStruggle) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `choice-btn ${choice.kind === 'move' && choice.moveIndex === -1 ? 'selected' : ''}`;
      btn.innerHTML = `<strong>발버둥 / Struggle</strong><small>${lockedOutToStruggle ? '잠긴 기술의 PP가 없어 자동 해금 / Unlocked because the locked move is out of PP' : '남은 PP가 없어 자동 해금 / Unlocked because no PP remains'}</small>`;
      btn.addEventListener('click', () => {
        side.choices[activeIndex] = {
          kind: 'move',
          move: STRUGGLE_MOVE.name,
          moveIndex: -1,
          target: null,
          switchTo: null,
          tera: false,
          mega: false,
          z: false,
          dynamax: false,
        };
        renderBattle();
      });
      moveButtons.appendChild(btn);
    }
    section.appendChild(moveButtons);

    const toggles = document.createElement('div');
    toggles.className = 'toggle-row';

    const teraBtn = document.createElement('button');
    teraBtn.type = 'button';
    teraBtn.className = `toggle-pill ${choice.tera ? 'active' : ''}`;
    teraBtn.textContent = `테라스탈 / Terastallize (${displayType(mon.teraType)})`;
    teraBtn.disabled = mon.teraUsed || (side.teraUsed && !choice.tera);
    teraBtn.addEventListener('click', () => {
      choice.tera = !choice.tera;
      renderBattle();
    });
    toggles.appendChild(teraBtn);

    const megaOption = getMegaCandidateForMon(mon);
    if (megaOption && !mon.megaUsed) {
      const megaBtn = document.createElement('button');
      megaBtn.type = 'button';
      megaBtn.className = `toggle-pill ${choice.mega ? 'active' : ''}`;
      megaBtn.textContent = '메가진화 / Mega Evolution';
      megaBtn.disabled = Boolean(side.megaUsed) && !choice.mega;
      megaBtn.addEventListener('click', () => {
        choice.mega = !choice.mega;
        if (choice.mega) choice.z = false;
        renderBattle();
      });
      toggles.appendChild(megaBtn);
    }

    if (mon.dynamaxed) {
      const dynaState = document.createElement('span');
      dynaState.className = 'toggle-pill active';
      dynaState.textContent = `다이맥스 유지 중 / Dynamax (${mon.dynamaxTurns})`;
      toggles.appendChild(dynaState);
    } else if (canDynamax(mon, side)) {
      const dynaBtn = document.createElement('button');
      dynaBtn.type = 'button';
      dynaBtn.className = `toggle-pill ${choice.dynamax ? 'active' : ''}`;
      dynaBtn.textContent = '다이맥스 / Dynamax';
      dynaBtn.addEventListener('click', () => {
        choice.dynamax = !choice.dynamax;
        if (choice.dynamax) choice.z = false;
        renderBattle();
      });
      toggles.appendChild(dynaBtn);
    }

    if (choice.kind === 'move' && choice.move && choice.moveIndex !== -1) {
      const zBtn = document.createElement('button');
      zBtn.type = 'button';
      zBtn.className = `toggle-pill ${choice.z ? 'active' : ''}`;
      zBtn.textContent = 'Z기술 / Z-Move';
      zBtn.disabled = true;
      toggles.appendChild(zBtn);
      Promise.all([getMoveData(choice.move), getItemData(mon.item).catch(() => null)]).then(([move, item]) => {
        if (!container.isConnected || !zBtn.isConnected) return;
        const valid = item && canUseZMoveWithMove(mon, side, move, item);
        if (!valid) {
          zBtn.remove();
          if (choice.z) {
            choice.z = false;
            renderBattle();
          }
          return;
        }
        const zName = typeof item.zMove === 'string' ? item.zMove : (move.category === 'status' ? `Z-${move.name}` : (GENERIC_Z_MOVE_NAMES[getBattleMoveType(mon, move)] || 'Z-Move'));
        zBtn.disabled = Boolean(side.zUsed) && !choice.z;
        zBtn.className = `toggle-pill ${choice.z ? 'active' : ''}`;
        zBtn.textContent = `Z기술 / Z-Move (${displayMoveName(zName)})`;
        zBtn.onclick = () => {
          choice.z = !choice.z;
          if (choice.z) choice.dynamax = false;
          renderBattle();
        };
      });
    }

    const switchBtn = document.createElement('button');
    switchBtn.type = 'button';
    switchBtn.className = 'toggle-pill';
    switchBtn.textContent = '교체 / Switch';
    switchBtn.addEventListener('click', () => {
      side.choices[activeIndex] = {kind:'switch', switchTo:null, moveIndex:null, target:null, tera:false, mega:false, z:false, dynamax:false};
      renderBattle();
    });
    toggles.appendChild(switchBtn);
    section.appendChild(toggles);

    if (choice.kind === 'move' && choice.move) {
      const helper = document.createElement('div');
      helper.className = 'small-note';
      helper.style.marginTop = '10px';
      helper.textContent = lang('기술 선택됨.', 'Move selected.');
      section.appendChild(helper);
      Promise.resolve(choice.moveIndex === -1 ? STRUGGLE_MOVE : getMoveData(choice.move)).then(move => {
        const options = targetOptionsFor(player, activeIndex, move);
        if (options.length > 1) {
          const grid = document.createElement('div');
          grid.className = 'target-grid';
          options.forEach(option => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = `target-btn ${choice.target?.player === option.player && choice.target?.slot === option.slot ? 'active' : ''}`;
            btn.textContent = displaySpeciesName(option.label);
            btn.addEventListener('click', () => {
              side.choices[activeIndex].target = {player: option.player, slot: option.slot};
              renderBattle();
            });
            grid.appendChild(btn);
          });
          section.appendChild(grid);
        } else if (options.length === 1 && !choice.target) {
          choice.target = {player: options[0].player, slot: options[0].slot};
        }
      });
    }

    if (choice.kind === 'switch') {
      const switchWrap = document.createElement('div');
      switchWrap.className = 'choice-buttons';
      switchOptionsFor(player, true).forEach(({mon: option, index}) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = `choice-btn ${choice.switchTo === index ? 'selected' : ''}`;
        btn.innerHTML = `<strong>${displaySpeciesName(option.species)}</strong><small>HP ${option.hp}/${option.maxHp}</small>`;
        btn.addEventListener('click', () => {
          side.choices[activeIndex] = {kind:'switch', switchTo:index, moveIndex:null, target:null, tera:false, mega:false, z:false, dynamax:false};
          renderBattle();
        });
        switchWrap.appendChild(btn);
      });
      section.appendChild(switchWrap);
    }

    container.appendChild(section);
  }
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
  const side = state.battle.players[player];
  const mon = side.team[activeIndex];
  const choice = side.choices[activeIndex];
  if (!choice) return false;
  if (!mon || mon.fainted) return choice.kind === 'switch' && Number.isInteger(choice.switchTo);
  if (choice.kind === 'switch') return Number.isInteger(choice.switchTo);
  if (choice.kind === 'move') {
    const move = choice.moveIndex === -1 ? STRUGGLE_MOVE : moveDataCache.get(slugify(choice.move));
    if (!move) return false;
    const options = targetOptionsFor(player, activeIndex, move);
    if (options.length > 1) return Boolean(choice.target);
    return true;
  }
  return false;
}
function isPlayerReady(player) {
  if (isShowdownLocalBattle(state.battle)) {
    const request = getEngineRequestForPlayer(player);
    if (!isEngineActionableRequest(request)) return true;
    return getEngineActionSlots(player).every(activeIndex => isChoiceComplete(player, activeIndex));
  }
  const side = state.battle.players[player];
  return side.active.every(activeIndex => isChoiceComplete(player, activeIndex));
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
        rows.push(`<div class="pending-card"><strong>${mon ? displaySpeciesName(mon.species) : side.name}</strong>${getEngineChoiceSummary(player, activeIndex, battle)}</div>`);
      });
    });
    els.pendingChoices.innerHTML = rows.join('');
    return;
  }
  const rows = [];
  battle.players.forEach((side) => {
    side.active.forEach(activeIndex => {
      const mon = side.team[activeIndex];
      const choice = side.choices[activeIndex];
      let textChoice = lang('대기 중', 'Pending');
      if (choice?.kind === 'switch' && Number.isInteger(choice.switchTo)) textChoice = state.language === 'ko' ? `교체 → ${displaySpeciesName(side.team[choice.switchTo].species)}` : `Switch → ${displaySpeciesName(side.team[choice.switchTo].species)}`;
      if (choice?.kind === 'move') textChoice = choice.target ? `${displayMoveName(choice.move)} → ${displaySpeciesName(battle.players[choice.target.player].team[choice.target.slot].species)}` : displayMoveName(choice.move);
      if (choice?.kind === 'move' && choice?.mega) textChoice += state.language === 'ko' ? ' · 메가진화' : ' · Mega';
      if (choice?.kind === 'move' && choice?.tera) textChoice += state.language === 'ko' ? ' · 테라' : ' · Tera';
      if (choice?.kind === 'move' && choice?.z) textChoice += ' · Z';
      if (choice?.kind === 'move' && choice?.dynamax) textChoice += state.language === 'ko' ? ' · 다이맥스' : ' · Dynamax';
      rows.push(`<div class="pending-card"><strong>${mon ? displaySpeciesName(mon.species) : lang('빈 슬롯', 'Empty slot')}</strong>${textChoice}</div>`);
    });
  });
  els.pendingChoices.innerHTML = rows.join('');
}
function performSwitch(player, activeIndex, targetIndex) {
  const side = state.battle.players[player];
  const currentPosition = side.active.indexOf(activeIndex);
  if (currentPosition === -1 || !Number.isInteger(targetIndex)) return;
  const incoming = side.team[targetIndex];
  if (!incoming || incoming.fainted) return;
  const leaving = side.team[activeIndex];
  if (leaving) {
    if (leaving.dynamaxed) clearDynamax(leaving);
    clearSwitchVolatile(leaving);
  }
  side.active[currentPosition] = targetIndex;
  addLog(`${side.name} 측은 ${leaving ? displaySpeciesName(leaving.species) : '포켓몬 / a Pokémon'}를 회수하고 ${displaySpeciesName(incoming.species)}를 내보냈다. / ${side.name} withdrew ${leaving?.species || 'a Pokémon'} and sent out ${incoming.species}.`, 'accent');
  triggerSwitchInEffects(player, incoming);
}
function triggerSwitchInEffects(player, mon) {
  if (!mon || mon.fainted) return;
  applyEntryHazards(player, mon);
  if (mon.fainted) return;
  if (slugify(mon.ability) === 'intimidate') {
    state.battle.players[1-player].active.forEach(idx => {
      const target = state.battle.players[1-player].team[idx];
      if (target && !target.fainted && getHeldItemId(target) !== 'clearamulet') {
        target.boosts.atk = clamp((target.boosts.atk || 0) - 1, -6, 6);
        addLog(`${displaySpeciesName(mon.species)}의 위협 / Intimidate! ${displaySpeciesName(target.species)}의 공격이 떨어졌다. / ${mon.species}'s Intimidate lowers ${target.species}'s Attack.`, 'accent');
      }
    });
  }
}
function rollHitCount(attacker, move) {
  const moveId = toId(move?.baseMoveName || move?.name || move?.id);
  const minHits = move?.minHits || 1;
  const maxHits = move?.maxHits || 1;
  if (maxHits <= minHits) return Math.max(1, minHits);
  if (getHeldItemId(attacker) === 'loadeddice') {
    if (moveId === 'populationbomb') return 4 + Math.floor(Math.random() * 7);
    if (maxHits === 5 && minHits === 2) return Math.random() < 0.5 ? 4 : 5;
  }
  return minHits + Math.floor(Math.random() * (maxHits - minHits + 1));
}
function applyBoost(target, stat, amount, text) {
  if (!target?.boosts || !(stat in target.boosts)) return;
  target.boosts[stat] = clamp((target.boosts[stat] || 0) + amount, -6, 6);
  if (text) addLog(text);
}
function applyZStatusBonus(user, move) {
  const boosts = move?.zBoosts || {};
  for (const [stat, amount] of Object.entries(boosts)) {
    if (stat in (user?.boosts || {})) user.boosts[stat] = clamp((user.boosts[stat] || 0) + amount, -6, 6);
  }
  if (Object.keys(boosts).length) addLog(`${displaySpeciesName(user.species)}이(가) Z파워로 능력치 보너스를 얻었다. / ${user.species} gained a Z-Power stat bonus.`);
  if (move?.zEffect === 'heal') {
    user.hp = user.maxHp;
    addLog(`${displaySpeciesName(user.species)}의 HP가 가득 회복되었다. / ${user.species} restored all of its HP.`);
  }
  if (move?.zEffect === 'clearnegativeboost') {
    Object.keys(user.boosts).forEach(stat => {
      if (user.boosts[stat] < 0) user.boosts[stat] = 0;
    });
    addLog(`${displaySpeciesName(user.species)}의 낮아진 능력치가 초기화되었다. / ${user.species}'s lowered stats were reset.`);
  }
}
function applyMaxMoveBonus(user, targets, move) {
  const effect = getMaxMoveSecondaryEffect(move?.type);
  if (!effect) return;
  if (effect.kind === 'self-boost') {
    applyBoost(user, effect.stat, effect.amount, `${displaySpeciesName(user.species)}의 ${statLabels[effect.stat] || effect.stat}이(가) 올랐다. / ${user.species}'s ${effect.stat.toUpperCase()} rose.`);
    return;
  }
  for (const target of targets) {
    if (!target || target.fainted) continue;
    applyBoost(target, effect.stat, effect.amount, `${displaySpeciesName(target.species)}의 ${statLabels[effect.stat] || effect.stat}이(가) 떨어졌다. / ${target.species}'s ${effect.stat.toUpperCase()} fell.`);
  }
}
async function buildResolvedMove(mon, side, choice, baseMove) {
  const runtimeMove = {
    ...baseMove,
    baseMoveName: baseMove.name,
    name: baseMove.name,
    type: getBattleMoveType(mon, baseMove) || baseMove.type,
    category: getBattleMoveCategory(mon, baseMove) || baseMove.category,
    power: baseMove.power || 0,
    accuracy: baseMove.accuracy || 100,
    useZ: false,
    useMax: false,
    partialProtect: false,
    bypassAccuracy: false,
  };
  const weather = state.battle?.weather || '';
  const terrain = state.battle?.terrain || '';
  const moveId = toId(baseMove?.baseMoveName || baseMove?.name || baseMove?.id);
  if (moveId === 'weatherball' && weather) {
    const weatherTypes = {sun: 'fire', rain: 'water', sand: 'rock', snow: 'ice'};
    runtimeMove.type = weatherTypes[weather] || runtimeMove.type;
    runtimeMove.power = 100;
  }
  if (moveId === 'terrainpulse' && terrain && isGrounded(mon)) {
    const terrainTypes = {electricterrain: 'electric', grassyterrain: 'grass', mistyterrain: 'fairy', psychicterrain: 'psychic'};
    runtimeMove.type = terrainTypes[terrain] || runtimeMove.type;
    runtimeMove.power = 100;
  }
  if (moveId === 'thunder' || moveId === 'hurricane') {
    if (weather === 'rain') runtimeMove.accuracy = 100;
    if (weather === 'sun') runtimeMove.accuracy = 50;
  }
  if (moveId === 'blizzard' && weather === 'snow') runtimeMove.accuracy = 100;
  if ((moveId === 'solarbeam' || moveId === 'solarblade') && weather && weather !== 'sun') runtimeMove.power = Math.floor(runtimeMove.power / 2);
  if (mon?.terastallized && teraPowerBoostApplies(mon, runtimeMove)) runtimeMove.power = Math.max(runtimeMove.power, 60);
  if (mon?.dynamaxed || choice?.dynamax) {
    runtimeMove.useMax = true;
    runtimeMove.name = getMaxMoveName(mon, baseMove);
    runtimeMove.type = getBattleMoveType(mon, baseMove) || baseMove.type;
    runtimeMove.category = baseMove.category === 'status' ? 'status' : getBattleMoveCategory(mon, baseMove);
    runtimeMove.power = getDefaultMaxMovePower(baseMove);
    runtimeMove.accuracy = 100;
    runtimeMove.priority = baseMove.category === 'status' ? 4 : baseMove.priority;
    runtimeMove.target = baseMove.category === 'status' ? 'self' : baseMove.target;
    runtimeMove.drain = 0;
    runtimeMove.ailment = 'none';
    runtimeMove.ailmentChance = 0;
    runtimeMove.statChanges = [];
    runtimeMove.statChance = 0;
    runtimeMove.minHits = 1;
    runtimeMove.maxHits = 1;
    return runtimeMove;
  }
  if (choice?.z) {
    const item = await getItemData(mon.item).catch(() => null);
    if (item && canUseZMoveWithMove(mon, side, baseMove, item)) {
      runtimeMove.useZ = true;
      runtimeMove.name = typeof item.zMove === 'string' ? item.zMove : (baseMove.category === 'status' ? `Z-${baseMove.name}` : (GENERIC_Z_MOVE_NAMES[runtimeMove.type] || 'Z-Move'));
      runtimeMove.partialProtect = baseMove.category !== 'status';
      runtimeMove.bypassAccuracy = baseMove.category !== 'status';
      if (baseMove.category !== 'status') {
        runtimeMove.power = baseMove.zBasePower || getDefaultZMovePower(baseMove.power || 0);
        runtimeMove.accuracy = 100;
        runtimeMove.drain = 0;
        runtimeMove.ailment = 'none';
        runtimeMove.ailmentChance = 0;
        runtimeMove.statChanges = [];
        runtimeMove.statChance = 0;
        runtimeMove.minHits = 1;
        runtimeMove.maxHits = 1;
      }
    }
  }
  return runtimeMove;
}
async function performMove(action) {
  const {player, mon, choice, move: baseMove} = action;
  if (!mon || mon.fainted) return;
  const side = state.battle.players[player];
  const currentIndex = side.active.find(idx => side.team[idx].id === mon.id) ?? action.activeIndex;
  const currentMon = side.team[currentIndex];
  if (!currentMon || currentMon.fainted) return;
  currentMon.volatile = currentMon.volatile || {};
  currentMon.volatile.actedThisTurn = true;

  const check = canMove(currentMon);
  if (!check.ok) {
    addLog(check.reason);
    return;
  }
  if (check.wake) addLog(`${displaySpeciesName(currentMon.species)}은(는) 잠에서 깼다! / ${currentMon.species} woke up!`);
  if (currentMon.volatile?.confusionTurns > 0) {
    addLog(`${displaySpeciesName(currentMon.species)}은(는) 혼란 상태다. / ${currentMon.species} is confused.`);
    currentMon.volatile.confusionTurns = Math.max(0, currentMon.volatile.confusionTurns - 1);
    if (currentMon.volatile.confusionTurns <= 0) {
      delete currentMon.volatile.confusionTurns;
      addLog(`${displaySpeciesName(currentMon.species)}은(는) 혼란에서 회복했다. / ${currentMon.species} snapped out of confusion.`);
    } else if (Math.random() < (1 / 3)) {
      const selfHit = Math.max(1, Math.floor((currentMon.baseMaxHp || currentMon.maxHp) / 8));
      currentMon.hp = Math.max(0, currentMon.hp - selfHit);
      addLog(`${displaySpeciesName(currentMon.species)}이(가) 혼란으로 자신을 공격했다! / ${currentMon.species} hurt itself in its confusion!`);
      if (currentMon.hp <= 0) {
        currentMon.hp = 0;
        currentMon.fainted = true;
        addLog(`${displaySpeciesName(currentMon.species)}은(는) 쓰러졌다. / ${currentMon.species} fainted.`, 'win');
      }
      return;
    }
  }

  let moveChoice = choice;
  let resolvedBaseMove = baseMove;
  const forcedMove = getForcedMoveChoice(currentMon);
  if (forcedMove && choice.moveIndex !== forcedMove.moveIndex) {
    moveChoice = {...choice, move: forcedMove.moveName, moveIndex: forcedMove.moveIndex, target: choice.target};
    resolvedBaseMove = await getMoveData(forcedMove.moveName).catch(() => STRUGGLE_MOVE);
    const forcedLabel = forcedMove.source === 'encore' ? '앵콜 / Encore' : (forcedMove.source === 'choice' ? '구애 잠금 / Choice lock' : '소란 / Uproar');
    addLog(`${displaySpeciesName(currentMon.species)}은(는) ${forcedLabel} 때문에 ${displayMoveName(forcedMove.moveName)}밖에 쓸 수 없다. / ${currentMon.species} is forced to use ${forcedMove.moveName}.`);
  }
  const moveSlot = getBattleMoveSlot(currentMon, moveChoice);
  if (moveChoice.moveIndex === -1) {
    moveChoice = {...choice, tera:false, mega:false, z:false, dynamax:false};
    resolvedBaseMove = STRUGGLE_MOVE;
  } else if (!moveSlot || moveSlot.pp <= 0) {
    if (hasUsableMoves(currentMon) && !forcedMove) {
      addLog(`${displaySpeciesName(currentMon.species)}의 선택한 기술 PP가 없다. / ${currentMon.species} has no PP left for that move.`);
      return;
    }
    moveChoice = {...choice, move: STRUGGLE_MOVE.name, moveIndex:-1, tera:false, mega:false, z:false, dynamax:false};
    resolvedBaseMove = STRUGGLE_MOVE;
  }

  const selectedDisabledMove = moveChoice.moveIndex !== -1 && isMoveDisabled(currentMon, moveChoice.moveIndex, resolvedBaseMove?.name || moveChoice.move);
  if (selectedDisabledMove) {
    if (forcedMove) {
      moveChoice = {...moveChoice, move: STRUGGLE_MOVE.name, moveIndex: -1, tera: false, mega: false, z: false, dynamax: false};
      resolvedBaseMove = STRUGGLE_MOVE;
    } else {
      addLog(`${displaySpeciesName(currentMon.species)}의 ${displayMoveName(resolvedBaseMove?.name || moveChoice.move)}는 금지 / Disable 상태라 사용할 수 없다. / ${currentMon.species}'s ${resolvedBaseMove?.name || moveChoice.move} is disabled.`);
      return;
    }
  }
  const tormentedMove = moveChoice.moveIndex !== -1 && isMoveBlockedByTorment(currentMon, moveChoice.moveIndex, resolvedBaseMove?.name || moveChoice.move);
  if (tormentedMove) {
    if (forcedMove) {
      moveChoice = {...moveChoice, move: STRUGGLE_MOVE.name, moveIndex: -1, tera: false, mega: false, z: false, dynamax: false};
      resolvedBaseMove = STRUGGLE_MOVE;
    } else {
      addLog(`${displaySpeciesName(currentMon.species)}은(는) 괴롭힘 / Torment 때문에 같은 기술을 연속으로 사용할 수 없다. / ${currentMon.species} can't use the same move twice due to Torment.`);
      return;
    }
  }
  if (moveChoice.moveIndex !== -1 && isMoveBlockedByHealBlock(currentMon, resolvedBaseMove)) {
    addLog(`${displaySpeciesName(currentMon.species)}은(는) 회복봉인 / Heal Block 때문에 그 기술을 사용할 수 없다. / ${currentMon.species} can't use that move because of Heal Block.`);
    return;
  }

  const moveId = toId(resolvedBaseMove?.baseMoveName || resolvedBaseMove?.name || resolvedBaseMove?.id);
  if (currentMon.volatile?.destinyBond && moveId !== 'destinybond') delete currentMon.volatile.destinyBond;
  if (currentMon.volatile?.grudge && moveId !== 'grudge') delete currentMon.volatile.grudge;
  const isProtectMove = PROTECT_MOVE_IDS.has(moveId);
  currentMon.usedProtectMoveThisTurn = isProtectMove;
  if (!isProtectMove) currentMon.protectCounter = 0;

  if (moveChoice.mega && !currentMon.megaUsed && !side.megaUsed) {
    const megaCandidate = getMegaCandidateForMon(currentMon);
    if (megaCandidate) {
      const megaData = await getSpeciesData(megaCandidate.speciesName).catch(() => null);
      if (megaData) {
        const beforeName = currentMon.species;
        applyBattleFormChange(currentMon, megaData, megaCandidate.assetId);
        currentMon.megaUsed = true;
        side.megaUsed = true;
        addLog(`${displaySpeciesName(beforeName)}이(가) 메가진화했다! / ${beforeName} Mega Evolved into ${megaData.name}!`, 'accent');
      }
    }
  }
  if (moveChoice.tera && !currentMon.teraUsed && !side.teraUsed) {
    currentMon.types = [currentMon.teraType];
    currentMon.terastallized = true;
    currentMon.teraUsed = true;
    side.teraUsed = true;
    addLog(`${displaySpeciesName(currentMon.species)}이(가) ${displayType(currentMon.teraType)} 테라스탈했다! / ${currentMon.species} Terastallized into ${titleCase(currentMon.teraType)}-type!`, 'accent');
  }
  if (moveChoice.dynamax && canDynamax(currentMon, side)) {
    applyDynamax(currentMon);
    side.dynamaxUsed = true;
    addLog(`${displaySpeciesName(currentMon.species)}이(가) ${currentMon.gigantamaxed ? '거다이맥스 / Gigantamax' : '다이맥스 / Dynamax'}했다! / ${currentMon.species} ${currentMon.gigantamaxed ? 'Gigantamaxed' : 'Dynamaxed'}!`, 'accent');
  }

  const move = await buildResolvedMove(currentMon, side, moveChoice, resolvedBaseMove);
  if (currentMon.volatile?.tauntTurns > 0 && move.category === 'status') {
    addLog(`${displaySpeciesName(currentMon.species)}은(는) 도발 / Taunt 때문에 변화기를 사용할 수 없다. / ${currentMon.species} can't use status moves due to Taunt.`);
    return;
  }
  if (getHeldItemId(currentMon) === 'assaultvest' && move.category === 'status') {
    addLog(`${displaySpeciesName(currentMon.species)}은(는) 돌격조끼 / Assault Vest 때문에 변화기를 사용할 수 없다. / ${currentMon.species} can't use status moves while holding Assault Vest.`);
    return;
  }
  if (moveId === 'spitup') {
    const stockpileLayers = currentMon.volatile?.stockpileLayers || 0;
    if (!stockpileLayers) {
      addLog('토해내기 / Spit Up가 실패했다. / Spit Up failed.');
      return;
    }
    move.power = 100 * stockpileLayers;
    clearStockpile(currentMon);
  }
  if (move.useZ) side.zUsed = true;
  if (moveChoice.moveIndex !== -1) consumeMovePp(currentMon, moveChoice);
  let targets = resolveTargets(player, currentIndex, moveChoice, move);
  if (!targets.length) {
    recordLastMoveUsed(currentMon, move);
    addLog(`${displaySpeciesName(currentMon.species)}의 ${displayMoveName(move.name)}! 그러나 맞힐 대상이 없었다. / ${currentMon.species} used ${move.name}, but there was no valid target.`);
    return;
  }

  addLog(`${displaySpeciesName(currentMon.species)}의 ${displayMoveName(move.name)}! / ${currentMon.species} used ${move.name}.`, 'accent');
  if (moveId === 'suckerpunch') {
    const target = targets.find(candidate => candidate && !candidate.fainted);
    const willAttack = target ? await isTargetAboutToUseDamagingMove(target) : false;
    if (!willAttack) {
      recordLastMoveUsed(currentMon, move);
      addLog(`기습 / Sucker Punch가 실패했다. / Sucker Punch failed.`);
      return;
    }
  }
  if (!move.useZ && !move.useMax && CHOICE_ITEM_IDS.has(getHeldItemId(currentMon)) && moveChoice.moveIndex >= 0) {
    currentMon.choiceLockMove = resolvedBaseMove.name;
    currentMon.choiceLockMoveIndex = moveChoice.moveIndex;
    currentMon.choiceLockSource = getHeldItemId(currentMon);
  }
  if (isProtectMove) {
    const successRate = currentMon.protectCounter > 0 ? (1 / (3 ** currentMon.protectCounter)) : 1;
    currentMon.protectCounter += 1;
    if (Math.random() < successRate) {
      currentMon.protect = true;
      addLog(`${displaySpeciesName(currentMon.species)}은(는) 이번 턴 보호 상태다. / ${currentMon.species} is protected this turn.`);
      if (move.useZ && move.category === 'status') applyZStatusBonus(currentMon, move);
    } else {
      addLog(`${displaySpeciesName(currentMon.species)}의 보호 기술이 실패했다. / ${currentMon.species}'s protection move failed.`);
    }
    recordLastMoveUsed(currentMon, move);
    return;
  }

  const protectedTargets = [];
  const validTargets = [];
  for (const target of targets) {
    if (!target || target.fainted) continue;
    if (player !== target.player && move.flags?.protect && target.protect) {
      if (move.breaksProtect) {
        target.protect = false;
        addLog(`${displaySpeciesName(target.species)}의 보호가 뚫렸다! / ${target.species}'s protection was broken!`, 'accent');
      } else {
        protectedTargets.push(target);
        continue;
      }
    }
    if (player !== target.player && state.battle?.terrain === 'psychicterrain' && move.priority > 0 && isGrounded(target)) {
      addLog(`${terrainDisplayLabel('psychicterrain')} 때문에 우선도 기술이 막혔다. / Psychic Terrain blocked the priority move.`);
      continue;
    }
    validTargets.push(target);
  }
  for (const target of protectedTargets) {
    addLog(`${displaySpeciesName(target.species)}은(는) 자신을 보호했다. / ${target.species} protected itself.`);
  }
  targets = validTargets;
  if (!targets.length && move.target !== 'opponent-side' && move.target !== 'self-side' && move.target !== 'ally-side') {
    recordLastMoveUsed(currentMon, move);
    return;
  }

  if (move.category === 'status') {
    applyStatusMove(currentMon, targets, move);
    if (move.useZ) applyZStatusBonus(currentMon, move);
    afterMoveResolution(currentMon, targets, move, 0);
    return;
  }

  const aliveTargets = [];
  let totalDamageDealt = 0;
  let anyHitConnected = false;
  let crashEligibleFailure = false;
  for (const target of targets) {
    if (!target || target.fainted) continue;
    if (handleTagBasedMoveImmunity(currentMon, target, move)) {
      crashEligibleFailure = crashEligibleFailure || move.hasCrashDamage;
      continue;
    }
    const singleAccuracyCheck = shouldUseSingleAccuracyCheck(currentMon, move);
    const baseAccuracy = move.accuracy || 100;
    if (!move.bypassAccuracy && singleAccuracyCheck && Math.random() * 100 >= baseAccuracy) {
      addLog(`${displaySpeciesName(currentMon.species)}의 ${displayMoveName(move.name)}는 ${displaySpeciesName(target.species)}에게 빗나갔다. / ${currentMon.species}'s ${move.name} missed ${target.species}.`);
      crashEligibleFailure = crashEligibleFailure || move.hasCrashDamage;
      continue;
    }
    const hits = rollHitCount(currentMon, move);
    let totalDamage = 0;
    let lastDamageInfo = null;
    for (let hit = 0; hit < hits; hit += 1) {
      if (target.hp <= 0) break;
      const hitMove = getPerHitMoveVariant(move, hit + 1);
      if (!move.bypassAccuracy && !singleAccuracyCheck) {
        const hitAccuracy = hitMove.accuracy || 100;
        if (Math.random() * 100 >= hitAccuracy) {
          if (hit === 0) {
            addLog(`${displaySpeciesName(currentMon.species)}의 ${displayMoveName(move.name)}는 ${displaySpeciesName(target.species)}에게 빗나갔다. / ${currentMon.species}'s ${move.name} missed ${target.species}.`);
            crashEligibleFailure = crashEligibleFailure || move.hasCrashDamage;
          }
          break;
        }
      }
      const damageInfo = computeDamage(currentMon, target, hitMove, targets.length > 1);
      let damage = damageInfo.damage;
      if (getAbilityId(target) === 'multiscale' && target.hp === target.maxHp) damage = Math.floor(damage * 0.5);
      if (getAbilityId(target) === 'flashfire' && getBattleMoveType(currentMon, hitMove) === 'fire') {
        addLog(`${displaySpeciesName(target.species)}의 타오르는불꽃 / Flash Fire가 공격을 흡수했다. / ${target.species}'s Flash Fire absorbed the attack.`);
        target.volatile.flashFire = true;
        damage = 0;
        if (hit === 0) crashEligibleFailure = crashEligibleFailure || move.hasCrashDamage;
        break;
      }
      if (getAbilityId(target) === 'levitate' && getBattleMoveType(currentMon, hitMove) === 'ground') {
        addLog(`${displaySpeciesName(target.species)}은(는) 부유 / Levitate 덕분에 땅 타입 기술을 피했다. / ${target.species} avoided the Ground-type move thanks to Levitate.`);
        damage = 0;
        if (hit === 0) crashEligibleFailure = crashEligibleFailure || move.hasCrashDamage;
        break;
      }
      if (getHeldItemId(target) === 'airballoon' && !target.volatile?.airBalloonPopped && getBattleMoveType(currentMon, hitMove) === 'ground') {
        addLog(`${displaySpeciesName(target.species)}의 풍선 / Air Balloon 때문에 땅 타입 기술이 통하지 않았다. / ${target.species}'s Air Balloon made it immune to the Ground-type attack.`);
        damage = 0;
        if (hit === 0) crashEligibleFailure = crashEligibleFailure || move.hasCrashDamage;
        break;
      }
      if (getHeldItemId(target) === 'focussash' && target.hp === target.maxHp && damage >= target.hp) {
        damage = target.hp - 1;
        addLog(`${displaySpeciesName(target.species)}은(는) 기합의띠 / Focus Sash로 버텼다! / ${target.species} endured with Focus Sash!`, 'accent');
      }
      if (target.protect && move.partialProtect) damage = Math.max(1, Math.floor(damage * 0.25));
      if (target.volatile?.substituteHp > 0 && !hitMove.flags?.bypasssub) {
        const subDamage = Math.max(0, damage);
        target.volatile.substituteHp = Math.max(0, target.volatile.substituteHp - subDamage);
        totalDamage += subDamage;
        totalDamageDealt += subDamage;
        lastDamageInfo = damageInfo;
        anyHitConnected = anyHitConnected || subDamage > 0;
        addLog(`${displaySpeciesName(target.species)}의 대타출동 / Substitute가 공격을 대신 맞았다. / ${target.species}'s substitute took the hit.`);
        if (target.volatile.substituteHp <= 0) clearSubstitute(target);
        continue;
      }
      target.hp = Math.max(0, target.hp - Math.max(0, damage));
      totalDamage += Math.max(0, damage);
      totalDamageDealt += Math.max(0, damage);
      lastDamageInfo = damageInfo;
      anyHitConnected = anyHitConnected || damage > 0;
      if (damageInfo.crit) addLog('급소에 맞았다! / A critical hit!');
      if (move.drain && damage > 0) {
        if (currentMon.volatile?.healBlockTurns > 0) {
          addLog(`${displaySpeciesName(currentMon.species)}은(는) 회복봉인 / Heal Block 때문에 HP를 회복할 수 없었다. / ${currentMon.species} could not heal because of Heal Block.`);
        } else {
          const heal = Math.max(1, Math.floor(damage * (move.drain / 100)));
          currentMon.hp = Math.min(currentMon.maxHp, currentMon.hp + heal);
          addLog(`${displaySpeciesName(currentMon.species)}의 HP가 ${heal} 회복되었다. / ${currentMon.species} restored ${heal} HP.`);
        }
      }
      maybeApplySecondary(currentMon, target, hitMove);
      if (moveId === 'knockoff' && damage > 0) {
        const removedItem = tryRemoveHeldItem(target, currentMon, 'knockoff');
        if (removedItem) addLog(`${displaySpeciesName(target.species)}의 ${displayItemName(removedItem)}이(가) 탁쳐서떨구기 / Knock Off로 떨어졌다. / ${target.species} lost its ${removedItem} to Knock Off.`);
      }
      if (!target.volatile?.airBalloonPopped && getHeldItemId(target) === 'airballoon' && damage > 0) {
        target.volatile.airBalloonPopped = true;
        addLog(`${displaySpeciesName(target.species)}의 풍선 / Air Balloon이 터졌다! / ${target.species}'s Air Balloon popped!`);
      }
      if (target.hp <= 0) {
        target.fainted = true;
        target.hp = 0;
        addLog(`${displaySpeciesName(target.species)}은(는) 쓰러졌다. / ${target.species} fainted.`, 'win');
        if (target.volatile?.grudge && moveChoice.moveIndex >= 0) {
          const attackerSlot = currentMon.moveSlots?.[moveChoice.moveIndex];
          if (attackerSlot) {
            attackerSlot.pp = 0;
            addLog(`${displaySpeciesName(target.species)}의 원한 / Grudge 때문에 ${displayMoveName(attackerSlot.name)}의 PP가 0이 되었다. / ${attackerSlot.name} lost all its PP due to Grudge.`);
          }
          delete target.volatile.grudge;
        }
        if (target.volatile?.destinyBond && currentMon.hp > 0) {
          currentMon.hp = 0;
          currentMon.fainted = true;
          addLog(`${displaySpeciesName(target.species)}의 길동무 / Destiny Bond로 ${displaySpeciesName(currentMon.species)}도 함께 쓰러졌다. / ${currentMon.species} took its foe down with Destiny Bond!`, 'win');
          delete target.volatile.destinyBond;
        }
        break;
      }
    }
    if (totalDamage > 0) {
      addLog(`${displaySpeciesName(target.species)}의 HP가 ${totalDamage}만큼 줄었다${lastDamageInfo?.effectivenessText ? ` (${lastDamageInfo.effectivenessText})` : ''}. / ${target.species} lost ${totalDamage} HP${lastDamageInfo?.effectivenessText ? ` (${lastDamageInfo.effectivenessText})` : ''}.`);
      aliveTargets.push(target);
    }
    if (getHeldItemId(currentMon) === 'lifeorb' && totalDamage > 0) {
      const recoil = Math.max(1, Math.floor(currentMon.baseMaxHp / 10));
      currentMon.hp = Math.max(0, currentMon.hp - recoil);
      addLog(`${displaySpeciesName(currentMon.species)}은(는) 생명의구슬 / Life Orb 반동으로 데미지를 입었다. / ${currentMon.species} was hurt by Life Orb.`);
    }
    if (getHeldItemId(target) === 'rockyhelmet' && totalDamage > 0 && move.category === 'physical' && causesContactEffects(currentMon, move)) {
      const recoil = Math.max(1, Math.floor(currentMon.baseMaxHp / 6));
      currentMon.hp = Math.max(0, currentMon.hp - recoil);
      addLog(`${displaySpeciesName(currentMon.species)}은(는) 울퉁불퉁멧 / Rocky Helmet 때문에 데미지를 입었다. / ${currentMon.species} was hurt by Rocky Helmet.`);
    }
  }
  if (move.hasCrashDamage && crashEligibleFailure && !anyHitConnected && targets.length) {
    applyCrashDamage(currentMon, move);
  }
  if (move.useMax) applyMaxMoveBonus(currentMon, aliveTargets, move);
  afterMoveResolution(currentMon, aliveTargets, move, totalDamageDealt);
  if (currentMon.hp <= 0) {
    currentMon.hp = 0;
    currentMon.fainted = true;
    addLog(`${displaySpeciesName(currentMon.species)}은(는) 쓰러졌다. / ${currentMon.species} fainted.`, 'win');
  }
}
function canMove(mon) {
  if (!mon || mon.fainted) return {ok:false, reason:'기절 상태입니다. / Fainted.'};
  if (mon.volatile?.mustRecharge) {
    delete mon.volatile.mustRecharge;
    return {ok:false, reason:`${displaySpeciesName(mon.species)}은(는) 재충전이 필요하다. / ${mon.species} must recharge.`};
  }
  if (mon.volatile?.flinch) {
    delete mon.volatile.flinch;
    return {ok:false, reason:`${displaySpeciesName(mon.species)}은(는) 풀죽어서 움직일 수 없다. / ${mon.species} flinched and couldn't move.`};
  }
  if (mon.status === 'slp') {
    if (uproarPreventsSleep(mon)) {
      mon.status = '';
      mon.sleepTurns = 0;
      return {ok:true, wake:true};
    }
    mon.sleepTurns = Math.max(0, (mon.sleepTurns || 1) - 1);
    if (mon.sleepTurns > 0) return {ok:false, reason:`${displaySpeciesName(mon.species)}은(는) 잠들어 있다. / ${mon.species} is asleep.`};
    mon.status = '';
    return {ok:true, wake:true};
  }
  if (mon.status === 'frz' && Math.random() < 0.8) return {ok:false, reason:`${displaySpeciesName(mon.species)}은(는) 얼어붙어 움직일 수 없다. / ${mon.species} is frozen solid.`};
  if (mon.status === 'par' && Math.random() < 0.25) return {ok:false, reason:`${displaySpeciesName(mon.species)}은(는) 몸이 저려 움직일 수 없다. / ${mon.species} is fully paralyzed.`};
  return {ok:true};
}
function resolveTargets(player, activeIndex, choice, move) {
  const battle = state.battle;
  if (move.target === 'self') return [battle.players[player].team[activeIndex]];
  if (move.target === 'ally-side' || move.target === 'self-side') return battle.players[player].active.map(idx => battle.players[player].team[idx]).filter(mon => mon && !mon.fainted);
  if (move.target === 'opponent-side') return battle.players[1-player].active.map(idx => battle.players[1-player].team[idx]).filter(mon => mon && !mon.fainted);
  if (move.target === 'all-opponents') return battle.players[1-player].active.map(idx => battle.players[1-player].team[idx]).filter(mon => mon && !mon.fainted);
  if (move.target === 'all-other-pokemon') return [...battle.players[player].active, ...battle.players[1-player].active].map((idx, i) => i < battle.players[player].active.length ? battle.players[player].team[idx] : battle.players[1-player].team[idx]).filter(mon => mon && !mon.fainted && mon.id !== battle.players[player].team[activeIndex].id);
  if (move.target === 'ally' || move.target === 'ally-or-self') {
    if (choice.target) return [battle.players[choice.target.player].team[choice.target.slot]].filter(Boolean);
    const fallback = targetOptionsFor(player, activeIndex, move)[0];
    return fallback ? [battle.players[fallback.player].team[fallback.slot]] : [battle.players[player].team[activeIndex]];
  }
  if (choice.target) return [battle.players[choice.target.player].team[choice.target.slot]].filter(Boolean);
  return [battle.players[1-player].team[battle.players[1-player].active[0]]].filter(Boolean);
}
function applyStatusMove(user, targets, move) {
  const moveId = toId(move?.baseMoveName || move?.name || move?.id);
  const userSide = getSideForMon(user);
  if (applySideConditionMove(user.player, move)) return;
  if (move.weather) {
    const weatherMap = {raindance: 'rain', sunnyday: 'sun', sandstorm: 'sand', snowscape: 'snow'};
    setBattleWeather(weatherMap[moveId] || move.weather, user);
    return;
  }
  if (move.terrain) {
    const terrainMap = {electricterrain: 'electricterrain', grassyterrain: 'grassyterrain', mistyterrain: 'mistyterrain', psychicterrain: 'psychicterrain'};
    setBattleTerrain(terrainMap[moveId] || move.terrain, user);
    return;
  }
  if (moveId === 'trickroom') {
    if (state.battle.trickRoomTurns > 0) {
      state.battle.trickRoomTurns = 0;
      addLog('트릭룸 / Trick Room이 해제되었다. / Trick Room was removed.', 'accent');
    } else {
      state.battle.trickRoomTurns = 5;
      addLog('트릭룸 / Trick Room이 펼쳐졌다. / Trick Room twisted the dimensions!', 'accent');
    }
    return;
  }
  if (moveId === 'tailwind' && userSide?.sideConditions) {
    userSide.sideConditions.tailwindTurns = 4;
    addLog(`${state.battle.players[user.player].name} 측에 순풍 / Tailwind가 불기 시작했다. / Tailwind blew from ${state.battle.players[user.player].name}'s side.`, 'accent');
    getActiveMonsForSide(userSide).forEach(mon => {
      if (getAbilityId(mon) === 'windrider') {
        mon.boosts.atk = clamp((mon.boosts.atk || 0) + 1, -6, 6);
        addLog(`${displaySpeciesName(mon.species)}의 풍승 / Wind Rider로 공격이 올랐다! / ${mon.species}'s Wind Rider boosted its Attack!`, 'accent');
      }
    });
    return;
  }
  if (moveId === 'reflect' && userSide?.sideConditions) {
    userSide.sideConditions.reflectTurns = getHeldItemId(user) === 'lightclay' ? 8 : 5;
    addLog(`${state.battle.players[user.player].name} 측에 리플렉터 / Reflect가 전개되었다. / Reflect protected ${state.battle.players[user.player].name}'s side.`, 'accent');
    return;
  }
  if (moveId === 'lightscreen' && userSide?.sideConditions) {
    userSide.sideConditions.lightScreenTurns = getHeldItemId(user) === 'lightclay' ? 8 : 5;
    addLog(`${state.battle.players[user.player].name} 측에 빛의장막 / Light Screen이 전개되었다. / Light Screen protected ${state.battle.players[user.player].name}'s side.`, 'accent');
    return;
  }
  if (moveId === 'auroraveil' && userSide?.sideConditions) {
    if (state.battle.weather !== 'snow') {
      addLog('오로라베일 / Aurora Veil은 눈 상태에서만 사용할 수 있다. / Aurora Veil only works during snow.');
      return;
    }
    userSide.sideConditions.auroraVeilTurns = getHeldItemId(user) === 'lightclay' ? 8 : 5;
    addLog(`${state.battle.players[user.player].name} 측에 오로라베일 / Aurora Veil이 전개되었다. / Aurora Veil protected ${state.battle.players[user.player].name}'s side.`, 'accent');
    return;
  }
  if (moveId === 'substitute') {
    const cost = Math.floor((user.baseMaxHp || user.maxHp) / 4);
    if (cost <= 0 || user.hp <= cost) {
      addLog(`${displaySpeciesName(user.species)}은(는) 대타출동 / Substitute를 만들 HP가 부족하다. / ${user.species} does not have enough HP for Substitute.`);
      return;
    }
    if (user.volatile?.substituteHp > 0) {
      addLog(`${displaySpeciesName(user.species)}은(는) 이미 대타출동 / Substitute를 세워 두었다. / ${user.species} already has a substitute.`);
      return;
    }
    user.hp = Math.max(1, user.hp - cost);
    user.volatile.substituteHp = cost;
    addLog(`${displaySpeciesName(user.species)}이(가) 대타출동 / Substitute를 만들었다. / ${user.species} put up a substitute!`, 'accent');
    return;
  }
  if (moveId === 'taunt') {
    const target = targets.find(Boolean);
    if (!target || target.fainted) return;
    if (handleTagBasedMoveImmunity(user, target, move)) return;
    if (target.volatile?.substituteHp > 0 && !move.flags?.bypasssub) {
      addLog(`${displaySpeciesName(target.species)}의 대타출동 / Substitute가 도발을 막았다. / ${target.species}'s substitute blocked Taunt.`);
      return;
    }
    target.volatile.tauntTurns = 3;
    addLog(`${displaySpeciesName(target.species)}은(는) 도발 / Taunt 상태가 되었다. / ${target.species} fell for the taunt!`, 'accent');
    return;
  }
  if (moveId === 'encore') {
    const target = targets.find(Boolean);
    if (target && handleTagBasedMoveImmunity(user, target, move)) return;
    const lastMove = target?.lastMoveUsed;
    if (target?.volatile?.substituteHp > 0 && !move.flags?.bypasssub) {
      addLog(`${displaySpeciesName(target.species)}의 대타출동 / Substitute가 앵콜을 막았다. / ${target.species}'s substitute blocked Encore.`);
      return;
    }
    if (!target || !lastMove) {
      addLog('앵콜 / Encore가 실패했다. / Encore failed.');
      return;
    }
    const moveIndex = target.moveSlots?.findIndex(slot => slot && toId(slot.name) === toId(lastMove)) ?? -1;
    const slot = moveIndex >= 0 ? target.moveSlots[moveIndex] : null;
    if (!slot || slot.pp <= 0) {
      addLog('앵콜 / Encore가 실패했다. / Encore failed.');
      return;
    }
    target.volatile.encore = {moveName: slot.name, moveIndex, turns: 3};
    addLog(`${displaySpeciesName(target.species)}은(는) 앵콜 / Encore로 ${displayMoveName(slot.name)}에 묶였다. / ${target.species} received an encore!`, 'accent');
    return;
  }
  if (moveId === 'disable') {
    const target = targets.find(Boolean);
    if (target && handleTagBasedMoveImmunity(user, target, move)) return;
    const lastMoveMeta = target?.lastMoveMeta;
    const lastMove = target?.lastMoveUsed;
    if (!target || !lastMove || !lastMoveMeta || lastMoveMeta.usedZ || lastMoveMeta.usedMax || lastMoveMeta.moveId === 'struggle') {
      addLog('금지 / Disable가 실패했다. / Disable failed.');
      return;
    }
    const moveIndex = target.moveSlots?.findIndex(slot => slot && toId(slot.name) === toId(lastMove)) ?? -1;
    const slot = moveIndex >= 0 ? target.moveSlots[moveIndex] : null;
    if (!slot || slot.pp <= 0) {
      addLog('금지 / Disable가 실패했다. / Disable failed.');
      return;
    }
    const pendingChoice = getPendingChoiceForMon(target);
    const duration = pendingChoice?.kind === 'move' && !target.volatile?.actedThisTurn ? 4 : 5;
    target.volatile.disable = {moveName: slot.name, moveIndex, turns: duration};
    addLog(`${displaySpeciesName(target.species)}의 ${displayMoveName(slot.name)}가 금지 / Disable 상태가 되었다. / ${target.species}'s ${slot.name} was disabled.`, 'accent');
    return;
  }
  if (moveId === 'trick' || moveId === 'switcheroo') {
    const target = targets.find(Boolean);
    if (target && handleTagBasedMoveImmunity(user, target, move)) return;
    if (!target || target.fainted) {
      addLog(`${displayMoveName(move.name)}가 실패했다. / ${move.name} failed.`);
      return;
    }
    if (target.volatile?.substituteHp > 0 && !move.flags?.bypasssub) {
      addLog(`${displaySpeciesName(target.species)}의 대타출동 / Substitute가 ${displayMoveName(move.name)}를 막았다. / ${target.species}'s substitute blocked ${move.name}.`);
      return;
    }
    const userItem = user.item || '';
    const targetItem = target.item || '';
    if (!userItem && !targetItem) {
      addLog(`${displayMoveName(move.name)}가 실패했다. / ${move.name} failed.`);
      return;
    }
    if ((targetItem && !canRemoveHeldItem(target, user)) || (userItem && !canRemoveHeldItem(user, target))) {
      if (targetItem && slugify(target.ability) === 'stickyhold') {
        addLog(`${displaySpeciesName(target.species)}의 점착 / Sticky Hold 때문에 도구를 바꿀 수 없었다. / ${target.species}'s Sticky Hold prevented the item swap.`);
      } else {
        addLog(`${displayMoveName(move.name)}가 실패했다. / ${move.name} failed.`);
      }
      return;
    }
    clearChoiceLock(user);
    clearChoiceLock(target);
    trySetHeldItem(user, targetItem);
    trySetHeldItem(target, userItem);
    addLog(`${displaySpeciesName(user.species)}와(과) ${displaySpeciesName(target.species)}의 도구가 뒤바뀌었다. / ${user.species} and ${target.species} switched items.`, 'accent');
    return;
  }
  if (moveId === 'perishsong') {
    const applied = targets.filter(target => applyPerishSongToTarget(target)).length;
    if (!applied) addLog('멸망의노래 / Perish Song가 실패했다. / Perish Song failed.');
    return;
  }
  if (moveId === 'magnetrise') {
    if (user.volatile?.magnetRiseTurns > 0) {
      addLog('전자부유 / Magnet Rise가 실패했다. / Magnet Rise failed.');
      return;
    }
    user.volatile.magnetRiseTurns = 5;
    addLog(`${displaySpeciesName(user.species)}이(가) 전자부유 / Magnet Rise로 공중에 떴다. / ${user.species} levitated with Magnet Rise.`, 'accent');
    return;
  }
  if (moveId === 'aquaring') {
    if (user.volatile?.aquaRing) {
      addLog('아쿠아링 / Aqua Ring이 실패했다. / Aqua Ring failed.');
      return;
    }
    user.volatile.aquaRing = true;
    addLog(`${displaySpeciesName(user.species)} 주변에 아쿠아링 / Aqua Ring이 생겼다. / ${user.species} surrounded itself with a veil of water.`, 'accent');
    return;
  }
  if (moveId === 'ingrain') {
    if (user.volatile?.ingrain) {
      addLog('뿌리박기 / Ingrain이 실패했다. / Ingrain failed.');
      return;
    }
    user.volatile.ingrain = true;
    addLog(`${displaySpeciesName(user.species)}이(가) 뿌리를 내렸다. / ${user.species} planted its roots.`, 'accent');
    return;
  }
  if (moveId === 'stockpile') {
    const layers = user.volatile?.stockpileLayers || 0;
    if (layers >= 3) {
      addLog('비축하기 / Stockpile이 실패했다. / Stockpile failed.');
      return;
    }
    user.volatile.stockpileLayers = layers + 1;
    user.boosts.def = clamp((user.boosts.def || 0) + 1, -6, 6);
    user.boosts.spd = clamp((user.boosts.spd || 0) + 1, -6, 6);
    addLog(`${displaySpeciesName(user.species)}이(가) 비축하기 / Stockpile을 ${user.volatile.stockpileLayers}회 쌓았다. / ${user.species} stockpiled ${user.volatile.stockpileLayers}.`, 'accent');
    return;
  }
  if (moveId === 'swallow') {
    const layers = user.volatile?.stockpileLayers || 0;
    if (!layers) {
      addLog('꿀꺽 / Swallow가 실패했다. / Swallow failed.');
      return;
    }
    if (user.volatile?.healBlockTurns > 0) {
      addLog(`${displaySpeciesName(user.species)}은(는) 회복봉인 / Heal Block 때문에 HP를 회복할 수 없다. / ${user.species} cannot restore HP because of Heal Block.`);
      return;
    }
    const ratio = layers === 1 ? 0.25 : (layers === 2 ? 0.5 : 1);
    const heal = Math.max(1, Math.floor((user.baseMaxHp || user.maxHp) * ratio));
    user.hp = Math.min(user.maxHp, user.hp + heal);
    clearStockpile(user);
    addLog(`${displaySpeciesName(user.species)}이(가) 꿀꺽 / Swallow로 HP를 회복했다. / ${user.species} restored HP with Swallow.`);
    return;
  }
  if (moveId === 'spitup') {
    const target = targets.find(Boolean);
    const layers = user.volatile?.stockpileLayers || 0;
    if (!target || !layers) {
      addLog('토해내기 / Spit Up가 실패했다. / Spit Up failed.');
      return;
    }
    move.power = 100 * layers;
    clearStockpile(user);
  }
  if (['yawn','leechseed','torment','healblock','embargo','nightmare'].includes(moveId) || move.volatileStatus === 'confusion') {
    const applied = applyVolatileStatusMove(user, targets.find(Boolean), move);
    if (!applied) addLog(`${displayMoveName(move.name)}가 실패했다. / ${move.name} failed.`);
    return;
  }
  if (moveId === 'defog') {
    handleSuccessfulHitUtilities(user, targets, move);
    return;
  }
  if (move.forceSwitch && targets.length && state.mode === 'singles') {
    handleSuccessfulHitUtilities(user, targets, move);
    return;
  }
  if (move.healing) {
    if (user.volatile?.healBlockTurns > 0) {
      addLog(`${displaySpeciesName(user.species)}은(는) 회복봉인 / Heal Block 때문에 HP를 회복할 수 없다. / ${user.species} cannot restore HP because of Heal Block.`);
      return;
    }
    const healBase = user.baseMaxHp || user.maxHp;
    const heal = Math.max(1, Math.floor(healBase * (move.healing / 100)));
    user.hp = Math.min(user.maxHp, user.hp + heal);
    addLog(`${displaySpeciesName(user.species)}의 HP가 ${heal} 회복되었다. / ${user.species} restored ${heal} HP.`);
  }
  if (move.statChanges.length) {
    const applyToSelf = ['self','self-side'].includes(move.target) || (move.metaCategory === 'net-good-stats' && move.target !== 'single-opponent');
    const recipients = applyToSelf ? [user] : targets.filter(target => {
      if (target.volatile?.substituteHp > 0 && target.id !== user.id && !move.flags?.bypasssub) {
        addLog(`${displaySpeciesName(target.species)}의 대타출동 / Substitute가 변화를 막았다. / ${target.species}'s substitute blocked the status move.`);
        return false;
      }
      return true;
    });
    recipients.forEach(target => {
      move.statChanges.forEach(change => {
        const statMap = {attack:'atk', defense:'def', 'special-attack':'spa', 'special-defense':'spd', speed:'spe'};
        const stat = statMap[change.stat] || statMap[slugify(change.stat)] || change.stat;
        if (!target.boosts[stat] && target.boosts[stat] !== 0) return;
        target.boosts[stat] = clamp((target.boosts[stat] || 0) + change.change, -6, 6);
      });
      addLog(`${displaySpeciesName(target.species)}의 능력치가 변했다. / ${target.species}'s stats changed.`);
    });
  }
  if (move.ailment && move.ailment !== 'none') {
    targets.forEach(target => {
      if (target.volatile?.substituteHp > 0 && target.id !== user.id && !move.flags?.bypasssub) {
        addLog(`${displaySpeciesName(target.species)}의 대타출동 / Substitute가 상태이상을 막았다. / ${target.species}'s substitute blocked the status condition.`);
        return;
      }
      applyAilment(target, move.ailment, 100);
    });
  }
}
function maybeApplySecondary(user, target, move) {
  if (target?.volatile?.substituteHp > 0 && !move.flags?.bypasssub) return;
  if (targetHasAdditionalEffectProtection(target)) return;
  if (move.ailment && move.ailment !== 'none' && move.ailmentChance > 0) applyAilment(target, move.ailment, move.ailmentChance);
  if (move.flinchChance > 0 && !target?.volatile?.actedThisTurn && Math.random() * 100 < move.flinchChance) {
    target.volatile = target.volatile || {};
    target.volatile.flinch = true;
    addLog(`${displaySpeciesName(target.species)}은(는) 풀죽었다! / ${target.species} flinched!`);
  }
  if (move.secondaryVolatileStatus === 'confusion' && Math.random() * 100 < (move.effectChance || 100)) {
    tryApplyConfusion(target);
  }
  if (move.statChanges.length && move.statChance > 0 && Math.random() * 100 < move.statChance) {
    move.statChanges.forEach(change => {
      const statMap = {attack:'atk', defense:'def', 'special-attack':'spa', 'special-defense':'spd', speed:'spe'};
      const stat = statMap[change.stat] || change.stat;
      target.boosts[stat] = clamp((target.boosts[stat] || 0) + change.change, -6, 6);
    });
    addLog(`${displaySpeciesName(target.species)}의 능력치가 추가 효과로 변했다. / ${target.species}'s stats changed from the secondary effect.`);
  }
}
function applyAilment(target, ailment, chance) {
  if (target.fainted || target.status) return;
  if (Math.random() * 100 >= chance) return;
  const map = {burn:'brn', paralysis:'par', poison:'psn', sleep:'slp', freeze:'frz', 'bad-poison':'tox'};
  const status = map[ailment] || '';
  if (!status) return;
  if (status === 'slp' && uproarPreventsSleep(target)) {
    addLog('소란 / Uproar 때문에 잠들지 않았다. / The uproar kept it awake.');
    return;
  }
  if (state.battle?.terrain === 'electricterrain' && status === 'slp' && isGrounded(target)) {
    addLog(`${terrainDisplayLabel('electricterrain')} 때문에 잠들지 않았다. / Electric Terrain prevented sleep.`);
    return;
  }
  if (state.battle?.terrain === 'mistyterrain' && isGrounded(target)) {
    addLog(`${terrainDisplayLabel('mistyterrain')} 때문에 상태이상이 막혔다. / Misty Terrain prevented the status condition.`);
    return;
  }
  if (status === 'par' && target.types.includes('electric')) return;
  if ((status === 'psn' || status === 'tox') && (target.types.includes('poison') || target.types.includes('steel'))) return;
  if (status === 'brn' && target.types.includes('fire')) return;
  if (status === 'frz' && target.types.includes('ice')) return;
  target.status = status;
  if (status === 'slp') target.sleepTurns = 2 + Math.floor(Math.random() * 2);
  if (status === 'tox') target.toxicCounter = 1;
  addLog(`${displaySpeciesName(target.species)}은(는) ${displayStatus(status)} 상태가 되었다. / ${target.species} is now ${statusNames[status].toLowerCase()}.`);
}
function computeDamage(attacker, defender, move, spread = false) {
  const category = getBattleMoveCategory(attacker, move);
  const physical = category === 'physical';
  let atk = getModifiedStat(attacker, physical ? 'atk' : 'spa');
  let def = getModifiedStat(defender, physical ? 'def' : 'spd');
  const moveId = toId(move?.baseMoveName || move?.name || move?.id);
  const moveType = getBattleMoveType(attacker, move);
  let power = move.power || 0;
  const weather = state.battle?.weather || '';
  const terrain = state.battle?.terrain || '';
  if (moveId === 'risingvoltage' && terrain === 'electricterrain' && isGrounded(defender)) power *= 2;
  if (moveId === 'expandingforce' && terrain === 'psychicterrain' && isGrounded(attacker)) power = Math.floor(power * 1.5);
  if ((moveId === 'earthquake' || moveId === 'bulldoze' || moveId === 'magnitude') && terrain === 'grassyterrain' && isGrounded(defender)) power = Math.floor(power * 0.5);
  if (slugify(attacker.ability) === 'technician' && power <= 60 && !move.useZ && !move.useMax) power = Math.floor(power * 1.5);
  if (getAbilityId(attacker) === 'ironfist' && isPunchingMove(move)) power = Math.floor(power * 1.2);
  if (getAbilityId(attacker) === 'strongjaw' && isBitingMove(move)) power = Math.floor(power * 1.5);
  if (getAbilityId(attacker) === 'megalauncher' && isPulseMove(move)) power = Math.floor(power * 1.5);
  if (getAbilityId(attacker) === 'sharpness' && isSlicingMove(move)) power = Math.floor(power * 1.5);
  if (getHeldItemId(attacker) === 'punchingglove' && isPunchingMove(move)) power = Math.floor(power * 1.1);
  if (getHeldItemId(attacker) === 'choiceband' && physical) atk = Math.floor(atk * 1.5);
  if (getHeldItemId(attacker) === 'choicespecs' && !physical) atk = Math.floor(atk * 1.5);
  if (moveId === 'knockoff' && defender?.item && canRemoveHeldItem(defender, attacker)) power = Math.floor(power * 1.5);
  if (getHeldItemId(attacker) === 'muscleband' && physical) power = Math.floor(power * 1.1);
  if (getHeldItemId(attacker) === 'wiseglasses' && !physical) power = Math.floor(power * 1.1);
  const typeBoostItems = {
    mysticwater:'water', charcoal:'fire', miracleseed:'grass', magnet:'electric', blackglasses:'dark', nevermeltice:'ice', softsand:'ground', dragonfang:'dragon', pixieplate:'fairy', poisonbarb:'poison', silverpowder:'bug', spelltag:'ghost', sharpbeak:'flying', twistedspoon:'psychic', hardstone:'rock', silkscarf:'normal', metalcoat:'steel'
  };
  if (typeBoostItems[getHeldItemId(attacker)] === moveType) power = Math.floor(power * 1.2);
  if (weather === 'sun') {
    if (moveType === 'fire') power = Math.floor(power * 1.5);
    if (moveType === 'water') power = Math.floor(power * 0.5);
  }
  if (weather === 'rain') {
    if (moveType === 'water') power = Math.floor(power * 1.5);
    if (moveType === 'fire') power = Math.floor(power * 0.5);
  }
  if (terrain === 'electricterrain' && moveType === 'electric' && isGrounded(attacker)) power = Math.floor(power * 1.3);
  if (terrain === 'grassyterrain' && moveType === 'grass' && isGrounded(attacker)) power = Math.floor(power * 1.3);
  if (terrain === 'psychicterrain' && moveType === 'psychic' && isGrounded(attacker)) power = Math.floor(power * 1.3);
  let damage = Math.floor(Math.floor(Math.floor((2 * attacker.level / 5 + 2) * power * atk / Math.max(1, def)) / 50) + 2);
  const defenderSide = getSideForMon(defender);
  if (physical && defenderSide?.sideConditions?.reflectTurns > 0) damage = Math.floor(damage * 0.5);
  if (!physical && defenderSide?.sideConditions?.lightScreenTurns > 0) damage = Math.floor(damage * 0.5);
  if (defenderSide?.sideConditions?.auroraVeilTurns > 0) damage = Math.floor(damage * 0.5);
  if (physical && attacker.status === 'brn') damage = Math.floor(damage * 0.5);
  const stab = getStabMultiplier(attacker, moveType);
  if (slugify(attacker.ability) === 'flashfire' && attacker.volatile.flashFire && moveType === 'fire') damage = Math.floor(damage * 1.5);
  let effectiveness = typeEffectiveness(moveType, defender);
  if (terrain === 'mistyterrain' && moveType === 'dragon' && isGrounded(defender)) damage = Math.floor(damage * 0.5);
  if (getHeldItemId(attacker) === 'expertbelt' && effectiveness > 1) damage = Math.floor(damage * 1.2);
  const critChance = move.critRate > 0 ? Math.min(50, 12.5 * (move.critRate + 1)) : (getHeldItemId(attacker) === 'scopelens' ? 12.5 : 4.167);
  const crit = Math.random() * 100 < critChance;
  if (crit) damage = Math.floor(damage * 1.5);
  if (spread) damage = Math.floor(damage * 0.75);
  damage = Math.floor(damage * stab * effectiveness * (0.85 + Math.random() * 0.15));
  damage = Math.max(1, damage);
  let effectivenessText = '';
  if (effectiveness === 0) {
    damage = 0;
    effectivenessText = '효과가 없다 / No effect';
  } else if (effectiveness >= 2) effectivenessText = '효과가 굉장했다 / Super effective';
  else if (effectiveness < 1) effectivenessText = '효과가 별로인 듯하다 / Not very effective';
  return {damage, crit, effectivenessText};
}
function fillFaintedActives() {
  const battle = state.battle;
  battle.players.forEach((side, player) => {
    side.active = side.active.map(activeIndex => {
      const mon = side.team[activeIndex];
      if (mon && !mon.fainted) return activeIndex;
      const replacement = switchOptionsFor(player, true)[0];
      if (replacement) {
        addLog(`${side.name} 측은 ${displaySpeciesName(replacement.mon.species)}를 내보냈다. / ${side.name} sends out ${replacement.mon.species}.`, 'accent');
        triggerSwitchInEffects(player, replacement.mon);
        return replacement.index;
      }
      return activeIndex;
    });
  });
}
function endOfTurn() {
  const battle = state.battle;
  battle.players.forEach(side => {
    getActiveMonsForSide(side).forEach(mon => {
      const hpBase = mon.baseMaxHp || mon.maxHp;
      if (!mon.usedProtectMoveThisTurn) mon.protectCounter = 0;
      mon.usedProtectMoveThisTurn = false;
      mon.protect = false;
      const faintIfNeeded = () => {
        if (mon.hp > 0) return false;
        mon.hp = 0;
        mon.fainted = true;
        if (mon.dynamaxed) clearDynamax(mon);
        addLog(`${displaySpeciesName(mon.species)}은(는) 쓰러졌다. / ${mon.species} fainted.`, 'win');
        return true;
      };
      if (mon.volatile?.aquaRing && mon.hp > 0) {
        const heal = Math.max(1, Math.floor(hpBase / 16));
        mon.hp = Math.min(mon.maxHp, mon.hp + heal);
        addLog(`${displaySpeciesName(mon.species)}은(는) 아쿠아링 / Aqua Ring으로 HP를 회복했다. / ${mon.species} restored HP with Aqua Ring.`);
      }
      if (mon.volatile?.ingrain && mon.hp > 0) {
        const heal = Math.max(1, Math.floor(hpBase / 16));
        mon.hp = Math.min(mon.maxHp, mon.hp + heal);
        addLog(`${displaySpeciesName(mon.species)}은(는) 뿌리박기 / Ingrain으로 HP를 회복했다. / ${mon.species} restored HP with Ingrain.`);
      }
      if (mon.volatile?.leechSeeded && mon.hp > 0) {
        const drain = Math.max(1, Math.floor(hpBase / 8));
        mon.hp = Math.max(0, mon.hp - drain);
        addLog(`${displaySpeciesName(mon.species)}은(는) 씨뿌리기 / Leech Seed 때문에 HP를 빼앗겼다. / ${mon.species}'s health was sapped by Leech Seed.`);
        const recipient = getSourceSideActiveRecipient(mon.volatile.leechSeedSourcePlayer);
        if (recipient && !recipient.fainted && recipient.hp > 0) {
          recipient.hp = Math.min(recipient.maxHp, recipient.hp + drain);
          addLog(`${displaySpeciesName(recipient.species)}이(가) 씨뿌리기 / Leech Seed로 HP를 회복했다. / ${recipient.species} absorbed health with Leech Seed.`);
        }
        if (faintIfNeeded()) return;
      }
      if (mon.volatile?.nightmare) {
        if (mon.status === 'slp') {
          const dmg = Math.max(1, Math.floor(hpBase / 4));
          mon.hp = Math.max(0, mon.hp - dmg);
          addLog(`${displaySpeciesName(mon.species)}은(는) 악몽 / Nightmare 때문에 괴로워했다. / ${mon.species} is locked in a nightmare.`);
          if (faintIfNeeded()) return;
        } else {
          delete mon.volatile.nightmare;
        }
      }
      if (battle.weather === 'sand' && !['rock','ground','steel'].some(type => mon.types.includes(type))) {
        const dmg = Math.max(1, Math.floor(hpBase / 16));
        mon.hp = Math.max(0, mon.hp - dmg);
        addLog(`${displaySpeciesName(mon.species)}은(는) 모래바람 / Sandstorm 때문에 데미지를 입었다. / ${mon.species} was buffeted by the sandstorm.`);
        if (faintIfNeeded()) return;
      }
      if (mon.status === 'brn') {
        const dmg = Math.max(1, Math.floor(hpBase / 16));
        mon.hp = Math.max(0, mon.hp - dmg);
        addLog(`${displaySpeciesName(mon.species)}은(는) 화상 데미지를 입었다. / ${mon.species} was hurt by its burn.`);
        if (faintIfNeeded()) return;
      }
      if (mon.status === 'psn') {
        const dmg = Math.max(1, Math.floor(hpBase / 8));
        mon.hp = Math.max(0, mon.hp - dmg);
        addLog(`${displaySpeciesName(mon.species)}은(는) 독 데미지를 입었다. / ${mon.species} was hurt by poison.`);
        if (faintIfNeeded()) return;
      }
      if (mon.status === 'tox') {
        mon.toxicCounter = Math.max(1, mon.toxicCounter || 1);
        const dmg = Math.max(1, Math.floor(hpBase * mon.toxicCounter / 16));
        mon.hp = Math.max(0, mon.hp - dmg);
        addLog(`${displaySpeciesName(mon.species)}은(는) 맹독 데미지를 입었다. / ${mon.species} was hurt by toxic poison.`);
        mon.toxicCounter += 1;
        if (faintIfNeeded()) return;
      }
      if (battle.terrain === 'grassyterrain' && isGrounded(mon) && mon.hp > 0) {
        const heal = Math.max(1, Math.floor(hpBase / 16));
        mon.hp = Math.min(mon.maxHp, mon.hp + heal);
        addLog(`${displaySpeciesName(mon.species)}은(는) 그래스필드 / Grassy Terrain으로 HP를 회복했다. / ${mon.species} was healed by Grassy Terrain.`);
      }
      if (getHeldItemId(mon) === 'leftovers' && !mon.fainted) {
        const heal = Math.max(1, Math.floor(hpBase / 16));
        mon.hp = Math.min(mon.maxHp, mon.hp + heal);
        addLog(`${displaySpeciesName(mon.species)}은(는) 먹다남은음식 / Leftovers로 HP를 조금 회복했다. / ${mon.species} restored a little HP with Leftovers.`);
      }
      if (getHeldItemId(mon) === 'blacksludge') {
        const amount = Math.max(1, Math.floor(hpBase / 16));
        if (mon.types.includes('poison')) {
          mon.hp = Math.min(mon.maxHp, mon.hp + amount);
          addLog(`${displaySpeciesName(mon.species)}은(는) 검은오물 / Black Sludge로 HP를 회복했다. / ${mon.species} restored HP with Black Sludge.`);
        } else {
          mon.hp = Math.max(0, mon.hp - amount);
          addLog(`${displaySpeciesName(mon.species)}은(는) 검은오물 / Black Sludge 때문에 데미지를 입었다. / ${mon.species} was hurt by Black Sludge.`);
          if (faintIfNeeded()) return;
        }
      }
      if (getHeldItemId(mon) === 'sitrusberry' && mon.hp > 0 && mon.hp <= mon.maxHp / 2 && !mon.volatile.usedSitrus) {
        const heal = Math.max(1, Math.floor(hpBase / 4));
        mon.hp = Math.min(mon.maxHp, mon.hp + heal);
        mon.volatile.usedSitrus = true;
        addLog(`${displaySpeciesName(mon.species)}은(는) 오랭열매 / Sitrus Berry로 HP를 회복했다. / ${mon.species} restored HP with Sitrus Berry.`);
      }
      if (mon.dynamaxed) {
        mon.dynamaxTurns = Math.max(0, mon.dynamaxTurns - 1);
        if (mon.dynamaxTurns <= 0) {
          clearDynamax(mon);
          addLog(`${displaySpeciesName(mon.species)}의 다이맥스가 풀렸다. / ${mon.species} returned to normal size.`);
        }
      }
    });
  });
  battle.players.forEach(side => {
    ['reflectTurns','lightScreenTurns','auroraVeilTurns','tailwindTurns'].forEach(key => {
      if (side.sideConditions?.[key] > 0) side.sideConditions[key] = Math.max(0, side.sideConditions[key] - 1);
    });
    getActiveMonsForSide(side).forEach(mon => {
      if (mon.volatile?.tauntTurns > 0) mon.volatile.tauntTurns = Math.max(0, mon.volatile.tauntTurns - 1);
      if (mon.volatile?.tauntTurns === 0) delete mon.volatile.tauntTurns;
      if (mon.volatile?.tormentTurns > 0) mon.volatile.tormentTurns = Math.max(0, mon.volatile.tormentTurns - 1);
      if (mon.volatile?.tormentTurns === 0) delete mon.volatile.tormentTurns;
      if (mon.volatile?.healBlockTurns > 0) mon.volatile.healBlockTurns = Math.max(0, mon.volatile.healBlockTurns - 1);
      if (mon.volatile?.healBlockTurns === 0) delete mon.volatile.healBlockTurns;
      if (mon.volatile?.embargoTurns > 0) mon.volatile.embargoTurns = Math.max(0, mon.volatile.embargoTurns - 1);
      if (mon.volatile?.embargoTurns === 0) delete mon.volatile.embargoTurns;
      if (mon.volatile?.magnetRiseTurns > 0) mon.volatile.magnetRiseTurns = Math.max(0, mon.volatile.magnetRiseTurns - 1);
      if (mon.volatile?.magnetRiseTurns === 0) delete mon.volatile.magnetRiseTurns;
      if (mon.volatile?.yawnTurns > 0) {
        mon.volatile.yawnTurns = Math.max(0, mon.volatile.yawnTurns - 1);
        if (mon.volatile.yawnTurns === 0) {
          delete mon.volatile.yawnTurns;
          if (!mon.status && !uproarPreventsSleep(mon)) applyAilment(mon, 'sleep', 100);
        }
      }
      if (mon.volatile?.encore?.turns > 0) mon.volatile.encore.turns = Math.max(0, mon.volatile.encore.turns - 1);
      if (mon.volatile?.encore?.turns === 0) delete mon.volatile.encore;
      if (mon.volatile?.disable?.turns > 0) mon.volatile.disable.turns = Math.max(0, mon.volatile.disable.turns - 1);
      if (mon.volatile?.disable?.turns === 0) delete mon.volatile.disable;
      if (mon.volatile?.perishSongTurns > 0) {
        mon.volatile.perishSongTurns = Math.max(0, mon.volatile.perishSongTurns - 1);
        if (mon.volatile.perishSongTurns > 0) {
          addLog(`${displaySpeciesName(mon.species)}의 멸망의노래 / Perish Song 카운트가 ${mon.volatile.perishSongTurns - 1}(으)로 줄었다. / ${mon.species}'s perish count fell to ${Math.max(0, mon.volatile.perishSongTurns - 1)}.`);
        } else {
          mon.hp = 0;
          mon.fainted = true;
          addLog(`${displaySpeciesName(mon.species)}은(는) 멸망의노래 / Perish Song 때문에 쓰러졌다. / ${mon.species} perished!`, 'win');
        }
      }
      if (mon.volatile?.uproarTurns > 0) {
        mon.volatile.uproarTurns = Math.max(0, mon.volatile.uproarTurns - 1);
        if (mon.volatile.uproarTurns <= 0) {
          delete mon.volatile.uproarTurns;
          delete mon.volatile.uproarMoveIndex;
          delete mon.volatile.uproarMoveName;
          addLog(`${displaySpeciesName(mon.species)}의 소란 / Uproar가 멈췄다. / ${mon.species} calmed down.`);
        }
      }
      if (mon.volatile?.flinch) delete mon.volatile.flinch;
    });
  });
  if (anyActiveUproar()) {
    battle.players.forEach(side => getActiveMonsForSide(side).forEach(mon => {
      if (mon.status === 'slp' && getAbilityId(mon) !== 'soundproof') {
        mon.status = '';
        mon.sleepTurns = 0;
        addLog(`${displaySpeciesName(mon.species)}은(는) 소란 / Uproar 때문에 잠에서 깼다! / ${mon.species} woke up because of the uproar!`);
      }
    }));
  }
  if (battle.trickRoomTurns > 0) {
    battle.trickRoomTurns = Math.max(0, battle.trickRoomTurns - 1);
    if (battle.trickRoomTurns === 0) addLog('트릭룸 / Trick Room 효과가 끝났다. / Trick Room wore off.');
  }
  if (battle.weather) {
    battle.weatherTurns = Math.max(0, battle.weatherTurns - 1);
    if (battle.weatherTurns <= 0) {
      const endedWeather = battle.weather;
      battle.weather = '';
      addLog(`${weatherDisplayLabel(endedWeather)} 효과가 끝났다. / ${weatherDisplayLabel(endedWeather)} wore off.`);
    }
  }
  if (battle.terrain) {
    battle.terrainTurns = Math.max(0, battle.terrainTurns - 1);
    if (battle.terrainTurns <= 0) {
      const endedTerrain = battle.terrain;
      battle.terrain = '';
      addLog(`${terrainDisplayLabel(endedTerrain)} 효과가 끝났다. / ${terrainDisplayLabel(endedTerrain)} wore off.`);
    }
  }
  fillFaintedActives();
}
function determineWinner() {
  const battle = state.battle;
  if (battle.winner) return;
  const alive = battle.players.map(side => side.team.some(mon => !mon.fainted));
  if (alive[0] && alive[1]) return;
  if (!alive[0] && !alive[1]) {
    battle.winner = '무승부 / Draw';
    addLog('양쪽 팀 모두 싸울 수 있는 포켓몬이 없습니다. 무승부! / Both teams are out of usable Pokémon. Draw game.', 'win');
    return;
  }
  battle.winner = alive[0] ? battle.players[0].name : battle.players[1].name;
  addLog(`${battle.winner} 승리! / ${battle.winner} wins the battle!`, 'win');
}

  async function resolveLegacyTurn(battle = state?.battle) {
    if (!battle || battle.resolvingTurn) return;
    battle.resolvingTurn = true;
    battle.players.forEach(side => side.team.forEach(mon => {
      if (!mon) return;
      mon.volatile = mon.volatile || {};
      mon.volatile.actedThisTurn = false;
    }));
    const queue = [];
    for (const [player, side] of battle.players.entries()) {
      for (const activeIndex of side.active) {
        const mon = side.team[activeIndex];
        const choice = side.choices[activeIndex];
        if (!choice) continue;
        if (choice.kind === 'switch') {
          queue.push({priority: 100, speed: 0, player, activeIndex, mon, choice});
          continue;
        }
        if (choice.kind !== 'move' || !mon || mon.fainted) continue;
        const move = choice.moveIndex === -1 ? STRUGGLE_MOVE : await getMoveData(choice.move);
        let speed = mon && !mon.fainted ? getModifiedStat(mon, 'spe') : 0;
        if (choice.mega && !mon.megaUsed && !side.megaUsed) {
          const megaCandidate = getMegaCandidateForMon(mon);
          if (megaCandidate) {
            const megaData = await getSpeciesData(megaCandidate.speciesName).catch(() => null);
            const projectedStats = megaData ? calcStatsForSpeciesData(mon, megaData) : null;
            if (projectedStats?.spe) speed = Math.max(1, Math.floor(projectedStats.spe * statStageMultiplier(mon.boosts.spe || 0)));
          }
        }
        let priority = move.priority || 0;
        if (choice.dynamax && move.category === 'status') priority = 4;
        queue.push({priority, speed, player, activeIndex, mon, choice, move});
      }
    }
    queue.sort((a, b) => {
      const priorityDiff = (b.priority || 0) - (a.priority || 0);
      if (priorityDiff) return priorityDiff;
      const speedDiff = (state.battle?.trickRoomTurns > 0)
        ? ((a.speed || 0) - (b.speed || 0))
        : ((b.speed || 0) - (a.speed || 0));
      if (speedDiff) return speedDiff;
      return Math.random() - 0.5;
    });
    for (const action of queue) {
      if (battle.winner) break;
      if (action.mon?.volatile) action.mon.volatile.actedThisTurn = true;
      if (action.choice.kind === 'switch') performSwitch(action.player, action.activeIndex, action.choice.switchTo);
      else if (action.choice.kind === 'move') await performMove(action);
      fillFaintedActives();
      determineWinner();
    }
    endOfTurn();
    determineWinner();
    battle.players.forEach(side => side.choices = {});
    battle.turn += 1;
    battle.resolvingTurn = false;
  }

  return {
    startCustomRuntimeBattle,
    resolveLegacyTurn,
    renderLegacyChoicePanel: renderChoicePanel,
    renderLegacyPendingChoices: renderPendingChoices,
    isLegacyChoiceComplete: isChoiceComplete,
    isLegacyPlayerReady: isPlayerReady,
  };
}
