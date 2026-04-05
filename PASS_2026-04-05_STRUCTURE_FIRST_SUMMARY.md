# 2026-04-05 Pokerogue HUD structure correction pass

## 이번에 변경한 내용 (한국어)

이번 패스에서는 이전처럼 화면을 "포케로그 느낌"으로 다듬는 방식이 아니라,
**실제 Pokerogue의 BattleMessageUiHandler / CommandUiHandler / FightUiHandler / PartyUiHandler 구조를 기준으로**
현재 Phaser 배틀 셸을 다시 맞추는 방향으로 수정했다.

### 핵심 변경점

- `src/phaser-battle-controller.js`
  - 상단의 커스텀 요소를 제거했다.
    - Phaser 내부에 따로 그리던 `turnChip`, `bannerText`, `fieldStatusText`, 내부 perspective tab 구조를 더 이상 라이브 HUD에 쓰지 않도록 정리했다.
    - 즉, 실제 Pokerogue 전투 HUD와 무관한 상단 임시 정보들을 Phaser 전투 셸에서 제거했다.
  - 하단 UI를 **실제 Pokerogue 하단 UI 문법**에 더 가깝게 바꿨다.
    - 이제 하단은 단일 임의 패널이 아니라,
      1. `bg` 메시지 배경
      2. `commandWindow`
      3. `movesWindowContainer` (기술창 + 우측 상세창)
      구조로 나뉜다.
    - 즉, 이전의 “generic box 위에 Pokerogue skin” 느낌을 줄이고,
      Pokerogue의 실제 handler 분리 방식을 따라가도록 수정했다.
  - 커맨드창을 실제 Pokerogue 구조에 가깝게 정리했다.
    - Fight / Ball / Pokémon / Run 텍스트 배치와 Tera 버튼을
      실제 `CommandUiHandler`의 좌표 구조에 맞춰 재배치했다.
    - 커맨드창 배경은 이제 별도 임시 패널이 아니라 message handler 쪽 command window를 사용한다.
  - 기술창을 실제 Pokerogue 구조에 더 가깝게 정리했다.
    - move label들은 `FightUiHandler`처럼 별도 moves container 내부 좌표계로 정리했다.
    - 우측 상세창도 같은 하단 셸 안에서 동작하도록 바꿨다.
    - 타입 / 카테고리 / PP / 위력 / 명중률 / 설명 영역을 이전보다 Pokerogue 구조에 가깝게 정리했다.
  - 파티창은 계속 별도 full-screen handler처럼 동작하도록 유지하되,
    기존 구조를 그대로 살리면서 message/command/fight 하단 셸과 명확히 분리했다.
  - 메시지 표시도 이전처럼 “큰 primary + 작은 secondary”의 임의 구성에서,
    **실제 Pokerogue처럼 한 메시지 영역 안에 1~2줄 텍스트가 들어가는 방식**으로 더 가깝게 바꿨다.

- 배틀러는 계속 의도적으로 보류했다.
  - 이번에도 battler 렌더를 다시 억지로 끼워 넣지 않았다.
  - battler mount / anchor는 그대로 두고,
    HUD 셸 정렬을 우선하는 방향을 유지했다.

### 이번 패스에서 의도적으로 남겨둔 정직한 한계

완전히 "그대로" 가져오는 데 아직 남아 있는 구조적 제약이 있다.

- 현재 프로젝트는 **마우스 클릭 중심의 웹 UI**이고,
  Pokerogue는 **자체 입력 흐름(키보드/패드 중심) + UI handler 전환 구조**를 전제로 설계되어 있다.
- 그래서 현재 PKB 쪽에서는 `Back`, `Switch`, 토글류 행동을
  사용자가 클릭할 수 있도록 최소한의 클릭 affordance가 아직 조금 남아 있다.
- 이 부분까지 100% Pokerogue와 동일하게 만들려면,
  단순 좌표 수정이 아니라 **입력 흐름 자체를 Pokerogue식으로 더 깊게 옮길지** 먼저 결정해야 한다.
- 이번 패스에서는 억지로 숨겨서 오히려 사용성이 깨지는 것보다,
  구조는 Pokerogue 쪽으로 최대한 맞추되 클릭 가능성은 최소한 유지하는 쪽을 택했다.

