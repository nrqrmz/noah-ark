import * as THREE from 'three';
import { mat, geo, sphere, capsule, mesh, addLimb, limbEnd, approach } from './rig.js';
import {
  TORSO_R, SKIRT_TOP, SKIRT_TOP_R, SKIRT_BOTTOM_R, HIP_Y, LEG_X, LEG_R, LEG_LEN,
  SANDAL_SIZE, SANDAL_Y, SANDAL_Z, SIT_DROP, SKIRT_OVERLAP, HIP_SHRINK, hipRadius, hipHalfHeight, overlapRadii, maxSwing, skirtPose,
} from './skirt.js';

// People are modeled at a nominal height of 2.2 units (big cartoon head) and
// scaled to `look.height`. They face +Z.
const NOMINAL_HEIGHT = 2.2;

const ARM_R = 0.095;
const ARM_LEN = 0.38;
const HEAD_R = 0.27;
const HEAD_Y = 2.0;
const SHOULDER_Y = 1.62;

const EYE_DARK = 0x231a14;
const SANDAL = 0x6b4a2b;

export const FAMILY = [
  { id: 'noah', look: { tunic: 0xd8c3a0, belt: 0x8b6b47, hair: 0xf2f2f2, hairStyle: 'short', beard: 'long', beardColor: 0xf2f2f2, skin: 0xc99a6e } },
  { id: 'noahWife', look: { tunic: 0x7b2d3b, belt: 0x4e1c25, hair: 0xd0d0d0, hairStyle: 'long', beard: 'none', skin: 0xc99a6e, female: true } },
  { id: 'shem', look: { tunic: 0x3f6fb5, belt: 0x274a7a, hair: 0x4a3222, hairStyle: 'short', beard: 'full', skin: 0xb5835a } },
  { id: 'shemWife', look: { tunic: 0x3f6fb5, belt: 0x274a7a, hair: 0x1d1a18, hairStyle: 'long', beard: 'none', skin: 0xd4a77c, female: true } },
  { id: 'ham', look: { tunic: 0x4f8f4a, belt: 0x335f30, hair: 0x1d1a18, hairStyle: 'short', beard: 'short', skin: 0xa8774f } },
  { id: 'hamWife', look: { tunic: 0x4f8f4a, belt: 0x335f30, hair: 0xd9772b, hairStyle: 'long', beard: 'none', skin: 0xd4a77c, female: true } },
  { id: 'japheth', look: { tunic: 0xc0643a, belt: 0x7f3f22, hair: 0x9c4a24, hairStyle: 'short', beard: 'none', skin: 0xc99a6e } },
  { id: 'japhethWife', look: { tunic: 0xc0643a, belt: 0x7f3f22, hair: 0xe3c26b, hairStyle: 'shoulder', beard: 'none', skin: 0xd4a77c, female: true } },
];

export function familyLook(id) {
  return FAMILY.find((m) => m.id === id).look;
}

// ---------- Parts ----------

function addHair(head, look) {
  const hairMat = mat(look.hair);
  // Cap over the top and back of the head.
  const cap = mesh(
    geo('hairCap', () => new THREE.SphereGeometry(HEAD_R * 1.07, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.58)),
    hairMat, head
  );
  cap.rotation.x = -0.6;
  if (look.hairStyle === 'short') return;
  // Loose hair falling down the back: to the shoulders or to mid-back.
  const long = look.hairStyle === 'long';
  const len = long ? 0.78 : 0.38;
  const back = mesh(
    geo(`hairBack${len}`, () => new THREE.CapsuleGeometry(0.2, len, 6, 12)),
    hairMat, head, 0, -len / 2 - 0.02, -0.17
  );
  back.scale.set(1.35, 1, 0.55);
  // Side locks framing the face.
  for (const x of [-1, 1]) {
    const lock = mesh(geo(`hairLock${len}`, () => new THREE.CapsuleGeometry(0.075, len * 0.55, 4, 8)), hairMat, head, x * 0.22, -0.18 - len * 0.12, -0.04);
    lock.rotation.z = x * 0.08;
  }
}

