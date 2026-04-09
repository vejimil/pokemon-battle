# PokeRogue UI 이식 — 심층 조사 보고서
> 작성일: 2026-04-09 | 분석 대상: CLAUDE.md 우선순위 항목 전체

---

## 0. 좌표계 공통 이해

```
PokeRogue 원본:
  - 실제 canvas 해상도: 1920×1080 (Phaser Game 크기)
  - scale = 6 → logical 해상도: 320×180
  - fieldUI container: y = scaledCanvas.height = 180 (화면 바닥)
  - 자식 오브젝트는 음수 y (위로)

이식본:
  - Phaser Game 크기: 320×180 (logical 그 자체)
  - handler container들: scene.add.container(0, 180) → y=180이 바닥
  - layout()에서 절대 좌표로 직접 배치
```

fieldUI 좌표 변환 공식:
- `절대_x = 원본_localX` (스케일 없음, 이미 logical 단위)
- `절대_y = 180 + 원본_localY` (180이 fieldUI의 절대 y)

---

## 1. 폰트 흐림 — 심층 분석

### 1-1. 원본 PokeRogue (`text.ts`)의 실제 방식

```typescript
// getTextStyleOptions() 핵심 값:
const scale = 0.1666666667;   // = 1/6
const defaultFontSize = 96;   // 기본 렌더 크기

const styleOptions = {
  fontFamily: 'emerald',
  fontSize: 96,   // 96px으로 렌더
  // ...
};
globalScene.add.text(x, y, content, styleOptions).setScale(scale)
// → 96px 렌더 후 1/6 축소 = logical 16px
```

**원본은 canvas Text 사용** (BitmapText 아님). `globalScene.add.text()`는 Phaser의 일반 Text 오브젝트.

원본 `fontSize` 정리 (모두 렌더 크기 → `setScale(1/6)` 적용):

| TextStyle | 렌더 크기 | logical 크기 |
|-----------|-----------|-------------|
| MESSAGE | 96px | **16px** |
| WINDOW | 96px | **16px** |
| BATTLE_INFO | 72px (96-24) | **12px** |
| MOVE_INFO_CONTENT | 56px (96-40) | **~9.3px** |
| PARTY / MOVE_LABEL | 48px (96-48) | **8px** |

### 1-2. 이식본 (`phaser-utils.js`, `text.js`)의 실제 방식

```js
// TEXT_STYLE (text.js)
WINDOW: { fontSize: 8 }          // 8px logical
WINDOW_BATTLE_COMMAND: { fontSize: 8 }
BATTLE_INFO: { fontSize: 8 }      // 8px logical ← 원본은 12px!

// createBaseText()
fontSize * TEXT_RENDER_SCALE(6) = 48px으로 렌더 → setScale(1/6) = 8px logical
```

### 1-3. 발견된 핵심 불일치

**①  폰트 크기 불일치** (흐림과 별개로 레이아웃 버그 원인):
- `BATTLE_INFO`: 원본 12px logical vs 이식본 8px (33% 작음)
- `WINDOW` / `MESSAGE`: 원본 16px logical vs 이식본 8px (50% 작음!)

이식본의 모든 텍스트가 원본보다 훨씬 작게 표시됨.

**② resolution 충돌 가능성**:
- `controller.js`에서 `resolution: window.devicePixelRatio > 1 ? 2 : 1`로 게임 생성
- `createBaseText()`에서 Text 오브젝트에 `resolution: 1` 강제
- DPR=2 디스플레이(Retina Mac)에서 게임은 2× 렌더하나 텍스트는 1×로 제한 → 흐림 발생 가능

**③ 원본에 없는 속성 추가**:
- 이식본: `setRoundPixels(true)` — 원본에 없음, 효과 불명
- 이식본: `fontFamily: 'emerald, pkmnems, monospace'` — fallback 폰트 때문에 emerald 폰트 실패 시 monospace로 렌더될 수 있음

### 1-4. 조사 권장 방향

1. **폰트 크기 수정이 우선**: `text.js`의 `TEXT_STYLE` fontSize 값을 원본에 맞게 수정
2. **resolution 통일**: Game의 `resolution`을 1로 고정하거나, Text의 `resolution`을 Game의 resolution과 일치시킴
3. **pixelArt 모드 + INTEGER_SCALE**: 이미 적용됨 — 이것이 없으면 integer 배율이 안 맞아 흐릿해짐

```js
// 수정 방향 (text.js)
const TEXT_STYLE = {
  MESSAGE:               { fontSize: 16, color: '#f8f8f8' },   // 96/6
  WINDOW:                { fontSize: 16, color: '#f8f8f8' },   // 96/6
  WINDOW_BATTLE_COMMAND: { fontSize: 16, color: '#f8f8f8' },   // 96/6
  BATTLE_INFO:           { fontSize: 12, color: '#f8f8f8' },   // 72/6
  MOVE_INFO_CONTENT:     { fontSize: 9,  color: '#f8f8f8' },   // 56/6 ≈ 9.3
  BATTLE_INFO_SMALL:     { fontSize: 8,  color: '#dbeafe' },
  BATTLE_LABEL:          { fontSize: 8,  color: '#f8f8f8' },
  BATTLE_VALUE:          { fontSize: 8,  color: '#eff6ff' },
  HINT:                  { fontSize: 6,  color: '#94a3b8' },
};
```

