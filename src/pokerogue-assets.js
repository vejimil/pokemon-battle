const POKEROGUE_ASSET_PATHS = Object.freeze({
  currentItems: ['./assets/items'],
  pokerogueItems: ['./assets/pokerogue/items', './assets/pokerogue/images/items'],
  ui: ['./assets/pokerogue/ui', './assets/pokerogue/ui/misc', './assets/pokerogue/images/ui', './assets/pokerogue/images/ui/misc'],
  effects: ['./assets/pokerogue/effects', './assets/pokerogue/images/effects'],
  arenas: ['./assets/pokerogue/arenas', './assets/pokerogue/images/arenas'],
  animData: ['./assets/pokerogue/anim-data', './assets/pokerogue/battle-anims', './assets/pokerogue/images/battle-anims', './assets/pokerogue/images/battle_anims'],
  battleAnims: ['./assets/pokerogue/battle__anims', './assets/pokerogue/battle-anims', './assets/pokerogue/images/battle_anims'],
  fonts: ['./assets/pokerogue/fonts'],
});

const PROBE_CACHE = new Map();
const JSON_CACHE = new Map();
const ATLAS_CACHE = new Map();

function unique(values) {
  return Array.from(new Set(values.filter(Boolean)));
}

function normalizeStem(value, separator = '-') {
  const sep = separator === '_' ? '_' : '-';
  return String(value || '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[’'`]/g, '')
    .replace(/&/g, 'and')
    .replace(/\+/g, 'plus')
    .replace(/[^a-z0-9]+/g, sep)
    .replace(new RegExp(`${sep}{2,}`, 'g'), sep)
    .replace(new RegExp(`^${sep}+|${sep}+$`, 'g'), '');
}

function buildItemStemCandidates(itemName = '') {
  const raw = String(itemName || '').trim();
  if (!raw || /^no item$/i.test(raw)) return [];
  const dash = normalizeStem(raw, '-');
  const underscore = normalizeStem(raw, '_');
  const compact = normalizeStem(raw, '').replace(/[^a-z0-9]/g, '');
  const existingDash = raw.toLowerCase().replace(/\.png$/i, '');
  const existingUnderscore = existingDash.replace(/-/g, '_');
  const existingDashAgain = existingDash.replace(/_/g, '-');
  return unique([dash, underscore, compact, existingDash, existingUnderscore, existingDashAgain]);
}

function probeImage(url) {
  if (!url) return Promise.resolve('');
  if (PROBE_CACHE.has(url)) return PROBE_CACHE.get(url);
  const promise = new Promise(resolve => {
    const image = new Image();
    image.onload = () => resolve(url);
    image.onerror = () => resolve('');
    image.src = url;
  });
  PROBE_CACHE.set(url, promise);
  return promise;
}

async function resolveFirstImage(urls = []) {
  for (const url of urls) {
    const hit = await probeImage(url);
    if (hit) return hit;
  }
  return '';
}

export async function resolveItemIconUrl(itemName = '') {
  const stems = buildItemStemCandidates(itemName);
  if (!stems.length) return '';
  const candidates = [];
  for (const stem of stems) {
    for (const base of POKEROGUE_ASSET_PATHS.currentItems) candidates.push(`${base}/${stem}.png`);
  }
  for (const stem of stems) {
    for (const base of POKEROGUE_ASSET_PATHS.pokerogueItems) candidates.push(`${base}/${stem}.png`);
  }
  return resolveFirstImage(unique(candidates));
}

export async function resolvePokerogueUiAssetUrl(filename = '') {
  const cleaned = String(filename || '').trim();
  if (!cleaned) return '';
  return resolveFirstImage(POKEROGUE_ASSET_PATHS.ui.map(base => `${base}/${cleaned}`));
}

async function fetchJson(url) {
  if (!url) return null;
  if (JSON_CACHE.has(url)) return JSON_CACHE.get(url);
  const promise = fetch(url)
    .then(response => (response.ok ? response.json() : null))
    .catch(() => null);
  JSON_CACHE.set(url, promise);
  return promise;
}

function normalizeAtlasData(data, atlasUrl) {
  if (!data) return null;
  if (data.frames && !Array.isArray(data.frames)) {
    const frames = Object.fromEntries(Object.entries(data.frames).map(([name, frameData]) => {
      const frame = frameData?.frame || frameData;
      return [name, {
        x: Number(frame?.x || 0),
        y: Number(frame?.y || 0),
        w: Number(frame?.w || 0),
        h: Number(frame?.h || 0),
      }];
    }));
    return {
      image: data?.meta?.image || '',
      size: {
        w: Number(data?.meta?.size?.w || 0),
        h: Number(data?.meta?.size?.h || 0),
      },
      frames,
      atlasUrl,
    };
  }
  if (Array.isArray(data.textures)) {
    const texture = data.textures[0];
    if (!texture) return null;
    const frames = Object.fromEntries((texture.frames || []).map(frameData => [frameData.filename, {
      x: Number(frameData?.frame?.x || 0),
      y: Number(frameData?.frame?.y || 0),
      w: Number(frameData?.frame?.w || 0),
      h: Number(frameData?.frame?.h || 0),
    }]));
    return {
      image: texture.image || '',
      size: {
        w: Number(texture?.size?.w || 0),
        h: Number(texture?.size?.h || 0),
      },
      frames,
      atlasUrl,
    };
  }
  return null;
}

async function loadAtlas(atlasName = '') {
  const clean = String(atlasName || '').trim();
  if (!clean) return null;
  if (ATLAS_CACHE.has(clean)) return ATLAS_CACHE.get(clean);
  const promise = (async () => {
    for (const base of POKEROGUE_ASSET_PATHS.ui) {
      const atlasUrl = `${base}/${clean}.json`;
      const data = await fetchJson(atlasUrl);
      const normalized = normalizeAtlasData(data, atlasUrl);
      if (!normalized) continue;
      const imageUrl = normalized.image ? `${base}/${normalized.image}` : `${base}/${clean}.png`;
      const hit = await probeImage(imageUrl);
      if (!hit) continue;
      normalized.imageUrl = hit;
      return normalized;
    }
    return null;
  })();
  ATLAS_CACHE.set(clean, promise);
  return promise;
}

export async function applyPokerogueAtlasFrameToElement(element, atlasName, frameName, options = {}) {
  if (!element) return false;
  const token = `${atlasName}:${frameName}:${Date.now()}:${Math.random().toString(36).slice(2)}`;
  element.dataset.atlasToken = token;
  const atlas = await loadAtlas(atlasName);
  if (!atlas || element.dataset.atlasToken != token) return false;
  const requested = String(frameName || '').trim();
  const frame = atlas.frames[requested] || atlas.frames[requested.toLowerCase()] || atlas.frames.unknown;
  if (!frame || !atlas.imageUrl) return false;

  const width = Number(options.width || frame.w || 0);
  const height = Number(options.height || frame.h || 0);
  const scaleX = width && frame.w ? width / frame.w : 1;
  const scaleY = height && frame.h ? height / frame.h : 1;
  const bgWidth = atlas.size.w * scaleX;
  const bgHeight = atlas.size.h * scaleY;

  element.style.backgroundImage = `url("${atlas.imageUrl}")`;
  element.style.backgroundRepeat = 'no-repeat';
  element.style.backgroundPosition = `-${frame.x * scaleX}px -${frame.y * scaleY}px`;
  element.style.backgroundSize = `${bgWidth}px ${bgHeight}px`;
  if (!options.preserveSize) {
    element.style.width = `${width || frame.w}px`;
    element.style.height = `${height || frame.h}px`;
  }
  if (options.pixelated !== false) {
    element.style.imageRendering = 'pixelated';
    element.style.imageRendering = 'crisp-edges';
  }
  element.hidden = false;
  return true;
}

export {POKEROGUE_ASSET_PATHS};
