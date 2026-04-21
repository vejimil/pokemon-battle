function normalizeRoomId(raw = '') {
  return String(raw || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, {
    headers: {'Content-Type': 'application/json'},
    ...options,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data?.ok === false) {
    const fallbackMessage = response.status === 404
      ? `Online room API was not found at ${url}.`
      : `Request failed: ${response.status}`;
    throw new Error(data?.error || fallbackMessage);
  }
  return data;
}

export async function createOnlineRoom({name = '', builder = null} = {}) {
  const data = await requestJson('/api/rooms/create', {
    method: 'POST',
    body: JSON.stringify({name, builder}),
  });
  return {
    roomId: normalizeRoomId(data.roomId),
    side: String(data.side || ''),
    token: String(data.token || ''),
    state: data.state || null,
  };
}

export async function joinOnlineRoom({roomId = '', name = '', builder = null} = {}) {
  const data = await requestJson('/api/rooms/join', {
    method: 'POST',
    body: JSON.stringify({roomId: normalizeRoomId(roomId), name, builder}),
  });
  return {
    roomId: normalizeRoomId(data.roomId),
    side: String(data.side || ''),
    token: String(data.token || ''),
    state: data.state || null,
  };
}

export async function fetchOnlineRoomState({roomId = '', since = 0, waitMs = 0} = {}) {
  const normalizedRoomId = normalizeRoomId(roomId);
  const search = new URLSearchParams();
  if (Number.isFinite(Number(since))) search.set('since', String(Number(since) || 0));
  if (Number.isFinite(Number(waitMs))) search.set('waitMs', String(Math.max(0, Number(waitMs) || 0)));
  const data = await requestJson(`/api/rooms/${encodeURIComponent(normalizedRoomId)}/state?${search.toString()}`, {
    method: 'GET',
  });
  return {
    state: data.state || null,
  };
}

export async function syncOnlineRoomBuilder({roomId = '', token = '', builder = null} = {}) {
  const normalizedRoomId = normalizeRoomId(roomId);
  const data = await requestJson(`/api/rooms/${encodeURIComponent(normalizedRoomId)}/sync-builder`, {
    method: 'POST',
    body: JSON.stringify({token, builder}),
  });
  return {
    side: String(data.side || ''),
    state: data.state || null,
  };
}

export async function setOnlineRoomReady({roomId = '', token = '', ready = false} = {}) {
  const normalizedRoomId = normalizeRoomId(roomId);
  const data = await requestJson(`/api/rooms/${encodeURIComponent(normalizedRoomId)}/set-ready`, {
    method: 'POST',
    body: JSON.stringify({token, ready: Boolean(ready)}),
  });
  return {
    side: String(data.side || ''),
    ready: Boolean(data.ready),
    state: data.state || null,
  };
}

export async function startOnlineRoomBattle({roomId = '', token = ''} = {}) {
  const normalizedRoomId = normalizeRoomId(roomId);
  const data = await requestJson(`/api/rooms/${encodeURIComponent(normalizedRoomId)}/start-battle`, {
    method: 'POST',
    body: JSON.stringify({token}),
  });
  return {
    state: data.state || null,
  };
}

export async function submitOnlineRoomChoice({roomId = '', token = '', choice = ''} = {}) {
  const normalizedRoomId = normalizeRoomId(roomId);
  const data = await requestJson(`/api/rooms/${encodeURIComponent(normalizedRoomId)}/submit-choice`, {
    method: 'POST',
    body: JSON.stringify({token, choice}),
  });
  return {
    side: String(data.side || ''),
    resolved: Boolean(data.resolved),
    state: data.state || null,
  };
}

export async function forfeitOnlineRoomBattle({roomId = '', token = ''} = {}) {
  const normalizedRoomId = normalizeRoomId(roomId);
  const data = await requestJson(`/api/rooms/${encodeURIComponent(normalizedRoomId)}/forfeit`, {
    method: 'POST',
    body: JSON.stringify({token}),
  });
  return {
    side: String(data.side || ''),
    winner: String(data.winner || ''),
    state: data.state || null,
  };
}

export {normalizeRoomId};
