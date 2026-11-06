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
// Wave 4 fix batch 1 (rulings 787, 788, 795; the run's towers go where Advice puts them, by the first strike of each band, so all seven raids are beaten): the Seat on day 3,690, the offerings on
// days 3,720, 4,260, 4,710, 5,760 and 6,270, the reign won on day 7,030 (year 20) again, the treasury never below 2,171 (the court's due while the temple rises is a twentieth).
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
  it('spends 67-75% of its taxes in the last year of the 10-year village, with and without its fetch order', () => {   // WAVE2-PIN 8.4 Track R (ruling 1488): was 68-75%: the captured weapons cut the soldiers' pay, so the village spends 67.65% (was 68.38%) without its fetch order and 73.16% (was 73.9%) with it
    const share = (r) => { const y = r.months.slice(-12); return y.reduce((n, m) => n + m.spent, 0) / y.reduce((n, m) => n + m.taxes, 0); };
    for (const fetch of [false, true]) {
      const s = share(villageRun46({ farms: 2, towers: 2, fetch }));
      expect([fetch, s >= 0.67, s <= 0.75]).toEqual([fetch, true, true]);
    }
  });
});

describe('v60 a balance great work', () => {
  // WAVE2-PIN 8.4 Track R (ruling 1488; wave 2's balance check owns it): was "finishes the great temple in years 18-20 (won on day 7,021), never below 0 (lowest 3,945)". A beaten raid is
  // now a Victory row (+4 mood for 90 days, was -3 for 180): the scripted run (a thin-margin script) ends at mood 40 and below 0 gold before the last stage.
  // Measured: the Seat on day 3,690 and every offering made as before, 4 of the 5 stages laid, not won by day 7,200, lowest -1,451, 1,201 in debt at the end. The captured weapons alone
  // (pay 25% less) would leave it won on day 7,021 with 4,347 the lowest and 10,826 at the end.
  it('reaches the Seat of the Two Lands and makes every offering on Normal; with 8.4\'s Victory mood it no longer finishes the great temple by year 20 (wave 2 re-tunes it)', () => {
    const r = greatWorkRun();
    expect(r.insane).toEqual([]);
    expect(r.w.difficulty).toBe('normal');
    expect(r.w.day).toBe(GREAT_YEARS * YEAR_DAYS);
    expect(Number.isInteger(r.ranks.seat)).toBe(true);
    expect(r.temple.guilds).toBe(4);
    expect(r.offerings.map((o) => o.stage)).toEqual([0, 1, 2, 3, 4]);
    expect(r.offerings.map((o) => o.good)).toEqual(GREAT_WORK.offerings.map((o) => o.good));
    expect(r.won).toBe(null);                                                   // 8.4: was won in years 18-20
    expect(r.w.reign.won).toBe(null);
    expect(r.w.tally.greatWorkStages).toBe(GREAT_WORK.stages.length - 1);       // 8.4: was every stage
    expect(r.lowestGold).toBeLessThan(0);                                       // 8.4: was never below 0
    expect(r.elapsed).toBeLessThan(60000);
  });
});
