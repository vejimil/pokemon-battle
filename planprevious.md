# PKB Battle Presentation 완료 이력 아카이브

Last updated: 2026-04-20
Target: `/workspaces/pokemon-battle`

이 문서는 완료된 작업(마일스톤/BA)을 보관하는 아카이브다.  
현재 진행 계획은 `plan.md`를 기준으로 관리한다.

---

## 1) 완료 마일스톤

| 항목 | 내용 | 완료일 |
|---|---|---|
| M0 | 원본 인벤토리/갭 분석 | 2026-04-12 |
| M1 | 이벤트 스키마 도입 (`event-schema.js`) | 2026-04-12 |
| M2 | Showdown protocol → event 추출 (`showdown-engine.cjs`) | 2026-04-12 |
| M3 | Timeline Executor 도입 (`timeline.js`) | 2026-04-12 |
| M4 | Audio Manager 도입 (`audio-manager.js`) | 2026-04-13 |
| Sprint 3 | 배틀 메시지/울음소리/어빌리티 바/날씨/지형 | 2026-04-13 |
| Sprint 4 | 상태이상/스탯/빗나감/행동불가 + 버그픽스 | 2026-04-13 |
| Sprint 5 | immune/fail/callback/battle_end + BA-10(기술 애니) | 2026-04-14 |
| Sprint 6 | BA-11/12/13 배틀러 시각 연출 | 2026-04-15 |
| UX-DS1 | P1/P2 동시 멀티뷰 + 입력 분리 | 2026-04-15 |
| M5 | locale namespace 로더 | 2026-04-16 |

---

## 2) 완료 BA 이력 (요약)

### 2026-04-15
- `BA-11` 배틀러 USER/TARGET/GRAPHIC 복사본 애니메이션 경로 보강
- `BA-12` faint 슬라이드 연출 (`faintBattler`)
- `BA-13` switch_in 포켓볼 arc + fadeIn
- `BA-15` forme_change 메시지 연출 정합
- `BA-18` switch_in 시 정보창 즉시 반영
- `BA-19` forme_change 시 sprite/info 즉시 반영

### 2026-04-16
- `BA-20` FormChangePhase/QuietFormChangePhase 분기 이식
- `BA-14` 사이드 컨디션 메시지/연출
- `BA-17` 타임라인 타이밍(메시지/애니 완료 await 중심) 정합
- `BA-21` 선택 완료 후 waiting 메시지 정합
- `BA-22` 한국어/영어 메시지 완전 분리 + 포켓몬/기술명 로컬라이즈 연동

### 2026-04-17
- `BA-27` 타임라인 재생 중 선택 입력 블록
  - 시작 잠금/완료 해제 (`ui.inputLocked`)
  - 렌더 모드 message 강제 (`getBattleDisplayMode`)
  - 선택 커밋 가드 (`handleBattleChoiceCommitted`)
- `BA-26` 배틀 내 폼체인지 표시명 고정
  - UI/정보창/선택창: base species 고정
  - 폼체인지 메시지: form-aware 이름 복원
- `BA-27` 후속 회귀 안정화
  - 증상: 기술 전에 HP/스프라이트 선반영, 기절 전에 sprite 소실
  - 수정:
    - 중간 턴 `prepareSwitchInBattler()` 선호출 제한(초기 소환 경로 전용)
    - `switch_in` 이벤트 시점 sprite 교체 강제
    - `forceBattleMessageOnlyUiDuringLock()`로 잠금 직후 선택창 즉시 숨김

---

## 3) 주요 검증 커맨드 이력

- `node --check src/app.js`
- `node --check src/battle-presentation/timeline.js`
- `npm run verify:stage22`
- `npm run verify:passb`
- (BA-20 당시) `npm run verify:ba20`

최근(2026-04-17) 기준 위 커맨드들은 PASS 상태.

---

## 4) 참고

- 현재 진행/할 일: `plan.md`
- 프로젝트/아키텍처/정책: `CLAUDE.md`

---

## 5) 2026-04-19 ~ 2026-04-20 완료 BA 이력 (신규 이관)

### 2026-04-19
- `BA-25` 다이맥스 구현 완료
  - `-start/-end ... Dynamax` 이벤트 구조화
  - timeline에서 시작/종료 연출 + info patch 연결
  - 씬 스케일/상태(`dynamaxed`, `gigantamaxed`) 동기화
- `BA-25` 후속 안정화
  - 버튼/요청 해석 보정, Max/G-Max 표시/연출 fallback
  - 거다이맥스 가능 종 자동 강제 경로 정리
  - 즉시 KO 턴 테라/폼 시각 상태 유지 보정
- `BA-23` 기술/날씨/필드 연출 완성 및 후속 보강
  - `focus=SCREEN` 좌표계 정합
  - weather/terrain common 연출 연결
  - timed BG/add-update, USER/TARGET, no-graphic 애니 처리 복원
  - terrain 지속 배경/배열형 anim variant/oppAnim 규칙 반영

### 2026-04-20
- `BA-28` 한/영 명칭 분리 1차 완료
  - `src/i18n-ko-locales.js` 생성(locale 기반 species/moves/abilities 추출)
  - `return102`/`frustration102` 정규화
  - `ability_show` 메시지/바 로컬라이즈 연결
