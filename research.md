# Pokemon Battle UI — Research Notes (2026-04-10)

---

## 1. 텍스트 왜곡/블러 — 폰트 픽셀 그리드 분석

### 근본 원인: 8px 그리드 정렬 실패

`emerald` / `pkmnems` 폰트는 **픽셀 아트 비트맵 폰트(8px 그리드 기반)**이다.
글리프 1픽셀이 렌더 캔버스에서 **정수 배수** 픽셀로 찍혀야 선명하다.

> **폰트 패밀리 실체 확인 (2026-04-10)**:
> `styles.css` @font-face를 직접 확인한 결과:
> - `font-family: "emerald"` → `assets/pokerogue/fonts/pokemon-bw.ttf` ← **이미 BW 폰트 사용 중**
> - `font-family: "pkmnems"` → `assets/pokerogue/fonts/pokemon-emerald-pro.ttf`
>
> 즉, `//pokemon-bw 폰트 써볼까?` 메모의 답은: **"emerald"가 이미 pokemon-bw.ttf**다.
> 별도로 `font-family: "pokemon-bw"` @font-face를 추가해 테스트하는 것도 가능하지만,
> **현재 블러의 근본 원인은 폰트 선택이 아니라 8px 그리드 미정렬(렌더 크기 문제)**이다.
> → 수정 방향은 font 교체가 아닌 **Fix 1 (fontSize → 8 배수)** 이 정답.

- `TEXT_RENDER_SCALE = 6` → `fontSize × 6`이 렌더 크기
- PokeRogue 원본 렌더 크기는 **모두 8의 배수**: 48, 56, 64, 72, 80, 96

| PokeRogue 렌더 크기 | 8px 그리드 (N×8) | 우리 logical (÷6) | 비고 |
|---|---|---|---|
| 96px | 12×8 ✓ | 16px | WINDOW, MESSAGE |
| 72px | 9×8 ✓ | 12px | BATTLE_INFO |
| 56px | 7×8 ✓ | ≈9.33px | MOVE_INFO_CONTENT (fontSizeMd) |
| 48px | 6×8 ✓ | 8px | BATTLE_INFO_SMALL (fontSizeSm) |

### 현재 문제 스타일

| Style | 현재 logical | 렌더 크기 | 8 배수? | 픽셀당 크기 | 상태 |
|---|---|---|---|---|---|
| BATTLE_LABEL | 9px | 9×6=**54px** | 54÷8=**6.75** ✗ | 비정수 | **왜곡** |
| BATTLE_VALUE | 9px | 9×6=**54px** | 54÷8=**6.75** ✗ | 비정수 | **왜곡** |
| HINT | 6px | 6×6=**36px** | 36÷8=**4.5** ✗ | 비정수 | **왜곡** |
| WINDOW | 16px | 16×6=96px | 96÷8=12 ✓ | 12px | 정상 |
| BATTLE_INFO | 12px | 12×6=72px | 72÷8=9 ✓ | 9px | 정상 |
| BATTLE_INFO_SMALL | 8px | 8×6=48px | 48÷8=6 ✓ | 6px | 정상 |

### 영향 범위

- **fight 우측 패널**: ppLabel/ppText/powerLabel/powerText/accuracyLabel/accuracyText → BATTLE_LABEL, BATTLE_VALUE 사용 → 왜곡
- **party 슬롯**: hpText → BATTLE_VALUE 사용 → 왜곡
- **party 슬롯**: sublabel → HINT 사용 → 왜곡
- **party 슬롯**: levelText → 이전 HINT → 이번 BATTLE_INFO_SMALL(8px)으로 수정됨 ✓

### 수정 방안

`createBaseText(scene, x, y, text, fontSize, ...)` 에서 `fontSize * 6` 이 **8의 배수**가 되어야 한다.

- `BATTLE_LABEL / BATTLE_VALUE`: `9px × 6 = 54px` → `56px / 6 ≈ 9.333px` (렌더 56px = 7×8)
  - JavaScript: `fontSize: 56/6` → `(56/6) * 6 = 56.000...` → CSS `"56px"` ✓
