# Plan: Animated Pokemon System 반영 수정안 (구현 전)

작성일: 2026-04-11 (UTC)  
기준 문서: `research.md`  
목표: 현재 JS 런타임을 DBK Animated Pokemon System 동작에 더 가깝게 맞추기.

주의:
- 이 문서는 구현 계획과 코드 스니펫만 포함한다.
- 실제 코드 변경은 아직 진행하지 않는다.

---

## 1) 우선순위

P0 (즉시):
1. 메트릭 키 정규화(여성 메트릭 exact 미적용, NIDORAN 키 미스)
2. 기본 스케일/애니메이션 속도 식을 DBK 기준으로 보정
3. 그림자 로직(`ShadowSize`, player-side shadow toggle) 보정
4. `*_숫자_female` 자산 매핑 지원

P1 (후속):
5. Phaser 실패 시 DOM fallback에도 메트릭 일부 반영
6. 회귀 검증 스크립트 추가(메트릭 정합 전용)

---

## 2) Task A — PBS 키 정규화 (female exact + Nidoran 미스 해결)

대상 파일:
- `src/pokerogue-transplant-runtime/runtime/pokemon-metrics.js`

핵심 문제:
- `headerToKey()`는 gender를 소문자(`..._female`)로 저장하지만, 조회는 `spriteId.toUpperCase()`를 사용함.
- 결과: female 메트릭이 exact hit되지 않고 fallback.
- `NIDORANfE`, `NIDORANmA`도 대소문자 불일치로 miss.

수정 방향:
- `headerToKey()`에서 species/form/gender를 동일 규칙(대문자)으로 정규화.
- 저장/조회 키 체계를 하나로 통일.

스니펫(계획안):
```js
function headerToKey(header) {
  const inner = header.slice(1, -1);
  const parts = inner.split(',').map(p => p.trim());
  const species = (parts[0] || '').toUpperCase();
  const form = (parts[1] || '').toUpperCase();
  const gender = (parts[2] || '').toUpperCase();
  let key = species;
  if (form) key += `_${form}`;
  if (gender) key += `_${gender}`;
  return key;
}
```

완료 기준:
- `_female` 자산 98개 중 exact hit가 0이 아니어야 함.
- `NIDORANfE`, `NIDORANmA` miss 해소.

---

## 3) Task B — DBK 기본 스케일/속도 식 반영

대상 파일:
- `src/pokerogue-transplant-runtime/runtime/pokemon-metrics.js`
- `src/pokerogue-transplant-runtime/scene/battle-shell-scene.js`

핵심 문제:
- scale 미지정 시 현재 `1` 사용. DBK 기본은 `front=2`, `back=3`.
- 현재 애니메이션 delay 식은 `120 * (2 / speed)`로 DBK 식과 반대 방향.

DBK 기준(참조):
- default scale: front 2, back 3
- delay: `((speed / 2.0) * 90)` ms

수정 방향:
- 런타임 기본값 상수 도입.
- scale 미지정 fallback을 `2/3`으로 변경. //1/2 로하자. 좀 더 빠르게.
- delay 계산식을 DBK와 동일하게 변경.

스니펫(계획안):
```js
// pokemon-metrics.js
export const DBK_DEFAULTS = Object.freeze({
  frontScale: 2,
  backScale: 3,
  frameDelayMs: 90,
  showPlayerSideShadows: false,
});
```

```js
// battle-shell-scene.js
const sprScale = isFront
  ? (metrics?.frontScale ?? DBK_DEFAULTS.frontScale)
  : (metrics?.backScale ?? DBK_DEFAULTS.backScale);

const animSpeed = isFront ? (metrics?.animFront ?? 2) : (metrics?.animBack ?? 2);
const delay = animSpeed > 0
  ? Math.max(1, Math.round((animSpeed / 2) * DBK_DEFAULTS.frameDelayMs))
  : 0;
```

완료 기준:
- scale 미지정 엔트리(대다수) 렌더 크기가 DBK 기준과 근접.
- `AnimationSpeed=1`이 빠르고 `3/4`가 느리게 동작.

---

## 4) Task C — 그림자 로직 정합 (`ShadowSize`, player-side toggle)

대상 파일:
- `src/pokerogue-transplant-runtime/scene/battle-shell-scene.js`

핵심 문제:
- 현재는 `shadowSize > 0`만 표시해서 음수 값이 모두 숨김 처리됨.
- DBK는 `shadowSize == 0`만 숨김. 음수는 축소 표시.
- player side shadow 기본 비표시(DBK 설정)도 현재 미반영.

수정 방향:
- 그림자 표시 조건을 `shadowSize !== 0` + side 설정으로 변경.
- size 계산을 DBK 계열 수식으로 반영:
  - `effective = shadowSize > 0 ? shadowSize - 1 : shadowSize`
  - `zoomX = 1 + effective * 0.1`
  - `zoomY = 0.25 + effective * 0.025`

스니펫(계획안):
```js
const isPlayerSide = !isFront;
const rawShadowSize = Number.isFinite(metrics?.shadowSize) ? metrics.shadowSize : 1;
const showBySide = isFront || DBK_DEFAULTS.showPlayerSideShadows;
const showShadow = showBySide && rawShadowSize !== 0;

if (showShadow) {
  const effective = rawShadowSize > 0 ? rawShadowSize - 1 : rawShadowSize;
  const zoomX = 1 + effective * 0.1;
  const zoomY = 0.25 + effective * 0.025;
  mount.shadow.setSize(frameH * 0.45 * zoomX, frameH * 0.11 * zoomY);
  mount.shadow.setVisible(true);
} else {
  mount.shadow.setVisible(false);
}
```

완료 기준:
- 음수 `ShadowSize` 엔트리가 숨김이 아니라 축소 그림자로 표현.
- player side 그림자는 기본값(false) 기준 비표시.

