import { UiHandler } from './ui-handler.js';
import { UiMode } from '../ui-mode.js';

export class TargetSelectUiHandler extends UiHandler {
  constructor(ui) {
    super(ui, UiMode.TARGET_SELECT);
    this.title = null;
    this.body = null;
    this.footer = null;
    this.backZone = null;
  }

  setup() {
    const { scene, env } = this;
    this.container = scene.add.container(0, env.LOGICAL_HEIGHT).setDepth(55).setName('pkb-transplant-target');
    this.title = env.createBaseText(scene, 18, -38, '', 8, '#f8fbff').setOrigin(0, 0);
    this.body = env.createBaseText(scene, 18, -24, '', 6, '#cbd5e1', {
      wordWrap: { width: 205, useAdvancedWrap: true },
      lineSpacing: 1,
    }).setOrigin(0, 0);
    const footerBg = scene.add.nineslice(248, -13, env.UI_ASSETS.windowXthin.key, undefined, 40, 12, 8, 8, 8, 8).setOrigin(0, 0);
    this.footer = env.createBaseText(scene, 268, -7, 'Back', 6, '#f8fbff', { align: 'center' }).setOrigin(0.5, 0.5);
    this.backZone = scene.add.rectangle(248, -13, 40, 12, 0xffffff, 0.001).setOrigin(0, 0);
    this.container.add([this.title, this.body, footerBg, this.footer, this.backZone]);
    this.clear();
  }

  show(model = {}) {
    super.show(model);
    const battleMessage = this.ui.getMessageHandler();
    battleMessage.commandWindow.setVisible(false);
    battleMessage.movesWindowContainer.setVisible(true);
    this.title.setText(model.title || 'Target Select');
    this.body.setText(model.placeholder || model.blockedReason || 'Target selection remains intentionally blocked in the current singles-only engine-first path.');
    this.backZone.removeAllListeners();
    const footerAction = (model.footerActions || [])[0] || null;
    this.footer.setText(footerAction?.label || 'Back');
    if (footerAction?.action) {
      this.env.setInteractiveTarget(this.backZone, () => this.controller.handleAction(footerAction.action));
    }
  }
}
