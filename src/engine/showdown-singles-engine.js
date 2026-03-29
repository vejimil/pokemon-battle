import {buildShowdownTeamFromBuilderTeam, packShowdownTeam, buildShowdownChoice, makeShowdownNickname} from './showdown-serialization.js';

const CDN_IMPORT_CANDIDATES = [
  'https://esm.sh/@pkmn/sim?target=es2022',
  'https://cdn.jsdelivr.net/npm/@pkmn/sim/+esm',
  'https://esm.sh/pokemon-showdown?target=es2022',
  'https://cdn.jsdelivr.net/npm/pokemon-showdown/+esm',
];

let cachedExportsPromise = null;

function resolveBattleStreamExport(mod) {
  const candidates = [
    mod,
    mod?.default,
    mod?.Sim,
    mod?.default?.Sim,
    mod?.sim,
    mod?.default?.sim,
  ].filter(Boolean);
  for (const candidate of candidates) {
    if (typeof candidate.BattleStream === 'function') {
      return {BattleStream: candidate.BattleStream};
    }
  }
  return null;
}

async function loadShowdownBrowserExports() {
  if (cachedExportsPromise) return cachedExportsPromise;
  cachedExportsPromise = (async () => {
    const failures = [];
    for (const url of CDN_IMPORT_CANDIDATES) {
      try {
        const mod = await import(/* @vite-ignore */ url);
        const resolved = resolveBattleStreamExport(mod);
        if (resolved) {
          return {url, ...resolved};
        }
        failures.push(`${url} loaded but did not expose BattleStream`);
      } catch (error) {
        failures.push(`${url} → ${error?.message || String(error)}`);
      }
    }
    throw new Error(`Could not load a Showdown-family simulator module. ${failures.join(' | ')}`);
  })();
  return cachedExportsPromise;
}

function sideIdFromIndex(index) {
  return index === 0 ? 'p1' : 'p2';
}

function parseIdent(raw) {
  const value = String(raw || '');
  const match = value.match(/^(p[1-4])([a-d]?):\s*(.*)$/);
  if (!match) return {side: '', position: '', name: value.trim()};
  return {side: match[1], position: match[2] || '', name: (match[3] || '').trim()};
}

function parseDetailsSpecies(raw) {
  return String(raw || '').split(',')[0].trim();
}

function parseCondition(raw) {
  const text = String(raw || '').trim();
  if (!text) return {hp: null, maxHp: null, status: '', fainted: false};
  const chunks = text.split(' ');
  const hpChunk = chunks[0] || '';
  const trailing = chunks.slice(1);
  if (hpChunk === '0' || hpChunk === '0/0' || trailing.includes('fnt')) {
    return {hp: 0, maxHp: null, status: '', fainted: true};
  }
  const hpMatch = hpChunk.match(/^(\d+)(?:\/(\d+))?$/);
  const hp = hpMatch ? Number(hpMatch[1]) : null;
  const maxHp = hpMatch && hpMatch[2] ? Number(hpMatch[2]) : null;
  const status = trailing.find(token => /^(brn|par|psn|tox|slp|frz)$/.test(token)) || '';
  return {hp, maxHp, status, fainted: trailing.includes('fnt') || hp === 0};
}

function normalizeWeatherToken(token) {
  const id = String(token || '').toLowerCase();
  if (!token || id === 'none') return '';
  const mapping = {
    raindance: 'rain',
    rain: 'rain',
    sunnyday: 'sun',
    desolateland: 'sun',
    sun: 'sun',
    sandstorm: 'sand',
    sand: 'sand',
    snowscape: 'snow',
    hail: 'snow',
    snow: 'snow',
  };
  return mapping[id] || '';
}

function normalizeTerrainToken(token) {
  const id = String(token || '').toLowerCase().replace(/[^a-z]+/g, '');
  const mapping = {
    electricterrain: 'electricterrain',
    grassyterrain: 'grassyterrain',
    mistyterrain: 'mistyterrain',
    psychicterrain: 'psychicterrain',
  };
  return mapping[id] || '';
}

function protocolLineToLog(line) {
  const parts = String(line || '').split('|');
  const tag = parts[1] || '';
  if (tag === 'switch' || tag === 'drag') {
    const ident = parseIdent(parts[2]);
    const species = parseDetailsSpecies(parts[3]);
    return {text: `${ident.name || species} 등장 / switched in: ${species}`, tone: 'accent'};
  }
  if (tag === 'move') {
    const ident = parseIdent(parts[2]);
    const move = parts[3] || '';
    return {text: `${ident.name}의 ${move} / ${ident.name} used ${move}.`, tone: ''};
  }
  if (tag === 'faint') {
    const ident = parseIdent(parts[2]);
    return {text: `${ident.name} 기절 / ${ident.name} fainted.`, tone: ''};
  }
  if (tag === 'cant') {
    const ident = parseIdent(parts[2]);
    return {text: `${ident.name}은(는) 행동할 수 없음 / ${ident.name} could not move.`, tone: ''};
  }
  if (tag === 'error') {
    return {text: `엔진 오류 / Engine message: ${parts.slice(2).join(' | ')}`, tone: 'warning'};
  }
  if (tag === 'win') {
    return {text: `${parts[2]} 승리 / ${parts[2]} wins!`, tone: 'win'};
  }
  if (tag === 'tie') {
    return {text: '무승부 / Draw', tone: 'win'};
  }
  if (tag === '-weather') {
    if ((parts[2] || '').toLowerCase() === 'none') return {text: '날씨 종료 / Weather cleared.', tone: ''};
    return {text: `날씨 변화 / Weather: ${parts[2]}`, tone: ''};
  }
  if (tag === '-fieldstart' || tag === '-fieldend' || tag === '-sidestart' || tag === '-sideend') {
    return {text: `${parts.slice(2).join(' / ')}`, tone: ''};
  }
  return null;
}

