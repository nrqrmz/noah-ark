import { createSequence } from './sequence.js';

// Scene 6: tap each of the eight to walk into the ark; once all are truly inside,
// God shuts the door and it rains (Genesis 7:7-20). Must match FAMILY in
// characters/people.js.
export const FAMILY_IDS = ['noah', 'noahWife', 'shem', 'shemWife', 'ham', 'hamWife', 'japheth', 'japhethWife'];
export const DOOR_TIME = 2;
export const RAIN_TIME = 8;

export function createFloodState() {
  const sent = new Set();
  const inside = new Set();
  const finale = createSequence([
    { duration: DOOR_TIME, start: 'doorClose' },
    { duration: RAIN_TIME, start: 'rainStart' },
  ]);

  return {
    get locked() { return sent.size === FAMILY_IDS.length; },
    get done() { return finale.finished; },

    tap(id) {
      if (!FAMILY_IDS.includes(id) || sent.has(id)) return null;
      sent.add(id);
      return `board:${id}`;
    },

    // The view reports when a person has actually walked through the doorway.
    inside(id) {
      if (sent.has(id)) inside.add(id);
      if (inside.size === FAMILY_IDS.length) finale.begin();
    },

    tick(dt) {
      return finale.tick(dt);
    },
  };
}
