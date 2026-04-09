# 구현 계획 — PokeRogue UI 이식 버그 픽스 & 폰트 개선
> 기준: research.md 조사 결과 / 원본: pokerogue_codes/src/ui/
> 작업 원칙: 각 수정 전 반드시 원본 코드 확인 → 정확히 일치시킴

---

## Phase 1 — 즉시 버그 픽스 (낮은 위험, 독립적)

### 1-A. HP frame 임계값 수정

**원본 근거** (`pokerogue_codes/src/ui/battle-info/battle-info.ts:532`):
```typescript
const hpFrame = this.hpBar.scaleX > 0.5 ? "high" : this.hpBar.scaleX > 0.25 ? "medium" : "low";
```
medium → low 전환이 25% (0.25). 이식본은 20%로 잘못됨.

**파일**: `src/pokerogue-transplant-runtime/ui/battle-info/battle-info.js`  
**위치**: line 227

```js
// BEFORE
const frame = pct > 50 ? 'high' : pct > 20 ? 'medium' : 'low';

// AFTER
const frame = pct > 50 ? 'high' : pct > 25 ? 'medium' : 'low';
```

---

### 1-B. wordWrapWidth 수정 — battle-message-ui-handler

**원본 근거** (`pokerogue_codes/src/ui/handlers/battle-message-ui-handler.ts:24,149`):
```typescript
public readonly wordWrapWidth: number = 1780;
// show() 시: this.message.setWordWrapWidth(this.wordWrapWidth)
```
원본 `addTextObject`는 96px 렌더 + scale 1/6. wordWrap.width=1780은 96px canvas 기준 → logical display = 1780/6 ≈ **297px**.

이식본 `createBaseText`는 `wordWrap.width * 6` 변환을 내부에서 처리하므로 **logical 단위(297)를 전달**.

**파일**: `src/pokerogue-transplant-runtime/ui/handlers/battle-message-ui-handler.js`  
**위치**: line 19

```js
// BEFORE
// Message area is ~243px wide, container starts at x=12; right margin ~16px → ~215px
this.wordWrapWidth = 215;

// AFTER
// 원본: wordWrapWidth=1780 (96px canvas) → logical = 1780/6 ≈ 297px
// createBaseText가 내부에서 ×6 처리하므로 logical 값 전달
this.wordWrapWidth = 297;
```

`show()` 메서드의 `setTextWordWrap(this.message, this.wordWrapWidth, true)` — wordWrapWidth를 참조하므로 자동 반영됨.

---

### 1-C. wordWrapWidth 수정 — command-ui-handler

**원본 근거** (`pokerogue_codes/src/ui/handlers/command-ui-handler.ts:98`):
```typescript
messageHandler.message.setWordWrapWidth(this.canTera() ? 910 : 1110);
// Tera 불가: 1110/6 = 185px logical
// Tera 가능: 910/6 ≈ 151.7 → 152px logical
```

**파일**: `src/pokerogue-transplant-runtime/ui/handlers/command-ui-handler.js`  
**위치**: line 65

```js
// BEFORE
this.env.setTextWordWrap(messageHandler.message, this.canTera() ? 91 : 111, true);

// AFTER
// 원본: Tera불가 1110/6=185, Tera가능 910/6≈152 (logical px)
this.env.setTextWordWrap(messageHandler.message, this.canTera() ? 152 : 185, true);
```

---

## Phase 2 — 폰트 렌더링 개선 (중간 위험, 순서 중요)

> **주의**: Phase 2 작업들은 순서대로 진행할 것. 2-A → 2-B → 2-C → 브라우저 확인 후 2-D.

### 2-A. controller.js — Game resolution 1로 통일

**문제**: Game `resolution: DPR>1?2:1`이면 Retina(DPR=2)에서 내부 framebuffer가 640×360. 하지만 각 Text 오브젝트는 `resolution:1` 강제 → 불일치 → 텍스트 흐림.

**원본 PokeRogue**는 Game resolution=1 사용 (1920×1080 논리 게임은 CSS transform으로 확대).

**파일**: `src/pokerogue-transplant-runtime/runtime/controller.js`  
**위치**: line 104-116

