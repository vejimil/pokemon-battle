# Plan (2026-05-01 UTC)

완료 이력과 상세 분석/수정 기록은 `planprevious.md`로 이관했습니다.
이 문서는 **현재 남은 작업만** 유지합니다.

# 작업 시 필수 지침
 - 작업 완료 후 plan.md에 업데이트 할 것.
 - 브라우저에서 어떤 점을 검증해야하는지 보고할 것.

## 현재 작업 목록
| 번호 | 항목 | 상태 | 메모 |
|---|---|---|---|
| 9 | 더블배틀 구현 — DB-9 회귀/검증 | 진행 중 | DB-1~DB-8.5, DB-10 완료. 남은 단계는 DB-9(회귀/검증)뿐. 아래 §DB-9 참조. |
| 15 | 배틀 중 간헐 렉(내 포켓몬 1 출전 후 피격, 필드 연출 종료→배틀 필드 전환 사이) | 보류 | 더블배틀 우선; 본 항목은 후순위. |
| 16 | 더블에서 배틀 연출 위치가 조금 이상한 것 같은데, 확인해야함. | 수정 완료 | 아래 §16에 위치 조사와 보호계 연출 보정 기록 정리. |
| 17 | ability bar 미표시 케이스(Forewarn/Disguise/Volt Absorb/Clear Body/Truant 등) | 수정 완료 | `server/showdown-engine.cjs`의 `normalizeEventsFromLine()`에서 `-activate ability:`, `-immune`/`-fail`/`cant`/`-block`/`-start`/`-end`/`-item`/`-curestatus`의 `[from] ability:` 태그를 잡아 `ability_show` 선행 emit. 아래 §17 참조. |
| 18 | 테라스탈 상태 Tera Blast 사용 후 모든 턴 스킵 | 수정 완료 | 원인: UI의 lowercase `teraType`이 그대로 `@pkmn/sim`에 들어가 Tera Blast 동적 타입이 `fire`가 되고, 엔진 `runImmunity()`가 `Use runStatusImmunity for fire` 예외로 BattleStream을 종료. 서버 팀 입력만 `Fire` 같은 canonical type으로 정규화하고 snapshot/request는 기존 lowercase id 유지. 아래 §18 참조. |

---

## DB-9 회귀/검증

목표: 싱글 시나리오 회귀 + 더블 핵심 무브 시나리오(스프라이트 지정 무브, ally-target 무브, 광역 무브, 보호/대타) 단위 검증.

### 검증 전략
- 정적: 변경 파일별 `node --check`.
- 회귀 묶음: `npm run verify:core` (item-manifests/audit-language/ba20/stage22/passb).
- 신규 더블 회귀(권장 추가):
  - `verify:doubles-smoke` — 더블 포맷 시작 → 첫 턴 양쪽 단일 무브 → 정상 turn 진행 → 양쪽 기절/forceSwitch까지의 미니 시뮬레이션(샘플 팀 고정).
  - 무브 타깃 카테고리별 직렬화 단위 테스트(`single-opponent`/`adjacentAlly`/`alladjacentfoes`/`all`/`self`).
  - `playMoveAnim` 슬롯-쌍 endpoint 회귀(스냅샷 텍스트로 user/target 좌표 기록).
- 수동 시나리오:
  - 더블에서 한 슬롯이 보호 사용/다른 슬롯이 광역 무브 사용 → 보호 슬롯만 데미지 0 확인.
  - Helping Hand(`adjacentAlly`) 자기 슬롯에는 disabled 표시 확인.
  - 다이맥스/테라/메가/Z를 사이드 내 한 슬롯에서만 토글 가능함을 확인.
  - 한쪽만 기절 시 다음 턴 forceSwitch가 정상 슬롯에만 표시.

---

## 15번 필수 분석 포인트(보류)
- 재현 기준: player1 포켓몬 1 출전 후, 기술 피격/필드 설치/필드 연출 종료 직후 전환 구간에서 프레임 드랍 또는 멈춤 체감.
- 우선 점검 경로:
  - `src/battle-presentation/timeline.js` 지연(`_showMsg` minMs, `_delay`, `Promise.race` timeout) 체인
  - `src/pokerogue-transplant-runtime/scene/battle-shell-scene.js` 필드/배경 로딩 및 적용 타이밍
  - `src/battle-presentation/battle-anim-player.js` 프레임 루프/cleanup/텍스처 참조 안정성