단, fontSize를 바꾸면 모든 좌표 오프셋도 같이 재조정 필요.

---

## 2. 적 타입 아이콘 위치 — 심층 분석

### 2-1. 원본 (`enemy-battle-info.ts`)

```typescript
// constructTypeIcons()
this.type1Icon = globalScene.add.sprite(-15, -15.5, "pbinfo_enemy_type1").setOrigin(0)
this.type2Icon = globalScene.add.sprite(-15, -2.5,  "pbinfo_enemy_type2").setOrigin(0)
this.type3Icon = globalScene.add.sprite(0,  -15.5,  "pbinfo_enemy_type" ).setOrigin(0)

// EnemyBattleInfo 컨테이너 위치:
super(140, -141)  // fieldUI 상대 좌표
// → 절대 좌표: (140, 180 + (-141)) = (140, 39)
```

### 2-2. 이식본 (`battle-info.js`)

```js
// getTypeIconOffsets() — enemy
{ x: -15, y: -15.5 }  // ← 원본과 동일 ✓
{ x: -15, y: -2.5  }  // ← 원본과 동일 ✓
{ x: 0,   y: -15.5 }  // ← 원본과 동일 ✓

// layout() — enemyInfo 컨테이너 위치
this.enemyInfo.container?.setPosition(140, 39)  // ← 원본 변환값과 동일 ✓
```

### 2-3. 실제 차이점

오프셋 값과 컨테이너 위치는 원본과 동일. 하지만 **이식본은 `scene.add.image()`를 사용**하고 원본은 `globalScene.add.sprite()`를 사용.

`image` vs `sprite`의 차이:
- 두 오브젝트 모두 `.setOrigin(0, 0)` 적용 — 동일
- 단, `sprite`는 atlas frame을 사용하며 frame별로 내부 크기가 다를 수 있음

**아이콘 atlas 파일 확인 필요**:
- `pbinfo_enemy_type1.png/json` — 각 frame의 실제 크기 및 pivot 좌표
- frame trimming이 있을 경우 origin(0,0)이라도 실제 표시 위치가 달라짐

**또 다른 차이**: 원본 BattleInfo는 `setVisible(false)`로 시작해 `showInfo()`를 통해 나타남. 이식본은 `container`가 처음부터 보임. 초기 visible 상태가 좌표에 영향을 줄 수 있는 경우는 없지만 확인 필요.

### 2-4. 조사 권장 방향

1. 브라우저 DevTools → Phaser Debug overlay로 타입 아이콘 실제 경계 박스 확인
2. `pbinfo_enemy_type1.json` 열어서 frame trim 좌표 확인
3. 컨테이너 bg 이미지(`pbinfo_enemy_mini.png`)의 실제 픽셀 크기와 origin(1, 0.5) 조합 검증

---

## 3. 하단 대화창 레이아웃 — 심층 분석

### 3-1. 원본 (`battle-message-ui-handler.ts`)

```typescript
public readonly wordWrapWidth: number = 1780;  // 원본 스케일 픽셀 (×6)

// setup()
const messageContainer = globalScene.add.container(12, -39);  // fieldUI 상대
const message = addTextObject(0, 0, "", TextStyle.MESSAGE, {
  maxLines: 2,
  wordWrap: { width: this.wordWrapWidth },  // 1780 (원본 스케일)
});
// addTextObject 내부: 96px 렌더 + setScale(1/6)
// → wordWrap.width도 96px 기준이므로 scale 후 실제 logical = 1780/6 ≈ 296.7px

// commandWindow: addWindow(202, 0, 118, 48) → origin(0, 1)
// movesWindow: addWindow(0, 0, 243, 48) → origin(0, 1)

// show() 시:
messageHandler.message.setWordWrapWidth(this.wordWrapWidth)  // = 1780

// command-ui-handler.ts의 show() 시:
messageHandler.message.setWordWrapWidth(this.canTera() ? 910 : 1110)
// Tera 가능: 910/6 ≈ 151.7px logical
// Tera 불가: 1110/6 ≈ 185px logical
```

### 3-2. 이식본 (`battle-message-ui-handler.js`)

```js
this.wordWrapWidth = 215;  // logical px ← 원본 297px과 불일치!

// setup()
this.message = env.createBaseText(scene, 0, 0, '', 8, '#f8fbff', {
  lineSpacing: 1,
  wordWrap: { width: this.wordWrapWidth, useAdvancedWrap: true },
  // createBaseText 내부에서 215 * 6 = 1290 내부픽셀로 변환
}).setOrigin(0, 0);

// command-ui-handler.js의 show() 시:
this.env.setTextWordWrap(messageHandler.message, this.canTera() ? 91 : 111, true)
// Tera 가능: 91px ← 원본 ~152px과 불일치!
// Tera 불가: 111px ← 원본 ~185px과 불일치!
```

### 3-3. 불일치 요약

| 항목 | 원본 (logical px) | 이식본 (logical px) | 오차 |
|------|-------------------|---------------------|------|
| wordWrapWidth (기본) | ~297px | 215px | -82px (28% 부족) |
| wordWrapWidth (Tera 불가) | ~185px | 111px | -74px (40% 부족) |
| wordWrapWidth (Tera 가능) | ~152px | 91px | -61px (40% 부족) |

