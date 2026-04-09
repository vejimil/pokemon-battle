# 완료된 작업 아카이브

Phase 1–11 완료 이력. 현재 코드베이스에 반영됨. 참고용으로 보관.

---

## Phase 1–6 (초기 이식 / 2026-04-07 이전)
- Phase 1: 죽은 코드 삭제 (pokerogue-ui/, legacy/, transplant.js)
- Phase 2: fight/command UI 버그 픽스
- Phase 3: party-ui-handler 초기 재작성
- Phase 4: battle-info.js 초기 수정 (overlay 스프라이트 추가)
- Phase 5: app.js 모델 레이어 수정
- Phase 6: battle-info.js 대폭 개선 (HP tween, numbers atlas, 상태이상, shiny/tera/spliced 아이콘, player HP숫자/EXP tween, enemy 보스 세그먼트)

## 2026-04-07 완료 (Phase 6)
1. LOGICAL_HEIGHT 240→180 수정 (constants.js)
2. 레이아웃 전면 수정 (ui.js layout())
3. ARENA_OFFSETS 수정 (constants.js)
4. 폰트 선명도 수정 (phaser-utils.js): resolution 3→1
5. 커서 origin 수정 (command/fight-ui-handler.js)
6. 어빌리티 바 위치/방향 수정 (battle-info.js)

## 2026-04-08 완료 (Phase 7)
1. 타입 아이콘 y 오프셋 복원 (battle-info.js): (-15,-15.5)/(-15,-2.5)/(0,-15.5)
2. Phaser Scale 모드 변경 (controller.js): FIT → INTEGER_SCALE
3. aspect-ratio 수정 (styles.css): 4/3 → 16/9
4. 폰트 렌더링 방식 근본 수정 (phaser-utils.js): TEXT_RENDER_SCALE=6, fontSize×6 후 setScale(1/6)
5. wordWrap 6× 스케일 대응 (phaser-utils.js, battle-message-ui-handler.js, command-ui-handler.js)
6. 폰트 사전 로딩 크기 수정 (controller.js): 8px→48px
7. EXP 바 geometry mask 이식 (player-battle-info.js)
8. 배틀 전체화면 오버레이 구현 (app.js, index.html, styles.css)
9. **남색 바 해결**: BattleTray.setup() 마지막에 setVisible(false) 추가

## 2026-04-09 완료 (Phase 8-11)
1. HP frame 임계값 수정 (battle-info.js): pct>20 → pct>25
2. wordWrapWidth 전면 수정 (battle-message-ui-handler.js, command-ui-handler.js): 297/185/152px
3. Game resolution 통일 (controller.js): 1 고정
4. 폰트 크기 원본 맞춤 (text.js): WINDOW 16px, BATTLE_INFO 12px
5. Shadow 추가 (text.js): style별 자동 적용
6. lineSpacing 기본값 5 (phaser-utils.js)
7. message/nameText fontSize 수정 (battle-message-ui-handler.js): 16px
8. nameText truncation (battle-info.js): 60px/98px 초과 시 "..."
9. nameBox width 버그 수정: .width → .displayWidth
10. 타입 아이콘 atlas 조사: 원본 동일, 수정 불필요
11. fight-ui-handler: typeIcon/moveCategoryIcon setVisible(false) 초기화, scale 0.8/1.0
12. enemy-battle-info.js: bg.setY(-1) 보정
13. fight-ui-handler: moveNameText/descriptionText 삭제, setInfoVis 패턴 적용
14. ui.js: partyModeActive 플래그 추가 — renderModel()에서 DOM sprite 재표시 차단
15. party-ui-handler: partyModeActive 플래그 토글
16. app.js: iconPath() → spriteId.toUpperCase() (Linux 대소문자 404 수정)

## 적 타입 아이콘 위치 — 이상 없음 확인 (2026-04-09)
- atlas JSON pbinfo_enemy_type1.json: multiatlas "textures" 포맷, trim 데이터 정상
- 오프셋 (-15,-15.5) 등은 원본과 동일 → 수정 불필요

## fight-ui-handler 1차 레이아웃 시도 — 실패로 폐기 (2026-04-09)
- 토글 버튼: width=30→24px, spacing=33→26px, 3개/행, x=241
- 풋터 버튼: x=248+index*42 → x=[1,44]
- 실패 원인: 오른쪽 패널 과밀 문제 근본 미해결 (moveNameText/descriptionText 존재)
- 후속 조치: Phase 11에서 moveNameText/descriptionText 삭제로 근본 해결
