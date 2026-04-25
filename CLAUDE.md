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

## 3) 고정 가드레일

- 기술/데미지/기절 이전에 HP/스프라이트 선반영 금지
- 타임라인 재생 중 `message-only` 잠금 유지
- 이벤트 순서 `move -> hp -> faint/switch` 보존
- 테라스탈/다이맥스 경로 상호 훼손 금지
- 원인 재현/로그 없는 추측성 수정 금지(분석 -> 패치 -> 회귀 검증 순서 고정)
- 변경은 최소 침습 원칙 유지, 기존 기능 퇴행 금지
- 기존 사용자 수정사항 임의 되돌리기 금지

---

## 4) 기본 검증 명령

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

## 5) 문서 관리 규칙

- 진행 문서: `plan.md`, `CLAUDE.md`
- 완료 문서: `planprevious.md`, `CLAUDEMDPREVIOUS.md`
- 원칙: 완료 항목은 활성 문서에 장기 보관하지 않고 previous 문서로 이관