function addBeard(head, look) {
  if (!look.beard || look.beard === 'none') return;
  const beardMat = mat(look.beardColor ?? look.hair);
  const sizes = { short: [0.17, 0.12], full: [0.21, 0.2], long: [0.23, 0.42] };
  const [r, drop] = sizes[look.beard];
  const beard = mesh(sphere(r), beardMat, head, 0, -0.14 - drop * 0.35, 0.12);
  beard.scale.set(1.15, (drop + r) / (r * 1.4), 0.75);
  // Mustache.
  const mustache = mesh(capsule(0.035, 0.12), beardMat, head, 0, -0.07, 0.25);
  mustache.rotation.z = Math.PI / 2;
}

function addFace(head, look) {
  const eyeMat = mat(look.mask ? 0xffffff : EYE_DARK, { basic: true });
  // Masked eyes sit a little forward so they show on the band.
  for (const x of [-0.095, 0.095]) mesh(sphere(0.038, 10, 8), eyeMat, head, x, 0.04, HEAD_R * (look.mask ? 1.01 : 0.93));
  if (look.mask) {
    // The band wraps over the hair too (wider than the hair cap), so it reads from every side.
    const band = mesh(
      geo('mask', () => new THREE.CylinderGeometry(HEAD_R * 1.1, HEAD_R * 1.1, 0.12, 24, 1, true)),
      mat(0x151515), head, 0, 0.04, 0
    );
    band.material.side = THREE.DoubleSide;
  }
  // Mouth: hidden unless a gesture needs it (laughing, mocking).
  const mouth = mesh(geo('mouth', () => new THREE.SphereGeometry(0.06, 12, 8)), mat(0x5a1f1f, { basic: true }), head, 0, -0.1, HEAD_R * 0.9);
  mouth.scale.set(1.3, 0.5, 0.4);
  mouth.visible = false;
  return mouth;
}

// ---------- Person ----------

export function createPerson(look) {
  look = { height: 1.8, hairStyle: 'short', beard: 'none', female: false, mask: false, ...look };
  const skin = mat(look.skin);
  const tunic = mat(look.tunic, { roughness: 0.9 });
  const belt = mat(look.belt, { roughness: 0.9 });

  const root = new THREE.Group();
  const body = new THREE.Group(); // bobs and leans; root carries world position
  root.add(body);
  root.scale.setScalar(look.height / NOMINAL_HEIGHT);

  // Torso (upper tunic) and skirt. Women's tunics reach the ankles, men's mid-shin.
  // The skirt splits at hip height: the lower part tilts, shortens and folds into
  // a lap with the legs (characters/skirt.js) so no leg ever pokes through it.
  mesh(capsule(TORSO_R, 0.42), tunic, body, 0, 1.38);
  const hem = look.female ? 0.1 : 0.3;
  const hipR = hipRadius(hem);
  mesh(
    geo(`skirtUp${hem}`, () => new THREE.CylinderGeometry(SKIRT_TOP_R, hipR, SKIRT_TOP - HIP_Y, 18)),
    tunic, body, 0, (SKIRT_TOP + HIP_Y) / 2
  );
  const skirt = new THREE.Group();
  skirt.position.y = HIP_Y;
  body.add(skirt);
  mesh(
    geo(`skirtLow${hem}`, () => new THREE.CylinderGeometry(hipR, SKIRT_BOTTOM_R, HIP_Y - hem, 18)),
    tunic, skirt, 0, -(HIP_Y - hem) / 2
  );
  mesh(
    geo(`skirtOverlap${hem}`, () => new THREE.CylinderGeometry(...overlapRadii(hem), SKIRT_OVERLAP, 18)),
    tunic, skirt, 0, SKIRT_OVERLAP / 2
  );
  const hip = mesh(sphere(1, 18, 12), tunic, body, 0, HIP_Y);
  hip.scale.set(hipR * HIP_SHRINK, hipHalfHeight(0), hipR * HIP_SHRINK);
  const beltRing = mesh(geo('belt', () => new THREE.TorusGeometry(TORSO_R * 1.03, 0.04, 8, 24)), belt, body, 0, 1.15);
  beltRing.rotation.x = Math.PI / 2;

  // Head.
  const head = new THREE.Group();
  head.position.y = HEAD_Y;
  body.add(head);
  mesh(sphere(HEAD_R, 24, 16), skin, head);
  addHair(head, look);
  addBeard(head, look);
  const mouth = addFace(head, look);

  // Arms: pivots inside the torso; sleeves in the tunic color, hands in skin.
  const shoulderX = TORSO_R - ARM_R * 0.5;
  const arm = (side) => {
    const pivot = addLimb(body, { x: side * shoulderX, y: SHOULDER_Y, radius: ARM_R, length: ARM_LEN, material: tunic });
    mesh(sphere(ARM_R * 1.05), skin, pivot, 0, -limbEnd(ARM_R, ARM_LEN) + ARM_R, 0);
    return pivot;
  };
  const armL = arm(-1);
  const armR = arm(1);

  // Legs: pivots inside the skirt; sandals at the bottom.
  const leg = (side) => {
    const pivot = addLimb(body, { x: side * LEG_X, y: HIP_Y, radius: LEG_R, length: LEG_LEN, material: skin });
    const foot = mesh(geo('sandal', () => new THREE.BoxGeometry(...SANDAL_SIZE)), mat(SANDAL), pivot, 0, SANDAL_Y, SANDAL_Z);
    foot.castShadow = true;
    return pivot;
  };
  const legL = leg(-1);
  const legR = leg(1);

  return {
    root, body, head, armL, armR, legL, legR, mouth, look, skirt, hip, hem,
    swing: Math.min(WALK_SWING, maxSwing(hem)),
    radius: 0.42 * (look.height / NOMINAL_HEIGHT) * 1.3,
    t: Math.random() * 10,
    walkPhase: 0,
    sitW: 0,
  };
}

