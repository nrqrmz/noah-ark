import * as THREE from 'three';
import { mat, geo, sphere, capsule, mesh } from '../characters/rig.js';

const BARK = 0x7a5230;
const LEAF = 0x3f8f3a;
const PLANK = 0xc28a50;

// A tree that becomes logs, then planks, then disappears onto the ark.
export function createTree() {
  const root = new THREE.Group();
  const stages = {
    standing: new THREE.Group(),
    logs: new THREE.Group(),
    planks: new THREE.Group(),
  };
  for (const g of Object.values(stages)) root.add(g);

  mesh(geo('trunk', () => new THREE.CylinderGeometry(0.22, 0.3, 2.4, 10)), mat(BARK), stages.standing, 0, 1.2);
  for (const [x, y, z, r] of [[0, 2.9, 0, 1.1], [-0.6, 2.5, 0.2, 0.75], [0.6, 2.55, -0.1, 0.8], [0.1, 3.5, 0, 0.75]]) {
    mesh(sphere(r, 12, 10), mat(LEAF, { roughness: 1 }), stages.standing, x, y, z);
  }
  for (const [x, z, y] of [[-0.35, 0, 0.2], [0.35, 0, 0.2], [0, 0, 0.58]]) {
    const log = mesh(geo('log', () => new THREE.CylinderGeometry(0.2, 0.2, 1.6, 10)), mat(BARK), stages.logs, x, y, z);
    log.rotation.z = Math.PI / 2;
    log.rotation.y = Math.PI / 2;
  }
  for (let i = 0; i < 3; i++) {
    mesh(geo('plank', () => new THREE.BoxGeometry(1.6, 0.1, 0.42)), mat(PLANK), stages.planks, 0, 0.06 + i * 0.11, 0).rotation.y = i * 0.12;
  }

  const api = {
    root,
    stages,
    stage: 'standing',
    setStage(name) {
      api.stage = name;
      for (const [k, g] of Object.entries(stages)) g.visible = k === name;
    },
  };
  api.setStage('standing');
  return api;
}

// A small mud-brick house. Variants change the wall color and door side.
export function createHouse(variant = 0) {
  const walls = [0xd8b98c, 0xcfa878, 0xe0c49c, 0xc9a070][variant % 4];
  const group = new THREE.Group();
  const w = 2.6 + (variant % 2) * 0.6;
  const h = 2.1 + (variant % 3) * 0.3;
  const body = mesh(new THREE.BoxGeometry(w, h, 2.4), mat(walls, { roughness: 1 }), group, 0, h / 2);
  body.receiveShadow = true;
  mesh(new THREE.BoxGeometry(w + 0.2, 0.18, 2.6), mat(0xa58360, { roughness: 1 }), group, 0, h + 0.09);
  const doorX = variant % 2 ? -w * 0.22 : w * 0.22;
  mesh(new THREE.BoxGeometry(0.6, 1.2, 0.06), mat(0x4a3220), group, doorX, 0.6, 1.21);
  mesh(new THREE.BoxGeometry(0.45, 0.4, 0.06), mat(0x2b1d12), group, -doorX, h * 0.62, 1.21);
  group.userData.door = new THREE.Vector3(doorX, 0, 1.4);
  return group;
}

// Cartoon fight: a rolling dust cloud with little stars popping out.
export function createFightCloud() {
  const root = new THREE.Group();
  const puffMat = mat(0xe8e2d6, { roughness: 1 });
  const puffs = [];
  for (let i = 0; i < 9; i++) {
    const p = mesh(sphere(0.45 + (i % 3) * 0.12, 10, 8), puffMat, root);
    p.userData.a = (i / 9) * Math.PI * 2;
    puffs.push(p);
  }
  const starMat = mat(0xffd84a, { basic: true });
  const stars = [];
  for (let i = 0; i < 4; i++) {
    const s = mesh(geo('star', () => new THREE.OctahedronGeometry(0.16)), starMat, root);
    s.userData.a = (i / 4) * Math.PI * 2;
    stars.push(s);
  }
  // A hand and a foot poking out now and then.
  const limbMat = mat(0xc99a6e);
  const hand = mesh(sphere(0.13), limbMat, root);
  const foot = mesh(geo('sandal', () => new THREE.BoxGeometry(0.17, 0.07, 0.3)), mat(0x6b4a2b), root);
  let t = 0;
  return {
    root,
    update(dt) {
      t += dt;
      puffs.forEach((p, i) => {
        const a = p.userData.a + t * 3;
        p.position.set(Math.cos(a) * 0.55, 0.9 + Math.sin(a * 2 + i) * 0.3, Math.sin(a) * 0.35);
        p.scale.setScalar(1 + Math.sin(t * 9 + i) * 0.12);
      });
      stars.forEach((s, i) => {
        const a = s.userData.a + t * 4;
        s.position.set(Math.cos(a) * 1.1, 1.6 + Math.sin(t * 6 + i) * 0.25, Math.sin(a) * 0.6);
        s.rotation.y += dt * 6;
      });
      hand.position.set(Math.cos(t * 5) * 0.95, 1.0 + Math.sin(t * 7) * 0.2, 0.3);
      hand.visible = Math.sin(t * 3) > 0;
      foot.position.set(-Math.cos(t * 4) * 0.9, 0.5, 0.35);
      foot.visible = Math.sin(t * 2.3 + 1) > 0.2;
    },
  };
}

