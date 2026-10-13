// Shared setup for the River track's tests: a small city on a river (water two tiles wide, loam either side), desert beyond, a road, and the
// days stepped the way tickDay steps the River's own hooks.
import { makeTestWorld, setRoad, addRaw, staffAll } from '../../helpers/testWorld.js';
import { BUILDINGS } from '../../../src/data/buildings.js';
import { T } from '../../../src/sim/terrain.js';
import { idx } from '../../../src/sim/grid.js';
import { floodplainOf, floodDay, floodMonth } from '../../../src/sim/flood.js';
import { wildlifeDay, wildlifeMonth } from '../../../src/sim/wildlife.js';
import { DAYS_PER_MONTH, MONTHS_PER_YEAR } from '../../../src/sim/time.js';

export const MONTH = DAYS_PER_MONTH;
export const YEAR = DAYS_PER_MONTH * MONTHS_PER_YEAR;
// The first day of a game month (1-12) of a game year (1, 2, ...).
export const dayOf = (year, month) => ((year - 1) * MONTHS_PER_YEAR + (month - 1)) * DAYS_PER_MONTH;

// A 56 x 56 city: the river runs north-south at x = 20-21; loam from x = 14 to 19 and 22 to 27 (the floodplain is the 3 tiles nearest the
// water: x 17-19 and 22-24); rock at x = 40-44, y = 30-34; desert elsewhere. A road along y = 10 from x = 12 to 50 (x = 20-21 is a bridge-free gap
// of two water tiles: the road is laid on each side). Six homes of tier 3 with 12 people so the workforce is real. At Town.
export function riverWorld({ size = 56, seed = 1, milestone = 'town', difficulty = 'normal', homes = 6 } = {}) {
  const w = makeTestWorld({ size, fertile: [], gold: 100000 });
  w.seed = seed;
  w.difficulty = difficulty;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = idx(size, x, y);
      if (x === 20 || x === 21) w.terrain[i] = T.WATER;
      else if ((x >= 14 && x <= 19) || (x >= 22 && x <= 27)) w.terrain[i] = T.FERTILE;
      else if (x >= 40 && x <= 44 && y >= 30 && y <= 34) w.terrain[i] = T.ROCKY;
    }
  }
  w.floodplain = floodplainOf(w.terrain, size);
  setRoad(w, 12, 10, 19, 10);
  setRoad(w, 22, 10, 50, 10);
  for (let i = 0; i < homes; i++) addRaw(w, 'house', 30 + i, 9, { tier: 3, residents: 12 });
  w.milestone = milestone;
  return w;
}

// A farm of a type at (x, y) staffed, a granary beside the road and the road along its side, all staffed.
export function addFarm(w, x, y, type = 'farm_grain') {
  const b = addRaw(w, type, x, y);
  b.staff = BUILDINGS[type].workers;
  return b;
}
export const addGranary = (w, x = 24, y = 11) => addRaw(w, 'granary', x, y, { store: {}, staff: BUILDINGS.granary.workers });

// Steps the River's hooks n days from w.day as tickDay does (the day's hook, the day on, the month's hook at a month's end).
export function stepRiver(w, n, events = null) {
  for (let i = 0; i < n; i++) {
    floodDay(w, events);
    wildlifeDay(w, events);
    w.day += 1;
    if (w.day % DAYS_PER_MONTH === 0) { floodMonth(w, events); wildlifeMonth(w, events); }
  }
}

export { staffAll, addRaw, setRoad };
