# PKB Battle Presentation 구현 계획 (코드 구현 전 문서)

Date: 2026-04-12  
Target: `/workspaces/pokemon-battle`

## 0. 목적과 원칙

### 목적
- 현재 스냅샷 기반 배틀 UI를, 실제 포켓몬 게임처럼 **이벤트 순서 기반 연출**(출전, 특성, 날씨/지형, 기술 우선순위, 데미지, 사운드, 메시지)로 확장한다.
- 단, **배틀 판정(정확도/데미지/우선순위 계산)은 기존 Showdown 엔진을 그대로 신뢰**한다.

### 원칙
- 이 문서는 구현 계획만 다룬다. 실제 로직 변경은 하지 않는다.
- 기존 동작을 깨지 않기 위해 단계별 Feature Flag로 롤아웃한다.
- 텍스트 파싱 휴리스틱(현재 능력 플라이아웃 방식)은 점진적으로 제거하고 구조화 이벤트로 대체한다.
- 포켓로그 연출 레이어(기술 모션 순서, 사운드 타이밍, 메시지 표시 규칙, 오디오 키 규약)는 참조 수준이 아니라 **원본 우선 이식(transplant)** 을 원칙으로 한다.
- 엔진과 에셋이 동일하므로, 연출 동작은 가능한 한 원본 구현을 그대로 채택하고 PKB 결합 지점만 adapter로 맞춘다.

---

## 1. 최종 아키텍처 목표

## 현재
- `submit choices -> server resolves full turn -> client gets snapshot + log`
- 클라이언트는 로그/스냅샷으로 즉시 렌더.

## 목표
- `submit choices -> server resolves turn + emits structured events -> client timeline executor plays events sequentially -> applies final snapshot`

즉, **판정은 서버**, **연출 타이밍은 클라이언트 이벤트 타임라인**으로 분리.

### 진행 가능성 판단 (질문에 대한 직접 답)
- 결론: 현재 코드베이스 기준으로 구현 진행은 가능하며, 구조적 블로커는 없다.
- 근거 1: 서버는 이미 Showdown 판정을 완료하므로, protocol line -> structured event 변환 레이어만 추가하면 된다.
- 근거 2: 오디오/로케일 에셋이 이미 로컬에 있으므로, 원본 키 규약 기반 로더/라우터 이식으로 바로 연결 가능하다.
- 근거 3: 클라이언트에 턴 해석 구간(`battle.resolvingTurn`)이 있어 timeline executor 삽입 지점이 명확하다.

### 운영 안전장치 (선택, 2차)
- 타임라인 재생 기본값은 `1x`로 두고, `2x/skip`은 연출 parity 확보 후 옵션으로 확장한다.
- 이벤트 실행 중 에러나 누락이 발생하면 즉시 fast-forward 하여 최종 snapshot 상태로 수렴한다.
- 턴 연출 시간 자동 축소(임계치 기반)는 실제 병목이 재현될 때만 도입한다.

### 배틀 시스템 무결성 범위
- 현재 PKB party UI는 사실상 교체 선택 전용이며, 파티 슬롯에서 요약/능력치 확인으로 진입하는 경로는 미구현 상태다.
- 따라서 party 내 요약/능력치 확인은 "유지"가 아니라 원본 parity를 위한 **신규 이식 대상**으로 정의한다.
- 포켓로그 원본은 Party 옵션에 `SUMMARY`를 포함하고 `UiMode.SUMMARY` 진입 경로를 제공하므로, PKB도 동일한 모드 체인(PARTY -> SUMMARY -> PARTY)을 목표로 한다.
- 턴 진행 무결성을 위해 `battle.resolvingTurn` 중 상호작용 허용/차단 규칙을 mode별로 명시하고 회귀 테스트에 포함한다.

---

## 2. 구현 범위 분해 (Milestone)

## M0. 원본 인벤토리/갭 분석 고정 (선행 게이트)
- 상태: **완료 (2026-04-12)**  
- 구현 전에 원본 기준 전수 목록을 먼저 고정한다.
- 범위:
  - 배틀 protocol tag -> 이벤트 타입
  - 이벤트 -> 애니메이션/오디오/메시지/locale key
  - PARTY/SUMMARY 모드 전환 및 입력 규칙
- 산출물:
  - `reports/event-coverage-matrix.md` (누락 항목 추적용)
  - `reports/ui-parity-checklist.md` (party/summary 포함)
  - `reports/m0-tag-scan.json` (parser/observed tag diff 근거)
