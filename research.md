# Animated Pokemon System 조사 + 현재 코드 정밀 분석

작성일: 2026-04-11 (UTC)  
요청 범위:  
1. GitBook `Animated Pokemon System` 섹션 상세 조사  
2. 현재 레포의 관련 코드 동작을 줄단위로 추적 분석  
3. 구현 변경 없이 `research.md` 문서화

---

## 1) GitBook 문서 상세 조사

조사한 원문:
- https://lucidious89-tutorials.gitbook.io/deluxe-battle-kit-tutorial/deluxe-battle-kit-for-v21.1/add-on-tutorials/animated-pokemon-system
- https://lucidious89-tutorials.gitbook.io/deluxe-battle-kit-tutorial/deluxe-battle-kit-for-v21.1/add-on-tutorials/animated-pokemon-system/animated-pokemon-sprites
- https://lucidious89-tutorials.gitbook.io/deluxe-battle-kit-tutorial/deluxe-battle-kit-for-v21.1/add-on-tutorials/animated-pokemon-system/animated-dynamic-sprite-effects
- https://lucidious89-tutorials.gitbook.io/deluxe-battle-kit-tutorial/deluxe-battle-kit-for-v21.1/add-on-tutorials/animated-pokemon-system/animated-ui-sprites
- https://lucidious89-tutorials.gitbook.io/deluxe-battle-kit-tutorial/deluxe-battle-kit-for-v21.1/add-on-tutorials/animated-pokemon-system/animated-sprite-editor
- https://lucidious89-tutorials.gitbook.io/deluxe-battle-kit-tutorial/deluxe-battle-kit-for-v21.1/add-on-tutorials/animated-pokemon-system/animated-mid-battle-scripting

### 1.1 메인 페이지(Section 7.I) 핵심

- 플러그인 다운로드가 `스크립트`와 `스프라이트 묶음`으로 분리되어 있음.
- 기능 범주:
  - 스프라이트 전역/개별 스케일
  - 애니메이션 속도 제어
  - 애니메이티드 그림자
  - Super Shiny Hue
  - 모자이크 폼 변경
  - Substitute 인형 연출
  - 상태 이상 오버레이
  - Mid-battle scripting 연동
- 기본적으로 애니메이션이 켜져 있고, 옵션 메뉴에서 OFF 가능.
- 애니메이션 OFF면 바닐라의 “sprite bobbing”을 다시 켜는 흐름을 설명.

### 1.2 `Animated: Pokemon Sprites` (Section 7.I.1)

#### 스프라이트 시트 규칙
- 애니메이션 스트립은 `가로로 프레임이 이어진 형태`.
- `한 프레임의 가로 == 전체 높이`인 정사각 프레임 기준.
- 예시: 높이 96, 10프레임 => 전체 960x96.

#### 스케일링
- 전역 설정:
  - `FRONT_BATTLER_SPRITE_SCALE`
  - `BACK_BATTLER_SPRITE_SCALE`
- PBS 개별 설정:
  - `FrontSprite = x,y,scale`
  - `BackSprite = x,y,scale`
- 세 번째 숫자는 개별 종/폼 스케일 오버라이드.

#### 애니메이션 속도
- 문서 기준 속도 값:
  - `0` 정지
  - `1` 빠름
  - `2` 보통
  - `3` 느림
  - `4` 매우 느림
- 전역 지연식 설명:
  - `((speed / 2) * delay) / 1000`
  - `delay`는 `ANIMATION_FRAME_DELAY` (기본 90)
- PBS 개별 설정:
  - `AnimationSpeed = n`
  - `AnimationSpeed = back,front`

#### 그림자 메트릭
- `ShadowSprite = x,backY,frontY` (핵심)
- `ShadowSize`:
  - 문서상 -9~9 허용
  - 0이면 숨김
- `ShadowX`는 더 이상 실사용되지 않는다고 명시.

### 1.3 `Animated: Dynamic Sprite Effects` (Section 7.I.2)

- 모자이크 폼 변경/변신 연출.
- 반무적(Fly/Dig/Dive 등) 상태 시 본체 숨김/그림자 처리.
- Substitute 인형 생성/표시/해제/파괴 애니메이션.
- `Battle::Scene#pbAnimateSubstitute(idxBattler, mode, delay=false)` 소개.
- `SUBSTITUTE_DOLL_METRICS` 설정값으로 대타 인형 Y 위치 튜닝.
- 종 특이 연출:
  - Sudowoodo: 기본 정지 + 조건부 wiggle
  - Klink 계열: Shift Gear 후 역방향 애니메이션 토글
- 조건 기반 속도 변화:
  - 저체력, 상태이상, 스피드 랭크, mid-battle 명령 반영
- Super Shiny:
  - `SuperShinyHue = -255..255` 지원
- Spinda 점 패턴 처리 특례 설명.

### 1.4 `Animated: UI Sprites` (Section 7.I.3)

- UI(도감/요약/박스)에서 자동 위치 보정(auto-positioner).
- 수동 보정:
  - `POKEMON_UI_METRICS` 해시로 종별 XY 오프셋 지정.
- UI 클리핑/제한:
  - `sprite.display_values = [x, y, constrictX, constrictY]`
  - `CONSTRICT_POKEMON_SPRITES`로 전체 끄기 가능.

### 1.5 `Animated: Sprite Editor` (Section 7.I.4)

- 이 플러그인 메트릭은 바닐라 Essentials와 완전 호환이 아님.
- 최초 설치 후 **반드시 재컴파일** 요구.
- 메트릭 파일(문서 기준):
  - `pokemon_metrics.txt`
  - `pokemon_metrics_forms.txt`
  - `pokemon_metrics_female.txt`
  - `pokemon_metrics_gmax.txt`
  - `pokemon_metrics_Gen_9_Pack.txt`
