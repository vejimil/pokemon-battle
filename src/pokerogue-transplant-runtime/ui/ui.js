import { PkbBattleUiAdapter } from '../adapter/pkb-battle-ui-adapter.js';
import { UiMode } from './ui-mode.js';
import { BattleMessageUiHandler } from './handlers/battle-message-ui-handler.js';
import { CommandUiHandler } from './handlers/command-ui-handler.js';
import { FightUiHandler } from './handlers/fight-ui-handler.js';
import { PartyUiHandler } from './handlers/party-ui-handler.js';
import { TargetSelectUiHandler } from './handlers/target-select-ui-handler.js';
import { AbilityBar, BattleTray } from './battle-info/battle-info.js';
import { EnemyBattleInfo } from './battle-info/enemy-battle-info.js';
import { PlayerBattleInfo } from './battle-info/player-battle-info.js';

export class TransplantBattleUI {
  constructor(scene, controller, env) {
    this.scene = scene;
    this.controller = controller;
    this.env = env;
    this.uiLanguage = 'ko';
    this.mode = UiMode.MESSAGE;
    this.modeChain = [];
    this.modeArgs = new Map([[UiMode.MESSAGE, null]]);
    this.handlers = [];
    this.adapter = new PkbBattleUiAdapter();
    this.rootContainer = scene.add.container(0, 0).setDepth(40).setName('pkb-transplant-ui-root');
    this.enemyInfo = new EnemyBattleInfo(this);
    this.playerInfo = new PlayerBattleInfo(this);
    this.enemyTray = new BattleTray(this, 'enemy');
    this.playerTray = new BattleTray(this, 'player');
    this.abilityBar = new AbilityBar(this);
    this.enemySprite = null;
    this.playerSprite = null;
    this.overlayActive = false;
    this.partyModeActive = false;
  }

  setup() {
    this.handlers[UiMode.MESSAGE] = new BattleMessageUiHandler(this);
    this.handlers[UiMode.COMMAND] = new CommandUiHandler(this);
    this.handlers[UiMode.FIGHT] = new FightUiHandler(this);
    this.handlers[UiMode.PARTY] = new PartyUiHandler(this);
    this.handlers[UiMode.TARGET_SELECT] = new TargetSelectUiHandler(this);
    this.enemyInfo.setup();
    this.playerInfo.setup();
    this.enemyTray.setup();
    this.playerTray.setup();
    this.abilityBar.setup();
    Object.values(this.handlers).forEach(handler => handler?.setup?.());
    Object.values(this.handlers).forEach(handler => handler?.container && this.rootContainer.add(handler.container));
    [this.enemyTray.container, this.playerTray.container, this.enemyInfo.container, this.playerInfo.container, this.abilityBar.container].forEach(node => {
      if (node) this.rootContainer.add(node);
    });
    // Phaser Container renders children in addition order by default (sortChildrenFlag=false).
    // Enable depth sort so setDepth() values are respected.
    this.rootContainer.sortChildrenFlag = true;
    // Battle info containers need explicit depth below handlers so they don't cover UI panels.
    this.enemyTray.container?.setDepth(42);
    this.playerTray.container?.setDepth(42);
    this.enemyInfo.container?.setDepth(42);
    this.playerInfo.container?.setDepth(42);
    this.abilityBar.container?.setDepth(42);
    // COMMAND and TARGET_SELECT have no setDepth call — default 0 would go under battle info.
    this.handlers[UiMode.COMMAND]?.container?.setDepth(50);
    this.handlers[UiMode.TARGET_SELECT]?.container?.setDepth(50);
    this.layout();
    this.getMessageHandler()?.show(this.adapter.getMessageState());
  }

  attachSpriteMounts(spriteMounts = {}) {
    this.enemySprite = spriteMounts.enemy || null;
    this.playerSprite = spriteMounts.player || null;
  }

  getHandler(mode = this.mode) {
    return this.handlers[mode] || this.handlers[UiMode.MESSAGE];
  }

  getMessageHandler() {
    return this.handlers[UiMode.MESSAGE];
  }

  getMode() {
    return this.mode;
  }

  getModeChain() {
    return this.modeChain.map(entry => (typeof entry === 'object' && entry ? entry.mode : entry)).filter(mode => mode != null);
  }

  getModeChainEntries() {
    return this.modeChain.map(entry => {
      if (typeof entry === 'object' && entry) return { ...entry };
      return { mode: entry, args: null };
    });
  }

  getCurrentModeArgs() {
    return this.getArgsForMode(this.mode);
  }

  storeModeArgs(mode, args) {
    if (mode == null || typeof args === 'undefined') return;
    this.modeArgs.set(mode, args);
  }

  getArgsForMode(mode = this.mode) {
    if (this.modeArgs.has(mode)) {
      return this.modeArgs.get(mode);
    }
    const adapterArgs = this.adapter.getUiArgsForMode(mode);
    this.storeModeArgs(mode, adapterArgs);
    return adapterArgs;
  }

  processInfoButton(pressed) {
    if (this.overlayActive) return false;
    const canProcess = this.adapter.canProcessInfoButton(this.mode);
    if (!canProcess) return false;
    const handler = this.getHandler();
    handler?.toggleInfo?.(Boolean(pressed));
    return true;
  }

  processInput(button) {
    if (this.overlayActive) return false;
    const handler = this.getHandler();
    return handler?.processInput?.(button) ?? false;
  }

