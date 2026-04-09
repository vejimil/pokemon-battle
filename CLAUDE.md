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

## 현재 이식 완성도 (2026-04-09 최신)

| 파일 | 완성도 | 주요 미구현 |
|------|--------|-----------|
| `battle-info.js` | ~88% | Stats 컨테이너 |
| `player-battle-info.js` | ~85% | EXP 레벨업 사운드 처리 |
| `enemy-battle-info.js` | ~65% | Type effectiveness 창, Flyout 메뉴 |
| `fight-ui-handler.js` | ~90% | Move Info Overlay (전체화면 토글) |
| `command-ui-handler.js` | ~80% | Tera 색상 파이프라인 |
| `party-ui-handler.js` | ~55% | 포켓몬 아이콘 dynamic load 구현됨 |
| `battle-message-ui-handler.js` | ~75% | promptLevelUpStats 트리거 연결 필요 |
| `target-select-ui-handler.js` | ~40% | 싱글 배틀이라 field 스프라이트 접근 불가 |
| `text.js` (helpers) | ~90% | 폰트 크기·shadow 원본 일치 완료 |

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
| enemySprite | (236, 84) | EnemyPokemon super(236, 84) |
| playerSprite | (106, 148) | PlayerPokemon super(106, 148) |
| abilityBar (enemy) | (202, 64) | x=screenRight-118, y=-116 in fieldUI |
| abilityBar (player) | (0, 64) | x=0, y=-116 in fieldUI |

## 다음 세션 우선순위 (2026-04-09 기준, 스크린샷 검토 후 업데이트)

> **작업 원칙1: 각 항목을 수정하기 전에 반드시 PokeRogue 원본 코드를 자세하게 읽고 정확히 일치시킬 것.**
> **작업 원칙2: 작업 시에는 항상 각주를 달고, 작업 마무리 때는 항상 CLAUDE.md도 업데이트 할것.**
> **작업 원칙3: 나를 위한 설명은 한글로 하되, 작업 및 사고 자체는 영어로 진행할 것 - 토큰 절약을 위함**

### 1. 폰트 흐림 — 부분 개선됨, 정보창 위 텍스트 여전히 흐림 (2026-04-09 스크린샷 확인)
- 2026-04-09 조치:
  - `controller.js`: Game `resolution: DPR기반 → 1` 고정 (Retina 불일치 해소)
  - `text.js`: 폰트 크기 원본 맞춤 (WINDOW 8→**16px**, BATTLE_INFO 8→**12px**)
  - `text.js`: shadow 추가 (style별 원본 shadowX/Y/color 적용)
  - `phaser-utils.js`: lineSpacing 기본값 5 추가 (원본 `scale*30=5`)
- **스크린샷 확인**: BATTLE_INFO(12px)로 렌더되는 정보창 위 텍스트(이름, HP숫자 등)가 여전히 흐림
- **유력 원인**: `nameTextY = -11.2` 같은 비정수 y 좌표 → 서브픽셀 렌더링 발생. `pos` 좌표를 정수로 반올림 시도 필요.
- **추가 원인 후보**: shadow(3.5, 3.5) 같은 소수 shadow offset 값 (BATTLE_INFO 스타일)
- **남은 가능성**: BitmapFont(스프라이트시트) 방식 전환이 필요할 수 있음

### 2. 남색 바 — **해결됨** (2026-04-08)
- BattleTray.setup() 마지막에 `this.container.setVisible(false)` 추가로 해결

### 3. 적 타입 아이콘 위치(1픽셀) — **조사 완료, 이상 없음**
- 오프셋 값 `(-15,-15.5)` 등은 원본과 동일
- atlas JSON `pbinfo_enemy_type1.json`은 multiatlas "textures" 포맷, trim 데이터 정상
- PokeRogue도 동일 atlas 사용 → 1픽셀 오프셋은 양쪽 동일, 수정 불필요

### 4. 하단 대화창 레이아웃 — **수정 완료** (2026-04-09)
- `wordWrapWidth`: 215 → **297** (1780/6 logical px)
- command-ui-handler: `91/111` → **152/185** (910/6, 1110/6)
- message/nameText: fontSize **8→16px** (원본 TextStyle.MESSAGE=96px→logical 16px)
- nameBox width 계산: `.width` → `.displayWidth` 버그 수정

### 5. 턴 인디케이터 (검은 바) — **작업 안 함**
- PokeRogue 원본 battle-scene.ts 미보유, 실제 존재 여부 미확인 → 보류

### 6. 적 정보창 몸체 1-2px 낮음 — **미수정** (2026-04-09 스크린샷 발견)
- 스크린샷 1(command UI)에서 적 정보창(테라파고스) bg body가 1-2px 낮아 보임
- HP 바, 타입 아이콘, 텍스트는 정상 위치 → **bg 이미지만** y 오프셋 조정 필요
- `battle-info.js` 내 `this.bg`의 y 좌표를 -1~-2px 조정. 단, 다른 요소(nameText, hpFill, typeIcons 등)는 절대 건드리지 말 것
- **조사 필요**: PokeRogue 원본 `battle-info.ts:234`에서 `box` sprite 좌표 재확인 — 이식본 `this.bg`와 100% 동일한지 검증
- **주의**: 적(enemy) 정보창만 해당. player는 정상으로 보임.

