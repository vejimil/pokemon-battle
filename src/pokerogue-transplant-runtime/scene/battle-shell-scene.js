import { ARENA_OFFSETS, UI_ASSETS } from '../runtime/constants.js';
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
const ENABLE_BATTLER_SHADOWS = true;
const SHADOW_ALPHA = 0.35;
const SHADOW_BASE_Y_OFFSET = 3;
const NORMAL_DYNAMAX_BASE_Y_OFFSET = 12;
const PLAYER_DYNAMAX_METRICS_RATIO = 2;
const FIELD_BG_LAYER_DEPTH = 5.4;
const TERRAIN_BG_RESOURCE_BY_ID = Object.freeze({
  electricterrain: 'PRAS- Electric Terrain BG',
  grassyterrain: 'PRAS- Giga Drain BG',
  mistyterrain: 'PRAS- Misty Terrain BG',
  psychicterrain: 'PRAS- Psychic Terrain BG',
});
const TERA_TYPE_TINTS = Object.freeze({
  normal:   0xa8a878,
  fighting: 0xc03028,
  flying:   0xa890f0,
  poison:   0xa040a0,
  ground:   0xe0c068,
  rock:     0xb8a038,
  bug:      0xa8b820,
  ghost:    0x705898,
  steel:    0xb8b8d0,
  fire:     0xf08030,
  water:    0x6890f0,
  grass:    0x78c850,
  electric: 0xf8d030,
  psychic:  0xf85888,
  ice:      0x98d8d8,
  dragon:   0x7038f8,
  dark:     0x705848,
  fairy:    0xe888c8,
  stellar:  0xffffff,
});
const SUBSTITUTE_SPRITE_METRICS = Object.freeze({
  frontX: 0,
  frontY: 30,
  frontScale: 1,
  backX: 0,
  backY: 60,
  backScale: 1,
  shadowX: 0,
  shadowBackY: 0,
  shadowFrontY: 0,
  shadowSize: 0,
  animBack: 0,
  animFront: 0,
});

function isSubstituteSpriteId(spriteId = '') {
  const normalized = String(spriteId || '').trim().toLowerCase();
  return normalized === 'substitute' || normalized === 'substitute_back';
}

