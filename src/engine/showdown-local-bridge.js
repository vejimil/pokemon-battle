function toId(text) {
  return String(text || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, {
    headers: {'Content-Type': 'application/json'},
    ...options,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data?.ok === false) {
    const fallbackMessage = response.status === 404
      ? `Local engine API was not found at ${url}.`
      : `Request failed: ${response.status}`;
    throw new Error(data?.error || fallbackMessage);
  }
  return data;
}

function getSideId(playerIndex) {
  return `p${playerIndex + 1}`;
}

function getRequestActionSlots(side, request) {
  const active = Array.isArray(side?.active) ? side.active : [];
  if (Array.isArray(request?.forceSwitch)) {
    return request.forceSwitch
      .map((required, requestSlot) => (required ? (active[requestSlot] ?? requestSlot) : null))
      .filter(slot => Number.isInteger(slot));
  }
  if (Array.isArray(request?.active) && request.active.length) {
    return request.active.map((_, requestSlot) => active[requestSlot] ?? requestSlot);
  }
  return [];
}

function isActionableRequest(request) {
  if (!request || request.wait || request.teamPreview) return false;
  if (Array.isArray(request.forceSwitch) && request.forceSwitch.some(Boolean)) return true;
  return Array.isArray(request.active) && request.active.length > 0;
}

function getPendingChoiceForSide(battle, sideId, slot) {
  return battle?.pendingChoices?.[sideId]?.[slot] || null;
}

function getForcedChoiceFromRequestSlot(request, requestSlot = 0) {
  if (Array.isArray(request?.forceSwitch) && request.forceSwitch.some(Boolean)) return null;
  const activeRequest = Array.isArray(request?.active) ? request.active[requestSlot] : null;
  const moves = Array.isArray(activeRequest?.moves) ? activeRequest.moves : [];
  if (moves.length !== 1) return null;
  const onlyMove = moves[0] || null;
  const moveId = toId(onlyMove?.id || onlyMove?.move || '');
  if (!onlyMove || onlyMove.disabled || !moveId || moveId === 'struggle') return null;
  return {
    kind: 'move',
    move: onlyMove.move || 'Locked move',
    moveIndex: 0,
    target: null,
    mega: false,
    tera: false,
    z: false,
    dynamax: false,
  };
}

function resolveChoiceTargetLoc(target = null, request = null) {
  if (!target) return null;
  if (Number.isInteger(target.loc)) return target.loc;
  const rawSlot = Number(target.slot);
  if (!Number.isInteger(rawSlot)) return null;
  const baseLoc = rawSlot + 1;
  const actorSide = String(request?.side?.id || '').toLowerCase();
  const targetSide = String(target?.side || '').toLowerCase();
  if ((actorSide === 'p1' || actorSide === 'p2') && (targetSide === 'p1' || targetSide === 'p2')) {
    return targetSide === actorSide ? -baseLoc : baseLoc;
  }
  return baseLoc;
}

const CHOOSABLE_TARGET_TYPES = new Set([
  'normal',
  'any',
  'adjacentAlly',
  'adjacentAllyOrSelf',
  'adjacentFoe',
]);

function resolveRequestMoveTargetType(choice, request = null, options = {}) {
  if (!choice || choice.kind !== 'move' || !Number.isInteger(choice.moveIndex)) return '';
  const requestSlot = Number.isInteger(options?.requestSlot) ? options.requestSlot : 0;
  const moveRequest = Array.isArray(request?.active) ? request.active[requestSlot] : null;
  const moveEntry = Array.isArray(moveRequest?.moves) ? moveRequest.moves[choice.moveIndex] : null;
  const zEntry = Array.isArray(moveRequest?.canZMove) ? moveRequest.canZMove[choice.moveIndex] : null;
  const maxEntry = Array.isArray(moveRequest?.maxMoves?.maxMoves) ? moveRequest.maxMoves.maxMoves[choice.moveIndex] : null;
  if (choice.dynamax && maxEntry?.target) return String(maxEntry.target);
  if (choice.z && zEntry?.target) return String(zEntry.target);
  return String(moveEntry?.target || '');
}

export async function probeShowdownLocalServer() {
  try {
    return await requestJson('/api/engine/status', {method: 'GET'});
  } catch (error) {
    return {available: false, error: error.message || String(error)};
  }
}

export async function startShowdownLocalSinglesBattle(payload) {
  const data = await requestJson('/api/battle/start', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return data.snapshot;
}

export async function submitShowdownLocalSinglesChoices({battleId, battle}) {
  const choices = {};
  for (const playerIndex of [0, 1]) {
    const side = battle.players[playerIndex];
    const request = side?.request || null;
    if (!isActionableRequest(request)) continue;
    const sideId = getSideId(playerIndex);
    const actionSlots = getRequestActionSlots(side, request);
    if (!actionSlots.length) {
      throw new Error(`Player ${playerIndex + 1} has an actionable request but no active slot.`);
    }
    const serializedChoices = actionSlots.map((slot, requestSlot) => {
      const choice = getPendingChoiceForSide(battle, sideId, slot) || getForcedChoiceFromRequestSlot(request, requestSlot);
      if (!choice) {
        throw new Error(`Player ${playerIndex + 1} choice is missing for slot ${slot}.`);
      }
      return serializeChoiceForShowdown(choice, request, {requestSlot});
    });
    choices[sideId] = serializedChoices.join(', ');
  }
  if (!Object.keys(choices).length) {
    throw new Error('No actionable engine request is pending.');
  }
  const data = await requestJson('/api/battle/choice', {
    method: 'POST',
    body: JSON.stringify({battleId, choices}),
  });
  return data.snapshot;
}

export function serializeChoiceForShowdown(choice, request = null, options = {}) {
  if (!choice || !choice.kind) throw new Error('Choice is empty.');
  if (choice.kind === 'switch') {
    if (!Number.isInteger(choice.switchTo)) throw new Error('Switch target is missing.');
    const requestEntries = Array.isArray(request?.side?.pokemon) ? request.side.pokemon : [];
    const matchedEntry = requestEntries[choice.switchTo] || requestEntries.find(entry => Number(entry?.teamIndex) === choice.switchTo) || null;
    const engineOrderIndex = Number.isInteger(matchedEntry?.engineOrderIndex)
      ? matchedEntry.engineOrderIndex
      : (Number.isInteger(matchedEntry?.teamIndex) ? matchedEntry.teamIndex : choice.switchTo);
    return `switch ${engineOrderIndex + 1}`;
  }
  if (choice.kind === 'move') {
    if (!Number.isInteger(choice.moveIndex)) throw new Error('Move index is missing.');
    const parts = ['move', String(choice.moveIndex + 1)];
    const targetType = resolveRequestMoveTargetType(choice, request, options);
    const canSpecifyTarget = CHOOSABLE_TARGET_TYPES.has(targetType);
    const targetLoc = canSpecifyTarget ? resolveChoiceTargetLoc(choice.target, request) : null;
    if (canSpecifyTarget && Number.isInteger(targetLoc)) {
      parts.push(String(targetLoc));
    }
    if (choice.mega) parts.push('mega');
    if (choice.ultra) parts.push('ultra');
    if (choice.tera) parts.push('terastallize');
    if (choice.z) parts.push('zmove');
    if (choice.dynamax) parts.push('dynamax');
    return parts.join(' ');
  }
  throw new Error(`Unsupported choice kind: ${choice.kind}`);
}

export function isShowdownLocalBattle(battle) {
  const engineId = String(battle?.engine || '');
  return engineId === 'showdown-local-singles' || engineId === 'showdown-local-doubles';
}
