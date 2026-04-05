import { UiHandler } from './ui-handler.js';
import { UiMode } from '../ui-mode.js';
import { Button } from '../facade/input-facade.js';
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
    this.container.add([this.panel, this.title, this.body, this.footerBg, this.footer, this.backZone]);
    this.clear();
  }

  show(args = null) {
    const state = args || this.globalScene.getTargetInputModel();
    super.show(state);
    const battleMessage = this.ui.getMessageHandler();
    battleMessage.commandWindow.setVisible(false);
    battleMessage.movesWindowContainer.setVisible(true);
    this.title.setText(state.title || 'Target Select');
    this.body.setText(
      state.placeholder
      || state.blockedReason
      || this.globalScene.getBlockedReason()
      || 'Target selection remains intentionally blocked in the current singles-only engine-first path.'
    );
    const footerAction = this.globalScene.getTargetBackAction() ? (this.globalScene.getTargetFooterActions()[0] || null) : null;
    this.footer.setText(footerAction?.label || 'Back');
    this.footerBg.setAlpha(footerAction?.disabled ? 0.6 : 1);
    this.footer.setColor(footerAction?.disabled ? '#94a3b8' : '#f8fbff');
    this.backZone.removeAllListeners();
    if (footerAction && !footerAction.disabled && footerAction.action) {
      this.env.setInteractiveTarget(this.backZone, () => this.globalScene.dispatchAction(footerAction.action));
    }
    return true;
  }

  processInput(button) {
    const result = this.globalScene.resolveTargetInput(button);
    if (!result.handled || !result.action) return false;
    this.globalScene.dispatchAction(result.action);
    this.getUi().playSelect();
    return true;
  }

  clear() {
    super.clear();
    if (this.container) this.container.setVisible(false);
  }
}
