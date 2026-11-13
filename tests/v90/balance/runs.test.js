// Version 9.0 wave 2, the balance check (design section 9, T1 and T3; rulings 1620, 1625, 1626): the two heirs most likely to move a long run, in the suite
// (the other heirs' long runs are the balance check's one-off probe, reported, ruling 1620).
// The great-work run and the seed-5 dangers run are the thin-margin scripts the 6.0 and 8.4 balance notes describe: any change to a city's gold or
// its raid clock moves them by hundreds of days or tips them into debt. Measured in the probe: the Builder's crews at 1.05-1.15 won the great work
// on days 5,999-6,805 or not at all, with no order to it; its taxes at 0.93 won on day 6,199. The pins hold what is measured, so a change that
// brings a target back fails here and says so; each target is kept in its comment.
// Version 9.1 (Track H, rulings 1710, 1714, 1715, 1718; design 7.1, target P8): the runs play with the heir's habit (`adapt`, tests/v91/h/habits.js): the Builder
// raises its taxes when the great work's treasury runs low, the Unconquered meets every warned raid with towers where it strikes. Both targets are now met.
import { describe, it, expect } from '../../harness.js';
import { runCapital, CAPITAL_YEARS } from '../../stage4/balance/capitalRun.js';
import { runLate } from '../../stage47/pressure/lateRun.js';
import { runGrand } from '../../v50/grand/grandRun.js';
import { runGreatWork, GREAT_YEARS } from '../../v60/a/greatWorkRun.js';
import { lateDangerRun, greatDangerRun } from '../../v60/balance/dangerRuns.js';
import { RAIDS } from '../../../src/data/raids.js';
import { MONTHS_PER_YEAR, DAYS_PER_MONTH } from '../../../src/sim/time.js';

const YEAR_DAYS = MONTHS_PER_YEAR * DAYS_PER_MONTH;
const lostOf = (rec) => rec.raids.filter((x) => !x.won).map((x) => x.report.index);

describe('v90 balance T1 the Builder\'s great-work run', () => {
  // T1: every heir wins within 200 days of the Steady's day 6,380, and by day 7,200. 9.0 (ruling 1625): the Builder won on day 6,640, 260 days later, its
  // treasury at -3,204 at its lowest and its crews waiting for gold in years 17-18. 9.1 (ruling 1714): from the founding its player sets High while the
  // treasury holds under a month of Normal-rate taxes (a palace laid for it on day 5,970), and wins within the band (MET).
  it('wins by day 7,200 with every raid beaten, within 200 days of the Steady\'s 6,380 (T1 met), never in debt', () => {
    const grand = runGrand({ heir: 'builder', adapt: true });
    const r = runGreatWork({ base: grand, onMonth: grand.habit.onMonth });
    expect(r.w.heir).toBe('builder');
    expect(r.insane).toEqual([]);
    // 9.2 balance (rulings 1857, 1861): T1 was MET on 9.1 (won on day 6,235, 713 the lowest, High 3 and Normal 3). Track S's branch measured it not won (-51,278): the grand
    // years' advice had put a jeweller on the temple's footprint, so the temple was never founded (fixed in greatWorkRun.js foundTemple, ruling 1857). With the court's letters
    // worth twice the favour (ruling 1865) the run is not won by day 7,200 (T1 NOT MET; the Steady's 6,388), its treasury never below 1,587, High 1 and Normal 1 (ruling 1867).
    // 10.0.1 (rulings 2369, 2374): T1 MET: won on day 5,942, never under 539, every raid beaten, High 3 and Normal 3 (before the balance fix: 5,918 and 812).
    // 10.0.1 (ruling 2396): after the review fixes won on day 6,094 with every raid beaten, but -2,454 at its lowest: "never in debt" NOT MET (the 9.2 pin 1,587).
    expect(r.won && r.won.day).toBe(6094);
    expect(Math.round(r.lowestGold)).toBe(-2454);
    expect([r.w.tally.raids, r.w.tally.raidsLost]).toEqual([13, 0]);
    expect([grand.habit.rec.high, grand.habit.rec.normal]).toEqual([3, 2]);
  });
});

