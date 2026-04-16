const DEFAULT_BASE_PATH = './assets/pokerogue/locales';
const DEFAULT_NAMESPACES = Object.freeze([
  'battle',
  'ability-trigger',
  'move-trigger',
  'weather',
  'terrain',
]);

// Keep namespace/file-name aliases aligned with upstream PokeRogue mapping.
const NAMESPACE_FILE_MAP = Object.freeze({
  titles: 'trainer-titles',
  moveTriggers: 'move-trigger',
  abilityTriggers: 'ability-trigger',
  battlePokemonForm: 'pokemon-form-battle',
  miscDialogue: 'dialogue-misc',
  battleSpecDialogue: 'dialogue-final-boss',
  doubleBattleDialogue: 'dialogue-double-battle',
  splashMessages: 'splash-texts',
  mysteryEncounterMessages: 'mystery-encounter-texts',
  biome: 'biomes',
});

function toPathSafeNamespace(ns = '') {
  if (NAMESPACE_FILE_MAP[ns]) return NAMESPACE_FILE_MAP[ns];
  return String(ns || '').trim();
}

function toId(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function normalizeLang(language = '') {
  const id = toId(language);
  if (id.startsWith('ko')) return 'ko';
  if (id.startsWith('en')) return 'en';
  return 'en';
}

function deepGet(obj, path) {
  if (!obj || !path) return undefined;
  if (!String(path).includes('.')) return obj[path];
  return String(path)
    .split('.')
    .reduce((acc, key) => (acc && typeof acc === 'object' ? acc[key] : undefined), obj);
}

function interpolate(template, vars = {}) {
  const source = String(template ?? '');
  return source.replace(/\{\{\s*([^}\s]+)\s*\}\}/g, (_match, key) => String(vars[key] ?? ''));
}

function hasKoreanBatchim(char) {
  const code = Number(char?.charCodeAt?.(0) || 0);
  if (code < 0xac00 || code > 0xd7a3) return false;
  return (code - 0xac00) % 28 !== 0;
}

function isKoreanRieulBatchim(char) {
  const code = Number(char?.charCodeAt?.(0) || 0);
  if (code < 0xac00 || code > 0xd7a3) return false;
  const jong = (code - 0xac00) % 28;
  return jong === 8; // ㄹ final consonant
}

function resolveKoreanParticle(particle, prevChar) {
  const normalized = String(particle || '').trim();
  if (!normalized) return '';
  const hasBatchim = hasKoreanBatchim(prevChar);
  switch (normalized) {
    case '가':
      return hasBatchim ? '이' : '가';
    case '를':
      return hasBatchim ? '을' : '를';
    case '는':
      return hasBatchim ? '은' : '는';
    case '와':
      return hasBatchim ? '과' : '와';
    case '로':
      if (!hasBatchim || isKoreanRieulBatchim(prevChar)) return '로';
      return '으로';
    default:
      return normalized;
  }
}

function applyKoreanPostposition(template) {
  const input = String(template ?? '');
  let output = '';
  for (let index = 0; index < input.length; index += 1) {
    if (input[index] === '[' && input[index + 1] === '[') {
      const end = input.indexOf(']]', index + 2);
      if (end !== -1) {
        const particle = input.slice(index + 2, end);
        const prevChar = output[output.length - 1] || '';
        output += resolveKoreanParticle(particle, prevChar);
        index = end + 1;
        continue;
      }
    }
    output += input[index];
  }
  return output;
}

function applyLocalePostProcess(text, language) {
  const out = String(text ?? '');
  if (normalizeLang(language) === 'ko') {
    return applyKoreanPostposition(out);
  }
  // Non-Korean locales should not display postposition placeholders.
  return out.replace(/\[\[[^[\]]+\]\]/g, '');
}

