import { PkbUiMode } from './modes.js';
import { UiHandler } from './shared/ui-handler.js';
import { MessageUiHandler } from './shared/message-ui-handler.js';

class BattleMessageUiHandler extends MessageUiHandler {
  constructor(root) {
    super(root, PkbUiMode.MESSAGE);
    this.bg = null;
    this.commandWindow = null;
    this.movesWindowContainer = null;
  }

  setup() {
    const { scene, env } = this;
    const { UI_ASSETS, textureExists, createBaseText } = env;
    this.container = scene.add.container(0, 240).setDepth(50).setName('pkb-ui-root-message');
    this.bg = scene.add.image(0, 0, UI_ASSETS.bgAtlas.key, '1').setOrigin(0, 1).setName('sprite-battle-msg-bg');
    this.commandWindow = scene.add.nineslice(202, 0, UI_ASSETS.window.key, undefined, 118, 48, 8, 8, 8, 8)
      .setOrigin(0, 1)
      .setVisible(false)
      .setName('window-command');
    this.movesWindowContainer = scene.add.container(0, 0).setVisible(false).setName('moves-bg');
    const movesWindow = scene.add.nineslice(0, 0, UI_ASSETS.window.key, undefined, 243, 48, 8, 8, 8, 8).setOrigin(0, 1);
    const moveDetailsWindow = scene.add.nineslice(240, 0, UI_ASSETS.window.key, undefined, 80, 48, 8, 8, 8, 8).setOrigin(0, 1);
    this.movesWindowContainer.add([movesWindow, moveDetailsWindow]);
    this.message = createBaseText(scene, 12, -39, '', 8, '#f8fbff', {
      lineSpacing: 1,
      wordWrap: { width: 178, useAdvancedWrap: true },
    }).setOrigin(0, 0).setName('text-battle-message');
    this.prompt = textureExists(scene, UI_ASSETS.promptAtlas.key, '1')
      ? scene.add.sprite(0, 0, UI_ASSETS.promptAtlas.key, '1').setOrigin(0, 0)
      : createBaseText(scene, 0, 0, '▾', 10, '#f8fbff').setOrigin(0, 0);
    this.prompt.setVisible(false);
    this.container.add([this.bg, this.commandWindow, this.movesWindowContainer, this.message, this.prompt]);
  }

  show(model = {}) {
    super.show(model);
    const primary = model.primaryText || '';
    const secondary = model.secondaryText || '';
    this.setMessageLines(primary, secondary);
    this.setPromptVisible(model.showPrompt);
    const lineCount = [primary, secondary].filter(Boolean).length || 1;
    const longest = [primary, secondary].sort((a, b) => String(b || '').length - String(a || '').length)[0] || '';
    const approxWidth = Math.min(172, Math.max(0, longest.length * 4.4));
    this.prompt?.setPosition(12 + approxWidth + 2, -39 + (lineCount - 1) * 12 + 2);
    this.bg?.setVisible(true);
  }
}

class CommandUiHandler extends UiHandler {
  constructor(root) {
    super(root, PkbUiMode.COMMAND);
    this.cursor = null;
    this.teraButton = null;
    this.entries = [];
  }

  setup() {
    const { scene, env } = this;
    const { UI_ASSETS, textureExists, createBaseText } = env;
    this.container = scene.add.container(0, 240).setDepth(55).setName('pkb-ui-root-command');
    this.cursor = textureExists(scene, UI_ASSETS.cursor.key)
      ? scene.add.image(0, 0, UI_ASSETS.cursor.key).setOrigin(0, 0)
      : createBaseText(scene, 0, 0, '▶', 8, '#f8fbff').setOrigin(0, 0);
    this.teraButton = textureExists(scene, UI_ASSETS.teraAtlas.key, 'unknown')
      ? scene.add.sprite(185, -15, UI_ASSETS.teraAtlas.key, 'unknown').setOrigin(0.5, 0.5).setScale(1.3)
      : createBaseText(scene, 185, -15, 'Tera', 8, '#f8fbff').setOrigin(0.5, 0.5);
    this.teraButton.setVisible(false);
    const positions = [
      { x: 217, y: -38.7 },
      { x: 272.8, y: -38.7 },
      { x: 217, y: -22.7 },
      { x: 272.8, y: -22.7 },
    ];
    this.entries = positions.map(pos => {
      const label = createBaseText(scene, pos.x, pos.y, '', 8, '#f8fbff').setOrigin(0, 0);
      const zone = scene.add.rectangle(pos.x - 6, pos.y - 2, 52, 14, 0xffffff, 0.001).setOrigin(0, 0);
      this.container.add([zone, label]);
      return { label, zone, pos };
    });
    this.container.add([this.cursor, this.teraButton]);
    this.hide();
  }

