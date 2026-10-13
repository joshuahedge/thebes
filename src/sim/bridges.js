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
