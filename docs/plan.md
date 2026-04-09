# Plan: Fight UI & Party UI 수정 계획 (Phase 12)

> research.md 분석 기반. 구현 순서대로 정렬.  
> 모든 코드 스니펫은 실제 파일 기준.

---

## Task 1: party_bg 렌더링 수정 — rootContainer depth sort

**파일:** `src/pokerogue-transplant-runtime/ui/ui.js`  
**원인:** Phaser Container의 `sortChildrenFlag=false` 기본값. `setDepth()`가 Container 내 렌더 순서에 미반영. party container(depth 56)가 battle info containers(depth <56)보다 먼저 추가됐기 때문에 아래에 렌더됨.

**수정 위치:** `ui.js:setup()` 마지막 부분

**현재 코드 (ui.js:46-50):**
```js
Object.values(this.handlers).forEach(handler => handler?.container && this.rootContainer.add(handler.container));
[this.enemyTray.container, this.playerTray.container, this.enemyInfo.container, this.playerInfo.container, this.abilityBar.container].forEach(node => {
  if (node) this.rootContainer.add(node);
});
this.layout();
this.getMessageHandler()?.show(this.adapter.getMessageState());
```

**수정 후:**
```js
Object.values(this.handlers).forEach(handler => handler?.container && this.rootContainer.add(handler.container));
[this.enemyTray.container, this.playerTray.container, this.enemyInfo.container, this.playerInfo.container, this.abilityBar.container].forEach(node => {
  if (node) this.rootContainer.add(node);
});
// Phaser Container는 기본적으로 추가 순서로 렌더. depth sort 활성화로 setDepth() 반영.
this.rootContainer.sortChildrenFlag = true;
this.layout();
this.getMessageHandler()?.show(this.adapter.getMessageState());
```

**주의:** 이 변경 후 모든 handler container들이 depth 값에 따라 정렬됨. 현재 depth 값 확인:
- MESSAGE: `setDepth(50)`
- COMMAND: depth 미설정 → 0
- FIGHT: `setDepth(55)`
- PARTY: `setDepth(56)`
- TARGET_SELECT: depth 미설정 → 0
- enemyTray, playerTray, enemyInfo, playerInfo, abilityBar: depth 미설정 → 0

battle info containers들이 depth=0이면 MESSAGE(50), FIGHT(55), PARTY(56) 뒤에 렌더됨 → battle info가 fight/party UI 아래로 가버림!

**따라서 battle info containers에도 depth를 명시적으로 설정해야 함:**

`ui.js setup()`:
```js
// battle info containers depth 설정 (handler보다 낮게, 전투 중에는 위에 보여야 하므로 중간값 사용)
this.enemyTray.container?.setDepth(42);
this.playerTray.container?.setDepth(42);
this.enemyInfo.container?.setDepth(42);
this.playerInfo.container?.setDepth(42);
this.abilityBar.container?.setDepth(42);
// COMMAND/TARGET_SELECT handler depth 설정
this.handlers[UiMode.COMMAND]?.container?.setDepth(50);
this.handlers[UiMode.TARGET_SELECT]?.container?.setDepth(50);
```

**최종 depth 구조 (sortChildrenFlag 활성화 후):**
```
rootContainer 내부 렌더 순서 (낮은 depth = 아래):
  depth 42: enemyTray, playerTray, enemyInfo, playerInfo, abilityBar (배틀 중 표시)
  depth 50: MESSAGE handler, COMMAND handler, TARGET_SELECT handler
  depth 55: FIGHT handler
  depth 56: PARTY handler (파티 모드 시 모든 것 위에)
```

**party-ui-handler.js에서 partyModeActive 관련 수정 필요 없음.** depth sort가 올바르면 party container가 자동으로 battle info 위에 렌더됨. 하지만 partyModeActive 플래그도 유지 (DOM 스프라이트 제어용).

---

## Task 2: Party HP 텍스트 y 위치 수정

**파일:** `src/pokerogue-transplant-runtime/ui/handlers/party-ui-handler.js`  
**원인:** HP text y 좌표가 PokeRogue 원본(hpBar.y + hpBar.height - 2)과 불일치.

**원본 계산 (party-ui-handler.ts:2122-2129):**
```typescript
.setPositionRelative(
    this.slotHpBar,
    slotHpBar.width + hpTextToBarOffset.x,   // 100-3 = 97
    slotHpBar.height + hpTextToBarOffset.y,  // 7-2 = 5
)
// active: slotHpBar at (8,31) → hpText at (8+97, 31+5) = (105, 36)
// bench:  slotHpBar at (72,6) → hpText at (72+97, 6+5)  = (169, 11)
```

**현재 코드 (party-ui-handler.js:77, 88):**
```js
// active (isActive block)
this.hpText = addTextObject(this.ui, 105, 33, '', 'BATTLE_VALUE').setOrigin(1, 0);
// bench (!isActive block)
this.hpText = addTextObject(this.ui, 169, 6, '', 'BATTLE_VALUE').setOrigin(1, 0);
```

