// Ferries (Version 7.1, Track F; rulings 1040-1059). A bridge crosses up to BRIDGE_MAX tiles of water (src/sim/bridges.js); a ferry crosses FERRY.min
// to FERRY.max, between two landings, one on each bank, laid in one drag straight across the water. These functions are the rule: the ferry tool's
// preview and command (src/sim/ferryLay.js), its words (src/ui/v71/ferryText.js), the landing's sheet and the tests all read them.
//
// A landing is a 1x1 building (FERRY_LANDING) with one ferryman, that must have a road beside it. It carries ferry: { mate, water, run }: the other
// landing's id, how many tiles of water lie between them, and whether the crossing ran at the last labour step (syncFerries sets it, and bumps
// world.roadVersion when it changes, so every cache keyed on the roads sees the crossing open and close). A crossing runs when both landings are
// staffed, not paused, not burning and have a road beside them. A running crossing is a link between the roads on its two banks, as long as
// crossingTiles(water) road tiles (reach.js and trade.js walk it); raiders and armies never use it (the water stays water to them: pathfinding.js).
// This file imports no commands and no reach.js, so reach.js, labour.js and the commands can import it.
import { FERRY, FERRY_LANDING, FERRY_BUILDINGS } from '../data/ferries.js';
import { MIN_STAFF_RATIO } from '../data/labour.js';
import { ring, idx, inBounds } from './grid.js';
import { T, buildable } from './terrain.js';
import { costOf } from './costs.js';

export { FERRY, FERRY_LANDING };

// Road tiles a crossing counts for, for walkers and carts: the wait on the bank and the water at a boat's pace, in whole road tiles.
export const crossingTiles = (water) => FERRY.wait + Math.ceil(water / FERRY.waterPerTile);

// What a whole crossing costs: its two landings.
export const ferryCost = (world) => 2 * costOf(world, FERRY_LANDING);

const roadBeside = (world, x, y) => ring(x, y, 1, 1).some(([rx, ry]) => inBounds(world.size, rx, ry) && world.road[idx(world.size, rx, ry)]);

// Why a drag cannot lay a ferry, else the crossing it lays: Version 8.2.1 "Easier ferries" (rulings 1340-1359) moved the rule to src/sim/ferryFind.js,
// where a drag snaps to the nearest crossing that works and a landing with no road beside it gets a short road with it (7.1 refused a bent line, a
// line that began or ended in the water, and a landing with no road beside it).
export { previewFerry } from './ferryFind.js';