- 문서상 `Gen 9 Pack` 미설치면 해당 파일 삭제 권장.[^gen9merge]

#### female 전용 메트릭
- `[SPECIES,,female]`
- `[SPECIES,FORM,female]`
- `_female` 파일명 자산을 별도 메트릭으로 분기하는 컨셉.

#### 파라미터 변화(문서 설명)
- `BackSprite`, `FrontSprite`: 3번째 숫자(scale) 지원
- `ShadowX`: 실질 폐기
- `ShadowSize`: optional + -9..9
- 신규:
  - `ShadowPosition`(문서 텍스트)
  - `AnimationSpeed`
  - `SuperShinyHue`

### 1.6 `Animated: Mid-Battle Scripting` (Section 7.I.5)

- 명령 키:
  - `"spriteSpeed" => 0..4`
  - `"spriteReverse" => true/false`
  - `"spriteHue" => -255..255`
- 하드코딩 참고 API:
  - `GameData::Species#has_gendered_sprites?`
  - `GameData::Species#shows_shadow?`
  - `GameData::SpeciesMetrics` 관련 접근자
  - `Battle::Scene#pbGetBattlerSprites`
  - `Battle::Scene#pbAnimateSubstitute`
  - `Battle::Battler#airborneOffScreen?` 등
  - `Battle::Scene::BattlerSprite`의 `speed/reversed/hue`

---

## 2) 현재 레포 자산/파일 상태 (요청 시점)

### 2.1 PBS 파일 실재
- `assets/Pokemon/PBS/pokemon_metrics.txt` (5869 lines)
- `assets/Pokemon/PBS/pokemon_metrics_forms.txt` (956 lines)
- `assets/Pokemon/PBS/pokemon_metrics_female.txt` (78 lines)
- `assets/Pokemon/PBS/pokemon_metrics_gmax.txt` (189 lines)
- `assets/Pokemon/PBS/pokemon_metrics_Gen_9_Pack.txt` **없음**

### 2.2 자산 폴더 구조
- `assets/Pokemon/Front`
- `assets/Pokemon/Back`
- `assets/Pokemon/Front shiny`
- `assets/Pokemon/Back shiny`
- `assets/Pokemon/Icons`
- `assets/Pokemon/Icons shiny`
- `assets/Pokemon/PBS`

### 2.3 manifest
- `assets/manifest.json`은 1라인(minified JSON) 형태.
- `pokemon.front/back` 배열에 스프라이트 ID 목록이 있음.

### 2.4 각주(Gen 9 Pack 통합) 확인 결과
- 각주 내용: `Gen 9 pack을 pokemon_metrics.txt에 합체시킴`.
- 확인 결과:
  - `pokemon_metrics_Gen_9_Pack.txt`는 실제로 없음.
  - 대신 `pokemon_metrics.txt` 안에 Gen 9 계열 헤더가 존재함:
    - `SPRIGATITO`, `FLORAGATO`, `MEOWSCARADA`
    - `MIRAIDON`, `KORAIDON`
    - `OGERPON`, `TERAPAGOS`
- 결론:
  - 현재 자산 구성에서는 각주 내용이 타당함.
  - 런타임 로더는 없는 `pokemon_metrics_Gen_9_Pack.txt`를 시도 후 무시(`catch`)하므로 치명적 문제는 아님.

### 2.5 플러그인 원본 스크립트 폴더 상태
- 레포에 `Assets_Plugins/[DBK_009] Animated Pokemon System/*.rb` 파일이 존재함(현재 git untracked 상태).
- 포함 파일:
  - `[000] Settings.rb`
  - `[001] Compiler.rb`
  - `[002] Sprite Editor.rb`
  - `[003] Pokemon UI.rb`
  - `[004] Game Data.rb`
  - `[005] Pokemon Sprites.rb`
  - `[006] Battler Sprites.rb`
  - `[007] Substitute Doll.rb`
  - `[008] Deluxe Bitmap.rb`
  - `[009] Deluxe Additions.rb`
  - `[010] Spinda Spots.rb`
  - `meta.txt`
- 현재 웹 런타임 코드(`src/`, `server/`, `scripts/`, `index.html`)에서는 해당 Ruby 플러그인 폴더를 참조하지 않음.
- 해석:
  - 현 프로젝트 실행 경로는 “Essentials Ruby 플러그인 직접 실행”이 아니라, JS 런타임이 PBS/manifest를 읽어 자체 렌더링하는 구조.
  - 따라서 GitBook의 Ruby API/기능을 전부 동일하게 기대하면 불일치가 발생할 수 있음.

---

## 3) 현재 코드의 전체 호출 흐름 (Sprite + PBS)

1. 부트스트랩
- `src/app.js:6753` `loadManifest()`
- `src/app.js:6754` `detectAssetBases()`
- `src/app.js:6758` `buildAssetDex()`

2. 배틀 렌더 진입
- `src/app.js:6502` `renderBattle()`
- `src/app.js:6505` `normalizeBattleSpriteState(battle)`로 spriteId 정규화

3. Phaser 경로(주 경로)
- `src/app.js:6462` `syncPhaserBattleRenderer(battle)`
- `src/app.js:6476` `buildPkbPokerogueUiModel(battle)`로 `enemySprite.url/playerSprite.url` 생성
- `src/pokerogue-transplant-runtime/runtime/controller.js`가 scene에 모델 전달
- `src/pokerogue-transplant-runtime/ui/ui.js:241,244`에서 `renderBattlerToPhaser`
- `src/pokerogue-transplant-runtime/scene/battle-shell-scene.js:126` `renderBattlerSprite()`
- `src/pokerogue-transplant-runtime/runtime/pokemon-metrics.js`로 PBS 메트릭 조회

