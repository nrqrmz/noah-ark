import * as THREE from 'three';
import { mat, geo, sphere, mesh, addLimb } from '../rig.js';
import { addEyes } from './quadruped.js';

const LOOKS = {
  dove: { body: 0xf4f4f0, wing: 0xe2e2dc, beak: 0xd9a0a0, feet: 0xd98080 },
  raven: { body: 0x26262e, wing: 0x1b1b22, beak: 0x1b1b1b, feet: 0x3a3a3a },
};

// Dove or raven facing +Z. Wings hinge at the shoulders (inside the body).
export function buildBird(kind) {
  const look = LOOKS[kind];
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);

  const torso = mesh(sphere(0.2, 16, 12), mat(look.body), body, 0, 0.32, 0);
  torso.scale.set(0.9, 0.85, 1.3);
  const tailFan = mesh(geo('birdTail', () => new THREE.BoxGeometry(0.16, 0.03, 0.2)), mat(look.wing), body, 0, 0.36, -0.3);
  tailFan.rotation.x = -0.35;

  const head = new THREE.Group();
  head.position.set(0, 0.5, 0.18);
  body.add(head);
  mesh(sphere(0.12, 14, 10), mat(look.body), head);
  const beak = mesh(geo('beak', () => new THREE.ConeGeometry(0.035, 0.1, 8)), mat(look.beak), head, 0, -0.01, 0.15);
  beak.rotation.x = Math.PI / 2;
  addEyes(head, 0.12, { forward: 0.55, up: 0.25, side: 0.62, size: 0.2, ring: kind === 'raven' });

  // Wings: flattened spheres hanging from pivots inside the body.
  const wings = [];
  for (const s of [-1, 1]) {
    const pivot = new THREE.Group();
    pivot.position.set(s * 0.12, 0.4, 0.02);
    body.add(pivot);
    // Folded flat against the body side; flapping rotates it out and up.
    const w = mesh(sphere(0.16, 12, 8), mat(look.wing), pivot, s * 0.05, -0.1, -0.04);
    w.scale.set(0.3, 0.75, 1.35);
    wings.push({ pivot, side: s });
  }

  // Short legs with feet.
  const legs = [];
  for (const s of [-1, 1]) {
    const leg = addLimb(body, { x: s * 0.07, y: 0.2, radius: 0.018, length: 0.08, material: mat(look.feet), jointRadius: 0.03 });
    mesh(geo('foot', () => new THREE.BoxGeometry(0.06, 0.015, 0.08)), mat(look.feet), leg, 0, -0.13, 0.02);
    legs.push(leg);
  }

  // Beak holder for the olive leaf (scene 7).
  const beakTip = new THREE.Group();
  beakTip.position.set(0, -0.02, 0.21);
  head.add(beakTip);

  return { root, body, head, legs, wings, beakTip, radius: 0.3, gait: 12 };
}
