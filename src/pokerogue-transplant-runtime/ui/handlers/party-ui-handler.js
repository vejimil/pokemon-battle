import { UiHandler } from './ui-handler.js';
import { UiMode } from '../ui-mode.js';
import { Button } from '../facade/input-facade.js';
import { createGlobalSceneFacade } from '../facade/global-scene-facade.js';
import { addTextObject } from '../helpers/text.js';
import { addWindow } from '../helpers/ui-theme.js';

class PartySlot {
  constructor(handler, index, slotY) {
    this.handler = handler;
    this.ui = handler.ui;
    this.scene = handler.scene;
    this.env = handler.env;
    this.index = index;
    this.slotY = slotY;
    this.baseX = index === 0 ? 229 : 276;
    this.mainFrame = index === 0 ? 'party_slot_main' : index % 2 === 1 ? 'party_slot_r' : 'party_slot_l';
    this.selFrame = index === 0 ? 'party_slot_main_sel' : index % 2 === 1 ? 'party_slot_r_sel' : 'party_slot_l_sel';
  }
  setup() {
    const { scene, env } = this;
    const atlas = this.index === 0 ? env.UI_ASSETS.partySlotMainAtlas.key : env.UI_ASSETS.partySlotAtlas.key;
    this.row = scene.add.container(this.baseX, this.slotY).setName(`party-slot-${this.index}`);
    this.bgObj = scene.add.image(0, 0, atlas, this.mainFrame).setOrigin(0, 0.5);
    this.pb = scene.add.image(-17, 0, env.UI_ASSETS.partyPbAtlas.key, 'party_pb').setOrigin(0.5, 0.5);
    this.iconHolder = scene.add.rectangle(14, 0, 18, 18, 0xffffff, 0.001).setOrigin(0.5, 0.5);
    this.label = addTextObject(this.ui, 28, -7, '', 'WINDOW').setOrigin(0, 0);
    this.sublabel = addTextObject(this.ui, 28, 6, '', 'HINT').setOrigin(0, 0);
    this.hpBarBase = addWindow(this.ui, 28, 20, 100, 4, env.UI_ASSETS.windowXthin.key).setOrigin(0, 0.5);
    this.hpBarFill = scene.add.image(28, 20, env.UI_ASSETS.partySlotHpOverlayAtlas.key, 'high').setOrigin(0, 0.5);
    this.hpText = addTextObject(this.ui, 131, 14, '', 'BATTLE_VALUE').setOrigin(1, 0);
    this.hit = scene.add.rectangle(0, -18, this.bgObj.width + 18, 40, 0xffffff, 0.001).setOrigin(0, 0);
    this.row.add([this.bgObj, this.pb, this.iconHolder, this.hpBarBase, this.hpBarFill, this.label, this.sublabel, this.hpText, this.hit]);
    return this.row;
  }
  update(option = null) {
    const { textureExists, UI_ASSETS, clamp, setHorizontalCrop } = this.env;
    this.row.setVisible(Boolean(option));
    if (!option) return;
    const selected = Boolean(option.active);
    this.bgObj.setTexture(this.index === 0 ? UI_ASSETS.partySlotMainAtlas.key : UI_ASSETS.partySlotAtlas.key, selected ? this.selFrame : this.mainFrame);
    this.pb.setTexture(UI_ASSETS.partyPbAtlas.key, selected ? 'party_pb_sel' : 'party_pb');
    this.label.setText(option.label || '');
    this.label.setColor(option.disabled ? '#64748b' : '#f8fbff');
    this.sublabel.setText(option.sublabel || '');
    this.sublabel.setColor(option.disabled ? '#94a3b8' : '#dbeafe');
    const hpPercent = clamp(Number(option.hpPercent ?? 100), 0, 100);
    const hpFrame = hpPercent > 50 ? 'high' : hpPercent > 20 ? 'medium' : 'low';
    if (textureExists(this.scene, UI_ASSETS.partySlotHpOverlayAtlas.key, hpFrame)) {
      this.hpBarFill.setTexture(UI_ASSETS.partySlotHpOverlayAtlas.key, hpFrame);
    }
    setHorizontalCrop(this.hpBarFill, 100 * (hpPercent / 100));
    this.hpText.setText(option.hpLabel || '');
    this.hit.removeAllListeners();
    if (!option.disabled && option.action) {
      this.env.setInteractiveTarget(this.hit, () => this.handler.globalScene.dispatchAction(option.action));
    }
  }
  getCursorPosition() {
    return { x: this.baseX - 4, y: this.slotY - 1 };
  }
}

export class PartyUiHandler extends UiHandler {
  constructor(ui) {
    super(ui, UiMode.PARTY);
    this.globalScene = createGlobalSceneFacade(ui);
    this.partyContainer = null;
    this.partyBg = null;
    this.partyMessageBox = null;
    this.message = null;
    this.cursorObj = null;
    this.cancelBg = null;
    this.cancelPb = null;
    this.cancelLabel = null;
    this.cancelZone = null;
    this.slots = [];
    this.fieldIndex = 0;
  }