4. Phaser 실패 시 DOM fallback
- `src/app.js:6515-6525` fallback 렌더
- `src/app.js:6552` `renderAnimatedSprite()` 호출
- 이 경로는 PBS 메트릭을 사용하지 않고 고정 interval로 프레임만 순회

---

## 4) 관련 코드 줄단위 정밀 분석

아래는 요청하신 “한줄씩” 관점으로, 실제 동작에 직접 영향 있는 라인들을 함수 단위로 전개한 분석입니다.

## 4.1 `src/pokerogue-transplant-runtime/runtime/pokemon-metrics.js`

### A) 파일/캐시/키 생성
- `L18-L24`: 로드할 PBS 파일 목록 정의. 마지막 2개는 확장 팩 호환용.
- `L26-L27`: 단일 런타임 캐시(`metricsCache`)와 in-flight Promise(`metricsLoadPromise`)를 둬 중복 fetch 방지.
- `L30`: `headerToKey` 시작.
- `L31`: 대괄호 제거.
- `L32`: 쉼표 분리 후 trim.
- `L33-L35`: species/form/gender 파트 추출.
- `L36-L39`: `SPECIES[_FORM][_GENDER]` 형태 키 생성.

### B) 단일 파일 파서
- `L43`: 결과 Map.
- `L44-L45`: 현재 섹션 키/값 보관 변수.
- `L47`: 줄 단위 순회.
- `L48`: trim.
- `L49`: 빈 줄/주석 skip.
- `L51`: 새 섹션(`[HEADER]`) 시작 조건.
- `L52`: 이전 섹션 commit.
- `L53`: 헤더를 lookup key로 변환.
- `L54`: 현재 섹션 객체 초기화.
- `L58`: 섹션 밖 라인은 무시.
- `L60-L61`: `=` 없으면 무시.
- `L63`: 좌변 키.
- `L64`: 우변 숫자 배열 파싱.
- `L67-L71`: `FrontSprite` => `frontX/frontY/frontScale`.
- `L72-L76`: `BackSprite` => `backX/backY/backScale`.
- `L77-L81`: `ShadowSprite` => `shadowX/shadowBackY/shadowFrontY`.
- `L82-L84`: `ShadowSize`.
- `L85-L88`: `AnimationSpeed`; 1개면 front/back 동일, 2개면 분리.
- `L91`: 마지막 섹션 commit.

### C) 로더
- `L96-L99`: 캐시/진행중 Promise 재사용.
- `L100-L114`: 실제 로딩 Promise 생성.
- `L101`: 병합 Map 생성.
- `L102-L111`: 각 파일 fetch를 `allSettled`로 병렬 처리.
- `L105`: fetch.
- `L106`: HTTP 비정상 응답은 해당 파일 스킵.
- `L108`: 파싱 결과를 `combined.set(k,v)`로 덮어쓰기 병합(뒤 파일 우선).
- `L109`: 예외 무시(파일 없음 포함).
- `L112-L113`: 캐시 저장 후 반환.
- `L116`: 최종 Promise 반환.

### D) spriteId -> metrics 해석
- `L121-L123`: 입력/맵 유효성 검사 후 ID를 대문자화.
- `L126`: 완전 일치 우선.
- `L129`: `_` 기준 분해.
- `L130-L133`: 끝 토큰을 하나씩 줄여가며 fallback 매칭.
- `L135`: 모두 실패하면 `null`.

## 4.2 `src/pokerogue-transplant-runtime/scene/battle-shell-scene.js`

### A) create 시점 준비
- `L55-L57`: PBS 메트릭 비동기 로드 시작. 아직 안 끝나도 렌더는 진행.
- `L59-L60`: enemy/player 마운트 생성.
- `L61-L63`: UI 객체가 mount를 사용.

### B) mount 생성
- `L97-L99`: 그림자를 ellipse로 생성(초기 비표시).
- `L101-L104`: 실제 battler image(placeholder texture) 생성.
- `L106-L120`: `mount` 객체 구성.
- `L114-L118`: `dom.setVisible` shim 제공(파티 UI와 호환).

### C) 핵심: `renderBattlerSprite` (L126~L229)
- `L127`: 모델에서 `url` 획득.
- `L128-L134`: URL이 없으면 애니머/스프라이트/그림자 모두 정리.
- `L136`: 현재 URL과 동일하면 재로딩 생략.
- `L137-L138`: URL 갱신 + 타이머 정리.
- `L140`: 텍스처 key를 mount 이름별로 고정.
- `L145-L147`: placeholder로 바꾼 뒤 기존 텍스처 제거.
- `L149-L154`: 이미지 로딩 Promise.
- `L157`: 대기 중 URL 바뀌면 중단.
- `L160-L161`: `frameH=img.height`, `frameCount=img.width/frameH` 추정.
- `L164-L168`: Phaser texture + frame 등록.
- `L172`: 파일명에서 spriteId 추출.
- `L173`: `getMetricsForSprite(spriteId, this.pokemonMetrics)` 조회.
- `L174`: enemy면 front 기준, player면 back 기준.
- `L177-L178`: `baseX/baseY` (ui.js에서 잡아둔 기준점) 사용.
- `L181-L183`: front/back별 offset + scale 결정.
- `L185-L189`: 텍스처/스케일/좌표 적용 후 표시.
- `L192-L194`: shadow 좌표 계산.
- `L195-L197`: shadow 표시 조건(`undefined` or `>0`만 표시).
- `L198-L203`: 표시 시 ellipse 크기/좌표 설정.
- `L208-L210`: 애니메이션 속도에서 delay 계산(`120*(2/speed)`).
- `L212-L222`: 프레임 타이머 루프 생성.
- `L223-L228`: 에러 시 숨김 처리.