function createInitialSideState(sets, index) {
  const side = sideIdFromIndex(index);
  return {
    id: side,
    name: '',
    activeSlot: 0,
    team: sets.map((set, slot) => ({
      slot,
      nickname: set.name || makeShowdownNickname(set, index, slot),
      species: set.species,
      hp: null,
      maxHp: null,
      status: '',
      fainted: false,
      active: slot === 0,
      terastallized: false,
      teraType: set.teraType || '',
      dynamaxed: false,
      moves: (set.moves || []).map(move => ({name: move, pp: null, disabled: false})),
    })),
  };
}

function updateMonFromCondition(mon, condition) {
  const parsed = parseCondition(condition);
  if (parsed.hp !== null) mon.hp = parsed.hp;
  if (parsed.maxHp !== null) mon.maxHp = parsed.maxHp;
  mon.status = parsed.status || mon.status || '';
  mon.fainted = Boolean(parsed.fainted);
}

export class ShowdownSinglesEngine {
  constructor(config) {
    this.config = config;
    this.stream = null;
    this.readerTask = null;
    this.moduleUrl = '';
    this.snapshot = {
      started: false,
      mode: 'singles',
      turn: 0,
      winner: '',
      weather: '',
      terrain: '',
      trickRoomActive: false,
      sides: {
        p1: createInitialSideState(config.teams[0], 0),
        p2: createInitialSideState(config.teams[1], 1),
      },
      requests: {p1: null, p2: null},
      rawLog: [],
      errors: [],
    };
    this.pendingResolvers = [];
    this.lastError = null;
  }

  async init() {
    const loaded = await loadShowdownBrowserExports();
    this.moduleUrl = loaded.url;
    this.stream = new loaded.BattleStream();
    this.readerTask = this.consume();

    const packedP1 = packShowdownTeam(this.config.teams[0]);
    const packedP2 = packShowdownTeam(this.config.teams[1]);

    this.write(`>start ${JSON.stringify({formatid: 'gen9customgame'})}`);
    this.write(`>player p1 ${JSON.stringify({name: this.config.playerNames[0], team: packedP1})}`);
    this.write(`>player p2 ${JSON.stringify({name: this.config.playerNames[1], team: packedP2})}`);

    await this.waitFor(snapshot => snapshot.turn >= 1 || Boolean(snapshot.winner));
    return {
      moduleUrl: this.moduleUrl,
      snapshot: this.cloneSnapshot(),
    };
  }

  write(command) {
    this.stream.write(command);
  }

  async consume() {
    for await (const chunk of this.stream) {
      this.applyChunk(chunk);
      this.resolveWaiters();
    }
  }

  applyChunk(chunk) {
    const text = String(chunk || '');
    if (!text) return;
    this.snapshot.rawLog.push(text);
    const lines = text.split('\n').map(line => line.trim()).filter(Boolean);
    for (const line of lines) {
      this.applyLine(line);
    }
  }