- `BA-28` 한/영 완결도 2차 완료
  - `FORM_SUFFIX_TRANSLATIONS` 누락 6종 보강:
    - `Droopy`, `Stretchy`, `Roaming`, `Artisan`, `Masterpiece`, `Terastal`
  - 언어 감사 스크립트 추가:
    - `scripts/audit-language-completeness.mjs`
    - 결과 리포트 `reports/language-completeness-audit.json`
    - 누출 결과 `species/moves/abilities/items = 0`
- 스프라이트/아이템 감사
  - `scripts/audit-missing-sprites.mjs`, `reports/missing-sprite-audit.json`
  - `scripts/audit-item-sprites.mjs`, `reports/item-sprite-audit.json`
- 도구 스프라이트 보강
  - standard 9 + future 2 반영 확인
  - 아이콘 해석을 manifest 인덱스 우선으로 전환(`src/pokerogue-assets.js`)
  - `assets/pokerogue/items/manifest.json` 신규 생성, `assets/manifest.json` 동기화
- 아이템 한글화 마감 보정
  - `Loaded Dice` → `속임수 주사위`
  - ZA 신규 메가스톤 영문 누출 시 `<종족명>나이트` fallback 표시(예: `Emboarite`)
- 스프라이트 미할당 폼 정책 반영
  - `FORM_ASSET_OVERRIDES`에 Totem/사이즈/진품/캡폼 fallback 명시
  - 감사 결과 `unresolvedRenderableCount: 33 -> 0`
- 스프라이트 품질 보강 2차(부분)
  - Pikachu cap/cosplay 전용 번호 에셋 매핑:
    - `Pikachu-Cosplay -> PIKACHU_2`
    - `Pikachu-Original/Hoenn/Sinnoh/Unova/Kalos/Alola/Partner/World -> PIKACHU_8~15`
- 아이템 manifest 자동화/검증 스크립트 추가
  - `scripts/build-item-manifests.mjs`
  - `scripts/verify-item-manifests.mjs`
  - `package.json` 스크립트(`build:item-manifests`, `verify:item-manifests`) 등록
- 검증 루틴 묶음 추가
  - `package.json`: `audit:language`, `verify:core`
  - `verify:core`:
    - `verify:item-manifests`
    - `audit:language`
    - `verify:ba20`
    - `verify:stage22`
    - `verify:passb`

---

## 6) 2026-04-19 ~ 2026-04-20 검증 요약

- `node --check src/app.js` PASS
- `node --check src/battle-presentation/timeline.js` PASS
- `node --check src/pokerogue-transplant-runtime/scene/battle-shell-scene.js` PASS
- `node --check src/i18n-ko-locales.js` PASS
- `node --check src/pokerogue-assets.js` PASS
- `node --check src/battle-constants.js` PASS
- `node --check scripts/audit-language-completeness.mjs` PASS
- `npm run audit:language` PASS
- `npm run verify:item-manifests` PASS
- `npm run verify:core` PASS
- `npm run verify:ba20` PASS
- `npm run verify:stage22` PASS
- `npm run verify:passb` PASS

---

## 7) 2026-04-25 ~ 2026-04-29 더블배틀 (DB-1 ~ DB-8.5, DB-10) + 부수 수정 이관

plan.md 정리(2026-05-01)로 이관. DB-9(회귀/검증)만 plan.md에 남김.

### 7.1 DB-6 수정사항 (2026-04-26 완료)
1. 더블에서만 수동 타겟 선택이 뜸. single-opponent, ally, ally-or-self 기술만 대상 선택 모드로 진입.
   (src/app.js:6693, src/app.js:6834)
2. 후보가 1개면 자동 타겟으로 바로 커밋. 후보가 여러 개면 타겟 창이 열림. (src/app.js:6786)
3. 타겟 창(Phaser)에서 방향키/패드 이동 + A 선택 + B 취소(뒤로). (src/pokerogue-transplant-runtime/ui/handlers/target-select-ui-handler.js:24, src/pokerogue-transplant-runtime/adapter/pkb-battle-ui-adapter.js:644)
4. "뒤로"는 command가 아니라 fight로 돌아감. (src/app.js:9056)
5. DOM fallback UI도 placeholder가 아니라 실제 타겟 카드 목록으로 변경. (src/app.js:8523)
6. DB-6 UI 미세조정(2026-04-26):
   - 배틀 UI 슬롯 표기(`슬롯 1/2`) 제거, 포켓몬 이름 중심으로 표시.
   - Phaser target-select 상단 보조창 제거, 하단 단일 창에 선택지+뒤로를 세로 목록으로 통합.
   - target-select에서 기술명을 반복 표시하지 않고 선택지와 `뒤로`만 노출.
7. DB-6 target/party 추가 UI 조정(2026-04-26):
   - target-select 진입 시 뒤의 가로 메시지창 숨기고 창 위치/크기를 fight move-info 패널과 동일(80x48)하게 정렬.
   - target-select 리스트 텍스트 중앙 정렬 + 행간/행 간격 확대.
   - party UI에서 더블 슬롯2 BattleInfo가 남아 오버레이되던 문제 수정.
8. DB-6 target-select 재조정(2026-04-26):
   - 왼쪽 moves 창은 유지, 오른쪽 상세 pane만 숨김.
   - 텍스트/행 Y를 소폭 상향(약 2px).
