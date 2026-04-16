# Pokemon Battle - 프로젝트 개요

## 게임 개요
두 플레이어가 직접 포켓몬 팀을 빌더에서 짜고, 즉시 배틀로 들어가는 게임.
- **팀 빌더**: 각 플레이어가 브라우저에서 포켓몬/기술/아이템 선택
- **배틀**: Phaser 기반 배틀 씬. 배틀 엔진은 Pokémon Showdown 기반.
- **배틀 UI**: PokeRogue의 UI를 이식(transplant)해서 사용

## 아키텍처
```
src/
  app.js                        # 메인 앱 (팀 빌더 UI, 배틀 상태 관리, 모델 빌더)
  phaser-battle-controller.js   # Phaser 씬 컨트롤러 (app.js ↔ Phaser 씬 연결)
  pokerogue-transplant-runtime/ # PokeRogue UI 이식 런타임
    runtime/
      constants.js              # UI 에셋 키/경로 정의
      assets.js                 # Phaser preload 함수
      phaser-utils.js           # 유틸 (clamp, textureExists, setHorizontalCrop, addWindow)
    ui/
      battle-info/
        battle-info.js          # BattleInfo 기반 클래스 (HP바, 레벨, 상태이상, 타입아이콘 등)
        player-battle-info.js   # PlayerBattleInfo (HP숫자, EXP바, mini모드)
        enemy-battle-info.js    # EnemyBattleInfo (보스 세그먼트, owned 아이콘)
      handlers/
        fight-ui-handler.js     # 기술 선택 UI
        command-ui-handler.js   # 커맨드 선택 UI (싸운다/볼/포켓몬/도망)
        party-ui-handler.js     # 파티 UI (교체 화면)
        battle-message-ui-handler.js  # 배틀 메시지 창
        target-select-ui-handler.js   # 타겟 선택 UI
      helpers/
        text.js                 # addTextObject 헬퍼
        ui-theme.js             # 윈도우 테마
pokerogue_codes/src/ui/         # PokeRogue 원본 TypeScript 소스 (참조용)
assets/pokerogue/ui/            # PokeRogue UI 에셋 (PNG, JSON 아틀라스)
```

## 이식 방식
- PokeRogue 원본은 `globalScene`, Pokemon 객체에 직접 접근하는 OOP 방식
- 이식본은 **모델(데이터 객체)을 `update(info)` 메서드로 전달받는 Facade 방식**
- `app.js`의 `buildBattleInfoModel()` 함수가 배틀 상태를 읽어서 모델 생성
- Phaser 씬이 매 프레임 또는 상태 변화 시 UI 핸들러의 `update(model)` 호출

## 현재 이식 완성도 (Phase 18 완료 — 2026-04-11)

| 파일 | 완성도 | 주요 미구현 / 미해결 |
|------|--------|-----------|
| `battle-info.js` | ~88% | Stats 컨테이너, nameTextY 비정수 블러 |
| `player-battle-info.js` | ~85% | EXP 레벨업 사운드 처리 |
| `enemy-battle-info.js` | ~68% | Type effectiveness 창, Flyout 메뉴 |
| `fight-ui-handler.js` | ~70% | 텍스트 왜곡 미해결, fight 레이아웃 부자연스러움, Switch/Tera 버튼 위치 어색 |
| `command-ui-handler.js` | ~80% | Tera 색상 파이프라인 |
| `party-ui-handler.js` | ~80% | 아이콘 위치 조정 필요 (스크린샷 기준) |
| `ui.js` | ~97% | 완성 수준 |
| `app.js` | ~93% | — |
| `battle-message-ui-handler.js` | ~75% | `promptLevelUpStats` 트리거 연결 필요 |
| `target-select-ui-handler.js` | ~40% | 싱글 배틀이라 field 스프라이트 접근 불가 |
| `text.js` (helpers) | ~85% | 텍스트 왜곡 수정 적용했으나 여전히 문제 — 재분석 필요 |
| `battle-shell-scene.js` | ~90% | 배틀러 스프라이트 완성 |

## 주요 에셋 정보
- 게임 해상도: **320×180** (LOGICAL_WIDTH/HEIGHT) — PokeRogue와 동일 (1920/6 × 1080/6)
- `overlay_hp` 아틀라스: 48×2px per frame (high/medium/low)
- `overlay_exp`: 85×2px plain image
- `numbers` 아틀라스: 0-9, / 프레임 (각 8×8px)
- `statuses_ko` 아틀라스: burn, freeze, paralysis, poison, sleep, toxic, pokerus
- `shiny_icons` 아틀라스: 0, 1, 2 (shiny variant)
- `ability_bar_left/right.png`: 118×31px — 플레이어(왼쪽)/적(오른쪽) 어빌리티 바
- `cursor.png`: 6×10px — **기본 origin (0.5, 0.5)** 사용 (setOrigin 호출 금지)

## UI 레이아웃 기준값 (PokeRogue 좌표계 역산)
fieldUI는 y=180(화면 하단)에 위치. 자식 요소의 절대 y = 180 + localY.

| 요소 | 절대 좌표 (x, y) | PokeRogue 원본 |
|------|----------------|--------------|
| enemyTray | (0, 36) | (0, -144) in fieldUI |
| playerTray | (320, 108) | (scaledCanvas.width, -72) |
| enemyInfo | (140, 39) | super(140, -141) |
| playerInfo | (310, 108) | super(scaledCanvas.width-10, -72) |
| enemySprite | (216, 84) | PokeRogue origin (236, 84), 16px 왼쪽으로 조정 |
| playerSprite | (106, 148) | PlayerPokemon super(106, 148) |
| abilityBar (enemy) | (202, 64) | x=screenRight-118, y=-116 in fieldUI |
| abilityBar (player) | (0, 64) | x=0, y=-116 in fieldUI |

## 다음 세션 우선순위 (Sprint 7 시작 — 2026-04-15 기준)

> **작업 원칙1: 각 항목을 수정하기 전에 반드시 PokeRogue 원본 코드를 자세하게 읽고 정확히 일치시킬 것.**
> **작업 원칙2: 작업 시에는 항상 각주를 달고, 작업 마무리 때는 항상 CLAUDE.md도 업데이트 할것.**
> **작업 원칙3: 나를 위한 설명은 한글로 하되, 작업 및 사고 자체는 영어로 진행할 것 - 토큰 절약을 위함**
> **작업 원칙4: UI 폴리시 작업(UI-P1~P5)은 배틀 연출이 완성된 후에 한다. 배틀이 먼저.**

### ✅ BA-20. 폼체인지 연출 정합 — 완료 (2026-04-16)
- 원본 분기 이식: `player && !quiet`면 `FormChangePhase`, 그 외 `QuietFormChangePhase`
- `modal`은 파티 UI 오버레이 제어로 처리 (`party + item-trigger`에서만 `modal=true`)
- BA-19 즉시 반영(sprite/info)은 유지하고, 그 뒤 연출 레이어만 분기 추가
- 구현 파일:
  - `server/showdown-engine.cjs` (`forme_change`에 `trigger`/`fromSource` 추가)
  - `src/battle-presentation/form-change-presentation.js` (신규 분기 해석)
  - `src/app.js` (`resolveTimelineEventVisualState`에 `formChangePresentation` 계산)
  - `src/battle-presentation/timeline.js` (Form vs Quiet 연출 호출)
  - `src/pokerogue-transplant-runtime/scene/battle-shell-scene.js` (`playFormChange`, `playQuietFormChange`, `setBattlerSprite(...,{visible})`)
- 검증:
  - `node --check` 전부 통과
  - `npm run verify:ba20` PASS (동시 메가+즉시 KO / party modal / 비가시·비활성)
  - `npm run verify:stage22`, `npm run verify:passb` PASS
- 후속 안정화(동일 날짜, 브라우저 시연 피드백 반영):
  - 폼체인지 직전 스프라이트가 잠깐 사라지는 깜빡임 제거 (`battle-shell-scene.js` `renderBattlerSprite()`)
  - 같은 턴 KO 예정인 경우에도 변신 시점 연출이 사라지지 않도록 timeline visibility 재평가 (`timeline.js`)
  - `switch_in` sprite 해석을 이벤트 `species` 우선으로 바꿔, 원시가이오가/원시그란돈이 "일반 등장 → 폼체인지" 흐름으로 보이게 조정 (`app.js`)
  - faint 직후 원복 detailschange 문구 억제:
    - 타임라인 메시지 억제 (`timeline.js`)
    - 서버 로그 파서에서 `[silent]` + 기절 후 후속 form/detailschange 라인 무시 (`showdown-engine.cjs`)

