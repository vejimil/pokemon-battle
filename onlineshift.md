# Online Shift 계획서

Last updated: 2026-04-21
Target: `/workspaces/pokemon-battle`

목표는 **현재 디버그/개발용 페이지(`index.html`)를 그대로 살리고**, 별도 `online.html`에서 친구와 2인 통신 배틀을 안정적으로 운영하는 것이다.

---

## 1) 현재 코드 동작 분석 (현 상태)

### 1-1. 엔트리/부트스트랩

- 앱 엔트리는 `index.html` 하나다.
- `index.html` 하단에서 `window.__PKB_SERVER_CONTEXT__`를 기본값(`bundledNodeServer:false`)으로 주입하고 `src/app.js`를 로드한다.
- 서버(`server/server.cjs`)는 **`index.html` 요청일 때만** 해당 컨텍스트를 `bundledNodeServer:true`로 치환한다.
- `src/app.js` 부트스트랩은 다음 순서로 동작한다.
  1. 저장 상태 로드 (`localStorage` key: `pkb-static-state-v3`)
  2. dex/manifest 로드
  3. `/api/engine/status` probe (단, `bundledNodeServer`가 true일 때)
  4. 빌더/배틀 UI wire + 렌더

핵심 의미:
- 현재 런타임 가용성 판정은 "로컬 Node 엔진 API 접속 가능 여부"에 묶여 있다.
- `index.html` 이외 페이지는 서버 컨텍스트 치환을 못 받아 probe 흐름이 틀어질 가능성이 있다.

### 1-2. 배틀 시작/모드 게이팅

- 런타임 descriptor 선택 로직은 사실상 다음만 허용한다.
  - `singles + showdownLocal.available=true` -> 시작 가능
  - 그 외 -> 시작 차단
- 더블은 아직 강제 차단 상태다.
- 팀 수는 현재 모드 기반 고정값이다.
  - 싱글: 3
  - 더블: 4

핵심 의미:
- "2명이 각자 접속"하는 온라인 모드는 아직 상태기계/descriptor에 존재하지 않는다.

### 1-3. 턴 처리 및 선택 제출

현재는 **한 브라우저가 양측 선택을 모두 모아서 제출**한다.

- `submitShowdownLocalSinglesChoices()`가 `battle.players[0]`, `battle.players[1]` 요청을 읽는다.
- 같은 클라이언트 상태에 있는 pending choices를 합쳐 `/api/battle/choice`로 한 번에 보낸다.
- 즉, 구조적으로 "한 기기 2인" 전제다.

핵심 의미:
- 온라인 2인 분산 입력으로 가려면, 서버가 플레이어별 선택을 받아 합치는 계층이 필요하다.

### 1-4. 서버/엔진 구조

- `server/server.cjs`는 정적 파일 + REST API 3개만 제공한다.
  - `GET /api/engine/status`
  - `POST /api/battle/start`
  - `POST /api/battle/choice`
- `ShowdownEngineService`는 메모리 `sessions Map`으로 배틀 세션을 관리한다.
- 룸/참가/소유권/동기화 개념이 없다.
- WebSocket/SSE/long-poll 전파 채널이 없다.

핵심 의미:
- 엔진 자체는 재사용 가능하지만, 온라인용 상위 오케스트레이터(Room Service)가 필요하다.

### 1-5. 저장/상태 충돌 포인트

- 저장 키가 단일(`pkb-static-state-v3`)이라 local/online을 섞으면 데이터 충돌 가능성이 높다.
- 현재 UI는 Player1/Player2를 한 화면에서 동시에 편집하도록 설계되어 있다.

핵심 의미:
- online 모드는 최소한 **스토리지 네임스페이스 분리 + 편집 소유권 분리**가 필요하다.

### 1-6. 분석 근거 코드 위치

- `index.html:354-355`  
  `window.__PKB_SERVER_CONTEXT__` 기본 주입 + `src/app.js` 로드
