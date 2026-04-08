import { LOGICAL_HEIGHT, LOGICAL_WIDTH, UI_ASSETS } from './constants.js';
import { loadPhaserModule } from './phaser-utils.js';
import { createBattleShellSceneClass } from '../scene/battle-shell-scene.js';

function measureMountSize(mount) {
  if (!mount?.getBoundingClientRect) return { width: 960, height: 720 };
  const rect = mount.getBoundingClientRect();
  return {
    width: Math.max(320, Math.round(rect.width || mount.clientWidth || 960)),
    height: Math.max(240, Math.round(rect.height || mount.clientHeight || 720)),
  };
}

export class TransplantBattleController {
  constructor({ mount, statusEl } = {}) {
    this.mount = mount || null;
    this.statusEl = statusEl || null;
    this.game = null;
    this.scene = null;
    this.callbacks = {};
    this.model = null;
    this.ready = false;
    this.sceneReady = false;
    this.sceneReadyPromise = null;
    this.resolveSceneReady = null;
    this.rejectSceneReady = null;
    this.sceneBootTimer = null;
    this.bootError = null;
    this.resizeObserver = null;
    this.resizeRaf = 0;
    this.lastMountSize = { width: 0, height: 0 };
  }

  setStatus(message, tone = 'info') {
    if (!this.statusEl) return;
    this.statusEl.hidden = !message;
    this.statusEl.dataset.tone = tone;
    this.statusEl.textContent = message || '';
  }

  notifySceneReady(scene) {
    this.scene = scene;
    this.sceneReady = true;
    if (this.sceneBootTimer) {
      clearTimeout(this.sceneBootTimer);
      this.sceneBootTimer = null;
    }
    this.resolveSceneReady?.();
    this.resolveSceneReady = null;
    this.rejectSceneReady = null;
    this.setStatus('');
  }

  notifySceneError(error) {
    this.bootError = error instanceof Error ? error : new Error(String(error));
    if (this.sceneBootTimer) {
      clearTimeout(this.sceneBootTimer);
      this.sceneBootTimer = null;
    }
    this.setStatus(`Phaser transplant runtime error: ${this.bootError.message}`, 'error');
    this.rejectSceneReady?.(this.bootError);
    this.resolveSceneReady = null;
    this.rejectSceneReady = null;
  }

  observeMount() {
    if (!this.mount || this.resizeObserver) return;
    this.resizeObserver = new ResizeObserver(() => {
      if (this.resizeRaf) cancelAnimationFrame(this.resizeRaf);
      this.resizeRaf = requestAnimationFrame(() => {
        this.resizeRaf = 0;
        const nextSize = measureMountSize(this.mount);
        if (nextSize.width === this.lastMountSize.width && nextSize.height === this.lastMountSize.height) return;
        this.lastMountSize = nextSize;
        this.scene?.layoutSafely?.();
      });
    });
    this.resizeObserver.observe(this.mount);
  }

  async ensureReady() {
    if (this.bootError) throw this.bootError;
    if (this.sceneReady) return;
    if (!this.sceneReadyPromise) {
      this.sceneReadyPromise = new Promise((resolve, reject) => {
        this.resolveSceneReady = resolve;
        this.rejectSceneReady = reject;
      });
      // Pre-load custom pixel fonts so Phaser canvas text uses them from the first frame,
      // rather than falling back to the monospace system font.
      try {
        await Promise.allSettled([
          document.fonts.load('8px "emerald"', 'Aa0'),
          document.fonts.load('8px "pkmnems"', 'Aa0'),
        ]);
      } catch (_) { /* font loading is non-critical */ }
      const Phaser = await loadPhaserModule();
      const sceneClass = createBattleShellSceneClass(Phaser, { LOGICAL_WIDTH, LOGICAL_HEIGHT, UI_ASSETS });
      const scene = new sceneClass(this);
      const mountSize = measureMountSize(this.mount);
      this.lastMountSize = mountSize;
      const renderResolution = window.devicePixelRatio > 1 ? 2 : 1;
      this.game = new Phaser.Game({
        type: Phaser.AUTO,
        width: LOGICAL_WIDTH,
        height: LOGICAL_HEIGHT,
        parent: this.mount,
        transparent: false,
        backgroundColor: '#000000',
        pixelArt: true,
        antialias: false,
        roundPixels: true,
        autoRound: true,
        resolution: renderResolution,
        dom: { createContainer: true },
        scale: {
          mode: Phaser.Scale.FIT,
          autoCenter: Phaser.Scale.CENTER_BOTH,
          width: LOGICAL_WIDTH,
          height: LOGICAL_HEIGHT,
        },
        scene: [scene],
      });
      this.ready = true;
      if (this.mount) this.mount.hidden = false;
      this.observeMount();
      this.sceneBootTimer = setTimeout(() => {
        this.notifySceneError(new Error('Scene boot timed out before create() completed.'));
      }, 8000);
    }
    await this.sceneReadyPromise;
  }

  async show(model, callbacks = {}) {
    this.callbacks = callbacks;
    this.model = model;
    await this.ensureReady();
    if (this.mount) this.mount.hidden = false;
    this.scene?.renderModel?.(model);
  }

  hide() {
    if (this.mount) this.mount.hidden = true;
  }

  destroy() {
    this.scene = null;
    this.callbacks = {};
    this.model = null;
    this.ready = false;
    this.sceneReady = false;
    this.sceneReadyPromise = null;
    this.resolveSceneReady = null;
    this.rejectSceneReady = null;
    this.bootError = null;
    if (this.sceneBootTimer) {
      clearTimeout(this.sceneBootTimer);
      this.sceneBootTimer = null;
    }
    if (this.resizeRaf) {
      cancelAnimationFrame(this.resizeRaf);
      this.resizeRaf = 0;
    }
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
    this.lastMountSize = { width: 0, height: 0 };
    if (this.game) {
      this.game.destroy(true);
      this.game = null;
    }
    if (this.mount) this.mount.innerHTML = '';
  }

  handleAction(action) {
    if (!action || typeof this.callbacks?.onAction !== 'function') return;
    this.callbacks.onAction(action);
  }
}

export function createPhaserBattleController(options = {}) {
  return new TransplantBattleController(options);
}