// The nearest place a ferry could cross: a straight run of FERRY.min to FERRY.max tiles of water along a row or a column with free dry land at each
// end (no building, road or wall on it), no ferry standing on it yet, judged without the roads (the bar says when a landing needs one) or the gold.
// `from` is a point { x, y } on the map; the answer is { x, y, from: [x, y], to: [x, y], water, vertical }, the run's middle tile and its two
// landing tiles, or null when the map has none. The road bar's Show me on "Too wide for a bridge" goes there (src/ui/placement.js fitTarget).
export function ferrySpot(world, from) {
  const n = world.size, at = (x, y) => idx(n, x, y);
  const water = (x, y) => world.terrain[at(x, y)] === T.WATER;
  const land = (x, y) => inBounds(n, x, y) && buildable(world, at(x, y)) && !world.occ[at(x, y)] && !world.road[at(x, y)] && !world.wall[at(x, y)];
  let best = null;
  const consider = (vertical, a, b0, b1) => {
    const run = b1 - b0 + 1;
    const cell = (b) => (vertical ? [a, b] : [b, a]);
    const [x0, y0] = cell(b0 - 1), [x1, y1] = cell(b1 + 1);
    if (run < FERRY.min || run > FERRY.max || !land(x0, y0) || !land(x1, y1)) return;
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

// ── The landings and their crossings ──

export const isLanding = (b) => Boolean(b) && b.type === FERRY_LANDING;
export const landingsOf = (world) => Object.values(world.buildings).filter(isLanding);

// The landing at the other end of this one's crossing, or null when it is gone or does not name this one back.
export function mateOf(world, b) {
  const m = b && b.ferry ? world.buildings[b.ferry.mate] : null;
  return isLanding(m) && m.ferry && m.ferry.mate === b.id ? m : null;
}

// Why this landing alone does not work, else null: 'no_road' (no road beside it), 'paused', 'burning' (the fire stage of a fire) or 'no_ferryman'
// (its one ferryman is missing: not enough people, or the labour step has not staffed it yet).
export function ownBlocker(world, b) {
  if (!roadBeside(world, b.x, b.y)) return 'no_road';
  if (b.paused) return 'paused';
  if (b.fire && b.fire.stage === 'fire') return 'burning';
  if (b.staff < MIN_STAFF_RATIO * FERRY_BUILDINGS[FERRY_LANDING].workers) return 'no_ferryman';
  return null;
}

// Why this landing's crossing does not run, else null (and then it does): 'no_mate' (the landing across the water is gone), this landing's own
// reason, or the other landing's with 'mate_' before it ('mate_no_ferryman', 'mate_no_road', 'mate_paused', 'mate_burning').
export function landingBlocker(world, b) {
  const m = mateOf(world, b);
  if (!m) return 'no_mate';
  const own = ownBlocker(world, b);
  if (own) return own;
  const theirs = ownBlocker(world, m);
  return theirs ? `mate_${theirs}` : null;
}

// Settles every landing's run flag from the labour just assigned (src/sim/labour.js calls it at the end of assignLabour), and bumps
// world.roadVersion when a crossing opened or closed, so the reach, path and advice caches see it. Nothing else writes the flag.
export function syncFerries(world) {
  let changed = false;
  for (const b of landingsOf(world)) {
    if (!b.ferry) continue;
    const run = landingBlocker(world, b) === null;
    if (b.ferry.run !== run) { b.ferry.run = run; changed = true; }
  }
  if (changed) world.roadVersion++;
}

// A crossing's description for the landing's sheet and the tests: { mate, water, tiles: crossingTiles, dx, dy (to the other landing, y grows south),
// runs }, or null for a landing with no crossing recorded.
export function ferryInfo(world, b) {
  if (!isLanding(b) || !b.ferry) return null;
  const m = mateOf(world, b);
  return {
    mate: m, water: b.ferry.water, tiles: crossingTiles(b.ferry.water), runs: Boolean(m) && b.ferry.run === true && m.ferry.run === true,
    dx: m ? m.x - b.x : 0, dy: m ? m.y - b.y : 0,
  };
}

// The running crossings, each once (lower id first): [{ a, b, water }]. Kept per roadVersion and next building id: a crossing opens or closes only
// through syncFerries (which bumps the version) and a landing changes only by being built (a new id) or removed (removeBuilding bumps the version, so a razed, undone or burnt landing drops its link at once).
const linkCache = new WeakMap();   // world -> { key, links, edges }
function linksOf(world) {
  const key = `${world.roadVersion}|${world.nextId}`;
  let c = linkCache.get(world);
  if (c && c.key === key) return c;
  const links = [];
  for (const b of landingsOf(world)) {
    const m = mateOf(world, b);
    if (m && b.id < m.id && b.ferry.run === true && m.ferry.run === true) links.push({ a: b, b: m, water: b.ferry.water });
  }
  const edges = new Map();   // road tile -> [{ to: road tile, cost }]: from the roads beside one landing to the roads beside the other
  const beside = (l) => ring(l.x, l.y, 1, 1).filter(([x, y]) => inBounds(world.size, x, y) && world.road[idx(world.size, x, y)]).map(([x, y]) => idx(world.size, x, y));
  const add = (from, to, cost) => { if (!edges.has(from)) edges.set(from, []); edges.get(from).push({ to, cost }); };
  for (const l of links) {
    const cost = crossingTiles(l.water), ra = beside(l.a), rb = beside(l.b);
    for (const s of ra) for (const t of rb) { add(s, t, cost); add(t, s, cost); }
  }
  c = { key, links, edges };
  linkCache.set(world, c);
  return c;
}
export const ferryLinks = (world) => linksOf(world).links;

// The crossings as links between road tiles: Map(road tile index -> [{ to, cost }]), empty when no crossing runs. reach.js, trade.js and the cart's
// path read it, so a walk along the roads goes over a running ferry as it goes along a road.
export const ferryEdges = (world) => linksOf(world).edges;
