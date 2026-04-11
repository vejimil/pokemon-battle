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

// PokeRogue renders text at 6× the logical font size then setScale(1/6),
// so the browser renders crisp pixel-art glyphs at high resolution and
// the downscale (with pixelArt nearest-neighbour) recovers the clean design.
export const TEXT_RENDER_SCALE = 6;

export function createBaseText(scene, x, y, text = '', fontSize = 8, color = '#f8fbff', options = {}) {
  const S = TEXT_RENDER_SCALE;
  const processedOptions = { ...options };
  if (processedOptions.wordWrap) {
    processedOptions.wordWrap = { ...processedOptions.wordWrap };
    if (typeof processedOptions.wordWrap.width === 'number') {
      processedOptions.wordWrap.width = processedOptions.wordWrap.width * S;
    }
  }
  const fontFamily = processedOptions.fontFamily || 'emerald';
  const padding = processedOptions.padding || { bottom: 6 };
  delete processedOptions.fontFamily;
  delete processedOptions.padding;
  const t = scene.add.text(x, y, text, {
    fontFamily,
    fontSize: `${fontSize * S}px`,
    color,
    padding,
    resolution: 1,
    ...processedOptions,
  });
  t.setScale(1 / S);
  if (processedOptions.lineSpacing == null) {
    t.setLineSpacing(5);
  }
  t.setRoundPixels?.(true);
  return t;
}

/**
 * Wraps Phaser Text.setWordWrapWidth() to accept logical pixel values.
 * Always multiply by TEXT_RENDER_SCALE because createBaseText renders at 6×.
 */
export function setTextWordWrap(textObj, logicalWidth, useAdvanced = true) {
  if (textObj?.setWordWrapWidth) {
    textObj.setWordWrapWidth(logicalWidth * TEXT_RENDER_SCALE, useAdvanced);
  }
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
