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

function getForcedChoiceFromRequest(request) {
  const moves = Array.isArray(request?.active?.[0]?.moves) ? request.active[0].moves : [];
  if (moves.length !== 1) return null;
  const onlyMove = moves[0] || null;
  if (!onlyMove || onlyMove.disabled || !toId(onlyMove.id || onlyMove.move || '')) return null;
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
    const slot = actionSlots[0];
    const choice = getPendingChoiceForSide(battle, sideId, slot) || getForcedChoiceFromRequest(request);
    if (!choice) {
      throw new Error(`Player ${playerIndex + 1} choice is missing.`);
    }
    choices[sideId] = serializeChoiceForShowdown(choice, request);
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

export function serializeChoiceForShowdown(choice, request = null) {
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
    if (choice.target && Number.isInteger(choice.target.slot)) {
      parts.push(String(choice.target.slot + 1));
    }
    if (choice.mega) parts.push('mega');
    if (choice.tera) parts.push('terastallize');
    if (choice.z) parts.push('zmove');
    if (choice.dynamax) parts.push('dynamax');
    return parts.join(' ');
  }
  throw new Error(`Unsupported choice kind: ${choice.kind}`);
}

export function isShowdownLocalBattle(battle) {
  return battle?.engine === 'showdown-local-singles';
}
