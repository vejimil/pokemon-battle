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
| 16 | 더블에서 배틀 연출 위치가 조금 이상한 것 같은데, 확인해야함. | 신규 | 슬롯별 actor/target endpoint, playMoveAnim/playFieldAnim 좌표 점검 필요. |

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

## 16번 더블 배틀 연출 위치 확인 (신규)
- 증상: 더블에서 기술/필드/볼/연출 위치가 슬롯 좌표와 살짝 어긋나 보이는 인상.
- 점검 후보:
  - `src/pokerogue-transplant-runtime/scene/battle-shell-scene.js`의 `_resolveAnimEndpoints(userSide, targetSide, options)` 슬롯 분기 — `actorSlot`/`targetSlot` 미지정 폴백이 슬롯0인 점이 더블에서 어색할 수 있음.
  - `playMoveAnim`/`playFieldAnim` 호출부(`src/battle-presentation/timeline.js`)에서 슬롯 옵션이 모든 케이스에 잘 전달되는지.
  - `DOUBLES_MOUNT_OFFSET_X` 등 더블 좌표 임시값(원본 PokeRogue 좌표 기준 재측정 필요).
- 완료 조건: 더블 슬롯0/슬롯1 각각의 actor/target 좌표에서 기술·필드·볼 연출이 시각적으로 자연스럽게 정렬됨.
