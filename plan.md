# PKB Battle Presentation 활성 계획

Last updated: 2026-04-20  
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

1. 스프라이트 품질 보강 2차 (잔여)
- 목표: fallback으로 해소한 폼 중 전용 에셋이 있는 케이스 정확 매핑
- 우선 대상:
  - Totem/사이즈/진품 폼 중 전용 번호 에셋 확인 가능 케이스
  - Pikachu `Starter`/성별(`PIKACHU_female`) 표시 정책 점검

2. manifest/검증 파이프라인 문서화 및 CI 이식
- 현재 로컬 묶음(`verify:core`)은 구축 완료
- CI가 도입될 경우 `verify:core`를 기본 게이트로 연결
- drift 발생 시 수정 절차(`build:item-manifests`)를 작업 가이드에 고정

3. 회귀 검증 패키지 운영
- 기본 실행: `npm run verify:core`
- 필요 시 단건 실행:
  - `npm run verify:ba20`
  - `npm run verify:stage22`
  - `npm run verify:passb`

---

## 2) 작업 원칙 (유지)

- 수정 전 원본 코드 선독/정합 이식
- 배틀 연출 완성 전 UI 폴리시(UI-P1~P5) 착수 금지
- 단계 완료 직후 `plan.md`, `CLAUDE.md` 동기화
- 완료 이력은 `planprevious.md`, `CLAUDEMDPREVIOUS.md` 누적

---

## 3) 빠른 시작

- 먼저 읽기: `CLAUDE.md` -> `plan.md` -> `planprevious.md`
- 즉시 착수 권장 순서:
  1. Totem/사이즈/진품 폼 전용 에셋 재매핑 감사
  2. `verify:core` 운영 가이드 정리(로컬/향후 CI)
  3. 에셋 추가 시 manifest 재생성(`build:item-manifests`) 절차 고정
