# PKB Battle Presentation 구현 계획

Last updated: 2026-04-16  
Target: `/workspaces/pokemon-battle`

---

## 0. 목적과 원칙

### 목적
- 현재 스냅샷 기반 배틀 UI를, 실제 포켓몬 게임처럼 **이벤트 순서 기반 연출**(출전, 특성, 날씨/지형, 기술, 데미지, 사운드, 메시지)로 확장한다.
- 배틀 연출이 완성된 후에 UI 폴리시(텍스트 왜곡, 레이아웃 등) 작업을 한다.

### 원칙
- 이 문서는 항상 최신 상태를 유지하며 작업 전후로 갱신한다.
- 기존 동작을 깨지 않기 위해 Feature Flag(`FLAGS.battlePresentationV2`)로 롤아웃한다.
- PokeRogue 연출 레이어는 **원본 우선 이식(transplant)** 을 원칙으로 한다.
- **UI 폴리시(UI-P1~P5)는 배틀 연출 완성 후에 착수한다.**

---

## 1. 현재 구현 상태 (2026-04-16 기준)

### ✅ 완료된 Milestone

| Milestone | 내용 | 완료일 |
|-----------|------|--------|
| M0 | 원본 인벤토리/갭 분석 | 2026-04-12 |
| M1 | 이벤트 스키마 도입 (`event-schema.js`) | 2026-04-12 |
| M2 | 서버 protocol → event 추출 (`showdown-engine.cjs`) | 2026-04-12 |
| M3 | Timeline Executor 도입 (`timeline.js`) | 2026-04-12 |
| M4 | Audio Manager (`audio-manager.js`) | 2026-04-13 |
| Sprint 3 | 배틀 메시지·울음소리·어빌리티 바/날씨/지형 | 2026-04-13 |
| Sprint 4 | 상태이상/스탯변화/빗나감/행동불가 + 버그픽스 | 2026-04-13 |
| Sprint 5 | immune/fail 메시지, 스탯 SE, callback, battle_end, BA-10 기술 애니메이션 Phase 1 | 2026-04-14 |
| Sprint 5 버그픽스 | Phaser BlendMode ReferenceError, 파티화면 미닫힘, 턴 후 p2 화면 먼저 표시 | 2026-04-15 |
| BA-16 | HP 숫자 바와 동시 감소 | 2026-04-15 |
| Sprint 6 | BA-11 Phase 2(USER/TARGET 복사본), BA-12 faint 슬라이드, BA-13 switch_in 포켓볼 arc | 2026-04-15 |
| UX-DS1 | 배틀 화면 분할(상=P1, 하=P2) + playerOverride 입력 디스패치 | 2026-04-15 |

### ✅ 완료된 이벤트 핸들러 목록 (`timeline.js`)

| 이벤트 | 연출 |
|--------|------|
| `switch_in` | `switchInBattler(side, fromBall)` (포켓볼 arc + fadeIn) + cry + 메시지 |
| `move_use` | 기술명 메시지 + `playMoveAnim()` (GRAPHIC + USER/TARGET copy, Phase 2) |
| `damage` | `playHitByResult()` + 100ms + `tweenHpTo(pct, maxHp)` — HP 숫자 동시 감소 |
| `heal` | `tweenHpTo(pct, maxHp)` — HP 숫자 동시 증가 |
| `faint` | `se/faint` + 메시지 + `faintBattler(side)` (y+displayHeight, alpha 0, 500ms) |
| `ability_show` | 어빌리티 바 1200ms 표시 |
| `weather_start/tick/end` | 한글 메시지 + 딜레이 |
| `terrain_start/end` | 한글 메시지 + 딜레이 |
| `status_apply` | 한글 메시지 + 700ms |
| `status_cure` | no-op (추후 메시지 추가 가능) |
| `boost` | 한글 메시지 + `se/stat_up` + 600ms |
| `unboost` | 한글 메시지 + `se/stat_down` + 600ms |
| `miss` | "빗나갔다" 메시지 + 500ms |
| `cant_move` | "움직일 수 없다" 메시지 + 600ms |
| `immune` | "효과가 없는 것 같다…" 메시지 + 700ms |
| `move_fail` | "실패하고 말았다!!" 메시지 + 600ms |
| `callback_event` | "교체할 포켓몬을 선택해 주세요!" + stop |
| `battle_end` | "${winner} 승리!" + `se/level_up` + 1500ms |

### ✅ Sprint 5 브라우저 확인 결과 (2026-04-14 → 2026-04-15 수정 완료)

| 항목 | 결과 | 비고 |
|------|------|------|
| immune 메시지 | ✅ 수정 | FIX-1(BlendMode) 수정 후 정상 표시 |
| move_fail 메시지 | ✅ 수정 | 동일 |
| battle_end | ❓ 미확인 | — |
| BA-10 스프라이트 위치 | ✅ 맞음 | — |
| BA-10 애니메이션 | ✅ 수정 | 3종 버그 모두 수정 완료 |

**BA-10 버그 상세:**
1. 스프라이트가 애니메이션 후 사라지지 않음 (`cleanUp()` 미호출 또는 pool destroy 실패)
2. 같은 기술 반복 시 스프라이트 누적 (이전 pool이 해제 안 됨)
3. 30fps 루프가 안 도는 것처럼 보임 — 흐릿한 이미지 1장 고정

**배틀 불안정 현상:**
- Sprint 5 수정 이후 배틀 자체가 간헐적으로 hang하거나 이벤트를 skip하는 것으로 보임
- `playMoveAnim()` Promise가 resolve되지 않으면 executor 전체가 hang할 수 있음

---

### ✅ Sprint 5 재확인 버그 (2026-04-15 수정 완료)

> BA-10 애니메이션 부분 수정(취소 메커니즘, 5000ms timeout) 이후 브라우저에서 추가 버그 발견.

