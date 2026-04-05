import { UiHandler } from './ui-handler.js';
import { UiMode } from '../ui-mode.js';
import { Button } from '../facade/input-facade.js';
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
    this.selection = { kind: 'command', index: 0 };
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

  getCommandEntries() {
    return this.getInputModel().entries || [];
  }

  getTeraToggle() {
    return this.getInputModel().teraToggle || null;
  }

  canTera() {
    return Boolean(this.getTeraToggle());
  }

  getCursor() {
    return this.fieldIndex ? this.cursor2 : this.cursor;
  }

  setCursor(cursor) {
    const nextCursor = Math.max(0, Math.min(cursor, Math.max(0, this.getCommandEntries().length - 1)));
    const changed = this.getCursor() !== nextCursor;
    if (changed) {
      if (this.fieldIndex) this.cursor2 = nextCursor;
      else this.cursor = nextCursor;
    }
    return changed;
  }

  syncCursorVisual(selection = this.selection) {
    if (!this.cursorObj) {
      this.cursorObj = this.env.textureExists(this.scene, this.env.UI_ASSETS.cursor.key)
        ? this.scene.add.image(0, 0, this.env.UI_ASSETS.cursor.key).setOrigin(0, 0)
        : addTextObject(this.ui, 0, 0, '▶', 'WINDOW_BATTLE_COMMAND').setOrigin(0, 0);
      this.commandsContainer.add(this.cursorObj);
    }

    this.selection = selection;
    if (selection?.kind === 'tera') {
      this.cursorObj.setVisible(false);
    } else {
      const index = selection?.index ?? 0;
      const entry = this.entries[index] || this.entries[0];
      this.cursorObj.setVisible(Boolean(entry));
      if (entry) this.cursorObj.setPosition(entry.pos.x - 5, entry.pos.y + 8);
    }
    this.toggleTeraButton();
  }

  toggleTeraButton() {
    if (!this.teraButton) return;
    const active = this.selection?.kind === 'tera' || Boolean(this.getTeraToggle()?.active);
    this.teraButton.setScale(active ? 1.45 : 1.3);
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
      const command = state.entries?.[index] || { label: '', disabled: true };
      entry.label.setText(command.label || '');
      entry.label.setAlpha(command.disabled ? 0.42 : 1);
      entry.label.setColor(command.disabled ? '#64748b' : '#f8fbff');
      entry.zone.removeAllListeners();
      if (!command.disabled && command.action) {
        this.env.setInteractiveTarget(entry.zone, () => this.globalScene.dispatchAction(command.action));
      }
    });

    if (this.canTera()) {
      const tera = this.getTeraToggle() || {};
      this.teraButton.setVisible(true);
      if (this.teraButton.setTexture && this.env.textureExists(this.scene, this.env.UI_ASSETS.teraAtlas.key, tera.type || 'unknown')) {
        this.teraButton.setTexture(this.env.UI_ASSETS.teraAtlas.key, tera.type || 'unknown');
      }
      this.teraButton.setAlpha(tera.disabled ? 0.45 : 1);
      this.teraButton.removeAllListeners?.();
      if (!tera.disabled && tera.action) {
        this.env.setInteractiveTarget(this.teraButton, () => this.globalScene.dispatchAction(tera.action));
      }
    } else {
      this.teraButton.setVisible(false);
    }

    const nextSelection = this.globalScene.getCommandSelectionState(state.selection || this.selection || { kind: 'command', index: this.getCursor() });
    this.selection = nextSelection;
    if (nextSelection.kind === 'command') this.setCursor(nextSelection.index);
    this.syncCursorVisual(nextSelection);
    return true;
  }

  dispatchCurrentSelection() {
    const action = this.globalScene.getCommandSubmitAction(this.selection);
    if (!action) return false;
    this.globalScene.dispatchAction(action);
    return true;
  }

  processInput(button) {
    let success = false;
    if (button === Button.ACTION) {
      success = this.dispatchCurrentSelection();
    } else if (button !== Button.CANCEL) {
      const nextSelection = this.globalScene.moveCommandSelection(this.selection, button);
      if (nextSelection) {
        this.selection = nextSelection;
        if (nextSelection.kind === 'command') this.setCursor(nextSelection.index);
        this.syncCursorVisual(nextSelection);
        success = true;
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
