/**
 * BattleTimelineExecutor (M3 — Sprint 2b: core presentation)
 *
 * Consumes the `events` array from a snapshot and plays them sequentially.
 * Sprint 2b wires: switch_in (pb_rel SE), move_use (move SE), damage (hit SE + HP tween), faint (faint SE).
 *
 * Usage:
 *   const executor = new BattleTimelineExecutor({ onInputRequired, onComplete, applySnapshot, scene });
 *   await executor.play(snapshot.events, context);
 *
 * Feature flag: only instantiated when FLAGS.battlePresentationV2 === true.
 */
export class BattleTimelineExecutor {
  /**
   * @param {object} opts
   * @param {function(string): void} [opts.onInputRequired]  called when request_gate fires
   * @param {function(): void}       [opts.onComplete]       called when all events are played
   * @param {function(): void}       [opts.applySnapshot]    called by fastForward to apply final state
   * @param {function(): object}     [opts.scene]            getter returning current Phaser scene (may be null)
   * @param {string}                 [opts.playerSide]       Showdown side id for local player ('p1'|'p2'), default 'p1'
   */
  constructor({ onInputRequired, onComplete, applySnapshot, scene, playerSide } = {}) {
    this.onInputRequired = onInputRequired ?? (() => {});
    this.onComplete = onComplete ?? (() => {});
    this._applySnapshot = applySnapshot ?? (() => {});
    this._scene = scene ?? (() => null);
    this._playerSide = playerSide ?? 'p1';
    this.running = false;
  }

  // ── accessors ─────────────────────────────────────────────────────────────

  get _audio() { return this._scene()?.audio ?? null; }
  get _ui()    { return this._scene()?.ui    ?? null; }

  /** Returns the BattleInfo panel for the given Showdown side id ('p1'|'p2'). */
  _infoForSide(side) {
    const ui = this._ui;
    if (!ui) return null;
    return side === this._playerSide ? ui.playerInfo : ui.enemyInfo;
  }

  _delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ── public API ─────────────────────────────────────────────────────────────

  /**
   * Play events array sequentially.
   * @param {Array<object>} events
   * @param {object} [context]  arbitrary context passed to each handler
   */
  async play(events = [], context = {}) {
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

      case 'switch_in': {
        // Play Pokéball release SE when a Pokémon is sent out from a ball.
        if (ev.fromBall) this._audio?.play('se/pb_rel');
        // Cry playback requires species → dex-number mapping (not yet implemented).
        // Sprint 3: resolve cry from species name.
        await this._delay(ev.fromBall ? 300 : 100);
        break;
      }

      case 'move_use': {
        // Play move animation sound effect (lazy-loaded from anim-data/).
        // Silently skips if no audio file exists for this move.
        await this._audio?.playMoveSe(ev.move);
        await this._delay(200);
        break;
      }

      case 'damage': {
        // Play hit SE appropriate to hit result, then animate HP bar.
        this._audio?.playHitByResult(ev.hitResult ?? 'effective');
        await this._delay(100);
        const hpPct = ev.maxHp > 0 ? (ev.hpAfter / ev.maxHp) * 100 : 0;
        const info = this._infoForSide(ev.target?.side);
        if (info?.tweenHpTo) {
          await info.tweenHpTo(hpPct);
        } else {
          await this._delay(500);
        }
        break;
      }

      case 'heal': {
        // Animate HP bar upward without a hit SE.
        const healPct = ev.maxHp > 0 ? (ev.hpAfter / ev.maxHp) * 100 : 0;
        const healInfo = this._infoForSide(ev.target?.side);
        if (healInfo?.tweenHpTo) {
          await healInfo.tweenHpTo(healPct);
        } else {
          await this._delay(300);
        }
        break;
      }

      case 'faint': {
        this._audio?.play('se/faint');
        await this._delay(600);
        break;
      }

      // ── no-op events (will be wired in Sprint 3+) ──────────────────────────
      case 'turn_start':
      case 'turn_end':
      case 'ability_show':
      case 'weather_start':
      case 'weather_tick':
      case 'weather_end':
      case 'terrain_start':
      case 'terrain_end':
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
