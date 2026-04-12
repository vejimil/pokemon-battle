# M0 Event Coverage Matrix

Date: 2026-04-12 (UTC)

## Scope
- Goal: lock a complete protocol/event inventory before implementation.
- In-scope: `protocol tag -> structured event -> presentation hook(animation/audio/message/locale)`.
- Out-of-scope: runtime code changes (no implementation in this phase).

## Evidence (code + artifacts)
- Parser baseline: `server/showdown-engine.cjs:217` (`normalizeLogTextFromLine`).
- Runtime observation artifact: `reports/m0-tag-scan.json`.
- PokeRogue turn/presentation references:
  - `pokerogue_codes/src/phases/turn-init-phase.ts`
  - `pokerogue_codes/src/phases/turn-start-phase.ts`
  - `pokerogue_codes/src/phase-manager.ts:230` (`turnEndPhases`)
  - `pokerogue_codes/src/phases/summon-phase.ts:167` (`se/pb_rel`)
  - `pokerogue_codes/src/phases/damage-anim-phase.ts` (`se/hit*`)
  - `pokerogue_codes/src/phases/faint-phase.ts:199` (`se/faint`)

## 1) Inventory Summary

| Metric | Value |
|---|---:|
| Parser-supported tags (`normalizeLogTextFromLine`) | 31 |
| Observed tags in dynamic scan (`m0-tag-scan.json`) | 35 |
| Observed but not parser-supported | 17 |
| Parser-supported but not observed in sampled scenarios | 13 |

Interpretation:
- Parser scope is battle-log text focused and partial.
- Actual engine stream includes control/meta tags and additional battle tags (`-activate`, `-singleturn`, `-crit`, `-miss`) that must be covered by typed events or `raw_event` fallback.

## 2) Parser Tag Coverage Matrix (31 tags)

Status legend:
- `Spec-Fixed`: event mapping and presentation target are locked in M0.
- `Spec-Fixed(raw)`: mapped to generic passthrough (`raw_event`) by design.
- `Deferred`: not P0 core loop but mapped for later batch.

| Protocol tag | Target event type(s) | Presentation hooks (target) | Priority | Status | Notes |
|---|---|---|---|---|---|
| `turn` | `turn_start` | message + turn chip update | P0 | Spec-Fixed | Turn boundary anchor. |
| `switch` | `switch_in` | ball release anim + `se/pb_rel` + cry + message | P0 | Spec-Fixed | Summon reference in PokeRogue `SummonPhase`. |
| `drag` | `switch_in` (`cause: drag`) | forced-switch message + summon sequence | P1 | Spec-Fixed | Same visual path as switch, different reason metadata. |
| `move` | `move_use`, `move_anim` | move header/message + move anim start | P0 | Spec-Fixed | Ordering by server sequence. |
| `faint` | `faint` | faint cry + `se/faint` + drop/fade + message | P0 | Spec-Fixed | Sound key verified in source. |
| `-damage` | `damage` | HP tween + hit SE (`se/hit*`) + damage number | P0 | Spec-Fixed | Damage amount derived via HP delta cache. |
| `-heal` | `heal` | HP tween up + heal message | P1 | Spec-Fixed | Optional heal SE later. |
| `-status` | `status_apply` | status icon update + message | P1 | Spec-Fixed | Locale namespace: `battle`/status strings. |
| `-curestatus` | `status_cure` | status clear + message | P1 | Spec-Fixed | |
| `-ability` | `ability_show` (+ timed `ability_hide`) | ability bar show/hide + message | P0 | Spec-Fixed | PokeRogue uses `ShowAbilityPhase`/`HideAbilityPhase`. |
| `-boost` | `boost` | stat-up message + optional stat VFX/SFX | P1 | Spec-Fixed | |
| `-unboost` | `unboost` | stat-down message + optional stat VFX/SFX | P1 | Spec-Fixed | |
| `-weather` | `weather_start`/`weather_tick`/`weather_end` | weather message + field overlay/tick | P0 | Spec-Fixed | `upkeep` correlation required for tick/end disambiguation. |
| `-fieldstart` | `field_start` or `terrain_start` | field/terrain banner + message | P0 | Spec-Fixed | Terrain normalization by effect id. |
| `-fieldend` | `field_end` or `terrain_end` | field/terrain end banner + message | P0 | Spec-Fixed | |
| `-sidestart` | `side_start` | side-condition icon/message | P1 | Spec-Fixed | e.g., screens, hazards. |
| `-sideend` | `side_end` | side-condition clear/message | P1 | Spec-Fixed | |
| `-start` | `volatile_start` | volatile state message/VFX | P1 | Spec-Fixed | |
| `-end` | `volatile_end` | volatile clear message/VFX | P1 | Spec-Fixed | |
| `-mega` | `mega_evo` | form change anim + message | P2 | Deferred | |
| `-zpower` | `zpower` | z-power cue + message | P2 | Deferred | |
| `-terastallize` | `terastallize` | tera anim + message | P2 | Deferred | |
| `-formechange` | `forme_change` | sprite swap + message | P1 | Spec-Fixed | |
| `detailschange` | `forme_change` | sprite/details refresh + message | P1 | Spec-Fixed | |
| `-supereffective` | `effectiveness` (`super`) | postfix message cue | P1 | Spec-Fixed | Usually paired with damage. |
| `-resisted` | `effectiveness` (`not_very`) | postfix message cue | P1 | Spec-Fixed | |
| `-immune` | `immune` | immunity message cue | P1 | Spec-Fixed | |
| `miss` | `miss` | miss message cue | P1 | Spec-Fixed | Also support `-miss` alias from observed stream. |
| `cant` | `cant_move` | cannot-move message cue | P1 | Spec-Fixed | |
| `win` | `battle_end` | win message + end state | P0 | Spec-Fixed | |
| `error` | `engine_error` | error banner/message, safe fallback | P0 | Spec-Fixed | Non-silent failure policy. |

