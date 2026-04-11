# Plan: Shadow 위치 보정 + Metrics Drift 정리 (내일 세션용)

작성일: 2026-04-11 (UTC)  
기준 문서: `research.md`  
목표:
1. 적군 shadow 위치 체감 오류를 우선 해소  
2. 일부 포켓몬 metrics 어긋남을 자동 선별 + 수동 보정으로 단계 처리

주의:
- 이 문서는 내일 구현 세션용 실행 계획이다.
- 현재 세션에서는 코드 구현을 하지 않는다.

---

## 1) 고정 결정(각주 반영)

1. `DBK_DEFAULTS.frontScale/backScale`는 당분간 `1/1` 정책 유지.
2. player side shadow는 계속 비표시(`showPlayerSideShadows=false`).
3. shadow 좌표식은 `front/back + shadow` 합산 방향으로 진행.
4. sprite Y 부호는 즉시 반전하지 않고 A/B 비교 후 결정.
5. verify 정책도 `1/1 유지` 기준으로 재정의.

---

## 2) 내일 실행 순서(런북)

1. `research.md` 기준값 다시 확인 후 작업 브랜치 시작.
2. `battle-shell-scene.js`에서 shadow 위치식 먼저 수정.
3. baseline 보정(`-height/4` 근사)을 ellipse 방식으로 도입.
4. sprite Y 부호 A/B 실험(기존 `-offsetY` vs 후보 `+offsetY`).
5. `verify:metrics-parity`를 `1/1 정책 + shadow 합산식` 기준으로 수정.
6. `audit-metrics-drift` 스크립트 추가 후 후보 목록 생성.
7. 후보 상위군부터 PBS 수동 보정 1라운드 진행.
8. `verify:metrics-parity`, `verify:stage22`, `verify:passb` 재실행.

---

## 3) Task A — Enemy Shadow 좌표식 보정 (최우선)

대상 파일:
- `src/pokerogue-transplant-runtime/scene/battle-shell-scene.js`

문제:
- 현재 shadow가 `shadowX/shadowY`만 반영되고 `front/back offset`이 빠져 있음.

계획 스니펫:
```js
const offX = isFront ? (metrics?.frontX ?? 0) : (metrics?.backX ?? 0);
const offY = isFront ? (metrics?.frontY ?? 0) : (metrics?.backY ?? 0);
const shX = metrics?.shadowX ?? 0;
const shY = isFront ? (metrics?.shadowFrontY ?? 0) : (metrics?.shadowBackY ?? 0);

const shadowX = baseX + offX + shX;
const shadowY = baseY + offY + shY;
```

완료 기준:
- 적군 shadow가 sprite 중심/발밑 기준에서 눈에 띄게 정렬 개선.

---

## 4) Task B — Baseline 보정(`-height/4`)의 ellipse 근사

대상 파일:
- `src/pokerogue-transplant-runtime/scene/battle-shell-scene.js`

문제:
- DBK는 shadow 기준점 보정이 있으나 현재 ellipse shadow는 baseline 이동이 없음.

계획 스니펫:
```js
const effective = rawShadowSize > 0 ? rawShadowSize - 1 : rawShadowSize;
const zoomX = sprScale + effective * 0.1;
const zoomY = sprScale * 0.25 + effective * 0.025;

const w = frameH * 0.45 * zoomX;
const h = frameH * 0.45 * zoomY;

const k = 0.12; // 실험값: 0.10/0.12/0.14 비교
const baseline = frameH * sprScale * k;
mount.shadow.setPosition(shadowX, shadowY - baseline);
mount.shadow.setSize(w, h);
```

완료 기준:
- 부유형/대형 샘플에서 shadow가 과도하게 위로 붙거나 바닥 아래로 빠지지 않음.

---

## 5) Task C — Sprite Y 부호 A/B 검증 후 확정

대상 파일:
- `src/pokerogue-transplant-runtime/scene/battle-shell-scene.js`