  show(model = {}) {
    super.show(model);
    const { setInteractiveTarget, textureExists, UI_ASSETS } = this.env;
    let cursorPos = this.entries[0]?.pos || { x: 217, y: -38.7 };
    this.entries.forEach((entry, index) => {
      const command = (model.commands || [])[index] || { label: '', disabled: true };
      entry.label.setText(command.label || '');
      entry.label.setAlpha(command.disabled ? 0.42 : 1);
      entry.label.setColor(command.disabled ? '#64748b' : '#f8fbff');
      entry.zone.removeAllListeners();
      if (!command.disabled && command.action) {
        setInteractiveTarget(entry.zone, () => this.controller.handleAction(command.action));
      }
      if (command.active) cursorPos = entry.pos;
    });
    this.cursor?.setVisible(true);
    this.cursor?.setPosition(cursorPos.x - 5, cursorPos.y + 8);
    const tera = model.teraToggle;
    if (tera) {
      this.teraButton.setVisible(true);
      if (this.teraButton.setTexture && textureExists(this.scene, UI_ASSETS.teraAtlas.key, tera.type || 'unknown')) {
        this.teraButton.setTexture(UI_ASSETS.teraAtlas.key, tera.type || 'unknown');
      }
      this.teraButton.setAlpha(tera.disabled ? 0.45 : 1);
      this.teraButton.setScale(tera.active ? 1.45 : 1.3);
      this.teraButton.removeAllListeners?.();
      if (!tera.disabled && tera.action) {
        setInteractiveTarget(this.teraButton, () => this.controller.handleAction(tera.action));
      }
    } else {
      this.teraButton.setVisible(false);
    }
  }
}

class FightUiHandler extends UiHandler {
  constructor(root) {
    super(root, PkbUiMode.FIGHT);
    this.movesContainer = null;
    this.cursor = null;
    this.moves = [];
    this.detailName = null;
    this.typeIcon = null;
    this.categoryIcon = null;
    this.ppText = null;
    this.powerText = null;
    this.accuracyText = null;
    this.description = null;
    this.toggles = [];
    this.footerActions = [];
  }