이 때문에 배틀 메시지가 너무 일찍 줄바꿈됨.

### 3-4. bg 이미지 관련

원본: `this.bg = globalScene.add.sprite(0, 0, "bg", globalScene.windowType).setOrigin(0, 1)`
이식본: `this.bg = scene.add.image(0, 0, env.UI_ASSETS.bgAtlas.key, '1').setOrigin(0, 1)`

원본은 `bg` atlas + `windowType` 프레임. 이식본은 `bgAtlas` + `'1'` 프레임. 실제로 동일한 이미지인지 확인 필요.

### 3-5. 수정 방향

```js
// battle-message-ui-handler.js
this.wordWrapWidth = 297;  // 1780 / 6 ≈ 296.7, 반올림

// command-ui-handler.js show()
this.env.setTextWordWrap(messageHandler.message, this.canTera() ? 152 : 185, true)
// 910/6 ≈ 151.7 → 152, 1110/6 = 185
```

---

## 4. 턴 인디케이터 (검은 바) — 조사 결론

pokerogue_codes에 `battle-scene.ts`가 없어 직접 확인 불가. PokeRogue의 오픈소스 저장소에서 확인 필요.

일반적으로 `turnBlackout`이라는 요소는 PokeRogue 공식 소스에 존재하지 않음 (표준 포켓몬 게임에도 없는 요소). **미구현 유지 권장.**

---

## 5. 파티 UI / fight-ui-handler Move Info Overlay — 상태 파악

### fight-ui-handler MoveInfoOverlay

원본:
```typescript
this.moveInfoOverlay = new MoveInfoOverlay({...})
ui.add(this.moveInfoOverlay)
globalScene.addInfoToggle(this.moveInfoOverlay, this)
```

MoveInfoOverlay는 전체화면 토글 형태의 상세 기술 정보 창.

이식본: `moveInfoContainer`에 기본 type/pp/power/accuracy 정보만 표시. MoveInfoOverlay 미구현.

이식본의 기술 정보 패널 위치:
```js
// moveInfoContainer의 내용물 좌표 (container(1, 0) 기준)
typeIcon:      (263, -36)  // 원본 (scaledCanvas.width-57, -36) = (263, -36) ✓
ppLabel:       (250, -26)  // 원본 (scaledCanvas.width-70, -26) = (250, -26) ✓
ppText:        (308, -26)  // 원본 (scaledCanvas.width-12, -26) = (308, -26) ✓
powerLabel:    (250, -18)  // 원본 동일 ✓
powerText:     (308, -18)  // 원본 동일 ✓
accuracyLabel: (250, -10)  // 원본 동일 ✓
accuracyText:  (308, -10)  // 원본 동일 ✓
```

기본 정보 위치는 원본과 일치. MoveInfoOverlay만 미구현 상태.

### command-ui-handler Tera 색상 파이프라인

원본:
```typescript
this.teraButton.setPipeline(globalScene.spritePipeline, {
  tone: [0.0, 0.0, 0.0, 0.0],
  ignoreTimeTint: true,
  teraColor: getTypeRgb(PokemonType.FIRE),
  isTerastallized: false,
})
```

커스텀 WebGL 쉐이더 파이프라인 사용. 이식본은 미구현(setScale/setAlpha로 대체). 완전 구현은 WebGL 쉐이더 작성 필요 → 고난이도.

---

## 6. battle-info.js — 기타 불일치

### 6-1. HP 퍼센트 계산 기준

```js
// 이식본 — 퍼센트 기반
const newHpPercent = clamp(Number(info.hpPercent ?? 0), 0, 100)
this.hpFill.scaleX = newHpPercent / 100

// 원본 — ratio 기반 (hp/maxHp)
this.hpBar.setScale(pokemon.getHpRatio(true), 1)
// hpRatio = hp / maxHp

// 원본의 HP frame 판정:
hpBar.scaleX > 0.5 → "high"
hpBar.scaleX > 0.25 → "medium"
else → "low"

// 이식본의 HP frame 판정:
pct > 50 → "high"   // pct = scaleX * 100
pct > 20 → "medium"  // ← 원본은 25%, 이식본은 20%! 불일치
else → "low"
```

**버그 발견**: HP medium → low 전환 임계값이 원본 25% vs 이식본 20%.

### 6-2. setVisible 초기화

원본 BattleInfo: `this.setVisible(false)` — 컨테이너 전체가 처음에 숨겨짐
이식본: container는 항상 보임 → 배틀 시작 시 순간적으로 빈 정보창이 보일 수 있음

### 6-3. statusIndicator 위치

원본: `setPositionRelative(this.nameText, 0, 11.5)` — nameText를 기준으로 상대 위치
이식본: 절대 좌표 `(pos.statusX, pos.statusY) = (nameTextX, nameTextY + 11.5)` — 동일 효과

### 6-4. abilityBar 컨테이너

원본: fieldUI에서 `x=0, y=-116` (player) → 절대 (0, 64) / `x=screenRight-118, y=-116` (enemy) → 절대 (202, 64)
이식본: `logicalX = isEnemy ? 202 : 0; logicalY = 64` — 일치 ✓

---

## 7. controller.js — 렌더링 설정 상세

