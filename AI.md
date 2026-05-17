# PokeRogue NPC AI / 포켓몬 구성 코드 정리

`pokerogue_codes/`(원본 PokeRogue 소스)에서 **NPC(적) AI 의사결정**과 **적 포켓몬/팀 구성**을 담당하는
코드를 조사해 정리한 문서다. 경로는 모두 `pokerogue_codes/src/` 기준이며, 라인 번호는 조사 시점 기준이다.

---

## 0) 한눈에 보기 — 핵심 파일 맵

| 영역 | 파일 | 역할 |
|---|---|---|
| AI 타입 enum | `enums/ai-type.ts` | `RANDOM` / `SMART_RANDOM` / `SMART` |
| 테라 AI enum | `enums/tera-ai-mode.ts` | `NO_TERA` / `INSTANT_TERA` / `SMART_TERA` |
| 적 행동 결정 페이즈 | `phases/enemy-command-phase.ts` | 매 턴 적의 교체/기술 사용 결정 |
| 매치업·기술 선택 | `field/pokemon.ts` | `getMatchupScore` / `getNextMove` / `getNextTargets` |
| 트레이너 로직 | `field/trainer.ts` | 파티 생성, 교체 대상 선정, 테라 판정 |
| 트레이너 설정·AI | `data/trainers/trainer-config.ts` | `TrainerConfig` / `TrainerAI` 클래스 |
| 파티 템플릿 | `data/trainers/trainer-party-template.ts` | 파티 크기·강함 구성표 |
| 종족 결정(진화) | `ai/ai-species-gen.ts` | 레벨에 맞는 진화/미진화 종족 결정 |
| 라이벌 팀 생성 | `ai/rival-team-gen.ts` | 라이벌 6마리 타입/약점 밸런싱 |
| 라이벌 풀 정의 | `data/trainers/rival-party-config.ts` | 라이벌 슬롯별 종족 풀·후처리 |
| 기술 세트 생성 | `ai/ai-moveset-gen.ts` | 적 포켓몬 4기술 자동 구성 |
| 상세 설계 문서 | `docs/enemy-ai.md` | 적 AI 수식 원문 (영문) |

---

## 1) 적 AI 의사결정 흐름 (`EnemyCommandPhase`)

`phases/enemy-command-phase.ts` — 매 턴 적 포켓몬 1마리마다 실행되며, 다음 순서로 행동을 정한다.

```
start()
 ├─ (트레이너 전투 & 큐에 예약 기술 없음 & 묶이지 않음)
 │    → 교체 평가 (Step 1)
 │       교체 결정 시 turnCommand = POKEMON, end()
 ├─ getNextMove()  → 사용할 기술 + 대상 결정 (Step 2)
 ├─ shouldTera()   → 테라 여부 결정
 └─ turnCommand = FIGHT 로 확정, end()
```

### Step 1 — 교체할 것인가?

트레이너 소속 적만 해당. (야생 포켓몬은 교체하지 않음)

1. 예약된 기술이 있거나(예: 하이퍼빔 재충전) 묶임 상태면 → 교체 평가를 건너뛰고 Step 2로.
2. 파티의 비전투 멤버 각각에 대해 현재 플레이어 포켓몬과의 **매치업 점수**를 계산
   (`trainer.getPartyMemberMatchupScores`).
3. 가장 높은 점수의 멤버에 **교체 빈도 패널티**(`switchMultiplier`)를 곱한다.
   - `enemySwitchCounter`는 교체 시 증가, 기술 사용 시 감소 → 자주 교체할수록 교체가 어려워짐.
4. 현재 포켓몬의 매치업 점수와 비교:
   - 일반 트레이너: 후보 점수 ≥ 현재 점수 **× 3** 이면 교체
   - **보스 트레이너**: ≥ 현재 점수 **× 2** (교체에 더 적극적)
5. 교체 결정 시 `getNextSummonIndex`로 들여보낼 슬롯을 정하고 페이즈 종료.

