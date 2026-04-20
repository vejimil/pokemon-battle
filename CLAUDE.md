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

## 다음 세션 우선순위 (Sprint 7 갱신 — 2026-04-19 기준)

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
4. `BA-21` 선택 완료 후 대기 메시지 정합 ✅ 완료 (2026-04-16)
5. `BA-22` 한국어/영어 메시지 완전 분리 ✅ 완료 (2026-04-16)
6. `BA-27` 타임라인 재생 중 선택 입력 블록 ✅ 완료 (2026-04-17)
7. `BA-26` 배틀 내 폼체인지 표시명 고정 ✅ 완료 (2026-04-17)
8. `BA-24` 테라스탈 구현 ✅ 1차 완료 (2026-04-17)
9. `BA-25` 다이맥스 구현 ✅ 완료 (2026-04-19)
10. `BA-23` 기술/날씨/필드 연출 완벽화 ✅ 완료 (2026-04-19)
11. `BA-28` 영칭 전용 포켓몬/기술 한국어명 탑재 ✅ 1차 완료 (2026-04-20)

### ✅ 2026-04-17 오늘 작업 요약
- `BA-27`/`BA-26` 구현 및 후속 회귀 안정화 완료.
- 타임라인 순서 회귀 수정:
  - 중간 턴 `switch_in`의 조기 선준비(`prepareSwitchInBattler`)를 제한해, 기술/데미지/기절 전에 sprite가 바뀌는 문제 해결.
  - `switch_in` 이벤트 경계에서 sprite를 교체하도록 정렬해, KO/교체 연출 순서 복원.
- 입력 잠금 UX 보강:
  - `forceBattleMessageOnlyUiDuringLock()` 추가로 잠금 직후 선택창을 즉시 숨기고 message-only 화면 유지.
- 폼체인지 표시 정책 확정:
  - UI/정보창/선택창은 base species 고정.
  - 폼체인지 연출 메시지는 form-aware 표기 복원.
- 문서 구조 정리:
  - `plan.md`는 활성 작업만 남기고 슬림화.
  - 완료 이력은 `planprevious.md`로 분리.
- 활성 플랜 유지:
  - `plan.md`에 `BA-24` 상세 + `BA-25/BA-23/BA-28` 후속 개요를 유지.
- `BA-24` 1차 구현:
  - `showdown-engine.cjs`에서 `-terastallize`를 독립 `terastallize` 이벤트로 분리 추출
  - `timeline.js`에 `terastallize` 핸들러 추가(메시지 → 테라 연출 → info patch 순서)
  - `battle-shell-scene.js`에 `playTerastallize()` 추가
  - `app.js` locale namespace에 `pokemon-info` 추가(테라 타입 로컬라이즈)
- 현재 남은 우선순위(고정): `BA-28` sprite 미할당 폼 후속 정리

### ✅ 2026-04-20 오늘 작업 요약 (BA-28)
- 한/영 명칭 분리 보강:
  - `src/i18n-ko-locales.js` 신규 생성 (`assets/pokerogue/locales/{en,ko}` 기반 `species/moves/abilities` 추출)
  - `src/app.js`에 canonical name 해석(`move/ability/species/item`) + locale 맵 병합 + 누락 최소 patch(3 moves, 9 abilities)
  - `return102`/`frustration102` 같은 엔진 move id를 기본 move명(`Return`/`Frustration`)으로 정규화
  - 타임라인 executor에 `localizeAbilityName` 경로 추가(`src/battle-presentation/timeline.js`, `src/app.js`)
- 검증:
  - `node --check src/app.js`
  - `node --check src/battle-presentation/timeline.js`
  - `node --check src/i18n-ko-locales.js`
  - `npm run verify:ba20`, `npm run verify:stage22`, `npm run verify:passb` PASS
- 에셋 조사:
  - `scripts/audit-missing-sprites.mjs` 추가
  - `reports/missing-sprite-audit.json` 생성
  - 요약: front-only 29(`ETERNATUS_1`, `STUDIOPROP*`), 렌더 가능 폼 미할당 33건