```js
// 현재 설정
this.game = new Phaser.Game({
  type: Phaser.AUTO,
  width: LOGICAL_WIDTH,          // 320
  height: LOGICAL_HEIGHT,        // 180
  pixelArt: true,                // ✓ 중요
  antialias: false,              // ✓
  roundPixels: true,             // ✓
  autoRound: true,               // ✓
  resolution: renderResolution,  // DPR > 1 ? 2 : 1 ← 잠재적 문제
  scale: {
    mode: Phaser.Scale.INTEGER_SCALE,  // ✓ 중요
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: LOGICAL_WIDTH,
    height: LOGICAL_HEIGHT,
  },
})
```

`resolution: 2` (Retina)에서 내부 framebuffer가 640×360으로 렌더됨 → 텍스트 오브젝트의 `resolution: 1` 강제와 충돌 → 흐림.

**권장 수정**: `resolution: 1`로 고정하거나, createBaseText에서 Text resolution을 game resolution과 동일하게 설정.

---

## 8. 우선순위별 작업 권장 순서

### 즉시 수정 가능 (낮은 위험)

1. **HP medium/low 임계값 수정** (`battle-info.js:228`)
   - `pct > 20` → `pct > 25`

2. **wordWrapWidth 수정** (`battle-message-ui-handler.js:19`, `command-ui-handler.js:65`)
   - `this.wordWrapWidth = 215` → `this.wordWrapWidth = 297` (1780/6)
   - Tera 불가: 111 → 185 (1110/6)
   - Tera 가능: 91 → 152 (910/6)

### 검토 후 수정 (중간 위험)

3. **폰트 크기 수정** (`text.js`)
   - WINDOW, MESSAGE: 8 → 16
   - BATTLE_INFO: 8 → 12
   - MOVE_INFO_CONTENT: 8 → 9
   - (좌표계 전반 재조정 필요)

4. **controller resolution 통일** (`controller.js`)
   - `resolution: 1` 고정 고려

### 조사 필요 (높은 복잡도)

5. **적 타입 아이콘 1픽셀 어긋남**
   - atlas json에서 frame trim 확인 필요
   - DevTools로 실제 경계 박스 측정 필요

6. **MoveInfoOverlay 구현** (`fight-ui-handler.js`)
   - 전체화면 오버레이 UI — 별도 설계 필요

7. **Tera 색상 파이프라인** (`command-ui-handler.js`)
   - WebGL 쉐이더 필요 — 장기 과제

---

## 9. 파일별 완성도 재평가 (2026-04-09 Phase 1~5 전체 수정 후)

| 파일 | 수정 후 추정 | 주요 남은 문제 |
|------|------------|--------------|
| `battle-info.js` | ~88% | Stats 컨테이너 미구현 |
| `player-battle-info.js` | ~85% | EXP 레벨업 사운드 처리 |
| `enemy-battle-info.js` | ~68% | flyout/effectiveness 미구현 (bg y=-1 보정 완료) |
| `fight-ui-handler.js` | ~92% | MoveInfoOverlay 미구현 (아이콘 visibility·scale 수정 완료) |
| `command-ui-handler.js` | ~80% | Tera 파이프라인 미구현 |
| `battle-message-ui-handler.js` | ~75% | promptLevelUpStats 트리거 연결 |
| `party-ui-handler.js` | ~55% | partyBg 코드 정상; 레이아웃 개선 필요 |
| `text.js` (helpers) | ~95% | 완성 |
| `phaser-utils.js` | ~95% | 완성 |

---

## 11. 2026-04-09 이후 코드 분석 결과 (소스 직접 확인)

> 소스 파일 직접 분석 — constants.js, assets.js, fight-ui-handler.js, party-ui-handler.js, battle-message-ui-handler.js

### 11-1. fight-ui-handler.js — categories atlas 및 아이콘 구현 확인

**결론**: Phase 5-A(categories 아이콘)는 이미 코드에 구현됨.
- `categoriesAtlas`: constants.js line 16에 등록, assets.js line 9에서 `load.multiatlas()` 로드 ✓
- `categories.json`: multiatlas 포맷(`"textures"` 배열), 프레임: `physical`/`special`/`status` ✓
- `fight-ui-handler.js`: `moveCategoryIcon`이 atlas key `env.UI_ASSETS.categoriesAtlas.key`로 생성됨 ✓
- `updateMoveDetail()`: `detail.category`('physical'/'special'/'status')로 frame 설정, setVisible(true) ✓
- `app.js`: `category: String(move.category || '').toLowerCase()` → 'physical'/'special'/'status' ✓

**남은 문제 (신규 발견)**:

1. **초기 visibility 불일치**:
   - 원본 (`fight-ui-handler.ts:63,67`): `this.typeIcon.setVisible(false)`, `this.moveCategoryIcon.setVisible(false)`
   - TP (`fight-ui-handler.js:76-80`): 두 아이콘 모두 초기 `setVisible()` 호출 없음 → 기본값 visible=true
   - 결과: 기술 선택 전에도 'unknown'/'status' 프레임 아이콘이 보임