> **보스 트레이너 정의** (`docs/enemy-ai.md` 기준): 모든 체육관 관장 / 사천왕 / 챔피언,
> 모든 악의 조직 보스, 마지막 3회 라이벌전(웨이브 95·145·195).

### Step 2 — 기술 선택 (`EnemyPokemon.getNextMove`)

`field/pokemon.ts:6676`

1. 큐에 예약된 기술이 아직 쓸 수 있으면 그대로 사용.
2. 쓸 수 없는 기술 제거 → **무브 풀** 확정. 비었으면 발버둥(Struggle).
3. 무브 풀이 1개면 그대로 사용. **앵콜** 상태면 강제된 기술 사용.
4. **즉사(KO) 기술 우선**: 무브 풀 중 상대를 한 방에 쓰러뜨릴 수 있는 기술이 하나라도 있으면,
   그 기술들만 후보로 남긴다 (`getAttackDamage`로 시뮬레이션, 데미지 ≥ 상대 HP).
5. 각 기술의 **무브 점수** 계산 = 가능한 모든 대상에 대한 **타겟 점수**의 최댓값.
6. 무브 점수 내림차순 정렬 후 `aiType`에 따라 선택:
   - **`SMART_RANDOM`**: 5/8 확률로 최선 기술 선택, 3/8 확률로 다음 후보로 넘어가 재시도.
   - **`SMART`**: 인접한 두 기술의 점수 부호가 같을 때, `randInt(0,100) < round(s₍ᵢ₊₁₎/sᵢ × 50)`
     이면 다음 후보로. 점수가 비슷할수록 넘어갈 확률↑ (최대 50%).
   - **`RANDOM`**: 단순 무작위 (게임 내에서는 사용 안 됨).

### `aiType` 결정 규칙

`field/pokemon.ts:6559`

```ts
this.aiType = (boss || this.hasTrainer()) ? AiType.SMART : AiType.SMART_RANDOM;
```

→ **보스 또는 트레이너 소속 = `SMART`**, **일반 야생 = `SMART_RANDOM`**. `RANDOM`은 미사용.

### 매치업 점수 — `Pokemon.getMatchupScore`

`field/pokemon.ts:2689`

$$\text{MUScore} = (\text{atkScore} + \text{defScore}) \times \min(\text{hpDiffRatio},\,1)$$

- **`atkScore`**: 자신의 데미지 기술 타입들이 상대에게 갖는 평균 효과배수. STAB 시 ×1.5.
  PP 0이거나 변화 기술은 제외. (상태이상 카운터/미러코트는 공격기로 간주)
- **`defScore`**: 상대 타입이 자신에게 갖는 효과배수의 역수 (최대 4로 캡). 레비테이트 등 면역 반영.
- **`hpDiffRatio`**: 자신 HP비 − 상대 HP비 + 1. 스피드 우위면 ×1.25, 최대 1로 캡.
  - HP 20% 이하 "희생 후보" 보정: 약한 매치업이고 선공 못하면 ×0.85,
    그 외에는 `1 − hpRatio + (선공 0.2 / 후공 0.1)`로 재계산.
  - HP 20~40%면 ×0.5 (교체 후보로 밀어냄).

이론상 최대 점수 64, 실전 대부분 ≤ 16.

### 타겟 점수 / 타겟 선택

- **타겟 점수(TS)** = `getUserBenefitScore` + `getTargetBenefitScore × (적이면 −1, 아군이면 +1)`.
- 공격기는 추가로 **타입 효과배수**와 **STAB(×1.5)**를 곱함 (아군 대상이면 나눔).
- 미구현 기술(`(N)`으로 끝남)·실패 조건 기술·점수 0 → TS를 −20으로 패널티.
- **`getNextTargets`** (`field/pokemon.ts:6916`): 단일 대상 기술의 대상은 TBS 가중치 기반
  룰렛 추첨. 음수 가중치는 양수화하고, 최대 가중치 절반 미만 대상은 후보에서 제거 후
  누적 가중치 난수 추첨.

> 타겟 점수·이익 점수(UBS/TBS)의 수식 전문과 실전 예시는 `docs/enemy-ai.md`에 정리되어 있다.

