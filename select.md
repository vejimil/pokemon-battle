# 온라인 멀티 — 팀 선택(Team Preview) 단계 도입 계획서

Last updated: 2026-05-05
Target: `/workspaces/pokemon-battle`
Scope: `online.html` (온라인 프로필) 흐름만. `index.html`(local) 흐름은 영향 없음.

---

## 1) 목표 (요청 요약)

현재 흐름:
1. 방 만들기 → 빌더 진입
2. 빌더에서 **배틀 마리수만큼만** 빌드
3. 양쪽 준비 완료
4. 즉시 상대 포켓몬 노출 + 배틀 시작

새 흐름:
1. 방 만들기/참가 → 빌더 진입 (그대로)
2. **마리수와 무관하게 6마리 전부** 빌드
3. 양쪽 준비 완료
4. 상대 포켓몬 노출 + **"배틀 시작" 버튼만 클릭 가능** (이때 상대 도구는 가림) //이때 물론 지금처럼 준비 취소도 가능하게 해줘.
5. 배틀 시작 클릭 → **6마리 중 배틀 마리수에 맞춰 선택(엔트리 순서대로)** //좀 더 정확히 말하자면, 빌더 엔트리 순서가 아니라, 이 선택단계에서 선택하는 순서가 실제 배틀 엔트리 순서가 되는 거야. 그리고 선택할 때, 화면 구성은 메인화면에 배틀 마리수 만큼 빈 칸이 있고, 그 위쪽에 상대 포켓몬 보이고. 아래쪽 내 포켓몬에서 클릭 후 선택하거나 끌어오기로 출전 엔트리 정하는 방식으로 하자. 내부에서도 끌기로 자유롭게 순서 바꿀 수 있게. 아 물론 상대 쪽은 전체 6마리만 보이고, 선출 과정 등은 절대 보이면 안돼. 엔트리 구성 다 하면 완료! 버튼 누를 수 있고, 양쪽 다 누르면 배틀시작으로.
6. 양쪽 모두 선택 완료 → 그제야 엔진 startBattle

핵심: 빌더 단계는 항상 6슬롯, 배틀 진입 직전에 "팀 프리뷰 + 출전 멤버 선택" 단계를 끼워 넣는다.

---

## 2) 현재 코드 동작 분석

### 2-1. 팀 슬롯 개수 결정 위치

- `src/app.js:4418-4423` `getConfiguredTeamSize()`
  - online: `state.online.teamSize` (1~6, 사용자 선택값)
  - local: singles=3 / doubles=4 고정
- `src/app.js:4425-4432` `rebuildTeamSize()`
  - `state.teamSize`를 `getConfiguredTeamSize()`로 갱신
  - `state.teams[player]` 길이를 그 값에 맞춰 채우거나 자른다
- 호출 경로:
  - `src/app.js:2390` (룸 동기화 시)
  - `src/app.js:2762, 2772` (방 만들기 전 select 변경 시)
  - `src/app.js:4426`, `5553` (저장 로드 후)

즉 현재는 "빌더 슬롯 개수 = 배틀 마리수"가 강하게 결합되어 있다.

### 2-2. 룸 상태 모델 (서버)

- `server/online-room-service.cjs`
  - `room.settings.teamSize` (1~6)
  - `room.settings.mode` (singles/doubles)
  - `room.builder.{p1,p2}` (`{name, team[]}`)
  - `room.ready.{p1,p2}`
  - `room.battle.{started, sessionId, snapshot, pendingChoices}`
- `serialize()` (line 388~)에서 그대로 클라이언트로 직렬화한다.
- `startBattle({roomId, token})` (line 174~)
  - 양쪽 ready 체크
  - `team: room.builder.p1.team.slice(0, teamSize)` 로 앞 N마리 잘라서 엔진에 넘긴다
  - 즉 **순서 변경 없이 단순 prefix slice**

