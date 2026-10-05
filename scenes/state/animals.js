import { accepts, animalsInRound, foodsForRound } from '../../characters/animals/data.js';

// Scene 5: tap a food, then the pair that eats it; the right pair walks aboard.
// Three rounds of four pairs (Genesis 6:21, 7:8-9).
export const ROUNDS = 3;
export const BOARD_TIME = 3; // seconds a pair takes to walk up the ramp

export function createAnimalsState() {
  let round = 1;
  let selected = null;
  let done = false;
  const boarding = new Map(); // animal id -> seconds left walking aboard (current round)

  const roundAnimals = () => animalsInRound(round);
  const allTapped = () => roundAnimals().every((id) => boarding.has(id));

  return {
    get round() { return round; },
    get selected() { return selected; },
    get done() { return done; },
    // Every pair of this round is walking aboard: wait for the next round.
    get locked() { return done || allTapped(); },

    tap(id) {
      if (this.locked) return null;
      if (id.startsWith('food-')) {
        const food = id.slice(5);
        if (!foodsForRound(round).includes(food)) return null;
        selected = food;
        return `select:${food}`;
      }
      if (id.startsWith('pair-')) {
        const animal = id.slice(5);
        if (!roundAnimals().includes(animal) || boarding.has(animal) || !selected) return null;
        if (!accepts(animal, selected)) return `reject:${animal}`;
        boarding.set(animal, BOARD_TIME);
        selected = null;
        return `board:${animal}`;
      }
      return null;
    },

    tick(dt) {
      for (const [id, left] of boarding) boarding.set(id, left - dt);
      if (done || !allTapped() || [...boarding.values()].some((left) => left > 0)) return [];
      boarding.clear();
      if (round === ROUNDS) {
        done = true;
        return ['allAboard'];
      }
      round++;
      return [`round:${round}`];
    },
  };
}
