# PKB Battle Presentation 완료 이력 아카이브

Last updated: 2026-04-17  
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
