import { UiHandler } from './ui-handler.js';
import { UiMode } from '../ui-mode.js';
import { Button } from '../facade/input-facade.js';
import { createGlobalSceneFacade } from '../facade/global-scene-facade.js';
import { addTextObject } from '../helpers/text.js';
import { addWindow } from '../helpers/ui-theme.js';

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
    this.moveNameText = null;
    this.descriptionText = null;
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

    this.cursorObj = env.textureExists(scene, env.UI_ASSETS.cursor.key)
      ? scene.add.image(0, 0, env.UI_ASSETS.cursor.key).setOrigin(0, 0)
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

    this.moveInfoContainer = scene.add.container(0, 0).setName('move-info');
    this.moveNameText = addTextObject(this.ui, 249, -40, '', 'WINDOW_BATTLE_COMMAND', {
      wordWrap: { width: 44, useAdvancedWrap: true },
    }).setOrigin(0, 0);
    this.typeIcon = env.textureExists(scene, env.UI_ASSETS.typesAtlas.key, 'unknown')
      ? scene.add.image(263, -38, env.UI_ASSETS.typesAtlas.key, 'unknown').setOrigin(0, 0).setScale(0.55)
      : addTextObject(this.ui, 263, -38, '', 'BATTLE_LABEL').setOrigin(0, 0);
    this.moveCategoryIcon = env.textureExists(scene, env.UI_ASSETS.categoriesAtlas.key, 'status')
      ? scene.add.image(289, -38, env.UI_ASSETS.categoriesAtlas.key, 'status').setOrigin(0, 0).setScale(0.55)
      : addTextObject(this.ui, 289, -38, '', 'BATTLE_LABEL').setOrigin(0, 0);
    this.ppLabel = addTextObject(this.ui, 250, -26, 'PP', 'BATTLE_LABEL').setOrigin(0, 0.5);
    this.ppText = addTextObject(this.ui, 308, -26, '--/--', 'BATTLE_VALUE').setOrigin(1, 0.5);
    this.powerLabel = addTextObject(this.ui, 250, -18, 'Pow', 'BATTLE_LABEL').setOrigin(0, 0.5);
    this.powerText = addTextObject(this.ui, 308, -18, '---', 'BATTLE_VALUE').setOrigin(1, 0.5);
    this.accuracyLabel = addTextObject(this.ui, 250, -10, 'Acc', 'BATTLE_LABEL').setOrigin(0, 0.5);
    this.accuracyText = addTextObject(this.ui, 308, -10, '---', 'BATTLE_VALUE').setOrigin(1, 0.5);
    this.descriptionText = addTextObject(this.ui, 249, -2, '', 'HINT', {
      wordWrap: { width: 65, useAdvancedWrap: true },
    }).setOrigin(0, 1);
    this.moveInfoContainer.add([
      this.moveNameText,
      this.typeIcon,
      this.moveCategoryIcon,
      this.ppLabel,
      this.ppText,
      this.powerLabel,
      this.powerText,
      this.accuracyLabel,
      this.accuracyText,
      this.descriptionText,
    ]);
    this.container.add(this.moveInfoContainer);

    this.toggleButtons = Array.from({ length: 5 }, () => {
      const bg = addWindow(this.ui, 0, 0, 30, 12, env.UI_ASSETS.windowXthin.key).setOrigin(0, 0);
      const icon = env.textureExists(scene, env.UI_ASSETS.teraAtlas.key, 'unknown')
        ? scene.add.sprite(0, 0, env.UI_ASSETS.teraAtlas.key, 'unknown').setOrigin(0.5, 0.5).setScale(0.45)
        : null;
      const label = addTextObject(this.ui, 15, 6, '', 'BATTLE_LABEL', { align: 'center' }).setOrigin(0.5, 0.5);
      const hit = scene.add.rectangle(0, 0, 30, 12, 0xffffff, 0.001).setOrigin(0, 0);
      const button = scene.add.container(0, 0, icon ? [bg, icon, label, hit] : [bg, label, hit]).setVisible(false);
      this.container.add(button);
      return { button, bg, icon, label, hit };
    });

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

  show(args = null) {
    const state = args || this.getInputModel();
    super.show(state);
    this.fieldIndex = Number(state.fieldIndex || 0);
    const battleMessage = this.ui.getMessageHandler();
    battleMessage.commandWindow.setVisible(false);
    battleMessage.movesWindowContainer.setVisible(true);

    let cursorIndex = this.getCursor();
    let toggleCursor = this.toggleCursor;
    let footerCursor = this.footerCursor;
    let focusRegion = this.focusRegion;

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
      if (move.focused || move.active) {
        cursorIndex = index;
        focusRegion = 'moves';
      }
    });

    this.updateMoveDetail(state.detail || {});
    this.updateToggles(this.getToggles());
    this.updateFooterActions(this.getFooterActions());

    const activeToggle = this.getToggles().findIndex(toggle => toggle?.active);
    if (activeToggle >= 0) {
      toggleCursor = activeToggle;
      focusRegion = 'toggles';
    }
    const activeFooter = this.getFooterActions().findIndex(action => action?.active);
    if (activeFooter >= 0) {
      footerCursor = activeFooter;
      focusRegion = 'footer';
    }

    if (focusRegion === 'toggles' && !this.getToggles().length) focusRegion = 'moves';
    if (focusRegion === 'footer' && !this.getFooterActions().length) focusRegion = 'moves';

    this.focusRegion = focusRegion;
    this.toggleCursor = Math.max(0, Math.min(toggleCursor, Math.max(0, this.getToggles().length - 1)));
    this.footerCursor = Math.max(0, Math.min(footerCursor, Math.max(0, this.getFooterActions().length - 1)));
    this.setCursor(cursorIndex);
    this.applyFocusVisuals();
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

  focusMoveCursor(cursor) {
    const move = this.getMoves()[cursor] || null;
    this.focusRegion = 'moves';
    const changed = this.setCursor(cursor);
    if (move?.focusAction) {
      this.globalScene.dispatchAction(move.focusAction);
      return true;
    }
    return changed;
  }

  focusToggle(index) {
    if (!this.getToggles().length) return false;
    const next = Math.max(0, Math.min(index, this.getToggles().length - 1));
    const changed = this.focusRegion !== 'toggles' || this.toggleCursor !== next;
    this.focusRegion = 'toggles';
    this.toggleCursor = next;
    this.applyFocusVisuals();
    return changed;
  }

  focusFooter(index) {
    if (!this.getFooterActions().length) return false;
    const next = Math.max(0, Math.min(index, this.getFooterActions().length - 1));
    const changed = this.focusRegion !== 'footer' || this.footerCursor !== next;
    this.focusRegion = 'footer';
    this.footerCursor = next;
    this.applyFocusVisuals();
    return changed;
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

  activateCurrentSelection() {
    if (this.focusRegion === 'toggles') {
      const toggle = this.getToggles()[this.toggleCursor] || null;
      if (!toggle || toggle.disabled || !toggle.action) return false;
      this.globalScene.dispatchAction(toggle.action);
      return true;
    }
    if (this.focusRegion === 'footer') {
      const footer = this.getFooterActions()[this.footerCursor] || null;
      if (!footer || footer.disabled || !footer.action) return false;
      this.globalScene.dispatchAction(footer.action);
      return true;
    }
    const move = this.getMoves()[this.getCursor()] || null;
    if (!move || move.disabled || !move.action) return false;
    this.globalScene.dispatchAction(move.action);
    return true;
  }

  moveWithinMoves(button) {
    const cursor = this.getCursor();
    let nextCursor = cursor;
    switch (button) {
      case Button.UP:
        if (cursor >= 2) nextCursor = cursor - 2;
        else if (this.getToggles().length) return this.focusToggle(Math.min(cursor, this.getToggles().length - 1));
        break;
      case Button.DOWN:
        if (cursor < 2 && this.getMoves()[cursor + 2]) nextCursor = cursor + 2;
        else if (this.getFooterActions().length) return this.focusFooter(Math.min(cursor % 2, this.getFooterActions().length - 1));
        break;
      case Button.LEFT:
        if (cursor % 2 === 1) nextCursor = cursor - 1;
        else if (this.getToggles().length) return this.focusToggle(0);
        break;
      case Button.RIGHT:
        if (cursor % 2 === 0 && this.getMoves()[cursor + 1]) nextCursor = cursor + 1;
        else if (this.getFooterActions().length) return this.focusFooter(Math.min(cursor % 2, this.getFooterActions().length - 1));
        break;
    }
    if (nextCursor === cursor) return false;
    return this.focusMoveCursor(nextCursor);
  }

  moveWithinToggles(button) {
    if (!this.getToggles().length) return false;
    switch (button) {
      case Button.LEFT:
        if (this.toggleCursor > 0) return this.focusToggle(this.toggleCursor - 1);
        return false;
      case Button.RIGHT:
        if (this.toggleCursor < this.getToggles().length - 1) return this.focusToggle(this.toggleCursor + 1);
        if (this.getFooterActions().length) return this.focusFooter(0);
        return false;
      case Button.DOWN:
        if (this.getFooterActions().length) return this.focusFooter(Math.min(this.toggleCursor, this.getFooterActions().length - 1));
        return this.focusMoveCursor(Math.min(this.toggleCursor, Math.max(0, this.getMoves().length - 1)));
      case Button.UP:
        return this.focusMoveCursor(Math.min(this.toggleCursor, Math.max(0, this.getMoves().length - 1)));
      default:
        return false;
    }
  }

  moveWithinFooter(button) {
    if (!this.getFooterActions().length) return false;
    switch (button) {
      case Button.LEFT:
        if (this.footerCursor > 0) return this.focusFooter(this.footerCursor - 1);
        return this.getToggles().length ? this.focusToggle(Math.min(this.toggleCursor, this.getToggles().length - 1)) : false;
      case Button.RIGHT:
        if (this.footerCursor < this.getFooterActions().length - 1) return this.focusFooter(this.footerCursor + 1);
        return false;
      case Button.UP:
        if (this.getToggles().length) return this.focusToggle(Math.min(this.footerCursor, this.getToggles().length - 1));
        return this.focusMoveCursor(Math.min(2 + this.footerCursor, Math.max(0, this.getMoves().length - 1)));
      case Button.DOWN:
        return this.focusMoveCursor(Math.min(2 + this.footerCursor, Math.max(0, this.getMoves().length - 1)));
      default:
        return false;
    }
  }

  processInput(button) {
    let success = false;
    switch (button) {
      case Button.ACTION:
        success = this.activateCurrentSelection();
        break;
      case Button.CANCEL:
        if (this.focusRegion === 'toggles' || this.focusRegion === 'footer') {
          success = this.focusMoveCursor(this.getCursor());
        } else {
          const backAction = this.getFooterActions()[0] || null;
          if (backAction && !backAction.disabled && backAction.action) {
            this.globalScene.dispatchAction(backAction.action);
            success = true;
          }
        }
        break;
      case Button.UP:
      case Button.DOWN:
      case Button.LEFT:
      case Button.RIGHT:
        if (this.focusRegion === 'toggles') success = this.moveWithinToggles(button);
        else if (this.focusRegion === 'footer') success = this.moveWithinFooter(button);
        else success = this.moveWithinMoves(button);
        break;
    }
    if (success) this.getUi().playSelect();
    return success;
  }

  toggleInfo(visible) {
    this.infoVisible = Boolean(visible);
    this.movesContainer.setVisible(!this.infoVisible).setAlpha(this.infoVisible ? 0 : 1);
    this.cursorObj?.setVisible(!this.infoVisible && this.focusRegion === 'moves');
    return true;
  }

  updateMoveDetail(detail = {}) {
    this.moveNameText.setText(detail.name || '—');

    if (this.typeIcon.setTexture) {
      const typesKey = this.ui.uiLanguage === 'ko' && this.env.textureExists(this.scene, this.env.UI_ASSETS.typesKoAtlas.key, detail.type)
        ? this.env.UI_ASSETS.typesKoAtlas.key
        : this.env.UI_ASSETS.typesAtlas.key;
      if (this.env.textureExists(this.scene, typesKey, detail.type || 'unknown')) {
        this.typeIcon.setTexture(typesKey, detail.type || 'unknown');
        this.typeIcon.setVisible(true);
      } else {
        this.typeIcon.setVisible(false);
      }
    } else {
      this.typeIcon.setText(detail.typeLabel || '');
    }

    if (this.moveCategoryIcon.setTexture) {
      if (this.env.textureExists(this.scene, this.env.UI_ASSETS.categoriesAtlas.key, detail.category || 'status')) {
        this.moveCategoryIcon.setTexture(this.env.UI_ASSETS.categoriesAtlas.key, detail.category || 'status');
        this.moveCategoryIcon.setVisible(true);
      } else {
        this.moveCategoryIcon.setVisible(false);
      }
    } else {
      this.moveCategoryIcon.setText(detail.category || '');
    }

    this.ppText.setText(detail.ppLabel || '--/--');
    this.powerText.setText(detail.powerLabel || '---');
    this.accuracyText.setText(detail.accuracyLabel || '---');
    this.descriptionText.setText(detail.description || '');
  }

  updateToggles(toggles = []) {
    const baseX = 248;
    this.toggleButtons.forEach((entry, index) => {
      const toggle = toggles[index] || null;
      entry.button.setVisible(Boolean(toggle));
      if (!toggle) return;
      entry.button.setPosition(baseX + index * 33, -48);
      entry.label.setText(toggle.label || '');
      entry.label.setColor(toggle.disabled ? '#94a3b8' : '#f8fbff');
      entry.bg.setAlpha(toggle.active ? 1 : 0.82);
      if (entry.icon) {
        const isTera = toggle.kind === 'tera' && this.env.textureExists(this.scene, this.env.UI_ASSETS.teraAtlas.key, toggle.type || 'unknown');
        entry.icon.setVisible(isTera);
        if (isTera) entry.icon.setTexture(this.env.UI_ASSETS.teraAtlas.key, toggle.type || 'unknown');
        entry.icon.setPosition(6, 6);
        entry.label.setPosition(isTera ? 18 : 15, 6);
        entry.label.setOrigin(isTera ? 0 : 0.5, 0.5);
      }
      entry.hit.removeAllListeners();
      if (!toggle.disabled && toggle.action) {
        this.env.setInteractiveTarget(entry.hit, () => this.globalScene.dispatchAction(toggle.action));
      }
    });
  }

  updateFooterActions(actions = []) {
    this.footerButtons.forEach((entry, index) => {
      const action = actions[index] || null;
      const visible = Boolean(action);
      entry.bg.setVisible(visible);
      entry.label.setVisible(visible);
      entry.hit.setVisible(visible);
      if (!visible) return;
      const x = 248 + index * 42;
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
    this.getUi().getMessageHandler().movesWindowContainer?.setVisible(false);
    this.infoVisible = false;
    if (this.cursorObj) this.cursorObj.setVisible(false);
  }
}
