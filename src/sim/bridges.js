// Bridges (Stage 4.5, ruling 314). A road may cross water where each crossing is a straight run of at most MAP.bridgeMax tiles
// of water, with land at both ends; a bridge tile is a road tile on a water tile (world.road set on terrain WATER) and costs
// costOf(world, 'bridge') a tile. These functions are the rule: the road tool's preview and command, the bar's words and the
// tests all read them.
import { NEIGHBOURS4, idx, inBounds } from './grid.js';
import { T, buildable } from './terrain.js';
import { MAP, hasRiver } from '../data/map.js';
import { FERRY } from '../data/ferries.js';

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
// Version 8.3 (Track X): the runs are crossingRuns'. A ferry's water tiles are { ferry: run } and its two bank tiles { landing: run } (neither gets road),
// and a refusal carries the run's open look-ahead, the landing's block and the tile it is about as well.
export function bridgeVerdicts(world, tiles) {
  const out = new Array(tiles.length).fill(null);
  for (const run of crossingRuns(world, tiles)) {
    if (run.kind === 'ferry') {
      for (let j = run.from; j <= run.to; j++) out[j] = { ferry: run };
      out[run.from - 1] = { landing: run };
      out[run.to + 1] = { landing: run };
    } else if (run.reason) {
      const v = { reason: run.reason, water: run.n, at: run.at, ...(run.open ? { open: run.open } : {}), ...(run.block ? { block: run.block } : {}) };
      for (let j = run.from; j <= run.to; j++) out[j] = v;
      if (run.reason === 'landing_taken') { out[run.from - 1] = v; out[run.to + 1] = v; }   // the bank says why first, not 'blocked' (ruling 1393)
    }
  }
  return out;
}

// ── Version 8.3 "Lines", Track X (rulings 1390-1409): the road tool lays a bridge or a ferry ──
// A run of water a road crosses is judged as a whole: 1 to BRIDGE_MAX tiles straight across with land at both ends is a bridge (as before); FERRY.min to
// FERRY.max is a ferry, whose two bank tiles become its landings (no road on them or on the water; ruling 1390); wider is 'too_wide'. A map with no river
// has no ferries (ruling 1333), so there everything past BRIDGE_MAX stays too wide. Route (src/sim/route.js) still reads runReason: it lays bridges only.

// Free dry land: a tile a landing or a stub may take (open ground, nothing built, no road, no wall). src/sim/ferryFind.js re-exports it.
export const freeLand = (world, x, y) => {
  if (!inBounds(world.size, x, y)) return false;
  const i = idx(world.size, x, y);
  return buildable(world, i) && !world.occ[i] && !world.road[i] && !world.wall[i];
};

// The most water a road may cross on this map: a ferry's on a map with a river, a bridge's on one without.
export const crossMax = (world) => (hasRiver(world.mapVariant) ? FERRY.max : BRIDGE_MAX);
// The crossing n tiles of straight water take: 'bridge', 'ferry', or null when it is too wide.
export const crossingKind = (world, n) => (n <= BRIDGE_MAX ? 'bridge' : n <= crossMax(world) ? 'ferry' : null);

// Why a ferry cannot land on a bank tile, else null (ruling 1393): 'built', 'wall' (a wall, or a gate: a road through one) or 'ground' (hills, or off
// the map). Ruling 1406: a plain road of the player's there is no bar: the landing takes its tile (liftsRoad), and Undo puts it back.
export function landingBlock(world, [x, y]) {
  if (!inBounds(world.size, x, y)) return 'ground';
  const i = idx(world.size, x, y);
  if (world.occ[i]) return 'built';
  if (world.wall[i]) return 'wall';
  return buildable(world, i) ? null : 'ground';
}
// Whether a ferry's landing tile holds a plain road the landing takes up (ruling 1406).
export const liftsRoad = (world, [x, y]) => inBounds(world.size, x, y) && Boolean(world.road[idx(world.size, x, y)]) && !landingBlock(world, [x, y]);

