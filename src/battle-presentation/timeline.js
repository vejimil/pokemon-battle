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

const STATUS_LABELS = {
  brn: '화상에 걸렸다!',
  par: '마비됐다!',
  psn: '독에 걸렸다!',
  tox: '맹독에 걸렸다!',
  slp: '잠들었다!',
  frz: '얼어붙었다!',
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

const EVENT_GAP_SHORT_MS = 140;
const EVENT_GAP_MEDIUM_MS = 200;

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
    this.running = false;
    // Tracks species name per slot. Key: "${side}_${slot}" e.g. "p1_0", "p2_0".
    // Pre-seeded from initialNames (previous turn's final roster).
    this._slotNames = new Map(Object.entries(initialNames ?? {}));
    // Tracks live battle-info state (name/hp/status/etc) per side+slot during timeline playback.
    this._slotInfo = new Map(Object.entries(initialSlotInfo ?? {}));
    this._activeWeatherId = '';
    this._activeTerrainId = '';
  }

  // ── accessors ─────────────────────────────────────────────────────────────

  get _audio() { return this._scene()?.audio ?? null; }
  get _ui()    { return this._scene()?.ui    ?? null; }
  /** Returns the BattleMessageUiHandler for direct text updates. */
  get _msg()   { return this._ui?.getMessageHandler?.() ?? null; }

  /** Returns the BattleInfo panel for the given Showdown side id ('p1'|'p2'). */
  _infoForSide(side) {
    const ui = this._ui;
    if (!ui) return null;
    return side === this._playerSide ? ui.playerInfo : ui.enemyInfo;
  }

  _delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  _estimateMessageHoldMs(text, { minMs = 0 } = {}) {
    const source = String(text || '');
    const compact = source.replace(/\s+/g, ' ').trim();
    const charCount = compact.length;
    const lineCount = Math.max(1, source.split(/\n|\$/g).filter(Boolean).length);
    const punctuationWeight = (compact.match(/[!?…。]/g) || []).length * 70;
    const raw = (charCount * 28) + (lineCount * 140) + punctuationWeight;
    const bounded = Math.max(360, Math.min(2000, raw || 0));
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
      case 'single_turn_effect':
      case 'status_cure':
      case 'callback_event':
        return 0;
      case 'switch_in':
      case 'move_use':
      case 'damage':
      case 'heal':
      case 'faint':
      case 'forme_change':
      case 'battle_end':
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

  _switchInMessage(side, species) {
    const pokemonName = String(species || '???');
    if (side === this._playerSide) {
      return this._t('battle', 'playerGo', { pokemonName }, `가라! ${pokemonName}!`);
    }
    const trainerName = this._isEnglishLocale() ? 'Opponent' : '상대';
    return this._t('battle', 'trainerGo', { trainerName, pokemonName }, `상대의 ${pokemonName} 등장!`);
  }

  _weatherStartMessage(weatherId, rawWeather) {
    const key = WEATHER_START_KEYS[weatherId];
    if (key) return this._t('weather', key, {}, WEATHER_LABELS[weatherId] || '');
    return this._isEnglishLocale()
      ? `Weather changed: ${rawWeather || weatherId}`
      : `날씨 변화: ${rawWeather || weatherId}`;
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
    const key = DAMAGE_SOURCE_MESSAGE_KEY[sourceId];
    if (!key) return '';
    const targetSide = ev?.target?.side;
    const targetName = this._slotName(targetSide, ev?.target?.slot ?? 0);
    const pokemonNameWithAffix = this._pokemonNameWithAffix(targetName, targetSide);
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

  /** Get the tracked species name for a side+slot, or '???' if unknown. */
  _slotName(side, slot = 0) {
    return this._slotNames.get(`${side}_${slot}`) || '???';
  }

  _slotKey(side, slot = 0) {
    return `${side}_${slot}`;
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
    const info = this._infoForSide(side);
    info?.update?.(nextInfo);
    return nextInfo;
  }

  async _setBattlerSprite(side, spriteUrl = '', options = {}) {
    if (!side || !spriteUrl) return;
    const scene = this._scene();
    if (!scene?.setBattlerSprite) return;
    await scene.setBattlerSprite(side, spriteUrl, options);
  }

  async _playFormChangePresentation(side, presentation = null) {
    if (!side || !presentation || presentation.shouldAnimate === false) return;
    const scene = this._scene();
    if (!scene) return;
    const opts = {
      audioEnabled: this._audioEnabled,
      modal: Boolean(presentation.modal),
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

  _buildFormChangeMessage(preName, nextName, mechanism = '') {
    const pre = String(preName || '').trim();
    const next = String(nextName || '').trim();
    const mechId = toId(mechanism);
    const nextId = toId(next);
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
    if (next && toId(pre) !== toId(next)) {
      return `${pre}은(는)\n${next}(으)로 변화했다!`;
    }
    return `${pre}은(는)\n다른 모습으로 변화했다!`;
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
    try {
      for (const ev of events) {
        if (!this.running) break;  // fastForward was called
        await this._applyEvent(ev, context);
        if (!this.running) break;
        const gapMs = this._eventGapMs(ev?.type);
        if (gapMs > 0) {
          await this._delay(gapMs);
        }
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
    this._applySnapshot();
  }

  // ── event handlers ─────────────────────────────────────────────────────────

  async _applyEvent(ev, context) {  // eslint-disable-line no-unused-vars
    switch (ev.type) {

      // ── BA-1: Turn boundary ──────────────────────────────────────────────
      case 'turn_start': {
        // Intentionally no message — turn numbers are visible in the battle log.
        break;
      }

      // ── BA-1 + BA-2: Pokémon switch-in ───────────────────────────────────
      case 'switch_in': {
        const side = ev.side;
        const slot = ev.slot ?? 0;
        const species = ev.species || this._slotName(side, slot) || '???';
        // Track this pokemon for later move/faint messages
        this._slotNames.set(this._slotKey(side, slot), species);

        const visual = await this._resolveVisual(ev);
        const switchPatch = {
          displayName: species,
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
        const label = this._switchInMessage(side, species);
        await this._showMsg(label);

        const scene = this._scene();
        if (!ev.fromBall && visual?.spriteUrl) {
          await this._setBattlerSprite(side, visual.spriteUrl);
        }
        if (scene?.switchInBattler) {
          await scene.switchInBattler(side, !!ev.fromBall, { audioEnabled: this._audioEnabled });
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

      // ── BA-1 + BA-10: Move use (message + visual animation) ─────────────
      case 'move_use': {
        const actorName = this._slotName(ev.actor?.side, ev.actor?.slot ?? 0);
        const actorNameWithAffix = this._pokemonNameWithAffix(actorName, ev.actor?.side);
        await this._showMsg(this._t(
          'battle',
          'useMove',
          { pokemonNameWithAffix: actorNameWithAffix, moveName: ev.move || '' },
          `${actorName}의 ${ev.move}!`,
        ));
        const scene = this._scene();
        if (scene?.playMoveAnim) {
          // BA-10: play visual animation (includes timed sound events internally).
          // Safety timeout prevents executor hang if the Promise never resolves
          // (e.g. Phaser delayedCall cancelled on scene reset / loaderror).
          // Max duration: generous upper bound so even long animations always complete.
          const ANIM_TIMEOUT_MS = 5000;
          await Promise.race([
            scene.playMoveAnim(ev.move, ev.actor?.side, ev.target?.side, { audioEnabled: this._audioEnabled }),
            new Promise(resolve => setTimeout(resolve, ANIM_TIMEOUT_MS)),
          ]);
        } else {
          // Fallback: SE-only when scene not available.
          await this._playMoveSe(ev.move);
          await this._delay(280);
        }
        break;
      }

      // ── BA-1: Damage ─────────────────────────────────────────────────────
      case 'damage': {
        const sourceMessage = this._damageSourceMessage(ev);
        if (sourceMessage) {
          await this._showMsg(sourceMessage, { minMs: 560 });
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
        const info = this._infoForSide(ev.target?.side);
        if (info?.tweenHpTo) {
          await info.tweenHpTo(hpPct, ev.maxHp);
        } else {
          await this._delay(500);
        }
        // Show hit result message after HP tween
        let hitMsg = null;
        if (ev.critical)                        hitMsg = this._t('battle', 'hitResultCriticalHit', {}, '급소에 맞았다!');
        else if (ev.hitResult === 'super')       hitMsg = this._t('battle', 'hitResultSuperEffective', {}, '효과는 굉장했다!');
        else if (ev.hitResult === 'not_very')    hitMsg = this._t('battle', 'hitResultNotVeryEffective', {}, '효과는 별로인 것 같다...');
        if (hitMsg) {
          await this._showMsg(hitMsg, { minMs: 520 });
        }
        break;
      }

      // ── Heal ─────────────────────────────────────────────────────────────
      case 'heal': {
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
        const healInfo = this._infoForSide(ev.target?.side);
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
          await scene.faintBattler(ev.side);
        } else {
          await this._delay(500);
        }
        break;
      }

      // ── BA-3: Ability bar ────────────────────────────────────────────────
      case 'ability_show': {
        const abilityOwner = this._slotName(ev.side, ev.slot ?? 0);
        const abilityMsg = this._isEnglishLocale()
          ? `${abilityOwner}'s Ability: ${ev.ability}!`
          : `${abilityOwner}의 특성: ${ev.ability}!`;
        const ui = this._ui;
        if (ui?.abilityBar) {
          ui.abilityBar.update({
            visible: true,
            text: ev.ability,
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
        const wLabel = this._weatherStartMessage(weatherId, ev.weather);
        await this._showMsg(wLabel, { minMs: 700 });
        break;
      }

      case 'weather_end': {
        await this._showMsg(this._weatherClearMessage(this._activeWeatherId), { minMs: 560 });
        this._activeWeatherId = '';
        break;
      }

      // BA-3: weather_tick is intentionally silent — avoid spamming messages every turn.

      // ── BA-3: Terrain ────────────────────────────────────────────────────
      case 'terrain_start': {
        const effectId = toId(ev.effect || ev.raw || '');
        this._activeTerrainId = effectId || this._activeTerrainId;
        const tLabel = this._terrainStartMessage(effectId, ev.effect || ev.raw || '');
        await this._showMsg(tLabel, { minMs: 620 });
        break;
      }

      case 'terrain_end': {
        await this._showMsg(this._terrainClearMessage(this._activeTerrainId), { minMs: 520 });
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
        const statusLabel = STATUS_LABELS[toId(ev.status)] ?? `${ev.status} 상태`;
        await this._showMsg(`${statusName}은(는) ${statusLabel}`, { minMs: 560 });
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
        const statLabel = STAT_LABELS[toId(ev.stat)] ?? ev.stat;
        const amount = Number(ev.amount) || 1;
        const suffix = amount >= 2 ? ' 크게 올랐다!' : ' 올랐다!';
        await this._showMsg(`${boostName}의 ${statLabel}이${suffix}`, { minMs: 500 });
        this._playAudio('se/stat_up');
        break;
      }

      case 'unboost': {
        const unboostName = this._slotName(ev.target?.side, ev.target?.slot ?? 0);
        const unstatLabel = STAT_LABELS[toId(ev.stat)] ?? ev.stat;
        const uamount = Number(ev.amount) || 1;
        const usuffix = uamount >= 2 ? ' 크게 내려갔다!' : ' 내려갔다!';
        await this._showMsg(`${unboostName}의 ${unstatLabel}이${usuffix}`, { minMs: 500 });
        this._playAudio('se/stat_down');
        break;
      }

      // ── BA-4: Miss ───────────────────────────────────────────────────────
      case 'miss': {
        // In Showdown protocol, miss/−miss stores the ATTACKER as ev.target (field is misnamed).
        // The attacker's move missed, so message: "X의 공격이 빗나갔다!"
        const missName = this._slotName(ev.target?.side, ev.target?.slot ?? 0);
        await this._showMsg(`${missName}의 공격이 빗나갔다!`, { minMs: 460 });
        break;
      }

      // ── BA-4: Can't move ─────────────────────────────────────────────────
      case 'cant_move': {
        const cantName = this._slotName(ev.actor?.side, ev.actor?.slot ?? 0);
        await this._showMsg(`${cantName}은(는) 움직일 수 없다.`, { minMs: 500 });
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

      // ── BA-19: Form change immediate update ──────────────────────────────
      case 'forme_change': {
        const side = ev.target?.side;
        const slot = ev.target?.slot ?? 0;
        const isMegaPairMarker = ev.mechanism === '-mega' && !String(ev.toSpecies || '').trim();
        if (isMegaPairMarker) break;
        const slotInfoBefore = this._slotInfoFor(side, slot);
        const preName = this._slotName(side, slot);
        const toSpecies = String(ev.toSpecies || ev.to || '').trim();
        const visual = await this._resolveVisual(ev);
        const formPresentation = this._resolveFormChangePresentation(
          visual?.formChangePresentation || null,
          ev,
          slotInfoBefore,
        );
        if (visual?.spriteUrl) {
          const shouldShowSprite = formPresentation.isVisible !== false;
          await this._setBattlerSprite(side, visual.spriteUrl, { visible: shouldShowSprite });
        }
        let nextName = toSpecies;
        if (!nextName && visual?.infoPatch?.displayName) {
          nextName = String(visual.infoPatch.displayName || '').trim();
        }
        if (nextName) this._slotNames.set(this._slotKey(side, slot), nextName);
        if (toSpecies || visual?.infoPatch) {
          const formPatch = {
            ...(visual?.infoPatch || {}),
          };
          if (toSpecies) formPatch.displayName = toSpecies;
          else if (nextName && !formPatch.displayName) formPatch.displayName = nextName;
          this._applyInfoForSlot(side, slot, {
            ...formPatch,
          });
        }
        await this._playFormChangePresentation(side, formPresentation);
        const changed = nextName && toId(nextName) !== toId(preName);
        const shouldShowFallback = ev.mechanism === '-formechange' && !nextName;
        const hpBefore = Number(slotInfoBefore?.hp);
        const suppressMessageByFaint = Boolean(slotInfoBefore?.fainted)
          || (Number.isFinite(hpBefore) && hpBefore <= 0);
        if (!suppressMessageByFaint && !ev.silent && (changed || shouldShowFallback)) {
          const msg = this._buildFormChangeMessage(preName, nextName, ev.mechanism);
          if (msg) {
            await this._showMsg(msg, { minMs: 620 });
          }
        }
        break;
      }

      // ── 5-C: Battle end ─────────────────────────────────────────────────
      case 'battle_end': {
        // ev.winner is the Showdown player name of the winner.
        if (ev.winner) {
          await this._showMsg(`${ev.winner} 승리!`, { minMs: 1300 });
          this._playAudio('se/level_up');
        }
        break;
      }

      // ── no-op events ──────────────────────────────────────────────────────
      case 'weather_tick':
      case 'turn_end':
      case 'effect_activate':
      case 'single_turn_effect':
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
