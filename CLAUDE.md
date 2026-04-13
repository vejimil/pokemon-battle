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

## 다음 세션 우선순위 (Sprint 4 완료 후 — 2026-04-13 기준)

> **작업 원칙1: 각 항목을 수정하기 전에 반드시 PokeRogue 원본 코드를 자세하게 읽고 정확히 일치시킬 것.**
> **작업 원칙2: 작업 시에는 항상 각주를 달고, 작업 마무리 때는 항상 CLAUDE.md도 업데이트 할것.**
> **작업 원칙3: 나를 위한 설명은 한글로 하되, 작업 및 사고 자체는 영어로 진행할 것 - 토큰 절약을 위함**

### ✅ BA-1. 배틀 메시지 순차 표시 — 완료 (2026-04-13)
- `timeline.js` `_showMsg()` + `MessageUiHandler.showText()` 직접 호출
- switch_in / move_use / damage(critical/super/not_very) / faint / ability_show / weather / terrain 메시지 구현
- `turn_start` 메시지 제거 (불필요)

### ✅ BA-2. 울음소리(Cry) 연결 — 완료 (2026-04-13)
- `BattleAudioManager.playCryByNum(dexNum)` 추가 → `cry/<num>.m4a` 로드
- `timeline.js`에서 `Pokedex` 임포트, `speciesToDexNum()` 헬퍼로 dex 번호 변환
- `switch_in` 핸들러에서 pb_rel SE → 700ms → `await playCryByNum()` → 300/100ms
- `startBattle()`에서 `await syncPhaserBattleRenderer()` 후 initExecutor 실행 (첫 울음소리 보장)

### ✅ BA-3. 어빌리티 바 + 날씨/지형 연출 — 완료 (2026-04-13)
- `ability_show` → `abilityBar.update()` 1200ms 표시 후 hide
- `weather_start/end` / `terrain_start/end` → 메시지 표시 + 600~800ms 딜레이
- `weather_tick` 의도적으로 silent (매 턴 메시지 스팸 방지)
- `ui.js`: `abilityBar.container.setDepth(42 → 60)` — FIGHT(55) 위로 z-order 수정

### ✅ Sprint 3 버그픽스 — 완료 (2026-04-13)
- **커맨드 화면 메시지 수정**: `buildPhaserCommandWindowModel`에 `prompt` 필드 추가 ("귀뚤톡크, 무엇을 할까?")
- **FIGHT 화면 텍스트 오버랩 제거**: `fight-ui-handler.js` `show()`에서 `battleMessage.message?.setText?.('')` 호출
- **어빌리티 바 z-order 수정**: `ui.js`에서 depth 42 → 60
- **필드명 불일치 수정** (`pkb-battle-ui-adapter.js`): `message.primary`와 `message.primaryText` 모두 읽도록 수정

### ✅ Sprint 4 버그픽스 + BA-4 — 완료 (2026-04-13)
- **Bug #1 커맨드 이름 고정 수정** (`ui.js`): `renderModel()`에서 `this.getArgsForMode()` (캐시 반환) → `this.adapter.getUiArgsForMode()` (항상 fresh args) 로 변경. 차례가 바뀌어도 현재 활성 포켓몬 이름이 올바르게 표시됨.
- **Bug #3 어빌리티 바 weather/terrain 트리거 수정** (`showdown-engine.cjs`): `-weather`/`-fieldstart` 라인에 `[from] ability: X|[of] p1a: Y` 태그 있을 때 `ability_show` 이벤트 선행 생성. Drought, Drizzle, Sand Stream, Desolate Land, Primordial Sea, 지형 특성 등 날씨/필드를 유발하는 특성의 어빌리티 바가 이제 표시됨.
- **BA-4 status/boost/miss/cant_move 메시지** (`timeline.js`): STATUS_LABELS, STAT_LABELS Map 추가. `status_apply` / `boost` / `unboost` / `miss` / `cant_move` 이벤트 핸들러 구현.

### ⚠️ 브라우저 확인 대기 항목 (2026-04-13 기준)
다음 항목을 브라우저에서 직접 확인해야 함:
1. **Bug #1** — 포켓몬 교체 후 커맨드 화면에 새 포켓몬 이름 표시되는지
2. **Bug #3** — Drought/Sand Stream 등 날씨 특성 투입 시 어빌리티 바 표시되는지
3. **BA-4 상태이상** — 독/마비/화상 걸릴 때 메시지 한글로 나오는지
4. **BA-4 스탯 변화** — 스탯 오르내릴 때 "X의 공격이 올랐다!" 나오는지
5. **BA-4 빗나감** — 빗나갔을 때 "X의 공격이 빗나갔다!" 나오는지
6. **BA-4 행동 불가** — 마비/잠듦 행동 불가 시 "X은(는) 움직일 수 없다." 나오는지

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

### 보류 항목
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