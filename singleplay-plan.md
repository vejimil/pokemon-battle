# 싱글플레이 무한 연전 (AI 대전) — 구현 계획

작성일: 2026-05-17 · 대상: `/workspaces/pokemon-battle`
관련 문서: `AI.md`(PokeRogue AI 로직 정리), `CLAUDE.md`(가드레일)

---

## 0) 목표와 확정 설계

**하고 싶은 것**: 싱글플레이용 HTML을 만들어, AI 상대로 **질 때까지 무한 연전**.

| 항목 | 확정 |
|---|---|
| 진입점 | 별도 HTML (`single.html`) 신규 생성 |
| 레벨 | 양측 **100 고정**, EV/IV 등 능력치 보정 없음 |
| AI 로직 | **PokeRogue AI 포팅** — `getMatchupScore` + `getNextMove` (`AI.md` §1 참고) |
| 상대 팀 | **매 배틀 무작위 합법 팀** 생성 |
| 회복 | **매 배틀 완전 회복** (HP/PP/상태이상 리셋) |
| 플레이어 팀 | 런 시작 시 **1회 빌드 후 고정** |
| 진행 | 승리 → 연승 카운트++ → 새 상대 / 패배 → 런 종료 + 결과 요약 |

---

## 1) 현재 구조 — 확인된 사실

- 배틀 엔진은 **서버 권위형 Showdown**. `POST /api/battle/start`, `POST /api/battle/choice`
  (`server/server.cjs:148-160`, `server/showdown-engine.cjs`).
- 클라이언트 진입은 `src/app.js` 하나. **HTML 프로필**은 서버가 파일명 기반으로 주입:
  `index.html → 'local'`, `online.html → 'online'` (`server/server.cjs:93,101`).
  → **새 HTML은 이 주입 허용목록에 추가해야** 프로필을 받는다.
- 현재 모든 배틀은 P1·P2 **양쪽 모두 사람**이 조작. AI는 코드 어디에도 없음.
- 턴 진행 메커니즘 (`src/app.js`):
  - 각 플레이어는 `battle.pendingChoices[sideId][slot]`에 선택을 스테이징.
  - `canAutoResolveEngineTurn`(`app.js:8012`)이 **양쪽 모두 ready인지** 확인.
  - 양쪽 ready → `submitShowdownLocalSinglesChoices`(`showdown-local-bridge.js:118`)가
    `pendingChoices`를 직렬화해 `/api/battle/choice`로 제출.
- **핵심 통찰** ⭐
  AI 측을 위해 새 턴 처리 경로를 만들 필요가 없다.
  **`battle.pendingChoices.p2`만 채워두면** 기존 `canAutoResolveEngineTurn` →
  `submitShowdownLocalSinglesChoices` 흐름이 그대로 동작한다.
  AI 작업의 본질 = "스냅샷을 보고 p2의 choice 객체를 만들어 `pendingChoices.p2`에 쓰기".
- choice 객체 포맷 (`serializeChoiceForShowdown` 입력, `showdown-local-bridge.js:148`):
  - 기술: `{kind:'move', moveIndex, target, mega, tera, z, dynamax}`
  - 교체: `{kind:'switch', switchTo}` (`switchTo` = 팀 인덱스)
- 배틀 종료는 `battle.winner`(승자 이름 문자열)로 표현 (`app.js:7065,8013,8815` 등).
- 빌더 Mon 포맷 `createEmptyMon()`(`app.js:4678`) → `buildShowdownPayloadMon`
  (`app.js:6904`)으로 변환 → 엔진 페이로드. **AI 팀도 이 빌더 Mon 포맷으로 생성**하면
  기존 변환 경로를 그대로 탄다.
- 로컬 덱스 데이터 보유: `src/data/{typechart,moves,pokedex,abilities,learnsets,items,natures}.js`
  → AI 점수 계산·무작위 팀 생성에 사용.

---

## 2) 아키텍처 개요