  setup() {
    const { scene, env } = this;
    const { UI_ASSETS, textureExists, createBaseText } = env;
    this.container = scene.add.container(0, 240).setDepth(55).setName('pkb-ui-root-fight');
    this.movesContainer = scene.add.container(18, -38.7).setName('pkb-ui-fight-moves');
    this.cursor = textureExists(scene, UI_ASSETS.cursor.key)
      ? scene.add.image(0, 0, UI_ASSETS.cursor.key).setOrigin(0, 0)
      : createBaseText(scene, 0, 0, '▶', 8, '#f8fbff').setOrigin(0, 0);
    this.moves = Array.from({ length: 4 }, (_, moveIndex) => {
      const localX = moveIndex % 2 === 0 ? 0 : 114;
      const localY = moveIndex < 2 ? 0 : 16;
      const label = createBaseText(scene, localX, localY, '', 8, '#f8fbff', {
        wordWrap: { width: 98, useAdvancedWrap: true },
      }).setOrigin(0, 0);
      const zone = scene.add.rectangle(localX - 6, localY - 2, 110, 14, 0xffffff, 0.001).setOrigin(0, 0);
      this.movesContainer.add([zone, label]);
      return { label, zone, localX, localY };
    });
    this.detailName = createBaseText(scene, 249, -40, '', 7, '#f8fbff', {
      wordWrap: { width: 44, useAdvancedWrap: true },
    }).setOrigin(0, 0);
    this.typeIcon = textureExists(scene, UI_ASSETS.typesAtlas.key, 'unknown')
      ? scene.add.image(263, -38, UI_ASSETS.typesAtlas.key, 'unknown').setOrigin(0, 0).setScale(0.55)
      : createBaseText(scene, 263, -38, '', 7, '#cbd5e1').setOrigin(0, 0);
    this.categoryIcon = textureExists(scene, UI_ASSETS.categoriesAtlas.key, 'status')
      ? scene.add.image(289, -38, UI_ASSETS.categoriesAtlas.key, 'status').setOrigin(0, 0).setScale(0.55)
      : createBaseText(scene, 289, -38, '', 7, '#cbd5e1').setOrigin(0, 0);
    const ppLabel = createBaseText(scene, 250, -26, 'PP', 6, '#dbeafe').setOrigin(0, 0.5);
    this.ppText = createBaseText(scene, 308, -26, '--/--', 6, '#dbeafe').setOrigin(1, 0.5);
    const powerLabel = createBaseText(scene, 250, -18, 'Pow', 6, '#dbeafe').setOrigin(0, 0.5);
    this.powerText = createBaseText(scene, 308, -18, '---', 6, '#dbeafe').setOrigin(1, 0.5);
    const accuracyLabel = createBaseText(scene, 250, -10, 'Acc', 6, '#dbeafe').setOrigin(0, 0.5);
    this.accuracyText = createBaseText(scene, 308, -10, '---', 6, '#dbeafe').setOrigin(1, 0.5);
    this.description = createBaseText(scene, 249, -2, '', 6, '#cbd5e1', {
      wordWrap: { width: 65, useAdvancedWrap: true },
    }).setOrigin(0, 1);
    this.toggles = Array.from({ length: 5 }, () => {
      const bg = scene.add.nineslice(0, 0, UI_ASSETS.windowXthin.key, undefined, 30, 12, 8, 8, 8, 8).setOrigin(0, 0);
      const label = createBaseText(scene, 15, 6, '', 6, '#f8fbff', { align: 'center' }).setOrigin(0.5, 0.5);
      const icon = textureExists(scene, UI_ASSETS.teraAtlas.key, 'unknown')
        ? scene.add.sprite(0, 0, UI_ASSETS.teraAtlas.key, 'unknown').setOrigin(0.5, 0.5).setScale(0.45)
        : null;
      const hit = scene.add.rectangle(0, 0, 30, 12, 0xffffff, 0.001).setOrigin(0, 0);
      const button = scene.add.container(0, 0, icon ? [bg, icon, label, hit] : [bg, label, hit]);
      button.setVisible(false);
      return { button, bg, label, icon, hit };
    });
    this.footerActions = Array.from({ length: 2 }, () => {
      const bg = scene.add.nineslice(0, 0, UI_ASSETS.windowXthin.key, undefined, 40, 12, 8, 8, 8, 8).setOrigin(0, 0);
      const label = createBaseText(scene, 20, 6, '', 6, '#f8fbff', { align: 'center' }).setOrigin(0.5, 0.5);
      const hit = scene.add.rectangle(0, 0, 40, 12, 0xffffff, 0.001).setOrigin(0, 0);
      return { bg, label, hit };
    });
    this.container.add([
      this.movesContainer,
      this.cursor,
      this.detailName,
      this.typeIcon,
      this.categoryIcon,
      ppLabel,
      this.ppText,
      powerLabel,
      this.powerText,
      accuracyLabel,
      this.accuracyText,
      this.description,
      ...this.toggles.map(entry => entry.button),
      ...this.footerActions.flatMap(entry => [entry.bg, entry.label, entry.hit]),
    ]);
    this.hide();
  }

