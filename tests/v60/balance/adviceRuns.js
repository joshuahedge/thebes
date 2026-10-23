// Version 6.0, the balance pass (wave 4): what Advice puts first at points on every balance run, read as each run goes (the shared runs are never touched: each is played
// again with a recorder, or read where it ends). A row is the top three items { kind, weight, count, fix, refused } where refused is what the sim would refuse about the item's fix
// (./respond.js refusal: Show me's own search for a build, Harvest now's quote, a building that is gone), null when nothing.
//   village   years 3, 6 and 10 (the 10-year village, farms 2 and towers 2: the older advice test's)
//   capital   the end of year 6
//   late      years 8, 10, 12 and 15;  careless (the late run with no defence, tribute, stocks or court answers)  years 8, 12 and 15
//   grand     years 7, 8, 9 and 10 (the grand district run);  great  years 12, 14, 16, 18 and 20 (the great-work run)
//   lateOn / grandOn  the dangers-on runs' own (./dangerRuns.js: at each warning and at years' ends)
import { villageRun46 } from '../../stage46/balance/villageRun.js';
import { capitalRun } from '../../stage4/balance/capitalRun.js';
import { runLate } from '../../stage47/pressure/lateRun.js';
import { runGrand, grandRun } from '../../v50/grand/grandRun.js';
import { runGreatWork } from '../a/greatWorkRun.js';
import { cityAdvice } from '../../../src/sim/advice.js';
import { adviceRow } from './respond.js';
import { DAYS_PER_MONTH, MONTHS_PER_YEAR } from '../../../src/sim/time.js';

const YEAR_DAYS = DAYS_PER_MONTH * MONTHS_PER_YEAR;
export const topThree = (w) => cityAdvice(w).slice(0, 3).map((a) => adviceRow(w, a));

// A month-end hook that records the top three at the end of the listed years.
function recorder(years, into) {
  return (w) => { if (w.day % YEAR_DAYS === 0 && years.includes(w.day / YEAR_DAYS)) into[w.day / YEAR_DAYS] = topThree(w); };
}

let cache = null;
export function adviceRecords() {
  if (cache) return cache;
  const out = { village: {}, capital: {}, late: {}, careless: {}, grand: {}, great: {} };
  for (const years of [3, 6, 10]) out.village[years] = topThree(villageRun46(years === 10 ? { farms: 2, towers: 2 } : { farms: 2, towers: 2, years }).w);
  out.capital[6] = topThree(capitalRun().w);
  runLate({ onMonth: recorder([8, 10, 12, 15], out.late) });
  runLate({ defend: false, send: false, fetchClay: false, answer: false, onMonth: recorder([8, 12, 15], out.careless) });
  runGrand({ onMonth: recorder([7, 8, 9, 10], out.grand) });
  runGreatWork({ base: grandRun(), onMonth: recorder([12, 14, 16, 18, 20], out.great) });
  return (cache = out);
}