- 착수 조건: 핵심 루프(P0)와 party/summary 흐름에서 "미정/미매핑" 항목 0건.
- 완료 판정:
  - parser baseline 31 tags, observed 35 tags 기준으로 매핑 정책 고정
  - observed-only tag(`-activate`, `-singleturn`, `-crit`, `-miss`, meta/control tags) 처리 방침 확정
  - PARTY/SUMMARY parity gap과 보강 경로(UI mode/handler/model/action) 확정

## M1. 이벤트 스키마 도입 (전체 카탈로그 기준)
- `snapshot` 외에 `events` 배열을 API 응답에 포함.
- 이벤트 타입은 "최소셋 임의 선택"이 아니라, M0에서 고정한 전체 카탈로그를 기준으로 관리한다.
- 구현은 배치로 나누되, 각 배치 완료 시 coverage matrix를 갱신해 누락을 0으로 수렴시킨다.
- Batch A (핵심 루프, P0):
  - `turn_start`
  - `switch_in`
  - `ability_show` / `ability_hide`
  - `weather_start` / `weather_tick` / `weather_end`
  - `terrain_start` / `terrain_end`
  - `move_use`
  - `move_anim` — 비주얼 + 오디오 모두 구현 가능 (`anim-data/` 923 JSON + `battle__anims/` 646 PNG + `audio/battle_anims/` 1310 WAV 전부 존재 확인). 단, `BattleAnim`/`MoveAnim` 재생 시스템 이식이 필요하므로 **Sprint 2a에서는 오디오 선행, 비주얼은 Sprint 2b 이후**로 순서 분리.
  - `damage`
  - `faint`
  - `callback_event` — 기절 후 강제 교체 게이트 (`|callback|` 태그. 현재 서버 미처리)
  - `request_gate` — 플레이어 입력 대기 경계 (`|request|` type 전환 시 합성)
  - `message`
  - `turn_end` (**합성 이벤트** — Showdown에 `|turn_end|` 태그 없음. 다음 `turn_start` 또는 `battle_end` 직전에 서버가 삽입)
- Batch B (상태/폼/보조 판정):
  - `status_apply` / `status_cure`
  - `boost` / `unboost`
  - `field_start` / `field_end`
  - `side_start` / `side_end`
  - `forme_change`
- Batch C (특수 전개/리치 미디어):
  - `mega_evo` / `zpower` / `terastallize`
  - `effectiveness` / `immune` / `miss` / `cant_move`
  - 기타 raw tag passthrough 이벤트

## M2. 서버에서 protocol -> event 추출
- `server/showdown-engine.cjs`에서 기존 `normalizeLogTextFromLine()` 유지.
- 동시에 protocol line을 구조화 이벤트로 변환해 `snapshot.events`에 담는다.
- 매핑은 `|tag|...` 기반 deterministic parser를 전체 카탈로그 범위에 적용한다.
- 기술/특성/아이템/날씨/지형 명칭은 Dex 정규화 값과 raw protocol 값을 함께 보관해 누락/오역을 방지한다.
- unknown tag는 silent drop 하지 않고 `raw_event`로 보존 + 리포트 카운터에 누적한다.

## M3. 클라이언트 Timeline Executor 도입
- `src/app.js`의 즉시 스냅샷 반영 대신:
  - 이벤트 재생
  - 완료 후 snapshot 반영
- 페이즈 잠금 상태(`battle.resolvingTurn`)와 동기화.
- `request_gate` 이벤트 수신 시 `battle.resolvingTurn` 해제 + 커맨드 UI 복원.
- `fastForward()` 메서드: 남은 이벤트 건너뛰고 즉시 최종 snapshot 상태로 수렴. 에러/누락 발생 시 자동 호출.

## M3.5. PARTY -> SUMMARY 모드 체인 이식
- `ui-parity-checklist.md`에서 식별된 gap을 구현으로 연결.
- 범위:
  - `src/pokerogue-transplant-runtime/ui/ui-mode.js`: `SUMMARY` 모드 추가 + alias 등록.
  - `src/pokerogue-transplant-runtime/ui/handlers/summary-ui-handler.js`: 신규 생성. PokeRogue `summary-ui-handler.ts` 이식.
  - `src/pokerogue-transplant-runtime/ui/ui.js`: handler registry에 summary handler 등록. `PARTY <-> SUMMARY` 복귀 체인 규칙 연결.
  - `src/app.js`:
    - `buildPhaserPartyWindowModel()`: slot 클릭 시 단일 `switch` 액션 → 서브메뉴(`switch` / `SUMMARY` / `cancel`) 옵션 레이어로 확장.
    - mode whitelist에 `summary` 추가 (`app.js:5550` 기준).
    - state-window builder에 summary 분기 추가 (`app.js:6467` 기준).
    - `open-summary` / `close-summary` 액션 처리 추가.
