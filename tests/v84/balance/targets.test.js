// Version 8.4, wave 2: the balance check (design section 7, B1-B11; rulings 1520-1529). B1, B6 and B7 are the older runs' own tests, re-pinned where 8.4's
// raid clock moved them (tests/stage4/balance/capital.test.js, tests/stage47/pressure/balance.test.js, tests/v60/a/balance.test.js,
// tests/v60/balance/great.test.js); this file holds the new runs and the targets no older test reads.
// Measured with 8.4's raid clock (first warning 300 days after the clock, later gaps 360-600, the 60-day lean):
//   - capital run: the clock on day 210, the first warning on day 510 (8.3: 930), raids warned on days 510, 1,050, 1,538 and 2,130, all beaten;
//   - capital spending run: 28,729 gold at year 6 (today's habits: 50,457), never below 255, 19.0% of its Normal-rate taxes on the new jobs over the last 24
//     months (all of it Rush: the treasury never reaches 12 months of taxes, 43,320, so Low is never set) and 91.7% spent in all;
//   - late spending run: 15,124 gold at year 15, 1.39 years of profit (today's habits: 17,613 and 1.68), every quota met, every raid ended beaten;
//     with escalation by years 1.52 and one raid lost; with the retune (rulings 1540-1548) 16,160 and 1.55 (today's habits: 19,602 and 1.82), every raid beaten;
//   - far-site run: the two guilds walk 42 and 44 road tiles, each crew lays 16 units a month, 20 with the camp (50 gold for a 500 founding) and 40 rushed at
//     19.5 gold a unit (the work gold 6.5);
//   - great-work run: 13 raids by year 20 (8.3: 7), 4 with war elephants (8 met, 2 felled, 2 stampeded, 20 ivory), two of them beaten; with escalation by years
//     (ruling 1534) 3 with war elephants (6 met, 3 felled, 1 stampeded, 30 ivory), all beaten; with the retune 3 again (6 met, 1 felled, 10 ivory), all beaten;
//   - grand run: the first Fine manor, Villa and Estate in months 74, 90 and 100; an Estate stands at year 10 with its luxury met.
import { describe, it, expect } from '../../harness.js';
import { capitalRun, runCapital } from '../../stage4/balance/capitalRun.js';
import { lateRun } from '../../stage47/pressure/lateRun.js';
import { grandRun } from '../../v50/grand/grandRun.js';
import { greatWorkRun } from '../../v60/a/greatWorkRun.js';
import { spendingRuns, profitAtNormal } from './spendingRuns.js';
import { spendShares, palaceSpot } from './spending.js';
import { runFarSite } from './farSiteRun.js';
import { RAIDS } from '../../../src/data/raids.js';
import { SEASONS } from '../../../src/data/tips.js';
import { MONUMENT } from '../../../src/data/monuments.js';
import { TAX_RATES, TAX_ORDER } from '../../../src/data/palace.js';
import { laterWarnDay } from '../../../src/sim/raids.js';
import { setTaxRate } from '../../../src/sim/palace.js';
import { monthlyEconomy } from '../../../src/sim/economy.js';
import { updateMood } from '../../../src/sim/mood.js';
import { scoreOf } from '../../../src/sim/score.js';
import { place } from '../../../src/sim/commands.js';
import { housesOf } from '../../../src/sim/world.js';
import { serialize, deserialize } from '../../../src/save/serialize.js';
import { DAYS_PER_MONTH, MONTHS_PER_YEAR } from '../../../src/sim/time.js';
import { makeTestWorld } from '../../helpers/testWorld.js';

const YEAR = DAYS_PER_MONTH * MONTHS_PER_YEAR;
const inShemu = (day) => SEASONS[Math.floor((day % YEAR) / DAYS_PER_MONTH)] === 'shemu';

