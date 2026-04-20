# PKB Battle Presentation 활성 계획

Last updated: 2026-04-20 (배틀 연출 안정화 1차)
Target: `/workspaces/pokemon-battle`

이 문서는 **현재 활성 작업/다음 액션**만 유지한다.  
완료 이력(상세)은 `planprevious.md`에 보관한다.

---

## 0) 현재 상태

- 배틀 연출 핵심 마일스톤 완료: `BA-23`, `BA-24`, `BA-25`, `BA-26`, `BA-27`, `BA-28(1~2차)`
- 아이템 스프라이트 보강 완료:
  - standard 9 + future 2 반영
  - 아이콘 해석은 manifest 인덱스 우선으로 전환(404 probe 노이즈 완화)
- 아이템 한글화 보정 완료:
  - `Loaded Dice` → `속임수 주사위`
  - ZA 신규 메가스톤 영문 누출 시 `<종족명>나이트` fallback 표시
- `BA-28` 언어 완결도 2차 점검 완료:
  - `FORM_SUFFIX_TRANSLATIONS` 누락 6종 보강 (`Droopy/Stretchy/Roaming/Artisan/Masterpiece/Terastal`)
  - `scripts/audit-language-completeness.mjs` 추가
  - 최신 감사: `reports/language-completeness-audit.json`의 누출 `species/moves/abilities/items = 0`
- 스프라이트 미할당 정책 1차 완료:
  - `FORM_ASSET_OVERRIDES` fallback 명시로 미할당 렌더러블 폼 `33 -> 0` 해소
  - 최신 감사: `reports/missing-sprite-audit.json`의 `unresolvedRenderableCount = 0`
- 스프라이트 품질 보강 2차(부분) 완료:
  - Pikachu cap/cosplay 폼을 공용 fallback(`PIKACHU`)에서 전용 번호 에셋으로 상향
  - (`PIKACHU_2`, `PIKACHU_8`~`PIKACHU_15`)
- 에셋 잔여 작업 상태:
  - 추가 에셋 정리/재매핑 작업은 우선순위에서 임시 보류
- 아이템 manifest 자동화 1차 완료:
  - `scripts/build-item-manifests.mjs` 추가(인덱스 자동 생성/동기화)
  - `scripts/verify-item-manifests.mjs` 추가(drift 검증)
  - `package.json`에 `build:item-manifests`, `verify:item-manifests` 스크립트 추가
- 검증 루틴 묶음 추가:
  - `package.json`에 `audit:language`, `verify:core` 추가
  - `verify:core` = `verify:item-manifests` + `audit:language` + `verify:ba20/stage22/passb`

참고: 완료 상세/검증 로그는 `planprevious.md` 2026-04-19~20 섹션 참조.

---

## 1) 다음 할 일 (우선순위)

1. 배틀 연출 안정화 (1차 완료 · 회귀 관찰 단계)
- [완료] Mega Chandelure / Terapagos 최종폼 크기
  - 원인: `pokemon-metrics.js` 파서가 PBS 3번째 컬럼을 scale로 오해석 (Pichu·Tatsugiri 등 소형 폼도 “2”를 공유해 scale 불가 확정)
  - 조치: `pokemon_metrics.js`에서 3번째 컬럼 scale 저장 제거 + 정책 주석 추가
- [완료] 대형 포켓몬 기술 시작 좌표 상단 치우침
  - 원인 진단: `_computeFrameData`는 원본 PokeRogue(`battle-anims.ts`)와 동일하게 `displayHeight/2` 기반 중앙 정렬. 다이맥스/진짜 큰 종은 원본 의도된 거동
  - 실제 체감 이슈는 1번 scale 버그로 인한 2배 확대가 주요 원인이었으며, 해당 수정으로 Mega Chandelure·Terapagos 정합. 다이맥스 등 잔여 케이스는 회귀 관찰
- [완료] faint 이후/날씨 중 스프라이트 재노출 방어
  - 조치: `mount.fainted` 추적 도입, `renderBattlerSprite`/`shadow` setVisible 경로에 가드, `faintBattler`에서 set, `switchInBattler`·`prepareSwitchInBattler`·`setBattlerSprite`에서 해제
- 회귀 관찰: 실제 배틀에서 대형 폼 기술 시작점, 폼체인지/다이맥스 해제 후 재노출 여부를 사용자 플레이로 재검증

2. HUD 확정
- 포켓몬 정보창 이름 렌더링 안정화
  - 비트맵 폰트 적용으로 글자 깨짐 방지
- 성별 표시 추가
- 기술 상세 패널 가독성 개선
  - 타입/위력/명중 텍스트 렌더링을 원본 자산/스타일 기준으로 정합
- 파티 교체 메시지 locale 연결 + 텍스트 박스 내 레이아웃 고정
- 빌더 편의성 개선
  - 종족값 표시
  - EV/IV 입력 UX 개선(다자리 연속 입력, 252 즉시 입력, 화살표 길게 누르기)
  - 필요없는 설명 삭제 '업로드한 스프라이트와 로컬 배틀 데이터를 불러와 두 팀을 직접 만든 뒤, 브라우저에서 바로 번갈아 조작하는 배틀을 플레이합니다.' 등과 같은 설명문.

3. 통신 플레이 확장
- 방 생성/참가 및 양측 빌더 동기화
- 양측 준비 완료 후 실전 배틀 진입
- 팀 수 선택 확장(`3~6`)
- “도전 문구 -> 배틀 종료”까지 실전 흐름 연결
- 모바일 대응
  - 가로 터치 HUD
  - 십자키 + ABXY UI 옵션

4. manifest/검증 파이프라인 문서화 및 CI 이식
- 로컬 기본 실행은 `npm run verify:core`
- CI 도입 시 `verify:core`를 기본 게이트로 연결
- drift 발생 시 `build:item-manifests` 절차 문서화

---

## 2) 작업 원칙 (유지)

- 수정 전 원본 코드 선독/정합 이식
- 원인 재현/로그 근거 없이 추측성 수정 금지
- 문제별 최소 침습 패치 후 즉시 회귀 검증(`verify:core` + 관련 단건) 수행
- 기존 기능(테라스탈/다이맥스/폼체인지/입력잠금) 훼손 금지
- 배틀 연출 완성 전 UI 폴리시(UI-P1~P5) 착수 금지
- 단계 완료 직후 `plan.md`, `CLAUDE.md` 동기화
- 완료 이력은 `planprevious.md`, `CLAUDEMDPREVIOUS.md` 누적

---

## 3) 빠른 시작

- 먼저 읽기: `CLAUDE.md` -> `plan.md` -> `planprevious.md`
- 즉시 착수 권장 순서:
  1. 메가 샹델라/테라파고스 최종폼 크기 및 대형 폼 기술 시작점 이슈 재현
  2. faint/날씨 재노출 가시성 버그 이벤트 흐름 단위 분석
  3. HUD 텍스트/폰트/입력 UX 확정 패치
