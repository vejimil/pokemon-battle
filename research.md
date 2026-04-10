# Pokemon Battle UI — Research Notes (2026-04-10 기준 재정리)

## 게임 기본 좌표계

- 게임 해상도: **320×180** (LOGICAL_WIDTH × LOGICAL_HEIGHT)
- 텍스트 렌더: `TEXT_RENDER_SCALE = 6` → fontSize×6 px 캔버스에 렌더, setScale(1/6) 적용
- 파이터 UI 컨테이너: `(0, LOGICAL_HEIGHT=180)` → 자식 y=-48~0이 화면 하단 48px에 매핑
- 배틀 정보창 fieldUI: y=180 절대 기준, PokeRogue 원본 localY + 180 = 절대 y

---

## Fight UI (fight-ui-handler.js)

### 레이아웃 구조
```
container (0, 180)
  movesContainer (18, -39)          ← 절대 (18, 141) — 이전 -38.7은 비정수로 블러 발생
    moveButton[0..3]                 ← (0,0), (114,0), (0,16), (114,16)
    hit rects                        ← y=-2~+12 per button (origin 0,0)
  moveInfoContainer (1, 0)
    typeIcon (263, -36)              ← 절대 (264, 144), atlas frame = 타입명
    moveCategoryIcon (295, -36)      ← 절대 (296, 144)
    ppLabel (250, -26), ppText (308, -26)
    powerLabel (250, -18), powerText (308, -18)
    accuracyLabel (250, -10), accuracyText (308, -10)
  toggleButtons[0..4]               ← x=241+col*26, y=-46-row*14
                                      row0 y=-46 (abs 134, 창 안쪽)
                                      row1 y=-60 (abs 120, 창 위쪽 — 5개 이상 시 불가피)
  footerButtons[0..1]               ← origin(0,1), y=0 (abs 168~180)
                                      Back at x=1, Switch at x=44
```

### 윈도우 배경 (battle-message-ui-handler.js 에서 관리)
- `movesWindow` (nineslice): 243×48px at (0,0) origin(0,1) → 절대 x=0~243, y=132~180
- `moveDetailsWindow` (nineslice): 80×48px at (240,0) origin(0,1) → x=240~320, y=132~180

### 주요 확인 사항
- `typeIcon`, `moveCategoryIcon`: 초기 `setVisible(false)` → `updateMoveDetail()`에서 hasMove 체크 후 표시
- `ppRatioToColor()`: PP 잔량 비율에 따라 텍스트 색상 변경 (0=빨강, ≤0.25=주황, ≤0.5=노랑, else 흰색)
- `toggleButtons`: Tera/Z/Mega 등 전투 기믹. 일반 배틀에서는 모두 hidden. row0 y=-46으로 이동함.
- `footerButtons`: Back(뒤로)과 Switch(교체). origin(0,1) y=0 → 창 하단 12px 영역 차지.
  - 하단 무브 버튼 hit(y≈156~170)과 최대 2px 겹침 — 기능적 충돌 없음 (x 범위 다름)

---

## Party UI (party-ui-handler.js)

### 레이아웃 구조
```
container (0, 180) depth=56
  partyBg: origin(0, 1) → 하단 기준 전체 배경
  partyMessageBox: (1, -1), 262×30, origin(0,1)
  message: (10, -23), origin(0,1)
  cursorObj: menuSel 이미지
  cancelBg / cancelLabel / cancelZone: x=291 우측 취소 버튼
  slots[0..5]:
    slot0 (active/main):  container at (9, -149)   ← 이전 -148.5 비정수 → 블러
    slot1: (143, -168), slot2: (143, -140), slot3: (143, -112)
    slot4: (143, -84), slot5: (143, -56)
```

### 슬롯 내부 레이아웃 (active slot, bgObj 110×49)
- pb: (4, 4) — 포케볼 아이콘
- iconHolder: (4, 4) 18×18 투명 히트박스
- iconObj: (4, 4) 18×18 pokemon icon — 동적 로드
- label (이름): (24, 3) WINDOW style
- levelText (Lv.X): (24, 13) **BATTLE_INFO_SMALL** (8px) ← 이전 HINT(6px)에서 변경
- sublabel (HP/상태 텍스트): (24, 22) HINT style
- hpBarBase: (8, 31)
- hpBarFill: (24, 33) atlas frame=high/medium/low
- hpText: (105, 36) BATTLE_VALUE origin(1,0)

