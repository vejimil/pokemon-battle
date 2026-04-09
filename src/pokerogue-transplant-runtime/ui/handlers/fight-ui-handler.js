import { UiHandler } from './ui-handler.js';
import { UiMode } from '../ui-mode.js';
import { Button } from '../facade/input-facade.js';
import { createGlobalSceneFacade } from '../facade/global-scene-facade.js';
import { addTextObject } from '../helpers/text.js';
import { addWindow } from '../helpers/ui-theme.js';

// PP ratio → color (matches PokeRogue TextStyle colors, non-legacy theme)
function ppRatioToColor(ratio) {
  if (ratio === null || ratio === undefined) return { color: '#f8f8f8', shadow: '#6b5a73' };
  if (ratio === 0)       return { color: '#e13d3d', shadow: '#632929' };
  if (ratio <= 0.25)     return { color: '#d64b00', shadow: '#69402a' };
  if (ratio <= 0.5)      return { color: '#ccbe00', shadow: '#6e672c' };
  return                        { color: '#f8f8f8', shadow: '#6b5a73' };
}

export class FightUiHandler extends UiHandler {
  static MOVES_CONTAINER_NAME = 'moves';

  constructor(ui) {
    super(ui, UiMode.FIGHT);
    this.globalScene = createGlobalSceneFacade(ui);
    this.movesContainer = null;
    this.moveInfoContainer = null;
    this.cursorObj = null;
    this.moveButtons = [];
    this.typeIcon = null;
    this.moveCategoryIcon = null;
    this.ppLabel = null;
    this.ppText = null;
    this.powerLabel = null;
    this.powerText = null;
    this.accuracyLabel = null;
    this.accuracyText = null;
    this.toggleButtons = [];
    this.footerButtons = [];
    this.fieldIndex = 0;
    this.cursor2 = 0;
    this.focusRegion = 'moves';
    this.toggleCursor = 0;
    this.footerCursor = 0;
    this.infoVisible = false;
  }

