# 더블배틀 연출 고속화 계획

작성일: 2026-04-29
범위: 3번 작업, 더블배틀 연출 빠르게
상태: 1차 구현 반영

## 목표

더블배틀에서 같은 구간에 발생하는 연출을 순차 재생하지 않고 한 번에 처리한다.

- 광역기/날씨/필드/잔여 피해로 여러 포켓몬의 HP가 줄거나 회복될 때 HP바를 동시에 움직인다.
- 더블배틀 시작 또는 동시 교체 상황에서 포켓몬을 한 마리씩 내보내지 않고 함께 내보낸다.
- 기존 싱글 배틀 연출, 기절 처리, 폼체인지, Commander, party UI 복원 로직은 훼손하지 않는다.

## 현재 구조 요약

타임라인 재생은 `BattleTimelineExecutor.play()`가 이벤트 배열을 1개씩 순차 처리한다.

- 파일: `src/battle-presentation/timeline.js`
- 핵심 위치:
  - `play()` 순차 루프: `src/battle-presentation/timeline.js:1288`
  - `switch_in`: `src/battle-presentation/timeline.js:1351`
  - `damage`: `src/battle-presentation/timeline.js:1597`
  - `heal`: `src/battle-presentation/timeline.js:1641`
  - `weather_start/weather_tick`: `src/battle-presentation/timeline.js:1737`

Phaser 쪽 연출 함수는 이미 슬롯 단위 인자를 받는다.

- `switchInBattler(side, fromBall, { slot })`: `src/pokerogue-transplant-runtime/scene/battle-shell-scene.js:1709`
- `faintBattler(side, slot)`: `src/pokerogue-transplant-runtime/scene/battle-shell-scene.js:1675`
- `playMoveAnim(..., { actorSlot, targetSlot })`: `src/pokerogue-transplant-runtime/scene/battle-shell-scene.js:1950`
- `BattleInfo.tweenHpTo(...)`: `src/pokerogue-transplant-runtime/ui/battle-info/battle-info.js:231`

따라서 서버 이벤트 생성이나 snapshot 구조를 바꾸지 않고, 클라이언트 타임라인 재생기에서 안전한 이벤트 묶음만 병렬 처리하는 방향이 가장 안전하다.

## 병목 원인

1. 이벤트 루프가 항상 `await _applyEvent(ev)` 후 다음 이벤트로 넘어간다.
2. `damage/heal`은 각 대상의 HP tween 완료를 기다린다.
3. `switch_in`은 메시지, 정보창 갱신, 스프라이트 교체, 볼 연출, 울음소리까지 슬롯마다 끝까지 기다린다.
4. 더블에서는 Showdown 프로토콜상 광역기 피해와 동시 등장 이벤트가 연속으로 들어오기 때문에, 현재 구조에서는 같은 연출 묶음이 2~4배로 늘어진다.

## 구현 원칙

- 1차 구현은 `battle.mode === 'doubles'`일 때만 활성화한다.
- 서버 이벤트 순서, 로그, snapshot 채택 로직은 바꾸지 않는다.
- `_applyEvent()` 기존 분기는 되도록 유지하고, 배치 가능한 구간만 새 처리기로 우회한다.
- 배치 조건이 애매하면 기존 순차 경로로 떨어진다.
- 기절, Commander 복원, 폼체인지, 다이맥스, 테라스탈, 위치 교대는 1차 구현에서 병렬화하지 않는다.

## 설계안

### 1. 타임라인 루프에 배치 감지 추가

`BattleTimelineExecutor.play()` 루프에서 현재 이벤트 index를 기준으로 다음 중 하나를 시도한다.

1. `collectSwitchInBatch(events, index, context)`
2. `collectHpBatch(events, index, context)`
3. 배치가 없으면 기존 `_applyEvent()` 실행

예상 형태:

```js
const batch = this._collectFastBatch(events, index, context);
if (batch) {
  await this._applyFastBatch(batch, context);
  index += batch.events.length - 1;
} else {
  await this._applyEvent(ev, contextForEvent);
}
```

배치 실행 뒤 이벤트 gap은 묶음 마지막 이벤트 기준으로 적용한다.

### 2. HP 배치

