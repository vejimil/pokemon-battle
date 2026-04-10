# 구현 계획 — Phase 14 (2026-04-10)

> **기준**: research.md 2026-04-10 분석 결과
> **원칙**: 코드 수정 전 반드시 원본 좌표/로직 확인, 추측 금지

---

## 상태 요약

| 이슈 | 상태 | 우선순위 |
|---|---|---|
| Navy Bar 회귀 | ✅ 완료 | — |
| 파티 아이콘 2중 표시 | ✅ 완료 (frame0) | — |
| 텍스트 왜곡 (fight 우측, party HP/sublabel) | 🔴 미해결 | P1 |
| 아이콘 크기 너무 작음 | 🔴 미해결 | P1 |
| 아이콘 애니메이션 (2프레임 교대) | 🔴 미해결 | P1 |
| Fight 버튼 레이아웃 (Back/Tera) | 🔴 미해결 | P2 |

---

## Fix 1: 텍스트 왜곡 수정

### 파일: `src/pokerogue-transplant-runtime/ui/helpers/text.js`

**문제**: BATTLE_LABEL/BATTLE_VALUE(9px × 6=54px), HINT(6px × 6=36px)가 8의 배수 아님 → 픽셀 그리드 비정렬 → 글리프 뭉개짐

> **폰트 교체 불필요**: `"emerald"` CSS font-family는 이미 `pokemon-bw.ttf`로 매핑됨 (styles.css 확인).
> 블러 원인은 폰트 종류가 아니라 렌더 크기(8 배수 위반)이므로, font-family 변경 없이 fontSize 수정만으로 해결.

**수정 내용**: `TEXT_STYLE` 상수에서 fontSize 변경

```
BATTLE_LABEL: { fontSize: 56/6, ... }   // 54px → 56px (7×8)
BATTLE_VALUE: { fontSize: 56/6, ... }   // 54px → 56px (7×8)
HINT:         { fontSize: 8,    ... }   // 36px → 48px (6×8)
```

- `56/6 ≈ 9.333` → JS에서 `(56/6) * 6 = 56.000...` → CSS `"56px"` (정수 렌더)
- HINT는 8px(48px 렌더)으로 올림. 색상 `#94a3b8` 유지로 BATTLE_INFO_SMALL과 시각 구분.

**폰트 프리로드 추가**: `src/pokerogue-transplant-runtime/runtime/controller.js`

```
// ensureReady() 내 기존 48px 프리로드에 56px 추가
await Promise.allSettled([
  document.fonts.load('48px "emerald"', 'Aa0'),
  document.fonts.load('48px "pkmnems"', 'Aa0'),
  document.fonts.load('56px "emerald"', 'Aa0'),   // BATTLE_LABEL/VALUE용 추가
  document.fonts.load('56px "pkmnems"', 'Aa0'),
]);
```

**검증 포인트**:
- fight 우측 패널 pp/pow/acc 텍스트: 선명하게 보이는지 확인
- party 슬롯 hpText: 선명하게 보이는지 확인
- party 슬롯 sublabel: HINT → 8px로 변경, 색상 유지 확인

---

## Fix 2: 파티 아이콘 크기 & 애니메이션

### 파일: `src/pokerogue-transplant-runtime/ui/handlers/party-ui-handler.js`

#### 2-A. frame1 등록 추가

`loadIconTexture()` 내 기존 frame0 등록 코드 옆에 frame1 추가:
```
const fw = Math.floor(texture.source[0].width / 2);
const fh = texture.source[0].height;
texture.add('frame0', 0, 0,  0, fw, fh);    // 좌측 절반 (기존)
texture.add('frame1', 0, fw, 0, fw, fh);    // 우측 절반 (추가)
```

#### 2-B. image → sprite 전환 + 애니메이션 타이머

`PartySlot` 클래스:
- `this.iconObj` 타입: image → sprite
- `this.iconAnimTimer` 필드 추가 (Phaser TimerEvent)

`_applyIcon(iconKey)` 수정:
```
// scene.add.image(...) 대신 scene.add.sprite(...)
this.iconObj = this.scene.add.sprite(x, y, iconKey, 'frame0')
  .setOrigin(0, 0).setDisplaySize(32, 32)...

// 기존 타이머 제거 후 새 타이머 생성
if (this.iconAnimTimer) this.iconAnimTimer.remove();
const hasFrame1 = this.scene.textures.get(iconKey).has('frame1');
if (hasFrame1) {
  this.iconAnimTimer = this.scene.time.addEvent({
    delay: 500,
    loop: true,
    callback: () => {
      if (!this.iconObj?.active) return;
      const next = this.iconObj.frame.name === 'frame0' ? 'frame1' : 'frame0';
      this.iconObj.setFrame(next);
    }
  });
}
```

`clear()` 또는 slot 소멸 시 타이머 정리:
```
if (this.iconAnimTimer) { this.iconAnimTimer.remove(); this.iconAnimTimer = null; }
```

