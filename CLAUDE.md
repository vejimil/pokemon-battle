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
- PBS metrics 3번째 컬럼(animation speed) scale 오해석 제거(Mega Chandelure/Terapagos 등 2배 확대 해소)
- 스프라이트 재노출 방어: `mount.fainted` 추적 + `renderBattlerSprite`/그림자 재노출 가드
- 다이맥스 기술 focus 부상 해소: `_resolveAnimEndpoints`가 다이맥스 multiplier로 displayHeight를 정규화
- 날씨 연출 중 기절 copy 재노출 차단: `BattleAnimPlayer`가 `prevUserVisible/prevTargetVisible`로 원본 숨김 상태일 때 USER/TARGET copy 스킵
- metrics 파이프라인 주석화(로딩 파일 5종·사용처 2곳 기록)
- HUD 1차: 기술 상세 POWER/ACC 행 원본 좌표 정합 + 원본에 없던 TYPE 라벨 제거
- HUD 1차: 빌더 종족값 chip(HP/Atk/Def/SpA/SpD/Spe + 합계) 표시 · hero_copy/editor-subtitle 설명문 제거
- HUD 1차: EV/IV 입력 포커스 손실 버그 수정(입력 중 `renderEditor()` 미호출) · EV 252/IV 31 즉시 토글 버튼 추가

상세 완료 로그는 `CLAUDEMDPREVIOUS.md` 2026-04-19~20 섹션 참조.

---

## 4) 활성 우선순위

1. 배틀 연출 안정화 (2차 패치 완료)
- Mega Chandelure/Terapagos 크기: PBS 3번째 컬럼(animation speed) scale 오해석 제거 (프로젝트 방침상 미사용)
- 다이맥스 기술 focus 부상: `_resolveAnimEndpoints`에서 focus 계산용 displayHeight를 dynamax multiplier로 정규화 (시각 스케일은 유지)
- faint 이후 재노출: `mount.fainted` 플래그 + BattleAnimPlayer copy 스프라이트에 `prevVisible` 가드 → 날씨/필드 anim에서 copy 경유 재노출 차단
- 소형 back 스프라이트(Pikachu 등) 상단 치우침: 프레임 높이 편차/PBS Y 보정값 간 calibration 이슈로 추정, 디버그 가시화 단계로 보류

2. HUD 확정 (1차 완료 · 일부 후순위 잔여)
- [완료] 기술 상세: 원본 좌표에 POWER/ACC 라벨 추가, 0/— → `---`, 스퓨리어스 TYPE 라벨 제거
- [완료] 빌더 종족값 chip 표시 · 불필요 설명문 삭제 · EV/IV 포커스 손실 수정 · 252/31 즉시 토글
- [기존 완료] 성별 표시(`GENDER_SYMBOL`/`GENDER_COLOR`), 파티 교체 메시지 locale(`lang()`)
- [보류] 정보창 이름 비트맵 폰트 — 한글 비트맵 폰트 자산 확보 필요
- [보류] EV/IV 다자리 연속 입력/화살표 길게 누르기 — 후순위

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
