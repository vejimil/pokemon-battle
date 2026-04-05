import { PkbBattleUiAdapter } from '../adapter/pkb-battle-ui-adapter.js';
import { UiMode } from './ui-mode.js';
import { BattleMessageUiHandler } from './handlers/battle-message-ui-handler.js';
import { CommandUiHandler } from './handlers/command-ui-handler.js';
import { FightUiHandler } from './handlers/fight-ui-handler.js';
import { PartyUiHandler } from './handlers/party-ui-handler.js';
import { TargetSelectUiHandler } from './handlers/target-select-ui-handler.js';
import { AbilityBar, BattleTray, EnemyBattleInfo, PlayerBattleInfo } from './battle-info/battle-info.js';

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

  setMode(mode, args = {}) {
    this.mode = mode;
    Object.values(this.handlers).forEach(handler => handler?.clear?.());
    this.getMessageHandler()?.show(this.adapter.getMessageState());
    const handler = this.getHandler(mode);
    if (mode !== UiMode.MESSAGE) handler?.show?.(args);
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
    this.getMessageHandler().render(this.adapter.getMessageState());
    const mode = this.adapter.getMode();
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
    this.getMessageHandler().bg.setVisible(true);
    this.setMode(mode, this.adapter.getStateWindow());
  }
}
