# Plan (2026-04-25 UTC)

완료 이력과 상세 분석/수정 기록은 `previous.md`로 이관했습니다.
이 문서는 **현재 남은 작업만** 유지합니다.

# DB - 6 수정사항
  1. 더블에서만 수동 타겟 선택이 뜹니다.
     single-opponent, ally, ally-or-self 기술만 대상 선택 모드로 진입합니다.
     (src/app.js:6693, src/app.js:6834)
  2. 후보가 1개면 자동 타겟으로 바로 커밋됩니다. 후보가 여러 개면 타겟 창이 열립니다.
     (src/app.js:6786)
  3. 타겟 창(Phaser)에서 방향키/패드 이동 + A 선택 + B 취소(뒤로)가 됩니다.
     (src/pokerogue-transplant-runtime/ui/handlers/target-select-ui-handler.js:24, src/pokerogue-transplant-runtime/adapter/pkb-battle-ui-adapter.js:644)
  4. “뒤로”는 command가 아니라 fight로 돌아가게 되어 있습니다.
     (src/app.js:9056)
  5. DOM fallback UI도 placeholder가 아니라 실제 타겟 카드 목록으로 바뀌어 있습니다.
     (src/app.js:8523)
  6. DB-6 UI 미세조정(2026-04-26):
     - 배틀 UI의 슬롯 표기(`슬롯 1/2`, `Slot 1/2`)를 제거하고 포켓몬 이름 중심으로 표시.
       (src/app.js)
     - Phaser target-select의 상단 보조창 제거, 하단 단일 창에 선택지+뒤로를 세로 목록으로 통합.
       (src/pokerogue-transplant-runtime/ui/handlers/target-select-ui-handler.js, src/pokerogue-transplant-runtime/adapter/pkb-battle-ui-adapter.js)
     - target-select에서 기술명을 반복 표시하지 않고, 선택지와 `뒤로`만 노출.
       (src/app.js:buildPhaserTargetWindowModel, src/app.js:renderBattleTargetWindow, styles.css)
  7. DB-6 target/party 추가 UI 조정(2026-04-26):
     - target-select 진입 시 뒤의 가로 메시지창(`battleMessage.bg`/`movesWindowContainer`)을 숨기고,
       창 위치/크기를 fight move-info 패널과 동일(80x48, `getMoveInfoPanelConfig`)하게 정렬.
       (src/pokerogue-transplant-runtime/ui/handlers/target-select-ui-handler.js)
     - target-select 리스트 텍스트 중앙 정렬 및 행간/행 간격 확대.
       (src/pokerogue-transplant-runtime/ui/handlers/target-select-ui-handler.js)
     - party UI에서 더블 슬롯2 BattleInfo가 남아 오버레이되던 문제 수정(슬롯0/1 overlay 전체 hide/restore).
       (src/pokerogue-transplant-runtime/ui/handlers/party-ui-handler.js)
  8. DB-6 target-select 재조정(2026-04-26):
     - target-select에서 왼쪽 moves 창은 유지하고, 오른쪽 상세 pane만 숨김(`movesWindowContainer=true`, `moveDetailsWindow=false`).
       (src/pokerogue-transplant-runtime/ui/handlers/target-select-ui-handler.js)
     - target-select 텍스트/행 Y를 소폭 상향(약 2px)해 시각 중심을 위로 미세 이동.
       (src/pokerogue-transplant-runtime/ui/handlers/target-select-ui-handler.js)

  ———

  나중에 UI만 손볼 때 건드리면 되는 곳

  1. 레이아웃/좌표/행 간격/커서 위치:
     src/pokerogue-transplant-runtime/ui/handlers/target-select-ui-handler.js:24
  2. 타겟 행 개수(현재 3개 고정), 폰트/컬러/포커스 색상:
     src/pokerogue-transplant-runtime/ui/handlers/target-select-ui-handler.js:40, src/pokerogue-transplant-runtime/ui/handlers/target-select-ui-handler.js:86
  3. 타겟 창에 들어오는 데이터 형태(title, placeholder, targets, footerActions):
     src/app.js:9009, src/pokerogue-transplant-runtime/adapter/pkb-battle-ui-adapter.js:632
  4. DOM 버전 카드 스타일/문구를 바꾸려면:
     src/app.js:8523

  ———

  오늘 마무리 상태

  - DB-6 구현 반영 완료.
  - DB-6 target-select UI 미세조정(슬롯 문구 제거/단일 창/세로 목록) 반영 완료.
  - DB-6 target/party 추가 미세조정(타깃창 위치/크기/정렬, party 슬롯2 info 오버레이 수정) 반영 완료.
  - plan.md도 DB-6 완료로 업데이트됨.
    (plan.md:13, plan.md:242)

  다음에 이어서 할 때는 “디자인만 수정”이면 target-select-ui-handler.js 중심으로 보면 됩니다.


# 작업 시 필수 지침
 - 작업 완료 후 plan.md에 업데이트 할 것.
 - 브라우저에서 어떤 점을 검증해야하는지 보고할 것.

## 현재 작업 목록
| 번호 | 항목 | 상태 | 메모 |
|---|---|---|---|
| 9 | 더블배틀 구현 | 진행 중(DB-1~DB-6 완료) | 아래 §9 단계별 구현 계획 참조. 다음: DB-7(choice 직렬화/제출). |
| 15 | 배틀 중 간헐 렉(내 포켓몬 1 출전 후 피격, 필드 연출 종료→배틀 필드 전환 사이) | 보류 | 더블배틀 우선; 본 항목은 후순위. |

## 15번 필수 분석 포인트(보류)
- 재현 기준: player1 포켓몬 1 출전 후, 기술 피격/필드 설치/필드 연출 종료 직후 전환 구간에서 프레임 드랍 또는 멈춤 체감.
- 우선 점검 경로:
  - `src/battle-presentation/timeline.js` 지연(`_showMsg` minMs, `_delay`, `Promise.race` timeout) 체인
  - `src/pokerogue-transplant-runtime/scene/battle-shell-scene.js` 필드/배경 로딩 및 적용 타이밍
  - `src/battle-presentation/battle-anim-player.js` 프레임 루프/cleanup/텍스처 참조 안정성
