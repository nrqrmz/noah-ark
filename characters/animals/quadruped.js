import * as THREE from 'three';
import { mat, geo, sphere, capsule, mesh, addLimb } from '../rig.js';
import { coatMaterial, coatCapsule, capsuleRepeat } from './coat.js';

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

// A lion's mane: two rings of tufts (cones sweeping back and down) framing the
// face, a darker outer ring, a full back, and a ruff that covers the neck and chest.
function addMane(head, neck, r, neckR, neckLen, hex) {
  const inner = mat(hex);
  const outer = mat(new THREE.Color(hex).multiplyScalar(0.75).getHex());
  const up = new THREE.Vector3(0, 1, 0);
  // A soft tuft: a lathe teardrop with a rounded tip instead of a sharp cone point.
  const tuftGeo = (size, len) => geo(`maneTuft${size.toFixed(4)}:${len.toFixed(4)}`, () => {
    // Profile from the closed base up to the tip (this order makes the faces point outward).
    const pts = [new THREE.Vector2(1e-4, -len / 2)];
    for (let i = 0; i <= 8; i++) {
      const t = i / 8;
      pts.push(new THREE.Vector2(Math.max(1e-4, size * Math.pow(1 - Math.pow(t, 2.2), 0.55)), -len / 2 + t * len));
    }
    return new THREE.LatheGeometry(pts, 12);
  });
  const tuft = (parent, material, size, len, pos, dir) => {
    const cone = mesh(tuftGeo(size, len), material, parent);
    dir.normalize();
    cone.quaternion.setFromUnitVectors(up, dir);
    cone.position.copy(pos).addScaledVector(dir, len * 0.3);
    return cone;
  };
  // Full back behind the face, so no gaps show between the tufts.
  mesh(sphere(r * 1.05, 16, 12), inner, head, 0, -r * 0.05, -r * 0.4).scale.set(1.1, 1.2, 0.85);
  const rings = [
    { n: 12, rad: 0.95, z: -0.2, size: 0.36, len: 0.55, back: 0.9, material: inner },
    { n: 13, rad: 1.1, z: -0.55, size: 0.42, len: 0.7, back: 1.6, material: outer },
  ];
  for (const [k, ring] of rings.entries()) {
    for (let i = 0; i < ring.n; i++) {
      const a = (i / ring.n) * Math.PI * 2 + k * 0.22;
      const x = Math.cos(a);
      const y = Math.sin(a);
      // Fuller around the cheeks and down the chin, shorter on top, a bit uneven like real hair.
      const len = ring.len * r * (1 + 0.15 * Math.sin(i * 2.3)) * (y < 0 ? 1.15 : y > 0.6 ? 0.8 : 1);
      tuft(head, ring.material, ring.size * r, len,
        new THREE.Vector3(x * r * ring.rad * 1.05, y * r * ring.rad * 1.1 - r * 0.1, r * ring.z),
        new THREE.Vector3(x, y - 0.35, -ring.back));
    }
  }
  // Ruff over the top of the neck and the shoulders, in body space so it drapes
  // with gravity: a filled cape from the back of the head toward the withers,
  // tufts sweeping back along it and a few hanging under the chin. The cape sits
  // high and behind the neck's axis, so the throat and lower neck stay visible.
  const body = neck.parent;
  const base = neck.position;
  const headPos = new THREE.Vector3(0, neckLen + neckR * 0.6, 0).applyEuler(neck.rotation).add(base);
  const capeAt = base.clone().lerp(headPos, 0.7);
  const cape = mesh(sphere(r * 1.05, 16, 12), outer, body, 0, capeAt.y, capeAt.z - r * 0.35);
  cape.scale.set(0.95, 0.95, 1.25);
  for (let i = 0; i < 4; i++) {
    const t = i / 3;
    tuft(body, i % 2 ? inner : outer, r * 0.36, r * (0.65 - t * 0.15),
      new THREE.Vector3(0, headPos.y + r * 0.4 - t * r * 0.45, headPos.z - r * 0.7 - t * r * 0.9),
      new THREE.Vector3(0, -0.35, -1));
    for (const s of [-1, 1]) {
      tuft(body, outer, r * 0.32, r * (0.6 - t * 0.15),
        new THREE.Vector3(s * r * 0.6, headPos.y - t * r * 0.4, headPos.z - r * 0.6 - t * r * 0.8),
        new THREE.Vector3(s * 0.5, -0.6, -1));
    }
  }
  for (const x of [-0.4, 0, 0.4]) {
    tuft(body, inner, r * 0.4, r * 0.6,
      new THREE.Vector3(x * r, headPos.y - r * 0.8, headPos.z - r * 0.15),
      new THREE.Vector3(x * 0.6, -1, 0.25));
  }
}