- 인터랙션 규칙: `battle.resolvingTurn` 동안 신규 overlay 진입 차단. 이미 열린 summary는 cancel만 허용.
- 착수 조건: M3 Timeline Executor no-op 연결 완료 후. (summary 자체는 턴 연출과 독립적이므로 M4 이전에 진행 가능)

## M4. Phaser transplant Audio Manager
- `src/pokerogue-transplant-runtime`에 오디오 로더/라우터 추가.
- `assets/pokerogue/audio/{se,ui,battle_anims,cry,bgm}`를 키 규칙으로 로드.
- `playSelect()/playError()` 실제 동작으로 연결.

## M5. Locale Namespace Loader (battle 우선)
- `assets/pokerogue/locales/<lang>/*.json`에서 battle 관련 namespace 로드.
- 1차 namespace:
  - `battle`, `ability-trigger`, `move-trigger`, `weather`, `terrain`, `battle-message-ui-handler`
- `UI_STRINGS`는 화면 chrome 용으로 유지하고, 전투 메시지는 namespace 키 우선 사용.
- 번역 키 기준 파일은 이 저장소에서 바로 확인 가능:
  - `assets/pokerogue/locales/en/*.json`
  - `assets/pokerogue/locales/ko/*.json`
- namespace 명칭 차이는 포켓로그 기준 매핑(`pokerogue_codes/src/plugins/utils-plugins.ts`)을 참고해 보정한다.

## M6. 메시지 태그 파서(@c/@d/@s/@f) 최소 이식
- 현재 transplant message handler에 `@d`, `@s` 우선 도입.
- `@c`, `@f`는 2차 도입.

## M7. QA/회귀 검증
- 이벤트 누락 시 fallback: 기존 로그 기반 렌더로 복귀.
- 싱글 배틀 전 구간 smoke test.
- 파티/요약/능력치 확인 흐름이 연출 추가 후에도 깨지지 않는지 회귀 확인.
- coverage matrix 기준 미매핑 tag 0건 확인.

---

## 3. 파일 단위 작업 계획

## 서버
- `server/showdown-engine.cjs`
  - `processOutputs()` 내 protocol line 순회 시 event builder 호출 추가
  - `snapshot()` 반환값에 `events`, `eventCursor` 등 메타 추가
  - line -> event 매핑 함수 추가 (`normalizeEventFromLine`)

## 브릿지
- `src/engine/showdown-local-bridge.js`
  - 응답 스냅샷에서 `events`를 그대로 전달
  - 필요 시 타입 보정/기본값 처리

## 앱
- `src/app.js`
  - `resolveEngineTurn()` 이후 즉시 렌더 대신 timeline 실행 경로 추가
  - 기존 `buildBattleMessageModel`, `updateBattleAbilityBarState`는 fallback 모드로만 사용
  - `buildPhaserPartyWindowModel()`을 확장해 "교체 전용"에서 "옵션(교체/요약 등)" 모델까지 수용하도록 재설계
  - feature flag:
    - `battlePresentationV2`
    - `battleAudioV1`
    - `battleLocaleV1`

## transplant runtime
- `src/pokerogue-transplant-runtime/ui/ui-mode.js`
  - `SUMMARY` 모드 추가 및 alias 확장
- `src/pokerogue-transplant-runtime/ui/ui.js`
  - handler registry에 summary handler 추가
  - mode chain(PARTY <-> SUMMARY) 복귀 규칙 정리
- `src/pokerogue-transplant-runtime/runtime/constants.js`
  - 오디오 경로 상수 추가(문서상 설계)
- `src/pokerogue-transplant-runtime/runtime/assets.js`
  - 오디오 preload 엔트리 (지연 로드 지원 구조)
- `src/pokerogue-transplant-runtime/ui/ui.js`
  - `playSelect`, `playError`를 audio manager 호출로 연결
- `src/pokerogue-transplant-runtime/ui/handlers/message-ui-handler.js`
  - 메시지 액션 태그 파서 연결

## 신규(예정)
- `src/battle-presentation/timeline.js`
- `src/battle-presentation/event-schema.js`
- `src/pokerogue-transplant-runtime/runtime/audio-manager.js`
- `src/battle-i18n/locale-manager.js`
- `src/pokerogue-transplant-runtime/ui/handlers/summary-ui-handler.js`

---

## 4. 이벤트 스키마 초안 (코드 스니펫)

