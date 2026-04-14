import { ARENA_OFFSETS } from '../runtime/constants.js';
import { preloadUiAssets } from '../runtime/assets.js';
import { BattleAudioManager } from '../runtime/audio-manager.js';
import { clamp, textureExists, createBaseText, setHorizontalCrop, setInteractiveTarget, applyHostBox, addWindow, setTextWordWrap } from '../runtime/phaser-utils.js';
import { buttonFromKeyboardEvent, isTypingIntoElement } from '../ui/facade/input-facade.js';
import { TransplantBattleUI } from '../ui/ui.js';
import { loadPokemonMetrics, getMetricsForSprite, DBK_DEFAULTS, calcDbkAnimationDelayMs } from '../runtime/pokemon-metrics.js';
import { BattleAnimPlayer } from '../../battle-presentation/battle-anim-player.js';

// Global shadow nudge for visual alignment tuning.
// Negative x = left, negative y = up.
const SHADOW_GLOBAL_OFFSET = Object.freeze({ x: 0, y: 0 });
const ENABLE_BATTLER_SHADOWS = false;

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
        // Cancel any in-flight move animation so its Promise resolves and the
        // timeline executor doesn't hang if the scene shuts down mid-animation.
        try { this.animPlayer?._activeCancel?.(); } catch (_error) {}
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

    preload() {
      this.audio = new BattleAudioManager(this);
      this.audio.preloadBasic();
      preloadUiAssets(this);
    }

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
        // Load PBS metrics in background. If sprites rendered before metrics are ready,
        // refresh once after load so offsets/scales are applied.
        this.pokemonMetrics = null;
        loadPokemonMetrics().then(m => {
          this.pokemonMetrics = m;
          this._refreshBattlerSpritesForMetrics();
        }).catch(() => {});
        this.createArenaLayers();
        this.enemySprite = this.createSpriteMount('enemy');
        this.playerSprite = this.createSpriteMount('player');
        this.runtimeEnv.audio = this.audio; // expose audio manager to UI handlers
        this.animPlayer = new BattleAnimPlayer(this);  // move visual animation player
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
        frameTextureKeys: [],
        animMode: 'sheet',
        metricsSnapshot: null,
        // Shim: party-ui-handler calls mount.dom.setVisible() to hide/show sprites.
        // Shadow follows the same visibility; only shown when a sprite is actually loaded.
        dom: {
          setVisible: visible => {
            img.setVisible(visible);
            shadow.setVisible(ENABLE_BATTLER_SHADOWS && visible && !!mount.currentUrl && !!mount.shadowVisibleByMetrics);
          },
        },
      };
      return mount;
    }

    _debugSpriteAnimEnabled() {
      const win = globalThis?.window;
      return Boolean(globalThis?.__PKB_DEBUG_SPRITE_ANIM || win?.__PKB_DEBUG_SPRITE_ANIM);
    }

    _logSpriteAnim(mount, message, payload = null) {
      if (!this._debugSpriteAnimEnabled()) return;
      if (payload) console.log(`[pkb-sprite-anim:${mount?.name || 'unknown'}] ${message}`, payload);
      else console.log(`[pkb-sprite-anim:${mount?.name || 'unknown'}] ${message}`);
    }

    _debugShadowMetricsEnabled() {
      const win = globalThis?.window;
      return Boolean(globalThis?.__PKB_DEBUG_SHADOW_METRICS || win?.__PKB_DEBUG_SHADOW_METRICS);
    }

    _logShadowMetrics(mount, message, payload = null) {
      if (!this._debugShadowMetricsEnabled()) return;
      if (payload) console.log(`[pkb-shadow-metrics:${mount?.name || 'unknown'}] ${message}`, payload);
      else console.log(`[pkb-shadow-metrics:${mount?.name || 'unknown'}] ${message}`);
    }

    _clearBattlerFrameTextures(mount) {
      if (!mount?.frameTextureKeys?.length) return;
      for (const texKey of mount.frameTextureKeys) {
        if (this.textures.exists(texKey)) this.textures.remove(texKey);
      }
      mount.frameTextureKeys = [];
      mount.animMode = 'sheet';
    }

    _buildFrameTexturesFromStrip(mount, keyPrefix, img, frameSize, frameCount) {
      const keys = [];
      for (let i = 0; i < frameCount; i++) {
        const frameKey = `${keyPrefix}-f${i}`;
        if (this.textures.exists(frameKey)) this.textures.remove(frameKey);
        const canvas = document.createElement('canvas');
        canvas.width = frameSize;
        canvas.height = frameSize;
        const ctx = canvas.getContext('2d');
        if (!ctx) continue;
        ctx.imageSmoothingEnabled = false;
        const sx = i * frameSize;
        ctx.drawImage(img, sx, 0, frameSize, frameSize, 0, 0, frameSize, frameSize);
        this.textures.addCanvas(frameKey, canvas);
        keys.push(frameKey);
      }
      return keys;
    }

    _applyMountMetricsSnapshot(mount) {
      const snap = mount?.metricsSnapshot;
      if (!mount?.phaserSprite || !snap) return;
      const baseX = mount.baseX ?? mount.phaserSprite.x;
      const baseY = mount.baseY ?? mount.phaserSprite.y;
      const spriteX = baseX + snap.offsetX;
      const spriteY = baseY + snap.offsetY;
      mount.phaserSprite
        .setOrigin(0.5, 1)
        .setScale(snap.sprScale)
        .setPosition(spriteX, spriteY);

      if (!mount.shadow) return;
      if (!ENABLE_BATTLER_SHADOWS) {
        mount.shadowVisibleByMetrics = false;
        mount.shadow.setVisible(false);
        return;
      }
      if (snap.showShadow) {
        const shadowX = baseX + snap.offsetX + snap.shX + SHADOW_GLOBAL_OFFSET.x;
        const shadowY = baseY + snap.offsetY + snap.shY + SHADOW_GLOBAL_OFFSET.y;
        const finalShadowY = shadowY - snap.shadowBaseline;
        mount.shadow.setPosition(shadowX, finalShadowY);
        mount.shadow.setSize(snap.shadowW, snap.shadowH);
        mount.shadowVisibleByMetrics = true;
        mount.shadow.setVisible(true);
        this._logShadowMetrics(mount, 'reapply', {
          baseX,
          baseY,
          offsetX: snap.offsetX,
          offsetY: snap.offsetY,
          shX: snap.shX,
          shY: snap.shY,
          shadowBaseline: snap.shadowBaseline,
          shadowW: snap.shadowW,
          shadowH: snap.shadowH,
          finalShadowX: shadowX,
          finalShadowY,
        });
      } else {
        mount.shadowVisibleByMetrics = false;
        mount.shadow.setVisible(false);
      }
    }

    _refreshBattlerSpritesForMetrics() {
      const mounts = [this.enemySprite, this.playerSprite];
      for (const mount of mounts) {
        const url = mount?.currentUrl || '';
        if (!url) continue;
        mount.currentUrl = '';
        this.renderBattlerSprite(mount, { url });
      }
    }

    // Loads a battler sprite from spriteModel.url and renders it on the Phaser canvas.
    // Async: returns immediately; sprite appears once the image loads.
    async renderBattlerSprite(mount, spriteModel) {
      const url = spriteModel?.url || '';
      if (!url) {
        this._clearBattlerAnim(mount);
        mount.phaserSprite.setTexture('pkb-battler-placeholder').setVisible(false);
        this._clearBattlerFrameTextures(mount);
        mount.currentUrl = '';
        mount.metricsSnapshot = null;
        mount.shadowVisibleByMetrics = false;
        mount.shadow.setVisible(false);
        return;
      }
      // Skip reload if same URL is already showing.
      if (url === mount.currentUrl) {
        this._logSpriteAnim(mount, 'skip reload (same url)', { url, mode: mount.animMode });
        return;
      }
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
        this._clearBattlerFrameTextures(mount);
        if (this.textures.exists(key)) this.textures.remove(key);

        const img = await new Promise((resolve, reject) => {
          const i = new Image();
          i.onload = () => resolve(i);
          i.onerror = () => reject(new Error(`Sprite load failed: ${url}`));
          i.src = url;
        });

        // If URL changed while awaiting (e.g. Pokemon switched), abort.
        if (mount.currentUrl !== url) return;

        // Detect animation frames: DBK strips use square cells (frame width = image height).
        const frameH = img.height;
        const frameCount = Math.max(1, Math.ceil(img.width / frameH));
        // Force per-frame texture mode to avoid platform-specific sheet frame sticking
        // (observed as "first frame only" despite timer ticks).
        const maxTextureSize = this.renderer?.getMaxTextureSize?.() ?? Number.MAX_SAFE_INTEGER;
        mount.frameTextureKeys = this._buildFrameTexturesFromStrip(mount, key, img, frameH, frameCount);
        mount.animMode = 'frames';
        this._logSpriteAnim(mount, 'loaded per-frame strip', {
          url,
          width: img.width,
          height: img.height,
          frameCount,
          maxTextureSize,
        });

        // --- Apply PBS metrics (position, scale, shadow, animation speed) ---
        // spriteId is the filename without extension, e.g. "CHARIZARD_1".
        const spriteId = url.split('/').pop().replace(/\.png$/i, '');
        const metrics  = getMetricsForSprite(spriteId, this.pokemonMetrics);
        const isFront  = mount.name === 'enemy';

        // Base positions stored by ui.js layout(). Fall back to current position.
        const baseX = mount.baseX ?? mount.phaserSprite.x;
        const baseY = mount.baseY ?? mount.phaserSprite.y;

        // Sprite offset: positive pbsY moves sprite DOWN (matches DBK / RPG Maker y-axis).
        const offsetX = isFront ? (metrics?.frontX ?? 0) : (metrics?.backX ?? 0);
        const offsetY = isFront ? (metrics?.frontY ?? 0) : (metrics?.backY ?? 0);
        const spriteTargetX = baseX + offsetX;
        const spriteTargetY = baseY + offsetY;
        const sprScale = isFront
          ? (metrics?.frontScale ?? DBK_DEFAULTS.frontScale)
          : (metrics?.backScale ?? DBK_DEFAULTS.backScale);

        if (mount.animMode === 'frames') {
          const firstFrameKey = mount.frameTextureKeys[0] || 'pkb-battler-placeholder';
          mount.phaserSprite.setTexture(firstFrameKey);
        } else {
          mount.phaserSprite.setTexture(key, 0);
        }
        mount.phaserSprite
          .setOrigin(0.5, 1)
          .setScale(sprScale)
          .setPosition(spriteTargetX, spriteTargetY);
        mount.phaserSprite.setVisible(true);

        // Shadow: composite sprite offset + shadow offset (follows DBK apply_metrics_to_sprite
        // which applies front/back sprite offset AND shadow_sprite offset to the shadow position).
        const shX  = metrics?.shadowX ?? 0;
        const shY  = isFront ? (metrics?.shadowFrontY ?? 0) : (metrics?.shadowBackY ?? 0);
        const shadowX = baseX + offsetX + shX;
        const shadowY = baseY + offsetY + shY;
        const isPlayerSide = !isFront;
        const rawShadowSize = Number.isFinite(metrics?.shadowSize) ? metrics.shadowSize : 1;
        const showBySide = !isPlayerSide || DBK_DEFAULTS.showPlayerSideShadows;
        const showShadow = ENABLE_BATTLER_SHADOWS && showBySide && rawShadowSize !== 0;
        let shadowW = 0;
        let shadowH = 0;
        let shadowBaseline = 0;

        if (showShadow) {
          // DBK size formula: zoom_x = scale + effective*0.1, zoom_y = scale*0.25 + effective*0.025
          const effective = rawShadowSize > 0 ? rawShadowSize - 1 : rawShadowSize;
          const zoomX = sprScale + effective * 0.1;
          const zoomY = sprScale * 0.25 + effective * 0.025;
          shadowW = frameH * 0.45 * zoomX;
          shadowH = frameH * 0.45 * zoomY;
          // Baseline correction:
          // DBK does `self.y -= (self.height / 4)`, where height is post-zoom bitmap height.
          // Our ellipse height (`shadowH`) is stylized (0.45 factor), so compute baseline from
          // DBK-equivalent rendered shadow height instead of ellipse display height.
          const legacyBaseline = shadowH * 0.25;
          const dbkRenderedShadowH = frameH * zoomY;
          shadowBaseline = dbkRenderedShadowH * 0.25;
          mount.shadow.setPosition(
            shadowX + SHADOW_GLOBAL_OFFSET.x,
            shadowY + SHADOW_GLOBAL_OFFSET.y - shadowBaseline
          );
          mount.shadow.setSize(shadowW, shadowH);
          mount.shadowVisibleByMetrics = true;
          mount.shadow.setVisible(true);
          this._logShadowMetrics(mount, 'init', {
            url,
            spriteId,
            isFront,
            baseX,
            baseY,
            offsetX,
            offsetY,
            shX,
            shY,
            zoomX,
            zoomY,
            shadowW,
            shadowH,
            legacyBaseline,
            dbkBaseline: shadowBaseline,
            finalShadowX: shadowX + SHADOW_GLOBAL_OFFSET.x,
            finalShadowY: shadowY + SHADOW_GLOBAL_OFFSET.y - shadowBaseline,
          });
        } else {
          mount.shadowVisibleByMetrics = false;
          mount.shadow.setVisible(false);
        }
        mount.metricsSnapshot = {
          offsetX,
          offsetY,
          sprScale,
          shX,
          shY,
          showShadow,
          shadowW,
          shadowH,
          shadowBaseline,
        };

        // Animation speed (DBK): delay = ((speed / 2.0) * frameDelayMs). Speed 0 = no animation.
        const animSpeed = isFront ? (metrics?.animFront ?? 2) : (metrics?.animBack ?? 2);
        const delay = calcDbkAnimationDelayMs(animSpeed);
        if (frameCount > 1 && delay > 0) {
          let frame = 0;
          let tick = 0;
          mount.animTimer = this.time.addEvent({
            delay,
            loop: true,
            callback: () => {
              frame = (frame + 1) % frameCount;
              if (mount.currentUrl !== url || !mount.phaserSprite.active) return;
              if (mount.animMode === 'frames') {
                const frameKey = mount.frameTextureKeys[frame];
                if (frameKey) mount.phaserSprite.setTexture(frameKey);
              } else {
                mount.phaserSprite.setFrame(frame);
              }
              if (tick < 4 || (tick % 60) === 0) {
                this._logSpriteAnim(mount, 'tick', {
                  frame,
                  frameCount,
                  delay,
                  mode: mount.animMode,
                });
              }
              tick += 1;
            },
          });
        } else {
          this._logSpriteAnim(mount, 'animation disabled', { frameCount, delay, url });
        }
      } catch (_err) {
        if (mount.currentUrl === url) {
          this._clearBattlerFrameTextures(mount);
          mount.metricsSnapshot = null;
          mount.phaserSprite.setVisible(false);
          mount.shadowVisibleByMetrics = false;
          mount.shadow.setVisible(false);
        }
        this._logSpriteAnim(mount, 'load error', { url, error: _err?.message || String(_err) });
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
      this._applyMountMetricsSnapshot(this.enemySprite);
      this._applyMountMetricsSnapshot(this.playerSprite);
    }

    renderModel(model) {
      this.currentModel = model;
      this.ui?.renderModel?.(model || {});
    }

    /**
     * Play the visual animation for a move.
     * Called by the timeline executor for move_use events.
     *
     * @param {string} moveName     — Showdown display name (e.g. 'Flamethrower')
     * @param {string} actorSide    — 'p1' | 'p2'  (who used the move)
     * @param {string} targetSide   — 'p1' | 'p2'  (who is being hit)
     * @returns {Promise<void>}
     */
    async playMoveAnim(moveName, actorSide, targetSide) {
      if (!this.animPlayer || !moveName) return;

      // p1 = player side (back sprite), p2 = enemy side (front sprite)
      const userMount   = actorSide  === 'p1' ? this.playerSprite : this.enemySprite;
      const targetMount = targetSide === 'p1' ? this.playerSprite : this.enemySprite;
      if (!userMount || !targetMount) return;

      const uSpr = userMount.phaserSprite;
      const tSpr = targetMount.phaserSprite;
      if (!uSpr || !tSpr) return;

      // Battler sprites use origin(0.5, 1): x = horizontal center, y = bottom edge.
      const userInfo   = { x: uSpr.x, y: uSpr.y, displayHeight: uSpr.displayHeight || 64 };
      const targetInfo = { x: tSpr.x, y: tSpr.y, displayHeight: tSpr.displayHeight || 64 };

      await this.animPlayer.play(moveName, userInfo, targetInfo);
    }
  };
}