대상:

- 연속된 `damage` 이벤트
- 연속된 `heal` 이벤트
- 같은 날씨/필드/아이템 원인으로 연속 발생한 피해/회복
- 같은 `move_use` 이후에 연속으로 발생하는 광역기 피해

초기 조건:

- 이벤트 타입은 `damage` 또는 `heal`
- 서로 다른 `side/slot` 대상
- 중간에 `faint`, `switch_in`, `move_use`, `forme_change`, `terastallize`, `dynamax_start/end`, `commander_activate`, `position_swap`, `battle_end`가 끼면 배치 중단
- 같은 대상에 대한 중복 HP 이벤트가 연속으로 있으면 배치하지 않거나 마지막 이벤트만 남기는 별도 처리가 필요

실행 순서:

1. source message가 있으면 필요 시 1회 표시한다.
   - 날씨 피해: “모래바람이...” 같은 메시지를 대상별로 반복하지 않는 방향 검토
   - 아이템 피해/회복: 대상별 의미가 강하면 순차 유지 가능
2. 같은 weather damage animation은 1회만 재생한다.
3. 각 대상의 `_slotInfo`를 먼저 모두 갱신한다.
4. 각 대상 `BattleInfo.tweenHpTo(...)`를 `Promise.all`로 실행한다.
5. hit result 메시지는 HP tween 후 표시한다.
   - 동일 문구는 1회로 축약 가능
   - 서로 다른 문구가 섞이면 기존 순서대로 표시

기대 효과:

- 스톤샤워/열풍/방전/지진 등 광역기 후 HP 감소가 한 번에 보인다.
- 모래바람/싸라기눈 같은 잔여 피해가 대상별로 늘어지지 않는다.

주의점:

- `faint` 이벤트는 HP 배치 뒤 기존 순서대로 처리한다.
- HP가 0이 된 포켓몬의 faint visual은 기존 `faint` 분기에서 처리해야 Commander 복원과 sprite guard가 깨지지 않는다.
- `BattleInfo.tweenHpTo()`는 내부에서 해당 `hpFill` tween만 kill하므로 서로 다른 슬롯은 병렬 실행 가능하다.

### 3. Switch-in 배치

대상:

- 연속된 `switch_in` 이벤트
- `fromBall === true`
- 서로 다른 `side/slot`
- 초기 소환 시퀀스 또는 동시 강제교체/동시 교체

배치하지 않을 조건:

- `drag` 계열
- 중간에 ability/weather/terrain/form/faint 이벤트가 끼는 경우

일반 교체처럼 앞 포켓몬이 사라지는 메시지/연출이 필요한 경우는 같은 플레이어의 2마리 교체일 때만 배치한다.
이 경우 회수 메시지와 숨김 처리를 먼저 묶어서 실행한 뒤, 새 포켓몬 2마리 등장 연출을 동시에 실행한다.

실행 순서:

1. 각 이벤트의 species와 slot name을 먼저 갱신한다.
2. 각 슬롯 BattleInfo를 갱신한다.
3. 메시지는 1회로 묶어서 표시한다.
   - 예: “양쪽 포켓몬이 등장했다!” 또는 “포켓몬들이 등장했다!”
   - 사용자 방향성 필요
4. 각 슬롯 sprite를 준비한다.
   - `_setBattlerSprite(..., { visible: false, slot })`
5. `scene.switchInBattler(...)`를 `Promise.all`로 실행한다.
6. 울음소리는 아래 중 하나로 결정한다.
   - A안: 첫 1마리만 재생
   - B안: 짧은 간격으로 2마리까지만 재생
   - C안: fire-and-forget로 겹침 허용

기대 효과:

- 더블 시작 시 4마리 등장 연출이 한 마리씩 늘어지지 않는다.
- 동시 교체/강제교체에서도 포켓몬이 한 번에 나온다.

주의점:

- `switchInBattler()`는 포켓볼 arc가 650ms + fade 250ms 수준이라 순차 실행 시 가장 눈에 띄게 길어진다.
- 초기 소환 전 pre-hide/preload는 `playTimelineAcrossActiveViews()`에서 이미 처리하고 있으므로, 배치 처리와 충돌하지 않도록 `preHideSwitchInSides` 경로를 유지해야 한다.