```js
// src/battle-presentation/event-schema.js (planned)
/**
 * @typedef {Object} BattleEventBase
 * @property {number} seq            // server-emitted monotonic sequence
 * @property {number} turn
 * @property {string} type
 * @property {number} [atMs]         // optional relative timing hint
 */

/**
 * @typedef {BattleEventBase & {
 *   type: 'switch_in',
 *   side: 'p1'|'p2',
 *   slot: number,
 *   species: string,
 *   spriteId: string,
 *   fromBall: boolean
 * }} SwitchInEvent
 */

/**
 * @typedef {BattleEventBase & {
 *   type: 'ability_show',
 *   side: 'p1'|'p2',
 *   slot: number,
 *   ability: string,
 *   passive: boolean
 * }} AbilityShowEvent
 */

/**
 * @typedef {BattleEventBase & {
 *   type: 'move_use',
 *   actor: {side: 'p1'|'p2', slot: number},
 *   move: string,
 *   target: {side: 'p1'|'p2', slot: number} | null,
 *   priority: number
 * }} MoveUseEvent
 */

/**
 * @typedef {BattleEventBase & {
 *   type: 'damage',
 *   target: {side: 'p1'|'p2', slot: number},
 *   amount: number,
 *   hpAfter: number,
 *   maxHp: number,
 *   hitResult: 'effective'|'super'|'not_very'|'indirect'|'ohko',
 *   critical: boolean   // populated from preceding |-crit| line via accumulator, not from this line alone
 * }} DamageEvent
 */

/**
 * @typedef {BattleEventBase & {
 *   type: 'callback_event',
 *   side: 'p1'|'p2',
 *   reason: string     // e.g. 'trapped', 'cantUndo'
 * }} CallbackEvent
 */

/**
 * @typedef {BattleEventBase & {
 *   type: 'request_gate',
 *   side: 'p1'|'p2',
 *   requestType: 'move'|'switch'|'wait'|'teamPreview'
 * }} RequestGateEvent
 * // Synthesized from |request| JSON transitions. 'move'/'switch' = yield for input.
 * // 'wait' = continue playback. Only transitions are emitted (not every |request|).
 */

/**
 * turn_end: synthesized by server event builder.
 * Emitted retroactively when next |turn|N+1| or |win| is encountered.
 * No direct Showdown protocol tag exists for turn end.
 *
 * @typedef {BattleEventBase & { type: 'turn_end' }} TurnEndEvent
 */
```

---

## 5. 서버 Line -> Event 변환 초안 (코드 스니펫)

