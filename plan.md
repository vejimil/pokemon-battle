# Plan (2026-05-05 UTC)

기존 진행/완료 항목은 `previous.md`로 이관했다.  
이 문서는 **코드 안정화 작업만** 관리한다.

# 작업 시 필수 지침
- 작업 완료 후 `plan.md`에 상태를 업데이트할 것.
- 브라우저에서 어떤 점을 검증해야 하는지 보고할 것.
- 기능 변경보다 안정화가 목표다. 삭제/단순화/분리는 반드시 현재 동작을 보존하는 회귀 검증과 함께 진행한다.
- 생성 데이터(`src/data/*`, `src/i18n-ko-locales.js`, `src/i18n-ko-official.js`)는 직접 리팩터링하지 않는다. 필요 시 생성 스크립트나 참조 계층만 정리한다.

## 현재 상태 요약
- 2026-05-05 사전 핫픽스 완료:
  - 배틀 시작 intro 동안 `switch_in` 대상 정보창도 스프라이트처럼 pre-hide 처리해, 포켓몬이 실제로 등장한 뒤 정보창이 보이도록 수정.
  - `end` arena의 `end_a`/`end_b`를 원본 PokeRogue처럼 atlas animation(12fps loop)으로 로드하도록 수정.
  - 특성 창 위치 조절 지점 확인: `src/pokerogue-transplant-runtime/ui/battle-info/battle-info.js`의 `AbilityBar.update()`.
- 핵심 앱은 `src/app.js`(약 10.2k lines)가 팀 빌더, 온라인 룸, 엔진 요청/선택, DOM fallback UI, Phaser 모델 생성, 모바일 입력까지 함께 담당한다.
- 배틀 연출 경로는 `server/showdown-engine.cjs` → `src/battle-presentation/timeline.js` → `src/pokerogue-transplant-runtime/scene/battle-shell-scene.js` → UI handler 계층으로 이어진다.
- 대형 수동 작성 파일은 `styles.css`(약 3.5k), `timeline.js`(약 2.7k), `battle-shell-scene.js`(약 2.2k), `showdown-engine.cjs`(약 1.9k), `battle-anim-player.js`(약 0.85k), `pkb-battle-ui-adapter.js`(약 0.83k)다.
- `node --check` 기준 주요 파일 5개는 현재 문법 통과:
  - `src/app.js`
  - `src/battle-presentation/timeline.js`
  - `src/pokerogue-transplant-runtime/scene/battle-shell-scene.js`
  - `src/pokerogue-transplant-runtime/adapter/pkb-battle-ui-adapter.js`
  - `server/showdown-engine.cjs`
- 즉시 제거 후보가 있다:
  - `src/phaser-battle-controller.js.bak`는 1076줄 백업 파일이며 live import 없음.
  - `src/legacy-custom-runtime-audit.js`는 live import 없음. 내용도 현재 상태(더블/다이맥스 지원)와 어긋난 과거 감사 잔여물이다.
- 중복/불일치 후보가 있다:
  - `index.html`과 `online.html`은 대부분 동일하고 온라인 전용 패널/몇 개 버튼만 다르다.
  - `online.html`에는 inline style과 `hidden hidden` 같은 정리 가능한 마크업이 있다.
  - `docs/plan.md`는 Phase 12 UI 계획으로 보이며 현재 루트 `plan.md`와 성격이 충돌한다.
  - `scripts/generate-local-data.cjs`와 `scripts/generate-local-data.mjs`는 거의 같은 목적이지만 출력 대상/파일 목록이 다르다. 현재 문서 참조는 `.cjs` 위주다.

## 안정화 목표
1. 필요 없는 코드 제거
2. 단순화 가능한 코드 단순화
3. 필요한 곳에 주석 추가
4. 너무 많은 기능이 있는 파일을 책임별 파일로 분리

## 작업 순서
| 단계 | 상태 | 범위 | 목표 |
|---|---|---|---|
| S0 | 대기 | 기준선 고정 | 주요 `node --check`, `npm run verify:core`, 현재 브라우저 수동 검증 포인트 정리 |
| S1 | 대기 | 죽은 파일/문서 잔여물 | `.bak`, stale legacy audit, 오래된 plan 문서, 사용 안 하는 스크립트 후보 검증 후 제거/이관 |
| S2 | 대기 | `src/app.js` 1차 분리 | 순수 helper를 builder/localization/battle-ui/engine-choice/online-room 모듈로 분리 |
| S3 | 대기 | `server/showdown-engine.cjs` 분리 | protocol parser, snapshot mapper, runtime patch, session/service 책임 분리 |
| S4 | 대기 | `timeline.js` 분리 | 메시지 생성, batch 수집, move outcome scan, transform/tera/dynamax helper 분리 |
| S5 | 대기 | `battle-shell-scene.js` 분리 | arena, sprite mount, dynamax/tera/form/switch 연출, move endpoint 책임 분리 |
| S6 | 대기 | UI/HTML/CSS 정리 | `index.html`/`online.html` 공통화 기준 정리, inline style 제거, CSS 섹션화 |
| S7 | 대기 | 주석 보강 | 숨은 불변식과 회귀 위험 구간에만 짧은 주석 추가 |
| S8 | 대기 | 최종 회귀 | `node --check`, `npm run verify:core`, 더블/온라인/테라/교체/ability bar 브라우저 검증 |

