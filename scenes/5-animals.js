import * as THREE from 'three';
import { createAnimalsState } from './state/animals.js';
import { createLandscape, disposeTree, keepApart, createBoarding, circle } from './common.js';
import { animalsInRound, foodsForRound } from '../characters/animals/data.js';
import { createAnimal, updateAnimal } from '../characters/animals/index.js';
import { createPerson, familyLook, updatePerson, facePoint } from '../characters/people.js';
import { createArk } from '../world/ark.js';
import { createFood, addTapProxy } from '../world/props.js';

const ARK_POS = new THREE.Vector3(0, 0, -5.5);
const PAIR_X = [-5.4, -1.8, 1.8, 5.4];
const PAIR_Z = 1.6;
const FOOD_Z = 4.6;
const SHAKE_TIME = 0.8;

// Scene 5: give each pair its food and it walks up the ramp into the ark.
export default function createScene(ctx) {
  const state = createAnimalsState();
  let landscape;
  let ark;
  let noah;
  let rampFoot;
  let boarder;
  let obstacles = [];
  let pairs = []; // { id, animals: [male, female], walkers: [...], shake }
  let foods = []; // { id, obj }
  const boarding = []; // animals walking aboard; they keep moving across round changes
  let t = 0;

  function spawnRound(round) {
    for (const f of foods) {
      ctx.tap.unmark(f.obj);
      ctx.root.remove(f.obj);
    }
    foods = foodsForRound(round).map((food, i, all) => {
      const obj = createFood(food);
      obj.scale.setScalar(1.7);
      obj.position.set((i - (all.length - 1) / 2) * 2.2, 0, FOOD_Z);
      addTapProxy(obj); // a much larger invisible target, so taps near the food count
      ctx.root.add(obj);
      ctx.tap.mark(obj, `food-${food}`);
      return { id: food, obj };
    });
    pairs = animalsInRound(round).map((id, i) => {
      const male = createAnimal(id, 'male');
      const female = createAnimal(id, 'female');
      const gap = Math.max(male.radius, 0.35) * 0.85 + 0.25;
      male.root.position.set(PAIR_X[i] - gap, 0, PAIR_Z);
      female.root.position.set(PAIR_X[i] + gap, 0, PAIR_Z);
      for (const a of [male, female]) {
        a.root.rotation.y = 0.25 * (i < 2 ? 1 : -1);
        ctx.root.add(a.root);
        ctx.tap.mark(a.root, `pair-${id}`);
      }
      return { id, animals: [male, female], walkers: null, shake: 0 };
    });
  }

  // Each animal of the pair walks up the ramp; the female follows a moment later.
  function boardPair(pair) {
    pair.animals.forEach((a, k) => {
      ctx.tap.unmark(a.root);
      a.walk = { delay: k * 0.45, points: boarder.path() };
    });
    pair.walkers = pair.animals;
    boarding.push(...pair.animals);
  }

  return {
    build() {
      landscape = createLandscape(ctx, { mood: 'day', clouds: 5 });
      ark = createArk({ length: 13 });
      ark.root.position.copy(ARK_POS);
      ark.setDoor(1);
      ctx.root.add(ark.root);
      rampFoot = ark.rampFoot.clone().add(ARK_POS);
      boarder = createBoarding(rampFoot, ark.doorPoint.clone().add(ARK_POS));
      obstacles = ark.footprint.map((c) => ({ x: c.x + ARK_POS.x, z: c.z + ARK_POS.z, r: c.r }));
      noah = createPerson(familyLook('noah'));
      noah.root.position.set(rampFoot.x - 2.2, 0, rampFoot.z + 0.6);
      ctx.root.add(noah.root);
      spawnRound(1);
      ctx.frame({ cx: 0, cy: 2, cz: -0.5, w: 16, h: 8.5, elev: 0.36, portrait: { w: 15, cy: 1.4, elev: 0.6 } });
    },

    update(dt) {
      landscape.update(dt);
      for (const ev of state.tick(dt)) {
        if (ev.startsWith('round:')) spawnRound(Number(ev.split(':')[1]));
        if (ev === 'allAboard') for (const f of foods) f.obj.visible = false; // the food goes aboard too
      }
      const solid = [];
      for (const pair of pairs) {
        pair.shake = Math.max(0, pair.shake - dt);
        if (pair.walkers) continue;
        for (const a of pair.animals) {
          updateAnimal(a, dt, { shake: pair.shake > 0 });
          solid.push(a);
        }
      }
      // Walkers go single file; for everyone else they are fixed obstacles,
      // so big animals never push each other into a standstill.
      const walking = [];
      let ahead = null;
      for (const a of boarding) {
        if (!a.root.visible) continue;
        const phase = boarder.step(a, a.wings ? 5.5 : 4.8, dt, { flying: !!a.wings, ahead: a.wings ? null : ahead });
        updateAnimal(a, dt, { moving: phase === 'ground' || phase === 'ramp', fly: !!a.wings });
        if (!a.wings && a.walk.delay <= 0) {
          walking.push(circle(a));
          ahead = a;
        }
      }
      keepApart([noah, ...solid], [...obstacles, ...walking]);
      // The selected food bobs above the others.
      t += dt;
      for (const f of foods) {
        const sel = state.selected === f.id;
        f.obj.position.y += ((sel ? 0.6 + Math.sin(t * 5) * 0.12 : 0) - f.obj.position.y) * Math.min(1, dt * 10);
        f.obj.rotation.y = sel ? f.obj.rotation.y + dt * 2 : 0;
      }
      facePoint(noah, 0, PAIR_Z);
      updatePerson(noah, dt, { gesture: 'wave' });
    },

    onTap(id) {
      const ev = state.tap(id);
      if (!ev) return;
      const [kind, animal] = ev.split(':');
      const pair = pairs.find((p) => p.id === animal);
      if (kind === 'board') boardPair(pair);
      else if (kind === 'reject') pair.shake = SHAKE_TIME;
    },
    isLocked: () => state.locked,
    // Done once every pair has boarded and the last ones are inside.
    isDone: () => state.done && boarding.every((a) => !a.root.visible),
    dispose() { disposeTree(ctx.root); },
  };
}