export function createBattleShellSceneClass(Phaser, env) {
  return class TransplantBattleShellScene extends Phaser.Scene {
    constructor(controller) {
      super({ key: 'pkb-transplant-battle-shell-scene' });
      this.controller = controller;
      this.Phaser = Phaser;
      this.sceneKey = 'pkb-transplant-battle-shell-scene';
      this.isBootstrapped = false;
      this.currentModel = null;
      this._persistentTerrainBg = null;
      this._persistentTerrainId = '';
      this._bgTextureLoadPromises = new Map();
      this._deferredTextureReleaseKeys = new Set();
      this._deferredTextureReleaseTimer = null;
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
        try { this.clearPersistentTerrainBackground?.(); } catch (_error) {}
        try { this._teraSparkleTimer?.remove?.(); this._teraSparkleTimer = null; } catch (_error) {}
        try { this._allBattlerMounts().forEach(mount => this._destroyMountTeraFx(mount)); } catch (_error) {}
        try { this._deferredTextureReleaseTimer?.remove?.(); this._deferredTextureReleaseTimer = null; } catch (_error) {}
        this._deferredTextureReleaseKeys?.clear?.();
        this._bgTextureLoadPromises?.clear?.();
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
        this._preloadTerrainBackgroundTextures();
        this.enemySprites = [
          this.createSpriteMount('enemy', 0),
          this.createSpriteMount('enemy', 1),
        ];
        this.playerSprites = [
          this.createSpriteMount('player', 0),
          this.createSpriteMount('player', 1),
        ];
        // Aliases for legacy callers that still address slot 0 directly.
        this.enemySprite = this.enemySprites[0];
        this.playerSprite = this.playerSprites[0];
        this.runtimeEnv.audio = this.audio; // expose audio manager to UI handlers
        this.animPlayer = new BattleAnimPlayer(this);  // move visual animation player
        this.ui = new TransplantBattleUI(this, this.controller, this.runtimeEnv);
        this.ui.attachSpriteMounts({ enemy: this.enemySprites, player: this.playerSprites });
        this.ui.setup();
        if (textureExists(this, env.UI_ASSETS.promptAtlas.key, '1') && !this.anims.exists('pkb-ui-prompt-arrow')) {
          this.anims.create({
            key: 'pkb-ui-prompt-arrow',
            frames: ['1', '2', '3', '4'].filter(frame => textureExists(this, env.UI_ASSETS.promptAtlas.key, frame)).map(frame => ({ key: env.UI_ASSETS.promptAtlas.key, frame })),
            frameRate: 6,
            repeat: -1,
          });
        }
        if (textureExists(this, env.UI_ASSETS.effectTeraSparkle?.key, '0') && !this.anims.exists('pkb-effect-tera-sparkle')) {
          const sparkleFrames = [];
          for (let i = 0; i <= 12; i += 1) {
            const frame = String(i);
            if (!textureExists(this, env.UI_ASSETS.effectTeraSparkle.key, frame)) continue;
            sparkleFrames.push({ key: env.UI_ASSETS.effectTeraSparkle.key, frame });
          }
          if (sparkleFrames.length) {
            this.anims.create({
              key: 'pkb-effect-tera-sparkle',
              frames: sparkleFrames,
              frameRate: 18,
              repeat: 0,
              showOnStart: true,
              hideOnComplete: true,
            });
          }
        }
        this._teraSparkleTimer = this.time.addEvent({
          delay: 210,
          loop: true,
          callback: () => this._emitTeraSparkles(),
        });
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

    createSpriteMount(name, slot = 0) {
      // Use a Phaser Image drawn directly on the canvas so it scales correctly with
      // INTEGER_SCALE mode. No DOM elements — eliminates all coordinate-system mismatches.
      const baseDepth = name === 'enemy' ? 6 : 7; // above arena bases (4,5), below UI (42+)
      // Doubles layering:
      // - enemy side: slot 0 above slot 1
      // - player side: slot 1 above slot 0
      const slotDepthBias = name === 'enemy'
        ? (slot === 0 ? 0.05 : 0)
        : (slot === 1 ? 0.05 : 0);
      const depth = baseDepth + slotDepthBias;

      // Ellipse shadow drawn just below the sprite (depth - 1 so it stays behind sprite).
      const shadow = this.add.ellipse(0, 0, 1, 1, 0x000000, SHADOW_ALPHA)
        .setDepth(depth - 0.2)
        .setVisible(false);

      const img = this.add.image(0, 0, 'pkb-battler-placeholder')
        .setOrigin(0.5, 1)
        .setDepth(depth)
        .setVisible(false);

      const mount = {
        name,
        slot,
        phaserSprite: img,
        shadow,
        shadowVisibleByMetrics: false,
        // Tracks whether the current occupant of this slot is fainted. When true,
        // sprite refreshes (metrics reload, URL re-render) must not re-expose the
        // battler — cleared only when a new sprite is staged for switch-in / form change.
        fainted: false,
        dynamaxed: false,
        gigantamaxed: false,
        terastallized: false,
        teraType: '',
        teraOverlay: null,
        teraMask: null,
        teraSparkles: [],
        currentUrl: '',
        currentTextureKey: '',
        animTimer: null,
        frameTextureKeys: [],
        animMode: 'sheet',
        metricsSnapshot: null,
        manualYOffset: 0,
        // Shim: party-ui-handler calls mount.dom.setVisible() to hide/show sprites.
        // Shadow follows the same visibility; only shown when a sprite is actually loaded.
        dom: {
          setVisible: visible => {
            img.setVisible(visible);
            this._syncMountShadowVisibility(mount);
            this._syncMountTeraFx(mount, 0);
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
      this._requestDeferredTextureRelease(mount.frameTextureKeys);
      mount.frameTextureKeys = [];
      mount.animMode = 'sheet';
    }

    _clearFrameTexturesByKeys(keys = []) {
      this._requestDeferredTextureRelease(keys);
    }

    _requestDeferredTextureRelease(keys = []) {
      const normalizedKeys = (Array.isArray(keys) ? keys : [keys])
        .map(key => String(key || '').trim())
        .filter(Boolean);
      if (!normalizedKeys.length) return;
      normalizedKeys.forEach(key => this._deferredTextureReleaseKeys.add(key));
      this._scheduleDeferredTextureReleaseFlush();
    }

    _scheduleDeferredTextureReleaseFlush(delayMs = 120) {
      if (!this._deferredTextureReleaseKeys.size) return;
      if (this._deferredTextureReleaseTimer) return;
      this._deferredTextureReleaseTimer = this.time.delayedCall(delayMs, () => {
        this._deferredTextureReleaseTimer = null;
        this._flushDeferredTextureReleases();
        if (this._deferredTextureReleaseKeys.size) this._scheduleDeferredTextureReleaseFlush(220);
      });
    }

    _isTextureKeyInUse(textureKey = '') {
      const key = String(textureKey || '').trim();
      if (!key) return false;
      const list = Array.isArray(this.children?.list) ? this.children.list : [];
      for (const obj of list) {
        if (!obj?.active) continue;
        const objKey = String(obj?.texture?.key || '').trim();
        if (objKey && objKey === key) return true;
      }
      return false;
    }

    _flushDeferredTextureReleases() {
      if (!this._deferredTextureReleaseKeys.size) return;
      const pending = [...this._deferredTextureReleaseKeys];
      this._deferredTextureReleaseKeys.clear();
      pending.forEach(key => {
        if (!this.textures.exists(key)) return;
        if (this._isTextureKeyInUse(key)) {
          this._deferredTextureReleaseKeys.add(key);
          return;
        }
        try { this.textures.remove(key); } catch (_error) {}
      });
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

    _dynamaxScaleMultiplier(mount) {
      return mount?.dynamaxed ? 2 : 1;
    }

    _dynamaxBaseYOffsetForState(dynamaxed = false, gigantamaxed = false) {
      return dynamaxed && !gigantamaxed ? NORMAL_DYNAMAX_BASE_Y_OFFSET : 0;
    }

    _dynamaxMetricsRatio(mount) {
      return mount?.name === 'player' ? PLAYER_DYNAMAX_METRICS_RATIO : 1;
    }

    _dynamaxBaseYOffsetForMountState(mount, dynamaxed = false, gigantamaxed = false) {
      const baseOffset = this._dynamaxBaseYOffsetForState(dynamaxed, gigantamaxed);
      return baseOffset * this._dynamaxMetricsRatio(mount);
    }

    _dynamaxBaseYOffset(mount) {
      return this._dynamaxBaseYOffsetForMountState(
        mount,
        mount?.dynamaxed === true,
        mount?.gigantamaxed === true,
      );
    }

    _resolveMountScale(mount, baseScale = 1) {
      return Number(baseScale || 1) * this._dynamaxScaleMultiplier(mount);
    }

    _normalizeMountYOffset(yOffset = 0) {
      const normalized = Number(yOffset);
      if (!Number.isFinite(normalized)) return 0;
      return Math.round(normalized);
    }

    _setMountYOffset(mount, yOffset = 0, { apply = true } = {}) {
      if (!mount) return false;
      const normalized = this._normalizeMountYOffset(yOffset);
      if (mount.manualYOffset === normalized) {
        if (apply && normalized !== 0) this._applyMountMetricsSnapshot(mount);
        return false;
      }
      mount.manualYOffset = normalized;
      if (apply) this._applyMountMetricsSnapshot(mount);
      return true;
    }

    _applyMountMetricsSnapshot(mount) {
      const snap = mount?.metricsSnapshot;
      if (!mount?.phaserSprite || !snap) return;
      const baseX = mount.baseX ?? mount.phaserSprite.x;
      const baseY = mount.baseY ?? mount.phaserSprite.y;
      const dmaxYOffset = this._dynamaxBaseYOffset(mount);
      const manualYOffset = this._normalizeMountYOffset(mount?.manualYOffset || 0);
      const spriteX = baseX + snap.offsetX;
      const spriteY = baseY + snap.offsetY + dmaxYOffset + manualYOffset;
      mount.phaserSprite
        .setOrigin(0.5, 1)
        .setScale(this._resolveMountScale(mount, snap.sprScale))
        .setPosition(spriteX, spriteY);

      if (!mount.shadow) {
        this._syncMountTeraFx(mount, 0);
        return;
      }
      this._applyMountShadowSnapshot(mount, snap, { baseX, baseY, dmaxYOffset, manualYOffset, reason: 'reapply' });
      this._syncMountTeraFx(mount, 0);
    }

    _shouldShowMountShadow(mount) {
      const spr = mount?.phaserSprite;
      return Boolean(
        ENABLE_BATTLER_SHADOWS
        && mount?.name === 'enemy'
        && mount?.shadowVisibleByMetrics
        && mount?.currentUrl
        && !mount?.fainted
        && spr?.active
        && spr.visible
        && Number(spr.alpha ?? 1) > 0
      );
    }

    _syncMountShadowVisibility(mount) {
      if (!mount?.shadow) return;
      mount.shadow.setVisible(this._shouldShowMountShadow(mount));
      if (mount.shadow.visible && Number(mount.shadow.alpha ?? SHADOW_ALPHA) <= 0) {
        mount.shadow.setAlpha(SHADOW_ALPHA);
      }
    }

    _applyMountShadowSnapshot(mount, snap, { baseX = 0, baseY = 0, dmaxYOffset = 0, manualYOffset = 0, reason = 'apply' } = {}) {
      if (!mount?.shadow) return;
      if (!ENABLE_BATTLER_SHADOWS || mount.name !== 'enemy' || !snap?.showShadow) {
        mount.shadowVisibleByMetrics = false;
        mount.shadow.setVisible(false);
        return;
      }
      const scaleMultiplier = this._dynamaxScaleMultiplier(mount);
      const shadowW = Math.max(1, snap.shadowW * scaleMultiplier);
      const shadowH = Math.max(1, snap.shadowH * scaleMultiplier);
      const shadowX = baseX + SHADOW_GLOBAL_OFFSET.x;
      const shadowY = baseY + SHADOW_BASE_Y_OFFSET + SHADOW_GLOBAL_OFFSET.y;
      mount.shadow.setPosition(shadowX, shadowY);
      mount.shadow.setSize(shadowW, shadowH);
      mount.shadowVisibleByMetrics = true;
      this._syncMountShadowVisibility(mount);
      this._logShadowMetrics(mount, reason, {
        baseX,
        baseY,
        dmaxYOffset,
        manualYOffset,
        shadowW,
        shadowH,
        finalShadowX: shadowX,
        finalShadowY: shadowY,
      });
    }

    _setMountDynamaxState(mount, options = {}) {
      if (!mount?.phaserSprite) return;
      const prevMultiplier = this._dynamaxScaleMultiplier(mount);
      const prevBaseYOffset = this._dynamaxBaseYOffset(mount);
      mount.dynamaxed = options?.dynamaxed === true;
      mount.gigantamaxed = mount.dynamaxed && options?.gigantamaxed === true;
      const nextMultiplier = this._dynamaxScaleMultiplier(mount);
      const nextBaseYOffset = this._dynamaxBaseYOffset(mount);

      if (mount.metricsSnapshot) {
        this._applyMountMetricsSnapshot(mount);
        return;
      }

      const spr = mount.phaserSprite;
      if (!spr.active) return;
      const safePrev = prevMultiplier > 0 ? prevMultiplier : 1;
      const baseScaleX = Number(spr.scaleX || 1) / safePrev;
      const baseScaleY = Number(spr.scaleY || 1) / safePrev;
      spr.setScale(baseScaleX * nextMultiplier, baseScaleY * nextMultiplier);
      spr.setY(Number(spr.y || 0) + (nextBaseYOffset - prevBaseYOffset));
    }

    setBattlerDynamaxState(side, options = {}) {
      const slot = Number(options?.slot) === 1 ? 1 : 0;
      const mount = this._mountForBattleSideSlot(side, slot);
      if (!mount) return;
      this._setMountDynamaxState(mount, {
        dynamaxed: options?.dynamaxed === true,
        gigantamaxed: options?.gigantamaxed === true,
      });
    }

    _teraTintForType(type = '') {
      return TERA_TYPE_TINTS[String(type || '').toLowerCase()] || 0xffffff;
    }

    _ensureMountTeraOverlay(mount) {
      if (!mount?.phaserSprite || mount?.teraOverlay) return mount?.teraOverlay || null;
      if (!textureExists(this, env.UI_ASSETS.effectTera?.key)) return null;
      const blendMode = this.Phaser?.BlendModes?.SCREEN ?? this.Phaser?.BlendModes?.ADD ?? 1;
      const overlay = this.add.tileSprite(0, 0, 32, 32, env.UI_ASSETS.effectTera.key)
        .setOrigin(0.5, 1)
        .setDepth((mount.phaserSprite.depth || 7) + 0.4)
        .setAlpha(0.4)
        .setBlendMode(blendMode)
        .setVisible(false);
      try {
        if (!mount.teraMask && mount.phaserSprite?.createBitmapMask) {
          mount.teraMask = mount.phaserSprite.createBitmapMask();
        }
        if (mount.teraMask) overlay.setMask(mount.teraMask);
      } catch (_error) {}
      mount.teraOverlay = overlay;
      return overlay;
    }

    _destroyMountTeraFx(mount) {
      if (!mount) return;
      if (Array.isArray(mount.teraSparkles)) {
        mount.teraSparkles.forEach(sparkle => sparkle?.destroy?.());
      }
      mount.teraSparkles = [];
      mount.teraOverlay?.destroy?.();
      mount.teraOverlay = null;
      mount.teraMask?.destroy?.();
      mount.teraMask = null;
    }

    _setMountTerastallized(mount, active = false, teraType = '') {
      if (!mount) return;
      mount.terastallized = Boolean(active);
      mount.teraType = String(teraType || '').toLowerCase();
      if (!mount.terastallized) {
        this._destroyMountTeraFx(mount);
        return;
      }
      this._ensureMountTeraOverlay(mount);
      this._syncMountTeraFx(mount, 0);
    }

    setBattlerTerastallized(side, options = {}) {
      const slot = Number(options?.slot) === 1 ? 1 : 0;
      const mount = this._mountForBattleSideSlot(side, slot);
      if (!mount) return;
      const teraType = String(options?.teraType || '').toLowerCase();
      const active = options?.terastallized === true || !!teraType;
      this._setMountTerastallized(mount, active, teraType);
    }

    _syncMountTeraFx(mount, deltaMs = 0) {
      if (!mount?.phaserSprite) return;
      const spr = mount.phaserSprite;
      if (!mount.terastallized) {
        if (mount.teraOverlay) mount.teraOverlay.setVisible(false);
        return;
      }
      const overlay = this._ensureMountTeraOverlay(mount);
      if (!overlay || !spr.active) return;
      const shouldShow = Boolean(spr.visible && spr.alpha > 0 && mount.currentUrl);
      overlay.setVisible(shouldShow);
      if (!shouldShow) return;
      overlay
        .setPosition(spr.x, spr.y)
        .setDepth((spr.depth || 7) + 0.4)
        .setTint(this._teraTintForType(mount.teraType));
      const overlayW = Math.max(24, Math.round(spr.displayWidth * 0.95));
      const overlayH = Math.max(24, Math.round(spr.displayHeight * 0.98));
      overlay.setSize(overlayW, overlayH);
      overlay.setDisplaySize(overlayW, overlayH);
      overlay.tilePositionX += Math.max(0, Number(deltaMs) || 0) * 0.05;
      overlay.tilePositionY += Math.max(0, Number(deltaMs) || 0) * 0.04;
    }

    _emitTeraSparkles() {
      if (!this.isBootstrapped) return;
      if (!this.anims.exists('pkb-effect-tera-sparkle')) return;
      const mounts = this._allBattlerMounts();
      for (const mount of mounts) {
        if (!mount?.terastallized) continue;
        const spr = mount?.phaserSprite;
        if (!spr?.active || !spr.visible || spr.alpha <= 0) continue;
        mount.teraSparkles = (mount.teraSparkles || []).filter(sparkle => sparkle?.active);
        if (mount.teraSparkles.length >= 6) continue;
        if (Math.random() < 0.45) continue;
        const dx = (Math.random() - 0.5) * spr.displayWidth * 0.8;
        const dy = -Math.random() * spr.displayHeight * 0.88;
        const sparkle = this.add.sprite(
          spr.x + dx,
          spr.y + dy,
          env.UI_ASSETS.effectTeraSparkle.key,
          '0'
        )
          .setOrigin(0.5, 0.5)
          .setDepth((spr.depth || 7) + 1.6)
          .setScale(0.78 + Math.random() * 0.36)
          .setAlpha(0.95);
        sparkle.play('pkb-effect-tera-sparkle');
        mount.teraSparkles.push(sparkle);
        this.time.delayedCall(980, () => sparkle.destroy());
      }
    }

    _refreshBattlerSpritesForMetrics() {
      const mounts = this._allBattlerMounts();
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
      const hasYOffset = Boolean(
        spriteModel
        && Object.prototype.hasOwnProperty.call(spriteModel, 'yOffset')
      );
      if (hasYOffset) {
        this._setMountYOffset(mount, spriteModel?.yOffset, { apply: true });
      }
      const hasTeraState = Boolean(
        spriteModel
        && (Object.prototype.hasOwnProperty.call(spriteModel, 'teraType')
          || Object.prototype.hasOwnProperty.call(spriteModel, 'terastallized'))
      );
      const hasDynamaxState = Boolean(
        spriteModel
        && (Object.prototype.hasOwnProperty.call(spriteModel, 'dynamaxed')
          || Object.prototype.hasOwnProperty.call(spriteModel, 'gigantamaxed'))
      );
      if (hasDynamaxState) {
        this._setMountDynamaxState(mount, {
          dynamaxed: spriteModel?.dynamaxed === true,
          gigantamaxed: spriteModel?.gigantamaxed === true,
        });
      }
      if (hasTeraState) {
        const teraType = String(spriteModel?.teraType || '').toLowerCase();
        const active = spriteModel?.terastallized === true || !!teraType;
        this._setMountTerastallized(mount, active, teraType);
      }
      if (!url) {
        this._clearBattlerAnim(mount);
        mount.phaserSprite.setTexture('pkb-battler-placeholder').setVisible(false);
        this._clearBattlerFrameTextures(mount);
        if (mount?.currentTextureKey) this._requestDeferredTextureRelease(mount.currentTextureKey);
        mount.currentUrl = '';
        mount.currentTextureKey = '';
        mount.metricsSnapshot = null;
        mount.shadowVisibleByMetrics = false;
        mount.shadow.setVisible(false);
        this._syncMountTeraFx(mount, 0);
        return;
      }
      // Skip reload if same URL is already showing.
      if (url === mount.currentUrl) {
        this._logSpriteAnim(mount, 'skip reload (same url)', { url, mode: mount.animMode });
        return;
      }
      const prevUrl = mount.currentUrl;
      mount.currentUrl = url;
      this._clearBattlerAnim(mount);
      const prevFrameTextureKeys = [...(mount?.frameTextureKeys || [])];
      const prevTextureKey = String(mount?.currentTextureKey || '');
      try {
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
        this._battlerTextureNonce = (this._battlerTextureNonce || 0) + 1;
        const keyPrefix = `pkb-battler-${mount.name}-${this._battlerTextureNonce}`;
        mount.frameTextureKeys = this._buildFrameTexturesFromStrip(mount, keyPrefix, img, frameH, frameCount);
        mount.currentTextureKey = keyPrefix;
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
        const metrics = isSubstituteSpriteId(spriteId)
          ? SUBSTITUTE_SPRITE_METRICS
          : getMetricsForSprite(spriteId, this.pokemonMetrics);
        const isFront  = mount.name === 'enemy';

        // Base positions stored by ui.js layout(). Fall back to current position.
        const baseX = mount.baseX ?? mount.phaserSprite.x;
        const baseY = mount.baseY ?? mount.phaserSprite.y;
        const manualYOffset = this._normalizeMountYOffset(mount?.manualYOffset || 0);

        // Sprite offset:
        // - Front sprite: positive pbsY moves sprite DOWN (DBK / RPG Maker y-axis).
        // - Back sprite: invert pbsY sign so only backsprite uses the opposite vertical direction.
        const offsetX = isFront ? (metrics?.frontX ?? 0) : (metrics?.backX ?? 0);
        const offsetY = isFront ? (metrics?.frontY ?? 0) : 0.5 * (metrics?.backY ?? 0);
        const spriteTargetX = baseX + offsetX;
        const spriteTargetY = baseY + offsetY + manualYOffset;
        const sprScale = isFront
          ? (metrics?.frontScale ?? DBK_DEFAULTS.frontScale)
          : (metrics?.backScale ?? DBK_DEFAULTS.backScale);

        if (mount.animMode === 'frames') {
          const firstFrameKey = mount.frameTextureKeys[0] || 'pkb-battler-placeholder';
          mount.phaserSprite.setTexture(firstFrameKey);
        } else {
          mount.phaserSprite.setTexture(mount.currentTextureKey, 0);
        }
        mount.phaserSprite
          .setOrigin(0.5, 1)
          .setScale(this._resolveMountScale(mount, sprScale))
          .setPosition(spriteTargetX, spriteTargetY);
        // Guard: never re-expose a fainted slot during a refresh (metrics reload,
        // dynamax state apply, etc.). Switch-in / setBattlerSprite clears mount.fainted
        // before staging the new sprite, so genuine reveals still reach setVisible(true).
        mount.phaserSprite.setVisible(!mount.fainted);
        this._syncMountTeraFx(mount, 0);

        // Shadow size follows PBS metrics, but PKB anchors enemy-side shadows
        // to the battler base point instead of the PBS shadow offset.
        const rawShadowSize = Number.isFinite(metrics?.shadowSize) ? metrics.shadowSize : 1;
        const showShadow = ENABLE_BATTLER_SHADOWS && isFront && rawShadowSize !== 0;
        let shadowW = 0;
        let shadowH = 0;

        if (showShadow) {
          // DBK size formula: zoom_x = scale + effective*0.1, zoom_y = scale*0.25 + effective*0.025
          const effective = rawShadowSize > 0 ? rawShadowSize - 1 : rawShadowSize;
          const zoomX = sprScale + effective * 0.1;
          const zoomY = sprScale * 0.25 + effective * 0.025;
          shadowW = frameH * 0.45 * zoomX;
          shadowH = frameH * 0.45 * zoomY;
          this._logShadowMetrics(mount, 'init', {
            url,
            spriteId,
            isFront,
            baseX,
            baseY,
            offsetX,
            offsetY,
            manualYOffset,
            zoomX,
            zoomY,
            shadowW,
            shadowH,
          });
        } else {
          mount.shadowVisibleByMetrics = false;
          mount.shadow.setVisible(false);
        }
        mount.metricsSnapshot = {
          offsetX,
          offsetY,
          sprScale,
          showShadow,
          shadowW,
          shadowH,
        };
        this._applyMountMetricsSnapshot(mount);

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

        this._clearFrameTexturesByKeys(prevFrameTextureKeys);
        if (prevTextureKey && prevTextureKey !== mount.currentTextureKey) {
          this._requestDeferredTextureRelease(prevTextureKey);
        }
      } catch (_err) {
        if (mount.currentUrl === url) {
          if (prevFrameTextureKeys.length) {
            mount.currentUrl = prevUrl;
            mount.frameTextureKeys = prevFrameTextureKeys;
            mount.currentTextureKey = prevTextureKey;
          } else {
            mount.currentUrl = '';
            mount.currentTextureKey = '';
            mount.metricsSnapshot = null;
            mount.phaserSprite.setVisible(false);
            mount.shadowVisibleByMetrics = false;
            mount.shadow.setVisible(false);
            this._syncMountTeraFx(mount, 0);
          }
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

    processVirtualButton(button, { pressed = true } = {}) {
      if (!this.isBootstrapped || !this.ui || this.controller?.mount?.hidden) return false;
      const normalized = String(button || '').toLowerCase().trim();
      if (!normalized) return false;
      if (normalized === 'info') {
        return this.ui.processInfoButton(Boolean(pressed));
      }
      if (!pressed) return false;
      return this.ui.processInput(normalized);
    }

    layoutSafely() {
      try { this.layout(); } catch (error) { this.controller?.notifySceneError?.(error); throw error; }
    }

    layout() {
      if (!this.isBootstrapped) return;
      this.arenaBg.setPosition(0, 0);
      this.arenaEnemyBase.setPosition(ARENA_OFFSETS.enemy.x, ARENA_OFFSETS.enemy.y);
      this.arenaPlayerBase.setPosition(ARENA_OFFSETS.player.x, ARENA_OFFSETS.player.y);
      this._layoutPersistentTerrainBackground();
      this.ui?.layout?.();
      this._allBattlerMounts().forEach(mount => this._applyMountMetricsSnapshot(mount));
    }

    renderModel(model) {
      this.currentModel = model;
      this.ui?.renderModel?.(model || {});
    }

    update(_time, delta = 0) {
      this._allBattlerMounts().forEach(mount => this._syncMountTeraFx(mount, delta));
    }

    _mountForBattleSide(side) {
      return this._mountForBattleSideSlot(side, 0);
    }

    _mountForBattleSideSlot(side, slot = 0) {
      const mounts = this._mountsForBattleSide(side);
      if (!mounts) return null;
      const idx = Number(slot) === 1 ? 1 : 0;
      return mounts[idx] || mounts[0] || null;
    }

    _mountsForBattleSide(side) {
      const perspective = Number.isInteger(this.currentModel?.perspective)
        ? clamp(Number(this.currentModel.perspective), 0, 1)
        : 0;
      const sideIndex = side === 'p2' ? 1 : 0;
      const isPlayerViewSide = sideIndex === perspective;
      return isPlayerViewSide ? this.playerSprites : this.enemySprites;
    }

    _allBattlerMounts() {
      return [
        ...(Array.isArray(this.enemySprites) ? this.enemySprites : []),
        ...(Array.isArray(this.playerSprites) ? this.playerSprites : []),
      ].filter(Boolean);
    }

    _terrainBgResourceName(terrainId = '') {
      const id = String(terrainId || '').toLowerCase().trim();
      return TERRAIN_BG_RESOURCE_BY_ID[id] || '';
    }

    _bgTextureKey(resourceName) {
      return `pkb-ba-bg/${resourceName}`;
    }

    _setImageCoverSize(layer, textureKey) {
      if (!layer || !textureKey || !this.textures.exists(textureKey)) return;
      const width = Number(this.scale?.width) || 320;
      const height = Number(this.scale?.height) || 180;
      layer.setOrigin(0, 0);
      layer.setPosition(0, 0);
      layer.setDisplaySize(width, height);
    }

    _layoutPersistentTerrainBackground() {
      const layer = this._persistentTerrainBg;
      if (!layer?.active) return;
      const width = Number(this.scale?.width) || 320;
      const height = Number(this.scale?.height) || 180;
      layer.setPosition(0, 0);
      layer.setDisplaySize(width, height);
    }

    _ensureBgTextureLoaded(resourceName) {
      const name = String(resourceName || '').trim();
      if (!name) return Promise.resolve();
      const key = this._bgTextureKey(name);
      if (this.textures.exists(key)) return Promise.resolve();
      if (this._bgTextureLoadPromises.has(key)) return this._bgTextureLoadPromises.get(key);
      const promise = new Promise(resolve => {
        const filename = encodeURIComponent(name) + '.png';
        const url = `./assets/pokerogue/battle__anims/${filename}`;
        this.load.image(key, url);
        const done = () => {
          this._bgTextureLoadPromises.delete(key);
          resolve();
        };
        this.load.once('complete', done);
        this.load.once('loaderror', done);
        this.load.start();
      });
      this._bgTextureLoadPromises.set(key, promise);
      return promise;
    }

    _preloadTerrainBackgroundTextures() {
      const resourceNames = Array.from(new Set(
        Object.values(TERRAIN_BG_RESOURCE_BY_ID || {})
          .map(value => String(value || '').trim())
          .filter(Boolean)
      ));
      if (!resourceNames.length) return;
      resourceNames.forEach(resourceName => {
        this._ensureBgTextureLoaded(resourceName).catch(() => {});
      });
    }

    async setPersistentTerrainBackground(terrainId = '') {
      const normalizedTerrainId = String(terrainId || '').toLowerCase().trim();
      const resourceName = this._terrainBgResourceName(normalizedTerrainId);
      if (!resourceName) {
        this.clearPersistentTerrainBackground();
        return;
      }
      const key = this._bgTextureKey(resourceName);
      if (!this.textures.exists(key)) {
        this._persistentTerrainId = normalizedTerrainId;
        this._ensureBgTextureLoaded(resourceName).then(() => {
          if (this._persistentTerrainId !== normalizedTerrainId) return;
          if (!this.textures.exists(key)) return;
          this.setPersistentTerrainBackground(normalizedTerrainId).catch(() => {});
        }).catch(() => {});
        return;
      }
      if (this._persistentTerrainBg?.active && this._persistentTerrainBg.texture?.key === key) {
        this._persistentTerrainId = normalizedTerrainId;
        this._layoutPersistentTerrainBackground();
        this._persistentTerrainBg.setVisible(true);
        return;
      }
      this.clearPersistentTerrainBackground();
      const layer = this.add.image(0, 0, key)
        .setOrigin(0, 0)
        .setDepth(FIELD_BG_LAYER_DEPTH)
        .setAlpha(1);
      this._setImageCoverSize(layer, key);
      this._persistentTerrainBg = layer;
      this._persistentTerrainId = normalizedTerrainId;
    }

    clearPersistentTerrainBackground() {
      try { this._persistentTerrainBg?.destroy?.(); } catch (_error) {}
      this._persistentTerrainBg = null;
      this._persistentTerrainId = '';
    }

    _runTween(config = {}) {
      return new Promise(resolve => {
        if (!config?.targets) {
          resolve();
          return;
        }
        this.tweens.add({
          ...config,
          onComplete: () => resolve(),
          onStop: () => resolve(),
        });
      });
    }

    concealBattler(side, slot = 0) {
      const mount = this._mountForBattleSideSlot(side, slot);
      const spr = mount?.phaserSprite;
      if (!spr || !spr.active) return;
      this.tweens.killTweensOf(spr);
      spr.setAlpha(1);
      spr.setVisible(false);
      if (mount?.shadow) mount.shadow.setVisible(false);
      this._syncMountTeraFx(mount, 0);
    }

    async prepareSwitchInBattler(side, spriteUrl = '', options = {}) {
      const slot = Number(options?.slot) === 1 ? 1 : 0;
      const mount = this._mountForBattleSideSlot(side, slot);
      if (!mount) return;
      // Incoming sprite belongs to the next occupant — lift the fainted guard so
      // renderBattlerSprite can stage the new texture normally.
      mount.fainted = false;
      this._setMountYOffset(mount, 0, { apply: true });
      if (spriteUrl) {
        await this.renderBattlerSprite(mount, { url: spriteUrl });
      }
      const spr = mount?.phaserSprite;
      if (!spr || !spr.active) return;
      this.tweens.killTweensOf(spr);
      spr.setAlpha(1);
      spr.setVisible(false);
      if (mount?.shadow) mount.shadow.setVisible(false);
      this._syncMountTeraFx(mount, 0);
    }

    /**
     * Replace the current battler sprite for a battle side immediately.
     * Used by timeline forme_change handling so the sprite swaps before turn end.
     */
    async setBattlerSprite(side, spriteUrl = '', options = {}) {
      const slot = Number(options?.slot) === 1 ? 1 : 0;
      const mount = this._mountForBattleSideSlot(side, slot);
      if (!mount) return;
      // Staging a new sprite (form change / switch-in) implies the slot has a
      // live occupant again — clear the fainted guard so render can set visible.
      mount.fainted = false;
      if (spriteUrl) {
        await this.renderBattlerSprite(mount, { url: spriteUrl });
      }
      if (Object.prototype.hasOwnProperty.call(options || {}, 'yOffset')) {
        this._setMountYOffset(mount, options.yOffset, { apply: true });
      }
      const spr = mount?.phaserSprite;
      if (!spr || !spr.active) return;
      const shouldShow = options?.visible !== false;
      spr.setAlpha(1);
      spr.setVisible(shouldShow);
      this._syncMountShadowVisibility(mount);
      this._syncMountTeraFx(mount, 0);
    }

    // Visually swap the sprites between two display slots on the same side.
    // Used by the position_swap timeline event (Side Change / Shift).
    // Both slots are re-rendered with swapped URLs; browser cache makes this fast.
    async swapBattlerPositions(side, slot0, slot1) {
      const mount0 = this._mountForBattleSideSlot(side, slot0);
      const mount1 = this._mountForBattleSideSlot(side, slot1);
      if (!mount0 || !mount1 || mount0 === mount1) return;
      const url0 = mount0.currentUrl || '';
      const url1 = mount1.currentUrl || '';
      // Clear same-URL guard so setBattlerSprite forces a re-render with swapped URLs.
      mount0.currentUrl = '';
      mount1.currentUrl = '';
      await Promise.all([
        url1 ? this.setBattlerSprite(side, url1, { slot: slot0 }) : Promise.resolve(),
        url0 ? this.setBattlerSprite(side, url0, { slot: slot1 }) : Promise.resolve(),
      ]);
    }

    getMountSpriteUrl(side, slot = 0) {
      const mount = this._mountForBattleSideSlot(side, slot);
      return mount?.currentUrl || '';
    }

    setBattlerVisibility(side, visible = true, options = {}) {
      const slot = Number(options?.slot) === 1 ? 1 : 0;
      const mount = this._mountForBattleSideSlot(side, slot);
      const spr = mount?.phaserSprite;
      if (!spr || !spr.active) return;
      if (Object.prototype.hasOwnProperty.call(options || {}, 'yOffset')) {
        this._setMountYOffset(mount, options.yOffset, { apply: true });
      }
      const shouldShow = visible !== false;
      spr.setVisible(shouldShow);
      spr.setAlpha(1);
      this._syncMountShadowVisibility(mount);
      this._syncMountTeraFx(mount, 0);
    }

    async playQuietFormChange(side, options = {}) {
      const slot = Number(options?.slot) === 1 ? 1 : 0;
      const mount = this._mountForBattleSideSlot(side, slot);
      const spr = mount?.phaserSprite;
      if (!spr || !spr.active || !spr.visible) return;

      const baseScaleX = spr.scaleX;
      const baseScaleY = spr.scaleY;
      const baseAlpha = spr.alpha;
      const depth = Number.isFinite(spr.depth) ? spr.depth : 7;
      const flare = this.add.rectangle(
        spr.x,
        spr.y - (spr.displayHeight * 0.5),
        Math.max(28, Math.round(spr.displayWidth * 0.9)),
        Math.max(28, Math.round(spr.displayHeight * 1.1)),
        0xffffff,
        0,
      ).setOrigin(0.5, 0.5).setDepth(depth + 1);

      try {
        this.tweens.killTweensOf(spr);
        if (options?.audioEnabled !== false) this.audio?.play?.('se/hit_weak', 0.35);
        spr.setTintFill(0xffffff);
        await Promise.all([
          this._runTween({
            targets: spr,
            alpha: 1,
            scaleX: baseScaleX * 0.9,
            scaleY: baseScaleY * 0.9,
            duration: 180,
            ease: 'Cubic.easeIn',
          }),
          this._runTween({
            targets: flare,
            alpha: 0.45,
            duration: 180,
            ease: 'Sine.easeOut',
          }),
        ]);
        await Promise.all([
          this._runTween({
            targets: spr,
            scaleX: baseScaleX * 1.06,
            scaleY: baseScaleY * 1.06,
            duration: 170,
            ease: 'Cubic.easeOut',
          }),
          this._runTween({
            targets: flare,
            alpha: 0.15,
            duration: 170,
            ease: 'Sine.easeOut',
          }),
        ]);
        spr.clearTint();
        await Promise.all([
          this._runTween({
            targets: spr,
            scaleX: baseScaleX,
            scaleY: baseScaleY,
            alpha: baseAlpha,
            duration: 160,
            ease: 'Sine.easeInOut',
          }),
          this._runTween({
            targets: flare,
            alpha: 0,
            duration: 220,
            ease: 'Sine.easeIn',
          }),
        ]);
      } finally {
        if (spr.active) {
          spr.clearTint();
          spr.setScale(baseScaleX, baseScaleY);
          spr.setAlpha(baseAlpha);
        }
        flare?.destroy?.();
      }
    }

    async playTerastallize(side, options = {}) {
      const slot = Number(options?.slot) === 1 ? 1 : 0;
      const mount = this._mountForBattleSideSlot(side, slot);
      const spr = mount?.phaserSprite;
      if (!spr || !spr.active || !spr.visible) return;

      const baseScaleX = spr.scaleX;
      const baseScaleY = spr.scaleY;
      const baseAlpha = spr.alpha;
      const depth = Number.isFinite(spr.depth) ? spr.depth : 7;
      const aura = this.add.ellipse(
        spr.x,
        spr.y - (spr.displayHeight * 0.46),
        Math.max(34, Math.round(spr.displayWidth * 0.9)),
        Math.max(22, Math.round(spr.displayHeight * 0.52)),
        0xb6f2ff,
        0,
      ).setDepth(depth + 2);
      const teraSigil = textureExists(this, env.UI_ASSETS.effectTera?.key)
        ? this.add.image(spr.x, spr.y - (spr.displayHeight * 0.54), env.UI_ASSETS.effectTera.key)
            .setOrigin(0.5, 0.5)
            .setDepth(depth + 1)
            .setAlpha(0)
        : null;
      if (teraSigil) {
        const sigilScale = Math.max(0.24, (spr.displayWidth || 72) / 120);
        teraSigil.setScale(sigilScale);
      }
      const sparkles = [];
      const sparkleAnimReady = this.anims.exists('pkb-effect-tera-sparkle')
        && textureExists(this, env.UI_ASSETS.effectTeraSparkle?.key, '0');
      const spawnSparkle = (dx, dy, delay = 0, scale = 1) => {
        if (!sparkleAnimReady) return;
        this.time.delayedCall(delay, () => {
          if (!spr.active) return;
          const sparkle = this.add.sprite(spr.x + dx, spr.y + dy, env.UI_ASSETS.effectTeraSparkle.key, '0')
            .setOrigin(0.5, 0.5)
            .setDepth(depth + 3)
            .setAlpha(0.95)
            .setScale(scale);
          sparkle.play('pkb-effect-tera-sparkle');
          sparkles.push(sparkle);
          this.time.delayedCall(900, () => sparkle.destroy());
        });
      };
      const sparkleSet = [
        {dx: -14, dy: -42, delay: 20, scale: 0.85},
        {dx: 18, dy: -48, delay: 80, scale: 1.05},
        {dx: -24, dy: -24, delay: 120, scale: 0.9},
        {dx: 26, dy: -18, delay: 180, scale: 0.95},
        {dx: -10, dy: -56, delay: 240, scale: 1.1},
        {dx: 6, dy: -34, delay: 300, scale: 0.88},
        {dx: -20, dy: -10, delay: 360, scale: 0.92},
        {dx: 22, dy: -36, delay: 430, scale: 1.0},
      ];

      try {
        this.tweens.killTweensOf(spr);
        if (options?.audioEnabled !== false) this.audio?.play?.('se/hit', 0.42);
        sparkleSet.forEach(cfg => spawnSparkle(cfg.dx, cfg.dy, cfg.delay, cfg.scale));
        spr.setTintFill(0xffffff);
        await Promise.all([
          this._runTween({
            targets: spr,
            scaleX: baseScaleX * 0.92,
            scaleY: baseScaleY * 0.92,
            duration: 220,
            ease: 'Cubic.easeIn',
          }),
          this._runTween({
            targets: teraSigil,
            alpha: 0.84,
            duration: 220,
            ease: 'Sine.easeOut',
          }),
          this._runTween({
            targets: aura,
            alpha: 0.7,
            scaleX: 1.45,
            scaleY: 1.45,
            duration: 220,
            ease: 'Sine.easeOut',
          }),
        ]);
        await Promise.all([
          this._runTween({
            targets: spr,
            scaleX: baseScaleX * 1.1,
            scaleY: baseScaleY * 1.1,
            duration: 220,
            ease: 'Cubic.easeOut',
          }),
          this._runTween({
            targets: teraSigil,
            alpha: 0.26,
            duration: 220,
            ease: 'Sine.easeInOut',
          }),
          this._runTween({
            targets: aura,
            alpha: 0.22,
            scaleX: 1.9,
            scaleY: 1.9,
            duration: 220,
            ease: 'Sine.easeOut',
          }),
        ]);
        spr.clearTint();
        await Promise.all([
          this._runTween({
            targets: spr,
            scaleX: baseScaleX,
            scaleY: baseScaleY,
            alpha: baseAlpha,
            duration: 200,
            ease: 'Sine.easeInOut',
          }),
          this._runTween({
            targets: teraSigil,
            alpha: 0,
            duration: 260,
            ease: 'Sine.easeIn',
          }),
          this._runTween({
            targets: aura,
            alpha: 0,
            duration: 260,
            ease: 'Sine.easeIn',
          }),
        ]);
      } finally {
        if (spr.active) {
          spr.clearTint();
          spr.setScale(baseScaleX, baseScaleY);
          spr.setAlpha(baseAlpha);
        }
        teraSigil?.destroy?.();
        aura?.destroy?.();
        sparkles.forEach(sparkle => sparkle?.destroy?.());
      }
    }

    async playDynamaxStart(side, options = {}) {
      const slot = Number(options?.slot) === 1 ? 1 : 0;
      const mount = this._mountForBattleSideSlot(side, slot);
      const spr = mount?.phaserSprite;
      if (!mount || !spr || !spr.active || !spr.visible) {
        this._setMountDynamaxState(mount, {
          dynamaxed: true,
          gigantamaxed: options?.gigantamaxed === true,
        });
        return;
      }

      const safePrev = this._dynamaxScaleMultiplier(mount) || 1;
      const baseScaleX = Number(spr.scaleX || 1) / safePrev;
      const baseScaleY = Number(spr.scaleY || 1) / safePrev;
      const prevBaseYOffset = this._dynamaxBaseYOffset(mount);
      const nextBaseYOffset = this._dynamaxBaseYOffsetForMountState(
        mount,
        true,
        options?.gigantamaxed === true,
      );
      const targetY = Number(spr.y || 0) + (nextBaseYOffset - prevBaseYOffset);
      const targetScaleX = baseScaleX * 2;
      const targetScaleY = baseScaleY * 2;
      const depth = Number.isFinite(spr.depth) ? spr.depth : 7;
      const baseAlpha = spr.alpha;
      const ring = this.add.ellipse(
        spr.x,
        spr.y - (spr.displayHeight * 0.44),
        Math.max(42, Math.round(spr.displayWidth * 0.95)),
        Math.max(22, Math.round(spr.displayHeight * 0.52)),
        options?.gigantamaxed === true ? 0xff9ad7 : 0xff6969,
        0,
      ).setDepth(depth + 1.7);
      const pulse = this.add.rectangle(
        spr.x,
        spr.y - (spr.displayHeight * 0.5),
        Math.max(36, Math.round(spr.displayWidth * 0.82)),
        Math.max(36, Math.round(spr.displayHeight * 0.88)),
        0xffffff,
        0,
      ).setOrigin(0.5, 0.5).setDepth(depth + 1.5);

      try {
        this.tweens.killTweensOf(spr);
        if (options?.audioEnabled !== false) this.audio?.play?.('se/hit', options?.gigantamaxed ? 0.56 : 0.48);
        spr.setTintFill(0xffffff);
        await Promise.all([
          this._runTween({
            targets: spr,
            scaleX: baseScaleX * 0.94,
            scaleY: baseScaleY * 0.94,
            duration: 180,
            ease: 'Cubic.easeIn',
          }),
          this._runTween({
            targets: ring,
            alpha: 0.58,
            scaleX: 1.38,
            scaleY: 1.38,
            duration: 180,
            ease: 'Sine.easeOut',
          }),
          this._runTween({
            targets: pulse,
            alpha: 0.42,
            duration: 180,
            ease: 'Sine.easeOut',
          }),
        ]);
        await Promise.all([
          this._runTween({
            targets: spr,
            scaleX: targetScaleX,
            scaleY: targetScaleY,
            y: targetY,
            duration: 260,
            ease: 'Cubic.easeOut',
          }),
          this._runTween({
            targets: ring,
            alpha: 0.15,
            scaleX: 1.88,
            scaleY: 1.88,
            duration: 260,
            ease: 'Sine.easeOut',
          }),
          this._runTween({
            targets: pulse,
            alpha: 0,
            duration: 260,
            ease: 'Sine.easeIn',
          }),
        ]);
      } finally {
        this._setMountDynamaxState(mount, {
          dynamaxed: true,
          gigantamaxed: options?.gigantamaxed === true,
        });
        if (spr.active) {
          spr.clearTint();
          spr.setAlpha(baseAlpha);
        }
        ring?.destroy?.();
        pulse?.destroy?.();
      }
    }

    async playDynamaxEnd(side, options = {}) {
      const slot = Number(options?.slot) === 1 ? 1 : 0;
      const mount = this._mountForBattleSideSlot(side, slot);
      const spr = mount?.phaserSprite;
      if (!mount || !spr || !spr.active || !spr.visible) {
        this._setMountDynamaxState(mount, { dynamaxed: false, gigantamaxed: false });
        return;
      }

      const safePrev = this._dynamaxScaleMultiplier(mount) || 2;
      const baseScaleX = Number(spr.scaleX || 1) / safePrev;
      const baseScaleY = Number(spr.scaleY || 1) / safePrev;
      const prevBaseYOffset = this._dynamaxBaseYOffset(mount);
      const nextBaseYOffset = this._dynamaxBaseYOffsetForMountState(mount, false, false);
      const targetY = Number(spr.y || 0) + (nextBaseYOffset - prevBaseYOffset);
      const startScaleX = baseScaleX * safePrev;
      const startScaleY = baseScaleY * safePrev;
      const depth = Number.isFinite(spr.depth) ? spr.depth : 7;
      const baseAlpha = spr.alpha;
      const fadeRing = this.add.ellipse(
        spr.x,
        spr.y - (spr.displayHeight * 0.42),
        Math.max(34, Math.round(spr.displayWidth * 0.76)),
        Math.max(18, Math.round(spr.displayHeight * 0.42)),
        options?.gigantamaxed === true ? 0xffb8dd : 0xffb7b7,
        0.22,
      ).setDepth(depth + 1.4);

      try {
        this.tweens.killTweensOf(spr);
        if (options?.audioEnabled !== false) this.audio?.play?.('se/hit_weak', 0.35);
        spr.setTintFill(0xffffff);
        await Promise.all([
          this._runTween({
            targets: spr,
            scaleX: startScaleX * 1.03,
            scaleY: startScaleY * 1.03,
            duration: 120,
            ease: 'Sine.easeOut',
          }),
          this._runTween({
            targets: fadeRing,
            alpha: 0.34,
            duration: 120,
            ease: 'Sine.easeOut',
          }),
        ]);
        await Promise.all([
          this._runTween({
            targets: spr,
            scaleX: baseScaleX,
            scaleY: baseScaleY,
            y: targetY,
            duration: 240,
            ease: 'Cubic.easeInOut',
          }),
          this._runTween({
            targets: fadeRing,
            alpha: 0,
            scaleX: 1.45,
            scaleY: 1.45,
            duration: 240,
            ease: 'Sine.easeIn',
          }),
        ]);
      } finally {
        this._setMountDynamaxState(mount, { dynamaxed: false, gigantamaxed: false });
        if (spr.active) {
          spr.clearTint();
          spr.setAlpha(baseAlpha);
        }
        fadeRing?.destroy?.();
      }
    }

    async playFormChange(side, options = {}) {
      const slot = Number(options?.slot) === 1 ? 1 : 0;
      const mount = this._mountForBattleSideSlot(side, slot);
      const spr = mount?.phaserSprite;
      if (!spr || !spr.active || !spr.visible) return;

      const baseScaleX = spr.scaleX;
      const baseScaleY = spr.scaleY;
      const baseAlpha = spr.alpha;
      const depth = Number.isFinite(spr.depth) ? spr.depth : 7;
      const camera = this.cameras?.main;
      const width = Math.max(320, Number(camera?.width) || 320);
      const height = Math.max(180, Number(camera?.height) || 180);
      const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0xffffff, 0)
        .setOrigin(0.5, 0.5)
        .setScrollFactor(0)
        .setDepth(80);
      const pulse = this.add.ellipse(
        spr.x,
        spr.y - (spr.displayHeight * 0.45),
        Math.max(36, Math.round(spr.displayWidth * 0.85)),
        Math.max(24, Math.round(spr.displayHeight * 0.55)),
        0xffffff,
        0,
      ).setDepth(depth + 2);

      try {
        this.tweens.killTweensOf(spr);
        if (options?.audioEnabled !== false) this.audio?.play?.('se/hit', options?.modal ? 0.55 : 0.45);
        spr.setTintFill(0xffffff);
        await Promise.all([
          this._runTween({
            targets: overlay,
            alpha: options?.modal ? 0.38 : 0.28,
            duration: 260,
            ease: 'Sine.easeOut',
          }),
          this._runTween({
            targets: spr,
            scaleX: baseScaleX * 0.84,
            scaleY: baseScaleY * 0.84,
            duration: 260,
            ease: 'Cubic.easeIn',
          }),
          this._runTween({
            targets: pulse,
            alpha: 0.65,
            scaleX: 1.35,
            scaleY: 1.35,
            duration: 260,
            ease: 'Sine.easeOut',
          }),
        ]);
        await Promise.all([
          this._runTween({
            targets: spr,
            scaleX: baseScaleX * 1.16,
            scaleY: baseScaleY * 1.16,
            duration: 260,
            ease: 'Cubic.easeOut',
          }),
          this._runTween({
            targets: overlay,
            alpha: 0.1,
            duration: 260,
            ease: 'Sine.easeInOut',
          }),
          this._runTween({
            targets: pulse,
            alpha: 0.2,
            scaleX: 1.75,
            scaleY: 1.75,
            duration: 260,
            ease: 'Sine.easeOut',
          }),
        ]);
        spr.clearTint();
        await Promise.all([
          this._runTween({
            targets: spr,
            scaleX: baseScaleX,
            scaleY: baseScaleY,
            alpha: baseAlpha,
            duration: 220,
            ease: 'Sine.easeInOut',
          }),
          this._runTween({
            targets: overlay,
            alpha: 0,
            duration: 320,
            ease: 'Sine.easeIn',
          }),
          this._runTween({
            targets: pulse,
            alpha: 0,
            duration: 320,
            ease: 'Sine.easeIn',
          }),
        ]);
      } finally {
        if (spr.active) {
          spr.clearTint();
          spr.setScale(baseScaleX, baseScaleY);
          spr.setAlpha(baseAlpha);
        }
        overlay?.destroy?.();
        pulse?.destroy?.();
      }
    }

    /**
     * BA-12: faint visual — slide battler downward, then hide.
     * Ported timing from PokeRogue faint-phase.ts (duration 500, Sine.easeIn).
     */
    async faintBattler(side, slot = 0) {
      const mount = this._mountForBattleSideSlot(side, slot);
      const spr = mount?.phaserSprite;
      if (!spr || !spr.active || !spr.visible) return;

      const startY = spr.y;
      const dropDistance = spr.displayHeight || 64;
      this.tweens.killTweensOf(spr);

      await new Promise(resolve => {
        this.tweens.add({
          targets: spr,
          duration: 500,
          y: startY + dropDistance,
          alpha: 0,
          ease: 'Sine.easeIn',
          onComplete: resolve,
          onStop: resolve,
        });
      });

      if (!spr.active) return;
      spr.setVisible(false);
      spr.setAlpha(1);
      spr.setY(startY);
      if (mount?.shadow) mount.shadow.setVisible(false);
      if (mount) mount.fainted = true;
      this._syncMountTeraFx(mount, 0);
    }

    /**
     * BA-13: switch-in visual — pokeball arc then battler fade-in.
     * Arc profile follows summon-phase.ts (x travel + y up/down chain).
     */
    async switchInBattler(side, fromBall = true, options = {}) {
      const audioEnabled = options?.audioEnabled !== false;
      const slot = Number(options?.slot) === 1 ? 1 : 0;
      const mount = this._mountForBattleSideSlot(side, slot);
      const spr = mount?.phaserSprite;
      if (!spr || !spr.active) return;

      // A new occupant takes the slot — clear the fainted guard so subsequent
      // sprite refreshes may expose the battler normally.
      mount.fainted = false;

      // Restore metric-aligned base transform before playing switch visuals.
      this._applyMountMetricsSnapshot(mount);
      spr.setAlpha(1);

      if (!fromBall) {
        spr.setVisible(true);
        spr.setAlpha(1);
        this._syncMountShadowVisibility(mount);
        this._syncMountTeraFx(mount, 0);
        return;
      }

      const pbKey = UI_ASSETS.pokeballAtlas.key;
      if (!this.textures.exists(pbKey)) {
        spr.setVisible(true);
        spr.setAlpha(1);
        this._syncMountShadowVisibility(mount);
        this._syncMountTeraFx(mount, 0);
        if (audioEnabled) this.audio?.play?.('se/pb_rel');
        return;
      }

      const isPlayerSide = mount?.name === 'player';
      const releaseX = spr.x;
      const releaseY = spr.y + (isPlayerSide ? -16 : 2);
      const startX = isPlayerSide ? 36 : 248;
      const startY = isPlayerSide ? 80 : 44;
      const peakY = releaseY - (isPlayerSide ? 62 : 52);

      const pokeball = this.add.sprite(startX, startY, pbKey, 'pb')
        .setOrigin(0.5, 0.625)
        .setDepth((spr.depth ?? 7) + 1);

      this.tweens.killTweensOf(spr);
      spr.setVisible(false);
      spr.setAlpha(0);
      if (mount?.shadow) mount.shadow.setVisible(false);

      const xTween = this.tweens.add({
        targets: pokeball,
        duration: 650,
        x: releaseX,
      });

      let completedArc = false;
      await new Promise(resolve => {
        this.tweens.add({
          targets: pokeball,
          duration: 150,
          ease: 'Cubic.easeOut',
          y: peakY,
          onComplete: () => {
            this.tweens.add({
              targets: pokeball,
              duration: 500,
              ease: 'Cubic.easeIn',
              angle: 1440,
              y: releaseY,
              onComplete: () => {
                completedArc = true;
                resolve();
              },
              onStop: resolve,
            });
          },
          onStop: resolve,
        });
      });

      if (xTween?.isPlaying()) xTween.stop();
      if (pokeball?.active) pokeball.destroy();

      if (!spr.active) return;
      spr.setVisible(true);

      if (!completedArc) {
        spr.setAlpha(1);
        this._syncMountShadowVisibility(mount);
        this._syncMountTeraFx(mount, 0);
        return;
      }

      const shadow = mount?.shadow;
      const fadeShadow = Boolean(
        shadow
        && ENABLE_BATTLER_SHADOWS
        && mount.name === 'enemy'
        && mount.shadowVisibleByMetrics
        && mount.currentUrl
        && !mount.fainted
      );
      if (fadeShadow) {
        shadow.setAlpha(0);
        shadow.setVisible(true);
      }

      if (audioEnabled) this.audio?.play?.('se/pb_rel');
      const fadePromises = [
        new Promise(resolve => {
          this.tweens.add({
            targets: spr,
            duration: 250,
            ease: 'Sine.easeIn',
            alpha: 1,
            onComplete: resolve,
            onStop: resolve,
          });
        }),
      ];
      if (fadeShadow) {
        fadePromises.push(new Promise(resolve => {
          this.tweens.add({
            targets: shadow,
            duration: 250,
            ease: 'Sine.easeIn',
            alpha: SHADOW_ALPHA,
            onComplete: resolve,
            onStop: resolve,
          });
        }));
      }
      await Promise.all(fadePromises);
      this._syncMountShadowVisibility(mount);
      this._syncMountTeraFx(mount, 0);
    }

    _resolveAnimEndpoints(userSide, targetSide, options = {}) {
      const normalizedUserSide = userSide === 'p2' ? 'p2' : 'p1';
      const normalizedTargetSide = targetSide === 'p1' || targetSide === 'p2'
        ? targetSide
        : (normalizedUserSide === 'p1' ? 'p2' : 'p1');
      const userSlot = Number(options?.userSlot) === 1 ? 1 : 0;
      const targetSlot = Number(options?.targetSlot) === 1 ? 1 : 0;
      const userMount = this._mountForBattleSideSlot(normalizedUserSide, userSlot)
        || this._mountForBattleSideSlot(normalizedUserSide, 0)
        || this._mountForBattleSide('p1')
        || this.playerSprite
        || this.enemySprite;
      const uSpr = userMount?.phaserSprite;
      if (!uSpr) return null;
      // Animation focus uses `displayHeight / 2` for vertical centering (matches
      // PokeRogue `battle-anims.ts`). Dynamax doubles displayHeight, pushing the
      // focus far above the battler and making moves "float up". Divide out the
      // dynamax multiplier so anim focus tracks the base-size center.
      const uDynaMult = this._dynamaxScaleMultiplier(userMount) || 1;
      const uDH = (uSpr.displayHeight || 64) / uDynaMult;
      const resolveMountAnimInfo = mount => {
        const sprite = mount?.phaserSprite;
        if (!sprite) return null;
        const dynaMult = this._dynamaxScaleMultiplier(mount) || 1;
        return {
          x: sprite.x,
          y: sprite.y,
          displayHeight: (sprite.displayHeight || 64) / dynaMult,
          sprite,
        };
      };
      let targetInfo = null;
      if (options?.targetSideCenter === true) {
        const sideMounts = (Array.isArray(this._mountsForBattleSide(normalizedTargetSide))
          ? this._mountsForBattleSide(normalizedTargetSide)
          : []
        ).filter(Boolean);
        const activeSprites = sideMounts
          .filter(mount => mount?.phaserSprite?.active && mount?.phaserSprite?.visible)
          .map(mount => {
            const spr = mount.phaserSprite;
            const dynaMult = this._dynamaxScaleMultiplier(mount) || 1;
            return {
              x: spr.x,
              y: spr.y,
              displayHeight: (spr.displayHeight || 64) / dynaMult,
            };
          });
        if (activeSprites.length >= 2) {
          const count = activeSprites.length;
          const avgX = activeSprites.reduce((sum, info) => sum + Number(info.x || 0), 0) / count;
          const avgY = activeSprites.reduce((sum, info) => sum + Number(info.y || 0), 0) / count;
          const avgDH = activeSprites.reduce((sum, info) => sum + Number(info.displayHeight || 64), 0) / count;
          targetInfo = {
            x: avgX,
            y: avgY,
            displayHeight: avgDH,
            sprite: null,
          };
        }
      }
      if (!targetInfo) {
        const targetMount = this._mountForBattleSideSlot(normalizedTargetSide, targetSlot)
          || this._mountForBattleSideSlot(normalizedTargetSide, 0)
          || this._mountForBattleSide('p2')
          || this.enemySprite
          || this.playerSprite;
        targetInfo = resolveMountAnimInfo(targetMount);
      }
      if (!targetInfo) return null;
      return {
        userInfo: {
          x: uSpr.x,
          y: uSpr.y,
          displayHeight: uDH,
          sprite: uSpr,
        },
        targetInfo,
      };
    }

    async playFieldAnim(animName, options = {}) {
      if (!this.animPlayer || !animName) return;
      const endpoints = this._resolveAnimEndpoints('p1', 'p2', {
        userSlot: options?.userSlot,
        targetSlot: options?.targetSlot,
      });
      if (!endpoints) return;
      await this.animPlayer.play(animName, endpoints.userInfo, endpoints.targetInfo, {
        audioEnabled: options?.audioEnabled !== false,
        scale: Number.isFinite(Number(options?.scale)) ? Number(options.scale) : 1,
        scaleGraphicsOnly: options?.scaleGraphicsOnly === true,
      });
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
    async playMoveAnim(moveName, actorSide, targetSide, options = {}) {
      if (!this.animPlayer || !moveName) return;
      const endpoints = this._resolveAnimEndpoints(actorSide, targetSide, {
        userSlot: options?.actorSlot,
        targetSlot: options?.targetSlot,
        targetSideCenter: options?.targetSideCenter === true,
      });
      if (!endpoints) return;
      const perspective = Number.isInteger(this.currentModel?.perspective)
        ? clamp(Number(this.currentModel.perspective), 0, 1)
        : 0;
      const localPlayerSide = perspective === 1 ? 'p2' : 'p1';
      const isAllyDirectedMove = (actorSide === 'p1' || actorSide === 'p2')
        && (targetSide === 'p1' || targetSide === 'p2')
        && actorSide === targetSide;
      const isOppAnim = (actorSide === 'p1' || actorSide === 'p2')
        ? (actorSide !== localPlayerSide && !isAllyDirectedMove)
        : false;
      const variantIndex = isOppAnim ? 1 : 0;
      await this.animPlayer.play(moveName, endpoints.userInfo, endpoints.targetInfo, {
        ...options,
        variantIndex,
        oppAnim: isOppAnim,
      });
    }

    async playMoveImpact(side, options = {}) {
      const slot = Number(options?.slot) === 1 ? 1 : 0;
      const mount = this._mountForBattleSideSlot(side, slot);
      const spr = mount?.phaserSprite;
      if (!spr || !spr.active || !spr.visible) return;
      const pulse = this.add.ellipse(
        spr.x,
        spr.y - (spr.displayHeight * 0.52),
        Math.max(24, Math.round(spr.displayWidth * 0.7)),
        Math.max(18, Math.round(spr.displayHeight * 0.38)),
        0xffffff,
        0,
      ).setDepth((spr.depth || 7) + 0.95);
      try {
        await this._runTween({
          targets: pulse,
          alpha: 0.5,
          scaleX: 1.15,
          scaleY: 1.15,
          duration: 90,
          ease: 'Sine.easeOut',
        });
        await this._runTween({
          targets: pulse,
          alpha: 0,
          scaleX: 1.45,
          scaleY: 1.45,
          duration: 140,
          ease: 'Sine.easeIn',
        });
      } finally {
        pulse?.destroy?.();
      }
    }

    async playStatStageEffect(side, options = {}) {
      const slot = Number(options?.slot) === 1 ? 1 : 0;
      const mount = this._mountForBattleSideSlot(side, slot);
      const spr = mount?.phaserSprite;
      if (!spr || !spr.active || !spr.visible) return;
      const atlasKey = env.UI_ASSETS.effectBattleStats?.key;
      if (!atlasKey) return;
      if (!textureExists(this, atlasKey)) return;

      const rising = options?.rising !== false;
      const frame = rising ? 'atk' : 'spd';
      if (!textureExists(this, atlasKey, frame)) return;

      const tileWidth = Math.max(44, Math.round(spr.displayWidth * 1.22));
      const tileHeight = Math.max(60, Math.round(spr.displayHeight * 1.56));
      const statSprite = this.add.tileSprite(spr.x, spr.y, tileWidth, tileHeight, atlasKey, frame)
        .setOrigin(0.5, 1)
        .setDepth((spr.depth || 7) + 1.2)
        .setAlpha(0)
        .setScale(1.5);

      let mask = null;
      try {
        mask = spr.createBitmapMask();
        if (mask) statSprite.setMask(mask);
      } catch (_error) {}

      const riseDistance = Math.max(72, Math.round(spr.displayHeight * 0.84));
      const endY = spr.y + (rising ? -riseDistance : riseDistance);
      await Promise.all([
        this._runTween({
          targets: statSprite,
          duration: 240,
          ease: 'Sine.easeOut',
          alpha: 0.84,
        }).then(() => this._runTween({
          targets: statSprite,
          delay: 1000,
          duration: 240,
          ease: 'Sine.easeIn',
          alpha: 0,
        })),
        this._runTween({
          targets: statSprite,
          duration: 1500,
          ease: 'Sine.easeInOut',
          y: endY,
        }),
      ]);

      try { statSprite.destroy(); } catch (_error) {}
      try { mask?.destroy?.(); } catch (_error) {}
    }
  };
}
