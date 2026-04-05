import { UiHandler } from './ui-handler.js';
import { UiMode } from '../ui-mode.js';
import { Button, Command } from '../facade/input-facade.js';
import { createGlobalSceneFacade } from '../facade/global-scene-facade.js';
import { addTextObject } from '../helpers/text.js';

export class CommandUiHandler extends UiHandler {
  constructor(ui) {
    super(ui, UiMode.COMMAND);
    this.globalScene = createGlobalSceneFacade(ui);
    this.commandsContainer = null;
    this.cursorObj = null;
    this.teraButton = null;
    this.entries = [];
    this.fieldIndex = 0;
    this.cursor2 = 0;
    this.currentModel = {};
  }

  setup() {
    const { scene, env } = this;
    this.container = scene.add.container(0, env.LOGICAL_HEIGHT).setDepth(55).setName('pkb-transplant-command');
    this.commandsContainer = scene.add.container(217, -38.7).setName('commands').setVisible(false);
    this.container.add(this.commandsContainer);

    this.teraButton = env.textureExists(scene, env.UI_ASSETS.teraAtlas.key, 'unknown')
      ? scene.add.sprite(-32, 15, env.UI_ASSETS.teraAtlas.key, 'unknown').setOrigin(0.5, 0.5).setScale(1.3)
      : addTextObject(this.ui, -32, 15, 'Tera', 'WINDOW_BATTLE_COMMAND').setOrigin(0.5, 0.5);
    this.teraButton.setVisible(false).setName('terastallize-button');
    this.commandsContainer.add(this.teraButton);

    const positions = [
      { x: 0, y: 0 },
      { x: 55.8, y: 0 },
      { x: 0, y: 16 },
      { x: 55.8, y: 16 },
    ];

    this.entries = positions.map((pos, index) => {
      const label = addTextObject(this.ui, pos.x, pos.y, '', 'WINDOW_BATTLE_COMMAND').setOrigin(0, 0);
      const zone = scene.add.rectangle(pos.x - 5, pos.y - 2, 52, 14, 0xffffff, 0.001).setOrigin(0, 0);
      zone.setName(`command-hit-${index}`);
      this.commandsContainer.add([zone, label]);
      return { label, zone, pos, index };
    });

    this.clear();
  }

  getInputModel() {
    return this.globalScene.getCommandInputModel();
  }

  show(args = null) {
    const state = args || this.getInputModel();
    super.show(state);
    this.currentModel = state || {};
    this.fieldIndex = Number(state.fieldIndex || 0);
    this.commandsContainer.setVisible(true);

    const messageHandler = this.getUi().getMessageHandler();
    messageHandler.bg.setVisible(true);
    messageHandler.commandWindow.setVisible(true);
    messageHandler.movesWindowContainer.setVisible(false);
    messageHandler.message.setWordWrapWidth(this.canTera() ? 156 : 178, true);
    if (state.title) {
      messageHandler.showText(state.title, 0, null, null, false);
    }

    this.entries.forEach((entry, index) => {
      const command = this.getCommandEntries()[index] || { label: '', disabled: true };
      entry.label.setText(command.label || '');
      entry.label.setAlpha(command.disabled ? 0.42 : 1);
      entry.label.setColor(command.disabled ? '#64748b' : '#f8fbff');
      entry.zone.removeAllListeners();
      if (!command.disabled && command.action) {
        this.env.setInteractiveTarget(entry.zone, () => this.globalScene.dispatchAction(command.action));
      }
      if (command.active) {
        this.setCursor(index);
      }
    });

    if (!this.getCommandEntries().some(command => command?.active)) {
      this.setCursor(this.getFirstEnabledCommandIndex(this.getCursor() === Command.POKEMON ? Command.FIGHT : this.getCursor()));
    }

    if (this.canTera()) {
      const tera = this.getTeraToggle() || {};
      this.teraButton.setVisible(true);
      if (this.teraButton.setTexture && this.env.textureExists(this.scene, this.env.UI_ASSETS.teraAtlas.key, tera.type || 'unknown')) {
        this.teraButton.setTexture(this.env.UI_ASSETS.teraAtlas.key, tera.type || 'unknown');
      }
      this.teraButton.setScale(tera.active ? 1.45 : 1.3);
      this.teraButton.setAlpha(tera.disabled ? 0.45 : 1);
      this.teraButton.removeAllListeners?.();
      if (!tera.disabled && tera.action) {
        this.env.setInteractiveTarget(this.teraButton, () => this.globalScene.dispatchAction(tera.action));
      }
    } else {
      this.teraButton.setVisible(false);
      if (this.getCursor() === Command.TERA) {
        this.setCursor(Command.FIGHT);
      }
    }

    this.toggleTeraButton();
    return true;
  }