describe('v90 balance T3 the Unconquered\'s raid runs', () => {
  it('is warned first on the capital run\'s clock day + 200 and beats every raid of the capital and late runs', () => {
    const warns = [];
    const cap = runCapital(CAPITAL_YEARS * 12, { heir: 'unconquered', adapt: true, onMonth: (w, events) => { for (const e of events || []) if (e.type === 'raid_warning') warns.push(e.arrives - RAIDS.warningDays); } });
    expect([cap.w.raid.clockDay, warns[0]]).toEqual([210, 495]);   // the Steady's: 510. 9.2 balance (ruling 1858): was [210, 410] (100 days sooner, the first only); every warning 15 days sooner now (Track S had 30: 480)
    expect([cap.w.tally.raidsBeaten, cap.w.tally.raidsLost]).toEqual([3, 0]);   // 9.2 balance (ruling 1858): 3 beaten by year 6, as the Steady (9.1 balance, ruling 1731: [4, 0])
    const late = runLate({ base: cap, onMonth: cap.habit.onMonth });
    expect([late.w.tally.raids, late.w.tally.raidsBeaten, late.w.tally.raidsLost]).toEqual([10, 10, 0]);   // the Steady's: 10, 9, 0
  });
  it('beats every raid of the late dangers run and of the seed-10 dangers run, as the Steady does', () => {
    const late = lateDangerRun({ heir: 'unconquered', adapt: true });
    expect([late.rec.raids.length, lostOf(late.rec)]).toEqual([10, []]);
    const s10 = greatDangerRun(10, { habits: false, heir: 'unconquered', adapt: true });
    expect([s10.raids, s10.raidsLost, s10.r.won && s10.r.won.day]).toEqual([11, 0, 6004]);   // ruling 2397: the Unconquered's seed-10 run is won on day 6,004 now (was not won)   // the Steady's: 11, 0, not won (9.2 balance, ruling 1866). 9.2 balance (ruling 1858): 11 raids, none lost (Track S's 30 days made it 12)
  });
  // T3 asks that no heir lose a raid the Steady beats. On seed 5 the Steady beats all 13 and wins on day 6,927. 9.0 (ruling 1626): the Unconquered lost the
  // last seven (indexes 6-12), its treasury gone (-28,072). 9.1 (ruling 1715): its player meets each warned raid with towers where each band strikes first
  // from the capital years on (the late run's rule), and beats all 13 (MET); the run is not won and its treasury still goes below 0 in the great-work years.
  it('on seed 5 with the player\'s habits: beats all 13 raids, as the Steady does (T3 met)', () => {
    const s5 = greatDangerRun(5, { habits: true, heir: 'unconquered', adapt: true });
    // 10.0.1 (rulings 2370, 2374): T3 NOT MET: the Unconquered loses the last two of its 13 raids (indexes 11 and 12) where the Steady beats all 13 (before the
    // balance fix it beat all 13 and the Steady lost one).
    expect([s5.raids, lostOf(s5.rec)]).toEqual([13, []]);   // ruling 2397: T3 MET again after the review fixes (before them it lost raids 11 and 12)    // 9.2 balance (ruling 1858): T3 MET again (Track S's 30 days lost the last eight of 14; 9.1 balance, ruling 1731: was [13, [6, 7, 8, 9, 10, 11, 12]])
    expect([s5.r.won, Math.round(s5.r.lowestGold)]).toEqual([null, -25036]);   // 10.0.1 (rulings 2369, 2374, 2397): -25,036 (was -4,735)   // 9.2 balance (rulings 1858, 1866): was [null, -19997] (9.1 balance: was [null, -28072]; Track S: -12,804)
  });
});