- 완료 조건: 메시지 가독성은 유지하면서(과속 금지) 해당 전환 구간의 멈춤 체감을 유의미하게 감소.

---

## 16번 더블 배틀 연출 위치 확인 (조사 결과)
- 기준 코드:
  - 슬롯 base 배치: `src/pokerogue-transplant-runtime/ui/ui.js`
  - 무브 endpoint 산출: `src/pokerogue-transplant-runtime/scene/battle-shell-scene.js`의 `_resolveAnimEndpoints()` / `playMoveAnim()`
  - 타깃 선택: `src/battle-presentation/timeline.js`의 `_scanMoveOutcome()` 및 `move_use` 처리
- 슬롯 base 좌표(기본 perspective, p1=player/view 아래쪽, p2=enemy/view 위쪽):
  - 싱글: p1 slot0 base `(100,143)`, p2 slot0 base `(216,74)`.
  - 더블: `DOUBLES_MOUNT_OFFSET_X=28` 적용. p1 slot0 `(72,143)`, p1 slot1 `(128,143)`, p2 slot0 `(244,74)`, p2 slot1 `(188,74)`.
  - 실제 연출 endpoint는 base 자체가 아니라 렌더된 `phaserSprite.x/y`를 사용한다. 즉 base + PBS metrics offset이다. enemy/front는 `(frontX, frontY)`, player/back은 `(backX, 0.5*backY)`가 붙고, animation focus는 내부적으로 `spriteY - displayHeight/2`를 중심으로 삼는다. perspective가 p2로 바뀌면 p1/p2가 player/enemy mount를 서로 바꿔 탄다.
- 공통 target 선택 규칙:
  - `actorSlot`은 `ev.actor.slot`, 1차 `targetSlot`은 `ev.target.slot`.
  - 하지만 실제 무브 연출 target은 `move_use` 뒤의 `damage/heal/status/boost/effect_start/end`, `miss/immune/protect` 등을 스캔한 `animationTargets`의 첫 항목을 우선한다.
  - `animationTargets`가 2개 이상이고 모두 같은 side이면 `targetSideCenter=true`가 되어 대상 side의 visible slot0/slot1 sprite 평균점으로 쏜다.
  - 실패만 있고 성공 target이 없으면 `skipAnimation=true`로 무브 애니메이션 자체를 생략한다.
- 단일 공격:
  - 싱글: user slot0 endpoint -> target slot0 endpoint.
  - 더블: user의 실제 actor slot endpoint -> 성공/시도 target의 실제 slot endpoint. 같은 side 다중 target이 아니므로 중앙 평균을 쓰지 않는다.
- 스스로 사용(self):
  - 싱글/더블 모두 user endpoint와 target endpoint가 같은 actor slot이다.
  - 그래픽 focus는 자기 sprite 중심(`x`, `y - displayHeight/2`)에 걸린다. `actorSide === targetSide`라 상대용 variant swap도 타지 않는다.
- 상대 전체 공격(`allAdjacentFoes` / `all-opponents`):
  - 싱글: 살아 있는 상대가 1마리라 단일 공격과 동일하게 target slot0 endpoint.
  - 더블: 양쪽 상대 slot이 모두 `animationTargets`에 잡히면 target side center를 사용한다. p1이 p2 전체를 공격하면 대략 p2 slot0/slot1 평균, 즉 base 기준 `(244,74)`와 `(188,74)`의 중간 `(216,74)` + 평균 front metrics가 target endpoint가 된다. p2가 p1 전체를 공격하면 p1 slot0/slot1 평균 `(100,143)` + 평균 back metrics가 된다.
  - 이 경우 main animation은 side 중앙 1회, 이후 성공 target이 복수이면 `playMoveImpact()`가 각 성공 target slot에 별도 impact pulse를 찍는다.