```js
// BEFORE
const renderResolution = window.devicePixelRatio > 1 ? 2 : 1;
this.game = new Phaser.Game({
  type: Phaser.AUTO,
  width: LOGICAL_WIDTH,
  height: LOGICAL_HEIGHT,
  parent: this.mount,
  transparent: false,
  backgroundColor: '#000000',
  pixelArt: true,
  antialias: false,
  roundPixels: true,
  autoRound: true,
  resolution: renderResolution,
  dom: { createContainer: true },
  scale: {
    mode: Phaser.Scale.INTEGER_SCALE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: LOGICAL_WIDTH,
    height: LOGICAL_HEIGHT,
  },
  scene: [scene],
});

// AFTER
this.game = new Phaser.Game({
  type: Phaser.AUTO,
  width: LOGICAL_WIDTH,
  height: LOGICAL_HEIGHT,
  parent: this.mount,
  transparent: false,
  backgroundColor: '#000000',
  pixelArt: true,
  antialias: false,
  roundPixels: true,
  autoRound: true,
  resolution: 1,  // 원본 PokeRogue와 동일; INTEGER_SCALE이 CSS 확대 담당
  dom: { createContainer: true },
  scale: {
    mode: Phaser.Scale.INTEGER_SCALE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: LOGICAL_WIDTH,
    height: LOGICAL_HEIGHT,
  },
  scene: [scene],
});
```

`renderResolution` 변수 및 선언 라인(104) 삭제.

---

### 2-B. text.js — TEXT_STYLE 폰트 크기 원본 맞춤 + shadow 추가

**원본 근거** (`pokerogue_codes/src/ui/text.ts`):

| 원본 TextStyle | 렌더 크기 (px) | scale 후 logical | shadow (x, y) | 색상 |
|---------------|--------------|-----------------|---------------|------|
| MESSAGE | 96 | **16px** | (4, 5) | #f8f8f8, shadow #6b5a73 |
| WINDOW | 96 | **16px** | (3, 3) | #f8f8f8, shadow #6b5a73 |
| WINDOW_BATTLE_COMMAND | 96 | **16px** | (4, 5) | #f8f8f8, shadow #6b5a73 |
| BATTLE_INFO | 72 (96-24) | **12px** | (3.5, 3.5) | #f8f8f8, shadow #6b5a73 |
| MOVE_INFO_CONTENT | 56 (96-40) | **~9px** | (3, 3) | #f8f8f8, shadow #6b5a73 |
| PARTY / MOVE_LABEL | 48 (96-48) | **8px** | (4, 5) | #f8f8f8, shadow #707070 |

> 이식본의 8px 고정이 원본의 12~16px과 달랐던 것이 레이아웃 불일치의 근본 원인.

**파일**: `src/pokerogue-transplant-runtime/ui/helpers/text.js`  
**위치**: line 1-14 전체 교체

