// Cities for the dev page (and, later, the title card), laid through the public commands so they are
// legal cities. Every call is deterministic for a seed: the commands are deterministic and so is the clock.
import { drawRoad, paintHouses, place } from '../sim/commands.js';
import { advanceDays } from '../sim/clock.js';
import { assignLabour } from '../sim/labour.js';
import { housesOf } from '../sim/world.js';
import { TIERS } from '../data/housing.js';
import { T } from '../sim/terrain.js';
import { idx } from '../sim/grid.js';

const water = (world, x, y) => world.terrain[idx(world.size, x, y)] === T.WATER;

// Lays road west from (x0, y) one tile at a time until the river or the map edge stops it.
function roadWest(world, x0, y, minX) {
  for (let x = x0; x > minX; x--) {
    if (water(world, x - 1, y)) return x;
    if (!drawRoad(world, x, y, x - 1, y).ok) return x;
  }
  return minX;
}

export function buildSampleCity(world, { days = 360 } = {}) {
  const gold = world.gold;
  world.gold = 1e9;
  const ex = world.tradeEntry.x;
  const top = world.size - 10;                      // the start road already runs up to y = size - 9
  drawRoad(world, ex, top, ex, top - 24);
  const streets = [top - 4, top - 10, top - 16, top - 22];
  for (const y of streets) {
    drawRoad(world, ex, y, ex + 9, y);
    roadWest(world, ex, y, ex - 9);   // tile by tile, so the river can cut a street short without losing it
  }
  for (const y of streets) {
    place(world, 'well', ex - 5, y + 1);
    place(world, 'well', ex + 5, y + 1);
  }
  place(world, 'bazaar', ex + 1, top - 9);
  place(world, 'temple', ex - 3, top - 15);
  place(world, 'granary', ex + 1, top - 21);
  // Farms need fertile land, which lies west towards the river: run the lowest street out and try spots.
  const westEnd = roadWest(world, ex - 9, top - 4, 1);
  let farms = 0;
  for (let x = ex - 4; x >= westEnd && farms < 3; x--) if (place(world, 'farm_grain', x, top - 6).ok) { farms++; x--; }
  place(world, 'granary', ex - 12, top - 3);
  for (const y of streets) {
    paintHouses(world, ex - 9, y + 1, ex + 9, y + 1);
    paintHouses(world, ex - 9, y - 1, ex + 9, y - 1);
  }
  world.gold = gold;
  advanceDays(world, days);
  assignLabour(world);
  return world;
}

// A road along row y, split wherever the river crosses it.
function roadRow(world, y) {
  let start = null;
  for (let x = 0; x <= world.size; x++) {
    const blocked = x === world.size || water(world, x, y);
    if (!blocked && start === null) start = x;
    if (blocked && start !== null) {
      if (x - 1 > start) drawRoad(world, start, y, x - 1, y);
      start = null;
    }
  }
}

export function buildStressCity(world, { days = 60 } = {}) {
  const gold = world.gold;
  world.gold = 1e9;
  const size = world.size;
  const services = ['well', 'bazaar', 'temple', 'granary', 'farm_grain', 'well', 'granary'];
  for (let y = 2; y < size - 1; y += 4) roadRow(world, y);
  for (let y = 2; y < size - 3; y += 4) {
    for (let x = 1; x < size - 2; x += 7) place(world, services[(x / 7 + y / 4) % services.length | 0], x, y + 1);
  }
  for (let y = 2; y < size - 1; y += 4) {
    paintHouses(world, 0, y - 1, size - 1, y - 1);
    if (y + 1 < size) paintHouses(world, 0, y + 1, size - 1, y + 1);
  }
  // Fill the homes directly: a stress fixture needs a crowded frame now, not after years of arrivals.
  for (const h of housesOf(world)) {
    h.tier = 1 + ((h.x * 7 + h.y * 13) % 4);
    h.residents = TIERS[h.tier].capacity;
  }
  world.gold = gold;
  advanceDays(world, days);
  assignLabour(world);
  return world;
}