9. DB-6 target-select 보완(2026-04-26):
   - 왼쪽 moves 창에 타깃 질문 문구 복원(locale fallback `누구에게 기술을 사용할까?`).
   - 더블 타깃 후보 계산에서 `normal/any/selected-pokemon` 계열을 `any-adjacent`로 처리해 아군도 선택 목록에 노출.
10. DB-6 target-select 2x2 배열 조정(2026-04-26):
    - 타깃 목록(대상 + 뒤로)을 세로 리스트 대신 2열 x 2행 그리드로.
    - 방향키 이동을 2열 그리드 기준으로.
11. DB-6 target-select 추가 보완(2026-04-26):
    - 2x2 그리드를 창 중앙 정렬, 커서를 텍스트에서 소폭 더 이격.
    - 전체기 타깃 규칙 분리: `all-other-pokemon`(지진/파도타기)은 즉시 커밋, `all-opponents`(스톤샤워/열풍)는 `상대 전체` vs `아군 1명` 선택지로 진입.
12. DB-6 party overlay 복원 버그 수정(2026-04-26):
    - party UI 진입 시 visible 상태를 `mount.dom.visible`(미정의) 대신 `mount.phaserSprite.visible`까지 fallback으로 저장하도록 수정.

UI 미세조정 포인트(나중에 디자인만 손볼 때):
- 레이아웃/좌표/행 간격/커서 위치: `src/pokerogue-transplant-runtime/ui/handlers/target-select-ui-handler.js:24`
- 타겟 행 개수, 폰트/컬러/포커스 색상: 위 파일 :40, :86
- 타겟 창 데이터 형태(title, placeholder, targets, footerActions): `src/app.js:9009`, `src/pokerogue-transplant-runtime/adapter/pkb-battle-ui-adapter.js:632`
- DOM 카드 스타일/문구: `src/app.js:8523`

### 7.2 2026-04-27 핫픽스
- 싱글/더블 공통: 타임라인 재생 중 `renderBattle()`이 호출되더라도 최종 스냅샷으로 Phaser 전체 모델을 다시 렌더하지 않도록 차단(폼체인지/기절/데미지 이벤트 전 HP·기절·스프라이트 최종 상태 선반영 회귀 방지). `src/app.js:renderBattle`
- 더블 miss 메시지: target 없는 miss(스톤샤워/광역기/일부 빗나감 로그)가 actor 자신에게 맞지 않은 것처럼 보이지 않도록, 타깃이 없거나 actor와 같으면 "공격이 빗나갔다" 메시지. `src/battle-presentation/timeline.js`
- command UI: 테라스탈 버튼/토글은 command 창에서 노출하지 않고 fight UI에서만 유지(DOM command chip 제거, Phaser command model `teraToggle: null`). `src/app.js`, `src/pokerogue-transplant-runtime/ui/handlers/command-ui-handler.js`
- Commander/강제 연속 행동 UI 스킵:
  - `commanding` 슬롯 탐지를 `engineOrderIndex`뿐 아니라 `teamIndex` fallback까지 보강.
  - 자동 pass/강제 단일 무브 완료 슬롯은 "행동 필요" 목록에서 제외.
  - 솔라빔류 차지 후속턴, 기가임팩트류 recharge, Commander pass도 같은 경로로 message 상태 유지.
  - 추가 보강(2026-04-27): 사령탑 발동 턴에는 `commander_activate` 이벤트 자체를 근거로 싸리용 슬롯 즉시 pass 처리. 이미 완료된 슬롯이 `currentSlotByPlayer`에 남아도 첫 미완료 슬롯으로 강제 재지정.
- Commander 스프라이트 복원 + party UI: forced switch party UI가 열린 상태에서 타임라인이 싸리용 스프라이트를 복원하면 party 종료 시 복원 visibility가 false로 되돌아가지 않도록 overlay restore 상태 갱신. `src/pokerogue-transplant-runtime/ui/handlers/party-ui-handler.js`
- 검증: `node --check src/app.js src/battle-presentation/timeline.js src/pokerogue-transplant-runtime/ui/handlers/party-ui-handler.js src/pokerogue-transplant-runtime/ui/handlers/command-ui-handler.js` PASS, `npm run verify:core` PASS.

### 7.3 2026-04-27 배틀러 그림자 추가
- 적군(enemy mount) 배틀러에만 Phaser ellipse 그림자를 활성화.
  - 위치는 PBS shadow offset을 무시하고 `mount.baseX`, `mount.baseY + 10`에 고정.
  - 크기는 기존 PBS/DBK shadow size 계산(`ShadowSize`, sprite scale, frame size) 사용.
  - 아군(player mount) 그림자는 계속 숨김.
- 표시 조건:
  - `currentUrl`이 있는 실제 스프라이트가 로드되고, sprite가 visible이며, faint 상태가 아닐 때만 그림자 visible.
  - switch-in 볼 연출에서는 스프라이트 fade-in과 그림자 fade-in을 같이 시작.
  - faint/conceal/party overlay/sprite clear 경로에서는 그림자도 함께 숨김.
  - `src/pokerogue-transplant-runtime/scene/battle-shell-scene.js`
- 검증: `node --check src/pokerogue-transplant-runtime/scene/battle-shell-scene.js` PASS.