#### 2-C. 표시 크기 및 위치 조정

| 슬롯 | 현재 | 수정 후 |
|---|---|---|
| active iconObj 위치 | (4, 4) | (3, 4) — 미세 조정 (필요 시) |
| active iconObj 크기 | 18×18 | **32×32** |
| bench iconObj 위치 | (2, 12) | (2, -4) — 수직 중앙 ((24-32)/2=-4) |
| bench iconObj 크기 | 18×18 | **32×32** |

- active slot (110×49): 32×32 at (3,4) → x=3~35, y=4~36 → 슬롯 내부 ✓
- bench slot (175×24): 32×32 at (2,-4) → y=-4~28 → 슬롯 경계 초과 4px 위, 4px 아래 (PokeRogue 스타일 허용)

**검증 포인트**:
- 아이콘 크기가 슬롯에서 뚜렷하게 보이는지
- 500ms마다 frame0↔frame1 교대되는지
- 슬롯 간 충돌(겹침) 없는지

---

## Fix 3: Fight UI 버튼 레이아웃 정리

### 파일: `src/pokerogue-transplant-runtime/ui/handlers/fight-ui-handler.js`

#### 3-A. 오른쪽 패널에서 Pow/Acc 제거

PokeRogue 원본 기본 fight UI는 **TYPE + PP만** 표시. Pow/Acc는 MoveInfoOverlay에서만 표시.

`setup()` 수정:
- `this.powerLabel`, `this.powerText`, `this.accuracyLabel`, `this.accuracyText` 제거 (또는 초기부터 숨김)

`moveInfoContainer` 남길 요소:
- typeIcon (263, -36)
- moveCategoryIcon (295, -36)
- ppLabel (250, -26)
- ppText (308, -26)

`updateMoveDetail()`:
- powerText/accuracyText 관련 코드 제거

#### 3-B. "TYPE" 라벨 텍스트 추가 (선택적)

PokeRogue 원본 오른쪽 패널 1행: `TYPE [타입배지] [카테고리아이콘]`

```
this.typeLabel = addTextObject(this.ui, 245, -36, 'TYPE', 'BATTLE_LABEL').setOrigin(0, 0.5).setVisible(false);
```
- typeLabel at (245, -36), typeIcon 위치 (263, -36) → 245+약18=263 (BATTLE_LABEL 9.33px 폭 고려)

#### 3-C. Footer Back 버튼 → 오른쪽 패널 하단으로 이동

Pow/Acc 제거 후 생긴 공간 활용:
- 현재: Back at (1, 0) origin(0,1) — 이동 버튼과 부분 충돌
- 변경: Back at (241, 0) origin(0,1), width=79, height=12 → 오른쪽 패널 하단 전체 차지
- Switch 버튼: 오른쪽 패널 없는 경우(또는 더블 배틀 미구현으로 불필요)

오른쪽 패널 레이아웃 (최종):
```
y=-36 (abs 144): [TYPE] [타입배지] [카테고리아이콘]
y=-24 (abs 156): PP  값
y= 0 origin(0,1) (abs 168~180): [BACK 버튼 — 패널 전체 너비]
```

**검증 포인트**:
- Back 버튼이 오른쪽 패널 하단에 자연스럽게 위치하는지
- 이동 버튼과 히트 영역 충돌 없는지
- TYPE 라벨이 아이콘과 자연스럽게 인접하는지

#### 3-D. Toggle(Tera) 버튼 재검토

현재 위치 y=-46 (abs 134): 창 상단 바로 안쪽, 시각적으로 TYPE 행(y=-36)과 가까움.

PokeRogue 원본 Tera 버튼: 이동 선택 커서를 Tera 전용으로 교체하는 방식 (별도 박스 없음).
현재 구현(박스 스타일)은 원본과 다르지만 기능적으로 작동. 레이아웃 재설계는 별도 작업으로 보류.

---

## 작업 순서

1. **Fix 1** (text.js + controller.js) — 영향 범위 넓지만 수정은 단순
2. **Fix 2-A, 2-B** (loadIconTexture + _applyIcon) — frame1, sprite 전환
3. **Fix 2-C** (위치/크기) — 시각 확인 필요
4. **Fix 3-A** (Pow/Acc 제거) + **Fix 3-C** (Back 이동) — 레이아웃 재구성
5. **Fix 3-B** (TYPE 라벨) — 선택적, 비교적 간단

---

## 다음 세션 이후 장기 목표

- `fight-ui-handler.js`: MoveInfoOverlay 이식 (원본 ts:108-121)
  - `delayVisibility: true, onSide: true, right: true` 옵션
  - INFO 버튼 홀드 시 Pow/Acc 오버레이 표시
- `command-ui-handler.js`: Tera 색상 파이프라인
- `battle-info.js`: nameTextY 비정수(-11.2, -15.2) 개선 검토
