import { UiMode } from '../ui-mode.js';
import { MessageUiHandler } from './message-ui-handler.js';

export class BattleMessageUiHandler extends MessageUiHandler {
  constructor(ui) {
    super(ui, UiMode.MESSAGE);
    this.bg = null;
    this.commandWindow = null;
    this.movesWindowContainer = null;
    this.nameBoxContainer = null;
    this.nameBox = null;
    this.nameText = null;
    this.wordWrapWidth = 178;
  }

  setup() {
    const { scene, env } = this;
    this.container = scene.add.container(0, env.LOGICAL_HEIGHT).setDepth(50).setName('pkb-transplant-battle-message');

    this.bg = scene.add.image(0, 0, env.UI_ASSETS.bgAtlas.key, '1').setOrigin(0, 1).setName('sprite-battle-msg-bg');
    this.commandWindow = scene.add.nineslice(202, 0, env.UI_ASSETS.window.key, undefined, 118, 48, 8, 8, 8, 8)
      .setOrigin(0, 1)
      .setVisible(false)
      .setName('window-command');

    this.movesWindowContainer = scene.add.container(0, 0).setVisible(false).setName('moves-bg');
    const movesWindow = scene.add.nineslice(0, 0, env.UI_ASSETS.window.key, undefined, 243, 48, 8, 8, 8, 8)
      .setOrigin(0, 1)
      .setName('moves-window');
    const moveDetailsWindow = scene.add.nineslice(240, 0, env.UI_ASSETS.window.key, undefined, 80, 48, 8, 8, 8, 8)
      .setOrigin(0, 1)
      .setName('move-details-window');
    this.movesWindowContainer.add([movesWindow, moveDetailsWindow]);

    const messageContainer = scene.add.container(12, -39).setName('message-container');
    this.message = env.createBaseText(scene, 0, 0, '', 8, '#f8fbff', {
      lineSpacing: 1,
      wordWrap: { width: this.wordWrapWidth, useAdvancedWrap: true },
    }).setOrigin(0, 0).setName('text-battle-message');

    this.nameBoxContainer = scene.add.container(0, -16).setVisible(false).setName('namebox-container');
    this.nameBox = scene.add.nineslice(0, 0, env.UI_ASSETS.window.key, undefined, 72, 16, 8, 8, 8, 8).setOrigin(0, 0);
    this.nameText = env.createBaseText(scene, 8, 1, '', 8, '#f8fbff').setOrigin(0, 0);
    this.nameBoxContainer.add([this.nameBox, this.nameText]);
    messageContainer.add([this.message, this.nameBoxContainer]);
    this.initPromptSprite(messageContainer);

    this.container.add([this.bg, this.commandWindow, this.movesWindowContainer, messageContainer]);
  }

  show(args = {}) {
    super.show(args);
    this.bg.setVisible(true);
    this.commandWindow.setVisible(false);
    this.movesWindowContainer.setVisible(false);
    this.message.setWordWrapWidth(this.wordWrapWidth, true);
    return true;
  }

  render(args = {}) {
    const text = String(args.text || args.primaryText || '').trim();
    const secondary = String(args.secondaryText || '').trim();
    const lines = [text, secondary].filter(Boolean);
    this.message.setText(lines.join('\n'));
    const speaker = String(args.speaker || '').trim();
    this.nameBoxContainer.setVisible(Boolean(speaker));
    if (speaker) {
      this.nameText.setText(speaker);
      const width = Math.max(72, this.nameText.width + 16);
      this.nameBox.setSize?.(width, 16);
      this.nameBox.width = width;
    }
    if (args.showPrompt) this.showPrompt();
    else this.hidePrompt();
    this.positionPrompt();
  }

  positionPrompt() {
    if (!this.prompt?.setPosition || !this.message) return;
    const wrapped = typeof this.message.runWordWrap === 'function'
      ? this.message.runWordWrap(this.message.text || '').split(/\n/g)
      : String(this.message.text || '').split(/\n/g);
    const lineCount = wrapped.filter(Boolean).length || 1;
    const lastLine = wrapped.at(-1) || '';
    const approxWidth = Math.min(this.wordWrapWidth, Math.max(0, lastLine.length * 4.4));
    this.prompt.setPosition(2 + approxWidth, (lineCount - 1) * 12 + 2);
  }
}
