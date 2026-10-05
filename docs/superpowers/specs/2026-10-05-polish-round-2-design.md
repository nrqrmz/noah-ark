# Noah's Ark — polish round 2

Fixes and redesigns from the user's playthrough of the deployed storybook. Scope: scenes 1, 2, 4, 5, 7 (raven only) and 8. All rules in `CLAUDE.md` and the main spec (`2026-10-05-noah-ark-design.md`) still apply. Story copy (`lang/*.json`) does not change.

## 1. Scene 1 — the world full of violence

**Problems:** the front fight cloud covers only one of the two fighters; the front thief starts in Noah's field and returns there with the sack (as if bringing loot to Noah); the back thief's action and exit are not visible; a front house hides the back fight cloud.

**Layout**
- Back row: 3 tall houses, decorative only (not tappable).
- Front row: 4 tappable houses, spaced so nothing that happens at one is hidden by another. Every event plays in front of its house, on the camera side.
- Houses A and B in the front row are adjacent (neighbors). Houses C and D are the other two.
- Noah's field stays on the right. No evil-doer enters, leaves from, or passes through the field.
- The wandering townspeople are removed (they read as "dancing" figures and get confused with the event characters).

**Events (4 taps, any order)**
1. **Fight (first tap on A or B):** one neighbor comes out of A and one out of B; they meet between the two houses and fight. The cartoon fight cloud is sized and placed to cover both of them completely.
2. **Thief (tap on the other house of the pair):** while the neighbors fight, a masked thief with **blond hair** (so the mask stands out) walks in from the left edge and enters that empty house. Light-gray dust puffs come out of its windows and a shutter ends up hanging askew. He comes out with a sack and leaves the scene off the left edge. He does not come back.
3. **Broken jars (house C):** jars stand by the door. Someone walks up, kicks them over just to cause damage, and they break into pieces with a small dust puff. The owner leans out of the door and puts their hands on their head.
4. **Stolen food (house D):** someone walks by carrying a bread basket. Another person comes up, pushes them (they sit down on the ground, unhurt), and runs off with the basket.

Dust, never black smoke or fire: it says "things got smashed" without frightening a child, and matches the fight cloud's visual language.

After each event finishes, its characters settle into a calm idle loop so the scene never looks frozen. When all 4 are revealed, God's light falls on Noah as today.

**State (`scenes/state/violence.js`):** tracks the A/B pair. Whichever of A/B is tapped first returns `fight`; the other then returns `thief`. C returns `jars`, D returns `food`. Tests cover both pair orders and that each house reveals once.

## 2. Scene 2 — Noah the preacher of righteousness

**Problem:** the reaction is tied to the person; tapping in another order shows the wrong reaction, and the finale overrides the gestures with "turn away" before they are seen.

**Design**
- The reaction depends on **tap order**, not on which listener is tapped:
  1. laughs and dances (existing laugh animation);
  2. points at Noah with scorn;
  3. raises both arms in disbelief;
  4. turns their back and leaves **quickly**.
- Each of the first three reactions loops until the closing animation starts, so it is always visible.
- Closing animation (taps ignored): as the 4th listener leaves, the other three finish their gesture, turn their back on Noah, and walk off **slowly**, each toward the nearest scene edge, so nobody crosses in front of Noah or bumps into another. Noah stays alone with his head bowed; the feasters keep eating at the back.
- "Next" appears only after everyone has left.

**State (`scenes/state/preaching.js`):** `tap(id)` accepts any not-yet-tapped listener and returns the reaction for the current tap count. Tests cover several tap orders.

## 3. Scene 4 — building the ark

**Problem:** trees are assigned with `i % 3`, so the 4th tree goes to the left son, who walks across the scene into his brothers.

**Design**
- Fixed work zones: **Shem** cuts trees 1 and 2 and waits between them; **Ham** cuts tree 3; **Japheth** cuts tree 4. Each son only moves within his own stretch.
- Sons walk along a lane in front of the trees (camera side), never between trunks. Each work spot sits in front of and beside its tree, outside the trunk and canopy.
- If Shem's second tree is tapped while he is still working on the first, the job queues.
- Trees are solid obstacles (`systems/solid.js`).
- A test checks that the sons' stretches do not overlap.

