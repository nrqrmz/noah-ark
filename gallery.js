import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { FAMILY, createPerson, createTownsperson, updatePerson } from './characters/people.js';

// Dev-only model gallery. ?view=people|animals|world; ?cam=x,y,z&target=x,y,z to zoom.
const params = new URLSearchParams(location.search);
const view = params.get('view') ?? 'people';

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x9fd3f0);
scene.add(new THREE.HemisphereLight(0xffffff, 0x5a8f3a, 0.8));
const sun = new THREE.DirectionalLight(0xffffff, 1.6);
sun.position.set(6, 12, 8);
sun.castShadow = true;
sun.shadow.camera.left = sun.shadow.camera.bottom = -20;
sun.shadow.camera.right = sun.shadow.camera.top = 20;
scene.add(sun);
const ground = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), new THREE.MeshStandardMaterial({ color: 0x6cc24a }));
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 300);
const controls = new OrbitControls(camera, renderer.domElement);
const vec = (s, d) => (s ? s.split(',').map(Number) : d);
camera.position.set(...vec(params.get('cam'), [0, 3.5, 14]));
controls.target.set(...vec(params.get('target'), [0, 1.2, 0]));
controls.update();

const updaters = [];
const GESTURES = [null, 'openArms', 'laugh', 'mock', 'coverEars', 'chop', 'wave', 'turnAway'];

if (view === 'people') {
  const people = [
    ...FAMILY.map((m) => createPerson(m.look)),
    createTownsperson(0), createTownsperson(1), createTownsperson(2), createTownsperson(5, { mask: true }),
  ];
  people.forEach((p, i) => {
    p.root.position.set((i - (people.length - 1) / 2) * 1.25, 0, 0);
    scene.add(p.root);
  });
  const fixed = params.get('gesture');
  let clock = 0;
  updaters.push((dt) => {
    clock += dt;
    const g = fixed ?? GESTURES[Math.floor(clock / 2) % GESTURES.length];
    people.forEach((p, i) => updatePerson(p, dt, { moving: !fixed && i % 3 === 0, gesture: g === 'null' ? null : g }));
  });
}

window.galleryReady = true;

function resize() {
  renderer.setSize(innerWidth, innerHeight);
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
}
addEventListener('resize', resize);
resize();

const timer = new THREE.Clock();
renderer.setAnimationLoop(() => {
  const dt = Math.min(timer.getDelta(), 0.05);
  for (const u of updaters) u(dt);
  renderer.render(scene, camera);
});
