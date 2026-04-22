# 온라인/배틀 수정사항 분석 및 구현 계획

Last updated: 2026-04-21  
Target: `/workspaces/pokemon-battle`  
Status: **분석 완료, 구현 대기**

이 문서는 사용자 요청 13개 항목(온라인 6 + 배틀 7)에 대한 **현재 코드 동작 분석 + 구현 계획**만 담는다.  
현재 단계에서는 실제 코드 구현을 하지 않는다.

---

## 1) 분석 요약 (요청 항목별)

### 온라인
1. 런타임 연결 중 빌더 노출 제어
- 현재 `src/app.js`의 `renderAll()`은 `showSetupPanel = !isOnlineProfile() || isOnlineBuilderUnlocked()`로 제어.
- `isOnlineBuilderUnlocked()`이 룸/참가 상태 중심으로만 판단하고, 배틀 진행/종료 전환 상태와 분리되어 있어 UX 요구(배틀 중 숨김, 방 기준 노출)와 불일치 가능성이 큼.

2. 항복 즉시 종료
- `requestBattleForfeit()`에 확인창(`window.confirm`)이 있어 단일 클릭 즉시 종료 UX와 다름.
- 서버 `forfeitBattle()`는 승자/로그를 즉시 반영하지만, 클라이언트 체감은 확인창 + 왕복 지연이 존재.

3. 종료 메시지 후 빌더 복귀
- 배틀 종료 후 자동 복귀 타이머/상태 전이 로직이 없음.
- 온라인 페이지(`online.html`)는 로컬 페이지와 달리 `back-to-builder/restart` 버튼도 없음.

4. 방 생성 시 1~6마리 설정
- 팀 수는 `rebuildTeamSize()`에서 모드 기반 하드코딩(싱글3/더블4).
- 온라인은 강제로 싱글 모드이므로 사실상 3 고정.
- 룸 API/서버 상태 모델에 teamSize 설정 필드 없음.

5. 배경음악 미출력
- 로컬 시작 경로에서는 BGM 시작 호출이 있음.
- 온라인 스냅샷 채택 경로(`applyOnlineRoomState`)에는 BGM 시작 호출이 없음.
- 오디오 컨텍스트 잠금(브라우저 자동재생 정책) 대응 루틴도 명시적이지 않음.

6. 모바일 하단 조작키
- 키보드 입력 매핑은 있으나 모바일 온스크린 컨트롤 UI가 없음.
- `assets/pokerogue/buttons/xbox.json`은 `frames` 배열(TexturePacker) 형식인데, 현재 `normalizeAtlasData()`는 해당 형식을 직접 지원하지 않음.
- 또한 atlas 검색 경로에 `assets/pokerogue/buttons`가 포함되지 않음.

### 배틀
1. 방어/막힘 메시지
- 서버는 `-activate`, `-singleturn`, `-fail`를 이벤트로 내보내지만,
- `timeline.js`에서 `effect_activate/single_turn_effect`는 no-op 처리.
- 결과적으로 보호/막힘 상황 문구가 비어 있음.

2. 빗나감/효과없음/실패 시 기술 연출 스킵
- `move_use`에서 애니메이션을 항상 재생하고,
- 이후 `miss/immune/move_fail` 메시지가 뒤따름.
- 요구사항(해당 경우 메시지만 노출)과 불일치.

3. 빗나감 주체 오류
- `showdown-engine.cjs`의 `miss` 파싱이 `parts[2]`(공격자)를 `target`으로 넣는 구조.
- `timeline.js`는 이를 대상으로 `attackMissed` 메시지를 구성해 주체가 뒤바뀔 수 있음.

4. 기절 후 교체 화면의 영어 정보바 노출
- 필드 상태 문자열 생성에서 `Stealth Rock`, `Reflect` 등 영어 토큰이 직접 삽입됨(`describeHazards`, `describeSideConditions`).
- 강제교체 시점 상단 상태바에서 혼합 언어가 노출될 수 있음.

5. 게임 종료 시 불필요한 줄(예: `0승리!`, 마지막 기절 로그) 노출
- `timeline.js`의 `battle_end` 메시지가 하드코딩(`{winner} 승리!`).
- `renderBattleMessagesWindow`/`buildBattleMessageModel`이 종료 상태에서도 `battle.log` 상위 줄을 우선 노출할 수 있어, 최종 기절 로그가 함께 보임.

