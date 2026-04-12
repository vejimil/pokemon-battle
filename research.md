# Battle Mechanics Research: Current PKB Runtime vs Pokérogue Battle Flow

Date: 2026-04-12  
Repository: `/workspaces/pokemon-battle`

## Scope
- Goal: analyze how "real Pokémon game-like" battle mechanics are implemented in relevant code.
- Focus mechanics: sendout from Poké Ball, ability activation, weather/terrain, move priority/animation ordering, HP decrease, sounds, messages, and related turn-flow behavior.
- Constraint: **no implementation changes** in this step.

## Executive Summary
The current app is **engine-snapshot driven** (server resolves turns and returns full snapshots), while Pokérogue is **phase/event driven** (client-side phase queue orchestrates animation/audio/message cadence).  

Because of this architectural difference:
- Move order correctness is delegated to Showdown and is logically correct.
- But battle presentation timing is not phase-authored in the client.
- Imported `assets/pokerogue/audio` and `assets/pokerogue/locales` are present on disk, but not wired into the current runtime.
- Current UI behavior for ability bar/messages is largely derived from log text heuristics rather than explicit battle events.
- M0 verification artifacts are now fixed in:
  - `reports/m0-tag-scan.json`
  - `reports/event-coverage-matrix.md`
  - `reports/ui-parity-checklist.md`
- Verified tag inventory: parser baseline 31 tags vs observed stream 35 tags, with explicit handling policy fixed for observed-only tags (`-activate`, `-singleturn`, `-crit`, `-miss`, meta/control tags).
- Verified UI parity gap: PKB currently has no `UiMode.SUMMARY` chain (`PARTY -> SUMMARY -> PARTY` is not wired yet).

---

## 1) Current Runtime: How Mechanics Work Today

### 1.1 Battle start and turn loop (app side)
Primary flow in [`src/app.js`](src/app.js):
- `startBattle()` allows only `engine-authoritative-singles` (`src/app.js:4603-4633`).
- Battle starts via `startEngineAuthoritativeSinglesBattle()` -> `startShowdownLocalSinglesBattle(payload)` -> snapshot adopt (`src/app.js:4564-4569`, `src/app.js:4593-4600`).
- During rendering, if both sides are ready, `resolveTurn()` auto-runs (`src/app.js:6637-6641`).
- Turn resolution for supported runtime:
  - `resolveEngineTurn()` -> `submitShowdownLocalSinglesChoices({ battleId, battle })` -> replace snapshot (`src/app.js:6763-6767`).

Implication:
- The client does not execute per-action battle phases (sendout phase, ability phase, damage phase, etc.).
- It receives post-resolution state and logs, then renders UI from that state.

### 1.2 Local bridge and server protocol path
In [`src/engine/showdown-local-bridge.js`](src/engine/showdown-local-bridge.js):
- `startShowdownLocalSinglesBattle()` calls `POST /api/battle/start` and returns `data.snapshot` (`:72-78`).
- `submitShowdownLocalSinglesChoices()` builds Showdown choice strings and calls `POST /api/battle/choice` (`:80-106`).
- Choice serialization includes flags for `mega`, `ultra`, `terastallize`, `zmove`, `dynamax` (`:119-130`).

In [`server/server.cjs`](server/server.cjs):
- Endpoints:
  - `GET /api/engine/status` (`:125-127`)
  - `POST /api/battle/start` (`:130-134`)
  - `POST /api/battle/choice` (`:137-141`)

In [`server/showdown-engine.cjs`](server/showdown-engine.cjs):
- Uses local vendored `@pkmn/sim` `BattleStreams` (`:1`, `:458`).
- Reads protocol output, parses `|request|` and other lines (`:485-513`).
- Converts protocol lines to localized/bilingual log entries via `normalizeLogTextFromLine()` (`:217-303`).
- Snapshot contains:
  - `turn`, `players`, `request`, weather/terrain/trick-room fields (`:705-717`)
  - `log` list (`:717`)
