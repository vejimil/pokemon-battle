export const PkbUiMode = Object.freeze({
  MESSAGE: 'message',
  COMMAND: 'command',
  FIGHT: 'fight',
  PARTY: 'party',
  TARGET: 'target',
});

class UiHandler {
  constructor(root, mode) {
    this.root = root;
    this.scene = root.scene;
    this.controller = root.controller;
    this.env = root.env;
    this.mode = mode;
    this.container = null;
  }

  setup() {}

  show(_model = {}) {
    if (this.container) this.container.setVisible(true);
  }

  hide() {
    if (this.container) this.container.setVisible(false);
  }

  clear() {
    this.hide();
  }
}

class MessageUiHandler extends UiHandler {
  constructor(root, mode = PkbUiMode.MESSAGE) {
    super(root, mode);
    this.message = null;
    this.prompt = null;
  }

  setMessageLines(primary = '', secondary = '') {
    const lines = [primary, secondary].filter(Boolean);
    this.message?.setText(lines.join('\n'));
  }

  setPromptVisible(visible) {
    if (!this.prompt) return;
    this.prompt.setVisible(Boolean(visible));
    if (visible && this.prompt.play) {
      try {
        this.prompt.play('pkb-ui-prompt-arrow');
      } catch (_error) {
        // no-op
      }
    } else {
      this.prompt.anims?.stop?.();
    }
  }
}

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

class BattleInfo extends UiHandler {
  constructor(root, side) {
    super(root, `battle-info-${side}`);
    this.side = side;
    this.isPlayer = side === 'player';
    this.bg = null;
    this.name = null;
    this.level = null;
    this.status = null;
    this.hpTrack = null;
    this.hpFill = null;
    this.hpText = null;
    this.expBar = null;
    this.expFill = null;
    this.typeIcons = [];
  }

  setup() {
    const { scene, env } = this;
    const { UI_ASSETS } = env;
    this.container = scene.add.container(0, 0).setName(`pkb-battle-info-${this.side}`);
    const textureKey = this.isPlayer ? UI_ASSETS.pbinfoPlayer.key : UI_ASSETS.pbinfoEnemy.key;
    this.bg = scene.add.image(0, 0, textureKey).setOrigin(1, 0.5);
    this.name = env.createBaseText(scene, this.isPlayer ? -115 : -124, this.isPlayer ? -15 : -11, '', 8, '#f8fbff').setOrigin(0, 0);
    this.level = scene.add.text(this.isPlayer ? -41 : -50, this.isPlayer ? -10 : -5, '', {
      fontFamily: 'emerald, pkmnems, monospace',
      fontSize: '6px',
      color: '#dbeafe',
      resolution: 3,
    }).setOrigin(0, 0.5);
    this.status = scene.add.text(-12, this.isPlayer ? 9 : 10, '', {
      fontFamily: 'emerald, pkmnems, monospace',
      fontSize: '6px',
      color: '#fbbf24',
      resolution: 3,
    }).setOrigin(1, 0.5);
    this.hpTrack = scene.add.rectangle(this.isPlayer ? -61 : -71, this.isPlayer ? -1 : 4.5, 48, 2, 0x111827, 1).setOrigin(0, 0);
    this.hpFill = scene.add.image(this.hpTrack.x, this.hpTrack.y, UI_ASSETS.overlayHpAtlas.key, 'high').setOrigin(0, 0);
    this.hpText = scene.add.text(this.isPlayer ? -60 : -70, this.isPlayer ? 8 : 12, '', {
      fontFamily: 'emerald, pkmnems, monospace',
      fontSize: '6px',
      color: '#eff6ff',
      resolution: 3,
    }).setOrigin(0, 0.5);
    if (this.isPlayer) {
      this.expBar = scene.add.image(-98, 18, UI_ASSETS.overlayExp.key).setOrigin(0, 0.5);
      this.expFill = scene.add.rectangle(-98, 18, 0, 2, 0x60a5fa, 1).setOrigin(0, 0.5);
    }
    const typeConfigs = this.isPlayer
      ? [
          { key: UI_ASSETS.pbinfoPlayerType1.key, x: -139, y: -17 },
          { key: UI_ASSETS.pbinfoPlayerType2.key, x: -139, y: -1 },
          { key: UI_ASSETS.pbinfoPlayerType3.key, x: -154, y: -17 },
        ]
      : [
          { key: UI_ASSETS.pbinfoEnemyType1.key, x: -15, y: -15.5 },
          { key: UI_ASSETS.pbinfoEnemyType2.key, x: -15, y: -2.5 },
          { key: UI_ASSETS.pbinfoEnemyType3.key, x: 0, y: -15.5 },
        ];
    this.typeIcons = typeConfigs.map(config => {
      const icon = scene.add.image(config.x, config.y, config.key, 'unknown').setOrigin(0, 0);
      icon.setVisible(false);
      return icon;
    });
    this.container.add([this.bg, this.hpTrack, this.hpFill, ...(this.expBar ? [this.expBar, this.expFill] : []), this.name, this.level, this.status, this.hpText, ...this.typeIcons]);
  }