- 완료 조건: 메시지 가독성은 유지하면서(과속 금지) 해당 전환 구간의 멈춤 체감을 유의미하게 감소.

---

## §9. 더블배틀 구현 — 분석 및 단계별 계획

작업 일자: 2026-04-25
대상 모드: `gen9doublescustomgame@@@+pokemontag:past,+pokemontag:future` (단일 포맷, gameType=`doubles`).
원칙: **싱글 경로 무회귀**. 더블 분기는 (a) 신규 상수/헬퍼/포맷 선택, (b) 슬롯 차원(0/1) 도입, (c) 더블 전용 UI 흐름(타깃 선택, 듀얼 슬롯 렌더, 두 줄 명령 흐름)으로만 수행.

### 9.0 현재 상태 요약(분석 결과)

이미 더블 친화적인 부분:
- 프로토콜 파서 `parseIdentForEvent`(`server/showdown-engine.cjs:550`)는 `p1a/p1b` → slot 0/1로 정확히 분해. 이벤트 빌더(`normalizeEventsFromLine`)는 모든 이벤트에서 `slot`을 그대로 채움.
- 스냅샷 `side.active`는 배열, `request.active`도 배열 — `getEngineActionSlots`/`getActionableSides`는 길이에 무관하게 동작 가능.
- `pruneEnginePendingChoices`/`seedEngineForcedPendingChoices`/`normalizeEnginePendingChoice`/`getEngineDraftChoice` 등 슬롯 단위로 이미 분기됨(`src/app.js`).
- 타임라인 슬롯 키(`_slotNames`/`_slotInfo`)는 이미 `${side}_${slot}` 키 사용(`src/battle-presentation/timeline.js`).
- 빌더 모드 토글(싱글/더블) 및 팀 사이즈 4 전환(`getConfiguredTeamSize`)은 이미 구현됨(`src/app.js:4294`, `5887`).
- `PartyUiHandler`/adapter는 `battlerCount` 인자를 이미 인식하고 있고, `buildPhaserPartyWindowModel`이 `state.mode === 'doubles' ? 2 : 1`로 전달 중(`src/app.js:8424`).
- 어댑터(`PkbBattleUiAdapter`)와 `TargetSelectUiHandler`가 이미 존재(현재는 자리만 있는 상태).
- `@pkmn/sim`에 `gen9doublescustomgame` 포맷이 존재(확인됨: `node_modules/@pkmn/sim/build/cjs/sim/tools/exhaustive-runner.js:162`).

핵심 갭(슬롯 0 가정 또는 단일 마운트 가정으로 깨지는 지점):
1) **엔진/룸/브리지**가 모드 인자를 무시하고 항상 싱글 포맷으로 시작하며, 클라가 보내는 choice 명령이 "슬롯 0 한 개"만 보냄.
2) **씬 마운트가 side당 1개**(`enemySprite`/`playerSprite`)뿐이며, 좌표/그림자/테라/다맥스 상태가 mount 1개를 가정.
3) **BattleInfo 패널이 side당 1개**(`enemyInfo`/`playerInfo`)이고, `_infoForSide(side)`는 슬롯을 무시.
4) **애니메이션 endpoint**(`USER_FOCUS_X` 등)와 `playMoveAnim`/`playFieldAnim`이 단일 user/target 좌표만 계산.
5) **UI 윈도우 빌더**(`buildPhaserCommandWindowModel`/`...FightWindowModel`/`...MessageWindowModel`)가 `actionSlots[0]`만 사용하고, 두 슬롯을 순차로 드라이브하지 않음.
6) **타깃 선택 UI**가 “Back만 가능한 placeholder”인 상태(`target-select-ui-handler.js`).
7) **Showdown choice 직렬화**가 단일 액션 문자열만 반환(`serializeChoiceForShowdown`); 더블은 `,`로 두 슬롯을 묶어야 함.
8) **온라인 룸 서비스**가 한 번의 submitChoice에서 사이드당 한 문자열만 저장(=한 슬롯). 더블에서는 한 사이드의 두 슬롯 액션을 묶어 한 번에 submit해야 함.
9) **빌더 사이즈 정책**: 기본 4마리는 게임 룰에 부합하나 6마리 풀팀 옵션이 필요한지 결정 필요(아래 §9.1 정책 참조).

### 9.1 정책 결정(설정/디폴트)

- 더블 배틀 기본 팀 사이즈: 4 (현재 정책 유지). 풀팀(6) 옵션은 별도 토글 도입 검토 후 결정 — 1차 구현은 4 고정으로 한정해 회귀 위험 축소.
- 더블 포맷 ID(상수 신규):
  - `ENGINE_AUTHORITATIVE_DOUBLES_FORMAT = 'gen9doublescustomgame@@@+pokemontag:past,+pokemontag:future'`
- 다이맥스/Z/메가/테라 상호작용은 싱글과 동일 정책 유지 — 다만 한 사이드의 동일 턴에 두 슬롯이 동시에 사용 불가한 자원(다이맥스 1회/사이드, 메가 1회/사이드, 테라 1회/사이드)은 **드래프트 단계의 토글이 사이드 전체에서 한 슬롯에만 켜지도록** 정규화 필요(엔진은 그래도 거절하므로 안전망은 엔진 측).
- 포지셔닝: PokeRogue 원본은 더블 시 좌/우 슬롯 X-오프셋 + 깊이 분리. 1차 구현은 “좌-안쪽, 우-바깥쪽”의 두 좌표 사전 정의로 시작(원본 좌표 측정 후 적용).
- 온라인 페이지(`online.html`)는 기존 싱글 강제 유지. 더블은 우선 **로컬(`index.html`) 경로에서만** 활성화. 온라인 더블은 플랜 후반 §9.7에서 분리 진행.

### 9.2 엔진 / 서버 / 브리지 (gameType=doubles 경로 추가)

목표: payload `mode === 'doubles'` 면 `gen9doublescustomgame` 포맷으로 세션 생성 + choice 직렬화/제출이 두 슬롯을 함께 묶어 전달.