- `server/server.cjs:91-101`  
  서버 컨텍스트 치환이 `index.html`에만 적용됨
- `src/app.js:1605-1628`  
  bundled node 여부에 따라 엔진 probe 실행/스킵
- `src/app.js:1680-1686`  
  runtime descriptor 선택(실질적으로 singles만 활성)
- `src/app.js:4711-4732`  
  배틀 시작 전 runtime gate(비허용 모드 차단)
- `src/app.js:17`, `src/app.js:3043-3070`  
  단일 storage key 저장/복원
- `src/app.js:2958-2964`  
  teamSize가 singles=3, doubles=4로 고정
- `src/engine/showdown-local-bridge.js:80-106`  
  클라이언트가 양측 choice를 모아 한 번에 제출
- `server/server.cjs:124-141`  
  엔진 API가 status/start/choice 3개만 존재
- `server/showdown-engine.cjs:1361-1386`  
  `ShowdownEngineService` 세션 관리(startSingles/chooseSingles)

---

## 2) 왜 `online.html` 분리가 정답인가

요구사항:
- 디버깅은 계속 현재 페이지에서 빠르게 해야 함
- 친구와 통신 배틀은 별도 흐름으로 안정화해야 함
- 비용 없는 방식 + 모바일 접근 쉬워야 함

`index.html`과 `online.html` 분리 시 장점:

- 디버그 경로 보호:
  - 기존 로컬 단독 검증 루틴을 건드리지 않고 유지 가능
- 릴리즈 리스크 감소:
  - 통신 실험 중 오류가 디버그 페이지에 전이되지 않음
- 운영 단순화:
  - URL 자체가 목적을 분리 (`/index.html` vs `/online.html`)
- 저장 충돌 회피:
  - profile별 localStorage key 분리 용이

---

## 3) `online.html` 목표 동작 (완성 상태 정의)

### 3-1. 사용자 플로우

1. 호스트가 `online.html` 접속 후 방 생성
2. 방 코드/링크를 친구에게 전달
3. 친구가 같은 `online.html`로 방 참가
4. 각자 **자기 사이드 팀만** 편집
5. 양측 Ready
6. 서버가 엔진 배틀 세션 시작
7. 각자 본인 턴에만 선택 가능, 서버가 턴 합산/해석
8. 배틀 종료, 리매치/방 나가기

### 3-2. UX 원칙

- online 페이지는 "한 사람 = 한 사이드" 모델
- pass-device 프롬프트는 제거
- debug 패널은 기본 접힘 또는 축소
- 모바일 우선 버튼 크기/레이아웃(터치 44px+)

### 3-3. 성능/실시간

- 2인 전용이므로 비용을 늘리는 실시간 인프라 없이도 가능
- 1차는 **long-poll 기반 동기화** 권장
  - 구현 단순
  - 무료 환경/모바일 네트워크에서 안정적

---

## 4) 무료 + 폰 접속 운영 전략 (권장 순서)

### 권장 A: Codespaces 포트 Public 공유 (0원)

- 서버 실행: `npm start` (4173)
- Codespaces 포트 4173을 Public으로 오픈
- 생성된 HTTPS URL + `/online.html`을 친구에게 공유
- 장점:
  - 설치 없이 바로 공유 가능
  - 모바일 브라우저에서 바로 접속 가능
  - HTTPS 기본 제공
- 주의:
  - Codespace sleep 시 방/세션(메모리) 사라짐
  - 장기 상시 서비스에는 부적합

### 권장 B: 같은 Wi-Fi/LAN 직결 (0원)

- PC에서 서버 실행 후 `http://<PC-IP>:4173/online.html` 공유
- 장점: 가장 단순
- 제한: 같은 네트워크에서만 가능

### 권장 C: 무료 터널 (필요 시)

