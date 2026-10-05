import * as THREE from 'three';
import { createPerson, familyLook } from '../characters/people.js';

// Genesis 6:15 proportions: 300 x 50 x 30 cubits (length : width : height).
// The blueprint uses them exactly. The 3D ark is a chunkier storybook ark so it
// reads as a big boat next to people (a true-scale ark would be 80 people long).
const HEIGHT_RATIO = 30 / 300;
const STORY_WIDTH = 0.3;
const STORY_HULL = 0.2;
const STORY_CABIN = 0.11;
const STORY_ROOF = 0.06;
const HULL_ROWS = 8;

const WOOD = 0x9a6334;
const WOOD_DARK = 0x6e4422;
const PITCH = 0x3a2a1c;
const ROOF = 0x7a4a26;

function box(w, h, d, color, parent, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshStandardMaterial({ color, roughness: 0.85 })
  );
  m.position.set(x, y, z);
  m.castShadow = m.receiveShadow = true;
  parent.add(m);
  return m;
}

// The ark lies along X; its door is on the +Z side. Its keel sits at y = 0.
export function createArk({ length = 14 } = {}) {
  const width = length * STORY_WIDTH;
  const hullH = length * STORY_HULL;
  const cabinH = length * STORY_CABIN;
  const roofH = length * STORY_ROOF;
  const height = hullH + cabinH + roofH;
  const root = new THREE.Group();
  const pieces = []; // in build order; setBuilt reveals a prefix of this list

  // Hull: stacked plank rows, each a little longer and wider than the one below.
  const rowH = hullH / HULL_ROWS;
  for (let i = 0; i < HULL_ROWS; i++) {
    const t = i / (HULL_ROWS - 1);
    const rowLen = length * (0.82 + 0.18 * t);
    const rowW = width * (0.78 + 0.22 * t);
    const row = box(rowLen, rowH * 0.94, rowW, i % 2 ? WOOD : WOOD_DARK, root, 0, rowH * (i + 0.5), 0);
    pieces.push(row);
  }
  // Pitch stripe along the waterline (Genesis 6:14).
  const pitch = box(length * 0.84, rowH * 0.5, width * 0.81, PITCH, root, 0, rowH * 0.6, 0);
  pieces.push(pitch);

  // Cabin (upper decks) with a window strip under the roof, and the roof.
  const cabin = box(length * 0.62, cabinH, width * 0.78, WOOD, root, 0, hullH + cabinH / 2, 0);
  pieces.push(cabin);
  const windowStrip = box(length * 0.5, cabinH * 0.22, width * 0.8, 0x2b1d12, root, 0, hullH + cabinH * 0.78, 0);
  pieces.push(windowStrip);
  const roofShape = new THREE.Shape();
  const roofW = width * 0.95;
  roofShape.moveTo(-roofW / 2, 0);
  roofShape.lineTo(roofW / 2, 0);
  roofShape.lineTo(0, roofH);
  roofShape.closePath();
  const roofGeo = new THREE.ExtrudeGeometry(roofShape, { depth: length * 0.68, bevelEnabled: false });
  roofGeo.translate(0, 0, -length * 0.34);
  roofGeo.rotateY(Math.PI / 2);
  const roof = new THREE.Mesh(roofGeo, new THREE.MeshStandardMaterial({ color: ROOF, roughness: 0.9 }));
  roof.position.y = hullH + cabinH;
  roof.castShadow = true;
  root.add(roof);
  pieces.push(roof);

  // Door in the side, hinged at its bottom edge; open, it becomes a ramp to the ground.
  const doorW = length * 0.1;
  const doorH = hullH * 0.75;
  const doorY = rowH * 1.2; // hinge height
  const hinge = new THREE.Group();
  hinge.position.set(length * 0.12, doorY, width / 2 + 0.02);
  root.add(hinge);
  const door = box(doorW, doorH, 0.12, WOOD_DARK, hinge, 0, doorH / 2, 0);
  // Cleats so it reads as a ramp when open.
  for (let i = 1; i < 5; i++) box(doorW * 0.9, 0.05, 0.06, WOOD, door, 0, -doorH / 2 + (i * doorH) / 5, 0.07);
  pieces.push(hinge);
  const doorway = box(doorW * 0.96, doorH * 0.98, 0.04, 0x1e140c, root, length * 0.12, doorY + doorH / 2, width / 2);
  doorway.castShadow = false;
  // Fully open: the door tilts past horizontal until its top edge touches the ground.
  const openAngle = Math.PI / 2 + Math.asin(Math.min(1, doorY / doorH));

  let built = 1;
  let doorOpen = 0;
  function apply() {
    const shown = Math.round(built * pieces.length);
    pieces.forEach((p, i) => { p.visible = i < shown; });
    doorway.visible = built >= 1 && doorOpen > 0.02;
    hinge.rotation.x = doorOpen * openAngle;
  }
  apply();

  return {
    root,
    length, width, height,
    // Where the ramp meets the ground, in the ark's local space.
    rampFoot: new THREE.Vector3(length * 0.12, 0, width / 2 + Math.sqrt(Math.max(0, doorH * doorH - doorY * doorY))),
    doorPoint: new THREE.Vector3(length * 0.12, doorY, width / 2),
    door: hinge,
    setBuilt(p) { built = Math.max(0, Math.min(1, p)); apply(); },
    setDoor(p) { doorOpen = Math.max(0, Math.min(1, p)); apply(); },
    // Solidity footprint: circles along the hull, in the ark's local space.
    footprint: Array.from({ length: 7 }, (_, i) => ({ x: (i / 6 - 0.5) * length * 0.8, z: 0, r: width * 0.55 })),
  };
}