  show(model = {}) {
    super.show(model);
    const { setInteractiveTarget, textureExists, UI_ASSETS } = this.env;
    const positions = [
      { labelX: 0, labelY: 0, cursorX: 13, cursorY: -31 },
      { labelX: 114, labelY: 0, cursorX: 127, cursorY: -31 },
      { labelX: 0, labelY: 16, cursorX: 13, cursorY: -16 },
      { labelX: 114, labelY: 16, cursorX: 127, cursorY: -16 },
    ];
    let cursorPos = positions[0];
    this.moves.forEach((entry, index) => {
      const move = (model.moves || [])[index] || { label: '', disabled: true };
      const pos = positions[index];
      entry.label.setText(move.label || '');
      entry.label.setAlpha(move.disabled ? 0.42 : 1);
      entry.label.setColor(move.disabled ? '#64748b' : '#f8fbff');
      entry.zone.removeAllListeners();
      if (!move.disabled) {
        const hoverAction = move.focusAction ? () => this.controller.handleAction(move.focusAction) : null;
        setInteractiveTarget(entry.zone, move.action ? () => this.controller.handleAction(move.action) : null, hoverAction);
      }
      if (move.focused || move.active) cursorPos = pos;
    });
    this.cursor.setPosition(cursorPos.cursorX, cursorPos.cursorY);
    const detail = model.detail || {};
    this.detailName.setText(detail.name || '—');
    if (this.typeIcon.setTexture) {
      const typesKey = this.root.uiLanguage === 'ko' && textureExists(this.scene, UI_ASSETS.typesKoAtlas.key, detail.type)
        ? UI_ASSETS.typesKoAtlas.key
        : UI_ASSETS.typesAtlas.key;
      if (textureExists(this.scene, typesKey, detail.type || 'unknown')) {
        this.typeIcon.setTexture(typesKey, detail.type || 'unknown');
        this.typeIcon.setVisible(true);
      } else {
        this.typeIcon.setVisible(false);
      }
    } else {
      this.typeIcon.setText(detail.typeLabel || '');
    }
    if (this.categoryIcon.setTexture) {
      if (textureExists(this.scene, UI_ASSETS.categoriesAtlas.key, detail.category || 'status')) {
        this.categoryIcon.setTexture(UI_ASSETS.categoriesAtlas.key, detail.category || 'status');
        this.categoryIcon.setVisible(true);
      } else {
        this.categoryIcon.setVisible(false);
      }
    } else {
      this.categoryIcon.setText(detail.category || '');
    }
    this.ppText.setText(detail.ppLabel || '--/--');
    this.powerText.setText(detail.powerLabel || '---');
    this.accuracyText.setText(detail.accuracyLabel || '---');
    this.description.setText(detail.description || '');
    (model.toggles || []).slice(0, this.toggles.length).forEach((toggle, index) => {
      const entry = this.toggles[index];
      entry.button.setVisible(true);
      entry.button.setPosition(246 + index * 31, -13);
      entry.bg.setAlpha(toggle.disabled ? 0.45 : 1);
      entry.label.setText(toggle.label || '');
      entry.label.setColor(toggle.disabled ? '#64748b' : '#f8fbff');
      if (entry.icon) {
        entry.icon.setVisible(toggle.kind === 'tera');
        if (toggle.kind === 'tera' && textureExists(this.scene, UI_ASSETS.teraAtlas.key, toggle.type || 'unknown')) {
          entry.icon.setTexture(UI_ASSETS.teraAtlas.key, toggle.type || 'unknown');
          entry.icon.setPosition(6, 6);
          entry.label.setPosition(15, 6);
        } else {
          entry.icon.setVisible(false);
          entry.label.setPosition(15, 6);
        }
      }
      entry.hit.removeAllListeners();
      if (!toggle.disabled && toggle.action) {
        setInteractiveTarget(entry.hit, () => this.controller.handleAction(toggle.action));
      }
    });
    this.toggles.slice((model.toggles || []).length).forEach(entry => entry.button.setVisible(false));
    (model.footerActions || []).slice(0, this.footerActions.length).forEach((action, index) => {
      const entry = this.footerActions[index];
      entry.bg.setVisible(true);
      entry.label.setVisible(true);
      entry.hit.setVisible(true);
      entry.bg.setPosition(247 + index * 41, -48);
      entry.label.setPosition(247 + index * 41 + 20, -42);
      entry.label.setText(action.label || '');
      entry.label.setColor(action.disabled ? '#64748b' : '#f8fbff');
      entry.bg.setAlpha(action.disabled ? 0.42 : 1);
      entry.hit.setPosition(247 + index * 41, -48);
      entry.hit.removeAllListeners();
      if (!action.disabled && action.action) {
        setInteractiveTarget(entry.hit, () => this.controller.handleAction(action.action));
      }
    });
    this.footerActions.slice((model.footerActions || []).length).forEach(entry => {
      entry.bg.setVisible(false);
      entry.label.setVisible(false);
      entry.hit.setVisible(false);
    });
  }
}

