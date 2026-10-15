// Version 5.0 Task 7 (rulings 580-599): the grand district balance run (./grandRun.js): the capital run on a 64-tile map, played from year 6 by the
// advice and the grand homes' next steps alone, on Normal.
//
// Measured on version-5-0 (Task 7; no data changed: desirability, tiers and every other number are 4.7's), month index from the city's founding:
//   first Fine manor month 74 (year 7), first Villa month 86 (year 8), first Estate month 97 (year 9); at year 10: 1 Estate, 1 Fine manor, 4 Manors
//   the run builds sphinxes, statues and a garden on the manor block (the street from 22-28 to 50-77), a flax farm and two weavers (one in the open with
//   its own store fetching flax), a gem mine and two jewellers, a hunting lodge, a brewery, towers to each raid, physicians and police posts by the
//   district, and sets Fetch orders for linen, beer, game and jewellery near the district's bazaar. About 3 s on top of the 64-tile capital run (5 s).
import { describe, it, expect } from '../../harness.js';
import { grandRun, GRAND_YEARS } from './grandRun.js';
import { MONTHS_PER_YEAR } from '../../../src/sim/time.js';

const yearOf = (month) => Math.ceil(month / MONTHS_PER_YEAR);
const builtOf = (r, type) => r.built.filter((b) => b.type === type).length;

describe('v50 grand balance', () => {
  it('reaches a Villa by year 8 and an Estate by year 10 on Normal, doing only what the advice and the next steps say', () => {
    const r = grandRun();
    expect(r.w.difficulty).toBe('normal');
    expect(r.policies).toEqual({ clay: true, beer: true });
    expect(r.w.day).toBe(GRAND_YEARS * MONTHS_PER_YEAR * 30);
    expect(yearOf(r.first[7])).toBeLessThanOrEqual(7);
    expect(yearOf(r.first[8])).toBeLessThanOrEqual(8);
    expect(yearOf(r.first[9])).toBeLessThanOrEqual(10);
    const last = r.months[r.months.length - 1].tiers;
    expect(Object.keys(last).some((t) => Number(t) >= 8)).toBe(true);                // a grand home still stands at the end
    expect(r.lowestGold).toBeGreaterThan(0);
    expect(r.w.tally.raidsLost).toBe(0);
    // What took it there: the street's decorations, the linen and jewellery chains and a third food, each named by the advice.
    expect(builtOf(r, 'statue') + builtOf(r, 'sphinx') + builtOf(r, 'garden')).toBeGreaterThanOrEqual(6);
    for (const type of ['weaver', 'jeweller', 'gem_mine', 'hunting_lodge']) expect([type, builtOf(r, type) >= 1]).toEqual([type, true]);
    expect(r.elapsed).toBeLessThan(20000);
  });
});