---

## 5) Task D — `*_숫자_female` 자산 매핑 지원

대상 파일:
- `src/app.js`

핵심 문제:
- `parseAssetFamilies()`가 `SNEASEL_1_female` 같은 ID를 의도적으로 skip.
- DBK의 `[SPECIES,FORM,female]` 흐름과 불일치.

수정 방향:
- 자산 ID 파싱을 3종으로 분리:
  - base (`SNEASEL`)
  - numeric (`SNEASEL_1`)
  - numeric+gender (`SNEASEL_1_female`)
- family 구조에 `numericGenders` 추가.
- `getAutoSpriteIdForSpecies()`에서 숫자폼 선택 후 성별이 있으면 `numericGenders` 우선 조회.

스니펫(계획안):
```js
function parseAssetIdParts(id = '') {
  const m1 = /^(.+?)_(\d+)_(female|male)$/i.exec(id);
  if (m1) return { baseId: m1[1], form: Number(m1[2]), gender: m1[3].toLowerCase() };
  const m2 = /^(.+?)(?:_(female|male|\d+))?$/i.exec(id);
  if (!m2) return null;
  const suffix = m2[2] || '';
  return {
    baseId: m2[1],
    form: /^\d+$/.test(suffix) ? Number(suffix) : null,
    gender: /^(female|male)$/i.test(suffix) ? suffix.toLowerCase() : null,
  };
}
```

```js
// family shape 확장
families.set(baseId, {
  baseId,
  baseExists: false,
  numeric: new Map(),
  genders: {},
  numericGenders: new Map(), // key: `${form}:${gender}`
  rawAssetIds: [],
});
```

```js
// getAutoSpriteIdForSpecies 내부
const genderKey = gender === 'F' ? 'female' : gender === 'M' ? 'male' : '';
if (genderKey) {
  const numericMatch = /^(.+?)_(\d+)$/.exec(assetId || '');
  if (numericMatch) {
    const ng = family.assetFamily.numericGenders.get(`${Number(numericMatch[2])}:${genderKey}`);
    if (ng) assetId = ng;
  } else if (toId(resolvedSpecies) === toId(family.baseSpeciesName)) {
    const g = family.assetFamily.genders[genderKey];
    if (g) assetId = g;
  }
}
```

완료 기준:
- `SNEASEL_1_female`류가 자동 선택 경로에서 배제되지 않음.
- form+female asset이 있는 종에서 해당 자산이 우선 채택.

---

## 6) Task E — DOM fallback에도 최소 메트릭 반영 (P1)

대상 파일:
- `src/app.js` (`renderAnimatedSprite`)
- `src/pokerogue-transplant-runtime/runtime/sprite-host.js` (필요 시)

핵심 문제:
- Phaser 실패 시 fallback 경로는 고정 120ms + 단순 draw만 수행.
- PBS 오프셋/스케일/속도/그림자 반영이 사라짐.

수정 방향:
- 최소 목표: fallback에서도 `AnimationSpeed`, scale 기본값만 반영.
- 확장 목표: position/shadow까지 단계적으로 반영.

스니펫(계획안):
```js
// app.js
import { loadPokemonMetrics, getMetricsForSprite, DBK_DEFAULTS } from './pokerogue-transplant-runtime/runtime/pokemon-metrics.js';

let fallbackMetricsPromise = null;
function getFallbackMetrics() {
  if (!fallbackMetricsPromise) fallbackMetricsPromise = loadPokemonMetrics();
  return fallbackMetricsPromise;
}
```

```js
// renderAnimatedSprite 내부
const metricsMap = await getFallbackMetrics();
const metrics = getMetricsForSprite(spriteId, metricsMap);
const animSpeed = facing === 'front' ? (metrics?.animFront ?? 2) : (metrics?.animBack ?? 2);
const delay = animSpeed > 0 ? Math.max(1, Math.round((animSpeed / 2) * DBK_DEFAULTS.frameDelayMs)) : 0;
```

완료 기준:
- Phaser 비활성/실패 상황에서도 속도 체감이 PBS와 유사.

---

## 7) Task F — 검증 스크립트 추가 (P1)

대상 파일:
- `scripts/verify-metrics-parity.mjs` (신규)
- `package.json` scripts

목표:
- 이번 수정의 회귀 포인트를 자동 검증.

검증 항목:
1. female exact hit 수가 0이 아님
2. `NIDORANfE`, `NIDORANmA` miss 아님
3. default scale fallback 값이 2/3으로 적용됨
4. `AnimationSpeed` delay 단조성(`1 < 2 < 3 < 4`)이 DBK 방향과 일치
5. `ShadowSize=-1`이 hidden이 아님(로직 단위 검증)

스니펫(계획안):
```js
// package.json
{
  "scripts": {
    "verify:metrics-parity": "node ./scripts/verify-metrics-parity.mjs"
  }
}
```

---

## 8) 실행 순서

1. Task A (키 정규화)
2. Task B (스케일/속도 식)
3. Task C (그림자 로직)
4. Task D (numeric+gender 자산)
5. Task F (검증 스크립트)
6. Task E (fallback 보강, 필요 시)

---

## 9) 완료 판정 체크리스트

- [ ] `verify:stage22` PASS
- [ ] `verify:passb` PASS
- [ ] `verify:metrics-parity` PASS
- [ ] female exact hit > 0
- [ ] `NIDORANfE`, `NIDORANmA` miss 0
- [ ] `AnimationSpeed` 체감 방향이 DBK 문서와 동일
- [ ] `ShadowSize` 음수 엔트리가 숨김 대신 축소로 렌더
- [ ] form+female 자산(`*_숫자_female`)이 자동 선택에서 배제되지 않음