### 7.4 2026-04-29 턴/정보바 표시 정리
- 턴 표시 제거: DOM 배틀 화면 상단 턴 배지 제거(`index.html`, `online.html`, `styles.css`), Phaser UI 모델의 미사용 `turnChip` 제거 및 DOM `turn-number` 갱신 경로 제거(`src/app.js`), 서버 로그 정규화에서 `|turn|` 라인을 화면 로그로 만들지 않도록 변경(`server/showdown-engine.cjs`, `src/app.js`).
- 정보바 표시 제한: DOM fallback flyout과 Phaser `AbilityBar` 모두 `accent` 로그 전체를 정보바로 올리던 경로 제거. `ability_show`/`-ability`/`특성` 로그만 정보바에 표시, 표시 문구는 특성명만.
- 검증: `node --check src/app.js`, `node --check server/showdown-engine.cjs`, `npm run verify:core` PASS.

### 7.5 2026-04-29 더블배틀 빠른 연출 1차 구현
- 사용자 각주 반영 문서: `docs/double-battle-fast-timeline-plan.md`
- 구현 범위:
  - 더블배틀(`battle.mode === 'doubles'`)에서만 fast timeline 배치 재생 활성화.
  - 날씨 피해와 광역기 plain damage만 HP 동시 tween 처리.
  - 같은 hit result 메시지는 대상명을 묶어 1회 표시, super/not_very 등 서로 다른 결과는 순차 표시.
  - 광역기 `immune` 연속 이벤트도 대상명을 묶어 `효과가 없는 것 같다`를 1회 표시.
  - `critical`과 `super`/`not_very`가 동시에 붙은 피해는 급소 메시지와 효과 메시지를 모두 표시.
  - 더블배틀 hit result는 대상이 1마리여도 대상명 표시, 아군 대상은 `아군 000`으로.
  - 같은 플레이어가 동시에 내보내는 2마리 `switch_in`은 플레이어별로 묶어 메시지 1회 + 볼 연출 동시 실행.
  - 울음소리는 모든 대상에 동시에 재생하되 타임라인 진행을 기다리지 않음.
  - `src/battle-presentation/timeline.js`, `src/app.js`

### 7.6 §9 더블배틀 구현 — 분석 및 단계별 계획 (DB-1 ~ DB-8.5, DB-10 완료)

작업 일자: 2026-04-25 ~ 2026-04-29
대상 모드: `gen9doublescustomgame@@@+pokemontag:past,+pokemontag:future` (단일 포맷, gameType=`doubles`).
원칙: **싱글 경로 무회귀**.

#### 9.0 현재 상태 요약(분석 결과)

이미 더블 친화적인 부분:
- 프로토콜 파서 `parseIdentForEvent`(`server/showdown-engine.cjs:550`)는 `p1a/p1b` → slot 0/1로 분해.
- 스냅샷 `side.active`/`request.active` 배열, `getEngineActionSlots`/`getActionableSides`는 길이 무관 동작 가능.
- `pruneEnginePendingChoices`/`seedEngineForcedPendingChoices`/`normalizeEnginePendingChoice`/`getEngineDraftChoice` 등 슬롯 단위 분기됨.
- 타임라인 슬롯 키(`_slotNames`/`_slotInfo`)는 이미 `${side}_${slot}` 사용.
- 빌더 모드 토글 및 팀 사이즈 4 전환 구현됨.
- `PartyUiHandler`/adapter는 `battlerCount` 인자 인식, `buildPhaserPartyWindowModel`이 더블에 2 전달 중.
- 어댑터(`PkbBattleUiAdapter`)와 `TargetSelectUiHandler` 자리만 있는 상태.
- `@pkmn/sim`에 `gen9doublescustomgame` 포맷 존재.

핵심 갭(슬롯 0 가정으로 깨지는 지점):
1. 엔진/룸/브리지가 모드 인자를 무시하고 항상 싱글 포맷, 클라가 보내는 choice 명령이 "슬롯 0 한 개"만.
2. 씬 마운트가 side당 1개뿐, 좌표/그림자/테라/다맥스 상태가 mount 1개 가정.
3. BattleInfo 패널이 side당 1개, `_infoForSide(side)`는 슬롯 무시.
4. 애니메이션 endpoint가 단일 user/target 좌표만 계산.
5. UI 윈도우 빌더가 `actionSlots[0]`만 사용.
6. 타깃 선택 UI가 placeholder.
7. Showdown choice 직렬화가 단일 액션 문자열만 반환.
8. 온라인 룸 서비스가 사이드당 한 문자열만 저장(=한 슬롯).
9. 빌더 사이즈 정책: 기본 4마리(룰 부합).

#### 9.1 정책 결정
- 더블 기본 팀 사이즈: 4 (1차 구현 4 고정).
- 더블 포맷 ID: `ENGINE_AUTHORITATIVE_DOUBLES_FORMAT = 'gen9doublescustomgame@@@+pokemontag:past,+pokemontag:future'`.
- 다이맥스/Z/메가/테라: 사이드당 1회는 드래프트 단계 토글이 사이드 전체에서 한 슬롯에만 켜지도록 정규화.
- 포지셔닝: 1차는 좌-안쪽/우-바깥쪽 두 좌표 사전 정의로 시작.
- 온라인 더블은 §9.7에서 분리 진행.