#### FIX-1 (CRITICAL): `Phaser is not defined` — `battle-anim-player.js:234-238`

- **증상**: 기술 사용 시 콘솔에 `Uncaught ReferenceError: Phaser is not defined at tick (battle-anim-player.js:237)` 발생
- **원인**: `battle-anim-player.js`는 ESM 모듈이며 Phaser를 import하지 않음. `_runAnim()` 내부 `tick()` 콜백에서 `Phaser.BlendModes.ADD / DIFFERENCE / NORMAL` 글로벌 참조
- **연쇄 영향**: ReferenceError가 `tick` 내에서 throw → `delayedCall` 루프 중단 → `cleanUp()`/`callback()` 미호출 → `playMoveAnim()` Promise가 resolve되지 않아 timeline executor hang → immune/move_fail/battle_end 등 후속 이벤트 전부 skip됨
- **수정 방법**: `Phaser.BlendModes.*` 상수를 숫자로 교체
  ```javascript
  // Before (broken):
  spr.setBlendMode(
    blend === AB_ADD ? Phaser.BlendModes.ADD        :
    blend === 2      ? Phaser.BlendModes.DIFFERENCE :
    Phaser.BlendModes.NORMAL
  );
  // After (fixed):
  spr.setBlendMode(
    blend === AB_ADD ? 1  :   // Phaser.BlendModes.ADD = 1
    blend === 2      ? 11 :   // Phaser.BlendModes.DIFFERENCE = 11
    0                         // Phaser.BlendModes.NORMAL = 0
  );
  ```
- **영향 파일**: `src/battle-presentation/battle-anim-player.js` lines 234-238

#### FIX-2: 파티 화면이 첫 클릭 후 닫히지 않음 — `app.js syncBattleUiState()`

- **증상**: 강제 교체 중 파티 화면에서 포켓몬을 클릭해도 화면이 유지됨. 두 번째 클릭 시 닫히며 엉뚱한 포켓몬이 선택됨.
- **원인**: `syncBattleUiState()`의 강제 교체 분기:
  ```javascript
  if (isEngineForceSwitchRequest(request)) {
    ui.modeByPlayer[player] = 'party';  // 무조건 'party'로 덮어씀
    return;
  }
  ```
  `handleBattleChoiceCommitted()`가 `mode='message'`로 설정한 직후 `renderBattle()` → `syncBattleUiState()` 재호출 시 다시 `'party'`로 덮어써 UI가 닫히지 않음.
- **연쇄 영향**: 파티 화면이 열린 채로 `resolveTurn()` 비동기 실행 → `state.battle`이 `adoptedBattle2`(다음 턴)로 교체 → 여전히 열린 파티 화면에서 추가 클릭이 새 턴의 배틀 상태에 잘못 dispatch됨 (엉뚱한 포켓몬 선택)
- **수정 방법**: `isPlayerReady(player)` 체크 후 이미 선택 완료 시 mode를 'party'로 강제 덮지 않음
  ```javascript
  if (isEngineForceSwitchRequest(request)) {
    if (!isPlayerReady(player, battle)) {  // ← 가드 추가
      ui.modeByPlayer[player] = 'party';
    }
    return;
  }
  ```
  여기서 `isPlayerReady(player, battle)` = `battle.pendingChoices[player]?.committed === true` 또는 유사 조건 (기존 코드 확인 필요)
- **영향 파일**: `src/app.js` — `syncBattleUiState()` 함수

#### FIX-3: 강제 교체 후 다음 턴에 p2(적) 화면이 먼저 표시됨 — `app.js resolveEngineTurn()`

- **증상**: p1이 강제 교체 완료 → 다음 턴 시작 시 p2(가이오가) 기술 선택 화면이 먼저 표시됨. p2가 기술을 선택하면 p1의 포켓몬이 공격을 받음.
- **원인**: `handleBattleChoiceCommitted(0)` 호출 시 내부에서 `actionablePlayers`에서 다음 플레이어(index=1, p2)를 찾아 `ui.perspective = 1`로 전환함. 이 상태가 다음 턴 `renderBattle()` 호출까지 남아있어 p2 화면이 먼저 표시됨.
- **수정 방법**: `resolveEngineTurn()` 내 `onComplete` 콜백(또는 `adoptEngineBattleSnapshot()` 직후)에서 perspective와 mode를 초기값으로 리셋:
  ```javascript
  onComplete: () => {
    // 새 턴 시작 — 항상 p1(플레이어)이 먼저 행동
    ui.perspective = 0;
    ui.modeByPlayer = { 0: 'command', 1: 'command' };
    ui.passPrompt = null;
    renderBattle();
  }
  ```
- **주의**: `applySnapshot` 콜백도 동일하게 처리 필요 여부 확인 (중간 스냅샷 적용 시 perspective가 바뀌지 않아야 함)
- **영향 파일**: `src/app.js` — `resolveEngineTurn()` 내 executor 생성 시 `onComplete` 콜백

---

## 2. 다음 작업 목록 (배틀 연출 완성 우선)

### ✅ Sprint 6. 배틀러 시각 연출 — 완료 (2026-04-15)

#### BA-11: Phase 2 — 배틀러 복사본 애니메이션 (`battle-anim-player.js`)
- **원본 참조**: `pokerogue_codes/src/data/battle-anims.ts` lines 944–983
- **반영 내용**:
  - `AnimFrameTarget.USER/TARGET/GRAPHIC` 3종 풀 동시 렌더링
  - USER/TARGET 복사본 생성 시 원본 battler 텍스처/프레임/스케일 동기화
  - 프레임별 위치/각도/스케일/블렌드 적용 + 원본 battler 숨김/복원 로직 추가
  - `battle-anims.ts` `isReversed()`까지 이식해 USER_TARGET 포커스의 좌우 반전 정합 유지

