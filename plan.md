# PKB Battle Presentation 활성 계획

Last updated: 2026-04-17  
Target: `/workspaces/pokemon-battle`

완료된 상세 이력은 `planprevious.md`로 분리했다.  
이 문서는 "지금부터 할 일" 중심으로 유지한다.

---

## 0) 오늘 상태 요약 (2026-04-17)

### 완료
- `BA-27` 타임라인 재생 중 입력 블록 완료
- `BA-26` 폼명 고정(UI) + 폼체인지 메시지 톤 복원 완료

### 오늘 후속 회귀 수정 완료
- 증상 1: 기술 연출 전에 HP/스프라이트가 최종 상태로 선반영
- 증상 2: 기절 전에 sprite가 먼저 사라짐
- 증상 3: input 잠금은 걸리는데 선택창이 남아 있음

### 적용한 핵심 수정
1. `src/app.js`
- `playTimelineAcrossActiveViews()`
  - `setBattleInputLocked(..., { rerender:false })` 유지
  - 중간 턴 `prepareSwitchInBattler()` 선호출 금지 (초기 소환 경로만 허용)
  - `forceBattleMessageOnlyUiDuringLock()` 추가: 잠금 직후 DOM/Phaser를 message 모드로 즉시 전환

2. `src/battle-presentation/timeline.js`
- `switch_in` 이벤트에서 `fromBall` 여부와 무관하게 이벤트 시점 sprite 교체
- `fromBall=true`이면 `visible:false`로 세팅 후 `switchInBattler()` 연출 진행

### 오늘 검증 결과
- `node --check src/app.js` PASS
- `node --check src/battle-presentation/timeline.js` PASS
- `npm run verify:stage22` PASS
- `npm run verify:passb` PASS

---

## 1) 고정 작업 순서

요청된 고정 순서: `27 -> 26 -> 24 -> 25 -> 23 -> 28`  
현재 남은 순서:
1. `BA-24` 테라스탈 구현 (다음 착수)
2. `BA-25` 다이맥스 구현
3. `BA-23` 기술/날씨/필드 연출 완벽화
4. `BA-28` 영칭 전용 포켓몬/기술 한국어명 탑재

---

## 2) 다음 작업: BA-24 (테라스탈)

### 목표
- Showdown `-terastallize`를 이벤트로 구조화하고,
- 타임라인 순서에 맞는 메시지/시각/UI 반영을 구현한다.

### 사전 원칙
- 반드시 `pokerogue_codes` 원본 코드 먼저 읽고 이식
- 기존 BA-27/BA-26/연출 순서 회귀 금지
- 단계 완료마다 `plan.md`, `CLAUDE.md` 즉시 업데이트

### 구현 체크리스트
1. 원본 조사
- `pokerogue_codes`에서 테라스탈 phase/메시지/연출 흐름 확인
- 이벤트 발생 시점(메시지 vs 비주얼 vs 타입 갱신) 파악

2. 서버 이벤트 파싱
- `server/showdown-engine.cjs`
- `-terastallize`를 안정적으로 timeline event로 추출
- 필요한 필드(대상 side/slot, tera type, 표시 텍스트 재료) 정의

3. 이벤트 스키마
- `src/battle-presentation/event-schema.js`
- terastallize 이벤트 타입/필드 스키마 반영

4. 타임라인 실행
- `src/battle-presentation/timeline.js`
- 메시지/연출/정보패치 순서 구현
- 기존 `move_use/damage/faint/switch_in` 순서와 충돌 없는지 확인

5. 뷰/씬/UI 반영
- `src/app.js`
- `src/pokerogue-transplant-runtime/scene/battle-shell-scene.js`
- 필요 시 tera 아이콘/타입 표시/배틀러 시각 반영

6. 회귀 검증
- 정적: `node --check` (수정 파일)
- 회귀: `npm run verify:stage22`, `npm run verify:passb`
- 필요 시 BA-24 전용 검증 스크립트 추가

### 브라우저 확인 포인트 (BA-24 완료 후)
1. 테라 선언 메시지/연출/타입 반영 순서가 자연스러운지
2. 테라 직후 기술/데미지/기절 순서가 깨지지 않는지
3. 타임라인 재생 중 선택창 숨김(message-only)이 유지되는지
4. 타임라인 종료 후 입력 해제 + 선택창 복귀가 정상인지

---

## 3) 후속 작업 개요 (BA-25 / BA-23 / BA-28)

### BA-25 (다이맥스)
1. 원본(`pokerogue_codes`)에서 다이맥스/거다이맥스 phase 흐름 먼저 확인
2. `showdown-engine.cjs`에서 다이맥스 관련 이벤트 추출 안정화
3. `timeline.js`에 변환/해제 메시지 및 시각 순서 반영
4. 기존 switch_in/faint/forme_change와 충돌 없는지 회귀 검증

### BA-23 (기술/날씨/필드 연출 완벽화)
1. move/weather/terrain 템포를 원본 체감으로 미세 조정
2. 누락된 메시지 키/사운드/완충 간격 보강
3. 연출 순서 회귀(move -> hp -> faint/switch) 유지 검증

### BA-28 (한국어명 보강)
1. KO 모드에서 영어 노출되는 포켓몬/기술 수집
2. `assets/pokerogue/locales/ko/*.json` 우선 보강
3. 미존재 항목만 수동 override로 최소 추가

---

## 4) 공통 작업 원칙

- 수정 전 원본 우선 이식
- 배틀 연출 완성 전 UI 폴리시(UI-P1~P5) 착수 금지
- 문서 동기화 필수:
  - 단계 완료 직후 `plan.md`, `CLAUDE.md` 반영
  - 완료 이력은 `planprevious.md`에 누적

---

## 5) 빠른 시작 메모 (새 세션용)

- 먼저 읽기: `CLAUDE.md` -> `plan.md` -> `planprevious.md`
- 다음 착수 항목: `BA-24`
- 회귀 핵심 가드:
  - 연출 시작 전 스냅샷 선반영 금지
  - 타임라인 중 선택창 비노출(message-only)
  - 이벤트 순서(move -> hp -> faint/switch) 보존
