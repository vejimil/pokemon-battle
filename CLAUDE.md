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
- 에셋 잔여 정리 작업은 임시 보류(기능 안정화/HUD/통신 확장 우선)
- PBS metrics 3번째 컬럼 scale 오해석 제거(Mega Chandelure/Terapagos 최종폼 등 2배 확대 버그 해소)
- 스프라이트 재노출 방어: `mount.fainted` 추적 + `renderBattlerSprite`/그림자 재노출 가드, 스위치인/sprite 교체 시 해제

상세 완료 로그는 `CLAUDEMDPREVIOUS.md` 2026-04-19~20 섹션 참조.

---

## 4) 활성 우선순위

1. 배틀 연출 안정화 (1차 패치 완료)
- Mega Chandelure/Terapagos 크기: PBS 3rd 컬럼을 scale로 오해석 → 제거. 작은 포켓몬(Pichu/Tatsugiri)이 동일 값 "2"를 공유하는 점으로 scale 의미 불가 확정
- 대형 포켓몬 기술 시작 좌표: 원본 PokeRogue와 동일하게 `displayHeight/2` 기준 중앙 정렬 → 다이맥스/진짜 큰 종의 경우 원본 의도된 동작, scale 오해석 해소로 Mega Chandelure/Terapagos도 정합됨 (추가 케이스 발생 시 재진단)
- faint 이후 재노출: `mount.fainted` 플래그 도입, `renderBattlerSprite`/그림자 재노출 가드, `switchInBattler`/`prepareSwitchInBattler`/`setBattlerSprite`에서 해제

2. HUD 확정
- 정보창 이름 비트맵 폰트 적용(깨짐 방지)
- 성별 표시
- 기술 상세(type/power/accuracy) 가독성 개선(원본 자산/스타일 우선)
- 파티 교체 메시지 locale 연결 + 텍스트 박스 내 레이아웃 보정
- 빌더 UX: 종족값 표시, EV/IV 다자리 입력/길게누르기 입력 개선

3. 통신 플레이 확장
- 방 생성/참가 -> 양측 빌더 -> 준비 완료 -> 배틀 시작 흐름
- 팀 수 선택 범위 확장(`3~6`)
- 도전 시작 문구부터 배틀 종료까지 실전 루프 연결
- 모바일 가로 HUD(터치/십자키+ABXY) 대응

4. manifest/검증 파이프라인 문서화 및 CI 연계
- 로컬 기본 루틴은 `verify:core`
- CI 도입 시 `verify:core`를 게이트로 연결

---

## 5) 고정 가드레일

- 기술/데미지/기절 이전에 HP/스프라이트 선반영 금지
- 타임라인 재생 중 `message-only` 잠금 유지
- 이벤트 순서 `move -> hp -> faint/switch` 보존
- 테라스탈/다이맥스 경로 상호 훼손 금지
- 원인 재현/로그 없는 추측성 수정 금지(분석 -> 패치 -> 회귀 검증 순서 고정)
- 변경은 최소 침습 원칙 유지, 기존 기능 퇴행 금지
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
