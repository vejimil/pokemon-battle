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
// AF_SCREEN = 4 not used

// AnimBlendType
const AB_NORMAL   = 0;
const AB_ADD      = 1;
// AB_SUBTRACT = 2 → Phaser DIFFERENCE

// 30fps (PokeRogue: getFrameMs(3) = 1000/30 ≈ 33.33ms per frame)
const FRAME_MS = 1000 / 30;

// Sprint 6 hotfix:
// Temporarily disable USER/TARGET battler-copy motion frames.
// Keep GRAPHIC-only move animations until the original behavior is re-reviewed.
const ENABLE_BATTLER_COPY_PHASE2 = false;

// PokeRogue hardcoded focus reference points (logical 320×180 space).
// Derived from: userFocusX/Y and targetFocusX/Y in battle-anims.ts lines 669-672.
const USER_FOCUS_X   = 106;
const USER_FOCUS_Y   = 116;   // 148 - 32
const TARGET_FOCUS_X = 234;
const TARGET_FOCUS_Y = 52;    // 84 - 32

export class BattleAnimPlayer {
  /**
   * @param {Phaser.Scene} scene — the Phaser battle scene
   */
  constructor(scene) {
    this.scene = scene;
    this._animCache   = new Map();   // slug → anim config (or null if missing)
    this._texLoaded   = new Set();   // graphic keys already loaded
    this._texLoading  = new Map();   // graphic key → Promise (in-flight)
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
   * @param {{ audioEnabled?: boolean }} [options]
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

    await this._ensureGraphicLoaded(anim.graphic);

    const texKey = `pkb-ba/${anim.graphic}`;
    if (!this.scene.textures.exists(texKey)) return;  // load failed silently

    return new Promise(resolve => {
      const cancel = this._runAnim(anim, texKey, userInfo, targetInfo, {
        audioEnabled: options.audioEnabled !== false,
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
      if (!raw?.frames?.length || !raw.graphic) return null;

      // Build frameTimedEvents as Map<frameIndex, event[]>
      const fte = new Map();
      if (raw.frameTimedEvents && typeof raw.frameTimedEvents === 'object') {
        for (const [k, v] of Object.entries(raw.frameTimedEvents)) {
          fte.set(Number(k), Array.isArray(v) ? v : [v]);
        }
      }

      const config = { graphic: raw.graphic, frames: raw.frames, fte };
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
          spr.setScale(frameData.scaleX, frameData.scaleY);
          spr.setAngle(frameData.angle);
          spr.setAlpha((frame.opacity ?? 255) / 255);
          spr.setVisible(frame.visible !== false);
          this._setBlendMode(spr, frame.blendType ?? AB_NORMAL);
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
          copy.setOrigin(srcSprite.originX ?? 0.5, srcSprite.originY ?? 1);
          copy.setDepth(srcSprite.depth ?? 7);
          pool.push(copy);
        }
        const copySprite = pool[spriteIndex];

        this._syncBattlerCopyTexture(copySprite, srcSprite);
        const sourceScaleX = Number.isFinite(srcSprite.scaleX) ? srcSprite.scaleX : 1;
        const sourceScaleY = Number.isFinite(srcSprite.scaleY) ? srcSprite.scaleY : sourceScaleX;
        const absSourceScaleY = Math.abs(sourceScaleY) || 1;
        const sourceHeight = Number.isFinite(srcSprite.height) && srcSprite.height > 0
          ? srcSprite.height
          : (srcSprite.displayHeight ?? 64) / absSourceScaleY;

        // Keep source-scale correction from PokeRogue's BattleAnim.play (line 992).
        copySprite.setPosition(
          frameData.x,
          frameData.y - (sourceHeight / 2) * (absSourceScaleY - 1)
        );
        copySprite.setAngle(frameData.angle);
        copySprite.setScale(
          frameData.scaleX * sourceScaleX,
          frameData.scaleY * sourceScaleY
        );
        copySprite.setAlpha((frame.opacity ?? 255) / 255);
        // Source battlers are intentionally hidden during USER/TARGET overlay frames.
        // Do not gate overlay visibility on source visibility, or the battler vanishes.
        copySprite.setVisible(frame.visible !== false);
        this._setBlendMode(copySprite, frame.blendType ?? AB_NORMAL);
      }

      // Hide any pool sprites not used in this frame.
      for (let i = g; i < graphicPool.length; i++) graphicPool[i].setVisible(false);
      for (let i = u; i < userPool.length; i++) userPool[i].setVisible(false);
      for (let i = t; i < targetPool.length; i++) targetPool[i].setVisible(false);

      // Timed events at this frame index
      const fte = anim.fte.get(f);
      if (fte) {
        for (const ev of fte) this._fireSoundEvent(ev, audioEnabled);
      }

      f++;
      if (f < frameCount) {
        this.scene.time.delayedCall(FRAME_MS, tick);
      } else {
        // Small tail delay so the last frame is visible before cleanup.
        this.scene.time.delayedCall(FRAME_MS * 0.5, cleanUp);
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
    const focus = frame.focus ?? AF_TARGET;

    switch (focus) {
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
      case 0:  // some frames have focus:0 — treat as TARGET fallback
      default:
        x += tX - TARGET_FOCUS_X;
        y += tY - (tH / 2) - TARGET_FOCUS_Y;
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
    copy.setOrigin(source.originX ?? 0.5, source.originY ?? 1);
    copy.setDepth(source.depth ?? copy.depth);
  }

  _setBlendMode(sprite, blend) {
    sprite.setBlendMode(
      blend === AB_ADD ? 1  :   // Phaser.BlendModes.ADD = 1
      blend === 2      ? 11 :   // Phaser.BlendModes.DIFFERENCE = 11
      0                         // Phaser.BlendModes.NORMAL = 0
    );
  }

  // ─────────────────────────────────────────────────── timed sound events ─

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
