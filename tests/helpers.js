// Advances a scene state machine by `seconds` in small steps; returns the events.
export function run(state, seconds, step = 0.05) {
  const events = [];
  for (let t = 0; t < seconds - 1e-9; t += step) events.push(...state.tick(step));
  return events;
}
