/**
 * BattleTimelineExecutor (M3 — Sprint 1: no-op mode)
 *
 * Consumes the `events` array from a snapshot and plays them sequentially.
 * In Sprint 1, all handlers are no-ops; execution just logs events to console.
 * Real presentation handlers will be wired in Sprint 2a/2b.
 *
 * Usage:
 *   const executor = new BattleTimelineExecutor({ onInputRequired, onComplete });
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
   */
  constructor({ onInputRequired, onComplete, applySnapshot } = {}) {
    this.onInputRequired = onInputRequired ?? (() => {});
    this.onComplete = onComplete ?? (() => {});
    this._applySnapshot = applySnapshot ?? (() => {});
    this.running = false;
  }

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
    // Dev panel: log the full event stream once
    console.log('[BattleEvents] turn events received:', events.length, 'events', events);
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
   * Apply a single event. All handlers are no-ops in Sprint 1.
   * @param {object} ev
   * @param {object} context
   */
  async _applyEvent(ev, context) {  // eslint-disable-line no-unused-vars
    // Sprint 1: log each event, do nothing else.
    // Sprint 2+: replace with real presentation handlers per ev.type.
    switch (ev.type) {
      case 'turn_start':
      case 'turn_end':
      case 'switch_in':
      case 'ability_show':
      case 'weather_start':
      case 'weather_tick':
      case 'weather_end':
      case 'terrain_start':
      case 'terrain_end':
      case 'move_use':
      case 'damage':
      case 'heal':
      case 'faint':
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
        // no-op in Sprint 1
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

  /**
   * Skip remaining events and apply the final snapshot state immediately.
   * Call on error/timeout, or expose to user as a "skip animation" control.
   */
  fastForward() {
    this.running = false;
    this._applySnapshot();
  }
}