  setup() {
    const { scene, env } = this;
    this.container = scene.add.container(0, env.LOGICAL_HEIGHT).setDepth(55).setName('pkb-transplant-fight');

    this.movesContainer = scene.add.container(18, -38.7).setName(FightUiHandler.MOVES_CONTAINER_NAME);
    this.container.add(this.movesContainer);

    // PokeRogue uses default origin (0.5, 0.5) for the cursor image
    this.cursorObj = env.textureExists(scene, env.UI_ASSETS.cursor.key)
      ? scene.add.image(0, 0, env.UI_ASSETS.cursor.key)
      : addTextObject(this.ui, 0, 0, '▶', 'WINDOW_BATTLE_COMMAND').setOrigin(0, 0);
    this.container.add(this.cursorObj);

    this.moveButtons = Array.from({ length: 4 }, (_, moveIndex) => {
      const x = moveIndex % 2 === 0 ? 0 : 114;
      const y = moveIndex < 2 ? 0 : 16;
      const hit = scene.add.rectangle(x - 6, y - 2, 110, 14, 0xffffff, 0.001).setOrigin(0, 0);
      const label = addTextObject(this.ui, x, y, '', 'WINDOW_BATTLE_COMMAND', {
        wordWrap: { width: 98, useAdvancedWrap: true },
      }).setOrigin(0, 0);
      this.movesContainer.add([hit, label]);
      return { x, y, hit, label };
    });

    this.moveInfoContainer = scene.add.container(1, 0).setName('move-info');
    // 원본: typeIcon/moveCategoryIcon 모두 setVisible(false)로 시작 (fight-ui-handler.ts:63,67)
    // 원본 scale: typeIcon=0.8 (line 269), moveCategoryIcon=1.0 (line 272)
    this.typeIcon = env.textureExists(scene, env.UI_ASSETS.typesAtlas.key, 'unknown')
      ? scene.add.image(263, -36, env.UI_ASSETS.typesAtlas.key, 'unknown').setOrigin(0, 0).setScale(0.8).setVisible(false)
      : addTextObject(this.ui, 263, -36, '', 'BATTLE_LABEL').setOrigin(0, 0).setVisible(false);
    this.moveCategoryIcon = env.textureExists(scene, env.UI_ASSETS.categoriesAtlas.key, 'status')
      ? scene.add.image(295, -36, env.UI_ASSETS.categoriesAtlas.key, 'status').setOrigin(0, 0).setScale(1.0).setVisible(false)
      : addTextObject(this.ui, 295, -36, '', 'BATTLE_LABEL').setOrigin(0, 0).setVisible(false);
    // 원본: pp/power/accuracy 라벨·값도 모두 setVisible(false)로 시작 (fight-ui-handler.ts:69-94)
    this.ppLabel = addTextObject(this.ui, 250, -26, 'PP', 'BATTLE_LABEL').setOrigin(0, 0.5).setVisible(false);
    this.ppText = addTextObject(this.ui, 308, -26, '--/--', 'BATTLE_VALUE').setOrigin(1, 0.5).setVisible(false);
    this.powerLabel = addTextObject(this.ui, 250, -18, 'Pow', 'BATTLE_LABEL').setOrigin(0, 0.5).setVisible(false);
    this.powerText = addTextObject(this.ui, 308, -18, '---', 'BATTLE_VALUE').setOrigin(1, 0.5).setVisible(false);
    this.accuracyLabel = addTextObject(this.ui, 250, -10, 'Acc', 'BATTLE_LABEL').setOrigin(0, 0.5).setVisible(false);
    this.accuracyText = addTextObject(this.ui, 308, -10, '---', 'BATTLE_VALUE').setOrigin(1, 0.5).setVisible(false);
    this.moveInfoContainer.add([
      this.typeIcon,
      this.moveCategoryIcon,
      this.ppLabel,
      this.ppText,
      this.powerLabel,
      this.powerText,
      this.accuracyLabel,
      this.accuracyText,
    ]);
    this.container.add(this.moveInfoContainer);

    // Toggle buttons: fit within right panel (x=241–317, y=-48 to -36)
    // 3 per row, width=24px, spacing=26px — covers Tera/Z/Mega/Ultra/Dmax
    this.toggleButtons = Array.from({ length: 5 }, () => {
      const bg = addWindow(this.ui, 0, 0, 24, 12, env.UI_ASSETS.windowXthin.key).setOrigin(0, 0);
      const icon = env.textureExists(scene, env.UI_ASSETS.teraAtlas.key, 'unknown')
        ? scene.add.sprite(0, 0, env.UI_ASSETS.teraAtlas.key, 'unknown').setOrigin(0.5, 0.5).setScale(0.35)
        : null;
      const label = addTextObject(this.ui, 12, 6, '', 'BATTLE_LABEL', { align: 'center' }).setOrigin(0.5, 0.5);
      const hit = scene.add.rectangle(0, 0, 24, 12, 0xffffff, 0.001).setOrigin(0, 0);
      const button = scene.add.container(0, 0, icon ? [bg, icon, label, hit] : [bg, label, hit]).setVisible(false);
      this.container.add(button);
      return { button, bg, icon, label, hit };
    });

    // Footer buttons (Back, Switch): placed on left panel bottom to avoid right-panel overflow
    // x=1 (Back) and x=44 (Switch) — well within x=0–240
    this.footerButtons = Array.from({ length: 2 }, () => {
      const bg = addWindow(this.ui, 0, 0, 40, 12, env.UI_ASSETS.windowXthin.key).setOrigin(0, 0).setVisible(false);
      const label = addTextObject(this.ui, 20, 6, '', 'BATTLE_LABEL', { align: 'center' }).setOrigin(0.5, 0.5).setVisible(false);
      const hit = scene.add.rectangle(0, 0, 40, 12, 0xffffff, 0.001).setOrigin(0, 0).setVisible(false);
      this.container.add([bg, label, hit]);
      return { bg, label, hit };
    });

    this.clear();
  }

  getInputModel() {
    return this.globalScene.getFightInputModel();
  }

  getSelectionState() {
    return {
      focusRegion: this.focusRegion,
      moveCursor: this.getCursor(),
      toggleCursor: this.toggleCursor,
      footerCursor: this.footerCursor,
    };
  }

  applySelectionState(selection) {
    const normalized = this.globalScene.getFightSelectionState(selection);
    this.focusRegion = normalized.focusRegion;
    this.toggleCursor = normalized.toggleCursor;
    this.footerCursor = normalized.footerCursor;
    this.setCursor(normalized.moveCursor);
    this.applyFocusVisuals();
    return normalized;
  }

  show(args = null) {
    const state = args || this.getInputModel();
    super.show(state);
    this.fieldIndex = Number(state.fieldIndex || 0);
    const battleMessage = this.ui.getMessageHandler();
    battleMessage.bg.setVisible(false);
    battleMessage.commandWindow.setVisible(false);
    battleMessage.movesWindowContainer.setVisible(true);

    this.moveButtons.forEach((button, index) => {
      const move = this.getMoves()[index] || { label: '', disabled: true };
      button.label.setText(move.label || '');
      button.label.setAlpha(move.disabled ? 0.42 : 1);
      button.label.setColor(move.disabled ? '#64748b' : '#f8fbff');
      button.hit.removeAllListeners();
      if (!move.disabled) {
        const hoverAction = move.focusAction ? () => this.globalScene.dispatchAction(move.focusAction) : null;
        this.env.setInteractiveTarget(button.hit, move.action ? () => this.globalScene.dispatchAction(move.action) : null, hoverAction);
      }
    });

    this.updateMoveDetail(state.detail || {});
    this.updateToggles(this.getToggles());
    this.updateFooterActions(this.getFooterActions());
    this.applySelectionState(this.getSelectionState());
    this.toggleInfo(this.infoVisible);
    return true;
  }

