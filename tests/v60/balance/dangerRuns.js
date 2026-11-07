// Version 6.0, the balance pass (wave 4): the balance runs with the new dangers ON, played by a steady player who answers them (./respond.js).
//   - lateDangerRun(): the capital run from day 0 with the dangers' three-year grace (a new city's: tests/stage4/balance/capitalRun.js `dangers`), then the late run to year 15 on
//     Normal (tests/stage47/pressure/lateRun.js, its own defence and court answers as ever) with the danger player answering at each month end. The older runs keep the grace
//     never ending (tests/v60/b1/grace.js: they measure the game before the dangers); this is the run that measures it with them.
//   - grandDangerRun(): the grand district run (tests/v50/grand/grandRun.js) to year 10, dangers on, the player defending as the late run does (its tower spots) and answering.
// Each returns the run and the danger player's record (strikes with their days, events with the month end they came in, the advice at each warning and at years' ends,
// what the player did). Both are shared by the test files in this folder. (Wave 4 fix: Advice's tower fix now aims at the band's first strike, ruling 787, and still does not beat the grand run's third raid alone: see ./respond.js.)
import { runCapital } from '../../stage4/balance/capitalRun.js';
import { runLate } from '../../stage47/pressure/lateRun.js';
import { runGrand } from '../../v50/grand/grandRun.js';
import { runGreatWork } from '../a/greatWorkRun.js';
import { dangerPlayer } from './respond.js';
import { eventPlayer } from '../../v70/balance/events.js';   // Version 7.0 (wave 3): these runs play with the city events on, from day 0, answered as a steady player does

export const SNAPSHOT_YEARS = [4, 6, 8, 10, 12, 15];

// Version 9.0 (wave 2, tests/v90/balance): heir the trait both runs play under from day 0 (runCapital's, runGrand's); each heir's run is made once a page.
const lateOn = new Map();
export function lateDangerRun({ heir = 'steady' } = {}) {
  if (lateOn.has(heir)) return lateOn.get(heir);
  // Version 8.4 (the retune, ruling 1541): the player meets each raid sheet from the capital years on (defend: the late run's meetWarning, each band met by
  // its first strike). The capital script lays its three towers at Market town and no more, and 8.4's clock brings raids of 16-19 on foot from the north
  // in years 3-5: the year-5 raid met those three and was lost.
  const player = dangerPlayer({ snapshotYears: SNAPSHOT_YEARS, defend: true });
  const events = eventPlayer();
  const base = runCapital(72, { dangers: true, onMonth: player.onMonth, events, heir });
  const r = runLate({ base, onMonth: player.onMonth, events });
  const out = { r, rec: player.rec, base, events: events.rec };
  lateOn.set(heir, out);
  return out;
}

// Version 6.0.1 (rulings 800-807): the great-work run with the dangers on as in the real game: the grand district run from day 0 with a new city's three-year grace on `seed`,
// the danger player answering throughout, then the great-work run (tests/v60/a/greatWorkRun.js) to year 20. habits: the player's habits for finding workers (pause a monument
// for a grand home's step, idle workers to the crews, the site sheet's stall row: grandRun.js setHabits, greatWorkRun.js moveToCrews and followStall); off, the script as it was.
const greatOn = new Map();
export function greatDangerRun(seed = 5, { habits = true, heir = 'steady' } = {}) {
  const key = `${seed}:${habits}:${heir}`;
  if (greatOn.has(key)) return greatOn.get(key);
  const player = dangerPlayer({ snapshotYears: [12, 14, 16, 18, 20] });   // Version 7.0 (wave 3): Advice at the great-work years, for the balance note
  const events = eventPlayer();
  const base = runGrand({ dangers: true, onMonth: player.onMonth, seed, habits, heir });   // the grand years keep the hold: their Estate and Seat are the 6.0.1 path (the wave 3 note), the events come with the great work
  const r = runGreatWork({ base, onMonth: player.onMonth, habits, events });
  const out = { r, rec: player.rec, events: events.rec, raidsLost: player.rec.raids.filter((x) => !x.won).length, raids: player.rec.raids.length };
  greatOn.set(key, out);
  return out;
}

const grandOn = new Map();
export function grandDangerRun({ heir = 'steady' } = {}) {
  if (grandOn.has(heir)) return grandOn.get(heir);
  const player = dangerPlayer({ defend: true, snapshotYears: [4, 6, 8, 10] });
  const events = eventPlayer();
  const g = runGrand({ dangers: true, onMonth: player.onMonth, events, eventsFrom: 'grand', heir });
  const out = { g, rec: player.rec, events: events.rec };
  grandOn.set(heir, out);
  return out;
}