### D) layout 연동
- `L262-L268`: scene layout에서 UI layout 호출.
- `L270-L273`: renderModel 때 UI가 sprite 렌더 호출.

## 4.3 `src/pokerogue-transplant-runtime/ui/ui.js` (sprite 좌표의 출처)

- `L67-L70`: enemy/player mount 주입.
- `L212-L217`: enemy sprite 기준점 `(216,84)` + `baseX/baseY` 저장.
- `L218-L222`: player sprite 기준점 `(106,148)` + `baseX/baseY` 저장.
- `L241`: enemy spriteModel을 scene 렌더러에 전달.
- `L244`: player spriteModel 전달.

## 4.4 `src/app.js` (자산 매핑/ID 결정/URL 생성)

### A) 상태 기본값
- `L1424`: 기본 포켓몬 자산 루트는 `./assets/Pokemon`.

### B) 자산 패밀리 파싱
- `L374`: `normalizeAssetFamilyKey`는 `toId().toUpperCase()`.
- `L388`: `parseAssetFamilies` 시작.
- `L390-L391`: manifest ID 순회.
- `L394`: `SNEASEL_1_female` 같은 “숫자폼+성별” ID는 **의도적으로 무시**.
- `L395`: base + suffix(`female|male|number`) 파싱.
- `L400-L406`: family 구조 생성.
- `L409`: rawAssetIds 누적.
- `L410-L412`: base 존재/숫자폼/성별 자산 분류.
- `L415`: 정렬.

### C) 종-자산 매핑 구성 (`buildAssetDex`)
- `L445-L449`: manifest/dex 없으면 종료.
- `L452-L454`: front/back 동시 존재 ID만 usable로 채택.
- `L455`: front 기반 family 구성.
- `L459-L465`: Dex의 baseSpecies 그룹/lookup 구축.
- `L474`: 자산 family 단위 루프 시작.
- `L475`: assetBaseId를 실제 species명으로 역해석.
- `L477`: 지원되지 않는 종 스킵.
- `L478-L490`: 폼 목록 정렬 및 수동/자동/숨김 분류.
- `L491-L492`: `speciesToAsset`, `assetToSpecies` 준비.
- `L494-L497`: base sprite 존재 시 base species 매핑.
- `L499-L511`: 숫자 suffix 자산을 폼 순서에 매핑.
- `L513-L521`: `FORM_ASSET_OVERRIDES` 우선 덮어쓰기.
- `L523-L529`: 단일 unresolved 폼 특수 fallback.
- `L531-L534`: 역맵 재구축.
- `L536-L559`: 모든 폼 choice 메타 생성.
- `L560-L563`: 수동 선택/검색 가능 폼 추출.
- `L564-L567`: base asset 없으면 fallback 검사.
- `L570-L592`: UI에 보여줄 assetChoices 구성(base/숫자/성별).
- `L594-L605`: family 객체 완성.
- `L606-L617`: species별 familyBySpecies/speciesToAsset/allSpeciesChoices 채움.
- `L620-L630`: base choice 목록 생성/정렬.
- `L632-L636`: state 반영.

### D) family 조회와 species 정규화
- `L638-L644`: `getFamilyForSpecies`는 로컬라이즈 입력 정규화 후 family 반환.
- `L646-L662`: `resolveSpeciesSelection`은 species/base/family를 묶어 반환.

### E) spriteId 자동 결정/폼 전환
- `L795-L804`: `getAutoSpriteIdForSpecies`.
  - base species/폼 매핑에서 assetId 획득.
  - 성별 자산 적용은 `resolvedSpecies == baseSpecies`일 때만 적용(`L800`).
- `L806-L811`: `syncMonSprite`가 autoId를 `spriteId`에 동기화.
- `L944-L960`: `applyBattleFormChange`가 폼 변경 후 spriteAutoId/spriteId 재설정.

### F) 경로 생성 및 전투 렌더용 spriteId 결정
- `L3227-L3231`: `spritePath(spriteId,facing,shiny)`가 Front/Back 경로 조합.
- `L3233-L3236`: `iconPath`는 파일명 대문자 강제.
- `L3244-L3253`: `doesSpriteIdMatchSpeciesFamily`로 spriteId가 family 유효 범위인지 검사.
- `L3254-L3271`: `resolveBattleRenderSpriteId` 우선순위 결정
  - 변신폼 exact auto
  - 메가/프라이멀/울트라 snapshot
  - 현재 candidate
  - 최종 fallback
- `L3272-L3280`: `normalizeBattleMonSprite`가 실제 mon 객체에 반영.
- `L3304-L3310`: `normalizeBattleSpriteState`가 배틀 전체 팀에 적용.

### G) Phaser 모델 구성 + 렌더 진입
- `L6352-L6399`: `buildPkbPokerogueUiModel`
  - `enemySprite.url`(`L6388`)
  - `playerSprite.url`(`L6392`)
  - 둘 다 `resolveBattleRenderSpriteId` + `spritePath` 결과 사용
