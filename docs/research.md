# Research: Fight UI & Party UI 버그 심층 분석

> 기준: 2026-04-09 스크린샷 비교 + 소스 코드 정밀 분석  
> 스크린샷: `screenshots/20260409 fight.png`, `screenshots/20260409 party.png`  
> 원본 참조: `pokerogue_codes/src/ui/handlers/fight-ui-handler.ts`, `party-ui-handler.ts`

---

## 1. Fight UI

### 1-A. 게임 좌표 기준 정리

```
container (0, 180)  ← 이 기준에서 모든 y 값은 음수
  movesContainer (18, -38.7)  → abs y = 141.3
    slot 0 label: x=18, y=141.3
    slot 1 label: x=132, y=141.3
    slot 2 label: x=18, y=157.3
    slot 3 label: x=132, y=157.3
    hit areas (rect -2 to +12 from label y):
      row0: abs y=139.3–153.3
      row1: abs y=155.3–169.3

  moveInfoContainer (1, 0)  → abs (1, 180)
    typeIcon:       abs (264, 144)    [x=1+263, y=180-36]
    moveCategoryIcon: abs (296, 144)  [x=1+295, y=180-36]
    ppLabel:        abs (251, 154)    [y=180-26]
    ppText:         abs (309, 154)
    powerLabel:     abs (251, 162)    [y=180-18]
    powerText:      abs (309, 162)
    accuracyLabel:  abs (251, 170)    [y=180-10]
    accuracyText:   abs (309, 170)

  moveDetailsWindow (background nineslice):
    origin(0,1): x=240, y=0 (container) → abs y=180
    size: 80×48 → occupies abs x=240–320, y=132–180

  toggleButtons (updateToggles, in this.container):
    row 0: x=241, y=container -48 → abs y=132,  bottom at abs y=144
    row 1: x=241, y=container -62 → abs y=118,  bottom at abs y=130

  footerButtons (updateFooterActions, in this.container):
    x=1, y=container -13 → abs y=167 (Back)
    x=44, y=container -13 → abs y=167 (Switch)
    size: 40×12 → abs y=167–179
```

### 1-B. 버그 1: 토글 버튼이 typeIcon과 겹침

**원인:**
- toggleButtons row 0이 y=-48(abs=132)에서 height=12 → 아래 경계 abs y=144
- typeIcon이 y=-36(abs=144)에 위치
- 두 요소가 **y=144 라인을 공유** → 시각적으로 겹침

**현재 코드 (`fight-ui-handler.js:333`):**
```js
entry.button.setPosition(baseX + col * stride, -48 - row * 14);
// row 0 → y=-48, row 1 → y=-62
```

**문제:** row 0(y=-48)은 moveDetailsWindow 상단(y=-48)과 같은 위치. 토글 버튼이 window 바로 위에 붙어 있어야 하는데 오히려 window 안으로 들어감. typeIcon(y=-36) 위쪽 12px와 정확히 겹침.

**원본 PokeRogue에는 토글 버튼 없음.** PKB 커스텀 요소이므로 배치 기준을 자체 결정해야 함.

**올바른 배치:** 모든 토글 버튼을 window 위(y < -48)에 배치.
```js
// 수정 후: row 0 → y=-62, row 1 → y=-76
entry.button.setPosition(baseX + col * stride, -62 - row * 14);
```

### 1-C. 버그 2: 풋터 버튼 hit area가 하단 기술 row hit area와 2px 겹침

**수치 분석:**
- 기술 row 1 hit area: abs y=155.3–169.3 (hit rect y-2 to y+12 from label)
- 풋터 버튼 hit area: abs y=167–179 (bg height 12)
- **겹치는 구간:** abs y=167–169.3 (약 2px)

**시각적으로는** 기술 라벨(y=157.3)과 풋터 라벨(y=167) 간격이 ~10px로 좁지만 큰 문제 없음.
**클릭/터치 충돌은** 2px 겹침으로 거의 무시 가능 수준.

→ 하지만 hit area y를 -7로 올리면 완전히 분리 가능:
```js
// 수정 후: y=-13 → y=-7
entry.bg.setPosition(x, -7);
entry.label.setPosition(x + 20, -1);
entry.hit.setPosition(x, -7);
```