### 7. 교체 UI 레이아웃 오류 — **미수정** (2026-04-09 스크린샷 발견)
- 스크린샷 3(교체 UI)에서 party 슬롯이 배틀 필드 위에 둥둥 떠 있음
- **partyBg 미표시**: `env.UI_ASSETS.partyBg.key` 텍스처가 로드되지 않았거나 키가 잘못됨 → 배경 없이 슬롯만 노출
- **슬롯 위치**: 슬롯 Y좌표(container y=180 기준 상대값 -168~-56)는 절대 y 12~124에 위치 — 이 자체는 PokeRogue 레이아웃과 일치하나, partyBg 없이 노출되어 어색해 보임
- **조사 필요**: `constants.js`에서 `partyBg` 키 확인, `assets.js`에서 실제 로드 여부 확인
- **2차 조사**: partyBg 이미지 실제 크기가 320×180이어야 전체 화면을 덮음

### 8. 싸운다 UI — 기술 카테고리 아이콘 누락 (2026-04-09 스크린샷 발견)
- 스크린샷 2(fight UI)에서 move info 패널에 **카테고리 아이콘**(물리/특수/변화 아이콘)이 없음
- PokeRogue 원본: `moveCategoryIcon = globalScene.add.sprite(scaledCanvas.width-25, -36, "categories", "physical")`
- `"categories"` 아틀라스가 로드되지 않았거나 이식본의 `fight-ui-handler.js`에서 키가 잘못됨
- **조사 필요**: `constants.js`에서 categories atlas 키 확인, `assets.js`에서 로드 여부 확인
- move info 패널 위치 자체는 정상(bottom-right of message area)

### 향후 기능 작업 (버그 수정 후)
- 파티 교체 UI (`party-ui-handler.js`) 전면 재작성 (현재 partyBg 수정 후에도 레이아웃 개선 필요)
- 기술 선택 UI (`fight-ui-handler.js`) Move Info Overlay (전체화면 토글)
- `command-ui-handler.js` Tera 버튼 색상 파이프라인
- `battle-info.js` Stats 컨테이너 (능력치 변화 표시)

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
- **폰트 크기 (logical px)**: WINDOW/MESSAGE=16, WINDOW_BATTLE_COMMAND=16, BATTLE_INFO=12, BATTLE_INFO_SMALL/BATTLE_LABEL/BATTLE_VALUE=8~9 — `text.js` TEXT_STYLE 참조
- **shadow**: `addTextObject` 호출 시 style별 shadow 자동 적용됨 — 직접 `setShadow()` 호출 불필요
- **lineSpacing**: `createBaseText` 기본값 5 (원본 `scale*30=5`). 다른 값 필요 시 options으로 전달
- **wordWrap 지정**: 로지컬 픽셀 값으로 `env.setTextWordWrap(obj, width)` 호출 — 직접 `setWordWrapWidth()` 호출 금지 (6× 스케일 보정 필요)
- **wordWrapWidth 기준값**: 메시지창 기본=297px, Tera불가=185px, Tera가능=152px (원본 1780/1110/910 ÷ 6)
- **nameBox 폭 계산**: `nameText.displayWidth + 16` 사용 (`.width` 금지 — unscaled canvas px)
- **커서 이미지**: `setOrigin` 호출하지 말 것 — Phaser 기본값 (0.5, 0.5) 사용이 PokeRogue와 동일
- **어빌리티 바**: enemy=오른쪽(x=202), player=왼쪽(x=0), 두 이미지 모두 origin(0,0)

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

## 2026-04-08 완료한 작업
1. **타입 아이콘 y 오프셋 복원** (`battle-info.js`): 원본 값 `(-15, -15.5)` / `(-15, -2.5)` / `(0, -15.5)` 적용
2. **Phaser Scale 모드 변경** (`controller.js`): `Scale.FIT → Scale.INTEGER_SCALE` (정수배 강제)
3. **aspect-ratio 수정** (`styles.css`): 4/3 → 16/9 (320×180 게임 비율에 맞춤)
4. **폰트 렌더링 방식 근본 수정** (`phaser-utils.js`): `TEXT_RENDER_SCALE=6` 도입 — `fontSize×6`으로 텍스트 생성 후 `setScale(1/6)`, PokeRogue 원본 방식과 동일
5. **wordWrap 6× 스케일 대응** (`phaser-utils.js`, `battle-message-ui-handler.js`, `command-ui-handler.js`): `setTextWordWrap(obj, logicalWidth)` 유틸 추가 및 기존 직접 호출 교체
6. **폰트 사전 로딩 크기 수정** (`controller.js`): 8px → 48px (`TEXT_RENDER_SCALE×8`) 로 브라우저 캐시 정합성 개선
7. **EXP 바 geometry mask 이식** (`player-battle-info.js`): `expMaskRect` geometry mask 방식으로 전환 — PokeRogue 원본과 동일한 `scene.make.graphics()` + `createGeometryMask()` 패턴, `_applyExpMask(width)` 메서드 추가
8. **배틀 전체화면 오버레이 구현 ✅** (`app.js`, `index.html`, `styles.css`): `enterBattleFullscreen()` / `exitBattleFullscreen()` 함수, `battle-fullscreen` CSS 클래스(`position:fixed; inset:0`), `← 빌더로` 버튼 및 ESC 키 지원 — **정상 동작 확인**