#### 9.2 엔진 / 서버 / 브리지 (gameType=doubles)
- `server/showdown-engine.cjs`: `ShowdownLocalDoublesSession` 도입(또는 클래스 일반화 + `mode` 필드). `engineMeta.supportsDoubles = true`. `startDoubles`/`chooseDoubles` 추가(또는 `startBattle({mode})`).
- `server/server.cjs`: `/api/battle/start`가 `mode`/`formatid` 분기.
- `server/online-room-service.cjs`: `room.settings.mode`, `createRoom`/`joinRoom`이 mode 인자 수신, `submitChoice`가 슬롯 합본 문자열 수용.
- `src/engine/showdown-local-bridge.js`: `serializeChoiceForShowdown(choice, request, {gameType})` 시그니처 확장. 더블 `move`: `move N TARGET`(상대 1/2, 아군 -1/-2). 두 슬롯 합본 빌더 `buildSideChoiceForDoubles`. wait/forced-switch는 "pass".
- `src/engine/showdown-online-room-bridge.js`: 호출부에서 사이드별 합본 문자열 단일 호출.

#### 9.3 클라이언트 상태/팀빌더 / 시작 흐름
- `src/app.js`: `state.mode === 'doubles'` 분기 정리. `getEngineAuthoritativeDoublesRuntimeDescriptor()` 추가. `buildShowdownBattlePayload()`가 mode 기반 formatid. `startBattle()` 게이트 확장. `state.battleUi`에 `modeByPlayerSlot`/`currentSlotByPlayer` 추가. `submitOnlineChoiceIfPossible(player)`은 더블에서 양쪽 슬롯 결정 시 1회 합본 호출.
- `src/battle-constants.js`: `ENGINE_AUTHORITATIVE_DOUBLES_FORMAT` 추가.

#### 9.4 씬/스프라이트/애니메이션 (side당 두 슬롯 마운트)
- `src/pokerogue-transplant-runtime/scene/battle-shell-scene.js`: `enemySprites = [m0, m1]`/`playerSprites = [m0, m1]`. 단축 alias 유지. `_mountForBattleSideSlot(side, slot)`/`_mountsForBattleSide(side)`. 모든 setBattler/play 시그니처 `(side, slotOrOptions, ...)` 확장. `_resolveAnimEndpoints(userSide, userSlot, targetSide, targetSlot)`. `playMoveAnim(moveName, actorSide, actorSlot, targetSide, targetSlot, opts)`. `DOUBLES_MOUNT_OFFSET_X` 좌표 상수.
- `src/pokerogue-transplant-runtime/runtime/sprite-host.js`: 슬롯 인자 통과.
- `src/pokerogue-transplant-runtime/ui/ui.js`: `attachSpriteMounts({enemy:[m0,m1], player:[m0,m1]})`. `enemyInfos[0..1]`/`playerInfos[0..1]` 도입.

#### 9.5 프레젠테이션 타임라인 (slot-aware 분기)
- `src/battle-presentation/timeline.js`: `_infoForSideSlot(side, slot)`, `Number(slot) === 0` 가드 일반화. 모든 이벤트 핸들러가 `(side, slot)` 기반. `move_use`에서 `playMoveAnim(actorSide, actorSlot, targetSide, targetSlot)`. `callback_event`(forced switch) 슬롯 정보 전달.

#### 9.6 입력 흐름 / UI / 타깃 선택
- `src/app.js`의 빌더들: `actionSlots[0]` 대신 `currentSlotByPlayer[player]` 사용. 슬롯 0 → 슬롯 1 단계 진행 상태머신. 사이드 자원 토글 단일성.
- `buildPhaserTargetWindowModel`: `targets: [{label, side, slot, disabled, action}]` + `kind`. move target 힌트로 후보 산출.
- `target-select-ui-handler.js`: 후보 리스트 + 커서 + 십자키 이동 UI.
- `pkb-battle-ui-adapter.js`: `getTargetInputModel`/`resolveTargetInput` 확장.
- `command-ui-handler.js`/`fight-ui-handler.js`: `fieldIndex=1`일 때 `cursor2` 활용.
- `party-ui-handler.js`: 더블 타이틀/서브타이틀 보강.

#### 9.7 온라인 룸 (분리 단계)
- `OnlineRoomService`/`server.cjs` API에 `mode` 추가, `room.settings.mode` 저장.
- 사이드별 choice는 슬롯 N개 합본 문자열.
- `online.html` 모드 선택 UI 토글 노출.

#### 9.8 위험 요소 / 회귀 방지 가드
- 싱글 회귀 차단: `playXxx(side, ...)` 시그니처 확장은 `slot` 옵셔널(기본 0). 마운트 배열 alias 유지. 싱글 경로 빌더 무변경 동작.
- 더블 가드: 사이드 자원 동시 켜짐 방지. target 미지정+요구 무브 submit 차단. `cant_move`/`forceSwitch` 슬롯별 상태머신.
- 애니메이션 회귀: `playMoveAnim` 광역 무브 단일 target 폴백. `playFieldAnim` mount0 기준.

#### 9.9 단계별 마일스톤(완료 기록)

