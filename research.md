# Research: 그림자 위치 이상 + 일부 포켓몬 metrics 어긋남 조사

작성일: 2026-04-11 (UTC)  
**상태: 구현 완료 (Phase 18) — 오늘은 sprite Y A/B 확인과 PBS Round 1 준비**

대상 요청:
1. 적군 그림자 위치 이상 원인 조사  
2. 일부 포켓몬 metrics 어긋남을 에셋 단위로 보정 가능한지 조사

현재 검증 상태:
- `npm run verify:metrics-parity` PASS
- `npm run verify:passb` PASS
- `npm run verify:stage22` PASS
- `npm run audit:metrics-drift` 현재 리포트는 `reports/metrics-drift.json`

---

## 1) 조사 범위

### A. 현재 런타임 코드
- `src/pokerogue-transplant-runtime/scene/battle-shell-scene.js`
- `src/pokerogue-transplant-runtime/runtime/pokemon-metrics.js`
- `src/pokerogue-transplant-runtime/ui/ui.js`
- `scripts/verify-metrics-parity.mjs`

### B. 참조용 원본(DBK plugin)
- `Assets_Plugins/[DBK_009] Animated Pokemon System/[000] Settings.rb`
- `Assets_Plugins/[DBK_009] Animated Pokemon System/[004] Game Data.rb`
- `Assets_Plugins/[DBK_009] Animated Pokemon System/[006] Battler Sprites.rb`
- `Assets_Plugins/[DBK_009] Animated Pokemon System/[008] Deluxe Bitmap.rb`
- `Assets_Plugins/[DBK_009] Animated Pokemon System/[002] Sprite Editor.rb`

### C. 데이터 셋 규모
- Front 자산 파일 수: `1635`
- Back 자산 파일 수: `1606`
- metrics 섹션 총합: `1342`  
  (`pokemon_metrics.txt 1113 + forms 179 + female 15 + gmax 35`, Gen9 별도 파일은 없음)

---

## 2) DBK 원본의 기준 동작(핵심만)

### A. sprite offset 적용
- DBK 원본은 `apply_metrics_to_sprite`에서 enemy/front의 경우:
  - `sprite.x += front_sprite[0] * 2`
  - `sprite.y += front_sprite[1] * 2`
- 근거: `[004] Game Data.rb` `L99-L115`

### B. shadow 위치 적용
- DBK shadow는 battler 기준 좌표에서 시작 후:
  - `self.y -= (self.height / 4).round`
  - 이후 `apply_metrics_to_sprite(..., shadow=true)`로 `front/back + shadow_sprite`를 합산
- 근거: `[006] Battler Sprites.rb` `L328-L342`, `[004] Game Data.rb` `L99-L107`

### C. shadow 표시 조건
- `shadow_size == 0`이면 미표시
- player side는 `SHOW_PLAYER_SIDE_SHADOW_SPRITES=false` 기본으로 미표시
- 근거: `[004] Game Data.rb` `L171-L175`, `[000] Settings.rb` `L23-L27`

### D. shadow 크기
- `shadow_size` 보정 후:
  - `zoom_x = battler.zoom_x + shadow_size*0.1`
  - `zoom_y = battler.zoom_y*0.25 + shadow_size*0.025`
- 근거: `[006] Battler Sprites.rb` `L356-L369`

### E. animation speed
- `delay = ((speed / 2.0) * ANIMATION_FRAME_DELAY)`  
- 근거: `[008] Deluxe Bitmap.rb` `L176-L182`

---

## 3) 현재 코드 동작(문제 지점 중심)

### A. sprite Y 부호
- 현재 enemy/player 공통으로 `setPosition(baseX + offsetX, baseY - offsetY)`
- 즉, `FrontSprite/BackSprite`의 Y를 **위로 올리는 값**으로 해석 중
- 근거: `battle-shell-scene.js` `L183-L194`
- 기준 좌표는 `ui.js` `layout()`에서 enemy `216,84`, player `106,148`으로 고정된다.
- `verify:metrics-parity`는 이 부호를 확인하지 않으므로, 결론은 브라우저 A/B로만 낸다.
- **오늘의 상태**: 현행 유지, 종별 metrics 조정이 우선이다
- 오늘 실험 결과:
  - `VENUSAUR` / `DONDOZO`: 약간 떠 보임
  - `DRIFLOON` / `CELEBI`: 약간 낮아 보임
  - 대형 폼: 대체로 정상
- 해석: 이 패턴은 글로벌 부호 반전보다 종별 `frontY`/`backY` 보정이 더 맞는 신호다.

### B. shadow 좌표 계산 — **Phase 18에서 수정 완료**
- ~~현재: shadow 위치 계산에 `frontX/frontY(backX/backY)`가 포함되지 않음~~
- **수정 후**: `shadowX = baseX + offsetX + shX`, `shadowY = baseY + offsetY + shY`
- 근거: `battle-shell-scene.js` (수정 후)