### ✅ 2026-04-19 오늘 작업 요약 (BA-25)
- 원본 선독 후 반영:
  - `pokerogue_codes/src/field/pokemon.ts` (`isMax()`, max 스케일)
  - `pokerogue_codes/src/data/pokemon-forms/form-change-triggers.ts` (거다이맥스 메시지 분기)
- 핵심 구현:
  - `showdown-engine.cjs`: `-start|-end ... Dynamax`를 `dynamax_start/end`로 구조화, 동반 `-heal [silent]`를 다이맥스 이벤트에 흡수
  - `timeline.js`: `dynamax_start/end`를 메시지 -> 연출 -> info patch 순서로 처리
  - `battle-shell-scene.js`: `setBattlerDynamaxState`, `playDynamaxStart/End`, max 2.0x 스케일 적용(최종 조정)
  - `app.js`: `dynamaxed/gigantamaxed` 상태 전파, gmax sprite 분기, payload `gigantamax` 전달
- 회귀 가드 확인:
  - 기술 전 HP/스프라이트 선반영 금지 유지
  - timeline lock 중 message-only 유지
  - `move -> hp -> faint/switch` 순서 유지
  - 테라스탈 경로 독립 유지

### ✅ 2026-04-19 BA-25 후속 안정화 (사용자 검수 반영)
- 테라스탈 즉시 KO 케이스 보정:
  - 변신 턴 즉시 기절 상황에서도 테라스탈 스프라이트/정보창 타입 표시가 턴 내에서 유지되도록 타임라인 대상 포켓몬 해석을 보강
  - `app.js`의 `resolveTimelineEventMon`/`resolveTimelineEventVisualState`에 fallback species + 상태 우선 매칭(테라/다이맥스)을 추가
- 다이맥스 조작/표시 보정:
  - Gen9 Custom Game 경로에서 다이맥스 버튼 비활성 이슈를 `Side.prototype.canDynamaxNow` 패치로 해소 (`showdown-engine.cjs`)
  - 다이맥스/거다이맥스 기술명은 `request.maxMoves`를 우선 사용하도록 UI 표시 경로 정리 (`app.js`)
  - Max/G-Max 사용 시 기술 연출이 비어 보이지 않도록 원기술 애니메이션 fallback(`animationMove`) 연결 (`app.js`, `timeline.js`)
- 거다이맥스 강제 정책 반영:
  - 거다이맥스 가능 종은 일반 다이맥스 대신 자동 거다이맥스로 처리되도록 payload/서버 시작 경로 모두에서 `gigantamax=true` 강제
  - 결과적으로 `maxMoves`가 거다이기술(`gmax*`) 우선으로 노출되고, 이벤트 `gigantamaxed=true`와 동기화
- 최종 스케일/기준점 조정:
  - 다이맥스 배율 2.0x와 metrics/shadow 재적용 배율을 완전히 동기화
  - 확대 기준은 중앙-하단(`origin(0.5, 1)`) 유지
  - 일반 다이맥스만 base Y를 소폭 하향(+12) 적용, 거다이맥스는 추가 하향 없음 (`battle-shell-scene.js`)

### ✅ 2026-04-19 BA-23 완료 (기술/날씨/필드 연출)
- 원본 선독 후 정합 이식:
  - `pokerogue_codes/src/data/battle-anims.ts` (`AnimFocus.SCREEN` 좌표계)
  - `pokerogue_codes/src/phases/common-anim-phase.ts`, `pokerogue_codes/src/field/arena.ts` (weather/terrain common anim 호출)
- 핵심 구현:
  - `battle-anim-player.js`: `focus=SCREEN(4)` 처리 + 애니 스케일 옵션 지원
  - `battle-shell-scene.js`: `playFieldAnim()` 추가(`common-*` 날씨/필드 애니 재생)
  - `timeline.js`: `weather_start/tick`, `terrain_start`에서 `common-*` 연출 연결
  - `app.js`: Z 기술 연출 힌트 주입
    - 물리 Z → `Giga Impact`
    - 특수 Z → `Hyper Beam`
    - 변화 Z → 원본 기술 + `animationScale=1.35`