  getMoves() {
    return this.getInputModel().moves || [];
  }

  getToggles() {
    return this.getInputModel().toggles || [];
  }

  getFooterActions() {
    return this.getInputModel().footerActions || [];
  }

  getCursor() {
    return this.fieldIndex ? this.cursor2 : this.cursor;
  }

  setCursor(cursor) {
    const moves = this.getMoves();
    const maxIndex = Math.max(0, Math.min(moves.length - 1, 3));
    const nextCursor = Math.max(0, Math.min(cursor, maxIndex));
    const changed = this.getCursor() !== nextCursor;
    if (changed) {
      if (this.fieldIndex) this.cursor2 = nextCursor;
      else this.cursor = nextCursor;
    }
    this.applyFocusVisuals();
    return changed;
  }

  getCursorPositions() {
    return [
      { x: 13, y: -31 },
      { x: 127, y: -31 },
      { x: 13, y: -16 },
      { x: 127, y: -16 },
    ];
  }

  applyFocusVisuals() {
    const cursorPos = this.getCursorPositions()[this.getCursor()] || this.getCursorPositions()[0];
    const showCursor = this.focusRegion === 'moves' && !this.infoVisible;
    this.cursorObj.setPosition(cursorPos.x, cursorPos.y).setVisible(showCursor);

    this.toggleButtons.forEach((entry, index) => {
      const toggle = this.getToggles()[index] || null;
      if (!toggle) return;
      const isFocused = this.focusRegion === 'toggles' && this.toggleCursor === index;
      entry.button.setScale(isFocused ? 1.05 : 1);
      entry.bg.setAlpha(isFocused ? 1 : (toggle.active ? 1 : 0.82));
    });

    this.footerButtons.forEach((entry, index) => {
      const action = this.getFooterActions()[index] || null;
      if (!action) return;
      const isFocused = this.focusRegion === 'footer' && this.footerCursor === index;
      entry.bg.setScale(isFocused ? 1.05 : 1);
      entry.bg.setAlpha(action.disabled ? 0.6 : (isFocused ? 1 : 0.85));
    });
  }

  processInput(button) {
    const result = this.globalScene.resolveFightInput(this.getSelectionState(), button);
    let success = false;

    if (result.changed) {
      this.applySelectionState(result.selection);
      success = true;
    }
    if (result.focusAction) {
      this.globalScene.dispatchAction(result.focusAction);
    }
    if (result.action) {
      this.globalScene.dispatchAction(result.action);
      success = true;
    }

    if (success) this.getUi().playSelect();
    return success;
  }

  toggleInfo(visible) {
    this.infoVisible = Boolean(visible);
    if (visible) {
      // Instantly hide — matches PokeRogue (overlay fades in, names hide immediately)
      this.movesContainer.setVisible(false).setAlpha(0);
      this.cursorObj?.setVisible(false).setAlpha(0);
    } else {
      // Fade-in tween on movesContainer — matches PokeRogue's toggleInfo(false)
      this.movesContainer.setVisible(true);
      this.cursorObj?.setVisible(this.focusRegion === 'moves');
      this.scene.tweens?.add?.({
        targets: [this.movesContainer, this.cursorObj].filter(Boolean),
        alpha: 1,
        duration: 125,
        ease: 'Sine.easeInOut',
      });
    }
    return true;
  }