### 2-3. 클라이언트 빌더/배틀 진입 흐름

- 빌더에서 자기 사이드만 편집: `src/app.js:5557-5560` (opponent roster hide), `5573-5574` (disabled), `2049-2053` (canEditPlayerInCurrentProfile)
- 상대 로스터 가림 조건: `shouldHideOnlineOpponentRoster()` → `!isOnlineLocalReady()` (자기쪽 ready 누르기 전까지 상대 로스터 숨김)
- 준비 완료: `toggleOnlineReadyFlow()` → `setOnlineRoomReady`
- 배틀 시작 가능 조건: `getOnlineRoomRuntimeDescriptor()` → `joined && bothPlayersJoined && bothReady && connected && !battleActive`
- 배틀 시작 버튼: `els.startBattleBtn` → `startBattle()` → `startOnlineBattleFlow()` → 서버 `start-battle` API
- 결과: 서버가 즉시 엔진 세션을 만들고 snapshot 푸시

### 2-4. 엔진 측 팀 처리

- `server/showdown-engine.cjs:1597` 의 `team` 배열을 그대로 player payload로 넘김
- `customgame` 포맷은 기본적으로 team preview 미사용. (line 1630의 분기는 안전망)
- 즉, **출전 순서 = 보낸 배열 순서**

### 2-5. 옵션 노출 위치 (도구 가리기 관련)

- 자기 빌더 화면: `online.html` 빌더 폼 (도구 입력은 자기 자신만 보이므로 그대로 유지 OK)
- 상대 표시 채널:
  - 빌더 페이지의 상대 로스터(`renderRoster` line 5640~5648)에서 `mon.item` 있으면 `item-mini-badge` 노출
  - 배틀 화면 진입 후엔 엔진 snapshot 기반이라 별도 처리

---

## 3) 새 흐름의 단계 정의 (Phase Machine)

기존 `room` 상태에 **phase** 개념을 명시적으로 도입한다.

| phase | 의미 | 빌더 편집 | 상대 6마리 표시 | 상대 도구 표시 | 가능한 액션 |
|---|---|---|---|---|---|
| `lobby` | 한쪽만 입장 | ✅ (자기) | ❌ | — | 상대 입장 대기 |
| `building` | 둘 다 입장, 6마리 빌드 중 | ✅ (자기) | ❌ (현재 정책 유지) | — | Ready 토글 |
| `preview` | 양쪽 Ready 완료, 출전 선택 직전 | ❌ | ✅ (전체 6마리) | ❌ (가림) | 양쪽 "배틀 시작" 클릭 토글 → 둘 다 누르면 selecting / **Ready 취소(=building 복귀) 가능** |
| `selecting` | 양쪽이 출전 N마리/순서 선택 중 | ❌ | ✅ (전체 6마리) | ❌ (가림) | 자기 선출 진행 (상대 picks 내용은 비공개), 완료 제출, 본인 한정 선택 취소 가능. **building 복귀 불가** |
| `battle` | 엔진 세션 진행 중 | ❌ | ✅ (엔진 노출 규칙) | (엔진 규칙) | 턴 입력 |

전이:
- `lobby` → `building`: 두 번째 플레이어 join
- `building` → `preview`: 양쪽 Ready=true (현재의 즉시 배틀 시작 대신 preview로 진입)
- `preview` → `building`: **어느 한쪽이라도 Ready 취소(setReady false)** → 즉시 building 복귀 (현재 빌더 화면에서 누르던 "준비 취소"와 동일한 UX 유지)
- `preview` → `selecting`: **양쪽 모두 "배틀 시작" 클릭** → 룸이 selecting로 잠금 (Ready와 동일한 양측 합의 토글)
- `selecting` → `(no exit)`: **selecting 진입 후엔 building 복귀 불가**. 본인 한정 picks 재편집(선출 다시)만 허용
- `selecting` → `battle`: 양쪽 선출 제출(완료!) → 서버가 엔진 startBattle 호출
- `battle` → `building`: 배틀 종료 후 기존 `scheduleOnlineBattleReturnToBuilder` 흐름 재사용 (Ready/선출 리셋)