### 4. Weather/field 연출

1차 구현에서는 weather 자체를 크게 바꾸지 않는다.

- `weather_start`/`weather_tick` 메시지와 field animation은 기존 유지
- 다만 weather damage로 이어지는 `damage` 묶음은 HP 배치에서 동시에 처리
- `weather_tick` 직후 HP damage가 이어지는 경우, weather animation을 한 번만 재생하는지 확인

추가 개선 후보:

- 더블에서 `weather_tick` 메시지 hold를 줄이는 옵션
- weather damage animation과 HP tween을 일부 겹쳐 시작

## 리스크와 보호 장치

### 싱글 회귀 방지

- 배치 기능은 `battle.mode === 'doubles'`에서만 켠다.
- 싱글은 기존 `_applyEvent()` 순차 경로를 그대로 사용한다.

### 상태 선반영 회귀 방지

기존 핫픽스에서 타임라인 재생 중 `renderBattle()`이 최종 snapshot을 먼저 적용하지 않도록 막아둔 상태다.

- 관련 경로: `src/app.js:1813`, `src/app.js:9700`
- 이번 작업에서도 `state.battle` 전체 re-render를 추가하지 않는다.
- 배치 처리 중에는 `_slotInfo`와 현재 Phaser UI만 직접 갱신한다.

### 기절/Commander

- `faint`는 병렬화하지 않는다.
- `faintBattler()`와 Commander Tatsugiri 복원 로직은 기존 분기 그대로 실행한다.
- HP 배치에서 `fainted: true`는 `_slotInfo`에 반영하되, sprite 숨김은 `faint` 이벤트에서만 한다.

### 메시지 손실

- 광역 피해에서 hit result 메시지를 완전히 제거하지 않는다.
- 동일 문구 축약 여부는 사용자 방향성 필요.
- 중요한 아이템/특성 메시지는 1차 배치 대상에서 제외하거나 1회 표시 원칙을 명확히 둔다.

## 단계별 작업 순서

### Step 1. 배치 유틸만 추가

- `isDoublesFastTimelineEnabled(context)` 같은 판별 추가
- `slotKey(side, slot)` 기반 batch key helper 추가
- 배치 후보를 수집하는 함수 추가
- 아직 실행 경로에는 연결하지 않고 단위로 읽기 쉬운 형태 유지

### Step 2. HP 배치 실행 연결

- `damage/heal` 연속 묶음만 처리
- 같은 type끼리만 우선 묶는다.
- mixed damage/heal 묶음은 2차로 미룬다.
- 자동 검증 후 브라우저에서 광역기/날씨 피해 확인

### Step 3. Switch-in 배치 실행 연결

- 초기 소환 시퀀스부터 적용
- mid-turn 동시 교체는 조건을 더 보수적으로 둔다.
- 울음소리 정책 결정 후 반영

### Step 4. 튜닝

- HP tween duration 상한 조정 검토
  - 현재 `abs(delta) * 25`, 최대 3000ms
  - 더블 fast 모드에서는 최대치를 900~1200ms로 낮추는 선택 가능
- 메시지 hold 축소 검토
  - 더블 fast 모드에서 source/hit result 메시지만 짧게
  - 일반 move/ability/form 메시지는 기존 유지

## 검증 계획

자동 검증:

- `node --check src/battle-presentation/timeline.js`
- `node --check src/app.js`
- `npm run verify:core`

브라우저 수동 검증:

- 더블 시작 시 4마리가 순차가 아니라 함께 나오는지
- 지진/스톤샤워/방전/열풍 후 여러 HP바가 동시에 줄어드는지
- 모래바람/싸라기눈 residual 피해가 대상별로 늘어지지 않는지
- HP 0 이후 faint 연출은 기존처럼 각 포켓몬에 정상 적용되는지
- Commander 발동/어써러셔 기절/싸리용 복원 흐름이 유지되는지
- party UI 진입/복귀 후 스프라이트와 BattleInfo가 남거나 사라지지 않는지
- 싱글에서 HP, 기절, 폼체인지, 교체 연출이 기존과 동일한지