// Food items for scene 5, about half a unit across.
export function createFood(foodId) {
  const g = new THREE.Group();
  switch (foodId) {
    case 'meat': {
      // Cartoon drumstick: rounded meat on a bone.
      const meat = mesh(sphere(0.2, 14, 10), mat(0xb5523b), g, -0.08, 0.16);
      meat.scale.set(1.35, 1, 1);
      mesh(capsule(0.045, 0.22), mat(0xfaf3e6), g, 0.22, 0.16, 0).rotation.z = Math.PI / 2;
      for (const z of [-0.045, 0.045]) mesh(sphere(0.06), mat(0xfaf3e6), g, 0.38, 0.16, z);
      break;
    }
    case 'grass': {
      for (let i = 0; i < 9; i++) {
        const blade = mesh(geo('blade', () => new THREE.ConeGeometry(0.05, 0.6, 4)), mat(0x6cb33f), g, (i % 3 - 1) * 0.07, 0.3, (Math.floor(i / 3) - 1) * 0.07);
        blade.rotation.z = (i % 3 - 1) * 0.25;
        blade.rotation.x = (Math.floor(i / 3) - 1) * 0.25;
      }
      const tie = mesh(geo('tie', () => new THREE.TorusGeometry(0.12, 0.03, 6, 16)), mat(0xc9a66b), g, 0, 0.22);
      tie.rotation.x = Math.PI / 2;
      break;
    }
    case 'leaves': {
      mesh(capsule(0.03, 0.5), mat(BARK), g, 0, 0.3).rotation.z = 0.4;
      for (const [x, y] of [[-0.12, 0.42], [0.1, 0.32], [-0.02, 0.58], [0.18, 0.5], [-0.18, 0.22]]) {
        const leaf = mesh(sphere(0.11, 10, 8), mat(0x3f9a3a), g, x, y, 0);
        leaf.scale.set(1, 0.45, 0.7);
      }
      break;
    }
    case 'carrot': {
      const body = mesh(geo('carrot', () => new THREE.ConeGeometry(0.1, 0.5, 10)), mat(0xf07a24), g, 0, 0.12, 0);
      body.rotation.z = Math.PI / 2 + 0.2;
      for (const a of [-0.4, 0, 0.4]) {
        const top = mesh(geo('carrotTop', () => new THREE.ConeGeometry(0.03, 0.22, 4)), mat(0x4fa83a), g, -0.3, 0.2, 0);
        top.rotation.z = Math.PI / 2 + 0.6 + a;
      }
      break;
    }
    case 'bone': {
      mesh(capsule(0.05, 0.4), mat(0xf6efe0), g, 0, 0.1).rotation.z = Math.PI / 2;
      for (const x of [-0.25, 0.25]) for (const z of [-0.05, 0.05]) mesh(sphere(0.07), mat(0xf6efe0), g, x, 0.1, z);
      break;
    }
    case 'fish': {
      const body = mesh(sphere(0.2, 14, 10), mat(0x7fa6c9), g, 0, 0.14);
      body.scale.set(1.5, 0.7, 0.45);
      const tail = mesh(geo('fishTail', () => new THREE.ConeGeometry(0.12, 0.2, 3)), mat(0x5f86a9), g, -0.36, 0.14, 0);
      tail.rotation.z = -Math.PI / 2;
      mesh(sphere(0.03), mat(0x111111, { basic: true }), g, 0.2, 0.18, 0.08);
      break;
    }
    case 'seeds': {
      const bowl = mesh(geo('bowl', () => new THREE.SphereGeometry(0.22, 16, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2)), mat(0x9a6a3a), g, 0, 0.2);
      bowl.material.side = THREE.DoubleSide;
      for (let i = 0; i < 14; i++) {
        const a = i * 2.4;
        const r = 0.04 + (i % 4) * 0.035;
        mesh(sphere(0.035, 6, 4), mat(0xd9b26a), g, Math.cos(a) * r, 0.17 + (i % 3) * 0.02, Math.sin(a) * r);
      }
      break;
    }
    default:
      throw new Error(`unknown food: ${foodId}`);
  }
  return g;
}

// Olive leaf sprig the dove carries (Genesis 8:11).
export function createOliveLeaf() {
  const g = new THREE.Group();
  mesh(capsule(0.008, 0.12), mat(0x6b5a3a), g, 0, 0, 0.06).rotation.x = Math.PI / 2;
  for (const [x, z, a] of [[0.03, 0.05, 0.6], [-0.03, 0.09, -0.6], [0.02, 0.13, 0.3]]) {
    const leaf = mesh(sphere(0.035, 8, 6), mat(0x6f8f3a), g, x, 0, z);
    leaf.scale.set(0.45, 0.2, 1.4);
    leaf.rotation.y = a;
  }
  return g;
}
