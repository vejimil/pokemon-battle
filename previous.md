# 온라인/배틀 수정사항 분석 및 구현 계획

Last updated: 2026-04-23  
Target: `/workspaces/pokemon-battle`  
Status: **개선 필요 항목 코드 반영 완료, 수동 검증 진행 필요**

이 문서는 사용자 요청 13개 항목(온라인 6 + 배틀 7)에 대한 분석/계획과,  
2026-04-22 기준 개선 필요 항목 반영 결과를 함께 기록한다.

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

### O-2) 항복 즉시 종료 (완료) //항복시 항복한 쪽 화면에서는 즉시 종료되나, 상대쪽에서는 이전 턴 연출이 나왔다가 종료된다. 0-3에 의해 빌더로 돌아가도 간헐적, 반복적으로 해당 연출이 양쪽 화면에서 계속 나온다. 빌더에서 수정하다가도 갑자기 해당 연출이 나온다.
- 목표 동작
  - 항복 버튼 1회 입력 즉시 종료 플로우 진입.
  - 해석 확정: `도망친다(Run)` 선택 후 `항복`을 누르면 즉시 종료 전환으로 처리.
- 수정 예정
  - `src/app.js`, `server/online-room-service.cjs`
- 구현 포인트
  - 클라이언트 항복 확인창 제거(원클릭 항복).
  - 온라인은 API 응답 즉시 종료 UI 반영(폴링 대기 제거).
  - 서버는 forfeit 시점에 종료 상태 플래그를 명확히 반영(아래 O-3과 연동).

### O-3) 종료 메시지 후 자동 빌더 복귀 (완료) // 위에서 설명
- 목표 동작
  - 종료 메시지 표시 -> `3초` 지연 -> 빌더 복귀.
- 수정 예정
  - `src/app.js`, `server/online-room-service.cjs`, `online.html`(필요시 최소 요소 추가)
- 구현 포인트
  - 온라인 배틀 종료 감지 훅(승자 확정/항복 포함) 추가.
  - 종료 플로우 중 입력 잠금 및 타이머 중복 방지 (`RETURN_TO_BUILDER_DELAY_MS = 3000` 상수화).
  - 복귀 시 battle panel 비표시, setup panel 재표시, 온라인 룸 상태 유지.
  - BGM 정리(stop) 포함.

### O-4) 방 생성 시 1~6 팀수 설정 (완료) // 잘 됐는데, 지금처럼 방 만들기 누르기 전에 하지 말고, 방 만들기를 누르면 설정가능하고, 설정하면 방코드랑 방 생성되도록. 그렇게 나오게 해줘. 
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

### O-6) 모바일 하단 조작키 추가 (xbox atlas 사용) (완료) // 배틀화면 로딩 중에는 나오나, 정작 로딩 이후에는 나오지 않는다. 그리고 십자 키가 키보드처럼 배치되어 있는데, 게임기처럼 사방면 상하좌우 대칭으로 배치되면 좋겠다.
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

### B-1) 방어/막힘 메시지 출력 (완료) //목표 동작은 달성했으나, 방어류 기술의 연출 자체가 생략되어 버렸다. 방어 기술의 연출은 남겨놓아야 한다.
- 목표 동작
  - Protect 등으로 막힌 경우 명확한 메시지 출력.
- 수정 예정
  - `src/battle-presentation/timeline.js`, `server/showdown-engine.cjs`, `src/app.js`
- 구현 포인트
  - `effect_activate`/`single_turn_effect` no-op 해제.
  - effect id(`move: Protect` 등) 정규화 후 메시지 매핑.
  - 필요 시 locale namespace에 `battler-tags` 로드 추가.

### B-2) miss/immune/fail 시 기술 연출 제거 (완료) // 실패시에는 아직 연출이 나오는 듯 하다. 예컨대, 독 상태의 적에게 맹독을 사용하면 실패하는데, 모션이 나온다.
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

### B-6) 반잠수/대타 등 스프라이트 상태 반영 (완료) // 기술을 사용한 이후 즉시 스프라이트가 변경돼야한다. 지금은 연출 턴이 끝난 후에 바뀐다. 그리고 대타출동 같은 경우 1) 스프라이트가 아군/적군 모두 30정도 내려가야 할 것 같고, 2) 깨질 때 대타는 사라져버렸다 같은 문구가 나와야 한다.
- 목표 동작
  - Dig/Fly/Free Fall 등은 비가시 처리, Substitute는 대체 sprite 처리.
- 수정 예정
  - `src/app.js`, `src/battle-presentation/timeline.js`, `src/pokerogue-transplant-runtime/scene/battle-shell-scene.js`
