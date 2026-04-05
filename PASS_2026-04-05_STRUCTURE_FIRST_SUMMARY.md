# 2026-04-05 Structure-first Pokerogue shell pass

## 이번에 변경한 내용 (한국어)

이번 패스에서는 **배틀러 렌더링을 의도적으로 보류**하고, 그 대신 **Phaser 배틀 화면의 구조를 실제 Pokerogue 쪽 구조에 더 가깝게 재정렬**하는 데 집중했다.

### 핵심 변경점
- `src/phaser-battle-controller.js`
  - 전장(배경 / 적 플랫폼 / 아군 플랫폼) 레이어를 다시 정리했다.
  - 기존의 어색한 임시 전장 배치 대신, Pokerogue 기준의 **적/아군 플랫폼 오프셋**과 **배틀러 마운트 앵커 위치**를 따로 잡았다.
  - 배틀러는 이번 패스에서 실제로 렌더하지 않도록, **숨김 가능한 DOM 마운트 + 앵커 컨테이너 구조**로 정리했다.
  - 배틀러 URL이 있어도 이번 패스에서는 `deferred` 플래그를 우선하도록 처리했다.
  - 배틀러가 없을 때 더미 문자나 큰 플레이스홀더를 그리지 않도록 정리했다.

- 하단 UI 구조를 Pokerogue 쪽 문법에 맞게 재편했다.
  - 메시지 창: 하단 고정형으로 정리
  - 커맨드 창: 하단 우측 고정형으로 정리
  - 기술 선택 창: 하단 전체 구조로 다시 정리
  - 파티/교체 창: 기존 느슨한 패널이 아니라, **Pokerogue의 party_bg / party_cancel / slot 계열 에셋 중심 구조**로 재구성

- HUD / 정보창 / 파티볼 트레이 정렬을 재조정했다.
  - 적 정보창 / 내 정보창 위치를 Pokerogue 쪽에 더 가깝게 이동
  - 파티볼 트레이 위치도 더 Pokerogue스럽게 맞춤
  - HP/EXP/바 오버레이가 프레임 밖으로 튀어나오지 않도록 기존 구조를 정돈

- 텍스트 선명도 개선
  - Phaser 텍스트 resolution을 전반적으로 올리고,
  - 게임 생성 시 render resolution도 기기 DPR을 고려해서 잡도록 보완했다.
  - 완전한 최종 폰트 품질 보장은 아직 아니지만, 기존보다 흐릿하게 커지는 문제를 줄이는 방향으로 조정했다.

- 디버그/임시 표시 정리
  - 배틀러 부재 시 임시 플레이스홀더가 보이지 않도록 수정
  - 이번 패스 결과물이 "임시 디버그 화면"처럼 보이지 않도록 정리

- `src/app.js`
  - Phaser 뷰 모델에서 `enemySprite`, `playerSprite`에 **의도적인 battler deferral 플래그**를 넣어,
    이번 패스에서는 배틀러가 레이아웃을 망치지 않도록 했다.

## 다음에 해야 할 일 (한국어)

다음 패스의 우선순위는 아래 순서가 좋다.

1. **실제 Pokerogue 레이아웃과의 차이점 미세 교정**
   - enemy/player info box의 정확한 간격
   - 파티 슬롯 간격과 배경 여백
   - 메시지 / 커맨드 / 기술창 사이 간격
   - 커서 위치와 포커스 흐름

2. **파티/교체 UI를 더 실제 Pokerogue 흐름에 맞게 다듬기**
   - 선택 상태 표현
   - 취소 버튼 active/selected frame 반영
   - 슬롯별 상태 아이콘 / HP 표현 세밀 조정

3. **기술창 상세 정보 영역을 실제 Pokerogue에 더 가깝게 정리**
   - 타입/카테고리/PP/위력/명중률 배치
   - 설명 영역 줄바꿈 / 간격

4. **그 다음에 battler 통합 재개**
   - 지금 만든 battler mount anchor를 기준으로
   - 실제 Pokerogue 전장 구조를 유지한 채
   - 적/아군 battler 스프라이트를 다시 연결
   - 절대로 예전처럼 레이아웃을 망치는 하이브리드 방식으로 되돌리지 말 것

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
- Keep the current structure-first direction.
- Do not revert to a fake "Pokerogue-like" approximation.
- Continue using actual Pokerogue battle scene structure, UI handler flow, container hierarchy, and asset usage as the source of truth.
- If something still cannot be matched faithfully, say so explicitly instead of faking it.

Current state after the latest pass:
- The Phaser battle shell was restructured to be much more bottom-anchored and Pokerogue-like.
- Arena/background/platform layers were cleaned up.
- Enemy/player info boxes and party trays were repositioned closer to Pokerogue structure.
- Command / fight / party windows were rebuilt into a more Pokerogue-faithful shell.
- Party UI now uses Pokerogue party assets and a more faithful bottom-party layout.
- Text sharpness was improved.
- Battlers are intentionally deferred in this pass and should remain deferred until the shell alignment is tighter.
- Clean battler mount anchors now exist for later integration.

Main task for this next pass:
This should be a **tight correction pass** on top of the new shell.
Do not jump back into battler rendering yet.
First make the shell significantly more faithful to real Pokerogue in spacing, layout, cursor behavior, and window relationships.

Focus on:
1. Enemy/player info box spacing and exact alignment
2. Party tray spacing and alignment
3. Message / command / fight / party window spacing and containment
4. Party screen fidelity:
   - slot spacing
   - selection state
   - cancel button state/presentation
   - HP/status text placement
5. Fight window fidelity:
   - move label positions
   - detail panel layout
   - type/category/PP/power/accuracy arrangement
6. Cursor/focus flow:
   - make command/fight/party navigation feel more like real Pokerogue
7. Remove any remaining layout drift, generic panel feeling, or leftover approximation

Still do NOT:
- do not re-enable full battler rendering yet
- do not use fake battler placeholders
- do not manually guess a loose layout and call it close enough
- do not touch battle mechanics unless a tiny bridge fix is strictly required for UI correctness

Expected output:
- A code-only ZIP only
- Include:
  1. A Korean summary of what changed
  2. A Korean summary of what should be done next
  3. A copy-ready English prompt for the following chat
