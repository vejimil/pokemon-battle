/**
 * BattleAnimPlayer — Plays PokeRogue-compatible move animation graphics in the Phaser scene.
 *
 * Ported from: pokerogue_codes/src/data/battle-anims.ts > BattleAnim.play()
 *
 * Coordinate system (320×180 logical canvas):
 *   GRAPHIC frames are positioned relative to focus points:
 *     AnimFocus.TARGET (1)      → relative to target battler position
 *     AnimFocus.USER   (2)      → relative to user battler position
 *     AnimFocus.USER_TARGET (3) → interpolated along user→target axis
 *
 * Phase 2: GRAPHIC + USER/TARGET battler-copy overlays.
 *   USER/TARGET behavior transplanted from battle-anims.ts lines 944-983.
 *
 * AnimFrameTarget (from PokeRogue enum, move-anims-common.ts):
 *   USER = 0, TARGET = 1, GRAPHIC = 2
 *
 * AnimFocus (from PokeRogue enum):
 *   TARGET = 1, USER = 2, USER_TARGET = 3, SCREEN = 4
 *
 * AnimBlendType:
 *   NORMAL = 0, ADD = 1, SUBTRACT = 2
 */

// AnimFrameTarget enum values
const FT_USER    = 0;
const FT_TARGET  = 1;
const FT_GRAPHIC = 2;

// AnimFocus enum values
const AF_TARGET      = 1;
const AF_USER        = 2;
const AF_USER_TARGET = 3;
const AF_SCREEN      = 4;

// AnimBlendType
const AB_NORMAL   = 0;
const AB_ADD      = 1;
// AB_SUBTRACT = 2 → Phaser DIFFERENCE

// 30fps (PokeRogue: getFrameMs(3) = 1000/30 ≈ 33.33ms per frame)
const FRAME_MS = 1000 / 30;

// USER/TARGET battler-copy frames are required by many original animations
// (e.g. Protect, Endure, Body Press, Psychic, weather/terrain common effects).
const ENABLE_BATTLER_COPY_PHASE2 = true;

// PokeRogue hardcoded focus reference points (logical 320×180 space).
// Derived from: userFocusX/Y and targetFocusX/Y in battle-anims.ts lines 669-672.
const USER_FOCUS_X   = 106;
const USER_FOCUS_Y   = 116;   // 148 - 32
const TARGET_FOCUS_X = 234;
const TARGET_FOCUS_Y = 52;    // 84 - 32

// Optional baseline offsets for USER/TARGET copy frames.
// `NO_GRAPHIC` helps purely USER/TARGET animations (graphic='') keep a natural position.
const BATTLER_COPY_BASE_OFFSET_X = 0;
const BATTLER_COPY_BASE_OFFSET_Y = 0;
const BATTLER_COPY_NO_GRAPHIC_OFFSET_X = 0;
const BATTLER_COPY_NO_GRAPHIC_OFFSET_Y = 0;

export class BattleAnimPlayer {
  /**
   * @param {Phaser.Scene} scene — the Phaser battle scene
   */
  constructor(scene) {
    this.scene = scene;
    this._animCache   = new Map();   // slug → anim config (or null if missing)
    this._texLoaded   = new Set();   // graphic keys already loaded
    this._texLoading  = new Map();   // graphic key → Promise (in-flight)
    this._bgTexLoaded  = new Set();  // background texture keys for timed bg events
    this._bgTexLoading = new Map();  // background texture key → Promise
    // Bug fix: track the cancel function of the currently running animation.
    // Calling it destroys all pool sprites and resolves the Promise immediately.
    this._activeCancel = null;
  }

  /**
   * Play the visual animation for a move.
   * Cancels any previous animation still running before starting the new one.
   * @param {string} moveName        — Showdown display name (e.g. 'Flamethrower')
   * @param {{ x:number, y:number, displayHeight:number, sprite?:Phaser.GameObjects.Image }} userInfo
   * @param {{ x:number, y:number, displayHeight:number, sprite?:Phaser.GameObjects.Image }} targetInfo
   * @param {{ audioEnabled?: boolean, scale?: number, tint?: number|null }} [options]
   * @returns {Promise<void>} resolves when animation finishes (or immediately on error)
   */
  async play(moveName, userInfo, targetInfo, options = {}) {
    // Cancel any animation still running from a previous call — prevents sprite accumulation.
    if (this._activeCancel) {
      this._activeCancel();
      this._activeCancel = null;
    }

    if (!moveName || !userInfo || !targetInfo) return;
    const slug = moveName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+$/, '');

