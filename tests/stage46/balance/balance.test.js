// Stage 4.6 balance pass (rulings 430-437): the 10-year village with a hunting lodge, a fishing wharf, an archery range and the court on
// (./villageRun.js), a Low flood against a village with a granary, the court's requests against what the village makes, and the gifts
// at favour 70+ against its taxes and its own profit.
//
// Measured on stage-4-6 (ab2d0cf, then this pass), last 12 months of the 10 years, spending (wages, upkeep, soldiers' pay) over taxes:
//   longrun village (3 farms, 3 towers), no Stage 4.6 buildings            68.2%
//   everything on top (3 farms, 3 towers + lodge, wharf, range, court)     84.7% before this pass, 81.1% after (ruling 430)
//   the Stage 4.6 village (2 farms, 2 towers + lodge, wharf, range, court) 71.9% before (73.3% in years 2-7), 68.2% after (69.3%)
// Gifts over the 10 years (13 of them): 10,160 gold before ruling 433 (16% of taxes; more than the everything-on-top village's own
// 8,611 profit); 5,090 after (8% of taxes, 26% of the Stage 4.6 village's 19,287 profit), each 290-520 gold against 544 a month.
// Low floods: year 5 Low on the longrun village leaves its granary at 333 at the lowest and no home hungry; years 5 and 6 Low on the
// Stage 4.6 village empty its granary for 8 months and still no home goes hungry; every year Low (not a real draw) leaves 2-4 of its
// 17 homes hungry from year 5. Requests (11): gold 770-860 against 544 a month of taxes, fish 40-60 against the wharf's 20 a month,
// every one met within a month of its letter. The lodge brings 11 game in 8 years: its herds are hunted out (ruling 437).
import { describe, it, expect } from '../../harness.js';
import { villageRun46 } from './villageRun.js';
import { allBuildings, housesOf } from '../../../src/sim/world.js';
import { REQUESTS, FAVOUR, GIFTS } from '../../../src/data/court.js';

const VILLAGE = { farms: 2, towers: 2 };                     // ruling 430: the Stage 4.6 village
const sum = (a, k) => a.reduce((n, m) => n + m[k], 0);
const count = (w, type) => allBuildings(w).filter((b) => b.type === type).length;

describe('s46 balance village', () => {
  it('spends 60-70% of its taxes with a hunting lodge, a fishing wharf, an archery range and the court on (rulings 430-434)', () => {
    const { w, months, lowestGold, people } = villageRun46(VILLAGE);
    expect(['hunting_lodge', 'fishing_wharf', 'archery_range', 'farm_grain', 'tower', 'granary'].map((t) => count(w, t))).toEqual([1, 1, 1, 2, 2, 1]);
    expect(w.court.awake).toBe(true);
    const year = months.slice(-12);
    const share = sum(year, 'spent') / sum(year, 'taxes');
    expect(share).toBeGreaterThanOrEqual(0.6);
    expect(share).toBeLessThanOrEqual(0.7);
    expect(sum(year, 'soldiers')).toBeGreaterThan(0);                                     // the archers are paid
    expect(sum(months.slice(24), 'unfed')).toBe(0);                                        // fed from year 3 on (the first homes fill hungry)
    expect(people).toBeGreaterThanOrEqual(220);
    expect(housesOf(w).filter((h) => h.tier === 4).length).toBeGreaterThanOrEqual(15);
    expect(w.tally.raidsLost).toBe(0);                                                    // two towers and the archers beat every raid
    expect(lowestGold).toBeGreaterThan(0);
    expect(w.gold).toBeLessThan(60000);
  });

  it('carries a Low flood on its granary: no home goes hungry in a Low year, nor in two Low years running with the wharf (ruling 435)', () => {
    // The longrun village (three floodplain farms, one granary, no Stage 4.6 food) with year 5's flood Low: its farms grow 60% for a year.
    const plain = villageRun46({ extras: false, lowYears: [5] });
    expect(plain.months.slice(24).map((m) => m.unfed).filter((n) => n > 0)).toEqual([]);
    expect(Math.min(...plain.months.slice(24).map((m) => m.food))).toBeGreaterThan(0);     // the granary never runs dry (measured: 333 at its lowest)
    expect(plain.months.slice(48, 72).some((m) => m.applied === 'low')).toBe(true);
    // The Stage 4.6 village (two farms and the wharf) with years 5 and 6 Low (one year in 44): the granary may empty, the homes still eat.
    const twice = villageRun46({ ...VILLAGE, lowYears: [5, 6] });
    expect(twice.months.slice(24).map((m) => m.unfed).filter((n) => n > 0)).toEqual([]);
  });

  it('asks for amounts the village can meet: every request is met before its deadline, at most the top of its range of output or taxes (ruling 436)', () => {
    const { log } = villageRun46(VILLAGE);
    expect(log.requests.length).toBeGreaterThanOrEqual(8);
    for (const r of log.requests) {
      expect([r.id, r.result, r.metDay !== null && r.metDay <= r.due]).toEqual([r.id, 'met', true]);
      if (r.guided || r.kind === 'soldiers') continue;
      const A = REQUESTS.amounts[r.kind];
      const base = r.kind === 'gold' ? r.taxes : r.perMonth;
      expect([r.id, r.amount <= Math.max(A.min, Math.ceil((base * A.months[1]) / A.step) * A.step)]).toEqual([r.id, true]);
    }
  });

  it('keeps the gifts at favour 70+ a side income: each at most a month of taxes, all of them under 10% of taxes and under a third of the village\'s own profit (ruling 433)', () => {
    const { months, log } = villageRun46(VILLAGE);
    expect(Math.max(...months.map((m) => m.favour))).toBeGreaterThanOrEqual(FAVOUR.high);
    expect(log.gifts.length).toBeGreaterThanOrEqual(5);
    for (const g of log.gifts) expect(g.gold).toBeLessThanOrEqual(Math.max(g.taxes, GIFTS.gold.min) * GIFTS.gold.months[1] + GIFTS.gold.step);
    const gifts = log.gifts.reduce((n, g) => n + g.gold, 0);
    const taxes = sum(months, 'taxes');
    expect(gifts / taxes).toBeLessThan(0.1);
    expect(gifts / (taxes - sum(months, 'spent'))).toBeLessThan(1 / 3);
  });
});
