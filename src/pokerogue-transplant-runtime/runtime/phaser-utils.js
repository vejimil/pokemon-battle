import { UI_ASSETS } from './constants.js';

let phaserModulePromise = null;

export function loadPhaserModule() {
  if (!phaserModulePromise) {
    phaserModulePromise = import('../../../node_modules/phaser/dist/phaser.esm.js')
      .then(module => module.default || module)
      .catch(error => {
        throw new Error(`Phaser could not be loaded from ../../../node_modules/phaser/dist/phaser.esm.js. Run npm install before starting the bundled local server. Original error: ${error.message}`);
      });
  }
  return phaserModulePromise;
}

export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function textureExists(scene, key, frame = null) {
  if (!scene?.textures?.exists?.(key)) return false;
  if (frame == null) return true;
  try {
    return scene.textures.get(key).has(frame);
  } catch (_error) {
    return false;
  }
}

export function createBaseText(scene, x, y, text = '', fontSize = 8, color = '#f8fbff', options = {}) {
  const t = scene.add.text(x, y, text, {
    fontFamily: 'emerald, pkmnems, monospace',
    fontSize: `${fontSize}px`,
    color,
    resolution: 3,
    ...options,
  });
  t.setRoundPixels?.(true);
  return t;
}

export function setHorizontalCrop(gameObject, width) {
  const nextWidth = Math.max(0, Math.floor(width));
  if (gameObject?.setCrop) {
    gameObject.setCrop(0, 0, nextWidth, gameObject.height || gameObject.displayHeight || 0);
  }
}

export function applyHostBox(host, width, height) {
  if (!host) return;
  Object.assign(host.style, {
    width: `${Math.round(width)}px`,
    height: `${Math.round(height)}px`,
  });
}

export function setInteractiveTarget(target, onClick = null, onHover = null) {
  if (!target || (!onClick && !onHover)) return;
  target.setInteractive({ useHandCursor: Boolean(onClick) });
  if (onClick) target.on('pointerup', () => onClick());
  if (onHover) {
    target.on('pointerover', () => onHover());
    target.on('pointermove', () => onHover());
  }
}

export function addWindow(scene, x, y, width, height, key = UI_ASSETS.window.key) {
  if (scene?.add?.nineslice) {
    return scene.add.nineslice(x, y, key, undefined, width, height, 8, 8, 8, 8);
  }
  if (scene?.add?.image) {
    const img = scene.add.image(x, y, key).setDisplaySize(width, height);
    return img;
  }
  if (scene?.add?.rectangle) {
    return scene.add.rectangle(x, y, width, height, 0x0f172a, 0.9);
  }
  throw new Error('Window rendering helper is unavailable in the active Phaser scene.');
}