### 다음 세션 착수 순서 (고정)
1. `M5` locale 네임스페이스 로더 ✅ 완료 (2026-04-16)
2. `BA-17` 배틀 연출 타이밍 정확도 개선 ✅ 완료 (2026-04-16)
3. `BA-14` 사이드 컨디션 연출 ✅ 완료 (2026-04-16)
4. `BA-21` 선택 완료 후 대기 메시지 정합
5. `BA-22` 한국어/영어 메시지 완전 분리
6. `BA-23` 기술/날씨/필드 연출 완벽화 (추후)

### ✅ M5. locale 네임스페이스 로더 — 완료 (2026-04-16)
- 원본 참조: `pokerogue_codes/src/plugins/utils-plugins.ts`, `pokerogue_codes/src/plugins/i18n.ts`
- 반영 파일:
  - `src/battle-i18n/locale-manager.js` (신규)
  - `src/app.js` (타임라인 전 locale 로드 + executor 주입)
  - `src/battle-presentation/timeline.js` (battle/weather/terrain key 조회)
- 반영 내용:
  - namespace 로더 + `t(ns, key, vars)` API 추가
  - 1차 namespace(`battle`, `ability-trigger`, `move-trigger`, `weather`, `terrain`) 로드
  - switch/move/faint/immune/move_fail/weather/terrain 메시지를 locale 키 우선으로 변경(기존 문자열 fallback 유지)

### ✅ BA-17. 배틀 연출 타이밍 정확도 개선 — 완료 (2026-04-16)
- 원본 참조: `pokerogue_codes/src/ui/handlers/message-ui-handler.ts`, `pokerogue_codes/src/ui/ui.ts`
- 반영 파일: `src/battle-presentation/timeline.js`
- 반영 내용:
  - `_showMsg()`를 Promise 완료 대기로 교체(길이 기반 hold + safety timeout)
  - 고정 `await delay(N)` 중심 흐름을 메시지/애니메이션 완료 await 중심으로 재구성
  - switch/move/damage/heal/faint/ability/weather/terrain/forme_change/callback/battle_end 전 구간 진행 타이밍 정합 개선
  - 후속 템포 튜닝: 이벤트 간 완충 간격 추가 (`short=140ms`, `major=200ms`)

### 🔜 BA-21. 선택 완료 후 대기 메시지 정합
- 한 플레이어가 행동 선택을 끝낸 뒤 이상 문구 대신 `상대의 턴을 기다리는 중...` 고정 표시
- 영어 UI는 `Waiting for opponent's turn...`로 분리 표시
- 대상 경로: `app.js` 선택 커밋 흐름, `timeline.js`/`battle-message-ui-handler.js` 메시지 우선순위

### 🔜 BA-22. 한국어/영어 메시지 완전 분리
- 한국어 버전에서 영어 병기(예: `... / ...`) 완전 제거
- 영어 버전은 영어만 표시
- M5 locale 작업과 결합해 배틀 메시지를 locale key 기반으로 통합

### 🔜 BA-23. 기술/날씨/필드 연출 완벽화 (추후)
- 기술, 날씨, 필드 연출 품질을 원본 체감 기준으로 단계적으로 완성
- 현재는 후순위 항목이며 BA-21/BA-22 이후 착수

### ✅ BA-1. 배틀 메시지 순차 표시 — 완료 (2026-04-13)
### ✅ BA-2. 울음소리(Cry) 연결 — 완료 (2026-04-13)
### ✅ BA-3. 어빌리티 바 + 날씨/지형 연출 — 완료 (2026-04-13)
### ✅ BA-4. 상태이상/스탯변화/빗나감/행동불가 메시지 — 완료 (2026-04-13)
### ✅ Sprint 5 — 완료 (2026-04-14)
- **BA-5a: immune/fail 메시지** (`timeline.js`, `showdown-engine.cjs`, `event-schema.js`): `immune` → "X에게는 효과가 없는 것 같다…", `move_fail` 신규 이벤트 → "그러나 실패하고 말았다!!" 메시지
- **BA-5b: 스탯 변화 사운드** (`audio-manager.js`, `timeline.js`): `se/stat_up.wav` / `se/stat_down.wav` / `se/level_up.wav` 프리로드. boost/unboost 핸들러에 SE 연결.
- **5-C: 강제 교체 메시지** (`timeline.js`): `callback_event` → "교체할 포켓몬을 선택해 주세요!" 메시지 + 600ms 후 executor 중단. 이후 기존 `request.forceSwitch` 메커니즘이 파티 화면 자동 표시.
- **5-C: 배틀 종료 메시지** (`timeline.js`): `battle_end` → "${winner} 승리!" + `se/level_up` + 1500ms
- **BA-10: 기술 시각 애니메이션** (`battle-anim-player.js` 신규, `battle-shell-scene.js`, `timeline.js`):
  - PokeRogue `BattleAnim.play()` Phase 1 이식 (GRAPHIC 스프라이트 only; USER/TARGET 배틀러 복사본은 Phase 2 대상)
  - `anim-data/<slug>.json` fetch → AnimConfig 파싱
  - `battle__anims/<graphic>.png` Phaser 스프라이트시트 (96×96 프레임) 동적 로딩
  - PokeRogue 좌표 변환 (USER_FOCUS=106,116 / TARGET_FOCUS=234,52) + USER_TARGET 이중선형 보간 완전 이식
  - 30fps (33.33ms/frame) `time.delayedCall` 루프
  - `AnimTimedSoundEvent` 발화 (lazy-load 내장)
  - `scene.playMoveAnim(moveName, actorSide, targetSide)` → `timeline.js` `move_use` 핸들러에 연결

### ✅ BA-10 버그픽스 — 완료 (2026-04-14)

**원인 분석:**
- `BattleAnimPlayer`에 이전 애니메이션 취소 메커니즘 없음 → 같은 기술 반복 시 이전 pool의 스프라이트가 잔존, 누적되어 진해 보임 / 고정된 이미지처럼 보임
- `playMoveAnim()` Promise가 Phaser `delayedCall` 취소 시 영원히 resolve 안 됨 → executor hang → `immune`/`move_fail` 등 후속 이벤트 미처리

**수정 내용:**
- `battle-anim-player.js`: `_activeCancel` 추가. `play()` 진입 시 이전 애니메이션 즉시 취소 (sprites destroy + Promise resolve). `_runAnim()`이 `cleanUp`을 cancel handle로 반환.
- `battle-anim-player.js`: `_runAnim()` 반환값을 `cleanUp` 함수로 변경.
- `timeline.js` `move_use` 핸들러: `Promise.race([playMoveAnim(), timeout(5000)])` — hang 방지 safety timeout.
- `battle-shell-scene.js` `handleShutdown`: 씬 종료 시 `animPlayer._activeCancel()` 호출 → 씬 재시작 시 Promise 미해결 방지.

### ✅ Sprint 5 버그픽스 + BA-16 — 완료 (2026-04-15)

**FIX-1: `Phaser is not defined` — `battle-anim-player.js`**
- 원인: ESM 모듈에서 `Phaser.BlendModes.*` 글로벌 참조 (tick 콜백 내)
- 수정: 숫자 상수 직접 사용 — ADD=1, DIFFERENCE=11, NORMAL=0
- 효과: 기술 애니메이션 정상 실행 + immune/move_fail 후속 이벤트 정상 처리

**FIX-2: 파티화면 미닫힘 — `app.js syncBattleUiState()`**
- 원인: 강제 교체 분기에서 선택 완료 여부와 무관하게 `modeByPlayer[player] = 'party'` 덮어씌움
- 수정: `if (!isPlayerReady(player))` 가드 추가 → 선택 완료 후에는 mode 변경 안 함

**FIX-3: 강제 교체 후 p2 화면 먼저 표시 — `app.js resolveEngineTurn()`**
- 원인: `handleBattleChoiceCommitted()` 호출 시 `ui.perspective=1`로 전환된 상태가 다음 턴까지 유지
- 수정: `onComplete` 콜백에서 `ui.perspective=0`, `modeByPlayer={0:'command',1:'command'}` 리셋