```
single.html  (신규)  ── window.__PKB_APP_PROFILE__ = 'single'
   │  <script src="./src/app.js">
   ▼
src/app.js  (APP_PROFILE === 'single' 가드 훅 몇 군데 추가)
   ├─ 팀 빌더: P1 패널만 사용 (기존 코드 재사용)
   ├─ 배틀 시작 시 P2 팀 = randomTeam()
   ├─ 매 렌더/선택 후: ai-trainer가 pendingChoices.p2 채움
   └─ battle.winner 감지 → run-controller에 통보
        │
        ├─ src/single-run/random-team.js   상대 팀 무작위 생성
        ├─ src/single-run/ai-trainer.js    AI 두뇌 (PokeRogue 포팅)
        └─ src/single-run/run-controller.js 무한 연전 루프 상태머신

server/server.cjs  (2줄 패치: single.html 프로필 주입 허용)
```

신규 코드는 `src/single-run/`에 격리 → `app.js`(10,906줄) 침습 최소화.
모든 `app.js` 변경은 `APP_PROFILE === 'single'` 가드로 감싸 **기존 local/online 모드 무손상**.

---

## 3) 단계별 작업 (Phase)

### Phase 0 — 진입점 & 프로필
1. `single.html` 생성. `index.html`을 기반으로:
   - 팀 빌더는 **P1 한 팀만** 노출 (P2 로스터 패널 제거/숨김).
   - 상단에 **연승 HUD** 영역 추가 (현재 연승 수, 최고 기록).
   - "배틀 시작" → **"무한 연전 시작"** 버튼.
   - `window.__PKB_APP_PROFILE__ = 'single';` 인라인 스크립트.
2. `server/server.cjs` 패치:
   - `server.cjs:93` 허용목록에 `'single.html'` 추가.
   - `server.cjs:101` 프로필 매핑에 `baseName === 'single.html' ? 'single'` 분기 추가.
3. `app.js`의 프로필 해석부(`app.js:20`)는 `'single'` 값을 그대로 통과시킴 — 확인만.

**검증**: `single.html` 접속 시 빌더 한 팀만 보이고 콘솔에 프로필 `single` 출력.

### Phase 1 — 상대 팀 생성 (`random-team.js`)

> **각주 ① 답** — "PokeRogue에 예시 팀이 있나? 무작위 기술이면 막 기술만 들고 나오지 않나?"
>
> PokeRogue 원본에는 **무브셋까지 짜인 고정 NPC 팀이 없다.** 있는 것은 두 가지뿐:
> - `signatureSpecies`(`data/balance/signature-species.ts`, 106줄) — 체육관 관장·사천왕·
>   챔피언별 **종족 풀**. 예: `BROCK: [ONIX, GEODUDE, [OMANYTE, KABUTO], AERODACTYL]`.
>   종족 ID 배열일 뿐, **기술·도구·특성은 없다.**
> - 일반 트레이너용 등급별 `speciesPools`(common~ultra rare).
>
> 즉 PokeRogue도 **기술은 매 배틀 생성**한다 — `ai-moveset-gen.ts`의 `generateMoveset`
> (`AI.md` §5). 따라서 "무작위 기술 = 막 기술" 문제의 해법은 **무작위로 뽑지 않는 것**이고,
> PokeRogue의 **가중 무브셋 생성을 포팅**하는 것이 정답이다.

구현 (`generateRandomTeam(size)` → 빌더 Mon 배열):

- **종족 선택**: 순수 무작위 대신 `signatureSpecies`를 합친 큐레이션 풀(또는 BST 하한
  필터)에서 추첨 → 종족 자체가 약체로 빠지는 것 방지. 트레이너 config 전체가 아니라
  **종족 ID 배열만** 쓰므로 이식이 가볍고, "매 배틀 무작위 팀" 성격도 유지된다.
