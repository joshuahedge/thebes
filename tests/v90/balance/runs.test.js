// Version 9.0 wave 2, the balance check (design section 9, T1 and T3; rulings 1620, 1625, 1626): the two heirs most likely to move a long run, in the suite
// (the other heirs' long runs are the balance check's one-off probe, reported, ruling 1620).
// The great-work run and the seed-5 dangers run are the thin-margin scripts the 6.0 and 8.4 balance notes describe: any change to a city's gold or
// its raid clock moves them by hundreds of days or tips them into debt. Measured in the probe: the Builder's crews at 1.05-1.15 won the great work
// on days 5,999-6,805 or not at all, with no order to it; its taxes at 0.93 won on day 6,199. The pins hold what is measured, so a change that
// brings a target back fails here and says so; each target is kept in its comment.
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
  // T1: every heir wins within 200 days of the Steady's day 6,380, and by day 7,200. The Builder wins on day 6,640: 260 days later, 60 past the band
  // (NOT MET, ruling 1625); by day 7,200 it is met. Its treasury goes to -3,204 at its lowest (the Steady's 8,866): the crews lay faster and the work
  // gold goes out faster, on 5% less in taxes.
  it('wins by day 7,200 with every raid beaten; on day 6,640, 260 after the Steady (T1\'s band: 200, NOT MET)', () => {
    const r = runGreatWork({ base: runGrand({ heir: 'builder' }) });
    expect(r.w.heir).toBe('builder');
    expect(r.insane).toEqual([]);
    expect(r.won !== null).toBe(true);
    expect(r.won.day).toBeLessThanOrEqual(GREAT_YEARS * YEAR_DAYS);
    expect(r.won.day).toBe(6640);                                  // 9.0 wave 2 (ruling 1625): measured; T1 asks 6,180-6,580
    expect(Math.round(r.lowestGold)).toBe(-3204);                  // 9.0 wave 2 (ruling 1625): measured; the Steady's 8,866
    expect([r.w.tally.raids, r.w.tally.raidsLost]).toEqual([13, 0]);
  });
});

describe('v90 balance T3 the Unconquered\'s raid runs', () => {
  it('is warned first on the capital run\'s clock day + 200 and beats every raid of the capital and late runs', () => {
    const warns = [];
    const cap = runCapital(CAPITAL_YEARS * 12, { heir: 'unconquered', onMonth: (w, events) => { for (const e of events || []) if (e.type === 'raid_warning') warns.push(e.arrives - RAIDS.warningDays); } });
    expect([cap.w.raid.clockDay, warns[0]]).toEqual([210, 410]);   // the Steady's: 510
    expect([cap.w.tally.raidsBeaten, cap.w.tally.raidsLost]).toEqual([3, 0]);
    const late = runLate({ base: cap });
    expect([late.w.tally.raids, late.w.tally.raidsBeaten, late.w.tally.raidsLost]).toEqual([10, 10, 0]);   // the Steady's: 10, 9, 0
  });
  it('beats every raid of the late dangers run and of the seed-10 dangers run, as the Steady does', () => {
    const late = lateDangerRun({ heir: 'unconquered' });
    expect([late.rec.raids.length, lostOf(late.rec)]).toEqual([10, []]);
    const s10 = greatDangerRun(10, { habits: false, heir: 'unconquered' });
    expect([s10.raids, s10.raidsLost, s10.r.won]).toEqual([11, 0, null]);   // the Steady's: 11, 0, not won (ruling 1551)
  });
  // T3 asks that no heir lose a raid the Steady beats. On seed 5 the Steady beats all 13 and wins on day 6,927; the Unconquered loses the last seven
  // (indexes 6-12) with its treasury gone (the lowest -28,072) and is not won (NOT MET, ruling 1626). The cause is the first warning 100 days sooner:
  // with its pay at 1 (no strength) it loses the same seven; with `sooner` at 15 or 0 it loses none. 30, 45, 60, 75 and 90 lose 4, 2, 1, 8 and 7.
  it('on seed 5 with the player\'s habits: loses raids 6-12, all of which the Steady beats (T3 NOT MET)', () => {
    const s5 = greatDangerRun(5, { habits: true, heir: 'unconquered' });
    expect([s5.raids, lostOf(s5.rec)]).toEqual([13, [6, 7, 8, 9, 10, 11, 12]]);   // 9.0 wave 2 (ruling 1626): measured; T3 asks none lost
    expect([s5.r.won, Math.round(s5.r.lowestGold)]).toEqual([null, -28072]);
  });
});
