# Polish Round 2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix and redesign scenes 1, 2, 4, 5 (plus the raven in 7) and 8 as agreed after the user's playthrough.

**Architecture:** Scene logic stays in pure state machines (`scenes/state/*.js`) tested with `node --test`; new pure helpers hold the geometry decisions that can be tested (coat markings, son work zones, exit slots). Views (`scenes/<n>-*.js`, `characters/`, `world/`) consume them and are verified in the browser with the Playwright MCP server.

**Tech Stack:** three.js 0.170.0 via import map (jsDelivr), plain ES modules, `node:test`, Playwright MCP.

**Spec:** `docs/superpowers/specs/2026-10-05-polish-round-2-design.md` (read it with this plan).

## Global Constraints

- No build step, no `package.json`, no npm dependencies. Playwright runs only through the MCP server.
- Pure modules never import `three` and never touch `window`/`document` at module top level. New pure modules this plan adds: `characters/animals/markings.js`, `scenes/state/exit-layout.js` — add both to the pure list in `CLAUDE.md` in the task that creates them.
- Everything in the repo is English (code, comments, commits). `lang/*.json` copy does not change.
- Content rules from `CLAUDE.md`: nothing frightening (dust, never black smoke or fire); no one hurt; God never shown; women's hair loose, no veil; no emojis.
- Style rules: limbs attached (joint pivot inside the body, sphere covering it); nothing passes through anything (`systems/solid.js` / `keepApart`); "Next" only after the scene's interaction and closing animation finish.
- Tests: `node --experimental-detect-module --test`. Serve: `python3 -m http.server 8000`; scenes at `http://localhost:8000/`, models at `/gallery.html?view=people|animals|world`.
- Playwright sizes: phone portrait 390×844, rotated phone 844×390, desktop 1440×900. Every task that changes a scene or model ends with a Playwright check; save screenshots under `.playwright-mcp/` (git-ignored) and list them in the task report. Zero console errors is part of every check.
- Commit messages end with:
  ```
  Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_01XHh6ZzFXfRwfFjQZjuMXwo
  ```
- Work on branch `feat/polish-round-2`.

## Review Focus

1. **Scene 1, taps faster than the events:** tapping all four houses within one second must start all four events without one event's characters colliding with another's or the light starting before the thief has left the frame. Test in Task 11 (all four taps in one tick, both pair orders); Playwright check in Task 11.
2. **Scene 2, tapping a listener who is already leaving:** ignored, and the leaver still exits. Test in Task 8.
3. **Scene 4, tapping Shem's second tree while he is walking to his first:** the job queues; Shem never crosses into Ham's stretch. Test (zones) in Task 9; Playwright check of the queued walk in Task 9.
4. **Scene 8, tapping the door while a group is still walking to its slots:** ignored until that group settles. Test in Task 13.
5. **Scene 8, rotating the phone mid-exit:** the widening camera uses the portrait variant and still shows every settled character. Playwright check in Task 13.

---

### Task 1: Pure coat markings

**Files:**
- Create: `characters/animals/markings.js`
- Create: `tests/markings.test.js`
- Modify: `CLAUDE.md` (pure modules list)

**Interfaces:**
- Produces: `markings(kind, { seed = 1, count }) -> Shape[]` in UV space `[0,1]²`.
  - `kind: 'patches'` (giraffe, many tight blobs) and `'spots'` (cow, few large blobs) return `{ u, v, r }[]`.
  - `kind: 'stripes'` (zebra, cat) returns `{ v, width, wobble, phase }[]`: a band centred at `v`, wavy across `u` with amplitude `wobble`.
  - Deterministic: same `kind`, `seed`, `count` → identical output (seeded PRNG, e.g. mulberry32).

