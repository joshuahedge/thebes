// Version 6.0, Track A's balance targets (plan "Track A", rulings 611, 640-660; the numbers and why each moved:
// docs/superpowers/notes/2026-10-22-v60-a-balance.md):
//   - the late run (tests/stage47/pressure/lateRun.js) ends year 15 with at most about two years of profit banked (its own balance test);
//   - the careless run (that late run with its defence, its stock policies and its answers to the court switched off) falls into debt;
//   - the 10-year village stays at 68-75% of its taxes spent;
//   - the great-work run (./greatWorkRun.js) on Normal reaches the Seat of the Two Lands and finishes the great temple in years 18-20.
// Measured on v60-a. Careless: 6,686 gold at year 7's end (year 8's due took 60,210 at low favour: the tribute was never sent), into debt in year 9,
// -11,437 at year 15, favour 0 from year 9; one raid lost (year 14). Great work: the Seat on day 3,690 (year 11), the great temple founded on day
// 3,720 with four guilds of its own, its five offerings on days 3,750-6,030, the reign won on day 6,542 (year 19), the treasury never below 0.
// Merged with Tracks C and B1 (rulings 790, 791): the run's stores never held flax in years 11-20 (the fourth offering
// waited for ever: 0 flax held at each year's end) and the Seat's books ran near even (the treasury -3,649 in years 16-18, crews idle
// for want of gold). The fourth offering is beer, and the due while the great temple rises is a tenth: the Seat on day 3,690, offerings on days
// 3,720-6,300, the reign won on day 7,030 (year 20), the treasury never below 2,313.
import { describe, it, expect } from '../../harness.js';
import { runLate, LATE_YEARS } from '../../stage47/pressure/lateRun.js';
import { villageRun46 } from '../../stage46/balance/villageRun.js';
import { greatWorkRun, GREAT_YEARS } from './greatWorkRun.js';
import { FAVOUR } from '../../../src/data/court.js';
import { GREAT_WORK } from '../../../src/data/reign.js';
import { MONTHS_PER_YEAR, DAYS_PER_MONTH } from '../../../src/sim/time.js';

const YEAR_DAYS = MONTHS_PER_YEAR * DAYS_PER_MONTH;
const yearOf = (day) => Math.floor(day / YEAR_DAYS) + 1;
let careless = null;
const carelessRun = () => careless || (careless = runLate({ defend: false, send: false, fetchClay: false, answer: false }));

describe('v60 a balance careless', () => {
  it('falls into debt: the late city that sends no tribute, answers no court and builds no towers loses its favour and its treasury', () => {
    const r = carelessRun();
    expect(r.insane).toEqual([]);
    expect(r.w.day).toBe(LATE_YEARS * YEAR_DAYS);
    expect(r.lowestGold).toBeLessThan(0);
    expect(r.yearly[LATE_YEARS].gold).toBeLessThan(0);
    expect(r.yearly[LATE_YEARS].favour).toBeLessThanOrEqual(FAVOUR.low);
    expect(r.dues.length).toBeGreaterThanOrEqual(8);
    expect(r.dues.every((d) => d.band === 'low')).toBe(true);                      // every due doubled: the court's favour is gone
    expect(r.quotas.filter((q) => q.result === 'met')).toEqual([]);
  });
});

describe('v60 a balance village', () => {
  it('spends 68-75% of its taxes in the last year of the 10-year village, with and without its fetch order', () => {
    const share = (r) => { const y = r.months.slice(-12); return y.reduce((n, m) => n + m.spent, 0) / y.reduce((n, m) => n + m.taxes, 0); };
    for (const fetch of [false, true]) {
      const s = share(villageRun46({ farms: 2, towers: 2, fetch }));
      expect([fetch, s >= 0.68, s <= 0.75]).toEqual([fetch, true, true]);
    }
  });
});

describe('v60 a balance great work', () => {
  it('reaches the Seat of the Two Lands and finishes the great temple in years 18-20 on Normal, never below 0, with every offering made', () => {
    const r = greatWorkRun();
    expect(r.insane).toEqual([]);
    expect(r.w.difficulty).toBe('normal');
    expect(r.w.day).toBe(GREAT_YEARS * YEAR_DAYS);
    expect(Number.isInteger(r.ranks.seat)).toBe(true);
    expect(r.temple.guilds).toBe(4);
    expect(r.offerings.map((o) => o.stage)).toEqual([0, 1, 2, 3, 4]);
    expect(r.offerings.map((o) => o.good)).toEqual(GREAT_WORK.offerings.map((o) => o.good));
    expect(r.won !== null).toBe(true);
    expect(yearOf(r.won.day)).toBeGreaterThanOrEqual(18);
    expect(yearOf(r.won.day)).toBeLessThanOrEqual(20);
    expect(r.w.reign.won).toBe(r.won.day);
    expect(r.w.reign.seal.won).toBe(true);
    expect(r.w.tally.greatWorkStages).toBe(GREAT_WORK.stages.length);
    expect(r.lowestGold).toBeGreaterThan(0);
    expect(r.elapsed).toBeLessThan(60000);
  });
});
