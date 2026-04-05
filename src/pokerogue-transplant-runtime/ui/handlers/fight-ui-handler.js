import { UiHandler } from './ui-handler.js';
import { UiMode } from '../ui-mode.js';

export class FightUiHandler extends UiHandler {
  constructor(ui) {
    super(ui, UiMode.FIGHT);
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
    this.container = scene.add.container(0, env.LOGICAL_HEIGHT).setDepth(55).setName('pkb-transplant-fight');
    this.movesContainer = scene.add.container(18, -38.7).setName('pkb-fight-moves');
    this.cursor = env.textureExists(scene, env.UI_ASSETS.cursor.key)
      ? scene.add.image(0, 0, env.UI_ASSETS.cursor.key).setOrigin(0, 0)
      : env.createBaseText(scene, 0, 0, '▶', 8, '#f8fbff').setOrigin(0, 0);
    this.moves = Array.from({ length: 4 }, (_, moveIndex) => {
      const localX = moveIndex % 2 === 0 ? 0 : 114;
      const localY = moveIndex < 2 ? 0 : 16;
      const label = env.createBaseText(scene, localX, localY, '', 8, '#f8fbff', {
        wordWrap: { width: 98, useAdvancedWrap: true },
      }).setOrigin(0, 0);
      const zone = scene.add.rectangle(localX - 6, localY - 2, 110, 14, 0xffffff, 0.001).setOrigin(0, 0);
      this.movesContainer.add([zone, label]);
      return { label, zone, localX, localY };
    });
    this.detailName = env.createBaseText(scene, 249, -40, '', 7, '#f8fbff', {
      wordWrap: { width: 44, useAdvancedWrap: true },
    }).setOrigin(0, 0);
    this.typeIcon = env.textureExists(scene, env.UI_ASSETS.typesAtlas.key, 'unknown')
      ? scene.add.image(263, -38, env.UI_ASSETS.typesAtlas.key, 'unknown').setOrigin(0, 0).setScale(0.55)
      : env.createBaseText(scene, 263, -38, '', 7, '#cbd5e1').setOrigin(0, 0);
    this.categoryIcon = env.textureExists(scene, env.UI_ASSETS.categoriesAtlas.key, 'status')
      ? scene.add.image(289, -38, env.UI_ASSETS.categoriesAtlas.key, 'status').setOrigin(0, 0).setScale(0.55)
      : env.createBaseText(scene, 289, -38, '', 7, '#cbd5e1').setOrigin(0, 0);
    const ppLabel = env.createBaseText(scene, 250, -26, 'PP', 6, '#dbeafe').setOrigin(0, 0.5);
    this.ppText = env.createBaseText(scene, 308, -26, '--/--', 6, '#dbeafe').setOrigin(1, 0.5);
    const powerLabel = env.createBaseText(scene, 250, -18, 'Pow', 6, '#dbeafe').setOrigin(0, 0.5);
    this.powerText = env.createBaseText(scene, 308, -18, '---', 6, '#dbeafe').setOrigin(1, 0.5);
    const accuracyLabel = env.createBaseText(scene, 250, -10, 'Acc', 6, '#dbeafe').setOrigin(0, 0.5);
    this.accuracyText = env.createBaseText(scene, 308, -10, '---', 6, '#dbeafe').setOrigin(1, 0.5);
    this.description = env.createBaseText(scene, 249, -2, '', 6, '#cbd5e1', {
      wordWrap: { width: 65, useAdvancedWrap: true },
    }).setOrigin(0, 1);
    this.toggles = Array.from({ length: 5 }, () => {
      const bg = scene.add.nineslice(0, 0, env.UI_ASSETS.windowXthin.key, undefined, 30, 12, 8, 8, 8, 8).setOrigin(0, 0);
      const label = env.createBaseText(scene, 15, 6, '', 6, '#f8fbff', { align: 'center' }).setOrigin(0.5, 0.5);
      const icon = env.textureExists(scene, env.UI_ASSETS.teraAtlas.key, 'unknown')
        ? scene.add.sprite(0, 0, env.UI_ASSETS.teraAtlas.key, 'unknown').setOrigin(0.5, 0.5).setScale(0.45)
        : null;
      const hit = scene.add.rectangle(0, 0, 30, 12, 0xffffff, 0.001).setOrigin(0, 0);
      const button = scene.add.container(0, 0, icon ? [bg, icon, label, hit] : [bg, label, hit]);
      button.setVisible(false);
      return { button, bg, label, icon, hit };
    });
    this.footerActions = Array.from({ length: 2 }, () => {
      const bg = scene.add.nineslice(0, 0, env.UI_ASSETS.windowXthin.key, undefined, 40, 12, 8, 8, 8, 8).setOrigin(0, 0);
      const label = env.createBaseText(scene, 20, 6, '', 6, '#f8fbff', { align: 'center' }).setOrigin(0.5, 0.5);
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
    this.clear();
  }

  show(model = {}) {
    super.show(model);
    const battleMessage = this.ui.getMessageHandler();
    battleMessage.commandWindow.setVisible(false);
    battleMessage.movesWindowContainer.setVisible(true);
    const positions = [
      { cursorX: 13, cursorY: -31 },
      { cursorX: 127, cursorY: -31 },
      { cursorX: 13, cursorY: -16 },
      { cursorX: 127, cursorY: -16 },
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
        this.env.setInteractiveTarget(entry.zone, move.action ? () => this.controller.handleAction(move.action) : null, hoverAction);
      }
      if (move.focused || move.active) cursorPos = pos;
    });
    this.cursor.setPosition(cursorPos.cursorX, cursorPos.cursorY);
    const detail = model.detail || {};
    this.detailName.setText(detail.name || '—');
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
    if (this.categoryIcon.setTexture) {
      if (this.env.textureExists(this.scene, this.env.UI_ASSETS.categoriesAtlas.key, detail.category || 'status')) {
        this.categoryIcon.setTexture(this.env.UI_ASSETS.categoriesAtlas.key, detail.category || 'status');
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
    const toggleBaseX = 248;
    this.toggles.forEach((entry, index) => {
      const toggle = (model.toggles || [])[index] || null;
      entry.button.setVisible(Boolean(toggle));
      if (!toggle) return;
      entry.button.setPosition(toggleBaseX + index * 33, -48);
      entry.label.setText(toggle.label || '');
      entry.label.setColor(toggle.disabled ? '#94a3b8' : '#f8fbff');
      entry.bg.setAlpha(toggle.active ? 1 : 0.82);
      if (entry.icon) {
        const iconVisible = toggle.kind === 'tera' && this.env.textureExists(this.scene, this.env.UI_ASSETS.teraAtlas.key, toggle.type || 'unknown');
        entry.icon.setVisible(iconVisible);
        if (iconVisible) entry.icon.setTexture(this.env.UI_ASSETS.teraAtlas.key, toggle.type || 'unknown');
        entry.icon.setPosition(6, 6);
        entry.label.setPosition(iconVisible ? 18 : 15, 6);
        entry.label.setOrigin(iconVisible ? 0 : 0.5, 0.5);
      }
      entry.hit.removeAllListeners();
      if (!toggle.disabled && toggle.action) {
        this.env.setInteractiveTarget(entry.hit, () => this.controller.handleAction(toggle.action));
      }
    });
    this.footerActions.forEach((entry, index) => {
      const action = (model.footerActions || [])[index] || null;
      const visible = Boolean(action);
      entry.bg.setVisible(visible);
      entry.label.setVisible(visible);
      entry.hit.setVisible(visible);
      if (!visible) return;
      entry.bg.setPosition(248 + index * 42, -13);
      entry.label.setPosition(248 + index * 42 + 20, -7);
      entry.hit.setPosition(248 + index * 42, -13);
      entry.label.setText(action.label || '');
      entry.label.setColor(action.disabled ? '#94a3b8' : '#f8fbff');
      entry.bg.setAlpha(action.disabled ? 0.6 : 1);
      entry.hit.removeAllListeners();
      if (!action.disabled && action.action) {
        this.env.setInteractiveTarget(entry.hit, () => this.controller.handleAction(action.action));
      }
    });
  }
}