설계 원칙:
- 가능한 한 **서버에 권위적인 phase 필드**를 두고 클라이언트는 그걸 따라 그린다
- 동시성/경합은 서버에서 idempotent하게 처리
- 선택 미제출 새로고침 복구를 위해 선택 페이로드도 룸 state에 보존

---

## 4) 데이터 모델 변경

### 4-1. 클라이언트 (`state.teams`)

- 현재: `teams[player].length === state.teamSize`
- 변경: 온라인 프로필에서는 `teams[player].length === 6`
  - `state.teamSize`는 "배틀 출전 인원수" 의미로 유지
  - 슬롯 개수는 별도 상수 6 사용 → 새 헬퍼 `getBuilderSlotCount()` 도입
  - `rebuildTeamSize()`를 두 가지 책임으로 분리:
    - `state.teamSize` 갱신 (배틀 인원수)
    - `state.teams[*].length` 갱신은 항상 6 (online) / 모드 기반(local)

### 4-2. 클라이언트 (`state.online`)

추가 필드(예시):
```
state.online.phase            // 'lobby' | 'building' | 'preview' | 'selecting' | 'battle'
state.online.selection = {
  p1: { picks: number[], submitted: boolean }, // 6마리 인덱스 중 teamSize개
  p2: { picks: number[], submitted: boolean },
}
state.online.lastSelectionRev // 룸 revision 추적
```

### 4-3. 서버 (`room`)

- `room.settings.teamSize`: 의미 유지 (배틀 출전수)
- `room.settings.builderSlotCount`: **신설**, 기본 6 (확장 여지)
- `room.builder.{p1,p2}.team`: **항상 길이 6** 으로 정규화
- `room.phase`: 위 5단계 enum 신설
- `room.selection = { p1: {picks:[], submitted:false}, p2: {picks:[], submitted:false} }` 신설
  - `picks`: 0-based 빌더 슬롯 인덱스 배열, 길이 = teamSize, 중복 금지
  - **picks 순서가 곧 출전 순서** (빌더의 슬롯 순서는 무시. 엔진에 보낼 때 이 순서로 재배열)
- `serialize()`에 위 필드 추가
  - 단, **상대측 selection.picks는 절대 노출 금지** (4-4 마스킹 참고). 자기측은 그대로 노출하여 새로고침 복원이 가능해야 함.

### 4-4. 직렬화 정책 (도구 + 상대 picks 가림)

`serialize()` 시 viewer 사이드를 인식해 다음 두 가지를 마스킹한다.

(a) **상대측 도구 (item)**
- `phase ∈ {preview, selecting}` 일 때 상대 사이드 빌더의 모든 `mon.item`을 `''`로 치환
- battle phase에서는 엔진 snapshot 노출 규칙을 따름 (별도 처리 불필요)

(b) **상대측 selection.picks**
- `phase ∈ {selecting, battle}` 일 때, 상대측 `selection.picks` 배열은 비공개 → 응답에서는 길이만 0, 또는 키 자체를 제거
- `submitted` boolean과 `submittedAt` 정도만 노출 (UI에 "상대 완료" 표시용)
- 이렇게 해야 "상대가 누구를 출전시키는지/순서가 어떻게 되는지"가 네트워크에도 새지 않음

방식 A (서버에서 마스킹) — **채택**:
- `getState`에 viewer 식별을 위해 `token` 쿼리/헤더 추가 (기존 호환을 위해 미인증 호출은 양쪽 모두 마스킹된 공개 뷰 반환)
- `submitChoice`/`syncBuilder`/`submit-selection` 등 권한 변경 API는 이미 token 필수이므로 영향 없음