class PartyUiHandler extends UiHandler {
  constructor(root) {
    super(root, PkbUiMode.PARTY);
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
    const { UI_ASSETS, textureExists, createBaseText } = env;
    this.container = scene.add.container(0, 240).setDepth(56).setVisible(false).setName('pkb-ui-root-party');
    const bg = scene.add.image(0, 0, UI_ASSETS.partyBg.key).setOrigin(0, 1);
    const messageBox = scene.add.nineslice(1, -1, UI_ASSETS.window.key, undefined, 262, 30, 8, 8, 8, 8).setOrigin(0, 1);
    this.message = createBaseText(scene, 10, -23, '', 7, '#f8fbff', {
      wordWrap: { width: 244, useAdvancedWrap: true },
      lineSpacing: 1,
    }).setOrigin(0, 1);
    this.cursor = textureExists(scene, UI_ASSETS.menuSel.key)
      ? scene.add.image(0, 0, UI_ASSETS.menuSel.key).setOrigin(0, 0)
      : createBaseText(scene, 0, 0, '▶', 8, '#f8fbff').setOrigin(0, 0);
    this.cancelBg = textureExists(scene, UI_ASSETS.partyCancelAtlas.key, 'party_cancel')
      ? scene.add.image(291, -16, UI_ASSETS.partyCancelAtlas.key, 'party_cancel').setOrigin(0, 0.5)
      : scene.add.nineslice(291, -16, UI_ASSETS.windowXthin.key, undefined, 52, 32, 8, 8, 8, 8).setOrigin(0, 0.5);
    this.cancelPb = textureExists(scene, UI_ASSETS.partyPbAtlas.key, 'party_pb')
      ? scene.add.image(274, -16, UI_ASSETS.partyPbAtlas.key, 'party_pb').setOrigin(0.5, 0.5)
      : null;
    this.cancelLabel = createBaseText(scene, 281, -23, 'Cancel', 7, '#f8fbff').setOrigin(0, 0);
    this.cancelZone = scene.add.rectangle(291, -32, 52, 32, 0xffffff, 0.001).setOrigin(0, 0);
    const slotYs = [-148.5, -168, -140, -112, -84, -56];
    this.entries = slotYs.map((slotY, index) => {
      const benched = index > 0;
      const baseX = benched ? 143 : 9;
      const mainFrame = benched ? 'party_slot' : 'party_slot_main';
      const selFrame = benched ? 'party_slot_sel' : 'party_slot_main_sel';
      const bgObj = scene.add.image(baseX, slotY, benched ? UI_ASSETS.partySlotAtlas.key : UI_ASSETS.partySlotMainAtlas.key, mainFrame).setOrigin(0, 0);
      const pb = scene.add.image(baseX + (benched ? 2 : 4), slotY + (benched ? 12 : 4), UI_ASSETS.partyPbAtlas.key, 'party_pb').setOrigin(0, 0);
      const label = createBaseText(scene, baseX + (benched ? 21 : 24), slotY + (benched ? 2 : 10), '', benched ? 7 : 8, '#f8fbff', {
        wordWrap: { width: benched ? 52 : 76, useAdvancedWrap: true },
      }).setOrigin(0, 0);
      const sublabel = createBaseText(scene, baseX + (benched ? 94 : 32), slotY + (benched ? 16 : 46), '', 5, '#dbeafe', {
        wordWrap: { width: benched ? 74 : 72, useAdvancedWrap: true },
      }).setOrigin(0, 1);
      const hpBarBase = scene.add.image(baseX + (benched ? 72 : 8), slotY + (benched ? 6 : 31), UI_ASSETS.partySlotHpBar.key).setOrigin(0, 0);
      const hpBarFill = scene.add.image(hpBarBase.x + 16, hpBarBase.y + 2, UI_ASSETS.partySlotHpOverlayAtlas.key, 'high').setOrigin(0, 0);
      const hpText = createBaseText(scene, benched ? (baseX + 172) : (baseX + 95), slotY + (benched ? 12 : 38), '', 5, '#eff6ff').setOrigin(1, 0.5);
      const hit = scene.add.rectangle(bgObj.x, bgObj.y, bgObj.width, bgObj.height, 0xffffff, 0.001).setOrigin(0, 0);
      const row = scene.add.container(0, 0, [bgObj, pb, hpBarBase, hpBarFill, label, sublabel, hpText, hit]);
      return { row, bgObj, mainFrame, selFrame, pb, label, sublabel, hpBarFill, hpText, hit, x: bgObj.x, y: bgObj.y };
    });
    this.container.add([bg, messageBox, this.message, this.cursor, this.cancelBg, this.cancelLabel, this.cancelZone, ...(this.cancelPb ? [this.cancelPb] : []), ...this.entries.map(entry => entry.row)]);
    this.hide();
  }

