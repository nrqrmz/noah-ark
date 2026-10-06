import * as THREE from 'three';
import { createPreachingState, LISTENERS } from './state/preaching.js';
import { createLandscape, disposeTree, stepToward, keepApart } from './common.js';
import { createPerson, createTownsperson, familyLook, updatePerson, facePoint } from '../characters/people.js';
import { createHouse } from '../world/props.js';
import { mat, mesh, sphere } from '../characters/rig.js';

// Tappable listeners in an arc beside and behind Noah, left to right, so each
// faces both Noah and (in profile or three-quarter) the camera. Their reaction
// depends on tap order (see the state), not on who is tapped.
const NOAH_AT = [0, 1];
const NOAH_TURN = 0.45; // three-quarter toward the left half of the crowd
const LISTENER_SPOTS = [
  { seed: 3, at: [-3.2, 0.9] },
  { seed: 4, at: [-2.2, -1.2] },
  { seed: 7, at: [2.2, -1.2] },
  { seed: 6, at: [3.2, 0.9] },
];
const EDGE_X = 10; // side edges of the square, well off screen
// A walker (and their shadow) fits in this sphere; once it leaves the camera
// view they are gone.
const OFF_VIEW_RADIUS = 1.8;
const LEAVE_SPEED = 3; // the 4th listener storms off
const WALK_OFF_SPEED = 0.9; // the others drift away slowly
const HOLD_TIME = 0.4; // reactions finish before the backs turn (within TURN_TIME)
const BOW = 0.3; // Noah's bowed head, radians

// Turns a person's root smoothly toward a heading (radians), the short way round.
function turnToward(p, heading, dt, speed = 8) {
  const r = p.root.rotation;
  const delta = Math.atan2(Math.sin(heading - r.y), Math.cos(heading - r.y));
  r.y += delta * (1 - Math.exp(-speed * dt));
}