2. **scale 불일치**:
   - 원본 (`fight-ui-handler.ts:269,272`):
     - `typeIcon.setScale(0.8)` (업데이트 시마다)
     - `moveCategoryIcon.setScale(1.0)` (업데이트 시마다)
   - TP (`fight-ui-handler.js:76-80`): 생성 시 두 아이콘 모두 `setScale(0.55)`, 이후 scale 업데이트 없음
   - types.png 프레임: 32×14px. 원본 scale 0.8 → 25.6×11.2 logical
   - categories.png 프레임: 28×11px. 원본 scale 1.0 → 28×11 logical
   - TP scale 0.55: typeIcon 17.6×7.7, moveCategoryIcon 15.4×6.1 → 원본보다 작음
   - **시각적 확인 필요**: 현재 0.55가 실제로 잘못 보이는지 게임 실행 후 확인

### 11-2. party-ui-handler.js — partyBg 구현 확인

**결론**: Phase 5-B(partyBg 미표시) 코드는 정상.
- `party_bg.png`: 320×180 PNG 존재 ✓
- `constants.js`: `partyBg: { key: 'pkb-ui-party-bg', url: './assets/pokerogue/ui/party_bg.png' }` ✓
- `assets.js`: `load.image(UI_ASSETS.partyBg.key, UI_ASSETS.partyBg.url)` ✓
- `party-ui-handler.js`: `scene.add.image(0, 0, env.UI_ASSETS.partyBg.key).setOrigin(0, 1)` ✓
- 컨테이너 y=180, origin(0,1), 이미지 320×180 → 절대 y=0~180 커버 ✓
- 컨테이너 children에 partyBg 추가됨 ✓
- **시각적 확인 필요**: 실제 게임에서 교체 UI 열었을 때 partyBg가 표시되는지

### 11-3. battle-message-ui-handler.js — 완료 사항 확인

다음 수정이 이미 모두 반영됨:
- `wordWrapWidth = 297` ✓ (1780/6)
- `message`: fontSize=16, shadow(4,5,'#6b5a73') ✓
- `nameText`: fontSize=16, shadow(4,5,'#6b5a73') ✓
- `nameBox` 너비: `this.nameText.displayWidth + 16` ✓ (`.width` 버그 수정됨)

### 11-4. text.ts 원본 shadow 값 재확인

`getTextStyleOptions()` 기본값: `shadowXpos=4, shadowYpos=5`

| TextStyle | shadowX | shadowY | 비고 |
|-----------|---------|---------|------|
| WINDOW | 3 | 3 | 명시 |
| WINDOW_BATTLE_COMMAND | 4 | 5 | 기본값 유지 |
| BATTLE_INFO | 3.5 | 3.5 | 명시 |
| MESSAGE | 4 | 5 | 기본값 유지 (case에서 override 없음) |
| PARTY | 4 | 5 | 기본값 유지 |

TP `text.js` 현재 값: 위 표와 일치 ✓

---

## 10. 2026-04-09 스크린샷 시각 분석

> 스크린샷 촬영 조건: 2026-04-09 Phase 1~4 수정 적용 후 `npm start` 실행
> 총 3장: (1) command UI, (2) fight UI, (3) party/교체 UI

### 10-1. 싸운다(Fight) UI — 카테고리 아이콘 누락

**관찰**: 스크린샷 2에서 move info 패널(화면 우하단)에 타입 아이콘은 있으나 **물리/특수/변화 카테고리 아이콘**이 없음.

**원본 좌표** (`fight-ui-handler.ts:65-68`):
```typescript
this.moveCategoryIcon = globalScene.add
  .sprite(scaledCanvas.width - 25, -36, "categories", "physical")
  .setVisible(false);
// → 절대 좌표: (295, 144) — type icon 오른쪽 25px
```

**가설 1 (유력)**: `"categories"` atlas가 `constants.js` / `assets.js`에 미등록. texture 없으면 sprite 생성 실패 or 빈 오브젝트로 남음.

**가설 2**: `fight-ui-handler.js`의 `update()` 메서드에서 move.category 값을 읽지 못해 `setVisible(false)` 상태 유지.

**move info 패널 위치 자체**: 정상 (bottom-right message area, 원본과 동일)

---

### 10-2. 교체(Party) UI — partyBg 미표시 + 슬롯 부유

**관찰**: 스크린샷 3에서:
- 배틀 필드 위에 party 슬롯(`모다피`, `트라피더`)이 부유
- partyBg(배경 이미지)가 보이지 않아 배틀 화면이 그대로 노출됨
- 메시지창 하단은 "교체할 포켓몬을 선택하세요." 정상 표시

**party 슬롯 절대 좌표** (container y=180 기준):
```
index 0 (active, baseX=9):  absolute (9,  31.5)  ← 화면 최상단 근처
index 1 (bench, baseX=143): absolute (143, 12)   ← 화면 맨 위
index 2:                    absolute (143, 40)
index 3:                    absolute (143, 68)
index 4:                    absolute (143, 96)
index 5:                    absolute (143, 124)
```
이 좌표들은 PokeRogue 원본과 동일함. 즉 partyBg가 제대로 렌더됐다면 배경이 배틀 화면을 덮어야 정상.

**partyBg 코드** (`party-ui-handler.js:227`):
```js
this.partyBg = scene.add.image(0, 0, env.UI_ASSETS.partyBg.key).setOrigin(0, 1);
```
- origin(0, 1): 이미지 하단이 y=0에 위치 → container y=180이므로 이미지가 y=0~180 범위를 커버
- 이 설계는 전체 화면을 덮을 수 있음 (이미지 높이=180 가정)