```js
// BEFORE
const TEXT_STYLE = Object.freeze({
  WINDOW: { fontSize: 8, color: '#f8fbff' },
  WINDOW_BATTLE_COMMAND: { fontSize: 8, color: '#f8fbff' },
  BATTLE_INFO: { fontSize: 8, color: '#f8fbff' },
  BATTLE_INFO_SMALL: { fontSize: 6, color: '#dbeafe' },
  BATTLE_LABEL: { fontSize: 6, color: '#dbeafe' },
  BATTLE_VALUE: { fontSize: 6, color: '#eff6ff' },
  HINT: { fontSize: 6, color: '#94a3b8' },
});

export function addTextObject(ui, x, y, text = '', styleKey = 'WINDOW', options = {}) {
  const style = TEXT_STYLE[styleKey] || TEXT_STYLE.WINDOW;
  return ui.env.createBaseText(ui.scene, x, y, text, style.fontSize, style.color, options);
}

export function getTextColor(styleKey = 'WINDOW') {
  return (TEXT_STYLE[styleKey] || TEXT_STYLE.WINDOW).color;
}

// AFTER
// fontSize = logical px (createBaseText가 ×TEXT_RENDER_SCALE 처리)
// shadowX/Y = Phaser Text 내부 unscaled canvas 기준값 (원본 getTextStyleOptions() 와 동일)
const TEXT_STYLE = Object.freeze({
  // 원본 WINDOW/MESSAGE: fontSize=96 → scale 1/6 → logical 16px, shadow(3,3)
  WINDOW:                { fontSize: 16, color: '#f8f8f8', shadowColor: '#6b5a73', shadowX: 3,   shadowY: 3   },
  // 원본 WINDOW_BATTLE_COMMAND: fontSize=96 → logical 16px, shadow 기본(4,5)
  WINDOW_BATTLE_COMMAND: { fontSize: 16, color: '#f8f8f8', shadowColor: '#6b5a73', shadowX: 4,   shadowY: 5   },
  // 원본 BATTLE_INFO: fontSize=72 (96-24) → logical 12px, shadow(3.5,3.5)
  BATTLE_INFO:           { fontSize: 12, color: '#f8f8f8', shadowColor: '#6b5a73', shadowX: 3.5, shadowY: 3.5 },
  // 원본 PARTY/MOVE_LABEL: fontSize=48 (96-48) → logical 8px — 유지
  BATTLE_INFO_SMALL:     { fontSize: 8,  color: '#f8f8f8', shadowColor: '#707070', shadowX: 4,   shadowY: 5   },
  // 원본 MOVE_INFO_CONTENT: fontSize=56 (96-40) → logical ~9px, shadow(3,3)
  BATTLE_LABEL:          { fontSize: 9,  color: '#f8f8f8', shadowColor: '#6b5a73', shadowX: 3,   shadowY: 3   },
  BATTLE_VALUE:          { fontSize: 9,  color: '#f8f8f8', shadowColor: '#6b5a73', shadowX: 3,   shadowY: 3   },
  HINT:                  { fontSize: 6,  color: '#94a3b8', shadowColor: '#334155', shadowX: 1,   shadowY: 1   },
});

export function addTextObject(ui, x, y, text = '', styleKey = 'WINDOW', options = {}) {
  const style = TEXT_STYLE[styleKey] || TEXT_STYLE.WINDOW;
  const t = ui.env.createBaseText(ui.scene, x, y, text, style.fontSize, style.color, options);
  // Shadow: 원본 원본 addTextObject()의 setShadow(shadowXpos, shadowYpos, shadowColor)와 동일
  // TEXT_RENDER_SCALE이 동일하므로 unscaled canvas 기준값을 그대로 전달
  if (style.shadowColor != null) {
    t.setShadow(style.shadowX, style.shadowY, style.shadowColor, 0, true, true);
  }
  return t;
}

export function getTextColor(styleKey = 'WINDOW') {
  return (TEXT_STYLE[styleKey] || TEXT_STYLE.WINDOW).color;
}
```

---

### 2-C. phaser-utils.js — createBaseText lineSpacing 기본값 추가

**원본 근거** (`pokerogue_codes/src/ui/text.ts:26-28`):
```typescript
if (!(styleOptions as Phaser.Types.GameObjects.Text.TextStyle).lineSpacing) {
  ret.setLineSpacing(scale * 30);  // = 1/6 * 30 = 5
}
```
원본은 lineSpacing이 없을 때 5를 기본 적용. 이식본에 없음.

**파일**: `src/pokerogue-transplant-runtime/runtime/phaser-utils.js`  
**위치**: line 45-54

```js
// BEFORE
  const t = scene.add.text(x, y, text, {
    fontFamily: 'emerald, pkmnems, monospace',
    fontSize: `${fontSize * S}px`,
    color,
    resolution: 1,
    ...processedOptions,
  });
  t.setScale(1 / S);
  t.setRoundPixels?.(true);
  return t;

// AFTER
  const t = scene.add.text(x, y, text, {
    fontFamily: 'emerald, pkmnems, monospace',
    fontSize: `${fontSize * S}px`,
    color,
    resolution: 1,
    ...processedOptions,
  });
  t.setScale(1 / S);
  // 원본: ret.setLineSpacing(scale * 30) = (1/6) * 30 = 5
  // options에 lineSpacing이 없을 때만 기본값 적용
  if (!processedOptions.lineSpacing && processedOptions.lineSpacing !== 0) {
    t.setLineSpacing(5);
  }
  t.setRoundPixels?.(true);
  return t;
```

