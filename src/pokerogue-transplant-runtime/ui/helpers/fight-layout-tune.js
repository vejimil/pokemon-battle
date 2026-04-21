const AUX_MENU_DEFAULT = Object.freeze({
  x: 0,
  y: -84,
  minWidth: 40,
  maxWidth: 80,
  rowHeight: 10,
  textOffsetX: 0,
  textOffsetY: 0,
  sideInset: 3,
  topPadding: 3,
  bottomPadding: 3,
  textStyle: 'MOVE_INFO_CONTENT',
  textScale: 1,
});

const MOVE_INFO_PANEL_DEFAULT = Object.freeze({
  xOffset: 2,
  yOffset: 0,
});

function numberOr(raw, fallback) {
  return Number.isFinite(Number(raw)) ? Number(raw) : fallback;
}

export function getAuxMenuConfig() {
  const tune = (typeof window !== 'undefined' && window.PKB_FIGHT_AUX_TUNE && typeof window.PKB_FIGHT_AUX_TUNE === 'object')
    ? window.PKB_FIGHT_AUX_TUNE
    : {};
  return {
    x: numberOr(tune.x, AUX_MENU_DEFAULT.x),
    y: numberOr(tune.y, AUX_MENU_DEFAULT.y),
    minWidth: numberOr(tune.minWidth, AUX_MENU_DEFAULT.minWidth),
    maxWidth: numberOr(tune.maxWidth, AUX_MENU_DEFAULT.maxWidth),
    rowHeight: numberOr(tune.rowHeight, AUX_MENU_DEFAULT.rowHeight),
    textOffsetX: numberOr(tune.textOffsetX ?? tune.textLeft, AUX_MENU_DEFAULT.textOffsetX),
    textOffsetY: numberOr(tune.textOffsetY ?? tune.textTop, AUX_MENU_DEFAULT.textOffsetY),
    sideInset: numberOr(tune.sideInset, AUX_MENU_DEFAULT.sideInset),
    topPadding: numberOr(tune.topPadding, AUX_MENU_DEFAULT.topPadding),
    bottomPadding: numberOr(tune.bottomPadding, AUX_MENU_DEFAULT.bottomPadding),
    textStyle: String(tune.textStyle || AUX_MENU_DEFAULT.textStyle),
    textScale: numberOr(tune.textScale, AUX_MENU_DEFAULT.textScale),
  };
}

export function getMoveInfoPanelConfig() {
  const tune = (typeof window !== 'undefined' && window.PKB_FIGHT_MOVE_INFO_TUNE && typeof window.PKB_FIGHT_MOVE_INFO_TUNE === 'object')
    ? window.PKB_FIGHT_MOVE_INFO_TUNE
    : {};
  return {
    xOffset: numberOr(tune.xOffset ?? tune.x, MOVE_INFO_PANEL_DEFAULT.xOffset),
    yOffset: numberOr(tune.yOffset ?? tune.y, MOVE_INFO_PANEL_DEFAULT.yOffset),
  };
}

// Code-level defaults for users who prefer editing source over runtime window tuning.
export { AUX_MENU_DEFAULT, MOVE_INFO_PANEL_DEFAULT };