**BA-16: HP 숫자 바와 동시 감소**
- `battle-info.js`: `tweenHpTo(hpPercent, maxHp=0)` — maxHp 파라미터 추가. tween `onUpdate`에서 `_onHpNumbersUpdate(scaleX, maxHp)` 호출 (베이스 no-op)
- `player-battle-info.js`: `_onHpNumbersUpdate(scaleX, maxHp)` 오버라이드 — `Math.round(scaleX * maxHp)` → `setHpNumbers()`. `lastHpNum` 동기화.
- `timeline.js`: damage/heal 핸들러 — `tweenHpTo(pct, ev.maxHp)` 전달

### ✅ Sprint 6 — 완료 (2026-04-15)

**BA-11: Phase 2 USER/TARGET 배틀러 복사본 애니메이션**
- 원본 참조: `pokerogue_codes/src/data/battle-anims.ts` lines 944-983
- `battle-anim-player.js`: USER/TARGET/GRAPHIC 3개 타겟 풀 렌더링 + 프레임별 transform/blend 적용
- `battle-anim-player.js`: battler 복사본 텍스처/프레임 동기화 + 원본 battler 숨김/복원

**BA-12: faint 시각 연출**
- 원본 참조: `pokerogue_codes/src/phases/faint-phase.ts` lines 194-220
- `battle-shell-scene.js`: `faintBattler(side)` 추가 (`duration:500`, `Sine.easeIn`, `y += displayHeight`, `alpha:0`)
- `timeline.js`: `faint`에서 `await scene.faintBattler(ev.side)` 호출

**BA-13: switch_in 시각 연출**
- 원본 참조: `pokerogue_codes/src/phases/summon-phase.ts` lines 125-209
- `constants.js`/`assets.js`: `assets/pokerogue/ui/misc/pb.(png|json)` 포켓볼 atlas preload 추가
- `battle-shell-scene.js`: `switchInBattler(side, fromBall)` 추가 (포켓볼 arc → battler fadeIn)
- `timeline.js`: `switch_in`에서 `await scene.switchInBattler(ev.side, !!ev.fromBall)` 호출

### ✅ UX-DS1 — 배틀 화면 분할(상=P1, 하=P2) 완료 (2026-04-15)

- 단일 `perspective` 전환형 구조를 dual-view로 변경 (pass-device UI 의존도 제거)
- `index.html`: Phaser mount 2개(`battle-phaser-mount-p1`, `battle-phaser-mount-p2`)로 분할
- `styles.css`: split view 레이아웃 + view header 스타일 추가
- `app.js`:
  - `phaserBattleRenderers[0|1]` 도입, 플레이어별 렌더러 독립 구동
  - `buildPkbPokerogueUiModel(battle, forcedPerspective)` 추가
  - `dispatchPkbPokerogueUiAction(action, {playerOverride})`로 입력 플레이어 컨텍스트 고정
  - dual-view 모드에서 `handleBattleChoiceCommitted()`의 perspective 전환/패스 프롬프트 비활성화
- `app.js` + `timeline.js`:
  - `playTimelineAcrossActiveViews()` 도입으로 이벤트 타임라인을 P1/P2 씬에 동시 재생
  - 보조 화면 executor는 `audioEnabled=false`로 실행(중복 SE 방지)
- `battle-shell-scene.js`:
  - `p1/p2` side 매핑을 `currentModel.perspective` 기준으로 변환해 P2 화면에서 faint/switch/move 대상이 뒤바뀌는 문제 수정
- `battle-anim-player.js`:
  - `play(..., {audioEnabled})` 옵션 추가, move animation timed sound를 화면별로 제어

### ✅ UX-DS1 후속 버그픽스 — 완료 (2026-04-15)

- `battle-anim-player.js`: USER/TARGET copy overlay가 원본 battler hidden 상태에서도 렌더되도록 visibility 조건 수정 (기술 연출 시 battler 소실 문제 수정)
- `battle-shell-scene.js`: `concealBattler(side)` 추가
- `app.js`:
  - 초기 switch_in 타임라인 시작 전 `preHideSwitchInSides` 옵션으로 battler 선숨김 적용
  - `buildPkbPokerogueUiModel()`에서 `hp<=0 || fainted` active의 sprite URL 비움(기절 후 재노출 방지)
- `battle-anim-player.js`:
  - USER/TARGET battler-copy 이동 프레임 임시 비활성화 (원본 연출 재검토 전까지 GRAPHIC-only)
- `app.js`:
  - `timelineSpriteOverrides` 도입. `switch_in` 이벤트에서 spriteId/shiny를 선반영해, 교체 후 즉시 기절하는 턴에서도 교체 스프라이트가 타임라인 중 누락되지 않도록 수정
  - `resolveEngineTurn()`에서 `switch_in` 선처리를 위해 최종 스냅샷 전체를 미리 렌더하지 않고, 타임라인 시작 전 씬별 `prepareSwitchInBattler()`만 호출하도록 변경 (강제교체 UI 조기노출 방지)

#### 코드 변경 포인트 (파일 단위)

- `src/battle-presentation/battle-anim-player.js`
  - `ENABLE_BATTLER_COPY_PHASE2 = false` 추가로 USER/TARGET battler 이동 프레임 임시 OFF
  - 현재 기술 연출은 GRAPHIC 레이어 중심으로만 재생
- `src/pokerogue-transplant-runtime/scene/battle-shell-scene.js`
  - `concealBattler(side)`: switch_in 직전 battler 선숨김
  - `prepareSwitchInBattler(side, spriteUrl)`: switch_in 대상 sprite 텍스처 선로딩 후 숨김 상태 준비
- `src/app.js`
  - `timelineSpriteOverrides` 상태 및 헬퍼 추가 (`get/set/clear/prime`)
  - `playTimelineAcrossActiveViews()`에서 `switch_in` 이벤트 사전 스캔 후 씬별 `prepareSwitchInBattler()` 호출
  - `buildPkbPokerogueUiModel()`에 `resolveSpriteUrlForBattleSide()` 추가:
    - active sprite가 없거나 fainted여도 timeline override sprite를 fallback으로 사용
  - 타임라인 종료 시 `clearTimelineSpriteOverrides()`로 임시 상태 정리

### ✅ BA-18/BA-19 — 즉시 반영 버그픽스 완료 (2026-04-15)

**원본 참조**
- `pokerogue_codes/src/phases/summon-phase.ts` lines 125-209 (`summon()` 내 `pokemon.showInfo()` 타이밍)
- `pokerogue_codes/src/field/pokemon.ts` lines 3297-3348 (`showInfo()`/`updateInfo()`)
- `pokerogue_codes/src/phases/quiet-form-change-phase.ts` lines 67-161
- `pokerogue_codes/src/field/pokemon.ts` lines 4586-4633 (`changeForm()` → `loadAssets()`/`updateInfo()`)

**반영 내용**
- `server/showdown-engine.cjs`
  - `parseConditionForEvent()` 확장: `status` 파싱 추가 (`brn/par/psn/tox/slp/frz/fnt`)
  - `switch_in` 이벤트에 `hpAfter`, `maxHp`, `status` 포함
  - `damage/heal` 이벤트에 condition status 포함
  - `forme_change` 이벤트에 `toSpecies` 필드 추가 (`detailschange`/`-formechange` 우선)
  - `forme_change` 이벤트에 `silent` 플래그 추가 (`[silent]` detailschange 감지)
- `src/battle-presentation/timeline.js`
  - executor에 `initialSlotInfo`/`resolveVisualState` 옵션 추가
  - `_slotInfo` 맵으로 side+slot별 이름/HP/상태를 타임라인 중 실시간 유지
  - `switch_in` 즉시 info panel 업데이트 (name/hp/status)
  - `forme_change` 핸들러 구현: sprite/info 즉시 갱신 + `_slotNames` 동기화(ability_show owner명 즉시 반영)
  - `forme_change` 메시지 추가(메가/일반 폼변화 분기) + 중복 이벤트(`-formechange`/`detailschange`) 메시지 중복 방지
  - `-mega` 페어 마커(종 정보 없음) skip 처리 + `silent` 이벤트 메시지 억제
  - `status_apply/status_cure/damage/heal/faint`에서도 `_slotInfo` 동기화
- `src/app.js`
  - `resolveTimelineEventMon()`/`resolveTimelineEventVisualState()` 추가
  - `forme_change`의 sprite 해석을 `toSpecies` 우선으로 변경(최종 스냅샷 역전 방지)
  - executor 생성 시 `resolveVisualState` 콜백 전달
  - `collectTimelineInitialSlotInfo()` 추가 및 `resolveEngineTurn()`에서 전달
  - `buildBattleInfoModelFromMon()` 공통 함수로 분리
