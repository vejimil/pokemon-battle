# Research: 그림자 위치 이상 + 일부 포켓몬 metrics 어긋남 조사

작성일: 2026-04-11 (UTC)  
대상 요청:
1. 적군 그림자 위치 이상 원인 조사  
2. 일부 포켓몬 metrics 어긋남을 에셋 단위로 보정 가능한지 조사

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

### B. shadow 좌표 계산
- 현재:
  - `shadowX = baseX + shadowX`
  - `shadowY = baseY + shadowFrontY(또는 backY)`
- 즉, shadow 위치 계산에 `frontX/frontY(backX/backY)`가 포함되지 않음
- 근거: `battle-shell-scene.js` `L196-L211`

### C. shadow baseline 보정
- DBK는 `-height/4` 기준 보정이 있음
- 현재 Phaser ellipse shadow에는 이 baseline 보정이 없음
- 근거 비교:
  - DBK: `[006] Battler Sprites.rb` `L336`
  - 현재: `battle-shell-scene.js` `L196-L211`

### D. default scale 값
- 현재 `DBK_DEFAULTS.frontScale/backScale`가 `1/1`로 들어가 있음
- DBK 원본 기본은 `2/3`이지만, 이번 리포트에서는 사용자 각주 기준으로 `1/1`을 **프로젝트 정책값**으로 간주함.[^scale_policy]
- 근거:
  - 현재: `pokemon-metrics.js` `L18-L23`
  - DBK: `[000] Settings.rb` `L8`, `L13`

### E. verify 스크립트의 허점
- `verify:metrics-parity`는 “scene이 DBK_DEFAULTS 참조하는지”만 문자열 체크
- `DBK_DEFAULTS` 숫자값 자체를 검증하지 않음
- 근거: `scripts/verify-metrics-parity.mjs` `L133`

---

## 4) 이슈 1 분석: "적군 그림자 위치가 이상함"

## 결론
현재 이상 현상은 단일 원인이 아니라, 아래 3개가 겹친 결과로 보는 게 타당함.

1. shadow 좌표 계산에서 `frontX/frontY`가 빠짐  
2. DBK shadow baseline(`-height/4`) 보정이 빠짐  
3. sprite Y 부호 문제는 의심 지점이지만, 좌표계 차이가 있어 즉시 단정은 금물(시각 A/B 검증 필요).[^y_sign_note]

---

### A. 정량 근거 1: shadow 좌표에서 빠진 `frontY`의 크기

metrics 1342개 통계:
- `frontY` 절대값 median: `8`
- `frontY` 절대값 p90: `20`
- `frontY` 최대: `71`

해석:
- 현재 구현은 shadow에 `frontY`를 전혀 반영하지 않으므로, 적군 shadow가 species별로 수 px~수십 px 어긋날 수 있음.

---

### B. 정량 근거 2: shadow 좌표에서 빠진 `frontX`의 크기

metrics 1342개 통계:
- `frontX` 절대값 median: `2`
- `frontX` 절대값 p90: `7`
- `frontX` 최대: `20`

해석:
- 좌우 정렬도 species에 따라 누적 오차가 눈에 띌 수 있음.

---

### C. 추가 근거: DBK shadow는 "ellipse"가 아니라 battler silhouette 기반
- DBK는 shadow sprite를 battler bitmap clone으로 생성 후 검정/투명도로 처리함.
- 현재는 단일 ellipse primitive를 사용함.
- 즉, 좌표를 맞춰도 "형태/무게중심" 체감은 DBK와 완전히 같아지지 않을 수 있음.
- 근거: `[006] Battler Sprites.rb` `L345-L353`, `[005] Pokemon Sprites.rb` `L119-L136`

### D. baseline 보정 설명(요청 반영)
- DBK의 `self.y -= (self.height / 4).round`는 shadow 기준점을 sprite 중앙에서 바닥 쪽으로 내리는 역할이다.
- 현재 ellipse shadow는 이 기준점 이동이 없어, 특히 `frontY`가 큰 종/부유형에서 shadow가 상대적으로 위로 붙어 보일 확률이 높다.
- ellipse 방식에서의 실무 근사는 아래처럼 분리하는 게 안전하다.
  - 위치식: `shadowY = baseY + offY + shadowOffY - baseline`
  - baseline: `frameH * sprScale * k` (`k`를 0.10~0.14 범위로 샘플링)
