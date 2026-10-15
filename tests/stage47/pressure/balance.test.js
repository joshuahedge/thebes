// Stage 4.7, Task 7 (rulings 469-471): the capital run's late game (./lateRun.js), from the capital run's year-6 city to year 15 on Normal. The capital
// run's own assertions (tests/sim/capital.test.js, tests/stage4/balance/capital.test.js) read the shared 6-year run, which this one never changes.
//
// Measured on stage-4-7 (Task 7), the driver fetching clay to the potters' storehouse and building towers to each warning's count:
//                          end of year 8      end of year 10     end of year 15
//   gold                   82,874             106,955            166,115
//   favour                 54                 44                 44
//   people                 1,090              1,090              1,090
//   homes by tier          6 huts, 30 townhouses, 4 manors at each (the run lays no weaver or jeweller: no Villa or Estate to test the upper tiers)
//   towers                 6                  6                  8
// Raids: year 8, 18 raiders (no wealth term); year 11, 25 (6 drawn by wealth, from two sides); year 14, 25 (6 by wealth, two sides). All beaten.
// Quotas (years 8-15): 135 pottery, 40 beer and 350-400 grain each year (12.5% of a year's output), gifts 370-380 gold; all met, years 8-13
// by month 6 (+8 favour), 14 and 15 after it (+5). No home went hungry. Without the clay fetch every quota is missed; without the towers the
// two late raids are lost and burn the towers. The run takes about 3.8 s on top of the shared 6-year run.
import { describe, it, expect } from '../../harness.js';
import { lateRun, LATE_YEARS } from './lateRun.js';
import { QUOTA, RAIDS_LATE } from '../../../src/data/s47.js';

describe('s47 balance late', () => {
  it('takes the capital run to year 15 on Normal: every yearly quota met, every raid beaten, no home hungry, the treasury above 0', () => {
    const r = lateRun();
    expect(r.insane).toEqual([]);
    expect(r.fetch.ok).toBe(true);
    expect(r.w.day).toBe(LATE_YEARS * 360);
    const years = r.quotas.filter((q) => q.year <= LATE_YEARS);
    expect(years.map((q) => q.year)).toEqual([8, 9, 10, 11, 12, 13, 14, 15]);
    expect(years.map((q) => q.result)).toEqual(years.map(() => 'met'));
    expect(years.filter((q) => q.early).length).toBeGreaterThanOrEqual(4);
    expect(r.months.map((m) => m.unfed).filter((n) => n > 0)).toEqual([]);
    expect(r.lowestGold).toBeGreaterThan(0);
    const late = r.raids.filter((x) => x.year >= RAIDS_LATE.fromYear);
    expect(late.length).toBeGreaterThanOrEqual(1);
    expect(late.every((x) => x.wealth > 0 && x.wealth <= RAIDS_LATE.cap.normal)).toBe(true);
    expect(r.raids.map((x) => x.won)).toEqual(r.raids.map(() => true));
    expect(r.snapshots[LATE_YEARS].raidsLost).toBe(0);
    expect(r.elapsed).toBeLessThan(10000);
  });

  it('asks about 12.5% of a year\'s output on Normal, and keeps favour and gold in range', () => {
    const r = lateRun();
    for (const q of r.quotas) expect([q.year, q.goods.split(', ').length <= QUOTA.goods + 1]).toEqual([q.year, true]);
    expect(Object.keys(r.snapshots).sort()).toEqual(['10', '15', '8']);
    for (const y of [8, 10, 15]) {
      const s = r.snapshots[y];
      expect([y, s.favour >= 30, s.gold > 0 && s.gold < 250000, s.people >= 1000]).toEqual([y, true, true, true]);
    }
  });
});
