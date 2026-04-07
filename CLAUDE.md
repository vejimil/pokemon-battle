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
| `battle-info.js` | ~80% | Stats 컨테이너, 이름 자동 줄임 |
| `player-battle-info.js` | ~75% | EXP 레벨업 사운드 처리 |
| `enemy-battle-info.js` | ~65% | Type effectiveness 창, Flyout 메뉴 |
| `fight-ui-handler.js` | ~88% | Move Info Overlay (전체화면 토글) |
| `command-ui-handler.js` | ~75% | Tera 색상 파이프라인 |
| `party-ui-handler.js` | ~55% | 포켓몬 아이콘 dynamic load 구현됨 |
| `battle-message-ui-handler.js` | ~65% | promptLevelUpStats 트리거 연결 필요 |
| `target-select-ui-handler.js` | ~40% | 싱글 배틀이라 field 스프라이트 접근 불가 |

## 주요 에셋 정보
- 게임 해상도: 320×240 (LOGICAL_WIDTH/HEIGHT)
- `overlay_hp` 아틀라스: 48×2px per frame (high/medium/low)
- `overlay_exp`: 85×2px plain image
- `numbers` 아틀라스: 0-9, / 프레임 (각 8×8px)
- `statuses_ko` 아틀라스: burn, freeze, paralysis, poison, sleep, toxic, pokerus
- `shiny_icons` 아틀라스: 0, 1, 2 (shiny variant)

## 다음에 할 만한 작업
- `command-ui-handler.js` Tera 버튼 색상 파이프라인
- `battle-info.js` Stats 컨테이너 (능력치 변화 표시)
- 시각적 확인 후 위치/크기 미세 조정

## 코드 작업 시 주의사항
- PokeRogue 원본은 `/workspaces/pokemon-battle/pokerogue_codes/src/ui/` 참조
- 이식본의 `env` 객체: `clamp`, `textureExists`, `setHorizontalCrop`, `UI_ASSETS` 포함
- 빌더/bundler 없음 — JS 파일은 ESM으로 직접 서빙
- 에셋 추가 시: `constants.js` → `assets.js` 순으로 등록
- multiatlas (textures[] 배열 형식): `load.multiatlas(key, json, path)` 사용
- 일반 atlas: `load.atlas(key, image, json)` 사용

##20260407 하던 작업
 ● Bash(sed -n '440,480p' /workspaces/pokemon-battle/pokerogue_codes/src/battle-scene.ts)
  ⎿    }

       update() {
     … +38 lines (ctrl+o to expand)

● Bash(file /workspaces/pokemon-battle/assets/pokerogue/arenas/grass_bg.png /workspaces/pokemon-battle/assets/pokerogue/arenas/grass_a.png
      /workspaces/pokemon-battle/a…)
  ⎿  Error: Exit code 1
     /workspaces/pokemon-battle/assets/pokerogue/arenas/grass_bg.png: PNG image data, 320 x 180, 4-bit colormap, non-interlaced
     /workspaces/pokemon-battle/assets/pokerogue/arenas/grass_a.png:  PNG image data, 320 x 132, 4-bit colormap, non-interlaced
     /workspaces/pokemon-battle/assets/pokerogue/arenas/grass_b.png:  PNG image data, 320 x 132, 4-bit colormap, non-interlaced
     [rerun: b57]

● Bash(python3 -c "
      import struct, zlib…)
  ⎿  Cancelled: parallel tool call Bash(file /workspaces/pokemon-battle/assets/p…) errored

  Searched for 4 patterns, listed 1 directory (ctrl+o to expand)

● Bash(sed -n '605,640p' /workspaces/pokemon-battle/pokerogue_codes/src/battle-scene.ts)
  ⎿          this.arenaFlyout,
             this.pokemonInfoContainer,
           ])
     … +33 lines (ctrl+o to expand)

  Searched for 2 patterns (ctrl+o to expand)

● Bash(sed -n '340,360p' /workspaces/pokemon-battle/pokerogue_codes/src/phases/encounter-phase.ts)
  ⎿        }
         }
     … +17 lines (ctrl+o to expand)

  Searching for 8 patterns, reading 1 file… (ctrl+o to expand)
  ⎿  pokerogue_codes/src/ui/battle-info/battle-info.ts