  applyLine(line) {
    const parts = line.split('|');
    const tag = parts[1] || '';
    if (tag === 'player') {
      const side = parts[2];
      if (this.snapshot.sides[side]) this.snapshot.sides[side].name = parts[3] || this.snapshot.sides[side].name;
      return;
    }
    if (tag === 'turn') {
      this.snapshot.turn = Number(parts[2] || this.snapshot.turn || 0);
      this.snapshot.started = true;
      return;
    }
    if (tag === 'switch' || tag === 'drag') {
      const ident = parseIdent(parts[2]);
      const side = this.snapshot.sides[ident.side];
      if (!side) return;
      const slot = side.team.findIndex(mon => mon.nickname === ident.name);
      if (slot === -1) return;
      side.activeSlot = slot;
      side.team.forEach((mon, index) => { mon.active = index === slot; });
      const mon = side.team[slot];
      mon.species = parseDetailsSpecies(parts[3]) || mon.species;
      updateMonFromCondition(mon, parts[4]);
      return;
    }
    if (tag === '-damage' || tag === '-heal') {
      const ident = parseIdent(parts[2]);
      const mon = this.findMon(ident.side, ident.name);
      if (mon) updateMonFromCondition(mon, parts[3]);
      return;
    }
    if (tag === '-status') {
      const ident = parseIdent(parts[2]);
      const mon = this.findMon(ident.side, ident.name);
      if (mon) mon.status = (parts[3] || '').toLowerCase();
      return;
    }
    if (tag === '-curestatus') {
      const ident = parseIdent(parts[2]);
      const mon = this.findMon(ident.side, ident.name);
      if (mon) mon.status = '';
      return;
    }
    if (tag === 'faint') {
      const ident = parseIdent(parts[2]);
      const mon = this.findMon(ident.side, ident.name);
      if (mon) {
        mon.hp = 0;
        mon.fainted = true;
        mon.active = false;
      }
      return;
    }
    if (tag === '-terastallize') {
      const ident = parseIdent(parts[2]);
      const mon = this.findMon(ident.side, ident.name);
      if (mon) {
        mon.terastallized = true;
        mon.teraType = String(parts[3] || '').toLowerCase();
      }
      return;
    }
    if (tag === '-start' || tag === '-end') {
      const ident = parseIdent(parts[2]);
      const mon = this.findMon(ident.side, ident.name);
      const effect = String(parts[3] || '').toLowerCase();
      if (mon && effect.includes('dynamax')) mon.dynamaxed = tag === '-start';
      return;
    }
    if (tag === '-formechange' || tag === 'detailschange') {
      const ident = parseIdent(parts[2]);
      const mon = this.findMon(ident.side, ident.name);
      if (mon) mon.species = parseDetailsSpecies(parts[3]) || mon.species;
      return;
    }
    if (tag === '-weather') {
      this.snapshot.weather = normalizeWeatherToken(parts[2]);
      return;
    }
    if (tag === '-fieldstart') {
      const effect = String(parts[2] || '');
      if (/trick room/i.test(effect)) this.snapshot.trickRoomActive = true;
      const terrain = normalizeTerrainToken(effect);
      if (terrain) this.snapshot.terrain = terrain;
      return;
    }
    if (tag === '-fieldend') {
      const effect = String(parts[2] || '');
      if (/trick room/i.test(effect)) this.snapshot.trickRoomActive = false;
      const terrain = normalizeTerrainToken(effect);
      if (terrain && this.snapshot.terrain === terrain) this.snapshot.terrain = '';
      return;
    }
    if (tag === 'win') {
      this.snapshot.winner = parts[2] || '';
      return;
    }
    if (tag === 'tie') {
      this.snapshot.winner = 'Draw';
      return;
    }
    if (tag === 'error') {
      const message = parts.slice(2).join('|');
      this.lastError = message;
      this.snapshot.errors.push(message);
      return;
    }
    if (tag === 'request') {
      // Omniscient streams usually omit request lines; this is here for compatibility with package variants.
      return;
    }
  }

  findMon(sideId, nickname) {
    const side = this.snapshot.sides[sideId];
    if (!side) return null;
    return side.team.find(mon => mon.nickname === nickname) || null;
  }

  resolveWaiters() {
    const pending = this.pendingResolvers.splice(0);
    for (const entry of pending) {
      try {
        if (entry.test(this.snapshot, this.lastError)) entry.resolve(this.cloneSnapshot());
        else this.pendingResolvers.push(entry);
      } catch (error) {
        entry.reject(error);
      }
    }
  }

  waitFor(test, timeoutMs = 4000) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingResolvers = this.pendingResolvers.filter(entry => entry !== waiter);
        reject(new Error('Timed out while waiting for simulator output.'));
      }, timeoutMs);
      const waiter = {
        test: (snapshot, lastError) => {
          const done = test(snapshot, lastError);
          if (done) clearTimeout(timeout);
          return done;
        },
        resolve,
        reject: error => {
          clearTimeout(timeout);
          reject(error);
        },
      };
      this.pendingResolvers.push(waiter);
      this.resolveWaiters();
    });
  }

  async submitChoices(choiceMap) {
    const currentTurn = this.snapshot.turn;
    this.lastError = null;
    for (const playerIndex of [0, 1]) {
      const sideId = sideIdFromIndex(playerIndex);
      const command = buildShowdownChoice(choiceMap?.[playerIndex]);
      if (!command) throw new Error(`Missing or incomplete choice for ${sideId}.`);
      this.write(`>${sideId} ${command}`);
    }
    const snapshot = await this.waitFor((nextSnapshot, lastError) => {
      if (lastError) return true;
      if (nextSnapshot.winner) return true;
      return nextSnapshot.turn > currentTurn;
    });
    if (this.lastError) throw new Error(this.lastError);
    return snapshot;
  }

  cloneSnapshot() {
    return JSON.parse(JSON.stringify(this.snapshot));
  }

  getModuleUrl() {
    return this.moduleUrl;
  }
}

export async function createShowdownSinglesEngine({builderTeams, playerNames}) {
  const preparedTeams = [0, 1].map(player => buildShowdownTeamFromBuilderTeam(builderTeams[player], player));
  const engine = new ShowdownSinglesEngine({teams: preparedTeams, playerNames});
  const init = await engine.init();
  return {
    engine,
    preparedTeams,
    moduleUrl: init.moduleUrl,
    snapshot: init.snapshot,
  };
}

export function formatShowdownProtocolLog(line) {
  return protocolLineToLog(line);
}
