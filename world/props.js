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

const SHUTTER_W = 0.24;

// A small mud-brick house. Variants change the wall color and door side; `tall`
// adds 1.2 to the height. userData: door (ground point in front of the door),
// window (center of the front window) and shutter (a wooden shutter beside the
// window hinged at its top outer corner: rotating it about z hangs it askew;
// userData.shutterAskew is a good angle for that).
export function createHouse(variant = 0, { tall = false } = {}) {
  const walls = [0xd8b98c, 0xcfa878, 0xe0c49c, 0xc9a070][variant % 4];
  const group = new THREE.Group();
  const w = 2.6 + (variant % 2) * 0.6;
  const h = 2.1 + (variant % 3) * 0.3 + (tall ? 1.2 : 0);
  const body = mesh(new THREE.BoxGeometry(w, h, 2.4), mat(walls, { roughness: 1 }), group, 0, h / 2);
  body.receiveShadow = true;
  mesh(new THREE.BoxGeometry(w + 0.2, 0.18, 2.6), mat(0xa58360, { roughness: 1 }), group, 0, h + 0.09);
  const doorX = variant % 2 ? -w * 0.22 : w * 0.22;
  mesh(new THREE.BoxGeometry(0.6, 1.2, 0.06), mat(0x4a3220), group, doorX, 0.6, 1.21);
  const winY = h * 0.62;
  mesh(new THREE.BoxGeometry(0.45, 0.4, 0.06), mat(0x2b1d12), group, -doorX, winY, 1.21);
  // Shutter on the window's outer side (away from the door), hanging from its top outer corner.
  const side = -Math.sign(doorX);
  const hinge = new THREE.Vector3(-doorX + side * (0.225 + 0.04 + SHUTTER_W), winY + 0.22, 1.25);
  const shutter = mesh(
    geo(`shutter${side}`, () => new THREE.BoxGeometry(SHUTTER_W, 0.44, 0.04).translate(-side * SHUTTER_W / 2, -0.22, 0)),
    mat(0x8a5a32), group, hinge.x, hinge.y, hinge.z,
  );
  for (const y of [-0.1, -0.34]) {
    mesh(geo(`shutterSlat${side}`, () => new THREE.BoxGeometry(SHUTTER_W * 0.86, 0.035, 0.02).translate(-side * SHUTTER_W / 2, 0, 0.025)), mat(0x5e3c20), shutter, 0, y);
  }
  group.userData.door = new THREE.Vector3(doorX, 0, 1.4);
  group.userData.window = new THREE.Vector3(-doorX, winY, 1.24);
  group.userData.shutter = shutter;
  // Rotation that swings the shutter down outward, hanging askew from its one hinge.
  group.userData.shutterAskew = side * 0.55;
  return group;
}