**수정 후:**
```js
// active
this.hpText = addTextObject(this.ui, 105, 36, '', 'BATTLE_VALUE').setOrigin(1, 0);
// bench
this.hpText = addTextObject(this.ui, 169, 11, '', 'BATTLE_VALUE').setOrigin(1, 0);
```

---

## Task 3: Party HP 라벨 이미지 추가 (party_slot_overlay_hp)

**파일:** `constants.js`, `assets.js`, `party-ui-handler.js`

### 3-1. constants.js에 에셋 키 추가

**현재 (`src/pokerogue-transplant-runtime/runtime/constants.js`):**
```js
partySlotHpBar: { key: 'pkb-ui-party-slot-hp-bar', url: './assets/pokerogue/ui/party_slot_hp_bar.png' },
```

**추가:**
```js
partySlotHpBar: { key: 'pkb-ui-party-slot-hp-bar', url: './assets/pokerogue/ui/party_slot_hp_bar.png' },
partySlotOverlayHp: { key: 'pkb-ui-party-slot-overlay-hp', url: './assets/pokerogue/ui/text_images/ko/party_ui/party_slot_overlay_hp_ko.png' },
partySlotOverlayLv: { key: 'pkb-ui-party-slot-overlay-lv', url: './assets/pokerogue/ui/text_images/ko/party_ui/party_slot_overlay_lv_ko.png' },
```

### 3-2. assets.js에 preload 등록

**현재 assets.js에서 partySlotHpBar 로드하는 위치 근처에 추가:**
```js
if (UI_ASSETS.partySlotHpBar) this.load.image(UI_ASSETS.partySlotHpBar.key, UI_ASSETS.partySlotHpBar.url);
// 추가:
if (UI_ASSETS.partySlotOverlayHp) this.load.image(UI_ASSETS.partySlotOverlayHp.key, UI_ASSETS.partySlotOverlayHp.url);
if (UI_ASSETS.partySlotOverlayLv) this.load.image(UI_ASSETS.partySlotOverlayLv.key, UI_ASSETS.partySlotOverlayLv.url);
```

### 3-3. party-ui-handler.js PartySlot.setup()에 hpLabel 추가

**active slot 내부 (isActive 블록), hpBarBase 추가 직후:**
```js
this.hpBarBase = scene.add.image(8, 31, env.UI_ASSETS.partySlotHpBar.key).setOrigin(0, 0);
// 추가: HP 라벨 이미지 (origin(1,0) — 오른쪽 끝이 x=23)
this.hpLabel = env.textureExists(scene, env.UI_ASSETS.partySlotOverlayHp?.key)
  ? scene.add.image(23, 31, env.UI_ASSETS.partySlotOverlayHp.key).setOrigin(1, 0)
  : null;
```

**bench slot 내부 (!isActive 블록):**
```js
this.hpBarBase = scene.add.image(72, 6, env.UI_ASSETS.partySlotHpBar.key).setOrigin(0, 0);
// 추가: HP 라벨 이미지 (오른쪽 끝이 x=87)
this.hpLabel = env.textureExists(scene, env.UI_ASSETS.partySlotOverlayHp?.key)
  ? scene.add.image(87, 6, env.UI_ASSETS.partySlotOverlayHp.key).setOrigin(1, 0)
  : null;
```

**row.add() 에 hpLabel 포함:**
```js
this.row.add([
  this.bgObj, this.pb, this.iconHolder,
  this.hpBarBase, this.hpBarFill,
  ...(this.hpLabel ? [this.hpLabel] : []),
  this.label, this.levelText, this.sublabel,
  ...(this.statusSprite ? [this.statusSprite] : []),
  this.hpText, this.hit,
]);
```

---

## Task 4: Party 아이콘 크기 수정

**파일:** `src/pokerogue-transplant-runtime/ui/handlers/party-ui-handler.js`  
**원인:** 아이콘 소스 128×64px → setScale(0.5) → 64×32px이지만 iconHolder는 18×18px.

**현재 `_applyIcon()` (party-ui-handler.js:188-192):**
```js
this.iconObj = this.scene.add.image(
  this.isActive ? 4 : 2,
  this.isActive ? 4 : 3,
  iconKey
).setOrigin(0, 0).setScale(0.5).setName(`party-icon-${this.index}`);
```

**수정 후:**
```js
// 128×64px 에셋을 18×18 영역에 맞게 표시
// 세로 기준: 64px → 18px → scale ≈ 0.28, 또는 setDisplaySize(18, 18) 사용
this.iconObj = this.scene.add.image(
  this.isActive ? 4 : 2,
  this.isActive ? 4 : 3,
  iconKey
).setOrigin(0, 0).setDisplaySize(18, 18).setName(`party-icon-${this.index}`);
```