- `src/pokerogue-transplant-runtime/scene/battle-shell-scene.js`
  - `setBattlerSprite(side, spriteUrl)` 추가: 폼체인지 시점 즉시 텍스처 교체
- 재현 버그 픽스
  - A/B 동시 메가 + B가 A를 즉시 KO하는 턴에서, A의 메가 메시지만 표시되고 sprite/info가 갱신되지 않던 케이스 수정
  - 원인 체인: `detailschange(메가) -> -mega -> [silent] detailschange(복귀)` 연쇄에서 최종 스냅샷 역전이 선행 이벤트를 덮어씀
  - 대응: `toSpecies` 우선 sprite 해석 + `-mega` 마커 skip + `[silent]` 메시지 억제

### 🐛 미확인 항목

- **battle_end** — 아직 브라우저 확인 못함

---

## 배틀 연출 — 다음 작업 목록 (Sprint 6~)

> UI 폴리시(UI-P1~P5)는 아래 배틀 연출 작업이 모두 완성된 후에 착수한다.

### ✅ Sprint 6. 배틀러 시각 연출 — 완료 (2026-04-15)

### Sprint 7. 배틀 완성도

**다음 세션 착수 순서(고정)**
1. `M5` locale 네임스페이스 로더 ✅ 완료 (2026-04-16)
2. `BA-17` 배틀 연출 타이밍 정확도 개선 ✅ 완료 (2026-04-16)
3. `BA-14` 사이드 컨디션 연출 ✅ 완료 (2026-04-16)
4. `BA-21` 선택 완료 후 대기 메시지 정합
5. `BA-22` 한국어/영어 메시지 완전 분리
6. `BA-23` 기술/날씨/필드 연출 완벽화 (추후)

**✅ M5: locale 네임스페이스 로더 — 완료 (2026-04-16)** (`src/battle-i18n/locale-manager.js`, `src/app.js`, `src/battle-presentation/timeline.js`)
- namespace 로더 도입: `loadLocale(lang)` / `loadNamespace(lang, ns)` / `t(ns,key,vars)` API
- 1차 namespace(`battle`, `ability-trigger`, `move-trigger`, `weather`, `terrain`) 선로딩
- 타임라인 메시지를 locale key 조회로 전환(switch/move/faint/immune/move_fail/weather/terrain), 미매핑/미로딩 시 기존 문자열 fallback 유지

**✅ BA-17: 배틀 연출 타이밍 정확도 개선 — 완료 (2026-04-16)** (`timeline.js`)
  - `_showMsg()`를 callbackDelay 기반 Promise 대기로 전환(길이 기반 hold + safety timeout)
  - 이벤트 처리의 고정 delay 의존도를 제거하고 메시지/애니메이션/tween 완료 await 순서로 재정렬
  - 결과: 타임라인이 연출 완료를 기준으로 안정적으로 다음 이벤트로 진행
  - 후속 템포 튜닝: 이벤트 간 완충 간격 추가 (`short=140ms`, `major=200ms`)

### ✅ BA-14. 사이드 컨디션 연출 — 완료 (2026-04-16)
- 원본 참조: `pokerogue_codes/src/data/arena-tag.ts`, `assets/pokerogue/locales/*/arena-tag.json`
- 반영 파일: `src/battle-presentation/timeline.js`, `src/app.js`
- 반영 내용:
  - `side_start/end` 이벤트 메시지 처리 추가(no-op 제거)
  - Reflect/Light Screen/Aurora Veil/Spikes/Stealth Rock/Toxic Spikes/Sticky Web/Tailwind/Safeguard 등 `arena-tag` 키 매핑
  - side별 `Player/Enemy` 키 우선 조회 + 미매핑 효과는 일반 fallback 메시지 처리
  - 후속 안정화: `server/showdown-engine.cjs`의 `damage/heal` 이벤트에 `fromEffectId`를 포함하고, `timeline.js`에서 Stealth Rock/Spikes 피격 메시지를 출력

**✅ BA-14: 사이드 컨디션 연출 — 완료 (2026-04-16)** (`timeline.js`, `app.js`)
- `side_start/end` 메시지 처리 추가(no-op 제거)
- `arena-tag` namespace 기반 key 매핑 + side(Player/Enemy) suffix 처리
- 미매핑 side effect는 일반 fallback 메시지로 안전 처리
- 후속 안정화: `server/showdown-engine.cjs`에서 `damage/heal.fromEffectId`를 전달하고, Stealth Rock/Spikes 피격 메시지를 damage 타임라인에서 표시

**BA-21: 선택 완료 후 대기 메시지 정합** (`app.js`, `timeline.js`, `battle-message-ui-handler.js`)
- 선택 완료 직후 메시지창 기본값을 `상대의 턴을 기다리는 중...`(EN: `Waiting for opponent's turn...`)로 고정
- 턴 resolve 전 battle.log 상단 문구가 메시지창을 덮어쓰지 않도록 메시지 우선순위 정리

**BA-22: 한국어/영어 메시지 완전 분리** (`locale-manager.js`, `timeline.js`, `showdown-engine.cjs`)
- 한국어 버전에서 영어 병기 완전 제거, 영어 버전은 영어만 표시
- 서버 병기 문자열 의존을 줄이고 locale key 기반 렌더링으로 통합

**BA-23: 기술/날씨/필드 연출 완벽화 (추후)** (`timeline.js`, `battle-shell-scene.js`, `battle-anim-player.js`)
- 기술, 날씨, 필드 연출 품질을 원본 체감 기준으로 단계적으로 보강
- 착수 우선순위는 BA-21/BA-22 이후

**✅ BA-20: 폼체인지 연출 정합 — 완료 (2026-04-16)** (`showdown-engine.cjs`, `form-change-presentation.js`, `timeline.js`, `battle-shell-scene.js`, `app.js`)
- 원본 분기 이식: `FormChangePhase`(진화씬 스타일) vs `QuietFormChangePhase`(전투 중 경량 transform) 컨텍스트별 재현
- BA-19 즉시 반영 경로는 유지하고, form/quiet/modal/visible 분기만 연출 레이어로 추가
- 검증 완료: 동시 메가+즉시 KO, 파티 화면 item-trigger(modal), 비가시(active 아님) 케이스 (`npm run verify:ba20`)
- 후속 안정화: 깜빡임 제거 + switch_in species 우선 sprite 해석 + faint 후 폼변화 메시지 억제

**✅ BA-15: 폼 체인지 연출 — 완료 (2026-04-15)** (`timeline.js`)
- `forme_change`에서 원본 `pokemon-form-battle` 메시지 톤(메가진화/일반 폼변화)을 반영한 메시지 출력 추가
- `-formechange`/`detailschange` 연쇄 시 메시지 중복 방지 가드 추가

**✅ BA-18: 교체 시 정보창 즉시 반영 — 완료 (2026-04-15)** (`app.js`, `timeline.js`, `showdown-engine.cjs`)
- switch_in 이벤트 시점에 이름/HP/상태 정보창을 즉시 갱신하도록 `_slotInfo` 기반 타임라인 동기화 구현

**✅ BA-19: 폼체인지 즉시 반영 — 완료 (2026-04-15)** (`showdown-engine.cjs`, `timeline.js`, `app.js`, `battle-shell-scene.js`)
- forme_change 시점에 sprite/info/name 캐시를 즉시 갱신하도록 executor + scene 교체 경로 추가

---

## UI 폴리시 — 배틀 완성 후 착수

### UI-P1. 텍스트 왜곡 재분석 — `text.js` + `phaser-utils.js` + `controller.js`
- **현상**: Phase 14에서 `fontSize: 56/6`, `HINT: 8` 수정 적용 후에도 여전히 텍스트가 뭉개져 보임
- **할 일**: 8px 그리드 수정이 실제로 적용되었는지 재확인.
- **영향 파일**: `text.js`, `phaser-utils.js` (createBaseText), `controller.js`

### UI-P2. Fight UI 레이아웃 부자연스러움 — `fight-ui-handler.js`
- **현상**: 타입배지, PP, 기타 스탯의 레이아웃이 비정상적/부자연스럽게 보임
- **할 일**: PokeRogue 원본 fight-ui-handler.ts 오른쪽 패널 좌표 정밀 재확인.
- **영향 파일**: `fight-ui-handler.js`