- `L6462-L6480`: `syncPhaserBattleRenderer`가 model을 Phaser 컨트롤러에 전달.
- `L6502-L6505`: `renderBattle` 시작 시 sprite state normalize.
- `L6515`: Phaser 렌더 sync 시도.
- `L6517-L6525`: 실패 시 DOM fallback.

### H) 부트스트랩
- `L6753`: manifest 로드.
- `L6754`: 자산 루트 탐지.
- `L6758`: assetDex 빌드(이후 sprite 매핑의 기반).

## 4.5 `src/pokerogue-transplant-runtime/runtime/controller.js`

- `L141-L147`: `show(model)`에서 scene 준비 후 `scene.renderModel(model)` 호출.
- 즉, app.js에서 만든 `enemySprite.url/playerSprite.url`가 최종 scene까지 전달되는 다리 역할.

## 4.6 `src/pokerogue-transplant-runtime/runtime/sprite-host.js` (fallback 유틸 성격)

- `L41-L111`: DOM host용 캔버스 애니메이터.
- 고정 120ms 프레임 전환(`L88-L90`) 사용.
- PBS 메트릭/그림자/폼별 좌표 해석은 없음.

---

## 5) GitBook 기준과 현재 구현의 대응표

| 항목 | GitBook 문서 | 현재 코드 상태 |
|---|---|---|
| `FrontSprite/BackSprite` XY | 지원 | 지원 (`pokemon-metrics.js` + `battle-shell-scene.js`) |
| `FrontSprite/BackSprite` scale(3번째 값) | 지원 | 부분 지원 (3번째 값이 있으면 적용되지만, 값이 없을 때 DBK 기본값 `front=2/back=3` 대신 `1`로 처리됨) |
| `AnimationSpeed` | 지원 | 지원하나 해석식/속도 방향이 문서와 다름(아래 갭 참고) |
| `ShadowSprite` | 지원 | 지원 |
| `ShadowSize` -9..9 스케일 | 지원 | 부분 지원(실제는 `undefined`/`>0`만 표시, 크기 스텝도 제한적) |
| 플레이어측 그림자 표시 토글(`SHOW_PLAYER_SIDE_SHADOW_SPRITES`) | 지원 | 미구현(플레이어측도 동일 규칙으로 그림자를 그림) |
| `SuperShinyHue` | 지원 | 미구현(파서/렌더 경로에 없음) |
| `_female` 전용 메트릭 | 지원 | base gender는 일부 반영, `숫자폼+female` 경로는 자산 매핑에서 사실상 배제 |
| `pokemon_metrics_Gen_9_Pack.txt` | 호환 파일 언급 | 로더는 시도하지만 현재 파일 없음(무시됨) |

---

## 6) 현재 PBS 활용 시 실제 동작 규칙 (이 코드 기준)

### 6.1 어떤 키가 실제로 읽히는가

`pokemon-metrics.js`가 읽는 키는 현재 아래 5개뿐:
- `FrontSprite`
- `BackSprite`
- `ShadowSprite`
- `ShadowSize`
- `AnimationSpeed`

문서에 있는 `SuperShinyHue`, `ShadowPosition`은 현재 런타임 경로에서 읽지 않음.

### 6.2 파일 우선순위(덮어쓰기)

로딩 순서:
1. `pokemon_metrics.txt`
2. `pokemon_metrics_forms.txt`
3. `pokemon_metrics_female.txt`
4. `pokemon_metrics_Gen_9_Pack.txt` (없으면 스킵)
5. `pokemon_metrics_gmax.txt`

뒤 파일이 같은 키를 만나면 앞 값을 덮어씀.

### 6.3 헤더 키 변환 규칙

`[SPECIES,FORM,GENDER] -> SPECIES_FORM_GENDER` 식으로 내부 키화됨.  
예:
- `[SNEASEL] -> SNEASEL`
- `[SNEASEL,1] -> SNEASEL_1`
- `[SNEASEL,,female] -> SNEASEL_female`
- `[SNEASEL,1,female] -> SNEASEL_1_female`

---

## 7) 중요 갭/리스크 (실사용 관점)

1. `AnimationSpeed` 속도 방향 불일치 가능성
- 문서: `1` 빠름, `3/4` 느림
- 현재 Phaser 계산: `delay = 120 * (2 / speed)`  
  -> `1`이 더 느려지고, `4`가 더 빨라짐.

2. `ShadowSize` 해석 축소
- 문서: -9..9 범위 스케일 조절
- 현재: `shadowSize === undefined || shadowSize > 0`만 표시  
  -> 음수(`-1/-2/-3`)도 숨김 처리됨.

3. `FrontSprite/BackSprite` 기본 스케일 불일치
- DBK 기본값: `FRONT_BATTLER_SPRITE_SCALE = 2`, `BACK_BATTLER_SPRITE_SCALE = 3`
- 현재: metrics 3번째 값이 없으면 `1`로 렌더됨.
- 실제 PBS에서 scale 지정 비율:
  - `FrontSprite`: 1342개 중 3개만 scale 명시
  - `BackSprite`: 1342개 중 7개만 scale 명시
  - 즉, 대부분 엔트리는 DBK 기본값 의존 구조인데 현재 런타임과 기본값이 다름.

4. 플레이어측 그림자 토글(`SHOW_PLAYER_SIDE_SHADOW_SPRITES`) 미반영
- DBK 기본은 `false`로 플레이어측 그림자를 숨기는 설계.
- 현재 Phaser 경로는 front/back 공통 조건으로 그림자를 표시.

5. `SuperShinyHue` 미사용
- 문서에서 강조된 파라미터지만 현재 파서/렌더 경로에 없음.

