// Shared setup for the Court track's tests: a small city with stores, a farm, a potter and homes, and the court opened.
import { makeTestWorld, setRoad, addRaw, staffAll } from '../../helpers/testWorld.js';
import { courtDay } from '../../../src/sim/court.js';
import { COURT, REQUESTS } from '../../../src/data/court.js';
import { DAYS_PER_MONTH } from '../../../src/sim/time.js';

export const MONTH = DAYS_PER_MONTH;
export const YEAR = DAYS_PER_MONTH * 12;

// A city with a granary (600 grain), a storehouse (200 pottery, 40 gems), a grain farm, a potter and some homes with people, all staffed.
// Market town with the trading goal done; the court not yet opened (court.awake false) unless open is true.
export function courtWorld({ open = false, difficulty = 'normal', seed = 1 } = {}) {
  const w = makeTestWorld({ size: 40, gold: 3000 });
  w.seed = seed;
  w.difficulty = difficulty;
  setRoad(w, 0, 10, 39, 10);
  addRaw(w, 'farm_grain', 2, 11);
  addRaw(w, 'granary', 6, 11, { store: { grain: 600 } });
  addRaw(w, 'storehouse', 9, 11, { store: { pottery: 200, gems: 40 } });
  addRaw(w, 'potter', 12, 11);
  addRaw(w, 'physician', 15, 11);
  for (let i = 0; i < 6; i++) addRaw(w, 'house', 14 + i, 9, { tier: 3, residents: 12 });
  staffAll(w);
  w.milestone = 'market_town';
  w.goals.completed.push(COURT.afterGoal);
  w.tally.peakPeople = 72;
  if (open) openCourt(w);
  return w;
}

// Opens the court (courtDay does it once its conditions hold) and runs to the guided letter's day.
export function openCourt(w) {
  w.day = Math.max(w.day, YEAR);
  courtDay(w);
  return w;
}

// Answers the guided letter so ordinary requests and cards follow.
export function runCourt(w, days, events = null) {
  for (let i = 0; i < days; i++) { courtDay(w, events); w.day += 1; }
}

export const firstRequestDay = () => (REQUESTS.firstYear - 1) * YEAR;