### UI-P3. Switch/Tera 버튼 처리 — `fight-ui-handler.js`
- PokeRogue 원본 방식으로 재확인 후 이식본 정렬.

### UI-P4. 파티 아이콘 위치 조정 — `party-ui-handler.js`
- active=(4,4), bench=(2,-4) 재검토. 스크린샷 `screenshots/20260410screenshot party.png` 참조.

### UI-P5. PBS 수동 보정 1라운드 — `assets/Pokemon/PBS/`
- `reports/metrics-drift.json` 상위 4개 (score=8): LINOONE, METAGROSS_1, MIMIKYU_1, SALAMENCE_1

### 보류 항목 (UI)
- `fight-ui-handler.js`: MoveInfoOverlay 이식 (원본 ts:108-121) — Pow/Acc 표시
- `command-ui-handler.js`: Tera 색상 파이프라인
- `battle-info.js`: nameTextY(-11.2, -15.2) 비정수 블러 — 원본과 동일값이라 일단 유지

---

## 이전 완료 이력 (주요 항목)

- **2026-04-13**: Sprint 4 (BA-4) + 버그픽스 (커맨드 이름 고정, weather 어빌리티 바) — 상세 내용은 아래 참조
- **2026-04-13**: Sprint 3 (BA-1/2/3) 구현 + 버그픽스 — 상세 내용은 아래 참조
- **2026-04-12**: Sprint 2a/2b 배틀 연출 이벤트 시스템 구현 — 상세 내용은 아래 참조
- **2026-04-11**: Shadow 좌표식 DBK 정합 + audit 스크립트 (Phase 18) — 상세 내용은 아래 참조
- **2026-04-11**: 배틀러 스프라이트 구현 (Phase 16) + PBS metrics 적용 (Phase 17) — 상세 내용은 아래 참조
- **2026-04-10**: Navy bar 회귀 수정, 파티 아이콘 frame0 등록, levelText HINT→BATTLE_INFO_SMALL, 좌표 정수화(movesContainer -38.7→-39, 메인슬롯 -148.5→-149), footer y=-13→y=0 origin(0,1), toggle y=-62→-46
- **2026-04-09**: wordWrapWidth 전면 수정, 폰트 크기 원본 맞춤, shadow 추가, lineSpacing 기본값, nameText truncation
- **2026-04-08**: TEXT_RENDER_SCALE=6 도입, EXP bar mask, 배틀 전체화면, INTEGER_SCALE 모드
- **2026-04-07**: LOGICAL_HEIGHT 수정, 레이아웃 전면 수정, 커서 origin 수정, 어빌리티 바 위치

## 2026-04-13 완료한 작업 — Sprint 4 (BA-4) + 버그픽스

### Bug #1 커맨드 이름 고정 (ui.js)
- **원인**: `ui.js`의 `getArgsForMode()`가 `modeArgs` Map을 캐시로 사용하는데, COMMAND 모드가 유지되는 동안 첫 번째 args를 계속 반환. 포켓몬 교체 후에도 old pokemon 이름이 표시됨.
- **수정**: `renderModel()`에서 `this.getArgsForMode(nextMode)` → `this.adapter.getUiArgsForMode(nextMode)` (항상 adapter에서 fresh args 가져오기). 이후 `this.storeModeArgs(nextMode, nextArgs)`로 캐시 갱신.

### Bug #3 어빌리티 바 날씨 특성 미표시 (showdown-engine.cjs)
- **원인**: Drought, Drizzle, Sand Stream, Desolate Land, Primordial Sea 등 날씨를 유발하는 특성은 Showdown이 `-weather|...|[from] ability: X|[of] Y` 형식으로 보내고, 별도 `-ability` 라인을 보내지 않음. 따라서 `ability_show` 이벤트가 생성되지 않아 어빌리티 바가 표시 안됨. 지형 특성(Electric Surge 등)도 동일.
- **수정**: `-weather` / `-fieldstart` 라인에서 `[from] ability: X` 태그 감지 시 `ability_show` 이벤트를 weather/terrain 이벤트 앞에 선행 push.

### BA-4 (timeline.js)
- `STATUS_LABELS` Map 추가 (brn/par/psn/tox/slp/frz → 한글)
- `STAT_LABELS` Map 추가 (atk/def/spa/spd/spe/acc/eva → 한글)
- `status_apply`: "{name}은(는) {상태이상}" 메시지 + 700ms
- `boost`: "{name}의 {스탯}이 올랐다/크게 올랐다!" + 600ms (amount ≥ 2이면 "크게")
- `unboost`: "{name}의 {스탯}이 내려갔다/크게 내려갔다!" + 600ms
- `miss`: "{name}의 공격이 빗나갔다!" + 500ms (ev.target = attacker in Showdown protocol)
- `cant_move`: "{name}은(는) 움직일 수 없다." + 600ms

### 영향 파일
- `src/pokerogue-transplant-runtime/ui/ui.js`
- `server/showdown-engine.cjs`
- `src/battle-presentation/timeline.js`

---

## 2026-04-13 완료한 작업 — Sprint 3 (BA-1/2/3) + 버그픽스

### Sprint 3 구현
- **BA-1 배틀 메시지**: `timeline.js`에 `_showMsg()`, `_slotName()`, `_slotNames` Map 추가. switch_in / move_use / damage(critical/super/not_very) / faint / ability_show / weather / terrain 이벤트에 한글 메시지 연결. `turn_start` 메시지 제거.
- **BA-2 울음소리**: `BattleAudioManager.playCryByNum(dexNum)` 추가 (`cry/<num>.m4a` lazy load). `speciesToDexNum()` 헬퍼로 species 이름 → dex번호 변환. `switch_in`에서 `await playCryByNum()`. `startBattle()`에서 `await syncPhaserBattleRenderer()` 후 initExecutor.play() — 배틀 시작 시 첫 울음소리 보장.
- **BA-3 어빌리티 바/날씨/지형**: `ability_show` → abilityBar 1200ms 표시 후 hide. weather/terrain 한글 라벨 Map + 딜레이.

### 버그픽스
- **커맨드 화면 메시지** (`app.js` + `command-ui-handler.js`): "player1 · 귀뚤톡크" 대신 "귀뚤톡크, 무엇을 할까?" 표시. `buildPhaserCommandWindowModel`에 `prompt` 필드 추가, handler에서 `state.prompt || state.title` 사용.
- **FIGHT 텍스트 오버랩** (`fight-ui-handler.js`): `show()` 진입 시 `battleMessage.message.setText('')` 호출 → "기술을 선택하세요" 텍스트가 기술 버튼들 위에 겹치는 현상 제거.
- **어빌리티 바 z-order** (`ui.js`): `abilityBar.container.setDepth(42 → 60)` — FIGHT 컨테이너(55) 뒤로 가려지던 문제 수정.
- **메시지 필드명 불일치** (`pkb-battle-ui-adapter.js`): `normalizeMessageText()`에서 `message.primary`와 `message.primaryText` 둘 다 읽도록 수정. `buildBattleMessageModel`이 `{ primary, secondary }` 반환하는데 adapter가 `primaryText`만 읽던 버그. //지금 상대 화면에서도 player1의 포켓몬만 나오는 버그 있음.

### 영향 파일
- `src/battle-presentation/timeline.js`
- `src/pokerogue-transplant-runtime/runtime/audio-manager.js`
- `src/app.js`
- `src/pokerogue-transplant-runtime/adapter/pkb-battle-ui-adapter.js`
- `src/pokerogue-transplant-runtime/ui/handlers/command-ui-handler.js`
- `src/pokerogue-transplant-runtime/ui/handlers/fight-ui-handler.js`
- `src/pokerogue-transplant-runtime/ui/ui.js`

---

## 2026-04-12 완료한 작업 — 배틀 연출 이벤트 시스템 (Sprint 1~2b)

### 아키텍처
- **이벤트 스트림**: `server/showdown-engine.cjs`에 `normalizeEventsFromLine()` 추가. 매 턴 Showdown 프로토콜 라인을 구조화 이벤트로 변환해 `snapshot.events` 배열에 포함.
- **타임라인 executor**: `src/battle-presentation/timeline.js` — 이벤트 배열을 순차 재생. `FLAGS.battlePresentationV2: true`일 때 활성.
- **이벤트 스키마**: `src/battle-presentation/event-schema.js` — `EVENT_TYPES` const + `isCoreEvent()` guard.

