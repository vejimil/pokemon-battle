# PKB Battle Presentation 활성 계획

Last updated: 2026-04-20  
Target: `/workspaces/pokemon-battle`

완료 이력 아카이브는 `planprevious.md` 기준으로 관리한다.  
이 문서는 현재 활성 작업과 다음 순서만 유지한다.

---

## 0) 오늘 상태 요약 (2026-04-20)

### 완료
- `BA-24` 테라스탈 구현 (2차 보강 포함) 완료
- `BA-25` 다이맥스 구현 완료
- `BA-25` 후속 안정화 완료
  - 다이맥스 버튼/토글 경로 보정
  - Max/G-Max 기술명·기술 모션 fallback 보정
  - 거다이맥스 가능 종 자동 거다이맥스 강제
  - 다이맥스 2.0x + metrics 동기화 + 일반 다이맥스 base Y 하향 조정
- `BA-23` 기술/날씨/필드 연출 보강 완료
  - 원본 `battle-anims.ts`, `common-anim-phase.ts`, `arena.ts` 선독 후 정합 이식
  - `focus=SCREEN` 좌표계 이식(필드/스크린 계열 애니 위치 보정)
  - 날씨/필드 `common-*` 연출 연결(`weather_start/tick`, `terrain_start`)
  - Z 기술 연출 규칙 반영: 물리=`Giga Impact`, 특수=`Hyper Beam`, 변화=`원본 기술 + scale 1.35`
- `BA-23` 후속 보강 완료 (사용자 피드백 반영)
  - `AnimTimedAddBg/AnimTimedUpdateBg` 배경 이벤트 지원(가뭄/모래바람 등 필드 배경 연출 복원)
  - `USER/TARGET` 프레임 재활성화 + `graphic=''` 애니 허용(버티기/바디프레스/사이코키네시스 계열 복원)
  - Z 물리/특수도 확대 적용(`scale 1.0`) + 타입 기반 tint 추가
  - terrain 파싱/정규화 보강(`move: Electric Terrain` 계열 id 인식)
  - USER/TARGET copy origin/scale 보정 + no-graphic 전용 base 오프셋(0,0) 정리
  - terrain 지속 배경 레이어 추가(terrain_end까지 유지)
  - 비데미지 날씨 턴말 lapse 메시지+연출 추가, weather_start 동턴 중복 tick 연출 스킵
  - move anim JSON array variant(상대 시점) 선택 로직 추가
  - move anim 상대 시점에서 원본 `oppAnim` 규칙(USER/TARGET swap) 복원
  - BG 타일 레이어 cover-scale 보정으로 4분할 seam 완화
  - terrain 지속 BG를 tile 반복이 아닌 단일 이미지 cover 표시로 교체
  - timed BG 좌표/크기/스케일/업데이트식을 원본 상수(`x=-320`, `y=-284`, `896x576`, `scale=1.25`)로 재정렬
  - timed BG depth를 배틀러 하단층으로 복원(플래시 우측 편중 현상 대응)
  - Phaser P1/P2 mount를 16:9 고정 폭 계산(`min(100%, 46vh*16/9)`)으로 화면비 일치
  - Phaser scale mode를 `FIT`으로 전환해 split 뷰 중앙 축소(letterbox) 완화
  - weather common 연출 스케일(`1.25`)은 유지하되 graphic-only 적용으로 포켓몬 본체 확대 부작용 제거하려 했으니, graphic-only 미적용으로 1.0 적용
  - battle tone 처리에 gray 채널(`tone[3]`)을 반영해 원본식 스프라이트 암전 연출 보강
- `BA-28` 영문 누출 한글화 1차 완료
  - `src/i18n-ko-locales.js` 신규 생성: `assets/pokerogue/locales/{en,ko}` 기준 `species/moves/abilities` 이름맵 자동 추출
  - `src/app.js`
    - 로케일 맵 병합 우선순위 보강(`KO_NAME_MAPS + locale 추출맵 + patch`)
    - move/ability/species/item canonical name 해석 추가(`toId`, trailing power suffix fallback)
    - `return102`/`frustration102` 같은 엔진 표시를 기본 기술명으로 정규화
    - 누락 영문 잔여분(3 moves, 9 abilities) 최소 patch 추가
  - `src/battle-presentation/timeline.js`
    - `localizeAbilityName` 주입 경로 추가
    - `ability_show` 메시지/ability bar 텍스트를 로컬라이즈된 이름으로 출력
  - 결과:
    - 한국어 모드에서 기술/특성 표기 영문 누출 축소
    - 영어 모드에서 id 기반 표기(`return102`)를 일반 영문 기술명으로 정규화
- 스프라이트 누락 조사 완료
  - `scripts/audit-missing-sprites.mjs` 추가
  - `reports/missing-sprite-audit.json` 생성
  - 조사 결과:
    - front-only: 29 (`ETERNATUS_1`, `STUDIOPROP*`)
    - 렌더 가능 폼 중 미할당: 33
    - 주요 항목: totem 계열, Pumpkaboo/Gourgeist 사이즈 폼, Sinistea/Polteageist 진품 폼, Pikachu cap/cosplay 일부