- **무브셋**: `ai-moveset-gen.ts`의 `generateMoveset` 가중 로직 포팅 (`AI.md` §5):
  - 레벨업/(TM)/(알) 기술에 가중치 부여, 위력 기반 보정.
  - **시그니처 기술**(`FORCED_SIGNATURE_MOVES`, `signature-moves.ts`) 확률적 강제.
  - **자속(STAB) 데미지 기술 1개 강제** → 항상 쓸 만한 메인 무기 보장.
  - 무의미·중복 기술 제거 (조건 못 맞추는 날씨기 등).
  → 무작위지만 "STAB + 적정 위력"이 보장돼 막 기술 문제 해소.
- 특성/도구: 합법 범위 무작위 (도구는 `commonItems` 풀). 성격 무작위.
- 레벨 100 / EV 0·IV 31 (보정 없음).
- 출력이 빌더 Mon 포맷이므로 `buildShowdownPayloadMon`이 그대로 소화.

> 1차 단순화 옵션: 무브셋 생성 포팅이 부담되면, **종족만 큐레이션 풀에서 뽑고
> 기술은 "위력 ≥ 일정값 + STAB 우선" 가중 추첨**으로 시작해도 막 기술은 충분히 걸러진다.
> `generateMoveset` 완전 포팅은 그 다음 단계.

**검증**: 생성 팀을 엔진에 넣어 배틀이 오류 없이 시작되는지 (`/api/battle/start` 200),
생성된 무브셋에 STAB 데미지 기술이 1개 이상 포함되는지.

### Phase 2 — AI 두뇌 (`ai-trainer.js`, PokeRogue 포팅)
`AI.md` §1의 로직을 Showdown 스냅샷 + 로컬 덱스 위에 이식.

핵심 export: **`decideAiPendingChoices(battle, aiPlayerIndex)`** — p2의 모든 행동
슬롯에 대한 choice 객체를 만들어 `battle.pendingChoices.p2`에 기록.

내부 구현 (포팅 대상):
1. `getMatchupScore(aiMon, oppMon)` — `AI.md` §1 매치업 수식
   = `(atkScore + defScore) × min(hpDiffRatio, 1)`.
   - 타입 효과배수: `src/data/typechart.js`.
   - 특성 면역(레비테이트 등): `src/data/abilities.js` 참조.
2. **교체 판정** (`EnemyCommandPhase` Step 1 포팅):
   - 벤치 멤버별 매치업 점수 산출 → 최고 점수 멤버.
   - 후보 점수 ≥ 현재 점수 × **3** (보스 컨셉이면 × 2) → 교체 choice.
   - 묶임 상태·강제 교체(`request.forceSwitch`)는 별도 처리.
3. **기술 선택** (`getNextMove` 포팅):
   - `request.active[].moves`에서 사용 가능 기술 풀 확정 (pp 0·disabled 제외).
   - **즉사(KO) 기술 우선** 필터 (데미지 ≥ 상대 HP 추정 시).
   - 각 기술 점수 = 위력 × 타입효과 × STAB + 효과 보너스.
   - `SMART` 선택 룰렛: 인접 점수 비율 기반 확률로 다음 후보 advance.
4. **타겟 선택** (`getNextTargets`) — 싱글이면 자명, 더블 확장 대비만.
5. **테라 판정** — 간단 휴리스틱: 1턴차에 STAB·매치업이 개선되면 `tera:true`.

