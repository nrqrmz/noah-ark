import * as THREE from 'three';
import { mat, geo, sphere, capsule, mesh, addLimb } from '../rig.js';
import { addEyes } from './quadruped.js';

const GREEN = 0x4f9a45;
const DARK_GREEN = 0x3a7a34;
const BELLY = 0xc3d68a;

// Friendly crocodile, adapted from coin-collector's model: rounded snout,
// no teeth, big eyes, and legs attached inside the body. Faces +Z.
export function buildCrocodile() {
  const skin = mat(GREEN);
  const dark = mat(DARK_GREEN);
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);

  const torso = mesh(capsule(0.42, 1.3), skin, body, 0, 0.42, 0);
  torso.rotation.x = Math.PI / 2;
  torso.scale.set(1.25, 1, 0.75);
  const belly = mesh(sphere(0.4, 16, 10), mat(BELLY), body, 0, 0.3, 0);
  belly.scale.set(1.15, 0.45, 2.1);

  // Soft bumps along the back instead of spikes.
  for (let i = 0; i < 5; i++) {
    for (const x of [-0.17, 0.17]) mesh(sphere(0.09, 8, 6), dark, body, x, 0.74, -0.65 + i * 0.3);
  }

  // Head: rounded snout and a hinged upper jaw (no teeth).
  const head = new THREE.Group();
  head.position.set(0, 0.42, 1.0);
  body.add(head);
  const lower = mesh(capsule(0.2, 0.75), skin, head, 0, -0.05, 0.5);
  lower.rotation.x = Math.PI / 2;
  lower.scale.set(1.45, 1, 0.55);
  const upperJaw = new THREE.Group();
  upperJaw.position.set(0, 0.04, 0);
  head.add(upperJaw);
  const upper = mesh(capsule(0.22, 0.75), skin, upperJaw, 0, 0.1, 0.5);
  upper.rotation.x = Math.PI / 2;
  upper.scale.set(1.45, 1, 0.6);
  for (const x of [-0.08, 0.08]) mesh(sphere(0.035, 6, 4), mat(0x23331f, { basic: true }), upperJaw, x, 0.2, 1.1);
  // Big friendly eyes on bumps.
  const eyes = new THREE.Group();
  eyes.position.set(0, 0.28, 0.12);
  upperJaw.add(eyes);
  for (const x of [-0.2, 0.2]) mesh(sphere(0.14, 12, 10), skin, eyes, x, 0, 0);
  const eyeHolder = new THREE.Group();
  eyes.add(eyeHolder);
  for (const s of [-1, 1]) {
    const e = new THREE.Group();
    e.position.set(s * 0.2, 0.02, 0);
    eyeHolder.add(e);
    mesh(sphere(0.1, 10, 8), mat(0xffffff), e, 0, 0, 0.06);
    addEyes(e, 0.1, { forward: 1.4, up: 0.1, side: 0, size: 0.6 });
  }

  // Legs: pivots inside the body.
  const legs = [];
  for (const [x, z] of [[-0.42, 0.5], [0.42, 0.5], [-0.42, -0.5], [0.42, -0.5]]) {
    const pivot = addLimb(body, { x, y: 0.36, z, radius: 0.11, length: 0.12, material: skin, jointRadius: 0.15 });
    const foot = mesh(sphere(0.13, 10, 8), skin, pivot, 0, -0.3, 0.05);
    foot.scale.set(1, 0.5, 1.3);
    legs.push(pivot);
  }

  // Tail: tapering chain of segments.
  const tail = new THREE.Group();
  tail.position.set(0, 0.42, -0.95);
  body.add(tail);
  let parent = tail;
  const segs = [];
  for (let i = 0; i < 4; i++) {
    const seg = new THREE.Group();
    seg.position.z = i === 0 ? 0 : -0.45;
    parent.add(seg);
    const r = 0.26 - i * 0.05;
    mesh(sphere(r, 10, 8), skin, seg).scale.set(1.2, 0.7, 1);
    const piece = mesh(capsule(r * 0.95, 0.3), skin, seg, 0, 0, -0.25);
    piece.rotation.x = Math.PI / 2;
    piece.scale.set(1.2, 1, 0.7);
    segs.push(seg);
    parent = seg;
  }
  tail.userData.segs = segs;

  return { root, body, head, upperJaw, legs, tail, radius: 1.3, gait: 7 };
}
