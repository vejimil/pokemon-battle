# Plan (2026-05-01 UTC)

완료 이력과 상세 분석/수정 기록은 `planprevious.md`로 이관했습니다.
이 문서는 **현재 남은 작업만** 유지합니다.

# 작업 시 필수 지침
 - 작업 완료 후 plan.md에 업데이트 할 것.
 - 브라우저에서 어떤 점을 검증해야하는지 보고할 것.

## 현재 작업 목록
| 번호 | 항목 | 상태 | 메모 |
|---|---|---|---|
| 9 | 더블배틀 구현 — DB-9 회귀/검증 | 진행 중 | DB-1~DB-8.5, DB-10 완료. 남은 단계는 DB-9(회귀/검증)뿐. 아래 §DB-9 참조. |
| 15 | 배틀 중 간헐 렉(내 포켓몬 1 출전 후 피격, 필드 연출 종료→배틀 필드 전환 사이) | 보류 | 더블배틀 우선; 본 항목은 후순위. |
| 16 | 더블에서 배틀 연출 위치가 조금 이상한 것 같은데, 확인해야함. | 수정 완료 | 아래 §16에 위치 조사와 보호계 연출 보정 기록 정리. |

---

## DB-9 회귀/검증

목표: 싱글 시나리오 회귀 + 더블 핵심 무브 시나리오(스프라이트 지정 무브, ally-target 무브, 광역 무브, 보호/대타) 단위 검증.

### 검증 전략
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

---

## 15번 필수 분석 포인트(보류)
- 재현 기준: player1 포켓몬 1 출전 후, 기술 피격/필드 설치/필드 연출 종료 직후 전환 구간에서 프레임 드랍 또는 멈춤 체감.
- 우선 점검 경로:
  - `src/battle-presentation/timeline.js` 지연(`_showMsg` minMs, `_delay`, `Promise.race` timeout) 체인
  - `src/pokerogue-transplant-runtime/scene/battle-shell-scene.js` 필드/배경 로딩 및 적용 타이밍
  - `src/battle-presentation/battle-anim-player.js` 프레임 루프/cleanup/텍스처 참조 안정성
- 완료 조건: 메시지 가독성은 유지하면서(과속 금지) 해당 전환 구간의 멈춤 체감을 유의미하게 감소.

---

## 16번 더블 배틀 연출 위치 확인 (조사 결과)
- 기준 코드:
  - 슬롯 base 배치: `src/pokerogue-transplant-runtime/ui/ui.js`
  - 무브 endpoint 산출: `src/pokerogue-transplant-runtime/scene/battle-shell-scene.js`의 `_resolveAnimEndpoints()` / `playMoveAnim()`
  - 타깃 선택: `src/battle-presentation/timeline.js`의 `_scanMoveOutcome()` 및 `move_use` 처리
- 슬롯 base 좌표(기본 perspective, p1=player/view 아래쪽, p2=enemy/view 위쪽):
  - 싱글: p1 slot0 base `(100,143)`, p2 slot0 base `(216,74)`.
  - 더블: `DOUBLES_MOUNT_OFFSET_X=28` 적용. p1 slot0 `(72,143)`, p1 slot1 `(128,143)`, p2 slot0 `(244,74)`, p2 slot1 `(188,74)`.
  - 실제 연출 endpoint는 base 자체가 아니라 렌더된 `phaserSprite.x/y`를 사용한다. 즉 base + PBS metrics offset이다. enemy/front는 `(frontX, frontY)`, player/back은 `(backX, 0.5*backY)`가 붙고, animation focus는 내부적으로 `spriteY - displayHeight/2`를 중심으로 삼는다. perspective가 p2로 바뀌면 p1/p2가 player/enemy mount를 서로 바꿔 탄다.
- 공통 target 선택 규칙:
  - `actorSlot`은 `ev.actor.slot`, 1차 `targetSlot`은 `ev.target.slot`.
  - 하지만 실제 무브 연출 target은 `move_use` 뒤의 `damage/heal/status/boost/effect_start/end`, `miss/immune/protect` 등을 스캔한 `animationTargets`의 첫 항목을 우선한다.
  - `animationTargets`가 2개 이상이고 모두 같은 side이면 `targetSideCenter=true`가 되어 대상 side의 visible slot0/slot1 sprite 평균점으로 쏜다.
  - 실패만 있고 성공 target이 없으면 `skipAnimation=true`로 무브 애니메이션 자체를 생략한다.
