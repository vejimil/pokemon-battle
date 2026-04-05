import { PkbUiMode } from './modes.js';
import { EnemyBattleInfo, PlayerBattleInfo, BattleTray, AbilityBar } from './battle-info.js';
import { BattleMessageUiHandler, CommandUiHandler, FightUiHandler, PartyUiHandler } from './handlers.js';
import { PKB_POKEROGUE_UI_DEPENDENCY_MAP } from './dependency-map.js';

class PokerogueUiRoot {
  constructor(scene, controller, env) {
    this.scene = scene;
    this.controller = controller;
    this.env = env;
    this.uiLanguage = 'ko';
    this.currentModel = null;
    this.currentMode = PkbUiMode.MESSAGE;
    this.perspectiveTabs = null;
    this.dependencyMap = PKB_POKEROGUE_UI_DEPENDENCY_MAP;
    this.enemyInfo = new EnemyBattleInfo(this);
    this.playerInfo = new PlayerBattleInfo(this);
    this.enemyTray = new BattleTray(this, 'enemy');
    this.playerTray = new BattleTray(this, 'player');
    this.abilityBar = new AbilityBar(this);
    this.messageHandler = new BattleMessageUiHandler(this);
    this.commandHandler = new CommandUiHandler(this);
    this.fightHandler = new FightUiHandler(this);
    this.partyHandler = new PartyUiHandler(this);
    this.handlers = [this.messageHandler, this.commandHandler, this.fightHandler, this.partyHandler];
    this.handlersByMode = new Map([
      [PkbUiMode.MESSAGE, this.messageHandler],
      [PkbUiMode.COMMAND, this.commandHandler],
      [PkbUiMode.FIGHT, this.fightHandler],
      [PkbUiMode.PARTY, this.partyHandler],
    ]);
    this.enemySprite = null;
    this.playerSprite = null;
  }

  setup() {
    this.perspectiveTabs = this.createPerspectiveTabs();
    this.enemyInfo.setup();
    this.playerInfo.setup();
    this.enemyTray.setup();
    this.playerTray.setup();
    this.abilityBar.setup();
    this.handlers.forEach(handler => handler.setup());
  }

  attachSpriteMounts(spriteMounts = {}) {
    this.enemySprite = spriteMounts.enemy || null;
    this.playerSprite = spriteMounts.player || null;
  }

  createPerspectiveTabs() {
    const { scene, env } = this;
    const { createBaseText, setInteractiveTarget, UI_ASSETS } = env;
    const container = scene.add.container(8, 6).setDepth(60).setName('pkb-ui-root-perspective-tabs');
    const tabs = [0, 1].map(index => {
      const bg = scene.add.nineslice(0, 0, UI_ASSETS.windowThin.key, undefined, 72, 20, 8, 8, 8, 8).setOrigin(0, 0);
      const label = createBaseText(scene, 36, 10, `P${index + 1}`, 7, '#dbeafe', { align: 'center' }).setOrigin(0.5, 0.5);
      const hit = scene.add.rectangle(0, 0, 72, 20, 0xffffff, 0.001).setOrigin(0, 0);
      const button = scene.add.container(index * 76, 0, [bg, label, hit]);
      setInteractiveTarget(hit, () => this.controller.handleAction({ type: 'perspective', player: index }));
      container.add(button);
      return { button, bg, label, hit };
    });
    return { container, tabs };
  }

  layout() {
    this.enemyTray.container.setPosition(0, 96);
    this.playerTray.container.setPosition(320, 168);
    this.enemyInfo.container.setPosition(140, 99);
    this.playerInfo.container.setPosition(310, 168);
    this.messageHandler.container.setPosition(0, 240);
    this.commandHandler.container.setPosition(0, 240);
    this.fightHandler.container.setPosition(0, 240);
    this.partyHandler.container.setPosition(0, 240);
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
    if (this.currentModel) this.renderModel(this.currentModel);
  }

  updatePerspectiveTabs(model) {
    const tabs = model?.perspectiveOptions || [];
    this.perspectiveTabs.tabs.forEach((tab, index) => {
      const option = tabs[index] || { label: `P${index + 1}`, active: false };
      tab.label.setText(option.label || `P${index + 1}`);
      tab.label.setColor(option.active ? '#f8fbff' : '#dbeafe');
      tab.bg.setAlpha(option.active ? 1 : 0.82);
      if (tab.bg.setTint) {
        if (option.active) tab.bg.clearTint();
        else tab.bg.setTint(0xb7c0d6);
      }
    });
  }

  renderModel(model) {
    this.currentModel = model;
    if (!model) return;
    this.uiLanguage = model.language || 'ko';
    this.updatePerspectiveTabs(model);
    this.enemyInfo.update(model.enemyInfo || {});
    this.playerInfo.update(model.playerInfo || {});
    this.enemyTray.update(model.enemyTray || []);
    this.playerTray.update(model.playerTray || []);
    this.abilityBar.update(model.abilityBar || null);
    this.messageHandler.show(model.message || {});
    this.showStateWindow(model.stateWindow || {});
    if (this.enemySprite) {
      const enemyDeferred = Boolean(model.enemySprite?.deferred || !model.enemySprite?.url);
      this.enemySprite.dom.setVisible(!enemyDeferred);
      this.env.renderAnimatedSpriteToHost(this.enemySprite.host, model.enemySprite || {}, 'large');
    }
    if (this.playerSprite) {
      const playerDeferred = Boolean(model.playerSprite?.deferred || !model.playerSprite?.url);
      this.playerSprite.dom.setVisible(!playerDeferred);
      this.env.renderAnimatedSpriteToHost(this.playerSprite.host, model.playerSprite || {}, 'large');
    }
  }

  showStateWindow(stateWindow = {}) {
    const mode = stateWindow.mode || PkbUiMode.MESSAGE;
    this.currentMode = mode;
    this.handlers.forEach(handler => handler.hide());
    this.messageHandler.bg.setVisible(true);
    this.messageHandler.commandWindow.setVisible(false);
    this.messageHandler.movesWindowContainer.setVisible(false);
    if (mode === PkbUiMode.COMMAND) {
      this.messageHandler.commandWindow.setVisible(true);
      this.commandHandler.show(stateWindow);
      return;
    }
    if (mode === PkbUiMode.FIGHT) {
      this.messageHandler.movesWindowContainer.setVisible(true);
      this.fightHandler.show(stateWindow);
      return;
    }
    if (mode === PkbUiMode.PARTY) {
      this.messageHandler.bg.setVisible(false);
      this.partyHandler.show(stateWindow);
      return;
    }
  }
}

export { PokerogueUiRoot };