// Horn shapes in head-radius units, for the horn on the +X side (mirrored for -X):
// where the base sits (inside the head), its base radius, and four segments
// (direction, length) that bend the horn along a curve to a point.
const HORNS = {
  // Cow: short, out to the side then up.
  cow: { base: [0.42, 0.68, -0.15], r: 0.13, segs: [[[1, 0.3, 0], 0.3], [[0.8, 0.8, 0], 0.24], [[0.25, 1, 0], 0.2], [[-0.1, 1, 0.05], 0.17]] },
  // Bull: long and thick, out sideways then curving forward.
  bull: { base: [0.42, 0.68, -0.15], r: 0.17, segs: [[[1, 0.2, 0], 0.42], [[1, 0.3, 0.3], 0.38], [[0.5, 0.35, 1], 0.34], [[0, 0.3, 1], 0.28]] },
  // Goat: long, up then sweeping back over the neck.
  // A rounded tip: from the side the far horn's needle point showed as a fork.
  goat: { base: [0.28, 0.8, -0.1], r: 0.24, roundTip: true, segs: [[[0.05, 1, -0.1], 0.85], [[0.08, 0.75, -0.75], 0.75], [[0.04, 0.1, -1], 0.68], [[0.02, -0.4, -1], 0.5]] },
};

// A curved horn on each side of the head: tapering segments joined by spheres,
// the last one a cone ending in a point. The base sphere sits inside the head.
function addHorns(head, r, { style, color }) {
  const shape = HORNS[style];
  const material = mat(color);
  const up = new THREE.Vector3(0, 1, 0);
  for (const s of [-1, 1]) {
    const p = new THREE.Vector3(s * shape.base[0] * r, shape.base[1] * r, shape.base[2] * r);
    let rad = shape.r * r;
    mesh(sphere(rad, 12, 10), material, head, p.x, p.y, p.z);
    shape.segs.forEach(([d, len], i) => {
      const last = i === shape.segs.length - 1;
      const dir = new THREE.Vector3(s * d[0], d[1], d[2]).normalize();
      const length = len * r;
      const next = last ? (shape.roundTip ? rad * 0.55 : 0) : shape.r * r * (1 - (i + 1) * 0.2);
      const key = `horn${rad.toFixed(4)}:${next.toFixed(4)}:${length.toFixed(4)}`;
      const seg = mesh(geo(key, () => new THREE.CylinderGeometry(next, rad, length, 12)), material, head);
      seg.quaternion.setFromUnitVectors(up, dir);
      seg.position.copy(p).addScaledVector(dir, length / 2);
      p.addScaledVector(dir, length);
      if (next > 0) mesh(sphere(next, 12, 10), material, head, p.x, p.y, p.z); // smooth the bend (or round the tip)
      rad = next;
    });
  }
}