### 고정 순서 반영
- 요청 고정 순서: `25 -> 23 -> 28`
- 현재 남은 순서:
1. `BA-28` 후속: sprite 미할당 33건 대응 정책 결정(기본 폼 재사용 alias vs 에셋 추가)

---

## 1) BA-23 완료 보고 (원본 정합 이식)

### 반영 파일
- `src/battle-presentation/battle-anim-player.js`
- `src/pokerogue-transplant-runtime/scene/battle-shell-scene.js`
- `src/battle-presentation/timeline.js`
- `src/app.js`

### 핵심 반영
1. 원본 좌표계 정합
- `AnimFocus.SCREEN(4)`를 원본(`battle-anims.ts`)과 동일하게 절대 좌표로 처리
- 기존 TARGET fallback 오적용 제거로 스크린/필드 계열 프레임 위치 보정

2. 날씨/필드 연출
- `timeline weather_start/tick`, `terrain_start`에서 `common-*` 애니를 씬으로 실행
- `battle-shell-scene.js`에 `playFieldAnim()` 추가(기존 `BattleAnimPlayer` 재사용)

3. Z 기술 연출
- 턴 해석 시 선택정보 기반 Z 힌트 주입(`app.js`)
- `move_use` 이벤트에 Z 분류 메타를 실어 연출 분기
  - 물리 Z: `Giga Impact`
  - 특수 Z: `Hyper Beam`
  - 변화 Z: 원본 기술
  - 타입 기반 tint 적용

4. 후속 보강 (사용자 피드백)
- `battle-anim-player.js`
  - `AnimTimedAddBgEvent` / `AnimTimedUpdateBgEvent` 실행 경로 이식
  - `USER/TARGET` 프레임 재생 복원
  - `graphic`이 비어 있는 anim-data도 재생 가능하도록 로더 조건 보완
  - BG tileSprite를 화면 단일 cover 스케일로 맞춰 terrain/기술 배경 분할감 완화
  - anim-data 배열형 move에서 actor 시점에 맞는 variant(0/1) 선택
  - anim-data 배열형 move에서 `oppAnim` 활성 시 USER/TARGET endpoint swap 적용
  - timed BG add/update 좌표/알파 tween을 원본 규칙(`x/y`, depth 중간층)으로 재정렬
- `timeline.js`
  - 모래바람/싸라기눈 피해 메시지를 weather locale key로 출력
  - 날씨 피해 데미지 시점에 대응 필드 애니 재생
  - `terrain_start` effect를 `move:` 접두 포함 문자열에서도 정상 인식하도록 정규화
  - 비데미지 날씨(`sun/rain/snow/heavy-rain/harsh-sun/strong-winds`) 턴말 lapse 메시지+연출 추가
  - weather_start와 동턴 weather_tick의 중복 연출 스킵
  - terrain 시작 시 persistent terrain BG 적용, 종료 시 해제
- `showdown-engine.cjs`
  - `-fieldstart/-fieldend` effect를 `parts[2]` 기준으로 파싱해 `[from] ability` 태그 오염 제거
- `battle-shell-scene.js`
  - terrain별 persistent BG(`electric/grassy/misty/psychic`) 관리 API 추가
  - `playMoveAnim`에서 actor 시점 기준 variantIndex 계산 전달
  - persistent terrain BG를 단일 image cover 렌더로 변경(타일 반복 seam 제거)
- `styles.css`
  - P1/P2 Phaser mount 비율을 16:9로 고정해 화면비 차이 환경에서도 동일 비율 유지
- `runtime/controller.js`
  - Phaser scale mode를 `INTEGER_SCALE -> FIT`으로 전환해 split 뷰 letterbox 완화
- `app.js`
  - Z 메타에 `zMoveType` 전달
- 결과:
  - 가뭄/모래바람/전기필드 등 common 연출 표시 복원
  - `protect`, `body-press`, `psychic`, `endure` 등 기존 비어 보이던 기술 연출 복원
  - terrain(`electric/grassy/misty/psychic`) 시작 연출 키 정합 복원
  - USER/TARGET 프레임 과상단 배치 완화(일반/무그래픽 애니 분리 오프셋)

4. 타임라인 회귀 가드 유지
- 기존 순서(`move -> hp -> faint/switch`) 유지
- 타임라인 message-only 잠금 경로 변경 없음
- 테라스탈/다이맥스 경로 독립 유지

---

## 2) BA-25 완료 보고 (최종 안정화 포함)

### 원본 조사(수정 전 선행)
- `pokerogue_codes/src/field/pokemon.ts`
  - `isMax()` 판별 및 `getSpriteScale()`에서 Max 계열 1.5x 스케일 확인
- `pokerogue_codes/src/data/pokemon-forms/form-change-triggers.ts`
  - `gigantamaxChange` 메시지 분기 확인
- 확인된 제한사항:
  - 원본에 `DynamaxPhase` 명시 클래스는 없고, `isMax()` 기반 스케일/폼 메시지 경로 중심 구조