- Turn choice handling sends p1/p2 commands and returns next snapshot (`:559-566`).

Implication:
- Battle sequencing events are flattened into updated snapshot + log text; no explicit timeline payload for animation/audio synchronization.

### 1.3 Current messages and ability UI behavior
In [`src/app.js`](src/app.js):
- Message panel model from prompt + top 1~2 log lines (`buildBattleMessageModel`, `:6211-6248`; legacy renderer at `:5620-5659`).
- Ability flyout is regex/log-tone driven, not event-driven:
  - `updateBattleAbilityBarState()` (`:6181-6209`)
  - `maybeShowBattleAbilityFlyout()` (`:5662-5690`)
- Heuristics include keyword matching such as `ability|intimidate|download|tera|mega|...`.

Implication:
- Ability display timing is inferred from latest text, not authoritative ability activation events.

### 1.4 Current Phaser transplant runtime behavior
Core files:
- Asset preload: [`src/pokerogue-transplant-runtime/runtime/assets.js`](src/pokerogue-transplant-runtime/runtime/assets.js:3-56)
- Asset constants: [`src/pokerogue-transplant-runtime/runtime/constants.js`](src/pokerogue-transplant-runtime/runtime/constants.js:11-63)
- Scene shell: [`src/pokerogue-transplant-runtime/scene/battle-shell-scene.js`](src/pokerogue-transplant-runtime/scene/battle-shell-scene.js)
- UI root: [`src/pokerogue-transplant-runtime/ui/ui.js`](src/pokerogue-transplant-runtime/ui/ui.js)

Observed behavior:
- Preloads UI/arena/image assets only; no audio loading path.
- `playSelect()` / `playError()` are stubs returning `false` (`ui.js:128-134`).
- Message handler in transplant runtime is simplified immediate text display:
  - [`ui/handlers/message-ui-handler.js`](src/pokerogue-transplant-runtime/ui/handlers/message-ui-handler.js:52-71)
  - no upstream-style action-tag parsing (`@c/@d/@s/@f`).
- Battle message handler renders text + optional speaker + prompt icon (`battle-message-ui-handler.js:110-127`).
- HP/EXP bars tween visually (`battle-info/battle-info.js:323-349`, `player-battle-info.js:98-174`) but without SFX hooks.

Implication:
- There is presentation polish (sprite animation, UI tweening), but no integrated battle-phase audio/message choreography pipeline.

### 1.5 Current localization approach in app
In [`src/app.js`](src/app.js):
- Static `UI_STRINGS` object for KO/EN (`:1683-1820`).
- `localizeText()` chooses slash-separated bilingual fragments (`:2061-2097`).
- No i18next namespace loading from `assets/pokerogue/locales`.

Implication:
- Imported Pokérogue locale namespaces are not currently consumed by the active app runtime.

---

## 2) Pokérogue Reference: How These Mechanics Are Implemented There

### 2.1 Phase manager and dynamic queue model
In [`pokerogue_codes/src/phase-manager.ts`](pokerogue_codes/src/phase-manager.ts):
- Central phase registry and queue manager.
- End-turn phase chain defined as:
  - `WeatherEffectPhase` -> `PositionalTagPhase` -> `BerryPhase` -> `CheckStatusEffectPhase` -> `TurnEndPhase` (`:229-236`).
- `queueMessage()` inserts `MessagePhase` (`:438-451`).
- `queueAbilityDisplay()` inserts `ShowAbilityPhase` / `HideAbilityPhase` (`:459-461`).
- `queueTurnEndPhases()` appends canonical end-turn phases (`:590-595`).

In [`pokerogue_codes/src/dynamic-queue-manager.ts`](pokerogue_codes/src/dynamic-queue-manager.ts):
- Special priority queues for:
  - `PostSummonPhase`
  - `MovePhase` (`:46-49`).