6. 대타출동/프리폴/구멍파기/공중날기 등 스프라이트 상태 반영
- 스냅샷에 `volatile` 정보는 들어오지만 렌더 가시성은 주로 HP/기절 상태만 기준.
- 반잠수/공중/잠행/대타 상태에 따른 sprite hide/대체가 전투 화면에 반영되지 않음.

7. 능력 상승/하강 시 스프라이트 VFX
- 현재는 메시지 + SE(`se/stat_up`, `se/stat_down`)만 처리.
- 스프라이트 상에서 상승/하강 시각 효과(원본 느낌)가 없음.

---

## 2) 구현 원칙

- 상태 전이(온라인 룸/배틀)와 연출(타임라인)을 분리해서 최소 침습 패치.
- 온라인/로컬 공용 함수는 회귀 위험이 높으므로, 온라인 조건 분기를 명확히 분리.
- 로케일 메시지는 가능하면 기존 locale key 재사용, 없으면 최소 키 추가.
- 모바일 조작키는 데스크톱 영향 0을 목표(미디어쿼리 + 터치 디바이스 조건).

---

## 3) 항목별 구현 계획 (파일 단위)

### O-1) 빌더 표시 조건 재정의 (완료)
- 목표 동작
  - 온라인에서 빌더는 "방에 참가된 상태" + "배틀 진행 중 아님"일 때만 표시.
  - 배틀 진행 중에는 빌더 숨김.
- 수정 예정
  - `src/app.js`
- 구현 포인트
  - `isOnlineBuilderUnlocked()` 책임 재정의 또는 `isOnlineBuilderVisible()` 분리.
  - `state.online.battleStarted` + `snapshot.winner`를 함께 판단하는 helper 추가.
  - `renderAll()`, `renderOnlineRoomPanel()`의 안내 문구/버튼 활성 조건 동기화.

### O-2) 항복 즉시 종료 (개선 필요)
- 목표 동작
  - 항복 버튼 1회 입력 즉시 종료 플로우 진입.
  - 해석 확정: `도망친다(Run)` 선택 후 `항복`을 누르면 즉시 종료 전환으로 처리.
- 수정 예정
  - `src/app.js`, `server/online-room-service.cjs`
- 구현 포인트
  - 클라이언트 항복 확인창 제거(원클릭 항복).
  - 온라인은 API 응답 즉시 종료 UI 반영(폴링 대기 제거).
  - 서버는 forfeit 시점에 종료 상태 플래그를 명확히 반영(아래 O-3과 연동).

### O-3) 종료 메시지 후 자동 빌더 복귀 (개선 필요)
- 목표 동작
  - 종료 메시지 표시 -> `3초` 지연 -> 빌더 복귀.
- 수정 예정
  - `src/app.js`, `server/online-room-service.cjs`, `online.html`(필요시 최소 요소 추가)
- 구현 포인트
  - 온라인 배틀 종료 감지 훅(승자 확정/항복 포함) 추가.
  - 종료 플로우 중 입력 잠금 및 타이머 중복 방지 (`RETURN_TO_BUILDER_DELAY_MS = 3000` 상수화).
  - 복귀 시 battle panel 비표시, setup panel 재표시, 온라인 룸 상태 유지.
  - BGM 정리(stop) 포함.

### O-4) 방 생성 시 1~6 팀수 설정 (완료)
- 목표 동작
  - 온라인 룸 단위로 teamSize(1~6) 설정 가능.
- 수정 예정
  - `online.html`, `styles.css`, `src/app.js`, `src/engine/showdown-online-room-bridge.js`, `server/server.cjs`, `server/online-room-service.cjs`
- 구현 포인트
  - 룸 상태에 `settings.teamSize` 추가(기본 3, clamp 1~6).
  - create/join/sync/start API에서 teamSize 전달/직렬화.
  - `rebuildTeamSize()`를 모드 고정값 대신 설정값 기반으로 분리(온라인 경로 우선).
  - Hero/노트 문구는 마리수 고정 표기를 제거하는 방향을 우선 적용(예: `싱글`/`Singles`), 팀 수는 설정 UI/노트에서만 명시.