---

## 2) 테라스탈 AI

### enum — `enums/tera-ai-mode.ts`

| 값 | 의미 |
|---|---|
| `NO_TERA` | 테라 안 함 |
| `INSTANT_TERA` | 첫 기술 사용 시 즉시 테라 |
| `SMART_TERA` | (enum만 존재, 현재 판정 로직 미구현) |

### `TrainerAI` 클래스 — `data/trainers/trainer-config.ts:69`

- `teraMode` + `teraLogic[]` 보관. 각 항목은 슬롯 인덱스 또는 `[슬롯, 조건함수]`.
- `instantTeras` getter: 조건을 평가해 즉시 테라할 슬롯 인덱스 목록 반환.
- `setInstantTera(index, condition?)`: 특정 슬롯을 즉시 테라로 등록.

### 테라 발동 판정 — `Trainer.shouldTera` (`field/trainer.ts:785`)

```ts
teraMode === INSTANT_TERA
  && !pokemon.isTerastallized
  && trainerAI.instantTeras.includes(pokemon.initialTeamIndex)
  && 이 포켓몬이 아직 한 번도 기절한 적 없음
```

`EnemyCommandPhase.shouldTera`가 이를 호출해 `preTurnCommand = TERA`로 설정.

### 설정 진입점

- `TrainerConfig.setInstantTera(index, condition?)` — 특정 슬롯 지정.
- `TrainerConfig.setRandomTeraModifiers(count, slot?)` — `genAIFuncs`에 콜백을 push.
  파티 생성 후 무작위(또는 지정) 슬롯을 즉시 테라로 설정하고, 특기 타입이 있으면
  테라 타입을 그 타입으로 맞춤. 나사꼬(SHEDINJA)는 특기 타입이 없거나 벌레일 때만 테라 가능.

---

## 3) 적 팀 구성 — 종족/레벨 결정

### 파티 템플릿 — `data/trainers/trainer-party-template.ts`

`TrainerPartyTemplate(size, strength, sameSpecies?, balanced?, evoLevelThresholdKind?)`

- **`strength`** (`PartyMemberStrength`): `WEAKER`/`WEAK`/`AVERAGE`/`STRONG`/`STRONGER`.
- **`sameSpecies`**: 같은 종족으로 채움.
- **`balanced`**: 타입 중복을 피하도록 종족 리롤.
- `TrainerPartyCompoundTemplate`: 여러 템플릿을 이어붙임 (슬롯별 강함 차등).

사전 정의 템플릿 예: `ONE_AVG`, `SIX_WEAK_BALANCED`, `GYM_LEADER_1~5`, `ELITE_FOUR`,
`CHAMPION`, `EVIL_LEADER`, `RIVAL`~`RIVAL_6`.

- 체육관 관장은 웨이브 구간에 따라 `GYM_LEADER_1`→`5`로 강해짐 (`getGymLeaderPartyTemplate`).
- 악의 조직 졸개는 격파한 보스 수에 따라 강해짐 (`getEvilGruntPartyTemplate`).

### 파티 레벨 — `Trainer.getPartyLevels` (`field/trainer.ts:263`)

```
baseLevel = 1 + 난이도웨이브/2 + (난이도웨이브/25)²
멤버 레벨 = ceil(baseLevel × 강함배수) + 레벨오프셋
```

강함배수: WEAKER 0.95 / WEAK 1.0 / AVERAGE 1.1 / STRONG 1.2 / STRONGER 1.25.
STRONG 미만 멤버는 웨이브가 깊어질수록 배수가 보정되고 약간의 음수 오프셋이 붙는다.

### 멤버 생성 — `Trainer.genPartyMember` / `genNewPartyMemberSpecies`

`field/trainer.ts:311`