### 2.2 Turn init -> command -> move ordering
- [`turn-init-phase.ts`](pokerogue_codes/src/phases/turn-init-phase.ts:59-77): queues `CommandPhase` / `EnemyCommandPhase`, then `TurnStartPhase`.
- [`turn-start-phase.ts`](pokerogue_codes/src/phases/turn-start-phase.ts):
  - computes command order (`:21-47`), where non-fight commands preempt fight.
  - queues `MovePhase` for fight commands (`:138-160`).
  - appends end-turn phases (`:97-105`).
- [`move-phase-priority-queue.ts`](pokerogue_codes/src/queues/move-phase-priority-queue.ts:23-35): resolves move order by
  - timing modifier (FIRST/LAST)
  - move priority
  - in-bracket priority modifiers
  - speed ordering from parent queue.

### 2.3 Sendout from Poké Ball and post-summon ability flow
- [`summon-phase.ts`](pokerogue_codes/src/phases/summon-phase.ts):
  - pre-summon dialogue and trainer animation (`:73-117`)
  - Poké Ball tween + `se/pb_rel` + particles + spawn + cry + field setup (`:122-203`)
- [`switch-summon-phase.ts`](pokerogue_codes/src/phases/switch-summon-phase.ts):
  - return text/sfx and re-sendout flow (`:91-113`, `:184-210`)
  - explicitly queues `PostSummonPhase` (`:261-263`)
- [`post-summon-phase.ts`](pokerogue_codes/src/phases/post-summon-phase.ts):
  - entry hazards / pending heal tags / commander processing (`:22-36`)
- [`post-summon-phase-priority-queue.ts`](pokerogue_codes/src/queues/post-summon-phase-priority-queue.ts):
  - auto-queues `PostSummonActivateAbilityPhase` per ability priority (`:24-41`)
- [`post-summon-activate-ability-phase.ts`](pokerogue_codes/src/phases/post-summon-activate-ability-phase.ts):
  - applies `PostSummonAbAttr` (`:18-23`)
- Ability bar display phases:
  - `ShowAbilityPhase` (`show-ability-phase.ts`)
  - `HideAbilityPhase` (`hide-ability-phase.ts`)

### 2.4 Weather / terrain application and lapse
- In [`arena.ts`](pokerogue_codes/src/field/arena.ts):
  - `trySetWeather()` queues common weather anim + start/clear message + ability attrs (`:249-303`)
  - `trySetTerrain()` queues terrain anim + start/clear message + ability attrs (`:391-434`)
- [`weather-effect-phase.ts`](pokerogue_codes/src/phases/weather-effect-phase.ts):
  - applies damaging weather ticks with checks (`:36-73`)
  - enqueues weather lapse message and post-lapse ability attrs (`:76-83`)
- [`turn-end-phase.ts`](pokerogue_codes/src/phases/turn-end-phase.ts):
  - decrements weather/terrain durations and clears on expiry (`:71-78`)

### 2.5 Move execution, animation, damage, messages
- [`move-phase.ts`](pokerogue_codes/src/phases/move-phase.ts):
  - full pre-check sequence (`:243-267` and related methods)
  - queues "used move" text via locale key `battle:useMove` (`:693-699`)
  - executes via `MoveEffectPhase` then `MoveEndPhase` (`:900`, `:930-937`)
- [`move-effect-phase.ts`](pokerogue_codes/src/phases/move-effect-phase.ts):
  - hit checks per target (`:332-435`)
  - plays `MoveAnim` before post-animation callback (`:175-200`)
  - applies damage in `applyMoveDamage()` and queues crit/effectiveness/multi-hit messages (`:630-743`, `:876-880`)
  - queues faint phase on KO (`:751-753`)
- [`pokemon.ts`](pokerogue_codes/src/field/pokemon.ts):
  - `damageAndUpdate()` pre-queues `DamageAnimPhase`, applies HP, updates queued damage (`:4060-4105`)
- [`damage-anim-phase.ts`](pokerogue_codes/src/phases/damage-anim-phase.ts):
  - hit SFX routing (`se/hit`, `se/hit_strong`, `se/hit_weak`) (`:50-63`)
  - damage number and info update (`:65-89`)