핵심:
- `baseY - offsetY`를 당장 뒤집지 않음.
- 두 후보를 동일 샘플셋으로 비교 후 채택.

후보:
```js
// A (현행)
spriteY = baseY - offsetY;

// B (DBK 직관)
spriteY = baseY + offsetY;
```

A/B 샘플 종:
- 지면형: `VENUSAUR`, `DONDOZO`
- 부유형: `DRIFLOON`, `CELEBI`
- 대형/특수폼: `CORVIKNIGHT_1`, `TERAPAGOS_1`, `NECROZMA_3`

완료 기준:
- 샘플 비교 결과를 `research.md`에 표로 남기고 최종 부호 확정.

---

## 6) Task D — Verify 정책 재정립 (`1/1` 기준)

대상 파일:
- `scripts/verify-metrics-parity.mjs`

변경 방향:
1. `DBK_DEFAULTS` 숫자값을 직접 검증(`1/1`).
2. shadow 합산식(`offX/offY + shX/shY`)이 scene에 존재하는지 검증.
3. 기존 문자열 참조 체크는 유지하되 핵심 수식 체크 추가.

계획 스니펫:
```js
checks.push(check('project default scales are 1/1',
  DBK_DEFAULTS.frontScale === 1 && DBK_DEFAULTS.backScale === 1));

checks.push(check('scene shadow uses sprite+shadow offset composition',
  sceneSource.includes('baseX + offX + shX') &&
  sceneSource.includes('baseY + offY + shY')));
```

완료 기준:
- 정책 회귀(1/1 깨짐, shadow 합산식 누락)를 verify에서 즉시 탐지.

---

## 7) Task E — Metrics Audit 스크립트(자동 후보 추출)

대상 파일(신규):
- `scripts/audit-metrics-drift.mjs`
- `reports/metrics-drift.json`

목표:
- 수동 전수 확인 대신, 높은 위험군부터 바로 손댈 수 있게 후보 자동 추출.

규칙(1차):
1. fallback + base 대비 frame 크기 차이 큼
2. `|frontY|`, `|shadowFrontY|`, `|shadowBackY|` 극단치
3. form/female 자산이 base fallback만 타는 경우
4. 스코어 기반 `high/medium/low` 분류

출력 예시:
```json
{
  "id": "CORVIKNIGHT_1",
  "severity": "high",
  "reasons": ["frontY_outlier", "shadow_anchor_risk"]
}
```

완료 기준:
- 상위 50개 우선순위 목록을 즉시 수동 보정에 투입 가능.

---

## 8) Task F — PBS 수동 보정 라운드

대상 파일:
- `assets/Pokemon/PBS/pokemon_metrics_forms.txt`
- 필요 시 `assets/Pokemon/PBS/pokemon_metrics_female.txt`

운영 규칙:
1. 1라운드당 30~50개만 처리.
2. 수정 단위마다 `before/after` 좌표 로그를 남김.
3. 라운드 종료 시 verify 3종 재실행.

권장 라운드:
1. Round 1: enemy shadow 체감 오류 high 30개
2. Round 2: frontY/shape 불일치 high 30개
3. Round 3: female/form+female 미세 조정

완료 기준:
- high severity 잔여 수가 라운드마다 감소 추세를 보임.

---

## 9) 내일 세션 종료 조건

1. enemy shadow 위치식 + baseline 보정 반영 완료
2. Y 부호 A/B 결론 확정 및 기록 완료
3. `verify:metrics-parity`, `verify:stage22`, `verify:passb` 모두 PASS
4. `reports/metrics-drift.json` 생성 완료
5. PBS 수동 보정 1라운드 완료(최소 30개)

---

## 10) 리스크/주의

1. scale 정책(`1/1`)을 건드리면 전체 체감이 즉시 바뀌므로 이번 스코프에서 제외.
2. Y 부호를 확정 전에 바꾸면 metrics 재작업량이 커질 수 있음.
3. ellipse shadow는 DBK silhouette과 형태가 달라 “완전 동일”은 목표에서 제외하고 “위치 정합”에 집중.
