// Version 7.1, Track M: the playability checks of a generated map (the 200-seed sweep and the per-layout tests use them). Returns the list of
// broken promises for one map (empty when it keeps them all) and what it measured.
import { idx, inBounds, NEIGHBOURS4 } from '../../../src/sim/grid.js';
import { T } from '../../../src/sim/terrain.js';
import { MAP } from '../../../src/data/map.js';
import { RESOURCES, resourceReach } from '../../../src/data/s47.js';
import { RESOURCE_TYPES, spotsFor, packed } from '../../../src/sim/resources.js';
import { areaScale } from '../../../src/data/map.js';

// The tiles 4-linked to `from` over ground that passes `ok`.
export function reach(m, from, ok) {
  const seen = new Uint8Array(m.size * m.size), queue = [];
  for (const i of from) if (ok(m.terrain[i])) { seen[i] = 1; queue.push(i); }
  for (let k = 0; k < queue.length; k++) {
    const x = queue[k] % m.size, y = (queue[k] - x) / m.size;
    for (const [dx, dy] of NEIGHBOURS4) {
      if (!inBounds(m.size, x + dx, y + dy)) continue;
      const j = idx(m.size, x + dx, y + dy);
      if (!seen[j] && ok(m.terrain[j])) { seen[j] = 1; queue.push(j); }
    }
  }
  return seen;
}
const landOk = (t) => t !== T.WATER && t !== T.HILLS;
const onEdge = (m, i) => { const x = i % m.size, y = (i - x) / m.size; return x === 0 || y === 0 || x === m.size - 1 || y === m.size - 1; };
// The start's own land (no water crossing, no hills), and the water a boat reaches from the map's edge (an oasis pool is not the river).
export const ownLand = (m) => reach(m, [idx(m.size, m.focus.x, m.focus.y)], landOk);
export function riverWater(m) {
  const pool = (i) => (m.oases || []).some((o) => Math.hypot((i % m.size) - o.x, Math.floor(i / m.size) - o.y) <= o.r);
  const edges = [];
  for (let i = 0; i < m.terrain.length; i++) if (onEdge(m, i) && m.terrain[i] === T.WATER) edges.push(i);
  const wet = reach(m, edges, (t) => t === T.WATER);
  for (let i = 0; i < wet.length; i++) if (wet[i] && pool(i)) wet[i] = 0;
  return wet;
}

// Where a Quay (2x1, one long side on river water) could stand on the start's own land: the first such spot, or null.
export function quaySite(m, own = ownLand(m), wet = riverWater(m)) {
  const n = m.size, land = (x, y) => inBounds(n, x, y) && own[idx(n, x, y)], water = (x, y) => inBounds(n, x, y) && wet[idx(n, x, y)];
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      if (land(x, y) && land(x + 1, y) && ((water(x, y - 1) && water(x + 1, y - 1)) || (water(x, y + 1) && water(x + 1, y + 1)))) return { x, y, rot: 0 };
      if (land(x, y) && land(x, y + 1) && ((water(x - 1, y) && water(x - 1, y + 1)) || (water(x + 1, y) && water(x + 1, y + 1)))) return { x, y, rot: 1 };
    }
  }
  return null;
}

// The guarantee's fits (src/sim/resources.js), counting only spots wholly on the start's own land.
export function ownFits(m, own = ownLand(m)) {
  const r = resourceReach(m.size), out = {};
  for (const [key, type] of Object.entries(RESOURCE_TYPES)) {
    const spots = spotsFor(m, type).filter((s) => [0, 1, m.size, m.size + 1].every((d) => own[idx(m.size, s.x, s.y) + d]));
    out[key] = packed(spots, r);
  }
  return out;
}

export function playability(m) {
  const bad = [], n = m.size, at = (x, y) => m.terrain[idx(n, x, y)];
  const own = ownLand(m), wet = riverWater(m);
  for (let y = m.focus.y - 3; y <= m.focus.y + 3; y++) for (let x = m.focus.x - 3; x <= m.focus.x + 3; x++) {
    if (!inBounds(n, x, y) || [T.WATER, T.ROCKY, T.HILLS].includes(at(x, y))) { bad.push(`start area ${x},${y}`); break; }
  }
  if (m.tradeEntry.y !== n - 1 || !own[idx(n, m.tradeEntry.x, m.tradeEntry.y)]) bad.push(`trade entry ${m.tradeEntry.x},${m.tradeEntry.y}`);
  for (const [x, y] of m.startRoad) if (!own[idx(n, x, y)] || at(x, y) === T.ROCKY) { bad.push(`start road ${x},${y}`); break; }
  const want = Math.round(2 * areaScale(n)) > 2 ? 3 : 2;
  if (m.raiderEntries.length !== want) bad.push(`${m.raiderEntries.length} raider entries`);
  for (const e of m.raiderEntries) if (!onEdge(m, idx(n, e.x, e.y)) || !own[idx(n, e.x, e.y)]) bad.push(`raider entry ${e.x},${e.y}`);
  // the raiders' way in keeps its distance (landEntries' ladder: 0.4 of the side from the start where the land allows it, the first two never under 0.25, a third never under 0.1)
  const away = (e) => Math.hypot(e.x - m.focus.x, e.y - m.focus.y) / n;
  m.raiderEntries.forEach((e, k) => { if (away(e) < (k < 2 ? 0.25 : 0.1)) bad.push(`raider entry ${e.x},${e.y} only ${away(e).toFixed(2)} of the side from the start`); });
  const fits = ownFits(m, own);
  if (fits.clay < RESOURCES.clay || fits.mine < RESOURCES.mine || fits.farm < RESOURCES.farm) bad.push(`fits on own land: clay ${fits.clay} mine ${fits.mine} farm ${fits.farm}`);
  if (!(m.params.outcrops >= 1)) bad.push('no rock belt');
  const quay = quaySite(m, own, wet);
  if (!quay) bad.push('no Quay site');
  let water = 0;
  for (const t of m.terrain) if (t === T.WATER) water++;
  const share = water / (n * n);
  if (share > MAP.courses.maxWater) bad.push(`water ${(share * 100).toFixed(1)}%`);
  return { bad, share, fits, quay, own, wet };
}