● Bash(sed -n '213,270p' /workspaces/pokemon-battle/pokerogue_codes/src/ui/battle-info/battle-info.ts)
  ⎿    constructor(x: number, y: number, player: boolean, posParams: BattleInfoParamList) {
         super(globalScene, x, y);
         this.baseY = y;
     … +51 lines (ctrl+o to expand)

  Searched for 5 patterns (ctrl+o to expand)

● Let me look at the arena images more carefully:

● Bash(python3 << 'EOF'
      import struct, zlib…)
  ⎿  grass_bg.png:
       Size: 320x180, bit_depth=4, color_type=3
     … +5 lines (ctrl+o to expand)

● Bash(cat /workspaces/pokemon-battle/assets/pokerogue/ui/bg.json | python3 -c "import sys,json; d=json.load(sys.stdin); [print(k, v) for k,v in
      d.get('frames',{}).ite…)
  ⎿  (No output)

● Bash(python3 -c "
      import json…)
  ⎿  keys: ['textures', 'meta']
     texture: bg.png
       frame: {'filename': '1', 'rotated': False, 'trimmed': False, 'sourceSize': {'w': 320, 'h': 48}, 'spriteSourceSize': {'x': 0, 'y': 0, 'w': 320, 'h':
     … +9 lines (ctrl+o to expand)

  Searched for 11 patterns, read 1 file (ctrl+o to expand)

● Bash(sed -n '12,50p' /workspaces/pokemon-battle/pokerogue_codes/src/ui/containers/pokeball-tray.ts)
  ⎿    constructor(player: boolean) {
         super(globalScene, player ? globalScene.scaledCanvas.width : 0, player ? -72 : -144);
         this.player = player;
     … +36 lines (ctrl+o to expand)

  Searched for 1 pattern (ctrl+o to expand)

● Bash(sed -n '5960,5980p' /workspaces/pokemon-battle/pokerogue_codes/src/field/pokemon.ts)
  ⎿        } else {
             this.moveset = [];
           }
     … +18 lines (ctrl+o to expand)

  Searched for 1 pattern (ctrl+o to expand)

● Bash(sed -n '319,360p' /workspaces/pokemon-battle/pokerogue_codes/src/field/pokemon.ts)
  ⎿    constructor(
         x: number,
         y: number,
     … +39 lines (ctrl+o to expand)

● Bash(sed -n '5925,5945p' /workspaces/pokemon-battle/pokerogue_codes/src/field/pokemon.ts)
  ⎿  Running…
  ⎿    constructor(
         species: PokemonSpecies,
         level: number,
     … +18 lines (ctrl+o to expand)

● Bash(sed -n '6470,6490p' /workspaces/pokemon-battle/pokerogue_codes/src/field/pokemon.ts)
  ⎿    constructor(
         species: PokemonSpecies,
         level: number,
     … +18 lines (ctrl+o to expand)

  Searched for 1 pattern, read 2 files (ctrl+o to expand)

● Now I have a complete picture. The root cause of all 4 visual issues is that LOGICAL_HEIGHT = 240 should be 180 (matching PokeRogue's logical coordinate
  system: 1920/6=320, 1080/6=180). Everything is 60px off because of this. Let me fix all the issues:

  Searched for 1 pattern (ctrl+o to expand)

● Now I have all the data. The root fix is LOGICAL_HEIGHT = 180 (not 240) to match PokeRogue's 1920/6=320 × 1080/6=180 coordinate space. This fixes all 4
  issues simultaneously:

● Update(src/pokerogue-transplant-runtime/runtime/constants.js)
  ⎿  Added 3 lines, removed 3 lines
       1  export const PHASER_IMPORT_PATH = '../node_modules/phaser/dist/phaser.esm.js';
       2  
       3  export const LOGICAL_WIDTH = 320;
       4 -export const LOGICAL_HEIGHT = 240;                                                                                                            
       4 +export const LOGICAL_HEIGHT = 180;                                                                                                            
       5  
       6  export const ARENA_OFFSETS = Object.freeze({
       7 -  enemy: { x: -47, y: 60 },                                                                                                                   
       8 -  player: { x: 50, y: 60 },                                                                                                                   
       7 +  enemy: { x: 20, y: 0 },                                                                                                                     
       8 +  player: { x: 0, y: 0 },                                                                                                                     
       9  });
      10  
      11  export const UI_ASSETS = Object.freeze({

● Now fix ui.js layout() with correct positions derived from PokeRogue's fieldUI coordinates (fieldUI at y=1080, scale 6 → divide display position by 6):

● Update(src/pokerogue-transplant-runtime/ui/ui.js)
  ⎿  Added 10 lines, removed 8 lines
      190    }
      191  
      192    layout() {
      193 -    this.enemyTray.container?.setPosition(0, 96);                                                                                            
      194 -    this.playerTray.container?.setPosition(320, 168);                                                                                        
      195 -    this.enemyInfo.container?.setPosition(140, 99);                                                                                          
      196 -    this.playerInfo.container?.setPosition(310, 168);                                                                                        
      193 +    // Positions derived from PokeRogue fieldUI coords (fieldUI at y=1080, scale 6):                                                         
      194 +    // absolute canvas pos / 6 = our logical pos; y = (1080 + localY*6) / 6 = 180 + localY                                                   
      195 +    this.enemyTray.container?.setPosition(0, 36);      // PokeRogue: (0, -144) in fieldUI                                                    
      196 +    this.playerTray.container?.setPosition(320, 108);  // PokeRogue: (scaledCanvas.width, -72) in fieldUI                                    
      197 +    this.enemyInfo.container?.setPosition(140, 39);    // PokeRogue: EnemyBattleInfo(140, -141)                                              
      198 +    this.playerInfo.container?.setPosition(310, 108);  // PokeRogue: PlayerBattleInfo(scaledCanvas.width-10, -72)                            
      199      if (this.enemySprite) {
      198 -      this.enemySprite.anchor.setPosition(216, 132);                                                                                         
      199 -      this.enemySprite.dom.setPosition(216, 132);                                                                                            
      200 +      this.enemySprite.anchor.setPosition(236, 84);    // PokeRogue: EnemyPokemon super(236, 84)                                             
      201 +      this.enemySprite.dom.setPosition(236, 84);                                                                                             
      202        this.env.applyHostBox(this.enemySprite.host, 72, 72);
      203      }
      204      if (this.playerSprite) {
      203 -      this.playerSprite.anchor.setPosition(104, 184);                                                                                        
      204 -      this.playerSprite.dom.setPosition(104, 184);                                                                                           
      205 +      this.playerSprite.anchor.setPosition(106, 148);  // PokeRogue: PlayerPokemon super(106, 148)                                           
      206 +      this.playerSprite.dom.setPosition(106, 148);                                                                                           
      207        this.env.applyHostBox(this.playerSprite.host, 88, 88);
      208      }
      209    }

● Now let me verify the fight-ui-handler and party-ui-handler aren't impacted negatively — they use env.LOGICAL_HEIGHT so they automatically update. Let me
  also check the level-up stats panel coordinates in battle-message-ui-handler to make sure they still look right:

  Searched for 2 patterns (ctrl+o to expand)

● Bash(sed -n '588,602p' /workspaces/pokemon-battle/pokerogue_codes/src/battle-scene.ts)
  ⎿        .setup();

         this.fieldUI
     … +12 lines (ctrl+o to expand)

● Let me check HP bar parameters from PokeRogue to verify our positioning:

● Bash(sed -n '45,65p' /workspaces/pokemon-battle/pokerogue_codes/src/ui/battle-info/enemy-battle-info.ts)
  ⎿  Running…
  ⎿    constructor() {
         const posParams: BattleInfoParamList = {
           nameTextX: -124,
     … +18 lines (ctrl+o to expand)

● Bash(sed -n '30,50p' /workspaces/pokemon-battle/pokerogue_codes/src/ui/battle-info/player-battle-info.ts)
  ⎿    constructor() {
         const posParams: BattleInfoParamList = {
           nameTextX: -115,
     … +17 lines (ctrl+o to expand)

  Read 1 file (ctrl+o to expand)

● Bash(python3 -c "
      import struct…)
  ⎿  overlay_hp.png: 48x6
     overlay_hp_boss.png: 86x12
     pbinfo_player.png: 130x42
     pbinfo_enemy_mini.png: 130x31

● Bash(python3 -c "
      import json…)
  ⎿  high {'x': 0, 'y': 0, 'w': 48, 'h': 2} {'w': 48, 'h': 2}
     medium {'x': 0, 'y': 2, 'w': 48, 'h': 2} {'w': 48, 'h': 2}
     low {'x': 0, 'y': 4, 'w': 48, 'h': 2} {'w': 48, 'h': 2}

● Let me verify all the changes look correct:

  Searched for 2 patterns (ctrl+o to expand)
  ⎿  You've hit your limit · resets 2pm (UTC)

✻ Cogitated for 21m 21s · 1 shell still running