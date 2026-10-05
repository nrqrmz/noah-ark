# Noah's Ark — interactive storybook in three.js

**Date:** 2026-10-05
**Status:** draft for review

## 1. Purpose

An illustrated storybook of Noah's story where each page shows, instead of a picture, an animated three.js scene the child can interact with.

- **Audience:** Christian families in general (non-denominational, Latter-day Saints, Jehovah's Witnesses, etc.).
- **How it is used:** an adult (or older sibling) reads the text aloud while the child taps the scene. It is not meant to be handed to a child to keep them busy alone.
- **Success:** the story is told completely and faithfully to the Bible, the child takes part on every page, and the adult can read it comfortably on a phone, tablet, or computer.

Out of scope (for now): audio narration, age selector, a separate "game" mode, languages other than Spanish and English.

## 2. Content rules

1. **Faithful to the biblical canon.** Only Bible passages are used (no Latter-day scripture), so the story stays universal. Texts are faithful paraphrases, not literal quotes from any one translation.
2. **Occasional references.** A page may show a small-print reference (e.g. *Genesis 6:22*) where it adds value; not required on every page.
3. **Illustration vs. text.** Animations may illustrate things the text does not claim (e.g. the sons cutting wood, thieves wearing masks), but the text never claims anything the Bible does not say.
4. **The child acts as Noah and his family; what God does happens on its own, as animation.** The child never triggers God's light, closes the door, sends the rain, lowers the water, or draws the rainbow. Taps are ignored while a God animation is playing.
5. **God is never shown as a figure.** He is represented as light coming down from the sky and through the text.
6. **Nothing frightening.** Violence is cartoon-style (dust clouds, masked thieves). No one is shown drowning: during the flood only the ark and the water are visible.
7. **Women never wear a veil.** Hair is worn loose, from shoulder length to mid-back.
8. **Carnivorous animals eat meat.** The interpretation that animals were herbivores before the flood is not adopted.
9. **The rainbow promise** is phrased as in Genesis 9:11: there will never again be a flood to destroy the earth.

## 3. Languages

- Neutral Latin American Spanish ("tú", "ustedes"; no "vos", no "vosotros", no regionalisms; when in doubt, Mexican usage) and English.
- No default language: the cover shows text buttons "Español" and "English" (no emojis). After choosing, "Comenzar" / "Start" appears.
- The choice is remembered in the browser (`localStorage`, wrapped in try/catch; if it fails, it is simply not remembered).
- A small button in a corner lets the reader switch language mid-story; only the text panel is repainted, the scene is not restarted.
- Texts live in `lang/es.json` and `lang/en.json` with identical keys.

## 4. Scenes

Every scene has an interaction and/or animation. **"Next" appears only when both the interaction and the closing animation have finished.**

| # | Scene | References | Child's interaction | Animation (no taps) |
|---|---|---|---|---|
| 0 | Cover | — | Choose language, tap "Start" | The ark floats gently and peacefully on the water |
| 1 | The world full of violence | Gen 6:5–13 | Tap the houses in the city; each reveals something (cartoon fight cloud, masked thief sneaking in to steal). Noah stands in his field, on the outskirts | Once all are revealed, warm light falls on Noah and God speaks to him ("Noah found grace", 6:8; the earth filled with violence, 6:13) |
| 2 | Noah preaches and is rejected | 2 Pet 2:5; Matt 24:38; 1 Pet 3:20 | In the town square, Noah speaks with open arms. Tap each person: one laughs, one mocks, one covers their ears, one turns and walks away | Finally Noah is left alone in the square |
| 3 | The ark's instructions | Gen 6:14–18 | Tap points of light; each reveals part of a blueprint drawn in light: 300 cubits long (with a tiny Noah for scale), 3 decks, window, door in the side, pitch inside and out | The complete ark lights up |
| 4 | Cutting wood and building | Gen 6:10, 6:22; Heb 11:7 | Tap a tree → a son cuts it into logs; tap logs → planks; tap planks → they fly onto the ark. Repeat with several trees | The ark grows in stages until finished |
| 5 | The animals in pairs | Gen 6:19–21; 7:8–9 | Tap a food, then a pair. Right food → the pair walks together up the ramp; wrong food → the animal shakes its head (no penalty). Three rounds of 4 pairs | Pairs queue on the ramp |
| 6 | The eight go in and it rains | Gen 7:7, 7:12, 7:16–20; 1 Pet 3:20 | Tap each of the 8 people so they board the ark | God closes the door (with light); it rains until the water covers the whole earth and the ark floats |
| 7 | The raven and the dove | Gen 8:4–12 | The ark already rests on Ararat (peaks visible). 4 taps on the window: the raven goes to and fro; the dove returns with nothing; returns with an olive leaf; does not return | Each flight |
| 8 | Leaving the ark and the rainbow | Gen 8:13–19; 9:11–16 | Tap the animal pairs and the family so they leave the ark | The water recedes on its own (the wind, 8:1) and the door opens; at the end the rainbow appears in the sky on its own with the promise. The end |

### Animals and food (scene 5)

12 pairs, 24 animals, 7 foods:

| Round | Pair | Food |
|---|---|---|
| 1 | Lion and lioness | Meat |
| 1 | Cows | Grass |
| 1 | Giraffes | Tree leaves |
| 1 | Rabbits | Carrot |
| 2 | Crocodiles | Meat |
| 2 | Goats | Grass |
| 2 | Elephants | Tree leaves |
| 2 | Dogs | Bone |
| 3 | Cats | Fish |
| 3 | Zebras | Grass |
| 3 | Doves | Seeds |
| 3 | Ravens | Seeds |

Each round shows only the foods for its 4 pairs. When all 4 have boarded, the next round arrives.

## 5. Characters and style

**Overall style:** simple, friendly cartoon built from primitives (capsules, spheres, boxes, cones), as in `coin-collector`.

**Attached limbs.** In `coin-collector/player.js` the arm pivots sit outside the torso radius, leaving a visible gap. Here:
- every joint (shoulder, hip, legs) starts inside the body volume;
- a small sphere covers each joint so no gap shows while animating;
- on people, the tunic covers the hips.

**Faces:** dot eyes, no nose. A mouth only when needed (e.g. someone laughing at Noah).

**Clothing:** single-color tunic, wider at the bottom, belt in another shade, simple sandals, sleeves attached to the body. Women wear longer tunics. None wears a veil.

| Character | Look |
|---|---|
| Noah | The eldest (600 years old, Gen 7:6). Long white beard, white hair. Beige/light brown tunic. Optional staff |
| Noah's wife | Long loose gray/white hair. Wine-colored tunic |
| Shem, Ham, Japheth | One young with no beard, one with a short beard, one with a fuller beard. Dark brown, black, and reddish hair. Blue, green, and terracotta tunics |
| The three daughters-in-law | Long loose hair: black, orange, and blond. Each wears her husband's color |
| Townspeople | Muted-tone tunics, hair variations |
| Thieves | Townspeople with a black mask |

**Animals:** cute, cartoon-style, no threatening teeth. The crocodile starts from `coin-collector/crocodile.js`, softened. Male and female: the lion has a mane, the lioness does not; for the others, the female is slightly smaller and, in some cases, has a distinguishing detail. Legs attached to the body under the same rule as people.

**Solidity:** nothing passes through anything else (see §7).

## 6. Layout

The rule depends on screen orientation, not device type. Mobile first.

- **Portrait** (phone, portrait tablet): animation on top (≈60%), text below (≈40%).
- **Landscape** (tablet, laptop, desktop, rotated phone): text on the left (≈35%), animation on the right (≈65%).

Text panel: page text in a large font for reading aloud, reference in small print, progress dots, and the "Next" button at the bottom (within thumb reach). Small language button in a corner of the animation. Safe areas are respected (`env(safe-area-inset-*)`). The goal is for every page's text to fit without scrolling; if it doesn't, the panel scrolls.

Rotating the screen mid-scene switches the layout and refits the camera without restarting the scene.

## 7. Architecture

Vanilla three.js, no build step: three.js loads from a CDN via import map, ES modules, no `package.json`. Served by any static server (`python3 -m http.server`) and publishable on GitHub Pages.

```
noah-ark/
├── index.html            layout, CSS, import map
├── main.js               renderer, camera, animation loop, tap input
├── story.js              scene order, lifecycle, "Next" rule
├── i18n.js               language loading, t(key), remembering the choice
├── lang/es.json, en.json
├── characters/
│   ├── rig.js            attached limbs (joints inside the body)
│   ├── people.js         Noah, family, townspeople, thieves
│   └── animals.js        12 animals, male and female
├── world/
│   ├── terrain.js        ground, mountains, rising and falling water
│   ├── sky.js            sky, clouds, rain, rainbow
│   ├── ark.js            light blueprint, staged construction, finished ark
│   └── props.js          trees, logs, planks, houses, food
├── systems/
│   ├── solid.js          circle separation (pure logic)
│   └── tap.js            tap raycasting, glow on tappable objects
├── scenes/0-cover.js … 8-rainbow.js
└── tests/                node --test
```

### Scene contract

Each module in `scenes/` exports a function that receives a context (`{ THREE, scene, camera, t }`) and returns:

- `build()` — builds the scene and defines the area the camera must frame;
- `update(dt)` — animates each frame;
- `onTap(object)` — responds to a tap on an object marked as tappable;
- `isDone()` — true once the interaction and the closing animation have finished;
- `dispose()` — frees geometries and materials.

Each scene's state logic (what has been tapped, which step it's on) is split into pure functions within the same module so it can be tested without three.js.