### 1-D. 버그 3: MoveInfoOverlay 미구현 (기술 상세 오버레이)

**원본 PokeRogue fight-ui-handler.ts:**
```typescript
// setup() line 108-121
this.moveInfoOverlay = new MoveInfoOverlay({
  delayVisibility: true,
  onSide: true,
  right: true,
  x: 0,
  y: -MoveInfoOverlay.getHeight(true),
  width: globalScene.scaledCanvas.width + 4,
  hideEffectBox: true,
  hideBg: true,
});
ui.add(this.moveInfoOverlay);
globalScene.addInfoToggle(this.moveInfoOverlay, this);
```

Info 버튼(I키) 누를 때:
1. `toggleInfo(true)` → movesContainer 숨김
2. `MoveInfoOverlay.show(move)` → 기술 상세 오버레이 표시

우리 이식본: `toggleInfo()`는 있지만 MoveInfoOverlay 클래스 자체가 없음. Info 버튼 누르면 기술 이름은 사라지지만 오버레이가 나타나지 않아 빈 화면이 됨.

→ **별도 Phase에서 구현 필요.** 당장의 시각 버그는 아님(Info 버튼 누르지 않으면 발동 안 함).

### 1-E. 스크린샷 분석 결과

PKB fight 스크린샷에서 확인된 사항:
- 4개 기술 이름이 2×2 그리드에 올바르게 렌더됨 ✓
- PP/Pow/Acc 레이블·값이 오른쪽 패널에 표시됨 ✓
- moveNameText/descriptionText 삭제 후 오른쪽 패널 여백 확보됨 ✓
- 토글 버튼은 현재 테스트 배틀에 없어 렌더 안 됨 (토글 관련 겹침 미확인)
- "뒤로"/"기개" 풋터 버튼이 기술 목록 하단에 표시됨 ✓
- 전반적 배치는 Phase 11 fix 이후 크게 개선됨

---

## 2. Party UI

### 2-A. 슬롯 좌표 검증 (PokeRogue 원본과 일치 확인)

**원본 party-ui-handler.ts:1915-1929:**
```typescript
const slotPositionX = isBenched ? 143 : 9;
// 싱글 배틀, non-item-manage 기준:
if (isBenched) {
  slotPositionY = -196 + 28 * slotIndex;
  // index 1→-168, 2→-140, 3→-112, 4→-84, 5→-56
} else {
  slotPositionY = -148.5; // index 0
}
```

**우리 이식본 slotYs:**
```js
const slotYs = [-148.5, -168, -140, -112, -84, -56];
```

→ **완전히 일치. 슬롯 Y 좌표 버그 없음.**

절대 좌표 (container at y=180):
- active slot: abs (9, 31.5) ~ 슬롯 상단이 화면 위에서 31.5px
- bench slot 1: abs (143, 12) ~ 화면 위에서 12px
- bench slot 5: abs (143, 124)

### 2-B. 버그 1: party_bg가 배틀 필드를 가리지 못함

**증거:** 스크린샷 상단에 초록 풀밭(arena)이 보임. party_bg(320×180)가 전체 화면을 덮어야 하지만 안 되고 있음.

**파일 정보:** `party_bg.png: 320×180, 8-bit colormap, no tRNS`
→ 투명도 없음. 파일 자체는 정상.

**깊이(Depth) 분석:**
- arena: depth 0, 4, 5 (battle-shell-scene.js:74-76)
- rootContainer: depth 40 (ui.js)
- party container: `scene.add.container().setDepth(56)` 이지만 ui.js에서 rootContainer에 추가됨

**핵심 발견: Phaser Container 내부 렌더링 순서**

`ui.js setup()`에서:
```js
// 1. handler 컨테이너들 추가 (MESSAGE, COMMAND, FIGHT, PARTY, TARGET 순)
Object.values(this.handlers).forEach(handler => this.rootContainer.add(handler.container));
// 2. battle info 컨테이너들 추가 (이후 추가 = 위에 렌더됨)
[enemyTray, playerTray, enemyInfo, playerInfo, abilityBar].forEach(c => this.rootContainer.add(c));
```