- 전체 공격(`allAdjacent` / `all-other-pokemon`, `all` / `all-pokemon` 계열):
  - 더블에서 대상이 양 side에 걸치면 `uniqueTargetSides.size > 1`이라 target side center를 쓰지 않는다.
  - main animation target은 전체 필드 중앙이 아니라 `animationTargets[0]`, 즉 성공 이벤트 순서상 첫 target이다. 예: p1 slot0의 Earthquake가 ally와 상대 둘을 모두 맞히면 첫 damage가 p1 slot1로 들어와 main animation이 p1 slot1 endpoint로 잡힐 수 있고, 이후 impact pulse만 p1 slot1/p2 slot0/p2 slot1에 각각 찍힌다.
  - ally가 Protect 등으로 막혀 첫 성공 target이 상대 slot이면 main animation target도 그 상대 slot로 바뀐다. 따라서 전체 공격은 현재 "항상 중앙"이 아니라 outcome 순서에 따라 첫 성공 slot에 붙는 구조다.
- 필드 공통 연출 참고:
  - `timeline._playFieldAnim()`은 전달받은 slot 옵션을 scene에 넘기지 않고, scene `playFieldAnim()`도 기본적으로 `p1 slot0 -> p2 slot0` endpoint를 쓴다. 날씨/지형류 공통 연출은 더블 slot 중심 보정이나 side center를 타지 않는다.
- 2026-05-01 보호계 연출 보정:
  - `Protect`/`Detect`/`Obstruct`/`King's Shield`/`Burning Bulwark`/`Guard Split`의 방어막 그래픽 프레임만 중앙 기준으로 보정했다. 기존 USER/TARGET copy, 일반 USER-focus 그래픽, 다른 무브 오프셋은 건드리지 않는다.
  - 상대 포켓몬이 보호/가드 계열 self/ally-side 기술을 쓸 때 원본처럼 opponent variant를 고르도록 `Protect`/`Detect`/`King's Shield`/`Burning Bulwark`/`Obstruct`/`Spiky Shield`/`Baneful Bunker`/`Silk Trap`/`Wide Guard`/`Quick Guard`/`Mat Block`/`Crafty Shield`에만 제한 적용했다.
  - 확인: `node --check src/battle-presentation/battle-anim-player.js`, `node --check src/pokerogue-transplant-runtime/scene/battle-shell-scene.js`, `Protect` 보정 전후 좌표 산술 확인.

• 조사해보니 정보 바 UI 자체 문제가 아니라, server/showdown-engine.cjs의 Showdown 프로토콜 → ability_show 이벤트 변환 지점이 맞는 원인입니다. UI는 ability_show만 오면 정상 표시합니다.

  현재 표시되는 경로:

  - server/showdown-engine.cjs:835 |-ability|... → ability_show
  - server/showdown-engine.cjs:848 날씨 [from] ability: ... → ability_show
  - server/showdown-engine.cjs:876 지형 [from] ability: ... → ability_show
  - src/battle-presentation/timeline.js:2088 ability_show → 실제 ability bar 표시

  빠지는 경로가 확실히 있습니다:

  - |-activate|포켓몬|ability: Forewarn 같은 형식은 server/showdown-engine.cjs:938에서 그냥 effect_activate로만 변환됩니다. 그래서 Forewarn, Disguise, Cud Chew, Protosynthesis, Quark
    Drive, Zero to Hero 같은 계열이 정보 바를 못 탑니다.
  - |-immune|포켓몬|[from] ability: Water Absorb 같은 형식은 현재 immune 이벤트로만 변환되고 ability 정보가 버려집니다. Water Absorb, Flash Fire, Volt Absorb, Wonder Guard, Good as
    Gold, Levitate류가 여기에 걸릴 수 있습니다.
  - |-fail|포켓몬|unboost|[from] ability: Clear Body|...도 현재 move_fail로만 가서 Clear Body, Hyper Cutter, White Smoke, Big Pecks 같은 능력치 하락 방지 특성이 정보 바에 안 뜹니다.
  //+ 게으름 같은 특성도 확인 바람.

  로컬 엔진으로 확인한 예:
  수정한다면 UI가 아니라 normalizeEventsFromLine() 쪽에서 고치는 게 맞습니다. -activate ability: X와 [from] ability: X가 붙은 -immune, -fail, -block, cant, 일부
  -start/-end/-item/-curestatus 계열에서 ability_show를 선행 생성하되, 날씨/지형처럼 이미 생성되는 케이스는 중복 표시를 막는 방식이 안전합니다.

---

## 17 Ability bar 누락 수정 (2026-05-02)

`server/showdown-engine.cjs`에 헬퍼 `extractAbilityShowInfo()` / `makeAbilityShowEvent()`를 추가하고 다음 핸들러에서 `ability_show` 이벤트를 선행 emit하도록 변경.

