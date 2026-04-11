# Research: Battle Screen Battler Sprites

## 개요
배틀 화면에 배틀러 스프라이트를 표시하기 위한 사전 분석. 스프라이트 시스템 전체가 이미 구현되어 있으나, `app.js`에서 `deferred: true`로 설정되어 현재 의도적으로 비활성화된 상태임.

---

## 1. 자산(Asset) 구조

### 경로 규칙
```
./assets/Pokemon/
├── Front/            # 적 시점 스프라이트 (Enemy: 앞모습)
├── Back/             # 플레이어 시점 스프라이트 (Player: 뒷모습)
├── Front shiny/      # 색다른 앞모습
├── Back shiny/       # 색다른 뒷모습
├── Icons/            # 파티 아이콘 (항상 대문자)
└── Icons shiny/      # 색다른 파티 아이콘
```

### 파일명 패턴
| 유형 | 예시 | 비고 |
|------|------|------|
| 기본형 | `CHARIZARD.png` | 대문자 |
| 다른 폼 | `CHARIZARD_1.png`, `CHARIZARD_2.png` | `_N` 접미사 |
| 성별 변형 | `ABOMASNOW_female.png` | `_female` 접미사 |
| 아이콘 | `CHARIZARD.png` (Icons/) | 반드시 대문자 |

### 스프라이트 시트 형식
- **수평 애니메이션 스트립** (horizontal strip): 프레임이 가로로 나열됨
- **프레임 크기**: `img.height`를 프레임 폭으로 사용 (정사각형 가정)
- **프레임 수**: `Math.floor(img.width / img.height)`로 자동 계산
- **애니메이션 속도**: 120ms/frame (고정값)

---

## 2. 스프라이트 URL 생성 함수 (app.js)

### `spritePath(spriteId, facing, shiny)` — app.js:3227
```javascript
function spritePath(spriteId, facing = 'front', shiny = false) {
  const folder = facing === 'back'
    ? shiny ? 'Back shiny' : 'Back'
    : shiny ? 'Front shiny' : 'Front';
  return `${state.assetBase.pokemon}/${folder}/${spriteId}.png`;
  // 예: './assets/Pokemon/Front/CHARIZARD.png'
  // 예: './assets/Pokemon/Back shiny/GARCHOMP.png'
}
```

### `resolveBattleRenderSpriteId(mon)` — app.js:3254
배틀 시점 스프라이트 ID 결정 우선순위:
1. Mega/Primal/Ultra 폼 스냅샷 (해당 시)
2. 변환 종족 정확 ID
3. `mon.spriteId` (저장된 ID)
4. `mon.spriteAutoId` (자동 감지 ID)
5. 빈 문자열 (폴백)

### 배틀 모델 스프라이트 항목 — app.js:6387-6396
```javascript
enemySprite: {
  url: enemyMon ? spritePath(resolveBattleRenderSpriteId(enemyMon), 'front', enemyMon.shiny) : '',
  deferred: true,   // ← 현재 비활성화 원인
  mount: 'enemy',
},
playerSprite: {
  url: playerMon ? spritePath(resolveBattleRenderSpriteId(playerMon), 'back', playerMon.shiny) : '',
  deferred: true,   // ← 현재 비활성화 원인
  mount: 'player',
},
```

**핵심 발견**: `deferred: true`가 두 스프라이트 모두에 하드코딩되어 있음. 이것만 `false`로 바꾸면 스프라이트가 즉시 표시됨. URL 생성 및 렌더링 파이프라인은 이미 완전히 구현되어 있음.

---

## 3. 배틀 씬 스프라이트 렌더링 파이프라인

### 렌더링 흐름
```
app.js buildBattleModel()
  → enemySprite / playerSprite 모델 생성 (url, deferred, mount)
  → controller.show(model)
  → scene.renderModel(model)
  → ui.renderModel(model)
  → adapter.getSpriteModel('enemy'|'player')  [adapter:630]
  → renderAnimatedSpriteToHost(host, spriteModel, 'large')  [ui.js:241,247]
  → Canvas 기반 DOM 렌더링 (sprite-host.js)
```

### `renderAnimatedSpriteToHost` — sprite-host.js:41
- `deferred: true` 또는 `url` 없으면 → 즉시 숨김 처리 후 종료
- URL이 있으면 → `inspectSpriteUrl(url)` 로 이미지 로드 및 프레임 수 감지
- Canvas에 bottom-align + center-X로 그림 (`dy = canvas.height - dh`)
- 120ms 인터벌, requestAnimationFrame 루프
- 오류 시 visibility hidden (에러 표시 없음)

### DOM 스프라이트 Host 특성
```javascript
// ensureSpriteHostStyles (sprite-host.js:1)
{
  width: '100%', height: '100%',
  display: 'grid', placeItems: 'end center',   // 하단 가운데 정렬
  overflow: 'visible',                          // 박스 밖으로 삐져나올 수 있음
  imageRendering: 'pixelated',
}
```

### DOM vs Phaser 좌표계
- Phaser의 `dom.setOrigin(0.5, 1)` — x는 중앙, y는 하단이 기준점
- `dom.setPosition(236, 84)` → Phaser 논리 좌표 (236, 84)에 DOM 요소의 하단-중앙이 위치
- `applyHostBox(host, width, height)` → CSS `width/height`를 픽셀로 직접 설정

---

## 4. 스프라이트 위치 및 박스 크기

