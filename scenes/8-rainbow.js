import * as THREE from 'three';
import { createRainbowState, GROUPS, RAINBOW_TIME, DOOR_TIME } from './state/rainbow.js';
import { FAMILY_IDS } from './state/flood.js';
import { exitSlots } from './state/exit-layout.js';
import { createLandscape, disposeTree, stepToward, keepApart, createBoarding, circle } from './common.js';
import { fitPoints } from '../systems/framing.js';
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
const HAZE_FADE = 1; // seconds for the leftover water to fade once it has gone down
const CAMERA_TIME = 1.5; // seconds for the view to widen after each release
const FRAME_MARGIN = 1.5; // ground margin around the standing groups when framing
const SPEED = 3; // everyone, birds included, keeps the same pace so the file stays evenly spaced
const QUEUE_GAP = 0.6; // room between one character's tail and the next one's nose
// Room between neighbours at their slots.
const SLOT_GAP = 0.5;
const TURN_DISTANCE = 1.5; // from this far out a character starts turning to face the camera at its slot

// Linear blend of two framing boxes (including their portrait variants).
function lerpBox(a, b, f) {
  const l = (x, y) => x + (y - x) * f;
  const keys = ['cx', 'cy', 'cz', 'w', 'h', 'elev'];
  const blend = (p, q) => Object.fromEntries(keys.map((k) => [k, l(p[k], q[k])]));
  return { ...blend(a, b), portrait: blend({ ...a, ...a.portrait }, { ...b, ...b.portrait }) };
}

// The four corners of the plane rectangle a framing box shows.
function boxCorners(box) {
  const s = Math.sin(box.elev);
  const c = Math.cos(box.elev);
  return [-1, 1].flatMap((i) => [-1, 1].map((j) => ({
    x: box.cx + (i * box.w) / 2,
    y: box.cy + ((j * box.h) / 2) * c,
    z: box.cz - ((j * box.h) / 2) * s,
  })));
}

