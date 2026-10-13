import { createWorld, makeBuilding, insertBuilding, allBuildings } from '../../src/sim/world.js';
import { BUILDINGS } from '../../src/data/buildings.js';
import { T } from '../../src/sim/terrain.js';
import { idx } from '../../src/sim/grid.js';

// raiderEntries (Stage 3): the map's raider entry points, [{ x, y }, ...] on its edges; none by default.
// clay (Stage 4.5): [x, y, w, d] patches of clay ground, as fertile; none by default (a clay pit needs clay).
export function makeTestWorld({ size = 32, fertile = [[0, 0, 8, 32]], clay = [], gold = 100000, raiderEntries = [] } = {}) {
  const terrain = new Array(size * size).fill(T.DESERT);
  for (const [fx, fy, fw, fd] of fertile) {
    for (let y = fy; y < fy + fd; y++) for (let x = fx; x < fx + fw; x++) terrain[idx(size, x, y)] = T.FERTILE;
  }
  for (const [cx, cy, cw, cd] of clay) {
    for (let y = cy; y < cy + cd; y++) for (let x = cx; x < cx + cw; x++) terrain[idx(size, x, y)] = T.CLAY;
  }
  const map = { size, terrain, tradeEntry: { x: size - 1, y: size - 1 }, startRoad: [], focus: { x: size >> 1, y: size >> 1 }, raiderEntries };
  const world = createWorld({ seed: 1, size, map });
  world.gold = gold;
  return world;
}

// Clay ground under a w x d patch at x, y (Stage 4.5: a clay pit needs clay), in a world already made.
export function layClay(world, x, y, w = 2, d = 2) {
  for (let j = y; j < y + d; j++) for (let i = x; i < x + w; i++) world.terrain[idx(world.size, i, j)] = T.CLAY;
}

export function setRoad(world, x0, y0, x1, y1) {
  const dx = Math.sign(x1 - x0), dy = Math.sign(y1 - y0);
  let x = x0, y = y0;
  for (;;) {
    world.road[idx(world.size, x, y)] = 1;
    if (x === x1 && y === y1) break;
    x += dx; y += dy;
  }
  world.roadVersion++;
}

export function addRaw(world, type, x, y, extra = {}) {
  const b = makeBuilding(world, type, x, y);
  Object.assign(b, extra);
  return insertBuilding(world, b);
}

export function staffAll(world) {
  for (const b of allBuildings(world)) b.staff = BUILDINGS[b.type].workers;
}