```js
// server/showdown-engine.cjs (planned pseudo code)
//
// ctx shape (stateful across lines in one turn):
//   ctx.turn          — current turn number
//   ctx.nextSeq()     — monotonic sequence counter
//   ctx.hpCache       — Map<ident, {hp, maxHp}>  for damage amount derivation
//   ctx.pendingCrit   — Map<ident, bool>          for -crit -> -damage pairing
//   ctx.pendingHitResult — Map<ident, string>     for -supereffective/-resisted -> -damage pairing
//   ctx.lastRequestType — Map<side, string>       for request_gate transition detection
//
// NOTE: turn_end is NOT emitted here directly; it is flushed by the caller before
// emitting a new turn_start (buffered-emit pattern, see flushTurnEnd() below).

function normalizeEventFromLine(line, ctx) {
  const parts = String(line || '').split('|');
  const tag = parts[1] || '';

  if (tag === 'turn') {
    const events = [];
    if (ctx.turn !== null) {
      events.push({ type: 'turn_end', turn: ctx.turn, seq: ctx.nextSeq() });
    }
    ctx.turn = Number(parts[2]);
    events.push({ type: 'turn_start', turn: ctx.turn, seq: ctx.nextSeq() });
    return events; // caller must handle array return
  }

  if (tag === 'switch' || tag === 'drag') {
    const ident = parseIdent(parts[2]); // p1a: Name
    return [{
      type: 'switch_in',
      turn: ctx.turn,
      seq: ctx.nextSeq(),
      side: ident.side,
      slot: toFieldSlot(ident.position),
      species: parseDetailsSpecies(parts[3]),
      cause: tag === 'drag' ? 'drag' : 'switch',
      fromBall: true
    }];
  }

  if (tag === '-ability') {
    const ident = parseIdent(parts[2]);
    return [{
      type: 'ability_show',
      turn: ctx.turn,
      seq: ctx.nextSeq(),
      side: ident.side,
      slot: toFieldSlot(ident.position),
      ability: parts[3] || '',
      passive: false
    }];
  }

  // Accumulate -crit flag; consumed by the following -damage line
  if (tag === '-crit') {
    ctx.pendingCrit[parts[2]] = true;
    return []; // no standalone event; merged into damage
  }

  // Accumulate hit-result flag; consumed by the following -damage line
  if (tag === '-supereffective') {
    ctx.pendingHitResult[parts[2]] = 'super';
    return [];
  }
  if (tag === '-resisted') {
    ctx.pendingHitResult[parts[2]] = 'not_very';
    return [];
  }

  if (tag === '-damage') {
    const ident = parseIdent(parts[2]);
    const cond = parseCondition(parts[3]); // e.g. "120/300 brn"
    const identKey = parts[2];
    const critical = ctx.pendingCrit[identKey] ?? false;
    const hitResult = ctx.pendingHitResult[identKey] ?? 'effective';
    delete ctx.pendingCrit[identKey];
    delete ctx.pendingHitResult[identKey];
    const prev = ctx.hpCache.get(identKey);
    const amount = prev ? (prev.hp - (cond.hp ?? 0)) : 0;
    ctx.hpCache.set(identKey, { hp: cond.hp ?? 0, maxHp: cond.maxHp ?? 0 });
    return [{
      type: 'damage',
      turn: ctx.turn,
      seq: ctx.nextSeq(),
      target: { side: ident.side, slot: toFieldSlot(ident.position) },
      hpAfter: cond.hp ?? 0,
      maxHp: cond.maxHp ?? 0,
      amount,
      hitResult,
      critical
    }];
  }

  // -weather: must check parts[3] for [upkeep] to discriminate tick vs start/end
  // WARNING: do NOT use `parts[3] || parts[2]` — this renders "[upkeep]" as weather name (existing bug in normalizeLogTextFromLine)
  if (tag === '-weather') {
    const weatherName = parts[2]; // always use parts[2] for the actual name
    const isUpkeep = parts[3] === '[upkeep]';
    if (weatherName === 'none') {
      return [{ type: 'weather_end', turn: ctx.turn, seq: ctx.nextSeq() }];
    }
    return [{
      type: isUpkeep ? 'weather_tick' : 'weather_start',
      turn: ctx.turn,
      seq: ctx.nextSeq(),
      weather: weatherName
    }];
  }

  // |callback| tag: forced-switch gate after faint (currently unhandled in server)
  if (tag === 'callback') {
    return [{
      type: 'callback_event',
      turn: ctx.turn,
      seq: ctx.nextSeq(),
      side: ctx.activeSide, // derived from context; server must track which side the callback is for
      reason: parts[2] || ''
    }];
  }

  if (tag === 'win') {
    const events = [];
    if (ctx.turn !== null) {
      events.push({ type: 'turn_end', turn: ctx.turn, seq: ctx.nextSeq() });
      ctx.turn = null;
    }
    events.push({ type: 'battle_end', seq: ctx.nextSeq(), winner: parts[2] || '' });
    return events;
  }

  return [];
}
```

주의:
- 함수가 단일 이벤트가 아닌 배열을 반환하도록 변경됨 (turn_end + turn_start 동시 방출 필요).
- `amount`는 side-state hpCache로 delta 계산. 배틀 시작 시 초기 HP를 `switch_in` 처리 시점에 캐시에 세팅해야 함.
- `-crit`와 `-supereffective`/`-resisted`는 accumulator 패턴으로 다음 `-damage`에 병합.
- `move priority`는 Showdown 내부 순서를 직접 받기 어려우므로 1차는 실행 순서(seq)로 처리.
- `|callback|` 처리 시 `activeSide` 추적은 서버에서 현재 `|request|` 상태로 역산해야 함.
- `-weather [upkeep]` 버그 수정: `normalizeLogTextFromLine`의 `b || a` 패턴도 `a`로 수정 필요 (별도 버그 fix).

---

## 6. 클라이언트 Timeline Executor 초안 (코드 스니펫)