const MUTED_TUNICS = [0x8a8f99, 0x9b8e7e, 0x7f8c7a, 0xa08f8f, 0x8e8aa3, 0x998a6f];
const MUTED_BELTS = [0x5d6169, 0x6b5f50, 0x56604f, 0x6e5f5f, 0x5f5b72, 0x6a5d47];
const TOWN_HAIR = [0x2a211b, 0x4a3222, 0x1d1a18, 0x6b4a2b, 0x3b2a1e, 0x8a5a3a];
const TOWN_SKIN = [0xc99a6e, 0xb5835a, 0xa8774f, 0xd4a77c];

// Generic townsperson; the same seed always gives the same look.
// `hair` overrides the picked hair color (the scene 1 thief is blond so his mask stands out).
export function createTownsperson(seed, { mask = false, hair } = {}) {
  const pick = (arr, k) => arr[(seed * 7 + k * 3) % arr.length];
  const female = seed % 2 === 1;
  return createPerson({
    height: 1.7 + ((seed * 13) % 5) * 0.04,
    tunic: pick(MUTED_TUNICS, 0),
    belt: pick(MUTED_BELTS, 0),
    hair: hair ?? pick(TOWN_HAIR, 1),
    skin: pick(TOWN_SKIN, 2),
    hairStyle: female ? (seed % 4 === 1 ? 'long' : 'shoulder') : 'short',
    beard: female ? 'none' : ['none', 'short', 'full'][seed % 3],
    female,
    mask,
  });
}

// ---------- Animation ----------

// Walking arm swing (and the leg swing, capped so legs stay inside the skirt).
const WALK_SWING = 0.7;
const KICK = -1.1;

// Arm targets per gesture: [left x, left z, right x, right z]. Positive z on the
// right arm (and negative on the left) lifts the arm sideways.
const GESTURE_ARMS = {
  idle: [0, -0.12, 0, 0.12],
  openArms: [-0.4, -1.15, -0.4, 1.15],
  laugh: [-0.7, -0.35, -0.7, 0.35],
  mock: [0, -0.12, -1.45, 0.15],
  disbelief: [-2.5, -0.5, -2.5, 0.5],
  turnAway: [0, -0.12, 0, 0.12],
  chop: [0, 0, 0, 0],
  wave: [0, -0.12, 0, 2.6],
  kick: [-0.35, -0.45, 0.35, 0.3],
  handsOnHead: [0.7, -3.0, 0.7, 3.0],
  sit: [0, -0.25, 0, 0.25],
  carry: [-1.05, -0.08, -1.05, 0.08],
};

