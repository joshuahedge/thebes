// Stage 4.7, Task 8 (rulings 469 and 466): the 10-year village (tests/stage46/balance/villageRun.js) with the late game on it. Its driver now sends the
// yearly tribute (asked from year 8) as a player would, and, with `fetch`, lays a second granary at the east end that Fetches the wharf's fish from the
// first: one fetch order with its store's wages and upkeep.
//
// Measured on stage-4-7 (Task 8), last 12 months of the 10 years, wages, upkeep and soldiers' pay over taxes (the Stage 4.6 village: 2 farms, 2 towers,
// lodge, wharf, range, court):
//   the village, tribute sent when it can                           68.2% (4,452 of 6,528; years 2-7 69.2%, years 8-10 68.4%): unchanged by the tribute
//   the village with one fetch order (a second granary, 6 workers)  73.7% (4,812 of 6,528; 74.7% in years 2-7): +5.5 points, the store's 36 gold a month
//                                                                   against 544 a month of taxes; 22 trips, 100 fish carried, no home hungry, no raid lost
// The tribute: asked in years 8, 9, 10 and 11 (80, 165, 165 and 155 grain, 10-20 game and 25 fish) and never met: the village's grain and game are eaten as
// they are made and what is left rests on the bazaar's shelf (94 grain, 90 game), never in a store, so a Send finds only the fish. Years 8, 9 and 10 are
// missed (-15 favour each; year 11's is asked at the run's last month end), favour ends at 57, and nothing else in the village moves.
import { describe, it, expect } from '../../harness.js';
import { villageRun46 } from '../../stage46/balance/villageRun.js';
import { housesOf } from '../../../src/sim/world.js';
import { QUOTA } from '../../../src/data/s47.js';

const sum = (a, k) => a.reduce((n, m) => n + m[k], 0);
const VILLAGE = { farms: 2, towers: 2 };
const share = (months) => sum(months, 'spent') / sum(months, 'taxes');

describe('s47 balance village', () => {
  it('is asked the tribute from year 8 and sends what its stores hold; its spending stays 60-70% of its taxes (Stage 4.6\'s band)', () => {
    const { w, months, log, people } = villageRun46(VILLAGE);
    const asked = log.asked.filter((a) => !a.missed);
    expect(asked.map((a) => a.year)).toEqual([QUOTA.fromYear, QUOTA.fromYear + 1, QUOTA.fromYear + 2, QUOTA.fromYear + 3]);   // the last at the run's final month end
    for (const a of asked) expect([a.year, a.goods.includes('grain'), a.gift > 0]).toEqual([a.year, true, true]);
    expect(log.asked.filter((a) => a.missed).map((a) => a.year)).toEqual([QUOTA.fromYear, QUOTA.fromYear + 1, QUOTA.fromYear + 2]);
    expect(w.tally.quotasMissed).toBe(3);
    const year = months.slice(-12);
    expect(share(year)).toBeGreaterThanOrEqual(0.6);
    expect(share(year)).toBeLessThanOrEqual(0.7);
    expect(share(months.slice(84))).toBeLessThanOrEqual(0.7);                       // years 8-10, the years the tribute is on
    expect(w.court.favour).toBeGreaterThanOrEqual(30);                               // three misses cost 45 favour; the village is not undone
    expect(sum(months.slice(24), 'unfed')).toBe(0);
    expect(people).toBeGreaterThanOrEqual(220);
    expect(w.tally.raidsLost).toBe(0);
    expect(housesOf(w).filter((h) => h.tier === 4).length).toBeGreaterThanOrEqual(15);
  });

  it('with one fetch order (a second granary Fetching fish) spends 70-75% of its taxes: the store costs 5.5 points, the carts run, nobody goes hungry', () => {
    const { w, months, people } = villageRun46({ ...VILLAGE, fetch: true });
    const east = Object.values(w.buildings).find((b) => b.type === 'granary' && b.x === 27);
    expect(east.orders).toEqual({ fish: { fetch: 100 } });
    expect(w.tally.cartTrips).toBeGreaterThanOrEqual(10);
    expect(east.store.fish).toBeGreaterThan(0);
    const year = months.slice(-12);
    const withOrder = share(year);
    const without = share(villageRun46(VILLAGE).months.slice(-12));
    expect(withOrder).toBeGreaterThan(0.7);
    expect(withOrder).toBeLessThanOrEqual(0.75);
    expect(withOrder - without).toBeLessThan(0.07);                                  // a store's wages and upkeep, not a runaway
    expect(sum(months.slice(24), 'unfed')).toBe(0);
    expect(people).toBeGreaterThanOrEqual(220);
    expect(w.tally.raidsLost).toBe(0);
  });
});
