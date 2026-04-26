import { UiHandler } from './ui-handler.js';
import { UiMode } from '../ui-mode.js';
import { createGlobalSceneFacade } from '../facade/global-scene-facade.js';
import { addTextObject } from '../helpers/text.js';
import { addWindow } from '../helpers/ui-theme.js';

export class TargetSelectUiHandler extends UiHandler {
  constructor(ui) {
    super(ui, UiMode.TARGET_SELECT);
    this.globalScene = createGlobalSceneFacade(ui);
    this.panel = null;
    this.title = null;
    this.body = null;
    this.footerBg = null;
    this.footer = null;
    this.backZone = null;
    this.targetRows = [];
    this.cursorObj = null;
    this.fieldIndex = 0;
    this.cursor2 = 0;
    this.currentTargets = [];
  }

  setup() {
    const { scene, env } = this;
    this.container = scene.add.container(0, env.LOGICAL_HEIGHT).setDepth(57).setName('pkb-transplant-target');
    this.panel = addWindow(this.ui, 232, -46, 88, 46, env.UI_ASSETS.window.key).setOrigin(0, 1);
    this.title = addTextObject(this.ui, 240, -40, '', 'WINDOW').setOrigin(0, 0);
    this.body = addTextObject(this.ui, 240, -26, '', 'HINT', {
      wordWrap: { width: 72, useAdvancedWrap: true },
      lineSpacing: 1,
    }).setOrigin(0, 0);
    this.footerBg = addWindow(this.ui, 244, -12, 52, 12, env.UI_ASSETS.windowXthin.key).setOrigin(0, 1);
    this.footer = addTextObject(this.ui, 270, -18, '', 'BATTLE_LABEL', { align: 'center' }).setOrigin(0.5, 0.5);
    this.backZone = scene.add.rectangle(244, -24, 52, 12, 0xffffff, 0.001).setOrigin(0, 0);

    this.cursorObj = env.textureExists(scene, env.UI_ASSETS.cursor.key)
      ? scene.add.image(0, 0, env.UI_ASSETS.cursor.key).setScale(0.85)
      : addTextObject(this.ui, 0, 0, '▶', 'WINDOW_BATTLE_COMMAND').setOrigin(0, 0);
    this.targetRows = Array.from({ length: 3 }, (_, index) => {
      const y = -26 + index * 8;
      const hit = scene.add.rectangle(244, y - 1, 66, 8, 0xffffff, 0.001).setOrigin(0, 0).setVisible(false);
      const label = addTextObject(this.ui, 248, y, '', 'WINDOW_BATTLE_COMMAND', {
        wordWrap: { width: 62, useAdvancedWrap: true },
      }).setOrigin(0, 0).setVisible(false);
      return { hit, label, y };
    });

    this.container.add([
      this.panel,
      this.title,
      this.body,
      ...this.targetRows.flatMap(row => [row.hit, row.label]),
      this.cursorObj,
      this.footerBg,
      this.footer,
      this.backZone,
    ]);
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
      this.cursorObj.setPosition(242, focused.y + 6);
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
    const battleMessage = this.ui.getMessageHandler();
    battleMessage.commandWindow.setVisible(false);
    battleMessage.movesWindowContainer.setVisible(true);
    this.fieldIndex = Number(state.fieldIndex || 0);

    this.title.setText(state.title || '대상 선택');
    this.currentTargets = Array.isArray(state.targets) ? state.targets : [];

    const bodyText = state.blockedReason
      || this.globalScene.getBlockedReason()
      || state.placeholder
      || '';
    const showBody = !this.currentTargets.length;
    this.body.setVisible(showBody);
    this.body.setText(showBody ? bodyText : '');

    this.targetRows.forEach((row, index) => {
      const target = this.currentTargets[index] || null;
      row.label.setVisible(Boolean(target));
      row.hit.setVisible(Boolean(target));
      row.hit.removeAllListeners();
      if (!target) return;
      row.label.setText(target.sublabel ? `${target.label} · ${target.sublabel}` : target.label || '');
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

    const footerAction = this.globalScene.getTargetBackAction()
      ? (this.globalScene.getTargetFooterActions()[0] || null)
      : null;
    const footerVisible = Boolean(footerAction);
    this.footerBg.setVisible(footerVisible);
    this.footer.setVisible(footerVisible);
    this.backZone.setVisible(footerVisible);
    if (footerVisible) {
      this.footer.setText(footerAction.label || 'Back');
      this.footerBg.setAlpha(footerAction.disabled ? 0.6 : 1);
      this.footer.setColor(footerAction.disabled ? '#94a3b8' : '#f8fbff');
      this.backZone.removeAllListeners();
      if (!footerAction.disabled && footerAction.action) {
        this.env.setInteractiveTarget(this.backZone, () => { this.getUi().playSelect(); this.globalScene.dispatchAction(footerAction.action); });
      }
    }
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
    this.cursorObj?.setVisible(false);
    this.targetRows.forEach(row => {
      row.hit?.removeAllListeners();
      row.hit?.setVisible(false);
      row.label?.setVisible(false);
    });
  }
}