- [ ] **Step 1: Write the failing tests** in `tests/markings.test.js`:
  - `patches do not overlap and stay inside the texture`: `markings('patches', { seed: 3, count: 40 })` has 40 shapes; every pair satisfies distance (wrapping `u` across the 0/1 seam) `>= a.r + b.r + 0.01`; every `v - r >= 0` and `v + r <= 1`.
  - `spots are fewer and larger than patches`: `markings('spots', { seed: 3, count: 6 })` has 6 shapes, min `r` of spots > max `r` of patches, and no pair overlaps.
  - `stripes alternate without overlapping`: `markings('stripes', { seed: 2, count: 14 })` sorted by `v`; consecutive bands satisfy `next.v - next.width/2 - next.wobble >= prev.v + prev.width/2 + prev.wobble`; first band starts ≥ 0, last ends ≤ 1; every `width > 0`.
  - `same seed, same markings; different seed, different markings`.
- [ ] **Step 2: Run** `node --experimental-detect-module --test tests/markings.test.js` — Expected: FAIL (module not found).
- [ ] **Step 3: Implement `markings`** in `characters/animals/markings.js`. Patches/spots: dart throwing with the PRNG, retrying until `count` fit (radius range: patches 0.05–0.08, spots 0.12–0.18). Stripes: evenly spaced `v` with jittered width (0.4–0.6 of the slot) and small wobble.
- [ ] **Step 4: Run** the test file — Expected: PASS. Then run the full suite — Expected: all PASS.
- [ ] **Step 5: Add** `characters/animals/markings.js` to the pure list in `CLAUDE.md`.
- [ ] **Step 6: Commit** `feat: add pure coat markings generator`.

### Task 2: Painted coats (giraffe, cow, cats) and flat textures

**Files:**
- Create: `characters/animals/coat.js`
- Modify: `characters/animals/quadruped.js` (remove sphere spots and torus stripes; use coats)
- Modify: `characters/animals/index.js` (presets: `giraffe`, `cow`, `cat`; male cat orange)
- Modify: `scenes/common.js` (`disposeTree` also disposes `material.map`)

