// Version 6.0, the balance pass (wave 4): the balance runs with the new dangers ON, played by a steady player who answers them (./respond.js).
//   - lateDangerRun(): the capital run from day 0 with the dangers' three-year grace (a new city's: tests/stage4/balance/capitalRun.js `dangers`), then the late run to year 15 on
//     Normal (tests/stage47/pressure/lateRun.js, its own defence and court answers as ever) with the danger player answering at each month end. The older runs keep the grace
//     never ending (tests/v60/b1/grace.js: they measure the game before the dangers); this is the run that measures it with them.
//   - grandDangerRun(): the grand district run (tests/v50/grand/grandRun.js) to year 10, dangers on, the player defending as the late run does (its tower spots) and answering.
// Each returns the run and the danger player's record (strikes with their days, events with the month end they came in, the advice at each warning and at years' ends,
// what the player did). Both are shared by the test files in this folder.
import { runCapital } from '../../stage4/balance/capitalRun.js';
import { runLate } from '../../stage47/pressure/lateRun.js';
import { runGrand } from '../../v50/grand/grandRun.js';
import { dangerPlayer } from './respond.js';

export const SNAPSHOT_YEARS = [4, 6, 8, 10, 12, 15];

let late = null;
export function lateDangerRun() {
  if (late) return late;
  const player = dangerPlayer({ snapshotYears: SNAPSHOT_YEARS });
  const base = runCapital(72, { dangers: true, onMonth: player.onMonth });
  const r = runLate({ base, onMonth: player.onMonth });
  return (late = { r, rec: player.rec, base });
}

let grand = null;
export function grandDangerRun() {
  if (grand) return grand;
  const player = dangerPlayer({ defend: true, snapshotYears: [4, 6, 8, 10] });
  const g = runGrand({ dangers: true, onMonth: player.onMonth });
  return (grand = { g, rec: player.rec });
}