#### BA-12: 기절(faint) 시각 연출 (`battle-shell-scene.js`, `timeline.js`)
- **원본 참조**: `pokerogue_codes/src/phases/faint-phase.ts` lines 194–220
- **반영 내용**:
  - `battle-shell-scene.js`: `faintBattler(side)` 추가 (`duration:500`, `ease:Sine.easeIn`, `y += displayHeight`, `alpha:0`)
  - `timeline.js`: `faint` 핸들러에서 `await scene.faintBattler(ev.side)` 호출 후 다음 이벤트 진행

#### BA-13: 교체(switch_in) 시각 연출 (`battle-shell-scene.js`, `timeline.js`, `constants.js`, `assets.js`)
- **원본 참조**: `pokerogue_codes/src/phases/summon-phase.ts` lines 125–209
- **반영 내용**:
  - 포켓볼 아틀라스(`assets/pokerogue/ui/misc/pb.png/.json`) preload 추가
  - `battle-shell-scene.js`: `switchInBattler(side, fromBall)` 추가
  - `fromBall=true`: 포켓볼 arc tween(수평 650ms + 수직 체인 150ms/500ms) 후 battler fadeIn(250ms)
  - `timeline.js`: `switch_in`에서 `await scene.switchInBattler(...)` 호출로 연출 순차 동기화

### ✅ UX-DS1. 멀티뷰 배틀 화면 분할 — 완료 (2026-04-15)

- **목표**: 단일 `perspective` 전환형 UI를 제거하고, 한 화면에서 P1/P2를 동시에 고정 노출
- **구현 파일**: `index.html`, `styles.css`, `src/app.js`, `timeline.js`, `battle-shell-scene.js`, `battle-anim-player.js`
- **반영 내용**:
  - Phaser mount를 2개로 분리 (`battle-phaser-mount-p1`, `battle-phaser-mount-p2`)
  - 렌더러를 플레이어별로 독립 실행 (`phaserBattleRenderers[0|1]`)
  - `buildPkbPokerogueUiModel(battle, forcedPerspective)`로 뷰별 모델 분리
  - `dispatchPkbPokerogueUiAction(action, {playerOverride})`로 입력의 플레이어 컨텍스트 고정
  - `handleBattleChoiceCommitted()`에서 dual-view 시 pass-device 문구/자동 perspective 전환 비활성화
  - `playTimelineAcrossActiveViews()`로 턴 이벤트 타임라인을 P1/P2 씬에 동시 재생
  - `battle-shell-scene.js`의 `p1/p2` → mount 매핑을 `model.perspective` 기준으로 교정(P2 화면 역매핑 버그 수정)
  - 보조 화면 타임라인은 `audioEnabled=false`로 실행해 중복 SE(특히 move anim timed sound) 제거

### ✅ UX-DS1 후속 버그픽스 — 완료 (2026-04-15)

- 기술 USER/TARGET overlay 복사본 visibility 조건 수정: 원본 battler 숨김 상태에서도 overlay가 보이도록 변경 (`battle-anim-player.js`)
- 초기 배틀 시작 시 switch_in 포켓볼 연출 전에 스프라이트가 먼저 보이지 않도록, 타임라인 시작 직전 `concealBattler(side)` 적용 (`app.js`, `battle-shell-scene.js`)
- 기절한 active 몬(`hp<=0 || fainted`)은 Phaser battler sprite URL을 비워 재노출 방지 (`app.js`)
- 기술 애니메이션에서 USER/TARGET battler-copy 이동 프레임을 임시 비활성화(그래픽 이펙트만 유지) (`battle-anim-player.js`)
- `switch_in` 이벤트 기반 `timelineSpriteOverrides` 추가: 교체 후 즉시 기절하는 턴에서도 교체 포켓몬 스프라이트가 타임라인 중 정상 노출되도록 보강 (`app.js`)
- `prepareSwitchInBattler(side, spriteUrl)` 추가: 최종 스냅샷 선렌더 없이 switch_in 대상 스프라이트만 씬에 선로딩/숨김 처리 (`battle-shell-scene.js`, `app.js`)

#### 코드 변경 맵 (다음 세션 빠른 파악용)

- `src/battle-presentation/battle-anim-player.js`
  - `ENABLE_BATTLER_COPY_PHASE2 = false` 추가
  - USER/TARGET 프레임 처리 루프를 조건부로 비활성화해서 GRAPHIC-only 애니메이션 유지
- `src/pokerogue-transplant-runtime/scene/battle-shell-scene.js`
  - `concealBattler(side)` 추가: tween 중단 + sprite/shadow 숨김
  - `prepareSwitchInBattler(side, spriteUrl)` 추가: switch_in 대상 텍스처 선로딩 후 숨김 상태 준비
- `src/app.js`
  - `timelineSpriteOverrides` 상태 추가 (`get/set/clear/prime` 헬퍼)
  - `playTimelineAcrossActiveViews()`에서 `switch_in` 이벤트를 미리 스캔해 씬별 `prepareSwitchInBattler()` 호출
  - `buildPkbPokerogueUiModel()`에 `resolveSpriteUrlForBattleSide()` 경유 로직 추가:
    - 정상 active sprite 우선
    - 없으면 `timelineSpriteOverrides` fallback 사용
  - 타임라인 `onComplete`/V1 경로에서 override 정리(`clearTimelineSpriteOverrides()`)

---

### Sprint 7. 배틀 완성도

- **완료된 항목**:
  1. `M5` locale 네임스페이스 로더 ✅ 완료 (2026-04-16)
  2. `BA-17` 배틀 연출 타이밍 정확도 개선 ✅ 완료 (2026-04-16)
  3. `BA-14` 사이드 컨디션 연출 ✅ 완료 (2026-04-16)
  4. `BA-21` 선택 완료 후 대기 메시지 정합 ✅ 완료 (2026-04-16)
  5. `BA-22` 한국어/영어 메시지 완전 분리 ✅ 완료 (2026-04-16)
