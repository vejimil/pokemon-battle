import { UiHandler } from './ui-handler.js';
import { UiMode } from '../ui-mode.js';

export class PartyUiHandler extends UiHandler {
  constructor(ui) {
    super(ui, UiMode.PARTY);
    this.message = null;
    this.cursor = null;
    this.cancelBg = null;
    this.cancelPb = null;
    this.cancelLabel = null;
    this.cancelZone = null;
    this.entries = [];
  }

  setup() {
    const { scene, env } = this;
    this.container = scene.add.container(0, env.LOGICAL_HEIGHT).setDepth(56).setVisible(false).setName('pkb-transplant-party');
    const bg = scene.add.image(0, 0, env.UI_ASSETS.partyBg.key).setOrigin(0, 1);
    const messageBox = scene.add.nineslice(1, -1, env.UI_ASSETS.window.key, undefined, 262, 30, 8, 8, 8, 8).setOrigin(0, 1);
    this.message = env.createBaseText(scene, 10, -23, '', 7, '#f8fbff', {
      wordWrap: { width: 244, useAdvancedWrap: true },
      lineSpacing: 1,
    }).setOrigin(0, 1);
    this.cursor = env.textureExists(scene, env.UI_ASSETS.menuSel.key)
      ? scene.add.image(0, 0, env.UI_ASSETS.menuSel.key).setOrigin(0, 0)
      : env.createBaseText(scene, 0, 0, '▶', 8, '#f8fbff').setOrigin(0, 0);
    this.cancelBg = env.textureExists(scene, env.UI_ASSETS.partyCancelAtlas.key, 'party_cancel')
      ? scene.add.image(291, -16, env.UI_ASSETS.partyCancelAtlas.key, 'party_cancel').setOrigin(0, 0.5)
      : scene.add.nineslice(291, -16, env.UI_ASSETS.windowXthin.key, undefined, 52, 32, 8, 8, 8, 8).setOrigin(0, 0.5);
    this.cancelPb = env.textureExists(scene, env.UI_ASSETS.partyPbAtlas.key, 'party_pb')
      ? scene.add.image(274, -16, env.UI_ASSETS.partyPbAtlas.key, 'party_pb').setOrigin(0.5, 0.5)
      : null;
    this.cancelLabel = env.createBaseText(scene, 281, -23, 'Cancel', 7, '#f8fbff').setOrigin(0, 0);
    this.cancelZone = scene.add.rectangle(291, -32, 52, 32, 0xffffff, 0.001).setOrigin(0, 0);
    const slotYs = [-148.5, -168, -140, -112, -84, -56];
    this.entries = slotYs.map((slotY, index) => {
      const benched = index > 0;
      const baseX = benched ? 143 : 9;
      const mainFrame = benched ? 'party_slot' : 'party_slot_main';
      const selFrame = benched ? 'party_slot_sel' : 'party_slot_main_sel';
      const bgObj = scene.add.image(baseX, slotY, benched ? env.UI_ASSETS.partySlotAtlas.key : env.UI_ASSETS.partySlotMainAtlas.key, mainFrame).setOrigin(0, 0);
      const pb = scene.add.image(baseX + (benched ? 2 : 4), slotY + (benched ? 12 : 4), env.UI_ASSETS.partyPbAtlas.key, 'party_pb').setOrigin(0, 0);
      const label = env.createBaseText(scene, baseX + (benched ? 21 : 24), slotY + (benched ? 2 : 10), '', benched ? 7 : 8, '#f8fbff', {
        wordWrap: { width: benched ? 52 : 76, useAdvancedWrap: true },
      }).setOrigin(0, 0);
      const sublabel = env.createBaseText(scene, baseX + (benched ? 94 : 32), slotY + (benched ? 16 : 46), '', 5, '#dbeafe', {
        wordWrap: { width: benched ? 74 : 72, useAdvancedWrap: true },
      }).setOrigin(0, 1);
      const hpBarBase = scene.add.image(baseX + (benched ? 72 : 8), slotY + (benched ? 6 : 31), env.UI_ASSETS.partySlotHpBar.key).setOrigin(0, 0);
      const hpBarFill = scene.add.image(hpBarBase.x + 16, hpBarBase.y + 2, env.UI_ASSETS.partySlotHpOverlayAtlas.key, 'high').setOrigin(0, 0);
      const hpText = env.createBaseText(scene, benched ? (baseX + 172) : (baseX + 95), slotY + (benched ? 12 : 38), '', 5, '#eff6ff').setOrigin(1, 0.5);
      const hit = scene.add.rectangle(bgObj.x, bgObj.y, bgObj.width, bgObj.height, 0xffffff, 0.001).setOrigin(0, 0);
      const row = scene.add.container(0, 0, [bgObj, pb, hpBarBase, hpBarFill, label, sublabel, hpText, hit]);
      return { row, bgObj, mainFrame, selFrame, pb, label, sublabel, hpBarFill, hpText, hit, x: bgObj.x, y: bgObj.y };
    });
    this.container.add([bg, messageBox, this.message, this.cursor, this.cancelBg, this.cancelLabel, this.cancelZone, ...(this.cancelPb ? [this.cancelPb] : []), ...this.entries.map(entry => entry.row)]);
    this.clear();
  }

