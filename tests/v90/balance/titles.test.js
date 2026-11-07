// Version 9.0 wave 2, the balance check (design section 9, T6; rulings 1621-1624): the titles the balance runs earn with the bars set from their measures.
// The probe's measures at each Steady run's end (raids beaten / monument units / trade over bills / fed share of month ends from Town / Low share):
//   capital (year 6)      3 / 4,067 / 0.009 / 0.985 of 67 / 0       -> the Bountiful (the Builder's 0.88 of its bar)
//   late (year 15)        9 / 12,676 / 0.019 / 0.994 of 175 / 0     -> the Builder
//   grand (year 10)       6 / 7,353 / 0.005 / 0.991 of 115 / 0      -> the Builder
//   great work (year 20)  13 / 13,542 / 0.048 / 0.689 of 235 / 0    -> the Builder (2.94 against the Unconquered's 2.60)
//   late dangers          9 / 11,915 / 0.023 / 0.937 of 175 / 0     -> the Builder (T6 asks the Unconquered: NOT MET, ruling 1624)
//   dangers seed 5        13 / 10,374 / 0.018 / 0.643 of 235 / 0    -> the Unconquered (2.60 against the Builder's 2.26)
//   dangers seed 10       11 / 9,111 / 0.002 / 0.647 of 235 / 0     -> the Unconquered (2.20 against 1.98)
//   grand dangers         6 / 7,075 / 0.010 / 0.957 of 115 / 0      -> the Builder
//   spending capital      3 / 4,414 / 0.009 / 0.985 of 67 / 0       -> the Bountiful
//   spending late         9 / 13,884 / 0.018 / 0.994 of 175 / 0     -> the Builder
// No bars give both the great-work run the Builder and the late dangers run the Unconquered: the great-work run lays 1,042 units a raid beaten and the
// late dangers run 1,324, so any bars that rank the first's units above its raids (Builder bar over Unconquered bar below 1,042) rank the second's
// the same way. The scripted players trade little and never set Low, so a fixture earns the Merchant and the Generous.
import { describe, it, expect } from '../../harness.js';
import { capitalRun } from '../../stage4/balance/capitalRun.js';
import { greatWorkRun } from '../../v60/a/greatWorkRun.js';
import { lateDangerRun, greatDangerRun } from '../../v60/balance/dangerRuns.js';
import { TITLES } from '../../../src/data/dynasty.js';
import { titleOf } from '../../../src/sim/dynasty.js';
import { createWorld } from '../../../src/sim/world.js';

// A City on Normal with the tallies given (every other count 0): the seeded fixtures for the titles no scripted run earns.
function city(tally) {
  const w = createWorld({ seed: 5 });
  w.milestone = 'city';
  Object.assign(w.tally, tally);
  return w;
}

describe('v90 balance T6 the titles spread', () => {
  it('has the bars set from the runs (rulings 1621-1623)', () => {
    expect(TITLES.map((t) => [t.id, t.bar])).toEqual([['unconquered', 5], ['builder', 4600], ['merchant', 0.40], ['bountiful', 0.90], ['generous', 0.50]]);
  });
  it('gives the great-work run the Builder, the dangers runs the Unconquered and the capital run the Bountiful: three titles', () => {
    const runs = {
      great: greatWorkRun().w,
      seed5: greatDangerRun(5, { habits: true }).r.w,
      seed10: greatDangerRun(10, { habits: false }).r.w,
      capital: capitalRun().w,
      lateDangers: lateDangerRun().r.w,
    };
    const ids = Object.fromEntries(Object.entries(runs).map(([k, w]) => [k, titleOf(w).id]));
    expect(ids).toEqual({ great: 'builder', seed5: 'unconquered', seed10: 'unconquered', capital: 'bountiful', lateDangers: 'builder' });   // T6 asks the Unconquered of the late dangers run (ruling 1624)
    expect(new Set(Object.values(ids)).size).toBe(3);
    expect(titleOf(runs.great).runnerUp).toBe('unconquered');
  });
  it('lets a seeded fixture earn each title no run earns: the Merchant and the Generous', () => {
    expect(titleOf(city({ tradeGold: 450, billsPaid: 1000 })).id).toBe('merchant');
    expect(titleOf(city({ townMonths: 30, lowMonths: 18, fedMonths: 20 })).id).toBe('generous');
  });
});
