// Walls and gates (spec 4.13, 6.4 Drawing mode). Stage 3 contract: Track 0 fixed the names, signatures and shapes;
// Track B implements the STUBs. Walls are a tile layer, world.wall: 0 none, > 0 a standing tile's hit points, -1 a breach
// (broken stone, a gap until wall is drawn over it again at the normal price). A gate is a wall tile on a road: citizens,
// walkers and road reach pass it (it is still road), raiders treat it as wall. world.wallVersion goes up whenever a tile
// appears, goes or breaks (the path and terrain caches key on it). The commands keep buildings and roads off wall tiles
// (a tower may stand on a standing wall tile), and demolish and undo handle wall tiles (src/sim/commands.js, undo.js).
//
// A tower standing on a wall tile has DEFENCE.towerOnWallHp: the raid step (raids.js) sets every standing tile to its
// full hit points, fullWallHp, when raiders arrive and again when the raid ends (spec 4.13: hit tiles heal), so placing
// or demolishing a tower needs no change to the wall layer.
import { DEFENCE } from '../data/raids.js';
import { idx, inBounds } from './grid.js';
import { T } from './terrain.js';
import { isUnlocked } from './progression.js';
import { canAfford, spend } from './money.js';
import { costOf } from './costs.js';
import { pushUndo } from './undo.js';
import { roadPath } from './commands.js';

const fail = (reason, extra = {}) => ({ ok: false, reason, warnings: [], tiles: [], gates: [], cost: 0, ...extra });

// A wall tile on a road.
export const isGate = (world, i) => world.wall[i] !== 0 && Boolean(world.road[i]);

// The hit points a newly drawn tile gets: a gate's on a road, a wall's elsewhere.
export const wallHpFor = (world, i) => (world.road[i] ? DEFENCE.gateHp : DEFENCE.wallHp);

// A standing tile's full hit points: a tower's on a tile a tower stands on, else wallHpFor.
export function fullWallHp(world, i) {
  const id = world.occ[i];
  return id && world.buildings[id] && world.buildings[id].type === 'tower' ? DEFENCE.towerOnWallHp : wallHpFor(world, i);
}

// Every standing tile back to its full hit points (raids.js: on arrival and when the raid ends). Breaches stay.
export function healWalls(world) {
  for (let i = 0; i < world.wall.length; i++) if (world.wall[i] > 0) world.wall[i] = fullWallHp(world, i);
}

// The tiles raiders stand on (a wall cannot be drawn under them).
function raiderTiles(world) {
  const a = world.raid.active;
  return new Set(a ? a.raiders.map((r) => idx(world.size, Math.floor(r.x), Math.floor(r.y))) : []);
}

// What drawing wall from (x0, y0) to (x1, y1) would do, in the road tool's L (flip picks the other L):
// { ok, reason, warnings, tiles, gates, cost } where tiles are the map indices that get wall (new tiles and breaches
// redrawn; standing wall is skipped), gates the subset on roads, and cost = walls x costOf(world, 'wall') + gates x
// costOf(world, 'gate'). Fails with 'locked' (before Market town), 'out_of_bounds', 'water', 'blocked' (a building in the
// way, or a raider), 'nothing_to_place' (all of it is wall already) or 'no_gold' (below the debt floor), keeping
// tiles, gates and cost for the last two.
export function previewWall(world, x0, y0, x1, y1, flip = false) {
  if (!isUnlocked(world, 'wall')) return fail('locked');
  if (![x0, y0, x1, y1].every(Number.isInteger) || !inBounds(world.size, x0, y0) || !inBounds(world.size, x1, y1)) return fail('out_of_bounds');
  const raiders = raiderTiles(world);
  const tiles = [], gates = [];
  for (const [x, y] of roadPath(x0, y0, x1, y1, flip)) {
    const i = idx(world.size, x, y);
    if (world.terrain[i] === T.WATER) return fail('water');
    if (world.occ[i] || raiders.has(i)) return fail('blocked');
    if (world.wall[i] > 0) continue;                                   // standing wall: nothing to do
    tiles.push(i);
    if (world.road[i]) gates.push(i);
  }
  if (!tiles.length) return fail('nothing_to_place');
  const cost = (tiles.length - gates.length) * costOf(world, 'wall') + gates.length * costOf(world, 'gate');
  if (!canAfford(world, cost)) return fail('no_gold', { tiles, gates, cost });
  return { ok: true, reason: null, warnings: [], tiles, gates, cost };
}

// The drawWall command (spec 7.3): draws the preview's tiles at full hit points, charges its cost, bumps wallVersion,
// adds tally.wallTiles, takes 'wall' out of newItems, and pushes the undo entry { kind: 'wall', tiles, before, cost }
// (before: each tile's value before, so undo puts breaches back). Returns the preview's result.
export function drawWall(world, x0, y0, x1, y1, flip = false) {
  const p = previewWall(world, x0, y0, x1, y1, flip);
  if (!p.ok) return p;
  const before = p.tiles.map((t) => world.wall[t]);
  for (const t of p.tiles) world.wall[t] = wallHpFor(world, t);
  world.wallVersion++;
  spend(world, p.cost);
  world.tally.wallTiles += p.tiles.length;
  const fresh = world.newItems.indexOf('wall');                      // the Defence card's wall stops saying "New"
  if (fresh >= 0) world.newItems.splice(fresh, 1);
  pushUndo(world, { kind: 'wall', tiles: p.tiles.slice(), before, cost: p.cost });
  return p;
}