  show(model = {}) {
    super.show(model);
    this.ui.getMessageHandler().bg.setVisible(false);
    const { clamp, setHorizontalCrop } = this.env;
    this.message.setText([model.title || '', model.subtitle || ''].filter(Boolean).join('\n'));
    let cursorPos = null;
    this.entries.forEach((entry, index) => {
      const option = (model.partyOptions || [])[index] || null;
      entry.row.setVisible(Boolean(option));
      if (!option) return;
      const selected = Boolean(option.active);
      entry.bgObj.setTexture(index === 0 ? this.env.UI_ASSETS.partySlotMainAtlas.key : this.env.UI_ASSETS.partySlotAtlas.key, selected ? entry.selFrame : entry.mainFrame);
      entry.pb.setTexture(this.env.UI_ASSETS.partyPbAtlas.key, selected ? 'party_pb_sel' : 'party_pb');
      entry.label.setText(option.label || '');
      entry.label.setColor(option.disabled ? '#64748b' : '#f8fbff');
      entry.sublabel.setText(option.sublabel || '');
      entry.sublabel.setColor(option.disabled ? '#94a3b8' : '#dbeafe');
      const hpPercent = clamp(Number(option.hpPercent ?? 100), 0, 100);
      const hpFrame = hpPercent > 50 ? 'high' : hpPercent > 20 ? 'medium' : 'low';
      if (this.env.textureExists(this.scene, this.env.UI_ASSETS.partySlotHpOverlayAtlas.key, hpFrame)) {
        entry.hpBarFill.setTexture(this.env.UI_ASSETS.partySlotHpOverlayAtlas.key, hpFrame);
      }
      setHorizontalCrop(entry.hpBarFill, 100 * (hpPercent / 100));
      entry.hpText.setText(option.hpLabel || '');
      entry.hit.removeAllListeners();
      if (!option.disabled && option.action) {
        this.env.setInteractiveTarget(entry.hit, () => this.controller.handleAction(option.action));
      }
      if (selected) cursorPos = { x: entry.x - 4, y: entry.y - 1 };
    });
    this.cursor.setVisible(Boolean(cursorPos));
    if (cursorPos) this.cursor.setPosition(cursorPos.x, cursorPos.y);
    const footerAction = (model.footerActions || [])[0] || null;
    const cancelVisible = Boolean(footerAction);
    this.cancelBg.setVisible(cancelVisible);
    this.cancelLabel.setVisible(cancelVisible);
    this.cancelZone.setVisible(cancelVisible);
    if (this.cancelPb) this.cancelPb.setVisible(cancelVisible);
    this.cancelLabel.setText(footerAction?.label || '');
    this.cancelZone.removeAllListeners();
    if (footerAction && !footerAction.disabled && footerAction.action) {
      this.env.setInteractiveTarget(this.cancelZone, () => this.controller.handleAction(footerAction.action));
    }
  }
}