- **다음 세션 착수 순서(고정)**:
  1. `BA-27` 타임라인 재생 중 선택 입력 블록 ✅ 완료 (2026-04-17)
  2. `BA-26` 배틀 내 폼체인지 표시명 고정 ✅ 완료 (2026-04-17)
  3. `BA-24` 테라스탈 구현 (다음)
  4. `BA-25` 다이맥스 구현 (이후)
  5. `BA-23` 기술/날씨/필드 연출 완벽화 (이후)
  6. `BA-28` 영칭 전용 포켓몬/기술 한국어명 탑재 (이후)

#### ✅ M5: Locale 네임스페이스 로더 — 완료 (2026-04-16)
- **원본 참조**:
  - `pokerogue_codes/src/plugins/utils-plugins.ts` (`namespaceMap`)
  - `pokerogue_codes/src/plugins/i18n.ts` (namespace별 JSON 로드/`i18next.t` 사용 구조)
- **반영 내용**:
  - `src/battle-i18n/locale-manager.js` 신규:
    - `loadLocale(lang)` / `loadNamespace(lang, ns)` 구현
    - `t(ns, key, vars, {language,fallback})` 구현
    - upstream `namespaceMap` alias 반영 + ko 조사(`[[가]]` 등) 후처리
  - `src/app.js`:
    - `battleLocaleV1` 기본 ON
    - 타임라인 실행 전 locale namespace(`battle`, `ability-trigger`, `move-trigger`, `weather`, `terrain`) 선로딩
    - executor 생성 시 locale manager/language 전달
  - `src/battle-presentation/timeline.js`:
    - switch/move/faint/immune/move_fail 메시지와 weather/terrain 시작·종료 메시지를 locale key 조회로 치환
    - locale 미로딩/키 미존재 시 기존 문자열 fallback 유지

#### ✅ BA-17: 배틀 연출 타이밍 정확도 개선 — 완료 (2026-04-16)
- **원본 참조**:
  - `pokerogue_codes/src/ui/handlers/message-ui-handler.ts` (`showText` callback/prompt 완료 후 진행)
  - `pokerogue_codes/src/ui/ui.ts` (`showTextPromise`)
- **반영 파일**: `src/battle-presentation/timeline.js`
- **반영 내용**:
  - `_showMsg()`를 Promise 기반 완료 대기로 교체:
    - 메시지 길이/줄 수 기반 hold time 산정
    - `showText(..., callbackDelay)` 완료 시 resolve
    - UI 콜백 누락 시 safety timeout으로 hang 방지
  - 이벤트별 고정 지연을 축소/제거하고, 연출 완료 await 중심으로 정렬:
    - switch_in: 메시지 → switch_in tween 완료 → cry 완료
    - move_use: 메시지 → move anim Promise 완료(또는 timeout)
    - damage/heal/faint/forme_change: 메시지/HP tween/scene tween 완료 기준 진행
    - ability/weather/terrain/status/boost/miss/cant/immune/move_fail/battle_end/callback_event도 `_showMsg` 완료 기준으로 진행
  - 결과적으로 타임라인 진행 기준을 “연출 완료”로 통일(단순 `await delay(N)` 의존도 제거)
  - 후속 템포 튜닝(동일 세션): 이벤트 간 완충 간격 추가 (`short=140ms`, `major=200ms`)로 체감 속도를 소폭 완화

#### ✅ BA-14: 사이드 컨디션 연출 — 완료 (2026-04-16)
- **원본 참조**:
  - `pokerogue_codes/src/data/arena-tag.ts` (`onAdd/onRemove` key 구조)
  - `assets/pokerogue/locales/*/arena-tag.json` (`reflectOnAddPlayer`, `spikesOnRemoveEnemy` 등)
- **반영 파일**:
  - `src/battle-presentation/timeline.js`
  - `src/app.js` (locale preload namespace 확장)
- **반영 내용**:
  - `side_start/end` 이벤트를 no-op에서 메시지 처리로 승격
  - Showdown effect(`move: Reflect`, `Spikes`, `Stealth Rock`, `Toxic Spikes`, `Sticky Web`, `Tailwind`, `Safeguard` 등) → `arena-tag` 키(prefix) 매핑 추가
  - side(`p1/p2`) 기준 `Player/Enemy` suffix 키를 우선 조회하고, 미존재 시 base 키 fallback
  - 미매핑 효과는 일반 텍스트 fallback 메시지로 안전 처리
  - 후속 안정화: `-damage`의 `[from] Stealth Rock/Spikes` 메타를 서버 이벤트에 포함(`fromEffectId`)하고, trap 피격 메시지(`stealthRockActivateTrap`/`spikesActivateTrap`)를 damage 단계에서 출력하도록 보강

#### ✅ BA-21: 선택 완료 후 대기 메시지 정합 — 완료 (2026-04-16)
- **반영 파일**: `src/app.js`
- **반영 내용**:
  - `buildBattleMessageModel()`: `currentMode === 'message'` 분기 추가 → `상대의 턴을 기다리는 중...` / `Waiting for opponent's turn...`
  - `waitingForOpponent` 플래그 도입: mode='message' + request 존재 시 `battle.log` 라인이 waiting 메시지를 덮어쓰지 않도록 `usePromptAsPrimary=true` 강제
  - `secondaryText`/`showPrompt`도 waiting 상태에서 비움(불필요한 log 라인/prompt 아이콘 제거)
  - `renderBattleMessagesWindow()` (DOM 렌더러): 동일 로직 적용
  - `buildPhaserMessageWindowModel()`: request 존재 시 placeholder도 waiting 문구로 통일