- 회귀 가드 확인:
  - 기술 전 HP/스프라이트 선반영 금지 유지
  - timeline lock 중 message-only 유지
  - `move -> hp -> faint/switch` 순서 유지
  - 테라스탈/다이맥스 경로 독립 유지
- 검증:
  - `node --check src/battle-presentation/battle-anim-player.js` PASS
  - `node --check src/pokerogue-transplant-runtime/scene/battle-shell-scene.js` PASS
  - `node --check src/battle-presentation/timeline.js` PASS
  - `node --check src/app.js` PASS
  - `npm run verify:ba20` PASS
  - `npm run verify:passb` PASS
  - `npm run verify:stage22` PASS

### ✅ 2026-04-19 BA-23 후속 보강 (사용자 피드백 반영)
- 증상:
  - 가뭄/모래바람/필드 common 연출이 보이지 않음
  - `버티기(Endure)`, `바디프레스(Body Press)`, `사이코키네시스(Psychic)` 등 일부 기술 연출 누락
- 원인:
  - `battle-anim-player`에서 `USER/TARGET` 프레임이 비활성화된 상태
  - `graphic=''`(무그래픽) anim-data를 로더가 거부
  - `AnimTimedAddBgEvent/AnimTimedUpdateBgEvent` 미구현
  - terrain id 정규화 누락(`move: Electric Terrain` → `electricterrain`)으로 terrain common anim key 매핑 실패
  - `USER/TARGET` copy sprite origin/보정식 차이로 프레임이 과상단 배치
- 수정:
  - `battle-anim-player.js`
    - `USER/TARGET` 프레임 재활성화
    - `graphic=''` anim-data 허용
    - timed BG 이벤트(`AnimTimedAddBgEvent`/`AnimTimedUpdateBgEvent`) 실행 경로 추가
    - copy sprite origin을 원본과 동일한 중심(0.5,0.5)으로 조정
    - 일반/무그래픽 애니 분리 base offset(`NO_GRAPHIC y`) 추가
    - timed BG 좌표/크기/스케일/업데이트식을 원본 상수와 동일하게 재정렬
      - add: `x = bgX - 320`, `y = bgY - 284`, `896x576`, `scale=1.25`
      - update: `x = bgX*0.5 - 320`, `y = bgY*0.5 - 284`
    - timed BG depth를 배틀러 하단층으로 복원(플래시 우측 편중 현상 대응)
    - tone gray(`tone[3]`) 반영으로 원본식 스프라이트 암전 연출 보강
  - `timeline.js`
    - 모래바람/싸라기눈 weather damage 메시지 locale key 연결
    - weather damage 시점 필드 애니 재생 연결
    - terrain id 정규화(`move:` prefix 제거) 추가
    - weather common scale은 유지(`1.25`)하되 `scaleGraphicsOnly`로 적용해 배틀러 본체 확대 부작용 제거하려했으나 시패 =>1.0 적용
  - `showdown-engine.cjs`
    - `-fieldstart/-fieldend`의 `terrain_start/end.effect`를 `parts[2]` 기준으로 보정
  - `app.js`
    - Z 메타에 타입(`zMoveType`) 전달
    - Z 물리/특수도 스케일 확대(공통 `1.0`) + 타입 tint 적용
- 검증:
  - `node --check src/battle-presentation/battle-anim-player.js` PASS
  - `node --check src/battle-presentation/timeline.js` PASS
  - `node --check server/showdown-engine.cjs` PASS
  - `node --check src/app.js` PASS
  - `npm run verify:ba20` PASS
  - `npm run verify:passb` PASS
  - `npm run verify:stage22` PASS

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

### ✅ BA-21. 선택 완료 후 대기 메시지 정합 — 완료 (2026-04-16)
- `buildBattleMessageModel()` + `renderBattleMessagesWindow()` + `buildPhaserMessageWindowModel()`에 `상대의 턴을 기다리는 중...` / `Waiting for opponent's turn...` 고정 표시 추가
- `waitingForOpponent` 플래그: mode='message' + request 존재 시 battle.log 라인이 waiting 메시지를 덮지 않도록 `usePromptAsPrimary=true` 강제
- 구현 파일: `src/app.js`

