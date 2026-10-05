import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  SCENE_IDS,
  flattenKeys,
  createTranslator,
  rememberLanguage,
  recallLanguage,
} from '../i18n.js';

const load = (lang) => JSON.parse(readFileSync(new URL(`../lang/${lang}.json`, import.meta.url)));
const es = load('es');
const en = load('en');

const leaves = (obj) => flattenKeys(obj).map((k) => k.split('.').reduce((o, p) => o[p], obj));

test('es and en have identical keys', () => {
  assert.deepEqual(flattenKeys(es).sort(), flattenKeys(en).sort());
});

test('no empty strings', () => {
  for (const v of [...leaves(es), ...leaves(en)]) assert.ok(v.trim().length > 0);
});

test('every story scene has text and ref', () => {
  const keys = new Set(flattenKeys(es));
  for (const id of SCENE_IDS.slice(1)) {
    assert.ok(keys.has(`${id}.text`), `${id}.text`);
    assert.ok(keys.has(`${id}.ref`), `${id}.ref`);
  }
});

test('pages are short enough to read without scrolling', () => {
  for (const dict of [es, en]) {
    for (const id of SCENE_IDS.slice(1)) {
      const words = dict[id].text.trim().split(/\s+/).length;
      assert.ok(words <= 85, `${id}: ${words} words`);
    }
  }
});

test('translator falls back to the other language', () => {
  const t = createTranslator({ es: { a: 'x' }, en: { a: 'y', b: 'z' } }, 'es');
  assert.equal(t('a'), 'x');
  assert.equal(t('b'), 'z');
});

test('translator returns the key when missing in both', () => {
  const t = createTranslator({ es: {}, en: {} }, 'en');
  assert.equal(t('nope.text'), 'nope.text');
});

test('rememberLanguage/recallLanguage survive a throwing storage', () => {
  const broken = {
    getItem() { throw new Error('blocked'); },
    setItem() { throw new Error('blocked'); },
  };
  assert.doesNotThrow(() => rememberLanguage('es', broken));
  assert.equal(recallLanguage(broken), null);
});

test('recallLanguage returns what was remembered', () => {
  const store = {};
  const storage = { getItem: (k) => store[k] ?? null, setItem: (k, v) => { store[k] = v; } };
  rememberLanguage('en', storage);
  assert.equal(recallLanguage(storage), 'en');
});

test('recallLanguage ignores unknown values', () => {
  assert.equal(recallLanguage({ getItem: () => 'fr' }), null);
});
