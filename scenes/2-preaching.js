import * as THREE from 'three';
import { createPreachingState } from './state/preaching.js';
import { createLandscape, disposeTree, stepToward, keepApart } from './common.js';
import { createPerson, createTownsperson, familyLook, updatePerson, facePoint } from '../characters/people.js';
import { createHouse } from '../world/props.js';
import { mat, mesh, sphere } from '../characters/rig.js';

// Tappable listeners around Noah, each with its reaction once tapped.
const LISTENERS = [
  { id: 'person-laugh', seed: 3, at: [-2.8, -0.6] },
  { id: 'person-mock', seed: 4, at: [-1.9, 1.7] },
  { id: 'person-ears', seed: 7, at: [1.9, 1.7] },
  { id: 'person-leave', seed: 6, at: [2.8, -0.6] },
];

// Scene 2: Noah preaches in the town square; nobody listens.
export default function createScene(ctx) {
  const state = createPreachingState();
  const listeners = [];
  const feasters = [];
  let landscape;
  let noah;
  let alone = false;
  let t = 0;

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
      noah.root.position.set(0, 0, 0);
      ctx.root.add(noah.root);

      for (const L of LISTENERS) {
        const p = createTownsperson(L.seed);
        p.root.position.set(L.at[0], 0, L.at[1]);
        facePoint(p, 0, 0);
        ctx.root.add(p.root);
        ctx.tap.mark(p.root, L.id);
        listeners.push({ ...L, person: p, gesture: null, leaving: false, leaveIn: -1 });
      }
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
      for (const ev of state.tick(dt)) if (ev === 'alone') alone = true;

      updatePerson(noah, dt, { gesture: alone ? null : 'openArms' });
      if (alone) noah.head.rotation.x = Math.min(0.3, noah.head.rotation.x + dt * 0.3); // head bowed

      for (const L of listeners) {
        const p = L.person;
        let moving = false;
        if (L.leaveIn > 0) {
          L.leaveIn -= dt;
          if (L.leaveIn <= 0) L.leaving = true;
        }
        if (L.leaving) {
          moving = !stepToward(p.root.position, { x: 9, z: 3 }, 1.4, dt);
          if (moving) facePoint(p, 9, 3);
          else p.root.visible = false;
        }
        // Once Noah is alone, everyone left in the square turns their back.
        const gesture = alone && !L.leaving ? 'turnAway' : L.leaving ? null : L.gesture;
        updatePerson(p, dt, { moving, gesture });
      }
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
      L.gesture = reaction;
      if (reaction === 'turnAway') L.leaveIn = 0.9; // turns around, then walks off
    },
    isLocked: () => state.locked,
    isDone: () => state.done,
    dispose() { disposeTree(ctx.root); },
  };
}