- 예: Cloudflare Quick Tunnel
- 장점: 어디서나 접속 가능
- 주의: 임시 URL/세션 성격, 장기 안정성은 A보다 낮을 수 있음

결론:
- 현재 요구(친구 1명, 테스트/디버그 중심)는 **A**가 가장 현실적이다.

---

## 5) 설계안 (코드 구조)

### 5-1. 프로필 분리

- 프로필 값: `local` / `online`
- 주입 방식:
  - `index.html`: `window.__PKB_APP_PROFILE__ = 'local'`
  - `online.html`: `window.__PKB_APP_PROFILE__ = 'online'`
- 앱 초기화에서 프로필별 분기
  - local: 기존 동작 유지
  - online: 룸/동기화 플로우 사용

### 5-2. 스토리지 분리

- local: `pkb-static-state-v3-local`
- online: `pkb-static-state-v3-online`
- room 별 임시키(선택): `pkb-online-room-<roomId>`

### 5-3. 서버 계층 분리

기존 엔진 API는 유지하고, 온라인용 룸 API를 추가한다.

### Online API (초안)

- `GET /api/online/status`
- `POST /api/rooms/create`
- `POST /api/rooms/join`
- `GET /api/rooms/:roomId/state?since=<rev>&waitMs=<ms>` (long-poll)
- `POST /api/rooms/:roomId/sync-builder`
- `POST /api/rooms/:roomId/set-ready`
- `POST /api/rooms/:roomId/start-battle`
- `POST /api/rooms/:roomId/submit-choice`
- `POST /api/rooms/:roomId/leave` (선택)

인증/권한 최소안:
- 방 생성/참가 시 `playerToken` 발급
- 이후 변경 API는 token 필수
- token은 side(p1/p2)와 바인딩

### Room 상태 모델 (메모리)

- `roomId`, `createdAt`, `expiresAt`
- `players.p1`, `players.p2` (name, token, connectedAt)
- `builder.p1`, `builder.p2`
- `ready.p1`, `ready.p2`
- `battle.sessionId` (ShowdownEngineService 세션 id)
- `battle.snapshot`
- `battle.pendingChoices` (side별)
- `revision` (변경 버전)

### 5-4. 선택 제출 로직 변경

현재는 클라이언트가 양측 선택을 합쳐 제출한다.
온라인에서는 서버가 합친다.

- 클라이언트는 자기 choice만 `submit-choice`
- 서버는 현재 snapshot의 요청 상태를 보고:
  - 상대 입력이 필요하면 pending 보관
  - 둘 다 충족되면 `chooseSingles({p1, p2})` 호출
  - 새 snapshot/revision broadcast

### 5-5. `online.html` UI 최소 구성

- 상단: 방 생성/참가 카드
- 중단: 방 상태(상대 접속, ready, 연결 상태)
- 빌더: 내 사이드만 편집
- 하단: 배틀 UI(현재 컴포넌트 재사용)
- 옵션:
  - 디버그 섹션 접기
  - 모바일에서 side panel 기본 숨김

---

## 6) 구현 단계 계획 (실행 순서)

### Phase 0: 준비/가드

- `online.html` 추가 (UI shell + profile 주입)
- `index.html`은 그대로 유지
- 서버의 HTML context 주입 로직을 `online.html`에도 적용 가능하게 일반화

완료 기준:
- `/index.html` 기존 동작 100% 유지
- `/online.html` 접속 시 앱이 profile=online으로 시작

### Phase 1: 프로필 기반 앱 분기

- `app.js`에 profile 판별/공통 상태 분리
- storage key 분리
- runtime descriptor에 `online` placeholder 추가

완료 기준:
- local profile 회귀 없음
- online profile에서도 빌더 렌더/저장 정상

### Phase 2: 룸 API + 연결

- 서버에 room create/join/state(long-poll) 도입
- 클라이언트 online bridge 신설

완료 기준:
- 브라우저 2개에서 같은 room 상태 동기화 확인