### Sprint 2a — 오디오 기반
- `BattleAudioManager` (`runtime/audio-manager.js`) 신규: `preloadBasic()`, `play()`, `playHitByResult()`, `playCry()`, `playMoveSe()`
- `playSelect()` / `playError()` UI 핸들러 마우스 클릭에 연결 (모든 `setInteractiveTarget` 콜백 8곳)
- disabled 버튼 클릭 시 `playError()` 재생 (`command-ui-handler`, `fight-ui-handler`)

### Sprint 2b — 핵심 연출
- `BattleAudioManager.playMoveSe(moveName)`: `anim-data/<slug>.json` lazy fetch → `AnimTimedSoundEvent.resourceName` 추출 → `battle_anims/<file>` 런타임 로드 및 재생. `_moveAnimCache`로 중복 fetch 방지.
- `BattleInfo.tweenHpTo(hpPercent)`: HP 바 트윈을 Promise로 공개 API화. executor에서 직접 await 가능.
- `BattleTimelineExecutor` 핸들러 구현:
  - `switch_in` → `se/pb_rel` + 300ms
  - `move_use` → `playMoveSe()` + 200ms
  - `damage` → `playHitByResult()` + 100ms + `tweenHpTo()` await
  - `heal` → `tweenHpTo()` await
  - `faint` → `se/faint` + 600ms
- `app.js`: executor 생성 시 `scene: () => phaserBattleRenderer?.scene` 전달, `playerSide: 'p1'`

### 미구현 (Sprint 3 대상)
- 배틀 메시지 순차 표시 (이벤트 중 메시지창 업데이트)
- 울음소리 연결 (species → dex번호 매핑 필요)
- 어빌리티 바 / 날씨 / 지형 연출

---

## 2026-04-11 완료한 작업 (Phase 18) — Shadow 좌표식 DBK 정합 + Metrics Audit

### Task A: Enemy Shadow 좌표식 보정 (`battle-shell-scene.js`)
- **문제**: shadow가 `shadowX/Y`만 반영되고 `frontX/frontY` sprite offset이 빠짐
- **수정**: `shadowX = baseX + offsetX + shX`, `shadowY = baseY + offsetY + shY`
  - DBK `apply_metrics_to_sprite`와 동일하게 sprite offset + shadow offset 합산

### Task B: Baseline 보정 (`battle-shell-scene.js`)
- **문제**: DBK의 `-height/4` shadow 기준점 이동이 ellipse에 없었음
- **수정**: `baseline = frameH * sprScale * 0.12`, `shadowY -= baseline`
- Shadow 크기도 DBK 공식으로 교체: `zoomX = scale + eff*0.1`, `zoomY = scale*0.25 + eff*0.025`

### Task D: verify-metrics-parity 정책 재정립 (`scripts/verify-metrics-parity.mjs`)
- 1/1 scale 정책 검증 추가: `DBK_DEFAULTS.frontScale === 1 && backScale === 1`
- shadow 합산식 존재 검증 추가: `baseX + offsetX + shX`, `baseY + offsetY + shY`
- 결과: 14/14 PASS (기존 12/12 → 14/14)

### Task E: Metrics Drift Audit 스크립트 (`scripts/audit-metrics-drift.mjs`)
- 신규 생성. `npm run audit:metrics-drift`로 실행
- 출력: `reports/metrics-drift.json` — 고위험 91개, 중위험 668개, 저위험 654개 플래그
- 평가 기준: fallback coverage, |frontY| outlier, shadow anchor risk, |frontX| outlier
- 상위 4개 (score=8): LINOONE, METAGROSS_1, MIMIKYU_1, SALAMENCE_1

### Task C: Sprite Y 부호 A/B 검증 — **다음 세션으로 이월**
- 현행 `baseY - offsetY` 유지. 시각 비교 후 확정 예정.

### Task F: PBS 수동 보정 — **다음 세션으로 이월**
- 런타임 공식 변경 직후라 시각 확인 선행 필요. `reports/metrics-drift.json` 참조.

---

## 2026-04-11 완료한 작업 (Phase 16) — 배틀러 스프라이트

### 배경
`app.js`의 `buildBattleModel()`에서 `enemySprite`/`playerSprite` 모델 항목에 `deferred: true`가 하드코딩되어 있어 스프라이트가 의도적으로 비활성화된 상태였음.

### 구현 내용

1. **스프라이트 활성화** (`app.js`): `enemySprite`/`playerSprite` 모델에서 `deferred: true` 제거

2. **DOM → Phaser 캔버스 전환** (`battle-shell-scene.js`):
   - 기존: `scene.add.dom()` (Phaser DOM plugin) + HTML div + Canvas 2D 렌더링
   - **문제**: `INTEGER_SCALE` 모드에서 CSS px 좌표와 Phaser 논리 좌표가 불일치 → 스프라이트가 엉뚱한 위치/크기로 표시됨
   - **해결**: `scene.add.image()` (Phaser canvas 객체)로 교체 → 스케일/좌표 완전 정합
   - `sprite-host.js` 의존성 제거 (`ensureSpriteHostStyles`, `renderAnimatedSpriteToHost`, `setHostVisibility`)

3. **동적 텍스처 로딩** (`battle-shell-scene.js` — `renderBattlerSprite()`):
   - JS `Image` → `textures.addImage()` → 수동 프레임 등록 (`tex.add(i, 0, i*frameH, 0, frameH, frameH)`)
   - 프레임 감지: `frameH = img.height`, `frameCount = floor(img.width / frameH)` (정사각형 프레임 가정)
   - 120ms 타이머로 `setFrame()` 애니메이션
   - 텍스처 교체 시 null glTexture 에러 방지: 구 텍스처 remove 전에 `setTexture('pkb-battler-placeholder')` 로 전환
   - 비동기 로드 중 URL 변경 감지 후 중단 처리 (`mount.currentUrl !== url`)

4. **그림자** (`battle-shell-scene.js`):
   - `this.add.ellipse()` 로 타원형 그림자 생성 (depth: sprite - 1)
   - 스프라이트 발 위치(bottom-center)에 배치, 크기 = displaySize × (0.5, 0.12)

5. **party-ui-handler 호환** (`battle-shell-scene.js`):
   - `mount.dom.setVisible()` shim 유지: `img.setVisible()` + `shadow.setVisible()` 동시 제어
   - `currentUrl` 체크로 로드 전 상태에서 그림자 표시 방지

6. **ui.js 수정**:
   - `layout()`: `anchor.setPosition()` + `dom.setPosition()` + `applyHostBox()` → `phaserSprite.setPosition()`
   - `renderModel()`: `dom.setVisible()` + `renderAnimatedSpriteToHost()` → `env.renderBattlerToPhaser()`

7. **Enemy 스프라이트 위치 조정**: x=236 → x=216 (시각적으로 더 자연스러운 위치)

### 스프라이트 에셋 경로
- Enemy (앞모습): `./assets/Pokemon/Front/{spriteId}.png` (색다른: `Front shiny/`)
- Player (뒷모습): `./assets/Pokemon/Back/{spriteId}.png` (색다른: `Back shiny/`)
- 스프라이트는 자연 크기(1:1 scale)로 표시. 크기 조정 필요 시 `renderBattlerSprite()` 내 `setScale()` 수정.

---

## 2026-04-11 완료한 작업 (Phase 17) — PBS Metrics 적용

### 개요
`assets/Pokemon/PBS/` 폴더의 PBS 포맷 메트릭 파일들을 파싱해 배틀러 스프라이트의 위치·그림자·애니메이션 속도를 포켓몬별로 정확하게 적용.

### PBS 파일 구성
- `pokemon_metrics.txt` — Gen 1~8 기본 폼
- `pokemon_metrics_forms.txt` — 변형 폼 (Mega, 히스이, 팔데아 등)
- `pokemon_metrics_female.txt` — 암컷 변형
- `pokemon_metrics_Gen_9_Pack.txt` — Gen 9 추가
- `pokemon_metrics_gmax.txt` — 거다이맥스 폼