> **주의**: `battle-message-ui-handler.js:52`에서 `lineSpacing: 1`을 명시 전달 중. 이 경우 5 아닌 1을 사용함. 원본에서 messageContainer message는 lineSpacing 지정 없으므로 5가 맞다. 해당 `lineSpacing: 1` 옵션은 제거한다.

**파일**: `src/pokerogue-transplant-runtime/ui/handlers/battle-message-ui-handler.js`  
**위치**: line 51-53

```js
// BEFORE
    this.message = env.createBaseText(scene, 0, 0, '', 8, '#f8fbff', {
      lineSpacing: 1,
      wordWrap: { width: this.wordWrapWidth, useAdvancedWrap: true },
    }).setOrigin(0, 0).setName('text-battle-message');

// AFTER
    this.message = env.createBaseText(scene, 0, 0, '', 8, '#f8fbff', {
      wordWrap: { width: this.wordWrapWidth, useAdvancedWrap: true },
    }).setOrigin(0, 0).setName('text-battle-message');
```

단, message는 `addTextObject`가 아닌 `createBaseText`를 직접 호출하므로 shadow 미적용. 필요 시:
```js
// createBaseText 호출 후 추가 (MESSAGE style: shadow #6b5a73, 4, 5)
this.message.setShadow(4, 5, '#6b5a73', 0, true, true);
```

---

## Phase 3 — 폰트 크기 변경 후 좌표 재조정

> Phase 2 완료 후 브라우저 확인. 시각적으로 깨진 부분만 이 단계에서 수정.

### 3-A. battle-info.js — BATTLE_INFO 12px로 인한 nameText 영역 초과 대응

**원본 근거** (`pokerogue_codes/src/ui/battle-info/battle-info.ts:629-654`):
PokeRogue는 `updateNameText()`에서 이름이 너무 길면 `"..."` 처리:
```typescript
while (nameTextWidth > (this.player || !this.boss ? 60 : 98) - (...)) {
  displayName = `${displayName.slice(0, -1).trimEnd()}.`;
}
```

이식본에 이 로직이 없음. 12px 폰트에서 긴 이름이 정보창 영역을 초과할 수 있음.

**파일**: `src/pokerogue-transplant-runtime/ui/battle-info/battle-info.js`  
**위치**: `update()` 메서드 내 Name 섹션 (line 257-258)

```js
// BEFORE
    // --- Name ---
    const displayName = info.displayName || '—';
    this.nameText.setText(displayName);

// AFTER
    // --- Name ---
    // 원본 updateNameText()의 truncation 로직 반영
    // 허용 너비: enemy non-boss=60px, enemy boss=98px, player=60px (logical, BATTLE_INFO 12px 기준)
    const rawName = info.displayName || '—';
    const maxNameWidth = this.isPlayer ? 60 : (info.isBoss ? 98 : 60);
    let displayName = rawName;
    this.nameText.setText(displayName);
    // 실제 display width는 scale(1/6)이 적용된 logical 값
    while (this.nameText.displayWidth > maxNameWidth && displayName.length > 1) {
      displayName = (displayName.endsWith('.') ? displayName.slice(0, -2) : displayName.slice(0, -1)).trimEnd() + '.';
      this.nameText.setText(displayName);
    }
```

---

### 3-B. command-ui-handler.js — commandsContainer 위치 검토

**원본**: `commandsContainer = globalScene.add.container(217, -38.7)`  
**이식본**: 동일 `(217, -38.7)` — 변경 불필요.

command entries 좌표 (원본과 이식본 모두):
- FIGHT: `(0, 0)`, BALL: `(55.8, 0)`, POKEMON: `(0, 16)`, RUN: `(55.8, 16)`

WINDOW_BATTLE_COMMAND가 16px로 커지면 y=16 간격에 16px 폰트 → PokeRogue 원본과 동일 조건이므로 OK.

---

### 3-C. fight-ui-handler.js — movesContainer 위치 검토

**원본**: `movesContainer = globalScene.add.container(18, -38.7)`  
**이식본**: 동일 `(18, -38.7)` — 변경 불필요.

move entries 좌표 (원본 TextStyle.WINDOW 사용):
- `(0,0)`, `(114,0)`, `(0,16)`, `(114,16)` — 원본과 동일.

WINDOW 16px + 16px 간격 — PokeRogue 원본과 동일 조건이므로 OK.

