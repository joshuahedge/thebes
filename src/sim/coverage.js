// Month-end coverage by road reach (Stage 4.6, ruling 410): which homes a working well, temple or booth reaches along the roads.
//
// monthlyHousing used to ask, for every home and each of the three needs, every building whether it provides the need, works and reaches the
// home (coveredBy): about homes x 3 x buildings checks, and each a fresh look at the home's road tiles. At 80 x 80 with the whole map built
// (2,700 homes, 2,900 buildings) that was 0.8 to 1 s of every month end, 2.9 times the 64 x 64 city's, growing faster than the city.
// Here each working provider's road reach (src/sim/reach.js roadReach, already cached on the road version) is merged into one set of road
// tiles per need, once; a home is covered when a road tile beside it is in that set. That is the coveredBy rule exactly (a provider
// reaches a home when the nearest road tile beside the home is within the provider's reach, and a reach map holds only tiles within it),
// worked from the providers' side, so a month end costs the providers' reach plus one look at each home.
// Pure and deterministic: sets of tile and home ids, no order, no clock, nothing kept in the world.
import { BUILDINGS } from '../data/buildings.js';
import { allBuildings, housesOf } from './world.js';
import { roadReach, adjacentRoadTiles } from './reach.js';
import { isWorking } from './labour.js';

export const COVER_NEEDS = ['water', 'religion', 'entertainment'];

// need -> Set of road tile indices within the road reach of at least one working building that provides it.
export function reachedTiles(world) {
  const tiles = Object.fromEntries(COVER_NEEDS.map((need) => [need, new Set()]));
  for (const b of allBuildings(world)) {
    const def = BUILDINGS[b.type];
    const set = def.provides ? tiles[def.provides] : null;
    if (!set || !isWorking(world, b)) continue;
    for (const t of roadReach(world, b, def.reach).keys()) set.add(t);
  }
  return tiles;
}

// { water, religion, entertainment }: each a Set of the ids of the homes (any tier, empty plots too) a working provider reaches.
export function computeCoverage(world) {
  const tiles = reachedTiles(world);
  const cov = Object.fromEntries(COVER_NEEDS.map((need) => [need, new Set()]));
  for (const h of housesOf(world)) {
    const around = adjacentRoadTiles(world, h);
    if (!around.length) continue;
    for (const need of COVER_NEEDS) if (around.some((t) => tiles[need].has(t))) cov[need].add(h.id);
  }
  return cov;
}