Phaser 3 Container는 **`sortChildrenFlag=false`가 기본값** → children이 `setDepth()`로 정렬되지 않고 **추가된 순서대로 렌더됨(뒤에 추가=위에 렌더)**.

결과: party container(4번째)가 추가된 이후에 enemyTray, playerTray, enemyInfo, playerInfo, abilityBar가 추가됨 → battle info가 party_bg 위에 렌더됨. 이들이 party_bg를 일부 가림. 하지만 이게 arena를 보이게 만들지는 않음.

**더 중요한 문제:** rootContainer 전체가 depth 40으로 scene에 등록되고 arena는 depth 0-5. rootContainer는 arena보다 위에 렌더됨. 그렇다면 party_bg가 arena를 덮어야 한다.

**남은 의심 원인:**
1. `partyContainer.setVisible(true)`가 실제로 실행되지 않고 있을 가능성
2. party_bg 텍스처 로드 실패 (브라우저 콘솔에서 확인 필요)
3. rootContainer.sortChildrenFlag 문제로 party container가 battle info 아래에 가려짐 (battle info가 arena를 투과해 보이는 것처럼 착시)

**즉각 검증 필요 사항:**
- 브라우저 DevTools Console에서 `pkb-ui-party-bg` 텍스처 로드 실패 메시지 확인
- party container에 임시 배경 rectangle 추가 후 렌더 여부 확인

**확실한 Fix:** rootContainer에 `sortChildrenFlag` 활성화 + party container depth 올바르게 설정:
```js
// ui.js setup() 끝부분에 추가
this.rootContainer.sortChildrenFlag = true;  // Phaser Container depth-sort 활성화
```
이렇게 하면 각 container의 setDepth(56) 등이 실제로 정렬에 반영됨.

### 2-C. 버그 2: HP 텍스트 y 위치 오류

**원본 party-ui-handler.ts:2122-2129:**
```typescript
this.slotHpText = addTextObject(...)
    .setPositionRelative(
        this.slotHpBar,
        this.slotHpBar.width + hpTextToBarOffset.x,  // 100 + (-3) = 97
        this.slotHpBar.height + hpTextToBarOffset.y, // 7 + (-2) = 5
    )
```

hpBar는 slotBg 기준 (hpBarPosition.x, hpBarPosition.y)에 위치:
- Active: hpBar at (8, 31) → hpText at (8+97, 31+5) = **(105, 36)**
- Bench: hpBar at (72, 6) → hpText at (72+97, 6+5) = **(169, 11)**

**우리 이식본 현재값:**
```js
// active slot (party-ui-handler.js:77)
this.hpText = addTextObject(this.ui, 105, 33, '', 'BATTLE_VALUE').setOrigin(1, 0);
// bench slot (line 88)
this.hpText = addTextObject(this.ui, 169, 6, '', 'BATTLE_VALUE').setOrigin(1, 0);
```

**오차:**
- Active: y=33 vs 정답 36 → **3px 낮음**
- Bench: y=6 vs 정답 11 → **5px 낮음**

→ HP 숫자가 HP 바 아래쪽에 살짝 겹쳐서 보임.

### 2-D. 버그 3: HP 라벨 이미지(party_slot_overlay_hp) 미구현

**원본 party-ui-handler.ts:2101-2105:**
```typescript
this.slotHpLabel = globalScene.add
    .image(0, 0, getLocalizedSpriteKey("party_slot_overlay_hp"))
    .setOrigin(1, 0)
    .setVisible(false)
    .setPositionRelative(this.slotBg, hpBarPosition.x + 15, hpBarPosition.y);
```

`party_slot_overlay_hp_ko.png` = "HP" 텍스트 이미지 (HP 바 왼쪽에 표시되는 "HP" 레이블).

위치 (slotBg 기준):
- Active: (8+15, 31) = **(23, 31)**, origin(1,0) → 오른쪽 끝이 x=23
- Bench: (72+15, 6) = **(87, 6)**, origin(1,0) → 오른쪽 끝이 x=87