#### ✅ BA-22: 한국어/영어 메시지 완전 분리 — 완료 (2026-04-16)
- **반영 파일**: `src/battle-presentation/timeline.js`, `src/app.js`
- **반영 내용**:
  - `STATUS_ID_TO_LOCALE_KEY` 맵 추가: Showdown 상태이상 단축키(`brn/par/psn/tox/slp/frz`) → `status-effect` 네임스페이스 키 매핑
  - `STAT_LABELS_EN` 맵 추가: 영어 스탯 표시명 (`Attack/Defense/Sp. Atk/Sp. Def/Speed/Accuracy/Evasion`)
  - `status_apply`: `status-effect.{id}.obtain` locale key 사용 + `pokemonNameWithAffix` 변수 적용 (English fallback 포함)
  - `boost/unboost`: `battle.statRose_one/statSharplyRose_one/statRoseDrastically_one` 등 locale key 사용, `_isEnglishLocale()`로 스탯 표시명 EN/KO 분기
  - `miss`: `battle.attackMissed` locale key 사용; EN fallback `"${name}'s attack missed!"`
  - `cant_move`: `_isEnglishLocale()` 분기로 EN/KO 직접 분리
  - `app.js` locale namespace에 `status-effect` 추가 (preload 시 함께 로드)
- **후속 픽스 — 포켓몬명/기술명 한국어 표시 (2026-04-16)**:
  - `app.js` executor 생성 시 `localizeMonName: displaySpeciesName`, `localizeMoveName: displayMoveName` 콜백 추가 → 언어 설정 따라 KO/EN 자동 분기
  - `timeline.js`: `_slotName()` → `_localizeMonName()` 경유로 배틀 메시지에 한국어명 출력
  - `timeline.js`: `_slotNameRaw()` 추가 — Showdown 이벤트 매칭·ID 비교용 raw 영어명 보존
  - `forme_change` 핸들러: `preNameRaw` 분리, raw 영어명 기준 `changed` 비교, infoPatch에는 localized `displayName` 적용
  - `_buildFormChangeMessage()`: `rawPre` 파라미터 추가, `this._slotNameRaw(null, 0)` 버그 수정 → raw 영어명 비교로 전환

#### ✅ BA-27: 타임라인 재생 중 선택 입력 블록 (`app.js`) — 완료 (2026-04-17)
- **요구사항**: 배틀 연출(타임라인)이 재생되는 동안에는 커맨드/기술/파티 선택 입력을 받지 않아야 함
- **현재 문제**: 타임라인 재생 중에도 선택 UI가 반응하거나, 빠르게 탭하면 다음 행동을 즉시 입력할 수 있음
- **반영 내용**:
  - `playTimelineAcrossActiveViews()` 시작 즉시 `ui.inputLocked=true`, 완료(onComplete 직전) 및 예외/finally 경로에서 `false` 해제
  - `syncBattleUiState()`에서 input lock 시 인터랙티브 모드(command/fight/party/target) 유지
  - `getBattleDisplayMode()` 추가: input lock 동안 렌더 모드를 강제 `message`로 바꿔 선택창(command/fight/party/target) 자체를 숨김
  - `renderBattleMessagesWindow`/`buildBattleMessageModel`에서 input lock 중 waiting 문구 대신 battle.log 메시지 우선 출력
  - `handleBattleChoiceCommitted()` 진입 가드 및 커밋 호출 경로 선가드 추가
  - `renderBattle()` auto-resolve 조건에 `!ui.inputLocked` 가드 추가(타임라인 재생 중 중첩 턴 해석 방지)
- **검증**:
  - `node --check src/app.js` PASS
  - `npm run verify:stage22` PASS
  - `npm run verify:passb` PASS

#### ✅ BA-26: 배틀 내 폼체인지 표시명 고정 (`app.js`, `timeline.js`) — 완료 (2026-04-17)
- **요구사항**: 배틀 메시지/정보창/선택창에서 폼명 대신 기본 종족명만 노출
- **반영 내용**:
  - `src/app.js`:
    - `resolveBattleDisplayBaseSpecies()` / `getBattleDisplaySpeciesName()` / `displayBattleSpeciesName()` 추가
    - battle UI 이름 출력 경로(command/fight/party/message/info/debug/pending)를 base species 기준으로 통일
    - 타임라인 executor `localizeMonName` 콜백을 base species 기준으로 변경
  - `src/battle-presentation/timeline.js`:
    - `_buildFormChangeMessage()`에서 pre/post 표시명이 동일할 때 안전 문구(`다른 모습으로 변화했다!`)로 처리
- **검증**:
  - `node --check src/app.js` PASS
  - `node --check src/battle-presentation/timeline.js` PASS
  - `npm run verify:stage22` PASS
  - `npm run verify:passb` PASS
- **후속 조정 (2026-04-17, 사용자 피드백)**:
  - 폼명 고정은 UI/정보창/선택창에만 유지
  - 폼체인지 연출 메시지(`_buildFormChangeMessage`)는 form-aware 이름(localizeMonNameWithForm)으로 복원해 원래 톤 유지

#### BA-23: 기술/날씨/필드 연출 완벽화 (`timeline.js`, `battle-shell-scene.js`, `battle-anim-player.js`)
- **요구사항**: move/weather/terrain 연출을 PokeRogue 원본 체감에 맞게 정밀 보강
- **범위(초안)**:
  - 기술 이펙트/SE/메시지 타이밍의 원본 정합도 향상
  - 날씨 시작/지속/종료 연출 및 메시지 품질 개선
  - 필드(terrain/side condition 포함) 연출 누락 및 품질 보강

