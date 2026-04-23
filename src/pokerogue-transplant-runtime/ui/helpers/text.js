const TEXT_STYLE = Object.freeze({
  WINDOW: {
    fontSize: 16,
    fontFamily: 'emerald',
    padding: { bottom: 6 },
    color: '#f8f8f8',
    shadowColor: '#6b5a73',
    shadowX: 3,
    shadowY: 3,
  },

  WINDOW_BATTLE_COMMAND: {
    fontSize: 16,
    fontFamily: 'emerald',
    padding: { bottom: 6 },
    color: '#f8f8f8',
    shadowColor: '#6b5a73',
    shadowX: 4,
    shadowY: 5,
  },

  BATTLE_INFO: {
    fontSize: 12,
    fontFamily: 'emerald',
    padding: { bottom: 6 },
    color: '#f8f8f8',
    shadowColor: '#6b5a73',
    // PokeRogue TextStyle.BATTLE_INFO
    shadowX: 3.5,
    shadowY: 3.5,
  },

  BATTLE_INFO_NAME: {
    fontSize: 8,
    fontFamily: 'pkmnems',
    padding: { bottom: 6 },
    color: '#f8f8f8',
    shadowColor: '#6b5a73',
    shadowX: 2,
    shadowY: 2,
  },

  MOVE_INFO_CONTENT: {
    // Match PokeRogue TextStyle.MOVE_INFO_CONTENT exactly: 56px rendered at 1/6 scale.
    fontSize: 8,
    fontFamily: 'pkmnems',
    padding: { bottom: 6 },
    color: '#f8f8f8',
    shadowColor: '#6b5a73',
    shadowX: 0,
    shadowY: 0,
  },

  PARTY_NAME: {
    fontSize: 8,
    fontFamily: 'pkmnems',
    padding: { top: 2, bottom: 16 },
    color: '#f8f8f8'
  },


  PARTY: {
    fontSize: 8,
    fontFamily: 'pkmnems',
    padding: { top: 2, bottom: 16 },
    color: '#f8f8f8',
    shadowColor: '#707070',
    shadowX: 4,
    shadowY: 5,
  },

  PARTY_RED: {
    fontSize: 8,
    fontFamily: 'pkmnems',
    padding: { top: 2, bottom: 16 },
    color: '#f89890',
    shadowColor: '#984038',
    shadowX: 4,
    shadowY: 5,
  },

  HINT: {
    fontSize: 8,
    fontFamily: 'emerald',
    padding: { bottom: 6 },
    color: '#94a3b8',
    shadowColor: '#334155',
    shadowX: 1,
    shadowY: 1,
  },

  // 기존 호출 호환용 alias
  BATTLE_INFO_SMALL: {
    fontSize: 8,
    fontFamily: 'pkmnems',
    padding: { top: 2, bottom: 16 },
    color: '#f8f8f8',
    shadowColor: '#707070',
    shadowX: 2,
    shadowY: 2,
  },

  BATTLE_LABEL: {
    fontSize: 8,
    fontFamily: 'emerald',
    padding: { bottom: 6 },
    color: '#f8f8f8',
    shadowColor: '#6b5a73',
    shadowX: 2,
    shadowY: 2,
  },

  BATTLE_VALUE: {
    fontSize: 8,
    fontFamily: 'emerald',
    padding: { bottom: 6 },
    color: '#f8f8f8',
    shadowColor: '#6b5a73',
    shadowX: 2,
    shadowY: 2,
  },
});

export function addTextObject(ui, x, y, text = '', styleKey = 'WINDOW', options = {}) {
  const style = TEXT_STYLE[styleKey] || TEXT_STYLE.WINDOW;

  const mergedOptions = {
    ...options,
    fontFamily: options.fontFamily || style.fontFamily,
    padding: options.padding || style.padding,
  };

  const t = ui.env.createBaseText(ui.scene, x, y, text, style.fontSize, style.color, mergedOptions);

  if (style.shadowColor != null) {
    t.setShadow(style.shadowX, style.shadowY, style.shadowColor);
  }

  return t;
}

export function getTextColor(styleKey = 'WINDOW') {
  return (TEXT_STYLE[styleKey] || TEXT_STYLE.WINDOW).color;
}