// Cartoon fight: a rolling dust cloud with little stars popping out. `width`
// scales the puff orbit and star radii; past 1.2 a lumpy core fills the middle so
// the cloud hides everyone inside (width 2.2 hides two people standing 1 unit apart).
export function createFightCloud({ width = 1 } = {}) {
  const root = new THREE.Group();
  const puffMat = mat(0xe8e2d6, { roughness: 1 });
  const big = width > 1.2;
  const puffs = [];
  const count = Math.round(9 * Math.max(1, width * 0.75));
  for (let i = 0; i < count; i++) {
    const p = mesh(sphere(0.45 + (i % 3) * 0.12, 10, 8), puffMat, root);
    p.userData.a = (i / count) * Math.PI * 2;
    p.userData.y = big ? (i % 2 ? 1.45 : 0.75) : 0.9;
    puffs.push(p);
  }
  // Core: overlapping puffs whose union holds two people (about 1.8 tall) 1 unit apart.
  const core = [];
  if (big) {
    const k = width / 2.2;
    for (const [x, y, z, r] of [[-0.55, 0.55, 0, 0.66], [0.55, 0.55, 0, 0.66], [-0.5, 1.3, 0, 0.64], [0.5, 1.3, 0, 0.64], [0, 0.95, 0.15, 0.72], [0, 1.85, 0, 0.5], [-0.45, 1.95, 0, 0.36], [0.45, 1.95, 0, 0.36]]) {
      const c = mesh(sphere(r * k, 14, 10), puffMat, root, x * k, y, z * k);
      core.push(c);
    }
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
  const starY = big ? 2.45 : 1.6;
  const reach = big ? 0.75 : 1; // the hand and foot poke out of the core's edge
  let t = 0;
  return {
    root,
    update(dt) {
      t += dt;
      puffs.forEach((p, i) => {
        const a = p.userData.a + t * 3 * (big && i % 2 ? -1 : 1);
        p.position.set(Math.cos(a) * 0.55 * width, p.userData.y + Math.sin(a * 2 + i) * (big ? 0.18 : 0.3), Math.sin(a) * 0.35 * width);
        p.scale.setScalar(1 + Math.sin(t * 9 + i) * 0.12);
      });
      core.forEach((c, i) => c.scale.setScalar(1.05 + Math.sin(t * 7 + i * 1.7) * 0.05));
      stars.forEach((s, i) => {
        const a = s.userData.a + t * 4;
        s.position.set(Math.cos(a) * 1.1 * width, starY + Math.sin(t * 6 + i) * 0.25, Math.sin(a) * 0.6 * width);
        s.rotation.y += dt * 6;
      });
      hand.position.set(Math.cos(t * 5) * 0.95 * width * reach, 1.0 + Math.sin(t * 7) * 0.2, 0.3 * width);
      hand.visible = Math.sin(t * 3) > 0;
      foot.position.set(-Math.cos(t * 4) * 0.9 * width * reach, 0.5, 0.35 * width);
      foot.visible = Math.sin(t * 2.3 + 1) > 0.2;
    },
  };
}

// Light-gray dust puffs that pop out, drift up and fade ("things got smashed").
// Never dark smoke. `puff()` emits one burst at the root's origin.
export function createDustBurst({ size = 1 } = {}) {
  const root = new THREE.Group();
  const pool = [];
  let bursts = 0;
  const spawn = () => {
    let p = pool.find((q) => !q.visible);
    if (!p) {
      // A soft emissive keeps the shaded side light gray, never dark like smoke.
      const m = new THREE.MeshStandardMaterial({ color: 0xd8d2c6, emissive: 0x77736b, roughness: 1, transparent: true, depthWrite: false });
      p = new THREE.Mesh(geo('dustPuff', () => new THREE.SphereGeometry(1, 12, 8)), m);
      root.add(p);
      pool.push(p);
    }
    return p;
  };
  return {
    root,
    puff() {
      const n = 7;
      for (let i = 0; i < n; i++) {
        const p = spawn();
        const a = (i / n) * Math.PI * 2 + bursts * 0.7;
        const out = 0.9 + ((i * 5 + bursts) % 3) * 0.3;
        // Mostly forward (toward the viewer, +z) and up, a little to the sides.
        p.userData.v = new THREE.Vector3(Math.cos(a) * out, 0.6 + (i % 3) * 0.35, 0.5 + Math.abs(Math.sin(a)) * out * 0.6).multiplyScalar(size);
        p.userData.age = 0;
        p.userData.r = (0.22 + (i % 3) * 0.06) * size;
        p.position.set(0, 0, 0);
        p.scale.setScalar(0.01);
        p.visible = true;
      }
      bursts++;
    },
    update(dt) {
      for (const p of pool) {
        if (!p.visible) continue;
        const d = p.userData;
        d.age += dt;
        const k = d.age / DUST_LIFE;
        if (k >= 1) { p.visible = false; continue; }
        p.position.addScaledVector(d.v, dt);
        d.v.multiplyScalar(Math.exp(-2.5 * dt)); // the burst slows down
        d.v.y += 0.25 * size * dt; // and drifts up
        const pop = Math.min(1, d.age / 0.15);
        p.scale.setScalar(d.r * (0.4 + 0.6 * pop) * (1 + k * 0.8));
        p.material.opacity = 0.9 * (1 - k * k);
      }
    },
  };
}
const DUST_LIFE = 1.4;

const CLAY = 0xb8683c;

// Clay jar profile (lathe), about 0.55 tall at scale 1.
const JAR_PROFILE = [[0, 0], [0.12, 0], [0.19, 0.08], [0.22, 0.2], [0.2, 0.33], [0.12, 0.43], [0.085, 0.47], [0.1, 0.53], [0.075, 0.55]];
const jarGeometry = () => geo('jar', () => new THREE.LatheGeometry(JAR_PROFILE.map(([x, y]) => new THREE.Vector2(x, y)), 18));
const SHARD_MAT = new THREE.MeshStandardMaterial({ color: CLAY, roughness: 0.9, side: THREE.DoubleSide });
SHARD_MAT.userData.shared = true;

// Three clay jars by a door; smash() swaps them for curved shards on the ground.
export function createJars() {
  const root = new THREE.Group();
  const whole = new THREE.Group();
  const shards = new THREE.Group();
  root.add(whole, shards);
  const spots = [[-0.32, 0, 1], [0.12, 0.1, 0.85], [0.56, -0.05, 1.1]];
  spots.forEach(([x, z, s], i) => {
    const jar = mesh(jarGeometry(), mat(i === 1 ? 0xc77a48 : CLAY, { roughness: 0.9 }), whole, x, 0, z);
    jar.scale.setScalar(s);
    // A painted band around the belly.
    const band = mesh(geo('jarBand', () => new THREE.TorusGeometry(0.215, 0.012, 6, 24)), mat(0x7a3f1f), jar, 0, 0.22);
    band.rotation.x = Math.PI / 2;
  });
  // Shards: curved bits of the jar wall lying around where each jar stood.
  const box = new THREE.Box3();
  spots.forEach(([x, z, s], j) => {
    for (let i = 0; i < 5; i++) {
      const k = i % 3;
      const phi = 0.8 + (i % 2) * 0.5;
      const piece = mesh(
        geo(`shard${k}:${phi}`, () => new THREE.LatheGeometry(
          JAR_PROFILE.slice(2 + k, 5 + k).map(([px, py]) => new THREE.Vector2(px, py - JAR_PROFILE[2 + k][1])), 4, -phi / 2, phi,
        )),
        SHARD_MAT, shards,
      );
      const a = i * 1.3 + j;
      const r = 0.14 + k * 0.12;
      // Lying down with the curved wall arching up, like a broken bowl piece.
      piece.rotation.order = 'YXZ';
      piece.rotation.set(-Math.PI / 2 + 0.15 * (i % 2), a, 0);
      piece.scale.setScalar(s * 0.85);
      piece.position.set(x + Math.cos(a) * r * s, 0, z + Math.sin(a) * r * s);
      piece.position.y -= box.setFromObject(piece).min.y; // edges resting on the ground
    }
    // The jar's base stays standing as a short broken ring.
    const base = mesh(geo('jarBase', () => new THREE.LatheGeometry(JAR_PROFILE.slice(0, 3).map(([px, py]) => new THREE.Vector2(px, py)), 18)), SHARD_MAT, shards, x, 0, z);
    base.scale.setScalar(s);
  });
  shards.visible = false;
  return {
    root,
    smash() {
      whole.visible = false;
      shards.visible = true;
    },
  };
}

// A woven basket of round loaves, about 0.38 across.
export function createBreadBasket() {
  const g = new THREE.Group();
  const wicker = mat(0xc9a15e, { roughness: 1 });
  const dark = mat(0x9c7438, { roughness: 1 });
  const profile = [[0, 0], [0.13, 0], [0.16, 0.04], [0.18, 0.11], [0.19, 0.16]].map(([x, y]) => new THREE.Vector2(x, y));
  mesh(geo('basket', () => new THREE.LatheGeometry(profile, 20)), wicker, g);
  // Inside wall so the open basket is never see-through.
  const inner = mesh(geo('basketIn', () => new THREE.LatheGeometry(profile.map((v) => new THREE.Vector2(v.x * 0.94, v.y + 0.005)).reverse(), 20)), dark, g);
  inner.castShadow = false;
  // Woven bands: alternating rings around the wall, and a thick rim.
  for (const [y, r, m] of [[0.035, 0.155, dark], [0.075, 0.17, wicker], [0.115, 0.181, dark]]) {
    mesh(geo(`weave${r}`, () => new THREE.TorusGeometry(r, 0.014, 6, 28)), m, g, 0, y).rotation.x = Math.PI / 2;
  }
  mesh(geo('basketRim', () => new THREE.TorusGeometry(0.19, 0.022, 8, 28)), dark, g, 0, 0.16).rotation.x = Math.PI / 2;
  // Upright ribs following the wall's slope.
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    const at = (r, y) => v3(Math.cos(a) * r, y, Math.sin(a) * r);
    stick(g, at(0.167, 0.04), at(0.196, 0.15), 0.01, dark);
  }
  // Round loaves heaped above the rim, each with a score mark.
  const crust = mat(0xd9993f, { roughness: 0.8 });
  const score = mat(0xf1d08a, { roughness: 0.8 });
  for (const [x, y, z, r] of [[-0.07, 0.17, 0.04, 0.085], [0.08, 0.17, 0.03, 0.08], [0, 0.18, -0.08, 0.085], [0.01, 0.25, 0, 0.075]]) {
    const loaf = mesh(sphere(r, 14, 10), crust, g, x, y, z);
    loaf.scale.set(1, 0.7, 1);
    const cut = mesh(capsule(0.012, r * 0.9), score, loaf, 0, r * 0.97, 0);
    cut.rotation.z = Math.PI / 2;
    cut.rotation.y = x * 8;
  }
  return g;
}