## 사용자 결정 필요 지점

1. 동시 등장 메시지 // B안인데, '00는 ㅁㅁ와 ㅂㅂ을 내보냈다! 이런 식으로. 단, 이때 플레이어 별로는 나눴으면 좋겠어. 플레이어가 동시에 내보내는 두마리만 동시에 나오게. 플레이어 1의 포켓몬 두마리 등장 => 플레이어 2의 포켓몬 두 마리 등장 이런 식으로.
   - A안: 각 포켓몬 이름을 모두 표시한다.
   - B안: “포켓몬들이 등장했다!”처럼 한 문장으로 축약한다.
   - C안: 메시지는 기존처럼 순서대로 표시하되, 볼 연출만 동시에 한다.

2. 울음소리 // 동시 재생. C안
   - A안: 첫 포켓몬만 재생
   - B안: 각 side 첫 포켓몬 1마리씩 재생
   - C안: 모두 재생하되 기다리지 않는다.

3. HP hit result 메시지 // 모래바람이 ㅇㅇ와 ㅁㅁ와 ㅅㅅ을 덮쳤다! 00와 ㅁㅁ에게 효과가 굉장했다!/별로였다./없는 것 같다.(정확한 메시지는 기존 참고) 처럼 같은 애들만 묶기. A안. 굉장했다와 별로였다가 같이 있는 경우 순차적으로 띄우기. - 그리고 이거 날씨랑 광역기 데미지만 고려해줘. 나머지는 필요 없음.
   - A안: 동일 문구는 1회만 표시
   - B안: 기존처럼 대상별 메시지를 유지하되 HP는 동시에 깎는다.
   - C안: 광역기에서는 효과 메시지를 생략하고 로그에만 남긴다.

4. 적용 범위 // A안.
   - A안: 더블배틀만
   - B안: 싱글도 광역/잔여 피해 묶음은 일부 적용

## 1차 권장안

- 적용 범위: 더블배틀만
- 동시 등장 메시지: 사용자 각주 기준 B안 변형
  - 플레이어별로 묶어 “플레이어는 A와 B을 내보냈다!” 형식으로 표시
  - 같은 플레이어의 두 포켓몬만 동시에 등장
- 울음소리: C안
  - 모두 재생하되 기다리지 않음
- HP hit result 메시지: A안
  - 날씨 피해와 광역기 피해만 배치 대상
  - 같은 hit result끼리 묶고, 서로 다른 hit result는 순차 표시
- 구현 순서: HP 배치 먼저, 그 다음 switch-in 배치

이 순서가 가장 안전하다. HP 배치는 sprite 생명주기를 직접 건드리지 않아 회귀 위험이 작고, 체감 속도 개선도 가장 크다. Switch-in 배치는 시각 효과가 크지만 스프라이트 visibility와 cry 정책이 엮이므로 HP 배치 검증 후 진행하는 편이 좋다.

## 2026-04-29 1차 구현 반영

- 더블배틀 전용 fast timeline 플래그를 추가했다.
  - `src/app.js`
  - `src/battle-presentation/timeline.js`
- 연속 `damage` 이벤트 중 아래 두 경우만 배치 처리한다.
  - 날씨 피해: 같은 weather id의 연속 피해
  - 광역기 피해: 같은 `move_use` 뒤에 이어지는 서로 다른 대상의 plain damage
- HP 배치에서는 대상별 `_slotInfo`를 먼저 갱신하고 `BattleInfo.tweenHpTo(...)`를 `Promise.all`로 실행한다.
- 광역기 hit result 메시지는 critical/super/not_very 그룹별로 묶어 표시한다.
- 연속 `switch_in` 이벤트는 같은 side/서로 다른 slot/`fromBall === true`/switch-out 메시지가 필요 없는 경우에만 배치 처리한다.
- 일반 더블 교체처럼 switch-out 메시지가 필요한 경우도 같은 side 2마리면 회수 메시지를 먼저 묶고 등장 연출은 동시에 처리한다.
- 동시 등장 메시지는 side별로 1회 표시하고, 볼 연출은 `Promise.all`로 동시에 실행한다.
- 울음소리는 모든 대상에 대해 fire-and-forget로 재생한다.