6. `숫자폼 + female` 자산 경로가 매핑에서 제외
- `parseAssetFamilies`가 `*_숫자_female`를 의도적으로 skip.
- 결과적으로 `[SNEASEL,1,female]` 같은 문서 패턴이 자산 ID 결정 로직에서 온전히 연결되지 않을 수 있음.

7. 대소문자 키 리스크
- `getMetricsForSprite`는 spriteId를 대문자화해서 조회.
- PBS 헤더가 `NIDORANfE`, `NIDORANmA`처럼 혼합 대소문자면 키 불일치 가능.

8. Phaser 실패 시 fallback 경로는 PBS 무시
- DOM fallback 애니메이션(`renderAnimatedSprite`)은 메트릭 미적용.

---

## 8) 동작 점검 결과 (실행 검증 포함)

### 8.1 배틀 런타임 회귀 스크립트

실행 (2026-04-11 UTC 재실행):
- `npm run verify:stage22`
- `npm run verify:passb`

결과:
- `verify:stage22` => `Overall: PASS`
  - 메가/프라이멀/울트라/Z-Move 흐름 + 스냅샷 spriteId 검증 통과
  - 예: `KYOGRE_1`, `GROUDON_1`, `NECROZMA_3` 스냅샷 및 자산 존재 확인 OK
- `verify:passb` => `Summary: 9/9 checks passed`
  - 폼 연동(실바디/켈디오/아르세우스/게노세크트 포함) 검증 통과

판정:
- 전투 핵심 경로(폼 변경 + spriteId 동기화 + 자산 존재)는 현재 코드에서 정상 동작으로 판단 가능.
- 동일 스크립트 재실행에서도 결과가 변하지 않아 회귀 안정성은 유지됨.

### 8.2 메트릭 커버리지 정량 점검

`manifest.pokemon.front` 기준(총 1633개, `000` 제외):
- exact 매칭: 1325 (81.14%)
- fallback 매칭: 278 (17.02%)
- miss: 30 (1.84%)

miss 30개 구성:
- `STUDIOPROP*` 28개
- `NIDORANfE`, `NIDORANmA` 2개

해석:
- 일반 포켓몬 자산 대부분은 메트릭이 적용됨(exact + fallback 98.16%).
- 다만 Nidoran 2종은 현재 메트릭 lookup에서 완전 미스.

### 8.3 female 전용 메트릭 실제 적용 여부

추가 검증:
- manifest의 `_female` 스프라이트 ID: 98개
- 현재 lookup 결과:
  - exact: 0
  - fallback: 98

샘플:
- `RATICATE_female => RATICATE`
- `SNEASEL_1_female => SNEASEL_1`
- `PIKACHU_female => PIKACHU`

원인:
- `getMetricsForSprite()`가 `spriteId.toUpperCase()`로 조회.
- PBS 헤더 파서가 key를 대문자 정규화하지 않아 `..._female` 소문자 key가 그대로 Map에 저장.
- 결과적으로 female 전용 엔트리가 있어도 exact hit가 나지 않고 base로 fallback됨.

판정:
- “여성 전용 메트릭”은 현재 코드 기준 **실질적으로 적용되지 않음**.

### 8.4 각주 반영 상태에서의 동작 총평

- 각주의 “Gen 9 Pack 통합”은 현재 구성과 합치되며, 이 자체로 런타임 장애는 없음.
- 핵심 배틀 로직은 검증 스크립트 기준 정상.
- 그러나 “문서 대비 세부 표현 품질” 관점에서 아래는 동작 불일치가 지속:
  - `AnimationSpeed` 방향 차이
  - `ShadowSize` 해석 축소
  - DBK 기본 스케일(`front=2/back=3`) 미반영
  - 플레이어측 그림자 표시 토글 미반영
  - `SuperShinyHue` 미사용
  - female 전용 메트릭 미적용
  - `NIDORANfE/mA` 키 미스
- 또한, GitBook이 설명하는 Ruby 플러그인 API(`Battle::Scene`, `GameData::SpeciesMetrics`)는 현재 JS 런타임에서 직접 사용되지 않으므로, 해당 API 기반 기능은 별도 이식 구현 없이는 동등 동작하지 않음.

## 9) 결론 (요청하신 “PBS를 어떻게 활용해야 하는가”를 현재 코드 기준으로만 정리)

현재 코드에서 PBS를 활용할 때 실제로 의미 있는 항목은:
- `FrontSprite`, `BackSprite`의 XY/scale(현재는 3번째 값 명시 시 scale 반영이 확실함)
- `ShadowSprite`
- `ShadowSize`(단, 음수는 현재 숨김 처리되어 DBK 의미와 다름)
- `AnimationSpeed`(단, 문서와 속도 방향 차이 가능성 유의)

그리고 이 값들은 **Phaser 전투 렌더 경로가 정상 동작할 때만** 화면에 반영됩니다.  
Phaser 경로가 깨져 DOM fallback으로 내려가면 PBS 메트릭 효과는 거의 사라집니다.

## 10) `Assets_Plugins/[DBK_009] Animated Pokemon System` 파일별 정밀 분석

아래는 요청하신 “plugins 폴더 참고본” 기준의 실제 코드 동작 분석입니다.

### 10.1 `meta.txt`
- 핵심 라인: `meta.txt L1-L9`
- `Version=1.1.2`, `Essentials=21.1`, `Requires=Deluxe Battle Kit,1.3` 명시.
- `Website`가 요청하신 GitBook URL과 일치.
- 결론: 현재 참고본은 GitBook 문서와 같은 계열의 공식 배포본으로 봐도 무방.

