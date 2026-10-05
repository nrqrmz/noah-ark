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
  const cleared = new Set();
  intro.begin();

  return {
    // Locked while God's animations play and while a group is still on the ramp.
    get locked() {
      return !intro.finished || exiting.size > cleared.size || cleared.size === GROUPS.length;
    },
    get done() { return finale.finished; },

    tap(id) {
      if (this.locked || !GROUPS.includes(id) || exiting.has(id)) return null;
      exiting.add(id);
      return `exit:${id}`;
    },

    // The view reports when every member of a group is off the ramp.
    cleared(id) {
      if (exiting.has(id)) cleared.add(id);
      if (cleared.size === GROUPS.length) finale.begin();
    },

    tick(dt) {
      return intro.tick(dt).concat(finale.tick(dt));
    },
  };
}