### Flow

1. `story.js` calls `build()`, paints the scene's text and reference, hides "Next".
2. Every frame: `update(dt)`, then `isDone()`. When true, "Next" appears with a soft glow.
3. "Next" → `dispose()` → next scene.

### Systems

- **Taps (`tap.js`):** tappable objects are marked and glow softly; if the child taps nothing for a while, the glow intensifies. Taps are ignored during God animations.
- **Solidity (`solid.js`):** every character and animal has a radius on the ground; each frame, overlapping ones are pushed apart. The ark, houses, and trees are fixed obstacles. Animals queue on the ramp.
- **Food:** tapping a food selects it; tapping another changes the selection; tapping an animal with the right food sends it aboard; with the wrong food it shakes its head and the selection stays.
- **Camera:** each scene defines a box to frame; the camera adjusts so it fits fully in the current aspect ratio.
- **Background tab:** the clock pauses so animations don't "jump" when the tab returns.
- **Missing text:** if a key is missing in one language, the other language's text is used and a console warning is logged (tests prevent this).

## 8. Testing and verification

**Automated (`node --test`, no dependencies):**
- Solidity: two overlapping bodies end up at least the sum of their radii apart; nothing enters a fixed obstacle.
- Food: each animal accepts its food and rejects the others; each round includes the foods for its 4 pairs.
- Languages: `es.json` and `en.json` have identical keys and no empty strings.
- Progression: "Next" never appears before `isDone()`; scene order is correct.
- Scene state: tree → logs → planks → ark; 4 flights in order (raven, dove ×3); all 8 people board and the scene ends; etc.

**Visual (Claude, via the Playwright MCP server):** every scene at phone portrait, rotated phone, and desktop sizes. Checks: no console errors, limbs attached, nothing passes through anything, text fits without scrolling, tappables glow, "Next" appears only at the end, both languages.

**Manual (the user):** testing on a real phone and matters of taste (characters look nice, pacing, text sounds natural read aloud).

## 9. Repository

- `git init`; one commit per plan step.
- `.gitignore` includes `CLAUDE.md` and `.playwright-mcp/`.
- `CLAUDE.md` (in English) summarizes the rules in this document (§2, §3, §5, §6, and the technical choice) for future sessions.
- `.mcp.json` registers the project's Playwright server.
- **Everything in the repository is in English:** code, identifiers, code comments, specs, plans, `CLAUDE.md`, all Markdown, and commit messages. The only Spanish allowed is the story content readers see (`lang/es.json` and the "Español" button label).
