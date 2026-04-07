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

## 현재 이식 완성도 (2026-04-07 최신)

| 파일 | 완성도 | 주요 미구현 |
|------|--------|-----------|
| `battle-info.js` | ~85% | Stats 컨테이너, 이름 자동 줄임 |
| `player-battle-info.js` | ~75% | EXP 레벨업 사운드 처리 |
| `enemy-battle-info.js` | ~65% | Type effectiveness 창, Flyout 메뉴 |
| `fight-ui-handler.js` | ~90% | Move Info Overlay (전체화면 토글) |
| `command-ui-handler.js` | ~78% | Tera 색상 파이프라인 |
| `party-ui-handler.js` | ~55% | 포켓몬 아이콘 dynamic load 구현됨 |
| `battle-message-ui-handler.js` | ~65% | promptLevelUpStats 트리거 연결 필요 |
| `target-select-ui-handler.js` | ~40% | 싱글 배틀이라 field 스프라이트 접근 불가 |

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

## 다음에 할 만한 작업
- "Turn counter" 정체 파악 및 구현 (유저가 언급, 현재 미구현)
- `command-ui-handler.js` Tera 버튼 색상 파이프라인
- `battle-info.js` Stats 컨테이너 (능력치 변화 표시)
- `battle-message-ui-handler.js` promptLevelUpStats → app.js 배틀 흐름 연결
- 시각적 확인 후 타입 아이콘 y 오프셋 추가 미세 조정 (현재 4px 낮춤)

## 코드 작업 시 주의사항
- PokeRogue 원본은 `/workspaces/pokemon-battle/pokerogue_codes/src/ui/` 참조
- 이식본의 `env` 객체: `clamp`, `textureExists`, `setHorizontalCrop`, `UI_ASSETS` 포함
- 빌더/bundler 없음 — JS 파일은 ESM으로 직접 서빙
- 에셋 추가 시: `constants.js` → `assets.js` 순으로 등록
- multiatlas (textures[] 배열 형식): `load.multiatlas(key, json, path)` 사용
- 일반 atlas: `load.atlas(key, image, json)` 사용
- **텍스트 해상도**: `createBaseText`에서 `resolution: 1` 고정 (3으로 올리면 안티앨리어싱 발생 → 흐릿해짐)
- **커서 이미지**: `setOrigin` 호출하지 말 것 — Phaser 기본값 (0.5, 0.5) 사용이 PokeRogue와 동일
- **어빌리티 바**: enemy=오른쪽(x=202), player=왼쪽(x=0), 두 이미지 모두 origin(0,0)

## 2026-04-07 완료한 작업
1. **LOGICAL_HEIGHT 240→180 수정** (`constants.js`): PokeRogue 좌표계(1920/6=320, 1080/6=180)에 맞춤
2. **레이아웃 전면 수정** (`ui.js` layout()): tray/info/sprite 모든 좌표 PokeRogue 원본에서 역산
3. **ARENA_OFFSETS 수정** (`constants.js`): enemy/player 모두 `{x:0, y:0}` (ArenaBase 기본 위치)
4. **폰트 선명도 수정** (`phaser-utils.js`): `resolution: 3 → 1` — pixelArt 모드와 조합해 선명한 픽셀 텍스트
5. **커서 origin 수정** (`command-ui-handler.js`, `fight-ui-handler.js`): `.setOrigin(0,0)` 제거 → 기본값 (0.5, 0.5)
6. **적 타입 아이콘 y 오프셋** (`battle-info.js`): -15.5→-11.5, -2.5→+1.5 (4px 하향)
7. **어빌리티 바 위치/방향 수정** (`battle-info.js`): player x=0, enemy x=202, 이미지 origin(0,0), y=64