## S1 제거 후보 상세
- `src/phaser-battle-controller.js.bak`
  - 현재 live import 없음.
  - 삭제 전 확인: `grep`으로 전체 참조 재확인, `node --check src/app.js`, `npm run verify:core`.
- `src/legacy-custom-runtime-audit.js`
  - 현재 live import 없음.
  - 문서 내용이 현재 doubles/dynamax 상태와 충돌하므로 보존 가치가 낮다.
  - 삭제 전 확인: 전체 참조 재확인, 필요하면 `previous.md`에 삭제 이유만 기록.
- `docs/plan.md`
  - 루트 `plan.md`와 혼동되는 오래된 UI 계획이다.
  - 삭제보다는 `docs/completed-work-archive.md` 또는 `previous.md`로 요약 이관 후 제거 여부 결정.
- `scripts/generate-local-data.mjs`
  - `.cjs`와 목적이 겹치지만 파일 목록이 다르다.
  - 바로 삭제하지 말고 최신 생성 경로가 무엇인지 확인한 뒤 하나로 통합한다.

## S2 `src/app.js` 분리 계획
- 1차로 동작 의존성이 낮은 순수 helper부터 이동:
  - asset/form/species helper → `src/builder/species-assets.js`
  - localization/display helper → `src/battle-i18n/display-names.js`
  - online room 상태/동기화 helper → `src/online/room-state.js`
  - engine choice/target helper → `src/battle-engine/choice-state.js`
  - Phaser model builder → `src/battle-presentation/phaser-model.js`
- 분리 단위마다 조건:
  - DOM 접근, `state` 직접 접근, `els` 직접 접근을 경계에서 명시한다.
  - 먼저 함수 이동만 하고 로직 변경은 하지 않는다.
  - 각 이동 후 `node --check src/app.js`와 관련 파일 `node --check`.

## S3 서버 엔진 분리 계획
- `showdown-engine.cjs`는 현재 runtime patch, protocol parser, event normalize, snapshot mapper, session/service가 한 파일에 있다.
- 분리 후보:
  - `server/showdown/runtime-patches.cjs`
  - `server/showdown/protocol-parser.cjs`
  - `server/showdown/snapshot-mapper.cjs`
  - `server/showdown/session.cjs`
- 우선순위는 parser/snapshot mapper다. ability_show, switch_out, teraType canonicalization 같은 최근 회귀 지점이 많아 테스트 고정 후 이동한다.

## S4 타임라인 분리 계획
- `timeline.js`는 이벤트 처리 switch가 크고, 메시지 생성/배치 처리/연출 호출이 섞여 있다.
- 분리 후보:
  - locale/message helper
  - `_scanMoveOutcome()` 및 batch collector
  - transform/tera/dynamax message + visual helper
  - weather/terrain/side condition helper
- 주석 보강 대상:
  - HP/스프라이트 선반영 금지
  - `move_use` 뒤 outcome scan 범위
  - ability heal이 immune처럼 animation skip되는 이유
  - switch_out/switch_in 순서 불변식

## S5 Phaser scene 분리 계획
- `battle-shell-scene.js`는 arena 로딩, mount/texture lifecycle, shadow, tera/dynamax/form/switch/faint/move anim endpoint를 모두 가진다.
- 분리 후보:
  - arena loader/applier
  - battler mount + texture cleanup
  - transformation effects(tera/dynamax/form)
  - move endpoint resolver
- 주석 보강 대상:
  - deferred texture release 이유
  - doubles slot base와 metrics offset 관계
  - enemy shadow만 표시하는 현재 정책

## S6 UI/HTML/CSS 정리 계획
- `index.html`/`online.html`
  - 공통 DOM을 직접 합치기 전에 `app.js`가 기대하는 id 차이를 표로 고정한다.
  - 온라인 전용 영역의 inline style은 CSS 클래스로 이동한다.
  - 중복/불필요 attribute(`hidden hidden`) 정리.
- `styles.css`
  - 섹션 주석 기준으로 builder, battle DOM fallback, Phaser host, picker, mobile controls를 나눈다.
  - 실제 파일 분리는 빌드 없이 정적 HTML에서 여러 CSS를 로드해도 되는지 확인 후 진행한다.

## 검증 기준
- 정적:
  - `node --check src/app.js`
  - `node --check src/battle-presentation/timeline.js`
  - `node --check src/pokerogue-transplant-runtime/scene/battle-shell-scene.js`
  - `node --check src/pokerogue-transplant-runtime/adapter/pkb-battle-ui-adapter.js`
  - `node --check server/showdown-engine.cjs`
- 회귀:
  - `npm run verify:core`
  - S3 이후 `node scripts/verify-stage22-battle-regressions.cjs`
- 브라우저:
  - 싱글 기본 턴 진행, 교체, 기절 후 강제교체
  - 더블 단일/광역/ally target/보호 시나리오
  - 테라스탈 Tera Blast
  - ability bar 표시/중복 방지
  - 온라인 방 생성/참가/Ready/항복/빌더 복귀
  - 모바일 하단 조작키
