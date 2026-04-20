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

---

## 6) 2026-04-19 ~ 2026-04-20 검증 요약

- `node --check src/app.js` PASS
- `node --check src/battle-presentation/timeline.js` PASS
- `node --check src/pokerogue-transplant-runtime/scene/battle-shell-scene.js` PASS
- `node --check src/i18n-ko-locales.js` PASS
- `node --check src/pokerogue-assets.js` PASS
- `npm run verify:ba20` PASS
- `npm run verify:stage22` PASS
- `npm run verify:passb` PASS
