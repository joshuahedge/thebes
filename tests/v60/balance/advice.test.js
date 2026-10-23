// Version 6.0, the balance pass (wave 4; ruling 784): what Advice puts first at points on every balance run (./adviceRuns.js reads them), judged sensible: each of the top three
// items has words, a weight, a kind Advice knows, and nothing the sim would refuse (./respond.js refusal: the same Show me search the game runs, Harvest now's quote, a building
// that is gone), and the top item's kind is recorded here as the run reaches each point (the older advice test, tests/v50/balance/advice.test.js, pins the 5.0 runs' own weights).
// Recorded on v60-balance (kind of the top item, then the rest of the top three in the note docs/superpowers/notes/2026-10-22-v60-a-balance.md, "Wave 4"):
//   village  y3 y6 y10 home_need (17 homes held back by pottery: a storehouse);   capital y6 raid_towers (3 short);   late y8 illness, y10 illness, y12 home_need (the four Manors' street:
//   a sphinx), y15 illness;   careless y8 y12 y15 raid_towers (no defence, no tribute: the towers first, then crime, illness; in debt, so the fixes cost more than the treasury holds);
//   grand y7 illness, y8 illness, y9 raid_towers, y10 illness;   great work y12 home_need (a bazaar), y14 y16 y18 y20 stranded (a far good: Fetch it; y14 was a storehouse before the Wave 4 fix, ruling 787 and the rest moved the run).
// Version 7.0 (wave 3, ruling 980): the late, careless and great-work runs play with the city events on (tests/v70/balance/events.js), so three of these points moved with the city they read: careless y15 home_need
// (12 homes held back by pottery, a storehouse, now weighs 60 against the five towers' 50: the careless city's events took their defaults), great work y14 and y16 home_need (the bazaar's 33 homes at 99, four points
// ahead of the far good's 95 at y14, and ahead of crime's 66 at y16, where the far good has gone). Every other point is as recorded above.
import { describe, it, expect } from '../../harness.js';
import { adviceRecords } from './adviceRuns.js';
import { lateDangerRun, grandDangerRun } from './dangerRuns.js';
import { ADVICE_KINDS } from '../../../src/data/advice.js';

const TOP = {
  village: { 3: 'home_need', 6: 'home_need', 10: 'home_need' },
  capital: { 6: 'raid_towers' },
  late: { 8: 'illness', 10: 'illness', 12: 'home_need', 15: 'illness' },
  careless: { 8: 'raid_towers', 12: 'raid_towers', 15: 'home_need' },
  grand: { 7: 'illness', 8: 'illness', 9: 'raid_towers', 10: 'illness' },
  great: { 12: 'home_need', 14: 'home_need', 16: 'home_need', 18: 'stranded', 20: 'stranded' },
};

function sensible(label, rows) {
  expect([label, rows.length > 0]).toEqual([label, true]);
  for (const a of rows) {
    expect([label, a.kind, ADVICE_KINDS.includes(a.kind), a.weight > 0]).toEqual([label, a.kind, true, true]);
    expect([label, a.kind, a.refused]).toEqual([label, a.kind, null]);   // never something the sim would refuse
  }
}

describe('v60 balance advice the top items on each run', () => {
  it('names a sensible item first at the recorded points of the village, capital, late, careless, grand district and great-work runs', () => {
    const rec = adviceRecords();
    const seen = {};
    for (const [run, years] of Object.entries(rec)) {
      seen[run] = {};
      for (const [y, rows] of Object.entries(years)) {
        sensible(`${run} y${y}`, rows);
        seen[run][y] = rows[0].kind;
      }
    }
    expect(seen).toEqual(TOP);
  });

  it('names a sensible item at each warning and at the years\' ends of the runs with the dangers on', () => {
    for (const [name, { rec }] of [['late', lateDangerRun()], ['grand', grandDangerRun()]]) {
      expect(rec.warnings.length).toBeGreaterThan(0);
      for (const wn of rec.warnings) sensible(`${name} ${wn.type}@${wn.monthEnd}`, wn.top);
      for (const [y, rows] of Object.entries(rec.snapshots)) sensible(`${name} y${y}`, rows);
    }
  });

  it('puts a warned danger first when it needs the player: the plague, the swarm and the low Nile ahead of the ordinary wants, in the late run', () => {
    const { rec } = lateDangerRun();
    const first = rec.warnings.filter((wn) => wn.rank === 0).map((wn) => wn.top[0].kind);
    // Exactly where each of the run's eleven warnings ranked (a fixed run): 8 first, and the three that sit second or third are behind another danger already under way (a plague, a swarm).
    expect(rec.warnings.map((wn) => [wn.type, wn.rank])).toEqual([
      ['locusts_warning', 0], ['plague_warning', 0], ['drought_warning', 0], ['locusts_warning', 1], ['plague_warning', 0], ['locusts_warning', 0],
      ['drought_warning', 0], ['plague_warning', 1], ['locusts_warning', 2], ['locusts_warning', 0], ['plague_warning', 0],
    ]);
    expect(first.length).toBe(8);
    expect(new Set(first)).toEqual(new Set(['locusts', 'plague', 'drought']));
  });
});