### O-5) BGM 미출력 수정 (완료)
- 목표 동작
  - 온라인 전투 시작 시 로컬과 동일하게 BGM 재생.
- 수정 예정
  - `src/app.js`, `src/pokerogue-transplant-runtime/runtime/audio-manager.js`(필요 시)
- 구현 포인트
  - 온라인 snapshot 최초 채택 시 `playRandomBattleBgm()` 호출.
  - 오디오 컨텍스트 suspended 대응(resume 시도) 추가.
  - 중복 재생 방지(이미 BGM 실행 중이면 재시작하지 않음).

### O-6) 모바일 하단 조작키 추가 (xbox atlas 사용) (개선 필요)
- 목표 동작
  - 모바일에서 하단 D-pad + ABXY 버튼으로 UI 네비게이션 가능.
- 수정 예정
  - `online.html`(필요시 `index.html`도 공통 적용), `styles.css`, `src/app.js`, `src/pokerogue-assets.js`
- 구현 포인트
  - 모바일 전용 컨테이너/버튼 DOM 추가.
  - 버튼 press/release 이벤트를 `processInput`/`processInfoButton`으로 매핑.
  - `xbox.json` 배열형 `frames` 파싱 지원 + `assets/pokerogue/buttons` atlas 탐색 경로 추가.
  - 안전영역(safe-area-inset-bottom) 반영.

---

### B-1) 방어/막힘 메시지 출력 (개선 필요)
- 목표 동작
  - Protect 등으로 막힌 경우 명확한 메시지 출력.
- 수정 예정
  - `src/battle-presentation/timeline.js`, `server/showdown-engine.cjs`, `src/app.js`
- 구현 포인트
  - `effect_activate`/`single_turn_effect` no-op 해제.
  - effect id(`move: Protect` 등) 정규화 후 메시지 매핑.
  - 필요 시 locale namespace에 `battler-tags` 로드 추가.

### B-2) miss/immune/fail 시 기술 연출 제거 (개선 필)
- 목표 동작
  - 해당 케이스는 move animation 스킵, 결과 메시지만 출력.
  - 단, `A의 기술명!` 문구와 결과 문구 사이에는 짧은 지연(리듬감 유지)을 둔다.
- 수정 예정
  - `src/battle-presentation/timeline.js`
- 구현 포인트
  - `move_use` 처리 시 후속 이벤트 lookahead로 결과 판정.
  - miss/immune/move_fail/protect-block이면 `playMoveAnim` 생략.
  - animation 생략 시에도 `move_use` 메시지 후 최소 hold 시간(예: 280~420ms) 유지.

### B-3) miss 문구 주체 수정 (완료)
- 목표 동작
  - "A가 B를 공격했지만 B에게 맞지 않았다"로 대상 기준 문구 노출.
- 수정 예정
  - `server/showdown-engine.cjs`, `src/battle-presentation/timeline.js`
- 구현 포인트
  - miss 이벤트 파싱에 actor/target 분리 저장.
  - 타임라인에서 target 우선으로 `attackMissed` 변수 구성.

### B-4) 기절 후 교체 시 영어 정보바 제거 (완료)
- 목표 동작
  - 한국어 UI에서 상단 상태바/관련 정보는 한국어 중심으로만 표기.
- 수정 예정
  - `src/app.js`
- 구현 포인트
  - `describeHazards`/`describeSideConditions`를 `lang()` 기반 라벨로 변경.
  - 강제교체 시점에서 필드 상태 문자열의 영어 직접 토큰 제거.

### B-5) 종료 시 불필요 줄 제거 (완료)
- 목표 동작
  - 종료 화면에서 승패 요약만 표시, 불필요한 마지막 기절/영문 줄 미노출.
- 수정 예정
  - `src/battle-presentation/timeline.js`, `src/app.js`
- 구현 포인트
  - `battle.winner` 상태에서는 메시지 창이 `battle.log` 우선 노출하지 않도록 변경.
  - `battle_end` 문구를 locale/안전 fallback으로 정리(숫자/빈 winner 방어).

### B-6) 반잠수/대타 등 스프라이트 상태 반영 (개선 필요)
- 목표 동작
  - Dig/Fly/Free Fall 등은 비가시 처리, Substitute는 대체 sprite 처리.