  update(info = {}) {
    const { clamp, textureExists, UI_ASSETS, setHorizontalCrop } = this.env;
    const hpPercent = clamp(Number(info.hpPercent || 0), 0, 100);
    const hpFrame = hpPercent > 50 ? 'high' : hpPercent > 20 ? 'medium' : 'low';
    this.name.setText(info.displayName || '—');
    this.level.setText(info.levelLabel || '');
    this.status.setText(info.statusLabel || '');
    this.hpText.setText(info.hpLabel || '');
    if (this.hpFill.setTexture && textureExists(this.scene, UI_ASSETS.overlayHpAtlas.key, hpFrame)) {
      this.hpFill.setTexture(UI_ASSETS.overlayHpAtlas.key, hpFrame);
    }
    setHorizontalCrop(this.hpFill, 48 * (hpPercent / 100));
    if (this.expFill) {
      this.expFill.width = Math.max(0, 85 * (clamp(Number(info.expPercent || 0), 0, 100) / 100));
    }
    const typeTextureKeys = this.isPlayer
      ? [UI_ASSETS.pbinfoPlayerType1.key, UI_ASSETS.pbinfoPlayerType2.key, UI_ASSETS.pbinfoPlayerType3.key]
      : [UI_ASSETS.pbinfoEnemyType1.key, UI_ASSETS.pbinfoEnemyType2.key, UI_ASSETS.pbinfoEnemyType3.key];
    this.typeIcons.forEach((icon, index) => {
      const typeId = String(info.types?.[index] || '').toLowerCase();
      const textureKey = typeTextureKeys[index] || typeTextureKeys[0];
      if (textureExists(this.scene, textureKey, typeId)) {
        icon.setTexture(textureKey, typeId);
        icon.setVisible(true);
      } else {
        icon.setVisible(false);
      }
    });
  }
}

class EnemyBattleInfo extends BattleInfo {
  constructor(root) {
    super(root, 'enemy');
  }
}

class PlayerBattleInfo extends BattleInfo {
  constructor(root) {
    super(root, 'player');
  }
}

class BattleTray {
  constructor(root, side) {
    this.root = root;
    this.scene = root.scene;
    this.env = root.env;
    this.side = side;
    this.container = null;
    this.overlay = null;
    this.balls = [];
  }

  setup() {
    const { scene, env } = this;
    const { UI_ASSETS, textureExists } = env;
    this.container = scene.add.container(0, 0).setName(`pkb-battle-tray-${this.side}`);
    const isPlayer = this.side === 'player';
    const overlayKey = isPlayer ? UI_ASSETS.trayOverlayPlayer.key : UI_ASSETS.trayOverlayEnemy.key;
    this.overlay = textureExists(scene, overlayKey)
      ? scene.add.image(0, 0, overlayKey).setOrigin(isPlayer ? 1 : 0, 0)
      : scene.add.rectangle(0, 0, 104, 4, 0x0f172a, 0.64).setOrigin(isPlayer ? 1 : 0, 0);
    const startX = isPlayer ? -83 : 76;
    const step = isPlayer ? 10 : -10;
    this.balls = Array.from({ length: 6 }, (_, index) => {
      const ball = textureExists(scene, UI_ASSETS.trayAtlas.key, 'ball')
        ? scene.add.image(startX + step * index, -8, UI_ASSETS.trayAtlas.key, 'ball').setOrigin(0, 0)
        : scene.add.circle(startX + step * index, -8, 2, 0xe2e8f0, 0.85).setOrigin(0, 0);
      return ball;
    });
    this.container.add([this.overlay, ...this.balls]);
  }