### C. shadow baseline 보정 — **Phase 18에서 수정 완료**
- ~~DBK는 `-height/4` 기준 보정이 있음 / 현재 ellipse에는 없음~~
- **수정 후**: `baseline = frameH * sprScale * 0.12`, `shadowY -= baseline`

### D. default scale 값
- 현재 `DBK_DEFAULTS.frontScale/backScale`가 `1/1`
- DBK 원본 기본은 `2/3`이지만, 이 프로젝트 정책값은 `1/1`.[^scale_policy]

### E. verify 스크립트의 허점 — **Phase 18에서 수정 완료**
- ~~`DBK_DEFAULTS` 숫자값 자체를 검증하지 않음~~
- **수정 후**: `1/1` 직접 검증 + shadow 합산식 존재 검증 추가 → **14/14 PASS**
- 현재 verify는 shadow 합산과 정책값은 확인하지만, sprite Y 부호의 시각적 타당성은 확인하지 않는다.

---

## 4) 이슈 1 분석: "적군 그림자 위치가 이상함"

## 결론 — **Phase 18에서 해소**
원인은 3개가 겹친 결과였으며, A+B 두 가지를 수정 완료. C는 오늘 확인.

1. ~~shadow 좌표 계산에서 `frontX/frontY`가 빠짐~~ → **수정 완료**
2. ~~DBK shadow baseline(`-height/4`) 보정이 빠짐~~ → **수정 완료**
3. sprite Y 부호 문제는 오늘 실험 결과상 글로벌 부호 반전 대상이 아님 → **종별 metrics 조정으로 처리**

---

### A. 정량 근거 1: shadow 좌표에서 빠진 `frontY`의 크기

metrics 1342개 통계:
- `frontY` 절대값 median: `8`
- `frontY` 절대값 p90: `20`
- `frontY` 최대: `71`

해석:
- Phase 18 수정으로 이 오차가 합산에 반영됨.

---

### B. 정량 근거 2: shadow 좌표에서 빠진 `frontX`의 크기

metrics 1342개 통계:
- `frontX` 절대값 median: `2`
- `frontX` 절대값 p90: `7`
- `frontX` 최대: `20`

해석:
- Phase 18 수정으로 좌우 오차도 합산에 반영됨.

---

### C. 추가 근거: DBK shadow는 "ellipse"가 아니라 battler silhouette 기반
- DBK는 shadow sprite를 battler bitmap clone으로 생성 후 검정/투명도로 처리함.
- 현재는 단일 ellipse primitive를 사용함.
- 위치 정합이 목표이며 형태 완전 재현은 범위 밖.
- 근거: `[006] Battler Sprites.rb` `L345-L353`, `[005] Pokemon Sprites.rb` `L119-L136`

### D. baseline 보정 설명
- DBK의 `self.y -= (self.height / 4).round`는 shadow 기준점을 sprite 중앙에서 바닥 쪽으로 내리는 역할.
- ellipse 방식 근사: `baseline = frameH * sprScale * k` (`k=0.12`)
- Phase 18에서 적용 완료.

---

## 5) 이슈 2 분석: "일부 포켓몬 metrics 어긋남, 에셋 일일이 분석 가능?"

## 결론
가능. **권장 순서대로 진행 중**:
1. ~~런타임 좌표식 정합화~~ → **Phase 18 완료**
2. ~~자동 감사 리포트 생성~~ → **Phase 18 완료** (`reports/metrics-drift.json`)
3. 상위 이상치부터 수동 보정 → **오늘 Round 1**

---

### A. 현재 매칭 상태 (Phase 18 기준)
- Front 기준:
  - exact `1342`
  - fallback `263`
  - miss `28` (`STUDIOPROP*`)
- Back 기준:
  - exact `1341`
  - fallback `263`
  - miss `0`

### B. fallback 263개가 모두 문제는 아님
- fallback 자산 중 고위험(high)인 항목: 39개
- 상위 고위험: BASCULEGION_1, BUTTERFREE_female, DONPHAN_female, FLABEBE_1~4 등

### C. DBK도 자동화+수동 편집 혼합 워크플로우
- Sprite Editor에 `pbAutoPosition`이 존재하며, 밑변 탐색 기반 자동 Y 보정 로직 사용.
- 우리도 동일 철학: 자동 후보 산출(`audit-metrics-drift.mjs`) → 수동 보정

### D. Round 1 고정 batch (current audit top 30)
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

### E. Round 1 triage
- 직접 확인: `LINOONE`, `METAGROSS_1`, `MIMIKYU_1`, `SALAMENCE_1`, `HEATMOR`, `KORAIDON`, `THUNDURUS_1`, `TINKATINK`
- 패턴 조정: `AVALUGG`, `CHARJABUG`, `CLAUNCHER`, `DARKRAI_1`, `DARMANITAN_2`, `DARUMAKA_2`, `DEDENNE`, `DOTTLER`, `FALINKS`, `FIDOUGH`, `GRUBBIN`, `HEATRAN`, `KLAWF`, `LINOONE_1`, `LITTEN`, `LUGIA`, `MALAMAR_1`, `PINCURCHIN`, `PUMPKABOO`, `SIZZLIPEDE`, `STARAPTOR_1`, `STUNFISK_1`
- 보류: 없음