> **각주 ② 답 — UBS/TBS 전량 포팅이 비현실적인 이유**:
> 이익 점수는 설정 테이블이 아니라 **코드**다. 기술 효과는 `data/moves/move.ts`(12,584줄)
> 안의 **210개 `MoveAttr` 서브클래스**로 구현되고, 그중 ~44곳이 `getUserBenefitScore`/
> `getTargetBenefitScore`를 제각각 오버라이드한다. 각 오버라이드는 단순 상수가 아니라
> `globalScene`·`arena`·`BattlerTag`·특성 attr·날씨 등 **PokeRogue 런타임을 직접 호출**하는
> 실제 로직이라, 점수를 그대로 쓰려면 그 런타임까지 함께 포팅해야 한다.
> 게다가 이 프로젝트의 기술은 Showdown move 객체라 PokeRogue의 attr 합성 구조와 1:1
> 대응이 없어, 사실상 기술 효과 로직을 하나하나 재구현하는 셈이 된다 (PokeRogue도 attr를
> 계속 추가·변경 중인 움직이는 표적).
> → 점수 산정 **골격**(매치업·KO 우선·`SMART` 룰렛)은 충실히 포팅하되, 개별 기술의 효과
> 가치는 카테고리/효과 키 기반의 **간결한 휴리스틱 테이블**로 근사한다
> (예: 랭크업기 +, 상태이상기 +, 자버프 2랭크↑ ×1.25 등 — `AI.md` §1·§5 참고).
> 1차 구현은 "위력×효과×STAB + KO우선 + 매치업 교체"만으로도 충분히 그럴듯하다.
> 효과 보너스는 점진 확장.

**검증**: 단위 테스트 — 고정 스냅샷을 넣어 AI가 효과 좋은 기술/유리한 교체를 고르는지.

### Phase 3 — 무한 연전 루프 (`run-controller.js`)
상태머신: `IDLE → BUILDING → BATTLE → (WIN → BATTLE) | (LOSE → RESULT)`

- `startRun()`: 빌더의 P1 팀을 **스냅샷 복제해 잠금**(`run.lockedTeam`), 연승 0.
- `startNextBattle()`:
  - P1 팀 = `run.lockedTeam`의 **깊은 복사**(완전 회복 = 초기 상태 재전달).
  - P2 팀 = `generateRandomTeam(size)`.
  - 기존 `startEngineAuthoritativeSinglesBattle` 경로로 배틀 시작.
- 매 스냅샷 갱신 후 `battle.winner` 확인:
  - 승자 = P1 → `run.streak++`, 0.8초 후 `startNextBattle()`.
  - 승자 = P2 → `RESULT` 상태, 결과 요약 표시, "다시 도전" 버튼.
- `run.streak`/최고 기록은 `localStorage` 저장.

### Phase 4 — UI / HUD
- 연승 HUD: 현재 연승 / 최고 기록 / 다음 상대 미리보기(선택).
- 배틀 화면: 기존 Phaser 렌더러 재사용. P2 관점 탭은 숨김(상대는 AI).
- 배틀 종료 오버레이: 승리 시 "다음 상대 →", 패배 시 "N연승으로 종료 · 다시 도전".
- AI 사고 표시: 선택 직후 `pendingChoices.p2`를 채우므로 사실상 즉시. 필요 시
  "상대가 행동을 정하는 중..." 짧은 연출 딜레이만 추가.

### Phase 5 — 검증
- `node --check single.html`은 불가 → 대신 `node --check` 대상 신규 JS 모듈.
- `node --check src/single-run/*.js`, `src/app.js`.
- `npm run verify:core` (기존 회귀 — local/online 무손상 확인).
- 수동: 무한 연전 3~5회 완주, 승/패 분기, 강제 교체, 테라 동작 확인.

---

## 4) 모듈 인터페이스 (초안)

```js
// src/single-run/random-team.js
export function generateRandomTeam(size = 3): BuilderMon[];

// src/single-run/ai-trainer.js
export function decideAiPendingChoices(battle, aiPlayerIndex = 1): void; // pendingChoices 변이
export function getMatchupScore(aiMon, oppMon, ctx): number;             // 내부/테스트용
// 보조: scoreMove(), chooseSwitchIndex(), estimateDamage()

// src/single-run/run-controller.js
export function startRun(): void;
export function onBattleSnapshot(battle): void;   // app.js가 스냅샷 갱신마다 호출
export function getRunState(): {streak, best, phase};
```