```js
// src/battle-presentation/timeline.js (planned)
export class BattleTimelineExecutor {
  constructor({ scene, ui, audio, i18n }) {
    this.scene = scene;
    this.ui = ui;
    this.audio = audio;
    this.i18n = i18n;
    this.running = false;
  }

  async play(events = [], context = {}) {
    if (!Array.isArray(events) || !events.length) return;
    this.running = true;
    try {
      for (const ev of events) {
        await this.applyEvent(ev, context);
      }
    } finally {
      this.running = false;
    }
  }

  async applyEvent(ev, context) {
    switch (ev.type) {
      case 'switch_in':
        // play pokeball throw/release animation and cry
        // await this.scene.playSwitchIn(ev);
        break;
      case 'ability_show':
        // await this.ui.showAbilityBar(ev);
        break;
      case 'move_use':
        // Sprint 2a: await this.audio.playMoveSe(ev.move);  // battle_anims/<sfx> 오디오 먼저
        // Sprint 2b+: await this.scene.playMoveAnim(ev);    // BattleAnim 비주얼 이식 후 대체
        break;
      case 'damage':
        // this.audio.playHitByResult(ev.hitResult);
        // await this.ui.tweenHp(ev.target, ev.hpAfter, ev.maxHp);
        break;
      case 'request_gate':
        // Pause playback and yield for player input.
        // Unlocks battle.resolvingTurn and surfaces command/switch UI.
        // this.running = false;
        // context.onInputRequired(ev.requestType);
        return; // do NOT continue event loop; caller re-enters after choice submitted
      case 'callback_event':
        // Force switch gate after faint.
        // await this.ui.enterForcedSwitch(ev.side);
        return; // same: execution resumes after player selects replacement
      case 'message':
        // await this.ui.showBattleMessage(ev.text, {prompt: ev.prompt});
        break;
      default:
        break;
    }
  }

  /**
   * fastForward: skip remaining events and apply the final snapshot directly.
   * Called automatically on error/timeout, or manually by skip/2x user input.
   * @param {Function} applySnapshot - callback that applies the post-turn snapshot to UI state.
   */
  fastForward(applySnapshot) {
    this.running = false;
    // cancel any pending scene tweens/timers created by this executor
    // this.scene.tweens.killAll(); // or track and cancel individually
    applySnapshot();
  }
}
```

---

## 7. 오디오 매니저 설계 초안 (코드 스니펫)

```js
// src/pokerogue-transplant-runtime/runtime/audio-manager.js (planned)
export class BattleAudioManager {
  constructor(scene) {
    this.scene = scene;
    this.master = 0.7;
    this.bgm = 1.0;
    this.field = 1.0;
    this.se = 1.0;
    this.ui = 1.0;
  }

  preloadBasic() {
    const load = this.scene.load;
    load.audio('ui/select', './assets/pokerogue/audio/ui/select.wav');
    load.audio('ui/error', './assets/pokerogue/audio/ui/error.wav');
    load.audio('se/hit', './assets/pokerogue/audio/se/hit.wav');
    load.audio('se/hit_strong', './assets/pokerogue/audio/se/hit_strong.wav');
    load.audio('se/hit_weak', './assets/pokerogue/audio/se/hit_weak.wav');
    load.audio('se/pb_rel', './assets/pokerogue/audio/se/pb_rel.wav');
  }

  play(key, volume = 1) {
    const routed = this.routeVolume(key) * volume;
    return this.scene.sound.play(key, { volume: routed });
  }

  routeVolume(key) {
    if (key.startsWith('ui/')) return this.master * this.ui;
    if (key.startsWith('battle_anims/') || key.startsWith('cry/')) return this.master * this.field;
    return this.master * this.se;
  }
}
```

---

## 8. 로케일 매니저 설계 초안 (코드 스니펫)

```js
// src/battle-i18n/locale-manager.js (planned)
const cache = new Map(); // key: `${lang}:${ns}`

export async function loadNamespace(lang, ns) {
  const key = `${lang}:${ns}`;
  if (cache.has(key)) return cache.get(key);
  const file = nsToFileName(ns); // e.g. abilityTriggers -> ability-trigger
  const url = `./assets/pokerogue/locales/${lang}/${file}.json`;
  const json = await fetch(url).then(r => r.json());
  cache.set(key, json);
  return json;
}

export async function t(lang, ns, k, vars = {}) {
  const dict = await loadNamespace(lang, ns);
  let text = dict?.[k] ?? k;
  for (const [vk, vv] of Object.entries(vars)) {
    text = String(text).replaceAll(`{{${vk}}}`, String(vv));
  }
  return text;
}
```

1차는 i18next full migration 대신 lightweight loader로 시작하고, 안정화 후 i18next 도입 여부 결정.

---

## 9. 메시지 태그(@c/@d/@s/@f) 처리 초안 (코드 스니펫)

```js
// planned helper
export function parseMessageActions(text = '') {
  const actions = [];
  let out = String(text);
  const re = /@(c|d|s|f)\{(.*?)\}/;
  let m;
  while ((m = re.exec(out))) {
    actions.push({
      kind: m[1],      // c,d,s,f
      value: m[2],
      index: m.index   // apply when cursor reaches this index
    });
    out = out.slice(0, m.index) + out.slice(m.index + m[0].length);
  }
  return { text: out, actions };
}
```

적용 순서:
- V1: `@d`, `@s`만 활성화
- V2: `@c`, `@f` 활성화

---

## 10. 통합 순서 (중요)