- 직접 `ability: X` 패턴 (parts[3] 위치):
  - `-activate` (Forewarn, Disguise, Cud Chew, Protosynthesis, Quark Drive, Zero to Hero, Lightning Rod 등)
  - `cant` (Truant)
  - `-start` / `-end` (Slow Start 등 비-substitute, 비-dynamax 케이스)
- `[from] ability: X` (+ 선택적 `[of] IDENT`) 패턴:
  - `-immune` (Volt Absorb, Water Absorb, Flash Fire, Levitate, Wonder Guard, Good as Gold 등)
  - `-fail` (Clear Body, Hyper Cutter, White Smoke, Big Pecks, Damp 등)
  - `-curestatus` (Hydration, Healer, Shed Skin 등)
  - 신규 케이스: `-block`, `-item`, `-enditem` (Frisk, Symbiosis 등)
- 기존 `-weather` / `-fieldstart` 처리는 그대로 유지 (중복 emit 없음).
- `[of] IDENT`가 있으면 그쪽이 ability owner, 없으면 라인 주체(parts[2])가 owner. `-activate`의 직접 패턴은 항상 parts[2]가 owner (Forewarn의 [of]는 ability target이므로 사용하지 않음).

### 검증
- `node --check server/showdown-engine.cjs` / `node --check src/battle-presentation/timeline.js` 통과.
- `npm run verify:core` 통과 (item-manifests, audit-language, ba20, stage22, passb).
- 인라인 smoke test 15개 라인(직접/[from]/[of]/날씨/지형/no-ability) — 모두 의도대로 ability_show 선행 emit 및 owner side/slot 정확. 날씨/지형은 단일 emit만 유지(중복 없음).

### 브라우저 검증 포인트
- 싱글에서 다음 시나리오에 정보 바가 뜨는지:
  - 미믹큐 첫 피격 → Disguise 변신 직후 ability bar.
  - Volt Absorb / Water Absorb / Flash Fire 무효 → 무효 메시지 직전 ability bar.
  - Clear Body / Hyper Cutter / Big Pecks 능력치 하락 차단 시 bar 표시.
  - Slaking 턴 스킵 → Truant bar.
  - Slow Start / Forewarn / Protosynthesis 첫 발동 시 bar.
  - 비/햇볕/모래/일렉트릭 필드 등 특성발 날씨·지형 시작 시 bar (회귀 — 기존 동작 유지).
- 더블에서 ally가 `[of]`로 emit되는 케이스(Damp가 ally의 자폭을 막을 때 등) ability bar가 owner 측 슬롯에 뜨는지 확인.
- ability bar가 두 번 겹쳐 뜨지 않는지(특히 날씨/지형 특성 시작 시 단일 emit만 유지되는지).

### 17.1 후속 보정 (2026-05-02)
1. Truant cant 메시지: `_cantMoveMessage`에서 `reason`이 `ability:`/`item:`/`move:`로 시작하면 괄호 내 표기를 생략하고 일반 "움직일 수 없다." 메시지로 통일. 어빌리티 바가 이미 같은 정보를 제공하므로 중복 표기 제거. (`src/battle-presentation/timeline.js` `_cantMoveMessage`)
2. 흡수 특성(Water Absorb / Volt Absorb / Earth Eater 등) HP < full 케이스:
   - showdown-engine `-heal` 핸들러에서 `fromKind === 'ability'`이면 `extractAbilityShowInfo()`로 ability_show를 선행 emit. 회복 자체는 그대로 emit.
   - timeline `_scanMoveOutcome`에서 `next.type === 'heal' && fromKind === 'ability'`면 immune 처리 — `result.immune=true`, `hadFailureSignal=true`, success 카운트에서 제외 → 기존 immune 경로처럼 `skipAnimation=true`가 되어 기술 모션 생략.
   - 결과: 풀피일 때(`-immune`)와 동일하게 기술 모션 생략 + 어빌리티 바 표시 + 회복 연출만 진행.