export class BattleLocaleManager {
  constructor({
    basePath = DEFAULT_BASE_PATH,
    namespaces = DEFAULT_NAMESPACES,
    fallbackLang = 'en',
    language = 'ko',
  } = {}) {
    this.basePath = String(basePath || DEFAULT_BASE_PATH).replace(/\/+$/, '');
    this.namespaces = Array.from(new Set((namespaces || DEFAULT_NAMESPACES).map(ns => String(ns || '').trim()).filter(Boolean)));
    this.fallbackLang = normalizeLang(fallbackLang);
    this.language = normalizeLang(language);
    this._store = new Map(); // lang => Map<namespace, object>
    this._pending = new Map(); // `${lang}:${namespace}` => Promise<object>
  }

  setLanguage(language = 'ko') {
    this.language = normalizeLang(language);
    return this.language;
  }

  async loadLocale(language = this.language, namespaces = this.namespaces) {
    const lang = this.setLanguage(language);
    const targets = Array.from(new Set((namespaces || this.namespaces).map(ns => String(ns || '').trim()).filter(Boolean)));
    if (!targets.length) return;
    await Promise.all(targets.map(ns => this.loadNamespace(lang, ns)));
  }

  async loadNamespace(language = this.language, namespace = '') {
    const lang = normalizeLang(language);
    const ns = String(namespace || '').trim();
    if (!ns) return {};
    const cached = this._getNamespace(lang, ns);
    if (cached) return cached;

    const pendingKey = `${lang}:${ns}`;
    const pending = this._pending.get(pendingKey);
    if (pending) return pending;

    const file = toPathSafeNamespace(ns);
    const url = `${this.basePath}/${lang}/${file}.json`;
    const request = fetch(url)
      .then(response => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
      })
      .then(payload => {
        this._setNamespace(lang, ns, payload && typeof payload === 'object' ? payload : {});
        return this._getNamespace(lang, ns) || {};
      })
      .catch(() => {
        // Keep fallback behavior stable when a namespace/file is unavailable.
        this._setNamespace(lang, ns, {});
        return {};
      })
      .finally(() => {
        this._pending.delete(pendingKey);
      });

    this._pending.set(pendingKey, request);
    return request;
  }

  has(namespace = '', key = '', { language = this.language } = {}) {
    const lang = normalizeLang(language);
    return this._lookup(lang, namespace, key) != null
      || this._lookup(this.fallbackLang, namespace, key) != null;
  }

  t(namespace = '', key = '', vars = {}, { language = this.language, fallback = '' } = {}) {
    const lang = normalizeLang(language);
    const lookup = this._lookup(lang, namespace, key)
      ?? this._lookup(this.fallbackLang, namespace, key)
      ?? fallback
      ?? key;
    const withPlural = this._resolvePlural(namespace, key, vars, lookup, lang, fallback);
    const interpolated = interpolate(withPlural, vars);
    return applyLocalePostProcess(interpolated, lang);
  }

  _resolvePlural(namespace, key, vars, current, language, fallback) {
    if (current && current !== key) return current;
    const hasCount = Number.isFinite(Number(vars?.count));
    const hasAmount = Number.isFinite(Number(vars?.amount));
    if (!hasCount && !hasAmount) return current;
    const quantity = Number(hasCount ? vars.count : vars.amount);
    const suffix = quantity === 1 ? '_one' : '_other';
    const pluralKey = `${key}${suffix}`;
    return this._lookup(language, namespace, pluralKey)
      ?? this._lookup(this.fallbackLang, namespace, pluralKey)
      ?? fallback
      ?? current;
  }

  _lookup(language, namespace, key) {
    const nsObj = this._getNamespace(language, namespace);
    if (!nsObj) return undefined;
    return deepGet(nsObj, key);
  }

  _getNamespace(language, namespace) {
    const langStore = this._store.get(normalizeLang(language));
    if (!langStore) return null;
    return langStore.get(String(namespace || '').trim()) || null;
  }

  _setNamespace(language, namespace, payload) {
    const lang = normalizeLang(language);
    if (!this._store.has(lang)) this._store.set(lang, new Map());
    this._store.get(lang).set(String(namespace || '').trim(), payload && typeof payload === 'object' ? payload : {});
  }
}

export function createBattleLocaleManager(options = {}) {
  return new BattleLocaleManager(options);
}

