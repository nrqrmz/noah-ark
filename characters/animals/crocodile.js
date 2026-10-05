import * as THREE from 'three';
import { mat, geo, sphere, capsule, mesh, addLimb } from '../rig.js';
import { addEyes } from './quadruped.js';

const GREEN = 0x4f9a45;
const DARK_GREEN = 0x3a7a34;
const BELLY = 0xc3d68a;

// Friendly crocodile, adapted from coin-collector's model: rounded snout,
// no teeth, big eyes, and legs attached inside the body. Faces +Z.
// Long and low like a real one: about 2.5 long and 0.4 wide, belly near the
// ground, a slim snout and short legs splayed out to the sides.
export function buildCrocodile() {
  const skin = mat(GREEN);
  const dark = mat(DARK_GREEN);
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);

  const bodyY = 0.19;
  const torso = mesh(capsule(0.18, 0.6), skin, body, 0, bodyY, 0);
  torso.rotation.x = Math.PI / 2;
  torso.scale.set(1.15, 1, 0.7); // wider than tall: a flat back
  const belly = mesh(sphere(0.17, 16, 10), mat(BELLY), body, 0, 0.12, 0);
  belly.scale.set(1.1, 0.4, 2.3);

  // Soft bumps along the back instead of spikes.
  for (let i = 0; i < 5; i++) {
    for (const x of [-0.07, 0.07]) mesh(sphere(0.04, 8, 6), dark, body, x, 0.3, -0.32 + i * 0.16);
  }

  // Head: a slim rounded snout and a hinged upper jaw (no teeth). The hinge sits
  // inside the front of the body.
  const head = new THREE.Group();
  head.position.set(0, bodyY, 0.42);
  body.add(head);
  const lower = mesh(capsule(0.085, 0.4), skin, head, 0, -0.03, 0.28);
  lower.rotation.x = Math.PI / 2;
  lower.scale.set(1.3, 1, 0.55);
  const upperJaw = new THREE.Group();
  upperJaw.position.set(0, 0.02, 0);
  head.add(upperJaw);
  const upper = mesh(capsule(0.095, 0.4), skin, upperJaw, 0, 0.045, 0.28);
  upper.rotation.x = Math.PI / 2;
  upper.scale.set(1.3, 1, 0.6);
  for (const x of [-0.035, 0.035]) mesh(sphere(0.018, 6, 4), mat(0x23331f, { basic: true }), upperJaw, x, 0.085, 0.54);
  // Big friendly eyes on bumps.
  const eyes = new THREE.Group();
  eyes.position.set(0, 0.12, 0.06);
  upperJaw.add(eyes);
  for (const x of [-0.085, 0.085]) mesh(sphere(0.065, 12, 10), skin, eyes, x, 0, 0);
  const eyeHolder = new THREE.Group();
  eyes.add(eyeHolder);
  for (const s of [-1, 1]) {
    const e = new THREE.Group();
    e.position.set(s * 0.085, 0.012, 0);
    eyeHolder.add(e);
    mesh(sphere(0.048, 10, 8), mat(0xffffff), e, 0, 0, 0.028);
    addEyes(e, 0.048, { forward: 1.4, up: 0.1, side: 0, size: 0.6 });
  }

  // Short legs splayed out to the sides: pivots inside the body, each leg leaning
  // outward so its flat foot rests on the ground beside the belly.
  const legs = [];
  const splay = 0.6;
  for (const [x, z] of [[-0.17, 0.27], [0.17, 0.27], [-0.17, -0.27], [0.17, -0.27]]) {
    const s = Math.sign(x);
    const pivot = addLimb(body, { x, y: 0.13, z, radius: 0.045, length: 0.05, material: skin, jointRadius: 0.065 });
    pivot.rotation.z = s * splay;
    const foot = mesh(sphere(0.06, 10, 8), skin, pivot, 0, -0.12, 0.03);
    foot.rotation.z = -s * splay; // flat on the ground
    foot.scale.set(1, 0.5, 1.3);
    legs.push(pivot);
  }

  // Tail: tapering chain of segments.
  const tail = new THREE.Group();
  tail.position.set(0, bodyY, -0.46);
  body.add(tail);
  let parent = tail;
  const segs = [];
  for (let i = 0; i < 4; i++) {
    const seg = new THREE.Group();
    seg.position.z = i === 0 ? 0 : -0.26;
    parent.add(seg);
    const r = 0.13 - i * 0.025;
    mesh(sphere(r, 10, 8), skin, seg).scale.set(1.2, 0.7, 1);
    const piece = mesh(capsule(r * 0.95, 0.16), skin, seg, 0, 0, -0.14);
    piece.rotation.x = Math.PI / 2;
    piece.scale.set(1.2, 1, 0.7);
    segs.push(seg);
    parent = seg;
  }
  tail.userData.segs = segs;

  return { root, body, head, upperJaw, legs, tail, radius: 0.7, gait: 7 };
}