- `server/showdown-engine.cjs`:
  - `ShowdownLocalSinglesSession` 옆에 `ShowdownLocalDoublesSession`을 도입(또는 클래스 일반화 + `mode` 필드). 핵심 차이는 `formatid` 디폴트와 `engineMeta.modeSupport`만이며, BattleStream 자체는 동일 인터페이스.
  - `snapshot()`이 이미 `side.active`/`request.active` 배열 길이에 의존하지 않으므로 **추가 개조 최소**.
  - `engineMeta.supportsDoubles = true`로 노출.
  - `ShowdownEngineService.startSingles`/`chooseSingles`와 대칭으로 `startDoubles`/`chooseDoubles` 추가(또는 `startBattle({mode})`로 통일).
- `server/server.cjs`:
  - `/api/battle/start`가 `mode`/`formatid`를 그대로 위임할 수 있도록 분기(현재 항상 `startSingles`).
  - 신규: `/api/battle/start`에서 `body.mode`로 분기, 또는 `body.formatid`를 신뢰.
- `server/online-room-service.cjs`:
  - `room.settings.mode` 필드 추가, `createRoom`/`joinRoom`이 `mode` 인자 수신.
  - `startBattle`이 payload에 `mode`/`formatid` 동봉.
  - `submitChoice`가 사이드별로 “슬롯 N개 액션 합본 문자열”을 받을 수 있도록 검증 완화(엔진은 어차피 `,` 합본 그대로 수용).
- `src/engine/showdown-local-bridge.js`:
  - `serializeChoiceForShowdown(choice, request, {gameType})` 시그니처 확장.
    - 더블 `move`: target slot이 있으면 `move N TARGET`(상대 슬롯 1/2, 아군 슬롯 -1/-2)으로 인코딩. spread/all/foe-side 등 “타깃 비요구” 무브는 target 생략.
    - 더블 `switch`: 기존 형식 유지(`switch K`).
    - 두 슬롯 합본 빌더 추가: `buildSideChoiceForDoubles(side, request, pendingChoicesBySlot)` → `act1,act2`. wait/forced-switch 슬롯은 "pass"로 채움(엔진 요구사항).
  - `submitShowdownLocalSinglesChoices`를 `submitShowdownLocalChoices`로 일반화(또는 doubles 변형 분기). 사이드별 actionSlots를 모두 모아서 합본.
- `src/engine/showdown-online-room-bridge.js`:
  - `submitOnlineRoomChoice` payload에 `choice` 문자열만 보내는 구조는 유지하되, **호출부(app)에서 사이드별 두 슬롯 합본 문자열을 만들어 단일 호출**로 보내도록 변경.
- `src/engine/showdown-singles-engine.js`(브라우저 fallback):
  - 현재 사용 경로가 아니나, 기능 동치(doubles 분기 포함) 유지 또는 deprecate 표시.

### 9.3 클라이언트 상태/팀빌더 / 시작 흐름

- `src/app.js`:
  - `state.mode === 'doubles'` 분기 정리: `getConfiguredTeamSize()`(이미 4) + 빌더 토글(이미 존재) + `rebuildTeamSize()`(이미 존재). 신규는 거의 없음.
  - 신규 `getEngineAuthoritativeDoublesRuntimeDescriptor()` 추가, `getSelectedBattleRuntimeDescriptor`가 `state.mode === 'doubles'` 일 때 doubles 디스크립터 반환.
  - `buildShowdownBattlePayload()`: `mode: state.mode`, `formatid: state.mode === 'doubles' ? ENGINE_AUTHORITATIVE_DOUBLES_FORMAT : ENGINE_AUTHORITATIVE_SINGLES_FORMAT`로 분기.
  - `startBattle()`의 “싱글만 허용” 게이트(`runtime.id !== 'engine-authoritative-singles'`)를 doubles 디스크립터 허용으로 확장.
  - `state.battleUi`에 슬롯 차원 추가:
    - `modeByPlayerSlot[player][slot] = 'command' | 'fight' | 'party' | 'target'` (기존 `modeByPlayer`를 슬롯별로 확장).
    - `currentSlotByPlayer[player] = 0|1` — 더블에서 “지금 입력 받는 슬롯” 포인터(슬롯 0의 명령 결정 → 슬롯 1로 이동 → 두 슬롯 모두 결정 시 turn-resolve 트리거).
  - `submitOnlineChoiceIfPossible(player)`을 더블에서는 “양쪽 슬롯 모두 결정 시 1회만 합본 호출”하도록 변경(현재는 슬롯 0만 즉시 호출).
  - `resolveEngineTurn()`의 `moveAnimationHints` 수집은 이미 `actionSlots`를 순회하므로 변경 거의 없음. `injectDerivedSubstituteBoundaryEvents`는 슬롯 차원 이미 처리.
- `src/battle-constants.js`: `ENGINE_AUTHORITATIVE_DOUBLES_FORMAT` 추가.

### 9.4 씬/스프라이트/애니메이션 (side당 두 슬롯 마운트)

- `src/pokerogue-transplant-runtime/scene/battle-shell-scene.js`:
  - 마운트 구조 확장: `enemySprite`/`playerSprite` → `enemySprites = [mount0, mount1]`, `playerSprites = [mount0, mount1]`. 호환을 위해 단축 `this.enemySprite = this.enemySprites[0]` 유지.
  - `_mountForBattleSide(side)` → `_mountForBattleSideSlot(side, slot)` 신규(기존 시그니처는 slot=0으로 위임). `_mountsForBattleSide(side)` 헬퍼.
  - 모든 `setBattlerSprite/Visibility/Terastallized/DynamaxState/playFormChange/playQuiet.../playTerastallize/playDynamaxStart/playDynamaxEnd/faintBattler/switchInBattler/playStatStageEffect/concealBattler/prepareSwitchInBattler` 시그니처를 `(side, slotOrOptions, ...)`로 확장 — 기본 slot=0 유지, 호출부에서 명시 전달.
  - `_resolveAnimEndpoints(userSide, userSlot, targetSide, targetSlot)`로 확장. 슬롯별 좌표는 마운트의 `baseX/baseY`를 사용.
  - `playMoveAnim(moveName, actorSide, actorSlot, targetSide, targetSlot, opts)`로 확장.
  - `playFieldAnim`은 사이드 전체 효과이므로 “좌/우 user-target endpoints” 1쌍을 합리적 기본값으로 유지하되, 더블에서는 두 사이드의 “바깥 슬롯끼리” 또는 “필드 중심 좌표”로 대체 검토.
  - 좌표 신규 상수: `DOUBLES_MOUNT_OFFSET_X` 같은 상대 X 오프셋(좌/우 슬롯 분리). 1차는 PokeRogue 더블 좌표를 측정해 도입; 그 전엔 `±24px` 등 임시값.