### Phase 3: 빌더 동기화 + Ready + 시작

- side ownership 강제
- ready 동기화
- start-battle에서 엔진 세션 시작

완료 기준:
- 양측 Ready 후 동일 snapshot 수신

### Phase 4: 턴 입력 온라인화

- `submit-choice` 서버 집계
- 조건 충족 시 엔진 choose 실행
- snapshot 이벤트 동기화

완료 기준:
- 2기기에서 턴 진행/스위치/기절 흐름 정상

### Phase 5: 모바일 최소 최적화

- online 전용 responsive CSS
- 버튼/입력 터치 영역 확대
- 불필요 디버그/보조 정보 기본 숨김

완료 기준:
- 모바일 브라우저(세로/가로)에서 조작 가능

---

## 7) 리스크와 대응

- 메모리 기반 룸 유실 (서버 재시작 시)
  - 대응: "임시 방" 명시 + UI 안내 + TTL 표시
- 동시성 충돌(중복 submit)
  - 대응: revision/turn 기반 idempotency key
- 네트워크 단절/재접속
  - 대응: state API 재조회로 복구, token 유지
- 장기 무료 운영 한계
  - 대응: 현재 요구(친구 1명 테스트) 범위 내에서는 허용

---

## 8) 테스트 체크리스트 (실행용)

- 같은 PC 브라우저 2탭: create/join/builder sync
- PC + 폰: same room 접속/ready/start
- 턴별 선택: move/switch/forced switch
- 끊김 복구: 한쪽 새로고침 후 상태 재동기화
- 방 만료: TTL 초과 후 재참가 메시지
- local 회귀:
  - `index.html`에서 기존 start/turn/debug 모두 동일
  - 기존 검증 스크립트 영향 없음

---

## 9) 이번 작업 결론

- 현재 코드는 구조적으로 "한 기기 2인" 로컬 엔진 흐름에 최적화되어 있음
- 온라인 2인을 위해선 엔진 교체가 아니라 **룸 오케스트레이션 계층**을 추가하면 됨
- 비용 없는 실사용 경로는 Codespaces Public URL + `online.html`이 가장 현실적
- 다음 구현은 Phase 0 -> 1 순서로 시작하는 것이 안전함

---

## 10) 폰-폰 플레이 조사 (2026-04-21 기준)

요구사항:
- 친구 1명과 장기적으로만 사용
- 폰으로 URL 열어서 바로 대전
- 유료 결제 없이 운영

핵심 전제:
- 폰 2대가 "서로 접속"만 하는 구조라면, **중앙에서 항상 켜져 있는 서버 1개**가 필요하다.
- 한쪽 폰을 서버로 쓰는 방식은 백그라운드/절전/네트워크 제약 때문에 실사용 안정성이 낮다.  
  (이 판단은 운영 경험 기반 추론)

### 10-1. 무료 경로 비교

1. GitHub Codespaces + Public port (권장)
- 가능 여부: 높음
- 비용: 무료 한도 내 사용 가능
- 확인된 한도 (개인 계정): 월 120 core-hours, 15 GB storage
- 장점:
  - HTTPS URL 즉시 발급
  - 친구 폰에서 바로 접속 가능
  - 설치 부담 거의 없음
- 주의:
  - Codespace sleep/중지 시 방 상태(메모리) 유실
  - 무료 한도 초과 시 차단될 수 있음

2. Cloudflare Quick Tunnel (`trycloudflare.com`)
- 가능 여부: 높음 (개발/테스트)
- 비용: 무료
- 장점:
  - 계정 없이 즉시 공개 URL 생성 가능
  - NAT/포트포워딩 없이 외부 접속 가능
- 주의:
  - 개발용 한정(문서상 production 권장 아님)
  - 동시 요청 200 제한
  - SSE 미지원 (향후 SSE 채택 시 부적합)