1. `config.partyMemberFuncs[index]`가 있으면 그 고정 함수로 생성 (시그니처 포켓몬).
2. 명명 트레이너 더블전(예: 풍·란)이면 양쪽 트레이너의 시그니처 풀을 절반씩 사용.
3. 그 외에는 `genNewPartyMemberSpecies`:
   - **`speciesPools`(등급 풀)**가 있으면 `randSeedInt(512)`로 등급 추첨 →
     `COMMON`(≥156) / `UNCOMMON`(≥32) / `RARE`(≥6) / `SUPER_RARE`(≥1) / `ULTRA_RARE`(0).
     해당 등급이 비면 한 단계씩 다운그레이드.
   - 풀이 없으면 `randomSpecies`로 웨이브·레벨 기준 무작위.
   - **리롤 조건**: 미진화체로 떨어졌을 때 / 타입 밸런스 위반 / 특기 타입 불일치 /
     **중복 종족** → 최대 10회까지 재귀 리롤.
4. 시드: 고정 파티는 트레이너 타입 기반, 아니면 웨이브+타입+인덱스 기반.

### 진화 단계 결정 — `ai/ai-species-gen.ts`

`determineEnemySpecies(species, level, allowEvolving, forTrainer, strength, encounterKind)`

- **`getRequiredPrevo`**: 레벨이 진화 요구치보다 낮으면 강제로 미진화체(prevo)로 되돌림.
- 진화 가능 시 `evoPool`에서 추첨하고, **레벨 초과량에 비례하는 무작위 인자**로 진화 확정 여부 결정.
  - 레벨 차 허용 배수: `STRONG` 1.0 / `NORMAL`(트레이너) 1.1 / `WILD`(야생) 1.2.
  - 분기 진화는 무작위 선택, 다단계 진화는 재귀 처리.
- 클래식 모드 웨이브 20 트레이너전은 진화를 막아둠.
- `EvoLevelThresholdKind`: 보스는 `STRONG`, 일반 트레이너는 `NORMAL`, 야생은 `WILD`.

---

## 4) 라이벌 팀 생성 — 타입/약점 밸런싱

### `ai/rival-team-gen.ts`

라이벌(6연전)은 슬롯별 종족 풀과 **타입·약점 분산 제약**을 적용해 균형 잡힌 팀을 만든다.

- **`MAX_SHARED_TYPES = 1`**: 같은 타입을 파티에서 1마리까지만 허용.
- **`MAX_SHARED_WEAKNESSES = 2`**: 같은 약점 타입을 2마리까지만 허용.
- `getWeakTypes`: 종족 방어 타입 조합으로 2배 이상 약점 타입 집합 산출.
  레비테이트/흙먹기로 땅 면역이 확정된 종족은 땅을 제외. 슬롯 0은 1타입으로 테라할 것을
  가정해 2타입을 약점 계산에서 제외.
- `calcPartyTypings`: 앞 슬롯들이 선택한 종족(`CHOSEN_RIVAL_ROLLS`)의 타입·약점 집계.
- `checkTypingConstraints` / `convertPoolToChoices`: 제약을 만족하는 후보만 추림.
  제약을 만족하는 후보가 없으면 풀 전체를 후보로 사용(폴백).
- `getRandomRivalPartyMemberFunc(config, slot)`: 슬롯에 대한 멤버 생성 함수 반환.
  슬롯 0 생성 시 이전 라운드 롤 기록 초기화.

### 라이벌 풀 정의 — `data/trainers/rival-party-config.ts`

- `RivalSlotConfig`: `{ pool, postProcess, balanceTypes?, balanceWeaknesses? }`.
- `RIVAL_1_POOL`~`RIVAL_6_POOL`: 라운드별 슬롯 구성. 뒷슬롯일수록 `balanceTypes/Weaknesses` 활성화.
- `postProcess` 콜백: 레벨 고정, 시작 스타터 특성(`abilityIndex=0`)·테라 타입(1타입) 강제,
  보스 바 설정, 라이벌 시그니처 기술로 무브셋 재생성 등.

---

## 5) 적 기술 세트 생성 — `ai/ai-moveset-gen.ts`

`generateMoveset(pokemon, forceRivalSignatures?)`이 적 포켓몬의 4기술을 자동 구성한다.

### 전체 흐름