### 현재 설정값 — ui.js:212-221
| 측 | Phaser dom 위치 | Host 박스 크기 | PokeRogue 원본 위치 |
|----|-----------------|----------------|---------------------|
| Enemy | (236, 84) | 72 × 72 px | EnemyPokemon(236, 84) |
| Player | (106, 148) | 88 × 88 px | PlayerPokemon(106, 148) |

- `dom.setOrigin(0.5, 1)` → 위치 기준이 **박스의 하단 중앙**
- 따라서 Enemy: 중앙 x=236, 하단 y=84 → 박스는 x=200~272, y=12~84
- Player: 중앙 x=106, 하단 y=148 → 박스는 x=62~150, y=60~148

### PokeRogue 원본의 실제 스프라이트 크기
PokeRogue 원본 배틀러 스프라이트는 `200×200`을 논리 단위로 사용 (실제 asset은 더 크거나 다를 수 있음). 우리의 asset은 PokeRogue와 다른 독자 포맷.

### 현재 박스 크기의 문제점
- **72×72 (enemy)**, **88×88 (player)** 는 추정값. 실제 스프라이트가 이보다 크면 `overflow: visible`로 삐져나오긴 하나, 클리핑 없이 표시됨.
- 스프라이트는 bottom-align이므로 y=84 (enemy), y=148 (player) 라인 위로 그려짐.

---

## 5. 파티 UI와 스프라이트 가시성 관계

- 파티 UI 진입 시: `party-ui-handler.js:311-312` — `enemySprite.dom.setVisible(false)`, `playerSprite.dom.setVisible(false)`
- 파티 UI 종료 시: `party-ui-handler.js:399-400` — 두 DOM 모두 `setVisible(true)` 복원
- `ui.renderModel()`에서도 `partyModeActive` 체크: 파티 모드 중에는 `dom.setVisible` 강제 false

---

## 6. 빌더의 스프라이트 렌더링 — app.js 비교

빌더(`renderAnimatedSprite`)와 배틀(`renderAnimatedSpriteToHost`)의 차이:

| 항목 | 빌더 (app.js) | 배틀 (sprite-host.js) |
|------|---------------|----------------------|
| 캔버스 크기 | 고정 픽셀 (190px max) | 컨테이너 100% |
| 리사이즈 대응 | 없음 | rAF 루프에서 매 프레임 체크 |
| 정렬 | 상단-좌측 | 하단-중앙 (bottom-center) |
| 오류 처리 | "Sprite missing" 텍스트 | 그냥 숨김 |
| 프레임 감지 | `ensureImageInfo()` | `inspectSpriteUrl()` |

두 함수 모두 동일한 로직(height=frame, floor(width/height)=count)으로 프레임 수 감지.

---

## 7. 구현에 필요한 변경 사항 분석

### 7-1. 최소 변경으로 스프라이트 활성화
**변경 파일**: `src/app.js` 6389, 6394행
```javascript
// Before:
deferred: true,
// After:
deferred: false,
```
이것만으로 스프라이트가 즉시 표시됨. URL 생성, 렌더링, 애니메이션 파이프라인은 모두 완비.

### 7-2. 박스 크기 검토 필요
현재 enemy=72×72, player=88×88 → 실제 스프라이트 asset 크기를 확인 후 조정 필요.
- `overflow: visible`이라 박스보다 커도 표시되긴 함
- 하지만 Phaser dom 요소의 hit area, 인터랙션 등에 영향 가능

### 7-3. 깊이(Depth) 레이어 확인
- `dom.setDepth(19)` (sprite-host.js 배경: battle-shell-scene.js:87)
- Arena bases: depth 4, 5
- UI 핸들러: depth 42+
- 스프라이트는 아레나 위, UI 아래에 위치 → 올바름

### 7-4. 현재 상태 시각적 검증 방법
`deferred: false`로 변경 후 배틀 진입하여 스프라이트가 올바른 위치/크기로 표시되는지 확인.
스크린샷으로 enemy(236,84) 기준 upper-left(200,12), player(106,148) 기준 upper-left(62,60) 영역에 표시되는지 체크.

---

## 8. PokeRogue 원본 스프라이트 시스템과의 비교

PokeRogue 원본(`pokerogue_codes/src/sprites/pokemon-sprite.ts`)은:
- Phaser atlas (`battle__anim` 등) 기반의 Phaser Sprite 사용
- 스프라이트 ID에 `__`(더블 언더스코어)가 포함되면 경로 구분자로 변환
- 성별/form/variant에 따라 atlas frame 선택

우리 시스템은:
- PokeRogue atlas 방식을 사용하지 않음
- 독자 PNG 파일(`./assets/Pokemon/Front|Back/`) 직접 로드
- DOM canvas 렌더링 (Phaser Sprite 아님)
- 이미 `renderAnimatedSpriteToHost`가 이 포맷에 맞게 구현됨

---

## 9. 결론 및 다음 단계

**현재 상태**: 스프라이트 렌더링 시스템은 완전히 구현되어 있음. `deferred: true` 한 줄로 인해 표시 안 됨.

**예상 작업**:
1. `app.js` 에서 `deferred: true` → `false` 변경 (2곳)
2. 실제 렌더 확인 후 박스 크기 (72×72, 88×88) 조정 여부 결정
3. 스프라이트가 아레나 플랫폼 위에 자연스럽게 올라오는지 시각적 검증

**리스크**: 없음. 변경이 최소이고 롤백 용이. `overflow: visible` 덕분에 박스 크기가 다소 부정확해도 표시는 됨.
