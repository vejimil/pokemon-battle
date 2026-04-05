import { UiHandler } from './ui-handler.js';
import { UiMode } from '../ui-mode.js';

export class MessageUiHandler extends UiHandler {
  constructor(ui, mode = UiMode.MESSAGE) {
    super(ui, mode);
    this.pendingPrompt = false;
    this.message = null;
    this.prompt = null;
  }

  initPromptSprite(container) {
    if (!this.prompt) {
      const { scene, env } = this;
      if (env.textureExists(scene, env.UI_ASSETS.promptAtlas.key, '1')) {
        this.prompt = scene.add.sprite(0, 0, env.UI_ASSETS.promptAtlas.key, '1').setOrigin(0, 0);
      } else {
        this.prompt = env.createBaseText(scene, 0, 0, '▾', 10, '#f8fbff').setOrigin(0, 0);
      }
      this.prompt.setVisible(false);
    }
    if (container && this.prompt.parentContainer !== container) {
      container.add(this.prompt);
    }
  }

  clearText() {
    this.message?.setText('');
    this.hidePrompt();
  }

  hidePrompt() {
    if (!this.prompt) return;
    this.prompt.setVisible(false);
    this.prompt.anims?.stop?.();
    this.pendingPrompt = false;
  }

  showPrompt() {
    if (!this.prompt) return;
    this.prompt.setVisible(true);
    if (this.prompt.play) {
      try {
        this.prompt.play('pkb-ui-prompt-arrow');
      } catch (_error) {
        // no-op
      }
    }
    this.pendingPrompt = false;
  }

  showText(text, _delay = null, callback = null, callbackDelay = null, prompt = false) {
    if (this.message) {
      const normalized = String(text || '');
      this.message.setText(normalized);
    }
    if (prompt) {
      this.pendingPrompt = true;
      this.showPrompt();
    } else {
      this.hidePrompt();
    }
    if (typeof callback === 'function') {
      if (callbackDelay && this.scene?.time?.delayedCall) this.scene.time.delayedCall(callbackDelay, callback);
      else callback();
    }
  }

  showDialogue(text, _name, delay = null, callback = null, callbackDelay = null, prompt = true) {
    this.showText(text, delay, callback, callbackDelay, prompt);
  }
}