### ✅ BA-22. 한국어/영어 메시지 완전 분리 — 완료 (2026-04-16)
- `STATUS_ID_TO_LOCALE_KEY` 맵 + `STAT_LABELS_EN` 맵 추가
- `status_apply`: `status-effect.{id}.obtain` locale key + `pokemonNameWithAffix` 변수 적용
- `boost/unboost`: `battle.statRose_one/statSharplyRose_one/statFell_one/statHarshlyFell_one` locale key 사용
- `miss`: `battle.attackMissed` locale key 사용
- `cant_move`: `_isEnglishLocale()` 분기로 EN/KO 직접 분리
- `app.js` locale namespace에 `status-effect` 추가
- **후속 픽스 — 포켓몬명/기술명 한국어 표시 (2026-04-16)**:
  - `app.js` executor 생성 시 `localizeMonName: displaySpeciesName` + `localizeMoveName: displayMoveName` 콜백 추가
  - `timeline.js`: `_slotName()` → `_localizeMonName()` 경유, 배틀 메시지에 한국어명 출력
  - `timeline.js`: `_slotNameRaw()` 추가 — 내부 ID 비교/Showdown 매칭용 raw 영어명 보존
  - `forme_change` 핸들러: `preNameRaw`/`rawNextName` 분리, `changed` 비교를 raw 영어명 기준으로, infoPatch에는 localized displayName 적용
  - `_buildFormChangeMessage()`: `rawPre` 파라미터 추가, 폼체인지 판별을 raw 영어명 비교로 전환
- 구현 파일: `src/battle-presentation/timeline.js`, `src/app.js`

### ✅ BA-27. 타임라인 재생 중 선택 입력 블록 — 완료 (2026-04-17)
- 배틀 연출(타임라인) 재생 중에는 command/fight/party 입력을 잠금 처리
- `playTimelineAcrossActiveViews()` 시작/종료 시점에 `ui.inputLocked`를 관리하고, 선택 커밋 경로(`handleBattleChoiceCommitted`)에 가드 추가
- 반영 내용 (2026-04-17):
  - `playTimelineAcrossActiveViews` 시작 시 `ui.inputLocked=true`, 완료(onComplete 직전) 및 예외 경로(finally)에서 `false` 해제
  - `getBattleDisplayMode` 도입: input lock 동안 렌더 모드를 강제 `message`로 전환해 선택창(command/fight/party/target) 자체를 숨김
  - `renderBattleMessagesWindow`/`buildBattleMessageModel`에서 input lock 중 waiting 문구 우선 규칙을 끄고 battle.log 메시지 우선 표시
  - `handleBattleChoiceCommitted` 진입 가드 및 move/switch 커밋 호출 경로 선가드 추가
  - `renderBattle` auto-resolve 조건에 `!ui.inputLocked` 가드 추가(타임라인 재생 중 중첩 턴 해석 방지)
- 검증:
  - `node --check src/app.js` PASS
  - `npm run verify:stage22` PASS
  - `npm run verify:passb` PASS
- 후속 회귀 수정 (2026-04-17, 사용자 피드백):
  - 증상: 타임라인 시작 전/초기에 HP·스프라이트가 최종 스냅샷으로 먼저 바뀌어 기술/기절/교체 연출 순서가 붕괴
  - 원인:
    - 중간 턴 `switch_in`에서도 `prepareSwitchInBattler()`를 선호출해 대상 진영 sprite를 조기에 숨김/교체
    - `switch_in`의 `fromBall=true` 경로에서 이벤트 시점 sprite 교체가 빠져 있음
  - 수정:
    - `src/app.js` `playTimelineAcrossActiveViews()`에서 `prepareSwitchInBattler()`는 초기 소환 경로(`preHideSwitchInSides=true`)에서만 실행
    - `src/app.js` `forceBattleMessageOnlyUiDuringLock()` 추가: full render 없이 DOM/Phaser를 즉시 message 모드로 전환해 선택창 잔류 제거
    - `src/battle-presentation/timeline.js` `switch_in` 핸들러에서 `setBattlerSprite(...,{visible:!fromBall})`를 이벤트 경계에서 실행
    - 결과적으로 교체 sprite 반영 시점을 switch 이벤트 타이밍으로 고정
  - 검증:
    - `node --check src/app.js` PASS
    - `node --check src/battle-presentation/timeline.js` PASS
    - `npm run verify:stage22` PASS
    - `npm run verify:passb` PASS