**우리 이식본:** 이 요소 자체가 없음. PokeRogue 원본에서는 HP 바 앞에 "HP" 레이블 이미지가 있어야 함.

에셋 경로:
- `assets/pokerogue/ui/text_images/ko/party_ui/party_slot_overlay_hp_ko.png`
- `assets/pokerogue/ui/text_images/ko/party_ui/party_slot_overlay_lv_ko.png` (Lv. 레이블)

→ constants.js와 assets.js에 등록 후 PartySlot.setup()에서 추가 필요.

### 2-E. 버그 4: HP 바 fill 방식 — setScale vs setCrop

**원본:** `slotHpOverlay.setScale(hpRatio, 1)` (origin(0,0), hpRatio = 0.0~1.0)  
**우리:** `setHorizontalCrop(hpBarFill, HP_FILL_WIDTH * hpPercent/100)`

두 방식 모두 **동일한 시각 결과** (origin(0,0)에서 좌측부터 채움). 버그 아님.

### 2-F. 버그 5: 아이콘 크기 overflow

**에셋 실측:** `ABOMASNOW.png` = 128×64px (스프라이트시트)  
**현재 코드:**
```js
this.iconObj = this.scene.add.image(...).setOrigin(0, 0).setScale(0.5);
```
→ 64×32px로 렌더됨. iconHolder rectangle = 18×18px.

**원본과의 차이:** PokeRogue는 `addPokemonIcon()` 애니메이션 아이콘 시스템(40×30px). 우리는 Icons 폴더에서 개별 PNG를 로드하는 방식.

→ 사용자 인지: "에셋이 달라서 그런 걸 수도 있어" — **에셋 차이로 판단, 별도 대응 필요**

즉각 패치: `setDisplaySize(18, 18)` 또는 `setScale(18/128)` ≈ 0.14로 슬롯에 맞게 축소. 이상적으로는 아이콘 에셋을 작게 별도 준비하거나 crop하는 것.

### 2-G. 스크린샷 분석 결과

PKB party 스크린샷에서 확인된 사항:
- active slot 위치: 화면 상단 좌측 (y≈32) ✓ 좌표 정상
- bench slot 위치: 화면 상단 우측 (y≈12 시작) ✓ 좌표 정상
- party_bg: 화면을 덮지 못함 → 배틀 필드(초록 풀밭) 투과됨 **BUG**
- HP 텍스트 "315/?" → 정확한 값 렌더되나 y 위치 살짝 낮음
- 아이콘: 크기가 슬롯에 비해 큼 (64×32px vs 18×18px holder)
- 메시지 박스, 뒤로 버튼: 정상 렌더됨 ✓

---

## 3. 확인된 정상 동작 사항

- 슬롯 Y 좌표: PokeRogue 원본과 완전히 일치
- moveInfoContainer 요소 좌표: 원본 일치 (x=250-308, y=-36~-10)
- HP 바 fill 방식: setScale vs setCrop — 시각 동등
- party_bg tRNS: 없음 (투명도 미설정) — 파일 자체는 정상
- nameBox 계산: displayWidth 사용 ✓
- wordWrapWidth: 297/185/152px ✓
- DOM 스프라이트 숨김: partyModeActive 플래그 정상 동작

---

## 4. 우선순위 정리

| # | 파일 | 버그 | 심각도 |
|---|------|------|--------|
| 1 | `ui.js` | rootContainer sortChildrenFlag → party_bg 미커버 | **높음** |
| 2 | `party-ui-handler.js` | HP text y 위치 (active +3, bench +5) | 중간 |
| 3 | `party-ui-handler.js` | HP 라벨 이미지 미구현 | 중간 |
| 4 | `party-ui-handler.js` | 아이콘 크기 overflow | 낮음 (에셋 차이) |
| 5 | `fight-ui-handler.js` | 토글 버튼 y=-48 → typeIcon 겹침 | 중간 |
| 6 | `fight-ui-handler.js` | 풋터 버튼 hit area 2px 겹침 | 낮음 |
| 7 | `fight-ui-handler.js` | MoveInfoOverlay 미구현 | 별도 Phase |
