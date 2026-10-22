// Version 5.0 Task 7 (rulings 580-599): the grand district balance run (./grandRun.js): the capital run on a 64-tile map, played from year 6 by the
// advice and the grand homes' next steps alone, on Normal.
//
// Measured on version-5-0 (Task 7; no data changed: desirability, tiers and every other number are 4.7's), month index from the city's founding:
//   first Fine manor month 74 (year 7), first Villa month 86 (year 8), first Estate month 97 (year 9); an Estate stands months 97-115, and at year 10 there
//   are 2 Villas, 1 Fine manor and 3 Manors (the run is deterministic; the city's low tiers sway month to month as the capital run's do)
//   the run builds sphinxes, statues and a garden on the manor block (the street from 22-28 to 50-77), a flax farm and two weavers, a gem mine and a
//   jeweller, a hunting lodge, a brewery, towers to each raid, physicians and police posts by the district, and sets Fetch orders for linen, beer, game and
//   jewellery near the district's bazaar. About 3 s on top of the 64-tile capital run (5 s).
// Version 6.0 (Track C, ruling 705): the same run with Large plots. The capital run lays its four Manors as Large plots (small plots stop at Townhouse and no
// longer merge, and it builds a third tower, for the second raid met three weeks later than before), and the district's grand homes are those four lots climbing in
// place: a Fine manor in month 74 (year 7: as before), a Villa in month 89 (year 8) and an Estate in month 98 (year 9); at year 10 a Villa and two Fine manors stand, each a Large
// plot. A few months later than 5.0's Villa (86) and Estate (97): the lots fill by arrivals, not by merging four full plots. The run is as deterministic as it was.
// What the driver does that no advice or next step says (grandRun.js header): the clay fetch and the beer ignore order on the first day, and the road routed to each ghost
// that needs one (a step undone when it would stand idle). Ruling 586's satellite workshop (a weaver or the jeweller in the open with a store of its own that Fetches its
// input, when there is no room by the store holding it) is now said by the advice (src/sim/advice.js openWorkshop; tests/v60/c/estate.test.js); the driver keeps a
// fallback for a workshop laid before any store holds its input, and without it the run reaches a Villa but no Estate in ten years (5.0's measure).
import { describe, it, expect } from '../../harness.js';
import { grandRun, GRAND_YEARS } from './grandRun.js';
import { MONTHS_PER_YEAR } from '../../../src/sim/time.js';
import { housesOf } from '../../../src/sim/world.js';
import { isLargePlot } from '../../../src/sim/largePlots.js';

const yearOf = (month) => Math.ceil(month / MONTHS_PER_YEAR);
const builtOf = (r, type) => r.built.filter((b) => b.type === type).length;

describe('v50 grand balance', () => {
  it('reaches a Villa by year 8 and an Estate by year 9 on Normal, on Large plots, doing what the advice and the next steps say (and the hand-play the header lists)', () => {
    const r = grandRun();
    expect(r.w.difficulty).toBe('normal');
    expect(r.policies).toEqual({ clay: true, beer: true });
    expect(r.w.day).toBe(GRAND_YEARS * MONTHS_PER_YEAR * 30);
    expect(yearOf(r.first[7])).toBeLessThanOrEqual(7);
    expect(yearOf(r.first[8])).toBeLessThanOrEqual(8);
    expect(yearOf(r.first[9])).toBeLessThanOrEqual(9);
    const last = r.months[r.months.length - 1].tiers;
    expect(Object.keys(last).some((t) => Number(t) >= 8)).toBe(true);                // a grand home still stands at the end (a Villa and two Fine manors, Version 6.0)
    const grand = housesOf(r.w).filter((h) => h.tier >= 6);
    expect([grand.length > 0, grand.every((h) => isLargePlot(h) && h.w === 2)]).toEqual([true, true]);   // Version 6.0: every grand home is a Large plot that climbed in place
    expect(r.lowestGold).toBeGreaterThan(0);
    expect(r.w.tally.raidsLost).toBe(0);
    // What took it there: the street's decorations, the linen and jewellery chains and a third food, each named by the advice.
    expect(builtOf(r, 'statue') + builtOf(r, 'sphinx') + builtOf(r, 'garden')).toBeGreaterThanOrEqual(6);
    for (const type of ['weaver', 'jeweller', 'gem_mine', 'hunting_lodge']) expect([type, builtOf(r, type) >= 1]).toEqual([type, true]);
    expect(r.elapsed).toBeLessThan(20000);
  });
});
