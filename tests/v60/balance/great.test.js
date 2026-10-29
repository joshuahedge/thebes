// (Wave 4 fix batch 1, rulings 787, 788, 795: re-measured at a win on day 7,030 with 2,171 gold the lowest; the pin below is unchanged. The dangers-on runs of the same script do not win: the
// balance note's "Wave 4 fix batch 1" says how they fall.)
// Version 6.0, the balance pass (wave 4; ruling 785): the great-work run's margin, with the dangers off (the run the older assertions measure: tests/v60/a/balance.test.js holds the band,
// years 18-20, and that the treasury never goes below 0). Ruling 791 left the win on day 7,030 of the run's 7,200 with 2,313 gold the lowest it ever held. This pins that margin as it was
// measured, so a later change that eats it fails here first, and says what the wave-4 measurements found (docs/superpowers/notes/2026-10-22-v60-a-balance.md, "Wave 4", "The great work with the
// dangers on"): the margin is thin because the scripted player lives on its treasury, not because of any number a data row can move, and every change tried (a lighter temple, smaller
// offerings, cheaper ranks, a gentler court) moved the win by a few hundred days either way and, on the one seed this run is tuned on, as often to a debt as to a win.
import { describe, it, expect } from '../../harness.js';
import { greatWorkRun, GREAT_YEARS } from '../a/greatWorkRun.js';
import { greatDangerRun } from './dangerRuns.js';
import { MONTHS_PER_YEAR, DAYS_PER_MONTH } from '../../../src/sim/time.js';

const YEAR_DAYS = MONTHS_PER_YEAR * DAYS_PER_MONTH;

describe('v60 balance great work margin', () => {
  // Version 8.4 (Track R, ruling 1488; pin MOVED for wave 2's balance check): was "wins on day 7,021 with 100 days spare and never under 2,000 gold from the Seat on (lowest 3,945)". With a beaten
  // raid's Victory mood (+4 for 90 days, was -3 for 180) the scripted run is not won by day 7,200 and its lowest is -1,451 (see tests/v60/a/balance.test.js).
  it('with 8.4\'s Victory mood the run is not won by day 7,200 and goes below 0 (was: won with 100 days to spare, never under 2,000 gold); wave 2 re-tunes it', () => {
    const r = greatWorkRun();
    expect(r.won).toBe(null);
    expect(r.lowestGold).toBeLessThan(0);
  });
});

// Version 6.0.1 (rulings 800-807): with the dangers on as in the real game (a new city's three-year grace from day 0, the danger player answering), the great-work run wins now
// that plague, the low Nile, locusts and blight do not come while the great temple rises (GREAT_WORK_EASE.severity 0). Measured (docs/superpowers/notes/2026-10-22-v60-a-balance.md,
// "Version 6.0.1"): the tuned seed 5, with the player's habits for finding workers, wins on day 6,699 with 23,030 gold the lowest from year 10 on and every raid beaten; seed 10,
// with the script as it was (no habits), wins on day 6,097 with 4,490 the lowest and every raid beaten. No one script wins both: without the habits seed 5 never reaches the Seat,
// with them seed 10 does not either (the doubt for Josh). The pins hold each as measured, with a margin.
describe('v60 balance great work with the dangers on (6.0.1)', () => {
  // Version 8.4 (Track R, ruling 1488; pin MOVED for wave 2's balance check): was "won on day 6,669, never under 20,000 gold from year 10 (lowest 23,030), no raid lost". With the Victory mood the tuned
  // seed is not won by day 7,200 (lowest -6,911, mood 7 at the end); no raid is lost. Seed 10 (below) still wins: day 6,130 (was 6,084), lowest 6,274 (was 6,252).
  it('the tuned seed (5) with the player\'s habits: with 8.4\'s Victory mood not won by day 7,200 and in debt (was won by day 6,800, never under 20,000 gold); no raid lost; wave 2 re-tunes it', () => {
    const { r, raidsLost, raids } = greatDangerRun(5, { habits: true });
    expect(r.won).toBe(null);
    expect(Math.round(r.lowestGold)).toBeLessThan(0);
    expect([raids > 0, raidsLost]).toEqual([true, 0]);
    expect(r.insane).toEqual([]);
  });
  it('seed 10 with the script as it was: won by day 7,200, never under 4,000 gold from year 10, no raid lost', () => {
    const { r, raidsLost, raids } = greatDangerRun(10, { habits: false });
    expect(r.won !== null).toBe(true);
    expect(r.won.day).toBeLessThanOrEqual(6200);
    expect(Math.round(r.lowestGold)).toBeGreaterThanOrEqual(4000);
    expect([raids > 0, raidsLost]).toEqual([true, 0]);
  });
});