- `src/pokerogue-transplant-runtime/runtime/sprite-host.js`: 슬롯 인자만 통과(렌더 자체는 mount-bound이라 변경 최소).
- `src/pokerogue-transplant-runtime/ui/ui.js`:
  - `attachSpriteMounts({enemy:[m0,m1], player:[m0,m1]})`로 변경(기존 단일 객체 호환 유지).
  - `layout()`에서 슬롯별 `baseX/baseY` 부여.
  - `enemyInfo`/`playerInfo`도 슬롯별 두 인스턴스(`enemyInfos[0..1]`, `playerInfos[0..1]`) 도입. 기본 위치(player 110/72 / enemy 140/-141 등)에 더블용 두 번째 슬롯 위치 추가.
- `src/pokerogue-transplant-runtime/ui/battle-info/*`: 인스턴스 차원만 늘려도 동작. 좌표는 ui.js에서 두 번째 슬롯용 오프셋 부여.

### 9.5 프레젠테이션 타임라인 (slot-aware 분기)

- `src/battle-presentation/timeline.js`:
  - `_infoForSide(side)` → `_infoForSideSlot(side, slot)`로 교체. `ui.playerInfos[slot]`/`ui.enemyInfos[slot]` 조회.
  - `_setBattlerSprite/_playFormChangePresentation/_applyInfoForSlot`의 `Number(slot) === 0` 가드(테라/다이맥스 mount 갱신 호출) 제거 또는 슬롯별 호출로 일반화.
  - 모든 이벤트 핸들러가 `ev.target?.slot ?? 0`/`ev.actor?.slot ?? 0`을 “0으로 폴백”하던 부분을 “undefined면 0, 단 doubles에서는 명시 필수”로 안전화. 메시지/HP/info/스프라이트 호출은 항상 `(side, slot)` 기반.
  - `move_use`에서 `playMoveAnim(actorSide, actorSlot, targetSide, targetSlot)` 호출(현재는 사이드만 전달).
  - `weather/terrain/side_*` 같은 사이드 광역 이벤트는 변경 거의 없음.
  - `callback_event`(forced switch) 처리: 슬롯별 forceSwitch 배열 길이만큼 입력 게이트가 발생할 수 있음 — UI 트리거 시 슬롯 정보 전달.

### 9.6 입력 흐름 / UI / 타깃 선택

- `src/app.js`의 빌더들(`buildPhaserCommandWindowModel`/`...FightWindowModel`/`...PartyWindowModel`/`...MessageWindowModel`/`...TargetWindowModel`):
  - `actionSlots[0]`만 사용하던 자리를 `state.battleUi.currentSlotByPlayer[player]`(또는 `actionSlots[currentIndex]`)로 교체.
  - 더블에서 “슬롯 0 명령 결정 → 슬롯 1 명령 결정” 단계 진행을 명시(상태머신: `slot0-command → slot0-fight/party → (target if needed) → slot1-command → ... → ready`).
  - 한 사이드 자원 토글(테라/다이맥스/메가/Z) 사이드 단일성 보장: 슬롯 1에서 토글 시 슬롯 0의 동일 토글 자동 해제(또는 disabled 처리).
- `buildPhaserTargetWindowModel`(현재 placeholder):
  - 모델: `targets: [{label, side, slot, disabled, action}]` + `kind`(자기/아군/상대 1마리/광역).
  - move의 `target` 힌트로 후보 산출:
    - `single-opponent`/`adjacentFoe` → 상대 두 슬롯(둘 다 살아있을 때만)
    - `ally`/`adjacentAlly` → 아군 다른 슬롯
    - `ally-or-self` → 아군 두 슬롯
    - `all-adjacent`/`all-other-pokemon`/`all-pokemon`/`opponent-side`/`ally-side`/`self` → 자동(타깃 선택 스킵)
  - 액션 dispatch 시 `setEnginePendingChoice`로 `choice.target = {side, slot}`을 박고 fight → command 또는 다음 슬롯으로 진행.
- `src/pokerogue-transplant-runtime/ui/handlers/target-select-ui-handler.js`:
  - 현재 “Back만 가능” 구조에서 후보 리스트 + 커서 + 십자키 이동 UI로 확장.
  - `pkb-battle-ui-adapter.js`의 `getTargetInputModel`/`resolveTargetInput`도 후보 인덱스/선택 액션 처리로 확장.
- `src/pokerogue-transplant-runtime/ui/handlers/command-ui-handler.js`/`fight-ui-handler.js`:
  - `fieldIndex`가 1일 때 cursor2를 사용하는 설계 이미 존재(원본 PokeRogue 반영). 더블에서 슬롯 0/1 분리 커서가 자연스럽게 활용됨.
- `src/pokerogue-transplant-runtime/ui/handlers/party-ui-handler.js`:
  - 이미 `battlerCount`가 2를 받을 수 있음. 더블에서 “현재 선택 슬롯이 어느 베틀러를 교체하는지” 명확히 하기 위해 타이틀/서브타이틀 분기 보강 필요.

### 9.7 온라인 룸 (분리 단계)

로컬 더블이 안정화된 다음 단계로 분리.
- `OnlineRoomService`/`server.cjs` API에 `mode` 추가, room.settings.mode 저장.
- `ready/start-battle/submit-choice` 흐름은 기존과 동일하지만 사이드별 choice는 “슬롯 N개 액션 합본 문자열”이라는 점만 보장.
- `online.html` 페이지의 모드 선택 UI(현재는 싱글 강제) 해제 또는 토글 노출.

