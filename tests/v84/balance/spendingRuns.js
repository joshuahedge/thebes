// Version 8.4, wave 2 (design section 7 B2, B3; ruling 1522): the capital and late runs played by the spending player (./spending.js). The capital spending run
// is the capital run's script (tests/stage4/balance/capitalRun.js) from day 0 with the player answering at each month end; the late spending run takes its
// year-6 city on to year 15 (tests/stage47/pressure/lateRun.js, its own defence, tribute and court answers as ever), the same player answering. Shared by the
// tests in this folder, each run once a page.
import { runCapital, CAPITAL_YEARS } from '../../stage4/balance/capitalRun.js';
import { runLate } from '../../stage47/pressure/lateRun.js';
import { MONTHS_PER_YEAR } from '../../../src/sim/time.js';
import { spender } from './spending.js';

let shared = null;
export function spendingRuns() {
  if (shared) return shared;
  const player = spender();
  const capital = runCapital(CAPITAL_YEARS * MONTHS_PER_YEAR, { onMonth: player.onMonth });
  const capitalMonths = player.rec.months.slice();
  const late = runLate({ base: capital, onMonth: player.onMonth });
  const lateMonths = player.rec.months.slice(capitalMonths.length);
  return (shared = { capital, late, capitalMonths, lateMonths, rec: player.rec });
}

// A year's profit before the court's due measured as the late run's own test measures it (net less the monuments' work gold), but at the Normal rate and
// without the Rush premium: what the city would bank with today's habits, so the yardstick is the late run's and the new jobs' gold is not taken off it.
export function profitAtNormal(months, year) {
  return months.filter((m) => Math.ceil(m.day / 360) === year).reduce((n, m) => n + m.taxesNormal - m.wages - m.upkeep - m.soldiers - (m.monuments - m.rush), 0);
}