export function updatePerson(p, dt, { moving = false, gesture = null } = {}) {
  p.t += dt;
  const g = gesture ?? 'idle';
  let [lx, lz, rx, rz] = GESTURE_ARMS[g] ?? GESTURE_ARMS.idle;
  let bob = 0;
  let shake = 0;
  let legLT = 0;
  let legRT = 0;

  if (moving) {
    p.walkPhase += dt * 9;
    const wave = Math.sin(p.walkPhase);
    legLT = wave * p.swing;
    legRT = -legLT;
    bob = Math.abs(Math.cos(p.walkPhase)) * 0.06;
    if (g === 'idle') {
      lx = -wave * WALK_SWING * 0.8;
      rx = wave * WALK_SWING * 0.8;
    }
  }

  // Seated weight: legs fold forward and the body drops until the hips rest on the ground.
  p.sitW = approach(p.sitW, g === 'sit' ? 1 : 0, dt, 5);
  if (p.sitW < 1e-3) p.sitW = 0;

  if (g === 'chop') {
    // Both arms raised together, swinging down like an axe stroke.
    const s = (Math.sin(p.t * 6) + 1) / 2;
    lx = rx = -2.7 + s * 1.9;
    lz = -0.15;
    rz = 0.15;
  } else if (g === 'wave') {
    rz = 2.6 + Math.sin(p.t * 10) * 0.3;
  } else if (g === 'laugh') {
    shake = Math.sin(p.t * 28) * 0.05;
    bob = Math.abs(Math.sin(p.t * 14)) * 0.04;
  } else if (g === 'mock') {
    rx += Math.sin(p.t * 8) * 0.12;
  } else if (g === 'kick') {
    // The right leg swings forward and back again, over and over.
    legRT = Math.sin(p.t * 5) > 0.2 ? KICK : 0.2;
    if (!moving) legLT = 0;
  }
  if (p.sitW > 0) {
    legLT = legRT = -Math.PI / 2 * p.sitW;
    bob = 0;
  }

  p.mouth.visible = g === 'laugh' || g === 'mock';
  if (p.mouth.visible) p.mouth.scale.y = 0.5 + Math.abs(Math.sin(p.t * 14)) * 0.5;

  p.armL.rotation.x = approach(p.armL.rotation.x, lx, dt);
  p.armL.rotation.z = approach(p.armL.rotation.z, lz, dt);
  p.armR.rotation.x = approach(p.armR.rotation.x, rx, dt);
  p.armR.rotation.z = approach(p.armR.rotation.z, rz, dt);
  p.legL.rotation.x = approach(p.legL.rotation.x, legLT, dt, 14);
  p.legR.rotation.x = approach(p.legR.rotation.x, legRT, dt, 14);

  // The lower skirt follows the legs so they never poke through it.
  const pose = skirtPose(p.hem, p.legL.rotation.x, p.legR.rotation.x, p.sitW);
  p.skirt.rotation.x = pose.tilt;
  p.skirt.scale.set(1, pose.length, pose.depth);
  p.hip.scale.y = hipHalfHeight(p.sitW);

  p.bob = approach(p.bob ?? 0, bob, dt, 14);
  p.body.position.y = p.bob - SIT_DROP * p.sitW;
  p.body.rotation.z = shake;
  p.body.rotation.y = approach(p.body.rotation.y, g === 'turnAway' ? Math.PI : 0, dt, 4);
  p.head.rotation.z = g === 'mock' ? 0.15 : approach(p.head.rotation.z, 0, dt);
  // Disbelief: a slow side-to-side head shake ("oh, sure").
  p.head.rotation.y = approach(p.head.rotation.y, g === 'disbelief' ? Math.sin(p.t * 3) * 0.35 : 0, dt, 8);
  if (!moving && g === 'idle') p.body.scale.y = 1 + Math.sin(p.t * 2.5) * 0.012; // breathing
  else p.body.scale.y = 1;
}

// Turns a person (root) to face a ground point.
export function facePoint(p, x, z) {
  p.root.rotation.y = Math.atan2(x - p.root.position.x, z - p.root.position.z);
}
