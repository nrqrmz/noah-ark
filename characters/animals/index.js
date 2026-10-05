import { approach } from '../rig.js';
import { buildQuadruped } from './quadruped.js';
import { buildCrocodile } from './crocodile.js';
import { buildBird } from './bird.js';

// Parameter sets for every four-legged species. Units: a person is 1.8 tall.
const PRESETS = {
  lion: {
    color: 0xd9a650, bodyR: 0.27, bodyLen: 1.0, bodyY: 0.8, bodyScale: [0.88, 1], waist: 0.8, legR: 0.08, legLen: 0.42, legTaper: 0.65,
    headR: 0.23, headScale: [1, 0.92, 1.12], snout: { pads: true, r: 0.45, z: 0.95, long: 1.1, color: 0xf2dcae, nose: 0x5a3a2a },
    ears: 'feline', eyes: { forward: 0.95, up: 0.22, side: 0.42, size: 0.14 }, neckLen: 0.16, neckR: 0.13, neckAngle: 0.75, paws: true,
    tail: { len: 0.7, r: 0.035, angle: -2.3, tuft: 0x8a4d1e }, mane: 0x9a5422, gait: 9,
  },
  cow: {
    color: 0xf3efe8, bodyR: 0.42, bodyLen: 0.85, bodyY: 0.9, legR: 0.12, legLen: 0.36,
    headR: 0.3, snout: { r: 0.55, z: 0.7, color: 0xf2b8b0, nose: 0x8a5a55 }, ears: 'side',
    neckLen: 0.12, neckAngle: 1.0, hoof: 0x4a3a30, horns: 0xf2e6c8, hornSpread: 1.0,
    tail: { len: 0.6, r: 0.035, angle: -2.9, tuft: 0x3b3230 },
    coat: { kind: 'spots', mark: 0x3b3230, parts: { body: 7 } },
  },
  giraffe: {
    color: 0xeec46b, bodyR: 0.36, bodyLen: 0.6, bodyY: 1.55, legR: 0.09, legLen: 1.0,
    headR: 0.25, headScale: [0.9, 0.9, 1.25], snout: { r: 0.5, z: 0.7, color: 0xe8b65a, nose: 0x6b4a2b }, ears: 'side',
    neckLen: 1.3, neckR: 0.13, neckAngle: 0.35, ossicones: 0x6b4a2b, hoof: 0x5a4030,
    coat: { kind: 'patches', mark: 0xa86a32, parts: { body: 36, neck: 18, legs: 14 } },
    tail: { len: 0.5, r: 0.03, angle: -2.8, tuft: 0x5a4030 }, crest: 0xa86a32,
  },
  rabbit: {
    color: 0xd9cfc4, bodyR: 0.17, bodyLen: 0.12, bodyY: 0.24, legR: 0.055, legLen: 0.06,
    headR: 0.15, snout: { r: 0.4, z: 0.75, color: 0xf2ebe4, nose: 0xe39aa6 }, ears: 'long', earColor: 0xe7c9c4,
    neckLen: 0.02, neckAngle: 0.3, gait: 11,
    tail: { len: 0.01, r: 0.01, angle: -1.6, puff: 0.08, color: 0xffffff },
  },
  goat: {
    color: 0xf0ece4, bodyR: 0.27, bodyLen: 0.45, bodyY: 0.62, legR: 0.07, legLen: 0.3,
    headR: 0.2, headScale: [0.95, 1, 1.15], snout: { r: 0.5, z: 0.72, color: 0xe8e2d6, nose: 0x9a8a80 }, ears: 'side',
    neckLen: 0.15, neckAngle: 0.5, horns: 0xb59a73, hornSpread: 0.2, goatee: 0xd8d0c0, hoof: 0x5a4a40,
    tail: { len: 0.14, r: 0.035, angle: -0.8 },
  },
  elephant: {
    color: 0x9aa3ad, bodyR: 0.7, bodyLen: 0.75, bodyY: 1.25, bodyScale: [1.05, 1], legR: 0.22, legLen: 0.5,
    headR: 0.55, ears: 'big', earColor: 0x8e97a1, trunk: true, hoof: 0xd9d4c6,
    neckLen: 0.05, neckAngle: 0.2, eyes: { forward: 0.82, up: 0.2, side: 0.45, size: 0.09 },
    tail: { len: 0.55, r: 0.04, angle: -2.9, tuft: 0x5d646c }, gait: 5,
  },
  dog: {
    color: 0xc8955a, bodyR: 0.2, bodyLen: 0.32, bodyY: 0.45, legR: 0.07, legLen: 0.17,
    headR: 0.19, snout: { r: 0.5, z: 0.75, long: 1.25, color: 0xe6c393, nose: 0x2a1e18 }, ears: 'floppy', earColor: 0x8a5a32,
    neckLen: 0.08, neckAngle: 0.7, belly: 0xe6c393,
    tail: { len: 0.3, r: 0.04, angle: -0.6 }, gait: 10,
  },
  cat: {
    color: 0xe8862a, bodyR: 0.14, bodyLen: 0.24, bodyY: 0.3, legR: 0.045, legLen: 0.12,
    headR: 0.15, snout: { r: 0.35, z: 0.78, color: 0xf6dcb4, nose: 0xe39aa6 }, ears: 'pointy',
    neckLen: 0.04, neckAngle: 0.6, coat: { kind: 'stripes', mark: 0xb85c14, parts: { body: 7, legs: 4 } },
    tail: { len: 0.36, r: 0.03, angle: -0.35 }, gait: 10,
  },
  zebra: {
    color: 0xf7f7f2, bodyR: 0.37, bodyLen: 0.75, bodyY: 0.95, legR: 0.09, legLen: 0.45,
    headR: 0.24, headScale: [0.9, 0.95, 1.35], snout: { r: 0.5, z: 0.8, color: 0x2a2a2a }, ears: 'pointy',
    neckLen: 0.35, neckR: 0.15, neckAngle: 0.6, hoof: 0x2a2a2a, crest: 0x1f1f1f,
    tail: { len: 0.55, r: 0.035, angle: -2.8, tuft: 0x1f1f1f },
    // Temporary painted stripes on the body; Task 6 rebuilds the zebra.
    coat: { kind: 'stripes', mark: 0x1f1f1f, parts: { body: 11 } },
  },
};