  setup() {
    const { scene, env } = this;
    this.container = scene.add.container(0, env.LOGICAL_HEIGHT).setDepth(56).setName('pkb-transplant-party-root').setVisible(false);
    this.partyContainer = this.container;
    this.partyBg = scene.add.image(0, 0, env.UI_ASSETS.partyBg.key).setOrigin(0, 1);
    this.partyMessageBox = addWindow(this.ui, 1, -1, 262, 30).setOrigin(0, 1).setName('window-party-msg-box');
    this.message = addTextObject(this.ui, 10, -23, '', 'WINDOW', {
      wordWrap: { width: 244, useAdvancedWrap: true },
      lineSpacing: 1,
    }).setOrigin(0, 1).setName('text-party-msg');
    this.cursorObj = env.textureExists(scene, env.UI_ASSETS.menuSel.key)
      ? scene.add.image(0, 0, env.UI_ASSETS.menuSel.key).setOrigin(0, 0)
      : addTextObject(this.ui, 0, 0, '▶', 'WINDOW_BATTLE_COMMAND').setOrigin(0, 0);
    this.cancelBg = env.textureExists(scene, env.UI_ASSETS.partyCancelAtlas.key, 'party_cancel')
      ? scene.add.image(291, -16, env.UI_ASSETS.partyCancelAtlas.key, 'party_cancel').setOrigin(0, 0.5)
      : addWindow(this.ui, 291, -16, 52, 32, env.UI_ASSETS.windowXthin.key).setOrigin(0, 0.5);
    this.cancelPb = env.textureExists(scene, env.UI_ASSETS.partyPbAtlas.key, 'party_pb')
      ? scene.add.image(274, -16, env.UI_ASSETS.partyPbAtlas.key, 'party_pb').setOrigin(0.5, 0.5)
      : null;
    this.cancelLabel = addTextObject(this.ui, 281, -23, 'Cancel', 'WINDOW').setOrigin(0, 0);
    this.cancelZone = scene.add.rectangle(291, -32, 52, 32, 0xffffff, 0.001).setOrigin(0, 0);
    const slotYs = [-148.5, -168, -140, -112, -84, -56];
    this.slots = slotYs.map((slotY, index) => new PartySlot(this, index, slotY));
    this.container.add([
      this.partyBg,
      this.partyMessageBox,
      this.message,
      this.cursorObj,
      this.cancelBg,
      this.cancelLabel,
      this.cancelZone,
      ...(this.cancelPb ? [this.cancelPb] : []),
      ...this.slots.map(slot => slot.setup()),
    ]);
    this.clear();
  }

  show(args = null) {
    const state = args || this.globalScene.getPartyInputModel();
    super.show(state);
    this.partyContainer.setVisible(true);
    this.fieldIndex = Number(state.fieldIndex || 0);
    this.message.setText([state.title || '', state.subtitle || ''].filter(Boolean).join('\n'));
    this.slots.forEach((slot, index) => {
      const option = this.globalScene.getPartyOptions()[index] || null;
      slot.update(option);
    });
    const footerAction = this.getFooterAction();
    const cancelVisible = Boolean(footerAction);
    this.cancelBg.setVisible(cancelVisible);
    this.cancelLabel.setVisible(cancelVisible);
    this.cancelZone.setVisible(cancelVisible);
    if (this.cancelPb) this.cancelPb.setVisible(cancelVisible);
    this.cancelLabel.setText(footerAction?.label || '');
    this.cancelZone.removeAllListeners();
    if (footerAction && !footerAction.disabled && footerAction.action) {
      this.env.setInteractiveTarget(this.cancelZone, () => this.globalScene.dispatchAction(footerAction.action));
    }
    const selection = this.globalScene.getPartySelectionState(this.getCursor());
    this.setCursor(selection.cursor, true);
    return true;
  }

  getInputModel() {
    return this.globalScene.getPartyInputModel();
  }

  getPartyOptions() {
    return this.getInputModel().partyOptions || [];
  }

  getFooterAction() {
    return (this.getInputModel().footerActions || [])[0] || null;
  }

  setCursor(index, force = false) {
    const selection = this.globalScene.getPartySelectionState(index);
    const nextIndex = selection.cursor;
    const changed = force ? true : super.setCursor(nextIndex);
    if (force) this.cursor = nextIndex;
    const cursorPos = this.getCursorPosition(nextIndex);
    this.cursorObj.setVisible(Boolean(cursorPos));
    if (cursorPos) this.cursorObj.setPosition(cursorPos.x, cursorPos.y);
    return changed;
  }

  getCursorPosition(index) {
    if (index === 6 && this.getFooterAction()) return { x: 286, y: -26 };
    const slot = this.slots[index];
    return slot ? slot.getCursorPosition() : null;
  }

  processInput(button) {
    const result = this.globalScene.resolvePartyInput(this.getCursor(), button);
    let success = false;

    if (result.changed) {
      success = this.setCursor(result.cursor);
    }
    if (result.action) {
      this.globalScene.dispatchAction(result.action);
      success = true;
    }

    if (success) this.getUi().playSelect();
    return success;
  }

  clear() {
    super.clear();
    this.partyContainer?.setVisible(false);
    if (this.cursorObj) this.cursorObj.setVisible(false);
  }
}