  updateMoveDetail(detail = {}) {
    // 원본 setInfoVis(hasMove): moveInfoContainer 전체 visibility 일괄 제어 (fight-ui-handler.ts:259-262)
    const hasMove = Boolean(detail && detail.name);
    this.moveInfoContainer.iterate(o => o.setVisible?.(hasMove));

    if (!hasMove) return;

    if (this.typeIcon.setTexture) {
      const typesKey = this.ui.uiLanguage === 'ko' && this.env.textureExists(this.scene, this.env.UI_ASSETS.typesKoAtlas.key, detail.type)
        ? this.env.UI_ASSETS.typesKoAtlas.key
        : this.env.UI_ASSETS.typesAtlas.key;
      if (this.env.textureExists(this.scene, typesKey, detail.type || 'unknown')) {
        // 원본: setTexture(...).setScale(0.8) (fight-ui-handler.ts:269)
        this.typeIcon.setTexture(typesKey, detail.type || 'unknown').setScale(0.8);
        this.typeIcon.setVisible(true);
      } else {
        this.typeIcon.setVisible(false);
      }
    } else {
      this.typeIcon.setText(detail.typeLabel || '');
    }

    if (this.moveCategoryIcon.setTexture) {
      if (this.env.textureExists(this.scene, this.env.UI_ASSETS.categoriesAtlas.key, detail.category || 'status')) {
        // 원본: setTexture(...).setScale(1.0) (fight-ui-handler.ts:272)
        this.moveCategoryIcon.setTexture(this.env.UI_ASSETS.categoriesAtlas.key, detail.category || 'status').setScale(1.0);
        this.moveCategoryIcon.setVisible(true);
      } else {
        this.moveCategoryIcon.setVisible(false);
      }
    } else {
      this.moveCategoryIcon.setText(detail.category || '');
    }

    this.ppText.setText(detail.ppLabel || '--/--');
    const ppColors = ppRatioToColor(detail.ppRatio ?? null);
    this.ppText.setColor(ppColors.color).setShadowColor(ppColors.shadow);
    this.powerText.setText(detail.powerLabel || '---');
    this.accuracyText.setText(detail.accuracyLabel || '---');
  }

  updateToggles(toggles = []) {
    // Right panel x=241–317, buttons 24px wide with 2px gap (26px stride)
    // 3 buttons per row: row0 y=-48, row1 y=-34 (above type icon row at y=-36)
    const baseX = 241;
    const stride = 26;
    const perRow = 3;
    this.toggleButtons.forEach((entry, index) => {
      const toggle = toggles[index] || null;
      entry.button.setVisible(Boolean(toggle));
      if (!toggle) return;
      const col = index % perRow;
      const row = Math.floor(index / perRow);
      entry.button.setPosition(baseX + col * stride, -62 - row * 14);
      entry.label.setText(toggle.label || '');
      entry.label.setColor(toggle.disabled ? '#94a3b8' : '#f8fbff');
      entry.bg.setAlpha(toggle.active ? 1 : 0.82);
      if (entry.icon) {
        const isTera = toggle.kind === 'tera' && this.env.textureExists(this.scene, this.env.UI_ASSETS.teraAtlas.key, toggle.type || 'unknown');
        entry.icon.setVisible(isTera);
        if (isTera) entry.icon.setTexture(this.env.UI_ASSETS.teraAtlas.key, toggle.type || 'unknown');
        entry.icon.setPosition(5, 6);
        entry.label.setPosition(isTera ? 14 : 12, 6);
        entry.label.setOrigin(isTera ? 0 : 0.5, 0.5);
      }
      entry.hit.removeAllListeners();
      if (!toggle.disabled && toggle.action) {
        this.env.setInteractiveTarget(entry.hit, () => this.globalScene.dispatchAction(toggle.action));
      }
    });
  }

  updateFooterActions(actions = []) {
    // Footer buttons on left panel bottom (x=1 and x=44) to avoid right-panel overflow
    const footerXs = [1, 44];
    this.footerButtons.forEach((entry, index) => {
      const action = actions[index] || null;
      const visible = Boolean(action);
      entry.bg.setVisible(visible);
      entry.label.setVisible(visible);
      entry.hit.setVisible(visible);
      if (!visible) return;
      const x = footerXs[index] ?? (1 + index * 43);
      entry.bg.setPosition(x, -13);
      entry.label.setPosition(x + 20, -7);
      entry.hit.setPosition(x, -13);
      entry.label.setText(action.label || '');
      entry.label.setColor(action.disabled ? '#94a3b8' : '#f8fbff');
      entry.bg.setAlpha(action.disabled ? 0.6 : 1);
      entry.hit.removeAllListeners();
      if (!action.disabled && action.action) {
        this.env.setInteractiveTarget(entry.hit, () => this.globalScene.dispatchAction(action.action));
      }
    });
  }

  clear() {
    super.clear();
    const messageHandler = this.getUi().getMessageHandler();
    messageHandler.movesWindowContainer?.setVisible(false);
    messageHandler.bg?.setVisible(true);
    this.infoVisible = false;
    if (this.cursorObj) this.cursorObj.setVisible(false);
    // 원본 clear(): setInfoVis(false) — moveInfoContainer 전체 숨김 (fight-ui-handler.ts:408-409)
    this.moveInfoContainer?.iterate(o => o.setVisible?.(false));
  }
}
