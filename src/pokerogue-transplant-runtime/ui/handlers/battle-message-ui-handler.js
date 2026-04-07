import { UiMode } from '../ui-mode.js';
import { MessageUiHandler } from './message-ui-handler.js';
import { addTextObject } from '../helpers/text.js';
import { addWindow } from '../helpers/ui-theme.js';

// Permanent stat labels (PokeRogue order: HP, ATK, DEF, SPATK, SPDEF, SPD)
const STAT_LABELS = ['HP', 'Atk', 'Def', 'SpA', 'SpD', 'Spe'];

export class BattleMessageUiHandler extends MessageUiHandler {
  constructor(ui) {
    super(ui, UiMode.MESSAGE);
    this.bg = null;
    this.commandWindow = null;
    this.movesWindowContainer = null;
    this.nameBoxContainer = null;
    this.nameBox = null;
    this.nameText = null;
    // Message area is ~243px wide, container starts at x=12; right margin ~16px → ~215px
    this.wordWrapWidth = 215;

    // Level-up stats panel
    this.levelUpStatsContainer = null;
    this.levelUpStatsIncrText = null;
    this.levelUpStatsValuesText = null;
    this._levelUpResolve = null;
    this._levelUpAwaitingInput = false;
  }

  setup() {
    const { scene, env } = this;
    const W = env.LOGICAL_WIDTH;
    const H = env.LOGICAL_HEIGHT;
    this.container = scene.add.container(0, H).setDepth(50).setName('pkb-transplant-battle-message');

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

    // Level-up stats panel (positioned top-right of battle area, above message box)
    // Coordinates are relative to the container (bottom of screen = y=0 here)
    this.levelUpStatsContainer = scene.add.container(0, 0).setVisible(false).setName('levelup-stats');

    // Background window — anchored top-right
    const statsBg = addWindow(this.ui, W, -H, 80, 100, env.UI_ASSETS.window.key).setOrigin(1, 0);
    const labelX = W - 82;
    const labelY = -H + 6;

    const labelsText = addTextObject(this.ui, labelX, labelY, STAT_LABELS.join('\n'), 'WINDOW', {
      maxLines: 6, lineSpacing: 3,
    }).setOrigin(1, 0);

    this.levelUpStatsIncrText = addTextObject(this.ui, W - 50, labelY, '+\n+\n+\n+\n+\n+', 'WINDOW', {
      maxLines: 6, lineSpacing: 3,
    }).setOrigin(0, 0);

    this.levelUpStatsValuesText = addTextObject(this.ui, W - 7, labelY, '', 'WINDOW', {
      maxLines: 6, lineSpacing: 3,
    }).setOrigin(1, 0);

    this.levelUpStatsContainer.add([statsBg, labelsText, this.levelUpStatsIncrText, this.levelUpStatsValuesText]);

    this.container.add([
      this.bg,
      this.commandWindow,
      this.movesWindowContainer,
      messageContainer,
      this.levelUpStatsContainer,
    ]);
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

  showNameText(name) {
    this.nameBoxContainer.setVisible(true);
    this.nameText.setText(name);
    const width = Math.max(72, this.nameText.width + 16);
    this.nameBox.setSize?.(width, 16);
    this.nameBox.width = width;
  }

  hideNameText() {
    this.nameBoxContainer.setVisible(false);
  }

  /**
   * Show the level-up stats panel.
   * @param {number[]} prevStats - stat values before level-up (6 values: HP,ATK,DEF,SPATK,SPDEF,SPD)
   * @param {number[]} newStats  - stat values after level-up
   * @param {boolean} showTotals - if true, show absolute values; if false, show "+X" increases
   * @returns {Promise<void>} resolves when player dismisses
   */
  promptLevelUpStats(prevStats = [], newStats = [], showTotals = false) {
    return new Promise(resolve => {
      if (!this.levelUpStatsContainer) return resolve();

      const lines = newStats.map((val, i) => {
        const diff = val - (prevStats[i] ?? val);
        return showTotals ? String(val) : (diff >= 0 ? `+${diff}` : String(diff));
      });

      this.levelUpStatsValuesText.setText(lines.join('\n'));
      this.levelUpStatsIncrText.setVisible(!showTotals);
      this.levelUpStatsContainer.setVisible(true);

      this._levelUpAwaitingInput = true;
      this._levelUpResolve = () => {
        if (!showTotals) {
          // First press: switch to totals view
          this.promptLevelUpStats([], newStats, true).then(resolve);
        } else {
          this.levelUpStatsContainer.setVisible(false);
          this._levelUpAwaitingInput = false;
          this._levelUpResolve = null;
          resolve();
        }
      };
    });
  }

  /** Called by processInput — intercepts action/cancel for level-up panel */
  processInput(button) {
    if (this._levelUpAwaitingInput && this._levelUpResolve) {
      const resolve = this._levelUpResolve;
      this._levelUpResolve = null;
      this._levelUpAwaitingInput = false;
      resolve();
      return true;
    }
    return super.processInput(button);
  }
}