### 2.6 Audio system in Pokérogue
- Loader helpers in [`scene-base.ts`](pokerogue_codes/src/scene-base.ts):
  - `loadSe()` -> `audio/<folder>/...` (`:74-83`)
  - `loadBgm()` -> `audio/bgm/...` (`:85-87`)
- Startup preload in [`loading-scene.ts`](pokerogue_codes/src/loading-scene.ts:320-373):
  - UI SE (`ui/select`, `ui/error`, etc.)
  - battle SE (`hit`, `pb_rel`, etc.)
  - fanfare/BGM keys
- Runtime mixer in [`battle-scene.ts`](pokerogue_codes/src/battle-scene.ts):
  - channel volumes (`masterVolume`, `bgmVolume`, `fieldVolume`, `seVolume`, `uiVolume`) (`:190-194`)
  - `playSound()` key-prefix routing (`battle_anims`, `cry`, `ui`, `se`, fanfare) (`:2442-2477`)
  - `updateSoundVolume()` applies live scaling (`:2391-2413`)
- Move-anim timed sounds in [`battle-anims.ts`](pokerogue_codes/src/data/battle-anims.ts):
  - timed sound event executes `globalScene.playSound("battle_anims/<name>")` (`:291-305`)
  - `loadMoveAnimAssets()` collects animation sound resources and `loadSe(..., "battle_anims")` (`:624-649`)
- Cry loading/playback:
  - species loads cry audio path (`pokemon-species.ts:651`)
  - cry play via `playSound` (`pokemon-species.ts:694-704`, `pokemon.ts:4619-4656`)

### 2.7 Localization and message semantics in Pokérogue
- i18next setup in [`plugins/i18n.ts`](pokerogue_codes/src/plugins/i18n.ts):
  - backend `loadPath` maps namespace to `./locales/<lng>/<file>.json` (`:200-213`)
  - namespace remaps via `namespaceMap` (`plugins/utils-plugins.ts:8-19`)
- Message control tags parsed in [`ui/handlers/message-ui-handler.ts`](pokerogue_codes/src/ui/handlers/message-ui-handler.ts):
  - `@c{}` character variant, `@d{}` delay, `@s{}` sound, `@f{}` fade (`:72-100`)
- Message phase in [`phases/message-phase.ts`](pokerogue_codes/src/phases/message-phase.ts):
  - handles page splitting (`$`) and prompt callback timing (`:32-83`)

---

## 3) Imported Asset Audit in This Repo

### 3.1 Audio assets present
Directory: `assets/pokerogue/audio`
- `battle_anims`: 1310 files
- `bgm`: 182 files
- `cry`: 1200 files
- `se`: 37 files
- `ui`: 3 files

Examples confirm key compatibility with upstream naming:
- `se/pb_rel.wav`, `se/hit.wav`, `se/hit_strong.wav`, `se/hit_weak.wav`
- `ui/select.wav`, `ui/error.wav`, `ui/menu_open.wav`
- many `battle_anims/*` entries including `PRSFX-*`

### 3.2 Locale assets present
Directory: `assets/pokerogue/locales`
- languages with namespace sets in this repo: `en`, `ko` (JSON total: 128 across both languages)
- battle-critical files include:
  - `battle.json` (`playerGo`, `trainerSendOut`, `useMove`, `attackHitsCount`, etc.)
  - `ability-trigger.json`
  - `move-trigger.json`
  - `weather.json`
  - `terrain.json`
  - `battle-message-ui-handler.json`
- EN/KO key parity spot-check for critical namespaces:
  - `battle`, `ability-trigger`, `move-trigger`, `weather`, `terrain`, `battle-message-ui-handler`, `party-ui-handler`, `pokemon-summary`
  - result: missing key count `0` for both directions in sampled namespaces

### 3.3 Current wiring status
Search results in current active runtime (`src`, `server`, `index.html`):
- no references to `assets/pokerogue/audio` loading pipeline
- no i18next/namespace locale loading from `assets/pokerogue/locales`

