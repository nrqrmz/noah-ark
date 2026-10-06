// Scene 8: where everyone stands after leaving the ark. Each group fans out
// from the ramp foot into its own angular sector, in arc-shaped rows spaced by
// each character's real solid radius. Pure module: safe to import from node tests.

// Degrees, angle = atan2(dx, dz) from the origin: 0 = toward the camera, negative = left.
export const EXIT_SECTORS = {
  'exit-family': [-90, -60],
  'exit-round-1': [-52, -12],
  'exit-round-2': [12, 52],
  'exit-round-3': [60, 90],
};

const RAD = Math.PI / 180;

// Angle between two neighbors on an arc of radius `rho` so their chord is `span`.
function stepAngle(span, rho) {
  return 2 * Math.asin(Math.min(1, span / (2 * rho)));
}

// Angular span a run of radii takes on an arc of radius `rho`, including the
// half-width of both ends (with half a gap of margin to the sector edges).
function runSpan(radii, rho, gap) {
  let span = 0;
  for (let i = 1; i < radii.length; i++) span += stepAngle(radii[i - 1] + radii[i] + gap, rho);
  const edge = (r) => Math.asin(Math.min(1, (r + gap / 2) / rho));
  return span + edge(radii[0]) + edge(radii[radii.length - 1]);
}

// Closest arc radius at which a lone character of radius r fits the sector width.
function minRho(r, width, gap) {
  return (r + gap / 2) / Math.sin(width / 2);
}

// Rows for one sector: filled from the nearest arc outward with the members in
// reverse release order, so the first released ends up on the farthest arc.
// Returns { rho, members: index[] } rows, nearest first.
function packRows(radii, width, gap, firstRow) {
  const order = radii.map((_, i) => i).reverse();
  const rows = [];
  let inner = firstRow; // inner edge of the current row's band
  let row = null;
  const rhoFor = (members, edge) => Math.max(
    edge + Math.max(...members.map((i) => radii[i])),
    ...members.map((i) => minRho(radii[i], width, gap)),
  );
  for (const i of order) {
    if (row) {
      const members = [...row.members, i];
      const rho = rhoFor(members, inner);
      if (runSpan(members.map((m) => radii[m]), rho, gap) <= width) {
        row.members = members;
        row.rho = rho;
        continue;
      }
      // Close this row: the next band starts past its largest diameter plus the gap.
      inner = row.rho + Math.max(...row.members.map((m) => radii[m])) + gap;
    }
    row = { members: [i], rho: rhoFor([i], inner) };
    rows.push(row);
  }
  return rows;
}

// groups = [{ id, radii }] in release order -> { [id]: { x, z }[] } in release order.
export function exitSlots(groups, { origin, gap = 0.3, firstRow = 3 } = {}) {
  const out = {};
  for (const { id, radii } of groups) {
    const [lo, hi] = EXIT_SECTORS[id].map((a) => a * RAD);
    const width = hi - lo;
    const slots = new Array(radii.length);
    for (const { rho, members } of packRows(radii, width, gap, firstRow)) {
      // Centre the run in the sector; within a row, release order runs left to right.
      const run = [...members].reverse();
      const rs = run.map((i) => radii[i]);
      let angle = lo + (width - runSpan(rs, rho, gap)) / 2 + Math.asin(Math.min(1, (rs[0] + gap / 2) / rho));
      run.forEach((i, k) => {
        if (k > 0) angle += stepAngle(rs[k - 1] + rs[k] + gap, rho);
        slots[i] = { x: origin.x + rho * Math.sin(angle), z: origin.z + rho * Math.cos(angle) };
      });
    }
    out[id] = slots;
  }
  return out;
}