### PBS 필드 및 좌표 해석
| 필드 | 값 | Phaser 적용 |
|------|----|-------------|
| `FrontSprite = x, y` | 적 시점 오프셋 | `spriteX = baseX + x`, `spriteY = baseY - y` (양수 y = 위로) |
| `BackSprite = x, y` | 플레이어 시점 오프셋 | 동일 |
| `ShadowSprite = x, backY, frontY` | 그림자 오프셋 (그라운드라인 기준) | `shadowY = baseY + frontY` |
| `ShadowSize = n` | `≤0` = 그림자 없음, 기본 = 보통, `2` = 큼 | |
| `AnimationSpeed = back[, front]` | `0`=정지, `1`=느림(240ms), `2`=보통(120ms) | `delay = 120 * (2/speed)` ms |

### 구현 내용
1. **`pokemon-metrics.js` 신규 생성** (`runtime/`):
   - PBS 파싱: `[SPECIES]` → `"SPECIES"`, `[SPECIES,N]` → `"SPECIES_N"`, `[SPECIES,,female]` → `"SPECIES_female"`
   - `loadPokemonMetrics()`: 5개 파일 병렬 fetch → 통합 Map 반환 (나중 파일이 앞 파일 override)
   - `getMetricsForSprite(spriteId, map)`: exact match → 폼/성별 fallback → 기본종 fallback

2. **`battle-shell-scene.js` 수정**:
   - `create()` 에서 `loadPokemonMetrics()` 백그라운드 실행 (`this.pokemonMetrics`)
   - `renderBattlerSprite()` 에서 URL 파일명으로 spriteId 추출 → metrics 조회 → 위치·스케일·그림자·애니메이션 속도 적용

3. **`ui.js` 수정**:
   - `layout()` 에서 `mount.baseX/baseY` 저장 (metrics 오프셋 계산의 기준값)

### 주의 사항
- Metrics 로드가 완료되기 전 첫 배틀 진입 시 오프셋 없이 기본 위치로 표시됨 (PBS 로딩은 비동기)
- 같은 URL 재표시 시 early return → metrics 재적용 없음. Pokemon 교체 시에만 재계산됨

---

### 2. 남색 바 — **해결됨** (2026-04-08/10)
- BattleTray.setup() 마지막에 `this.container.setVisible(false)`
- party-ui-handler.clear()에서 tray setVisible(true) 코드 제거 (회귀 방지)

### 3. 적 타입 아이콘 위치(1픽셀) — **조사 완료, 이상 없음**
- 오프셋 값 원본과 동일, atlas trim 정상, 수정 불필요

### 4. 하단 대화창 레이아웃 — **수정 완료** (2026-04-09)
- wordWrapWidth 297, command-ui 152/185, fontSize 16px, nameBox displayWidth 수정

### 5. 턴 인디케이터 — 보류 (원본 미확인)

## 코드 작업 시 핵심 원칙

> **모든 UI 코드 수정의 기준은 PokeRogue 원본 소스다.**
> `/workspaces/pokemon-battle/pokerogue_codes/src/ui/` 를 항상 먼저 읽고,
> 원본 로직·좌표·프레임명을 정확히 확인한 뒤에 이식본을 수정할 것.
> 추측이나 중간값으로 조정하지 말고, 원본과 동일하게 맞춘다.

- 이식본의 `env` 객체: `clamp`, `textureExists`, `setHorizontalCrop`, `setTextWordWrap`, `UI_ASSETS` 포함
- 빌더/bundler 없음 — JS 파일은 ESM으로 직접 서빙
- 에셋 추가 시: `constants.js` → `assets.js` 순으로 등록
- multiatlas (textures[] 배열 형식): `load.multiatlas(key, json, path)` 사용
- 일반 atlas: `load.atlas(key, image, json)` 사용
- **텍스트 렌더링**: `createBaseText`에서 `TEXT_RENDER_SCALE=6` 방식 사용 — fontSize×6으로 렌더링 후 `setScale(1/6)` (PokeRogue 원본 동일), `resolution: 1` 고정
- **폰트 패밀리 실체** (`styles.css` 확인): `"emerald"` → `pokemon-bw.ttf`, `"pkmnems"` → `pokemon-emerald-pro.ttf`. **"emerald" = pokemon-bw 폰트**이므로 폰트 교체로 블러 해결 시도 불필요. 블러 원인은 폰트가 아니라 8px 그리드 미정렬.
- **폰트 픽셀 그리드 규칙**: `fontSize × TEXT_RENDER_SCALE`(렌더 크기)이 반드시 **8의 배수**여야 글리프가 정확히 찍힘. PokeRogue 표준: 48(8px), 56(≈9.33px), 72(12px), 96(16px). **9px×6=54는 8배수 아님 → 왜곡 발생**. 비표준 logical 크기 사용 시 `renderPx/6` 형태로 저장할 것.
- **폰트 크기 (logical px)**: WINDOW/MESSAGE=16, WINDOW_BATTLE_COMMAND=16, BATTLE_INFO=12, BATTLE_INFO_SMALL=8, BATTLE_LABEL/BATTLE_VALUE=56/6(≈9.33), HINT=8 — `text.js` TEXT_STYLE 참조
- **shadow**: `addTextObject` 호출 시 style별 shadow 자동 적용됨 — 직접 `setShadow()` 호출 불필요
- **lineSpacing**: `createBaseText` 기본값 5 (원본 `scale*30=5`). 다른 값 필요 시 options으로 전달
- **wordWrap 지정**: 로지컬 픽셀 값으로 `env.setTextWordWrap(obj, width)` 호출 — 직접 `setWordWrapWidth()` 호출 금지 (6× 스케일 보정 필요)
- **wordWrapWidth 기준값**: 메시지창 기본=297px, Tera불가=185px, Tera가능=152px (원본 1780/1110/910 ÷ 6)
- **nameBox 폭 계산**: `nameText.displayWidth + 16` 사용 (`.width` 금지 — unscaled canvas px)
- **커서 이미지**: `setOrigin` 호출하지 말 것 — Phaser 기본값 (0.5, 0.5) 사용이 PokeRogue와 동일
- **어빌리티 바**: enemy=오른쪽(x=202), player=왼쪽(x=0), 두 이미지 모두 origin(0,0)

## 2026-04-10 완료한 작업 (Phase 13)
1. **Navy bar 회귀 수정** (`party-ui-handler.js`): `clear()` 에서 `enemyTray/playerTray.container.setVisible(true)` 제거. `show()`에서도 tray 숨김 제거. — 원인: `setup()→clear()` 호출 순서로 tray가 초기화 직후 켜짐
2. **파티 아이콘 2프레임 수정** (`party-ui-handler.js`): `loadIconTexture()`에서 `texture.add('frame0', ...)` 등록 — 128×64를 18×18 압축하던 버그 해소
3. **levelText 가시성** (`party-ui-handler.js`): `'HINT'`(6px) → `'BATTLE_INFO_SMALL'`(8px), active/bench 모두 적용
4. **좌표 정수화** (`fight-ui-handler.js`, `party-ui-handler.js`): `movesContainer y=-38.7 → -39`, 메인 파티슬롯 `y=-148.5 → -149` (서브픽셀 블러 제거)
5. **footer 버튼 위치** (`fight-ui-handler.js`): `y=-13 origin(0,0)` → `y=0 origin(0,1)` (이동 버튼 히트박스 충돌 감소)
6. **toggle 버튼 위치** (`fight-ui-handler.js`): `y=-62 → -46` (fight 창 내부로 이동)
7. **research.md 재작성**: 폰트 픽셀 그리드 분석, 아이콘 애니메이션 방안, PokeRogue 원본 비교 포함
8. **plan.md 재작성**: Phase 14 Fix 1~3 상세 계획
9. **CLAUDE.md 업데이트**: 완성도 테이블, 우선순위, 핵심 원칙 폰트 규칙 추가
10. **폰트 패밀리 매핑 확인** (`styles.css`): `"emerald"` = `pokemon-bw.ttf` (이미 BW 폰트). 블러 해결은 폰트 교체가 아닌 8px 그리드 수정(Fix 1)으로 진행

