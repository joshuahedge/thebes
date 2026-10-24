// Version 7.1, Track F (ferries): a small dev world for the tests and the screenshots. A river of `width` water tiles runs down x = RIVER_X .. RIVER_X + width - 1 the whole
// height of a 32 x 32 map (so nothing walks round it), a road along row 10 on each bank, and a town's worth of people to staff the ferrymen.
import { makeTestWorld, setRoad, addRaw } from '../../helpers/testWorld.js';
import { T } from '../../../src/sim/terrain.js';
import { idx } from '../../../src/sim/grid.js';
import { assignLabour } from '../../../src/sim/labour.js';

export const RIVER_X = 12;
export const ROW = 10;

// The first landing tile west of the river, the one east of it.
export const westLanding = () => [RIVER_X - 1, ROW];
export const eastLanding = (width) => [RIVER_X + width, ROW];

// width tiles of water; roads along row 10 from x = 4 to the west landing's neighbour and from the east landing's neighbour to x = 27 (width 12 still fits); `people`: homes with
// residents, so labour has workers (without, no ferryman is ever hired).
export function ferryWorld(width = 7, { roads = true, people = true, gold = 100000 } = {}) {
  const w = makeTestWorld({ gold, fertile: [] });
  for (let y = 0; y < w.size; y++) for (let x = RIVER_X; x < RIVER_X + width; x++) w.terrain[idx(w.size, x, y)] = T.WATER;
  if (roads) {
    setRoad(w, 4, ROW, RIVER_X - 2, ROW);
    setRoad(w, RIVER_X + width + 1, ROW, 29, ROW);
  }
  if (people) for (let k = 0; k < 4; k++) addRaw(w, 'house', 2 + k, 2, { tier: 1, residents: 40 });
  return w;
}

// The dragged line a player would draw: from the road tile before the west landing to the road tile after the east one, along row 10.
export function dragLine(width, y = ROW) {
  const out = [];
  for (let x = RIVER_X - 2; x <= RIVER_X + width + 1; x++) out.push([x, y]);
  return out;
}

export const settle = (w) => { assignLabour(w); return w; };