  playSelect() {
    return false;
  }

  playError() {
    return false;
  }

  setModeInternal(mode, clear = true, force = false, chainMode = false, args = null) {
    const nextArgs = args ?? this.adapter.getUiArgsForMode(mode);
    if (this.mode === mode && !force) {
      this.storeModeArgs(mode, nextArgs);
      this.refreshCurrentHandler(mode, nextArgs);
      return false;
    }
    const previousMode = this.mode;
    const previousArgs = this.getArgsForMode(previousMode);
    if (clear) {
      this.getHandler(previousMode)?.clear?.();
    }
    if (chainMode && previousMode != null && !clear) {
      this.modeChain.push({
        mode: previousMode,
        args: previousArgs,
      });
    }
    this.mode = mode;
    this.storeModeArgs(mode, nextArgs);
    this.refreshCurrentHandler(mode, nextArgs);
    return true;
  }

  setMode(mode, args = null) {
    return this.setModeInternal(mode, true, false, false, args);
  }

  setModeWithoutClear(mode, args = null) {
    return this.setModeInternal(mode, false, false, false, args);
  }

  setOverlayMode(mode, args = null) {
    return this.setModeInternal(mode, false, false, true, args);
  }

  resetModeChain() {
    this.modeChain = [];
  }

  revertMode() {
    if (!this.modeChain.length) return false;
    this.getHandler(this.mode)?.clear?.();
    const previous = this.modeChain.pop();
    const restoredMode = typeof previous === 'object' && previous ? previous.mode : previous;
    const restoredArgs = typeof previous === 'object' && previous ? previous.args : null;
    this.mode = restoredMode;
    this.storeModeArgs(restoredMode, restoredArgs);
    this.refreshCurrentHandler(this.mode, restoredArgs);
    return true;
  }

  refreshCurrentHandler(mode = this.mode, args = null) {
    const messageHandler = this.getMessageHandler();
    const nextArgs = args ?? this.getArgsForMode(mode);
    this.storeModeArgs(mode, nextArgs);
    if (messageHandler) {
      messageHandler.show(this.adapter.getMessageState());
      if (mode === UiMode.MESSAGE) {
        messageHandler.render(this.adapter.getMessageState());
      }
    }
    const handler = this.getHandler(mode);
    if (mode !== UiMode.MESSAGE) {
      handler?.show?.(nextArgs);
    }
    return handler;
  }

  layout() {
    // Positions derived from PokeRogue fieldUI coords (fieldUI at y=1080, scale 6):
    // absolute canvas pos / 6 = our logical pos; y = (1080 + localY*6) / 6 = 180 + localY
    this.enemyTray.container?.setPosition(0, 36);      // PokeRogue: (0, -144) in fieldUI
    this.playerTray.container?.setPosition(320, 108);  // PokeRogue: (scaledCanvas.width, -72) in fieldUI
    this.enemyInfo.container?.setPosition(140, 39);    // PokeRogue: EnemyBattleInfo(140, -141)
    this.playerInfo.container?.setPosition(310, 108);  // PokeRogue: PlayerBattleInfo(scaledCanvas.width-10, -72)
    if (this.enemySprite) {
      this.enemySprite.anchor.setPosition(236, 84);    // PokeRogue: EnemyPokemon super(236, 84)
      this.enemySprite.dom.setPosition(236, 84);
      this.env.applyHostBox(this.enemySprite.host, 72, 72);
    }
    if (this.playerSprite) {
      this.playerSprite.anchor.setPosition(106, 148);  // PokeRogue: PlayerPokemon super(106, 148)
      this.playerSprite.dom.setPosition(106, 148);
      this.env.applyHostBox(this.playerSprite.host, 88, 88);
    }
  }

  renderModel(model = {}) {
    this.adapter.setModel(model);
    this.uiLanguage = model.language || 'ko';
    this.enemyInfo.update(this.adapter.getEnemyInfo());
    this.playerInfo.update(this.adapter.getPlayerInfo());
    this.enemyTray.update(this.adapter.getEnemyTray());
    this.playerTray.update(this.adapter.getPlayerTray());
    this.abilityBar.update(this.adapter.getAbilityBar());

    const messageState = this.adapter.getMessageState();
    this.getMessageHandler().render(messageState);

    if (this.enemySprite) {
      const spriteModel = this.adapter.getSpriteModel('enemy');
      const deferred = Boolean(spriteModel?.deferred || !spriteModel?.url);
      // partyModeActive 중에는 DOM 스프라이트를 다시 켜지 않음 (party-ui-handler가 숨김 제어)
      this.enemySprite.dom.setVisible(!deferred && !this.partyModeActive);
      this.env.renderAnimatedSpriteToHost(this.enemySprite.host, spriteModel, 'large');
    }
    if (this.playerSprite) {
      const spriteModel = this.adapter.getSpriteModel('player');
      const deferred = Boolean(spriteModel?.deferred || !spriteModel?.url);
      this.playerSprite.dom.setVisible(!deferred && !this.partyModeActive);
      this.env.renderAnimatedSpriteToHost(this.playerSprite.host, spriteModel, 'large');
    }

    const nextMode = this.adapter.getMode();
    const nextArgs = this.getArgsForMode(nextMode);
    if (nextMode !== this.mode) {
      this.setModeInternal(nextMode, true, true, false, nextArgs);
    } else {
      this.refreshCurrentHandler(nextMode, nextArgs);
    }
  }
}
