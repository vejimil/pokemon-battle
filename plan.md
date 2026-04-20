# PKB Battle Presentation 활성 계획

Last updated: 2026-04-20 (HUD 확정 1차 · 기술 상세/종족값/EV·IV UX)
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

1. 배틀 연출 안정화 (2차 패치 완료 · 회귀 관찰 단계)
- [완료] Mega Chandelure / Terapagos 최종폼 크기
  - 원인: PBS 3번째 컬럼(실제로는 AnimationSpeed 관련)이 scale로 오해석
  - 조치: `pokemon-metrics.js`에서 3번째 컬럼 무시 (사용자 확인: 애니메이션 스피드는 프로젝트에서 미사용 방침)
- [완료] 다이맥스 기술 연출 시작 좌표 “위로 붕 뜸”
  - 원인: 다이맥스 2x scale로 `sprite.displayHeight`가 2배가 되어 `displayHeight/2` 중앙 정렬이 실제 기본 중앙보다 위로 이동
  - 조치: `_resolveAnimEndpoints`에서 `displayHeight /= dynamaxMultiplier`로 애니 focus용 기준 높이를 base 크기로 정규화 (시각 스프라이트는 그대로 2x 유지)
- [완료] faint 후 날씨 연출 중 스프라이트 copy 재노출
  - 원인: `BattleAnimPlayer`가 USER/TARGET 프레임 기반으로 배틀러 copy sprite를 생성·노출하는데, 원본이 `setVisible(false)`여도 copy는 생성되어 표시되는 경로가 존재
  - 조치: copy 생성 직전에 `prevUserVisible`/`prevTargetVisible` 체크 추가 — 원본이 애니 시작 시점에 숨겨져 있었다면 copy를 건너뜀
  - 이전 패치(`mount.fainted` 가드)와 상호 보완
- [분석] 소형 back 스프라이트(Pikachu 등) 상단 치우침
  - 프레임 높이 편차: Pikachu back=47px, Charizard back=98px, PBS BackSprite.Y 오프셋이 그 편차를 보정하도록 설계됨
  - Pikachu: baseY(118)+5=123 (feet 추정), Charizard: baseY(118)+41=159 (frame bottom; 실제 발 위치는 프레임 내 빈 영역만큼 위)
  - 가설: 프레임 내부 padding이 종마다 달라 PBS Y가 보정해야 하는데, baseY=118 기준에서 시각적 ground line과 어긋날 가능성
  - 다음 단계: 디버그 플래그로 스프라이트 하단 y / ground line 시각화 후 보정값 확정 (보류)
- [완료] metrics 사용 현황 정리
  - 로딩: `loadPokemonMetrics` → 5개 파일(기본/forms/female/Gen_9/gmax) 병합, 후행 override
  - 사용처: `battle-shell-scene.renderBattlerSprite`(실전), `app.js renderPokemonSpritePreview`(빌더 미리보기)
  - Gmax metrics는 이미 로드 중이므로 거다이맥스 전용 오프셋은 파일 추가/보정만으로 반영 가능

2. HUD 확정
- 포켓몬 정보창 이름 렌더링 안정화
  - 비트맵 폰트 적용으로 글자 깨짐 방지 (보류 — 한글 비트맵 폰트 자산 확보 필요)
- 성별 표시 추가
  - [기존 완료] `GENDER_SYMBOL`/`GENDER_COLOR` 정보창 렌더링 확인됨
- 기술 상세 패널 가독성 개선
  - [완료] 위력/명중률(POWER/ACC) 행을 원본 PokeRogue 좌표 (250, -18)/(250, -10)에 표시
  - [완료] ko/en 라벨(위력·명중률 / Power·Accuracy) 및 0/— 값을 `---` 로 표기
  - [완료] 원본에 없던 'TYPE' 라벨 제거 (정합 복원)
- 파티 교체 메시지 locale 연결 + 텍스트 박스 내 레이아웃 고정
  - [기존 완료] `lang()` 기반 title/subtitle 연결 확인됨
- 빌더 편의성 개선
  - [완료] 종족값(Base Stats) 표시 — HP/Atk/Def/SpA/SpD/Spe + 합계 chip
  - [완료] 필요없는 설명문(hero_copy · editor-subtitle) 삭제
  - [완료] EV/IV 입력 포커스 손실 버그 수정 — 입력 중 `renderEditor()` 미호출, 총합만 갱신
  - [완료] EV 252 / IV 31 즉시 입력 toggle 버튼 추가 (재클릭 시 0)
  - [보류] 화살표 길게 누르기 / 다자리 연속 입력은 후순위

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