---

### 3-D. battle-message-ui-handler.js — messageContainer 내 좌표 검토

원본 messageContainer: `container(12, -39)` — 이식본 동일.

폰트 변경 시 영향:
- `message` fontSize 8 → 16(WINDOW). 하지만 message는 `createBaseText(scene, 0, 0, '', 8)` — 직접 8px 지정. 폰트 크기를 16으로 올리려면:

```js
// BEFORE (battle-message-ui-handler.js line 51)
    this.message = env.createBaseText(scene, 0, 0, '', 8, '#f8fbff', {

// AFTER — 원본 MESSAGE style = 96px render = 16px logical
    this.message = env.createBaseText(scene, 0, 0, '', 16, '#f8fbff', {
```

message 16px + maxLines=2 + lineSpacing=5 → 높이 ≈ 37px → commandWindow 48px 내에 맞음. ✓

nameText도 확인:
```js
// BEFORE (line 58)
    this.nameText = env.createBaseText(scene, 8, 1, '', 8, '#f8fbff').setOrigin(0, 0);

// AFTER — 원본 nameText도 TextStyle.MESSAGE(16px)
    this.nameText = env.createBaseText(scene, 8, 1, '', 16, '#f8fbff').setOrigin(0, 0);
```

nameBox 높이 16px에 16px 폰트 — 원본과 동일. ✓

---

## Phase 4 — 타입 아이콘 위치 미세 조정 (조사 필요)

현재 오프셋 값 (`-15,-15.5` / `-15,-2.5` / `0,-15.5`)은 원본과 동일.

**원인 조사 방법**:
1. `assets/pokerogue/ui/pbinfo_enemy_type1.json` 열어서 frame trim 여부 확인
2. Phaser에서 trimmed atlas frame은 `realSize`와 `sourceSize`가 다름 → origin(0,0)이라도 실제 위치 오프셋 발생 가능
3. browser DevTools → 해당 sprite 객체 선택 → bounds 확인

**파일**: `assets/pokerogue/ui/pbinfo_enemy_type1.json` — 조사 후 결정

---

## 실행 순서 & 체크리스트

```
[x] Phase 1-A: battle-info.js HP 임계값 (pct > 20 → pct > 25)
[x] Phase 1-B: battle-message-ui-handler.js wordWrapWidth (215 → 297)
[x] Phase 1-C: command-ui-handler.js wordWrapWidth (91/111 → 152/185)
    ↓ 브라우저 확인: 메시지 줄바꿈 개선 확인
[x] Phase 2-A: controller.js resolution (DPR 기반 → 1 고정)
    ↓ 브라우저 확인: 전체 렌더 확인
[x] Phase 2-B: text.js TEXT_STYLE 폰트 크기 + shadow 추가
[x] Phase 2-C: phaser-utils.js lineSpacing 기본값 5 추가
              battle-message-ui-handler.js lineSpacing: 1 제거 + fontSize 8→16
    ↓ 브라우저 확인: 텍스트 크기 변화 확인
[x] Phase 3-A: battle-info.js nameText truncation 추가
[ ] Phase 3-D: battle-message-ui-handler.js message/nameText fontSize 8→16
    ↓ 브라우저 확인: 전체 레이아웃 검증
[x] Phase 3-B: command-ui-handler 좌표 검토 → 원본과 동일, 변경 불필요
[x] Phase 3-C: fight-ui-handler 좌표 검토 → 원본과 동일, 변경 불필요
[x] Phase 3-D: battle-message-ui-handler fontSize 8→16 (2-C에서 완료)
[+] 추가 버그픽스: battle-message-ui-handler showNameText/render에서 .width → .displayWidth
[x] Phase 4: 타입 아이콘 atlas json 조사 완료
    → pbinfo_enemy_type1.json은 multiatlas "textures" 포맷
    → overlay_hp.json도 동일 포맷 + load.atlas()로 로드 → 양쪽 일치, 수정 불필요
    → 1px 오프셋은 PokeRogue 원본과 동일한 trim 동작으로 inherent (수정 불필요)
[x] CLAUDE.md 업데이트
```

---

## 영향 범위 요약