### 9.8 위험 요소 / 회귀 방지 가드

- 싱글 회귀 차단:
  - 모든 `playXxx(side, ...)` 시그니처 확장은 `slot`을 옵셔널(기본 0)로 두어 기존 호출부 무영향.
  - 마운트 배열 도입 시 `this.enemySprite = this.enemySprites[0]` 같은 단축 alias 유지(외부 참조 깨짐 방지).
  - `state.mode === 'singles'` 경로의 모든 빌더/디스패처가 변경 없이 동작해야 함(테스트 시 가장 먼저 검증).
- 더블 전용 가드:
  - 한 사이드 자원(테라/다이맥스/메가/Z) 동시 켜짐 방지(드래프트 정규화).
  - target 미지정 + target 요구 무브 시 submit 차단(엔진 reject 전 클라 단계에서 가드).
  - `cant_move`/`forceSwitch`가 한 슬롯에만 발생할 때 다른 슬롯 입력은 정상 진행 가능하도록 상태머신 분리.
- 애니메이션 회귀:
  - `playMoveAnim`이 multi-target 광역 무브에서도 단일 target 좌표를 폴백으로 사용(원본도 유사) — 변경 시 별도 회귀 검증.
  - `playFieldAnim`의 endpoints가 mount0 기준이어야 함(시각적으로 가장 자연).

### 9.9 단계별 마일스톤(권장 순서)

1. **DB-1 포맷/상수** ✅ 완료(2026-04-25):
   - `src/battle-constants.js`: `ENGINE_AUTHORITATIVE_DOUBLES_FORMAT` 상수 추가.
   - `src/app.js`: `getEngineAuthoritativeDoublesRuntimeDescriptor()` 신설, 디스패치 4곳(`getSelectedBattleRuntimeDescriptor`/`getDisplayedRuntimeDescriptor`/`applyBattleRuntimeInfo` engineAuthoritative 인정/import) 갱신.
   - **DB-2 미완 상태에서 false UX 회피**를 위해 디스크립터 `startAllowed: false` + "엔진 연결 단계 진행 중" 라벨로 정직화. DB-2에서 true로 전환.
2. **DB-2 엔진 시작/스냅샷** ✅ 완료(2026-04-25):
   - `server/showdown-engine.cjs`: 세션 클래스가 `payload.mode`(기본 'singles')에 따라 doubles 포맷/엔진 라벨/로그 메시지 선택. `engineMeta.supportsDoubles = true`, `status().modeSupport = ['singles','doubles']`. `ShowdownEngineService`에 `startBattle/chooseBattle` 신설 + `startSingles/chooseSingles`는 backward-compat alias.
   - `server/server.cjs`: `/api/battle/start` → `engine.startBattle(body)`, `/api/battle/choice` → `engine.chooseBattle(...)`로 일반화(룸 서비스는 §9.7 단계로 미루고 손대지 않음).
   - `src/engine/showdown-local-bridge.js`: `isShowdownLocalBattle`이 `showdown-local-singles`/`showdown-local-doubles` 둘 다 인식.
   - `src/app.js`: `buildShowdownBattlePayload()`가 `state.mode` 기반으로 mode/formatid 산출. `startEngineAuthoritativeSinglesBattle()`이 doubles 디스크립터도 적용. `adoptEngineBattleSnapshot()`이 snapshot.mode에 따라 디스크립터 선택. `startBattle()` 게이트가 두 id 모두 허용. **DB-1 doubles 디스크립터를 `startAllowed: true`로 전환**.
   - 스모크 테스트: `node -e` 직접 호출로 doubles 시작 시 `p1/p2.active = [0,1]`, `request.active.length = 2`, `engine = 'showdown-local-doubles'` 확인. 싱글 경로(`active = [0]`) 회귀 없음. `npm run verify:core` 통과.
   - **남은 한계(다음 단계 의존)**: 씬은 슬롯 0만 렌더, UI 빌더는 슬롯 0만 입력 받으므로 더블 시작은 가능하나 첫 턴 진행은 DB-3+/DB-7 이후에야 정상.
3. **DB-3 듀얼 마운트/렌더** ✅ 완료(2026-04-25):
   - `src/pokerogue-transplant-runtime/scene/battle-shell-scene.js`: `enemySprites = [m0, m1]`/`playerSprites = [m0, m1]` 배열 도입(슬롯별 `createSpriteMount('enemy'|'player', slot)` 호출, 슬롯 1은 depth +0.05). 호환 alias `this.enemySprite = this.enemySprites[0]` 유지. `_mountForBattleSideSlot(side, slot=0)`/`_mountsForBattleSide(side)`/`_allBattlerMounts()` 추가; 기존 `_mountForBattleSide`는 slot 0로 위임. `_emitTeraSparkles`/`_refreshBattlerSpritesForMetrics`/`update`/`layoutSafely`/`shutdown`이 모든 마운트 순회로 일반화.
   - `setBattlerSprite`/`Visibility`/`Terastallized`/`DynamaxState`/`playFormChange`/`playQuietFormChange`/`playTerastallize`/`playDynamaxStart`/`playDynamaxEnd`/`switchInBattler`/`playStatStageEffect`/`prepareSwitchInBattler`는 `options.slot`(0|1)을 읽어 슬롯 mount 선택. `faintBattler`/`concealBattler`는 `(side, slot=0)` 시그니처로 옵셔널 슬롯 추가. 기존 호출부는 `slot=0` 디폴트로 무영향.
   - `_resolveAnimEndpoints(userSide, targetSide, options)`/`playMoveAnim(..., options.actorSlot/targetSlot)`/`playFieldAnim(..., options.userSlot/targetSlot)`은 슬롯 옵션을 받지만 미지정 시 슬롯 0 폴백 — DB-3에서는 시각 회귀 0.
   - `src/pokerogue-transplant-runtime/ui/ui.js`: `attachSpriteMounts`가 단일 mount 또는 배열을 모두 수용. `layout()`이 `enemySprites[0..1]`/`playerSprites[0..1]` 각각의 baseX/baseY를 부여(`DOUBLES_MOUNT_OFFSET_X = 24` 임시값으로 슬롯 1 좌/우 분리). `renderModel()`이 어댑터의 `getSpriteModelsBySlot(side)`로 슬롯별 sprite model을 받아 각 마운트에 `renderBattlerToPhaser` 호출. 싱글 모델은 자동으로 `[enemySprite]`로 래핑되어 슬롯 0만 렌더.
   - `src/pokerogue-transplant-runtime/adapter/pkb-battle-ui-adapter.js`: `getSpriteModelsBySlot(side)` 신설(doubles의 `enemySprites`/`playerSprites` 배열 우선, 없으면 싱글 키를 [`single`]로 래핑).
   - `src/app.js`: `buildPkbPokerogueUiModel`에 `buildSpriteModelsForSide(sideIndex, perspective, activeMons, infoModel, battle, mountTag)` 헬퍼 추가, `battle.mode === 'doubles'`일 때 `enemySprites`/`playerSprites` 슬롯 배열을 모델에 spread. 싱글 경로(기존 `enemySprite`/`playerSprite` 키)는 무변경.
   - 검증: `node --check`(scene/ui/adapter/app) 모두 통과. `npm run verify:core` 9/9 PASS.
   - **남은 한계(다음 단계)**: BattleInfo 패널은 슬롯 0만 사용. 타임라인 이벤트/명령 입력/타깃 선택은 슬롯 0 가정 — DB-4/DB-5/DB-6에서 처리.