**유력 원인**: `env.UI_ASSETS.partyBg.key` 텍스처가 Phaser 캐시에 없음 → 이미지 미표시. 슬롯은 렌더됨(깊이=56로 배틀 위에 표시되나 bg 없어 부유처럼 보임).

**확인 필요 순서**:
1. `constants.js`: `partyBg` 항목 정의 여부 + key/path 값
2. `assets.js`: `preload()` 내 partyBg 로드 코드
3. `assets/pokerogue/ui/` 폴더: `party_bg.png` 또는 유사 파일 존재 여부

---

### 10-3. 적 정보창 bg 1-2px 낮음

**관찰**: 스크린샷 1에서 적 info bg body(테라파고스)가 1-2px 낮아 보임.
- HP 바, 타입 아이콘, 이름 텍스트 위치는 정상
- bg 이미지 자체만 약간 내려간 것처럼 보임

**이식본 bg 코드** (`battle-info.js`):
```js
this.bg = scene.add.image(0, 0, this.getTextureName()).setOrigin(1, 0.5);
```

**원본** (`battle-info.ts:234`):
```typescript
this.box = globalScene.add.sprite(0, 0, this.getTextureName()).setName("box").setOrigin(1, 0.5);
```
좌표와 origin이 완전히 동일. 코드상 차이 없음.

**가설 1**: `pbinfo_enemy_mini.png` 이미지 자체의 실제 렌더 높이가 원본보다 2px 크거나 비대칭 패딩 포함. origin(1, 0.5)로 세로 중앙 정렬이므로, 이미지 높이가 1px 차이나면 0.5px 아래로 내려감.

**가설 2**: `enemyInfo.container` 위치가 절대 y=39인데, 원본 계산 `180+(-141)=39`는 맞으나 이식본 화면 해상도 관련 오차 가능성. 단, 320×180이 이미 맞춰져 있으므로 가능성 낮음.

**다음 조치**: `pbinfo_enemy_mini.png` 파일 크기를 확인하고, bg만 `y = -1` 조정 후 시각적으로 비교.

---

### 10-4. 정보창 위 텍스트 흐림 (지속 관찰)

**관찰**: 스크린샷 1에서 적/아군 정보창의 텍스트(이름, 레벨, HP 숫자)가 여전히 흐릿하게 보임.

**현재 상태**: BATTLE_INFO = 12px logical = 72px render 후 `setScale(1/6)`.

**비정수 좌표 목록** (`battle-info.js`):
```js
nameTextY: isPlayer ? -15.2 : -11.2   // 소수점
hpY:       isPlayer ? -1    : 4.5     // 소수점 (4.5)
shadowX: 3.5, shadowY: 3.5            // BATTLE_INFO shadow 소수점
```

**원본 확인 필요**: `battle-info.ts`의 실제 posParams — 원본도 동일 소수점 값인지. 동일하면 설계적 특성이므로 변경 불필요.

**현재 mitigation**: `createBaseText`에서 `t.setRoundPixels(true)` 이미 적용 중. 효과는 제한적.

**결론**: 이 수준의 흐림은 픽셀아트 폰트를 canvas Text로 렌더하는 한계. BitmapText 전환 없이는 근본 해결 어려울 수 있음. 우선순위 낮춤.

---

## 12. 스크린샷 정밀 분석 — Fight UI & Party UI 실제 문제 (2026-04-09)

> 분석 대상: `screenshots/` 폴더의 PokeRogue 원본 vs PKB 현재 스크린샷 직접 비교
> 결론: 이전 "수정 완료" 판정들이 잘못됨. 근본 원인을 새로 규명함.

---

### 12-A. Fight UI — 스크린샷 비교

#### PokeRogue 원본 Fight UI (screenshots/pokerogue - fight.avif 기준)
- 왼쪽 패널 (243×48px): 4개 기술 버튼 (2×2 그리드)
- 오른쪽 패널 (80×48px): 타입 아이콘, 카테고리 아이콘, PP, 위력, 명중률 — **그게 전부**
- 아무런 기술 이름 텍스트, 설명 텍스트, 토글 버튼, 풋터 버튼 없음

#### PKB 현재 Fight UI (screenshots/pkb fight.png 확인)
- 왼쪽 패널: 기술명 (Iron Defense, Sucker Punch, Energy Ball, Growth) 표시 — OK
- 오른쪽 패널: `lr |Steel|` / `Defense` 처럼 완전히 해독 불가능, 겹침 심각
- 하단: Back/Switch 버튼 왼쪽에 있음 — 시각적으로 어색

#### 오른쪽 패널 요소 수 비교

| 요소 | 원본 존재 | 현재 이식본 |
|------|-----------|------------|
| typeIcon (263, -36) | ✓ | ✓ |
| moveCategoryIcon (295, -36) | ✓ | ✓ |
| ppLabel + ppText (y=-26) | ✓ | ✓ |
| powerLabel + powerText (y=-18) | ✓ | ✓ |
| accuracyLabel + accuracyText (y=-10) | ✓ | ✓ |
| **moveNameText (249, -40)** | **✗ 없음** | **있음 — 제거 필요** |
| **descriptionText (249, -2)** | **✗ 없음** | **있음 — 제거 필요** |
| **토글 버튼 (Tera/Z/Mega 등)** | **✗ 없음** | **있음 — 재설계 필요** |
| **풋터 버튼 (Back/Switch)** | **✗ 없음** | **있음 — 재설계 필요** |