### ✅ BA-23. 기술/날씨/필드 연출 완벽화 — 완료 (2026-04-19)
- `AnimFocus.SCREEN` 좌표계 보정 + `weather/terrain common-*` 연출 연결 완료
- Z 기술 연출 규칙(물리/특수/변화) 반영 완료
- 검증: `node --check`(수정 파일), `npm run verify:ba20`, `npm run verify:passb`, `npm run verify:stage22` PASS

### ✅ BA-24. 테라스탈 구현 — 1차 완료 (2026-04-17)
- 원본 참조:
  - `pokerogue_codes/src/phases/tera-phase.ts`
  - `pokerogue_codes/src/phases/turn-start-phase.ts`
  - `pokerogue_codes/src/data/pokemon-forms/form-change-triggers.ts`
- 반영 파일:
  - `server/showdown-engine.cjs`
  - `src/battle-presentation/event-schema.js`
  - `src/battle-presentation/timeline.js`
  - `src/pokerogue-transplant-runtime/runtime/constants.js`
  - `src/pokerogue-transplant-runtime/runtime/assets.js`
  - `src/pokerogue-transplant-runtime/scene/battle-shell-scene.js`
  - `src/app.js`
- 반영 내용:
  - `-terastallize`를 `forme_change` 분기에서 분리해 독립 `terastallize` 이벤트 추출 (`target`, `teraType`, `teraTypeName`, `trigger`, `fromSource`)
  - event-schema에 `terastallize` 타입 및 core 분류 추가
  - timeline에 `terastallize` 단계 추가: 메시지(`battle.pokemonTerastallized`) → 연출(`playTerastallize`) → info patch(UI 타입/테라 아이콘) 순서
  - `effects/tera`, `effects/tera_sparkle`를 로드해 테라 전용 시각 연출 적용
  - `terastallize` 시점에 최종 스프라이트를 즉시 반영하고, 직후 연계 `forme_change`는 연출/메시지를 생략해 오거폰/테라파고스 계열 중복 변신을 방지
  - locale namespace에 `pokemon-info`를 추가해 테라 타입명을 locale key(`type.*`)로 표시
- 검증:
  - `node --check server/showdown-engine.cjs`
  - `node --check src/battle-presentation/event-schema.js`
  - `node --check src/battle-presentation/timeline.js`
  - `node --check src/pokerogue-transplant-runtime/runtime/constants.js`
  - `node --check src/pokerogue-transplant-runtime/runtime/assets.js`
  - `node --check src/pokerogue-transplant-runtime/scene/battle-shell-scene.js`
  - `node --check src/app.js`
  - `npm run verify:ba20`
  - `npm run verify:stage22`
  - `npm run verify:passb`
  - 인라인 검증: `move 1 terastallize` 실행 시 `events.type==='terastallize'` 확인, `forme_change(mechanism='-terastallize')` 미발생 확인
  - 인라인 검증: Ogerpon 테라 턴에서 `terastallize -> forme_change(detailschange)` 연속 이벤트 확인(타임라인 중복 연출 생략 대상)

### ✅ BA-25. 다이맥스 구현 — 완료 (2026-04-19)
- `dynamax_start`/`dynamax_end` 이벤트 파싱 및 타임라인 반영 완료
- 다이맥스 동반 silent heal을 이벤트에 흡수해 중복 HP 재생 방지
- 씬 스케일/상태(`dynamaxed`, `gigantamaxed`) 및 gmax 스프라이트 분기 반영
- 검증: `node --check`(수정 파일), `npm run verify:ba20`, `npm run verify:stage22`, `npm run verify:passb` PASS

