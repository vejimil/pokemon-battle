const TEXT_STYLE = Object.freeze({
  WINDOW: { fontSize: 8, color: '#f8fbff' },
  WINDOW_BATTLE_COMMAND: { fontSize: 8, color: '#f8fbff' },
  BATTLE_INFO: { fontSize: 8, color: '#f8fbff' },
  BATTLE_INFO_SMALL: { fontSize: 6, color: '#dbeafe' },
  BATTLE_LABEL: { fontSize: 6, color: '#dbeafe' },
  BATTLE_VALUE: { fontSize: 6, color: '#eff6ff' },
  HINT: { fontSize: 6, color: '#94a3b8' },
});

export function addTextObject(ui, x, y, text = '', styleKey = 'WINDOW', options = {}) {
  const style = TEXT_STYLE[styleKey] || TEXT_STYLE.WINDOW;
  return ui.env.createBaseText(ui.scene, x, y, text, style.fontSize, style.color, options);
}

export function getTextColor(styleKey = 'WINDOW') {
  return (TEXT_STYLE[styleKey] || TEXT_STYLE.WINDOW).color;
}