// Blueprint drawn in glowing lines on the XY plane (side view), with tappable
// light points for each part (Genesis 6:14–16) and a tiny Noah at true scale.
export function createBlueprint({ length = 14 } = {}) {
  const height = length * HEIGHT_RATIO;
  const root = new THREE.Group();
  const lineMat = new THREE.LineBasicMaterial({ color: 0xbfe8ff, transparent: true, opacity: 0.9 });
  const faintMat = new THREE.LineBasicMaterial({ color: 0xbfe8ff, transparent: true, opacity: 0.35 });

  const line = (pts, material = lineMat, parent = root) => {
    const g = new THREE.BufferGeometry().setFromPoints(pts.map(([x, y]) => new THREE.Vector3(x, y, 0)));
    const l = new THREE.Line(g, material);
    parent.add(l);
    return l;
  };
  const L = length / 2;
  const hullH = height * 0.62;
  const top = height * 0.9;

  // Outline (always visible, faint until the parts are revealed).
  line([[-L * 0.82, 0], [L * 0.82, 0], [L, hullH], [-L, hullH], [-L * 0.82, 0]], faintMat);
  line([[-L * 0.62, hullH], [-L * 0.62, top], [L * 0.62, top], [L * 0.62, hullH]], faintMat);
  line([[-L * 0.68, top], [0, top + height * 0.16], [L * 0.68, top]], faintMat);

  const parts = {};
  const part = (name) => {
    const g = new THREE.Group();
    g.visible = false;
    root.add(g);
    parts[name] = g;
    return g;
  };

  // Length: dimension line under the hull with end ticks.
  const lengthPart = part('length');
  line([[-L, -0.6], [L, -0.6]], lineMat, lengthPart);
  line([[-L, -0.3], [-L, -0.9]], lineMat, lengthPart);
  line([[L, -0.3], [L, -0.9]], lineMat, lengthPart);
  // Decks: three levels.
  const decks = part('decks');
  for (const y of [hullH / 3, (2 * hullH) / 3, hullH]) line([[-L * 0.9, y], [L * 0.9, y]], lineMat, decks);
  // Window: just under the roof.
  const win = part('window');
  line([[-L * 0.45, top - 0.25], [L * 0.45, top - 0.25], [L * 0.45, top - 0.05], [-L * 0.45, top - 0.05], [-L * 0.45, top - 0.25]], lineMat, win);
  // Door: in the side.
  const door = part('door');
  const dx = length * 0.12;
  const dw = length * 0.05;
  line([[dx - dw, hullH * 0.12], [dx - dw, hullH * 0.74], [dx + dw, hullH * 0.74], [dx + dw, hullH * 0.12], [dx - dw, hullH * 0.12]], lineMat, door);
  // Pitch: the hull filled with a dark amber coat, inside and out.
  const pitch = part('pitch');
  const pitchShape = new THREE.Shape([
    new THREE.Vector2(-L * 0.82, 0), new THREE.Vector2(L * 0.82, 0), new THREE.Vector2(L, hullH), new THREE.Vector2(-L, hullH),
  ]);
  const pitchMesh = new THREE.Mesh(new THREE.ShapeGeometry(pitchShape), new THREE.MeshBasicMaterial({ color: 0xc58a3a, transparent: true, opacity: 0.35, depthWrite: false }));
  pitchMesh.position.z = -0.01;
  pitch.add(pitchMesh);

  // Tappable light points, one per part.
  const pointGeo = new THREE.SphereGeometry(0.45, 16, 12);
  const pointAt = { length: [0, -0.6], decks: [-L * 0.45, hullH / 2], window: [L * 0.3, top - 0.15], door: [dx, hullH * 0.43], pitch: [-L * 0.75, hullH * 0.2] };
  const points = {};
  for (const [name, [x, y]] of Object.entries(pointAt)) {
    const p = new THREE.Mesh(pointGeo, new THREE.MeshStandardMaterial({ color: 0xfff2b0, emissive: 0xffd27a, emissiveIntensity: 0.6 }));
    p.position.set(x, y, 0.2);
    root.add(p);
    points[name] = p;
  }

  // Tiny Noah for scale: a person is 1.7 m and the ark 135 m long.
  const noah = createPerson({ ...familyLook('noah'), height: (length * 1.7) / 135 });
  noah.root.position.set(L + 0.4, -0.6, 0.1);
  root.add(noah.root);

  return {
    root,
    points,
    reveal(name) {
      parts[name].visible = true;
      points[name].visible = false;
    },
    setGlow(v) {
      lineMat.opacity = 0.9;
      faintMat.opacity = 0.35 + 0.55 * v;
      lineMat.color.setHex(v > 0 ? 0xffffff : 0xbfe8ff);
    },
  };
}
