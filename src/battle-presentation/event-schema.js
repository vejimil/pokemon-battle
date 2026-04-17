/**
 * Battle event schema definitions (M1 — Sprint 1)
 *
 * All events share BattleEventBase fields:
 *   seq   {number}       monotonic sequence from server
 *   turn  {number|null}  current turn number (null for pre-battle meta events)
 *   type  {string}       event type discriminant
 *
 * Event arrays are emitted by the server in the `snapshot.events` field.
 * The timeline executor (timeline.js) consumes them sequentially.
 */

/**
 * Known event type strings.
 * Keep in sync with normalizeEventsFromLine() in server/showdown-engine.cjs.
 */
export const EVENT_TYPES = /** @type {const} */ ({
  // Turn boundary (synthesized — no direct Showdown tag)
  TURN_START:          'turn_start',
  TURN_END:            'turn_end',        // synthesized on next turn_start or battle_end

  // Battle lifecycle
  BATTLE_END:          'battle_end',
  ENGINE_ERROR:        'engine_error',

  // Field entry
  SWITCH_IN:           'switch_in',       // tags: switch, drag

  // Move
  MOVE_USE:            'move_use',        // tag: move

  // Damage / heal
  DAMAGE:              'damage',          // tag: -damage  (critical, hitResult folded in)
  HEAL:                'heal',            // tag: -heal

  // Faint
  FAINT:               'faint',

  // Ability
  ABILITY_SHOW:        'ability_show',    // tag: -ability

  // Weather / terrain / field
  WEATHER_START:       'weather_start',
  WEATHER_TICK:        'weather_tick',
  WEATHER_END:         'weather_end',
  TERRAIN_START:       'terrain_start',
  TERRAIN_END:         'terrain_end',

  // Status
  STATUS_APPLY:        'status_apply',
  STATUS_CURE:         'status_cure',

  // Stat change
  BOOST:               'boost',
  UNBOOST:             'unboost',

  // Side conditions
  SIDE_START:          'side_start',
  SIDE_END:            'side_end',

  // Hit result markers
  IMMUNE:              'immune',    // move had no effect (type immunity)
  MOVE_FAIL:           'move_fail', // move failed (protect, no target, etc.)
  MISS:                'miss',
  CANT_MOVE:           'cant_move',

  // Effects
  EFFECT_ACTIVATE:     'effect_activate',
  SINGLE_TURN_EFFECT:  'single_turn_effect',

  // Forme
  TERASTALLIZE:        'terastallize',
  FORME_CHANGE:        'forme_change',

  // Input gates (synthesized / currently unhandled in server — added per plan §11.1)
  CALLBACK_EVENT:      'callback_event',

  // Passthrough
  RAW_EVENT:           'raw_event',
});

/**
 * Type guard: returns true if the event type is a Batch A (P0) core-loop type.
 * @param {string} type
 */
export function isCoreEvent(type) {
  return [
    EVENT_TYPES.TURN_START, EVENT_TYPES.TURN_END,
    EVENT_TYPES.SWITCH_IN,
    EVENT_TYPES.ABILITY_SHOW,
    EVENT_TYPES.WEATHER_START, EVENT_TYPES.WEATHER_TICK, EVENT_TYPES.WEATHER_END,
    EVENT_TYPES.TERRAIN_START, EVENT_TYPES.TERRAIN_END,
    EVENT_TYPES.MOVE_USE,
    EVENT_TYPES.DAMAGE,
    EVENT_TYPES.TERASTALLIZE,
    EVENT_TYPES.FAINT,
    EVENT_TYPES.CALLBACK_EVENT,
    EVENT_TYPES.BATTLE_END,
  ].includes(type);
}
