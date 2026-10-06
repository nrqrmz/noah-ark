import { createSequence } from './sequence.js';

// Scene 8: the waters go down and the door opens (God's doing); the child leads
// the family and the animals out, one group at a time; then God sets the
// rainbow in the sky.
export const GROUPS = ['exit-family', 'exit-round-1', 'exit-round-2', 'exit-round-3'];
export const RECEDE_TIME = 4;
export const DOOR_TIME = 1.5;
export const RAINBOW_TIME = 4;

export function createRainbowState() {
  const intro = createSequence([
    { duration: RECEDE_TIME, start: 'recede' },
    { duration: DOOR_TIME, start: 'doorOpening', end: 'doorOpen' },
  ]);
  const finale = createSequence([{ duration: RAINBOW_TIME, start: 'rainbow' }]);
  const exiting = new Set();
  const settled = new Set();
  intro.begin();

  return {
    // Locked while God's animations play and until the last group called has
    // reached its slots.
    get locked() {
      return !intro.finished || exiting.size > settled.size || settled.size === GROUPS.length;
    },
    get done() { return finale.finished; },

    tap(id) {
      if (this.locked || !GROUPS.includes(id) || exiting.has(id)) return null;
      exiting.add(id);
      return `exit:${id}`;
    },

    // The view reports when every member of a group has reached its slot.
    settled(id) {
      if (!exiting.has(id) || settled.has(id)) return;
      settled.add(id);
      if (settled.size === GROUPS.length) finale.begin();
    },

    tick(dt) {
      return intro.tick(dt).concat(finale.tick(dt));
    },
  };
}