4. **DB-4 타임라인 슬롯 분기** ✅ 완료(2026-04-25):
   - `src/pokerogue-transplant-runtime/ui/ui.js`: `enemyInfos = [info0, info1]`/`playerInfos = [info0, info1]` 두 인스턴스로 확장. setup이 슬롯 1 인스턴스도 setup하고 rootContainer에 추가, depth 42 부여, 초기 상태 hidden. layout()은 슬롯 0 위치는 기존 유지(140,39 / 310,108), 슬롯 1은 (140,22 / 310,130) 임시 배치. `enemyInfo`/`playerInfo` alias는 슬롯 0 가리키도록 유지. `renderModel`이 `adapter.getInfoModelsBySlot('enemy'|'player')` 결과를 슬롯별로 update하고 모델 없는 슬롯은 setVisible(false)로 숨김.
   - `src/pokerogue-transplant-runtime/adapter/pkb-battle-ui-adapter.js`: `getInfoModelsBySlot(side)` 신설. 더블의 `enemyInfos`/`playerInfos` 배열 우선; 없으면 싱글 키를 [single]로 래핑.
   - `src/app.js`: `buildBattleInfosBySlot(player, activeMons, battle)` 헬퍼 추가, `battle.mode === 'doubles'`일 때 `enemyInfos`/`playerInfos` 슬롯 배열을 모델에 spread (slot 1 mon이 없으면 null로 두어 UI가 자동 hide).
   - `src/battle-presentation/timeline.js`:
     - `_infoForSideSlot(side, slot=0)` 신설(기존 `_infoForSide`는 `_infoForSideSlot(side, 0)`로 위임). UI의 `playerInfos[slot]`/`enemyInfos[slot]`을 우선, 없으면 단일 인스턴스 폴백.
     - `_applyInfoForSlot`이 `_infoForSideSlot(side, slot)`로 패널 갱신. `setBattlerTerastallized`/`setBattlerDynamaxState` 호출이 `options.slot`을 함께 넘겨 슬롯 0 가드 제거.
     - `_setBattlerSprite(side, spriteUrl, options)`은 옵션을 그대로 위임(DB-3.2의 `options.slot` 활용). `_playFormChangePresentation(side, presentation, slot=0)` 시그니처 확장 — 옵션에 slot 동봉.
     - 이벤트 핸들러 슬롯 전달: `switch_in`, `dynamax_start/end`, `move_use`(actorSlot/targetSlot), `damage`/`heal`(슬롯별 info HP tween), `faint(side, slot)`, `boost`/`unboost`(playStatStageEffect 슬롯), `terastallize`, `forme_change`, `effect_start/end`(substitute) 모두 `slot` 또는 `options.slot`을 명시 전달.
     - `playMoveAnim(actorSide, targetSide, { actorSlot, targetSlot, ... })`로 슬롯-쌍 endpoint 도달.
   - 검증: `node --check` (timeline/ui/adapter/scene/app) 통과. `npm run verify:core` 9/9 PASS.
   - DB-4 후속 핫픽스 ✅ 완료(2026-04-25):
     - `src/app.js`: 타임라인 switch-in 스프라이트 오버라이드를 `side` 단위에서 `side+slot` 단위로 분리(`timelineSpriteOverrides["p1_0"|"p1_1"|...]`). 초기 소환 pre-prepare/pre-hide도 슬롯 단위(`prepareSwitchInBattler(...,{slot})`, `concealBattler(side, slot)`)로 변경해 **슬롯 1 스프라이트가 슬롯 0/1에 중복 표시**되던 현상 제거.
     - `src/app.js`: `buildTimelineStaticInfoPatch()`에 HP/상태/exp 필드를 포함해 switch_in 이벤트 조건값이 일부 누락되더라도 더블 슬롯 패널이 안정적으로 정보 채움.
     - `src/battle-presentation/timeline.js`: info 패널 선택이 executor 고정 `playerSide`만 보지 않고 현재 scene `model.perspective`를 우선 사용하도록 보강(아군/적군 패널 매핑 안전화).
     - `src/pokerogue-transplant-runtime/ui/battle-info/player-battle-info.js`: doubles에서 아군 패널도 enemy형 mini 정보창으로 보이도록 `compact` 플래그 기반 mini 렌더 적용(HP 숫자/exp 바 숨김, mini 배경 사용). 후속으로 mini 내부 요소(이름/레벨/HP바/상태/타입 마커/아이콘 앵커) 좌표 관계를 EnemyBattleInfo 기준으로 동일하게 맞춤. HP 숫자 렌더 실패(숫자 atlas 지연/미존재) 시 캐시값 고정 문제와 `hpLabel` 파싱 fallback도 함께 보강.
     - `src/pokerogue-transplant-runtime/ui/battle-info/player-battle-info.js`: 아군 mini 타입 마커를 정보창 몸체 중심 기준 반대편(X 미러)으로 이동하고, Y 좌표는 기존 compact 값(-15.5/-2.5)을 유지. marker 텍스처 방향은 `setMini()` 내부 `typeIcons` 루프의 `icon.setFlipX(mini)`로 좌우반전.
     - `src/pokerogue-transplant-runtime/ui/ui.js`: `DOUBLES_INFO_GLOBAL_OFFSET` 상수 추가. 아군/적군 BattleInfo 4개 슬롯 좌표에 공통 가산해, 전역 1회 조정으로 전체 패널 위치를 함께 이동 가능하게 함.
     - `src/pokerogue-transplant-runtime/ui/ui.js` (2026-04-26): `doublesLayoutActive` 모드 분기 추가. 모델이 더블(슬롯 배열 2개)일 때만 더블 미세조정 좌표(`DOUBLES_INFO_POS`, `DOUBLES_MOUNT_OFFSET_X`, 슬롯0 x-bias)를 적용하고, 싱글은 legacy 좌표(`enemy/player info: 140,39 / 310,108`, sprite baseX `216/100`)를 유지하도록 복원. **싱글 화면이 더블 슬롯0 위치로 이동하던 회귀** 수정.
     - `src/pokerogue-transplant-runtime/ui/battle-info/player-battle-info.js` (2026-04-26): `PlayerBattleInfo.update()`에서 `setMini(compact)`를 `super.update()`보다 먼저 실행하도록 순서 조정. 첫 프레임부터 compact 타입 마커 텍스처/앵커가 적용되어, **초기 1프레임 잘못된 위치/텍스처로 나타난 뒤 뒤늦게 보정되던 현상** 수정. `compact` 판정은 `info.compact || ui.doublesLayoutActive`로 보강.
     - `src/pokerogue-transplant-runtime/scene/battle-shell-scene.js` (2026-04-26): `createSpriteMount()` depth bias를 진영별로 분기. 아군은 기존대로 슬롯1이 위(`slot1 > slot0`), 적군은 슬롯0이 위(`slot0 > slot1`)가 되도록 z-order만 조정(좌표 변경 없음).
   - UI 미세조정 포인트(나중에 수동 조정):
     - 전체 정보창 동시 이동: `src/pokerogue-transplant-runtime/ui/ui.js`의 `DOUBLES_INFO_GLOBAL_OFFSET` (`x`, `y`)
     - 진영/슬롯별 정보창 위치: `src/pokerogue-transplant-runtime/ui/ui.js`의 `DOUBLES_INFO_POS.enemy/player` (`x`, `slot0Y`, `slot1Y`)
     - 아군 mini 타입 마커 위치: `src/pokerogue-transplant-runtime/ui/battle-info/player-battle-info.js`의 `PLAYER_COMPACT_TYPE_OFFSETS`
     - 아군 mini 타입 마커 좌우반전 on/off: `src/pokerogue-transplant-runtime/ui/battle-info/player-battle-info.js` `setMini()` 내 `icon.setFlipX(mini)`
   - 브라우저 수동 확인 포인트:
     - 더블 시작 직후(명령 입력 전): 각 진영 슬롯0/슬롯1 스프라이트가 서로 다른 종으로 정상 표기되는지 확인.
     - 같은 구간에서 아군 정보창: 적군과 동일한 mini 형태(HP 숫자/exp 바 미표시)로 표기되는지 확인.
     - 첫 커맨드 단계 진입 후에도 슬롯별 스프라이트/정보창 매핑이 유지되는지 확인.
     - 더블 시작 직후(스프라이트 등장 전~등장 직후): 타입 마커가 처음부터 최종 위치/텍스처로 표시되는지(중간 점프 없음) 확인.
     - 더블 겹침 구간: 적군 스프라이트는 슬롯0이 슬롯1 위로, 아군 스프라이트는 슬롯1이 슬롯0 위로 렌더되는지 확인.
     - 더블 명령 입력: 슬롯0에서 기술/교체 확정 시 즉시 슬롯1 명령 화면으로 넘어가는지 확인(반대 방향도 동일).
     - 더블 토글 자원: 같은 사이드에서 슬롯0/슬롯1이 동시에 `테라/다이맥스/메가/울트라/Z` 활성화되지 않고, 마지막으로 켠 슬롯만 유지되는지 확인.
     - 싱글 시작 직후: 정보창/스프라이트가 기존 싱글 좌표(슬롯0 더블 좌표 아님)로 렌더되는지 확인.
   - **남은 한계(다음 단계)**: DB-7(더블 choice 직렬화/제출) 전까지 더블 자동 턴 해석은 의도적으로 비활성화 상태.
