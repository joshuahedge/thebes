// Good spots for the next house (Stage 4.7, Task 4, ruling 465): which free tiles a new housing plot would do well on, worked from the sim's own
// coverage rules and nothing of its own.
//   a tile where a house could be placed (the same refusal as the plots tool: checkTiles(world, 'house', ...)) is
//   Good  when a road beside it is within the road reach of a working well (water, src/sim/coverage.js reachedTiles, the rule computeCoverage and
//         coveredBy use) AND of a working bazaar (bazaarTiles, the rule bazaarsByHouse uses);
//   Fair  when a road lies beside it and exactly one of the two reaches it;
//   unmarked otherwise (no road beside it, or neither reaches it).
// A plot laid on a Good or Fair tile then reads the same: computeCoverage(world).water has its id, bazaarsByHouse(world) has its id (tested both
// ways). Cached per world on the road version, the wall version, the buildings (how many, and each one's staff, paused and fire, which decide
// whether a well or a bazaar works) and the next id, so it is worked out again only when roads or buildings change, not every frame.
import { allBuildings } from './world.js';
import { reachedTiles, bazaarTiles } from './coverage.js';
import { checkTiles } from './commands.js';
import { adjacentRoadTiles } from './reach.js';
import { NEIGHBOURS4, idx, inBounds } from './grid.js';

export const SPOT = { good: 'good', fair: 'fair' };

// Whether the next-house spots are on for this city: a plot has been laid (world.tally.plotsLaid, which keeps counting after the plots are gone), or a
// home stands (a city made before the tally).
export function spotsUnlocked(world) {
  if ((world.tally.plotsLaid || 0) > 0) return true;
  for (const b of allBuildings(world)) if (b.type === 'house') return true;
  return false;
}

// What decides every spot, as one string: roads, walls, and the buildings that are there and working. Houses count (they take the tiles) but only by number
// and id: their residents and tiers do not move a spot, so a month of growth does not work the spots out again.
function keyOf(world) {
  let n = 0, sig = 0;
  for (const b of allBuildings(world)) {
    n++;
    sig = (sig * 31 + b.id * 13 + (b.type === 'house' ? 0 : (b.staff || 0) * 3 + (b.paused ? 7 : 0) + (b.fire && b.fire.stage === 'fire' ? 5 : 0))) | 0;
  }
  return `${world.roadVersion}|${world.wallVersion}|${world.nextId}|${n}:${sig}`;
}

const memo = new WeakMap();   // world -> { key, spots: { tiles: Map(tile index -> 'good' | 'fair'), good, fair, water, market } }

// { tiles, via, list, good, fair }: tiles is a Map from tile index to SPOT.good or SPOT.fair (unmarked tiles are not in it); via says which of the two a Fair tile has
// ('water' or 'market'); list is every marked tile as { i, x, y, kind, via } in tile order (row by row), for drawing.
export function houseSpots(world) {
  const key = keyOf(world), hit = memo.get(world);
  if (hit && hit.key === key) return hit.spots;
  const water = reachedTiles(world).water, market = bazaarTiles(world);
  const tiles = new Map(), via = new Map(), seen = new Set();
  let good = 0, fair = 0;
  const near = (set, i) => { for (const [dx, dy] of NEIGHBOURS4) { const x = (i % world.size) + dx, y = Math.floor(i / world.size) + dy; if (inBounds(world.size, x, y) && set.has(idx(world.size, x, y))) return true; } return false; };
  // only a tile beside a road that a well or a bazaar reaches can be Good or Fair: look there and nowhere else
  for (const set of [water, market]) {
    for (const r of set) {
      const rx = r % world.size, ry = Math.floor(r / world.size);
      for (const [dx, dy] of NEIGHBOURS4) {
        const x = rx + dx, y = ry + dy;
        if (!inBounds(world.size, x, y)) continue;
        const i = idx(world.size, x, y);
        if (seen.has(i)) continue;
        seen.add(i);
        if (world.road[i] || world.occ[i] || checkTiles(world, 'house', x, y)) continue;   // the plots tool's own check: anything but null refuses
        const w = near(water, i), m = near(market, i);
        if (w && m) { tiles.set(i, SPOT.good); good++; } else if (w || m) { tiles.set(i, SPOT.fair); via.set(i, w ? 'water' : 'market'); fair++; }
      }
    }
  }
  const list = [...tiles.keys()].sort((a, b) => a - b).map((i) => ({ i, x: i % world.size, y: Math.floor(i / world.size), kind: tiles.get(i), via: via.get(i) || null }));
  const spots = { tiles, via, list, good, fair, water, market };
  memo.set(world, { key, spots });
  return spots;
}

// What a plot at tile (x, y) would get: 'good', 'fair' or null.
export function spotAt(world, x, y) {
  return houseSpots(world).tiles.get(idx(world.size, x, y)) || null;
}

// What a tile's neighbouring roads give a plot there, for any tile (placed or not): { road, water, market } (booleans), from the same sets. The tests set a plot
// up both ways with this, against computeCoverage and bazaarsByHouse.
export function plotNeeds(world, x, y) {
  const { water, market } = houseSpots(world);
  const around = adjacentRoadTiles(world, { x, y, w: 1, d: 1 });
  return { road: around.length > 0, water: around.some((t) => water.has(t)), market: around.some((t) => market.has(t)) };
}