    const anim = await this._loadAnim(slug);
    if (!anim) return;

    const hasGraphicFrames = anim.frames.some(spriteFrames =>
      Array.isArray(spriteFrames) && spriteFrames.some(frame => frame?.target === FT_GRAPHIC),
    );
    const texKey = anim.graphic ? `pkb-ba/${anim.graphic}` : '';
    if (anim.graphic) {
      await this._ensureGraphicLoaded(anim.graphic);
    }
    if (hasGraphicFrames && (!texKey || !this.scene.textures.exists(texKey))) return;

    const bgResources = this._collectBgResourceNames(anim);
    if (bgResources.length) {
      await Promise.all(bgResources.map(resourceName => this._ensureBgLoaded(resourceName)));
    }

    return new Promise(resolve => {
      const cancel = this._runAnim(anim, texKey || null, userInfo, targetInfo, {
        audioEnabled: options.audioEnabled !== false,
        scale: Number.isFinite(Number(options.scale)) ? Number(options.scale) : 1,
        tint: Number.isFinite(Number(options.tint)) ? Number(options.tint) : null,
      }, () => {
        // Clear our cancel handle when the animation finishes normally.
        if (this._activeCancel === cancel) this._activeCancel = null;
        resolve();
      });
      this._activeCancel = cancel;
    });
  }

  // ─────────────────────────────────────────────────── asset loading ─────

  /** Fetch and parse anim-data JSON for the given move slug. */
  async _loadAnim(slug) {
    if (this._animCache.has(slug)) return this._animCache.get(slug);
    this._animCache.set(slug, null);
    try {
      const res = await fetch(`./assets/pokerogue/anim-data/${slug}.json`);
      if (!res.ok) return null;
      const data = await res.json();
      const raw = Array.isArray(data) ? data[0] : data;
      if (!raw?.frames?.length) return null;

      // Build frameTimedEvents as Map<frameIndex, event[]>
      const fte = new Map();
      if (raw.frameTimedEvents && typeof raw.frameTimedEvents === 'object') {
        for (const [k, v] of Object.entries(raw.frameTimedEvents)) {
          fte.set(Number(k), Array.isArray(v) ? v : [v]);
        }
      }

      const config = { graphic: String(raw.graphic || '').trim(), frames: raw.frames, fte };
      this._animCache.set(slug, config);
      return config;
    } catch {
      return null;
    }
  }

  /**
   * Load the battle__anims PNG as a Phaser spritesheet (96×96 frames).
   * Idempotent — safe to call multiple times for the same graphic.
   */
  _ensureGraphicLoaded(graphic) {
    if (!graphic) return Promise.resolve();
    const key = `pkb-ba/${graphic}`;
    if (this._texLoaded.has(key) || this.scene.textures.exists(key)) {
      this._texLoaded.add(key);
      return Promise.resolve();
    }
    if (this._texLoading.has(key)) return this._texLoading.get(key);

    const p = new Promise(resolve => {
      // Encode the filename for the URL (handles spaces and special chars)
      const filename = encodeURIComponent(graphic) + '.png';
      const url = `./assets/pokerogue/battle__anims/${filename}`;
      this.scene.load.spritesheet(key, url, { frameWidth: 96, frameHeight: 96 });
      this.scene.load.once('complete', () => {
        this._texLoaded.add(key);
        this._texLoading.delete(key);
        resolve();
      });
      this.scene.load.once('loaderror', () => {
        this._texLoading.delete(key);
        resolve();  // silent fallback — anim player will no-op
      });
      this.scene.load.start();
    });
    this._texLoading.set(key, p);
    return p;
  }

  _bgTextureKey(resourceName) {
    return `pkb-ba-bg/${resourceName}`;
  }

  _collectBgResourceNames(anim) {
    if (!anim?.fte || !(anim.fte instanceof Map)) return [];
    const out = new Set();
    for (const events of anim.fte.values()) {
      for (const ev of events || []) {
        if (ev?.eventType !== 'AnimTimedAddBgEvent') continue;
        const name = String(ev.resourceName || '').trim();
        if (name) out.add(name);
      }
    }
    return Array.from(out);
  }

  _ensureBgLoaded(resourceName) {
    const name = String(resourceName || '').trim();
    if (!name) return Promise.resolve();
    const key = this._bgTextureKey(name);
    if (this._bgTexLoaded.has(key) || this.scene.textures.exists(key)) {
      this._bgTexLoaded.add(key);
      return Promise.resolve();
    }
    if (this._bgTexLoading.has(key)) return this._bgTexLoading.get(key);

    const p = new Promise(resolve => {
      const filename = encodeURIComponent(name) + '.png';
      const url = `./assets/pokerogue/battle__anims/${filename}`;
      this.scene.load.image(key, url);
      this.scene.load.once('complete', () => {
        this._bgTexLoaded.add(key);
        this._bgTexLoading.delete(key);
        resolve();
      });
      this.scene.load.once('loaderror', () => {
        this._bgTexLoading.delete(key);
        resolve();
      });
      this.scene.load.start();
    });
    this._bgTexLoading.set(key, p);
    return p;
  }

  // ──────────────────────────────────────────────────── animation core ───

  /**
   * Execute the frame loop using Phaser's `time.delayedCall` for 33ms pacing.
   * Renders GRAPHIC + USER/TARGET battler-copy elements (Phase 2).
   *
   * Returns a cancel function — calling it immediately destroys all sprites and
   * resolves the callback. Used by play() to cancel in-flight animations.
   * @returns {function} cancel — call to abort animation and free resources
   */
  _runAnim(anim, texKey, userInfo, targetInfo, options, callback) {
    const frames = anim.frames;
    const frameCount = frames.length;
    if (!frameCount) { callback(); return () => {}; }
    const audioEnabled = options?.audioEnabled !== false;
    const scaleMultiplier = Number.isFinite(options?.scale) && Number(options.scale) > 0
      ? Number(options.scale)
      : 1;
    const globalTint = Number.isFinite(Number(options?.tint)) ? Number(options.tint) : null;

    const uX = userInfo.x,   uY = userInfo.y,   uH = userInfo.displayHeight ?? 64;
    const tX = targetInfo.x, tY = targetInfo.y, tH = targetInfo.displayHeight ?? 64;
    const uSrc = userInfo.sprite ?? null;
    const tSrc = targetInfo.sprite ?? null;
    const srcLine = [USER_FOCUS_X, USER_FOCUS_Y, TARGET_FOCUS_X, TARGET_FOCUS_Y];
    const dstLine = [uX, uY, tX, tY];

    const graphicPool = [];
    const userPool = [];
    const targetPool = [];
    const prevUserVisible = uSrc?.visible ?? true;
    const prevTargetVisible = tSrc?.visible ?? true;
    const hasBattlerFrames = ENABLE_BATTLER_COPY_PHASE2 && frames.some(spriteFrames =>
      Array.isArray(spriteFrames) && spriteFrames.some(frame => frame?.target === FT_USER || frame?.target === FT_TARGET)
    );
    const hasGraphicFrames = frames.some(spriteFrames =>
      Array.isArray(spriteFrames) && spriteFrames.some(frame => frame?.target === FT_GRAPHIC)
    );
    const bgLayerRef = { value: null };
    let extraFrames = 0;
    let destroyed = false;

    const cleanUp = () => {
      if (destroyed) return;
      destroyed = true;
      for (const spr of [...graphicPool, ...userPool, ...targetPool]) {
        try { spr.destroy(); } catch {}
      }
      graphicPool.length = 0;
      userPool.length = 0;
      targetPool.length = 0;
      if (hasBattlerFrames) {
        try { if (uSrc?.active) uSrc.setVisible(prevUserVisible); } catch {}
        try { if (tSrc?.active) tSrc.setVisible(prevTargetVisible); } catch {}
      }
      try { bgLayerRef.value?.destroy?.(); } catch {}
      bgLayerRef.value = null;
      callback();
    };

    let f = 0;

    const tick = () => {
      if (destroyed) return;
      if (f >= frameCount) { cleanUp(); return; }

      if (!f && hasBattlerFrames) {
        try { if (uSrc?.active) uSrc.setVisible(false); } catch {}
        try { if (tSrc?.active) tSrc.setVisible(false); } catch {}
      }

      const spriteFrames = frames[f] || [];
      let u = 0;
      let t = 0;
      let g = 0;

      for (const frame of spriteFrames) {
        const frameData = this._computeFrameData(frame, uX, uY, uH, tX, tY, tH, srcLine, dstLine);
        if (frame.target === FT_GRAPHIC) {
          if (!texKey) continue;
          if (g >= graphicPool.length) {
            const spr = this.scene.add.sprite(0, 0, texKey, 0);
            spr.setDepth(12);  // above battlers (6-7), below UI (30+)
            graphicPool.push(spr);
          }
          const spr = graphicPool[g++];

          // Position in scene coordinates
          spr.setPosition(frameData.x, frameData.y);

          // Frame of the spritesheet
          const frameIdx = frame.graphicFrame ?? 0;
          try { spr.setFrame(frameIdx); } catch {}

          // Transform
          spr.setScale(frameData.scaleX * scaleMultiplier, frameData.scaleY * scaleMultiplier);
          spr.setAngle(frameData.angle);
          spr.setAlpha((frame.opacity ?? 255) / 255);
          spr.setVisible(frame.visible !== false);
          this._setBlendMode(spr, frame.blendType ?? AB_NORMAL);
          this._applyToneAndColor(spr, frame, globalTint);
          if (Number.isFinite(frame.priority)) {
            spr.setDepth(this._resolvePriorityDepth(frame.priority, frame, bgLayerRef));
          }
          continue;
        }

        const isUser = frame.target === FT_USER;
        const isTarget = frame.target === FT_TARGET;
        if (!isUser && !isTarget) continue;
        if (!ENABLE_BATTLER_COPY_PHASE2) continue;
        if (isUser && uSrc === tSrc) continue;

        const srcSprite = isUser ? uSrc : tSrc;
        if (!srcSprite || !srcSprite.active) continue;

        const pool = isUser ? userPool : targetPool;
        const spriteIndex = isUser ? u++ : t++;
        if (spriteIndex >= pool.length) {
          const copy = this.scene.add.image(0, 0, srcSprite.texture.key, srcSprite.frame?.name);
          copy.setOrigin(0.5, 0.5);
          copy.setDepth(srcSprite.depth ?? 7);
          pool.push(copy);
        }
        const copySprite = pool[spriteIndex];

        this._syncBattlerCopyTexture(copySprite, srcSprite);
        const sourceScaleX = Number.isFinite(srcSprite.scaleX) ? srcSprite.scaleX : 1;
        const sourceScaleY = Number.isFinite(srcSprite.scaleY) ? srcSprite.scaleY : 1;
        const parentScaleY = Number.isFinite(srcSprite.parentContainer?.scaleY)
          ? Number(srcSprite.parentContainer.scaleY)
          : null;
        const sourceScale = Number.isFinite(parentScaleY) && parentScaleY !== 0
          ? Math.abs(parentScaleY)
          : Math.abs(sourceScaleY);
        const absSourceScaleY = Math.abs(sourceScaleY) || 1;
        const sourceHeight = Number.isFinite(srcSprite.height) && srcSprite.height > 0
          ? srcSprite.height
          : (srcSprite.displayHeight ?? 64) / absSourceScaleY;
        const baseOffsetX = hasGraphicFrames ? BATTLER_COPY_BASE_OFFSET_X : BATTLER_COPY_NO_GRAPHIC_OFFSET_X;
        const baseOffsetY = hasGraphicFrames ? BATTLER_COPY_BASE_OFFSET_Y : BATTLER_COPY_NO_GRAPHIC_OFFSET_Y;

        // Keep source-scale correction from PokeRogue's BattleAnim.play (line 992).
        copySprite.setPosition(
          frameData.x + baseOffsetX,
          frameData.y - (sourceHeight / 2) * (sourceScale - 1) + baseOffsetY
        );
        copySprite.setAngle(frameData.angle);
        const orientedScaleX = Math.sign(sourceScaleX) * sourceScale;
        copySprite.setScale(
          frameData.scaleX * orientedScaleX * scaleMultiplier,
          frameData.scaleY * sourceScale * scaleMultiplier
        );
        copySprite.setAlpha((frame.opacity ?? 255) / 255);
        // Source battlers are intentionally hidden during USER/TARGET overlay frames.
        // Do not gate overlay visibility on source visibility, or the battler vanishes.
        copySprite.setVisible(frame.visible !== false);
        this._setBlendMode(copySprite, frame.blendType ?? AB_NORMAL);
        this._applyToneAndColor(copySprite, frame, globalTint);
        if (Number.isFinite(frame.priority)) {
          copySprite.setDepth(this._resolvePriorityDepth(frame.priority, frame, bgLayerRef));
        }
      }

      // Hide any pool sprites not used in this frame.
      for (let i = g; i < graphicPool.length; i++) graphicPool[i].setVisible(false);
      for (let i = u; i < userPool.length; i++) userPool[i].setVisible(false);
      for (let i = t; i < targetPool.length; i++) targetPool[i].setVisible(false);

      // Timed events at this frame index
      const fte = anim.fte.get(f);
      if (fte) {
        for (const ev of fte) {
          const extra = this._fireTimedEvent(ev, { audioEnabled, bgLayerRef });
          if (extra > extraFrames) extraFrames = extra;
        }
      }

      f++;
      if (f < frameCount) {
        this.scene.time.delayedCall(FRAME_MS, tick);
      } else {
        // Keep tail long enough for timed BG updates (original returns duration*2 frames).
        const tailMs = FRAME_MS * (0.5 + Math.max(0, extraFrames));
        this.scene.time.delayedCall(tailMs, cleanUp);
      }
    };

    tick();  // start frame 0 immediately
    return cleanUp;  // expose as cancel handle
  }

  // ──────────────────────────────────────────────── coordinate transform ─

  /**
   * Compute frame data in scene coordinates.
   * Ported from getGraphicFrameData() in battle-anims.ts lines 789-834.
   */
  _computeFrameData(frame, uX, uY, uH, tX, tY, tH, srcLine, dstLine) {
    let x = (frame.x ?? 0) + USER_FOCUS_X;
    let y = (frame.y ?? 0) + USER_FOCUS_Y;
    let scaleX = ((frame.zoomX ?? 100) / 100) * (frame.mirror ? -1 : 1);
    const scaleY = (frame.zoomY ?? 100) / 100;
    const focus = Number.isFinite(Number(frame.focus)) ? Number(frame.focus) : AF_TARGET;

    switch (focus) {
      case 0:
      case AF_TARGET:
        x += tX - TARGET_FOCUS_X;
        y += tY - (tH / 2) - TARGET_FOCUS_Y;
        break;
      case AF_USER:
        x += uX - USER_FOCUS_X;
        y += uY - (uH / 2) - USER_FOCUS_Y;
        break;
      case AF_USER_TARGET: {
        // Bilinear transform: maps (x,y) from src coordinate line to actual battler line.
        // See transformPoint / yAxisIntersect / repositionY in battle-anims.ts.
        const pt = this._transformPoint(
          srcLine[0], srcLine[1], srcLine[2], srcLine[3],
          dstLine[0], dstLine[1] - uH / 2,
          dstLine[2], dstLine[3] - tH / 2,
          x, y
        );
        x = pt[0];
        y = pt[1];
        if (frame.target === FT_GRAPHIC && this._isReversed(srcLine[0], srcLine[2], dstLine[0], dstLine[2])) {
          scaleX *= -1;
        }
        break;
      }
      case AF_SCREEN:
        // Screen focus uses absolute logical coordinates (320x180 space).
        break;
      default:
        break;
    }
    return { x, y, scaleX, scaleY, angle: -(frame.angle ?? 0) };
  }

  // Ports transformPoint / yAxisIntersect / repositionY from battle-anims.ts lines 674-721.

  _transformPoint(x1, y1, x2, y2, x3, y3, x4, y4, px, py) {
    const [tx, ty] = this._yAxisIntersect(x1, y1, x2, y2, px, py);
    return this._repositionY(x3, y3, x4, y4, tx, ty);
  }

  _yAxisIntersect(x1, y1, x2, y2, px, py) {
    const dx = x2 - x1, dy = y2 - y1;
    return [dx === 0 ? 0 : (px - x1) / dx, dy === 0 ? 0 : (py - y1) / dy];
  }

  _repositionY(x1, y1, x2, y2, tx, ty) {
    return [x1 + tx * (x2 - x1), y1 + ty * (y2 - y1)];
  }

  _isReversed(src1, src2, dst1, dst2) {
    if (src1 === src2) return false;
    if (src1 < src2) return dst1 > dst2;
    return dst1 < dst2;
  }

  _syncBattlerCopyTexture(copy, source) {
    if (!copy || !source?.texture) return;
    const key = source.texture.key;
    const frameName = source.frame?.name;
    if (!key || !this.scene.textures.exists(key)) return;
    try {
      if (frameName !== undefined && frameName !== null) {
        copy.setTexture(key, frameName);
      } else {
        copy.setTexture(key);
      }
    } catch {}
    // Original BattleAnim copy sprites use default sprite origin (center).
    copy.setOrigin(0.5, 0.5);
    copy.setDepth(source.depth ?? copy.depth);
  }

  _applyToneAndColor(sprite, frame, globalTint = null) {
    if (!sprite || !frame) return;
    const color = Array.isArray(frame.color) ? frame.color : null;
    const tone = Array.isArray(frame.tone) ? frame.tone : null;
    const hasColor = color && Number(color[3] || 0) > 0;
    const hasTone = tone && (Number(tone[0] || 0) !== 0 || Number(tone[1] || 0) !== 0 || Number(tone[2] || 0) !== 0);
    const hasGlobalTint = Number.isFinite(Number(globalTint));
    if (!hasColor && !hasTone && !hasGlobalTint) {
      sprite.clearTint?.();
      return;
    }
    const clamp = value => Math.max(0, Math.min(255, Math.round(value)));
    let r = 255, g = 255, b = 255;
    if (hasColor) {
      r = clamp(color[0]);
      g = clamp(color[1]);
      b = clamp(color[2]);
    }
    if (hasTone) {
      r = clamp(r + Number(tone[0] || 0));
      g = clamp(g + Number(tone[1] || 0));
      b = clamp(b + Number(tone[2] || 0));
    }
    if (hasGlobalTint) {
      const gr = (Number(globalTint) >> 16) & 0xff;
      const gg = (Number(globalTint) >> 8) & 0xff;
      const gb = Number(globalTint) & 0xff;
      const mix = 0.45;
      r = clamp((r * (1 - mix)) + (gr * mix));
      g = clamp((g * (1 - mix)) + (gg * mix));
      b = clamp((b * (1 - mix)) + (gb * mix));
    }
    sprite.setTint?.((r << 16) | (g << 8) | b);
  }

  _setBlendMode(sprite, blend) {
    sprite.setBlendMode(
      blend === AB_ADD ? 1  :   // Phaser.BlendModes.ADD = 1
      blend === 2      ? 11 :   // Phaser.BlendModes.DIFFERENCE = 11
      0                         // Phaser.BlendModes.NORMAL = 0
    );
  }

  _resolvePriorityDepth(priority, frame = {}, bgLayerRef = null) {
    const n = Number(priority);
    const battlerTopDepth = 7;
    if (!Number.isFinite(n)) return battlerTopDepth + 2;
    if (n <= 1) return battlerTopDepth + 2;
    if (n === 2) {
      const bgDepth = Number(bgLayerRef?.value?.depth);
      if (Number.isFinite(bgDepth)) return bgDepth + 0.2;
      if (frame.focus === AF_USER || frame.focus === AF_TARGET) return battlerTopDepth - 1;
      return 1;
    }
    if (n === 3) {
      if (frame.focus === AF_USER || frame.focus === AF_TARGET) return battlerTopDepth - 0.2;
      return battlerTopDepth + 2;
    }
    return battlerTopDepth + 2;
  }

  // ─────────────────────────────────────────────────── timed sound events ─

  _fireTimedEvent(ev, context = {}) {
    if (!ev || typeof ev !== 'object') return 0;
    const eventType = String(ev.eventType || '');
    if (eventType === 'AnimTimedSoundEvent') {
      this._fireSoundEvent(ev, context.audioEnabled !== false);
      return 0;
    }
    if (eventType === 'AnimTimedAddBgEvent') {
      return this._fireAddBgEvent(ev, context);
    }
    if (eventType === 'AnimTimedUpdateBgEvent') {
      return this._fireUpdateBgEvent(ev, context);
    }
    return 0;
  }

  _fireAddBgEvent(ev, context = {}) {
    const bgLayerRef = context?.bgLayerRef;
    if (!bgLayerRef) return 0;

    try { bgLayerRef.value?.destroy?.(); } catch {}
    bgLayerRef.value = null;

    const width = Number(this.scene.scale?.width) || 320;
    const height = Number(this.scene.scale?.height) || 180;
    const resourceName = String(ev.resourceName || '').trim();
    const opacity = Math.max(0, Math.min(255, Number(ev.opacity) || 0)) / 255;
    const duration = Math.max(0, Number(ev.duration) || 0);
    const bgX = Number(ev.bgX) || 0;
    const bgY = Number(ev.bgY) || 0;

    let layer = null;
    if (resourceName) {
      const bgKey = this._bgTextureKey(resourceName);
      if (this.scene.textures.exists(bgKey)) {
        layer = this.scene.add.tileSprite(width / 2, height / 2, width + 120, height + 80, bgKey);
        layer.setOrigin(0.5, 0.5);
        layer.tilePositionX = bgX;
        layer.tilePositionY = bgY;
      }
    }
    if (!layer) {
      layer = this.scene.add.rectangle(width / 2, height / 2, width + 120, height + 80, 0xffffff, opacity);
    } else {
      layer.setAlpha(opacity);
    }
    layer.setDepth(3);
    bgLayerRef.value = layer;

    if (duration > 0) {
      this.scene.tweens.add({
        targets: layer,
        duration: duration * 100,
      });
    }
    return duration * 2;
  }

  _fireUpdateBgEvent(ev, context = {}) {
    const bgLayerRef = context?.bgLayerRef;
    const layer = bgLayerRef?.value;
    const duration = Math.max(0, Number(ev.duration) || 0);
    if (!layer) return duration * 2;

    const tweenProps = {};
    if (Number.isFinite(Number(ev.opacity))) {
      tweenProps.alpha = Math.max(0, Math.min(255, Number(ev.opacity))) / 255;
    }
    if ('tilePositionX' in layer && Number.isFinite(Number(ev.bgX))) {
      tweenProps.tilePositionX = Number(ev.bgX);
    }
    if ('tilePositionY' in layer && Number.isFinite(Number(ev.bgY))) {
      tweenProps.tilePositionY = Number(ev.bgY);
    }
    if (Object.keys(tweenProps).length) {
      this.scene.tweens.add({
        targets: layer,
        duration: Math.max(1, duration * 100),
        ...tweenProps,
      });
    }
    return duration * 2;
  }

  /**
   * Fire an AnimTimedSoundEvent: lazy-load the audio file if needed, then play.
   * Mirrors AnimTimedSoundEvent.execute() in battle-anims.ts lines 291-309.
   */
  _fireSoundEvent(ev, audioEnabled = true) {
    if (!audioEnabled) return;
    if (ev.eventType !== 'AnimTimedSoundEvent' || !ev.resourceName) return;
    const audio = this.scene.audio;
    if (!audio) return;
    const key     = `battle_anims/${ev.resourceName}`;
    const volMult = (ev.volume ?? 100) / 100;

    if (this.scene.cache.audio.has(key)) {
      try { audio.play(key, volMult); } catch {}
      return;
    }
    // Lazy-load: plays when ready. Non-blocking — frame continues while loading.
    const url = `./assets/pokerogue/audio/battle_anims/${ev.resourceName}`;
    this.scene.load.audio(key, url);
    this.scene.load.once('complete', () => {
      try { audio.play(key, volMult); } catch {}
    });
    try { this.scene.load.start(); } catch {}
  }
}
