# PKB Battle Presentation 활성 계획

Last updated: 2026-04-19  
Target: `/workspaces/pokemon-battle`

완료 이력 아카이브는 `planprevious.md` 기준으로 관리한다.  
이 문서는 현재 활성 작업과 다음 순서만 유지한다.

---

## 0) 오늘 상태 요약 (2026-04-19)

### 완료
- `BA-24` 테라스탈 구현 (2차 보강 포함) 완료
- `BA-25` 다이맥스 구현 완료
- `BA-25` 후속 안정화 완료
  - 다이맥스 버튼/토글 경로 보정
  - Max/G-Max 기술명·기술 모션 fallback 보정
  - 거다이맥스 가능 종 자동 거다이맥스 강제
  - 다이맥스 2.0x + metrics 동기화 + 일반 다이맥스 base Y 하향 조정

### 고정 순서 반영
- 요청 고정 순서: `25 -> 23 -> 28`
- 현재 남은 순서:
1. `BA-23` 기술/날씨/필드 연출 완벽화
2. `BA-28` 영칭 전용 포켓몬/기술 한국어명 탑재

---

## 1) BA-25 완료 보고 (최종 안정화 포함)

### 원본 조사(수정 전 선행)
- `pokerogue_codes/src/field/pokemon.ts`
  - `isMax()` 판별 및 `getSpriteScale()`에서 Max 계열 1.5x 스케일 확인
- `pokerogue_codes/src/data/pokemon-forms/form-change-triggers.ts`
  - `gigantamaxChange` 메시지 분기 확인
- 확인된 제한사항:
  - 원본에 `DynamaxPhase` 명시 클래스는 없고, `isMax()` 기반 스케일/폼 메시지 경로 중심 구조

### 반영 파일
- `server/showdown-engine.cjs`
- `src/battle-presentation/event-schema.js`
- `src/battle-presentation/timeline.js`
- `src/pokerogue-transplant-runtime/scene/battle-shell-scene.js`
- `src/app.js`

### 핵심 반영
1. 서버 이벤트 파싱
- `-start|-end ... Dynamax`를 `dynamax_start`/`dynamax_end`로 구조화
- 다이맥스 동반 `-heal [silent]`를 일반 `heal`로 재생하지 않고 다이맥스 이벤트에 흡수
- 이벤트 필드: `target`, `species`, `gigantamaxed`, `hpAfter`, `maxHp`

2. 타임라인
- `dynamax_start`: 메시지 → 다이맥스 시작 연출 → info patch(HP/UI/dynamax 상태)
- `dynamax_end`: 메시지 → 다이맥스 해제 연출 → info patch(HP/UI 상태 복귀)
- 회귀 가드 유지:
  - 기술 전 HP/스프라이트 선반영 금지
  - `move -> hp -> faint/switch` 순서 보존
  - 타임라인 중 message-only 유지
  - 테라스탈 경로 독립 유지

3. Phaser 씬
- battler mount에 `dynamaxed/gigantamaxed` 상태 추가
- `isMax` 기준 2.0x 스케일 적용 경로 추가(최종)
- 확대 기준점은 중앙-하단(`origin(0.5,1)`) 유지
- 일반 다이맥스만 base Y 하향(+12), 거다이맥스는 하향 없음
- `setBattlerDynamaxState`, `playDynamaxStart`, `playDynamaxEnd` API 추가
- 테라 오버레이와 공존하도록 동기화

4. 앱 상태/렌더 모델
- battle info/model에 `dynamaxed`, `gigantamaxed` 전달
- Phaser sprite model(`enemySprite/playerSprite`)에 다이맥스 상태 전달
- 시각 해석(`resolveTimelineEventVisualState`)에 다이맥스 시작/해제 sprite 분기 추가
- 거다이맥스 가능 종 자동 처리: payload/서버 양쪽에서 `gigantamax` 강제
- `runtimeSupportsDynamax()`는 포맷/요청(`canDynamax`) 기반으로 계산
- Max/G-Max 기술 표시명은 request `maxMoves` 우선 사용, 연출은 원기술 `animationMove` fallback 사용

5. 테라스탈 즉시 KO 보정
- 변신 턴 즉시 기절 시에도 스프라이트/정보창 타입 반영이 유지되도록
  `resolveTimelineEventMon` 매칭을 보강(fallback species + 상태 우선 매칭)

---

## 2) 검증 결과

### 정적 검사
- `node --check server/showdown-engine.cjs` PASS
- `node --check src/battle-presentation/event-schema.js` PASS
- `node --check src/battle-presentation/timeline.js` PASS
- `node --check src/pokerogue-transplant-runtime/scene/battle-shell-scene.js` PASS
- `node --check src/app.js` PASS

### 기존 회귀 스위트
- `npm run verify:ba20` PASS
- `npm run verify:stage22` 최근 재실행에서 메가 케이스 간헐 FAIL 관찰(플래키)
- `npm run verify:passb` PASS

### 인라인 다이맥스 검증
- `gen8customgame`에서 `move 1 dynamax` 실행 시
  - `dynamax_start` 이벤트 추출 + `hpAfter/maxHp` 포함 확인
  - 기존 `heal` 이벤트 오염 없이 `move_use/damage` 순서 유지 확인
- 3턴 종료 시점
  - `dynamax_end` 이벤트 추출 + 해제 HP(`153/153` 케이스) 반영 확인
- `gigantamax: true` 팀 payload 케이스
  - `dynamax_start.gigantamaxed === true` 확인

---

## 3) 다음 작업 (고정)

### BA-23 (다음 착수)
1. move/weather/terrain 템포를 원본 체감으로 미세 조정
2. 누락된 메시지 키/사운드/완충 간격 보강
3. `move -> hp -> faint/switch` 회귀 재검증

### BA-28
1. KO 모드 영어 노출 포켓몬/기술 수집
2. `assets/pokerogue/locales/ko/*.json` 우선 보강
3. 미존재 항목만 최소 override 추가

---

## 4) 공통 작업 원칙 (유지)

- 수정 전 원본 코드 선독/정합 이식
- 배틀 연출 완성 전 UI 폴리시(UI-P1~P5) 착수 금지
- 단계 완료 직후 `plan.md`, `CLAUDE.md` 동기화
- 완료 이력은 `planprevious.md` 누적

---

## 5) 빠른 시작 메모

- 먼저 읽기: `CLAUDE.md` -> `plan.md` -> `planprevious.md`
- 다음 착수 항목: `BA-23`
- 회귀 핵심 가드:
  - 기술 전 HP/스프라이트 선반영 금지
  - 타임라인 중 message-only 유지
  - `move -> hp -> faint/switch` 순서 보존
  - 테라스탈/다이맥스 상호 훼손 금지
