import { PkbUiMode } from '../modes.js';
import { UiHandler } from './ui-handler.js';

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

export { MessageUiHandler };