// Female variations: slightly smaller, and a few species get their own detail.
function femaleOverrides(id) {
  if (id === 'lion') {
    // No mane; a long, narrow wedge of a head with a longer, narrower muzzle.
    return {
      mane: null, headScale: [0.92, 0.78, 1.25], headTilt: 0.22, eyes: { ...PRESETS.lion.eyes, up: 0.2, side: 0.38, forward: 1.08, size: 0.12 },
      snout: { ...PRESETS.lion.snout, r: 0.35, z: 1.08, long: 1.3 },
    };
  }
  if (id === 'cow') return { coat: { ...PRESETS.cow.coat, seed: 5 } }; // her own spot layout
  if (id === 'cat') {
    // Gray tabby; the male is the orange one.
    return {
      color: 0x9a9a9a, snout: { ...PRESETS.cat.snout, color: 0xd8d8d8 },
      coat: { ...PRESETS.cat.coat, mark: 0x6e6e6e },
    };
  }
  if (id === 'goat') return { goatee: null };
  return {};
}

export function createAnimal(id, sex = 'male') {
  let model;
  if (id === 'crocodile') model = buildCrocodile();
  else if (id === 'dove' || id === 'raven') model = buildBird(id);
  else model = buildQuadruped({ ...PRESETS[id], ...(sex === 'female' ? femaleOverrides(id) : {}) });
  if (sex === 'female') {
    model.root.scale.setScalar(0.88);
    model.radius *= 0.88;
  }
  return { ...model, id, sex, t: Math.random() * 10, phase: 0 };
}

// Walking (diagonal leg pairs), a "no" head shake, flying (birds), tail wag.
export function updateAnimal(a, dt, { moving = false, shake = false, fly = false } = {}) {
  a.t += dt;
  let swing = 0;
  if (moving) {
    a.phase += dt * a.gait;
    swing = Math.sin(a.phase) * 0.55;
  }
  a.legs.forEach((leg, i) => {
    const diagonal = i === 0 || i === 3 ? 1 : -1;
    const target = a.wings ? swing * diagonal : swing * diagonal;
    leg.rotation.x = approach(leg.rotation.x, fly ? -0.9 : target, dt, 14);
  });
  a.body.position.y = moving ? Math.abs(Math.cos(a.phase)) * 0.03 : approach(a.body.position.y, 0, dt);

  // Head shake: a quick side-to-side "no".
  const shakeY = shake ? Math.sin(a.t * 18) * 0.45 : 0;
  a.head.rotation.y = approach(a.head.rotation.y, shakeY, dt, 20);

  if (a.wings) {
    const flap = fly ? Math.sin(a.t * 16) * 1.1 : 0;
    for (const w of a.wings) w.pivot.rotation.z = approach(w.pivot.rotation.z, w.side * (fly ? flap : -0.05), dt, fly ? 30 : 10);
  }
  if (a.tail?.userData.segs) {
    a.tail.userData.segs.forEach((s, i) => { s.rotation.y = Math.sin(a.t * 3 - i * 0.7) * 0.15; });
  } else if (a.tail) {
    a.tail.rotation.z = Math.sin(a.t * 4) * 0.25;
  }
  if (a.trunk) {
    a.trunk.userData.segs.forEach((s, i) => { s.rotation.z = Math.sin(a.t * 1.5 - i * 0.6) * 0.15; });
  }
  if (a.upperJaw) a.upperJaw.rotation.x = -Math.abs(Math.sin(a.t * 0.8)) * 0.12;
}