### 슬롯 내부 레이아웃 (bench slot, bgObj 175×24)
- pb: (2, 12), iconHolder: (2, 12)
- label: (21, 2) WINDOW
- levelText: (21, 12) **BATTLE_INFO_SMALL** ← 이전 HINT에서 변경
- sublabel: (29, 14) HINT
- hpBarBase: (72, 6), hpBarFill: (88, 8)
- hpText: (169, 11) BATTLE_VALUE origin(1,0)

### 포켓몬 아이콘 로딩 (2-frame sprite sheet)
- 아이콘 파일: `assets/Pokemon/Icons/KLEFKI.png` 등 — **128×64px (2프레임, 각 64×64)**
- 로딩 후 `texture.add('frame0', 0, 0, 0, fw, fh)` 으로 첫 프레임 등록
- `_applyIcon()`: `scene.add.image(x, y, key, 'frame0').setDisplaySize(18, 18)`
- 이전 코드: `setDisplaySize(18,18)` 만 적용 → 128×64 전체가 18×18으로 압축 (2개 아이콘 겹침 현상)

### Navy Bar 회귀 버그 원인 및 수정
- `BattleTray.setup()`: `container.setVisible(false)` → 초기 숨김
- **버그**: `PartyUiHandler.clear()`가 `enemyTray.container.setVisible(true)` + `playerTray.container.setVisible(true)` 호출
  - `ui.setup()` 순서: tray.setup()→handler.setup()→handler.clear()
  - 즉 게임 시작 직후 clear()가 호출되어 tray가 visible=true 상태로 남음
- **수정**: `show()`와 `clear()` 모두에서 tray visibility 조작 코드 제거
  - BattleTray는 자체 로직으로 관리됨 (PokeRogue에서는 파티 교체 애니메이션 시에만 표시)

---

## Battle Info (battle-info.js)

### 텍스트 블러 원인
- `nameTextY`: enemy=-11.2, player=-15.2 → 비정수. 서브픽셀 렌더링 발생.
- BATTLE_INFO shadow: shadowX=3.5, shadowY=3.5 → 비정수. 렌더 캔버스 기준(×6)이므로 실제 3.5px.
- **미수정**: 원본 PokeRogue와 동일한 좌표이므로 일단 유지. 개선 필요 시 라운딩.

### HP 바
- origin(0,0), scaleX로 애니메이션
- 프레임 전환: scaleX > 0.5 → high, > 0.25 → medium, else low (원본 기준)

---

## 텍스트 렌더링 원칙

| Style | fontSize (logical) | shadow |
|---|---|---|
| WINDOW/MESSAGE | 16px | (3, 3) #6b5a73 |
| WINDOW_BATTLE_COMMAND | 16px | (4, 5) #6b5a73 |
| BATTLE_INFO | 12px | (3.5, 3.5) #6b5a73 |
| BATTLE_INFO_SMALL | 8px | (4, 5) #707070 |
| BATTLE_LABEL / BATTLE_VALUE | 9px | (3, 3) #6b5a73 |
| HINT | 6px | (1, 1) #334155 |

- `createBaseText`: fontSize×6 px로 렌더, setScale(1/6), lineSpacing=5 기본
- 비정수 컨테이너 y좌표 → 자식 전체 서브픽셀 블러 → 가능한 정수로 유지

---

## 알려진 미완성 항목 (2026-04-10)

1. **battle-info.js nameTextY 비정수**: -11.2, -15.2 → 정보창 텍스트 블러. 원본과 동일값이라 보류.
2. **fight-ui-handler.js MoveInfoOverlay**: 원본 ts:108-121 미이식. delayVisibility/onSide/right 옵션 필요.
3. **toggle button row1 (y=-60)**: 5개 이상의 기믹 동시 활성화 시 화면 위로 삐져나옴. 실제 배틀에서는 최대 1-2개.
4. **party-ui-handler.js**: partySlotOverlayLv 이미지 미사용 (텍스트로 대체). 원본은 이미지 레이블 사용.
5. **command-ui-handler.js**: Tera 색상 파이프라인 미구현.
6. **target-select-ui-handler.js**: ~40%, 싱글 배틀 스프라이트 접근 불가.