1. **DB-1 포맷/상수** ✅ 완료(2026-04-25):
   - `src/battle-constants.js`: `ENGINE_AUTHORITATIVE_DOUBLES_FORMAT` 상수 추가.
   - `src/app.js`: `getEngineAuthoritativeDoublesRuntimeDescriptor()` 신설, 디스패치 4곳 갱신.
   - DB-2 미완 상태에서 false UX 회피를 위해 `startAllowed: false` + "엔진 연결 단계 진행 중" 라벨로 정직화.

2. **DB-2 엔진 시작/스냅샷** ✅ 완료(2026-04-25):
   - `server/showdown-engine.cjs`: 세션 클래스가 `payload.mode`에 따라 doubles 포맷/엔진 라벨/로그 메시지 선택. `engineMeta.supportsDoubles = true`. `startBattle/chooseBattle` 신설.
   - `server/server.cjs`: `/api/battle/start` → `engine.startBattle(body)`로 일반화.
   - `src/engine/showdown-local-bridge.js`: `isShowdownLocalBattle`이 doubles 인식.
   - `src/app.js`: `buildShowdownBattlePayload()`가 `state.mode` 기반 mode/formatid. `adoptEngineBattleSnapshot()`이 snapshot.mode에 따라 디스크립터 선택. doubles 디스크립터 `startAllowed: true`.
   - 스모크 테스트: doubles 시작 시 `p1/p2.active = [0,1]`, `request.active.length = 2`, `engine = 'showdown-local-doubles'` 확인. 싱글 경로 회귀 없음.

3. **DB-3 듀얼 마운트/렌더** ✅ 완료(2026-04-25):
   - `src/pokerogue-transplant-runtime/scene/battle-shell-scene.js`: `enemySprites = [m0, m1]`/`playerSprites = [m0, m1]` 배열 도입(슬롯1은 depth +0.05). 호환 alias 유지. `_mountForBattleSideSlot(side, slot=0)`/`_mountsForBattleSide(side)`/`_allBattlerMounts()` 추가.
   - 모든 setBattler/play 메서드에 `options.slot` 추가. `_resolveAnimEndpoints`/`playMoveAnim`/`playFieldAnim`이 슬롯 옵션 수신.
   - `src/pokerogue-transplant-runtime/ui/ui.js`: `attachSpriteMounts`가 단일/배열 모두 수용. `layout()`이 `enemySprites[0..1]`/`playerSprites[0..1]` baseX/baseY 부여(`DOUBLES_MOUNT_OFFSET_X = 24`).
   - `src/pokerogue-transplant-runtime/adapter/pkb-battle-ui-adapter.js`: `getSpriteModelsBySlot(side)` 신설.
   - `src/app.js`: `buildSpriteModelsForSide` 헬퍼 추가, doubles 시 `enemySprites`/`playerSprites` 배열 모델 spread.

4. **DB-4 타임라인 슬롯 분기** ✅ 완료(2026-04-25):
   - `src/pokerogue-transplant-runtime/ui/ui.js`: `enemyInfos = [info0, info1]`/`playerInfos = [info0, info1]` 두 인스턴스. layout slot1 위치 임시 배치. alias는 슬롯0.
   - `src/pokerogue-transplant-runtime/adapter/pkb-battle-ui-adapter.js`: `getInfoModelsBySlot(side)` 신설.
   - `src/app.js`: `buildBattleInfosBySlot(player, activeMons, battle)` 헬퍼 추가, doubles 시 `enemyInfos`/`playerInfos` 슬롯 배열 spread.
   - `src/battle-presentation/timeline.js`: `_infoForSideSlot(side, slot=0)`. 모든 이벤트 핸들러 `slot` 명시 전달. `playMoveAnim(actorSide, targetSide, { actorSlot, targetSlot })`.
   - DB-4 후속 핫픽스 ✅ 완료(2026-04-25):
     - `src/app.js`: switch-in 스프라이트 오버라이드를 `side+slot` 단위로 분리(`timelineSpriteOverrides["p1_0"|"p1_1"|...]`). 초기 소환 pre-prepare/pre-hide도 슬롯 단위로 변경해 슬롯1 스프라이트 중복 표시 제거.
     - `src/app.js`: `buildTimelineStaticInfoPatch()`에 HP/상태/exp 필드 포함.
     - `src/battle-presentation/timeline.js`: info 패널 선택이 현재 scene `model.perspective`를 우선 사용.
     - `src/pokerogue-transplant-runtime/ui/battle-info/player-battle-info.js`: doubles에서 아군 패널도 enemy형 mini로(`compact` 플래그). HP 숫자 atlas 지연/`hpLabel` 파싱 fallback 보강. mini 타입 마커 좌표 미러.
     - `src/pokerogue-transplant-runtime/ui/ui.js`: `DOUBLES_INFO_GLOBAL_OFFSET` 상수 추가. `doublesLayoutActive` 모드 분기로 싱글은 legacy 좌표 유지.
     - `src/pokerogue-transplant-runtime/ui/battle-info/player-battle-info.js`(2026-04-26): `setMini(compact)`를 `super.update()`보다 먼저 실행해 첫 프레임 잘못된 위치/텍스처 보정.
     - `src/pokerogue-transplant-runtime/scene/battle-shell-scene.js`(2026-04-26): `createSpriteMount()` depth bias 진영별 분기. 아군 슬롯1 위, 적군 슬롯0 위.
   - UI 미세조정 포인트:
     - 전체 정보창 동시 이동: `ui.js`의 `DOUBLES_INFO_GLOBAL_OFFSET`
     - 진영/슬롯별 정보창 위치: `ui.js`의 `DOUBLES_INFO_POS.enemy/player`
     - 아군 mini 타입 마커 위치: `player-battle-info.js`의 `PLAYER_COMPACT_TYPE_OFFSETS`
     - 마커 좌우반전 on/off: `player-battle-info.js` `setMini()` 내 `icon.setFlipX(mini)`

