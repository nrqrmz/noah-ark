import * as THREE from 'three';
import { createViolenceState, LIGHT_TIME } from './state/violence.js';
import { createLandscape, disposeTree, stepToward, keepApart } from './common.js';
import { createPerson, createTownsperson, familyLook, updatePerson, facePoint } from '../characters/people.js';
import { createHouse, createFightCloud, createDustBurst, createJars, createBreadBasket } from '../world/props.js';
import { createGodLight } from '../world/sky.js';
import { mat, mesh, sphere } from '../characters/rig.js';

// Back row: tall houses, decorative only. [x, z, variant]
const BACK_ROW = [[-6.2, -5.6, 1], [-2.2, -5.8, 2], [1.8, -5.6, 3]];
// Front row, tappable: A and B are neighbors (touching), C has jars, D bread.
const FRONT_ROW = [[-7.4, -0.6, 0], [-4.8, -0.6, 2], [-1.4, -0.6, 1], [1.9, -0.6, 3]];
const FIELD_X = 5.6;
const NOAH_SPOT = new THREE.Vector3(4.8, 0, 3);

// Paths. Everyone comes from and leaves by the left edge, never by Noah's field.
const EDGE_X = -11;
const THIEF_Z = 0.9; // along the house fronts, behind the fight cloud
const FIGHT_Z = 2.7; // the fight sits forward so the doors and windows behind it show
const IN_Z = 4.75; // walkers coming in pass in front of the fight
const OUT_Z = 5.5; // and leave on their own lane so nobody walks into anybody
const WALK = 1.9;
const RUN = 2.6;