### 10.2 `[000] Settings.rb`
- 핵심 라인: `[000] L8-L37`, `L43-L97`
- 전역 기본 스케일:
  - `FRONT_BATTLER_SPRITE_SCALE = 2`
  - `BACK_BATTLER_SPRITE_SCALE = 3`
- 전역 애니메이션 지연 기준: `ANIMATION_FRAME_DELAY = 90`
- 플레이어측 그림자 기본 OFF: `SHOW_PLAYER_SIDE_SHADOW_SPRITES = false`
- UI 클리핑/보정 관련:
  - `CONSTRICT_POKEMON_SPRITES`
  - `POKEMON_UI_METRICS`
- 대타 위치: `SUBSTITUTE_DOLL_METRICS = [87, 60]`

### 10.3 `[001] Compiler.rb`
- 핵심 라인: `[001] L10-L28`, `L33-L52`, `L57-L69`, `L74-L145`, `L150-L195`
- 컴파일 시 성별 스프라이트 자동 플래그화:
  - `front_sprite_filename(...male)`와 `(...female)` 비교해서 `HasGenderedSprites` 추가/삭제.
- 메트릭 섹션 ID 정규화:
  - `[SPECIES,FORM,female]` -> `:SPECIES_FORM_female` 식으로 심볼화.
- metrics 출력 최적화:
  - base와 동일한 값은 파일로 내보내지 않음.
  - 비교 항목에 `animation_speed`, `super_shiny_hue`도 포함.
- `write_pokemon_plugin_metrics`는 배포용 최소 키만 출력:
  - `BackSprite`, `FrontSprite`, `ShadowSize`, `ShadowSprite`, `AnimationSpeed`
  - `SuperShinyHue`는 이 배포용 writer에서는 제외.

### 10.4 `[002] Sprite Editor.rb`
- 핵심 라인: `[002] L5-L63`, `L84-L153`, `L174-L277`, `L279-L373`, `L375-L490`, `L492-L597`
- 에디터 UI 자체가 “배틀 베이스 + 실제 sprite/shadow + 아이콘”을 띄우는 디버그 씬으로 구성됨.
- 종 리스트 생성 시 `has_gendered_sprites?`면 female 항목을 별도로 추가.
- `pbChangeSpecies`:
  - back/front sprite + shadow sprite를 동시에 로드.
- `refresh`:
  - 메트릭별 scale/speed/hue 적용 후 `apply_metrics_to_sprite`로 좌표 반영.
- 편집 가능한 파라미터:
  - Ally/Enemy/Shadow Position
  - Animation Speed (both/ally/enemy 분리 지원)
  - Super Shiny Hue
  - Shadow Size(-9..9)
  - Auto-position
- 결론: GitBook의 “sprite editor에서 조정” 설명은 코드상으로 정확히 구현되어 있음.

### 10.5 `[003] Pokemon UI.rb`
- 핵심 라인: `[003] L10-L37`, `L44-L69`, `L76-L103`, `L110-L137`, `L144-L172`
- 옵션 메뉴에 `Pokémon Animations` ON/OFF를 추가(`PokemonSystem#animated_sprites`).
- Summary/Pokedex/Storage/Evolution 씬에서 `pbSetDisplay`를 이용해 자동 위치 조정.
- `findCenter(bitmap)`로 알파 픽셀 경계를 스캔해 중심 오프셋 계산.

### 10.6 `[004] Game Data.rb`
- 핵심 라인: `[004] L12-L19`, `L24-L33`, `L37-L94`, `L99-L117`, `L143-L176`, `L181-L204`, `L245-L274`
- `GameData::SpeciesMetrics::SCHEMA` 확장:
  - `ShadowSprite`, `AnimationSpeed`, `SuperShinyHue` 추가.
- `get_species_form(species, form, female)`:
  - female 전용 메트릭 ID(`..._female`)를 1급 경로로 취급.
  - 없으면 base에서 clone 생성.
- `apply_metrics_to_sprite`:
  - front/back 및 shadow 좌표를 메트릭으로 합성 적용.
- `back_sprite_scale/front_sprite_scale`:
  - 3번째 값 없으면 `Settings::BACK/FRONT_BATTLER_SPRITE_SCALE` 사용.
- `shows_shadow?`:
  - `shadow_size == 0`일 때만 숨김.
  - back side는 `SHOW_PLAYER_SIDE_SHADOW_SPRITES`도 검사.

### 10.7 `[005] Pokemon Sprites.rb`
- 핵심 라인: `[005] L14-L57`, `L62-L91`, `L121-L155`, `L160-L199`, `L212-L292`, `L305-L366`
- 배틀 외 스프라이트(`PokemonSprite`)도 `DeluxeBitmapWrapper` 기반으로 애니메이션.
- `setShadowBitmap`/`setSpeciesShadowBitmap`:
  - `shadow_size`를 줌에 연산 반영(음수도 크기 축소로 처리).
- `pbSetDisplay`:
  - `findCenter` + `POKEMON_UI_METRICS` + constrict 옵션으로 UI 내 위치/클리핑 제어.
- 아이콘 스프라이트(`PokemonIconSprite`, `PokemonSpeciesIconSprite`, `PokemonBoxIcon`)에 Super Shiny hue 반영.
- `Sprite` 확장:
  - 상태이상 패턴 오버레이(독/화상 등)를 펄스 애니메이션으로 표시.

### 10.8 `[006] Battler Sprites.rb`
- 핵심 라인: `[006] L6-L79`, `L87-L220`, `L224-L304`, `L309-L374`, `L390-L431`, `L451-L495`, `L522-L533`, `L540-L631`, `L643-L880`
- 배틀 스프라이트 핵심:
  - `Battle::Scene::BattlerSprite`
  - `Battle::Scene::BattlerShadowSprite`