| 파일 | Phase | 변경 내용 | 위험도 |
|------|-------|----------|--------|
| `battle-info.js` | 1-A, 3-A | HP 임계값, nameText 잘림 | 낮음 |
| `battle-message-ui-handler.js` | 1-B, 2-C, 3-D | wordWrapWidth, lineSpacing, fontSize | 낮음 |
| `command-ui-handler.js` | 1-C | wordWrapWidth | 낮음 |
| `controller.js` | 2-A | resolution 1 고정 | 중간 |
| `text.js` | 2-B | 폰트 크기 + shadow | 중간 |
| `phaser-utils.js` | 2-C | lineSpacing 기본값 | 낮음 |

---

## 참고: 원본 비교 파일 위치

- 텍스트 스타일: `pokerogue_codes/src/ui/text.ts` (getTextStyleOptions, getTextColor)
- Battle Info: `pokerogue_codes/src/ui/battle-info/battle-info.ts` (updateNameText, updateHpFrame)
- 메시지 핸들러: `pokerogue_codes/src/ui/handlers/battle-message-ui-handler.ts` (setup, show)
- 커맨드 핸들러: `pokerogue_codes/src/ui/handlers/command-ui-handler.ts` (show)

---

## Phase 5 — 2026-04-09 스크린샷 발견 버그

> 스크린샷 1(command), 2(fight), 3(party) 세 장 분석 결과.
> 구현 전 반드시 각 항목의 "조사 필요" 단계를 먼저 수행할 것.

### 5-A. 싸운다 UI — 기술 카테고리 아이콘 누락

**원본 근거** (`pokerogue_codes/src/ui/handlers/fight-ui-handler.ts:65-68`):
```typescript
this.moveCategoryIcon = globalScene.add
  .sprite(globalScene.scaledCanvas.width - 25, -36, "categories", "physical")
  .setVisible(false);
```
- atlas key: `"categories"`, frame: `"physical"` / `"special"` / `"status"`
- 위치: `(295, -36)` in fieldUI (absolute y = 180+0+(-36) = 144) → bottom-right message area

**이식본 조사 순서**:
1. `src/pokerogue-transplant-runtime/runtime/constants.js`에서 categories atlas 키 확인
2. `src/pokerogue-transplant-runtime/runtime/assets.js`에서 로드 여부 확인
3. `fight-ui-handler.js`에서 `moveCategoryIcon` 생성 및 `update()`에서 frame 설정 확인

**파일**: `src/pokerogue-transplant-runtime/ui/handlers/fight-ui-handler.js`
**예상 수정 방향**: categories atlas 미등록 → `constants.js` + `assets.js`에 추가, fight-ui-handler에서 올바른 키 사용

---

### 5-B. 교체 UI — partyBg 미표시

**증상** (스크린샷 3): 배경 이미지 없이 party 슬롯만 배틀 화면 위에 浮上

**이식본 코드** (`party-ui-handler.js:227`):
```js
this.partyBg = scene.add.image(0, 0, env.UI_ASSETS.partyBg.key).setOrigin(0, 1);
```
- origin(0, 1) + container y=180 → 이미지 하단이 y=180에 위치 → 전체 화면 커버 (정상 설계)

**조사 순서**:
1. `constants.js`에서 `partyBg` 키 정의 확인
2. `assets.js`에서 실제 `load.image(partyBg.key, partyBg.path)` 호출 여부 확인
3. `assets/pokerogue/ui/` 폴더에서 파티 배경 이미지 파일 존재 여부 확인
4. Phaser DevTools에서 texture key로 실제 로드됐는지 확인

**예상 수정 방향**: 키 미등록 or 경로 오류 → constants.js/assets.js 수정

---

### 5-C. 적 정보창 bg 1-2px 낮음

**증상** (스크린샷 1): 적 info bg body가 1-2px 아래로 처짐. HP 바·타입아이콘·텍스트는 정상.

**원본 근거** (`pokerogue_codes/src/ui/battle-info/battle-info.ts:234`):
```typescript
this.box = globalScene.add.sprite(0, 0, this.getTextureName()).setName("box").setOrigin(1, 0.5);
```
이식본:
```js
this.bg = scene.add.image(0, 0, this.getTextureName()).setOrigin(1, 0.5);
```
- 원본과 동일 좌표 + origin. 차이 없음.

