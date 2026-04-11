import { ARENA_OFFSETS } from '../runtime/constants.js';
import { preloadUiAssets } from '../runtime/assets.js';
import { clamp, textureExists, createBaseText, setHorizontalCrop, setInteractiveTarget, applyHostBox, addWindow, setTextWordWrap } from '../runtime/phaser-utils.js';
import { buttonFromKeyboardEvent, isTypingIntoElement } from '../ui/facade/input-facade.js';
import { TransplantBattleUI } from '../ui/ui.js';
import { loadPokemonMetrics, getMetricsForSprite, DBK_DEFAULTS, calcDbkAnimationDelayMs } from '../runtime/pokemon-metrics.js';

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
      this.handleWindowKeyDown = event => this.handleGlobalKeyDown(event);
      this.handleWindowKeyUp = event => this.handleGlobalKeyUp(event);
      this.handleShutdown = () => {
        try { this.scale?.off?.('resize', this.handleResize, this); } catch (_error) {}
        try { window.removeEventListener('keydown', this.handleWindowKeyDown, true); } catch (_error) {}
        try { window.removeEventListener('keyup', this.handleWindowKeyUp, true); } catch (_error) {}
      };
      this.runtimeEnv = {
        ...env,
        clamp,
        textureExists,
        createBaseText,
        setHorizontalCrop,
        setTextWordWrap,
        setInteractiveTarget,
        applyHostBox,
        addWindow,
        // Renders a battler sprite directly onto the Phaser canvas (no DOM element).
        // Called from ui.js renderModel().
        renderBattlerToPhaser: (mount, spriteModel) => this.renderBattlerSprite(mount, spriteModel),
      };
    }

    preload() { preloadUiAssets(this); }

    create() {
      try {
        this.cameras.main.setRoundPixels(true);
        if (this.game?.canvas) this.game.canvas.style.imageRendering = 'pixelated';
        // One-time 1×1 transparent canvas texture used as a placeholder before the real
        // battler sprite textures are loaded asynchronously.
        if (!this.textures.exists('pkb-battler-placeholder')) {
          const ph = document.createElement('canvas');
          ph.width = 1; ph.height = 1;
          this.textures.addCanvas('pkb-battler-placeholder', ph);
        }
        // Load PBS metrics in background — sprites render without them if not ready yet.
        this.pokemonMetrics = null;
        loadPokemonMetrics().then(m => { this.pokemonMetrics = m; }).catch(() => {});
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
        window.addEventListener('keydown', this.handleWindowKeyDown, true);
        window.addEventListener('keyup', this.handleWindowKeyUp, true);
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
      // Use a Phaser Image drawn directly on the canvas so it scales correctly with
      // INTEGER_SCALE mode. No DOM elements — eliminates all coordinate-system mismatches.
      const depth = name === 'enemy' ? 6 : 7; // above arena bases (4,5), below UI (42+)

      // Ellipse shadow drawn just below the sprite (depth - 1 so it stays behind sprite).
      const shadow = this.add.ellipse(0, 0, 1, 1, 0x000000, 0.35)
        .setDepth(depth - 1)
        .setVisible(false);

      const img = this.add.image(0, 0, 'pkb-battler-placeholder')
        .setOrigin(0.5, 1)
        .setDepth(depth)
        .setVisible(false);

      const mount = {
        name,
        phaserSprite: img,
        shadow,
        shadowVisibleByMetrics: false,
        currentUrl: '',
        animTimer: null,
        // Shim: party-ui-handler calls mount.dom.setVisible() to hide/show sprites.
        // Shadow follows the same visibility; only shown when a sprite is actually loaded.
        dom: {
          setVisible: visible => {
            img.setVisible(visible);
            shadow.setVisible(visible && !!mount.currentUrl && !!mount.shadowVisibleByMetrics);
          },
        },
      };
      return mount;
    }

    // Loads a battler sprite from spriteModel.url and renders it on the Phaser canvas.
    // Async: returns immediately; sprite appears once the image loads.
    async renderBattlerSprite(mount, spriteModel) {
      const url = spriteModel?.url || '';
      if (!url) {
        this._clearBattlerAnim(mount);
        mount.currentUrl = '';
        mount.shadowVisibleByMetrics = false;
        mount.phaserSprite.setVisible(false);
        mount.shadow.setVisible(false);
        return;
      }
      // Skip reload if same URL is already showing.
      if (url === mount.currentUrl) return;
      mount.currentUrl = url;
      this._clearBattlerAnim(mount);

      const key = `pkb-battler-${mount.name}`;
      try {
        // Switch to placeholder BEFORE removing the old texture.
        // If Phaser renders between remove() and addImage(), it would try to access
        // a null glTexture and throw. The placeholder is always a valid 1×1 texture.
        mount.phaserSprite.setTexture('pkb-battler-placeholder').setVisible(false);
        mount.shadowVisibleByMetrics = false;
        mount.shadow.setVisible(false);
        if (this.textures.exists(key)) this.textures.remove(key);

        const img = await new Promise((resolve, reject) => {
          const i = new Image();
          i.onload = () => resolve(i);
          i.onerror = () => reject(new Error(`Sprite load failed: ${url}`));
          i.src = url;
        });

        // If URL changed while awaiting (e.g. Pokemon switched), abort.
        if (mount.currentUrl !== url) return;

        // Detect animation frames: assume square frames (height = frame width).
        const frameH = img.height;
        const frameCount = Math.max(1, Math.floor(img.width / frameH));

        // Register as a spritesheet texture so setFrame() works for animation.
        this.textures.addImage(key, img);
        const tex = this.textures.get(key);
        for (let i = 0; i < frameCount; i++) {
          tex.add(i, 0, i * frameH, 0, frameH, frameH);
        }

        // --- Apply PBS metrics (position, scale, shadow, animation speed) ---
        // spriteId is the filename without extension, e.g. "CHARIZARD_1".
        const spriteId = url.split('/').pop().replace(/\.png$/i, '');
        const metrics  = getMetricsForSprite(spriteId, this.pokemonMetrics);
        const isFront  = mount.name === 'enemy';

        // Base positions stored by ui.js layout(). Fall back to current position.
        const baseX = mount.baseX ?? mount.phaserSprite.x;
        const baseY = mount.baseY ?? mount.phaserSprite.y;

        // Sprite offset: positive pbsY lifts sprite UP (reduces Phaser y).
        const offsetX = isFront ? (metrics?.frontX ?? 0) : (metrics?.backX ?? 0);
        const offsetY = isFront ? (metrics?.frontY ?? 0) : (metrics?.backY ?? 0);
        const sprScale = isFront
          ? (metrics?.frontScale ?? DBK_DEFAULTS.frontScale)
          : (metrics?.backScale ?? DBK_DEFAULTS.backScale);

        mount.phaserSprite
          .setTexture(key, 0)
          .setScale(sprScale)
          .setPosition(baseX + offsetX, baseY - offsetY);
        mount.phaserSprite.setVisible(true);

        // Shadow: positioned from the base ground line (not from the adjusted sprite pos).
        const shadowX      = baseX + (metrics?.shadowX ?? 0);
        const shadowOffY   = isFront ? (metrics?.shadowFrontY ?? 0) : (metrics?.shadowBackY ?? 0);
        const shadowY      = baseY + shadowOffY;
        const isPlayerSide = !isFront;
        const rawShadowSize = Number.isFinite(metrics?.shadowSize) ? metrics.shadowSize : 1;
        const showBySide = !isPlayerSide || DBK_DEFAULTS.showPlayerSideShadows;
        const showShadow = showBySide && rawShadowSize !== 0;

        if (showShadow) {
          const effectiveShadowSize = rawShadowSize > 0 ? rawShadowSize - 1 : rawShadowSize;
          const shadowScale = Math.max(0.05, 1 + effectiveShadowSize * 0.1);
          const baseShadowW = frameH * sprScale * 0.45;
          const baseShadowH = frameH * sprScale * 0.1125;
          mount.shadow.setPosition(shadowX, shadowY);
          mount.shadow.setSize(baseShadowW * shadowScale, baseShadowH * shadowScale);
          mount.shadowVisibleByMetrics = true;
          mount.shadow.setVisible(true);
        } else {
          mount.shadowVisibleByMetrics = false;
          mount.shadow.setVisible(false);
        }

        // Animation speed (DBK): delay = ((speed / 2.0) * frameDelayMs). Speed 0 = no animation.
        const animSpeed = isFront ? (metrics?.animFront ?? 2) : (metrics?.animBack ?? 2);
        const delay = calcDbkAnimationDelayMs(animSpeed);

        if (frameCount > 1 && delay > 0) {
          let frame = 0;
          mount.animTimer = this.time.addEvent({
            delay,
            loop: true,
            callback: () => {
              frame = (frame + 1) % frameCount;
              if (mount.phaserSprite.active) mount.phaserSprite.setFrame(frame);
            },
          });
        }
      } catch (_err) {
        if (mount.currentUrl === url) {
          mount.phaserSprite.setVisible(false);
          mount.shadowVisibleByMetrics = false;
          mount.shadow.setVisible(false);
        }
      }
    }

    _clearBattlerAnim(mount) {
      if (mount.animTimer) {
        mount.animTimer.remove();
        mount.animTimer = null;
      }
    }

    handleGlobalKeyDown(event) {
      if (!this.isBootstrapped || !this.ui || this.controller?.mount?.hidden) return;
      if (isTypingIntoElement(document.activeElement)) return;
      const button = buttonFromKeyboardEvent(event);
      if (!button) return;
      const handled = button === 'info'
        ? this.ui.processInfoButton(true)
        : this.ui.processInput(button);
      if (handled) event.preventDefault();
    }


    handleGlobalKeyUp(event) {
      if (!this.isBootstrapped || !this.ui || this.controller?.mount?.hidden) return;
      const button = buttonFromKeyboardEvent(event);
      if (button !== 'info') return;
      const handled = this.ui.processInfoButton(false);
      if (handled) event.preventDefault();
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
