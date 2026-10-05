// Story text in Spanish and English. Pure module: safe to import from node tests.

export const LANGS = ['es', 'en'];
export const SCENE_IDS = [
  'cover', 'violence', 'preaching', 'blueprint', 'building',
  'animals', 'flood', 'dove', 'rainbow',
];

const STORAGE_KEY = 'noah-ark.lang';

// Dot paths of every string leaf, e.g. ['ui.start', 'violence.text', ...].
export function flattenKeys(obj, prefix = '') {
  return Object.entries(obj).flatMap(([k, v]) => {
    const path = prefix ? `${prefix}.${k}` : k;
    return typeof v === 'string' ? [path] : flattenKeys(v, path);
  });
}

function lookup(dict, key) {
  const value = key.split('.').reduce((o, p) => (o == null ? undefined : o[p]), dict);
  return typeof value === 'string' && value.trim() ? value : undefined;
}

export function createTranslator(dicts, lang) {
  const other = lang === 'es' ? 'en' : 'es';
  return (key) => {
    const value = lookup(dicts[lang], key);
    if (value !== undefined) return value;
    const fallback = lookup(dicts[other], key);
    if (fallback !== undefined) {
      console.warn(`[i18n] "${key}" missing in ${lang}, using ${other}`);
      return fallback;
    }
    console.warn(`[i18n] "${key}" missing in every language`);
    return key;
  };
}

export function rememberLanguage(lang, storage = globalThis.localStorage) {
  try {
    storage.setItem(STORAGE_KEY, lang);
  } catch {
    // Private mode or blocked storage: the choice simply isn't remembered.
  }
}

export function recallLanguage(storage = globalThis.localStorage) {
  try {
    const lang = storage.getItem(STORAGE_KEY);
    return LANGS.includes(lang) ? lang : null;
  } catch {
    return null;
  }
}

export async function loadDictionaries() {
  const [es, en] = await Promise.all(
    LANGS.map((lang) => fetch(`lang/${lang}.json`).then((r) => r.json()))
  );
  return { es, en };
}