5. **DB-5 명령 흐름 슬롯화** ✅ 완료(2026-04-26):
   - `src/app.js`: `battleUi` 상태에 `modeByPlayerSlot`/`currentSlotByPlayer` 추가. 현재 입력 중인 액션 슬롯(요청 슬롯)을 기준으로 모드(`command/fight/party/target`)를 슬롯별로 보존.
   - `src/app.js`: `getBattleUiActionContext()`/`focusNextUncommittedBattleSlot()` 도입. 더블에서 **슬롯0 선택 완료 → 슬롯1 선택 화면 자동 전환** 흐름 구현.
   - `src/app.js`: `syncBattleUiState()`/`setBattleUiMode()`/`getBattleDisplayMode()`를 슬롯 기반으로 갱신. 강제교체(forceSwitch)는 미선택 슬롯에 `party` 강제 유지.
   - `src/app.js`: Phaser/DOM 윈도우 빌더(`buildPhaserCommand/Fight/Party/TargetWindowModel`, `buildBattleMessageModel`, `renderBattle*Window`)가 현재 슬롯 컨텍스트를 사용하도록 변경.
   - `src/app.js`: `dispatchPkbPokerogueUiAction()`가 현재 슬롯 대상에게 move/switch/toggle를 적용하도록 변경.
   - `src/app.js`: `toggleEngineDraftFlag()` 보강으로 더블에서 사이드 내 슬롯 간 `테라/다이맥스/메가/울트라/Z` 중복 활성화를 자동 해제(마지막 토글 슬롯 우선).
   - `src/app.js`: DB-7 이전 오동작 방지를 위해 `canAutoResolveEngineTurn()`에서 doubles 자동 턴 해석을 명시적으로 차단(직렬화/제출 경로 준비 후 해제).
   - `src/app.js`: 온라인 제출(`submitOnlineChoiceIfPossible`)은 싱글(액션 슬롯 1개)에서만 동작하도록 제한.