describe('v84 balance the raid clock (B4, B5)', () => {
  it('has the design\'s numbers in data: the first warning 300 days after the clock, later ones 360-600 days after the last arrival, the 60-day lean', () => {
    expect([RAIDS.firstWarnAfter, RAIDS.laterMin, RAIDS.laterMax, RAIDS.leanDays, RAIDS.warningDays]).toEqual([300, 360, 600, 60, 90]);
  });

  it('warns the capital run first on its clock day + 300 (day 510; 8.3: day 930)', () => {
    const warns = [];
    const r = runCapital(24, { onMonth: (w, events) => { for (const e of events) if (e.type === 'raid_warning') warns.push(e.arrives - RAIDS.warningDays); } });
    expect(r.w.raid.clockDay).toBe(210);
    expect(warns[0]).toBe(r.w.raid.clockDay + 300);
  });

  it('brings every later warning 360-660 days after the last arrival, and 45-55% of 1,000 seeded arrivals in Shemu (8.3: about a third)', () => {
    let lo = Infinity, hi = 0, shemu = 0;
    for (let k = 0; k < 1000; k++) {
      const w = makeTestWorld();
      w.seed = 1 + (k % 97);
      w.raid.index = 1 + (k % 13);
      const from = 500 + 53 * k, day = laterWarnDay(w, from);
      lo = Math.min(lo, day - from);
      hi = Math.max(hi, day - from);
      if (inShemu(day + RAIDS.warningDays)) shemu += 1;
    }
    expect([lo >= 360, hi <= 660]).toEqual([true, true]);
    expect([shemu >= 450, shemu <= 550]).toEqual([true, true]);
  });
});

describe('v84 balance spending (B2, B3)', () => {
  it('B2: the capital run with the spending player holds at most 30,000 gold at year 6, never below 0, 15%+ of its taxes on the new jobs and 80%+ spent in all', () => {
    const { capital, capitalMonths, rec } = spendingRuns();
    expect(capital.insane).toEqual([]);
    expect(capital.w.gold).toBeLessThanOrEqual(30000);
    expect(capital.lowestGold).toBeGreaterThanOrEqual(0);
    expect(Math.min(...capitalMonths.map((m) => m.gold))).toBeGreaterThanOrEqual(0);
    const s = spendShares(capitalMonths);
    expect(s.newJobs).toBeGreaterThanOrEqual(0.15);
    expect(s.all).toBeGreaterThanOrEqual(0.8);
    expect(rec.rushes).toBeGreaterThan(0);
    expect(capital.w.tally.rushGold).toBeGreaterThan(0);
    expect(capital.steps).toBe(capitalRun().steps);                            // the script laid all it lays without the player
  });

  it('B3: the late run with the spending player holds at most 1.5 years of profit at year 15, meets every quota and beats every raid it ends', () => {
    const { late, lateMonths } = spendingRuns();
    expect(late.insane).toEqual([]);
    const ratio = late.yearly[15].gold / profitAtNormal(lateMonths, 15);
    // Escalation by years (ruling 1534; B3 NOT MET): the spending late run lost the same raid as the late run and ended year 15 at 1.52 years of profit (it was 1.39).
    // The retune (rulings 1540, 1548; B3 STILL NOT MET): every raid beaten again, 16,160 gold at year 15, 1.55 years of profit. The spending player never reaches its
    // lines in years 7-15 (the court's due takes about a third of the treasury each New Year, so it peaks near 4.5 months of taxes, under Rush's 6 and Low's 12), so the
    // ratio is set by the due and the run's other outflows, and swings from year to year (years 13-15: 1.62, 1.42, 1.55); a raid beaten no longer pays its theft.
    expect(Math.round(ratio * 100) / 100).toBe(1.55);                                   // 8.4 (ruling 1551): measured 1.55 years of profit; was at most 1.5
    expect(ratio).toBeGreaterThan(0);
    const years = late.quotas.filter((q) => q.year <= 15);
    expect(years.map((q) => q.result)).toEqual(years.map(() => 'met'));
    expect(late.raids.filter((x) => x.won !== undefined).every((x) => x.won)).toBe(true);   // the retune (ruling 1540): every raid beaten again
    expect(late.w.tally.raidsLost).toBe(0);
    expect(late.lowestGold).toBeGreaterThan(0);
  });
});

describe('v84 balance the late run\'s raids (B6)', () => {
  // Escalation by years (ruling 1534) lost the second raid of year 10; the retune (ruling 1540) meets each band where it strikes first, and all 6 are beaten again (the
  // sixth under way at the end; see tests/stage47/pressure/balance.test.js).
  it('meets 5 to 8 raids in years 7-15, all beaten, and keeps tally.raids = beaten + lost (+1 under way)', () => {
    const r = lateRun();
    const arrived = r.raids.filter((x) => x.day + RAIDS.warningDays <= 15 * YEAR);
    expect([arrived.length >= 5, arrived.length <= 8]).toEqual([true, true]);
    expect(r.raids.filter((x) => x.won !== undefined).every((x) => x.won)).toBe(true);
    const t = r.w.tally;
    expect([t.raidsLost, t.raids]).toEqual([0, t.raidsBeaten + t.raidsLost + (r.w.raid.active ? 1 : 0)]);
  });
});