방식 B (클라이언트 가림) — 거절:
- picks 같은 게임상 결정적인 정보가 네트워크에 노출되면 콘솔/네트워크 패널만 봐도 상대 출전 순서를 미리 알 수 있어 게임성에 치명적

### 4-5. 서버 API 추가/변경

신설:
- `POST /api/rooms/:roomId/submit-selection`
  - body: `{token, picks: number[]}`
  - 검증: 길이 == teamSize, 0~5 범위, 중복 금지, phase == 'selecting'
  - 양쪽 submit 완료 시 엔진 startBattle을 **여기서** 호출하고 phase=battle로 전이
- `POST /api/rooms/:roomId/cancel-selection` (선택, UX용)
  - body: `{token}`
  - 자기 선택만 취소(submitted=false)
- (선택) `POST /api/rooms/:roomId/leave-preview`
  - 양쪽 Ready 해제 + phase=building 복귀

변경:
- `POST /api/rooms/:roomId/start-battle`
  - 의미 변경: **엔진 세션을 곧장 만들지 않고** 본인 측 `startRequested=true` 토글만 한다
  - 양쪽 모두 startRequested=true가 되는 시점에 phase=preview→selecting 전이
  - body에 `{token, requested:boolean}` (생략 시 true). false면 본인 한정 토글 해제 (preview 상태 유지)
  - 양쪽 ready 검사는 유지
  - 실제 엔진 startBattle은 selection submit 완료 시점으로 이동
- `setReady(true)` 시
  - 기존 동작 외에, 양쪽 모두 true가 되는 시점에 phase를 `building`→`preview`로 전이
- `setReady(false)` 시
  - phase가 preview면 `selection`/`startRequested` 리셋하고 phase=building 복귀
  - phase가 selecting/battle이면 거절 (409) — 이미 선출 단계 진입 후엔 후퇴 불가
- `getState`
  - 위 4-4의 viewer 마스킹 로직 추가

### 4-6. 엔진 호출 시 팀 구성

`startBattle()`(엔진 호출부 추가, 기존 함수는 명칭 분리 추천):
- `team = picks.map(idx => room.builder[side].team[idx])`
  - **picks 배열의 순서가 그대로 엔진에 전달되는 출전 순서**가 됨 (= 빌더에서 만들었던 순서와 무관)
  - 엔진은 `team[0]`을 첫 번째 출전 포켓몬으로 취급하므로 정렬 그대로 통과시키면 의도한 엔트리 순서가 유지됨
- 빈 슬롯/유효하지 않은 mon이 있으면 거절(이상적으로 selection 제출 시점에 검증)

---

## 5) UI 변경

### 5-1. `online.html`

- 팀 슬롯 영역: 항상 6슬롯 보이도록 (state.teams 길이가 6이면 자동 반영, `team-size-note` 문구만 갱신)
- 빌더 푸터:
  - "준비 완료 / 준비 취소" 버튼: 동작 동일. **단 phase=preview/selecting에서도 토글 가능**해야 함 (취소 시 building으로 복귀)
  - "배틀 시작" 버튼: phase=preview일 때만 활성, 클릭 시 selecting 진입 요청

