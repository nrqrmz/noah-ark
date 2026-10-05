import * as THREE from 'three';
import { mat, geo, sphere, capsule, mesh, addLimb } from '../rig.js';

const EYE = 0x231a14;
const WHITE = 0xffffff;

// Cute dot eyes with a white highlight, on both sides of a head of radius r.
export function addEyes(head, r, { forward = 0.75, up = 0.25, side = 0.42, size = 0.13, ring = false } = {}) {
  const eyeMat = mat(EYE, { basic: true });
  const shine = mat(WHITE, { basic: true });
  const er = r * size;
  for (const s of [-1, 1]) {
    const x = s * r * side;
    const z = r * forward;
    // A white ring keeps dark eyes readable on dark faces (raven).
    if (ring) mesh(sphere(er * 1.3, 10, 8), shine, head, x, r * up, z - er * 0.6);
    mesh(sphere(er, 10, 8), eyeMat, head, x, r * up, z);
    mesh(sphere(er * 0.35, 6, 4), shine, head, x + er * 0.35, r * up + er * 0.4, z + er * 0.6);
  }
}

// Builds a four-legged animal facing +Z from a parameter set (see index.js presets).
export function buildQuadruped(o) {
  const coat = mat(o.color);
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);

  // Body: a capsule lying along Z inside a scaled shell (stripes/spots live in the shell).
  const shell = new THREE.Group();
  shell.position.y = o.bodyY;
  shell.scale.set(o.bodyScale?.[0] ?? 1, o.bodyScale?.[1] ?? 1, 1);
  body.add(shell);
  const torso = mesh(capsule(o.bodyR, o.bodyLen), coat, shell);
  torso.rotation.x = Math.PI / 2;
  const halfLen = o.bodyLen / 2 + o.bodyR;

  if (o.belly) {
    const belly = mesh(sphere(o.bodyR * 0.9), mat(o.belly), shell, 0, -o.bodyR * 0.25, 0);
    belly.scale.set(0.85, 0.75, (halfLen / o.bodyR) * 0.8);
  }
  if (o.stripes) {
    const stripe = mat(o.stripes);
    const ring = geo(`stripe${o.bodyR}`, () => new THREE.TorusGeometry(o.bodyR * 0.97, o.bodyR * 0.06, 6, 28));
    const n = 7;
    // Only along the straight part of the capsule, where the rings sit flush.
    const span = o.bodyLen * 0.9;
    for (let i = 0; i < n; i++) mesh(ring, stripe, shell, 0, 0, -span / 2 + (i / (n - 1)) * span);
  }
  if (o.spots) {
    const spot = mat(o.spots);
    const pattern = o.spotPattern ?? [[0.6, 0.3], [-0.3, 0.5], [0.2, -0.4], [-0.7, -0.2], [1.2, 0.1], [-1.1, 0.6]];
    for (const [zf, a] of pattern) {
      const angle = a * Math.PI;
      // Mostly embedded in the body so only a flat-looking patch shows.
      mesh(sphere(o.bodyR * 0.34, 10, 8), spot, shell,
        Math.sin(angle) * o.bodyR * 0.8, Math.cos(angle) * o.bodyR * 0.8, zf * o.bodyLen * 0.45);
    }
  }

  // Legs: pivots inside the body volume, hooves/paws at the end.
  const legMat = mat(o.legColor ?? o.color);
  const legX = (o.bodyR * (o.bodyScale?.[0] ?? 1)) - o.legR * 1.2;
  const legY = o.bodyY - o.bodyR * 0.45;
  const legs = [];
  for (const [x, z] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) {
    const pivot = addLimb(body, {
      x: x * legX, y: legY, z: z * o.bodyLen * 0.42,
      radius: o.legR, length: o.legLen, material: legMat, jointRadius: o.legR * 1.25,
    });
    if (o.hoof) mesh(geo(`hoof${o.legR}`, () => new THREE.CylinderGeometry(o.legR * 1.05, o.legR * 1.15, o.legR * 0.9, 10)), mat(o.hoof), pivot, 0, -(o.legLen + o.legR * 1.55), 0);
    legs.push(pivot);
  }

  // Neck and head. The neck starts inside the front of the body.
  const neck = new THREE.Group();
  neck.position.set(0, o.bodyY + o.bodyR * 0.3, halfLen * 0.75);
  neck.rotation.x = o.neckAngle ?? 0.6; // lean forward
  body.add(neck);
  const neckLen = o.neckLen ?? 0.2;
  mesh(capsule(o.neckR ?? o.bodyR * 0.55, neckLen), coat, neck, 0, neckLen / 2, 0);
  const head = new THREE.Group();
  head.position.set(0, neckLen + (o.neckR ?? o.bodyR * 0.55) * 0.6, 0);
  head.rotation.x = -(o.neckAngle ?? 0.6); // keep the face level
  neck.add(head);
  const headMesh = mesh(sphere(o.headR, 20, 14), mat(o.headColor ?? o.color), head);
  if (o.headScale) headMesh.scale.set(...o.headScale);
  if (o.snout) {
    const snout = mesh(sphere(o.headR * o.snout.r, 14, 10), mat(o.snout.color ?? o.color), head, 0, -o.headR * 0.2, o.headR * o.snout.z);
    snout.scale.set(1, 0.8, o.snout.long ?? 1);
    if (o.snout.nose) mesh(sphere(o.headR * 0.13, 8, 6), mat(o.snout.nose), head, 0, -o.headR * 0.05, o.headR * (o.snout.z + o.snout.r * (o.snout.long ?? 1) * 0.95));
  }
  addEyes(head, o.headR, o.eyes);

  // Ears.
  const earMat = mat(o.earColor ?? o.headColor ?? o.color);
  if (o.ears === 'round') {
    for (const s of [-1, 1]) mesh(sphere(o.headR * 0.3, 10, 8), earMat, head, s * o.headR * 0.62, o.headR * 0.72, -o.headR * 0.1).scale.set(1, 1, 0.5);
  } else if (o.ears === 'pointy') {
    for (const s of [-1, 1]) {
      const ear = mesh(geo(`pointy${o.headR}`, () => new THREE.ConeGeometry(o.headR * 0.3, o.headR * 0.55, 4)), earMat, head, s * o.headR * 0.5, o.headR * 0.85, -o.headR * 0.1);
      ear.rotation.z = -s * 0.25;
    }
  } else if (o.ears === 'long') {
    for (const s of [-1, 1]) {
      const ear = mesh(capsule(o.headR * 0.18, o.headR * 1.3), earMat, head, s * o.headR * 0.3, o.headR * 1.5, -o.headR * 0.15);
      ear.rotation.z = -s * 0.12;
      ear.scale.z = 0.5;
    }
  } else if (o.ears === 'floppy') {
    for (const s of [-1, 1]) {
      const ear = mesh(capsule(o.headR * 0.22, o.headR * 0.6), earMat, head, s * o.headR * 0.85, o.headR * 0.1, -o.headR * 0.1);
      ear.rotation.z = s * 0.25;
      ear.scale.z = 0.45;
    }
  } else if (o.ears === 'side') {
    for (const s of [-1, 1]) {
      const ear = mesh(capsule(o.headR * 0.16, o.headR * 0.45), earMat, head, s * o.headR * 0.85, o.headR * 0.45, -o.headR * 0.1);
      ear.rotation.z = -s * 1.1;
      ear.scale.z = 0.5;
    }
  } else if (o.ears === 'big') {
    for (const s of [-1, 1]) {
      const ear = mesh(sphere(o.headR * 0.75, 14, 10), earMat, head, s * o.headR * 0.95, o.headR * 0.05, -o.headR * 0.25);
      ear.scale.set(0.25, 1.1, 0.9);
      ear.rotation.y = s * 0.4;
    }
  }

  // Features.
  if (o.mane) {
    const maneMat = mat(o.mane);
    const ring = mesh(sphere(o.headR * 1.45, 18, 14), maneMat, head, 0, o.headR * 0.05, -o.headR * 0.35);
    ring.scale.set(1, 1, 0.65);
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      mesh(sphere(o.headR * 0.42, 8, 6), maneMat, head, Math.cos(a) * o.headR * 1.35, Math.sin(a) * o.headR * 1.35, -o.headR * 0.35);
    }
  }
  if (o.crest) {
    // Short upright mane along the neck (zebra).
    const crest = mesh(geo(`crest${neckLen}`, () => new THREE.BoxGeometry(0.06, neckLen + 0.3, 0.14)), mat(o.crest), neck, 0, neckLen / 2 + 0.05, -(o.neckR ?? o.bodyR * 0.55) * 0.75);
    crest.castShadow = true;
  }
  if (o.horns) {
    for (const s of [-1, 1]) {
      const horn = mesh(geo(`horn${o.headR}`, () => new THREE.ConeGeometry(o.headR * 0.12, o.headR * 0.55, 8)), mat(o.horns), head, s * o.headR * 0.4, o.headR * 0.9, -o.headR * 0.15);
      horn.rotation.z = -s * (o.hornSpread ?? 0.35);
      horn.rotation.x = -0.2;
    }
  }
  if (o.ossicones) {
    for (const s of [-1, 1]) {
      mesh(capsule(o.headR * 0.08, o.headR * 0.4), mat(o.color), head, s * o.headR * 0.28, o.headR * 1.05, -o.headR * 0.2);
      mesh(sphere(o.headR * 0.13, 8, 6), mat(o.ossicones), head, s * o.headR * 0.28, o.headR * 1.35, -o.headR * 0.2);
    }
  }
  if (o.goatee) {
    const g = mesh(geo(`goatee${o.headR}`, () => new THREE.ConeGeometry(o.headR * 0.14, o.headR * 0.5, 6)), mat(o.goatee), head, 0, -o.headR * 0.85, o.headR * 0.55);
    g.rotation.x = Math.PI;
  }
  let trunk = null;
  if (o.trunk) {
    // Three segments curling down from the face.
    trunk = new THREE.Group();
    trunk.position.set(0, -o.headR * 0.15, o.headR * 0.85);
    head.add(trunk);
    let parent = trunk;
    const segs = [];
    for (let i = 0; i < 3; i++) {
      const seg = new THREE.Group();
      seg.rotation.x = i === 0 ? -0.45 : 0.3; // out from the face, then curling in
      parent.add(seg);
      const r = o.headR * (0.22 - i * 0.035);
      const len = o.headR * 0.62;
      mesh(sphere(r * 1.05, 10, 8), mat(o.color), seg);
      mesh(capsule(r, len), mat(o.color), seg, 0, -len / 2 - r * 0.5, 0);
      const next = new THREE.Group();
      next.position.y = -len - r * 0.5;
      seg.add(next);
      segs.push(seg);
      parent = next;
    }
    trunk.userData.segs = segs;
  }

  // Tail.
  const tail = new THREE.Group();
  tail.position.set(0, o.bodyY + o.bodyR * 0.35, -halfLen * 0.9);
  body.add(tail);
  if (o.tail) {
    tail.rotation.x = o.tail.angle ?? -2.5;
    const tLen = o.tail.len;
    mesh(capsule(o.tail.r, tLen), mat(o.tail.color ?? o.color), tail, 0, tLen / 2, 0);
    if (o.tail.tuft) mesh(sphere(o.tail.r * 2.4, 8, 6), mat(o.tail.tuft), tail, 0, tLen + o.tail.r, 0);
    if (o.tail.puff) mesh(sphere(o.tail.puff, 10, 8), mat(o.tail.color ?? WHITE), tail, 0, 0, 0);
  }

  return {
    root, body, head, neck, legs, tail, trunk,
    radius: Math.max(halfLen * 0.85, o.bodyR * 1.2),
    gait: o.gait ?? 8,
  };
}