// Each run of water in an ordered list of tiles, judged: bridgeRuns' fields, and
//   kind      'bridge', 'ferry', 'laid' (every tile a bridge already: nothing to judge), or null when refused
//   reason    null, or the refusal: 'too_wide', 'bridge_shape' (bent, or no dry land at one end; see open), 'landing_taken' (a ferry's bank tile is
//             built on, walled or hills, or another crossing of the list has it: block says which of landingBlock's, or 'taken'); a bank tile with a
//             plain road on it is no refusal: the landing takes it up (ruling 1406)
//   water     how many tiles of water; tiles: their [x, y]; landings: a ferry's two bank tiles, in the list's order; at: the tile a refusal is about
//   open      the list ends in this water, straight on from the dry land before it (a drag on its way across): { ahead: the tiles of water from the bank
//             to the far bank along the line, kind: what they take ('bridge', 'ferry' or null), edge: true when the water runs on to the map's edge }
export function crossingRuns(world, tiles) {
  const wet = (t) => Boolean(t) && isWater(world, t);
  const claimed = new Set();
  return bridgeRuns(world, tiles).map((run) => {
    const own = tiles.slice(run.from, run.to + 1);
    const out = { ...run, kind: null, reason: null, water: run.n, tiles: own, landings: null, open: null, block: null, at: own[0] };
    if (own.every((t) => world.road[idx(world.size, t[0], t[1])])) return { ...out, kind: 'laid' };
    const before = run.from > 0 ? tiles[run.from - 1] : null, after = run.to + 1 < tiles.length ? tiles[run.to + 1] : null;
    if (!run.straight) return { ...out, reason: 'bridge_shape' };
    if (!run.bounded) {
      // The list ends in this water, on in a line from dry land beside it: look along the line to the far bank.
      if (run.to !== tiles.length - 1 || !before || !touching(before, own[0]) || wet(before)) return { ...out, reason: 'bridge_shape' };
      const dx = own[0][0] - before[0], dy = own[0][1] - before[1];
      if (!own.every((t, k) => t[0] === own[0][0] + dx * k && t[1] === own[0][1] + dy * k)) return { ...out, reason: 'bridge_shape' };
      let ahead = 0, x = own[0][0], y = own[0][1];
      while (wet([x, y])) { ahead++; x += dx; y += dy; }
      const edge = !inBounds(world.size, x, y);
      return { ...out, reason: 'bridge_shape', open: { ahead, kind: edge ? null : crossingKind(world, ahead), edge } };
    }
    const kind = crossingKind(world, run.n);
    if (!kind) return { ...out, reason: 'too_wide' };
    if (kind === 'bridge') return { ...out, kind };
    // A ferry runs straight on from bank to bank: its bank tiles are in line with its water (a bridge may be come at from the side).
    const ax = Math.sign(own[1][0] - own[0][0]), ay = Math.sign(own[1][1] - own[0][1]), last = own[own.length - 1];
    if (before[0] !== own[0][0] - ax || before[1] !== own[0][1] - ay || after[0] !== last[0] + ax || after[1] !== last[1] + ay) return { ...out, reason: 'bridge_shape' };
    const landings = [[before[0], before[1]], [after[0], after[1]]];
    // A bank tile between this water and another run of the list (a strip of land one tile wide), or one another crossing of the list has, is taken.
    const between = [wet(tiles[run.from - 2]) && touching(tiles[run.from - 2], before), wet(tiles[run.to + 2]) && touching(after, tiles[run.to + 2])];
    for (let k = 0; k < 2; k++) {
      const block = landingBlock(world, landings[k]) || (between[k] || claimed.has(`${landings[k][0]},${landings[k][1]}`) ? 'taken' : null);
      if (block) return { ...out, reason: 'landing_taken', block, at: landings[k], landings };
    }
    for (const l of landings) claimed.add(`${l[0]},${l[1]}`);
    return { ...out, kind: 'ferry', landings };
  });
}

// Whether a road stands beside a tile once `laid` (map indices given road) is laid and `lifted` (map indices whose road a landing takes up, ruling
// 1406) is taken up: a landing's ferryman's way in (ruling 1394).
export const roadWouldTouch = (world, [x, y], laid, lifted = new Set()) => NEIGHBOURS4.some(([dx, dy]) => {
  if (!inBounds(world.size, x + dx, y + dy)) return false;
  const i = idx(world.size, x + dx, y + dy);
  return (Boolean(world.road[i]) && !lifted.has(i)) || laid.has(i);
});

// Stage 4.6 (ruling 350): the nearest place a road can cross the water: a straight run of 1 to BRIDGE_MAX water tiles along a row or a
// column, with a free land tile at each end (no building on it; the road's own tiles may be there already) and no bridge standing on it
// yet. `from` is a point { x, y } on the map (the centre of the view, the road's start); the answer is the run's middle tile and its
// ends, { x, y, from: [x, y], to: [x, y], water, vertical }, or null when the map has none. The bridge tip's and the road bar's Show me
// aim at it, so every word they say about crossing ("up to 4 tiles of water, straight across") is the rule bridgeRuns / runReason apply.
export function bridgeSpot(world, from) {
  const n = world.size, at = (x, y) => idx(n, x, y);
  const water = (x, y) => world.terrain[at(x, y)] === T.WATER;
  const land = (x, y) => inBounds(n, x, y) && buildable(world, at(x, y)) && !world.occ[at(x, y)];   // Stage 4.7: a bridge ends on open land, never on hills (src/sim/terrain.js)
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