- 새 패널: **출전 선출 패널 (Selection Panel)** — phase=preview/selecting/battle 노출, 빌더 패널 대신 표시
  - **레이아웃 (위→아래 3단 구성)**:
    1. **상단: 상대 6마리 (Opponent Tray)**
       - 카드 6개를 한 줄로 (모바일은 줄바꿈)
       - 표시 정보: 스프라이트, 종족명/별명, 레벨, 타입, 특성
       - **숨김**: 도구(item), 기술/노력치/개체값/성격, 그리고 상대 선출 순서/picks/완료 상태 외의 진행 상황은 일절 비공개
       - "상대 완료 ✅" / "상대 선출 중 ⌛" 같은 한 줄 상태만 노출
    2. **중앙: 빈 슬롯 N칸 (Entry Slots)**
       - 배틀 마리수(=`state.teamSize`) 만큼 빈 칸이 가로 정렬
       - 각 슬롯에는 1, 2, 3 ... 출전 순번이 인쇄됨
       - 빈 슬롯은 점선 박스 + "여기에 드롭" 안내. 채워진 슬롯은 미니 카드(스프라이트+이름)
       - 액션:
         - 하단 마이팀에서 카드 **클릭** → 가장 앞쪽 빈 슬롯에 자동 배치
         - 하단 마이팀 카드 → 슬롯으로 **드래그&드롭** (특정 위치 지정)
         - **슬롯 ↔ 슬롯 드래그**로 자유롭게 순서 변경 (1↔3 swap 등)
         - 채워진 슬롯 클릭/X 버튼 → 해당 슬롯만 비움 (마이팀 풀로 복귀)
         - "전체 초기화" 보조 버튼
    3. **하단: 내 6마리 (My Tray)**
       - 빌더에서 만든 순서대로 6장 카드
       - 이미 위 슬롯에 배치된 mon은 시각적으로 "사용 중" 표시(흐리게 + 비클릭) — 중복 출전 금지
       - 카드 표시: 스프라이트, 종족/별명, 레벨, 도구, 특성 (자기 정보는 모두 노출)
  - 푸터 버튼:
    - **"완료!"** — 슬롯 N개가 모두 차고 phase=selecting 일 때만 활성. 누르면 `submit-selection` 호출.
    - **"선출 다시"** — 본인 한정 picks 리셋 (제출 후엔 `cancel-selection` → 슬롯 다시 편집 가능). picks 자체는 유지하되 submitted=false로 되돌림.
    - **"준비 취소"** — **preview에서만** 노출/가능 (selecting에서는 진입 후 후퇴 불가). setReady(false) 호출 → 양쪽 모두 building 복귀
    - **"배틀 시작"** — phase=preview에서 본인 토글. 양쪽 모두 누르면 selecting로 전이.
  - 상태 표시:
    - "내 출전 N마리 중 k개 채움"
    - "상대 선출 중..." / "상대 완료, 내 선출 대기" / "양쪽 완료 — 곧 배틀 시작"

- **절대 보이면 안 되는 것**:
  - 상대의 picks 배열 내용 (어느 슬롯을 골랐는지, 순서가 어떻게 되는지)
  - 상대의 도구
  - 상대 카드의 진행 중 시각 효과(슬롯에 들어갔다 빠졌다 하는 애니메이션 등) — 상대측 진행은 "완료/대기" 두 단계 boolean만 표시

### 5-2. `app.js` 렌더링 분기

- `renderRoster()`:
  - phase=building 일 때만 기존 동작 유지 (자기 사이드만 편집)
  - phase=preview/selecting/battle 이면 setup-panel 자체를 숨기거나 빈 6슬롯 안내만 (선출 패널이 메인)
- `renderValidation()`:
  - 6마리 모두에 대해 검증 (slot[0..5])
  - "배틀 출전 마리수 N개를 만족해야 합니다" 같은 합산 검증은 이미 슬롯 단위라 자연스럽게 6마리 검증으로 이동
- 새 함수:
  - `renderSelectionPanel()` — 위 5-1의 3단 레이아웃 그리기
    - 마이팀/슬롯 간 click+drag 핸들러 (HTML5 DnD 또는 pointer 이벤트). 기존 `renderRoster`의 드래그 코드를 참고해 재사용
    - 자기측 picks를 로컬에서 즉시 반영(렌더), 백엔드 동기화는 "완료!" 클릭 시 1회 commit
    - 상대측 트레이는 `roomState.builder[opponent].team`(item 마스킹된 6마리)로 그리고, 진행상태는 `roomState.selection[opponent].submitted` 만 사용
  - `submitSelectionFlow(picks)` — `submit-selection` 호출 + 폴링 반영
  - `cancelSelectionFlow()` — `cancel-selection` 호출 (제출 후 다시 편집 모드로)
  - `applyPhaseTransitionUi(prevPhase, nextPhase)` — setup-panel ↔ selection-panel 토글