Conclusion:
- Assets are imported into repo and structurally aligned with Pokérogue conventions, but currently dormant in active app execution.

---

## 4) Mechanic-by-Mechanic Gap Analysis (Requested Behaviors)

| Requested behavior | Pokérogue reference behavior | Current repo behavior | Gap |
|---|---|---|---|
| Turn starts, Pokémon comes out of Poké Ball | `SummonPhase` performs throw/release tween, `se/pb_rel`, particles, cry, field setup | Snapshot updates active mons; sprite appears from model update; no explicit Poké Ball sendout timeline | High |
| Abilities are activated | `PostSummonActivateAbilityPhase` + `ShowAbilityPhase/HideAbilityPhase` with explicit sequencing | Ability text inferred from latest log via regex; flyout shown heuristically for 1.8s | High |
| Weather/terrain effects are applied | `trySetWeather`/`trySetTerrain` + weather/terrain phases + lapse/clear messaging and anims | Weather/terrain shown as snapshot labels + log strings; no authoritative client-side field effect phase playback | Medium-High |
| Move animations play by turn priority | `MovePhasePriorityQueue` + `MoveAnim`/`MoveAnimPhase` per move | Order resolved server-side, but client receives post-turn snapshot; no per-move animation timeline | High |
| HP decreases with correct cadence | `applyMoveDamage` -> `damageAndUpdate` -> `DamageAnimPhase` with SFX and UI sync | HP bars tween to snapshot values; no discrete damage phase per hit with event timing | Medium-High |
| Sounds play (SE, UI, cry, battle anim sounds) | Dedicated load/play/mix channels (`loadSe`, `playSound`, channel volumes) | Transplant UI sound methods are stubs; no battle audio pipeline wired | High |
| Messages appear in battle style | `queueMessage` + `MessagePhase` + i18next namespace keys + tag directives (`@c/@d/@s/@f`) | Prompt/log composition from top log lines + static bilingual heuristics | High |
| "And so on" (faint, multi-hit, crit/effectiveness text, post-turn effects) | Explicit phase chain and per-effect hooks | Mostly reflected as final snapshot/log after engine resolve | Medium-High |

---

## 5) Important Architectural Finding

The biggest blocker is not missing assets; it is **missing event granularity** between engine resolve and UI presentation.

Current flow:
1. collect choices
2. send once to engine
3. receive post-resolution snapshot + flattened logs
4. render end state

Pokérogue-like presentation needs event-level sequencing (examples: `summon start -> ball throw sfx -> release -> cry -> ability show -> weather anim -> move A anim -> hit sfx -> HP tick -> message -> move B ...`).

Without event granularity, animation/audio/message timing can only be approximated from text diff and state diff.

---

## 6) Integration Seams Identified for Future Implementation (Analysis Only)

### Seam A: Engine output layer
Potential direction: extend server-side protocol parsing (`server/showdown-engine.cjs`) to emit structured battle events in addition to current snapshot/log.

### Seam B: Client timeline executor
Potential direction: add a battle presentation scheduler in app/transplant runtime that consumes event stream and drives:
- battler entry/switch animations
- ability bar events
- move animation keys
- hit/HP/sfx timing
- message queue timing

### Seam C: Audio manager in transplant runtime
Potential direction: implement scene-level sound loader/router equivalent to upstream `playSound` channel split.

### Seam D: Locale namespace resolver
Potential direction: replace/augment current `UI_STRINGS` + slash parsing with namespace key lookup against `assets/pokerogue/locales/<lang>/*.json` for battle-critical keys.

### Seam E: Message directive support
Potential direction: port the actionable subset of message tag directives (`@c`, `@d`, `@s`, `@f`) into transplant message handler so timing/sound directives in translated strings can be honored.

---

## 7) Practical Risk Notes