- 구현 포인트
  - `mon.volatile` 기반 sprite presentation helper 추가.
  - `resolveSpriteUrlForBattleSide` 및 timeline visual resolver에 동일 규칙 적용.
  - Substitute는 `assets/system/pokemon/substitute(_back).png` 우선 적용.

### B-7) 능력 상승/하강 스프라이트 VFX (완료) // 지금은 능력치별로 다르지만, 상승시 atk(빨간색), 하강시 spd(파란색) 에셋을 사용하는 걸로 통일하자. 즉 상승은 능력치 불문 빨간색이 올라가고, 하강은 능력치 불문 파란색이 내려간다. 추가로, 회피율 등은 지금 evasion이렇게 한글 판에서도 영어로 메시지가 나오는데 이를 수정 바람.
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

---

## 8) 구현 결과 (2026-04-22)

### 온라인
- 세션 자동복원(디버깅 방해) 차단
- `src/app.js`의 저장/복원 정책을 변경:
  - 온라인에서 `roomId/token/side/revision`은 더 이상 localStorage에 저장하지 않음.
  - `online.html` 재접속 시 온라인 세션은 항상 빈 상태로 시작(자동 재참가/자동 배틀 복원 방지).
  - 저장 대상은 온라인 비세션 설정값(teamSize) 중심으로 제한.

- O-2/O-3: 항복 후 과거 턴 연출 재재생 문제 수정
- `server/online-room-service.cjs`의 `forfeitBattle()`에서 종료 시 스냅샷 `events`를 기존 턴 이벤트 재사용 대신 `battle_end` 단일 종료 이벤트로 치환.
- `src/app.js`의 `applyOnlineRoomState()`에서 스냅샷 채택 조건을 보강:
  - `state.battle === null`이라는 이유만으로 종료 스냅샷을 매 poll마다 재채택하지 않도록 수정.
  - 동일 종료 스냅샷 반복 수신 시 타임라인 재생/화면 재점프가 발생하지 않게 처리.
- 종료 복귀 타이머는 `snapshot.winner`이 있어도 실제 전투 객체(`state.battle`)가 있을 때만 스케줄되도록 제한하여 빌더 복귀 후 반복 타이머 방지.

- O-4: 방 생성 UX를 2단계로 변경
- `online.html`에 `online-create-config` 블록 추가:
  - 1단계: `방 만들기` 클릭 시 설정 패널 열기
  - 2단계: 팀수(1~6) 선택 후 `설정 후 방 만들기`로 실제 방 생성
- `src/app.js`에 `state.online.createConfigOpen` 상태 추가, Join 입력 UI와 상호 배타 처리.
- `bindElements()/wireOnlineRoomEvents()/renderOnlineRoomPanel()`을 수정해 버튼 활성 조건, 텍스트, 상태 문구 동기화.

- O-6: 모바일 하단 조작키 표시/배치 수정
- `styles.css`에서 Phaser 활성 시 `.pkbattle-shell` 전체를 숨기던 규칙을 변경해 `#mobile-controls`는 유지되게 수정.
- D-pad를 3x3 대칭(상/하/좌/우) 배치로 재구성.
- `src/app.js`에서 fullscreen 진입/해제 시 `renderMobileControls()`를 즉시 재평가하도록 보강하고, 표시 조건을 fullscreen 상태까지 고려하도록 보강.

### 배틀
- 스프라이트 복제/잘못된 방향(뒷모습) 노출 추가 안정화
- 원인:
  - `timeline move_use`에서 매 기술마다 actor 스프라이트 URL을 강제 재설정하던 경로가
    교체 기술/스냅샷 시점과 충돌하여 잘못된 몬 또는 방향(front/back)이 조기 반영됨.
- 조치:
  - `move_use`에서 일반 스프라이트 URL 강제 교체를 제거.
  - `move_use`는 가시성(반잠수 on/off)과 대타출동 전용 치환만 처리하도록 축소.
  - `effect_end(substitute)`에서 visual 해석 실패 시에도 숨김 처리하지 않고 기본 가시화로 안전 처리.

- B-1: Protect 계열 기술의 "사용 연출" 유지
- `src/battle-presentation/timeline.js`의 move outcome scan에서, 현재 사용 중인 기술 자체가 Protect 계열이면 보호막 블록 이벤트(`effect_activate/single_turn_effect`)를 애니메이션 스킵 근거로 사용하지 않도록 수정.

- B-2: fail 케이스 연출 스킵 보강
- `move_fail` 판정에서 실패 주체가 공격자가 아닌 대상 슬롯으로 들어오는 프로토콜 케이스(예: 독 상태 대상에게 맹독)도 실패로 인식하도록 스캔 조건 확장.
- 애니메이션 스킵 시 move 문구 이후 최소 리듬 지연을 320ms로 유지.