### `app.js` 훅 (모두 `APP_PROFILE === 'single'` 가드)
| 위치(대략) | 추가 내용 |
|---|---|
| `buildShowdownBattlePayload`(`app.js:6975`) | single이면 `players[1].team = generateRandomTeam()` |
| 스냅샷 채택 `adoptEngineBattleSnapshot`(`app.js:7075`) | `run-controller.onBattleSnapshot(battle)` 호출 |
| `canAutoResolveEngineTurn`(`app.js:8012`) 직전 | single이면 `decideAiPendingChoices(battle, 1)` 호출 |
| `startBattle`(`app.js:7096`) | single이면 `startRun()` 경유 |

---

## 5) PokeRogue → 이 프로젝트 데이터 매핑

| PokeRogue | 이 프로젝트 대응 |
|---|---|
| `Pokemon` 객체 | 스냅샷 `battle.players[i].active[]` / `request.side.pokemon[]` |
| `getAttackTypeEffectiveness` | `src/data/typechart.js` 조회 함수 |
| `move.power / category / type` | `src/data/moves.js` |
| `species.type1/2 / baseStats` | `src/data/pokedex.js` |
| 능력치(스피드 등) | base stat + Lv100 + nature, EV 0·IV 31 (보정 없음 ↔ 요구사항 일치) |
| `aiType` SMART/SMART_RANDOM | 무작위 트레이너 = `SMART` 고정 |
| `moveset` PP | `request.active[].moves[].pp` |
| `getMoveQueue`(차지/재충전) | `request`의 잠금 기술 = `getForcedChoiceFromRequestSlot` 활용 |
| `trainer.getNextSummonIndex` | `chooseSwitchIndex` (벤치 매치업 최고) |
| `TeraAIMode` | 1차: 간단 휴리스틱, 추후 정식 룰 |
| `generateMoveset`(`ai-moveset-gen.ts`) | `random-team.js`의 가중 무브셋 생성 (Phase 1) |
| `signatureSpecies` / `FORCED_SIGNATURE_MOVES` | 상대 종족 큐레이션 풀 / 시그니처 기술 강제 |

---

## 6) 리스크 / 미해결 결정

- **R1. 상대 능력치 노출 범위** — 스냅샷이 상대 정확 스탯을 안 줄 수 있음.
  → AI는 base stat + Lv100으로 **추정**. 요구사항(보정 없음)과 부합하므로 허용 오차.
- **R2. UBS/TBS 전량 포팅 불가** — §3 Phase 2 스코핑대로 휴리스틱 근사. 점진 확장.
- **R3. 무작위 팀의 합법성** — 폼/배틀전용 기술/금지 조합. `random-team.js`에서
  기존 빌더 검증 로직(`renderValidation` 류) 재사용해 사전 필터 권장.
- **R4. 팀 크기** — 빌더 설정값을 따르고 AI 팀도 동일 크기. (현재 싱글 기본 3, 6 지원
  여부는 빌더 현황 확인 필요 — 첫 commit "6마리 저장" 참고.)
- **R5. 더블 배틀** — 1차는 **싱글 전용**. 더블은 `getNextTargets` 포팅 후 별도 단계.
- **R6. 난이도 곡선** — 레벨·EV 고정이라 난이도 상승 수단이 제한적. 추후 옵션:
  연승 구간별 AI 팀 품질↑(시그니처 기술 강제, 더 좋은 도구) — 1차 범위 외.

---

## 7) 작업 순서 요약 (체크리스트)

- [ ] Phase 0: `single.html` + `server.cjs` 2줄 패치 + 프로필 통과 확인
- [ ] Phase 1: `random-team.js` — 큐레이션 종족 풀 + 가중 무브셋 생성(STAB 보장), 엔진 시작 성공
- [ ] Phase 2: `ai-trainer.js` — 매치업/기술 점수/교체, `pendingChoices.p2` 기록
- [ ] Phase 3: `run-controller.js` — 무한 루프 상태머신, 완전 회복, 연승 집계
- [ ] Phase 4: 연승 HUD + 배틀 종료 오버레이
- [ ] Phase 5: `node --check` + `npm run verify:core` + 수동 연전 테스트

각 Phase는 독립 검증 가능하도록 분리 (CLAUDE.md "분석→패치→회귀 검증" 원칙 준수).
```