**조사 필요**:
- `pbinfo_enemy_mini.png` / `pbinfo_enemy_boss.png` 실제 이미지 픽셀 크기 확인
- PokeRogue 원본이 사용하는 `pbinfo_enemy_mini` frame의 실제 렌더 높이
- `enemy-battle-info.ts`에서 EnemyBattleInfo 컨테이너 위치 재확인 (`super(140, -141)`)
- 이식본 `ui.js`의 `enemyInfo.container?.setPosition(140, 39)` 확인

**예상 수정 방향**:
```js
// bg만 y를 -1 또는 -2 오프셋 적용 (다른 요소 건드리지 말 것)
this.bg = scene.add.image(0, -1, this.getTextureName()).setOrigin(1, 0.5);
// → 조사 후 실제 값 결정
```

---

### 5-D. 폰트 흐림 — 비정수 좌표 수정 시도

**원인 가설**: `battle-info.js`의 `pos` 값에 소수점 포함 → 서브픽셀 렌더링

```js
// 현재 이식본 (battle-info.js)
const nameTextX = this.isPlayer ? -115 : -124;
const nameTextY = this.isPlayer ? -15.2 : -11.2;  // ← 소수점!
levelY: this.isPlayer ? -10  : -5,
hpY:    this.isPlayer ? -1   : 4.5,                // ← 소수점!
```

**원본** (`battle-info.ts`):
```typescript
// player posParams
nameTextX = -115, nameTextY = -15.2  // 원본도 소수점... 확인 필요
hpBarY: player ? -1 : 4.5            // 원본도 소수점
```

**조사 필요**: `pokerogue_codes/src/ui/battle-info/battle-info.ts`의 posParams 정의 구체적 값 확인. 원본도 소수점이면 이 방향은 효과 없음.

**대안**: `this.nameText.setRoundPixels(true)` — `createBaseText`에서 이미 `t.setRoundPixels(true)` 호출 중. 이미 적용됨.

**결론**: 흐림의 근본 원인은 `12px logical`(BATTLE_INFO) 텍스트가 `72px canvas`로 렌더 후 `1/6` 축소 시 발생하는 pixelArt 방식의 한계일 가능성 높음. BitmapFont 전환이 아니면 해결 어려울 수 있음.

---

## 실행 순서 업데이트 (Phase 5 추가)

```
[x] Phase 1-A~C: HP 임계값, wordWrapWidth 수정
[x] Phase 2-A~C: resolution 통일, text.js 폰트 크기, lineSpacing
[x] Phase 3-A~D: nameText truncation, 좌표 검토, message fontSize (16px), shadow 적용
[x] Phase 4: 타입 아이콘 atlas 조사 완료
[x] CLAUDE.md 업데이트
[x] Phase 5-A: categories atlas 조사 완료 — 이미 정상 구현됨
    → categoriesAtlas: constants.js ✓, assets.js multiatlas ✓, 파일 ✓, 프레임(physical/special/status) ✓
    → fight-ui-handler.js: moveCategoryIcon 생성·업데이트 코드 이미 구현됨
[x] Phase 5-B: partyBg — 코드 정상 확인 완료
    → party_bg.png 320×180 존재, URL 정상, assets.js 로드 정상, container 설계 정상 ✓
[x] Phase 5-C: enemy info bg y 오프셋 — enemy-battle-info.js에서 bg.setY(-1) 적용
    → 원본 코드는 동일(y=0)하나 렌더링 아티팩트로 enemy만 -1px 보정
[~] Phase 5-D: 폰트 흐림 — 원본도 동일 소수점 좌표, BitmapFont 전환 없이는 근본 해결 불가 → 스킵
[x] Phase 5-E: fight-ui-handler 아이콘 초기 visibility 수정
    → typeIcon, moveCategoryIcon 모두 .setVisible(false) 추가 (원본 fight-ui-handler.ts:63,67 일치)
[x] Phase 5-F: fight-ui-handler 아이콘 scale 수정
    → typeIcon: setScale(0.55) → setScale(0.8) (원본 ts:269)
    → moveCategoryIcon: setScale(0.55) → setScale(1.0) (원본 ts:272)
    → updateMoveDetail()에서도 setTexture 후 setScale 호출 추가
```