**주의:** setDisplaySize는 원본 비율 무시. 만약 아이콘이 원래 정사각형이 아니라면 왜곡. 에셋 실측이 128×64이므로 비율 유지 시:
```js
.setDisplaySize(36, 18)  // 2:1 비율 유지 (실제 아이콘 영역은 18px 높이 기준)
```
→ 혹은 실제 렌더 결과 확인 후 조정. 여기서는 일단 `setDisplaySize(18, 18)` 로 임시 대응.

---

## Task 5: Fight UI 토글 버튼 y 위치 수정

**파일:** `src/pokerogue-transplant-runtime/ui/handlers/fight-ui-handler.js`  
**원인:** 토글 버튼 row 0이 y=-48 → 절대 y=132–144. typeIcon이 y=-36(abs=144)에 위치 → 정확히 겹침.

**현재 코드 (`fight-ui-handler.js:335`):**
```js
entry.button.setPosition(baseX + col * stride, -48 - row * 14);
// row 0 → y=-48 (abs=132, bottom=144)  ← typeIcon(144)과 겹침
// row 1 → y=-62 (abs=118, bottom=130)  ← 이미 window 위에 있음
```

**수정 후 (row 0도 window 위로 이동):**
```js
entry.button.setPosition(baseX + col * stride, -62 - row * 14);
// row 0 → y=-62 (abs=118, bottom=130)  ← window 상단(132) 위
// row 1 → y=-76 (abs=104, bottom=116)  ← 더 위
```

**주석 업데이트:**
```js
// Toggle buttons: above movesWindow top edge (y < -48)
// Row 0 at y=-62 (abs 118-130), row 1 at y=-76 (abs 104-116)
const baseX = 241;
const stride = 26;
const perRow = 3;
// ...
entry.button.setPosition(baseX + col * stride, -62 - row * 14);
```

---

## Task 6: Fight UI 풋터 버튼 hit area 분리 (선택사항)

**파일:** `src/pokerogue-transplant-runtime/ui/handlers/fight-ui-handler.js`  
**원인:** 풋터 버튼 hit area(abs y=167-179)가 하단 기술 row hit area(abs y=155-169)와 2px 겹침.

**현재 `updateFooterActions()` (fight-ui-handler.js:365-366):**
```js
entry.bg.setPosition(x, -13);
entry.label.setPosition(x + 20, -7);
entry.hit.setPosition(x, -13);
```

**수정 후 (y=-13 → y=-7로 올려 하단 기술과 분리):**
```js
entry.bg.setPosition(x, -7);
entry.label.setPosition(x + 20, -1);
entry.hit.setPosition(x, -7);
```

abs y=173–185 → abs y=179를 넘어가지만 화면 안(180)에서 약 5px 나가므로 일부 잘림.
안전하게 y=-11을 사용:
```js
entry.bg.setPosition(x, -11);
entry.label.setPosition(x + 20, -5);
entry.hit.setPosition(x, -11);
```
abs y=169–181 → 기술 row(155-169)와 겹침 없음. ✓

---

## 실행 순서 (내일)

1. **Task 1** (ui.js sortChildrenFlag) — party_bg 미커버 근본 해결. 가장 영향 큼.  
   → 수정 후 party_bg가 정상 표시되는지 스크린샷 확인.
2. **Task 2** (HP text y) — 단순 y값 수정. 빠름.
3. **Task 3** (HP label image) — assets 등록 + setup 수정. 중간 복잡도.
4. **Task 4** (icon size) — setDisplaySize 적용. 빠름. 에셋 차이로 완벽하지 않을 수 있음.
5. **Task 5** (toggle button y) — 단순 y값 수정. 빠름.
6. **Task 6** (footer hit area) — 선택사항. 체감 효과 미미.

**각 Task 후 스크린샷으로 시각 확인 후 CLAUDE.md 업데이트.**

---

## 참고: PokeRogue 원본 vs 이식본 HP 레이아웃 비교표

| 요소 | 원본 (active) | 원본 (bench) | 이식본 (active) | 이식본 (bench) |
|------|-------------|-------------|----------------|----------------|
| hpBar x | 8 | 72 | 8 ✓ | 72 ✓ |
| hpBar y | 31 | 6 | 31 ✓ | 6 ✓ |
| hpFill x | 24 | 88 | 24 ✓ | 88 ✓ |
| hpFill y | 33 | 8 | 33 ✓ | 8 ✓ |
| hpText x | 105 | 169 | 105 ✓ | 169 ✓ |
| hpText y | 36 | 11 | **33 ✗** | **6 ✗** |
| hpLabel x | 23 | 87 | ❌ 없음 | ❌ 없음 |
| hpLabel y | 31 | 6 | ❌ 없음 | ❌ 없음 |