5. **DB-5 명령 흐름 슬롯화** ✅ 완료(2026-04-26):
   - `src/app.js`: `battleUi`에 `modeByPlayerSlot`/`currentSlotByPlayer` 추가. 현재 입력 액션 슬롯 기준 모드 보존.
   - `getBattleUiActionContext()`/`focusNextUncommittedBattleSlot()` 도입. 더블 슬롯0 선택 완료 → 슬롯1 자동 전환.
   - `syncBattleUiState()`/`setBattleUiMode()`/`getBattleDisplayMode()` 슬롯 기반 갱신. forceSwitch는 미선택 슬롯에 `party` 강제 유지.
   - 빌더(command/fight/party/target/message)가 현재 슬롯 컨텍스트 사용.
   - `dispatchPkbPokerogueUiAction()`가 현재 슬롯 대상에 적용.
   - `toggleEngineDraftFlag()` 보강: 사이드 내 슬롯 간 자원 토글 중복 활성화 자동 해제.
   - `canAutoResolveEngineTurn()`에서 doubles 자동 턴 해석 명시 차단(DB-7 전 가드).
   - `submitOnlineChoiceIfPossible`은 싱글 only로 제한.

6. **DB-6 타깃 선택** ✅ 완료(2026-04-26):
   - `src/app.js`: `normalizeEngineMoveTargetHint()`/`resolveEngineMoveTargetSelection()`/`commitEngineMoveChoiceFromUi()` 추가.
   - move 선택 시 타깃 필요한 기술은 즉시 커밋 안 하고 `target` 모드 전환.
   - `normalizeEnginePendingChoice()`가 `choice.target` 보정. `isChoiceComplete()`도 더블 명시 타깃 기술에서 타깃까지 선택되어야 true.
   - Phaser/DOM `TargetWindow`가 placeholder → 실제 후보 리스트. 뒤로는 fight 복귀.
   - `pkb-battle-ui-adapter.js`: target 전용 selection state/cursor/submit/back 입력 해석.
   - `global-scene-facade.js`: `getTargetSelectionState()`/`resolveTargetInput(currentCursor, button)` 시그니처 확장.
   - `target-select-ui-handler.js`: 타깃 목록 렌더 + 커서 이동 + ACTION 선택 구현.

7. **DB-7 choice 직렬화/제출** ✅ 완료(2026-04-26):
   - `src/engine/showdown-local-bridge.js`:
     - `submitShowdownLocalSinglesChoices()`가 더블 액션 슬롯 전체 순회, 슬롯별 choice 직렬화 후 `', '`로 합본.
     - `serializeChoiceForShowdown()`에 target loc 부호 변환: foe `1/2`, ally/self `-1/-2`. `request.side.id`와 `choice.target.side` 비교로 부호 결정.
     - spread 계열은 target loc 직렬화 안 함(`Can't move: You can't choose a target` 차단).
     - `getForcedChoiceFromRequestSlot(request, requestSlot)` 추가.
   - `src/app.js`: `canAutoResolveEngineTurn()`의 더블 차단 가드 제거.
   - 검증: 모킹에서 `p1: move 1 2, move 1 -1` / `p2: move 1, move 1` 확인. 로컬 엔진 통합 테스트로 doubles 첫 턴 제출 후 turn=2 진행 확인.

8. **DB-8 forceSwitch 듀얼 슬롯** ✅ 완료(2026-04-26):
   - `src/app.js`:
     - forceSwitch 요청 슬롯 정규화에서 교체 가능 대상 없는 슬롯은 `kind:'pass'` 자동 시드.
     - `isChoiceComplete`가 슬롯별 교체 후보 유무 반영(있음 → switch 필수, 없음 → pass 허용).
     - 다중 슬롯 교체 시 같은 벤치 중복 선택 방지(`getEngineReservedSwitchTargets()` / `getEngineSwitchOptions()`에서 다른 슬롯 `switchTo`를 예약 제외).
     - pending summary에 `pass` 표시(`교체 불가 · 패스`).
   - `src/engine/showdown-local-bridge.js`: `serializeChoiceForShowdown()`가 `kind:'pass'` 직렬화(`pass`) 지원.
   - `src/pokerogue-transplant-runtime/ui/handlers/party-ui-handler.js`: party overlay hide/restore 재진입 안전 보강(`captured` 플래그). 최초 1회만 visible 캡처.