### ✅ BA-26. 배틀 내 폼체인지 표시명 고정 — 완료 (2026-04-17)
- 사용자 노출 이름을 폼명 대신 기본 종족명으로 고정
- 예: `메가한카리아스` → `한카리아스`, `나시(알로라의 모습)` → `나시`
- 반영 파일:
  - `src/app.js`
  - `src/battle-presentation/timeline.js`
- 반영 내용:
  - `resolveBattleDisplayBaseSpecies()` / `getBattleDisplaySpeciesName()` / `displayBattleSpeciesName()` 추가
  - battle UI(메시지창/정보창/커맨드·기술·파티·디버그·대기 목록)의 포켓몬명 표시를 base species 기준으로 통일
  - 타임라인 executor `localizeMonName` 콜백을 base species 기준으로 교체
  - 폼체인지 메시지에서 pre/post 표시명이 동일할 때 `다른 모습으로 변화했다!`로 안전 문구 처리
- 검증:
  - `node --check src/app.js` PASS
  - `node --check src/battle-presentation/timeline.js` PASS
  - `npm run verify:stage22` PASS
  - `npm run verify:passb` PASS
- 후속 조정 (2026-04-17, 사용자 피드백):
  - 폼명 고정은 UI/정보창/선택창에만 유지
  - 폼체인지 연출 메시지는 form-aware 표시(`localizeMonNameWithForm`)로 복원해 원래 메시지 톤 유지

### ✅ BA-28. 영칭 전용 포켓몬/기술 한국어명 탑재 — 1차 완료 (2026-04-20)
- KO 모드 영어 노출 기술/특성명 맵 보강(`src/i18n-ko-locales.js` + `src/app.js` patch)
- 타임라인 ability bar/메시지의 특성명 로컬라이즈 적용(`src/battle-presentation/timeline.js`)
- 후속: sprite 미할당 33건 대응 정책 확정(`reports/missing-sprite-audit.json`)

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
4. `BA-21` 선택 완료 후 대기 메시지 정합 ✅ 완료 (2026-04-16)
5. `BA-22` 한국어/영어 메시지 완전 분리 ✅ 완료 (2026-04-16)
6. `BA-27` 타임라인 재생 중 선택 입력 블록 ✅ 완료 (2026-04-17)
7. `BA-26` 배틀 내 폼체인지 표시명 고정 ✅ 완료 (2026-04-17)
8. `BA-24` 테라스탈 구현 ✅ 1차 완료 (2026-04-17)
9. `BA-25` 다이맥스 구현 ✅ 완료 (2026-04-19)
10. `BA-23` 기술/날씨/필드 연출 완벽화 ✅ 완료 (2026-04-19)
11. `BA-28` 영칭 전용 포켓몬/기술 한국어명 탑재 ✅ 1차 완료 (2026-04-20)

**✅ BA-21: 선택 완료 후 대기 메시지 정합 — 완료 (2026-04-16)** (`app.js`)
- `buildBattleMessageModel()` / `renderBattleMessagesWindow()` / `buildPhaserMessageWindowModel()`에 waiting 분기 추가
- `waitingForOpponent` 플래그: mode='message' + request 존재 → battle.log 덮어쓰기 방지, secondary/showPrompt 비움

**✅ BA-22: 한국어/영어 메시지 완전 분리 — 완료 (2026-04-16)** (`timeline.js`, `app.js`)
- `STATUS_ID_TO_LOCALE_KEY` / `STAT_LABELS_EN` 맵 추가
- `status_apply/boost/unboost/miss/cant_move` 핸들러를 locale key 기반으로 전환, EN locale에서 영어 전용 메시지 출력
- **후속**: `localizeMonName`/`localizeMoveName` 콜백 추가로 배틀 메시지 내 포켓몬명·기술명 한국어화 완성
- `_slotNames`는 raw 영어명 유지, `_slotName()` 출력만 한국어화(언어 설정에 따라 자동 분기)

