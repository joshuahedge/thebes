// Stage 4.7, Task 7 (rulings 469-471): the capital run's late game. The capital run (tests/stage4/balance/capitalRun.js) ends at year 6 with its
// own assertions untouched; this run takes that very city (a save round trip of it, so the shared run is never changed) on to year 15 on Normal,
// living as a steady player would. Its driver's policies (none of them a rule changed):
//   - at the tribute's warning (the run starts on year 7's first day), the main storehouse beside the potters is set to Fetch clay (up to 200)
//     from the works quarter's storehouse, where the clay pits by the brickworks have stranded 800 clay: without it the potters make no more
//     pottery than the homes use, and the tribute's pottery is never there (measured: every quota missed);
//   - each month end it sends the yearly tribute once the stores hold all of it (and, from month 10, whatever they hold);
//   - with defend (the default), it answers a raid warning its towers cannot meet (towersNeeded, the tribute sheet's own count) by building
//     towers while the treasury keeps RESERVE (measured without it: the year-11 and year-14 raids, 25 raiders each with 6 drawn by wealth and
//     from two sides, beat the city's two towers and burn them).
// It records, at the end of years 8, 10 and 15: gold, favour, people, homes by tier, towers, raids beaten and lost; and every raid warned (size,
// wealth term, bands, won) and quota asked (goods, gift, result, favour, early).
import { capitalRun } from '../../stage4/balance/capitalRun.js';
import { serialize, deserialize } from '../../../src/save/serialize.js';
import { advanceDays } from '../../../src/sim/clock.js';
import { place, canPlace } from '../../../src/sim/commands.js';
import { housesOf, population, allBuildings } from '../../../src/sim/world.js';
import { quotaOf, quotaStatus, sendQuota } from '../../../src/sim/pressure.js';
import { towersNeeded, workingTowers } from '../../../src/sim/raids.js';
import { costOf } from '../../../src/sim/costs.js';
import { setFetch } from '../../../src/sim/carts.js';
import { DAYS_PER_MONTH, MONTHS_PER_YEAR } from '../../../src/sim/time.js';

export const LATE_YEARS = 15;
const YEAR_DAYS = DAYS_PER_MONTH * MONTHS_PER_YEAR;
const RESERVE = 400;

// Spots for extra towers, tried in order (each must pass canPlace): along the trade road (y 19-21, east) and the main street's ends, the
// sides the raids come from (east and north).
const TOWER_SPOTS = [[42, 19], [44, 19], [42, 21], [44, 21], [46, 19], [24, 9], [22, 9], [26, 9], [20, 9], [28, 9], [41, 13], [41, 11], [6, 11], [6, 13]];

function tiers(w) {
  const out = {};
  for (const h of housesOf(w)) if (h.tier > 0) out[h.tier] = (out[h.tier] || 0) + 1;
  return out;
}

// Builds towers until the warned raid's towers needed are standing (staffing is the city's), at the first free spots, while the treasury keeps
// RESERVE. Returns how many it built.
function meetWarning(w, built) {
  const warn = w.raid.warning;
  if (!warn || warn.first) return 0;
  let n = 0;
  const standing = () => allBuildings(w).filter((b) => b.type === 'tower').length;
  for (const [x, y] of TOWER_SPOTS) {
    if (standing() >= towersNeeded(warn.size)) break;
    if (w.gold - costOf(w, 'tower') < RESERVE) break;
    if (!canPlace(w, 'tower', x, y).ok) continue;
    const r = place(w, 'tower', x, y);
    if (r.ok) { n++; built.push({ day: w.day, x, y }); }
  }
  return n;
}

export function runLate({ defend = true, send = true, fetchClay = true } = {}) {
  const started = performance.now();
  const base = capitalRun();
  const w = deserialize(serialize(base.w));
  const main = allBuildings(w).find((b) => b.type === 'storehouse' && b.x === 22 && b.y === 18);
  const fetch = fetchClay && main ? setFetch(w, main.id, 'clay', 200) : null;
  const months = [], raids = [], quotas = [], snapshots = {}, yearly = {}, built = [], insane = [];
  let lowestGold = w.gold;
  const snapRow = () => ({ gold: Math.round(w.gold), favour: w.court.favour, people: population(w), tiers: tiers(w), towers: workingTowers(w), raidsLost: w.tally.raidsLost, raidsBeaten: w.tally.raidsBeaten || 0 });
  const snap = (year) => { snapshots[year] = snapRow(); };
  const firstMonth = Math.round(w.day / DAYS_PER_MONTH) + 1;
  const lastMonth = LATE_YEARS * MONTHS_PER_YEAR;
  for (let m = firstMonth; m <= lastMonth; m++) {
    const events = [];
    advanceDays(w, DAYS_PER_MONTH, events);
    for (const e of events) {
      if (e.type === 'raid_warning') raids.push({ day: e.arrives - 90, year: Math.floor((e.arrives - 90) / YEAR_DAYS) + 1, size: e.size, wealth: e.wealth || 0, dirs: e.dirs ? e.dirs.length : 1 });
      if (e.type === 'raid_end') { const r = raids[raids.length - 1]; if (r) r.won = e.won; }
      if (e.type === 'court_quota' && e.result === 'asked') quotas.push({ year: e.quota.year, goods: e.quota.goods.map((g) => `${g.amount} ${g.good}`).join(', '), gift: e.quota.gift, result: null });
      if (e.type === 'court_quota' && e.result !== 'asked') { const q = quotas.find((x) => x.year === e.quota.year); if (q) Object.assign(q, { result: e.result, favour: e.favour, early: e.early }); }
    }
    if (!Number.isFinite(w.gold)) insane.push(`month ${m}: gold ${w.gold}`);
    lowestGold = Math.min(lowestGold, w.gold);
    const q = quotaOf(w);
    if (send && q && q.result === null) {
      const st = quotaStatus(w);
      const monthOfYear = (Math.floor(w.day / DAYS_PER_MONTH) % MONTHS_PER_YEAR) + 1;
      if (st.completes || (monthOfYear >= 10 && st.shipNow > 0)) {
        const r = sendQuota(w);
        if (r.met) { const rec = quotas.find((x) => x.year === q.year); if (rec) Object.assign(rec, { result: 'met', favour: r.favour, early: r.early }); }
      }
    }
    if (defend) meetWarning(w, built);
    const unfed = housesOf(w).filter((h) => h.tier >= 3 && h.met && h.met.food === false).length;
    months.push({ month: m, gold: w.gold, favour: w.court.favour, people: population(w), taxes: w.stats.lastMonth.taxes, unfed });
    const year = Math.floor(w.day / YEAR_DAYS) + 1;
    if (w.day % YEAR_DAYS === 0 && [9, 11].includes(year)) snap(year - 1);   // the end of years 8 and 10
    if (w.day % YEAR_DAYS === 0) yearly[year - 1] = snapRow();               // every year's end, for the record
  }
  snap(LATE_YEARS);
  yearly[LATE_YEARS] = snapRow();
  return { w, fetch, months, raids, quotas, snapshots, yearly, built, lowestGold, insane, elapsed: performance.now() - started };
}

let shared = null;
export const lateRun = () => shared || (shared = runLate());
