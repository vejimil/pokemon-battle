# Plan: Shadow 위치 보정 + Metrics Drift 정리

작성일: 2026-04-11 (UTC)  
기준 문서: `research.md`  
**Phase 18 완료 후 업데이트 — 오늘은 A/B 검증과 PBS Round 1 실행용으로 재정리**

---

## 0) 오늘의 목표

1. 코드 구현은 아직 하지 않는다.
2. sprite Y 부호를 브라우저 A/B로 재검증하되, 샘플이 종별로 갈리면 글로벌 반전 대신 현행 유지와 PBS 보정으로 간다.
3. `reports/metrics-drift.json` 기준으로 PBS Round 1 대상 30~50개를 확정한다.
4. PBS 수정 후 `npm run audit:metrics-drift`, `npm run verify:metrics-parity`, `npm run verify:stage22`, `npm run verify:passb`를 다시 확인한다.

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

## 3) 오늘 작업 순서

### Step 1. Sprite Y 부호 A/B 시각 검증 (Task C)

대상 파일:
- `src/pokerogue-transplant-runtime/scene/battle-shell-scene.js`
- 기준 좌표는 `src/pokerogue-transplant-runtime/ui/ui.js` `layout()`의 enemy `216,84`, player `106,148`

핵심:
- `baseY - offsetY`를 당장 뒤집지 않음.
- 아래 두 후보를 동일 샘플셋으로 브라우저에서 비교.
- `verify:metrics-parity`는 이 부호를 검증하지 않으므로, 결론은 시각 A/B로만 낸다.
- 오늘 실험처럼 `VENUSAUR`/`DONDOZO`가 위로 뜨고 `DRIFLOON`/`CELEBI`가 아래로 처지면, 그건 글로벌 부호 반전 신호가 아니라 종별 metrics 조정 신호로 본다.
- 이런 경우는 `baseY - offsetY`를 유지하고 Step 2로 넘어간다.

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
- 샘플 비교 결과와 최종 부호를 `research.md`에 표로 남긴다.
- A/B 판단 근거는 바닥 접지, 부유감, 좌우 일관성으로 적는다.

---

### Step 2. PBS 수동 보정 Round 1 (Task F)

대상 파일:
- `assets/Pokemon/PBS/pokemon_metrics.txt`
- `assets/Pokemon/PBS/pokemon_metrics_forms.txt`
- 필요 시 `assets/Pokemon/PBS/pokemon_metrics_female.txt`

준비물:
- `npm run audit:metrics-drift` 실행 → `reports/metrics-drift.json`
- 브라우저에서 게임 로드 후 고위험 포켓몬 shadow 시각 확인

오늘 우선 확인 종 (score=8):
- `LINOONE` — frontY 극단, shadow anchor risk, frontX outlier
- `METAGROSS_1` — 동일
- `MIMIKYU_1` — 동일
- `SALAMENCE_1` — 동일

Round 1 fixed batch (current audit top 30):
1. `LINOONE`
2. `METAGROSS_1`
3. `MIMIKYU_1`
4. `SALAMENCE_1`
5. `AVALUGG`
6. `CHARJABUG`
7. `CLAUNCHER`
8. `DARKRAI_1`
9. `DARMANITAN_2`
10. `DARUMAKA_2`
11. `DEDENNE`
12. `DOTTLER`
13. `FALINKS`
14. `FIDOUGH`
15. `GRUBBIN`
16. `HEATMOR`
17. `HEATRAN`
18. `KLAWF`
19. `KORAIDON`
20. `LINOONE_1`
21. `LITTEN`
22. `LUGIA`
23. `MALAMAR_1`
24. `PINCURCHIN`
25. `PUMPKABOO`
26. `SIZZLIPEDE`
27. `STARAPTOR_1`
28. `STUNFISK_1`
29. `THUNDURUS_1`
30. `TINKATINK`

Round 1 triage:
- 직접 확인: `LINOONE`, `METAGROSS_1`, `MIMIKYU_1`, `SALAMENCE_1`, `HEATMOR`, `KORAIDON`, `THUNDURUS_1`, `TINKATINK`
- 패턴 조정: `AVALUGG`, `CHARJABUG`, `CLAUNCHER`, `DARKRAI_1`, `DARMANITAN_2`, `DARUMAKA_2`, `DEDENNE`, `DOTTLER`, `FALINKS`, `FIDOUGH`, `GRUBBIN`, `HEATRAN`, `KLAWF`, `LINOONE_1`, `LITTEN`, `LUGIA`, `MALAMAR_1`, `PINCURCHIN`, `PUMPKABOO`, `SIZZLIPEDE`, `STARAPTOR_1`, `STUNFISK_1`
- 보류: 없음

운영 규칙:
1. 1라운드당 30~50개만 처리.
2. 수정 단위마다 before/after 좌표 로그 남김.
3. 라운드 종료 시 `audit:metrics-drift`와 verify 3종 재실행.
4. `_female` 항목은 실제 batch에 들어갈 때만 `pokemon_metrics_female.txt`를 건드린다.

권장 라운드:
1. Round 1: enemy shadow 체감 오류 high 30개
2. Round 2: frontY/shape 불일치 high 30개
3. Round 3: female/form+female 미세 조정

완료 기준:
- high severity 잔여 수가 줄었는지 `reports/metrics-drift.json`으로 재확인한다.
- Round 1 처리 목록을 `research.md`에 남긴다.

---

### Step 3. 세션 종료 조건

1. sprite Y 부호 A/B 결론 확정 및 research.md 기록 완료
2. PBS 수동 보정 1라운드 완료 (최소 30개)
3. `audit:metrics-drift`, `verify:metrics-parity`, `verify:stage22`, `verify:passb` 재실행 후 결과 기록
4. 다음 라운드 후보와 남은 high-risk 수량 정리

---

## 4) 리스크/주의

1. scale 정책(`1/1`)을 건드리면 전체 체감이 즉시 바뀌므로 이번 스코프에서 제외.
2. Y 부호를 확정 전에 바꾸면 metrics 재작업량이 커질 수 있음.
3. ellipse shadow는 DBK silhouette과 형태가 달라 "완전 동일"은 목표 밖. 위치 정합에 집중.
4. PBS 보정은 런타임 공식 변경 직후이므로 Phase 18 공식 기준으로 시각 확인 후 진행.