**Interfaces:**
- Consumes: `markings` (Task 1).
- Produces:
  - `coatMaterial({ base, mark, kind, seed, count, repeat = [1, 1] }) -> THREE.MeshStandardMaterial` in `coat.js`: paints a 256×256 `CanvasTexture` (base fill, then each shape in `mark` color; patches/spots drawn as soft-cornered blobs, stripes as wavy bands; shapes crossing `u = 0/1` are drawn twice so the seam is invisible). Not shared, so `disposeTree` frees it.
  - Preset field `coat: { kind, mark, parts: { body?: count, neck?: count, legs?: count, head?: count } }`. `buildQuadruped` uses a coat material for each listed part and the plain coat material for the rest. Parts per species:
    - giraffe: `patches` on body, neck, legs (mark `0xa86a32`).
    - cow (female): `spots` on body (mark `0x3b3230`). The bull (male) gets no coat (Task 4).
    - cat: `stripes` on body and legs. Male cat: base `0xe8862a`, mark `0xb85c14` (orange tabby). Female cat: current grays.
  - Removed preset fields: `spots`, `spotPattern`, `stripes` (and `femaleOverrides` entry for cow's `spotPattern`).

- [ ] **Step 1: Implement `coatMaterial`** in `characters/animals/coat.js` and wire `coat` into `buildQuadruped`; delete the sphere-spot and torus-stripe code.
- [ ] **Step 2: Update presets** for giraffe, cow, cat (male orange) in `index.js`.
- [ ] **Step 3: Make `disposeTree`** dispose `m.map` for non-shared materials.
- [ ] **Step 4: Run** the full test suite — Expected: all PASS.
- [ ] **Step 5: Playwright check:** `/gallery.html?view=animals&only=giraffe,cow,cat` at desktop, and zoomed with `&cam=` on each. Pass: giraffe has flat patches on body, neck and all four legs; cow spots are flat (no bumps in silhouette); one cat is orange tabby; no visible seam line; no console errors. Screenshot each.
- [ ] **Step 6: Commit** `feat: paint flat coat markings on giraffe, cow and cats`.

### Task 3: Slim, feline lions

**Files:**
- Modify: `characters/animals/index.js` (`lion` preset, lioness overrides)
- Modify: `characters/animals/quadruped.js` (mane builder)

**Interfaces:**
- Produces: `lion` preset values (starting point, tune visually): `bodyR 0.27, bodyLen 0.9, bodyY 0.86, bodyScale [0.88, 1], legR 0.08, legLen 0.42, headR 0.26, neckLen 0.16`; a narrower muzzle for the lioness (`snout.r 0.4, long 1.15`). Mane: replace the big ball + ring of balls with layered tufts (cones pointing outward and back, two rings, darker outer ring) framing the face and covering the neck top, so it reads as a mane, not a sunflower.

- [ ] **Step 1: Change the preset, lioness overrides and mane builder.**
- [ ] **Step 2: Run** the full test suite — Expected: all PASS.
- [ ] **Step 3: Playwright check:** `/gallery.html?view=animals&only=lion` from the side (`&rot=1.57`) and front (`&rot=0`), and walking (`&mode=` as supported, otherwise the default animation). Pass: long lean body, visible waist, legs longer than body depth, lioness without mane and with a narrow muzzle, legs attached at the hips/shoulders, no console errors.
- [ ] **Step 4: Commit** `feat: give the lions a lean feline build and a real mane`.

### Task 4: Horns, the bull, slim goats

**Files:**
- Modify: `characters/animals/quadruped.js` (horn builder)
- Modify: `characters/animals/index.js` (`cow`, `goat` presets; male overrides)

**Interfaces:**
- Produces:
  - Preset field `horns: { style: 'cow' | 'bull' | 'goat', color }` replacing `horns`/`hornSpread`. Each horn is a chain of 4 tapering segments (cone/capsule) following a curve, ending in a point, with its base sphere inside the head:
    - `cow`: short, out then up.
    - `bull`: long, out sideways then curving forward.
    - `goat`: long, up then sweeping back over the neck.
  - `createAnimal(id, sex)` gains per-sex overrides (`maleOverrides(id)` beside `femaleOverrides(id)`). Cow male = bull: no coat, solid `0x4a2e1f`, `horns.style 'bull'`, `bodyScale [1.05, 1.05]` and a shoulder hump (sphere at the front-top of the body, inside the body volume). Cow female keeps the Task 2 spots and gets `horns.style 'cow'`.
  - Goat (both sexes): `bodyR 0.21, bodyLen 0.5, bodyY 0.74, legR 0.055, legLen 0.42`, `horns.style 'goat'`; male keeps the goatee.

- [ ] **Step 1: Implement the horn builder and the overrides.**
- [ ] **Step 2: Run** the full test suite — Expected: all PASS.
- [ ] **Step 3: Playwright check:** `/gallery.html?view=animals&only=cow,goat` side and front. Pass: the bull is one solid color with big forward-curving horns; the cow has short upward horns; goats are slim and long-legged with backward horns and do not read as sheep; horns attached (no gap at the base); no console errors.
- [ ] **Step 4: Commit** `feat: add curved horns, a solid-colored bull and slimmer goats`.

### Task 5: Raven beak and feet

**Files:**
- Modify: `characters/animals/bird.js` (`LOOKS.raven`)

- [ ] **Step 1: Set** `LOOKS.raven.beak = 0xd9a0a0` and `LOOKS.raven.feet = 0xd98080` (the dove's values; reference them from `LOOKS.dove` instead of repeating the numbers).
- [ ] **Step 2: Playwright check:** gallery `only=dove,raven`, and scene 7 (the raven on Ararat). Pass: raven beak and feet match the dove's; no console errors.
- [ ] **Step 3: Commit** `fix: give the raven the dove's beak and feet colors`.

### Task 6: Zebra with a horse body — USER CHECKPOINT

**Files:**
- Modify: `characters/animals/index.js` (`zebra` preset)
- Modify: `characters/animals/quadruped.js` (horse features)

**Interfaces:**
- Produces preset features (usable by a horse preset too):
  - `muzzle: 'horse'`: long tapered muzzle (capsule along the face, dark tip), head angled down.
  - Long arched neck (`neckLen ≈ 0.55`, `neckAngle ≈ 0.45`) with a `crest` mane running its full length.
  - `tail.hair`: a long hair switch (tapered capsule) from the tail tip.
  - Body: `bodyR 0.33, bodyLen 0.85, bodyY 1.0, legR 0.075, legLen 0.55`.
  - `coat: { kind: 'stripes', mark: 0x1f1f1f, parts: { body, neck, legs, head } }` on base `0xf7f7f2`; leg stripes run across the leg, neck stripes around the neck.

- [ ] **Step 1: Implement the horse features and the zebra preset.**
- [ ] **Step 2: Run** the full test suite — Expected: all PASS.
- [ ] **Step 3: Playwright check:** gallery `only=zebra` side, front and three-quarter. Screenshot each.
- [ ] **Step 4: Commit** `feat: rebuild the zebra on a horse body with painted stripes`.
- [ ] **Step 5: STOP for the user.** Send the screenshots and ask: keep the zebra, or replace it with two horses? If **keep**, continue to Task 7. If **horses**: in `data.js` replace `zebra` with `horse` (food `grass`, round 3); add a `horse` preset reusing the horse features with no coat, male `0x5a3a22` (dark brown), female `0xa8794a` (light brown); update `tests/animals.test.js` expectations (`animalsInRound(3)` → `['cat', 'horse', 'dove', 'raven']`, `horse: 'grass'`); if any `lang/*.json` or gallery list names the zebra, update it; run the suite (all PASS), re-run the gallery check, commit `feat: replace the zebra with two horses`.

### Task 7: Food models and larger tap areas

**Files:**
- Modify: `world/props.js` (`createFood` cases `grass`, `leaves`, `carrot`)
- Modify: `scenes/5-animals.js` (`spawnRound`)

**Interfaces:**
- Produces:
  - `grass`: 12–16 thin flat blades (narrow tapered planes or flattened cones) rising and fanning from a small base clump, in two greens; reads as a tuft of grass.
  - `leaves`: a branch with 2 side twigs; every leaf is an almond shape whose base touches the branch through a short stem; nothing floats.
  - `carrot`: lathe-shaped root tapering to a point, 3–4 ring grooves, and a leafy top (3–5 feathery stalks) growing from the center of the wide end.
  - Each food object gets a child tap proxy: a sphere of radius `0.55` (local units; world ≈ 0.94 after the 1.7 scale, under the 1.1 half-spacing) with `MeshBasicMaterial({ colorWrite: false, depthWrite: false })`, added before `ctx.tap.mark(obj, ...)`.

- [ ] **Step 1: Rebuild the three foods and add the proxy in `spawnRound`.**
- [ ] **Step 2: Run** the full test suite — Expected: all PASS.
- [ ] **Step 3: Playwright check:** gallery `?view=world` close-ups of grass, leaves, carrot; then scene 5 at phone portrait: click each food at a point ~0.8 world units from its center (outside the visible model) and confirm it gets selected. Pass: all three read clearly; no floating leaves; carrot top attached at the wide end; off-model clicks select; no console errors.
- [ ] **Step 4: Commit** `feat: rebuild grass, branch and carrot, and enlarge food tap areas`.

### Task 8: Scene 2 — reactions by tap order

**Files:**
- Modify: `scenes/state/preaching.js`
- Modify: `tests/preaching.test.js`
- Modify: `scenes/2-preaching.js`
- Modify: `characters/people.js` (gesture `disbelief`; remove `coverEars`)
- Modify: `gallery.js` (`GESTURES` list)

**Interfaces:**
- Produces (state):
  - `LISTENERS = ['person-0', 'person-1', 'person-2', 'person-3']`, `REACTION_ORDER = ['laugh', 'mock', 'disbelief', 'leave']`, `TURN_TIME = 1`, `ALONE_TIME = 2.5`.
  - `tap(id)` → `REACTION_ORDER[tapsSoFar]` for a listener not yet tapped, else `null`. The 4th tap begins the finale: `[{ duration: TURN_TIME, start: 'turnAway' }, { duration: ALONE_TIME, start: 'walkOff' }]`.
- Produces (people): gesture `disbelief` — both arms raised wide (`[-2.5, -0.5, -2.5, 0.5]`) with a slow side-to-side head shake.
- View: listener ids `person-0..3`. `leave` → turns and walks off fast (speed 3) to the nearest side edge (`x = ±10`, same z). On `turnAway` the other three keep their gesture until turned (`turnAway` gesture), and on `walkOff` walk at speed 0.9 to their nearest side edge, then hide. Noah bows his head once every listener is gone. `isDone = state.done && every listener hidden`.

- [ ] **Step 1: Rewrite `tests/preaching.test.js`:**
  ```js
  test('reaction follows tap order, not the person', () => {
    for (const order of [[0, 1, 2, 3], [3, 2, 1, 0], [2, 0, 3, 1]]) {
      const s = createPreachingState();
      assert.deepEqual(order.map((i) => s.tap(`person-${i}`)), REACTION_ORDER);
    }
  });
  test('a tapped listener cannot be tapped again, even while leaving', () => {
    const s = createPreachingState();
    s.tap('person-1'); s.tap('person-0'); s.tap('person-3');
    assert.equal(s.tap('person-3'), null);
    assert.equal(s.tap('person-2'), 'leave');
    assert.equal(s.tap('person-2'), null);
  });
  test('turnAway then walkOff only after the fourth tap', ...); // run(s, 5) is [] after 3 taps; after the 4th: 'turnAway' immediately, 'walkOff' after TURN_TIME
  test('done after TURN_TIME + ALONE_TIME', ...);
  test('unknown ids are ignored', ...);
  ```
- [ ] **Step 2: Run** `node --experimental-detect-module --test tests/preaching.test.js` — Expected: FAIL.
- [ ] **Step 3: Implement the state.**
- [ ] **Step 4: Run** the test file — Expected: PASS.
- [ ] **Step 5: Add `disbelief`, remove `coverEars`, update the view and `gallery.js`.**
- [ ] **Step 6: Run** the full suite — Expected: all PASS.
- [ ] **Step 7: Playwright check** at all three sizes: tap left-to-right, then reload and tap right-to-left. Pass: reactions appear in the order laugh/dance → point → arms up → fast exit regardless of who is tapped; each of the first three gestures is still visible when the 4th is tapped; the other three turn their backs, then walk off slowly to the nearest edge without crossing Noah or each other; Noah alone with head bowed; "Next" only after everyone has left. Screenshots: each reaction, the turned backs, the empty square.
- [ ] **Step 8: Commit** `feat: assign scene 2 reactions by tap order and walk everyone off`.

### Task 9: Scene 4 — sons' work zones

**Files:**
- Modify: `scenes/state/building.js`
- Modify: `tests/building.test.js`
- Modify: `scenes/4-building.js`

**Interfaces:**
- Produces (pure, in `scenes/state/building.js`):
  - `TREE_X = [-5.4, -1.8, 1.8, 5.4]`, `TREE_Z = 3`, `LANE_Z = 4.2`.
  - `SON_FOR_TREE = [0, 0, 1, 2]` (0 Shem, 1 Ham, 2 Japheth).
  - `SON_HOMES = [{ x: -3.6, z: LANE_Z }, { x: 0.6, z: LANE_Z }, { x: 4.2, z: LANE_Z }]`.
  - `workSpot(i) -> { x, z }`: `z = LANE_Z`, `x = TREE_X[i] + 0.9 * side`, `side` = sign toward the owning son's home.
  - `sonStretch(k, radius = 0.35) -> [minX, maxX]` over the son's home and his work spots, widened by `radius`.
- View: `assignWork(i)` pushes the job to `sons[SON_FOR_TREE[i]]`; sons walk along the lane only (home → spot → home, all at `LANE_Z`); trees are obstacles `{ x: TREE_X[i], z: TREE_Z, r: 0.45 }` in `keepApart`.

- [ ] **Step 1: Add tests:**
  - `Shem cuts trees 1 and 2, Ham 3, Japheth 4`: `assert.deepEqual(SON_FOR_TREE, [0, 0, 1, 2])`.
  - `sons' stretches never overlap`: for each pair `k < m`, `sonStretch(k)[1] < sonStretch(m)[0]`.
  - `work spots sit on the lane, clear of every trunk`: for every `i` and every tree `j`, `Math.hypot(workSpot(i).x - TREE_X[j], LANE_Z - TREE_Z) >= 1.1`.
- [ ] **Step 2: Run** `tests/building.test.js` — Expected: FAIL.
- [ ] **Step 3: Implement the constants and helpers.** Run — Expected: PASS.
- [ ] **Step 4: Update the view** to use them; remove the `i % SONS.length` assignment.
- [ ] **Step 5: Run** the full suite — Expected: all PASS.
- [ ] **Step 6: Playwright check** at all three sizes: tap trees 4, 1, 3, 2 (chop), and tap tree 2 while Shem is still walking to tree 1. Pass: each son stays in his stretch; Shem queues tree 2 after tree 1; no son touches a brother or a trunk; ark builds in four steps; no console errors. Screenshot sons mid-walk.
- [ ] **Step 7: Commit** `fix: give each son his own trees so nobody crosses`.

### Task 10: Scene 1 — props and gestures

**Files:**
- Modify: `world/props.js` (`createHouse`, `createFightCloud`; new `createDustBurst`, `createJars`, `createBreadBasket`)
- Modify: `characters/people.js` (`createTownsperson` hair option; gestures)
- Modify: `gallery.js` (show the new props and gestures)

**Interfaces:**
- Produces:
  - `createHouse(variant, { tall = false } = {})`: `tall` adds 1.2 to the height. `userData.door` as today; new `userData.window: Vector3` (window center, front face) and `userData.shutter: Mesh` (a shutter hinged at its top edge beside the window; rotating it shows it hanging askew).
  - `createFightCloud({ width = 1 } = {})`: puff orbit and star radii scale by `width`; `width: 2.2` hides two people standing 1 unit apart.
  - `createDustBurst({ size = 1 }) -> { root, update(dt), puff() }`: light-gray puffs (`0xd8d2c6`) that pop out, drift up and fade; `puff()` emits one burst.
  - `createJars() -> { root, smash() }`: three clay jars; `smash()` swaps them for shards on the ground.
  - `createBreadBasket() -> THREE.Group`: a woven basket with round loaves.
  - `createTownsperson(seed, { mask = false, hair } = {})`: `hair` overrides the picked color. The thief uses `hair: 0xe8c84a` (blond).
  - New gestures in `updatePerson`: `kick` (right leg swings forward, repeating), `handsOnHead` (both hands up at the head), `sit` (legs forward, body lowered so the hips rest on the ground), `carry` (both arms forward at waist height).

- [ ] **Step 1: Implement the props, the hair option and the gestures; add them to `gallery.js`** (props in `?view=world`; gestures in the `GESTURES` cycle; the blond masked townsperson in `?view=people`).
- [ ] **Step 2: Run** the full suite — Expected: all PASS.
- [ ] **Step 3: Playwright check** in the gallery: each gesture with `&gesture=`; each prop; dust burst animating. Pass: limbs stay attached in every gesture; seated person's hips on the ground, not under it; mask clearly visible on blond hair; no console errors.
- [ ] **Step 4: Commit** `feat: add scene 1 props, dust burst and new gestures`.

### Task 11: Scene 1 — state and choreography

**Files:**
- Modify: `scenes/state/violence.js`
- Modify: `tests/violence.test.js`
- Modify: `scenes/1-violence.js`

**Interfaces:**
- Consumes: Task 10 props, gestures and `createTownsperson` hair option.
- Produces (state): `HOUSES = 4`; `house-0` and `house-1` are the pair, `house-2` jars, `house-3` food. `tap(id)` returns `'fight:<i>'` for the first pair house tapped, `'thief:<i>'` for the other pair house, `'jars:2'`, `'food:3'`; `null` for repeats/unknown/locked. `PAUSE_TIME = 3` (so the light starts after the thief has left), `LIGHT_TIME = 3`.
- View layout (starting values; tune in Playwright, keep the arrangement):
  - Back row, `tall: true`, not tappable: `[-6.2, -5.6, 1]`, `[-2.2, -5.8, 2]`, `[1.8, -5.6, 3]`.
  - Front row `[x, z, variant]`: A `[-7.4, -0.6, 0]`, B `[-4.8, -0.6, 2]` (touching A), C `[-1.4, -0.6, 1]`, D `[1.9, -0.6, 3]`.
  - Field center `x = 5.6`, Noah at `(4.8, 0, 3)`. Frame `cx ≈ -0.3, w ≈ 18.5`; portrait variant widened so all four front houses and Noah fit.
  - Walkers removed.
- View events (all in front of their houses, `z ≈ 1`–`2`, left exits at `x = -11`):
  - `fight`: a neighbor exits each of A and B, they walk to the midpoint between the doors; on meeting they hide and `createFightCloud({ width: 2.2 })` appears at the midpoint, looping.
  - `thief`: blond masked thief enters from `x = -11`, walks to that house's door (the pair house tapped second), hides 1.5 s while the house's window emits `puff()` every 0.4 s and the shutter swings to hang askew, reappears with the sack, walks off to `x = -11`, then is removed.
  - `jars`: jars by C's door; a townsperson walks in from the left, `kick`s, `smash()` + one dust burst, walks off left; the owner appears at the door with `handsOnHead` and loops it.
  - `food`: a townsperson with `carry` and the basket walks from the left toward D; another comes up behind, a short push, the first one `sit`s (loop), the other takes the basket and runs off left.
  - Characters of different events never share space (each event lives in its own house's front strip); `keepApart` covers characters that are visible and walking.

- [ ] **Step 1: Rewrite `tests/violence.test.js`:**
  ```js
  test('first pair house fights, the other is robbed', () => {
    for (const [first, second] of [[0, 1], [1, 0]]) {
      const s = createViolenceState();
      assert.equal(s.tap(`house-${first}`), `fight:${first}`);
      assert.equal(s.tap(`house-${second}`), `thief:${second}`);
    }
  });
  test('jars and food houses', () => {
    const s = createViolenceState();
    assert.equal(s.tap('house-2'), 'jars:2');
    assert.equal(s.tap('house-3'), 'food:3');
  });
  test('all four taps in one tick start every event and then the light', () => {
    const s = createViolenceState();
    const evs = [3, 1, 2, 0].map((i) => s.tap(`house-${i}`));
    assert.deepEqual(evs, ['food:3', 'fight:1', 'jars:2', 'thief:0']);
    assert.ok(run(s, PAUSE_TIME + 0.1).includes('lightStart'));
  });
  // keep: each house reveals once; unknown ids ignored; light only after all four;
  // taps locked during the light; done only after LIGHT_TIME.
  ```
- [ ] **Step 2: Run** `tests/violence.test.js` — Expected: FAIL.
- [ ] **Step 3: Implement the state.** Run — Expected: PASS.
- [ ] **Step 4: Rebuild the view.**
- [ ] **Step 5: Run** the full suite — Expected: all PASS.
- [ ] **Step 6: Playwright check** at all three sizes, orders A,B,C,D and B,A,D,C, plus all four tapped within one second. Pass: the cloud covers both fighters entirely; the thief is blond, never enters Noah's field, and leaves off the left edge; dust comes from the robbed house's window and its shutter hangs askew; jars break and the owner holds their head; the basket is taken and the pushed person sits; no event is hidden by a house; back row visible; the light falls on Noah after the thief is gone; "Next" only after the light; no console errors. Screenshot each event.
- [ ] **Step 7: Commit** `feat: rebuild scene 1 with the fight, the thief, the jars and the stolen bread`.

### Task 12: Scene 8 — exit slot layout (pure)

**Files:**
- Create: `scenes/state/exit-layout.js`
- Create: `tests/exit-layout.test.js`
- Modify: `CLAUDE.md` (pure modules list)

**Interfaces:**
- Produces:
  - `EXIT_SECTORS = { 'exit-family': [-90, -60], 'exit-round-1': [-52, -12], 'exit-round-2': [12, 52], 'exit-round-3': [60, 90] }` — degrees, angle = `atan2(dx, dz)` from the origin (0 = toward the camera, negative = left).
  - `exitSlots(groups, { origin, gap = 0.3, firstRow = 3 }) -> { [groupId]: { x, z }[] }`, where `groups = [{ id, radii: number[] }]` in release order. Within a sector, rows are arcs at increasing distance from `origin` starting at `firstRow`; each arc is packed by arc length using `r_i + r_j + gap`; a row's depth is its largest diameter plus `gap`. The returned array is in release order and the **first released gets the farthest slot**.

- [ ] **Step 1: Write the tests** (radii fixture: family 8 × 0.35; rounds built from realistic radii, e.g. round 1 `[0.9, 0.79, 1.0, 0.88, 1.0, 0.88, 0.3, 0.26]`, round 2 with two radii of 1.25 for the elephants; origin `{ x: 0, z: -1 }`):
  - `no two slots overlap, across all groups`: every pair satisfies distance `>= r_a + r_b + gap * 0.99`.
  - `every slot lies in its group's sector`: the slot angle from the origin, widened by `asin(r / distance)` on both sides, stays within the sector bounds.
  - `first out goes farthest`: distances from the origin are non-increasing along each group's array.
  - `slots stay framable`: every slot has `|x| <= 13` and `z <= 10`.
- [ ] **Step 2: Run** `tests/exit-layout.test.js` — Expected: FAIL.
- [ ] **Step 3: Implement `exitSlots`.** Run — Expected: PASS. Then the full suite.
- [ ] **Step 4: Add** `scenes/state/exit-layout.js` to the pure list in `CLAUDE.md`.
- [ ] **Step 5: Commit** `feat: add pure fan-out slot layout for leaving the ark`.

### Task 13: Scene 8 — choreography, camera and haze

**Files:**
- Modify: `scenes/state/rainbow.js` (`cleared` → `settled`)
- Modify: `tests/rainbow.test.js`
- Modify: `scenes/8-rainbow.js`

**Interfaces:**
- Consumes: `EXIT_SECTORS`, `exitSlots` (Task 12).
- Produces (state): `settled(id)` replaces `cleared(id)`: the view reports a group once every member has reached its slot; the state stays locked from a group's tap until it settles; the rainbow begins after all four have settled.
- View:
  - At build time, create all characters (hidden), compute slots once with `exitSlots` from their real `radius`, origin = ramp foot + `(0, 0, 1.4)`.
  - Each walker's points: `doorPoint → rampFoot → origin → slot`; single file on the ramp as today; once at the slot it stops and faces the camera; when the rainbow starts, people turn toward it (Noah opens his arms).
  - Camera: after each release, lerp (1.5 s) to a frame box that is the union of `startBox` and the bounding box of every released group's slots plus a 1.5 margin; the portrait variant gets the same union. The final rise to `skyBox` is unchanged.
  - Haze: when the water reaches `WATER_END`, fade its material opacity to 0 over 1 s, then remove the mesh. Place the rainbow so its feet sit behind the hills (`createHills` z = -22) at ground level; confirm in the screenshot that no horizontal band crosses it.

- [ ] **Step 1: Update `tests/rainbow.test.js`:** rename `cleared` to `settled`; add `tap is ignored while the previous group is still walking to its slots` (tap family → `tap('exit-round-1')` is `null` → `settled('exit-family')` → `tap('exit-round-1')` returns `'exit:exit-round-1'`).
- [ ] **Step 2: Run** `tests/rainbow.test.js` — Expected: FAIL (`settled` is not a function).
- [ ] **Step 3: Implement the state change.** Run — Expected: PASS.
- [ ] **Step 4: Rebuild the exit and camera in the view; fix the haze.**
- [ ] **Step 5: Run** the full suite — Expected: all PASS.
- [ ] **Step 6: Playwright check** at all three sizes, and once rotating from portrait to landscape while round 2 is walking. Pass: each group fans into its own sector; nobody walks through a standing character; no overlaps once settled; every character visible at full size in every orientation; door taps ignored until the group settles; no band over the rainbow; "Next" only after the rainbow; no console errors. Screenshots: each group settled, the final rainbow.
- [ ] **Step 7: Commit** `feat: choreograph leaving the ark and clear the haze over the rainbow`.

### Task 14: Full pass

- [ ] **Step 1: Run** the full suite — Expected: all PASS.
- [ ] **Step 2: Playwright:** play the whole story from the cover to the end in Spanish at phone portrait, and scenes 1, 2, 4, 5, 8 again in English at desktop. Pass: no console errors; every changed scene behaves as in its task check; text fits without scrolling.
- [ ] **Step 3:** Report to the user with the screenshot list; no commit unless something was fixed (then commit the fix with a `fix:` message).
