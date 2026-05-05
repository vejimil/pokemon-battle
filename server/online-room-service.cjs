const {randomUUID} = require('crypto');

const DEFAULT_SINGLES_FORMAT_ID = 'gen9customgame@@@+pokemontag:past,+pokemontag:future';
const DEFAULT_DOUBLES_FORMAT_ID = 'gen9doublescustomgame@@@+pokemontag:past,+pokemontag:future';
const DEFAULT_ROOM_TTL_MS = 12 * 60 * 60 * 1000;
const DEFAULT_TEAM_SIZE = 3;
const DEFAULT_MODE = 'singles';
const DEFAULT_BUILDER_SLOT_COUNT = 6;
const ROOM_PHASES = Object.freeze({
  LOBBY: 'lobby',
  BUILDING: 'building',
  PREVIEW: 'preview',
  SELECTING: 'selecting',
  BATTLE: 'battle',
});

function sanitizeTeamSize(value, fallback = DEFAULT_TEAM_SIZE) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(1, Math.min(6, Math.trunc(parsed)));
}

function sanitizeMode(value, fallback = DEFAULT_MODE) {
  const text = String(value || '').trim().toLowerCase();
  if (text === 'doubles') return 'doubles';
  if (text === 'singles') return 'singles';
  return fallback === 'doubles' ? 'doubles' : 'singles';
}

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

function cloneBuilderPayload(builder = null, fallbackName = 'Player', slotCount = DEFAULT_BUILDER_SLOT_COUNT) {
  const safe = builder && typeof builder === 'object' ? builder : {};
  const name = sanitizeName(safe.name || '', fallbackName);
  const rawTeam = Array.isArray(safe.team) ? safe.team : [];
  const normalizedSlotCount = sanitizeTeamSize(slotCount, DEFAULT_BUILDER_SLOT_COUNT);
  const team = Array.from({length: normalizedSlotCount}, (_, index) => {
    const mon = rawTeam[index];
    if (!mon || typeof mon !== 'object') return null;
    const next = {...mon};
    if ('data' in next) next.data = null;
    return next;
  }).map(mon => mon || {});
  return {name, team};
}

function createEmptySelection() {
  return {
    p1: {picks: [], submitted: false, submittedAt: 0},
    p2: {picks: [], submitted: false, submittedAt: 0},
  };
}

function createEmptyStartRequested() {
  return {p1: false, p2: false};
}

function cloneSelectionEntry(entry = null, {includePicks = false} = {}) {
  const picks = Array.isArray(entry?.picks) ? entry.picks.filter(Number.isInteger) : [];
  return {
    picks: includePicks ? [...picks] : [],
    submitted: Boolean(entry?.submitted),
    submittedAt: Number(entry?.submittedAt || 0),
  };
}

function hasCompleteBuilderMon(mon = null) {
  if (!mon || typeof mon !== 'object') return false;
  const species = String(mon.displaySpecies || mon.formSpecies || mon.species || mon.baseSpecies || '').trim();
  const ability = String(mon.ability || '').trim();
  const moves = Array.isArray(mon.moves) ? mon.moves.filter(move => String(move || '').trim()) : [];
  const level = Number(mon.level || 0);
  return Boolean(species && ability && moves.length === 4 && Number.isFinite(level) && level >= 1 && level <= 100);
}

class OnlineRoomService {
  constructor(engine, {roomTtlMs = DEFAULT_ROOM_TTL_MS} = {}) {
    this.engine = engine;
    this.roomTtlMs = Number(roomTtlMs) > 0 ? Number(roomTtlMs) : DEFAULT_ROOM_TTL_MS;
    this.rooms = new Map();
  }