#### 🔜 BA-24: 테라스탈 구현 (`showdown-engine.cjs`, `timeline.js`, `battle-shell-scene.js`, `app.js`)
- **요구사항**: 전투 중 테라스탈 선언/변환 연출 및 메시지를 이벤트 기반으로 재현
- **구현 메모(초안)**:
  - Showdown `-terastallize` 라인을 구조화 이벤트로 안정 추출
  - 타입/배틀러 시각 상태 갱신(아이콘/텍스트/연출) 타이밍 정합
  - locale key 기반 메시지(`battle`, 필요 시 `move-trigger`)와 연동

#### 🔜 BA-25: 다이맥스 구현 (`showdown-engine.cjs`, `timeline.js`, `battle-shell-scene.js`, `app.js`)
- **요구사항**: 다이맥스/거다이맥스 전환 및 해제 흐름을 배틀 연출에 반영
- **구현 메모(초안)**:
  - Showdown 다이맥스 관련 이벤트 추출 경로 정리
  - 배틀러 스케일/HP/UI 표시/메시지 타이밍을 원본 체감에 맞게 구성
  - 기존 faint/forme_change/switch_in 연출과 충돌 없이 공존하도록 순서 검증

#### BA-26: 배틀 내 폼체인지 표시명 고정
- 완료됨. 상세 구현/검증은 위 `✅ BA-26` 섹션 참조.

#### 🔜 BA-28: 영칭 전용 포켓몬/기술 한국어명 탑재 (`src/i18n-ko-data.js` 또는 신규 파일)
- **요구사항**: `getLocalizedName()`에서 한국어명을 찾지 못해 영어로 노출되는 포켓몬·기술·아이템에 한국어명 추가
- **현재 문제**: 일부 포켓몬/기술이 KO 모드에서도 영어 이름으로 표시됨 (LOCALIZED_NAME_MAPS·KO_NAME_MAPS에 엔트리 없음)
- **구현 메모(초안)**:
  - `getLocalizedName()`이 빈 문자열을 반환하는 케이스를 배틀 로그/브라우저에서 수집
  - 포켓몬: `assets/pokerogue/locales/ko/pokemon.json` 또는 공식 한국어 데이터 소스에서 조회
  - 기술: `assets/pokerogue/locales/ko/move.json` 에서 camelCase 키로 조회
  - 미발견 케이스는 수동 보완 (`src/i18n-ko-data.js` 또는 신규 override 파일)

#### ✅ BA-20: 폼체인지 연출 정합 (FormChangePhase/QuietFormChangePhase 분기 이식) — 완료 (2026-04-16)
- **원본 분기 확인**:
  - `pokerogue_codes/src/battle-scene.ts` lines 3339-3383 (`triggerPokemonFormChange`)
  - `pokerogue_codes/src/phases/form-change-phase.ts` (`FormChangePhase`: 진화씬 스타일 연출)
  - `pokerogue_codes/src/phases/quiet-form-change-phase.ts` (`QuietFormChangePhase`: 전투 중 경량 연출)
- **반영 내용**:
  - `server/showdown-engine.cjs`:
    - `forme_change` 이벤트에 `trigger`/`fromSource` 추가 (`[from] ability/item/move` 파싱)
  - `src/battle-presentation/form-change-presentation.js` (신규):
    - 원본 분기(`player && !quiet`)를 이벤트 컨텍스트 기반으로 해석하는 `resolveFormChangePresentation()` 추가
    - `modal`(party+item trigger), `shouldAnimate`(active/visible/silent) 계산
  - `src/app.js`:
    - `resolveTimelineEventVisualState()`에서 `formChangePresentation` 계산/전달
    - side+slot 기준 `isActive`/`isVisible` 평가 추가
  - `src/battle-presentation/timeline.js`:
    - BA-19 즉시 반영(sprite/info) 경로 유지
    - 이후 연출 레이어 분기 추가: `kind==='form'` → `scene.playFormChange()`, 그 외 `scene.playQuietFormChange()`
    - 비가시/비활성 컨텍스트에서는 `setBattlerSprite(..., {visible:false})`로 텍스처만 교체
  - `src/pokerogue-transplant-runtime/scene/battle-shell-scene.js`:
    - `playFormChange()` / `playQuietFormChange()` 신규
    - `setBattlerSprite()`에 `options.visible` 추가
- **검증**:
  - `node --check` (수정 파일 전부) 통과
  - `npm run verify:ba20` 통과
    - 양측 동시 메가 + 한쪽 즉시 KO
    - 파티 화면 item-trigger 폼체인지(modal) 분기
    - 비가시/비활성 폼체인지 분기
  - 회귀 점검: `npm run verify:stage22`, `npm run verify:passb` 모두 통과
- **후속 안정화 (2026-04-16, 사용자 시연 피드백 반영)**:
  - `src/pokerogue-transplant-runtime/scene/battle-shell-scene.js`:
    - `renderBattlerSprite()` 텍스처 교체 시 placeholder 강제 숨김 경로 제거(폼체인지 직전 깜빡임 제거)
    - 새 텍스처 로드 성공 후 이전 프레임 텍스처 정리로 교체 안정화
  - `src/app.js`:
    - `resolveTimelineSwitchSpriteOverride()`를 `switch_in` 이벤트의 `ev.species` 우선으로 변경
    - 원시가이오가/원시그란돈 시작 시 "일반 등장 → forme_change" 순서 체감 복원
  - `src/battle-presentation/timeline.js`:
    - `forme_change`에서 `_slotInfo` 기반 visibility/animate 재평가(같은 턴 KO 예정이어도 변신 시점 연출 유지)
    - faint 이후 detailschange(복귀) 문구는 타임라인 메시지 억제(불필요한 "폼변화!" 제거)
  - `server/showdown-engine.cjs`:
    - `normalizeLogTextFromLine()`에서 `-formechange/detailschange`의 `[silent]` 로그를 완전 무시
    - 동일 출력 배치에서 이미 `faint`된 ident의 후속 form/detailschange 로그도 무시해 정보창 오염 방지