  update(tray = []) {
    const { UI_ASSETS, textureExists } = this.env;
    this.balls.forEach((ball, index) => {
      const entry = tray[index] || { state: 'empty' };
      const frame = entry.state === 'active' ? 'ball' : entry.state;
      if (textureExists(this.scene, UI_ASSETS.trayAtlas.key, frame) && ball.setTexture) {
        ball.setTexture(UI_ASSETS.trayAtlas.key, frame);
        ball.setVisible(true);
        ball.setAlpha(entry.state === 'active' ? 1 : 0.96);
        if (entry.state === 'active' && ball.setTintFill) ball.setTintFill(0x9bd6ff);
        else if (ball.clearTint) ball.clearTint();
      } else if (ball.setFillStyle) {
        const fill = entry.state === 'active' ? 0x7dd3fc : entry.state === 'faint' ? 0xf87171 : entry.state === 'status' ? 0xfbbf24 : entry.state === 'ball' ? 0xe2e8f0 : 0x475569;
        ball.setFillStyle(fill, entry.state === 'empty' ? 0.22 : 0.86);
      }
    });
  }
}

class AbilityBar {
  constructor(root) {
    this.root = root;
    this.scene = root.scene;
    this.env = root.env;
    this.container = null;
    this.left = null;
    this.right = null;
    this.text = null;
  }

  setup() {
    const { scene, env } = this;
    const { UI_ASSETS } = env;
    this.container = scene.add.container(0, 0).setVisible(false).setName('pkb-battle-ability-bar');
    this.left = scene.add.image(0, 0, UI_ASSETS.abilityBarLeft.key).setOrigin(0, 0.5);
    this.right = scene.add.image(0, 0, UI_ASSETS.abilityBarRight.key).setOrigin(1, 0.5);
    this.text = scene.add.text(0, 0, '', {
      fontFamily: 'emerald, pkmnems, monospace',
      fontSize: '7px',
      color: '#f8fbff',
      resolution: 3,
      wordWrap: { width: 104, useAdvancedWrap: true },
    }).setOrigin(0.5, 0.5);
    this.container.add([this.left, this.right, this.text]);
  }

  update(model) {
    const { clamp } = this.env;
    if (!model?.visible || !model.text) {
      this.container.setVisible(false);
      return;
    }
    this.text.setText(model.text);
    this.text.setWordWrapWidth(100, true);
    const width = clamp(this.text.width + 14, 72, 118);
    const side = model.side === 'enemy' ? 'enemy' : 'player';
    const leftVisible = side === 'enemy';
    const logicalX = side === 'enemy' ? 202 : 118;
    const logicalY = side === 'enemy' ? 62 : 136;
    this.left.setVisible(leftVisible);
    this.right.setVisible(!leftVisible);
    if (leftVisible) {
      this.left.setPosition(0, 0);
      this.left.setCrop(0, 0, width, this.left.height);
      this.text.setPosition(width / 2, 0);
      this.container.setPosition(logicalX, logicalY);
    } else {
      this.right.setPosition(0, 0);
      this.right.setCrop(this.right.width - width, 0, width, this.right.height);
      this.text.setPosition(-width / 2, 0);
      this.container.setPosition(logicalX, logicalY);
    }
    this.container.setVisible(true);
  }
}

export class PokerogueUiRoot {
  constructor(scene, controller, env) {
    this.scene = scene;
    this.controller = controller;
    this.env = env;
    this.uiLanguage = 'ko';
    this.currentModel = null;
    this.perspectiveTabs = null;
    this.enemyInfo = new EnemyBattleInfo(this);
    this.playerInfo = new PlayerBattleInfo(this);
    this.enemyTray = new BattleTray(this, 'enemy');
    this.playerTray = new BattleTray(this, 'player');
    this.abilityBar = new AbilityBar(this);
    this.messageHandler = new BattleMessageUiHandler(this);
    this.commandHandler = new CommandUiHandler(this);
    this.fightHandler = new FightUiHandler(this);
    this.partyHandler = new PartyUiHandler(this);
    this.handlers = [this.messageHandler, this.commandHandler, this.fightHandler, this.partyHandler];
    this.enemySprite = null;
    this.playerSprite = null;
  }

  setup() {
    this.perspectiveTabs = this.createPerspectiveTabs();
    this.enemyInfo.setup();
    this.playerInfo.setup();
    this.enemyTray.setup();
    this.playerTray.setup();
    this.abilityBar.setup();
    this.handlers.forEach(handler => handler.setup());
  }

  attachSpriteMounts(spriteMounts = {}) {
    this.enemySprite = spriteMounts.enemy || null;
    this.playerSprite = spriteMounts.player || null;
  }

