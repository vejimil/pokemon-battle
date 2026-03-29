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
    throw new Error(data?.error || `Request failed: ${response.status}`);
  }
  return data;
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
    const activeIndex = Array.isArray(side.active) ? side.active[0] : 0;
    const choice = side.choices?.[activeIndex];
    if (!choice) throw new Error(`Player ${playerIndex + 1} choice is missing.`);
    choices[`p${playerIndex + 1}`] = serializeChoiceForShowdown(choice);
  }
  const data = await requestJson('/api/battle/choice', {
    method: 'POST',
    body: JSON.stringify({battleId, choices}),
  });
  return data.snapshot;
}

export function serializeChoiceForShowdown(choice) {
  if (!choice || !choice.kind) throw new Error('Choice is empty.');
  if (choice.kind === 'switch') {
    if (!Number.isInteger(choice.switchTo)) throw new Error('Switch target is missing.');
    return `switch ${choice.switchTo + 1}`;
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
