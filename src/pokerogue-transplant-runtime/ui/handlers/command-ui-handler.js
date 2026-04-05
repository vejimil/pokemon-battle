import { UiHandler } from './ui-handler.js';
import { UiMode } from '../ui-mode.js';

export class CommandUiHandler extends UiHandler {
  constructor(ui) {
    super(ui, UiMode.COMMAND);
    this.cursor = null;
    this.teraButton = null;
    this.entries = [];
  }

  setup() {
    const { scene, env } = this;
    this.container = scene.add.container(0, env.LOGICAL_HEIGHT).setDepth(55).setName('pkb-transplant-command');
    this.cursor = env.textureExists(scene, env.UI_ASSETS.cursor.key)
      ? scene.add.image(0, 0, env.UI_ASSETS.cursor.key).setOrigin(0, 0)
      : env.createBaseText(scene, 0, 0, '▶', 8, '#f8fbff').setOrigin(0, 0);
    this.teraButton = env.textureExists(scene, env.UI_ASSETS.teraAtlas.key, 'unknown')
      ? scene.add.sprite(185, -15, env.UI_ASSETS.teraAtlas.key, 'unknown').setOrigin(0.5, 0.5).setScale(1.3)
      : env.createBaseText(scene, 185, -15, 'Tera', 8, '#f8fbff').setOrigin(0.5, 0.5);
    this.teraButton.setVisible(false);
    const positions = [
      { x: 217, y: -38.7 },
      { x: 272.8, y: -38.7 },
      { x: 217, y: -22.7 },
      { x: 272.8, y: -22.7 },
    ];
    this.entries = positions.map(pos => {
      const label = env.createBaseText(scene, pos.x, pos.y, '', 8, '#f8fbff').setOrigin(0, 0);
      const zone = scene.add.rectangle(pos.x - 6, pos.y - 2, 52, 14, 0xffffff, 0.001).setOrigin(0, 0);
      this.container.add([zone, label]);
      return { label, zone, pos };
    });
    this.container.add([this.cursor, this.teraButton]);
    this.clear();
  }

  show(model = {}) {
    super.show(model);
    const battleMessage = this.ui.getMessageHandler();
    battleMessage.commandWindow.setVisible(true);
    battleMessage.movesWindowContainer.setVisible(false);
    let cursorPos = this.entries[0]?.pos || { x: 217, y: -38.7 };
    this.entries.forEach((entry, index) => {
      const command = (model.commands || [])[index] || { label: '', disabled: true };
      entry.label.setText(command.label || '');
      entry.label.setAlpha(command.disabled ? 0.42 : 1);
      entry.label.setColor(command.disabled ? '#64748b' : '#f8fbff');
      entry.zone.removeAllListeners();
      if (!command.disabled && command.action) {
        this.env.setInteractiveTarget(entry.zone, () => this.controller.handleAction(command.action));
      }
      if (command.active) cursorPos = entry.pos;
    });
    this.cursor.setVisible(true);
    this.cursor.setPosition(cursorPos.x - 5, cursorPos.y + 8);
    const tera = model.teraToggle;
    if (tera) {
      this.teraButton.setVisible(true);
      if (this.teraButton.setTexture && this.env.textureExists(this.scene, this.env.UI_ASSETS.teraAtlas.key, tera.type || 'unknown')) {
        this.teraButton.setTexture(this.env.UI_ASSETS.teraAtlas.key, tera.type || 'unknown');
      }
      this.teraButton.setAlpha(tera.disabled ? 0.45 : 1);
      this.teraButton.setScale(tera.active ? 1.45 : 1.3);
      this.teraButton.removeAllListeners?.();
      if (!tera.disabled && tera.action) {
        this.env.setInteractiveTarget(this.teraButton, () => this.controller.handleAction(tera.action));
      }
    } else {
      this.teraButton.setVisible(false);
    }
  }
}
