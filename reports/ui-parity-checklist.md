# M0 UI Parity Checklist (PKB vs PokeRogue)

Date: 2026-04-12 (UTC)

## Scope
- Focus: party/summary chain and turn-presentation entry points required by the plan.
- Goal: lock parity gaps before implementation.
- Constraint: no runtime code implementation in this phase.

## Evidence
- PKB runtime/UI:
  - `src/pokerogue-transplant-runtime/ui/ui-mode.js`
  - `src/pokerogue-transplant-runtime/ui/ui.js`
  - `src/pokerogue-transplant-runtime/adapter/pkb-battle-ui-adapter.js`
  - `src/pokerogue-transplant-runtime/ui/handlers/party-ui-handler.js`
  - `src/app.js`
- PokeRogue reference:
  - `pokerogue_codes/src/enums/ui-mode.ts`
  - `pokerogue_codes/src/ui/handlers/party-ui-handler.ts`
  - `pokerogue_codes/src/ui/handlers/summary-ui-handler.ts`
  - `pokerogue_codes/src/ui/ui.ts`

## Checklist

| Checkpoint | PKB current state | PokeRogue baseline | Gap | M0 decision |
|---|---|---|---|---|
| `UiMode` has `SUMMARY` | 없음 (`MESSAGE/COMMAND/FIGHT/TARGET_SELECT/PARTY` only, `ui-mode.js:1-7`) | 있음 (`UiMode.SUMMARY`, `enums/ui-mode.ts:1-11`) | High | `SUMMARY`를 정식 모드로 추가 (필수). |
| mode alias supports `summary` | 없음 (`MODE_ALIASES`에 `summary` 미포함, `ui-mode.js:11-18`) | N/A (enum direct) | Medium | alias + normalize 경로 추가. |
| handler registry includes summary handler | 없음 (`ui.js:36-40` 5개 핸들러만 등록) | 있음 (`SummaryUiHandler` 클래스 존재, `summary-ui-handler.ts:67`) | High | summary handler 등록 필수. |
| PARTY -> SUMMARY 진입 경로 | 없음 (PKB party slot action은 `switch`만 생성, `app.js:6426`) | 있음 (`processSummaryOption`에서 `setModeWithoutClear(UiMode.SUMMARY, pokemon)`, `party-ui-handler.ts:389`) | High | party option 모델을 submenu 기반으로 확장. |
| SUMMARY -> PARTY 복귀 경로 | 없음 (SUMMARY 모드 자체 부재) | 있음 (cancel 시 PARTY 복귀, `summary-ui-handler.ts:647`) | High | `PARTY <-> SUMMARY` 체인 규칙 고정. |
| mode chain infra (`setModeWithoutClear`, revert) | 있음 (`ui.js:164-181`) | 있음 | Low | 기존 infra 재사용, summary 체인에 적용. |
| party input handler action 유연성 | 있음 (`option.action` dispatch, `party-ui-handler.js:372`) | 있음 | Low | 모델만 확장하면 handler는 재사용 가능. |
| party adapter cursor/action 구조 | 있음 (`resolvePartyInput`, `pkb-battle-ui-adapter.js:555+`) | 있음 | Low | cursor/submit/cancel 로직은 유지. |
| app-level mode whitelist includes summary | 없음 (`['message','command','fight','party','target']`, `app.js:5550`) | N/A | High | `summary` 모드 허용 필요. |
| app-level state-window builder supports summary | 없음 (`command/fight/party/target`만 분기, `app.js:6467-6470`) | 있음 (summary handler 기반 렌더) | High | summary state model builder 추가. |
| app action dispatcher supports summary action | 직접 경로 없음 (`command/fight/party` 전환만, `app.js:6519+`) | 있음 (party option->summary) | High | `open-summary`, `close-summary` 액션 체계 필요. |
| input SFX (`playSelect/playError`) | stub (`return false`, `ui.js:128-133`) | 실제 재생 (`ui/select`, `ui/error`, `ui.ts:480-485`) | Medium | audio manager 연결 필수. |
| battle message action tags (`@d/@s/@c/@f`) | 미구현 (`message-ui-handler` 단순 텍스트) | 사용됨 (원본 메시지 시스템) | Medium | V1에 `@d/@s` 우선 도입. |
| turn resolve lock (`battle.resolvingTurn`) | 있음 (`app.js:6771-6796`) | phase-driven 큐 기반 | Low | 연출 실행기에서도 lock 유지. |

## Party/Summary Parity Findings (detail)

1. PKB는 현재 “교체 전용 party 화면”이다.
- `buildPhaserPartyWindowModel`이 슬롯 액션을 `switch` 단일 타입으로 생성 (`app.js:6426`).
- footer도 `Back`만 존재 (`app.js:6429`).
- 즉, “요약/능력치 확인” 진입 트리거가 없다.

2. PokeRogue는 party 옵션 체계에 `SUMMARY`가 포함된다.
- 기본 옵션 목록에 `PartyOption.SUMMARY` 포함 (`party-ui-handler.ts:254`, `1423`).
- 선택 시 `UiMode.SUMMARY`로 전환 (`party-ui-handler.ts:389`).
- summary 취소 시 party로 복귀 (`summary-ui-handler.ts:647`).

3. PKB transplant 인프라는 summary 이식에 필요한 기반을 이미 갖고 있다.
- `setModeWithoutClear`/`revertMode` 존재 (`ui.js:164-181`).
- party handler는 `option.action` 중심이라 액션 타입 확장에 유리 (`party-ui-handler.js:372`).
- adapter도 party 선택/취소 처리가 일반화돼 있음 (`pkb-battle-ui-adapter.js:555+`).

4. 즉시 구현 블로커는 “기반 부재”가 아니라 “모드/모델 미연결”이다.
- `UiMode.SUMMARY` 정의, handler 등록, app-level model/action 분기만 추가되면 체인 구성 가능.

## Locked Decisions for Next Phase (implementation input)

1. `PARTY -> SUMMARY -> PARTY`를 원본과 동일하게 1차 parity 목표로 고정한다.
2. party는 단일 slot-click switch UX를 폐기하지 않고, 상황별 옵션 레이어(교체/요약/취소)를 추가하는 방향으로 확장한다.
3. `battle.resolvingTurn` 동안 summary 진입 허용 여부를 mode rule로 명시한다.
- 기본안: turn resolving 중 신규 overlay 진입 차단, 이미 열린 summary는 cancel만 허용.
4. UI 입력 사운드는 반드시 `ui/select`, `ui/error`로 복원한다.
5. 메시지 액션 태그는 V1에서 `@d/@s` 우선, `@c/@f`는 2차.

## M0 Gate Result

- Party/Summary parity gap은 식별 완료 및 원인 분해 완료.
- 구현 단계에 필요한 설계 결정(모드 체인/액션 경로/lock 정책) 고정 완료.
- 본 단계에서 코드 구현은 수행하지 않았다.