  createPerspectiveTabs() {
    const { scene, env } = this;
    const { createBaseText, setInteractiveTarget, UI_ASSETS } = env;
    const container = scene.add.container(8, 6).setDepth(60).setName('pkb-ui-root-perspective-tabs');
    const tabs = [0, 1].map(index => {
      const bg = scene.add.nineslice(0, 0, UI_ASSETS.windowThin.key, undefined, 72, 20, 8, 8, 8, 8).setOrigin(0, 0);
      const label = createBaseText(scene, 36, 10, `P${index + 1}`, 7, '#dbeafe', { align: 'center' }).setOrigin(0.5, 0.5);
      const hit = scene.add.rectangle(0, 0, 72, 20, 0xffffff, 0.001).setOrigin(0, 0);
      const button = scene.add.container(index * 76, 0, [bg, label, hit]);
      setInteractiveTarget(hit, () => this.controller.handleAction({ type: 'perspective', player: index }));
      container.add(button);
      return { button, bg, label, hit };
    });
    return { container, tabs };
  }

  layout() {
    this.enemyTray.container.setPosition(0, 96);
    this.playerTray.container.setPosition(320, 168);
    this.enemyInfo.container.setPosition(140, 99);
    this.playerInfo.container.setPosition(310, 168);
    this.messageHandler.container.setPosition(0, 240);
    this.commandHandler.container.setPosition(0, 240);
    this.fightHandler.container.setPosition(0, 240);
    this.partyHandler.container.setPosition(0, 240);
    if (this.enemySprite) {
      this.enemySprite.anchor.setPosition(216, 132);
      this.enemySprite.dom.setPosition(216, 132);
      this.env.applyHostBox(this.enemySprite.host, 72, 72);
    }
    if (this.playerSprite) {
      this.playerSprite.anchor.setPosition(104, 184);
      this.playerSprite.dom.setPosition(104, 184);
      this.env.applyHostBox(this.playerSprite.host, 88, 88);
    }
    if (this.currentModel) this.renderModel(this.currentModel);
  }

  updatePerspectiveTabs(model) {
    const tabs = model?.perspectiveOptions || [];
    this.perspectiveTabs.tabs.forEach((tab, index) => {
      const option = tabs[index] || { label: `P${index + 1}`, active: false };
      tab.label.setText(option.label || `P${index + 1}`);
      tab.label.setColor(option.active ? '#f8fbff' : '#dbeafe');
      tab.bg.setAlpha(option.active ? 1 : 0.82);
      if (tab.bg.setTint) {
        if (option.active) tab.bg.clearTint();
        else tab.bg.setTint(0xb7c0d6);
      }
    });
  }

  renderModel(model) {
    this.currentModel = model;
    if (!model) return;
    this.uiLanguage = model.language || 'ko';
    this.updatePerspectiveTabs(model);
    this.enemyInfo.update(model.enemyInfo || {});
    this.playerInfo.update(model.playerInfo || {});
    this.enemyTray.update(model.enemyTray || []);
    this.playerTray.update(model.playerTray || []);
    this.abilityBar.update(model.abilityBar || null);
    this.messageHandler.show(model.message || {});
    this.showStateWindow(model.stateWindow || {});
    if (this.enemySprite) {
      const enemyDeferred = Boolean(model.enemySprite?.deferred || !model.enemySprite?.url);
      this.enemySprite.dom.setVisible(!enemyDeferred);
      this.env.renderAnimatedSpriteToHost(this.enemySprite.host, model.enemySprite || {}, 'large');
    }
    if (this.playerSprite) {
      const playerDeferred = Boolean(model.playerSprite?.deferred || !model.playerSprite?.url);
      this.playerSprite.dom.setVisible(!playerDeferred);
      this.env.renderAnimatedSpriteToHost(this.playerSprite.host, model.playerSprite || {}, 'large');
    }
  }

  showStateWindow(stateWindow = {}) {
    const mode = stateWindow.mode || PkbUiMode.MESSAGE;
    this.commandHandler.hide();
    this.fightHandler.hide();
    this.partyHandler.hide();
    this.messageHandler.bg.setVisible(true);
    this.messageHandler.commandWindow.setVisible(false);
    this.messageHandler.movesWindowContainer.setVisible(false);
    if (mode === PkbUiMode.COMMAND) {
      this.messageHandler.commandWindow.setVisible(true);
      this.commandHandler.show(stateWindow);
      return;
    }
    if (mode === PkbUiMode.FIGHT) {
      this.messageHandler.movesWindowContainer.setVisible(true);
      this.fightHandler.show(stateWindow);
      return;
    }
    if (mode === PkbUiMode.PARTY) {
      this.messageHandler.bg.setVisible(false);
      this.partyHandler.show(stateWindow);
      return;
    }
  }
}

export function createPkbPokerogueTransplantLayer(scene, controller, env) {
  return new PokerogueUiRoot(scene, controller, env);
}
