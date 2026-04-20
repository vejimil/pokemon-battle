# Pokemon Battle - 프로젝트 운영 문서

Last updated: 2026-04-20  
Target: `/workspaces/pokemon-battle`

이 문서는 **현재 구조/원칙/활성 우선순위**만 관리한다.  
완료 이력(상세 로그)은 `CLAUDEMDPREVIOUS.md`에 보관한다.

---

## 1) 프로젝트 개요

두 플레이어가 팀 빌더에서 팀을 구성하고 즉시 배틀을 진행하는 브라우저 게임.

- 팀 빌더: 포켓몬/기술/도구/특성/성격 선택
- 배틀 엔진: Pokémon Showdown 기반
- 렌더링: Phaser + PokeRogue UI 이식 런타임

---

## 2) 핵심 구조

```text
src/
  app.js                        # 메인 앱(팀 빌더, 상태, 타임라인 연결)
  phaser-battle-controller.js   # app ↔ Phaser 브리지
  battle-presentation/
    timeline.js                 # 이벤트 타임라인 실행기
    battle-anim-player.js       # 기술/필드 연출 재생
  pokerogue-transplant-runtime/
    scene/battle-shell-scene.js # 배틀 씬/배틀러/연출 제어
    ui/*                        # 이식 UI 핸들러
server/
  showdown-engine.cjs           # Showdown 로그 → 구조화 이벤트
assets/
  manifest.json                 # 아이템/포켓몬 에셋 인덱스
assets/pokerogue/items/
  manifest.json                 # Pokerogue items 인덱스
```

운영 원칙:
- 원본 PokeRogue 코드 선독 후 정합 이식
- 배틀 이벤트는 `showdown-engine.cjs`에서 구조화하고 `timeline.js`가 순차 처리
- UI/씬 상태는 `app.js` 모델을 통해 단일 진입점으로 반영

---

## 3) 현재 상태 (요약)

완료:
- `BA-23` 기술/날씨/필드 연출 정합
- `BA-24` 테라스탈
- `BA-25` 다이맥스
- `BA-26` 폼체인지 표시명 정책
- `BA-27` 타임라인 재생 중 입력 잠금
- `BA-28` 한/영 명칭 분리 1~2차
- 아이템 스프라이트 보강 + 아이콘 manifest 인덱스 우선 매칭
- 아이템 한글화 보정(`Loaded Dice`, ZA 메가스톤 fallback)
- 폼 접미사 번역 누락 보정(`Droopy/Stretchy/Roaming/Artisan/Masterpiece/Terastal`)
- 언어 완결도 감사 스크립트 추가(`audit:language`) 및 0 leak 확인
- 미할당 렌더러블 스프라이트 폼 fallback 정책 반영(`unresolvedRenderableCount: 0`)
- Pikachu cap/cosplay 폼 전용 번호 에셋 매핑 상향(`PIKACHU_2`, `PIKACHU_8`~`PIKACHU_15`)
- 아이템 manifest 자동화/검증 스크립트 추가(`build:item-manifests`, `verify:item-manifests`)
- 기본 검증 묶음 추가(`verify:core`)

상세 완료 로그는 `CLAUDEMDPREVIOUS.md` 2026-04-19~20 섹션 참조.

---

## 4) 활성 우선순위

1. 스프라이트 품질 보강 2차 (잔여)
- fallback으로 해소한 폼 중 전용 번호 에셋 매핑 검증/상향
- 우선: Totem/사이즈/진품 폼, Pikachu starter/female 표시 정책

2. manifest/검증 파이프라인 문서화 및 CI 연계
- 로컬 기본 루틴은 `verify:core`로 고정
- CI 도입 시 `verify:core`를 기본 게이트로 연결
- 에셋 추가 시 `build:item-manifests` 절차 문서화

---

## 5) 고정 가드레일

- 기술/데미지/기절 이전에 HP/스프라이트 선반영 금지
- 타임라인 재생 중 `message-only` 잠금 유지
- 이벤트 순서 `move -> hp -> faint/switch` 보존
- 테라스탈/다이맥스 경로 상호 훼손 금지
- 기존 사용자 수정사항 임의 되돌리기 금지

---

## 6) 기본 검증 명령

- `node --check src/app.js`
- `node --check src/battle-presentation/timeline.js`
- `node --check src/pokerogue-transplant-runtime/scene/battle-shell-scene.js`
- `npm run audit:language`
- `npm run verify:item-manifests`
- `npm run verify:core`
- `npm run verify:ba20`
- `npm run verify:stage22`
- `npm run verify:passb`

---

## 7) 문서 관리 규칙

- 진행 문서: `plan.md`, `CLAUDE.md`
- 완료 문서: `planprevious.md`, `CLAUDEMDPREVIOUS.md`
- 원칙: 완료 항목은 활성 문서에 장기 보관하지 않고 previous 문서로 이관
