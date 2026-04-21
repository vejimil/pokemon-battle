const {randomUUID} = require('crypto');

const DEFAULT_FORMAT_ID = 'gen9customgame@@@+pokemontag:past,+pokemontag:future';
const DEFAULT_ROOM_TTL_MS = 12 * 60 * 60 * 1000;

function toId(value) {
  return String(value || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function sanitizeRoomId(raw = '') {
  return String(raw || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
}

function sanitizeName(raw = '', fallback = 'Player') {
  const text = String(raw || '').trim();
  return text ? text.slice(0, 24) : fallback;
}

function isActionableRequest(request) {
  if (!request || request.wait || request.teamPreview) return false;
  if (Array.isArray(request.forceSwitch) && request.forceSwitch.some(Boolean)) return true;
  return Array.isArray(request.active) && request.active.length > 0;
}

function getActionableSides(snapshot = null) {
  const players = Array.isArray(snapshot?.players) ? snapshot.players : [];
  return players
    .map((side, index) => ({sideId: `p${index + 1}`, request: side?.request || null}))
    .filter(entry => isActionableRequest(entry.request))
    .map(entry => entry.sideId);
}

function cloneBuilderPayload(builder = null, fallbackName = 'Player') {
  const safe = builder && typeof builder === 'object' ? builder : {};
  const name = sanitizeName(safe.name || '', fallbackName);
  const rawTeam = Array.isArray(safe.team) ? safe.team : [];
  const team = rawTeam.map(mon => {
    if (!mon || typeof mon !== 'object') return null;
    const next = {...mon};
    if ('data' in next) next.data = null;
    return next;
  }).filter(Boolean);
  return {name, team};
}

class OnlineRoomService {
  constructor(engine, {roomTtlMs = DEFAULT_ROOM_TTL_MS} = {}) {
    this.engine = engine;
    this.roomTtlMs = Number(roomTtlMs) > 0 ? Number(roomTtlMs) : DEFAULT_ROOM_TTL_MS;
    this.rooms = new Map();
  }

  createRoom({name = '', builder = null} = {}) {
    this.cleanupExpiredRooms();
    const roomId = this.generateRoomId();
    const p1Token = randomUUID();
    const p1Name = sanitizeName(name, 'Player 1');
    const now = Date.now();
    const room = {
      id: roomId,
      createdAt: now,
      updatedAt: now,
      expiresAt: now + this.roomTtlMs,
      revision: 0,
      lastEvent: 'created',
      players: {
        p1: {name: p1Name, token: p1Token, joinedAt: now},
        p2: null,
      },
      builder: {
        p1: cloneBuilderPayload(builder, p1Name),
        p2: cloneBuilderPayload(null, 'Player 2'),
      },
      ready: {p1: false, p2: false},
      battle: {
        started: false,
        sessionId: '',
        snapshot: null,
        pendingChoices: {p1: '', p2: ''},
      },
      waiters: [],
    };
    this.rooms.set(roomId, room);
    this.bump(room, 'room-created');
    return {
      roomId,
      side: 'p1',
      token: p1Token,
      state: this.serialize(room),
    };
  }

  joinRoom({roomId = '', name = '', builder = null} = {}) {
    const room = this.getRoomOrThrow(roomId);
    if (room.players.p2) {
      const error = new Error('Room is already full.');
      error.statusCode = 409;
      throw error;
    }
    const now = Date.now();
    const p2Token = randomUUID();
    const p2Name = sanitizeName(name, 'Player 2');
    room.players.p2 = {name: p2Name, token: p2Token, joinedAt: now};
    room.builder.p2 = cloneBuilderPayload(builder, p2Name);
    room.ready.p2 = false;
    this.bump(room, 'room-joined');
    return {
      roomId: room.id,
      side: 'p2',
      token: p2Token,
      state: this.serialize(room),
    };
  }

  syncBuilder({roomId = '', token = '', builder = null} = {}) {
    const room = this.getRoomOrThrow(roomId);
    const side = this.resolveSideByToken(room, token);
    const sideName = room.players[side]?.name || (side === 'p1' ? 'Player 1' : 'Player 2');
    room.builder[side] = cloneBuilderPayload(builder, sideName);
    room.ready[side] = false;
    this.bump(room, 'builder-sync');
    return {
      side,
      state: this.serialize(room),
    };
  }

  setReady({roomId = '', token = '', ready = false} = {}) {
    const room = this.getRoomOrThrow(roomId);
    const side = this.resolveSideByToken(room, token);
    room.ready[side] = Boolean(ready);
    this.bump(room, 'ready-updated');
    return {
      side,
      ready: room.ready[side],
      state: this.serialize(room),
    };
  }

  async startBattle({roomId = '', token = ''} = {}) {
    const room = this.getRoomOrThrow(roomId);
    this.resolveSideByToken(room, token);

    if (!room.players.p1 || !room.players.p2) {
      const error = new Error('Both players must join before starting a battle.');
      error.statusCode = 409;
      throw error;
    }
    if (!room.ready.p1 || !room.ready.p2) {
      const error = new Error('Both players must be ready before starting a battle.');
      error.statusCode = 409;
      throw error;
    }

    const payload = {
      mode: 'singles',
      formatid: DEFAULT_FORMAT_ID,
      players: [
        {
          name: sanitizeName(room.builder.p1?.name || room.players.p1?.name || 'Player 1', 'Player 1'),
          team: Array.isArray(room.builder.p1?.team) ? room.builder.p1.team : [],
        },
        {
          name: sanitizeName(room.builder.p2?.name || room.players.p2?.name || 'Player 2', 'Player 2'),
          team: Array.isArray(room.builder.p2?.team) ? room.builder.p2.team : [],
        },
      ],
    };

    const snapshot = await this.engine.startSingles(payload);
    room.battle = {
      started: true,
      sessionId: String(snapshot?.id || ''),
      snapshot,
      pendingChoices: {p1: '', p2: ''},
    };
    room.ready = {p1: false, p2: false};
    this.bump(room, 'battle-started');
    return {state: this.serialize(room)};
  }

  async submitChoice({roomId = '', token = '', choice = ''} = {}) {
    const room = this.getRoomOrThrow(roomId);
    const side = this.resolveSideByToken(room, token);
    if (!room.battle?.started || !room.battle?.sessionId || !room.battle?.snapshot) {
      const error = new Error('Battle has not started yet.');
      error.statusCode = 409;
      throw error;
    }
    if (room.battle.snapshot?.winner) {
      const error = new Error('Battle is already finished.');
      error.statusCode = 409;
      throw error;
    }

    const trimmed = String(choice || '').trim();
    if (!trimmed) {
      const error = new Error('Choice is empty.');
      error.statusCode = 400;
      throw error;
    }

    room.battle.pendingChoices[side] = trimmed;

    const actionableSides = getActionableSides(room.battle.snapshot);
    const hasActionableSides = actionableSides.length > 0;
    const everyoneSubmitted = hasActionableSides
      ? actionableSides.every(sideId => Boolean(String(room.battle.pendingChoices[sideId] || '').trim()))
      : false;

    if (everyoneSubmitted) {
      const choices = {
        p1: actionableSides.includes('p1') ? room.battle.pendingChoices.p1 : '',
        p2: actionableSides.includes('p2') ? room.battle.pendingChoices.p2 : '',
      };
      const nextSnapshot = await this.engine.chooseSingles(room.battle.sessionId, choices);
      room.battle.snapshot = nextSnapshot;
      room.battle.pendingChoices = {p1: '', p2: ''};
      this.bump(room, 'turn-resolved');
      return {
        side,
        resolved: true,
        state: this.serialize(room),
      };
    }

    this.bump(room, 'choice-submitted');
    return {
      side,
      resolved: false,
      state: this.serialize(room),
    };
  }

  forfeitBattle({roomId = '', token = ''} = {}) {
    const room = this.getRoomOrThrow(roomId);
    const side = this.resolveSideByToken(room, token);
    if (!room.battle?.started || !room.battle?.snapshot) {
      const error = new Error('Battle has not started yet.');
      error.statusCode = 409;
      throw error;
    }
    if (room.battle.snapshot?.winner) {
      return {
        side,
        winner: String(room.battle.snapshot.winner || ''),
        state: this.serialize(room),
      };
    }

    const winnerSide = side === 'p1' ? 'p2' : 'p1';
    const winnerName = room.players[winnerSide]?.name || (winnerSide === 'p2' ? 'Player 2' : 'Player 1');
    const loserName = room.players[side]?.name || (side === 'p2' ? 'Player 2' : 'Player 1');
    const prevSnapshot = room.battle.snapshot || {};
    const nextLog = Array.isArray(prevSnapshot.log) ? [...prevSnapshot.log] : [];
    nextLog.unshift({
      text: `${loserName} 항복. ${winnerName} 승리.`,
      rawText: `${loserName} surrendered. ${winnerName} wins.`,
      tone: 'accent',
    });
    room.battle.snapshot = {
      ...prevSnapshot,
      winner: winnerName,
      log: nextLog,
    };
    room.battle.pendingChoices = {p1: '', p2: ''};
    this.bump(room, 'battle-forfeit');
    return {
      side,
      winner: winnerName,
      state: this.serialize(room),
    };
  }

  async getState({roomId = '', since = 0, waitMs = 0} = {}) {
    const room = this.getRoomOrThrow(roomId);
    const normalizedSince = Number.isFinite(Number(since)) ? Number(since) : 0;
    const normalizedWait = Math.max(0, Math.min(30000, Number(waitMs) || 0));

    if (room.revision > normalizedSince || normalizedWait <= 0) {
      return {state: this.serialize(room)};
    }

    return new Promise(resolve => {
      const waiter = {
        resolve: () => resolve({state: this.serialize(room)}),
        timer: null,
      };
      waiter.timer = setTimeout(() => {
        room.waiters = room.waiters.filter(entry => entry !== waiter);
        resolve({state: this.serialize(room)});
      }, normalizedWait);
      room.waiters.push(waiter);
    });
  }

  cleanupExpiredRooms() {
    const now = Date.now();
    for (const [roomId, room] of this.rooms.entries()) {
      if (room.expiresAt > now) continue;
      this.closeRoom(room);
      this.rooms.delete(roomId);
    }
  }

  closeRoom(room) {
    const waiters = Array.isArray(room?.waiters) ? room.waiters : [];
    waiters.forEach(waiter => {
      if (waiter?.timer) clearTimeout(waiter.timer);
      try { waiter?.resolve?.(); } catch (_error) {}
    });
    if (room) room.waiters = [];
  }

  generateRoomId() {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    for (let attempt = 0; attempt < 2000; attempt += 1) {
      let code = '';
      for (let i = 0; i < 6; i += 1) {
        code += alphabet[Math.floor(Math.random() * alphabet.length)];
      }
      if (!this.rooms.has(code)) return code;
    }
    throw new Error('Failed to allocate a room ID.');
  }

  getRoomOrThrow(rawRoomId) {
    this.cleanupExpiredRooms();
    const roomId = sanitizeRoomId(rawRoomId);
    const room = this.rooms.get(roomId);
    if (!room) {
      const error = new Error('Room not found.');
      error.statusCode = 404;
      throw error;
    }
    return room;
  }

  resolveSideByToken(room, token = '') {
    const key = String(token || '').trim();
    if (key && room.players.p1?.token === key) return 'p1';
    if (key && room.players.p2?.token === key) return 'p2';
    const error = new Error('Invalid room token.');
    error.statusCode = 401;
    throw error;
  }

  bump(room, eventName = 'updated') {
    room.revision = Number(room.revision || 0) + 1;
    room.updatedAt = Date.now();
    room.expiresAt = room.updatedAt + this.roomTtlMs;
    room.lastEvent = String(eventName || 'updated');

    const waiters = Array.isArray(room.waiters) ? room.waiters.splice(0) : [];
    waiters.forEach(waiter => {
      if (waiter?.timer) clearTimeout(waiter.timer);
      try { waiter?.resolve?.(); } catch (_error) {}
    });
  }

  serialize(room) {
    return {
      roomId: room.id,
      revision: room.revision,
      createdAt: room.createdAt,
      updatedAt: room.updatedAt,
      expiresAt: room.expiresAt,
      lastEvent: room.lastEvent,
      players: {
        p1: room.players.p1 ? {name: room.players.p1.name, joined: true} : {name: '', joined: false},
        p2: room.players.p2 ? {name: room.players.p2.name, joined: true} : {name: '', joined: false},
      },
      builder: {
        p1: cloneBuilderPayload(room.builder.p1, room.players.p1?.name || 'Player 1'),
        p2: cloneBuilderPayload(room.builder.p2, room.players.p2?.name || 'Player 2'),
      },
      ready: {
        p1: Boolean(room.ready.p1),
        p2: Boolean(room.ready.p2),
      },
      battle: {
        started: Boolean(room.battle?.started),
        actionableSides: getActionableSides(room.battle?.snapshot || null),
        pendingChoices: {
          p1: Boolean(room.battle?.pendingChoices?.p1),
          p2: Boolean(room.battle?.pendingChoices?.p2),
        },
        snapshot: room.battle?.snapshot || null,
      },
    };
  }
}

module.exports = {
  OnlineRoomService,
  sanitizeRoomId,
};