- B-6: 반잠수/대타 상태 즉시 반영 + 대타 파괴 문구
- `server/showdown-engine.cjs`에서 `-start/-end Substitute`를 `effect_start/effect_end` 구조 이벤트로 파싱.
- `timeline.js`에서:
  - `effect_start(substitute)` 시 즉시 대타 스프라이트 적용.
  - `effect_end(substitute)` 시 `"대타는 사라져버렸다"` 메시지 출력 후 원래 스프라이트로 즉시 복귀.
  - `move_use` 직후 시각 패치 적용(반잠수 상태는 즉시 비가시 처리).
- `app.js` + `battle-shell-scene.js`에서 대타 스프라이트 y-offset(`+30`) 모델/렌더 파이프라인을 추가 적용.

- B-7: 능력 변화 VFX/메시지 정규화
- `battle-shell-scene.js`의 `playStatStageEffect()`를 변경:
  - 상승: `atk` 프레임 고정(빨강)
  - 하강: `spd` 프레임 고정(파랑)
- `timeline.js`에서 stat id alias 정규화(`accuracy/evasion/special attack` 등) 추가로 한글 UI에서 영문 stat 노출을 방지.

- B-8: 대타출동 위치 간섭 + 미파괴(체감) 이슈 추가 보정
- 원인 분석:
  - `resolveTimelineEventSideSlot()`이 `move_use`를 기본 `target` 기준으로 해석하면서,
    대타 상태(`spriteYOffset`)가 공격자 쪽 가시성 갱신에 잘못 전이될 수 있었음.
  - 대타 판정이 `volatile.substitute` 존재 여부까지 포함해 평가되어,
    `substituteHp`가 0이거나 종료 직전 상태에서도 시각적으로 대타가 유지될 여지가 있었음.
- 조치:
  - `src/app.js`:
    - `resolveTimelineEventSideSlot()`를 이벤트 타입별로 분기하여 `move_use/miss/move_fail`은 `actor` 우선 해석.
    - 대타 판정을 `Number(volatile.substituteHp) > 0` 기준으로 정규화.
    - 대타 스프라이트는 수동 yOffset 전달 대신 씬 metrics 경로를 사용하도록 정리.
  - `src/pokerogue-transplant-runtime/scene/battle-shell-scene.js`:
    - `substitute/substitute_back` 전용 metrics(`frontY/backY`, shadow off, anim off) 추가.
    - 대타 스프라이트도 일반 포켓몬과 동일한 metrics 적용 루트에서 위치 계산.
  - `src/battle-presentation/timeline.js`:
    - 대타 스프라이트 교체 시 수동 yOffset 강제 적용 제거(씬 metrics에 위임).
  - `server/showdown-engine.cjs`:
    - `mapVolatiles()`에서 `substitute`는 일반 volatile object 복사에서 제외.
    - `substituteHp`는 `> 0`일 때만 스냅샷에 반영하도록 정규화(`|| 1` 제거).

- B-9: 추가 이슈 대응 (대타출동 잔존 체감 + 모바일 D-pad 미동작)
- 조치:
  - `src/pokerogue-transplant-runtime/adapter/pkb-battle-ui-adapter.js`:
    - 커맨드 창 커서 로직에서 `active` 플래그를 "초기 시드"로만 사용하도록 수정.
    - 방향키 입력 시 명시 커서를 보존해 `싸운다/포켓몬/도망친다` D-pad 이동이 실제로 반영되게 수정.
  - `src/app.js`:
    - 이전/현재 스냅샷의 `substituteHp` 전이를 비교해 `effect_start/effect_end(substitute)`를 파생 주입하는 보정 로직 추가.
    - 프로토콜 누락/변형 케이스에서도 대타출동 시작/해제 연출이 스냅샷 상태와 일치하도록 보강.
  - `server/showdown-engine.cjs`:
    - `-start/-end` 효과 id 파싱을 `normalizeProtocolEffectId()` 기준으로 통일해 `move: Substitute` 변형 태그도 인식 가능하게 보강.

### 검증
- 정적 문법 검사:
  - `node --check src/app.js`
  - `node --check src/battle-presentation/timeline.js`
  - `node --check src/pokerogue-transplant-runtime/scene/battle-shell-scene.js`
  - `node --check server/online-room-service.cjs`
  - `node --check server/showdown-engine.cjs`
