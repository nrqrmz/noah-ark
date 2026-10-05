// The 12 animal pairs, their food, and the round they arrive in (scene 5).
// Pure module: safe to import from node tests.

export const FOODS = ['meat', 'grass', 'leaves', 'carrot', 'bone', 'fish', 'seeds'];

export const ANIMALS = [
  { id: 'lion', food: 'meat', round: 1 },
  { id: 'cow', food: 'grass', round: 1 },
  { id: 'giraffe', food: 'leaves', round: 1 },
  { id: 'rabbit', food: 'carrot', round: 1 },
  { id: 'crocodile', food: 'meat', round: 2 },
  { id: 'goat', food: 'grass', round: 2 },
  { id: 'elephant', food: 'leaves', round: 2 },
  { id: 'dog', food: 'bone', round: 2 },
  { id: 'cat', food: 'fish', round: 3 },
  { id: 'zebra', food: 'grass', round: 3 },
  { id: 'dove', food: 'seeds', round: 3 },
  { id: 'raven', food: 'seeds', round: 3 },
];

export function accepts(animalId, foodId) {
  return ANIMALS.some((a) => a.id === animalId && a.food === foodId);
}

export function animalsInRound(round) {
  return ANIMALS.filter((a) => a.round === round).map((a) => a.id);
}

export function foodsForRound(round) {
  const used = new Set(ANIMALS.filter((a) => a.round === round).map((a) => a.food));
  return FOODS.filter((f) => used.has(f));
}