- `startBattle()` 분기 수정:
  - 온라인일 때 phase에 따라:
    - phase=building & bothReady → `start-battle` 호출 → preview로
    - phase=preview & 자기쪽 클릭 → `start-battle` 호출 → selecting로 (서버 idempotent)
    - phase=selecting → 비활성 (선택 패널의 "완료!" 버튼이 진짜 trigger)
- `toggleOnlineReadyFlow()` 보강:
  - phase=preview 또는 selecting 에서 호출되면 `setOnlineRoomReady({ready:false})`로 흘러가도록 검증 분기 정리
  - 서버에서 phase 복귀 처리 (5-3, 4-5 참조)

### 5-3. 도구 가림 UX

- 상대 mon 카드 렌더 시:
  - `mon.item` 값이 있어도 표시 안 함 (phase가 preview/selecting일 때)
  - 정책 단순화: 서버가 이미 마스킹해 보내므로 클라이언트는 단순 표시
- 자기 mon은 그대로 도구 표시

---

## 6) 동기화/폴링 변화

- 기존 `pollOnlineRoomStateOnce()`가 `applyOnlineRoomState`로 위임
- `applyOnlineRoomState`에서 `roomState.phase`를 `state.online.phase`에 반영
- phase 변화 시 추가 처리:
  - `building → preview`: setup-panel 잠금, selection-panel 노출
  - `preview → selecting`: selection-panel을 "선택 확정 모드"로
  - `selecting → battle`: 기존 snapshot 적용 흐름(이미 구현됨) 그대로 동작
  - `battle → building`: 기존 `clearOnlineBattleReturnTimer`/리셋 흐름 + selection 리셋
- builder auto-sync:
  - phase!=building 이면 일시 정지 (현재 `isOnlineBuilderAutoSyncEligible`에 phase 조건 추가)

---

## 7) 검증/엣지 케이스

- 배틀 마리수 변경:
  - 방 만들기 직전에만 변경 가능 (기존 정책 유지)
  - 방 입장 후엔 잠금 (이미 `disabled = joined`)
- 6마리 미완성 + Ready 시도:
  - `renderValidation`이 6슬롯 검증해서 errors > 0면 Ready 자체가 의미 없도록 시작 버튼 disabled
  - 단, 사용자가 비어있는 슬롯을 그대로 두고 Ready를 누를 수 있는지: 현재는 Ready 자체에 검증 게이트가 없음 → 추가 권장 (서버에서 빈 mon 거절)
- 선택 검증:
  - 길이 == teamSize, 모두 0~5 정수, 중복 금지, 가리키는 mon이 비어있지 않아야 함
  - 미달/중복/빈 mon 가리킴 → 서버 400
- 한쪽이 선택 도중에 새로고침:
  - 룸 phase=selecting + 자기 selection.submitted=false 라면 selection-panel을 다시 그려서 재선택 가능
  - 선택 완료 후 새로고침: submitted=true 유지, 상대 대기 화면 복원
- 한쪽이 선출 도중 본인 선택만 다시 하기:
  - "선출 다시" 버튼 → `cancel-selection` 호출 → 본인만 submitted=false (picks는 유지하거나 비우는 정책 선택 가능 — 권장: picks 유지하되 슬롯 편집 활성화)
- preview/selecting 중 "준비 취소" (양쪽 빌더 복귀):
  - Ready off 토글로 setReady(false) → 서버가 phase=building 복귀 + 양쪽 selection 리셋
  - 빌더에서와 동일한 버튼 라벨/위치를 유지해 사용자가 "지금처럼 준비 취소"를 그대로 사용할 수 있게 함