const v3 = (x, y, z) => new THREE.Vector3(x, y, z);
const UP = v3(0, 1, 0);

// A capsule running from point a to point b.
function stick(parent, a, b, r, material) {
  const d = b.clone().sub(a);
  const len = d.length();
  const m = mesh(capsule(r, len), material, parent, (a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
  m.quaternion.setFromUnitVectors(UP, d.normalize());
  return m;
}

// Almond leaf profile: pointed at both ends, widest a bit below the middle.
const leafGeometry = () => geo('almondLeaf', () => {
  const pts = [];
  for (let i = 0; i <= 10; i++) {
    const t = i / 10;
    pts.push(new THREE.Vector2(0.065 * Math.sin(Math.PI * t ** 0.8), t * 0.24));
  }
  return new THREE.LatheGeometry(pts, 10);
});

// A leaf on a short stem whose start sits at point p (inside the branch), pointing
// deg degrees from straight up within the XY plane. size scales the whole unit.
function attachLeaf(parent, p, deg, material, size = 1, twist = 0) {
  const unit = new THREE.Group();
  unit.position.copy(p);
  unit.rotation.z = THREE.MathUtils.degToRad(deg);
  unit.scale.setScalar(size);
  parent.add(unit);
  mesh(capsule(0.011, 0.05), material, unit, 0, 0.035);
  const leaf = mesh(leafGeometry(), material, unit, 0, 0.06);
  leaf.scale.z = 0.28; // flat blade facing the viewer
  leaf.rotation.y = twist;
  return unit;
}

// Carrot root: tapers from a rounded wide end to a point at y = 0.
const CARROT_LEN = 0.56;
const carrotRadius = (t) => 0.115 * t ** 0.75;
const CARROT_PROFILE = (() => {
  const pts = [new THREE.Vector2(0, 0)];
  for (let i = 1; i <= 12; i++) pts.push(new THREE.Vector2(carrotRadius(i / 12), (i / 12) * CARROT_LEN * 0.94));
  // Rounded shoulder closing the wide end.
  for (let i = 1; i <= 4; i++) {
    const a = (i / 4) * (Math.PI / 2);
    pts.push(new THREE.Vector2(carrotRadius(1) * Math.cos(a), CARROT_LEN * 0.94 + CARROT_LEN * 0.06 * Math.sin(a)));
  }
  return pts;
})();

const TAP_PROXY_MAT = new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false });
TAP_PROXY_MAT.userData.shared = true;