**✅ BA-27: 타임라인 재생 중 선택 입력 블록 — 완료 (2026-04-17)** (`app.js`)
- `playTimelineAcrossActiveViews()` 시작 잠금(`ui.inputLocked=true`) + 완료 직전 해제(`false`) + 예외 경로 해제
- input lock 동안 `getBattleDisplayMode()`로 렌더 모드를 `message`로 강제해 선택창을 숨기고 메시지창만 표시 (DOM + Phaser)
- `renderBattleMessagesWindow`/`buildBattleMessageModel`에서 input lock 중에는 battle.log 메시지를 우선 표시
- `handleBattleChoiceCommitted()` 진입/호출 경로에 input lock 가드 추가
- `renderBattle()` auto-resolve를 input lock 중에는 차단해 타임라인 중 중첩 해석 방지
- 회귀 검증: `node --check src/app.js`, `npm run verify:stage22`, `npm run verify:passb` 모두 PASS
- 후속 회귀 수정(2026-04-17):
  - 중간 턴 `switch_in` 선준비(`prepareSwitchInBattler`)를 초기 소환 경로 전용으로 제한
  - `forceBattleMessageOnlyUiDuringLock()`로 타임라인 시작 직후 선택창을 즉시 숨김(입력 잠금은 유지)
  - `timeline.js` `switch_in`에서 `setBattlerSprite(...,{visible:!fromBall})`를 이벤트 시점에 실행해 조기 스냅샷 노출 방지
  - 검증: `node --check src/app.js`, `node --check src/battle-presentation/timeline.js`, `npm run verify:stage22`, `npm run verify:passb` PASS

**✅ BA-23: 기술/날씨/필드 연출 완벽화 — 완료 (2026-04-19)** (`timeline.js`, `battle-shell-scene.js`, `battle-anim-player.js`, `app.js`)
- 원본 `battle-anims.ts`/`common-anim-phase.ts`/`arena.ts` 정합 이식
- weather/terrain common anim 연결 + Z 기술 연출 규칙(물리/특수/변화) 반영
- 후속 보강(사용자 피드백):
  - `showdown-engine.cjs` `-fieldstart/-fieldend` effect 파싱을 `parts[2]` 기준으로 고정
  - `timeline.js` terrain effect `move:` 접두 정규화(`move: Electric Terrain` -> `electricterrain`)
  - `battle-anim-player.js` USER/TARGET copy origin/scale 정합 + no-graphic base 오프셋(0,0) 정리
  - `timeline.js` 비데미지 날씨 턴말 lapse 메시지+연출 추가, weather_start 동턴 중복 tick 연출 스킵
  - `battle-shell-scene.js` terrain persistent BG 레이어 추가(terrain_end까지 유지)
  - `battle-anim-player.js` BG tileSprite cover-scale 보정으로 terrain/기술 배경 4분할 seam 완화
  - `battle-anim-player.js` anim-data 배열형 move variant(0/1)를 actor 시점으로 선택
  - `battle-shell-scene.js` terrain persistent BG를 단일 image cover 렌더로 전환(시전 후 seam 완화)
  - `battle-anim-player.js` timed BG 레이어 depth/좌표 tween을 원본형으로 재정렬(부분 번쩍임 완화)
  - `styles.css` P1/P2 Phaser mount 16:9 고정(화면비 차이 환경 정합)
  - `battle-anim-player.js` move array variant에서 원본 `oppAnim` USER/TARGET swap 복원
  - `runtime/controller.js` Phaser scale mode `FIT` 전환으로 split 뷰 중앙 축소(letterbox) 완화
  - `timeline.js` weather common 연출 스케일(1.25) 보정으로 화면 커버 범위 확장 => 1.0으로 수정
- 검증: `node --check`(수정 파일), `npm run verify:ba20`, `npm run verify:passb`, `npm run verify:stage22`
  - 금회 `verify:stage22` 1회 PASS (기존 mega feraligatr 플래키 이력은 유지 관찰)

