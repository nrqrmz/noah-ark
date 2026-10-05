import * as THREE from 'three';
import { createRainbowState, GROUPS, RAINBOW_TIME, DOOR_TIME } from './state/rainbow.js';
import { FAMILY_IDS } from './state/flood.js';
import { createLandscape, disposeTree, stepToward, keepApart, createBoarding, circle } from './common.js';
import { queueClear } from '../systems/solid.js';
import { animalsInRound } from '../characters/animals/data.js';
import { createAnimal, updateAnimal } from '../characters/animals/index.js';
import { createPerson, familyLook, updatePerson, facePoint } from '../characters/people.js';
import { createArk } from '../world/ark.js';
import { createWater } from '../world/terrain.js';
import { createRainbow } from '../world/sky.js';

const ARK_POS = new THREE.Vector3(0, 0, -5.5);
const WATER_START = 1.6;
const WATER_END = -0.8;
const STAGGER = 0.35; // seconds between characters walking out

// Where each group gathers on the dry ground.
const GATHER = {
  'exit-family': { x: -5.5, z: 1.5 },
  'exit-round-1': { x: -1.5, z: 3.2 },
  'exit-round-2': { x: 3, z: 3.4 },
  'exit-round-3': { x: 6.2, z: 1.2 },
};

// Scene 8: the waters go down, everyone comes out, and God sets the rainbow in the sky.
export default function createScene(ctx) {
  const state = createRainbowState();
  const walkers = []; // { kind: 'person'|'animal', c, points, delay }
  let landscape;
  let ark;
  let boarder;
  let rampFoot;
  let doorPoint;
  let obstacles = [];
  let water;
  let rainbow;
  let t = 0;
  let doorT = -1;
  let rainbowT = -1;
  let released = 0;

  const startBox = { cx: 0, cy: 2, cz: -1, w: 17, h: 8.5, elev: 0.34, portrait: { w: 15, cy: 1.6, elev: 0.55 } };
  const skyBox = { cx: 0, cy: 6, cz: -6, w: 24, h: 16, elev: 0.2, portrait: { w: 20, cy: 7, elev: 0.3 } };

  // Characters of a group, appearing inside the doorway and walking down to their spot.
  function release(group) {
    const spot = GATHER[group];
    const members = group === 'exit-family'
      ? FAMILY_IDS.map((id) => ({ kind: 'person', c: createPerson(familyLook(id)) }))
      : animalsInRound(Number(group.split('-')[2])).flatMap((id) => ['male', 'female'].map((sex) => ({ kind: 'animal', c: createAnimal(id, sex) })));
    members.forEach((m, i) => {
      const start = doorPoint.clone().add(new THREE.Vector3(0, 0, -0.8));
      m.c.root.position.copy(start);
      m.c.root.visible = false;
      ctx.root.add(m.c.root);
      const col = i % 4;
      const row = Math.floor(i / 4);
      const dest = new THREE.Vector3(spot.x + (col - 1.5) * 1.3, 0, spot.z + row * 1.4);
      walkers.push({
        ...m,
        group,
        delay: i * STAGGER,
        points: [doorPoint.clone(), rampFoot.clone(), rampFoot.clone().add(new THREE.Vector3(0, 0, 1.4)), dest],
      });
    });
  }

  return {
    build() {
      landscape = createLandscape(ctx, { mood: 'clear', clouds: 4 });
      ark = createArk({ length: 13 });
      ark.root.position.copy(ARK_POS);
      ark.setDoor(0);
      ctx.root.add(ark.root);
      rampFoot = ark.rampFoot.clone().add(ARK_POS);
      doorPoint = ark.doorPoint.clone().add(ARK_POS);
      boarder = createBoarding(rampFoot, doorPoint);
      obstacles = ark.footprint.map((c) => ({ x: c.x + ARK_POS.x, z: c.z + ARK_POS.z, r: c.r }));

      water = createWater({ color: 0x4a8fca });
      water.setLevel(WATER_START);
      ctx.root.add(water.mesh);
      rainbow = createRainbow({ radius: 20, band: 0.9 });
      rainbow.group.position.set(0, -3, -32);
      rainbow.setProgress(0);
      ctx.root.add(rainbow.group);

      ctx.frame(startBox);
    },

    update(dt) {
      t += dt;
      landscape.update(dt);
      for (const ev of state.tick(dt)) {
        if (ev === 'doorOpening') doorT = 0;
        // Once fully open, the door is what the child taps to lead each group out.
        if (ev === 'doorOpen') ctx.tap.mark(ark.door, 'exit');
        if (ev === 'rainbow') rainbowT = 0;
      }

      // The waters go down (Genesis 8:13), then the door opens.
      const recede = Math.min(1, t / 3.6);
      water.setLevel(WATER_START + (WATER_END - WATER_START) * recede);
      water.update(dt);
      if (doorT >= 0) {
        doorT += dt;
        ark.setDoor(Math.min(1, doorT / DOOR_TIME));
      }

      // Everyone walks out single file; while on the ramp they are fixed obstacles.
      const solid = [];
      const onRamp = [];
      let ahead = null;
      for (const w of walkers) {
        if (w.delay > 0) {
          w.delay -= dt;
          continue;
        }
        const r = w.c.root;
        r.visible = true;
        let moving = false;
        const flying = w.kind === 'animal' && !!w.c.wings;
        const descending = w.points.length > 1;
        const blocked = descending && !flying && ahead && !queueClear(circle(w.c), circle(ahead));
        if (w.points.length && !blocked) {
          const target = w.points[0];
          if (stepToward(r.position, target, flying ? 4 : 3, dt)) w.points.shift();
          else r.rotation.y = Math.atan2(target.x - r.position.x, target.z - r.position.z);
          moving = true;
        }
        if (descending && !flying) {
          ahead = w.c;
          onRamp.push(circle(w.c));
        }
        r.position.y = w.kind === 'animal' && w.c.wings && w.points.length ? 0.6 : boarder.height(r.position.z);
        if (!descending && r.position.z > rampFoot.z + 0.5) solid.push(w.c);
        if (!moving && rainbowT >= 0 && w.kind === 'person') facePoint(w.c, 0, -30); // they look at the rainbow
        if (w.kind === 'person') updatePerson(w.c, dt, { moving, gesture: !moving && rainbowT > 1 && w.c.look === familyLook('noah') ? 'openArms' : null });
        else updateAnimal(w.c, dt, { moving, fly: !!w.c.wings && moving });
      }
      keepApart(solid, [...obstacles, ...onRamp]);
      // A group has cleared the ramp once all its members are heading to their spot.
      for (const group of GROUPS) {
        const members = walkers.filter((w) => w.group === group);
        if (members.length && members.every((w) => w.delay <= 0 && w.points.length <= 1)) state.cleared(group);
      }

      // God sets the rainbow in the clouds (Genesis 9:13); the view rises to the sky.
      if (rainbowT >= 0) {
        rainbowT += dt;
        const u = Math.min(1, rainbowT / (RAINBOW_TIME * 0.8));
        rainbow.setProgress(u * u * (3 - 2 * u));
        const f = Math.min(1, rainbowT / 2.5);
        const lerp = (a, b) => a + (b - a) * f;
        ctx.frame({
          cx: 0, cy: lerp(startBox.cy, skyBox.cy), cz: lerp(startBox.cz, skyBox.cz), w: lerp(startBox.w, skyBox.w), h: lerp(startBox.h, skyBox.h),
          elev: lerp(startBox.elev, skyBox.elev),
          portrait: { w: lerp(startBox.portrait.w, skyBox.portrait.w), cy: lerp(startBox.portrait.cy, skyBox.portrait.cy), elev: lerp(startBox.portrait.elev, skyBox.portrait.elev) },
        });
      }
    },

    onTap(id) {
      if (id !== 'exit') return;
      // Each tap on the open door leads the next group out: family first, then the animals.
      const group = GROUPS[released];
      if (!group || !state.tap(group)) return;
      released++;
      release(group);
      if (released === GROUPS.length) ctx.tap.unmark(ark.door);
    },
    isLocked: () => state.locked,
    isDone: () => state.done,
    dispose() { disposeTree(ctx.root); },
  };
}