---

## 6) 실무 판단

### A. "적군 그림자만 중요, 아군 그림자는 불필요"
- `showPlayerSideShadows=false` 정책 유지. Phase 18 수정도 이 정책 기준.

### B. "에셋 일일이 분석해 metrics 수정 가능?"
- 가능. 런타임 식 수정이 선행되었으므로 이제 PBS 보정이 의미 있음.
- `npm run audit:metrics-drift` → `reports/metrics-drift.json` 참조.

---

## 7) 구현 전 체크포인트 — Phase 18 처리 결과

1. `DBK_DEFAULTS` scale은 `1/1` 정책 유지 → **확정 유지**
2. sprite Y 부호(`baseY - offsetY`) — 현재 유지, 종별 metrics 조정으로 보정
3. shadow 위치 계산에 `front/back + shadow` 합산 → **Phase 18 완료**
4. shadow baseline(`-height/4`) ellipse 근사(k=0.12) → **Phase 18 완료**
5. verify 스크립트 재정립(1/1 + shadow 합산식) → **Phase 18 완료**

---

## 8) 참고 수치 요약

- metrics entries: `1342`
- Front 자산: `1633` (manifest 기준 `000` 제외)
- Front coverage: `exact 1342`, `fallback 263`, `miss 28`
- shadow 오차에 직접 영향 큰 값:
  - `frontY` abs p50/p90/max = `8 / 20 / 71`
  - `frontX` abs p50/p90/max = `2 / 7 / 20`
- Drift audit 결과: `high 91 / medium 668 / low 654`
- 최고위험 (score=8): LINOONE, METAGROSS_1, MIMIKYU_1, SALAMENCE_1

---

## 9) Phase 18 구현 결과 요약

| Task | 대상 파일 | 상태 |
|------|-----------|------|
| A: shadow 합산식 | `battle-shell-scene.js` | **완료** |
| B: baseline 보정 + 크기 DBK화 | `battle-shell-scene.js` | **완료** |
| C: sprite Y 부호 A/B | `battle-shell-scene.js` | 글로벌 반전 없음, 종별 metrics 조정 |
| D: verify 정책 재정립 | `verify-metrics-parity.mjs` | **완료 (14/14 PASS, 오늘도 재실행 대상)** |
| E: audit 스크립트 | `audit-metrics-drift.mjs` | **완료** |
| F: PBS 수동 보정 | `assets/Pokemon/PBS/` | 오늘 Round 1 시작 |

## 10) 오늘 작업 요약

1. 브라우저에서 `baseY - offsetY`와 `baseY + offsetY`를 같은 샘플셋으로 비교한다.
2. 샘플은 `VENUSAUR`, `DONDOZO`, `DRIFLOON`, `CELEBI`, `CORVIKNIGHT_1`, `TERAPAGOS_1`, `NECROZMA_3`를 기본으로 쓴다.
3. 판단 기준은 바닥 접지, 부유감, 그리고 enemy/player 공통 일관성이다.
4. 이 샘플 패턴이면 글로벌 부호는 유지하고, 종별 `frontY`/`backY` 보정으로 넘어간다.
5. `reports/metrics-drift.json`의 high-risk 상위 30~50개를 첫 PBS batch로 잡는다.
6. 시작 우선순위는 `LINOONE`, `METAGROSS_1`, `MIMIKYU_1`, `SALAMENCE_1`이고, 그 다음은 score 7 그룹이다.
7. 실제 수정은 `assets/Pokemon/PBS/pokemon_metrics.txt`, `pokemon_metrics_forms.txt`, 필요 시 `pokemon_metrics_female.txt`에만 한다.
8. PBS batch를 끝낸 뒤 `npm run audit:metrics-drift`, `npm run verify:metrics-parity`, `npm run verify:stage22`, `npm run verify:passb`를 다시 확인한다.

---

[^scale_policy]: 사용자 각주: "`1/1` 유지 이미 충분히 큼" 의견 반영.
[^y_sign_note]: 사용자 각주: "현재도 적당히 위치 비슷함, 다시 확인" 요청 반영.
[^shadow_apply]: 사용자 각주: "shadow 합산 적용 ㄱㄱ" 요청 반영. → **Phase 18 완료**
[^baseline_note]: 사용자 각주: "baseline 대응 설명 요청" 반영. → **Phase 18 완료**
[^verify_note]: 사용자 각주: "1번(1/1 유지) 기준으로 verify 재정립" 요청 반영. → **Phase 18 완료**