- If implementation uses only logs (string parsing), it will be fragile across translation/language changes.
- If implementation uses only snapshots, fine-grained timing (multi-hit, intermediate effects) will be lossy.
- Ability/weather/terrain side effects have many edge cases in upstream phase system; event schema should carry explicit type metadata rather than text-only markers.

---

## 8) Findings Directly Relevant to Your Imported Assets

1. `assets/pokerogue/audio` is structurally compatible with upstream key conventions, but currently unused by active app runtime.
2. `assets/pokerogue/locales` includes the exact battle-related namespaces needed for Pokémon-like message output, but current app does not load namespaces.
3. Current runtime can display battle logs and animate bars/sprites, but lacks the phase/event engine needed for true Pokérogue-like sequencing.

---

## 9) Final Conclusion

Your current UI implementation is a strong render shell, but not yet a battle-phase presentation engine.  
The relevant mechanics in Pokérogue rely on an explicit phase queue, event ordering, audio routing, and namespace-based message system. In this repo, those mechanics are currently compressed into snapshot updates and heuristic log rendering.

This report documents the exact code paths and differences so implementation can proceed with clear boundaries in the next step.

---

## 10) M0 Deliverables Snapshot (Completed)

Artifacts produced in this repository:
- `reports/m0-tag-scan.json`: static parser tag list + dynamic observed tag list + diff sets.
- `reports/event-coverage-matrix.md`: protocol tag to structured-event mapping with priority/status and no-silent-drop policy.
- `reports/ui-parity-checklist.md`: PKB vs Pokérogue UI parity matrix focused on party/summary chain and input/sound/message parity.

Key decisions fixed by M0:
- Unknown/extra protocol tags are not silently dropped; they must map to typed events or explicit `raw_event`.
- `PARTY -> SUMMARY -> PARTY` parity is mandatory scope, not optional polish.
- `playSelect`/`playError` audio restoration and message action-tag support are required for battle-presentation parity.

---

## 11) Post-M0 Protocol Gaps and Plan Corrections

This section documents gaps found during cross-review of the M0 artifacts and plan.md after M0 completion.
None of these require reopening M0 gate; they are inputs to M1 schema design and server parser work.

### 11.1 `|request|` and `|callback|` absent from M0 tag inventory

Both tags were missing from the M0 inventory (neither `parserTags` nor `observedTags` in `m0-tag-scan.json`).

**`|request|`** is already handled by the server: `showdown-engine.cjs:490-496` parses it into `this.requests[sideId]` and explicitly skips it from log text. However, it is the primary player-input gate in the Showdown protocol stream. For the timeline executor, it defines the boundary where event playback must pause and wait for a player choice:
- `request.type === 'wait'` → continue playing events, no input needed.
- `request.type === 'move'` or `'switch'` → gate execution; surface command UI.

Without modeling this gate as an explicit event, the timeline executor has no principled way to know when to yield for input vs when to continue.

**`|callback|`** is the forced-switch trigger. After a faint where the player must send out a replacement, Showdown emits `|callback|trapped` (or similar). This is currently unhandled anywhere in the server codebase. It must be added to the event catalog as `callback_event` so the timeline executor can correctly gate execution for post-faint switch selection.

Action items for M1:
- Add `request_gate` event type (synthesized from `|request|` type transitions).
- Add `callback_event` type (from `|callback|` tag, currently unhandled in server).
- Both are P0: they are part of the faint → forced-switch flow, which is a required battle scenario.

### 11.2 `-crit` precedes `-damage` in protocol stream — stateful accumulator required

In the Showdown protocol stream, `|-crit|IDENT|` is emitted on the line immediately before `|-damage|IDENT|HP/MAXHP|` when a critical hit occurs. The M0 event schema defines `critical: boolean` on the `damage` event, but this cannot be determined from the `-damage` line alone.

A stateful pre-event accumulator is required in the server-side event parser:
1. When `|-crit|IDENT|` is seen: set `ctx.pendingCrit[ident] = true`.
2. When `|-damage|IDENT|...` is seen: copy `ctx.pendingCrit[ident]` into `event.critical`, then clear the flag.