3. ngrok Free
- 가능 여부: 중간
- 비용: 무료
- 장점:
  - 설정이 비교적 단순
- 주의:
  - 월 전송량/요청량 제한(예: 1 GB, 20,000 req)
  - 브라우저 HTML 트래픽 인터스티셜 경고 페이지 존재

### 10-2. 폰-폰 실사용 권장안

권장안은 유지:
- **A안: Codespaces 호스팅 + 두 폰은 브라우저 클라이언트**

이유:
- 무료 한도와 운영 안정성의 균형이 가장 좋음
- 친구 1명 소규모 사용에서 구현/운영 비용 최소
- `online.html` + long-poll 설계와 잘 맞음

### 10-3. 비용 0원 가드레일

1. GitHub 개인 계정 무료 한도 내 사용
2. Codespaces 결제수단 미등록 상태 유지 또는
3. Budgets에서 `Stop usage when budget limit is reached` 활성화

### 10-4. 실행 런북 (폰 2대 기준)

1. Codespace에서 `npm start` 실행
2. 포트 `4173`을 `Public`으로 전환
3. 생성 URL + `/online.html`을 친구에게 전달
4. 양쪽 폰에서 접속 후 홈화면 바로가기 추가
5. 대전 중에는 Codespace를 sleep시키지 않도록 유지

### 10-5. 참고 소스

- GitHub Codespaces 포트 공유/공개:
  - https://docs.github.com/en/codespaces/developing-in-a-codespace/forwarding-ports-in-your-codespace
- GitHub Codespaces 무료 한도/과금:
  - https://docs.github.com/en/billing/reference/product-usage-included
  - https://docs.github.com/en/codespaces/codespaces-reference/about-billing-for-codespaces
- GitHub 예산 차단 옵션:
  - https://docs.github.com/en/billing/managing-billing-for-github-codespaces/managing-spending-limits-for-codespaces
- Cloudflare Quick Tunnel 제한:
  - https://developers.cloudflare.com/tunnel/setup/
- ngrok free 제한:
  - https://ngrok.com/docs/pricing-limits/free-plan-limits

---

## 11) 1번 구현 반영 현황 (2026-04-21)

아래 항목은 옵션 1(Codespaces Public URL + `online.html`) 기준으로 코드에 반영됨.

- `online.html` 추가 (온라인 프로필 진입점)
- `index.html`/`online.html` 프로필 분리
  - `local` / `online` 저장 키 분리
- 서버 `online room` API 추가
  - create / join / state(long-poll) / sync-builder / set-ready / start-battle / submit-choice
- 서버 메모리 Room Service 추가
  - 방 상태, ready, 배틀 snapshot, side별 pending choice 관리
- 클라이언트 온라인 브리지 추가
  - `src/engine/showdown-online-room-bridge.js`
- `app.js` 온라인 룸 플로우 연결
  - 방 생성/참가
  - 팀 동기화
  - ready 토글
  - 온라인 배틀 시작
  - side별 선택 제출
- 온라인 실사용 보강
  - 룸 참가 후 자기 사이드만 편집 가능(상대 로스터/이름 입력 잠금)
  - long-poll 수신 시 상대 팀/이름 동기화 반영(내 로컬 미동기 편집은 보존)

현재 한계(의도된 1차 범위):

- 룸/세션은 메모리 기반이라 서버 재시작 시 유실
- 모바일 HUD 전용 레이아웃(가로 터치 최적화)은 후속 단계
- 브라우저 E2E는 현재 작업 샌드박스 포트 제한으로 이 문서 작성 시점에 직접 확인 불가

즉시 실행 런북(폰 2대):

1. Codespaces에서 `npm start`
2. 포트 `4173`을 Public
3. `https://<public-url>/online.html` 공유
4. 한쪽은 방 생성, 다른 쪽은 방 코드로 참가
5. 각자 팀 동기화 -> Ready -> 온라인 배틀 시작
