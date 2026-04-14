# PKB Battle Presentation 구현 계획

Last updated: 2026-04-15  
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

## 1. 현재 구현 상태 (2026-04-15 기준)

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

### ✅ 완료된 이벤트 핸들러 목록 (`timeline.js`)

| 이벤트 | 연출 |
|--------|------|
| `switch_in` | `se/pb_rel` + 300ms + 메시지 |
| `move_use` | 기술명 메시지 + `playMoveAnim()` (GRAPHIC overlay, Phase 1) |
| `damage` | `playHitByResult()` + 100ms + `tweenHpTo(pct, maxHp)` — HP 숫자 동시 감소 |
| `heal` | `tweenHpTo(pct, maxHp)` — HP 숫자 동시 증가 |
| `faint` | `se/faint` + 메시지 + 600ms |
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

### Sprint 6. 배틀러 시각 연출

#### BA-11: Phase 2 — 배틀러 복사본 애니메이션 (`battle-anim-player.js`)
- **목적**: 기술 사용 시 공격 포켓몬이 앞으로 이동, 피격 포켓몬이 flinch하는 연출
- **대상 프레임**: `AnimFrameTarget.USER(0)` / `AnimFrameTarget.TARGET(1)`
- **원본 참조**: `pokerogue_codes/src/data/battle-anims.ts` lines 944–983
- **구현 방식**:
  - `phaserSprite` 현재 텍스처·프레임·스케일 복사 → 별도 `scene.add.image()` 생성
  - USER: 진행 방향(playerSide면 오른쪽, enemySide면 왼쪽)으로 tween 이동 후 복귀
  - TARGET: x 방향 ±4px shake tween (3회)
  - GRAPHIC 루프와 병렬 실행 (Promise.all로 기다리지 않음 — 원본 동작 확인 필요)
- **착수 조건**: BA-10 브라우저 확인 완료 후

#### BA-12: 기절(faint) 시각 연출 (`battle-shell-scene.js`, `timeline.js`)
- **현재**: `faint` 이벤트에서 SE + 메시지만 있음. 스프라이트 그대로.
- **목표**: 스프라이트 아래로 슬라이드 tween (y += displayHeight, 500ms) + alpha 0
- **구현**:
  - `battle-shell-scene.js`: `faintBattler(side)` 메서드 추가
  - `timeline.js`: `faint` 핸들러에서 `await scene.faintBattler(ev.target.side)` 호출
  - tween 완료 시 스프라이트 `setVisible(false)` (다음 switch_in에서 복원)

#### BA-13: 교체(switch_in) 시각 연출 (`battle-shell-scene.js`, `timeline.js`)
- **현재**: 스프라이트가 즉시 교체됨. 포켓볼 연출 없음.
- **목표**: `fromBall: true` 케이스에서 포켓볼 이미지가 호를 그리며 착지 → 스프라이트 등장
- **구현**:
  - 포켓볼 에셋 로드 여부 확인 (`assets/pokerogue/ui/pokeball.png` 또는 유사)
  - `switchInBattler(side, fromBall)` 메서드 추가
  - fromBall=true: 포켓볼 tween arc → 착지 → 스프라이트 fadeIn
  - fromBall=false: 즉시 표시 (현재와 동일)

---

### Sprint 7. 배틀 완성도

#### M5: Locale 네임스페이스 로더 (`src/battle-i18n/locale-manager.js` 신규)
- **현황**: `assets/pokerogue/locales/ko/*.json` 완전 미사용. `timeline.js`가 한글 하드코딩.
- **목표**: locale 파일 로드 → 배틀 메시지를 키 기반으로 조회
- **1차 네임스페이스**: `battle`, `ability-trigger`, `move-trigger`, `weather`, `terrain`
- **구현 순서**:
  1. `locale-manager.js` 신규: `loadLocale(lang)` → namespace별 JSON 로드 → `t(ns, key, vars)` API
  2. `timeline.js` 한글 하드코딩 → `t('battle', 'switchIn', {name})` 형태로 교체
  3. 키 매핑 확인: `pokerogue_codes/src/plugins/utils-plugins.ts` 참조

#### BA-17: 배틀 연출 타이밍 정확도 개선 (`timeline.js`, `battle-message-ui-handler.js`)
- **현황**: 각 이벤트 핸들러가 고정 ms 딜레이(`await delay(N)`)로 다음 이벤트로 넘어감. 메시지 표시 완료나 애니메이션 완료를 정확히 기다리지 않음.
- **목표**: 실제 포켓몬 게임처럼 — 메시지 표시 완료 + A버튼(또는 자동 진행) 후 다음 이벤트 진행. 각 연출이 완전히 끝난 뒤에야 다음 연출 시작.
- **구현 방향**:
  1. **메시지 대기**: `_showMsg()`가 메시지를 표시하고 일정 시간 또는 사용자 입력(A버튼)을 기다린 후 resolve하는 Promise 반환
  2. **연출 완료 대기**: SE 재생, tween 완료, 어빌리티 바 표시 등 모든 비동기 연출이 정확히 끝날 때 await
  3. **자동 진행 모드**: 현재처럼 자동 진행이지만 타이밍은 연출 완료 기준 (고정 ms 제거)
- **참고**: PokeRogue는 `awaitMoveEnd()`, `awaitMessageComplete()` 패턴으로 이 문제를 해결함

#### BA-14: 사이드 컨디션 연출 (`timeline.js`)
- `side_start/end`: Stealth Rock, Spikes, Reflect, Light Screen 등 설치/해제 메시지
- 영향: `showdown-engine.cjs`에서 이미 `side_start/end` 이벤트 생성하는지 확인 필요

#### BA-15: 폼 체인지 연출 (`battle-shell-scene.js`, `timeline.js`)
- `forme_change`: 스프라이트 교체 + "X는 폼 체인지했다!" 메시지
- 현재 `forme_change` 이벤트가 showdown-engine에서 생성되는지 확인 필요

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
