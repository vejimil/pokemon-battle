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
    return [...this.modeChain];
  }

  getArgsForMode(mode = this.mode) {
    return this.adapter.getUiArgsForMode(mode);
  }

  processInfoButton(_pressed) {
    if (this.overlayActive) return false;
    return [UiMode.COMMAND, UiMode.FIGHT, UiMode.MESSAGE, UiMode.TARGET_SELECT].includes(this.mode);
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
    if (this.mode === mode && !force) {
      this.refreshCurrentHandler(mode, args);
      return false;
    }
    const previousMode = this.mode;
    if (clear) {
      this.getHandler(previousMode)?.clear?.();
    }
    if (chainMode && previousMode != null && !clear) {
      this.modeChain.push(previousMode);
    }
    this.mode = mode;
    this.refreshCurrentHandler(mode, args);
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
    this.mode = this.modeChain.pop();
    this.refreshCurrentHandler(this.mode);
    return true;
  }

  refreshCurrentHandler(mode = this.mode, args = null) {
    const messageHandler = this.getMessageHandler();
    const nextArgs = args ?? this.getArgsForMode(mode);
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
    this.enemyTray.container?.setPosition(0, 96);
    this.playerTray.container?.setPosition(320, 168);
    this.enemyInfo.container?.setPosition(140, 99);
    this.playerInfo.container?.setPosition(310, 168);
    if (this.enemySprite) {
      this.enemySprite.anchor.setPosition(216, 132);
      this.enemySprite.dom.setPosition(216, 132);
      this.env.applyHostBox(this.enemySprite.host, 72, 72);
    }
    if (this.playerSprite) {
      this.playerSprite.anchor.setPosition(104, 184);
      this.playerSprite.dom.setPosition(104, 184);
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
      this.enemySprite.dom.setVisible(!deferred);
      this.env.renderAnimatedSpriteToHost(this.enemySprite.host, spriteModel, 'large');
    }
    if (this.playerSprite) {
      const spriteModel = this.adapter.getSpriteModel('player');
      const deferred = Boolean(spriteModel?.deferred || !spriteModel?.url);
      this.playerSprite.dom.setVisible(!deferred);
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