  show(model = {}) {
    super.show(model);
    const { UI_ASSETS, textureExists, clamp, setHorizontalCrop, setInteractiveTarget } = this.env;
    this.message.setText([model.title || '', model.subtitle || ''].filter(Boolean).join('\n'));
    let cursorPos = null;
    this.entries.forEach((entry, index) => {
      const option = (model.partyOptions || [])[index] || null;
      entry.row.setVisible(Boolean(option));
      if (!option) return;
      const selected = Boolean(option.active);
      entry.bgObj.setTexture(index === 0 ? UI_ASSETS.partySlotMainAtlas.key : UI_ASSETS.partySlotAtlas.key, selected ? entry.selFrame : entry.mainFrame);
      entry.pb.setTexture(UI_ASSETS.partyPbAtlas.key, selected ? 'party_pb_sel' : 'party_pb');
      entry.label.setText(option.label || '');
      entry.label.setColor(option.disabled ? '#64748b' : '#f8fbff');
      entry.sublabel.setText(option.sublabel || '');
      entry.sublabel.setColor(option.disabled ? '#94a3b8' : '#dbeafe');
      const hpPercent = clamp(Number(option.hpPercent ?? 100), 0, 100);
      const hpFrame = hpPercent > 50 ? 'high' : hpPercent > 20 ? 'medium' : 'low';
      if (textureExists(this.scene, UI_ASSETS.partySlotHpOverlayAtlas.key, hpFrame)) {
        entry.hpBarFill.setTexture(UI_ASSETS.partySlotHpOverlayAtlas.key, hpFrame);
      }
      setHorizontalCrop(entry.hpBarFill, 100 * (hpPercent / 100));
      entry.hpText.setText(option.hpLabel || '');
      entry.hit.removeAllListeners();
      if (!option.disabled && option.action) {
        setInteractiveTarget(entry.hit, () => this.controller.handleAction(option.action));
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
      setInteractiveTarget(this.cancelZone, () => this.controller.handleAction(footerAction.action));
    }
  }
}

export { BattleMessageUiHandler, CommandUiHandler, FightUiHandler, PartyUiHandler };
