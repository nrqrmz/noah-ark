import * as THREE from 'three';
import { fitDistance } from './systems/framing.js';

const $ = (id) => document.getElementById(id);
const stage = $('stage');

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
world.add(sun);

const cube = new THREE.Mesh(
  new THREE.BoxGeometry(2, 2, 2),
  new THREE.MeshStandardMaterial({ color: 0xc0643a })
);
world.add(cube);

// ---------- Framing ----------
// The active scene's framing box; the camera refits on every resize.
let frameBox = { cx: 0, cy: 0, cz: 0, w: 6, h: 6 };

function refit() {
  const d = fitDistance(frameBox, camera.aspect, camera.fov);
  camera.position.set(frameBox.cx, frameBox.cy, frameBox.cz + d);
  camera.lookAt(frameBox.cx, frameBox.cy, frameBox.cz);
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

// ---------- Loop ----------
const clock = new THREE.Clock();
document.addEventListener('visibilitychange', () => {
  // Discard the time spent in the background so animations don't jump.
  if (!document.hidden) clock.getDelta();
});

renderer.setAnimationLoop(() => {
  const dt = clock.getDelta();
  cube.rotation.y += dt;
  renderer.render(world, camera);
});