#### ✅ BA-15: 폼 체인지 연출 — 완료 (2026-04-15)
- **원본 참조**:
  - `pokerogue_codes/src/phases/quiet-form-change-phase.ts` lines 60-66 (`showFormChangeTextAndEnd`)
  - `pokerogue_codes/src/data/pokemon-forms/form-change-triggers.ts` lines 314-341 (`getSpeciesFormChangeMessage`)
  - `assets/pokerogue/locales/ko/pokemon-form-battle.json` (`megaChange`, `formChange` 메시지 키)
- **반영 내용**:
  - `src/battle-presentation/timeline.js`:
    - `forme_change`에서 원본 톤의 메시지 출력 추가 (메가진화/일반 폼변화 분기)
    - 같은 턴의 중복 폼 이벤트(`-formechange` + `detailschange`)에서 메시지 중복을 피하도록 이름 변화 기준 가드 추가
    - 메시지 출력 전에 BA-19 경로로 sprite/info 즉시 갱신을 먼저 수행해 원본과 동일한 체감 순서 확보
- **원본 분기 메모 (2026-04-15 후속 확인)**:
  - `battle-scene.ts` 분기상 `modal=true`는 파티 오버레이 제어이며, "배틀 종료 후 진화 전용" 의미가 아님
  - 메가/원시/울트라도 트리거/quiet 플래그에 따라 `FormChangePhase`(연출 큼) 또는 `QuietFormChangePhase`(연출 경량)로 갈린다

#### ✅ BA-18: 교체 시 정보창 즉시 반영 — 완료 (2026-04-15)
- **원본 참조**:
  - `pokerogue_codes/src/phases/summon-phase.ts` lines 125-209 (`summon()` 내 `pokemon.showInfo()` 타이밍)
  - `pokerogue_codes/src/field/pokemon.ts` lines 3297-3348 (`showInfo()`/`updateInfo()` 호출 흐름)
- **반영 내용**:
  - `server/showdown-engine.cjs`: `switch_in` 이벤트에 `hpAfter`, `maxHp`, `status`를 포함하도록 파서 확장
  - `src/battle-presentation/timeline.js`:
    - `initialSlotInfo`/`_slotInfo` 도입으로 타임라인 중 side+slot별 정보 상태 유지
    - `switch_in` 처리 시 `displayName/hp/status`를 즉시 `BattleInfo.update()`에 반영
    - `damage/heal/status_apply/status_cure/faint`에서도 `_slotInfo`를 동기화해 정보창 정합 유지
  - `src/app.js`: `collectTimelineInitialSlotInfo()` 추가 후 executor 생성 시 `initialSlotInfo` 전달

#### ✅ BA-19: 폼체인지 즉시 반영 — 완료 (2026-04-15)
- **원본 참조**:
  - `pokerogue_codes/src/phases/quiet-form-change-phase.ts` lines 67-161 (`doChangeForm()` 직후 시각/텍스트 반영)
  - `pokerogue_codes/src/field/pokemon.ts` lines 4586-4633 (`changeForm()` 내 `loadAssets()` + `updateInfo()` 순서)
- **반영 내용**:
  - `server/showdown-engine.cjs`:
    - `forme_change` 이벤트에 `toSpecies` 필드 추가(`detailschange`/`-formechange` 우선 파싱)
    - `damage/heal` 이벤트에도 condition status를 포함해 타임라인 상태 추적 보강
  - `src/app.js`:
    - `resolveTimelineEventVisualState()` 추가: 이벤트 시점 side별 `spriteUrl`/`infoPatch` 제공
    - executor에 `resolveVisualState` 콜백 전달
  - `src/battle-presentation/timeline.js`:
    - `forme_change` 핸들러 구현: `_slotNames` 갱신 + info panel 즉시 갱신 + `scene.setBattlerSprite()` 호출
    - 폼체인지 직후 ability_show 메시지에서 새 폼 이름이 즉시 사용되도록 이름 캐시 동기화
  - `src/pokerogue-transplant-runtime/scene/battle-shell-scene.js`:
    - `setBattlerSprite(side, spriteUrl)` 추가: 이벤트 시점 battler 텍스처 즉시 교체
  - 후속 안정화(동일 세션):
    - Showdown의 `detailschange(메가) + -mega + [silent] detailschange` 연쇄 케이스 처리
    - `-mega` 페어 마커(종 정보 없음)는 타임라인에서 skip
    - `detailschange`의 `[silent]` 플래그를 이벤트에 포함해 메시지 출력 억제
    - 폼체인지 sprite 해석 시 최종 스냅샷 대신 이벤트 `toSpecies` 우선 사용
    - 재현 버그 픽스: A/B 동시 메가 + B가 A를 원턴 KO하는 경우, A의 메가 메시지만 나오고 sprite/info가 미변경되던 케이스 수정

---

## 3. UI 폴리시 (배틀 완성 후 착수)

> **아래 항목들은 Sprint 6~7 배틀 연출이 완성된 이후에 착수한다.**

### UI-P1. 텍스트 왜곡 재분석
- 파일: `text.js`, `phaser-utils.js`, `controller.js`
- 8px 그리드 수정이 실제로 적용되었는지 재확인

### UI-P2. Fight UI 레이아웃
- 파일: `fight-ui-handler.js`
- 타입배지·PP·스탯 레이아웃 PokeRogue 원본 좌표 정밀 재확인

### UI-P3. Switch/Tera 버튼
- 파일: `fight-ui-handler.js`
- PokeRogue 원본 방식 재확인 후 정렬

### UI-P4. 파티 아이콘 위치
- 파일: `party-ui-handler.js`
- active=(4,4), bench=(2,-4) 재검토

### UI-P5. PBS 수동 보정
- 파일: `assets/Pokemon/PBS/`
- `reports/metrics-drift.json` 상위 4개: LINOONE, METAGROSS_1, MIMIKYU_1, SALAMENCE_1