  createRoom({name = '', builder = null, teamSize = DEFAULT_TEAM_SIZE, mode = DEFAULT_MODE} = {}) {
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
      settings: {
        teamSize: sanitizeTeamSize(teamSize, DEFAULT_TEAM_SIZE),
        mode: sanitizeMode(mode, DEFAULT_MODE),
        builderSlotCount: DEFAULT_BUILDER_SLOT_COUNT,
      },
      builder: {
        p1: cloneBuilderPayload(builder, p1Name, DEFAULT_BUILDER_SLOT_COUNT),
        p2: cloneBuilderPayload(null, 'Player 2', DEFAULT_BUILDER_SLOT_COUNT),
      },
      phase: ROOM_PHASES.LOBBY,
      startRequested: createEmptyStartRequested(),
      selection: createEmptySelection(),
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
      state: this.serialize(room, {viewerSide: 'p1'}),
    };
  }

  joinRoom({roomId = '', name = '', builder = null, teamSize = null} = {}) {
    const room = this.getRoomOrThrow(roomId);
    this.ensureRoomShape(room);
    if (!room.settings || typeof room.settings !== 'object') {
      room.settings = {
        teamSize: sanitizeTeamSize(teamSize, DEFAULT_TEAM_SIZE),
        mode: DEFAULT_MODE,
        builderSlotCount: DEFAULT_BUILDER_SLOT_COUNT,
      };
    } else {
      if (!Number.isInteger(room.settings.teamSize)) {
        room.settings.teamSize = sanitizeTeamSize(teamSize, DEFAULT_TEAM_SIZE);
      } else {
        room.settings.teamSize = sanitizeTeamSize(room.settings.teamSize, DEFAULT_TEAM_SIZE);
      }
      room.settings.mode = sanitizeMode(room.settings.mode, DEFAULT_MODE);
      room.settings.builderSlotCount = DEFAULT_BUILDER_SLOT_COUNT;
    }
    if (room.players.p2) {
      const error = new Error('Room is already full.');
      error.statusCode = 409;
      throw error;
    }
    const now = Date.now();
    const p2Token = randomUUID();
    const p2Name = sanitizeName(name, 'Player 2');
    room.players.p2 = {name: p2Name, token: p2Token, joinedAt: now};
    room.builder.p2 = cloneBuilderPayload(builder, p2Name, this.getBuilderSlotCount(room));
    room.ready.p2 = false;
    room.phase = ROOM_PHASES.BUILDING;
    this.bump(room, 'room-joined');
    return {
      roomId: room.id,
      side: 'p2',
      token: p2Token,
      state: this.serialize(room, {viewerSide: 'p2'}),
    };
  }

  syncBuilder({roomId = '', token = '', builder = null} = {}) {
    const room = this.getRoomOrThrow(roomId);
    this.ensureRoomShape(room);
    this.returnFinishedBattleToBuilding(room);
    const side = this.resolveSideByToken(room, token);
    if (room.phase !== ROOM_PHASES.LOBBY && room.phase !== ROOM_PHASES.BUILDING) {
      const error = new Error('Builder can only be edited before team preview starts.');
      error.statusCode = 409;
      throw error;
    }
    const sideName = room.players[side]?.name || (side === 'p1' ? 'Player 1' : 'Player 2');
    room.builder[side] = cloneBuilderPayload(builder, sideName, this.getBuilderSlotCount(room));
    room.ready[side] = false;
    room.startRequested = createEmptyStartRequested();
    room.selection = createEmptySelection();
    this.bump(room, 'builder-sync');
    return {
      side,
      state: this.serialize(room, {viewerSide: side}),
    };
  }

  setReady({roomId = '', token = '', ready = false} = {}) {
    const room = this.getRoomOrThrow(roomId);
    this.ensureRoomShape(room);
    this.returnFinishedBattleToBuilding(room);
    const side = this.resolveSideByToken(room, token);
    if (!room.players.p1 || !room.players.p2) {
      const error = new Error('Both players must join before getting ready.');
      error.statusCode = 409;
      throw error;
    }

    const nextReady = Boolean(ready);
    if (!nextReady) {
      if (room.phase === ROOM_PHASES.SELECTING || (room.phase === ROOM_PHASES.BATTLE && room.battle?.started)) {
        const error = new Error('Ready cannot be cancelled after team selection starts.');
        error.statusCode = 409;
        throw error;
      }
      room.ready[side] = false;
      if (room.phase === ROOM_PHASES.PREVIEW) {
        room.phase = ROOM_PHASES.BUILDING;
      }
      room.startRequested = createEmptyStartRequested();
      room.selection = createEmptySelection();
    } else {
      if (room.phase === ROOM_PHASES.SELECTING || room.phase === ROOM_PHASES.BATTLE) {
        const error = new Error('Ready can only be set while building teams.');
        error.statusCode = 409;
        throw error;
      }
      this.validateBuilderTeam(room, side);
      room.ready[side] = true;
      if (room.ready.p1 && room.ready.p2) {
        room.phase = ROOM_PHASES.PREVIEW;
        room.startRequested = createEmptyStartRequested();
        room.selection = createEmptySelection();
      } else {
        room.phase = ROOM_PHASES.BUILDING;
      }
    }
    this.bump(room, 'ready-updated');
    return {
      side,
      ready: room.ready[side],
      state: this.serialize(room, {viewerSide: side}),
    };
  }

  async startBattle({roomId = '', token = '', requested = true} = {}) {
    const room = this.getRoomOrThrow(roomId);
    this.ensureRoomShape(room);
    const side = this.resolveSideByToken(room, token);

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
    if (room.phase === ROOM_PHASES.BUILDING && room.ready.p1 && room.ready.p2) {
      room.phase = ROOM_PHASES.PREVIEW;
    }
    if (room.phase !== ROOM_PHASES.PREVIEW) {
      const error = new Error('Battle start can only be requested from team preview.');
      error.statusCode = 409;
      throw error;
    }

    room.startRequested[side] = Boolean(requested);
    if (room.startRequested.p1 && room.startRequested.p2) {
      room.phase = ROOM_PHASES.SELECTING;
      room.selection = createEmptySelection();
      this.bump(room, 'selection-started');
    } else {
      this.bump(room, 'start-request-updated');
    }
    return {side, state: this.serialize(room, {viewerSide: side})};
  }

  async submitSelection({roomId = '', token = '', picks = []} = {}) {
    const room = this.getRoomOrThrow(roomId);
    this.ensureRoomShape(room);
    const side = this.resolveSideByToken(room, token);
    if (room.phase !== ROOM_PHASES.SELECTING) {
      const error = new Error('Team selection is not open.');
      error.statusCode = 409;
      throw error;
    }
    if (room.battle?.starting) {
      const error = new Error('Battle is already starting.');
      error.statusCode = 409;
      throw error;
    }
    const normalizedPicks = this.validateSelectionPicks(room, side, picks);
    room.selection[side] = {
      picks: normalizedPicks,
      submitted: true,
      submittedAt: Date.now(),
    };

    if (room.selection.p1.submitted && room.selection.p2.submitted && !room.battle?.started) {
      room.battle.starting = true;
      try {
        await this.startEngineBattleFromSelections(room);
      } catch (error) {
        room.battle.starting = false;
        throw error;
      }
      this.bump(room, 'battle-started');
    } else {
      this.bump(room, 'selection-submitted');
    }
    return {
      side,
      state: this.serialize(room, {viewerSide: side}),
    };
  }

  cancelSelection({roomId = '', token = ''} = {}) {
    const room = this.getRoomOrThrow(roomId);
    this.ensureRoomShape(room);
    const side = this.resolveSideByToken(room, token);
    if (room.phase !== ROOM_PHASES.SELECTING) {
      const error = new Error('Team selection is not open.');
      error.statusCode = 409;
      throw error;
    }
    if (room.battle?.starting) {
      const error = new Error('Battle is already starting.');
      error.statusCode = 409;
      throw error;
    }
    room.selection[side] = {
      picks: Array.isArray(room.selection?.[side]?.picks) ? [...room.selection[side].picks] : [],
      submitted: false,
      submittedAt: 0,
    };
    this.bump(room, 'selection-cancelled');
    return {
      side,
      state: this.serialize(room, {viewerSide: side}),
    };
  }

  async submitChoice({roomId = '', token = '', choice = ''} = {}) {
    const room = this.getRoomOrThrow(roomId);
    this.ensureRoomShape(room);
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
      const nextSnapshot = await this.engine.chooseBattle(room.battle.sessionId, choices);
      room.battle.snapshot = nextSnapshot;
      room.battle.started = !Boolean(nextSnapshot?.winner);
      room.battle.pendingChoices = {p1: '', p2: ''};
      if (nextSnapshot?.winner) {
        room.phase = ROOM_PHASES.BUILDING;
        room.ready = {p1: false, p2: false};
        room.startRequested = createEmptyStartRequested();
        room.selection = createEmptySelection();
      } else {
        room.phase = ROOM_PHASES.BATTLE;
      }
      this.bump(room, nextSnapshot?.winner ? 'battle-finished' : 'turn-resolved');
      return {
        side,
        resolved: true,
        state: this.serialize(room, {viewerSide: side}),
      };
    }

    this.bump(room, 'choice-submitted');
    return {
      side,
      resolved: false,
      state: this.serialize(room, {viewerSide: side}),
    };
  }

  forfeitBattle({roomId = '', token = ''} = {}) {
    const room = this.getRoomOrThrow(roomId);
    this.ensureRoomShape(room);
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
        state: this.serialize(room, {viewerSide: side}),
      };
    }

    const winnerSide = side === 'p1' ? 'p2' : 'p1';
    const winnerName = room.players[winnerSide]?.name || (winnerSide === 'p2' ? 'Player 2' : 'Player 1');
    const loserName = room.players[side]?.name || (side === 'p2' ? 'Player 2' : 'Player 1');
    const prevSnapshot = room.battle.snapshot || {};
    const nextLog = Array.isArray(prevSnapshot.log) ? [...prevSnapshot.log] : [];
    const previousEvents = Array.isArray(prevSnapshot.events) ? prevSnapshot.events : [];
    const maxSeq = previousEvents.reduce((current, event) => {
      const seq = Number(event?.seq);
      return Number.isFinite(seq) ? Math.max(current, seq) : current;
    }, 0);
    const endEvent = {
      type: 'battle_end',
      turn: Number(prevSnapshot.turn || 0),
      seq: maxSeq + 1,
      winner: winnerName,
    };
    nextLog.unshift({
      text: `${loserName} 항복. ${winnerName} 승리.`,
      rawText: `${loserName} surrendered. ${winnerName} wins.`,
      tone: 'accent',
    });
    room.battle.snapshot = {
      ...prevSnapshot,
      winner: winnerName,
      log: nextLog,
      events: [endEvent],
    };
    room.battle.started = false;
    room.battle.pendingChoices = {p1: '', p2: ''};
    room.phase = ROOM_PHASES.BUILDING;
    room.ready = {p1: false, p2: false};
    room.startRequested = createEmptyStartRequested();
    room.selection = createEmptySelection();
    this.bump(room, 'battle-forfeit');
    return {
      side,
      winner: winnerName,
      state: this.serialize(room, {viewerSide: side}),
    };
  }

  async getState({roomId = '', since = 0, waitMs = 0, token = ''} = {}) {
    const room = this.getRoomOrThrow(roomId);
    this.ensureRoomShape(room);
    this.returnFinishedBattleToBuilding(room);
    const viewerSide = this.resolveSideByTokenOptional(room, token);
    const normalizedSince = Number.isFinite(Number(since)) ? Number(since) : 0;
    const normalizedWait = Math.max(0, Math.min(30000, Number(waitMs) || 0));

    if (room.revision > normalizedSince || normalizedWait <= 0) {
      return {state: this.serialize(room, {viewerSide})};
    }

    return new Promise(resolve => {
      const waiter = {
        resolve: () => resolve({state: this.serialize(room, {viewerSide})}),
        timer: null,
      };
      waiter.timer = setTimeout(() => {
        room.waiters = room.waiters.filter(entry => entry !== waiter);
        resolve({state: this.serialize(room, {viewerSide})});
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

  resolveSideByTokenOptional(room, token = '') {
    const key = String(token || '').trim();
    if (key && room.players.p1?.token === key) return 'p1';
    if (key && room.players.p2?.token === key) return 'p2';
    return '';
  }

  getBuilderSlotCount(room) {
    return sanitizeTeamSize(room?.settings?.builderSlotCount, DEFAULT_BUILDER_SLOT_COUNT);
  }

  ensureRoomShape(room) {
    if (!room || typeof room !== 'object') return;
    if (!room.settings || typeof room.settings !== 'object') {
      room.settings = {
        teamSize: DEFAULT_TEAM_SIZE,
        mode: DEFAULT_MODE,
        builderSlotCount: DEFAULT_BUILDER_SLOT_COUNT,
      };
    }
    room.settings.teamSize = sanitizeTeamSize(room.settings.teamSize, DEFAULT_TEAM_SIZE);
    room.settings.mode = sanitizeMode(room.settings.mode, DEFAULT_MODE);
    room.settings.builderSlotCount = DEFAULT_BUILDER_SLOT_COUNT;
    const slotCount = this.getBuilderSlotCount(room);
    room.builder = room.builder && typeof room.builder === 'object' ? room.builder : {};
    room.builder.p1 = cloneBuilderPayload(room.builder.p1, room.players?.p1?.name || 'Player 1', slotCount);
    room.builder.p2 = cloneBuilderPayload(room.builder.p2, room.players?.p2?.name || 'Player 2', slotCount);
    room.ready = room.ready && typeof room.ready === 'object' ? room.ready : {};
    room.ready.p1 = Boolean(room.ready.p1);
    room.ready.p2 = Boolean(room.ready.p2);
    room.startRequested = room.startRequested && typeof room.startRequested === 'object'
      ? {p1: Boolean(room.startRequested.p1), p2: Boolean(room.startRequested.p2)}
      : createEmptyStartRequested();
    room.selection = room.selection && typeof room.selection === 'object' ? room.selection : createEmptySelection();
    room.selection.p1 = cloneSelectionEntry(room.selection.p1, {includePicks: true});
    room.selection.p2 = cloneSelectionEntry(room.selection.p2, {includePicks: true});
    room.battle = room.battle && typeof room.battle === 'object' ? room.battle : {
      started: false,
      sessionId: '',
      snapshot: null,
      pendingChoices: {p1: '', p2: ''},
    };
    room.battle.pendingChoices = room.battle.pendingChoices && typeof room.battle.pendingChoices === 'object'
      ? room.battle.pendingChoices
      : {p1: '', p2: ''};
    const phase = String(room.phase || '').toLowerCase();
    if (!Object.values(ROOM_PHASES).includes(phase)) {
      room.phase = this.derivePhase(room);
    } else {
      room.phase = phase;
    }
  }

  derivePhase(room) {
    if (room.battle?.started && !room.battle?.snapshot?.winner) return ROOM_PHASES.BATTLE;
    if (!room.players?.p1 || !room.players?.p2) return ROOM_PHASES.LOBBY;
    if (room.ready?.p1 && room.ready?.p2) return ROOM_PHASES.PREVIEW;
    return ROOM_PHASES.BUILDING;
  }

  returnFinishedBattleToBuilding(room) {
    if (!room?.battle?.snapshot?.winner) return false;
    if (room.phase !== ROOM_PHASES.BATTLE) return false;
    room.phase = ROOM_PHASES.BUILDING;
    room.ready = {p1: false, p2: false};
    room.startRequested = createEmptyStartRequested();
    room.selection = createEmptySelection();
    return true;
  }

  validateBuilderTeam(room, side) {
    const team = Array.isArray(room.builder?.[side]?.team) ? room.builder[side].team : [];
    const slotCount = this.getBuilderSlotCount(room);
    const complete = Array.from({length: slotCount}, (_, index) => hasCompleteBuilderMon(team[index]));
    if (complete.every(Boolean)) return;
    const missingSlot = complete.findIndex(value => !value) + 1;
    const error = new Error(`All ${slotCount} builder slots must be complete before readying. Slot ${missingSlot} is incomplete.`);
    error.statusCode = 400;
    throw error;
  }

  validateSelectionPicks(room, side, picks) {
    const teamSize = sanitizeTeamSize(room.settings?.teamSize, DEFAULT_TEAM_SIZE);
    const slotCount = this.getBuilderSlotCount(room);
    if (!Array.isArray(picks) || picks.length !== teamSize) {
      const error = new Error(`Selection must contain exactly ${teamSize} picks.`);
      error.statusCode = 400;
      throw error;
    }
    const normalized = picks.map(value => Number(value));
    if (!normalized.every(Number.isInteger)) {
      const error = new Error('Selection picks must be integer slot indexes.');
      error.statusCode = 400;
      throw error;
    }
    if (new Set(normalized).size !== normalized.length) {
      const error = new Error('Selection picks cannot contain duplicates.');
      error.statusCode = 400;
      throw error;
    }
    const team = Array.isArray(room.builder?.[side]?.team) ? room.builder[side].team : [];
    for (const index of normalized) {
      if (index < 0 || index >= slotCount) {
        const error = new Error('Selection pick is outside the builder slot range.');
        error.statusCode = 400;
        throw error;
      }
      if (!hasCompleteBuilderMon(team[index])) {
        const error = new Error(`Selected slot ${index + 1} is incomplete.`);
        error.statusCode = 400;
        throw error;
      }
    }
    return normalized;
  }

  async startEngineBattleFromSelections(room) {
    const teamSize = sanitizeTeamSize(room.settings?.teamSize, DEFAULT_TEAM_SIZE);
    const mode = sanitizeMode(room.settings?.mode, DEFAULT_MODE);
    const buildTeam = side => {
      const team = Array.isArray(room.builder?.[side]?.team) ? room.builder[side].team : [];
      const picks = this.validateSelectionPicks(room, side, room.selection?.[side]?.picks || []);
      return picks.slice(0, teamSize).map(index => ({...team[index], data: null}));
    };
    const payload = {
      mode,
      formatid: mode === 'doubles' ? DEFAULT_DOUBLES_FORMAT_ID : DEFAULT_SINGLES_FORMAT_ID,
      players: [
        {
          name: sanitizeName(room.builder.p1?.name || room.players.p1?.name || 'Player 1', 'Player 1'),
          team: buildTeam('p1'),
        },
        {
          name: sanitizeName(room.builder.p2?.name || room.players.p2?.name || 'Player 2', 'Player 2'),
          team: buildTeam('p2'),
        },
      ],
    };
    const snapshot = await this.engine.startBattle(payload);
    room.battle = {
      started: true,
      sessionId: String(snapshot?.id || ''),
      snapshot,
      pendingChoices: {p1: '', p2: ''},
    };
    room.phase = ROOM_PHASES.BATTLE;
    room.ready = {p1: false, p2: false};
    room.startRequested = createEmptyStartRequested();
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

  serialize(room, {viewerSide = ''} = {}) {
    this.ensureRoomShape(room);
    const phase = String(room.phase || this.derivePhase(room));
    const slotCount = this.getBuilderSlotCount(room);
    const shouldMaskOpponentItems = phase === ROOM_PHASES.PREVIEW || phase === ROOM_PHASES.SELECTING;
    const serializeBuilderSide = side => {
      const fallbackName = side === 'p1' ? 'Player 1' : 'Player 2';
      const payload = cloneBuilderPayload(room.builder?.[side], room.players?.[side]?.name || fallbackName, slotCount);
      const isOpponent = viewerSide !== side;
      if (shouldMaskOpponentItems && isOpponent) {
        payload.team = payload.team.map(mon => mon && typeof mon === 'object' ? {...mon, item: ''} : mon);
      }
      return payload;
    };
    const serializeSelectionSide = side => {
      const includePicks = viewerSide === side;
      return cloneSelectionEntry(room.selection?.[side], {includePicks});
    };
    return {
      roomId: room.id,
      revision: room.revision,
      createdAt: room.createdAt,
      updatedAt: room.updatedAt,
      expiresAt: room.expiresAt,
      lastEvent: room.lastEvent,
      phase,
      players: {
        p1: room.players.p1 ? {name: room.players.p1.name, joined: true} : {name: '', joined: false},
        p2: room.players.p2 ? {name: room.players.p2.name, joined: true} : {name: '', joined: false},
      },
      settings: {
        teamSize: sanitizeTeamSize(room.settings?.teamSize, DEFAULT_TEAM_SIZE),
        mode: sanitizeMode(room.settings?.mode, DEFAULT_MODE),
        builderSlotCount: slotCount,
      },
      builder: {
        p1: serializeBuilderSide('p1'),
        p2: serializeBuilderSide('p2'),
      },
      startRequested: {
        p1: Boolean(room.startRequested?.p1),
        p2: Boolean(room.startRequested?.p2),
      },
      selection: {
        p1: serializeSelectionSide('p1'),
        p2: serializeSelectionSide('p2'),
      },
      ready: {
        p1: Boolean(room.ready.p1),
        p2: Boolean(room.ready.p2),
      },
      battle: {
        started: Boolean(room.battle?.started && !room.battle?.snapshot?.winner),
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