// Invisible, larger tap target for a food (radius in the food's local units).
export function addTapProxy(food, radius = 0.55) {
  const proxy = new THREE.Mesh(geo(`tapProxy${radius}`, () => new THREE.SphereGeometry(radius, 12, 8)), TAP_PROXY_MAT);
  proxy.position.y = 0.3;
  proxy.castShadow = false; // the shadow pass ignores colorWrite
  proxy.receiveShadow = false;
  proxy.userData.tapProxy = true; // tap.js prefers real meshes over proxies
  food.add(proxy);
  return proxy;
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
      // A tuft: thin flat blades fanning out of a small clump.
      mesh(sphere(0.1, 12, 8), mat(0x3f7f2a), g, 0, 0.02).scale.set(1, 0.45, 1);
      const blade = geo('grassBlade', () => new THREE.ConeGeometry(0.05, 1, 4).translate(0, 0.5, 0));
      for (let i = 0; i < 14; i++) {
        const a = i * 2.4; // golden-angle spread around the clump
        const ring = i % 2 ? 0.065 : 0.035;
        // Two greens, plus a few sunlit yellow-green blades so the tuft stands out on the grass.
        const color = i % 4 === 0 ? 0xc2dc5e : i % 3 ? 0x6cb33f : 0x4f9a32;
        const b = mesh(blade, mat(color), g, Math.cos(a) * ring, 0.02, Math.sin(a) * ring);
        b.rotation.order = 'YXZ';
        b.rotation.y = -a;
        b.rotation.z = -(0.18 + (i % 4) * 0.15); // lean outward, away from the center
        b.scale.set(0.3, 0.4 + ((i * 7) % 5) * 0.06, 1); // flat across, thin, varied heights
      }
      break;
    }
    case 'leaves': {
      // A branch with two side twigs; every leaf hangs from it by a short stem.
      const bark = mat(BARK);
      const leaf = mat(0x3f9a3a);
      const v = (x, y) => new THREE.Vector3(x, y, 0);
      const base = v(0.08, 0);
      const tip = v(-0.1, 0.72);
      stick(g, base, tip, 0.035, bark);
      const along = (t) => base.clone().lerp(tip, t);
      const twigL = [along(0.4), v(-0.3, 0.5)];
      const twigR = [along(0.62), v(0.22, 0.66)];
      stick(g, ...twigL, 0.022, bark);
      stick(g, ...twigR, 0.022, bark);
      // [point the stem starts from, leaf direction in degrees from straight up]
      const leaves = [
        [tip, 5], [along(0.85), -60], [along(0.72), 55], [along(0.28), 60], [along(0.5), -70],
        [twigL[1], 70], [twigL[0].clone().lerp(twigL[1], 0.55), 15],
        [twigR[1], -40], [twigR[0].clone().lerp(twigR[1], 0.5), 30],
      ];
      leaves.forEach(([p, deg], i) => attachLeaf(g, p, deg, leaf, 1, (i % 3 - 1) * 0.5));
      break;
    }
    case 'carrot': {
      // Root lying on the ground, tip to -x; the leafy top grows from the wide end.
      const c = new THREE.Group();
      c.position.set(-0.15, 0.13, 0); // root plus top centered on the origin
      c.rotation.z = -Math.PI / 2 + 0.12;
      g.add(c);
      const orange = mat(0xf07a24);
      mesh(geo('carrotRoot', () => new THREE.LatheGeometry(CARROT_PROFILE, 16)), orange, c, 0, -CARROT_LEN / 2);
      // Ring grooves: thin darker bands hugging the root.
      for (const t of [0.3, 0.5, 0.68, 0.84]) {
        const ring = mesh(geo(`carrotRing${t}`, () => new THREE.TorusGeometry(carrotRadius(t), 0.007, 6, 20)), mat(0xc85a14), c, 0, -CARROT_LEN / 2 + t * CARROT_LEN);
        ring.rotation.x = Math.PI / 2;
      }
      // Feathery stalks rising from the center of the wide end.
      const green = mat(0x4fa83a);
      const top = v3(0, CARROT_LEN / 2 - 0.01, 0);
      for (const [deg, yaw] of [[-12, 0.3], [6, -0.4], [24, 0.5], [42, -0.2]]) {
        const r = THREE.MathUtils.degToRad(deg);
        const end = top.clone().add(v3(-Math.sin(r) * 0.3, Math.cos(r) * 0.3, Math.sin(yaw) * 0.08));
        stick(c, top, end, 0.012, green);
        for (const t of [0.4, 0.65, 0.88]) {
          const p = top.clone().lerp(end, t);
          for (const side of [-1, 1]) attachLeaf(c, p, deg + side * 40, green, 0.38, 0);
        }
        attachLeaf(c, end, deg, green, 0.42, 0);
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
