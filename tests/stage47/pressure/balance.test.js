// Stage 4.7, Task 7 (rulings 469-471): the capital run's late game (./lateRun.js), from the capital run's year-6 city to year 15 on Normal. The capital
// run's own assertions (tests/sim/capital.test.js, tests/stage4/balance/capital.test.js) read the shared 6-year run, which this one never changes.
//
// Measured on stage-4-7 (Task 8: the raids' gold step 40,000, ruling 474), the driver fetching clay to the potters' storehouse and building towers to each
// warning's count. Treasury at each year's end: 69,775 (7), 82,874 (8), 94,676 (9), 106,955 (10), 119,061 (11), 131,137 (12), 143,976 (13), 155,952 (14),
// 167,674 (15); people 1,090 throughout (2 raiders' worth); favour 44-54 (24 at year 9's end); towers 2 (7), 6 (8-11), 7 (12-13), 8 (14-15); every year's
// homes: 6 huts, 30 townhouses, 4 manors (the run lays no weaver, jeweller or third food, and its manors never reach a Fine manor: no Villa or Estate to test the
// upper tiers here; tests/stage47/pressure/tiers.test.js does that in the sim).
// Raids (all beaten): year 8, 18 raiders (no wealth term); year 11, 23 (wealth 4: 2 from 119,061 gold and 2 from people), two sides; year 14, 24 (wealth 5: 3 from
// 155,952 gold and 2), two sides. With the 10,000 step it was 25 (6) and 25 (6): the gold alone sat at the cap from year 10 (106,955 = 10 raiders' worth).
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
    // The wealth term grows over the late game (ruling 474) instead of sitting at the cap from year 10: below it at the first late raid, higher at the last.
    expect(late[0].wealth).toBeLessThan(RAIDS_LATE.cap.normal);
    expect(late[late.length - 1].wealth).toBeGreaterThan(late[0].wealth);
    expect(r.raids.map((x) => x.won)).toEqual(r.raids.map(() => true));
    expect(r.snapshots[LATE_YEARS].raidsLost).toBe(0);
    expect(r.elapsed).toBeLessThan(10000);
  });

  it('keeps every year on record: homes, towers and treasury, the treasury growing through years 10-15 (the gold term of the wealth draw climbs with it)', () => {
    const r = lateRun();
    expect(Object.keys(r.yearly).map(Number)).toEqual([7, 8, 9, 10, 11, 12, 13, 14, 15]);
    for (let y = 11; y <= 15; y++) expect([y, r.yearly[y].gold > r.yearly[y - 1].gold]).toEqual([y, true]);
    const term = (y) => Math.floor(r.yearly[y].gold / RAIDS_LATE.goldPer);
    expect([term(10), term(15)]).toEqual([2, 4]);
    expect(Object.values(r.yearly).every((s) => Object.keys(s.tiers).every((t) => Number(t) <= 6))).toBe(true);
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