## 3) Observed-Only Tags (not in parser baseline)

Source: `reports/m0-tag-scan.json` `observedNotInParser`.

| Observed tag | Mapping decision | Status | Note |
|---|---|---|---|
| `-activate` | `effect_activate` (typed) | Spec-Fixed | Needed for Protect-like events. |
| `-singleturn` | `single_turn_effect` (typed) | Spec-Fixed | Temporary one-turn effects. |
| `-crit` | `critical` (typed marker) | Spec-Fixed | Joins with subsequent damage/message. |
| `-miss` | normalize to `miss` | Spec-Fixed | Alias handling required. |
| `upkeep` | `upkeep_tick` | Spec-Fixed | Weather/seed/tick grouping anchor. |
| `start` | `battle_start` | Spec-Fixed | Battle-start boundary. |
| `raw` | `raw_event` | Spec-Fixed(raw) | Keep text payload, never silent drop. |
| `debug` | `debug_event` | Spec-Fixed(raw) | Hidden in prod UI, retained in trace. |
| `t:` | `meta_timestamp` | Spec-Fixed(raw) | Trace/debug only. |
| `player` | `meta_player` | Spec-Fixed(raw) | Pre-battle metadata. |
| `poke` | `meta_team_member` | Spec-Fixed(raw) | Pre-battle metadata. |
| `teamsize` | `meta_teamsize` | Spec-Fixed(raw) | Pre-battle metadata. |
| `teampreview` | `meta_teampreview` | Spec-Fixed(raw) | Pre-battle metadata. |
| `gametype` | `meta_gametype` | Spec-Fixed(raw) | Pre-battle metadata. |
| `gen` | `meta_gen` | Spec-Fixed(raw) | Pre-battle metadata. |
| `tier` | `meta_tier` | Spec-Fixed(raw) | Pre-battle metadata. |
| `clearpoke` | `meta_clearpoke` | Spec-Fixed(raw) | Pre-battle metadata. |

## 4) Audio/Locale Readiness Check (for mapped hooks)

Audio inventory (`assets/pokerogue/audio`):
- `battle_anims`: 1310
- `bgm`: 182
- `cry`: 1200
- `se`: 37
- `ui`: 3

Key files verified for P0/P1:
- `se/pb_rel.wav`, `se/hit.wav`, `se/hit_strong.wav`, `se/hit_weak.wav`, `se/faint.wav`
- `ui/select.wav`, `ui/error.wav`, `ui/menu_open.wav`

Locale inventory (`assets/pokerogue/locales`):
- `en` + `ko`, JSON total: 128
- Critical namespace key parity (EN/KO):
  - `battle`, `ability-trigger`, `move-trigger`, `weather`, `terrain`, `battle-message-ui-handler`, `party-ui-handler`, `pokemon-summary`
  - Result: missing key 0 / 0 on sampled namespaces.

## 5) Gate Result (M0)

- Parser/observed tag union now has a locked handling policy for every known tag:
  - typed battle event, or
  - explicit `raw_event` passthrough.
- `silent drop` policy: not allowed.
- M0 event catalog is complete enough to start M1 schema work without unresolved tag class.

---

## 6) Post-M0 Addendum (2026-04-12)

Additional entries added to catalog after cross-review of plan.md and server code.
These were absent from both `parserTags` and `observedTags` in `m0-tag-scan.json`.

| Protocol tag / source | Target event type | Presentation hooks | Priority | Status | Notes |
|---|---|---|---|---|---|
| `|request|` (JSON body, side-specific) | `request_gate` (synthesized on type transition) | yield execution; surface command/switch UI | P0 | Spec-Fixed | Already parsed by server into `this.requests`; not in log stream. Gate fires only on `move`/`switch` type. |
| `|callback|` (e.g. `trapped`, `cantUndo`) | `callback_event` | forced-switch UI gate | P0 | Spec-Fixed | Currently **unhandled** in server. Must be added. |
| `turn_end` (synthesized) | `turn_end` | turn boundary; clear transient state | P0 | Spec-Fixed | No Showdown tag. Server emits retroactively on next `|turn|` or `|win|`. |

Additional parser corrections needed before M1:
- **`-weather [upkeep]` rendering bug**: `normalizeLogTextFromLine:263` uses `b || a` which renders `[upkeep]` as weather name on upkeep ticks. Fix: use `a` unconditionally.
- **`-crit` accumulator**: must pair with subsequent `-damage` line for `critical: boolean` field. Not a standalone display event.
- **`-supereffective` / `-resisted` accumulator**: pair with subsequent `-damage` for `hitResult` field.
- **`move_anim` scope**: visual animation IS implementable. `anim-data/` (923 JSON), `battle-anims/` (193 JSON), `battle__anims/` (646 PNG), `audio/battle_anims/` (1310 WAV) 모두 존재 확인. Sprint 순서상 오디오 선행, 비주얼은 `BattleAnim` 이식 후 추가.

