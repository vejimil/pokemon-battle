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

export class BattleTimelineExecutor {
  /**
   * @param {object} opts
   * @param {function(string): void}   [opts.onInputRequired]  called when request_gate fires
   * @param {function(): void}         [opts.onComplete]       called when all events are played
   * @param {function(): void}         [opts.applySnapshot]    called by fastForward to apply final state
   * @param {function(): object}       [opts.scene]            getter returning current Phaser scene (may be null)
   * @param {string}                   [opts.playerSide]       Showdown side id for local player ('p1'|'p2')
   * @param {Record<string, string>}   [opts.initialNames]     pre-seeded slot→species map (key: "p1_0", "p2_0")
   */
  constructor({ onInputRequired, onComplete, applySnapshot, scene, playerSide, initialNames } = {}) {
    this.onInputRequired = onInputRequired ?? (() => {});
    this.onComplete = onComplete ?? (() => {});
    this._applySnapshot = applySnapshot ?? (() => {});
    this._scene = scene ?? (() => null);
    this._playerSide = playerSide ?? 'p1';
    this.running = false;
    // Tracks species name per slot. Key: "${side}_${slot}" e.g. "p1_0", "p2_0".
    // Pre-seeded from initialNames (previous turn's final roster).
    this._slotNames = new Map(Object.entries(initialNames ?? {}));
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

  /** Set battle message box text immediately (reading time provided by surrounding _delay calls). */
  _showMsg(text) {
    this._msg?.showText?.(String(text || ''));
  }

  /** Get the tracked species name for a side+slot, or '???' if unknown. */
  _slotName(side, slot = 0) {
    return this._slotNames.get(`${side}_${slot}`) || '???';
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
        const species = ev.species || '???';
        // Track this pokemon for later move/faint messages
        this._slotNames.set(`${ev.side}_${ev.slot ?? 0}`, species);

        // BA-1: Show switch message
        const label = ev.side === this._playerSide
          ? `가라! ${species}!`
          : `상대의 ${species} 등장!`;
        this._showMsg(label);

        if (ev.fromBall) this._audio?.play('se/pb_rel');
        await this._delay(700);

        // BA-2: play Pokémon cry via dex number → cry/<num>.m4a
        // Await the load so the cry plays even on first load (avoids 500ms timeout miss).
        const dexNum = speciesToDexNum(species);
        if (dexNum) await this._audio?.playCryByNum?.(dexNum);
        await this._delay(ev.fromBall ? 300 : 100);
        break;
      }

      // ── BA-1: Move use ───────────────────────────────────────────────────
      case 'move_use': {
        const actorName = this._slotName(ev.actor?.side, ev.actor?.slot ?? 0);
        this._showMsg(`${actorName}의 ${ev.move}!`);
        // Play move animation sound effect (lazy-loaded from anim-data/).
        await this._audio?.playMoveSe(ev.move);
        await this._delay(500);
        break;
      }

      // ── BA-1: Damage ─────────────────────────────────────────────────────
      case 'damage': {
        this._audio?.playHitByResult(ev.hitResult ?? 'effective');
        await this._delay(100);
        const hpPct = ev.maxHp > 0 ? (ev.hpAfter / ev.maxHp) * 100 : 0;
        const info = this._infoForSide(ev.target?.side);
        if (info?.tweenHpTo) {
          await info.tweenHpTo(hpPct);
        } else {
          await this._delay(500);
        }
        // Show hit result message after HP tween
        let hitMsg = null;
        if (ev.critical)                        hitMsg = '급소에 맞았다!';
        else if (ev.hitResult === 'super')       hitMsg = '효과는 굉장했다!';
        else if (ev.hitResult === 'not_very')    hitMsg = '효과는 별로인 것 같다...';
        if (hitMsg) {
          this._showMsg(hitMsg);
          await this._delay(600);
        }
        break;
      }

      // ── Heal ─────────────────────────────────────────────────────────────
      case 'heal': {
        const healPct = ev.maxHp > 0 ? (ev.hpAfter / ev.maxHp) * 100 : 0;
        const healInfo = this._infoForSide(ev.target?.side);
        if (healInfo?.tweenHpTo) {
          await healInfo.tweenHpTo(healPct);
        } else {
          await this._delay(300);
        }
        break;
      }

      // ── BA-1: Faint ──────────────────────────────────────────────────────
      case 'faint': {
        const faintName = this._slotName(ev.side, ev.slot ?? 0);
        this._showMsg(`${faintName} 기절!`);
        this._audio?.play('se/faint');
        await this._delay(900);
        break;
      }

      // ── BA-3: Ability bar ────────────────────────────────────────────────
      case 'ability_show': {
        const abilityOwner = this._slotName(ev.side, ev.slot ?? 0);
        this._showMsg(`${abilityOwner}의 특성: ${ev.ability}!`);
        const ui = this._ui;
        if (ui?.abilityBar) {
          ui.abilityBar.update({
            visible: true,
            text: ev.ability,
            side: ev.side === this._playerSide ? 'player' : 'enemy',
          });
        }
        await this._delay(1200);
        // Hide bar; renderBattle() will restore final state on onComplete.
        if (ui?.abilityBar) {
          ui.abilityBar.update({ visible: false, text: '' });
        }
        break;
      }

      // ── BA-3: Weather ────────────────────────────────────────────────────
      case 'weather_start': {
        const wLabel = WEATHER_LABELS[toId(ev.weather)] ?? `날씨 변화: ${ev.weather}`;
        this._showMsg(wLabel);
        await this._delay(800);
        break;
      }

      case 'weather_end': {
        this._showMsg('날씨가 원래대로 돌아왔다.');
        await this._delay(600);
        break;
      }

      // BA-3: weather_tick is intentionally silent — avoid spamming messages every turn.

      // ── BA-3: Terrain ────────────────────────────────────────────────────
      case 'terrain_start': {
        const effectId = toId(ev.effect || ev.raw || '');
        const tLabel = TERRAIN_LABELS[effectId] ?? `필드 효과 시작: ${ev.effect}`;
        this._showMsg(tLabel);
        await this._delay(700);
        break;
      }

      case 'terrain_end': {
        this._showMsg('필드 효과가 사라졌다.');
        await this._delay(600);
        break;
      }

      // ── no-op events ──────────────────────────────────────────────────────
      case 'weather_tick':
      case 'turn_end':
      case 'status_apply':
      case 'status_cure':
      case 'boost':
      case 'unboost':
      case 'side_start':
      case 'side_end':
      case 'immune':
      case 'miss':
      case 'cant_move':
      case 'effect_activate':
      case 'single_turn_effect':
      case 'forme_change':
      case 'battle_end':
      case 'engine_error':
        break;

      case 'callback_event':
        // Input gate: pause and notify caller to surface switch UI.
        this.running = false;
        this.onInputRequired(ev.requestType ?? 'switch');
        return;  // do not continue; caller must re-invoke play() after choice is made

      case 'raw_event':
      default:
        break;
    }
  }
}
