// Version 8.4 Track R (for 9.0's "the Unconquered"): the raid tallies are reliable. tally.raids always equals raidsBeaten + raidsLost, plus 1 while a raid is under way; a tribute paid is counted
// apart (tributes), never as a raid, a win or a loss; and a paid-off raid leaves no captured weapons. Each is held on a played city, and on the shared balance runs.
import { describe, it, expect } from '../../harness.js';
import { RAIDS } from '../../../src/data/raids.js';
import { raidDay, payTribute } from '../../../src/sim/raids.js';
import { lateDangerRun, greatDangerRun } from '../../v60/balance/dangerRuns.js';
import { at84, raidCity } from './helpers.js';

const consistent = (w) => w.tally.raids === w.tally.raidsBeaten + w.tally.raidsLost + (w.raid.active ? 1 : 0);

describe('v84 r reliable raid counts', () => {
  it('holds tally.raids = beaten + lost (+1 under way) every day of 11 years of raids, with tributes paid on the way', () => {
    at84(() => {
      const w = raidCity({ entries: [{ x: 31, y: 16 }, { x: 0, y: 12 }], towers: 2 });
      w.seed = 5;
      w.tally.peakPeople = RAIDS.clockPeople;
      let paid = 0, bad = 0;
      for (let d = 0; d < 4000; d++) {
        w.day = d;
        raidDay(w, []);
        const wr = w.raid.warning;
        if (wr && !wr.first && wr.index % 2 === 1 && payTribute(w).ok) paid += 1;      // every second later warning is paid off
        if (!consistent(w)) bad += 1;
        if (d % 360 === 359) expect([d, consistent(w)]).toEqual([d, true]);              // at every year's end
      }
      expect(bad).toBe(0);
      expect(paid).toBeGreaterThan(0);
      expect(w.tally.tributes).toBe(paid);
      expect(w.tally.raids).toBeGreaterThan(1);                                          // raids came as well as the tributes paid
      expect(w.tally.raids - (w.raid.active ? 1 : 0)).toBe(w.tally.raidsBeaten + w.tally.raidsLost);
    });
  });
  it('counts a tribute apart: paying one changes tributes alone, never raids, beaten or lost, and leaves no weapons', () => {
    const w = raidCity();
    w.raid.index = 2;
    w.raid.warning = { index: 1, entry: { x: 31, y: 16 }, dir: 'east', size: 5, tribute: 100, target: 'storehouse', day: 910, arrives: 1000, first: false };
    const before = { ...w.tally };
    expect(payTribute(w).ok).toBe(true);
    const after = w.tally;
    expect([after.tributes - before.tributes, after.raids - before.raids, after.raidsBeaten - before.raidsBeaten, after.raidsLost - before.raidsLost]).toEqual([1, 0, 0, 0]);
    expect(w.raid.spoils).toBe(undefined);
  });
  it('holds at the end of the late run and the great-work run with the dangers on', () => {
    const late = lateDangerRun().r.w, great = greatDangerRun(5, { habits: true }).r.w;
    for (const w of [late, great]) expect([w.tally.raids > 0, consistent(w)]).toEqual([true, true]);
  });
});