6. **DB-6 타깃 선택** ✅ 완료(2026-04-26):
   - `src/app.js`: `normalizeEngineMoveTargetHint()`/`resolveEngineMoveTargetSelection()`/`commitEngineMoveChoiceFromUi()` 추가. 더블에서 `single-opponent`/`ally`/`ally-or-self`만 명시 타깃이 필요하도록 판정하고, 후보를 슬롯 기준으로 생성.
   - `src/app.js`: move 선택 시 타깃이 필요한 기술은 즉시 커밋하지 않고 `target` 모드로 전환. 타깃 확정 후에만 `handleBattleChoiceCommitted()`가 실행되도록 분리.
   - `src/app.js`: `normalizeEnginePendingChoice()`가 `choice.target`을 더 이상 지우지 않도록 보정하고, 유효 타깃/자동 타깃(후보 1개)을 정규화. `isChoiceComplete()`도 더블의 명시 타깃 기술에서는 타깃까지 선택되어야 true.
   - `src/app.js`: Phaser/DOM `TargetWindow`가 placeholder에서 실제 후보 리스트 UI로 전환. 뒤로 가기는 command가 아니라 fight로 복귀하도록 수정.
   - `src/pokerogue-transplant-runtime/adapter/pkb-battle-ui-adapter.js`: target 전용 selection state/cursor 이동/submit/back 입력 해석 추가.
   - `src/pokerogue-transplant-runtime/ui/facade/global-scene-facade.js`: `getTargetSelectionState()`/`resolveTargetInput(currentCursor, button)` 시그니처 확장.
   - `src/pokerogue-transplant-runtime/ui/handlers/target-select-ui-handler.js`: 타깃 목록 렌더 + 커서 이동 + ACTION 선택 동작 구현(기존 Back-only placeholder 제거).
   - 검증: `node --check`(app/adapter/facade/target-handler) 통과, `npm run verify:core` PASS.
   - 브라우저 수동 확인 포인트:
     - 더블에서 단일 대상 기술 선택 시 타깃 창이 열리고, 상대 슬롯 1/2 후보가 표시되는지 확인.
     - 더블에서 `ally-or-self` 기술(예: Helping Hand 계열) 선택 시 자신/아군 후보가 함께 뜨고 선택 결과가 pending summary에 반영되는지 확인.
     - 더블에서 후보가 1개뿐인 경우(예: 상대 1마리만 생존) 타깃 창 없이 자동 타깃으로 바로 커밋되는지 확인.
     - 싱글에서는 기존처럼 타깃 창으로 들어가지 않고 move 선택 즉시 커밋되는지 확인.
7. **DB-7 choice 직렬화/제출**: `serializeChoiceForShowdown`에 target slot/`,` 합본/사이드별 두 슬롯 묶음 추가. 로컬 엔진 첫 턴 정상 해석 확인.
8. **DB-8 forceSwitch 듀얼 슬롯**: 두 슬롯 동시 기절 시 forceSwitch 양쪽 처리. 한쪽만 기절 시 한 슬롯만 입력.
9. **DB-9 회귀/검증**: 싱글 시나리오 회귀 + 더블 핵심 무브 시나리오(스프라이트 지정 무브, ally-target 무브, 광역 무브, 보호/대타) 단위.
10. **DB-10 온라인 더블 분리**: `OnlineRoomService`/online.html 토글. 별도 PR.

### 9.10 검증 전략

- 정적: 변경 파일별 `node --check`.
- 회귀 묶음: `npm run verify:core` (item-manifests/audit-language/ba20/stage22/passb).
- 신규 더블 회귀(권장 추가):
  - `verify:doubles-smoke` — 더블 포맷 시작 → 첫 턴 양쪽 단일 무브 → 정상 turn 진행 → 양쪽 기절/forceSwitch까지의 미니 시뮬레이션(샘플 팀 고정).
  - 무브 타깃 카테고리별 직렬화 단위 테스트(`single-opponent`/`adjacentAlly`/`alladjacentfoes`/`all`/`self`).
  - `playMoveAnim` 슬롯-쌍 endpoint 회귀(스냅샷 텍스트로 user/target 좌표 기록).
- 수동 시나리오:
  - 더블에서 한 슬롯이 보호 사용/다른 슬롯이 광역 무브 사용 → 보호 슬롯만 데미지 0 확인.
  - Helping Hand(`adjacentAlly`) 자기 슬롯에는 disabled 표시 확인.
  - 다이맥스/테라/메가/Z를 사이드 내 한 슬롯에서만 토글 가능함을 확인.
  - 한쪽만 기절 시 다음 턴 forceSwitch가 정상 슬롯에만 표시.

### 9.11 본 분석에서 다루지 않은 / 결정 보류

- 풀팀(6) + 더블의 풀 파티 선택(team preview) 흐름 도입 여부. 1차는 4 고정. - 그렇게 하자.
- 트리플/멀티/FFA 미지원(범위 제외). - 그렇게 하자.
- 더블 전용 BGM/효과음 큐 차이 검토(현재 BGM 트랙 풀 그대로 사용 가능). -그렇게 하자.
- PokeRogue 원본 더블 좌표 정확 측정(임시값으로 시작 후 추후 미세조정). -거시적 위치는 원본을 사용하고 세부 위치는 우리가 싱글에서 정리한 걸로 하면 될 듯.
