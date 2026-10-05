import * as THREE from 'three';
import { fitDistance } from './systems/framing.js';
import { createStory } from './story.js';
import { createTapSystem } from './systems/tap.js';
import {
  SCENE_IDS, createTranslator, loadDictionaries, rememberLanguage, recallLanguage,
} from './i18n.js';
import factories from './scenes/index.js';

const $ = (id) => document.getElementById(id);
const stage = $('stage');
const ui = {
  text: $('page-text'),
  ref: $('page-ref'),
  progress: $('progress'),
  next: $('next'),
  langToggle: $('lang-toggle'),
  cover: $('cover'),
  coverTitle: $('cover-title'),
  btnEs: $('btn-es'),
  btnEn: $('btn-en'),
  btnStart: $('btn-start'),
};

// ---------- Renderer, camera, world ----------
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
stage.prepend(renderer.domElement);

const world = new THREE.Scene();
world.background = new THREE.Color(0x9fd3f0);

const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 500);

world.add(new THREE.HemisphereLight(0xffffff, 0x5a8f3a, 0.7));
const sun = new THREE.DirectionalLight(0xffffff, 1.6);
sun.position.set(8, 14, 6);
sun.castShadow = true;
sun.shadow.bias = -0.0005;
sun.shadow.normalBias = 0.03;
world.add(sun);

// ---------- Framing ----------
// The active scene's framing box; the camera refits on every resize.
let frameBox = { cx: 0, cy: 0, cz: 0, w: 6, h: 6 };

// `elev` tilts the camera down onto the box (radians above the horizon).
// A box may carry a `portrait` override used when the stage is taller than wide.
function refit() {
  const box = camera.aspect < 1 && frameBox.portrait ? { ...frameBox, ...frameBox.portrait } : frameBox;
  const d = fitDistance(box, camera.aspect, camera.fov);
  const elev = box.elev ?? 0;
  camera.position.set(box.cx, box.cy + Math.sin(elev) * d, box.cz + Math.cos(elev) * d);
  camera.lookAt(box.cx, box.cy, box.cz);
}

function resize() {
  const w = stage.clientWidth;
  const h = stage.clientHeight;
  if (!w || !h) return;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  refit();
}
new ResizeObserver(resize).observe(stage);
resize();

// ---------- Taps ----------
const tap = createTapSystem({
  camera,
  dom: renderer.domElement,
  onTap: (id) => story.tap(id),
});

// ---------- Language ----------
let dicts = null;
let lang = null;
let t = (key) => key;

function setLanguage(next) {
  lang = next;
  t = createTranslator(dicts, lang);
  rememberLanguage(lang);
  document.documentElement.lang = lang;
  ui.btnEs.classList.toggle('on', lang === 'es');
  ui.btnEn.classList.toggle('on', lang === 'en');
  ui.coverTitle.textContent = t('ui.title');
  ui.btnStart.textContent = t('ui.start');
  ui.btnStart.classList.remove('hidden');
  ui.langToggle.textContent = t('ui.switchTo');
  paintNextLabel();
}

// ---------- Page UI ----------
const lastIndex = factories.length - 1;
ui.progress.innerHTML = '<span></span>'.repeat(lastIndex);

function paintNextLabel() {
  ui.next.textContent = t(story.index === lastIndex ? 'ui.again' : 'ui.next');
}

const story = createStory({
  factories,
  makeCtx() {
    const root = new THREE.Group();
    world.add(root);
    return {
      root,
      world,
      camera,
      tap,
      frame(box) { frameBox = box; refit(); },
      release() {
        tap.clear();
        world.remove(root);
      },
    };
  },
  ui: {
    showPage(i) {
      const onCover = i === 0;
      document.body.classList.toggle('on-cover', onCover);
      ui.cover.classList.toggle('hidden', !onCover);
      ui.langToggle.classList.toggle('hidden', onCover);
      if (!onCover) {
        ui.text.textContent = t(`${SCENE_IDS[i]}.text`);
        ui.ref.textContent = t(`${SCENE_IDS[i]}.ref`);
      }
      paintNextLabel();
    },
    setNext(visible) {
      ui.next.classList.toggle('hidden', !visible);
      ui.next.classList.toggle('glow', visible);
    },
    setProgress(i) {
      [...ui.progress.children].forEach((dot, j) => dot.classList.toggle('on', j < i));
    },
  },
});

ui.btnEs.addEventListener('click', () => setLanguage('es'));
ui.btnEn.addEventListener('click', () => setLanguage('en'));
ui.btnStart.addEventListener('click', () => story.next());
ui.next.addEventListener('click', () => {
  if (story.index === lastIndex) story.restart();
  else story.next();
});
ui.langToggle.addEventListener('click', () => {
  setLanguage(lang === 'es' ? 'en' : 'es');
  story.setLanguage();
});

// ---------- Loop ----------
const clock = new THREE.Clock();
document.addEventListener('visibilitychange', () => {
  // Discard the time spent in the background so animations don't jump.
  if (!document.hidden) clock.getDelta();
});

async function boot() {
  dicts = await loadDictionaries();
  // Dev shortcut: ?scene=<n>&lang=<es|en> skips the cover.
  const params = new URLSearchParams(location.search);
  const devScene = Number(params.get('scene'));
  const remembered = params.get('lang') ?? recallLanguage();
  if (remembered) setLanguage(remembered);
  if (devScene > 0 && lang) story.start(devScene);
  else story.start(0);
  if (params.has('scene') || params.has('dev')) {
    // Dev hooks for automated visual checks: tap a marked object by id.
    window.__noah = {
      story,
      ids: () => tap.ids(),
      tap(id) {
        const pt = tap.screenPoint(id);
        if (!pt) return false;
        renderer.domElement.dispatchEvent(new PointerEvent('pointerdown', { clientX: pt.x, clientY: pt.y, bubbles: true }));
        return true;
      },
    };
  }
  renderer.setAnimationLoop(() => {
    const dt = Math.min(clock.getDelta(), 0.05);
    story.update(dt);
    tap.update(dt, story.locked);
    renderer.render(world, camera);
  });
}
boot();
