// fontSize = logical px (createBaseText가 ×TEXT_RENDER_SCALE 처리)
// shadowX/Y = Phaser Text 내부 unscaled canvas 기준값 (원본 text.ts getTextStyleOptions()와 동일)
// 원본 기준:
//   WINDOW/MESSAGE:          96px render → scale 1/6 → 16px logical, shadow(3,3) #6b5a73
//   WINDOW_BATTLE_COMMAND:   96px render → 16px logical, shadow(4,5) #6b5a73
//   BATTLE_INFO:             72px render (96-24) → 12px logical, shadow(3.5,3.5) #6b5a73
//   MOVE_INFO_CONTENT:       56px render (96-40) → ~9px logical, shadow(3,3) #6b5a73
//   PARTY/MOVE_LABEL:        48px render (96-48) → 8px logical, shadow(4,5) #707070
const TEXT_STYLE = Object.freeze({
  // 원본 WINDOW (defaultFontSize=96 → logical 16px)
  WINDOW:                { fontSize: 16, color: '#f8f8f8', shadowColor: '#6b5a73', shadowX: 3,   shadowY: 3   },
  // 원본 WINDOW_BATTLE_COMMAND (96 → 16px, shadow 기본값 4,5)
  WINDOW_BATTLE_COMMAND: { fontSize: 16, color: '#f8f8f8', shadowColor: '#6b5a73', shadowX: 4,   shadowY: 5   },
  // 원본 BATTLE_INFO (72px = 96-24 → 12px logical)
  BATTLE_INFO:           { fontSize: 12, color: '#f8f8f8', shadowColor: '#6b5a73', shadowX: 3.5, shadowY: 3.5 },
  // 원본 PARTY/MOVE_LABEL (48px = 96-48 → 8px logical)
  BATTLE_INFO_SMALL:     { fontSize: 8,  color: '#f8f8f8', shadowColor: '#707070', shadowX: 4,   shadowY: 5   },
  // 원본 MOVE_INFO_CONTENT 근사 (56px = 7×8 → 56/6 logical, 8px 그리드 정렬)
  BATTLE_LABEL:          { fontSize: 56/6, color: '#f8f8f8', shadowColor: '#6b5a73', shadowX: 3,   shadowY: 3   },
  BATTLE_VALUE:          { fontSize: 56/6, color: '#f8f8f8', shadowColor: '#6b5a73', shadowX: 3,   shadowY: 3   },
  // HINT: 8px (48px render = 6×8) — 36px(6×6) 비정수 그리드 수정, 색상으로 시각 구분 유지
  HINT:                  { fontSize: 8,    color: '#94a3b8', shadowColor: '#334155', shadowX: 1,   shadowY: 1   },
});

export function addTextObject(ui, x, y, text = '', styleKey = 'WINDOW', options = {}) {
  const style = TEXT_STYLE[styleKey] || TEXT_STYLE.WINDOW;
  const t = ui.env.createBaseText(ui.scene, x, y, text, style.fontSize, style.color, options);
  // 원본 addTextObject()의 setShadow(shadowXpos, shadowYpos, shadowColor) 재현
  // TEXT_RENDER_SCALE이 동일(×6)하므로 unscaled canvas 기준값을 그대로 전달
  if (style.shadowColor != null) {
    t.setShadow(style.shadowX, style.shadowY, style.shadowColor, 0, true, true);
  }
  return t;
}

export function getTextColor(styleKey = 'WINDOW') {
  return (TEXT_STYLE[styleKey] || TEXT_STYLE.WINDOW).color;
}