### 17.1 검증 포인트
- Slaking 턴 스킵 시 메시지가 "...은(는) 움직일 수 없다." 단독으로 뜨고 "(ability: Truant)" 꼬리표가 안 붙는지.
- 라프라스/탱탱겔(저수)이 풀피가 아닐 때 물 기술을 맞으면: (a) 기술 모션이 안 나오고, (b) 어빌리티 바에 "저수"가 뜨고, (c) HP가 1/4 회복되는 트윈만 보이는지.
- 풀피일 때(저수) 기존처럼 무효 메시지+어빌리티 바만 뜨는지 회귀 확인.
- 동일 흐름이 전기흡수(전기 기술), 흙먹기(땅 기술)에서도 동일하게 동작하는지.
- Recover/Sitrus Berry 등 일반 회복은 어빌리티 바를 띄우지 않는지(회귀).

### 17.2 후속 보정 — heal `[of]` 의미 차이 (2026-05-02)
Showdown은 흡수계 ability heal을 `|-heal|TARGET|HP/MAX|[from] ability: X|[of] ATTACKER` 형식으로 보내는데, 이때 `[of]`는 **흡수당한 기술의 시전자(공격자)**를 가리키며 ability owner가 아니다. (`-fail`/`-curestatus`의 `[of]`는 ability owner를 가리키는 것과 의미가 정반대.)

이전 패치에서 `extractAbilityShowInfo()`로 `[of]`를 ability owner로 사용해 owner가 공격자로 잡혔다 (예: 인텔리레온이 선인왕에게 물 기술을 쓰면 어빌리티 바가 "인텔리레온의 저수"로 표시됨).

수정: `-heal` 분기에서는 helper를 거치지 않고 heal target(parts[2])을 ability owner로 직접 지정. 흡수계 abilities는 heal 받는 쪽 = owner라는 불변식이 성립한다.

검증:
- 인라인 smoke test 3케이스(저수 부분 HP+`[of]`, 풀피 무효, 흙먹기+다른 슬롯 공격자) — owner가 모두 heal target 측으로 정확히 잡힘.
- `npm run verify:core` 9/9 회귀 통과.

---

## 18 Terastallized Tera Blast 턴 스킵 수정 (2026-05-02)

### 원인
- 재현: `teraType: 'fire'` 같은 lowercase 타입을 가진 포켓몬이 `move 1 terastallize`로 Tera Blast를 사용하면, Showdown 내부 `Tera Blast`의 `onModifyType()`이 `move.type = pokemon.teraType`을 수행한다.
- 프로젝트 UI/스냅샷은 타입을 lowercase id(`fire`)로 관리하지만, `@pkmn/sim`의 타입 면역 판정은 정식 타입명(`Fire`)을 요구한다.
- 결과적으로 `BattleActions.hitStepTypeImmunity()` → `Pokemon.runImmunity()`에서 `Use runStatusImmunity for fire` 예외가 발생했고, BattleStream queue가 error/ended 상태가 되어 이후 이벤트가 비어 보였다.
- 브라우저 증상은 타임라인 문제가 아니라 엔진 스트림이 죽은 뒤 snapshot/events가 불완전해져, 연출 없이 즉시 command로 돌아오는 형태였다.

### 수정
- `server/showdown-engine.cjs`
  - `canonicalShowdownTypeName()` 추가.
  - 팀을 `@pkmn/sim`에 전달할 때만 `teraType`을 `Fire`/`Normal`/`Stellar` 같은 canonical type name으로 정규화.
  - snapshot의 `mon.teraType`, request의 `canTerastallize`, request side pokemon의 `teraType`/`terastallized`는 기존 UI 규약대로 lowercase id로 유지.
- `scripts/verify-stage22-battle-regressions.cjs`
  - lowercase `teraType: 'fire'` + `Tera Blast` + `terastallize` 회귀 케이스 추가.

### 검증
- `node --check server/showdown-engine.cjs` 통과.
- `node --check scripts/verify-stage22-battle-regressions.cjs` 통과.
- 인라인 smoke:
  - 수정 전: stream queue error `Use runStatusImmunity for fire`, events 비정상.
  - 수정 후: `terastallize` → `move_use:Tera Blast` → `damage` → 상대 행동 → `turn_start` 정상 emit, queue error 없음.
- `node scripts/verify-stage22-battle-regressions.cjs` 통과.
- `npm run verify:core` 통과.