8.5. **DB-8.5 더블 특수 로직 연출 강화** ✅ 완료(2026-04-26):
   1. **엔진 이벤트 파싱** (`server/showdown-engine.cjs`):
      - `normalizeEventsFromLine`에 `swap` 케이스 추가 → `position_swap {side, fromSlot, toSlot}` 표준 이벤트.
   2. **초기 배치 순서 버그 수정** (`src/app.js`):
      - `getBattleActiveIndices()`의 `requestActive` 정렬을 team-index가 아닌 `engineOrderIndex`(p1a=0, p1b=1) 기준으로 수정.
   3. **씬 스왑 메서드** (`battle-shell-scene.js`):
      - `swapBattlerPositions(side, slot0, slot1)` 신설: 두 슬롯 `currentUrl` 교환 + `setBattlerSprite` 병렬 호출.
   4. **타임라인 핸들러** (`timeline.js`):
      - `position_swap` 케이스: `_slotNames`/`_slotInfo` 교환 → 정보창 양쪽 갱신 → `scene.swapBattlerPositions` → 메시지.
      - `_eventGapMs`에 `position_swap` MEDIUM gap 등록.
   5. **Commander(사령탑)** (`showdown-engine.cjs` + `battle-shell-scene.js` + `timeline.js`):
      - `-activate` 케이스에서 `effectId === 'commander'` 분기 → `commander_activate {tatsugiri, dondozo}` 이벤트 승격.
      - `scene.getMountSpriteUrl(side, slot)` 신설.
      - 타임라인 `commander_activate` 핸들러: 싸리용 메시지 → URL 저장 → 싸리용 hide → 어써러셔 능력 상승 메시지.
      - `faint` 핸들러 후미: 기절한 슬롯이 `_commandingState`의 Dondozo면 저장 URL로 싸리용 복원.
      - `_commandingState` Map 생성자 추가.
      - **Commander 행동 선택 스킵** (`src/app.js`): 사령탑 발동 후 싸리용 슬롯 자동 패스. `normalizeEnginePendingChoice`가 `request.side.pokemon[engineOrderIndex].commanding` truthy면 `kind:'pass'` 자동 주입. `isChoiceComplete`에서 `choice.kind === 'pass'` 허용. `serializeChoiceForShowdown('pass')` → `'pass'` 문자열.
      - **Commander 스킵 추가 수정**:
        - UI 포커스 버그: `resetBattleUiModesFromRequests`에서 `actionSlots[0]` 대신 `isChoiceComplete` 기준 첫 미완료 슬롯을 `currentSlotByPlayer`로 설정.
        - 스프라이트 미복원 버그: `_commandingState`가 매 턴 새 executor로 초기화되던 문제. `commandingState` Map을 `state.battleUi`에 유지하고 executor 생성자 옵션으로 공유 참조 전달. `resetBattlePresentationState()`에서 새 배틀 시작 시 초기화.
   - 잔여 한계: 선출 UI(팀 빌더에서 리드 슬롯 직접 선택) 미구현.
   - 검증: `node --check` 5파일 PASS, `npm run verify:core` 9/9 PASS.

10. **DB-10 온라인 더블 활성화** ✅ 완료(2026-04-29):
    - `server/online-room-service.cjs`: `room.settings.mode` 추가(`sanitizeMode`), `createRoom`/`joinRoom`/`serialize`가 mode 보존. `startBattle`이 `engine.startBattle` 일반화 호출 + mode에 따라 `gen9customgame`/`gen9doublescustomgame` formatid 분기. `submitChoice`는 `engine.chooseBattle` 사용.
    - `server/server.cjs`: `/api/rooms/create`가 `body.mode` 위임. `/api/online/status`의 `modeSupport`에 `online-room-doubles` 추가.
    - `src/engine/showdown-online-room-bridge.js`: `createOnlineRoom`이 `mode` POST.
    - `src/app.js`:
      - `state.online.mode` 추가, save/load/reset-storage 포함.
      - `applyOnlineBuilderFromRoomState`/`applyOnlineRoomState`가 `roomState.settings.mode` 읽어 동기화(이전 강제 'singles' 제거).
      - `createOnlineRoomFlow`가 `mode: state.online.mode` 전송.
      - 빌더 mode 토글: 룸 join 전엔 가능, join 후엔 `renderAll`에서 disabled.
      - `getOnlineRoomRuntimeDescriptor`가 mode에 따라 `online-room-singles`/`online-room-doubles` id, 라벨 분기.
      - `submitOnlineChoiceIfPossible`가 actionSlots 전체 순회 후 슬롯별 직렬화 결과를 `, `로 합쳐 단일 choice 문자열로 제출.
    - `online.html`: `online-create-config` 안에 `online-room-mode` select 추가. 가입 후 disabled.
    - 검증: `node --check` 다수 PASS. 온라인 룸 더블 스모크: createRoom(mode='doubles') → 양쪽 ready → start → snapshot.engine='showdown-local-doubles', mode='doubles', 양쪽 active.length=2. 양쪽 `move 1 1, move 1 2` 제출 후 turn=2 진행 확인. `npm run verify:core` 9/9 PASS.

#### 9.11 본 분석에서 다루지 않은 / 결정 보류
- 풀팀(6) + 더블의 풀 파티 선택(team preview): 1차는 4 고정 → 확정.
- 트리플/멀티/FFA 미지원 → 확정.
- 더블 전용 BGM/효과음 큐 차이: 현재 BGM 트랙 풀 그대로 사용 → 확정.
- PokeRogue 원본 더블 좌표 정확 측정: 거시적 위치는 원본 사용, 세부는 싱글에서 정리한 값 사용 → 확정.