- 즉, baseline은 “그림자 자체 크기”가 아니라 “그림자 기준점 보정”이다.[^baseline_note]

---

## 5) 이슈 2 분석: "일부 포켓몬 metrics 어긋남, 에셋 일일이 분석 가능?"

## 결론
가능함. 다만 전부 수동(1635 front + 1606 back)을 한 번에 일일이 고치는 방식은 비효율이 큼.  
현실적으로는 **자동 후보 추출 + 수동 미세조정** 2단계가 맞음.

---

### A. 현재 매칭 상태
- Front 기준:
  - exact `1342`
  - fallback `263`
  - miss `28` (`STUDIOPROP*`)
- Back 기준:
  - exact `1341`
  - fallback `263`
  - miss `0`

해석:
- “어긋남”은 metrics 부재보다 런타임 적용식/좌표 해석 차이에서 오는 비중이 큼.

---

### B. fallback 263개가 모두 문제는 아님
- fallback 자산 중 프레임 크기 차이가 큰 케이스(기준: `>=8px` 또는 `>=12%`)는 `11개`만 확인됨.
- 대부분 `UNOWN_* -> UNOWN` 계열.

해석:
- form fallback 자체가 곧바로 버그는 아님.
- 우선순위는 “런타임 공식 수정”이 먼저.

---

### C. DBK도 자동화+수동 편집 혼합 워크플로우
- Sprite Editor에 `pbAutoPosition`이 존재하며, 밑변 탐색 기반 자동 Y 보정 로직을 사용함.
- 근거: `[002] Sprite Editor.rb` `L155-L172`

해석:
- 우리도 동일 철학으로:
  1) 자동 후보 산출
  2) 상위 outlier 수동 확인
  3) PBS patch 반영
가 가장 효율적임.

---

## 6) 실무 판단

### A. "적군 그림자만 중요, 아군 그림자는 불필요"
- 현재 정책(`showPlayerSideShadows=false`)은 이 요구와 일치.
- 다만 적군 shadow 좌표식이 DBK와 다르게 단순화돼 있어 위치 오차가 발생.

### B. "에셋 일일이 분석해 metrics 수정 가능?"
- 가능.
- 단, 먼저 런타임 식을 DBK 방식으로 맞추지 않으면 metrics를 수정해도 다시 틀어질 위험이 큼.
- 권장 순서:
  1) 런타임 좌표식 정합화(단, scale은 현 정책 1/1 유지)
  2) 자동 감사 리포트 생성
  3) 상위 이상치부터 수동 보정

---

## 7) 구현 전 체크포인트(다음 단계로 넘길 항목)

1. `DBK_DEFAULTS` scale은 `1/1`을 기준 정책으로 유지할지 확정(현 리포트는 유지로 재정립).[^scale_policy]
2. sprite Y 부호(`baseY - offsetY`)는 “즉시 반전”이 아니라 시각 A/B 검증으로 판정.
3. shadow 위치 계산에는 `front/back + shadow` 합산을 우선 적용 대상으로 확정.[^shadow_apply]
4. shadow baseline(`-height/4`)은 ellipse 기준점 보정 계수(`k`) 튜닝으로 대응.
5. verify 스크립트는 1번 정책과 일치하게 재정립(예: 1/1 고정 검증 + shadow 합산식 검증).[^verify_note]

---

## 8) 참고 수치 요약

- metrics entries: `1342`
- Front 자산: `1633` (manifest 기준 `000` 제외)
- Front coverage: `exact 1342`, `fallback 263`, `miss 28`
- shadow 오차에 직접 영향 큰 값:
  - `frontY` abs p50/p90/max = `8 / 20 / 71`
  - `frontX` abs p50/p90/max = `2 / 7 / 20`

---

[^scale_policy]: 사용자 각주: "`1/1` 유지 이미 충분히 큼" 의견 반영.
[^y_sign_note]: 사용자 각주: "현재도 적당히 위치 비슷함, 다시 확인" 요청 반영.
[^shadow_apply]: 사용자 각주: "shadow 합산 적용 ㄱㄱ" 요청 반영.
[^baseline_note]: 사용자 각주: "baseline 대응 설명 요청" 반영.
[^verify_note]: 사용자 각주: "1번(1/1 유지) 기준으로 verify 재정립" 요청 반영.
