// Bridges (Stage 4.5, ruling 314). A road may cross water where each crossing is a straight run of at most MAP.bridgeMax tiles
// of water, with land at both ends; a bridge tile is a road tile on a water tile (world.road set on terrain WATER) and costs
// costOf(world, 'bridge') a tile. These functions are the rule: the road tool's preview and command, the bar's words and the
// tests all read them.
import { idx, inBounds } from './grid.js';
import { T } from './terrain.js';
import { MAP } from '../data/map.js';

export const BRIDGE_MAX = MAP.bridgeMax;

const isWater = (world, t) => inBounds(world.size, t[0], t[1]) && world.terrain[idx(world.size, t[0], t[1])] === T.WATER;
const touching = (a, b) => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) === 1;

// The runs of water in an ordered list of tiles (a road being laid): each maximal stretch of water tiles that follow one another,
// side by side, in the list. { from, to } are the list positions of its first and last tile, n how many water tiles it holds,
// straight whether they share a row or a column, bounded whether the tiles before and after it in the list are dry land
// beside it (a bridge starts and ends on land).
export function bridgeRuns(world, tiles) {
  const runs = [];
  let k = 0;
  while (k < tiles.length) {
    if (!isWater(world, tiles[k])) { k++; continue; }
    let e = k;
    while (e + 1 < tiles.length && isWater(world, tiles[e + 1]) && touching(tiles[e], tiles[e + 1])) e++;
    const run = tiles.slice(k, e + 1);
    const before = k > 0 && touching(tiles[k - 1], tiles[k]) && !isWater(world, tiles[k - 1]);
    const after = e + 1 < tiles.length && touching(tiles[e], tiles[e + 1]) && !isWater(world, tiles[e + 1]);
    const straight = run.every((t) => t[0] === run[0][0]) || run.every((t) => t[1] === run[0][1]);
    runs.push({ from: k, to: e, n: run.length, straight, bounded: before && after });
    k = e + 1;
  }
  return runs;
}

// Why a run of n water tiles cannot be bridged, else null: 'too_wide' past BRIDGE_MAX tiles of water, 'bridge_shape' when it
// bends or has no dry land at one end.
export function runReason({ n, straight, bounded }) {
  if (n > BRIDGE_MAX) return 'too_wide';
  return straight && bounded ? null : 'bridge_shape';
}

// One verdict per tile of the list: null for a dry tile or a water tile in a run that can be bridged, else { reason, water } with
// the run's refusal and how many tiles of water it holds. A run whose tiles all carry road already (a standing bridge) is let
// through: nothing is laid on it, so its shape is not judged again.
export function bridgeVerdicts(world, tiles) {
  const out = new Array(tiles.length).fill(null);
  for (const run of bridgeRuns(world, tiles)) {
    let laid = true;
    for (let j = run.from; j <= run.to; j++) if (!world.road[idx(world.size, tiles[j][0], tiles[j][1])]) laid = false;
    const reason = laid ? null : runReason(run);
    if (reason) for (let j = run.from; j <= run.to; j++) out[j] = { reason, water: run.n };
  }
  return out;
}

// Stage 4.6 (ruling 350): the nearest place a road can cross the water: a straight run of 1 to BRIDGE_MAX water tiles along a row or a
// column, with a free land tile at each end (no building on it; the road's own tiles may be there already) and no bridge standing on it
// yet. `from` is a point { x, y } on the map (the centre of the view, the road's start); the answer is the run's middle tile and its
// ends, { x, y, from: [x, y], to: [x, y], water, vertical }, or null when the map has none. The bridge tip's and the road bar's Show me
// aim at it, so every word they say about crossing ("up to 4 tiles of water, straight across") is the rule bridgeRuns / runReason apply.
export function bridgeSpot(world, from) {
  const n = world.size, at = (x, y) => idx(n, x, y);
  const water = (x, y) => world.terrain[at(x, y)] === T.WATER;
  const land = (x, y) => inBounds(n, x, y) && !water(x, y) && !world.occ[at(x, y)];
  let best = null;
  const consider = (vertical, a, b0, b1) => {
    const run = b1 - b0 + 1;
    const cell = (b) => (vertical ? [a, b] : [b, a]);
    const [x0, y0] = cell(b0 - 1), [x1, y1] = cell(b1 + 1);
    if (run > BRIDGE_MAX || !land(x0, y0) || !land(x1, y1)) return;
    let laid = true;
    for (let b = b0; b <= b1; b++) { const [x, y] = cell(b); if (!world.road[at(x, y)]) laid = false; }
    if (laid) return;
    const [mx, my] = cell(b0 + Math.floor(run / 2));
    const d = (mx + 0.5 - from.x) ** 2 + (my + 0.5 - from.y) ** 2;
    if (!best || d < best.d - 1e-9 || (Math.abs(d - best.d) < 1e-9 && run < best.water)) best = { d, x: mx, y: my, from: [x0, y0], to: [x1, y1], water: run, vertical };
  };
  for (let a = 0; a < n; a++) {
    for (const vertical of [false, true]) {
      let start = -1;
      for (let b = 0; b <= n; b++) {
        const wet = b < n && water(vertical ? a : b, vertical ? b : a);
        if (wet && start < 0) start = b;
        if (!wet && start >= 0) { consider(vertical, a, start, b - 1); start = -1; }
      }
    }
  }
  if (!best) return null;
  const { d, ...spot } = best;
  return spot;
}