  getCommandEntries() {
    return this.getInputModel().entries || [];
  }

  getTeraToggle() {
    return this.getInputModel().teraToggle || null;
  }

  getCommandEntry(index) {
    return this.getCommandEntries()[index] || null;
  }

  getFirstEnabledCommandIndex(preferred = Command.FIGHT) {
    if (this.getCommandEntry(preferred) && !this.getCommandEntry(preferred).disabled) return preferred;
    const firstEnabled = this.getCommandEntries().findIndex(command => command && !command.disabled);
    return firstEnabled >= 0 ? firstEnabled : Command.FIGHT;
  }

  canTera() {
    return Boolean(this.getTeraToggle());
  }

  toggleTeraButton() {
    if (!this.teraButton) return;
    const active = this.getCursor() === Command.TERA || Boolean(this.getTeraToggle()?.active);
    this.teraButton.setScale(active ? 1.45 : 1.3);
  }

  getCursor() {
    return this.fieldIndex ? this.cursor2 : this.cursor;
  }

  setCursor(cursor) {
    const resolvedCursor = cursor === Command.TERA ? Command.TERA : this.getFirstEnabledCommandIndex(cursor);
    const changed = this.getCursor() !== resolvedCursor;
    if (changed) {
      if (this.fieldIndex) this.cursor2 = resolvedCursor;
      else this.cursor = resolvedCursor;
    }

    if (!this.cursorObj) {
      this.cursorObj = this.env.textureExists(this.scene, this.env.UI_ASSETS.cursor.key)
        ? this.scene.add.image(0, 0, this.env.UI_ASSETS.cursor.key).setOrigin(0, 0)
        : addTextObject(this.ui, 0, 0, '▶', 'WINDOW_BATTLE_COMMAND').setOrigin(0, 0);
      this.commandsContainer.add(this.cursorObj);
    }

    if (resolvedCursor === Command.TERA) {
      this.cursorObj.setVisible(false);
    } else {
      const entry = this.entries[resolvedCursor] || this.entries[this.getFirstEnabledCommandIndex()];
      this.cursorObj.setVisible(true);
      this.cursorObj.setPosition(entry.pos.x - 5, entry.pos.y + 8);
    }
    this.toggleTeraButton();
    return changed;
  }

  dispatchCurrentSelection() {
    if (this.getCursor() === Command.TERA) {
      const tera = this.getTeraToggle();
      if (!tera?.disabled && tera?.action) {
        this.globalScene.dispatchAction(tera.action);
        return true;
      }
      return false;
    }
    const current = this.getCommandEntry(this.getCursor());
    if (!current?.disabled && current?.action) {
      this.globalScene.dispatchAction(current.action);
      return true;
    }
    return false;
  }

  processInput(button) {
    let success = false;
    const cursor = this.getCursor();
    const teraEnabled = this.canTera();

    if (button === Button.ACTION) {
      success = this.dispatchCurrentSelection();
    } else if (button === Button.CANCEL) {
      success = false;
    } else {
      switch (button) {
        case Button.UP:
          if (cursor === Command.POKEMON || cursor === Command.RUN) success = this.setCursor(cursor - 2);
          break;
        case Button.DOWN:
          if (cursor === Command.FIGHT || cursor === Command.BALL) success = this.setCursor(cursor + 2);
          break;
        case Button.LEFT:
          if (cursor === Command.BALL || cursor === Command.RUN) success = this.setCursor(cursor - 1);
          else if ((cursor === Command.FIGHT || cursor === Command.POKEMON) && teraEnabled) success = this.setCursor(Command.TERA);
          break;
        case Button.RIGHT:
          if (cursor === Command.FIGHT || cursor === Command.POKEMON) {
            const next = this.getCommandEntry(cursor + 1);
            if (next && !next.disabled) success = this.setCursor(cursor + 1);
          } else if (cursor === Command.TERA) {
            success = this.setCursor(Command.FIGHT);
          }
          break;
      }
    }

    if (success) this.getUi().playSelect();
    return success;
  }

  clear() {
    super.clear();
    this.getUi().getMessageHandler().commandWindow?.setVisible(false);
    this.commandsContainer?.setVisible(false);
    this.getUi().getMessageHandler().clearText?.();
    this.eraseCursor();
  }

  eraseCursor() {
    if (this.cursorObj) {
      this.cursorObj.destroy();
      this.cursorObj = null;
    }
  }
}