**✅ BA-24: 테라스탈 구현 — 1차 완료 (2026-04-17)** (`showdown-engine.cjs`, `event-schema.js`, `timeline.js`, `battle-shell-scene.js`, `app.js`)
- `-terastallize`를 독립 `terastallize` 이벤트로 파싱하고 `target/teraType/teraTypeName/trigger/fromSource`를 구조화
- timeline에 `terastallize` 단계 추가: 선언 메시지(`battle.pokemonTerastallized`) → 테라 연출(`playTerastallize`) → info patch 반영
- `effects/tera`, `effects/tera_sparkle` 기반 테라 전용 연출 적용
- `terastallize` 직후 연계 `forme_change`(오거폰/테라파고스 계열)는 연출/메시지를 생략해 즉시 특수 폼 반영
- locale namespace(`pokemon-info`)를 추가해 테라 타입 라벨을 `type.*` 키로 로컬라이즈
- 검증: `node --check`(수정 파일), `npm run verify:ba20`, `npm run verify:stage22`, `npm run verify:passb` PASS

**✅ BA-24: 테라스탈 구현 — 2차 보강 (2026-04-17, 사용자 피드백 반영)** (`timeline.js`, `battle-shell-scene.js`, `app.js`)
- 원본 렌더 기제 재확인:
  - `pokerogue_codes/src/pipelines/sprite.ts`, `pokerogue_codes/src/pipelines/glsl/sprite-frag-shader.frag`, `pokerogue_codes/src/field/pokemon-sprite-sparkle-handler.ts`
  - 원본은 테라를 일회성 연출이 아니라 지속 상태(`isTerastallized + teraColor + tera texture`)로 처리
- `timeline.js`
  - `terastallize`에서 next-event lookahead로 linked `forme_change`를 즉시 흡수
  - linked form seq는 `_consumedTerastallizeFormSeqs`로 마킹해 뒤 `forme_change` 중복 실행 스킵
  - `teraType` info patch가 들어오면 scene `setBattlerTerastallized()` 동기 호출
- `battle-shell-scene.js`
  - mount별 `terastallized/teraType` 상태 추가
  - `tera.png` 기반 지속 오버레이(tileSprite, 타입 tint, 패턴 이동) 추가
  - 테라 상태 유지 중 `tera_sparkle` 주기 생성 타이머 추가
  - `setBattlerTerastallized(side, {terastallized, teraType})` API 추가 및 switch/faint/layout/update 동기화
- `app.js`
  - Phaser sprite model에 `terastallized`, `teraType` 전달해 턴 사이 일반 렌더에서도 테라 지속 상태 유지
- 검증:
  - `node --check src/battle-presentation/timeline.js` PASS
  - `node --check src/pokerogue-transplant-runtime/scene/battle-shell-scene.js` PASS
  - `node --check src/app.js` PASS
  - `npm run verify:ba20` PASS
  - `npm run verify:stage22` PASS (Feraligatr 케이스 플래키성 1회 관찰)
  - `npm run verify:passb` PASS

**✅ BA-25: 다이맥스 구현 — 완료 (2026-04-19)** (`showdown-engine.cjs`, `event-schema.js`, `timeline.js`, `battle-shell-scene.js`, `app.js`)
- `dynamax_start/end` 이벤트 파싱 + 타임라인 메시지/연출/상태 동기화 완료
- 동반 silent heal 흡수로 HP 재생 순서 회귀 방지
- max 스케일/거다이맥스 분기 및 payload `gigantamax` 경로 반영

**✅ BA-26: 배틀 내 폼체인지 표시명 고정 — 완료 (2026-04-17)** (`app.js`, `timeline.js`)
- 배틀 메시지/정보창/선택창 표시명을 기본 종족명으로 고정(폼명 비노출)
- 타임라인 표시명(localizeMonName)도 기본 종족명 기준으로 통일
- 검증: `node --check src/app.js`, `node --check src/battle-presentation/timeline.js`, `npm run verify:stage22`, `npm run verify:passb` PASS

**✅ BA-28: 영칭 전용 포켓몬/기술 한국어명 탑재 — 1차 완료 (2026-04-20)** (`src/i18n-ko-locales.js`, `src/app.js`, `src/battle-presentation/timeline.js`)
- `assets/pokerogue/locales/{en,ko}` 기반 이름맵(`species/moves/abilities`) 추출 모듈 추가
- move/ability canonical 해석 + 특성 타임라인 로컬라이즈 적용
- 후속: `reports/missing-sprite-audit.json` 기준 sprite 미할당 33건 분류/대응


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