## 2026-04-10 완료한 작업 (Phase 14)
1. **텍스트 왜곡 수정** (`text.js`): `BATTLE_LABEL/VALUE: fontSize 9→56/6` (54px→56px, 7×8), `HINT: fontSize 6→8` (36px→48px, 6×8) — 모두 8의 배수 렌더 크기로 정렬
2. **폰트 프리로드 추가** (`controller.js`): 56px "emerald"/"pkmnems" 추가 (BATTLE_LABEL/VALUE용)
3. **파티 아이콘 frame1 등록** (`party-ui-handler.js`): `loadIconTexture()`에서 frame1(우측 64×64) 추가 등록
4. **파티 아이콘 sprite + 애니메이션** (`party-ui-handler.js`): `_applyIcon()` — `scene.add.image()` → `scene.add.sprite()`, `setDisplaySize(18,18)` → `setDisplaySize(32,32)`, 500ms 타이머 frame0↔frame1 교대
5. **파티 아이콘 위치 조정** (`party-ui-handler.js`): bench 아이콘 y=3 → y=-4 (32×32 수직 중앙, 슬롯 24px 기준 (24-32)/2=-4)
6. **아이콘 타이머 정리** (`party-ui-handler.js`): `clear()`에서 모든 슬롯 iconAnimTimer.remove()
7. **Pow/Acc 제거** (`fight-ui-handler.js`): moveInfoContainer에서 powerLabel/powerText/accuracyLabel/accuracyText 제거 (PokeRogue 기본 UI에 없음, MoveInfoOverlay 전용)
8. **TYPE 라벨 추가** (`fight-ui-handler.js`): `addTextObject(245, -36, 'TYPE', 'BATTLE_LABEL')` — 오른쪽 패널 1행
9. **Back 버튼 이동** (`fight-ui-handler.js`): x=1,w=40 → x=241,w=79 (오른쪽 패널 하단 전체), 히트 영역 충돌 해소

## 2026-04-07 완료한 작업
1. **LOGICAL_HEIGHT 240→180 수정** (`constants.js`): PokeRogue 좌표계(1920/6=320, 1080/6=180)에 맞춤
2. **레이아웃 전면 수정** (`ui.js` layout()): tray/info/sprite 모든 좌표 PokeRogue 원본에서 역산
3. **ARENA_OFFSETS 수정** (`constants.js`): enemy/player 모두 `{x:0, y:0}` (ArenaBase 기본 위치)
4. **폰트 선명도 수정** (`phaser-utils.js`): `resolution: 3 → 1` — pixelArt 모드와 조합해 선명한 픽셀 텍스트
5. **커서 origin 수정** (`command-ui-handler.js`, `fight-ui-handler.js`): `.setOrigin(0,0)` 제거 → 기본값 (0.5, 0.5)
6. **어빌리티 바 위치/방향 수정** (`battle-info.js`): player x=0, enemy x=202, 이미지 origin(0,0), y=64

## 2026-04-09 완료한 작업
1. **HP frame 임계값 수정** (`battle-info.js`): `pct > 20` → `pct > 25` (원본 `scaleX > 0.25`)
2. **wordWrapWidth 전면 수정** (`battle-message-ui-handler.js`, `command-ui-handler.js`): 215→297, 91/111→152/185 (원본 1780/910/1110 ÷ 6)
3. **Game resolution 통일** (`controller.js`): DPR기반(1 or 2) → `resolution: 1` 고정 (Retina blur 방지)
4. **폰트 크기 원본 맞춤** (`text.js`): WINDOW 8→16px, BATTLE_INFO 8→12px (원본 96/72px ÷ 6)
5. **Shadow 추가** (`text.js`): `addTextObject`에서 style별 shadow 자동 적용
6. **lineSpacing 기본값** (`phaser-utils.js`): createBaseText에 기본 lineSpacing=5 추가 (원본 `scale*30`)
7. **message/nameText fontSize 수정** (`battle-message-ui-handler.js`): fontSize 8→16, lineSpacing:1 제거, shadow 추가
8. **nameText truncation** (`battle-info.js`): 이름이 60px(비보스)/98px(보스) 초과 시 "..." 처리 (원본 updateNameText() 이식)
9. **nameBox width 버그 수정** (`battle-message-ui-handler.js`): `.width` → `.displayWidth` (unscaled canvas px 오사용 수정)
10. **타입 아이콘 위치 조사** (atlas json): 원본과 동일한 trim 동작 확인 — 수정 불필요

## 2026-04-09 (소스 분석 후 추가 수정)
1. **fight-ui-handler.js 아이콘 초기 visibility 수정**: typeIcon/moveCategoryIcon 모두 setup() 시 `setVisible(false)` 추가 (원본 ts:63,67 일치)
2. **fight-ui-handler.js 아이콘 scale 수정**: typeIcon `0.55→0.8` (원본 ts:269), moveCategoryIcon `0.55→1.0` (원본 ts:272). updateMoveDetail()에서도 setScale 호출 추가
3. **enemy info bg y 보정** (`enemy-battle-info.js`): `bg.setY(-1)` — 적 정보창 bg 1px 위로 이동 (렌더링 아티팩트 보정)

## 2026-04-09 (Gemini 보고 버그 픽스 1차 시도 — 부분 실패)
1. **fight-ui-handler.js 토글 버튼 오버플로우 수정**: width=30→24px, spacing=33→26px, 3개/행, x=241 시작. 5개까지 2행으로 수용 (x=241–317 내)
2. **fight-ui-handler.js 풋터 버튼 오버플로우 수정**: `x=248+index*42` → `x=[1,44]` (왼쪽 패널 하단 배치, Switch 버튼 화면 밖 오버플로우 해결)
3. **party-ui-handler.js show()**: DOM 스프라이트(enemySprite.dom, playerSprite.dom) + 배틀 정보창(enemyInfo/playerInfo/enemyTray/playerTray) 모두 숨김 — 파티 배경이 배틀 필드를 완전히 덮도록
4. **party-ui-handler.js clear()**: 위 모든 요소 setVisible(true) 복원

> 스크린샷 재확인 결과, 위 1차 수정은 **최종 해결로 판단하면 안 됨**.
> Fight UI는 여전히 오른쪽 패널이 과밀했고, Party UI는 `ui.js renderModel()`이 DOM 스프라이트 visibility를 다시 켜서 실제로는 숨김이 유지되지 않았다.
> 현재 기준의 정답 상태는 아래 "현재 이식 완성도"와 "다음 실제 우선순위 (Phase 7 기준)" 섹션을 따른다.

## fight-ui-handler 1차 시도 레이아웃 정책 (채택 보류)
- 오른쪽 패널(moveDetailsWindow): x=240–320, y=-48 to 0 (80×48px)
- 토글 버튼: x=241 시작, 24px 폭, 26px 간격, 최대 3개/행 → row0(y=-48), row1(y=-62 위)
- 풋터 버튼: 왼쪽 패널 하단 (x=1 Back, x=44 Switch), y=-13
- DOM 스프라이트는 canvas 위에 항상 렌더되므로 파티 화면 진입 시 반드시 수동으로 숨겨야 함

## 2026-04-08 완료한 작업
1. **타입 아이콘 y 오프셋 복원** (`battle-info.js`): 원본 값 `(-15, -15.5)` / `(-15, -2.5)` / `(0, -15.5)` 적용
2. **Phaser Scale 모드 변경** (`controller.js`): `Scale.FIT → Scale.INTEGER_SCALE` (정수배 강제)
3. **aspect-ratio 수정** (`styles.css`): 4/3 → 16/9 (320×180 게임 비율에 맞춤)
4. **폰트 렌더링 방식 근본 수정** (`phaser-utils.js`): `TEXT_RENDER_SCALE=6` 도입 — `fontSize×6`으로 텍스트 생성 후 `setScale(1/6)`, PokeRogue 원본 방식과 동일
5. **wordWrap 6× 스케일 대응** (`phaser-utils.js`, `battle-message-ui-handler.js`, `command-ui-handler.js`): `setTextWordWrap(obj, logicalWidth)` 유틸 추가 및 기존 직접 호출 교체
6. **폰트 사전 로딩 크기 수정** (`controller.js`): 8px → 48px (`TEXT_RENDER_SCALE×8`) 로 브라우저 캐시 정합성 개선
7. **EXP 바 geometry mask 이식** (`player-battle-info.js`): `expMaskRect` geometry mask 방식으로 전환 — PokeRogue 원본과 동일한 `scene.make.graphics()` + `createGeometryMask()` 패턴, `_applyExpMask(width)` 메서드 추가
8. **배틀 전체화면 오버레이 구현 ✅** (`app.js`, `index.html`, `styles.css`): `enterBattleFullscreen()` / `exitBattleFullscreen()` 함수, `battle-fullscreen` CSS 클래스(`position:fixed; inset:0`), `← 빌더로` 버튼 및 ESC 키 지원 — **정상 동작 확인**