**80×48px 패널에 15개 요소 → 원본의 거의 두 배 → 판독 불가능**

#### 원본 대비 추가된 요소들의 올바른 배치 방향

1. **moveNameText**: 원본에 없음. 삭제.
   - 원본은 기술 이름을 왼쪽 패널 move 버튼 자체로 표시하며 별도 중복 표시 없음.

2. **descriptionText**: 원본에 없음. 삭제.
   - `MoveInfoOverlay`(전체화면 오버레이)가 설명을 담당. fight UI 패널 안에는 없음.

3. **토글 버튼 (Tera/Z/Mega/Ultra/Dmax)**:
   - 원본 PokeRogue: 기술 선택 UI가 아닌 **커맨드 UI에서 Tera 버튼 별도 배치** (command-ui-handler)
   - PKB 설계: 기술 선택 UI에 토글 포함 (커스텀) → 위치를 상단 여백에 배치해야 함
   - **올바른 위치**: movesWindow 상단 경계선 바깥, y=-60 정도 (window 프레임 위쪽 여백). 최대 5개지만 실전에서 1-2개.

4. **풋터 버튼 (Back/Switch)**:
   - 원본: B버튼(Cancel)으로 Back, 별도 Switch 버튼 없음
   - PKB: 마우스 조작 지원 위해 필요 → 왼쪽 패널 하단에 소형 배치
   - **이동 row1 기술버튼 y≈-22.7, 높이≈10px → 버튼 하단 ≈ y=-12.7**
   - **풋터 버튼 y=-12, height=12**: y=-12~0 → 하단 여백에 딱 맞음 (경계선 근처)
   - 단, Back (width 40, x=1) = x=1~41, Switch (width 40, x=44) = x=44~84 → 겹침 없음 ✓

---

### 12-B. Party UI — 스크린샷 비교 및 근본 원인 규명

#### PokeRogue 원본 Party UI (screenshots/pokerogue - party.jpeg 기준)
```
[왼쪽 열] 활성 슬롯 (110×49px 영역):
  - 포켓볼 아이콘 (작은 것)
  - 포켓몬 아이콘 (작은 픽셀아트)
  - 이름 (Corviknight) + 성별
  - Lv. 106
  - HP 바 + 346/346

[오른쪽 열] 5개 벤치 슬롯 (각 175×24px):
  - 포켓몬 아이콘 (작은 것)
  - 이름 + Lv.
  - HP 바 + HP 숫자

[하단] "Choose a Pokémon." 메시지 | Cancel 버튼
```

#### PKB 현재 Party UI (screenshots/pkb party.png 확인)
- 좌측 절반: 대형 포켓몬 스프라이트 2개 (배틀용 DOM 스프라이트)
- 우측: Klefki, Barr...kewda의 HP 바 행만 표시
- partyBg 없음 (배틀 필드 배경이 그대로 노출)
- 하단: Back 버튼, 메시지 텍스트

#### 근본 원인 1: renderModel()이 show() 숨김을 덮어씀 (핵심)

`party-ui-handler.js` `show()`에서:
```js
this.ui.enemySprite?.dom?.setVisible(false);  // 숨김
```

하지만 `ui.js` `renderModel()` 안에서:
```js
// line 226
this.enemySprite.dom.setVisible(!deferred);  // 매 렌더 사이클마다 무조건 실행 → show()의 숨김 덮어씀
```

`renderModel()`은 배틀 상태가 바뀔 때마다 호출되며, 내부에서 `deferred=false`이면 `setVisible(true)`를 강제 실행. `show()` 직후에 `renderModel()`이 호출되면 즉시 스프라이트가 다시 보임.

**올바른 수정 방향**: `ui.js`에 `this.partyModeActive` 플래그를 추가하고, `renderModel()` 내 sprite setVisible 호출 시 이 플래그 확인.

```js
// ui.js renderModel() 내 수정 대상:
if (this.enemySprite && !this.partyModeActive) {
  this.enemySprite.dom.setVisible(!deferred);
  // ...
}
```

#### 근본 원인 2: 아이콘 케이스 불일치 (Linux 파일시스템)

`iconPath(spriteId)` 함수:
```js
function iconPath(spriteId, shiny = false) {
  return `${state.assetBase.pokemon}/${shiny ? 'Icons shiny' : 'Icons'}/${spriteId}.png`;
  // → 예: './assets/Pokemon/Icons/klefki.png'
}
```

실제 파일:
```
/workspaces/pokemon-battle/assets/Pokemon/Icons/KLEFKI.png   ← 대문자
```

`resolveBattleRenderSpriteId()`는 Showdown 내부 ID(소문자 `klefki`)를 반환 → 경로에 대문자 파일이 없음 → Linux 케이스 센시티브 파일시스템에서 404 → `scene.textures.exists(iconKey)`가 false → `_applyIcon()` 조기 반환 → **아이콘 없이 포켓볼만 표시됨**.

따라서 PKB party 스크린샷에서 보이는 "대형 스프라이트 2개"는 파티 슬롯 아이콘이 아니라, **숨겨지지 않은 DOM 배틀 스프라이트**다. (근본원인 1)

