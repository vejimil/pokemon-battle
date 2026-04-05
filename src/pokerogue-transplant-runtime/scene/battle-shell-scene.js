import { ARENA_OFFSETS } from '../runtime/constants.js';
import { preloadUiAssets } from '../runtime/assets.js';
import { ensureSpriteHostStyles, renderAnimatedSpriteToHost, setHostVisibility } from '../runtime/sprite-host.js';
import { clamp, textureExists, createBaseText, setHorizontalCrop, setInteractiveTarget, applyHostBox, addWindow } from '../runtime/phaser-utils.js';
import { TransplantBattleUI } from '../ui/ui.js';

export function createBattleShellSceneClass(Phaser, env) {
  return class TransplantBattleShellScene extends Phaser.Scene {
    constructor(controller) {
      super({ key: 'pkb-transplant-battle-shell-scene' });
      this.controller = controller;
      this.Phaser = Phaser;
      this.sceneKey = 'pkb-transplant-battle-shell-scene';
      this.isBootstrapped = false;
      this.currentModel = null;
      this.ui = null;
      this.handleResize = () => this.layoutSafely();
      this.handleShutdown = () => {
        try { this.scale?.off?.('resize', this.handleResize, this); } catch (_error) {}
      };
      this.runtimeEnv = {
        ...env,
        clamp,
        textureExists,
        createBaseText,
        setHorizontalCrop,
        setInteractiveTarget,
        renderAnimatedSpriteToHost,
        applyHostBox,
        addWindow,
      };
    }

    preload() { preloadUiAssets(this); }

    create() {
      try {
        this.cameras.main.setRoundPixels(true);
        if (this.game?.canvas) this.game.canvas.style.imageRendering = 'pixelated';
        this.createArenaLayers();
        this.enemySprite = this.createSpriteMount('enemy');
        this.playerSprite = this.createSpriteMount('player');
        this.ui = new TransplantBattleUI(this, this.controller, this.runtimeEnv);
        this.ui.attachSpriteMounts({ enemy: this.enemySprite, player: this.playerSprite });
        this.ui.setup();
        if (textureExists(this, env.UI_ASSETS.promptAtlas.key, '1') && !this.anims.exists('pkb-ui-prompt-arrow')) {
          this.anims.create({
            key: 'pkb-ui-prompt-arrow',
            frames: ['1', '2', '3', '4'].filter(frame => textureExists(this, env.UI_ASSETS.promptAtlas.key, frame)).map(frame => ({ key: env.UI_ASSETS.promptAtlas.key, frame })),
            frameRate: 6,
            repeat: -1,
          });
        }
        this.scale?.on?.('resize', this.handleResize, this);
        this.events?.once?.('shutdown', this.handleShutdown, this);
        this.isBootstrapped = true;
        this.layoutSafely();
        this.controller?.notifySceneReady?.(this);
      } catch (error) {
        this.controller?.notifySceneError?.(error);
        throw error;
      }
    }

    createArenaLayers() {
      this.arenaBg = this.add.image(0, 0, env.UI_ASSETS.arenaBg.key).setOrigin(0, 0).setDepth(0);
      this.arenaEnemyBase = this.add.image(ARENA_OFFSETS.enemy.x, ARENA_OFFSETS.enemy.y, env.UI_ASSETS.arenaEnemy.key).setOrigin(0, 0).setDepth(4);
      this.arenaPlayerBase = this.add.image(ARENA_OFFSETS.player.x, ARENA_OFFSETS.player.y, env.UI_ASSETS.arenaPlayer.key).setOrigin(0, 0).setDepth(5);
    }

    createSpriteMount(name) {
      const anchor = this.add.container(0, 0).setDepth(18).setVisible(false);
      const host = document.createElement('div');
      host.className = `pkb-phaser-sprite pkb-phaser-sprite-${name}`;
      ensureSpriteHostStyles(host);
      setHostVisibility(host, false);
      const dom = this.add.dom(0, 0, host);
      dom.setOrigin(0.5, 1);
      dom.setDepth(19);
      dom.setVisible(false);
      return { anchor, host, dom, name };
    }

    layoutSafely() {
      try { this.layout(); } catch (error) { this.controller?.notifySceneError?.(error); throw error; }
    }

    layout() {
      if (!this.isBootstrapped) return;
      this.arenaBg.setPosition(0, 0);
      this.arenaEnemyBase.setPosition(ARENA_OFFSETS.enemy.x, ARENA_OFFSETS.enemy.y);
      this.arenaPlayerBase.setPosition(ARENA_OFFSETS.player.x, ARENA_OFFSETS.player.y);
      this.ui?.layout?.();
    }

    renderModel(model) {
      this.currentModel = model;
      this.ui?.renderModel?.(model || {});
    }
  };
}