// Scene 1: the world full of violence; God's light falls on Noah in his field.
export default function createScene(ctx) {
  const state = createViolenceState();
  const houses = [];
  const actors = []; // scripted townspeople (see stepActor)
  const clouds = [];
  const dusts = [];
  const shutters = [];
  const leavers = []; // actors who must be gone before the light falls
  let landscape;
  let noah;
  let light;
  let lightPending = false;
  let lightT = -1;

  const doorOf = (i) => houses[i].localToWorld(houses[i].userData.door.clone());
  const v = (x, z) => new THREE.Vector3(x, 0, z);

  // ---------- Scripted actors ----------
  // An actor plays a list of steps: { to, speed } walks there; { wait } idles;
  // { until } waits for a condition; { call } runs once.
  function addActor(person, steps, { at, visible = true, gesture = null } = {}) {
    const a = { person, steps, gesture, moving: false, gone: false };
    person.root.position.copy(at);
    person.root.visible = visible;
    ctx.root.add(person.root);
    actors.push(a);
    return a;
  }

  function stepActor(a, dt) {
    const p = a.person;
    a.moving = false;
    while (a.steps.length && a.steps[0].call) a.steps.shift().call(a);
    const s = a.steps[0];
    if (s?.to) {
      const pos = p.root.position;
      if (Math.hypot(s.to.x - pos.x, s.to.z - pos.z) > 1e-3) facePoint(p, s.to.x, s.to.z);
      if (stepToward(pos, s.to, s.speed, dt)) a.steps.shift();
      else a.moving = true;
    } else if (s?.wait != null) {
      s.wait -= dt;
      if (s.wait <= 0) a.steps.shift();
    } else if (s?.until) {
      if (s.until(a)) a.steps.shift();
    }
    if (p.root.visible) updatePerson(p, dt, { moving: a.moving, gesture: a.gesture });
  }

  // Walkers coming in from the edge wait until the spot is free.
  const spawnClear = (self, at) => actors.every((o) => o === self || !o.person.root.visible
    || Math.hypot(o.person.root.position.x - at.x, o.person.root.position.z - at.z) > 1.6);
  const enter = (at) => [
    { until: (a) => spawnClear(a, at) },
    { call: (a) => { a.person.root.visible = true; } },
  ];
  const leave = { call: (a) => { a.person.root.visible = false; a.gone = true; } };
  const face = (x, z) => ({ call: (a) => facePoint(a.person, x, z) });

  // ---------- Events ----------

  // Two neighbors come out of A and B, meet between the doors and fight inside
  // a dust cloud that hides them both.
  function startFight() {
    const doors = [doorOf(0), doorOf(1)];
    const mid = (doors[0].x + doors[1].x) / 2;
    let arrived = 0;
    const cloud = createFightCloud({ width: 2.2 });
    cloud.root.position.set(mid, 0, FIGHT_Z);
    cloud.root.visible = false;
    ctx.root.add(cloud.root);
    const fighters = [];
    doors.forEach((door, k) => {
      const side = k === 0 ? -1 : 1;
      const a = addActor(createTownsperson(k * 2), [
        { to: v(mid + side * 0.5, FIGHT_Z), speed: 1.4 },
        face(mid - side, FIGHT_Z),
        { call: () => { arrived++; } },
        { until: () => arrived === 2 },
        { call: () => {
          for (const f of fighters) f.person.root.visible = false;
          cloud.root.visible = true;
          clouds.push({ cloud, t: 0 });
        } },
      ], { at: v(door.x, door.z + 0.15) });
      a.fighter = true;
      fighters.push(a);
    });
  }

  // A blond masked thief sneaks in from the left edge, robs house i (dust out of
  // its window, the shutter knocked askew) and leaves by the left edge with a sack.
  function startThief(i) {
    const house = houses[i];
    const door = doorOf(i);
    const lane = v(door.x, THIEF_Z);
    const start = v(EDGE_X, THIEF_Z);
    const thief = createTownsperson(6, { mask: true, hair: 0xe8c84a });
    const sack = mesh(sphere(0.32, 10, 8), mat(0x9a7a4a), thief.body, 0, 1.45, -0.35);
    sack.visible = false;
    const dust = createDustBurst({ size: 0.7 });
    dust.root.position.copy(house.localToWorld(house.userData.window.clone()));
    ctx.root.add(dust.root);
    dusts.push(dust);
    const robbing = { t: 0, next: 0, on: false };
    const a = addActor(thief, [
      ...enter(start),
      { to: lane, speed: WALK },
      { to: v(door.x, door.z + 0.15), speed: 1.2 },
      { call: (a) => { a.person.root.visible = false; robbing.on = true; } },
      { until: () => robbing.t >= 1.5 },
      { call: (a) => {
        robbing.on = false;
        sack.visible = true;
        a.person.root.visible = true;
      } },
      { to: lane, speed: 1.2 },
      { to: start, speed: RUN },
      leave,
    ], { at: start, visible: false });
    a.update = (dt) => {
      if (!robbing.on) return;
      robbing.t += dt;
      robbing.next -= dt;
      if (robbing.next <= 0) {
        dust.puff();
        robbing.next = 0.4;
      }
      if (robbing.t > 0.5 && !shutters.some((s) => s.mesh === house.userData.shutter)) {
        shutters.push({ mesh: house.userData.shutter, target: house.userData.shutterAskew, t: 0 });
      }
    };
    leavers.push(a);
  }

  // Someone kicks the jars by C's door just to break them, and walks off; the
  // owner comes to the door and holds their head.
  function startJars() {
    const door = doorOf(2);
    const jars = createJars();
    jars.root.position.set(door.x + 1.0, 0, door.z + 0.15);
    ctx.root.add(jars.root);
    const dust = createDustBurst({ size: 0.5 });
    dust.root.position.set(door.x + 1.05, 0.25, door.z + 0.3);
    ctx.root.add(dust.root);
    dusts.push(dust);
    const owner = addActor(createTownsperson(3), [], { at: v(door.x, door.z + 0.15), visible: false });
    const kickSpot = v(door.x - 0.2, door.z + 0.35);
    const start = v(EDGE_X, IN_Z);
    const a = addActor(createTownsperson(4), [
      ...enter(start),
      { to: v(door.x - 0.6, IN_Z), speed: WALK },
      { to: kickSpot, speed: WALK },
      face(door.x + 2, kickSpot.z),
      { call: (a) => { a.gesture = 'kick'; a.person.t = 0; } },
      { wait: 0.3 },
      { call: () => { jars.smash(); dust.puff(); } },
      { wait: 0.9 },
      { call: (a) => { a.gesture = null; } },
      { to: v(door.x - 0.8, 3.4), speed: WALK },
      { call: () => {
        owner.person.root.visible = true;
        facePoint(owner.person, door.x + 0.6, door.z + 3);
        owner.gesture = 'handsOnHead';
      } },
      { to: v(door.x - 1.6, OUT_Z), speed: WALK },
      { to: v(EDGE_X, OUT_Z), speed: RUN },
      leave,
    ], { at: start, visible: false });
    leavers.push(a);
  }

  // Someone carries a basket of bread toward D; another comes up behind, pushes
  // them (they sit down, unhurt) and runs off with the basket.
  function startFood() {
    const door = doorOf(3);
    const stop = v(door.x - 0.1, 2.3);
    const behind = v(stop.x - 0.75, stop.z);
    const start = v(EDGE_X, IN_Z);
    const basket = createBreadBasket();
    const carrierP = createTownsperson(5);
    const holdBasket = (p) => {
      basket.scale.setScalar(1 / p.root.scale.x);
      basket.position.set(0, 1.19, 0.56); // nominal units: rim between the hands
      p.body.add(basket);
    };
    holdBasket(carrierP);
    let stopped = false;
    const carrier = addActor(carrierP, [
      ...enter(start),
      { to: v(stop.x - 1.6, IN_Z), speed: WALK },
      { to: stop, speed: WALK },
      face(door.x + 2, stop.z - 0.3),
      { call: () => { stopped = true; } },
    ], { at: start, visible: false, gesture: 'carry' });
    const pusher = addActor(createTownsperson(8), [
      { until: () => carrier.person.root.visible && carrier.person.root.position.x > -6 },
      ...enter(start),
      { to: v(stop.x - 1.6, IN_Z), speed: 2.0 },
      { until: () => stopped },
      { to: behind, speed: 1.6 },
      face(stop.x, stop.z),
      { call: (a) => { a.gesture = 'carry'; } }, // a short push, both hands forward
      { wait: 0.35 },
      { call: () => {
        holdBasket(pusher.person);
        carrier.gesture = 'sit';
        carrier.steps.push({ to: v(stop.x + 0.25, stop.z), speed: 1.2 });
      } },
      { wait: 0.4 },
      { to: v(stop.x - 1.8, OUT_Z), speed: RUN },
      { to: v(EDGE_X, OUT_Z), speed: RUN },
      leave,
    ], { at: start, visible: false });
    leavers.push(pusher);
  }

  function buildField() {
    const soil = mesh(new THREE.BoxGeometry(4.6, 0.06, 3.4), mat(0x8a6a44, { roughness: 1 }), ctx.root, FIELD_X, 0.03, 3.2);
    soil.receiveShadow = true;
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 5; c++) {
        const x = FIELD_X - 1.7 + c * 0.85;
        const z = 2 + r * 1.1;
        if (Math.hypot(x - NOAH_SPOT.x, z - NOAH_SPOT.z) < 0.6) continue; // Noah stands here
        mesh(sphere(0.18, 8, 6), mat(0x5fa83a), ctx.root, x, 0.12, z);
      }
    }
  }

  function addHouse(x, z, variant, tall) {
    const house = createHouse(variant, { tall });
    house.position.set(x, 0, z);
    ctx.root.add(house);
    house.updateMatrixWorld();
    return house;
  }

  return {
    build() {
      landscape = createLandscape(ctx, { mood: 'gray', clouds: 5, darkClouds: true, ground: 0x7fa65a });
      for (const [x, z, variant] of BACK_ROW) addHouse(x, z, variant, true);
      FRONT_ROW.forEach(([x, z, variant], i) => {
        const house = addHouse(x, z, variant, false);
        ctx.tap.mark(house, `house-${i}`);
        houses.push(house);
      });

      buildField();
      noah = createPerson(familyLook('noah'));
      noah.root.position.copy(NOAH_SPOT);
      facePoint(noah, -4, 0);
      ctx.root.add(noah.root);
      light = createGodLight({ radius: 1.6 });
      light.group.position.copy(NOAH_SPOT);
      light.setIntensity(0);
      ctx.root.add(light.group);

      ctx.frame({ cx: -0.3, cy: 2.6, cz: 1.8, w: 18.5, h: 8, elev: 0.8, portrait: { w: 18.3, cx: -0.4, cy: 3.2, cz: 1.5, elev: 1.0 } });
    },

    update(dt) {
      landscape.update(dt);
      for (const ev of state.tick(dt)) {
        if (ev === 'lightStart') lightPending = true;
      }
      // The light waits until every evil-doer has left the scene.
      if (lightPending && leavers.every((a) => a.gone)) {
        lightPending = false;
        lightT = 0;
      }
      for (const a of actors) {
        a.update?.(dt);
        stepActor(a, dt);
      }
      for (const c of clouds) {
        c.t += dt;
        c.cloud.root.scale.setScalar(Math.min(1, 0.3 + c.t * 2.5));
        c.cloud.update(dt);
      }
      for (const d of dusts) d.update(dt);
      // The shutter swings down and settles hanging askew from one hinge.
      for (const s of shutters) {
        s.t += dt;
        s.mesh.rotation.z = s.target * (1 - Math.exp(-3 * s.t) * Math.cos(8 * s.t));
      }
      const walking = actors.filter((a) => a.moving && a.person.root.visible && !a.fighter).map((a) => a.person);
      keepApart([...walking, noah]);
      if (lightT >= 0) {
        lightT += dt;
        light.setIntensity(Math.min(1, lightT / 1.2));
        // Noah turns toward the viewer and looks up into the light.
        noah.root.rotation.y += (0 - noah.root.rotation.y) * Math.min(1, dt * 2);
        noah.head.rotation.x = Math.max(-0.45, noah.head.rotation.x - dt * 0.5);
      }
      updatePerson(noah, dt, { gesture: lightT > LIGHT_TIME * 0.4 ? 'openArms' : null });
    },

    onTap(id) {
      const ev = state.tap(id);
      if (!ev) return;
      const [kind, n] = ev.split(':');
      const i = Number(n);
      ctx.tap.unmark(houses[i]);
      if (kind === 'fight') startFight();
      else if (kind === 'thief') startThief(i);
      else if (kind === 'jars') startJars();
      else startFood();
    },
    isLocked: () => state.locked,
    // "Next" waits for the light, which itself waits for the thieves to leave.
    isDone: () => state.done && lightT >= LIGHT_TIME,
    dispose() { disposeTree(ctx.root); },
  };
}
