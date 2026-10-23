// (Wave 4 fix batch 1, rulings 787, 788, 795: re-measured at a win on day 7,030 with 2,171 gold the lowest; the pin below is unchanged. The dangers-on runs of the same script do not win: the
// balance note's "Wave 4 fix batch 1" says how they fall.)
// Version 6.0, the balance pass (wave 4; ruling 785): the great-work run's margin, with the dangers off (the run the older assertions measure: tests/v60/a/balance.test.js holds the band,
// years 18-20, and that the treasury never goes below 0). Ruling 791 left the win on day 7,030 of the run's 7,200 with 2,313 gold the lowest it ever held. This pins that margin as it was
// measured, so a later change that eats it fails here first, and says what the wave-4 measurements found (docs/superpowers/notes/2026-10-22-v60-a-balance.md, "Wave 4", "The great work with the
// dangers on"): the margin is thin because the scripted player lives on its treasury, not because of any number a data row can move, and every change tried (a lighter temple, smaller
// offerings, cheaper ranks, a gentler court) moved the win by a few hundred days either way and, on the one seed this run is tuned on, as often to a debt as to a win.
import { describe, it, expect } from '../../harness.js';
import { greatWorkRun, GREAT_YEARS } from '../a/greatWorkRun.js';
import { MONTHS_PER_YEAR, DAYS_PER_MONTH } from '../../../src/sim/time.js';

const YEAR_DAYS = MONTHS_PER_YEAR * DAYS_PER_MONTH;

describe('v60 balance great work margin', () => {
  it('wins with at least 100 days of the run to spare and never holds less than 2,000 gold from the Seat on', () => {
    const r = greatWorkRun();
    expect(r.won !== null).toBe(true);
    expect(r.won.day).toBeLessThanOrEqual(GREAT_YEARS * YEAR_DAYS - 100);
    expect(r.lowestGold).toBeGreaterThanOrEqual(2000);
  });
});