- 동시 클릭:
  - "배틀 시작"은 building→preview→selecting 모두 idempotent 처리
  - 양쪽이 거의 동시에 "완료!" 누름 → 서버에서 둘 다 submitted=true 확정 후 한 번만 engine startBattle 호출 (revision/락 기반 가드)
- 배틀 종료 후 재대전:
  - 기존 returnToBuilder 흐름 재사용. selection 양쪽 리셋, ready 양쪽 false. teams 6마리는 보존(편집 가능 상태로)

---

## 8) 구현 단계 (제안 순서)

### Phase A — 서버 데이터 모델 + API 골격
1. `online-room-service.cjs`
   - `room.phase` 도입 + 전이 로직
   - `room.selection` 도입
   - `cloneBuilderPayload`가 6슬롯으로 정규화
   - `serialize()`에 phase/selection/teamSize/builderSlotCount 노출
   - `serialize()`에 viewer-token 기반 도구 마스킹
   - `startBattle()` 분리: `transitionToSelecting()` + 내부 `engineStart(room)` 함수
   - `submitSelection()` 추가 + 양쪽 완료 시 `engineStart` 트리거
   - `cancelSelection()` 추가
   - `setReady`에 phase 전이 부수효과 추가
2. `server.cjs`
   - 새 라우트 추가: `submit-selection`, `cancel-selection`
   - `getState`가 token 옵션 받도록 (쿼리 `token=...` 또는 헤더)

### Phase B — 클라이언트 브리지 + 모델
3. `src/engine/showdown-online-room-bridge.js`
   - `submitOnlineRoomSelection`, `cancelOnlineRoomSelection` 함수 추가
   - `fetchOnlineRoomState`에 token 전달 옵션 추가
4. `src/app.js` 모델 변경
   - `getBuilderSlotCount()` 신설
   - `rebuildTeamSize()` 분리: 슬롯 길이 항상 6 (online) / 기존(local)
   - `state.online.phase`, `state.online.selection` 초기화
   - `applyOnlineRoomState`에서 phase/selection 동기화

### Phase C — 빌더/룸 UI 전이
5. 빌더 슬롯 6개 항상 노출 + 검증을 6슬롯 기준으로
6. `getOnlineRoomRuntimeDescriptor()` 의 startAllowed/badge 메시지에 phase 반영
7. "배틀 시작" 클릭 분기 (building→preview, preview→selecting)
8. setup-panel/builder lock을 phase에 따라 조정

### Phase D — Selection Panel 신설
9. `online.html`에 `#selection-panel` DOM 추가 (3단 구성: opponent-tray / entry-slots / my-tray)
10. `app.js` `renderSelectionPanel()`
    - 상대 트레이 (도구/picks 진행상황 마스킹)
    - 빈 슬롯 N개 (배틀 마리수)
    - 내 6마리 트레이
11. 인터랙션 구현
    - 마이팀 카드 클릭 → 가장 앞쪽 빈 슬롯 자동 채움
    - 마이팀 카드 → 슬롯 드래그&드롭 (기존 `rosterDragState` 패턴 재사용)
    - 슬롯 ↔ 슬롯 드래그로 순서 변경 (= picks 배열 재정렬)
    - 슬롯 클릭/X로 비우기, "전체 초기화" 버튼
    - 중복 출전 금지 시각 피드백
12. "완료!" / "선출 다시" / "준비 취소" 핸들러 + 서버 호출
13. selecting 동안 폴링 결과로 상대 submitted boolean만 갱신 (picks 내용은 받지 않음)

