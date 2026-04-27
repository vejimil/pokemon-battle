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
    // 원본: Tera불가 setWordWrapWidth(1110) → 1110/6=185px logical
    //        Tera가능 setWordWrapWidth(910)  → 910/6≈152px logical
    this.env.setTextWordWrap(messageHandler.message, this.canTera() ? 152 : 185, true);
    const prompt = state.prompt || state.title || '';
    if (prompt) {
      messageHandler.showText(prompt, 0, null, null, false);
    }

    this.entries.forEach((entry, index) => {
      const command = this.getCommandEntries()[index] || { label: '', disabled: true };
      entry.label.setText(command.label || '');
      entry.label.setAlpha(command.disabled ? 0.42 : 1);
      entry.label.setColor(command.disabled ? '#64748b' : '#f8fbff');
      entry.zone.removeAllListeners();
      if (!command.disabled && command.action) {
        this.env.setInteractiveTarget(entry.zone, () => { this.getUi().playSelect(); this.globalScene.dispatchAction(command.action); });
      } else if (command.disabled) {
        this.env.setInteractiveTarget(entry.zone, () => this.getUi().playError());
      }
    });

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
        this.env.setInteractiveTarget(this.teraButton, () => { this.getUi().playSelect(); this.globalScene.dispatchAction(tera.action); });
      }
    } else {
      this.teraButton.setVisible(false);
      if (this.getCursor() === Command.TERA) {
        this.setCursor(this.globalScene.getCommandSelectionState(Command.FIGHT).cursor);
      }
    }

    const selection = this.globalScene.getCommandSelectionState(this.getCursor());
    this.setCursor(selection.cursor);
    return true;
  }

  getCommandEntries() {
    return this.getInputModel().entries || [];
  }

  getTeraToggle() {
    return this.getInputModel().teraToggle || null;
  }

  canTera() {
    return Boolean(this.getTeraToggle());
  }

  toggleTeraButton() {
    if (!this.teraButton) return;
    const active = this.getCursor() === Command.TERA || Boolean(this.getTeraToggle()?.active);
    this.teraButton.setScale(active ? 1.45 : 1.3);
    if (typeof this.teraButton.setTint === 'function') {
      if (active) this.teraButton.setTint(0xb91c1c);
      else this.teraButton.clearTint?.();
    } else if (typeof this.teraButton.setColor === 'function') {
      this.teraButton.setColor(active ? '#b91c1c' : '#f8fbff');
    }
  }

  getCursor() {
    return this.fieldIndex ? this.cursor2 : this.cursor;
  }

  setCursor(cursor) {
    const resolvedCursor = this.globalScene.getCommandSelectionState(cursor).cursor;
    const changed = this.getCursor() !== resolvedCursor;
    if (changed) {
      if (this.fieldIndex) this.cursor2 = resolvedCursor;
      else this.cursor = resolvedCursor;
    }

    if (!this.cursorObj) {
      // PokeRogue uses default origin (0.5, 0.5) for the cursor image
      this.cursorObj = this.env.textureExists(this.scene, this.env.UI_ASSETS.cursor.key)
        ? this.scene.add.image(0, 0, this.env.UI_ASSETS.cursor.key)
        : addTextObject(this.ui, 0, 0, '▶', 'WINDOW_BATTLE_COMMAND').setOrigin(0, 0);
      this.commandsContainer.add(this.cursorObj);
    }

    if (resolvedCursor === Command.TERA) {
      this.cursorObj.setVisible(false);
    } else {
      const entry = this.entries[resolvedCursor] || this.entries[0];
      this.cursorObj.setVisible(true);
      this.cursorObj.setPosition(entry.pos.x - 5, entry.pos.y + 8);
    }
    this.toggleTeraButton();
    return changed;
  }

  processInput(button) {
    const result = this.globalScene.resolveCommandInput(this.getCursor(), button);
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
    this.getUi().getMessageHandler().commandWindow?.setVisible(false);
    this.commandsContainer?.setVisible(false);
    this.getUi().getMessageHandler().clearText?.();
    this.eraseCursor();
  }

  eraseCursor() {
    if (this.cursorObj) {
      this.cursorObj.setVisible(false);
    }
  }
}