**올바른 수정 방향**:
- Option A: `iconPath()`에서 `spriteId.toUpperCase()` 적용
- Option B: 아이콘 파일을 소문자로 일괄 rename (touch 이슈 없음)
- **Option A 권장**: 코드 1줄 수정으로 해결, 파일 변경 불필요

#### 근본 원인 3: partyBg가 DOM 스프라이트에 가려짐

partyBg PNG은 8-bit 컬러맵 포맷 (확인됨: `PNG image data, 320 x 180, 8-bit colormap`). Phaser/WebGL에서 palette PNG 디코딩 문제로 투명하게 렌더될 가능성 있음. 그러나 설령 정상 표시되더라도 DOM 스프라이트(1번 문제)는 canvas 최상단에 렌더되므로 가려짐.

1번 문제 해결 후 partyBg 표시 여부를 추가 확인해야 함.

---

### 12-C. 올바른 수정 계획 (내일 구현)

#### Fight UI 수정 계획

| 항목 | 수정 내용 |
|------|-----------|
| `moveNameText` 제거 | 코드에서 완전 삭제 (원본에 없음) |
| `descriptionText` 제거 | 코드에서 완전 삭제 (원본에 없음) |
| 오른쪽 패널 정리 | typeIcon, moveCategoryIcon, PP, Pow, Acc만 유지 → 원본과 동일 |
| 토글 버튼 이동 | movesWindow 위쪽 (y≈-60~-48) 부유 배치 OR 왼쪽 패널 상단 영역 |
| 풋터 버튼 이동 | 왼쪽 패널 하단 여백 (y=-12, x=1/44) — move buttons와 간격 확인 필요 |

**토글 버튼 구체 위치 후보**:
- `y=-62`, `x=1`, `width=30`, `spacing=33` → x=1,34,67,100,133 → 5개 모두 x<163 ✓ (왼쪽 패널 내)
- `y=-62`은 movesWindow 상단(y=-48) 위쪽 14px → window 프레임 위. 배틀 필드 영역에 부유. 이 위치가 시각적으로 자연스러움.

**풋터 버튼 위치 확인 필요**:
- movesContainer y=-38.7, row1 y=16 → 절대 y=-22.7, 텍스트 약 10px → 하단 y≈-12.7
- 풋터 bg y=-12, height=12 → y=-12~0. 기술 텍스트 하단(y≈-12.7)과 ~0.7px 차이 → 거의 겹침 없음
- 단, 텍스트 렌더 크기가 TEXT_RENDER_SCALE=6×10px=60px → scale 1/6 = 10px → 하단 y≈-12.7 확인

#### Party UI 수정 계획

| 항목 | 파일 | 수정 내용 |
|------|------|-----------|
| `partyModeActive` 플래그 추가 | `ui.js` | `this.partyModeActive = false` |
| renderModel() 스프라이트 조건부 | `ui.js` | `if (!this.partyModeActive)` 감싸기 |
| show()에서 플래그 설정 | `party-ui-handler.js` | `this.ui.partyModeActive = true` |
| clear()에서 플래그 해제 | `party-ui-handler.js` | `this.ui.partyModeActive = false` |
| 아이콘 경로 케이스 수정 | `app.js` line 3234 | `spriteId → spriteId.toUpperCase()` |
| partyBg PNG 확인 | 별도 | 1번 수정 후 표시 여부 확인 |

---

### 현재 파일별 완성도 재평가 (2026-04-09 스크린샷 정밀 분석 후)

| 파일 | 완성도 | 주요 남은 문제 |
|------|--------|--------------|
| `battle-info.js` | ~88% | Stats 컨테이너 미구현 |
| `player-battle-info.js` | ~85% | EXP 레벨업 사운드 처리 |
| `enemy-battle-info.js` | ~68% | flyout/effectiveness 미구현 |
| `fight-ui-handler.js` | ~55% | 오른쪽 패널 과밀 (moveNameText/descriptionText/토글/풋터 재설계 필요) |
| `command-ui-handler.js` | ~80% | Tera 파이프라인 미구현 |
| `battle-message-ui-handler.js` | ~75% | promptLevelUpStats 트리거 연결 |
| `party-ui-handler.js` | ~35% | DOM 숨김 미해결(renderModel 덮어씀), 아이콘 케이스 불일치 |
| `ui.js` | ~85% | partyModeActive 플래그 미구현 |
| `app.js` | ~90% | iconPath 케이스 불일치 |
| `text.js` (helpers) | ~95% | 완성 |
| `phaser-utils.js` | ~95% | 완성 |

---

## 13. 문서 동기화 메모 (2026-04-09 최종 정리)
- 이 문서의 **Section 12가 2026-04-09 시점의 최종 원인 분석과 수정 방향**이다.
- 즉, Phase 6의 Gemini 버그 픽스는 "수정 시도는 있었지만 최종 해결은 아니었다"로 해석해야 한다.
- 특히 핵심 두 가지는 다음과 같다.
  - Fight UI: 좌표 조정만으로는 부족하며, 원본에 없는 `moveNameText` / `descriptionText`를 제거해야 한다.
  - Party UI: `party-ui-handler.js`만이 아니라 `ui.js renderModel()`까지 같이 수정해야 DOM 스프라이트가 다시 나타나지 않는다.
- 다른 요약 문서와 충돌할 경우, **research.md section 12 + plan.md Phase 7**을 우선 기준으로 삼는다.