즉,
**이번 패스는 “Pokerogue handler 구조를 더 직접 반영한 HUD 셸 수정”이지,
상호작용까지 완전 복제한 최종본은 아니다.**

## 다음에 해야 할 일 (한국어)

다음 패스는 그냥 또 눈대중 수정하면 안 되고,
**실제 Pokerogue의 현재 코드와 지금 PKB Phaser 셸을 1:1로 더 대조하는 정밀 correction pass**가 필요하다.

우선순위는 아래가 좋다.

1. **메시지 / 커맨드 / 기술창 관계를 더 정확히 맞추기**
   - 실제 Pokerogue의 window spacing
   - message bg와 command/move window의 정확한 상대 위치
   - prompt 위치
   - move detail 패널 내부 텍스트 배치

2. **파티창을 실제 Pokerogue select state 기준으로 더 정확히 맞추기**
   - slot 선택/비선택 frame
   - cancel button selected state
   - HP 텍스트 / 바 / 설명 텍스트 간격
   - active slot vs bench slot 차이

3. **enemy/player HUD box 정밀 교정**
   - info box 간격
   - tray 간격
   - HP/EXP 영역 위치
   - type icon 배치

4. **그 다음에, 정말 가능한지 검토 후 battler 통합 재개 여부 판단**
   - 지금처럼 battler 없이 셸이 먼저 정확해졌는지 확인
   - 정확한 mount 좌표가 확보되면 battler를 다시 얹는다
   - 만약 현재 구조에서 battler를 얹는 순간 또 어색해지면,
     그 시점에서 억지로 진행하지 말고 구조를 다시 상의해야 한다.

## 다음 채팅용 영어 프롬프트

Project: Pokémon Battle Game

Please continue from the latest code-only ZIP from the previous step.

Files I am providing together with this prompt:
1. My current latest project ZIP
2. The Pokerogue reference ZIP / relevant Pokerogue source files
3. The original project TXT/spec file

Important:
- Return a code-only ZIP only.
- Do not include assets.
- Do not make the UI merely “closer” to Pokerogue.
- Keep using actual Pokerogue code structure as the source of truth.
- If exact fidelity becomes structurally blocked, stop and explain the blocker clearly instead of forcing a fake approximation.

Current state after the latest pass:
- The Phaser battle shell now follows Pokerogue’s bottom UI grammar more directly.
- The old extra top-of-screen custom HUD elements inside Phaser were removed from the live shell.
- The bottom UI was reworked around a Pokerogue-like message background + command window + moves window container structure.
- Command UI now uses a structure much closer to Pokerogue’s CommandUiHandler layout.
- Fight UI now uses a structure much closer to Pokerogue’s FightUiHandler layout.
- Party UI remains a separate handler-style screen and is still battler-deferred.
- Battlers are still intentionally deferred.

Critical instruction for this next pass:
Do a **strict code-to-code correction pass**.
Do not tune by eye.
Compare the current PKB Phaser shell directly against Pokerogue’s real handler structure and positions.

Main focus:
1. BattleMessageUiHandler fidelity
   - message bg
   - commandWindow
   - movesWindowContainer
   - message text placement
   - prompt placement
2. CommandUiHandler fidelity
   - exact command text placement
   - cursor placement
   - tera button relation to the command grid
3. FightUiHandler fidelity
   - move label coordinates
   - cursor coordinates
   - right-side detail area placement
   - PP / power / accuracy / type / category arrangement
4. PartyUiHandler fidelity
   - exact slot spacing
   - active slot vs bench slot layout
   - cancel button state/presentation
   - HP text / HP bar / description alignment
5. Enemy/player info box and tray alignment
   - compare against Pokerogue code, not screenshots alone
6. Be honest about remaining structural blockers
   - especially any blocker caused by the current click-based PKB interaction model versus Pokerogue’s handler/input model

Still do NOT:
- do not force battler rendering back in yet
- do not do ad-hoc visual guessing
- do not silently keep custom UI pieces if Pokerogue does not use them
- do not fake exactness if the current architecture cannot support it

Expected output:
- A code-only ZIP only
- Include:
  1. A Korean summary of what changed
  2. A Korean summary of what should be done next
  3. A copy-ready English prompt for the following chat
