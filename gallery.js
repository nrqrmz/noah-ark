import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { FAMILY, createPerson, createTownsperson, updatePerson } from './characters/people.js';
import { ANIMALS } from './characters/animals/data.js';
import { createAnimal, updateAnimal } from './characters/animals/index.js';
import { createWater, createArarat, createHills } from './world/terrain.js';
import { createClouds, createRain, createRainbow, createGodLight } from './world/sky.js';
import { createArk, createBlueprint } from './world/ark.js';
import { createTree, createHouse, createFightCloud, createFood, createOliveLeaf } from './world/props.js';
import { FOODS } from './characters/animals/data.js';

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
sun.shadow.bias = -0.0005;
sun.shadow.normalBias = 0.03;
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
const GESTURES = [null, 'openArms', 'laugh', 'mock', 'disbelief', 'chop', 'wave', 'turnAway'];

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

if (view === 'animals') {
  // Male and female side by side, two rows of six species.
  const animals = [];
  const only = params.get('only')?.split(',');
  ANIMALS.filter(({ id }) => !only || only.includes(id)).forEach(({ id }, i) => {
    const col = i % 6;
    const row = Math.floor(i / 6);
    for (const [k, sex] of ['male', 'female'].entries()) {
      if (params.get('sex') && params.get('sex') !== sex) continue; // ?sex=male|female shows one
      const a = createAnimal(id, sex);
      a.root.position.set((col - 2.5) * 3.4 + (k - 0.5) * 1.5, 0, row * -4);
      a.root.rotation.y = Number(params.get('rot') ?? 0.5);
      scene.add(a.root);
      animals.push(a);
    }
  });
  const mode = params.get('mode');
  let clock = 0;
  updaters.push((dt) => {
    clock += dt;
    const phase = mode ?? ['walk', 'shake', 'idle'][Math.floor(clock / 2) % 3];
    for (const a of animals) {
      updateAnimal(a, dt, { moving: phase === 'walk', shake: phase === 'shake', fly: phase === 'fly' && !!a.wings });
    }
  });
}

if (view === 'world') {
  // Arks at three build stages plus one with the door open as a ramp.
  [0.25, 0.5, 1].forEach((p, i) => {
    const ark = createArk({ length: 10 });
    ark.setBuilt(p);
    ark.root.position.set(-18 + i * 12, 0, -14);
    scene.add(ark.root);
  });
  const open = createArk({ length: 10 });
  open.setDoor(1);
  open.root.position.set(18, 0, -14);
  scene.add(open.root);

  const bp = createBlueprint({ length: 10 });
  for (const part of ['length', 'decks', 'window', 'door', 'pitch']) bp.reveal(part);
  bp.setGlow(1);
  bp.root.position.set(-6, 6, -6);
  scene.add(bp.root);

  ['standing', 'logs', 'planks'].forEach((st, i) => {
    const tree = createTree();
    tree.setStage(st);
    tree.root.position.set(-12 + i * 2.5, 0, 0);
    scene.add(tree.root);
  });
  FOODS.forEach((f, i) => {
    const food = createFood(f);
    food.scale.setScalar(2);
    food.position.set(-3 + i * 1.3, 0, 3);
    scene.add(food);
  });
  const leaf = createOliveLeaf();
  leaf.scale.setScalar(6);
  leaf.position.set(7, 0.3, 3);
  scene.add(leaf);

  const house = createHouse(1);
  house.position.set(10, 0, 0);
  scene.add(house);
  const fight = createFightCloud();
  fight.root.position.set(6, 0, 1);
  scene.add(fight.root);
  updaters.push((dt) => fight.update(dt));

  const god = createGodLight();
  god.setIntensity(1);
  god.root = god.group;
  god.group.position.set(14, 0, 2);
  scene.add(god.group);

  const rainbow = createRainbow({ radius: 16 });
  rainbow.setProgress(Number(params.get('rainbow') ?? 0.6));
  rainbow.group.position.set(0, 0, -30);
  scene.add(rainbow.group);

  if (params.get('rain')) {
    const rain = createRain({ center: new THREE.Vector3(0, 0, 0) });
    rain.setIntensity(1);
    scene.add(rain.group);
    updaters.push((dt) => rain.update(dt));
  }
  if (params.get('water')) {
    const water = createWater();
    water.setLevel(0.6);
    scene.add(water.mesh);
    updaters.push((dt) => water.update(dt));
    const ararat = createArarat();
    ararat.position.set(0, 0, -40);
    scene.add(ararat);
  } else {
    scene.add(createHills());
  }
  const clouds = createClouds(6);
  scene.add(clouds.group);
  updaters.push((dt) => clouds.update(dt));
}

if (view === 'ark') {
  // Build stages 0.25 / 0.5 / 1 and a finished ark with its door open as a ramp.
  [0.25, 0.5, 1, 1].forEach((p, i) => {
    const ark = createArk({ length: 12 });
    ark.setBuilt(p);
    if (i === 3) ark.setDoor(Number(params.get('door') ?? 1));
    ark.root.position.set(0, 0, -i * 7);
    scene.add(ark.root);
    if (i === 3) {
      const noah = createPerson(FAMILY[0].look);
      noah.root.position.copy(ark.rampFoot).add(ark.root.position);
      noah.root.position.z += 0.8;
      scene.add(noah.root);
    }
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