Without this pattern, `event.critical` will always be `false`. The current `normalizeLogTextFromLine` returns `null` for `-crit` (falls to `default` case), so no existing text path is affected — but the new event parser must handle it.

Note: `-supereffective` / `-resisted` follow the same "line before `-damage`" pattern and should use the same accumulator approach for `hitResult` field population.

### 11.3 `-weather [upkeep]` disambiguation — existing rendering bug found

The Showdown protocol disambiguates weather events via an inline bracket token in `parts[3]`:
- Weather start/change: `|-weather|SUN|` → `parts[3]` is empty.
- Weather upkeep tick: `|-weather|SUN|[upkeep]` → `parts[3]` is `[upkeep]`.
- Weather clear: `|-weather|none|` → weather name is `none`.

**Existing bug in `normalizeLogTextFromLine`** (`showdown-engine.cjs:263`):
```js
case '-weather':
  return {text: `날씨: ${b || a} / Weather: ${b || a}`, tone: 'accent'};
```
When `parts[3]` is `[upkeep]`, `b = '[upkeep]'`, so `b || a` evaluates to `'[upkeep]'`. This renders `"날씨: [upkeep] / Weather: [upkeep]"` — a display bug triggered every upkeep tick for any active weather.

Fix needed in `normalizeLogTextFromLine`: use `a` (the weather name) unconditionally for display, not `b || a`.

For the new structured event parser, the discrimination logic is:
- `parts[3] === '[upkeep]'` → emit `weather_tick`.
- `parts[2] === 'none'` → emit `weather_end`.
- Otherwise → emit `weather_start`.

The M0 coverage matrix note "upkeep correlation required for tick/end disambiguation" was correct in intent but incorrectly attributed the disambiguation to the separate `upkeep` tag. The `upkeep` tag is a global turn-upkeep boundary marker (not weather-specific); the actual discrimination is inside the `-weather` line itself.

### 11.4 Move animation data IS present — `move_anim` visual scope is implementable

Earlier draft stated animation JSON was absent. This was **incorrect** (confirmed by post-M0 asset audit).

All necessary data is present:

| Directory | File count | Content |
|---|---|---|
| `assets/pokerogue/anim-data/` | 923 JSON | Per-move frame animation sequences (`id`, `graphic`, `frames`, `frameTimedEvents`, `position`, `hue`) |
| `assets/pokerogue/battle-anims/` | 193 JSON | Same format, subset of moves |
| `assets/pokerogue/battle__anims/` | 646 PNG | Sprite sheets for animation graphics (referenced by `graphic` field in JSON) |
| `assets/pokerogue/audio/battle_anims/` | 1310 WAV | Audio SFX (timed via `frameTimedEvents`) |

These match the data structures consumed by `pokerogue_codes/src/data/battle-anims.ts` (`loadMoveAnimAssets`, `MoveAnim`). Visual move animation is implementable via porting the `BattleAnim`/`MoveAnim` playback system.

Scheduling note: delivering audio-first (Sprint 2a) and visual animation later is still a valid ordering choice — but it is a **scheduling decision**, not an asset constraint. Update plan.md M1 Batch A and event-coverage-matrix §6 accordingly.

### 11.5 `turn_end` is not a Showdown protocol tag — synthesis required

The plan's M1 Batch A lists `turn_end` as an event type, but Showdown does not emit a `|turn_end|` protocol tag. The `|turn|N|` tag marks turn START, not end. Turn boundaries are implicit.

`turn_end` must be synthesized by the server-side event builder:
- Insert `turn_end` event when the next `|turn|N+1|` tag is encountered (retroactively closing the previous turn).
- Or when `|win|` or `|tie|` is encountered (final turn end).

This means the event builder must maintain a `ctx.currentTurn` and flush a `turn_end` event for the previous turn before emitting the new `turn_start`. This is a buffered-emit pattern, not a direct line-to-event mapping.
