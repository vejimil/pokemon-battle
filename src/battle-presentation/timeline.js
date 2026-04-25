/**
 * BattleTimelineExecutor (M3 — Sprint 2b: core presentation, Sprint 3: messages + cries + ability)
 *
 * Consumes the `events` array from a snapshot and plays them sequentially.
 * Sprint 2b: switch_in (pb_rel SE), move_use (move SE), damage (hit SE + HP tween), faint SE.
 * Sprint 3: battle messages (BA-1), Pokémon cries (BA-2), ability bar + weather/terrain (BA-3).
 *
 * Usage:
 *   const executor = new BattleTimelineExecutor({ onInputRequired, onComplete, applySnapshot, scene, initialNames });
 *   await executor.play(snapshot.events);
 *
 * Feature flag: only instantiated when FLAGS.battlePresentationV2 === true.
 */
import { Pokedex } from '../data/pokedex.js';

function toId(str) {
  return String(str || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
}

/** Look up National Dex number for a species display name (e.g. "Charizard-Mega-X" → 6). */
function speciesToDexNum(species) {
  return Pokedex[toId(species)]?.num ?? 0;
}

// BA-22: Korean-only fallback labels (used when locale key not found)
const STATUS_LABELS = {
  brn: '화상에 걸렸다!',
  par: '마비됐다!',
  psn: '독에 걸렸다!',
  tox: '맹독에 걸렸다!',
  slp: '잠들었다!',
  frz: '얼어붙었다!',
};

// BA-22: Showdown status short-id → status-effect namespace key (locale key prefix)
const STATUS_ID_TO_LOCALE_KEY = {
  brn: 'burn',
  par: 'paralysis',
  psn: 'poison',
  tox: 'toxic',
  slp: 'sleep',
  frz: 'freeze',
};

const STAT_LABELS = {
  atk: '공격',
  def: '방어',
  spa: '특수공격',
  spd: '특수방어',
  spe: '스피드',
  acc: '명중',
  eva: '회피',
};

// BA-22: English stat display names for locale interpolation
const STAT_LABELS_EN = {
  atk: 'Attack',
  def: 'Defense',
  spa: 'Sp. Atk',
  spd: 'Sp. Def',
  spe: 'Speed',
  acc: 'Accuracy',
  eva: 'Evasion',
};

const STAT_ID_ALIASES = Object.freeze({
  attack: 'atk',
  atk: 'atk',
  defense: 'def',
  def: 'def',
  specialattack: 'spa',
  spattack: 'spa',
  spatk: 'spa',
  spa: 'spa',
  specialdefense: 'spd',
  spdefense: 'spd',
  spdef: 'spd',
  spd: 'spd',
  speed: 'spe',
  spe: 'spe',
  accuracy: 'acc',
  acc: 'acc',
  evasion: 'eva',
  eva: 'eva',
});

function normalizeStatId(raw = '') {
  const key = toId(raw);
  return STAT_ID_ALIASES[key] || key;
}

const WEATHER_LABELS = {
  raindance:     '비가 내리기 시작했다!',
  rain:          '비가 내리기 시작했다!',
  primordialsea: '폭우가 쏟아지기 시작했다!',
  sunnyday:      '날씨가 맑아졌다!',
  sun:           '날씨가 맑아졌다!',
  desolateland:  '강렬한 햇빛이 내리쬐기 시작했다!',
  sandstorm:     '모래바람이 불기 시작했다!',
  sand:          '모래바람이 불기 시작했다!',
  hail:          '싸라기눈이 내리기 시작했다!',
  snow:          '눈이 내리기 시작했다!',
  snowscape:     '눈이 내리기 시작했다!',
  deltastream:   '이상한 기류가 발생했다!',
};

const TERRAIN_LABELS = {
  electricterrain: '전기 필드가 펼쳐졌다!',
  grassyterrain:   '풀 필드가 펼쳐졌다!',
  mistyterrain:    '미스트 필드가 펼쳐졌다!',
  psychicterrain:  '사이코 필드가 펼쳐졌다!',
};

const WEATHER_START_KEYS = {
  raindance: 'rainStartMessage',
  rain: 'rainStartMessage',
  primordialsea: 'heavyRainStartMessage',
  sunnyday: 'sunnyStartMessage',
  sun: 'sunnyStartMessage',
  desolateland: 'harshSunStartMessage',
  sandstorm: 'sandstormStartMessage',
  sand: 'sandstormStartMessage',
  hail: 'hailStartMessage',
  snow: 'snowStartMessage',
  snowscape: 'snowStartMessage',
  deltastream: 'strongWindsStartMessage',
};

const WEATHER_LAPSE_KEYS = {
  raindance: 'rainLapseMessage',
  rain: 'rainLapseMessage',
  primordialsea: 'heavyRainLapseMessage',
  sunnyday: 'sunnyLapseMessage',
  sun: 'sunnyLapseMessage',
  desolateland: 'harshSunLapseMessage',
  sandstorm: 'sandstormLapseMessage',
  sand: 'sandstormLapseMessage',
  hail: 'hailLapseMessage',
  snow: 'snowLapseMessage',
  snowscape: 'snowLapseMessage',
  deltastream: 'strongWindsLapseMessage',
};

const WEATHER_CLEAR_KEYS = {
  raindance: 'rainClearMessage',
  rain: 'rainClearMessage',
  primordialsea: 'heavyRainClearMessage',
  sunnyday: 'sunnyClearMessage',
  sun: 'sunnyClearMessage',
  desolateland: 'harshSunClearMessage',
  sandstorm: 'sandstormClearMessage',
  sand: 'sandstormClearMessage',
  hail: 'hailClearMessage',
  snow: 'snowClearMessage',
  snowscape: 'snowClearMessage',
  deltastream: 'strongWindsClearMessage',
};

const WEATHER_COMMON_ANIMS = {
  raindance: 'common-rain',
  rain: 'common-rain',
  primordialsea: 'common-heavy-rain',
  sunnyday: 'common-sunny',
  sun: 'common-sunny',
  desolateland: 'common-harsh-sun',
  sandstorm: 'common-sandstorm',
  sand: 'common-sandstorm',
  hail: 'common-hail',
  snow: 'common-snow',
  snowscape: 'common-snow',
  deltastream: 'common-strong-winds',
};
const WEATHER_COMMON_ANIM_SCALE = 1.0;

const WEATHER_DAMAGE_IDS = new Set(['sandstorm', 'sand', 'hail']);

const TERRAIN_START_KEYS = {
  electricterrain: 'electricStartMessage',
  grassyterrain: 'grassyStartMessage',
  mistyterrain: 'mistyStartMessage',
  psychicterrain: 'psychicStartMessage',
};

const TERRAIN_CLEAR_KEYS = {
  electricterrain: 'electricClearMessage',
  grassyterrain: 'grassyClearMessage',
  mistyterrain: 'mistyClearMessage',
  psychicterrain: 'psychicClearMessage',
};

const TERRAIN_COMMON_ANIMS = {
  electricterrain: 'common-electric-terrain',
  grassyterrain: 'common-grassy-terrain',
  mistyterrain: 'common-misty-terrain',
  psychicterrain: 'common-psychic-terrain',
};

const SIDE_EFFECT_KEY_PREFIX = {
  mist: 'mist',
  reflect: 'reflect',
  lightscreen: 'lightScreen',
  auroraveil: 'auroraVeil',
  luckychant: 'noCrit',
  spikes: 'spikes',
  stealthrock: 'stealthRock',
  toxicspikes: 'toxicSpikes',
  stickyweb: 'stickyWeb',
  tailwind: 'tailwind',
  safeguard: 'safeguard',
  firepledge: 'fireGrassPledge',
  grasspledge: 'grassWaterPledge',
  waterpledge: 'waterFirePledge',
  gmaxwildfire: 'fireGrassPledge',
  gmaxvinelash: 'grassWaterPledge',
  gmaxcannonade: 'waterFirePledge',
  gmaxsteelsurge: 'stealthRock',
};

const DAMAGE_SOURCE_MESSAGE_KEY = {
  stealthrock: 'stealthRockActivateTrap',
  spikes: 'spikesActivateTrap',
};

const WEATHER_DAMAGE_MESSAGE_KEY = {
  sandstorm: 'sandstormDamageMessage',
  hail: 'hailDamageMessage',
};

const WEATHER_DAMAGE_ANIMS = {
  sandstorm: 'common-sandstorm',
  hail: 'common-hail',
};

const ITEM_SOURCE_NAME_FALLBACK = {
  leftovers: 'Leftovers',
  lifeorb: 'Life Orb',
  blacksludge: 'Black Sludge',
  shellbell: 'Shell Bell',
  rockyhelmet: 'Rocky Helmet',
  stickybarb: 'Sticky Barb',
};

const Z_MOVE_TINT_BY_TYPE = {
  normal: 0xf5f2d0,
  fire: 0xff9b54,
  water: 0x6fb4ff,
  electric: 0xffde4b,
  grass: 0x79d86b,
  ice: 0xaee9ff,
  fighting: 0xff8d6a,
  poison: 0xc37bff,
  ground: 0xd8b66a,
  flying: 0xb8d7ff,
  psychic: 0xff7db8,
  bug: 0xb9d96b,
  rock: 0xc4a06a,
  ghost: 0x9f87ff,
  dragon: 0x7f8dff,
  dark: 0x8d7c70,
  steel: 0xc8d4e4,
  fairy: 0xffb0dd,
};

const PROTECT_BLOCK_EFFECT_IDS = new Set([
  'protect',
  'detect',
  'kingsshield',
  'spikyshield',
  'banefulbunker',
  'obstruct',
  'silktrap',
  'burningbulwark',
  'maxguard',
  'matblock',
  'quickguard',
  'wideguard',
  'craftyshield',
]);

const EVENT_GAP_SHORT_MS = 120;
const EVENT_GAP_MEDIUM_MS = 170;

export class BattleTimelineExecutor {
  /**
   * @param {object} opts
   * @param {function(string): void}   [opts.onInputRequired]  called when request_gate fires
   * @param {function(): void}         [opts.onComplete]       called when all events are played
   * @param {function(): void}         [opts.applySnapshot]    called by fastForward to apply final state
   * @param {function(): object}       [opts.scene]            getter returning current Phaser scene (may be null)
   * @param {string}                   [opts.playerSide]       Showdown side id for local player ('p1'|'p2')
   * @param {Record<string, string>}   [opts.initialNames]     pre-seeded slot→species map (key: "p1_0", "p2_0")
   * @param {Record<string, object>}   [opts.initialSlotInfo]  pre-seeded slot→battle-info map
   * @param {function(object): object} [opts.resolveVisualState] resolve sprite/info patch for an event
   * @param {object}                   [opts.localeManager]    locale namespace manager
   * @param {string}                   [opts.localeLanguage]   locale language id ('ko'|'en')
   * @param {boolean}                  [opts.audioEnabled]     play timeline audio for this executor
   * @param {function(string): string} [opts.localizeMonName]  translate English species name → display name
   * @param {function(string): string} [opts.localizeMonNameWithForm] translate English species name → form-aware display name
   * @param {function(string): string} [opts.localizeMoveName] translate English move name → display name
   * @param {function(string): string} [opts.localizeAbilityName] translate English ability name → display name
   * @param {{p1?: string, p2?: string}} [opts.sideNames] side id → trainer name mapping
   */
  constructor({
    onInputRequired,
    onComplete,
    applySnapshot,
    scene,
    playerSide,
    initialNames,
    initialSlotInfo,
    resolveVisualState,
    localeManager,
    localeLanguage = 'ko',
    audioEnabled = true,
    localizeMonName,
    localizeMonNameWithForm,
    localizeMoveName,
    localizeAbilityName,
    sideNames,
  } = {}) {
    this.onInputRequired = onInputRequired ?? (() => {});
    this.onComplete = onComplete ?? (() => {});
    this._applySnapshot = applySnapshot ?? (() => {});
    this._scene = scene ?? (() => null);
    this._playerSide = playerSide ?? 'p1';
    this._audioEnabled = audioEnabled !== false;
    this._resolveVisualState = resolveVisualState ?? (() => null);
    this._localeManager = localeManager ?? null;
    this._localeLanguage = String(localeLanguage || 'ko');
    this._localizeMonName = typeof localizeMonName === 'function' ? localizeMonName : (n => String(n || ''));
    this._localizeMonNameWithForm = typeof localizeMonNameWithForm === 'function'
      ? localizeMonNameWithForm
      : this._localizeMonName;
    this._localizeMoveName = typeof localizeMoveName === 'function' ? localizeMoveName : (n => String(n || ''));
    this._localizeAbilityName = typeof localizeAbilityName === 'function' ? localizeAbilityName : (n => String(n || ''));
    this._sideNames = {
      p1: String(sideNames?.p1 || 'Player 1'),
      p2: String(sideNames?.p2 || 'Player 2'),
    };
    this.running = false;
    // Tracks species name per slot. Key: "${side}_${slot}" e.g. "p1_0", "p2_0".
    // Pre-seeded from initialNames (previous turn's final roster).
    this._slotNames = new Map(Object.entries(initialNames ?? {}));
    // Tracks live battle-info state (name/hp/status/etc) per side+slot during timeline playback.
    this._slotInfo = new Map(Object.entries(initialSlotInfo ?? {}));
    // Tracks latest terastallize sequence by side+slot.
    this._recentTerastallizeBySlot = new Map();
    // Forme-change seq values already absorbed by preceding terastallize handling.
    this._consumedTerastallizeFormSeqs = new Set();
    this._activeWeatherId = '';
    this._activeTerrainId = '';
    this._lastWeatherStartTurn = null;
    this._pendingBattleEndEvent = null;
  }

  // ── accessors ─────────────────────────────────────────────────────────────

  get _audio() { return this._scene()?.audio ?? null; }
  get _ui()    { return this._scene()?.ui    ?? null; }
  /** Returns the BattleMessageUiHandler for direct text updates. */
  get _msg()   { return this._ui?.getMessageHandler?.() ?? null; }

  /** Returns the BattleInfo panel for the given Showdown side id ('p1'|'p2'). */
  _infoForSide(side) {
    return this._infoForSideSlot(side, 0);
  }

  /**
   * Returns the BattleInfo panel for the given Showdown side and slot.
   * Doubles UI exposes per-slot arrays (`enemyInfos`/`playerInfos`); singles UI
   * exposes only the legacy single instance, which is mapped to slot 0.
   */
  _infoForSideSlot(side, slot = 0) {
    const ui = this._ui;
    if (!ui) return null;
    const idx = Number(slot) === 1 ? 1 : 0;
    if (side === this._playerSide) {
      const arr = Array.isArray(ui.playerInfos) ? ui.playerInfos : null;
      if (arr) return arr[idx] || arr[0] || null;
      return ui.playerInfo || null;
    }
    const arr = Array.isArray(ui.enemyInfos) ? ui.enemyInfos : null;
    if (arr) return arr[idx] || arr[0] || null;
    return ui.enemyInfo || null;
  }

  _delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  _estimateMessageHoldMs(text, { minMs = 0 } = {}) {
    const source = String(text || '');
    const compact = source.replace(/\s+/g, ' ').trim();
    const charCount = compact.length;
    const lineCount = Math.max(1, source.split(/\n|\$/g).filter(Boolean).length);
    const punctuationWeight = (compact.match(/[!?…。]/g) || []).length * 60;
    const raw = (charCount * 25) + (lineCount * 125) + punctuationWeight;
    const bounded = Math.max(340, Math.min(1800, raw || 0));
    return Math.max(minMs, bounded);
  }

  _playAudio(key) {
    if (!this._audioEnabled || !key) return;
    this._audio?.play?.(key);
  }

  _eventGapMs(eventType = '') {
    switch (eventType) {
      case 'turn_start':
      case 'turn_end':
      case 'weather_tick':
      case 'raw_event':
      case 'engine_error':
      case 'effect_activate':
      case 'effect_start':
      case 'effect_end':
      case 'single_turn_effect':
      case 'status_cure':
      case 'callback_event':
      case 'battle_end':
        return 0;
      case 'switch_in':
      case 'dynamax_start':
      case 'dynamax_end':
      case 'move_use':
      case 'damage':
      case 'heal':
      case 'terastallize':
      case 'faint':
      case 'forme_change':
        return EVENT_GAP_MEDIUM_MS;
      default:
        return EVENT_GAP_SHORT_MS;
    }
  }

  _playHitByResult(result) {
    if (!this._audioEnabled) return;
    this._audio?.playHitByResult?.(result);
  }

  async _playCryByNum(dexNum) {
    if (!this._audioEnabled || !dexNum) return;
    await this._audio?.playCryByNum?.(dexNum);
  }

  async _playMoveSe(moveName) {
    if (!this._audioEnabled || !moveName) return;
    await this._audio?.playMoveSe?.(moveName);
  }

  /**
   * Display a battle message and wait until its presentation window is complete.
   * In auto mode we wait by callbackDelay; if UI callback is skipped, safety timeout resolves.
   */
  _showMsg(text, { minMs = 0 } = {}) {
    const normalized = String(text || '');
    const message = this._msg;
    if (!message?.showText) {
      return this._delay(this._estimateMessageHoldMs(normalized, { minMs }));
    }
    const holdMs = this._estimateMessageHoldMs(normalized, { minMs });
    return new Promise(resolve => {
      let settled = false;
      const done = () => {
        if (settled) return;
        settled = true;
        clearTimeout(safetyTimer);
        resolve();
      };
      const safetyTimer = setTimeout(done, holdMs + 800);
      try {
        message.showText(normalized, null, done, holdMs, false);
      } catch (_error) {
        done();
      }
    });
  }

  _t(namespace, key, vars = {}, fallback = '') {
    const manager = this._localeManager;
    if (manager?.t) {
      const localized = manager.t(namespace, key, vars, {
        language: this._localeLanguage,
        fallback,
      });
      if (localized != null && String(localized).length) return String(localized);
    }
    return String(fallback || key || '');
  }

  _hasLocaleKey(namespace, key) {
    const manager = this._localeManager;
    if (!manager?.has) return false;
    try {
      return manager.has(namespace, key, { language: this._localeLanguage });
    } catch (_error) {
      return false;
    }
  }

  _isEnglishLocale() {
    return toId(this._localeLanguage).startsWith('en');
  }

  _pokemonNameWithAffix(name, side) {
    const pokemonName = String(name || '???');
    if (side === this._playerSide) return pokemonName;
    const fallback = this._isEnglishLocale() ? `Foe ${pokemonName}` : `상대 ${pokemonName}`;
    return this._t('battle', 'foePokemonWithAffix', { pokemonName }, fallback);
  }

  _sideName(side) {
    return String(this._sideNames?.[side] || (side === 'p2' ? 'Player 2' : 'Player 1'));
  }

  _isInitialSummonSequence(events = []) {
    if (!Array.isArray(events) || events.length === 0) return false;
    const switchSides = new Set();
    for (const ev of events) {
      if (!ev?.type) continue;
      if (ev.type === 'turn_end') return false;
      if (ev.type === 'switch_in' && (ev.side === 'p1' || ev.side === 'p2')) {
        switchSides.add(ev.side);
        continue;
      }
      if (
        ev.type === 'move_use'
        || ev.type === 'damage'
        || ev.type === 'heal'
        || ev.type === 'faint'
        || ev.type === 'battle_end'
        || ev.type === 'callback_event'
      ) {
        return false;
      }
    }
    return switchSides.size >= 2;
  }

  _battleIntroMessage() {
    const opponentSide = this._playerSide === 'p2' ? 'p1' : 'p2';
    const trainerName = this._sideName(opponentSide);
    const fallback = this._isEnglishLocale()
      ? `${trainerName} wants to battle!`
      : `${trainerName}이 승부를 걸어왔다!`;
    return this._t('battle', 'battleStartChallenge', { trainerName }, fallback);
  }

  _switchInMessage(side, species) {
    const pokemonName = String(species || '???');
    if (side === this._playerSide) {
      return this._t('battle', 'playerGo', { pokemonName }, `가라! ${pokemonName}!`);
    }
    const trainerName = this._isEnglishLocale() ? 'Opponent' : '상대';
    return this._t('battle', 'trainerGo', { trainerName, pokemonName }, `상대의 ${pokemonName} 등장!`);
  }

  _switchOutMessage(side, species) {
    const pokemonName = String(species || '???');
    if (side === this._playerSide) {
      return this._isEnglishLocale()
        ? `Come back, ${pokemonName}!`
        : `들어와! ${pokemonName}!`;
    }
    const trainerName = this._isEnglishLocale() ? 'Opponent' : '상대';
    return this._isEnglishLocale()
      ? `${trainerName} withdrew ${pokemonName}!`
      : `${trainerName}는 ${pokemonName}을(를) 불러들였다!`;
  }

  _weatherStartMessage(weatherId, rawWeather) {
    const key = WEATHER_START_KEYS[weatherId];
    if (key) return this._t('weather', key, {}, WEATHER_LABELS[weatherId] || '');
    return this._isEnglishLocale()
      ? `Weather changed: ${rawWeather || weatherId}`
      : `날씨 변화: ${rawWeather || weatherId}`;
  }

  _weatherLapseMessage(weatherId, rawWeather = '') {
    const key = WEATHER_LAPSE_KEYS[weatherId];
    if (key) return this._t('weather', key, {}, WEATHER_LABELS[weatherId] || '');
    return this._isEnglishLocale()
      ? `The weather continues: ${rawWeather || weatherId}`
      : `날씨가 계속된다: ${rawWeather || weatherId}`;
  }

  _weatherClearMessage(weatherId) {
    const key = WEATHER_CLEAR_KEYS[weatherId];
    if (key) {
      return this._t(
        'weather',
        key,
        {},
        this._isEnglishLocale() ? 'The weather returned to normal.' : '날씨가 원래대로 돌아왔다.',
      );
    }
    return this._isEnglishLocale() ? 'The weather returned to normal.' : '날씨가 원래대로 돌아왔다.';
  }

  _weatherCommonAnimName(weatherId) {
    return WEATHER_COMMON_ANIMS[toId(weatherId)] || '';
  }

  _terrainStartMessage(terrainId, effectLabel = '') {
    const key = TERRAIN_START_KEYS[terrainId];
    if (key) return this._t('terrain', key, {}, TERRAIN_LABELS[terrainId] || '');
    return this._isEnglishLocale()
      ? `Field effect started: ${effectLabel || terrainId}`
      : `필드 효과 시작: ${effectLabel || terrainId}`;
  }

  _terrainClearMessage(terrainId) {
    const key = TERRAIN_CLEAR_KEYS[terrainId];
    if (key) {
      return this._t(
        'terrain',
        key,
        {},
        this._isEnglishLocale() ? 'The terrain disappeared.' : '필드 효과가 사라졌다.',
      );
    }
    return this._isEnglishLocale() ? 'The terrain disappeared.' : '필드 효과가 사라졌다.';
  }

  _terrainCommonAnimName(terrainId) {
    return TERRAIN_COMMON_ANIMS[toId(terrainId)] || '';
  }

  _normalizeTerrainId(rawTerrain = '') {
    const raw = String(rawTerrain || '').trim();
    if (!raw) return '';
    return toId(raw.replace(/^move:\s*/i, ''));
  }

  async _playFieldAnim(animName, options = {}) {
    const scene = this._scene();
    if (!scene?.playFieldAnim || !animName) return;
    const ANIM_TIMEOUT_MS = 5000;
    await Promise.race([
      scene.playFieldAnim(animName, {
        audioEnabled: this._audioEnabled,
        scale: Number.isFinite(Number(options?.scale)) ? Number(options.scale) : 1,
      }),
      new Promise(resolve => setTimeout(resolve, ANIM_TIMEOUT_MS)),
    ]);
  }

  _normalizeSideEffectId(effect) {
    const raw = String(effect || '').trim();
    if (!raw) return '';
    const trimmed = raw.replace(/^move:\s*/i, '');
    return toId(trimmed);
  }

  _sideLabel(side) {
    if (side === this._playerSide) {
      return this._isEnglishLocale() ? 'Your' : '우리 편';
    }
    return this._isEnglishLocale() ? 'Foe' : '상대';
  }

  _sideConditionMessage(ev, kind = 'start') {
    const effectRaw = String(ev?.effect || '').trim();
    const side = ev?.side;
    const effectId = this._normalizeSideEffectId(effectRaw);
    const prefix = SIDE_EFFECT_KEY_PREFIX[effectId];
    if (prefix) {
      const opKey = kind === 'start' ? 'OnAdd' : 'OnRemove';
      const sideSuffix = side === this._playerSide ? 'Player' : 'Enemy';
      const candidates = [`${prefix}${opKey}${sideSuffix}`, `${prefix}${opKey}`];
      for (const key of candidates) {
        if (!this._hasLocaleKey('arena-tag', key)) continue;
        return this._t('arena-tag', key, {}, '');
      }
    }
    if (!effectRaw) return '';
    const sideLabel = this._sideLabel(side);
    if (this._isEnglishLocale()) {
      return kind === 'start'
        ? `${sideLabel} side effect started: ${effectRaw}`
        : `${sideLabel} side effect ended: ${effectRaw}`;
    }
    return kind === 'start'
      ? `${sideLabel} 진영 효과 시작: ${effectRaw}`
      : `${sideLabel} 진영 효과 종료: ${effectRaw}`;
  }

  _damageSourceMessage(ev = {}) {
    const sourceId = toId(ev?.fromEffectId || '');
    const weatherDamageKey = WEATHER_DAMAGE_MESSAGE_KEY[sourceId];
    const targetSide = ev?.target?.side;
    const targetName = this._slotName(targetSide, ev?.target?.slot ?? 0);
    const pokemonNameWithAffix = this._pokemonNameWithAffix(targetName, targetSide);
    if (weatherDamageKey) {
      const fallback = sourceId === 'sandstorm'
        ? this._isEnglishLocale()
          ? `${pokemonNameWithAffix} is buffeted\nby the sandstorm!`
          : `모래바람이\n${pokemonNameWithAffix}를 덮쳤다!`
        : this._isEnglishLocale()
          ? `${pokemonNameWithAffix} is pelted\nby the hail!`
          : `싸라기눈이\n${pokemonNameWithAffix}를 덮쳤다!`;
      return this._t('weather', weatherDamageKey, { pokemonNameWithAffix }, fallback);
    }
    const key = DAMAGE_SOURCE_MESSAGE_KEY[sourceId];
    if (!key) return '';
    const fallback = sourceId === 'stealthrock'
      ? this._isEnglishLocale()
        ? `Pointed stones dug into\n${pokemonNameWithAffix}!`
        : `${pokemonNameWithAffix}에게\n뾰족한 바위가 박혔다!`
      : sourceId === 'spikes'
        ? this._isEnglishLocale()
          ? `${pokemonNameWithAffix} was hurt\nby the spikes!`
          : `${pokemonNameWithAffix}은(는)\n압정뿌리기의 데미지를 입었다!`
        : '';
    return this._t('arena-tag', key, { pokemonNameWithAffix }, fallback);
  }

  _itemSourceLabel(ev = {}) {
    const fromSource = String(ev?.fromSource || '').trim();
    if (/^item\s*:/i.test(fromSource)) {
      return fromSource.replace(/^item\s*:/i, '').trim();
    }
    const itemId = toId(ev?.fromEffectId || '');
    return ITEM_SOURCE_NAME_FALLBACK[itemId] || itemId;
  }

  _itemSourceMessage(ev = {}, kind = 'damage') {
    if (ev?.fromKind !== 'item') return '';
    const itemId = toId(ev?.fromEffectId || '');
    if (!itemId) return '';
    const targetSide = ev?.target?.side;
    const targetName = this._slotName(targetSide, ev?.target?.slot ?? 0);
    const pokemonNameWithAffix = this._pokemonNameWithAffix(targetName, targetSide);
    const itemLabel = this._itemSourceLabel(ev);

    if (kind === 'heal') {
      if (itemId === 'leftovers') {
        return this._isEnglishLocale()
          ? `${pokemonNameWithAffix} restored HP\nusing its Leftovers!`
          : `${pokemonNameWithAffix}은(는)\n먹다남은음식으로 HP를 회복했다!`;
      }
      if (itemId === 'blacksludge') {
        return this._isEnglishLocale()
          ? `${pokemonNameWithAffix} restored HP\nwith Black Sludge!`
          : `${pokemonNameWithAffix}은(는)\n검은진흙으로 HP를 회복했다!`;
      }
      if (itemId === 'shellbell') {
        return this._isEnglishLocale()
          ? `${pokemonNameWithAffix} restored HP\nwith its Shell Bell!`
          : `${pokemonNameWithAffix}은(는)\n조개껍질방울로 HP를 회복했다!`;
      }
      return this._isEnglishLocale()
        ? `${pokemonNameWithAffix} restored HP\nfrom ${itemLabel}!`
        : `${pokemonNameWithAffix}은(는)\n${itemLabel} 효과로 HP를 회복했다!`;
    }

    if (itemId === 'lifeorb') {
      return this._isEnglishLocale()
        ? `${pokemonNameWithAffix} was hurt\nby its Life Orb!`
        : `${pokemonNameWithAffix}은(는)\n생명의구슬의 반동을 받았다!`;
    }
    if (itemId === 'blacksludge') {
      return this._isEnglishLocale()
        ? `${pokemonNameWithAffix} was hurt\nby Black Sludge!`
        : `${pokemonNameWithAffix}은(는)\n검은진흙 때문에 데미지를 입었다!`;
    }
    if (itemId === 'rockyhelmet') {
      return this._isEnglishLocale()
        ? `${pokemonNameWithAffix} was hurt\nby Rocky Helmet!`
        : `${pokemonNameWithAffix}은(는)\n울퉁불퉁멧에 데미지를 입었다!`;
    }
    if (itemId === 'stickybarb') {
      return this._isEnglishLocale()
        ? `${pokemonNameWithAffix} was hurt\nby Sticky Barb!`
        : `${pokemonNameWithAffix}은(는)\n끈적바늘에 데미지를 입었다!`;
    }
    return this._isEnglishLocale()
      ? `${pokemonNameWithAffix} was hurt\nby ${itemLabel}!`
      : `${pokemonNameWithAffix}은(는)\n${itemLabel} 때문에 데미지를 입었다!`;
  }

  _resetFieldVisualStateForBattleEnd() {
    this._activeWeatherId = '';
    this._activeTerrainId = '';
    this._lastWeatherStartTurn = null;
    this._scene()?.clearPersistentTerrainBackground?.();
  }

  async _flushPendingBattleEndMessage() {
    const pending = this._pendingBattleEndEvent;
    this._pendingBattleEndEvent = null;
    const winnerText = String(pending?.winner || '').trim();
    if (!winnerText || /^\d+$/.test(winnerText)) return;
    const winFallback = this._isEnglishLocale()
      ? `${winnerText} wins!`
      : `${winnerText} 승리!`;
    await this._showMsg(
      this._t('battle', 'winnerMessage', { winner: winnerText }, winFallback),
      { minMs: 1300 },
    );
    this._playAudio('se/level_up');
  }

  _weatherDamageAnimName(effectId = '') {
    return WEATHER_DAMAGE_ANIMS[toId(effectId)] || '';
  }

  _zMoveTint(typeId = '') {
    return Z_MOVE_TINT_BY_TYPE[toId(typeId)] || 0xffffff;
  }

  _sameSideSlot(a = null, b = null) {
    if (!a || !b) return false;
    const aSide = a.side;
    const bSide = b.side;
    const aSlot = Number.isInteger(a.slot) ? a.slot : 0;
    const bSlot = Number.isInteger(b.slot) ? b.slot : 0;
    return Boolean(aSide && bSide && aSide === bSide && aSlot === bSlot);
  }

  _isProtectLikeEffect(effectId = '') {
    return PROTECT_BLOCK_EFFECT_IDS.has(toId(effectId));
  }

  _scanMoveOutcome(events = [], index = 0, moveEvent = {}) {
    const actorRef = moveEvent?.actor ? {
      side: moveEvent.actor.side,
      slot: Number.isInteger(moveEvent.actor.slot) ? moveEvent.actor.slot : 0,
    } : null;
    const targetRef = moveEvent?.target?.side ? {
      side: moveEvent.target.side,
      slot: Number.isInteger(moveEvent.target.slot) ? moveEvent.target.slot : 0,
    } : null;
    const result = {
      skipAnimation: false,
      blocked: false,
      miss: false,
      immune: false,
      failed: false,
    };
    if (!actorRef || !Array.isArray(events) || index < 0) return result;
    const moveId = toId(moveEvent?.move || moveEvent?.animationMove || moveEvent?.baseMove || '');
    const moveIsProtectLike = this._isProtectLikeEffect(moveId);
    const end = Math.min(events.length, index + 10);
    for (let cursor = index + 1; cursor < end; cursor += 1) {
      const next = events[cursor];
      if (!next) continue;
      if (
        next.type === 'move_use'
        || next.type === 'switch_in'
        || next.type === 'turn_start'
        || next.type === 'turn_end'
        || next.type === 'battle_end'
        || next.type === 'callback_event'
      ) {
        break;
      }
      if (next.type === 'miss') {
        const missActor = next.actor || next.target;
        if (!this._sameSideSlot(missActor, actorRef)) continue;
        result.miss = true;
        result.skipAnimation = true;
        break;
      }
      if (next.type === 'immune') {
        if (targetRef && next.target && !this._sameSideSlot(next.target, targetRef)) continue;
        result.immune = true;
        result.skipAnimation = true;
        break;
      }
      if (next.type === 'move_fail') {
        const failActor = next.actor || null;
        const actorMatched = failActor ? this._sameSideSlot(failActor, actorRef) : false;
        const targetMatched = Boolean(failActor && targetRef && this._sameSideSlot(failActor, targetRef));
        if (failActor && !actorMatched && !targetMatched) continue;
        result.failed = true;
        result.skipAnimation = true;
        break;
      }
      if (next.type === 'effect_activate' || next.type === 'single_turn_effect') {
        if (moveIsProtectLike) continue;
        const effectId = toId(next.effectId || next.effect || '');
        if (!this._isProtectLikeEffect(effectId)) continue;
        if (targetRef && next.target && !this._sameSideSlot(next.target, targetRef)) continue;
        result.blocked = true;
        result.skipAnimation = true;
        break;
      }
    }
    return result;
  }

  _effectActivateMessage(ev = {}, kind = 'activate') {
    const effectId = toId(ev.effectId || ev.effect || '');
    if (!this._isProtectLikeEffect(effectId)) return '';
    const targetName = this._slotName(ev.target?.side, ev.target?.slot ?? 0);
    const targetNameWithAffix = this._pokemonNameWithAffix(targetName, ev.target?.side);
    const localeKey = kind === 'single_turn' ? 'protectedOnAdd' : 'protectedLapse';
    const fallback = this._isEnglishLocale()
      ? `${targetNameWithAffix} protected itself!`
      : kind === 'single_turn'
        ? `${targetNameWithAffix}은(는)\n방어 태세에 들어갔다!`
        : `${targetNameWithAffix}은(는)\n공격으로부터 몸을 지켰다!`;
    return this._t(
      'battler-tags',
      localeKey,
      { pokemonNameWithAffix: targetNameWithAffix },
      fallback,
    );
  }

  _cantMoveMessage(ev = {}) {
    const side = ev?.actor?.side;
    const slot = ev?.actor?.slot ?? 0;
    const pokemonName = this._slotName(side, slot);
    const pokemonNameWithAffix = this._pokemonNameWithAffix(pokemonName, side);
    const reasonId = toId(ev?.reasonId || ev?.reason || '');

    if (reasonId === 'par' || reasonId === 'paralysis') {
      return this._isEnglishLocale()
        ? `${pokemonNameWithAffix} is paralyzed!\nIt can't move!`
        : `${pokemonNameWithAffix}은(는)\n마비에 걸려 움직일 수 없다!`;
    }
    if (reasonId === 'flinch') {
      return this._isEnglishLocale()
        ? `${pokemonNameWithAffix} flinched!\nIt couldn't move!`
        : `${pokemonNameWithAffix}은(는)\n풀죽어서 움직일 수 없었다!`;
    }
    if (reasonId === 'slp' || reasonId === 'sleep') {
      return this._isEnglishLocale()
        ? `${pokemonNameWithAffix} is fast asleep.`
        : `${pokemonNameWithAffix}은(는)\n잠들어 있어서 움직일 수 없다.`;
    }
    if (reasonId === 'frz' || reasonId === 'freeze') {
      return this._isEnglishLocale()
        ? `${pokemonNameWithAffix} is frozen solid!`
        : `${pokemonNameWithAffix}은(는)\n얼어붙어서 움직일 수 없다!`;
    }
    if (reasonId === 'recharge') {
      return this._isEnglishLocale()
        ? `${pokemonNameWithAffix} must recharge!`
        : `${pokemonNameWithAffix}은(는)\n반동으로 움직일 수 없다!`;
    }

    const reasonText = String(ev?.reason || '').trim();
    if (reasonText && !/^(par|slp|frz|flinch|recharge)$/i.test(reasonText)) {
      return this._isEnglishLocale()
        ? `${pokemonNameWithAffix} can't move (${reasonText}).`
        : `${pokemonNameWithAffix}은(는)\n움직일 수 없다 (${reasonText}).`;
    }

    return this._isEnglishLocale()
      ? `${pokemonNameWithAffix} can't move!`
      : `${pokemonNameWithAffix}은(는)\n움직일 수 없다.`;
  }

  _substituteSpriteUrlForSide(side) {
    if (!side) return '';
    return side === this._playerSide
      ? './assets/system/pokemon/substitute_back.png'
      : './assets/system/pokemon/substitute.png';
  }

  /** Get the tracked species name for a side+slot, localized for display. */
  _slotName(side, slot = 0) {
    const rawName = this._slotNames.get(`${side}_${slot}`) || '???';
    return this._localizeMonName(rawName) || rawName;
  }

  /** Get the raw English species name without localization (for internal logic). */
  _slotNameRaw(side, slot = 0) {
    return this._slotNames.get(`${side}_${slot}`) || '???';
  }

  _slotKey(side, slot = 0) {
    return `${side}_${slot}`;
  }

  _markRecentTerastallize(side, slot = 0, ev = {}) {
    if (!side) return;
    this._recentTerastallizeBySlot.set(this._slotKey(side, slot), {
      turn: Number.isInteger(ev?.turn) ? ev.turn : null,
      seq: Number.isFinite(Number(ev?.seq)) ? Number(ev.seq) : null,
    });
  }

  _isLinkedTerastallizeFormPair(teraEv = {}, formEv = {}) {
    if (teraEv?.type !== 'terastallize' || formEv?.type !== 'forme_change') return false;
    const teraSide = teraEv?.target?.side;
    const teraSlot = teraEv?.target?.slot ?? 0;
    const formSide = formEv?.target?.side;
    const formSlot = formEv?.target?.slot ?? 0;
    if (!teraSide || teraSide !== formSide || Number(teraSlot) !== Number(formSlot)) return false;
    const teraTurn = Number.isInteger(teraEv?.turn) ? teraEv.turn : null;
    const formTurn = Number.isInteger(formEv?.turn) ? formEv.turn : null;
    if (teraTurn != null && formTurn != null && teraTurn !== formTurn) return false;
    const teraSeq = Number.isFinite(Number(teraEv?.seq)) ? Number(teraEv.seq) : null;
    const formSeq = Number.isFinite(Number(formEv?.seq)) ? Number(formEv.seq) : null;
    if (teraSeq != null && formSeq != null) {
      if (formSeq <= teraSeq) return false;
      if (formSeq - teraSeq > 6) return false;
    }
    return true;
  }

  _isTerastallizeLinkedFormChange(ev = {}) {
    if (ev?.type !== 'forme_change') return false;
    const side = ev?.target?.side;
    const slot = ev?.target?.slot ?? 0;
    const teraMeta = this._recentTerastallizeBySlot.get(this._slotKey(side, slot));
    if (!teraMeta) return false;
    const evTurn = Number.isInteger(ev?.turn) ? ev.turn : null;
    if (teraMeta.turn != null && evTurn != null && teraMeta.turn !== evTurn) return false;
    const evSeq = Number.isFinite(Number(ev?.seq)) ? Number(ev.seq) : null;
    if (teraMeta.seq != null && evSeq != null && evSeq - teraMeta.seq > 4) return false;
    return true;
  }

  _slotInfoFor(side, slot = 0) {
    return this._slotInfo.get(this._slotKey(side, slot)) || null;
  }

  _updateSlotInfo(side, slot = 0, patch = {}) {
    const key = this._slotKey(side, slot);
    const current = this._slotInfo.get(key) || {};
    const next = {
      ...current,
      ...patch,
    };
    this._slotInfo.set(key, next);
    return next;
  }

  _applyInfoForSlot(side, slot = 0, patch = {}) {
    const nextInfo = this._updateSlotInfo(side, slot, patch);
    const info = this._infoForSideSlot(side, slot);
    info?.update?.(nextInfo);
    const hasTeraField = patch && Object.prototype.hasOwnProperty.call(patch, 'teraType');
    if (hasTeraField) {
      const scene = this._scene();
      const teraType = toId(String(patch?.teraType || ''));
      scene?.setBattlerTerastallized?.(side, {
        terastallized: Boolean(teraType),
        teraType,
        slot,
      });
    }
    const hasDynamaxField = patch && (
      Object.prototype.hasOwnProperty.call(patch, 'dynamaxed')
      || Object.prototype.hasOwnProperty.call(patch, 'gigantamaxed')
    );
    if (hasDynamaxField) {
      const scene = this._scene();
      scene?.setBattlerDynamaxState?.(side, {
        dynamaxed: patch?.dynamaxed === true,
        gigantamaxed: patch?.gigantamaxed === true,
        slot,
      });
    }
    return nextInfo;
  }

  async _setBattlerSprite(side, spriteUrl = '', options = {}) {
    if (!side || !spriteUrl) return;
    const scene = this._scene();
    if (!scene?.setBattlerSprite) return;
    await scene.setBattlerSprite(side, spriteUrl, options);
  }

  async _playFormChangePresentation(side, presentation = null, slot = 0) {
    if (!side || !presentation || presentation.shouldAnimate === false) return;
    const scene = this._scene();
    if (!scene) return;
    const opts = {
      audioEnabled: this._audioEnabled,
      modal: Boolean(presentation.modal),
      slot,
    };
    if (presentation.kind === 'form' && scene.playFormChange) {
      await scene.playFormChange(side, opts);
      return;
    }
    if (scene.playQuietFormChange) {
      await scene.playQuietFormChange(side, opts);
    }
  }

  _resolveFormChangePresentation(presentation, ev, slotInfoBefore = null) {
    const next = {
      kind: presentation?.kind || 'quiet',
      modal: Boolean(presentation?.modal),
      isActive: presentation?.isActive !== false,
      isVisible: presentation?.isVisible !== false,
    };
    if (slotInfoBefore) {
      const hp = Number(slotInfoBefore?.hp);
      const fainted = Boolean(slotInfoBefore?.fainted) || (Number.isFinite(hp) && hp <= 0);
      if (fainted) {
        next.isVisible = false;
        next.isActive = false;
      }
    }
    next.shouldAnimate = !ev?.silent && (next.modal || (next.isActive && next.isVisible));
    return next;
  }

  async _resolveVisual(ev) {
    try {
      return await this._resolveVisualState?.(ev);
    } catch (_error) {
      return null;
    }
  }

  /**
   * Build form-change display message.
   * @param {string} preName        localized display name before change (for message text)
   * @param {string} nextName       localized display name after change  (for message text)
   * @param {string} mechanism      Showdown mechanism string (raw, used for type detection)
   * @param {string} [rawNext]      raw English toSpecies (used for reliable toId type detection)
   * @param {string} [rawPre]       raw English pre-change species (for form-change detection)
   */
  _buildFormChangeMessage(preName, nextName, mechanism = '', rawNext = '', rawPre = '') {
    const pre = String(preName || '').trim();
    const next = String(nextName || '').trim();
    const mechId = toId(mechanism);
    // Use rawNext for reliable type detection; fall back to next (for backward compat)
    const nextId = toId(rawNext || next);
    if (!pre) return '';

    if (mechId === 'mega' || nextId.includes('mega')) {
      return next
        ? `${pre}은(는)\n${next}로 메가진화했다!`
        : `${pre}은(는)\n메가진화했다!`;
    }
    if (nextId.includes('gigantamax') || nextId.includes('gmax')) {
      return next
        ? `${pre}은(는)\n${next}가 되었다!`
        : `${pre}은(는)\n거다이맥스했다!`;
    }
    if (nextId.includes('eternamax')) {
      return next
        ? `${pre}은(는)\n${next}가 되었다!`
        : `${pre}은(는)\n무한다이맥스했다!`;
    }
    // Use raw names for the "is it actually a different form?" check when available
    const isDifferentForm = rawNext && rawPre
      ? toId(rawNext) !== toId(rawPre)
      : toId(pre) !== toId(next);
    if (next && isDifferentForm) {
      return `${pre}은(는)\n${next}(으)로 변화했다!`;
    }
    return `${pre}은(는)\n다른 모습으로 변화했다!`;
  }

  _teraTypeLabel(rawType = '') {
    const source = String(rawType || '').trim();
    if (!source) {
      return this._isEnglishLocale() ? 'Tera' : '테라';
    }
    const teraTypeId = toId(source);
    if (!teraTypeId) return source;
    return this._t('pokemon-info', `type.${teraTypeId}`, {}, source);
  }

  _inferTerastallizeFormSpecies(rawName = '') {
    const speciesId = toId(rawName);
    if (!speciesId) return '';
    if (speciesId === 'ogerpon' || speciesId === 'ogerponteal' || speciesId === 'ogerpontealmask' || speciesId === 'ogerpontealtera') {
      return 'Ogerpon-Teal-Tera';
    }
    if (speciesId === 'ogerponwellspring' || speciesId === 'ogerponwellspringmask' || speciesId === 'ogerponwellspringtera') {
      return 'Ogerpon-Wellspring-Tera';
    }
    if (speciesId === 'ogerponhearthflame' || speciesId === 'ogerponhearthflamemask' || speciesId === 'ogerponhearthflametera') {
      return 'Ogerpon-Hearthflame-Tera';
    }
    if (speciesId === 'ogerponcornerstone' || speciesId === 'ogerponcornerstonemask' || speciesId === 'ogerponcornerstonetera') {
      return 'Ogerpon-Cornerstone-Tera';
    }
    if (speciesId === 'terapagos' || speciesId === 'terapagosterastal' || speciesId === 'terapagosstellar') {
      return 'Terapagos-Stellar';
    }
    return '';
  }

  _buildTerastallizeMessage(pokemonNameWithAffix, teraTypeLabel) {
    const fallback = this._isEnglishLocale()
      ? `${pokemonNameWithAffix} Terastallized into the ${teraTypeLabel} type!`
      : `${pokemonNameWithAffix}[[는]] \n${teraTypeLabel}타입으로 테라스탈했다!`;
    return this._t(
      'battle',
      'pokemonTerastallized',
      {
        pokemonNameWithAffix,
        type: teraTypeLabel,
      },
      fallback,
    );
  }

  _buildDynamaxStartMessage(pokemonNameWithAffix, gigantamaxed = false) {
    const fallback = this._isEnglishLocale()
      ? (gigantamaxed
        ? `${pokemonNameWithAffix} Gigantamaxed!`
        : `${pokemonNameWithAffix} Dynamaxed!`)
      : (gigantamaxed
        ? `${pokemonNameWithAffix}[[는]]\n거다이맥스했다!`
        : `${pokemonNameWithAffix}[[는]]\n다이맥스했다!`);
    return fallback;
  }

  _buildDynamaxEndMessage(pokemonNameWithAffix) {
    return this._isEnglishLocale()
      ? `${pokemonNameWithAffix} returned to normal size.`
      : `${pokemonNameWithAffix}[[는]]\n원래 크기로 돌아왔다.`;
  }

  // ── public API ─────────────────────────────────────────────────────────────

  /**
   * Play events array sequentially.
   * @param {Array<object>} events
   * @param {object} [context]  arbitrary context (unused, reserved for future use)
   */
  async play(events = [], context = {}) {  // eslint-disable-line no-unused-vars
    if (!Array.isArray(events) || events.length === 0) {
      this.onComplete();
      return;
    }
    this.running = true;
    this._pendingBattleEndEvent = null;
    try {
      const isInitialSummonSequence = this._isInitialSummonSequence(events);
      if (isInitialSummonSequence) {
        await this._showMsg(this._battleIntroMessage(), { minMs: 620 });
      }
      for (let index = 0; index < events.length; index += 1) {
        const ev = events[index];
        if (!this.running) break;  // fastForward was called
        await this._applyEvent(ev, {
          ...context,
          events,
          index,
          prevEvent: index > 0 ? events[index - 1] : null,
          nextEvent: index + 1 < events.length ? events[index + 1] : null,
          isInitialSummonSequence,
        });
        if (!this.running) break;
        const gapMs = this._eventGapMs(ev?.type);
        if (gapMs > 0) {
          await this._delay(gapMs);
        }
      }
      if (this.running) {
        await this._flushPendingBattleEndMessage();
      }
    } catch (err) {
      console.warn('[BattleTimeline] event error, fast-forwarding to snapshot:', err);
      this.fastForward();
      return;
    }
    this.running = false;
    this.onComplete();
  }

  /**
   * Skip remaining events and apply the final snapshot state immediately.
   */
  fastForward() {
    this.running = false;
    this._pendingBattleEndEvent = null;
    this._applySnapshot();
  }

  // ── event handlers ─────────────────────────────────────────────────────────

  async _applyEvent(ev, context) {  // eslint-disable-line no-unused-vars
    switch (ev.type) {

      // ── BA-1: Turn boundary ──────────────────────────────────────────────
      case 'turn_start': {
        // Intentionally no message — turn numbers are visible in the battle log.
        this._consumedTerastallizeFormSeqs.clear();
        break;
      }

      // ── BA-1 + BA-2: Pokémon switch-in ───────────────────────────────────
      case 'switch_in': {
        const side = ev.side;
        const slot = ev.slot ?? 0;
        const previousSpecies = this._slotNameRaw(side, slot);
        const previousDisplaySpecies = this._localizeMonName(previousSpecies) || previousSpecies;
        const previousInfo = this._slotInfoFor(side, slot) || null;
        const shouldShowSwitchOut = Boolean(
          side === this._playerSide
          && ev.fromBall
          && !context?.isInitialSummonSequence
          && previousSpecies
          && toId(previousSpecies)
          && toId(previousSpecies) !== toId(ev.species || '')
          && !previousInfo?.fainted
        );
        if (shouldShowSwitchOut) {
          await this._showMsg(this._switchOutMessage(side, previousDisplaySpecies), { minMs: 520 });
          this._scene()?.setBattlerVisibility?.(side, false, { yOffset: 0, slot });
          await this._delay(120);
        }
        // _slotNames always stores the raw English name for downstream event matching
        const species = ev.species || this._slotNameRaw(side, slot) || '???';
        this._slotNames.set(this._slotKey(side, slot), species);

        const visual = await this._resolveVisual(ev);
        // Use localized display name for the info panel
        const displaySpecies = this._localizeMonName(species) || species;
        const switchPatch = {
          displayName: displaySpecies,
          ...(visual?.infoPatch || {}),
        };
        if (Number.isFinite(ev.hpAfter) && Number.isFinite(ev.maxHp) && ev.maxHp > 0) {
          switchPatch.hp = ev.hpAfter;
          switchPatch.maxHp = ev.maxHp;
          switchPatch.hpPercent = (ev.hpAfter / ev.maxHp) * 100;
          switchPatch.hpLabel = `${ev.hpAfter}/${ev.maxHp}`;
          switchPatch.fainted = ev.hpAfter <= 0 || ev.status === 'fnt';
        }
        if (ev.status) {
          switchPatch.statusEffect = ev.status === 'fnt' ? '' : ev.status;
          switchPatch.statusLabel = ev.status === 'fnt' ? '' : ev.status;
        }
        this._applyInfoForSlot(side, slot, switchPatch);

        // BA-1: Show switch message
        const label = this._switchInMessage(side, displaySpecies);
        await this._showMsg(label, { minMs: 520 });

        const scene = this._scene();
        if (visual?.spriteUrl) {
          // Apply sprite swap at the switch event boundary. Doing this earlier
          // (timeline start) can reveal post-turn state before move/faint events.
          await this._setBattlerSprite(side, visual.spriteUrl, { visible: !ev.fromBall, slot });
        }
        if (scene?.switchInBattler) {
          await scene.switchInBattler(side, !!ev.fromBall, { audioEnabled: this._audioEnabled, slot });
        } else if (ev.fromBall) {
          this._playAudio('se/pb_rel');
          await this._delay(260);
        }

        // BA-2: play Pokémon cry via dex number → cry/<num>.m4a
        // Await the load so the cry plays even on first load (avoids 500ms timeout miss).
        const dexNum = speciesToDexNum(species);
        if (dexNum) await this._playCryByNum(dexNum);
        break;
      }

      // ── BA-25: Dynamax start/end (message -> effect -> info patch) ──────
      case 'dynamax_start': {
        const side = ev.target?.side;
        const slot = ev.target?.slot ?? 0;
        if (!side) break;
        const visual = await this._resolveVisual(ev);
        const scene = this._scene();
        const dmaxName = this._slotName(side, slot);
        const dmaxNameWithAffix = this._pokemonNameWithAffix(dmaxName, side);

        await this._showMsg(
          this._buildDynamaxStartMessage(dmaxNameWithAffix, Boolean(ev.gigantamaxed)),
          { minMs: 620 },
        );
        if (visual?.spriteUrl) {
          await this._setBattlerSprite(side, visual.spriteUrl, { visible: true, slot });
        }
        if (scene?.playDynamaxStart) {
          await scene.playDynamaxStart(side, {
            audioEnabled: this._audioEnabled,
            gigantamaxed: Boolean(ev.gigantamaxed),
            slot,
          });
        } else {
          await this._delay(420);
        }

        const startPatch = {
          ...(visual?.infoPatch || {}),
          dynamaxed: true,
          gigantamaxed: Boolean(ev.gigantamaxed),
        };
        if (Number.isFinite(ev?.hpAfter) && Number.isFinite(ev?.maxHp) && Number(ev.maxHp) > 0) {
          const hpPercent = (Number(ev.hpAfter) / Number(ev.maxHp)) * 100;
          startPatch.hp = Number(ev.hpAfter);
          startPatch.maxHp = Number(ev.maxHp);
          startPatch.hpPercent = hpPercent;
          startPatch.hpLabel = `${Number(ev.hpAfter)}/${Number(ev.maxHp)}`;
          startPatch.fainted = Number(ev.hpAfter) <= 0 || ev.status === 'fnt';
          if (ev.status && ev.status !== 'fnt') {
            startPatch.statusEffect = ev.status;
            startPatch.statusLabel = ev.status;
          }
          if (ev.status === 'fnt') {
            startPatch.statusEffect = '';
            startPatch.statusLabel = '';
          }
        }
        this._applyInfoForSlot(side, slot, startPatch);
        break;
      }

      case 'dynamax_end': {
        const side = ev.target?.side;
        const slot = ev.target?.slot ?? 0;
        if (!side) break;
        const visual = await this._resolveVisual(ev);
        const scene = this._scene();
        const normalName = this._slotName(side, slot);
        const normalNameWithAffix = this._pokemonNameWithAffix(normalName, side);

        await this._showMsg(this._buildDynamaxEndMessage(normalNameWithAffix), { minMs: 560 });
        if (scene?.playDynamaxEnd) {
          await scene.playDynamaxEnd(side, {
            audioEnabled: this._audioEnabled,
            gigantamaxed: Boolean(ev.gigantamaxed),
            slot,
          });
        } else {
          await this._delay(360);
        }
        if (visual?.spriteUrl) {
          await this._setBattlerSprite(side, visual.spriteUrl, { visible: true, slot });
        }

        const endPatch = {
          ...(visual?.infoPatch || {}),
          dynamaxed: false,
          gigantamaxed: false,
        };
        if (Number.isFinite(ev?.hpAfter) && Number.isFinite(ev?.maxHp) && Number(ev.maxHp) > 0) {
          const hpPercent = (Number(ev.hpAfter) / Number(ev.maxHp)) * 100;
          endPatch.hp = Number(ev.hpAfter);
          endPatch.maxHp = Number(ev.maxHp);
          endPatch.hpPercent = hpPercent;
          endPatch.hpLabel = `${Number(ev.hpAfter)}/${Number(ev.maxHp)}`;
          endPatch.fainted = Number(ev.hpAfter) <= 0 || ev.status === 'fnt';
          if (ev.status && ev.status !== 'fnt') {
            endPatch.statusEffect = ev.status;
            endPatch.statusLabel = ev.status;
          }
          if (ev.status === 'fnt') {
            endPatch.statusEffect = '';
            endPatch.statusLabel = '';
          }
        }
        this._applyInfoForSlot(side, slot, endPatch);
        break;
      }

      // ── BA-1 + BA-10: Move use (message + visual animation) ─────────────
      case 'move_use': {
        const actorSlot = ev.actor?.slot ?? 0;
        const targetSlot = ev.target?.slot ?? 0;
        const actorName = this._slotName(ev.actor?.side, actorSlot);
        const actorNameWithAffix = this._pokemonNameWithAffix(actorName, ev.actor?.side);
        const moveName = this._localizeMoveName(ev.move || '') || ev.move || '';
        const animationMoveName = String(ev.animationMove || ev.baseMove || ev.move || '').trim();
        const moveVisual = await this._resolveVisual(ev);
        const actorSide = ev.actor?.side;
        const movePresentation = moveVisual?.presentation || {};
        const yOffset = Number(movePresentation?.spriteYOffset || 0);
        const moveOutcome = this._scanMoveOutcome(context?.events, Number(context?.index) || 0, ev);
        const animationScale = Number.isFinite(Number(ev.animationScale))
          ? Math.max(0.25, Math.min(4, Number(ev.animationScale)))
          : (ev?.zMove ? 1.0 : 1);
        const animationTint = ev?.zMove ? this._zMoveTint(ev?.zMoveType) : null;
        await this._showMsg(this._t(
          'battle',
          'useMove',
          { pokemonNameWithAffix: actorNameWithAffix, moveName },
          `${actorName}의 ${moveName}!`,
        ), { minMs: 420 });
        if (actorSide && !movePresentation?.isSemiInvulnerable) {
          this._scene()?.setBattlerVisibility?.(actorSide, true, { yOffset, slot: actorSlot });
        }
        if (moveOutcome.skipAnimation) {
          // Keep a short beat between move line and outcome message when animation is skipped.
          await this._delay(220);
          if (actorSide && movePresentation?.isSemiInvulnerable) {
            this._scene()?.setBattlerVisibility?.(actorSide, false, { yOffset, slot: actorSlot });
          }
          break;
        }
        const scene = this._scene();
        if (scene?.playMoveAnim) {
          // BA-10: play visual animation (includes timed sound events internally).
          // Safety timeout prevents executor hang if the Promise never resolves
          // (e.g. Phaser delayedCall cancelled on scene reset / loaderror).
          // Max duration: generous upper bound so even long animations always complete.
          const ANIM_TIMEOUT_MS = 3500;
          const moveAnimOptions = { audioEnabled: this._audioEnabled };
          if (animationScale !== 1) moveAnimOptions.scale = animationScale;
          if (Number.isFinite(animationTint)) moveAnimOptions.tint = animationTint;
          await Promise.race([
            scene.playMoveAnim(animationMoveName, ev.actor?.side, ev.target?.side, {
              ...moveAnimOptions,
              actorSlot,
              targetSlot,
            }),
            new Promise(resolve => setTimeout(resolve, ANIM_TIMEOUT_MS)),
          ]);
        } else {
          // Fallback: SE-only when scene not available.
          await this._playMoveSe(animationMoveName || ev.move);
          await this._delay(280);
        }
        if (actorSide && movePresentation?.isSemiInvulnerable) {
          this._scene()?.setBattlerVisibility?.(actorSide, false, { yOffset, slot: actorSlot });
        }
        break;
      }

      // ── BA-1: Damage ─────────────────────────────────────────────────────
      case 'damage': {
        const sourceMessage = this._damageSourceMessage(ev) || this._itemSourceMessage(ev, 'damage');
        if (sourceMessage) {
          await this._showMsg(sourceMessage, { minMs: 360 });
        }
        const weatherDamageAnim = this._weatherDamageAnimName(ev?.fromEffectId);
        if (weatherDamageAnim) {
          await this._playFieldAnim(weatherDamageAnim);
        }
        this._playHitByResult(ev.hitResult ?? 'effective');
        const hpPct = ev.maxHp > 0 ? (ev.hpAfter / ev.maxHp) * 100 : 0;
        this._updateSlotInfo(ev.target?.side, ev.target?.slot ?? 0, {
          hp: ev.hpAfter,
          maxHp: ev.maxHp,
          hpPercent: hpPct,
          hpLabel: `${ev.hpAfter}/${ev.maxHp}`,
          ...(ev.status && ev.status !== 'fnt' ? {
            statusEffect: ev.status,
            statusLabel: ev.status,
          } : {}),
          ...(ev.status === 'fnt' ? {
            statusEffect: '',
            statusLabel: '',
          } : {}),
          fainted: ev.hpAfter <= 0 || ev.status === 'fnt',
        });
        const info = this._infoForSideSlot(ev.target?.side, ev.target?.slot ?? 0);
        if (info?.tweenHpTo) {
          await info.tweenHpTo(hpPct, ev.maxHp);
        } else {
          await this._delay(320);
        }
        // Show hit result message after HP tween
        let hitMsg = null;
        if (ev.critical)                        hitMsg = this._t('battle', 'hitResultCriticalHit', {}, '급소에 맞았다!');
        else if (ev.hitResult === 'super')       hitMsg = this._t('battle', 'hitResultSuperEffective', {}, '효과는 굉장했다!');
        else if (ev.hitResult === 'not_very')    hitMsg = this._t('battle', 'hitResultNotVeryEffective', {}, '효과는 별로인 것 같다...');
        if (hitMsg) {
          await this._showMsg(hitMsg, { minMs: 340 });
        }
        break;
      }

      // ── Heal ─────────────────────────────────────────────────────────────
      case 'heal': {
        const sourceMessage = this._itemSourceMessage(ev, 'heal');
        if (sourceMessage) {
          await this._showMsg(sourceMessage, { minMs: 340 });
        }
        const healPct = ev.maxHp > 0 ? (ev.hpAfter / ev.maxHp) * 100 : 0;
        this._updateSlotInfo(ev.target?.side, ev.target?.slot ?? 0, {
          hp: ev.hpAfter,
          maxHp: ev.maxHp,
          hpPercent: healPct,
          hpLabel: `${ev.hpAfter}/${ev.maxHp}`,
          ...(ev.status && ev.status !== 'fnt' ? {
            statusEffect: ev.status,
            statusLabel: ev.status,
          } : {}),
          ...(ev.status === 'fnt' ? {
            statusEffect: '',
            statusLabel: '',
          } : {}),
          fainted: ev.hpAfter <= 0 || ev.status === 'fnt',
        });
        const healInfo = this._infoForSideSlot(ev.target?.side, ev.target?.slot ?? 0);
        if (healInfo?.tweenHpTo) {
          await healInfo.tweenHpTo(healPct, ev.maxHp);
        } else {
          await this._delay(300);
        }
        break;
      }

      // ── BA-1: Faint ──────────────────────────────────────────────────────
      case 'faint': {
        const faintName = this._slotName(ev.side, ev.slot ?? 0);
        const prevInfo = this._slotInfoFor(ev.side, ev.slot ?? 0);
        const maxHp = Number(prevInfo?.maxHp || 0);
        this._updateSlotInfo(ev.side, ev.slot ?? 0, {
          hp: 0,
          maxHp,
          hpPercent: 0,
          hpLabel: `0/${maxHp || 0}`,
          fainted: true,
          statusEffect: '',
          statusLabel: '',
        });
        await this._showMsg(this._t(
          'battle',
          'fainted',
          { pokemonNameWithAffix: this._pokemonNameWithAffix(faintName, ev.side) },
          `${faintName} 기절!`,
        ));
        this._playAudio('se/faint');
        const scene = this._scene();
        if (scene?.faintBattler) {
          await scene.faintBattler(ev.side, ev.slot ?? 0);
        } else {
          await this._delay(500);
        }
        break;
      }

      // ── BA-3: Ability bar ────────────────────────────────────────────────
      case 'ability_show': {
        const abilityOwner = this._slotName(ev.side, ev.slot ?? 0);
        const abilityName = this._localizeAbilityName(ev.ability || '') || ev.ability || '';
        const abilityMsg = this._isEnglishLocale()
          ? `${abilityOwner}'s Ability: ${abilityName}!`
          : `${abilityOwner}의 특성: ${abilityName}!`;
        const ui = this._ui;
        if (ui?.abilityBar) {
          ui.abilityBar.update({
            visible: true,
            text: abilityName,
            side: ev.side === this._playerSide ? 'player' : 'enemy',
          });
        }
        await this._showMsg(abilityMsg, { minMs: 1200 });
        // Hide bar; renderBattle() will restore final state on onComplete.
        if (ui?.abilityBar) {
          ui.abilityBar.update({ visible: false, text: '' });
        }
        break;
      }

      // ── BA-3: Weather ────────────────────────────────────────────────────
      case 'weather_start': {
        const weatherId = toId(ev.weather);
        this._activeWeatherId = weatherId || this._activeWeatherId;
        this._lastWeatherStartTurn = Number.isFinite(Number(ev?.turn)) ? Number(ev.turn) : null;
        const wLabel = this._weatherStartMessage(weatherId, ev.weather);
        await this._showMsg(wLabel, { minMs: 700 });
        await this._playFieldAnim(this._weatherCommonAnimName(this._activeWeatherId), {
          scale: WEATHER_COMMON_ANIM_SCALE,
          scaleGraphicsOnly: true,
        });
        break;
      }

      case 'weather_end': {
        await this._showMsg(this._weatherClearMessage(this._activeWeatherId), { minMs: 560 });
        this._activeWeatherId = '';
        this._lastWeatherStartTurn = null;
        break;
      }

      case 'weather_tick': {
        const tickWeatherId = toId(ev.weather || this._activeWeatherId);
        if (tickWeatherId) this._activeWeatherId = tickWeatherId;
        if (!this._activeWeatherId) break;
        const tickTurn = Number.isFinite(Number(ev?.turn)) ? Number(ev.turn) : null;
        if (
          tickTurn !== null
          && this._lastWeatherStartTurn !== null
          && tickTurn === this._lastWeatherStartTurn
        ) {
          // Prevent duplicated back-to-back weather animation right after weather-start
          // (especially ability-triggered weather on the same turn).
          break;
        }
        if (WEATHER_DAMAGE_IDS.has(this._activeWeatherId)) break;
        const lapseMessage = this._weatherLapseMessage(this._activeWeatherId, ev.weather || '');
        if (lapseMessage) {
          await this._showMsg(lapseMessage, { minMs: 560 });
        }
        await this._playFieldAnim(this._weatherCommonAnimName(this._activeWeatherId), {
          scale: WEATHER_COMMON_ANIM_SCALE,
          scaleGraphicsOnly: true,
        });
        break;
      }

      // ── BA-3: Terrain ────────────────────────────────────────────────────
      case 'terrain_start': {
        const effectId = this._normalizeTerrainId(ev.effect || ev.raw || '');
        this._activeTerrainId = effectId || this._activeTerrainId;
        const tLabel = this._terrainStartMessage(effectId, ev.effect || ev.raw || '');
        await this._showMsg(tLabel, { minMs: 520 });
        await this._playFieldAnim(this._terrainCommonAnimName(this._activeTerrainId));
        const scene = this._scene();
        if (scene?.setPersistentTerrainBackground) {
          await scene.setPersistentTerrainBackground(this._activeTerrainId);
        }
        break;
      }

      case 'terrain_end': {
        await this._showMsg(this._terrainClearMessage(this._activeTerrainId), { minMs: 520 });
        const scene = this._scene();
        scene?.clearPersistentTerrainBackground?.();
        this._activeTerrainId = '';
        break;
      }

      // ── BA-14: Side condition ────────────────────────────────────────────
      case 'side_start': {
        const startMessage = this._sideConditionMessage(ev, 'start');
        if (startMessage) {
          await this._showMsg(startMessage, { minMs: 560 });
        }
        break;
      }

      case 'side_end': {
        const endMessage = this._sideConditionMessage(ev, 'end');
        if (endMessage) {
          await this._showMsg(endMessage, { minMs: 520 });
        }
        break;
      }

      // ── BA-4: Status apply ───────────────────────────────────────────────
      case 'status_apply': {
        this._applyInfoForSlot(ev.target?.side, ev.target?.slot ?? 0, {
          statusEffect: ev.status || '',
          statusLabel: ev.status || '',
        });
        const statusName = this._slotName(ev.target?.side, ev.target?.slot ?? 0);
        const statusNameWithAffix = this._pokemonNameWithAffix(statusName, ev.target?.side);
        const statusShortId = toId(ev.status);
        const statusLocaleKey = STATUS_ID_TO_LOCALE_KEY[statusShortId];
        // BA-22: use status-effect locale key if available; Korean fallback otherwise
        const statusMsg = statusLocaleKey
          ? this._t('status-effect', `${statusLocaleKey}.obtain`, { pokemonNameWithAffix: statusNameWithAffix },
              `${statusNameWithAffix}은(는) ${STATUS_LABELS[statusShortId] ?? `${ev.status} 상태`}`)
          : `${statusNameWithAffix}은(는) ${STATUS_LABELS[statusShortId] ?? `${ev.status} 상태`}`;
        await this._showMsg(statusMsg, { minMs: 560 });
        break;
      }

      case 'status_cure': {
        this._applyInfoForSlot(ev.target?.side, ev.target?.slot ?? 0, {
          statusEffect: '',
          statusLabel: '',
        });
        break;
      }

      // ── BA-4: Stat boost / unboost ───────────────────────────────────────
      case 'boost': {
        const boostName = this._slotName(ev.target?.side, ev.target?.slot ?? 0);
        const boostNameWithAffix = this._pokemonNameWithAffix(boostName, ev.target?.side);
        const boostStatId = normalizeStatId(ev.stat);
        // BA-22: locale-based stat name; use English map for EN locale
        const boostStatLabel = this._isEnglishLocale()
          ? (STAT_LABELS_EN[boostStatId] ?? STAT_LABELS_EN[toId(ev.stat)] ?? ev.stat)
          : (STAT_LABELS[boostStatId] ?? STAT_LABELS[toId(ev.stat)] ?? ev.stat);
        const amount = Number(ev.amount) || 1;
        const boostKey = amount >= 3 ? 'statRoseDrastically_one'
          : amount >= 2 ? 'statSharplyRose_one'
          : 'statRose_one';
        const boostFallback = this._isEnglishLocale()
          ? `${boostNameWithAffix}'s ${boostStatLabel} rose${amount >= 3 ? ' drastically' : amount >= 2 ? ' sharply' : ''}!`
          : `${boostNameWithAffix}의 ${boostStatLabel}이${amount >= 2 ? ' 크게 올랐다!' : ' 올랐다!'}`;
        await this._showMsg(this._t('battle', boostKey, { pokemonNameWithAffix: boostNameWithAffix, stats: boostStatLabel }, boostFallback), { minMs: 500 });
        this._playAudio('se/stat_up');
        await this._scene()?.playStatStageEffect?.(ev.target?.side, {
          rising: true,
          stat: boostStatId,
          amount,
          slot: ev.target?.slot ?? 0,
        });
        break;
      }

      case 'unboost': {
        const unboostName = this._slotName(ev.target?.side, ev.target?.slot ?? 0);
        const unboostNameWithAffix = this._pokemonNameWithAffix(unboostName, ev.target?.side);
        const unboostStatId = normalizeStatId(ev.stat);
        // BA-22: locale-based stat name; use English map for EN locale
        const unboostStatLabel = this._isEnglishLocale()
          ? (STAT_LABELS_EN[unboostStatId] ?? STAT_LABELS_EN[toId(ev.stat)] ?? ev.stat)
          : (STAT_LABELS[unboostStatId] ?? STAT_LABELS[toId(ev.stat)] ?? ev.stat);
        const uamount = Number(ev.amount) || 1;
        const unboostKey = uamount >= 3 ? 'statSeverelyFell_one'
          : uamount >= 2 ? 'statHarshlyFell_one'
          : 'statFell_one';
        const unboostFallback = this._isEnglishLocale()
          ? `${unboostNameWithAffix}'s ${unboostStatLabel} fell${uamount >= 3 ? ' severely' : uamount >= 2 ? ' harshly' : ''}!`
          : `${unboostNameWithAffix}의 ${unboostStatLabel}이${uamount >= 2 ? ' 크게 내려갔다!' : ' 내려갔다!'}`;
        await this._showMsg(this._t('battle', unboostKey, { pokemonNameWithAffix: unboostNameWithAffix, stats: unboostStatLabel }, unboostFallback), { minMs: 500 });
        this._playAudio('se/stat_down');
        await this._scene()?.playStatStageEffect?.(ev.target?.side, {
          rising: false,
          stat: unboostStatId,
          amount: uamount,
          slot: ev.target?.slot ?? 0,
        });
        break;
      }

      // ── BA-4: Miss ───────────────────────────────────────────────────────
      case 'miss': {
        const missTarget = ev.target || ev.actor || null;
        const missName = this._slotName(missTarget?.side, missTarget?.slot ?? 0);
        const missNameWithAffix = this._pokemonNameWithAffix(missName, missTarget?.side);
        // BA-22: locale-key for EN; Korean fallback
        const missFallback = this._isEnglishLocale()
          ? `${missNameWithAffix} was not hit!`
          : `${missNameWithAffix}에게는 맞지 않았다!`;
        await this._showMsg(this._t('battle', 'attackMissed', { pokemonNameWithAffix: missNameWithAffix }, missFallback), { minMs: 460 });
        break;
      }

      // ── BA-4: Can't move ─────────────────────────────────────────────────
      case 'cant_move': {
        await this._showMsg(this._cantMoveMessage(ev), { minMs: 500 });
        break;
      }

      // ── BA-5a: Immune / fail ─────────────────────────────────────────────
      case 'immune': {
        // "X에게는 효과가 없는 것 같다…"
        const immuneName = this._slotName(ev.target?.side, ev.target?.slot ?? 0);
        await this._showMsg(this._t(
          'battle',
          'hitResultNoEffect',
          { pokemonName: immuneName },
          `${immuneName}에게는\n효과가 없는 것 같다…`,
        ), { minMs: 560 });
        break;
      }

      case 'move_fail': {
        // "그러나 실패하고 말았다!!"
        await this._showMsg(this._t('battle', 'attackFailed', {}, '그러나 실패하고 말았다!!'), { minMs: 520 });
        break;
      }

      // ── BA-24: Terastallize (message -> effect -> info patch) ───────────
      case 'terastallize': {
        const side = ev.target?.side;
        const slot = ev.target?.slot ?? 0;
        const preTerastallizeRaw = this._slotNameRaw(side, slot);
        const teraName = this._slotName(side, slot);
        const teraNameWithAffix = this._pokemonNameWithAffix(teraName, side);
        const teraTypeLabel = this._teraTypeLabel(ev.teraTypeName || ev.teraType || '');
        const linkedFormEvent = this._isLinkedTerastallizeFormPair(ev, context?.nextEvent)
          ? context.nextEvent
          : null;
        const linkedToSpecies = String(linkedFormEvent?.toSpecies || '').trim()
          || this._inferTerastallizeFormSpecies(preTerastallizeRaw);
        const syntheticFormEvent = !linkedFormEvent && linkedToSpecies
          ? { type: 'forme_change', target: { side, slot }, toSpecies: linkedToSpecies, to: linkedToSpecies }
          : null;
        const formVisualEvent = linkedFormEvent || syntheticFormEvent;
        const visual = formVisualEvent
          ? (await this._resolveVisual(formVisualEvent) || await this._resolveVisual(ev))
          : await this._resolveVisual(ev);

        await this._showMsg(this._buildTerastallizeMessage(teraNameWithAffix, teraTypeLabel), { minMs: 620 });
        if (visual?.spriteUrl) {
          // Load/swap the special tera-linked form before the animation so the
          // frame at animation end is already the final form (no base-form pause).
          await this._setBattlerSprite(side, visual.spriteUrl, { visible: true, slot });
        }

        const scene = this._scene();
        if (scene?.playTerastallize) {
          await scene.playTerastallize(side, { audioEnabled: this._audioEnabled, slot });
        } else {
          await this._delay(520);
        }

        const linkedDisplayName = linkedToSpecies
          ? (this._localizeMonName(linkedToSpecies) || linkedToSpecies)
          : '';
        const teraTypeId = toId(ev.teraType || ev.teraTypeName || '');
        const teraPatch = {
          ...(visual?.infoPatch || {}),
        };
        if (linkedDisplayName) teraPatch.displayName = linkedDisplayName;
        const patchTeraTypeId = toId(teraPatch.teraType || '');
        if ((!Object.prototype.hasOwnProperty.call(teraPatch, 'teraType') || !patchTeraTypeId) && teraTypeId) {
          teraPatch.teraType = teraTypeId;
        }
        // Post-turn snapshots after an immediate KO can carry reverted/non-tera typings.
        // For the terastallize event itself, keep info box type icons aligned to tera type.
        if (teraTypeId && teraTypeId !== 'stellar') {
          teraPatch.types = [teraTypeId];
        }
        if (Object.keys(teraPatch).length) {
          this._applyInfoForSlot(side, slot, teraPatch);
        }
        if (linkedToSpecies) this._slotNames.set(this._slotKey(side, slot), linkedToSpecies);
        if (linkedFormEvent && Number.isFinite(Number(linkedFormEvent?.seq))) {
          this._consumedTerastallizeFormSeqs.add(Number(linkedFormEvent.seq));
        }
        this._markRecentTerastallize(side, slot, ev);
        break;
      }

      // ── BA-19: Form change immediate update ──────────────────────────────
      case 'forme_change': {
        const seqNum = Number.isFinite(Number(ev?.seq)) ? Number(ev.seq) : null;
        if (seqNum != null && this._consumedTerastallizeFormSeqs.has(seqNum)) {
          this._consumedTerastallizeFormSeqs.delete(seqNum);
          break;
        }
        const side = ev.target?.side;
        const slot = ev.target?.slot ?? 0;
        const isMegaPairMarker = ev.mechanism === '-mega' && !String(ev.toSpecies || '').trim();
        if (isMegaPairMarker) break;
        const teraLinkedForm = this._isTerastallizeLinkedFormChange(ev);
        const slotInfoBefore = this._slotInfoFor(side, slot);
        const hpBefore = Number(slotInfoBefore?.hp);
        const faintedBefore = Boolean(slotInfoBefore?.fainted)
          || (Number.isFinite(hpBefore) && hpBefore <= 0);
        // Showdown can emit a silent detailschange right after faint (e.g. Ogerpon
        // tera form rolling back to base). Applying that during the same timeline
        // turn visually erases the just-played tera/form state.
        if (ev.silent && faintedBefore) break;
        // Keep raw English for ID comparisons; localize for display messages
        const preNameRaw = this._slotNameRaw(side, slot);
        const preName = this._localizeMonName(preNameRaw) || preNameRaw;
        const preNameForMessage = this._localizeMonNameWithForm(preNameRaw) || preNameRaw;
        const toSpecies = String(ev.toSpecies || ev.to || '').trim();  // raw English
        // Localized display names:
        // - displayNextName: info/UI patch path (base-species-fixed in BA-26)
        // - displayNextNameForMessage: form-aware message path (restore original vibe)
        const displayNextName = toSpecies ? (this._localizeMonName(toSpecies) || toSpecies) : '';
        const displayNextNameForMessage = toSpecies
          ? (this._localizeMonNameWithForm(toSpecies) || toSpecies)
          : '';
        const visual = await this._resolveVisual(ev);
        const formPresentation = this._resolveFormChangePresentation(
          visual?.formChangePresentation || null,
          ev,
          slotInfoBefore,
        );
        if (visual?.spriteUrl) {
          const shouldShowSprite = teraLinkedForm ? true : (formPresentation.isVisible !== false);
          await this._setBattlerSprite(side, visual.spriteUrl, { visible: shouldShowSprite, slot });
        }
        // Always store raw English in _slotNames for downstream event matching
        const rawNextName = toSpecies || String(visual?.infoPatch?.rawName || '').trim();
        const displayNameForPatch = displayNextName || String(visual?.infoPatch?.displayName || '').trim();
        if (rawNextName) this._slotNames.set(this._slotKey(side, slot), rawNextName);
        if (toSpecies || visual?.infoPatch) {
          const formPatch = {
            ...(visual?.infoPatch || {}),
          };
          // Show localized name in the info panel
          if (displayNameForPatch) formPatch.displayName = displayNameForPatch;
          this._applyInfoForSlot(side, slot, {
            ...formPatch,
          });
        }
        if (!teraLinkedForm) {
          await this._playFormChangePresentation(side, formPresentation, slot);
        }
        // Compare raw English names to reliably detect form changes
        const changed = toSpecies && toId(toSpecies) !== toId(preNameRaw);
        const shouldShowFallback = ev.mechanism === '-formechange' && !toSpecies;
        const suppressMessageByFaint = faintedBefore;
        if (!teraLinkedForm && !suppressMessageByFaint && !ev.silent && (changed || shouldShowFallback)) {
          const msg = this._buildFormChangeMessage(
            preNameForMessage,
            displayNextNameForMessage,
            ev.mechanism,
            toSpecies,
            preNameRaw,
          );
          if (msg) {
            await this._showMsg(msg, { minMs: 620 });
          }
        }
        break;
      }

      // ── 5-C: Battle end ─────────────────────────────────────────────────
      case 'battle_end': {
        this._pendingBattleEndEvent = { ...ev };
        this._resetFieldVisualStateForBattleEnd();
        break;
      }

      case 'effect_activate': {
        const msg = this._effectActivateMessage(ev, 'activate');
        if (msg) {
          await this._showMsg(msg, { minMs: 480 });
        }
        break;
      }

      case 'single_turn_effect': {
        const msg = this._effectActivateMessage(ev, 'single_turn');
        if (msg) {
          await this._showMsg(msg, { minMs: 480 });
        }
        break;
      }

      case 'effect_start': {
        const effectId = toId(ev.effectId || ev.effect || '');
        if (effectId !== 'substitute') break;
        const side = ev.target?.side;
        const slot = ev.target?.slot ?? 0;
        const substituteName = this._slotName(side, slot);
        const substituteNameWithAffix = this._pokemonNameWithAffix(substituteName, side);
        const startMsg = this._isEnglishLocale()
          ? `${substituteNameWithAffix} put in a substitute!`
          : `${substituteNameWithAffix}은(는)\n대타출동을 사용했다!`;
        await this._showMsg(startMsg, { minMs: 420 });
        if (side) {
          this._scene()?.setBattlerVisibility?.(side, false, { yOffset: 0, slot });
          await this._delay(90);
        }
        const substituteUrl = this._substituteSpriteUrlForSide(side);
        if (substituteUrl) {
          await this._setBattlerSprite(side, substituteUrl, {
            visible: true,
            slot,
          });
        }
        break;
      }

      case 'effect_end': {
        const effectId = toId(ev.effectId || ev.effect || '');
        if (effectId !== 'substitute') break;
        const side = ev.target?.side;
        const slot = ev.target?.slot ?? 0;
        const visual = await this._resolveVisual(ev);
        const yOffset = Number(visual?.presentation?.spriteYOffset || 0);
        if (visual?.spriteUrl && side) {
          await this._setBattlerSprite(side, visual.spriteUrl, {
            visible: true,
            yOffset,
            slot,
          });
        } else if (side) {
          this._scene()?.setBattlerVisibility?.(side, true, { yOffset: 0, slot });
        }
        if (visual?.infoPatch && visual?.side) {
          this._applyInfoForSlot(visual.side, visual.slot ?? 0, visual.infoPatch);
        }
        const substituteName = this._slotName(side, slot);
        const substituteNameWithAffix = this._pokemonNameWithAffix(substituteName, side);
        const endMsg = this._isEnglishLocale()
          ? `${substituteNameWithAffix}'s substitute faded!`
          : `${substituteNameWithAffix}의\n대타는 사라져버렸다!`;
        await this._showMsg(endMsg, { minMs: 420 });
        break;
      }

      // ── no-op events ──────────────────────────────────────────────────────
      case 'turn_end':
      case 'engine_error':
        break;

      // ── 5-C: Forced switch gate ──────────────────────────────────────────
      case 'callback_event': {
        // Show "교체할 포켓몬을 선택해 주세요!" then pause for player input.
        await this._showMsg('교체할 포켓몬을 선택해 주세요!', { minMs: 620 });
        // Pause the timeline and notify caller to show the party/switch UI.
        // The UI system (app.js) will pick up request.forceSwitch and surface party mode.
        this.running = false;
        this.onInputRequired(ev.requestType ?? 'switch');
        return;  // do not continue; the next turn's events will play after the switch choice
      }

      case 'raw_event':
      default:
        break;
    }
  }
}