1. M0 coverage matrix/ui parity checklist 고정 (누락 목록 먼저 확정) → **완료**
2. `normalizeLogTextFromLine` `-weather` 버그 수정 (`b || a` → `a`) — 선행 버그픽스, M1 전에 적용
3. 서버 이벤트 스키마와 응답 필드 추가 (기존 필드 유지). `events` 배열 + 배열-반환 파서 도입
4. 클라이언트에서 이벤트 수신/무시 가능한 안전 파서 추가 (no-op executor 연결)
5. **오디오 매니저 기본 SE 먼저 연결** (`se/pb_rel`, `se/hit*`, `se/faint`, `ui/select`, `ui/error`) — `switch_in` 연출보다 선행 필요
6. Batch A 핵심 재생 연결: `switch_in` → `message` → `damage` → `faint` → `request_gate` → `callback_event`
7. PARTY 옵션 + SUMMARY 모드 체인 이식 (M3.5) — 턴 연출과 독립적이므로 5-6번 병렬 진행 가능
8. Batch B/C 이벤트 확장 + locale namespace 기반 메시지 전환
9. coverage matrix 100% 달성 후 기존 휴리스틱 fallback 단계적 제거

진행 상태 메모:
- 1번(M0 고정)은 완료.
- 다음 착수 지점은 2번(`-weather` 버그픽스)부터 시작. 이후 3번(M1) 순서로 진행.
- 5번(오디오)이 6번(switch_in 연출)의 선행 조건임을 주의 — Sprint 2에서 오디오가 switch_in보다 먼저 연결되어야 함.

---

## 11. Feature Flag 계획

```js
// planned flags
const FLAGS = {
  battlePresentationV2: false, // timeline executor
  battleAudioV1: false,        // audio manager routing
  battleLocaleV1: false,       // namespace battle messages
  battleMsgActionTagsV1: false // @d/@s parser
};
```

- 기본값 `false`에서 점진적 활성화.
- 문제가 생기면 즉시 기존 스냅샷/로그 UI로 되돌릴 수 있어야 함.

---

## 12. 테스트/검증 시나리오

## 필수 시나리오
- 선출 시 `switch_in -> pb_rel -> cry -> message` 순서 확인
- Intimidate류 특성: 능력 바 노출/숨김 순서
- 날씨 시작/지속/종료 메시지와 연출 순서. 특히 upkeep tick에서 "날씨: [upkeep]" 렌더 버그 미발생 확인
- 우선도 다른 기술 2개 선택 시 실행 순서가 서버 seq와 일치
- multi-hit 기술에서 `-damage` 이벤트가 hit 횟수만큼 개별 발생하고, HP 틱 + hit count 메시지 일치
- 급소 발생 시 `-crit` accumulator 정상 작동 → `damage.critical = true` 확인
- `-supereffective` / `-resisted` accumulator → `damage.hitResult` 올바르게 반영 확인
- 기절 시 `faint` 이벤트 → `se/faint` 재생 → `callback_event` 발생 → 교체 요청 UI 진입 → 교체 후 재개
- 강제 교체(`drag`) 시 `switch_in(cause: drag)` 이벤트 정상 처리
- PARTY에서 슬롯 선택 시 옵션 노출 (`switch` / `SUMMARY` / `cancel`) → `SUMMARY` 진입 → 뒤로 복귀 시 PARTY 상태 복원
- `turn_end` 합성 이벤트가 올바른 위치(다음 `turn_start` 직전)에 삽입되는지 로그로 확인

## 추가 커버리지 시나리오 (M0 scan에서 미관측 태그 검증용)
- 상태이상 부여(`-status`) 및 회복(`-curestatus`) 시나리오 — `cant` 태그도 함께 관측 가능
- 폼 변환(`-formechange` / `detailschange`) 시나리오 — Rotom 폼, Zygarde 등
- 강제 교체(`drag`) 시나리오 — 로어/드래곤테일 사용 포켓몬 구성
- 배틀 에러 (`error` 태그) 시나리오 — 잘못된 커맨드 전송으로 재현 가능

## 회귀 시나리오
- 이벤트 누락/파싱 실패 시 `fastForward()` 호출로 기존 snapshot 렌더로 수렴하는지
- 오디오 파일 누락 시 무음 fallback 및 게임 진행 지속
- locale key 누락 시 key 문자열 출력 또는 EN fallback
- 파티 창에서 포켓몬 클릭 시 요약/능력치 확인이 동작하고, `battle.resolvingTurn` 중 신규 진입 차단 규칙이 일관적인지
- `battlePresentationV2` flag `false` 시 기존 즉시 렌더 경로가 정상 동작하는지 (feature flag 롤백 검증)

---

## 13. 리스크와 대응

- 리스크: Showdown protocol 변화로 line-parser 파손  
  대응: event builder를 tag 단위로 보수적 구현 + unknown tag는 `raw_event`로 보존하고 coverage matrix에 누적.

