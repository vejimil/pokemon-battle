export function ensureSpriteHostStyles(host) {
  Object.assign(host.style, {
    width: '100%',
    height: '100%',
    display: 'grid',
    placeItems: 'end center',
    pointerEvents: 'none',
    userSelect: 'none',
    overflow: 'visible',
    imageRendering: 'pixelated',
  });
}

export function clearAnimatedSprite(host) {
  if (!host) return;
  const animator = host.__pkbAnimator;
  if (animator?.rafId) cancelAnimationFrame(animator.rafId);
  host.__pkbAnimator = null;
  host.innerHTML = '';
}

export function setHostVisibility(host, visible = true) {
  if (!host?.style) return;
  host.style.visibility = visible ? 'visible' : 'hidden';
  host.style.opacity = visible ? '1' : '0';
}

async function inspectSpriteUrl(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const frame = img.height || 1;
      const count = Math.max(1, Math.floor((img.width || frame) / frame));
      resolve({ img, frame, count, width: img.width, height: img.height });
    };
    img.onerror = () => reject(new Error(`Failed to load sprite ${url}`));
    img.src = url;
  });
}

export async function renderAnimatedSpriteToHost(host, spriteModel = {}, size = 'large') {
  if (!host) return;
  ensureSpriteHostStyles(host);
  const deferred = Boolean(spriteModel?.deferred || spriteModel?.hidden);
  const url = deferred ? '' : (spriteModel?.url || '');
  const key = `${size}::${url}`;
  if (!url) {
    clearAnimatedSprite(host);
    host.__pkbAnimator = { key: '__empty__' };
    setHostVisibility(host, false);
    return;
  }
  setHostVisibility(host, true);
  if (host.__pkbAnimator?.key === key) return;
  const token = (Number(host.dataset.renderToken || '0') + 1).toString();
  host.dataset.renderToken = token;
  clearAnimatedSprite(host);
  try {
    const info = await inspectSpriteUrl(url);
    if (host.dataset.renderToken !== token) return;
    const canvas = document.createElement('canvas');
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.imageRendering = 'pixelated';
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    const animator = {
      key,
      info,
      canvas,
      ctx,
      frameIndex: 0,
      lastFrameAt: performance.now(),
      lastWidth: 0,
      lastHeight: 0,
      rafId: 0,
    };
    const draw = timestamp => {
      if (!host.isConnected || host.dataset.renderToken !== token || host.__pkbAnimator !== animator) return;
      const cssWidth = Math.max(24, Math.floor(host.clientWidth || 0));
      const cssHeight = Math.max(24, Math.floor(host.clientHeight || 0));
      if (cssWidth !== animator.lastWidth || cssHeight !== animator.lastHeight) {
        animator.lastWidth = cssWidth;
        animator.lastHeight = cssHeight;
        animator.canvas.width = cssWidth;
        animator.canvas.height = cssHeight;
      }
      if (timestamp - animator.lastFrameAt >= 120) {
        animator.frameIndex = (animator.frameIndex + 1) % animator.info.count;
        animator.lastFrameAt = timestamp;
      }
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const frameSize = animator.info.frame;
      const sx = animator.frameIndex * frameSize;
      const scale = Math.min(canvas.width / frameSize, canvas.height / frameSize);
      const dw = Math.max(1, Math.floor(frameSize * scale));
      const dh = Math.max(1, Math.floor(frameSize * scale));
      const dx = Math.floor((canvas.width - dw) / 2);
      const dy = Math.max(0, canvas.height - dh);
      ctx.drawImage(animator.info.img, sx, 0, frameSize, frameSize, dx, dy, dw, dh);
      animator.rafId = requestAnimationFrame(draw);
    };
    host.appendChild(canvas);
    host.__pkbAnimator = animator;
    animator.rafId = requestAnimationFrame(draw);
  } catch (_error) {
    clearAnimatedSprite(host);
    host.__pkbAnimator = { key: '__error__' };
    setHostVisibility(host, false);
  }
}