The 4 trees and the gradual ark build stay.

## 4. Scene 5 — animals and food (and the raven in scene 7)

**Flat markings:** spots and stripes are painted into a texture generated in code (canvas), not bumps added to the body. They lie flat and follow the body shape. No image files, no build step.

**Species**
- **Giraffe:** patch spots on body, neck and legs.
- **Lion and lioness:** longer and slimmer body, longer legs, defined waist, smaller head. Lioness: no mane, narrower muzzle. Lion: a mane that reads as a mane, not a sunflower. Fierce but friendly; nothing grotesque.
- **Cow:** white with flat spots; staying plump is fine; short horns curving upward.
- **Bull:** solid dark brown, no spots; heavier shoulders; large horns that go out sideways and curve forward.
- **Goats:** slim, long-legged (must not read as sheep); goatee; longer horns curving backward.
- **Cats:** one is an orange tabby (Garfield-like).
- **Zebra:** horse body: long neck, mane, elongated muzzle, tufted tail. Stripes painted over the whole body, legs and head. **Checkpoint:** the user reviews it in `/gallery.html`. If they reject it, it is replaced by two horses (dark brown and light brown) on the same horse body; `data.js`, food (grass) and copy are adjusted accordingly.
- **Raven:** black body; beak and feet use the same colors as the dove's. This is one model, so the raven in scene 7 (Ararat) gets the fix too.

**Food**
- **Grass:** a bunch of thin pointed blades rising from a base; it must read as grass at a glance.
- **Giraffe branch:** every leaf is attached to the branch by a stem. Nothing floats.
- **Carrot:** a cone tapering to a point, with ring marks, and a leafy top growing from the wide end.
- **Tap area:** each food gets an invisible tap target much larger than the visible object.

## 5. Scene 8 — leaving the ark and the rainbow

**Problems:** the 4 gathering spots are too close together; each group uses a fixed 4-column grid that ignores animal size; later groups walk through earlier ones. A hazy band hides the base of the rainbow.

**Fan-out choreography**
- From the ramp foot, 4 sectors fan out: family to the left, round 1 front-left, round 2 front-right, round 3 to the right. Each group walks in a straight line within its own sector, so no group crosses another.
- Within a group, the first one out takes the farthest slot and later ones fill closer slots, so nobody walks between characters already standing.
- Slots are spaced by each character's real solid footprint, with a gap. A pure function computes them; a test checks that no two slots overlap and that every slot lies in its group's sector.
- The camera widens a little with each group so everyone fits at full size (characters are not shrunk).
- The next group can be called only after the previous one has **reached its slots**, not just left the ramp.
- At the end everyone turns toward the rainbow and Noah opens his arms, as today.

**Haze:** the cause is the 220-unit water plane, which ends just below the ground but shows on the horizon as a bluish band over the rainbow's base. Once the water finishes receding it fades out and is removed, and the rainbow is placed so its base rests on the visible horizon. Verified in the browser before the fix counts as done.

## 6. Testing and verification

**Automated (`node --experimental-detect-module --test`):**
- Scene 1: pair logic (fight then thief, both orders), each house reveals once, finale starts after 4 reveals.
- Scene 2: reaction by tap order for several orders; finale after the 4th.
- Scene 4: zone assignment (trees 1–2 Shem, 3 Ham, 4 Japheth); stretches do not overlap.
- Scene 5: animal/food data still consistent (including if horses replace the zebra).
- Scene 8: slot layout has no overlaps and stays inside each sector; a group can be called only after the previous one settled.

**Visual (Claude, Playwright MCP):** every changed scene at phone portrait, rotated phone, and desktop sizes; no console errors; nothing passes through anything; tap each scene in more than one order. The gallery shows every changed animal and food.

**Manual (the user):** the zebra checkpoint, and taste overall (how the lions, goats and bull look; scene 8 pacing).