- 리스크: 이벤트 기반 연출이 느려져 입력 응답 저하  
  대응: 긴 연출은 skip/fast-forward 입력 제공(차후).

- 리스크: 텍스트 번역 키 불일치
  대응: `battle` namespace 최소 키셋부터 적용하고, `assets/pokerogue/locales/en|ko` 기준 키 인벤토리 체크리스트를 먼저 만든 뒤 범위를 확대.

- 리스크: 오디오 동시 재생 과다(브라우저별 체감 차이 가능성)
  대응: 1차는 포켓로그 원본 키 라우팅/재생 정책을 그대로 이식한다. 동시 인스턴스 cap/디바운스는 실제 이슈가 재현될 때에만 별도 flag로 제한 적용한다.

---

## 14. 예상 작업 순서와 산출물

## Sprint 1 (기반 + 선행 버그픽스)
- `-weather [upkeep]` 렌더 버그 수정 (`normalizeLogTextFromLine`, M1 전 선행)
- 이벤트 스키마 초안 확정 (배열-반환 파서, hpCache/pendingCrit/pendingHitResult accumulator 구조 포함)
- 서버 response에 `events` 배열 추가 (기존 `log`/`snapshot` 유지)
- 클라이언트 수신 파이프 + no-op executor 연결
- 산출물: 이벤트 덤프가 dev panel에서 확인 가능

## Sprint 2a (오디오 기반 — switch_in 선행 조건)
- 오디오 매니저 기본 SE 연결: `se/pb_rel`, `se/hit*`, `se/faint`, `ui/select`, `ui/error`
- `playSelect()` / `playError()` stub 실제 동작으로 연결
- 산출물: 기본 SE가 재생됨 (연출 없이 단독 검증 가능)

## Sprint 2b (핵심 연출 + PARTY/SUMMARY 병렬)
- `switch_in` → `faint` → `request_gate` → `callback_event` 타임라인 재생
- `damage` HP tween + hit SE 연결
- `message` 순차 재생
- M3.5: PARTY -> SUMMARY 모드 체인 이식 (턴 연출과 독립)
- 산출물: 선출/데미지/메시지의 순차 재생 + 포켓몬 요약 화면 진입

## Sprint 3 (확장)
- 능력/날씨/지형/기술 연출 확장 (Batch B/C)
- 로케일 namespace 기반 메시지 전환
- `fastForward()` skip/2x 입력 연결
- 산출물: 요청한 "실게임 느낌" 핵심 루프 완성

---

## 15. 이번 단계 완료 기준

- `plan.md`에 구현 계획 + 스니펫 정리 완료
- 실제 런타임 코드(`src/`, `server/`) 변경 없음
- 각주 반영 사항(Party/Summary 갭, 전체 이벤트 누락 방지, mapping 완전성)이 계획과 완료 기준에 명시됨
- 다음 단계에서 이 계획을 기반으로 순차 구현 가능

---

## 16. M0 완료 보고 (2026-04-12)

- 산출물 확정:
  - `reports/event-coverage-matrix.md`
  - `reports/ui-parity-checklist.md`
  - `reports/m0-tag-scan.json`
- 핵심 결론:
  - 이벤트 카탈로그는 임의 최소셋이 아니라 parser/observed union 기준으로 고정.
  - unknown/extra tag는 silent drop 금지, typed event 또는 `raw_event`로 보존.
  - PKB party는 현재 교체 전용이므로 summary parity는 신규 이식 대상이며 우선순위 High.
- 게이트 판정:
  - M1 착수 가능 (선행단계 미정 항목 없음).

## 계획 보강 완료 (2026-04-12 post-M0 review)
- 추가 발견 사항은 `research.md §11`에 기록.
- 주요 반영 내용:
  - `callback_event` / `request_gate` Batch A 추가 (M0 inventory에 누락됨)
  - `turn_end` 합성 방식 명시 (Showdown 프로토콜 태그 없음)
  - `-crit` / `-supereffective` / `-resisted` accumulator 패턴 추가
  - `-weather [upkeep]` 렌더 버그 식별 및 수정 정책 기록
  - `move_anim` scope 수정: 비주얼 + 오디오 모두 가능 (anim-data/battle__anims/audio 전부 존재 확인). Sprint 순서상 오디오 선행, 비주얼은 BattleAnim 이식 후 추가.
  - M3.5 PARTY->SUMMARY 전용 마일스톤 신설
  - Sprint 순서 재조정: 오디오(Sprint 2a) → switch_in 연출(Sprint 2b) 순서 고정
  - `fastForward()` 메커니즘 구체화
