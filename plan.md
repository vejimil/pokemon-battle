# Plan: Shadow 위치 보정 + Metrics Drift 정리

작성일: 2026-04-11 (UTC)  
기준 문서: `research.md`  
**Phase 18 완료 후 업데이트 — 이월 항목 중심으로 재정리**

---

## 1) 고정 결정(각주 반영)

1. `DBK_DEFAULTS.frontScale/backScale`는 당분간 `1/1` 정책 유지.
2. player side shadow는 계속 비표시(`showPlayerSideShadows=false`).
3. shadow 좌표식은 `front/back + shadow` 합산 방향 → **Phase 18 완료**.
4. sprite Y 부호는 즉시 반전하지 않고 A/B 비교 후 결정.
5. verify 정책도 `1/1 유지` 기준으로 재정의 → **Phase 18 완료**.

---

## 2) Phase 18 완료 항목

| Task | 내용 | 결과 |
|------|------|------|
| A | shadow 합산식: `baseX + offsetX + shX`, `baseY + offsetY + shY` | 완료 |
| B | baseline 보정 `k=0.12`, shadow 크기 DBK 공식 | 완료 |
| D | verify-metrics-parity 14/14 PASS | 완료 |
| E | `audit-metrics-drift.mjs` 신규 생성, `reports/metrics-drift.json` 출력 | 완료 |

---

## 3) 이월 항목 — 다음 세션 실행 순서

### Step 1. Sprite Y 부호 A/B 시각 검증 (Task C)

대상 파일:
- `src/pokerogue-transplant-runtime/scene/battle-shell-scene.js`

핵심:
- `baseY - offsetY`를 당장 뒤집지 않음.
- 아래 두 후보를 동일 샘플셋으로 브라우저에서 비교.

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

### Step 2. PBS 수동 보정 Round 1 (Task F)

대상 파일:
- `assets/Pokemon/PBS/pokemon_metrics_forms.txt`
- 필요 시 `assets/Pokemon/PBS/pokemon_metrics_female.txt`

준비물:
- `npm run audit:metrics-drift` 실행 → `reports/metrics-drift.json`
- 브라우저에서 게임 로드 후 고위험 포켓몬 shadow 시각 확인

우선 확인 종 (score=8):
- `LINOONE` — frontY 극단, shadow anchor risk, frontX outlier
- `METAGROSS_1` — 동일
- `MIMIKYU_1` — 동일
- `SALAMENCE_1` — 동일

운영 규칙:
1. 1라운드당 30~50개만 처리.
2. 수정 단위마다 before/after 좌표 로그 남김.
3. 라운드 종료 시 verify 3종 재실행.

권장 라운드:
1. Round 1: enemy shadow 체감 오류 high 30개
2. Round 2: frontY/shape 불일치 high 30개
3. Round 3: female/form+female 미세 조정

완료 기준:
- high severity 잔여 수가 라운드마다 감소 추세를 보임.

---

### Step 3. 세션 종료 조건

1. sprite Y 부호 A/B 결론 확정 및 research.md 기록 완료
2. PBS 수동 보정 1라운드 완료 (최소 30개)
3. `verify:metrics-parity`, `verify:stage22`, `verify:passb` 모두 PASS
4. CLAUDE.md 업데이트 완료

---

## 4) 리스크/주의

1. scale 정책(`1/1`)을 건드리면 전체 체감이 즉시 바뀌므로 이번 스코프에서 제외.
2. Y 부호를 확정 전에 바꾸면 metrics 재작업량이 커질 수 있음.
3. ellipse shadow는 DBK silhouette과 형태가 달라 "완전 동일"은 목표 밖. 위치 정합에 집중.
4. PBS 보정은 런타임 공식 변경 직후이므로 Phase 18 공식 기준으로 시각 확인 후 진행.