```
Step 1  풀 생성: 레벨업 기술 + (트레이너) 알 기술 + TM 기술
Step 2  금지 기술 필터링            (filterMovePool)
Step 3  트레이너용 가중치 보정       (adjustWeightsForTrainer)
Step 4  데미지 기술 가중치 보정      (adjustDamageMoveWeights)
Step 5  시그니처 기술 강제 시도      (forceSignatureMove)
Step 6  STAB 기술 강제              (forceStabMove)
Step 7  남은 슬롯 채우기 + 무의미 기술 제거 후 반복
```

### 풀(pool)과 가중치

- **레벨업 기술** (`getAndWeightLevelMoves`): 가중치 = 습득 레벨 + 오프셋.
  진화 기술·고위력 1렙 기술·(트레이너)리런 기술은 가중치 60 고정.
- **알 기술** / **TM 기술**: 트레이너 포켓몬만. 레벨 요구치에 따라 등급(common/great/ultra) 허용.
- `filterSupercededMoves`: 상위 호환 기술이 있으면 하위 기술 제거.

### 필터링 — `filterMovePool`

미구현 기술, 자폭류(`SacrificialAttrOnHit` 전원 금지), 보스의 자기기절·고통나누기,
트레이너의 일격필살기, 싱글에서 더블 전용기, 레벨 기반 금지 목록, 날씨/필드 변경기와
충돌하는 특성 보유 시 해당 기술, 옹고집 특성 시 변화기 등을 제거.

### 가중치 보정

- **`adjustWeightsForTrainer`**: 자기기절기 ×0.5, 2랭크↑ 자버프기 ×1.25, 다턴/재충전기 ×0.7.
- **`adjustDamageMoveWeights`**: 최고 위력 대비 비율로 가중치 스케일(최대 75% 감소).
  공격 스탯(물리/특수) 불일치 기술은 스탯비 기반으로 감산. 위력 상한 캡 적용.

### 시그니처·STAB 강제

- `forceSignatureMove`: `FORCED_SIGNATURE_MOVES`(라이벌은 `FORCED_RIVAL_SIGNATURE_MOVES` 우선)에
  종족별 시그니처가 있으면 `FORCED_SIGNATURE_MOVE_CHANCE` 확률로 강제 추가.
- `forceStabMove`: 시그니처가 없거나 데미지 STAB이 아니면, 자속(STAB) 데미지 기술을 가중 추첨해 강제.
- 보스는 `weightMultiplier`에 보너스가 붙어 고가중치 기술이 더 잘 뽑힌다.

### 남은 슬롯 채우기

- `filterRemainingTrainerMovePool`: 트레이너 포켓몬은 같은 타입 데미지기 중복 시 가중치를
  제곱근으로 줄이고, 새 STAB 타입이면 ×20 부스트 → 타입 다양성 유도.
- `filterUselessMoves`: 발동 조건 못 맞추는 날씨기(비/맑음/모래/싸라기눈)·자버프기·수면 의존기·
  오로라베일 등을 제거한 뒤 슬롯 재충전. 날씨 변경기가 2개 이상이면 하나 제거.

---

## 6) 이 프로젝트(`pokemon-battle`) 관점 메모

- 본 프로젝트의 배틀 엔진은 **Pokémon Showdown 기반**(`server/showdown-engine.cjs`)이고,
  `pokerogue_codes/`는 UI/연출 이식의 **원본 참고용 소스**다.
- 따라서 위 AI 로직은 현재 배틀에 직접 쓰이지 **않으며**, NPC AI나 적 팀 자동 구성을
  이식·재현할 때의 참고 자료다.
- 이식 시 우선 검토할 진입점:
  - 행동 결정: `phases/enemy-command-phase.ts` → `getMatchupScore` / `getNextMove`
  - 팀 구성: `field/trainer.ts`(`genPartyMember`) + `data/trainers/trainer-party-template.ts`
  - 기술 구성: `ai/ai-moveset-gen.ts`(`generateMoveset`)
- 수식 전문·실전 예시는 `pokerogue_codes/docs/enemy-ai.md`를 함께 볼 것.
