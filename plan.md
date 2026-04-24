# Plan (2026-04-24 UTC)

기존 완료 이력/장문 기록은 `previous.md`로 이관했습니다.
이 문서는 **맨 아래 10개 수정사항(0~9)** 기준의 현재 진행 상태만 유지합니다.

## 10개 수정사항 상태
| 번호 | 항목 | 상태 | 메모 |
|---|---|---|---|
| 0 | ZA 메가진화 포켓몬 특성/종족값 최신화 | 완료 | Starmie-Mega 수치 + 공개 메가 특성 목록 반영 |
| 1 | 온라인 대결 준비 취소 후 수정 반영 안됨 | 완료 | 빌더 자동 동기화(debounce) 추가 |
| 2 | 모바일에서 다이맥스 시 키 입력 문제 | 대기 | 원인 재현/분기 분석 필요 |
| 3 | 게임 끝날 때 종료 턴 시작 전 승리 메시지 출력 | 완료 | 승리 메시지 표시 시점 지연 처리 |
| 4 | 게임 끝날 때 필드 등 초기화 | 완료 | 날씨/지형/함정/진영효과/지형 배경 정리 |
| 5 | 팀 순서 변경(슬롯 드래그) | 완료 | 빌더 슬롯 드래그 정렬 구현 |
| 6 | 포켓몬 검색 엔진(타입 등) | 대기 | 검색 인덱스/필터 UI 설계 필요 |
| 7 | 길동무 후 나온 마나피 발버둥만 사용 | 대기 | 전투 로그 재현/행동 요청 상태 추적 필요 |
| 8 | 먹밥, 생명의구슬 등 메시지 | 완료 | 아이템 출처 damage/heal 메시지 추가 |
| 9 | 더블배틀 구현 | 대기 | 엔진/요청/타깃팅 전면 확장 필요 |

## 오늘 완료(0, 1, 3, 4, 5, 8)

### 0) ZA 메가진화 수치 최신화
- 분석: `starmiemega`가 `Huge Power` 공개 이후에도 공격 종족값이 구버전 값(140)으로 남아 있었습니다.
- 해결:
  - `Starmie-Mega` 종족값을 `atk: 100`으로 보정.
  - 공개된 메가 특성 목록을 재조사해 `OFFICIALLY_CONFIRMED_FUTURE_MEGA_ABILITIES`를 확장 적용.
  - 신규 특성 `Piercing Drill`, `Spicy Spray`는 서버 런타임 특성으로 별도 등록(기존 `Mega Sol`, `Dragonize`와 동일 패턴).
  - 미공개 항목은 기존 fallback 규칙(기존 유지) 그대로 유지.
- 수정 파일:
  - `src/data/pokedex.js`
  - `src/battle-constants.js`
  - `server/showdown-engine.cjs`

### 1) 온라인 준비 취소 후 수정 반영 누락
- 분석: 서버 빌더 동기화가 사실상 `Ready ON` 시점 중심이라, `Unready 후 편집` 상황에서 즉시 반영이 누락될 수 있었습니다.
- 해결:
  - 로컬 빌더 변경(`saveState`) 시 온라인 조건에서 자동 동기화 예약.
  - debounce + signature 기반 중복 전송 방지.
  - 전투 중/Ready 상태/동기화 중에는 자동 동기화 억제.
  - 수동 sync/create/join/ready/start와 충돌하지 않게 타이머/기준 시그니처 정리.
- 수정 파일:
  - `src/app.js`

### 3) 승리 메시지 조기 출력
- 분석: `battle_end` 이벤트를 수신 즉시 메시지 출력하여, 체감상 종료 턴 연출보다 먼저 승리 메시지가 뜰 수 있었습니다.
- 해결:
  - `battle_end`는 즉시 출력하지 않고 큐에 저장.
  - 이벤트 루프가 끝난 뒤 승리 메시지를 최종 표시하도록 변경.
- 수정 파일:
  - `src/battle-presentation/timeline.js`

### 4) 게임 종료 시 필드 초기화
- 분석: 종료 시점에 날씨/지형/함정/진영효과 및 persistent terrain 배경이 잔존할 수 있었습니다.
- 해결:
  - 종료 배틀(`winner` 존재) 채택 시 필드 상태를 강제 0/빈값으로 정규화.
  - `battle_end` 처리에서 terrain persistent background 즉시 클리어.
  - 로컬 항복 종료 경로에서도 동일 초기화 적용.
- 수정 파일:
  - `src/app.js`
  - `src/battle-presentation/timeline.js`

### 5) 팀 순서 변경(드래그)
- 분석: roster는 슬롯 선택만 지원하고 배열 재정렬 경로가 없었습니다.
- 해결:
  - 슬롯 버튼 dragstart/dragover/drop/dragend 이벤트 추가.
  - `moveTeamSlot()`로 팀 배열 재배치 + 선택 슬롯 보정.
  - 드래그 시각 피드백 스타일(`dragging`, `drop-target`) 추가.
- 수정 파일:
  - `src/app.js`
  - `styles.css`
  - `index.html` (roster column id 정합)

### 8) 먹밥/생명의구슬 등 아이템 메시지
- 분석: `-damage/-heal`에서 item 출처 정보(`fromKind=item`)는 전달되지만, 타임라인 메시지 매핑이 비어 있었습니다.
- 해결:
  - damage/heal에 item source 메시지 생성 로직 추가.
  - 우선 Leftovers/Life Orb/Black Sludge/Shell Bell/Rocky Helmet/Sticky Barb 및 일반 fallback 지원.
- 수정 파일:
  - `src/battle-presentation/timeline.js`

## 검증
- 문법 검사 통과:
  - `node --check src/app.js`
  - `node --check src/battle-presentation/timeline.js`
  - `node --check src/data/pokedex.js`
- 회귀 스크립트:
  - `npm run verify:stage22` 실행
  - 결과: **Overall PASS**

## 남은 작업(2, 6, 7, 9, 10, 11)
- 2: 모바일 다이맥스 입력 경로 재현 후 `pkb-battle-ui-adapter`와 모바일 입력 디스패치 분기 동시 추적
- 6: 포켓몬 검색 인덱스(타입/특성/기술/태그) + UI 필터/정렬 설계 후 빌더 picker와 통합
- 7: 길동무 이후 request/actionable 상태와 PP/Struggle 분기 추적, 재현 로그 기반 수정
- 9: 더블배틀용 엔진 페이로드/요청모델/UI 타깃팅/타임라인 이벤트 확장
- 10: 렉 걸리는 지점 분석 후 해결 - 시작할 때, 필드 깔릴 때, 시작하고 첫번째 플레이어가 포켓몬 내보낸 후 그 외 렉 의심 지점들
- 11: 게임 시작할 때, 내보내기 전에 스프라이트 미리 보이는 문제 해결.