### UI 보류 항목
- MoveInfoOverlay 이식 (Pow/Acc 표시) — `fight-ui-handler.js`
- Tera 색상 파이프라인 — `command-ui-handler.js`
- nameTextY 비정수 블러 — 원본과 동일값이라 일단 유지

---

## 4. 아키텍처 레퍼런스

### 이벤트 흐름
```
Showdown protocol lines
  → showdown-engine.cjs normalizeEventsFromLine()
  → snapshot.events[]
  → BattleTimelineExecutor.play(events)
  → 각 핸들러 (timeline.js)
  → scene.*, audio.*, battleInfo.tweenHpTo()
  → 완료 후 snapshot 최종 적용
```

### 주요 파일 역할
| 파일 | 역할 |
|------|------|
| `server/showdown-engine.cjs` | protocol → structured events 변환 |
| `src/battle-presentation/event-schema.js` | EVENT_TYPES 상수 정의 |
| `src/battle-presentation/timeline.js` | BattleTimelineExecutor — 이벤트 순차 재생 |
| `src/battle-presentation/battle-anim-player.js` | BattleAnimPlayer — 기술 비주얼 애니메이션 |
| `src/pokerogue-transplant-runtime/runtime/audio-manager.js` | BattleAudioManager — SE/BGM/cry |
| `src/pokerogue-transplant-runtime/scene/battle-shell-scene.js` | Phaser 씬 — 스프라이트·playMoveAnim 등 |
| `src/app.js` | 앱 진입점 — executor 생성·연결 |

### 기술 애니메이션 좌표계 (battle-anim-player.js)
- 논리 해상도: 320×180
- USER_FOCUS: (106, 116) — 플레이어 스프라이트 기준점
- TARGET_FOCUS: (234, 52) — 적 스프라이트 기준점
- AnimFrameTarget: `USER=0, TARGET=1, GRAPHIC=2`
- AnimFocus: `TARGET=1, USER=2, USER_TARGET=3, SCREEN=4`
- GRAPHIC 스프라이트 depth: 12 (배틀러=6-7, UI=30+ 사이)
- 프레임 레이트: 30fps (`time.delayedCall(33.33ms, tick)`)

### Feature Flags (`src/app.js`)
- `FLAGS.battlePresentationV2: true` — 타임라인 executor 활성화 (기본 ON)

---

## 5. 완료 이력 (스프린트별)

### Sprint 5 버그픽스 + BA-16 (2026-04-15)

**FIX-1: `Phaser is not defined` — `battle-anim-player.js`**
- 원인: ESM 모듈에서 `Phaser.BlendModes.*` 글로벌 참조
- 수정: 숫자 상수 직접 사용 (ADD=1, DIFFERENCE=11, NORMAL=0)
- 효과: 기술 애니메이션 실행 + immune/move_fail 등 후속 이벤트 정상 처리

**FIX-2: 파티화면 미닫힘 — `app.js syncBattleUiState()`**
- 원인: 강제 교체 분기에서 `modeByPlayer[player] = 'party'` 무조건 덮어씌움
- 수정: `if (!isPlayerReady(player))` 가드 추가
- 효과: 포켓몬 클릭 1회로 즉시 파티화면 닫힘

**FIX-3: 강제 교체 후 p2 화면 먼저 표시 — `app.js resolveEngineTurn()`**
- 원인: `handleBattleChoiceCommitted()` 호출 시 `ui.perspective=1`로 전환된 채 유지
- 수정: `onComplete` 콜백에서 `ui.perspective=0`, `modeByPlayer={0:'command',1:'command'}` 리셋
- 효과: 강제 교체 후 다음 턴에 항상 p1(플레이어) 화면 먼저 표시

**BA-16: HP 숫자 바와 동시 감소**
- `battle-info.js`: `tweenHpTo(hpPercent, maxHp=0)` — maxHp 파라미터 추가. tween onUpdate에서 `_onHpNumbersUpdate(scaleX, maxHp)` 호출
- `player-battle-info.js`: `_onHpNumbersUpdate()` 오버라이드 — `Math.round(scaleX * maxHp)` 계산 후 `setHpNumbers()` 호출
- `timeline.js`: damage/heal 핸들러에서 `tweenHpTo(pct, ev.maxHp)` 전달

### Sprint 5 (2026-04-14)
- BA-5a: immune/move_fail 메시지 (`timeline.js`, `showdown-engine.cjs`, `event-schema.js`)
- BA-5b: boost/unboost SE (`audio-manager.js`, `timeline.js`)
- 5-C: callback_event 메시지 + battle_end 승리 메시지 (`timeline.js`)
- BA-10: `battle-anim-player.js` 신규 — Phase 1 GRAPHIC overlay 기술 애니메이션
  - AnimFrameTarget enum 정확한 값: USER=0, TARGET=1, GRAPHIC=2
  - `battle-shell-scene.js` import 경로: `'../../battle-presentation/battle-anim-player.js'`

### Sprint 4 (2026-04-13)
- BA-4: 상태이상/스탯/빗나감/행동불가 메시지
- Bug #1: 커맨드 이름 고정 (ui.js fresh args)
- Bug #3: 날씨 특성 어빌리티 바 미표시 수정 (showdown-engine.cjs)

### Sprint 3 (2026-04-13)
- BA-1: 배틀 메시지 순차 표시
- BA-2: 울음소리 (`playCryByNum`)
- BA-3: 어빌리티 바 + 날씨/지형 연출

### Sprint 2a/2b (2026-04-12)
- M2 서버 이벤트 추출
- M3 Timeline Executor 기본 구조
- M4 Audio Manager 기본 구조
- move_use SE, damage HP 트윈, faint SE

### Sprint 1 (2026-04-12)
- M0/M1: 이벤트 스키마, server-side event 추출 기반