// Scene 8: the waters go down, everyone comes out, and God sets the rainbow in the sky.
export default function createScene(ctx) {
  const state = createRainbowState();
  const walkers = []; // { kind: 'person'|'animal', c, bounds, group, points, delay }
  const members = {}; // group -> [{ kind, c, bounds }] in release order, built hidden
  let slots = {}; // group -> [{ x, z }] in release order
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
  let hazeT = -1;
  let camT = 0;

  const startBox = { cx: 0, cy: 2, cz: -1, w: 17, h: 8.5, elev: 0.34, portrait: { w: 15, cy: 1.6, elev: 0.55 } };
  const skyBox = { cx: 0, cy: 6, cz: -6, w: 24, h: 16, elev: 0.2, portrait: { w: 20, cy: 7, elev: 0.3 } };

  function buildMembers(group) {
    return group === 'exit-family'
      ? FAMILY_IDS.map((id) => ({ kind: 'person', c: createPerson(familyLook(id)) }))
      : animalsInRound(Number(group.split('-')[2])).flatMap((id) => ['male', 'female'].map((sex) => ({ kind: 'animal', c: createAnimal(id, sex) })));
  }

  // Ground-box corners of every member of the first `n` groups standing at their
  // slots, widened by `margin` on the ground.
  function slotPoints(n, margin) {
    return GROUPS.slice(0, n).flatMap((g) => members[g].flatMap((m, i) => {
      const { x, z } = slots[g][i];
      const b = m.bounds;
      return [b.min.x - margin, b.max.x + margin].flatMap((dx) => [b.min.z - margin, b.max.z + margin]
        .flatMap((dz) => [0, b.max.y].map((y) => ({ x: x + dx, y, z: z + dz }))));
    }));
  }

  // Framing for the current aspect: the base view (opening or sky) plus `points`,
  // perspective included. Cached until the aspect changes (e.g. the phone rotates).
  let cache = new Map();
  let cacheAspect = 0;
  function fitted(key, base, points) {
    const aspect = ctx.camera.aspect;
    if (aspect !== cacheAspect) {
      cache = new Map();
      cacheAspect = aspect;
    }
    if (!cache.has(key)) {
      const view = aspect < 1 ? { ...base, ...base.portrait } : base;
      const box = points.length ? fitPoints([...boxCorners(view), ...points], { elev: view.elev, fovDeg: ctx.camera.fov, cz: view.cz, aspect }) : view;
      const flat = { cx: box.cx, cy: box.cy, cz: box.cz, w: box.w, h: box.h, elev: box.elev };
      cache.set(key, { ...flat, portrait: flat });
    }
    return cache.get(key);
  }
  // The opening view widened to hold the first `n` groups at their slots.
  const exitBox = (n) => fitted(`exit${n}`, startBox, slotPoints(n, FRAME_MARGIN));
  // The sky with the rainbow, still holding everyone on the ground.
  const rainbowBox = () => fitted('sky', skyBox, slotPoints(GROUPS.length, 0.3));
  const smooth = (u) => u * u * (3 - 2 * u);

  // Single file by real body length: my nose stays QUEUE_GAP behind the tail of
  // the one ahead (both face down the ramp, +z, as their bounds were taken).
  function queueClear(me, ahead) {
    const a = ahead.c.root.position;
    const p = me.c.root.position;
    return Math.hypot(a.x - p.x, a.z - p.z) >= me.bounds.max.z - ahead.bounds.min.z + QUEUE_GAP;
  }

  // Characters of a group appear inside the doorway, walk down the ramp single
  // file and fan out to their slots in the group's own sector.
  function release(group) {
    const origin = rampFoot.clone().add(new THREE.Vector3(0, 0, 1.4));
    members[group].forEach((m, i) => {
      m.c.root.position.copy(doorPoint).add(new THREE.Vector3(0, 0, -0.8));
      m.c.root.visible = false;
      const slot = slots[group][i];
      walkers.push({
        ...m,
        group,
        delay: i * STAGGER,
        points: [doorPoint.clone(), rampFoot.clone(), origin.clone(), new THREE.Vector3(slot.x, 0, slot.z)],
      });
    });
    camT = 0; // the view widens toward exitBox(released)
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
      // Its feet rest on the ground behind the hills (createHills sits at z = -22).
      rainbow.group.position.set(0, 0, -32);
      rainbow.setProgress(0);
      ctx.root.add(rainbow.group);

      // Everyone is built now (hidden) so the slots use their real size.
      for (const g of GROUPS) {
        members[g] = buildMembers(g);
        for (const m of members[g]) {
          m.bounds = new THREE.Box3().setFromObject(m.c.root); // at the origin, facing the camera
          m.c.root.visible = false;
          ctx.root.add(m.c.root);
        }
      }
      const origin = rampFoot.clone().add(new THREE.Vector3(0, 0, 1.4));
      // Standing at its slot every character faces the camera, so a long body
      // (a giraffe's neck, a bull's horns) reaches along z well past its solid
      // radius: the layout spaces the whole footprint, and each root is offset
      // so that footprint is centred on its slot.
      const footprint = (b) => Math.max((b.max.x - b.min.x) / 2, (b.max.z - b.min.z) / 2);
      const centred = exitSlots(GROUPS.map((id) => ({ id, radii: members[id].map((m) => Math.max(m.c.radius, footprint(m.bounds))) })), { origin: { x: origin.x, z: origin.z }, gap: SLOT_GAP });
      slots = Object.fromEntries(GROUPS.map((id) => [id, centred[id].map((p, i) => {
        const b = members[id][i].bounds;
        return { x: p.x - (b.max.x + b.min.x) / 2, z: p.z - (b.max.z + b.min.z) / 2 };
      })]));

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
      if (water) {
        const recede = Math.min(1, t / 3.6);
        water.setLevel(WATER_START + (WATER_END - WATER_START) * recede);
        water.update(dt);
        // Once down, the leftover sheet would show as a band on the horizon: fade it out and drop it.
        if (recede >= 1) {
          hazeT = hazeT < 0 ? 0 : hazeT + dt;
          water.mesh.material.opacity = 0.92 * Math.max(0, 1 - hazeT / HAZE_FADE);
          if (hazeT >= HAZE_FADE) {
            ctx.root.remove(water.mesh);
            water.mesh.geometry.dispose();
            water.mesh.material.dispose();
            water = null;
          }
        }
      }
      if (doorT >= 0) {
        doorT += dt;
        ark.setDoor(Math.min(1, doorT / DOOR_TIME));
      }

      // Everyone walks out single file; on the ramp they queue behind whoever is ahead.
      const solid = [];
      const onRamp = [];
      let ahead = null;
      for (const w of walkers) {
        if (w.delay > 0) {
          w.delay -= dt;
          continue;
        }
        const r = w.c.root;
        const flying = w.kind === 'animal' && !!w.c.wings;
        const descending = w.points.length > 1; // still on the ramp or stepping off it
        const blocked = descending && ahead && !queueClear(w, ahead);
        // Out of sight inside the ark until the one ahead has left room in the doorway.
        if (!r.visible && blocked) {
          ahead = w;
          continue;
        }
        r.visible = true;
        let moving = false;
        if (w.points.length && !blocked) {
          const target = w.points[0];
          const arrived = stepToward(r.position, target, SPEED, dt);
          if (arrived) w.points.shift();
          const left = Math.hypot(target.x - r.position.x, target.z - r.position.z);
          if (!w.points.length) r.rotation.y = 0; // at its slot: facing the camera
          else if (!arrived) {
            const heading = Math.atan2(target.x - r.position.x, target.z - r.position.z);
            // On the last stretch to its slot it eases round to face the camera.
            r.rotation.y = w.points.length === 1 ? heading * Math.min(1, left / TURN_DISTANCE) : heading;
          }
          moving = true;
        }
        if (descending) {
          ahead = w;
          onRamp.push(circle(w.c));
        }
        // Birds flutter just above the ramp and the ground, and land at their slot.
        r.position.y = boarder.height(r.position.z) + (flying && w.points.length ? 0.6 : 0);
        if (!descending) solid.push(w.c);
        if (!moving && rainbowT >= 0 && w.kind === 'person') facePoint(w.c, 0, -30); // they look at the rainbow
        if (w.kind === 'person') updatePerson(w.c, dt, { moving, gesture: !moving && rainbowT > 1 && w.c.look === familyLook('noah') ? 'openArms' : null });
        else updateAnimal(w.c, dt, { moving, fly: flying && moving });
      }
      keepApart(solid, [...obstacles, ...onRamp]);
      // A group has settled once every member stands at its slot.
      for (const group of GROUPS.slice(0, released)) {
        const ws = walkers.filter((w) => w.group === group);
        if (ws.every((w) => w.delay <= 0 && !w.points.length)) state.settled(group);
      }

      // The view widens a little with each group so everyone fits at full size.
      if (released && rainbowT < 0) {
        camT += dt;
        ctx.frame(lerpBox(exitBox(released - 1), exitBox(released), smooth(Math.min(1, camT / CAMERA_TIME))));
      }

      // God sets the rainbow in the clouds (Genesis 9:13); the view rises to the sky.
      if (rainbowT >= 0) {
        rainbowT += dt;
        const u = Math.min(1, rainbowT / (RAINBOW_TIME * 0.8));
        rainbow.setProgress(u * u * (3 - 2 * u));
        ctx.frame(lerpBox(exitBox(GROUPS.length), rainbowBox(), smooth(Math.min(1, rainbowT / 2.5))));
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