- 모자이크 연출:
  - `PokemonSprite::MosaicSprite` 믹스인으로 form change/Illusion 해제 시 모자이크 전환.
- `setPokemonBitmap`:
  - Substitute 여부에 따라 본체/인형 sprite 전환.
  - shadow 표시 가능 여부(`shadowVisible`)를 종/설정 기반으로 결정.
- `update`:
  - 스프라이트 갱신 + 패턴 업데이트 + (애니메이션일 때) speed/reverse 조건 갱신.
- `vanishMode`:
  - 0 정상 / 1 완전 사라짐 / 2 공중 사라짐(그림자만 유지) 관리.
- 이동기/능력 연동:
  - Fly/Dig/Dive/Sky Drop/Illusion/Gravity/Smack Down 등에서 vanish/복귀 로직 훅 처리.
- 볼 던지기/회수/포획 애니메이션에 그림자 등장/퇴장 동기화 포함.

### 10.9 `[007] Substitute Doll.rb`
- 핵심 라인: `[007] L11-L46`, `L51-L61`, `L75-L91`, `L98-L116`, `L131-L152`, `L164-L282`
- `pbAnimateSubstitute(idxBattler, mode, delay=false)` 구현.
- mode:
  - `:create`, `:show`, `:hide`, `:broken`
- 훅 포인트:
  - `pbUseMove`, `pbChangeForm`, `pbHitEffectivenessMessages`, `pbSendOut`, Substitute/Shed Tail move 종료 처리.
- 애니메이션 클래스 3종:
  - `SubstituteAppear`, `SubstituteSwapIn`, `SubstituteSwapOut`

### 10.10 `[008] Deluxe Bitmap.rb`
- 핵심 라인: `[008] L11-L38`, `L47-L79`, `L84-L107`, `L111-L127`, `L131-L171`, `L176-L217`, `L251-L267`
- 프레임 분할/렌더의 실제 엔진.
- 애니메이션 지연식:
  - `delay = ((speed / 2.0) * Settings::ANIMATION_FRAME_DELAY).round / 1000.0`
- 상태 기반 speed 변화:
  - 빙결 정지, 수면 느림, 마비/저체력 완만화.
  - 배틀러일 때 speed stage, confusion/attract/reversed에 따른 역재생 반영.
- `compile_strip`에서 `alterBitmap` 함수(예: Spinda) 호출.

### 10.11 `[009] Deluxe Additions.rb`
- 핵심 라인: `[009] L4-L33`, `L38-L51`, `L56-L67`, `L72-L80`
- MidbattleHandlers:
  - 글로벌 species 연출(Sudowoodo, Klink 계열)
  - 트리거 명령:
    - `"spriteSpeed"`
    - `"spriteReverse"`
    - `"spriteHue"`

### 10.12 `[010] Spinda Spots.rb`
- 핵심 라인: `[010] L8-L46`, `L51-L79`, `L84-L90`, `L95-L157`
- SPINDA `alterBitmap` 핸들러를 애니메이션 strip 대응 형태로 재등록.
- `Pokemon#set_spot_pattern`:
  - personalID 기반 spot 배치 계산.
  - 프레임별 머리 움직임 추적으로 spot offset 보정.
- `dxSetSpotPatterns`:
  - strip 재컴파일 + hue 반영.

## 11) 플러그인 기준과 현재 JS 런타임의 실제 대응 판정 (업데이트)

### 11.1 “동작이 잘 되고 있는가?” 최종 판정
- **핵심 배틀 경로는 정상**:
  - `verify:stage22` PASS
  - `verify:passb` 9/9 PASS
- **DBK 플러그인 등가 구현은 아님**:
  - 현재 런타임은 Ruby 플러그인을 실행하지 않고, PBS 일부 키만 읽는 JS 재구현 경로.

### 11.2 정량 체크로 본 현재 PBS/렌더 상태
- 메트릭 매칭(Front asset 1633개):
  - exact 1325 / fallback 278 / miss 30
- female 자산(98개):
  - exact 0 / fallback 98
- scale 필드 기입 비율:
  - `FrontSprite` 1342개 중 3개만 3번째 값 있음
  - `BackSprite` 1342개 중 7개만 3번째 값 있음
- `ShadowSize` 분포(명시된 208개):
  - 음수 176개(`-1/-2/-3`)
  - 양수 32개(`2/3`)
  - `0`은 없음

### 11.3 기능별 대응/비대응 결론
- 현재 JS에서 실사용되는 DBK 계열 요소:
  - `FrontSprite`, `BackSprite`(XY + 3번째 scale 값이 있을 때)
  - `ShadowSprite`
  - `ShadowSize`(단순화된 표시 로직)
  - `AnimationSpeed`(하지만 의미 방향 불일치)
- 현재 JS에서 미반영/부분반영 요소:
  - global scale 기본값(`front=2/back=3`)
  - player-side shadow toggle
  - female exact metrics key 처리
  - `SuperShinyHue`
  - midbattle `spriteReverse/spriteHue` API
  - Substitute 전용 연출 API
  - mosaic form change
  - status pattern overlay
  - Spinda 프레임 추적 스팟 보정
  - UI auto-position(`POKEMON_UI_METRICS`, `findCenter`, constrict)

[^gen9merge]: 사용자 각주 기준 로컬 운영 메모: `pokemon_metrics_Gen_9_Pack.txt`를 별도 유지하지 않고 `pokemon_metrics.txt`로 병합해 관리 중.