- 단일 공격:
  - 싱글: user slot0 endpoint -> target slot0 endpoint.
  - 더블: user의 실제 actor slot endpoint -> 성공/시도 target의 실제 slot endpoint. 같은 side 다중 target이 아니므로 중앙 평균을 쓰지 않는다.
- 스스로 사용(self):
  - 싱글/더블 모두 user endpoint와 target endpoint가 같은 actor slot이다.
  - 그래픽 focus는 자기 sprite 중심(`x`, `y - displayHeight/2`)에 걸린다. `actorSide === targetSide`라 상대용 variant swap도 타지 않는다.
- 상대 전체 공격(`allAdjacentFoes` / `all-opponents`):
  - 싱글: 살아 있는 상대가 1마리라 단일 공격과 동일하게 target slot0 endpoint.
  - 더블: 양쪽 상대 slot이 모두 `animationTargets`에 잡히면 target side center를 사용한다. p1이 p2 전체를 공격하면 대략 p2 slot0/slot1 평균, 즉 base 기준 `(244,74)`와 `(188,74)`의 중간 `(216,74)` + 평균 front metrics가 target endpoint가 된다. p2가 p1 전체를 공격하면 p1 slot0/slot1 평균 `(100,143)` + 평균 back metrics가 된다.
  - 이 경우 main animation은 side 중앙 1회, 이후 성공 target이 복수이면 `playMoveImpact()`가 각 성공 target slot에 별도 impact pulse를 찍는다.
- 전체 공격(`allAdjacent` / `all-other-pokemon`, `all` / `all-pokemon` 계열):
  - 더블에서 대상이 양 side에 걸치면 `uniqueTargetSides.size > 1`이라 target side center를 쓰지 않는다.
  - main animation target은 전체 필드 중앙이 아니라 `animationTargets[0]`, 즉 성공 이벤트 순서상 첫 target이다. 예: p1 slot0의 Earthquake가 ally와 상대 둘을 모두 맞히면 첫 damage가 p1 slot1로 들어와 main animation이 p1 slot1 endpoint로 잡힐 수 있고, 이후 impact pulse만 p1 slot1/p2 slot0/p2 slot1에 각각 찍힌다.
  - ally가 Protect 등으로 막혀 첫 성공 target이 상대 slot이면 main animation target도 그 상대 slot로 바뀐다. 따라서 전체 공격은 현재 "항상 중앙"이 아니라 outcome 순서에 따라 첫 성공 slot에 붙는 구조다.
- 필드 공통 연출 참고:
  - `timeline._playFieldAnim()`은 전달받은 slot 옵션을 scene에 넘기지 않고, scene `playFieldAnim()`도 기본적으로 `p1 slot0 -> p2 slot0` endpoint를 쓴다. 날씨/지형류 공통 연출은 더블 slot 중심 보정이나 side center를 타지 않는다.
- 2026-05-01 보호계 연출 보정:
  - `Protect`/`Detect`/`Obstruct`/`King's Shield`/`Burning Bulwark`/`Guard Split`의 방어막 그래픽 프레임만 중앙 기준으로 보정했다. 기존 USER/TARGET copy, 일반 USER-focus 그래픽, 다른 무브 오프셋은 건드리지 않는다.
  - 상대 포켓몬이 보호/가드 계열 self/ally-side 기술을 쓸 때 원본처럼 opponent variant를 고르도록 `Protect`/`Detect`/`King's Shield`/`Burning Bulwark`/`Obstruct`/`Spiky Shield`/`Baneful Bunker`/`Silk Trap`/`Wide Guard`/`Quick Guard`/`Mat Block`/`Crafty Shield`에만 제한 적용했다.
  - 확인: `node --check src/battle-presentation/battle-anim-player.js`, `node --check src/pokerogue-transplant-runtime/scene/battle-shell-scene.js`, `Protect` 보정 전후 좌표 산술 확인.