- `HINT`: `6px × 6 = 36px` → 36은 8배수 아님 → `48px / 6 = 8px` (렌더 48px = 6×8)
  - HINT를 BATTLE_INFO_SMALL과 동일 크기(8px)로 올리되, 색상은 `#94a3b8`(회색) 유지로 시각적 구분

**적용 파일**: `src/pokerogue-transplant-runtime/ui/helpers/text.js` — `TEXT_STYLE` 상수

---

## 2. 파티 아이콘 — 크기 및 애니메이션

### 현재 상태
- `loadIconTexture()`: 이미지 로드 후 `texture.add('frame0', 0, 0, 0, fw, fh)` (좌측 절반)
- `_applyIcon()`: `scene.add.image(..., 'frame0').setDisplaySize(18, 18)`
- 결과: frame0만 18×18으로 표시, 단일 정적 이미지

### 아이콘 파일 실측 (2026-04-10 확인)
- `assets/Pokemon/Icons/PIKACHU.png`: **128×64 px** (2프레임, 각 64×64)
- `assets/Pokemon/Icons/CHARMANDER.png`: 동일 128×64
- → 모든 아이콘은 64×64px 프레임 2개 수평 배치

### 문제 분석

**크기**: 18×18은 실제 64px 프레임을 1/3.5 배율로 축소. 육안으로 너무 작게 보임.
- active slot (110×49): 32×32 표시 시 x=4~36, y=4~36 — 슬롯 내부 유지 ✓
- bench slot (175×24): 32×32 표시 시 y=12~44 → y=44는 슬롯 높이(24) 초과 → **20px 오버플로우**
  - PokeRogue 원본도 파티 아이콘은 슬롯 경계를 일부 벗어남 (의도된 디자인)
  - → 오버플로우 허용

**애니메이션**: PokeRogue 파티 아이콘은 2프레임 교대 애니메이션 사용 (약 2fps)
- frame0 → frame1 → frame0 → ... (500ms 간격)
- `scene.add.image()` 대신 `scene.add.sprite()` 필요, 또는 타이머 교대 방식

### 수정 방안

1. `loadIconTexture()`: 'frame0' 외에 **'frame1'도 등록** (우측 절반)
   ```
   texture.add('frame0', 0, 0, 0, fw, fh);       // 좌측 64×64
   texture.add('frame1', 0, fw, 0, fw, fh);      // 우측 64×64
   ```

2. `PartySlot._applyIcon()`: `scene.add.image()` → `scene.add.sprite()` + 타이머 교대 방식
   - 타이머는 슬롯별로 관리, clear() 시 정리

3. **표시 크기**: `setDisplaySize(18, 18)` → `setDisplaySize(32, 32)`
   - active slot 아이콘 위치: (4, 4) 유지 (110×49 내부)
   - bench slot 아이콘 위치: (2, -4) 변경 → 수직 중앙 정렬 ((-4+32)/2=14, 슬롯 중심 ≈ 12)

4. **애니메이션 타이머**: `this.iconAnimTimer = scene.time.addEvent(...)`, `clear()` 시 `remove()`

---

## 3. Fight UI — 버튼 레이아웃 및 PokeRogue 원본 비교

### PokeRogue 원본 fight UI (스크린샷 2026-04-10 분석)

오른쪽 패널 (x=240~320, y=132~180):
```
[TYPE] [GHOST 배지] [물리 아이콘]     ← 1행
PP    28/30                           ← 2행
(이하 비어있음)
```

- **Pow(위력)과 Acc(명중률)은 기본 표시 없음** — MoveInfoOverlay에서만 표시 (INFO 버튼 홀드)
- **Back / Switch 버튼 없음** — 키보드 B키로 돌아감, 마우스 접근성은 UI 외부 처리
- **Tera 버튼**: 테라스탈 가능 시에만 커서/하이라이트 형태로 표시, 별도 창 없음
- **"TYPE" 텍스트 라벨**: 타입 아이콘 왼쪽에 소형 텍스트로 표시됨 (현재 이식본 미구현)

