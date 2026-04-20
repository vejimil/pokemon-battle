# PKB Battle Presentation 활성 계획

Last updated: 2026-04-20  
Target: `/workspaces/pokemon-battle`

이 문서는 **현재 활성 작업/다음 액션**만 유지한다.  
완료 이력(상세)은 `planprevious.md`에 보관한다.

---

## 0) 현재 상태

- 배틀 연출 핵심 마일스톤 완료: `BA-23`, `BA-24`, `BA-25`, `BA-26`, `BA-27`, `BA-28(1차)`
- 아이템 스프라이트 보강 완료:
  - standard 9 + future 2 반영
  - 아이콘 해석은 manifest 인덱스 우선으로 전환(404 probe 노이즈 완화)
- 아이템 한글화 보정 완료:
  - `Loaded Dice` → `속임수 주사위`
  - ZA 신규 메가스톤 영문 누출 시 `<종족명>나이트` fallback 표시

참고: 완료 상세/검증 로그는 `planprevious.md` 2026-04-19~20 섹션 참조.

---

## 1) 다음 할 일 (우선순위)

1. `BA-28` 후속: 미할당 스프라이트 33건 처리 정책 확정
- 입력: `reports/missing-sprite-audit.json`
- 산출:
  - 케이스 분류표(이름불일치 / 기본폼 재사용 / 실제 에셋 부재)
  - `FORM_ASSET_OVERRIDES` 적용안(우선순위 포함)

2. 아이템 아이콘 최적화 2차
- 목표: 에셋 추가 후 manifest 누락으로 인한 표시/콘솔 이슈 재발 방지
- 산출:
  - manifest 자동 생성 스크립트(`assets/manifest.json`, `assets/pokerogue/items/manifest.json`)
  - 검증 스크립트(실파일 대비 drift 감지)
  - CI/검증 명령에 drift 체크 포함

3. `BA-28` 언어 완결도 2차 점검
- 목표: 한국어 모드 완전 한글, 영어 모드 완전 영어 유지
- 점검 범위:
  - 배틀 메시지(기술/특성/날씨/폼/아이템)
  - 빌더 검색/표시명 불일치
- 산출:
  - 누락 키 리스트 + 최소 패치

4. 회귀 검증 패키지 고정 실행
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
  1. 스프라이트 33건 분류표 확정
  2. manifest 자동화 스크립트 추가
  3. 언어 완결도 스모크 테스트 + 회귀 검증
