# Plan (2026-04-25 UTC)

완료 이력과 상세 분석/수정 기록은 `previous.md`로 이관했습니다.
이 문서는 **현재 남은 작업만** 유지합니다.

## 현재 작업 목록
| 번호 | 항목 | 상태 | 메모 |
|---|---|---|---|
| 9 | 더블배틀 구현 | 대기 | 엔진 페이로드/요청 모델/UI 타깃팅/타임라인 이벤트를 더블 규칙으로 전면 확장 필요 |
| 15 | 배틀 중 간헐 렉(내 포켓몬 1 출전 후 피격, 필드 연출 종료→배틀 필드 전환 사이) | 대기 | 해당 구간 지연의 원인(타임라인 지연, 애니메이션/텍스처 로딩, 렌더 동기화)을 계측 후 분리 해결 필요 |

## 15번 필수 분석 포인트
- 재현 기준: player1 포켓몬 1 출전 후, 기술 피격/필드 설치/필드 연출 종료 직후 전환 구간에서 프레임 드랍 또는 멈춤 체감.
- 우선 점검 경로:
  - `src/battle-presentation/timeline.js` 지연(`_showMsg` minMs, `_delay`, `Promise.race` timeout) 체인
  - `src/pokerogue-transplant-runtime/scene/battle-shell-scene.js` 필드/배경 로딩 및 적용 타이밍
  - `src/battle-presentation/battle-anim-player.js` 프레임 루프/cleanup/텍스처 참조 안정성
- 완료 조건: 메시지 가독성은 유지하면서(과속 금지) 해당 전환 구간의 멈춤 체감을 유의미하게 감소.