### 현재 이식본 vs 원본 차이

| 항목 | 원본 | 현재 이식본 | 문제 |
|---|---|---|---|
| 오른쪽 패널 행 수 | 2행 (TYPE + PP) | 4행 (+Pow +Acc) | 레이아웃 과밀 |
| "TYPE" 라벨 텍스트 | 있음 | 없음 (아이콘만) | 미구현 |
| Back 버튼 | 없음 (키보드) | 화면 하단 좌측 | 위치 어색 |
| Tera 버튼 | 커서 스타일 | 윈도우 박스 스타일 | 시각 차이 |

### Footer 버튼 위치 충돌 분석

fight container (0, 180) 기준 절대 좌표:
- 이동 버튼 2행 히트 영역: `movesContainer(18, -39)` + 히트 `(x-6, 14, 110, 14)` → **절대 y=155~169**
- 현재 footer (origin 0,1 y=0): → **절대 y=168~180**
- **y=168~169 구간이 겹침** — Back 버튼(x=1~41)과 2행 이동 버튼 좌측(x=12~122) 히트 영역 중첩

### 수정 방안

**Option A (권장)**: 오른쪽 패널에서 Pow/Acc 제거 → Back 버튼을 우측 패널 하단에 이동
- 오른쪽 패널 새 레이아웃:
  ```
  [TYPE] [타입 아이콘] [카테고리 아이콘]    y=-36 (abs 144)
  PP     값                                  y=-24 (abs 156)
  [BACK 버튼]                               y=0 origin(0,1) (abs 168~180)
  ```
- Pow/Acc는 나중에 MoveInfoOverlay 이식 시 추가
- Back 버튼: x=244, width=76 (right panel 전체), height=12, origin(0,1), y=0

**Option B**: Pow/Acc 유지 + Back을 커맨드 창 영역으로 이동
- 덜 깔끔하지만 현재 구조 유지 가능

**Tera/Toggle 버튼**: row0 현재 y=-46 (abs 134) — 창 내부이나 TYPE 행(y=-36, abs 144)과 시각적으로 가까움. Toggle 버튼이 TYPE 행 위에 위치하는 구조는 원본과 차이.

---

## 4. 좌표 정수화 (완료됨)

| 항목 | 이전 | 수정 후 | 효과 |
|---|---|---|---|
| fight movesContainer y | -38.7 | -39 | 서브픽셀 제거 |
| party main slot y | -148.5 | -149 | 서브픽셀 제거 |

---

## 5. Battle Info 정보창 텍스트 블러 (미수정)

- `nameTextY` enemy=-11.2, player=-15.2 → 비정수 (PokeRogue 원본과 동일 값)
- BATTLE_INFO shadow: (3.5, 3.5) → 비정수
- **판단**: 원본과 동일 값이므로 의도적. 수정 필요 시 라운딩.

---

## 6. Navy Bar 회귀 (완료됨)

- 원인: `PartyUiHandler.clear()` → `BattleTray.container.setVisible(true)`
- 발동 시점: ui.setup() 내 handler.setup() → clear() 호출 순서로 게임 시작 시 tray가 켜짐
- 수정: `show()`/`clear()` 모두에서 tray visibility 코드 제거

---

## 기술 참조

### TEXT_RENDER_SCALE 6의 의미
- PokeRogue에서 `scale = 6` (게임 물리 해상도 1920÷6=320)
- 텍스트 객체는 `fontSize × 6`으로 렌더, `setScale(1/6)`으로 축소
- 이 방식으로 고해상도 글리프 → 픽셀아트 다운샘플 시 선명함 유지
- **조건**: 렌더 크기 ÷ 8 = 정수여야 픽셀 그리드 정렬

### 폰트 프리로드 (controller.js)
- 현재: `8 * TEXT_RENDER_SCALE = 48px`만 프리로드
- BATTLE_LABEL/VALUE 수정 후 56px도 프리로드 추가 필요
- `document.fonts.load('56px "emerald"', 'Aa0')`
