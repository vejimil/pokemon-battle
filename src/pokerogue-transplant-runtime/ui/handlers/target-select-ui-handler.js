import { UiHandler } from './ui-handler.js';
import { UiMode } from '../ui-mode.js';
import { createGlobalSceneFacade } from '../facade/global-scene-facade.js';
import { addTextObject } from '../helpers/text.js';
import { addWindow } from '../helpers/ui-theme.js';
import { getMoveInfoPanelConfig } from '../helpers/fight-layout-tune.js';

export class TargetSelectUiHandler extends UiHandler {
  constructor(ui) {
    super(ui, UiMode.TARGET_SELECT);
    this.globalScene = createGlobalSceneFacade(ui);
    this.listWindow = null;
    this.targetRows = [];
    this.cursorObj = null;
    this.fieldIndex = 0;
    this.cursor2 = 0;
    this.currentTargets = [];
    this.moveInfoPanelConfig = getMoveInfoPanelConfig();
    this.panelX = 242;
    this.panelY = 0;
  }

  syncPanelLayout() {
    this.moveInfoPanelConfig = getMoveInfoPanelConfig();
    this.panelX = 240 + Number(this.moveInfoPanelConfig?.xOffset || 0);
    this.panelY = Number(this.moveInfoPanelConfig?.yOffset || 0);
    this.listWindow?.setPosition?.(this.panelX, this.panelY);
    this.targetRows.forEach((row, index) => {
      const y = this.panelY - 38 + index * 14;
      row.y = y;
      row.hit?.setPosition?.(this.panelX + 40, y);
      row.label?.setPosition?.(this.panelX + 40, y);
    });
  }

  setup() {
    const { scene, env } = this;
    this.container = scene.add.container(0, env.LOGICAL_HEIGHT).setDepth(57).setName('pkb-transplant-target');
    this.listWindow = addWindow(this.ui, 240, 0, 80, 48, env.UI_ASSETS.window.key).setOrigin(0, 1);

    this.cursorObj = env.textureExists(scene, env.UI_ASSETS.cursor.key)
      ? scene.add.image(0, 0, env.UI_ASSETS.cursor.key).setScale(0.85)
      : addTextObject(this.ui, 0, 0, '▶', 'MOVE_INFO_CONTENT').setOrigin(0, 0);
    this.targetRows = Array.from({ length: 3 }, (_, index) => {
      const y = -38 + index * 14;
      const hit = scene.add.rectangle(280, y, 68, 11, 0xffffff, 0.001).setOrigin(0.5, 0.5).setVisible(false);
      const label = addTextObject(this.ui, 280, y, '', 'MOVE_INFO_CONTENT', {
        wordWrap: { width: 62, useAdvancedWrap: true },
        lineSpacing: 2,
        align: 'center',
      }).setOrigin(0.5, 0.5).setVisible(false);
      label.setAlign?.('center');
      return { hit, label, y };
    });

    this.container.add([
      this.listWindow,
      ...this.targetRows.flatMap(row => [row.hit, row.label]),
      this.cursorObj,
    ]);
    this.syncPanelLayout();
    this.clear();
  }

  getCursor() {
    return this.fieldIndex ? this.cursor2 : this.cursor;
  }

  setCursor(cursor) {
    const selection = this.globalScene.getTargetSelectionState(cursor);
    const nextCursor = Number.isInteger(selection.cursor) ? selection.cursor : 0;
    const changed = this.getCursor() !== nextCursor;
    if (changed) {
      if (this.fieldIndex) this.cursor2 = nextCursor;
      else this.cursor = nextCursor;
    }
    this.applyCursorVisual(selection);
    return changed;
  }

  applyCursorVisual(selection = this.globalScene.getTargetSelectionState(this.getCursor())) {
    const { targets = [], cursor = 0 } = selection;
    const focused = this.targetRows[cursor] || null;
    const canShowCursor = Boolean(targets.length && focused && focused.label.visible);
    this.cursorObj.setVisible(canShowCursor);
    if (canShowCursor) {
      this.cursorObj.setPosition(this.panelX + 4, focused.y + 1);
    }
    this.targetRows.forEach((row, index) => {
      const target = targets[index] || null;
      if (!target) return;
      const isFocused = index === cursor;
      row.label.setColor(target.disabled
        ? '#94a3b8'
        : (isFocused ? '#fff6b0' : '#f8fbff'));
    });
  }

  show(args = null) {
    const state = args || this.globalScene.getTargetInputModel();
    super.show(state);
    this.syncPanelLayout();
    const battleMessage = this.ui.getMessageHandler();
    battleMessage.bg?.setVisible(false);
    battleMessage.commandWindow.setVisible(false);
    // Keep the left moves window visible (fight-like background), but hide the
    // right move-details pane because target-select has its own selection panel.
    battleMessage.movesWindowContainer.setVisible(true);
    battleMessage.moveDetailsWindow?.setVisible(false);
    battleMessage.message?.setText?.('');
    this.fieldIndex = Number(state.fieldIndex || 0);

    this.currentTargets = Array.isArray(state.targets) ? state.targets : [];
    if (!this.currentTargets.length) {
      const placeholder = state.blockedReason || this.globalScene.getBlockedReason() || state.placeholder || '';
      if (placeholder) {
        this.currentTargets = [{ label: placeholder, disabled: true, action: null }];
      }
    }

    this.targetRows.forEach((row, index) => {
      const target = this.currentTargets[index] || null;
      row.label.setVisible(Boolean(target));
      row.hit.setVisible(Boolean(target));
      row.hit.removeAllListeners();
      if (!target) return;
      row.label.setText(target.label || '');
      row.label.setAlpha(target.disabled ? 0.45 : 1);
      if (!target.disabled && target.action) {
        this.env.setInteractiveTarget(row.hit, () => {
          this.getUi().playSelect();
          this.globalScene.dispatchAction(target.action);
        });
      } else {
        this.env.setInteractiveTarget(row.hit, () => this.getUi().playError());
      }
    });
    this.setCursor(this.getCursor());
    return true;
  }

  processInput(button) {
    const result = this.globalScene.resolveTargetInput(this.getCursor(), button);
    let success = false;
    if (result.changed) {
      success = this.setCursor(result.cursor) || success;
    }
    if (result.action) {
      this.globalScene.dispatchAction(result.action);
      success = true;
    }
    if (success) this.getUi().playSelect();
    return success || Boolean(result.handled);
  }

  clear() {
    super.clear();
    if (this.container) this.container.setVisible(false);
    this.getUi().getMessageHandler().moveDetailsWindow?.setVisible(true);
    this.cursorObj?.setVisible(false);
    this.targetRows.forEach(row => {
      row.hit?.removeAllListeners();
      row.hit?.setVisible(false);
      row.label?.setVisible(false);
    });
  }
}