### 브라우저 검증 포인트
- 싱글에서 테라 타입이 불꽃/물/전기 등 lowercase UI id로 저장된 포켓몬에게 Tera Blast를 넣고, 테라스탈한 턴에 Tera Blast를 사용:
  - 테라스탈 연출 → Tera Blast 기술 메시지/연출 → 데미지/효과 메시지 → 상대 행동 → 다음 command 순으로 진행되는지.
  - 사용 직후 다음 턴에도 다른 기술/Protect/교체가 정상 연출되는지.
- 테라스탈하지 않은 상태의 Tera Blast가 기존처럼 Normal/Special로 정상 동작하는지 회귀 확인.
- 테라스탈 후 Tera Blast의 타입 아이콘/정보창은 테라 타입으로 보이고, command UI의 테라 타입 표기는 기존처럼 한국어 타입명으로 보이는지.

---

## 19 랜덤 배틀 필드 세트 로딩 (2026-05-02)

### 수정
- `assets/pokerogue/arenas`의 `*_bg.png`, `*_b.png`, `*_a.png` 세트를 기준으로 사용 가능한 arena id 목록을 런타임 상수에 추가.
- 서버 배틀 세션 생성 시 arena id를 무작위로 선택해 snapshot의 `arenaId`에 포함하고, 클라이언트는 기존 battle state에 arena id를 보존하도록 연결.
- Phaser battle shell은 `model.arena.id`를 보고 배경/bg, 상대 베이스/b, 플레이어 베이스/a 세 이미지를 같은 id 세트로 동적 로드/교체한다. 기본값은 기존 grass 유지.

### 검증
- `node --check` 대상 파일 통과: `server/showdown-engine.cjs`, `src/app.js`, `runtime/constants.js`, `runtime/controller.js`, `battle-shell-scene.js`.
- `scripts/verify-stage22-battle-regressions.cjs`에 arena id가 snapshot에 포함되고 교체 턴 뒤에도 유지되는 회귀 케이스 추가.
- `npm run verify:core` 통과.

### 브라우저 검증 포인트
- 새 배틀을 여러 번 시작했을 때 grass 외의 필드가 등장하는지.
- 배경, 상대 베이스, 플레이어 베이스가 같은 arena id 세트로 맞춰져 보이는지.
- 턴 진행/교체/폼체인지 후 필드가 grass로 되돌아가지 않고 유지되는지.

## 20 교체 퇴장 이벤트/연출 분리 (2026-05-02)

### 수정
- 서버 이벤트 파서가 active slot을 추적하고, 일반 `switch` 라인에서 기존 active 포켓몬이 있으면 `switch_out` 이벤트를 `switch_in`보다 먼저 emit한다. 초기 등장과 `drag`는 recall 이벤트를 만들지 않는다.
- timeline은 기존의 플레이어 측 `switch_in` 내부 추정 퇴장 코드를 제거하고, 명시적인 `switch_out` 이벤트에서 메시지 → 정보창 숨김 → 스프라이트 회수 → `switch_in` 메시지/등장 순서를 처리한다.
- 교체 메시지는 `assets/pokerogue/locales/*/battle.json`의 `playerComeBack`, `trainerComeBack`, `playerGo`, `trainerGo` 키를 사용한다.
- Phaser scene에 `switchOutBattler()`를 추가해 포켓볼 회수 SE와 함께 기존 스프라이트/그림자를 축소·페이드아웃하고 숨긴다.

### 검증
- `scripts/verify-stage22-battle-regressions.cjs`에 수동 교체 회귀 케이스 추가:
  - 초기 등장에는 `switch_out` 없음.
  - 수동 교체는 `switch_out:Pikachu` → `switch_in:Charizard` 순서.
  - `switch_out`에 `fromBall: true`, `cause: "switch"` 포함.
- `node scripts/verify-stage22-battle-regressions.cjs` 통과.
- `npm run verify:core` 통과.

### 브라우저 검증 포인트
- 플레이어가 교체할 때 locale 메시지 기준으로 “돌아와, 00!” → 기존 스프라이트/정보창 숨김 → “가랏! ㅁㅁ!” → 새 스프라이트/정보창 표시 순서인지.
- 상대가 교체할 때 `trainerComeBack` → 상대 스프라이트/정보창 숨김 → `trainerGo` → 새 상대 스프라이트/정보창 표시 순서인지.
- 교체 후 이어지는 상대 행동, 상태이상/날씨/턴 종료 메시지가 스킵되지 않는지.