- 수정 예정
  - `src/app.js`, `src/battle-presentation/timeline.js`, `src/pokerogue-transplant-runtime/scene/battle-shell-scene.js`
- 구현 포인트
  - `mon.volatile` 기반 sprite presentation helper 추가.
  - `resolveSpriteUrlForBattleSide` 및 timeline visual resolver에 동일 규칙 적용.
  - Substitute는 `assets/system/pokemon/substitute(_back).png` 우선 적용.

### B-7) 능력 상승/하강 스프라이트 VFX (개선 필요)
- 목표 동작
  - boost/unboost 메시지+SE 외에 sprite 상승/하강 시각 효과 추가.
  - 확인사항: `battle_stats` 에셋은 `assets/pokerogue/ui/effects`가 아니라 `assets/pokerogue/effects/battle_stats.(json|png)`에 존재함.
- 수정 예정
  - `src/pokerogue-transplant-runtime/scene/battle-shell-scene.js`, `src/battle-presentation/timeline.js`
- 구현 포인트
  - scene에 stat-change 전용 effect 메서드 추가.
  - `battle_stats` atlas를 우선 사용해 원본 스타일에 가까운 상승/하강 연출 적용.
  - timeline `boost/unboost`에서 해당 effect 호출.

---

## 4) 구현 순서 (권장)

1. 온라인 상태머신 정리
- O-1, O-2, O-3 먼저 처리 (빌더 노출/종료 복귀/항복 즉시 반영)

2. 온라인 팀수 설정 및 BGM
- O-4, O-5 처리 (API 모델 + UI + 재생 경로)

3. 모바일 조작키
- O-6 처리 (atlas 파서 + UI + 입력 연결)

4. 배틀 메시지/연출 파이프라인
- B-1, B-2, B-3, B-5 처리 (parser/timeline/message window)

5. 스프라이트 특수 상태/스탯 VFX
- B-6, B-7 처리

---

## 5) 검증 계획 (수동 시나리오)

### 온라인 검증
- 룸 미참가: 빌더 숨김 유지
- 룸 생성 직후: 빌더 노출 규칙 확인
- 배틀 시작 중: 빌더 숨김
- 항복 클릭 1회: 즉시 종료 전환
- 종료 메시지 후 자동 복귀: 타이머/중복 실행 없음
- teamSize 1/3/6 각각:
  - 슬롯 수 반영
  - 준비/시작 가능
  - 실제 전투 파티 수 반영
- 온라인 시작 시 BGM 재생, 종료 복귀 시 정지
- 모바일 뷰포트에서 하단 조작키 입력 동작

### 배틀 검증
- Protect로 막힘: 막힘 메시지 출력
- miss/immune/fail: 기술 애니메이션 스킵 + 결과 메시지 출력
- miss 문구: 피격 대상 기준 표기
- 강제교체 시 상단 정보바 영어 토큰 제거
- 종료 시 불필요 로그줄 미노출
- Dig/Fly/Free Fall/Substitute 상태 sprite 반영
- boost/unboost 시 sprite VFX 표시

---

## 6) 리스크 및 대응

- 리스크: 온라인 상태 플래그(`battle.started`)와 스냅샷 winner 동기 불일치
- 대응: 서버 serialize 시 종료 상태를 winner와 함께 일관되게 계산, 클라이언트는 winner 우선 판정

- 리스크: 타임라인 lookahead가 이벤트 순서 예외 케이스 누락
- 대응: 기본 규칙은 보수적으로(확실한 fail/miss/immune 케이스만 animation skip), 로그 기반 회귀 확인

- 리스크: 모바일 버튼이 기존 터치 UI와 충돌
- 대응: 모바일 전용 영역 격리 + pointer capture + 데스크톱 비활성

---

## 7) 구현 전 확정 가정

- 빌더 노출 기준은 "온라인 룸 참가됨 + 배틀 진행 중 아님"으로 진행.
- 종료 후 자동 복귀는 온라인 모드 기준으로 우선 적용.
- 팀수 설정(1~6)은 온라인 싱글 룸 범위에서 적용.

(위 가정으로 구현 진행 가능. 구현 단계에서 충돌되는 요구가 발견되면 즉시 계획에 반영한다.)
