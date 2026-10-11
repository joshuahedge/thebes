// Cities for the dev page and the title card, laid through the public commands so they are legal cities. Every call
// is deterministic for a seed: the commands are deterministic and so is the clock.
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

// The first spot in the list where the building can go (the river can take any one of them on some maps).
function placeFirst(world, type, spots) {
  for (const [x, y] of spots) if (place(world, type, x, y).ok) return true;
  return false;
}

// Stage 2 on top of the village once it is a Town (spec 4.6, 4.7, 4.10): a storehouse, a clay pit and a potter on the
// north road between the streets, and on the first street, beside the start road, a pleasant block: a row of empty
// plots behind four homes, two statues and two gardens behind those, and a booth, so Townhouses there join into Manors.
function addStageTwo(world) {
  const ex = world.tradeEntry.x;
  const top = world.size - 10;
  placeFirst(world, 'storehouse', [[ex + 1, top - 13], [ex - 2, top - 13]]);
  placeFirst(world, 'clay_pit', [[ex - 2, top - 13], [ex + 1, top - 19], [ex - 2, top - 19]]);
  placeFirst(world, 'potter', [[ex + 1, top - 19], [ex - 2, top - 19], [ex + 1, top - 13]]);
  placeFirst(world, 'booth', [[ex - 1, top - 2], [ex - 1, top - 12]]);
  paintHouses(world, ex + 1, top - 2, ex + 4, top - 2);
  for (const x of [ex + 2, ex + 3]) place(world, 'statue', x, top - 1);
  for (const x of [ex + 1, ex + 4]) place(world, 'garden', x, top - 1);
}

export function buildSampleCity(world, { days = 360, stageTwoDays = 240 } = {}) {
  world.calm = true;                                // Stage 3 contract: no fire or raids until Track F (src/sim/clock.js)
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
  // The farms' granary beside the north road (within their reach and the bazaar's), else past them on the lowest
  // street; and a second temple on the north road for the two lower streets.
  placeFirst(world, 'granary', [[ex - 2, top - 7], [ex - 12, top - 3]]);
  place(world, 'temple', ex + 1, top - 7);
  for (const y of streets) {
    paintHouses(world, ex - 9, y + 1, ex + 9, y + 1);
    paintHouses(world, ex - 9, y - 1, ex + 9, y - 1);
  }
  world.gold = gold;
  advanceDays(world, days);
  if (stageTwoDays > 0 && world.milestone !== 'village') {
    const spent = world.gold;
    world.gold = 1e9;
    addStageTwo(world);
    world.gold = spent;
    advanceDays(world, stageTwoDays);
  }
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

// Every building the stress city cycles through, Stage 2's included, so the frame draws them all at once (a farm only
// takes where the land is fertile).
const STRESS_SERVICES = [
  'well', 'bazaar', 'temple', 'granary', 'farm_grain', 'well', 'granary', 'storehouse', 'potter', 'booth', 'clay_pit',
  'brewery', 'garden', 'weaver', 'statue', 'jeweller', 'trading_post', 'farm_fig', 'farm_barley', 'farm_flax',
];

export function buildStressCity(world, { days = 60 } = {}) {
  world.calm = true;                                // Stage 3 contract: no fire or raids until Track F (src/sim/clock.js)
  const gold = world.gold;
  world.gold = 1e9;
  world.milestone = 'capital';   // a fixture: every building unlocked, as the homes below are filled directly
  const size = world.size;
  const services = STRESS_SERVICES;
  for (let y = 2; y < size - 1; y += 4) roadRow(world, y);
  for (let y = 2; y < size - 3; y += 4) {
    for (let x = 1; x < size - 2; x += 7) place(world, services[(x / 7 + y / 4) % services.length | 0], x, y + 1);
  }
  for (let y = 2; y < size - 1; y += 4) {
    paintHouses(world, 0, y - 1, size - 1, y - 1);
    if (y + 1 < size) paintHouses(world, 0, y + 1, size - 1, y + 1);
  }
  // Fill the homes directly: a stress fixture needs a crowded frame now, not after years of arrivals. Tiers 1 to 5:
  // the one-tile tiers (Manors and up need merged squares, which this street pattern has no room for).
  for (const h of housesOf(world)) {
    h.tier = 1 + ((h.x * 7 + h.y * 13) % 5);
    h.residents = TIERS[h.tier].capacity;
  }
  world.gold = gold;
  advanceDays(world, days);
  assignLabour(world);
  return world;
}