### 반영 파일
- `server/showdown-engine.cjs`
- `src/battle-presentation/event-schema.js`
- `src/battle-presentation/timeline.js`
- `src/pokerogue-transplant-runtime/scene/battle-shell-scene.js`
- `src/app.js`

### 핵심 반영
1. 서버 이벤트 파싱
- `-start|-end ... Dynamax`를 `dynamax_start`/`dynamax_end`로 구조화
- 다이맥스 동반 `-heal [silent]`를 일반 `heal`로 재생하지 않고 다이맥스 이벤트에 흡수
- 이벤트 필드: `target`, `species`, `gigantamaxed`, `hpAfter`, `maxHp`

2. 타임라인
- `dynamax_start`: 메시지 → 다이맥스 시작 연출 → info patch(HP/UI/dynamax 상태)
- `dynamax_end`: 메시지 → 다이맥스 해제 연출 → info patch(HP/UI 상태 복귀)
- 회귀 가드 유지:
  - 기술 전 HP/스프라이트 선반영 금지
  - `move -> hp -> faint/switch` 순서 보존
  - 타임라인 중 message-only 유지
  - 테라스탈 경로 독립 유지

3. Phaser 씬
- battler mount에 `dynamaxed/gigantamaxed` 상태 추가
- `isMax` 기준 2.0x 스케일 적용 경로 추가(최종)
- 확대 기준점은 중앙-하단(`origin(0.5,1)`) 유지
- 일반 다이맥스만 base Y 하향(+12), 거다이맥스는 하향 없음
- `setBattlerDynamaxState`, `playDynamaxStart`, `playDynamaxEnd` API 추가
- 테라 오버레이와 공존하도록 동기화

4. 앱 상태/렌더 모델
- battle info/model에 `dynamaxed`, `gigantamaxed` 전달
- Phaser sprite model(`enemySprite/playerSprite`)에 다이맥스 상태 전달
- 시각 해석(`resolveTimelineEventVisualState`)에 다이맥스 시작/해제 sprite 분기 추가
- 거다이맥스 가능 종 자동 처리: payload/서버 양쪽에서 `gigantamax` 강제
- `runtimeSupportsDynamax()`는 포맷/요청(`canDynamax`) 기반으로 계산
- Max/G-Max 기술 표시명은 request `maxMoves` 우선 사용, 연출은 원기술 `animationMove` fallback 사용

5. 테라스탈 즉시 KO 보정
- 변신 턴 즉시 기절 시에도 스프라이트/정보창 타입 반영이 유지되도록
  `resolveTimelineEventMon` 매칭을 보강(fallback species + 상태 우선 매칭)

---

## 3) 검증 결과

### 정적 검사
- `node --check src/battle-presentation/battle-anim-player.js` PASS
- `node --check src/battle-presentation/timeline.js` PASS
- `node --check src/pokerogue-transplant-runtime/scene/battle-shell-scene.js` PASS
- `node --check src/app.js` PASS
- `node --check src/i18n-ko-locales.js` PASS
- `node --check scripts/audit-missing-sprites.mjs` PASS

### 기존 회귀 스위트
- `npm run verify:ba20` PASS
- `npm run verify:stage22` PASS (금회 1회 실행, 기존 Mega Feraligatr 플래키 이력은 유지 관찰)
- `npm run verify:passb` PASS

### 인라인 다이맥스 검증
- `gen8customgame`에서 `move 1 dynamax` 실행 시
  - `dynamax_start` 이벤트 추출 + `hpAfter/maxHp` 포함 확인
  - 기존 `heal` 이벤트 오염 없이 `move_use/damage` 순서 유지 확인
- 3턴 종료 시점
  - `dynamax_end` 이벤트 추출 + 해제 HP(`153/153` 케이스) 반영 확인
- `gigantamax: true` 팀 payload 케이스
  - `dynamax_start.gigantamaxed === true` 확인

---

## 4) 다음 작업 (고정)

### BA-28 후속 (Sprite Audit)
1. `reports/missing-sprite-audit.json`의 `unresolvedRenderableForms` 33건 분류
2. 이름 불일치/기본 폼 재사용 가능 케이스(`Pikachu-*`, Totem 등)부터 `FORM_ASSET_OVERRIDES` 후보 확정
3. front-only(`ETERNATUS_1`)처럼 back 미존재인 케이스는 에셋 보강 전까지 fallback 정책 확정

---

## 5) 공통 작업 원칙 (유지)

- 수정 전 원본 코드 선독/정합 이식
- 배틀 연출 완성 전 UI 폴리시(UI-P1~P5) 착수 금지
- 단계 완료 직후 `plan.md`, `CLAUDE.md` 동기화
- 완료 이력은 `planprevious.md` 누적

---

## 6) 빠른 시작 메모

- 먼저 읽기: `CLAUDE.md` -> `plan.md` -> `planprevious.md`
- 다음 착수 항목: `BA-28` sprite 후속 정리
- 회귀 핵심 가드:
  - 기술 전 HP/스프라이트 선반영 금지
  - 타임라인 중 message-only 유지
  - `move -> hp -> faint/switch` 순서 보존
  - 테라스탈/다이맥스 상호 훼손 금지