// Scene 2: Noah preaches in the town square; nobody listens.
export default function createScene(ctx) {
  const state = createPreachingState();
  const listeners = [];
  const feasters = [];
  let landscape;
  let noah;
  let turnAt = Infinity; // when the others turn their backs on Noah
  let walkingOff = false; // ...and now walk away slowly
  let t = 0;

  // True once a person and their shadow are outside the camera view.
  const frustum = new THREE.Frustum();
  const viewSphere = new THREE.Sphere(new THREE.Vector3(), OFF_VIEW_RADIUS);
  function offView(p) {
    const cam = ctx.camera;
    cam.updateMatrixWorld();
    frustum.setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse));
    viewSphere.center.set(p.root.position.x, 0.9, p.root.position.z);
    return !frustum.intersectsSphere(viewSphere);
  }

  const everyoneGone = () => listeners.every((L) => !L.person.root.visible);

  function buildSquare() {
    const plaza = mesh(new THREE.CircleGeometry(6.5, 40), mat(0xd9c7a3, { roughness: 1 }), ctx.root, 0, 0.02, 0);
    plaza.rotation.x = -Math.PI / 2;
    plaza.receiveShadow = true;
    [[-6, -6], [-1.5, -7], [3.5, -6.5], [7.5, -4]].forEach(([x, z], i) => {
      const h = createHouse(i + 1);
      h.position.set(x, 0, z);
      ctx.root.add(h);
    });
    // A feast table behind Noah: they keep eating and drinking (Matthew 24:38).
    const table = mesh(new THREE.BoxGeometry(3.2, 0.12, 1.1), mat(0x8a5a32), ctx.root, -0.2, 0.85, -3.4);
    table.receiveShadow = true;
    for (const x of [-1.4, 1.2]) for (const z of [-0.4, 0.4]) mesh(new THREE.BoxGeometry(0.12, 0.85, 0.12), mat(0x6e4422), ctx.root, -0.2 + x, 0.42, -3.4 + z);
    for (let i = 0; i < 5; i++) mesh(sphere(0.13, 10, 8), mat([0xd9772b, 0xc0413c, 0x9a6a3a, 0xe3c26b, 0x7b2d3b][i]), ctx.root, -1.4 + i * 0.6, 0.98, -3.4);
  }

  return {
    build() {
      landscape = createLandscape(ctx, { mood: 'day', clouds: 4 });
      buildSquare();

      noah = createPerson(familyLook('noah'));
      noah.root.position.set(NOAH_AT[0], 0, NOAH_AT[1]);
      noah.root.rotation.y = NOAH_TURN;
      ctx.root.add(noah.root);

      LISTENER_SPOTS.forEach((spot, i) => {
        const p = createTownsperson(spot.seed);
        p.root.position.set(spot.at[0], 0, spot.at[1]);
        facePoint(p, NOAH_AT[0], NOAH_AT[1]);
        ctx.root.add(p.root);
        const id = LISTENERS[i];
        ctx.tap.mark(p.root, id);
        // Each walks out to the nearest side edge, keeping their depth, so no
        // path crosses Noah or another listener.
        const exit = { x: Math.sign(spot.at[0]) * EDGE_X, z: spot.at[1] };
        listeners.push({ id, person: p, gesture: null, exit, speed: 0 });
      });
      [-1.3, -0.2, 0.9].forEach((x, i) => {
        const p = createTownsperson(10 + i);
        p.root.position.set(x, 0, -4.3);
        ctx.root.add(p.root);
        feasters.push(p);
      });

      ctx.frame({ cx: 0, cy: 1.2, cz: 0, w: 10, h: 6, elev: 0.35, portrait: { w: 8, cy: 0.8, elev: 0.6 } });
    },

    update(dt) {
      t += dt;
      landscape.update(dt);
      for (const ev of state.tick(dt)) {
        if (ev === 'turnAway') turnAt = t + HOLD_TIME;
        if (ev === 'walkOff') walkingOff = true;
      }

      for (const L of listeners) {
        const p = L.person;
        if (!p.root.visible) continue;
        // Everyone still in the square walks off once the finale says so.
        if (walkingOff && !L.speed) {
          // Swap the body's half turn into the root so walking starts from
          // the turned-away pose without a visual jump.
          p.root.rotation.y += p.body.rotation.y;
          p.body.rotation.y = 0;
          L.speed = WALK_OFF_SPEED;
        }
        let moving = false;
        let gesture = L.gesture;
        if (L.speed) {
          const pos = p.root.position;
          turnToward(p, Math.atan2(L.exit.x - pos.x, L.exit.z - pos.z), dt);
          moving = !stepToward(pos, L.exit, L.speed, dt);
          if (!moving || offView(p)) p.root.visible = false;
          gesture = null;
        } else if (t >= turnAt) {
          gesture = 'turnAway'; // the reaction plays on until they turn
        }
        updatePerson(p, dt, { moving, gesture });
      }

      // Noah keeps preaching until the square is empty, then bows his head.
      const gone = everyoneGone();
      updatePerson(noah, dt, { gesture: gone ? null : 'openArms' });
      if (gone) noah.head.rotation.x = Math.min(BOW, noah.head.rotation.x + dt * 0.3);

      // The feasters keep eating and drinking.
      feasters.forEach((p, i) => {
        updatePerson(p, dt);
        p.armR.rotation.x = -1.6 + Math.sin(t * 2.2 + i * 1.7) * 0.5;
      });
      keepApart([noah, ...listeners.filter((L) => L.person.root.visible).map((L) => L.person)]);
    },

    onTap(id) {
      const reaction = state.tap(id);
      if (!reaction) return;
      const L = listeners.find((x) => x.id === id);
      ctx.tap.unmark(L.person.root);
      if (reaction === 'leave') L.speed = LEAVE_SPEED; // turns and storms off
      else L.gesture = reaction; // loops until the finale turns them away
    },
    isLocked: () => state.locked,
    // "Next" waits until the square is empty and Noah has bowed his head.
    isDone: () => state.done && everyoneGone() && noah.head.rotation.x >= BOW,
    dispose() { disposeTree(ctx.root); },
  };
}