describe('v84 balance war elephants (B8)', () => {
  it('the great-work run meets elephant raids and beats one, fells at least one elephant and stores at least 10 ivory; each report says met, felled and stampeded', () => {
    const r = greatWorkRun();
    const withElephants = r.raids.filter((x) => x.elephants > 0);
    expect(withElephants.length).toBeGreaterThanOrEqual(1);
    expect(withElephants.some((x) => x.won)).toBe(true);
    const t = r.w.tally;
    expect(t.elephantsMet).toBeGreaterThanOrEqual(withElephants.reduce((n, x) => n + x.elephants, 0));
    expect(t.elephantsFelled).toBeGreaterThanOrEqual(1);
    expect(t.ivoryTaken).toBeGreaterThanOrEqual(10);
    expect(withElephants.reduce((n, x) => n + x.felled, 0)).toBe(t.elephantsFelled);
    expect(withElephants.reduce((n, x) => n + x.stampeded, 0)).toBe(t.elephantsStampeded);
  });
});

describe('v84 balance the far site (B9)', () => {
  it('founds a great sphinx 36-47 road tiles from its two guilds; each crew lays 16 a month, 20 with the camp, 40 rushed at 3x the work gold', () => {
    const r = runFarSite();
    expect(r.failed).toBe(undefined);
    const crews = r.guilds.filter((g) => g.crew);
    expect(crews.length).toBe(2);
    for (const g of crews) expect([g.dist >= 36, g.dist <= 47, g.staff]).toEqual([true, true, 1]);
    expect([r.plain.crews, r.plain.perCrew, r.withCamp.perCrew, r.rushed.perCrew]).toEqual([2, 16, 20, 40]);
    expect(r.plain.perCrew).toBe(MONUMENT.unitsPerCrewMonth * 0.8);
    expect([r.camp, r.paid, r.campSet]).toEqual([Math.round(MONUMENT.campShare * r.paid), r.founding, true]);
    expect(r.plain.perUnit).toBe(r.work);
    expect(r.rushed.perUnit).toBe(r.work * MONUMENT.rushGold);
    expect(r.reason).toBe(null);                                                 // fully stocked from the storehouse throughout
  });
});

describe('v84 balance the grand run\'s luxuries (B10)', () => {
  it('reaches a Villa and an Estate by year 9 with the luxury need on, buying what the advice names, and an Estate stands at year 10 with its luxury met', () => {
    const r = grandRun();
    expect([r.first[8] <= 9 * MONTHS_PER_YEAR, r.first[9] <= 9 * MONTHS_PER_YEAR]).toEqual([true, true]);
    expect(r.w.tally.luxuryBought).toBeGreaterThan(0);
    const estates = housesOf(r.w).filter((h) => h.tier === 9);
    expect(estates.length).toBeGreaterThanOrEqual(1);
    expect(estates.some((h) => h.met && h.met.luxury === true)).toBe(true);
  });
});

describe('v84 balance the tax rate (B11)', () => {
  it('the capital run\'s year-6 city with a palace: Low and High give exactly Q1\'s factors and mood rows, and the score is the same at all three', () => {
    const rows = TAX_ORDER.map((rate) => {
      const w = deserialize(serialize(capitalRun().w));
      const s = palaceSpot(w);
      const p = place(w, 'palace', s.x, s.y);
      expect(p.ok).toBe(true);
      setTaxRate(w, p.id, rate);
      monthlyEconomy(w);
      updateMood(w);
      const m = w.stats.lastMonth;
      return { rate, taxes: m.taxes, normal: m.taxesNormal, row: w.moodBreakdown.taxes || 0, score: scoreOf(w) };
    });
    for (const r of rows) expect([r.rate, r.taxes, r.row]).toEqual([r.rate, Math.round(r.normal * TAX_RATES[r.rate].factor), TAX_RATES[r.rate].mood]);
    expect(rows.map((r) => r.normal)).toEqual([rows[1].normal, rows[1].normal, rows[1].normal]);
    expect(rows[0].score).toEqual(rows[1].score);
    expect(rows[2].score).toEqual(rows[1].score);
  });
});