// Builds a four-legged animal facing +Z from a parameter set (see index.js presets).
export function buildQuadruped(o) {
  const coat = mat(o.color);
  // Painted markings for the parts listed in `o.coat.parts` ({ body, neck, legs, head } counts).
  // `o.coat.pinch` / `slant` / `bareEnds` ({ part: amount }) shape stripes per part (see coat.js).
  const painted = (part, base, repeat) => {
    const count = o.coat?.parts?.[part];
    if (!count) return null;
    const seed = (o.coat.seed ?? 1) + ['body', 'neck', 'legs', 'head'].indexOf(part);
    return coatMaterial({
      base, mark: o.coat.mark, kind: o.coat.kind, seed, count, repeat,
      pinch: o.coat.pinch?.[part] ?? 0, slant: o.coat.slant?.[part] ?? 0, bareEnds: o.coat.bareEnds?.[part] ?? 0,
    });
  };
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);

  // Body: a capsule lying along Z inside a scaled shell. Its texture seam (u = 0) faces down.
  const shell = new THREE.Group();
  shell.position.y = o.bodyY;
  shell.scale.set(o.bodyScale?.[0] ?? 1, o.bodyScale?.[1] ?? 1, 1);
  body.add(shell);
  const girth = ((o.bodyScale?.[0] ?? 1) + (o.bodyScale?.[1] ?? 1)) / 2;
  const bodyCoat = painted('body', o.color, capsuleRepeat(o.bodyR, o.bodyLen, girth));
  // `waist` slims the middle: a thinner torso between a full chest and hips (big cats).
  const torsoR = o.bodyR * (o.waist ?? 1);
  const torso = mesh(bodyCoat ? coatCapsule(torsoR, o.bodyLen) : capsule(torsoR, o.bodyLen), bodyCoat ?? coat, shell);
  torso.position.y = o.waist ? o.bodyR * 0.1 : 0; // tuck the belly up, keep the back line
  torso.rotation.x = Math.PI / 2;
  const halfLen = o.bodyLen / 2 + torsoR;

  // Legs sit as far out as the body's round ends allow, so no rump or chest
  // overhangs them; each pivot stays inside the end cap (checked in shell space).
  const sx = o.bodyScale?.[0] ?? 1;
  const sy = o.bodyScale?.[1] ?? 1;
  const legX = Math.min(o.bodyR * sx - o.legR * 1.2, o.bodyR * sx * 0.5);
  const lx = legX / sx;
  const ly = (o.bodyR * 0.45) / sy;
  const capDz = Math.sqrt(Math.max(0, o.bodyR ** 2 - lx ** 2 - ly ** 2)) * 0.95;
  const legZ = o.bodyLen / 2 + Math.min(o.bodyR - o.legR * 1.15, capDz);
  if (o.waist) {
    // Deep chest hanging low over the front legs; smaller, higher hips over the hind legs.
    mesh(sphere(o.bodyR, 24, 18), coat, shell, 0, -o.bodyR * 0.12, legZ - o.bodyR * 0.4).scale.set(1, 1.18, 0.85); // chest
    mesh(sphere(o.bodyR * 0.88, 24, 18), coat, shell, 0, o.bodyR * 0.07, -legZ + o.bodyR * 0.4).scale.set(1, 1, 0.85); // hips
  }

  if (o.belly) {
    const belly = mesh(sphere(o.bodyR * 0.9), mat(o.belly), shell, 0, -o.bodyR * 0.25, 0);
    belly.scale.set(0.85, 0.75, (halfLen / o.bodyR) * 0.8);
  }

  // Legs: pivots inside the body volume, hooves/paws at the end.
  const legMat = mat(o.legColor ?? o.color);
  const legY = o.bodyY - o.bodyR * 0.45;
  // The leg reaches from its pivot down to the ground: every foot touches y = 0.
  // Below the capsule end a paw hangs 0.32·legR lower; a hoof ends where the capsule does.
  const footDrop = o.legR * (o.paws ? 2.32 : 2);
  const legLen = legY - footDrop;
  const legCoat = painted('legs', o.legColor ?? o.color, capsuleRepeat(o.legR, legLen));
  // `legTaper` (bottom/top radius) gives thick upper legs slimming toward the paw;
  // its ends hide inside the joint sphere and the paw.
  const legShape = o.legTaper && !legCoat
    ? geo(`taperLeg${o.legR}:${legLen}:${o.legTaper}`, () => new THREE.CylinderGeometry(o.legR * 1.15, o.legR * o.legTaper, legLen + o.legR * 2, 14))
    : undefined;
  const legs = [];
  for (const [i, [x, z]] of [[-1, 1], [1, 1], [-1, -1], [1, -1]].entries()) {
    const pivot = addLimb(body, {
      x: x * legX, y: legY, z: z * legZ,
      radius: o.legR, length: legLen, material: legCoat ?? legMat, jointRadius: o.legR * 1.25,
      jointMaterial: legMat, geometry: legCoat ? coatCapsule(o.legR, legLen) : legShape,
    });
    // The four legs share one texture; turning each one makes their markings differ.
    if (legCoat) pivot.children[1].rotation.y = i * 1.9;
    if (o.paws) mesh(sphere(o.legR * 1.2, 12, 8), legMat, pivot, 0, -(legLen + o.legR * 1.6), o.legR * 0.35).scale.set(1, 0.6, 1.35);
    if (o.hoof) mesh(geo(`hoof${o.legR}`, () => new THREE.CylinderGeometry(o.legR * 1.05, o.legR * 1.15, o.legR * 0.9, 10)), mat(o.hoof), pivot, 0, -(legLen + o.legR * 1.55), 0);
    legs.push(pivot);
  }

  // Neck and head. The neck starts inside the front of the body.
  const neck = new THREE.Group();
  neck.position.set(0, o.bodyY + o.bodyR * 0.3, halfLen * 0.75);
  neck.rotation.x = o.neckAngle ?? 0.6; // lean forward
  body.add(neck);
  const neckLen = o.neckLen ?? 0.2;
  const neckR = o.neckR ?? o.bodyR * 0.55;
  const neckCoat = painted('neck', o.color, o.neckTaper ? [1, 1] : capsuleRepeat(neckR, neckLen));
  // `neckTaper` [base, top] (radius factors) makes a cone-like neck, thick at the withers
  // and slim under the head; it runs from inside the body up to the head's center.
  const [baseF, topF] = o.neckTaper ?? [1, 1];
  const neckFrom = -neckR * 0.5;
  const neckTo = neckLen + neckR * 0.6;
  const neckMesh = o.neckTaper
    ? mesh(geo(`taperNeck${neckR}:${neckLen}:${baseF}:${topF}`, () => new THREE.CylinderGeometry(neckR * topF, neckR * baseF, neckTo - neckFrom, 18)), neckCoat ?? coat, neck, 0, (neckFrom + neckTo) / 2, 0)
    : mesh(neckCoat ? coatCapsule(neckR, neckLen) : capsule(neckR, neckLen), neckCoat ?? coat, neck, 0, neckLen / 2, 0);
  if (o.neckDepth) neckMesh.scale.z = o.neckDepth; // deeper front to back than side to side (horse)
  const head = new THREE.Group();
  head.position.set(0, neckLen + neckR * 0.6, 0);
  head.rotation.x = -(o.neckAngle ?? 0.6); // keep the face level
  neck.add(head);
  const headCoat = painted('head', o.headColor ?? o.color);
  const headMesh = mesh(sphere(o.headR, 20, 14), headCoat ?? mat(o.headColor ?? o.color), head);
  const hs = o.headScale ?? [1, 1, 1];
  if (headCoat) {
    // A painted head turns its poles front to back, so its stripes ring the face
    // (vertical from the side) instead of running level around it.
    headMesh.rotation.x = Math.PI / 2 + (o.headTilt ?? 0);
    headMesh.scale.set(hs[0], hs[2], hs[1]);
  } else {
    if (o.headScale) headMesh.scale.set(...o.headScale);
    if (o.headTilt) headMesh.rotation.x = o.headTilt; // nose-down: a sloping brow into the muzzle
  }
  if (o.snout?.pads) {
    // Feline muzzle: a nose bridge, two puffy whisker pads, a small chin and a
    // wide triangular nose on top. `r` sets the pad size, `long` how far it reaches.
    const sn = o.snout;
    const r = o.headR;
    const long = sn.long ?? 1;
    const padMat = mat(sn.color ?? o.color);
    const front = r * sn.z;
    // The bridge ends just behind the nose; a longer muzzle gets a longer bridge.
    const reach = r * (0.2 * long + 0.26); // half length plus cap radius
    const bridge = mesh(capsule(r * 0.26, r * 0.4 * long), mat(o.headColor ?? o.color), head,
      0, r * 0.002 + reach * Math.sin(0.3), front + r * 0.26 - reach * Math.cos(0.3));
    bridge.rotation.x = Math.PI / 2 + 0.3;
    bridge.scale.set(1.1, 1, 0.85); // broad at the brow, so the head tapers into the muzzle
    const padR = r * sn.r * 0.6;
    for (const s of [-1, 1]) {
      mesh(sphere(padR, 14, 10), padMat, head, s * padR * 0.72, -r * 0.2, front + r * 0.12 * long).scale.set(1, 0.85, 0.9 * long);
    }
    mesh(sphere(padR * 0.75, 10, 8), padMat, head, 0, -r * 0.4, front).scale.set(1, 0.7, 0.9);
    if (sn.nose) {
      const nose = mesh(geo(`catNose${r}`, () => new THREE.ConeGeometry(r * 0.15, r * 0.16, 3)), mat(sn.nose), head, 0, r * 0.03, front + r * 0.32);
      nose.rotation.x = Math.PI / 2; // apex forward, one corner pointing down
      nose.scale.set(1.2, 0.6, 0.8);
    }
  } else if (o.snout?.bovine) {
    // Cattle muzzle: a broad, flat pad across the front of the long head (a capsule
    // lying sideways, flattened front to back) with two oval nostrils on its front face.
    const r = o.headR;
    const sn = o.snout;
    const front = r * sn.z;
    const pad = mesh(capsule(r * 0.36, r * 0.4), mat(sn.color), head, 0, -r * 0.3, front);
    pad.rotation.z = Math.PI / 2;
    pad.scale.set(0.95, 1, 0.8);
    const nostril = mat(sn.nostril);
    for (const s of [-1, 1]) {
      const n = mesh(sphere(r * 0.075, 10, 8), nostril, head, s * r * 0.2, -r * 0.24, front + r * 0.27);
      n.scale.set(0.8, 1.2, 0.5);
      n.rotation.z = s * 0.45; // tipped toward each other, like a cow's nostrils
    }
  } else if (o.snout?.caprine) {
    // Goat face: a long, narrow wedge running forward and down from the skull,
    // ending in a dark nose pad with two nostrils on its front and a mouth line below.
    const r = o.headR;
    const sn = o.snout;
    const muzzle = new THREE.Group();
    muzzle.position.set(0, -r * 0.1, r * 0.2); // starts inside the skull
    muzzle.rotation.x = sn.tilt ?? 0.45; // nose down
    head.add(muzzle);
    const len = r * sn.len;
    const back = r * 0.66;
    const front = r * 0.42;
    const faceMat = mat(sn.color ?? o.color);
    const wedge = mesh(geo(`goatFace${r}:${len}`, () => new THREE.CylinderGeometry(front, back, len, 16)), faceMat, muzzle, 0, 0, len / 2);
    wedge.rotation.x = Math.PI / 2; // narrow end forward
    wedge.scale.set(0.78, 1, 0.92); // narrow side to side
    mesh(sphere(front, 14, 10), faceMat, muzzle, 0, 0, len).scale.set(0.78, 0.92, 0.8); // rounded snout end
    const pad = mesh(sphere(front * 0.75, 12, 10), mat(sn.nose), muzzle, 0, front * 0.15, len + front * 0.55);
    pad.scale.set(1, 0.75, 0.55);
    const nostril = mat(sn.nostril);
    for (const s of [-1, 1]) {
      const n = mesh(sphere(front * 0.2, 8, 6), nostril, muzzle, s * front * 0.3, front * 0.15, len + front * 0.92);
      n.scale.set(0.75, 1.25, 0.5);
      n.rotation.z = s * 0.4;
    }
    const mouth = mesh(capsule(r * 0.022, front * 0.7), nostril, muzzle, 0, -front * 0.62, len + front * 0.45);
    mouth.rotation.z = Math.PI / 2;
  } else if (o.snout?.horse) {
    // Horse face: a long muzzle tapering forward and down from the skull (striped
    // like the head when it is painted), ending in a dark, rounded nose with two
    // nostrils on its front and a mouth line below.
    const r = o.headR;
    const sn = o.snout;
    const muzzle = new THREE.Group();
    muzzle.position.set(0, -r * 0.2, r * 0.3); // starts inside the skull
    muzzle.rotation.x = sn.tilt ?? 0.55; // nose down
    head.add(muzzle);
    const len = r * sn.len;
    const back = r * (sn.back ?? 0.8);
    const front = r * (sn.front ?? 0.5);
    const faceMat = painted('head', sn.color ?? o.headColor ?? o.color) ?? mat(sn.color ?? o.headColor ?? o.color);
    const face = mesh(geo(`horseFace${r}:${len}`, () => new THREE.CylinderGeometry(front, back, len, 18)), faceMat, muzzle, 0, 0, len / 2);
    face.rotation.x = Math.PI / 2; // narrow end forward
    face.scale.set(0.8, 1, 0.95); // narrow side to side
    const noseMat = mat(sn.nose);
    // Rounded tip, wider than the face so it hides its rim (`tip` sets its size).
    const tipR = front * (sn.tip ?? 1.1);
    mesh(sphere(tipR, 16, 12), noseMat, muzzle, 0, 0, len - front * 0.05).scale.set(0.9, 1, 0.95);
    const nostril = mat(sn.nostril);
    for (const s of [-1, 1]) {
      if (sn.slits) {
        // Narrow slit nostrils high on the soft lip, tops leaning in (giraffe).
        // Set into the tip's front surface at that height.
        const z = len - front * 0.05 + 0.95 * Math.sqrt(tipR ** 2 - (front * 0.4) ** 2) - front * 0.04;
        const n = mesh(sphere(front * 0.2, 8, 6), nostril, muzzle, s * front * 0.36, front * 0.4, z);
        n.scale.set(0.3, 1.3, 0.4);
        n.rotation.z = s * 0.5;
      } else {
        const n = mesh(sphere(front * 0.2, 8, 6), nostril, muzzle, s * front * 0.4, front * 0.12, len + front * 0.8);
        n.scale.set(0.7, 1.2, 0.5);
        n.rotation.z = s * 0.35;
      }
    }
    const mouth = mesh(capsule(r * 0.02, front * 0.75), nostril, muzzle, 0, -front * 0.55, len + front * 0.55);
    mouth.rotation.z = Math.PI / 2;
  } else if (o.snout) {
    const snout = mesh(sphere(o.headR * o.snout.r, 14, 10), mat(o.snout.color ?? o.color), head, 0, -o.headR * 0.2, o.headR * o.snout.z);
    snout.scale.set(1, 0.8, o.snout.long ?? 1);
    if (o.snout.nose) mesh(sphere(o.headR * 0.13, 8, 6), mat(o.snout.nose), head, 0, -o.headR * 0.05, o.headR * (o.snout.z + o.snout.r * (o.snout.long ?? 1) * 0.95));
  }
  addEyes(head, o.headR, o.eyes);

  // Ears.
  const earMat = mat(o.earColor ?? o.headColor ?? o.color);
  if (o.ears === 'round') {
    for (const s of [-1, 1]) mesh(sphere(o.headR * 0.3, 10, 8), earMat, head, s * o.headR * 0.62, o.headR * 0.72, -o.headR * 0.1).scale.set(1, 1, 0.5);
  } else if (o.ears === 'feline') {
    // Small rounded ears on the top corners of the head (big cats).
    for (const s of [-1, 1]) {
      const hs = o.headScale ?? [1, 1, 1];
      const ear = mesh(sphere(o.headR * 0.19, 10, 8), earMat, head, s * o.headR * 0.68 * hs[0], o.headR * 0.68 * hs[1], -o.headR * 0.15 * hs[2]);
      ear.scale.set(0.85, 1.25, 0.4); // a rounded point, not a round disc
      ear.rotation.z = -s * 0.6; // tipped outward, on the top corners of the head
    }
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
      const ear = mesh(capsule(o.headR * 0.16, o.headR * 0.45), earMat, head, s * o.headR * 0.85, o.headR * 0.45, -o.headR * (o.earBack ?? 0.1));
      ear.rotation.z = -s * 1.1;
      ear.scale.z = 0.5;
    }
  } else if (o.ears === 'horse') {
    // Tall leaf-shaped ears standing up on top of the skull, tips leaning out.
    for (const s of [-1, 1]) {
      const ear = mesh(sphere(o.headR * 0.27, 12, 10), earMat, head, s * o.headR * 0.42, o.headR * 1.05, -o.headR * 0.2);
      ear.scale.set(0.6, 1.8, 0.4);
      ear.rotation.z = -s * 0.22;
      if (o.earTip) mesh(sphere(o.headR * 0.1, 8, 6), mat(o.earTip), ear, 0, o.headR * 0.2, 0);
    }
  } else if (o.ears === 'big') {
    for (const s of [-1, 1]) {
      const ear = mesh(sphere(o.headR * 0.75, 14, 10), earMat, head, s * o.headR * 0.95, o.headR * 0.05, -o.headR * 0.25);
      ear.scale.set(0.25, 1.1, 0.9);
      ear.rotation.y = s * 0.4;
    }
  }

  // Features.
  if (o.mane) addMane(head, neck, o.headR, neckR, neckLen, o.mane);
  if (o.crest?.style === 'horse') {
    // Upright brush mane along the whole back of the neck, from between the ears
    // down to the withers, its base buried in the neck.
    // It leans with a tapered neck so it stays on the neck's back edge all the way up.
    const reach = neckLen + neckR * 0.6 + o.headR * 0.5;
    const depth = neckR * (o.neckDepth ?? 1);
    const r = neckR * 0.7;
    const backBase = depth * baseF;
    const backTop = depth * topF;
    const lean = Math.atan2(backBase - backTop, neckTo - neckFrom);
    const crest = mesh(capsule(r, reach - r), mat(o.crest.color), neck, 0, reach / 2, -(backBase + backTop) / 2 * 0.95);
    crest.scale.set(0.38, 1, 1);
    crest.rotation.x = lean; // tips its top forward, onto the slimmer upper neck
  } else if (o.crest) {
    // Short upright mane along the neck (giraffe).
    const crest = mesh(geo(`crest${neckLen}`, () => new THREE.BoxGeometry(0.06, neckLen + 0.3, 0.14)), mat(o.crest), neck, 0, neckLen / 2 + 0.05, -neckR * 0.75);
    crest.castShadow = true;
  }
  if (o.horns) addHorns(head, o.headR, o.horns);
  if (o.hump) {
    // Bull's shoulder hump: centered inside the front-top of the body, swelling above the back.
    const hump = mesh(sphere(o.bodyR * 0.7, 20, 14), coat, shell, 0, o.bodyR * 0.55, o.bodyLen * 0.25);
    hump.scale.set(1, 1, 1.25);
  }
  if (o.ossicones) {
    for (const s of [-1, 1]) {
      mesh(capsule(o.headR * 0.08, o.headR * 0.4), mat(o.color), head, s * o.headR * 0.28, o.headR * 1.05, -o.headR * 0.2);
      mesh(sphere(o.headR * 0.13, 8, 6), mat(o.ossicones), head, s * o.headR * 0.28, o.headR * 1.35, -o.headR * 0.2);
    }
  }
  if (o.goatee) {
    const g = mesh(geo(`goatee${o.headR}`, () => new THREE.ConeGeometry(o.headR * 0.16, o.headR * 0.6, 6)), mat(o.goatee), head, 0, -o.headR * 0.85, o.headR * 0.8);
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
    if (o.tail.hair) {
      // A hair switch from the end of the tail: covers its tip, swells, then narrows
      // to a rounded point.
      const { len: hLen, r: hR, color } = o.tail.hair;
      mesh(geo(`tailHair${hLen}:${hR}`, () => {
        const pts = [new THREE.Vector2(1e-4, 0)];
        for (let i = 0; i <= 12; i++) {
          const t = i / 12;
          pts.push(new THREE.Vector2(Math.max(1e-4, hR * Math.sin(Math.PI * (0.18 + 0.82 * t)) ** 0.6), t * hLen));
        }
        return new THREE.LatheGeometry(pts, 12);
      }), mat(color), tail, 0, tLen * 0.75, 0);
    }
    if (o.tail.puff) mesh(sphere(o.tail.puff, 10, 8), mat(o.tail.color ?? WHITE), tail, 0, 0, 0);
  }

  return {
    root, body, head, neck, legs, tail, trunk,
    // A waisted body is short between its legs; its footprint reaches the paws.
    radius: Math.max(halfLen * 0.85, o.bodyR * 1.2, o.waist ? legZ + o.legR * 1.25 : 0),
    gait: o.gait ?? 8,
  };
}