- 회귀 스크립트:
  - `npm run verify:stage22` 통과 (Overall: PASS)
  - 대타출동 재현 스크립트(로컬 실행):
    - 대타 생성 후 강공격 턴에서 `effect_end: substitute` 이벤트 확인
    - 파괴 후 `volatile.substituteHp` 미존재 확인
  - 온라인 룸 서비스 재현:
    - 대타 생성 후 반복 타격에서 `substituteHp` 감소 확인
    - 파괴 턴에서 `effect_end: substitute` + `substituteHp` 제거 확인

---

## 9) 오늘 추가 정리 (2026-04-22)

- 사용자 피드백 기준으로 B-9까지 반영 완료 상태를 문서화.
- 모바일 커맨드 창 D-pad 이동 불가 이슈와 대타출동 잔존 체감 이슈의 원인/조치/검증 결과를 최신화.

## 10) 다음 작업 (구현 보류) 

- 대타출동 해제 타이밍 연출 정밀화:
  - **대타출동이 사라지는 순간, 원래 포켓몬 스프라이트로 즉시 교대되도록** 타임라인/씬 교체 타이밍을 동일 tick(프레임) 기준으로 재정렬.
  - 현재 동작 대비 체감 지연(메시지 표시 후 복귀처럼 보이는 구간) 여부를 수동 테스트 케이스로 분리해 검증 항목에 추가.
- 게임 흐름 상세화:
  - 배틀 시작 시, 000(상대 플레이어 이름)이 승부를 걸어왔다 => 가랏 ㅁㅁㅁ! 이렇게 나오게. // 잘나옴
- 온라인 빌더에서, 빨간 경고 안 보이게. // 잘 됨
- 렉 걸림 해결: //잘 되는데, 문제가 좀 있음, 메시지 등도 너무 빨리 지나감. 내가 원한건, 기술이나 필드, 날씨 연출 등에서 멈칫하는게 짧기를 바랬던 거지, 승부를 걸어왔다! ~~의 00! 같은 메시지들이 순식간에 바뀌는 걸 원핸했던 건 아니야.
  - 기술 맞거나, 필드가 깔리는 등의 상황에서 전체적으로 렉이 많이 걸리는데, 이유 철저히 분석하고 해결 바람.
- 빌더에서 각 슬롯마다 포켓몬 스프라이트 박스랑 이름, 특성, 지닌도구 써있는 부분 간격이 좀 있으면 좋겠어서 조정하고 싶음. // 내가 세부조정함.
- 런타임 버블에서도, 각 버블마다 위아래로 패딩이 좀 있었으면함. 너무 다닥다닥 붙어있음
- 적 이름 옆에 +표시 보이는데 이것도 확인하고 제거바람. 그리고 정보창에 성별 안보이는데 추가 바람. 
- 빌더 포켓몬 타입 표시에서, 지금 둥근 네모 버블 안에 타입 마크랑 타입 이름 병기 돼있는데, 그냥 타입 마크만 보이게 해줘.
- 대타출동에서 스프라이트 바뀔때, 기존 포켓몬이 사라진 다음에 대타출동 나오게. 그리고 교체할 때도 '들어와 00!'하고 들여보낸 다음에 다음 내보낼 포켓몬 나오게.

---

## 11) 오늘 추가 정리 (2026-04-23)

- 사용자 요청 기준으로 `plan.md` 최신화(2026-04-23) 반영.
- 메가 아쿠스타(`Starmie-Mega`) 특성을 `천하장사(Huge Power)`로 변경:
  - `src/battle-constants.js`의 `OFFICIALLY_CONFIRMED_FUTURE_MEGA_ABILITIES`에 `'Starmie-Mega': 'Huge Power'` 추가.
  - `server/showdown-engine.cjs`의 동일 상수에도 동일 항목 추가(엔진 런타임 반영).
  - `src/data/pokedex.js`의 `starmiemega` 항목 능력값도 `{ 0: "Huge Power" }`로 동기화.

0. za 메가진화 포켓몬 특성 종족값 최신화. - 일부 포켓몬 특성이 공개됨. 이에따른 종족값 변경도 있음.
1. 온라인 대결 시 준비 취소 후 수정 시 반영 안됨.
2. 모바일에서 다이맥스 누르면 창 쪽에서 키가 안 먹음 - 다른 버그일 수도 있음
3, 게임 끝날때, 끝나는 턴 시작하기도 전에 승리 메시지가 나옴
4. 게임 끝날 때 필드 등도 초기화
5. 팀 순서 바꿀 수 있게. (슬롯 드래그?)
6. 포켓몬 검색 엔진 (타입 등)
7. 길동무 후 나온 마나피 발버둥만 나옴 
8. 먹밥, 생명의 구슬 등 메시지
9. 더블배틀 구현