import { createSequence } from './sequence.js';

// Scene 8: the waters go down and the door opens (God's doing); the child sends
// the family and the animals out of the ark; then God sets the rainbow in the sky.
export const GROUPS = ['exit-family', 'exit-round-1', 'exit-round-2', 'exit-round-3'];
export const RECEDE_TIME = 4;
export const EXIT_TIME = 3;
export const RAINBOW_TIME = 4;

export function createRainbowState() {
  const intro = createSequence([{ duration: RECEDE_TIME, start: 'recede', end: 'doorOpen' }]);
  const finale = createSequence([{ duration: RAINBOW_TIME, start: 'rainbow' }]);
  const exiting = new Map(); // group -> seconds left walking out
  intro.begin();

  return {
    get locked() { return !intro.finished || exiting.size === GROUPS.length; },
    get done() { return finale.finished; },

    tap(id) {
      if (this.locked || !GROUPS.includes(id) || exiting.has(id)) return null;
      exiting.set(id, EXIT_TIME);
      return `exit:${id}`;
    },

    tick(dt) {
      const events = intro.tick(dt);
      for (const [id, left] of exiting) exiting.set(id, left - dt);
      if (exiting.size === GROUPS.length && [...exiting.values()].every((left) => left <= 0)) finale.begin();
      return events.concat(finale.tick(dt));
    },
  };
}