### Phase E — 회귀/검증
14. `node --check src/app.js` / `npm run verify:core` 등 기본 검증
15. 2브라우저 수동 시나리오:
    - 방 만들기→참가→6빌드→Ready→배틀시작 클릭→상대 6마리(도구 가림)→슬롯 N칸 클릭+드래그로 채우고 슬롯 간 재정렬→완료!→상대 선출→배틀
    - 선출 도중 한쪽 새로고침 → picks 복원/슬롯 다시 그리기
    - preview/selecting에서 "준비 취소" → 양쪽 building 복귀, 빌더 6마리 보존
    - 본인 한정 "선출 다시" → 슬롯 다시 편집 가능
    - 배틀 종료 후 재대전 (selection/ready 리셋, teams 6마리 유지)
    - 상대 picks/도구가 네트워크 응답에서 마스킹되어 있는지 devtools로 확인

---

## 9) 변경 파일/지점 체크리스트

서버
- [ ] `server/online-room-service.cjs`
  - phase/selection 모델, viewer 마스킹, startBattle 분리, 신규 액션
- [ ] `server/server.cjs`
  - 라우트 추가, `getState` token 옵션

클라이언트
- [ ] `src/engine/showdown-online-room-bridge.js`
  - 새 API 래퍼, token 옵션
- [ ] `src/app.js`
  - 모델 분리(빌더 슬롯 6 vs 배틀 인원 N)
  - phase 인지하는 빌더/배틀 시작 흐름
  - selection-panel 렌더/이벤트
  - validation을 6슬롯 기준으로
  - 도구 마스킹(렌더 단)
- [ ] `online.html`
  - selection-panel 컨테이너
  - 안내 문구/i18n 키 추가

문서
- [ ] `plan.md`/`onlineshift.md`에 본 단계가 반영되었는지 갱신 (구현 후)

---

## 10) 회귀 가드 (놓치면 안 되는 항목)

- **`index.html` (디버그/local 프로필) 흐름은 절대 건드리지 않는다.**
  - `state.teams` 길이는 그대로 mode 기반 (3 또는 4) 유지
  - `getConfiguredTeamSize()`/`rebuildTeamSize()` 분기 시 `isOnlineProfile()` 게이트 필수
  - setup-panel/start-battle-btn 동작은 local에서 기존과 100% 동일
  - 새 selection-panel DOM은 `online.html`에만 추가 (또는 양쪽 HTML에 두되 local에선 영구 hidden)
- 기존 `submit-choice`, snapshot 동기화 흐름은 phase=battle 일 때만 의미가 있음 → 폴링/렌더 가드 추가
- `getState`의 미인증 호출은 도구 + 상대 picks 모두 마스킹된 안전 뷰만 노출 (디버그/제3자 모니터)
- `auto-sync(builder)`를 phase!=building 시 일시 중단해서 의도치 않은 빌더 덮어쓰기 방지
- 빌더에서 6마리 미완 시 Ready 막기 (서버에서도 거절) — 그렇지 않으면 selection 단계에서 빈 슬롯이 picks 후보가 되어 엔진 거절 위험
- 선출 단계에서 "선택 순서 = 출전 순서" 원칙 준수: picks 배열을 절대 정렬하지 말고 사용자 입력 순서 그대로 엔진에 전달
- 상대측 진행 상황은 boolean 한 단계만 노출. picks 배열 길이/카운트도 노출 금지(어떤 mon이 들어갔는지 추론 차단)

---

## 11) 비고

- Showdown의 `Team Preview` 룰을 활용해 엔진 자체에 선택을 위임할 수도 있으나:
  - 현재 `gen9customgame` 포맷 + 자체 직렬화/이벤트 파이프라인 의존이 커서 엔진 룰 토글 도입 비용/리스크가 큼
  - 본 계획은 **클라이언트/룸 서비스 레벨에서 선택**을 처리하고 엔진엔 정해진 N마리만 넘기는 방식 권장 (현 코드 변경 최소)
- 향후 doubles 더블 등 다른 모드 확장 여지를 위해 `builderSlotCount`는 별도 필드로 분리해 둠 (지금은 항상 6)
