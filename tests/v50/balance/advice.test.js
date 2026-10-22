// Version 5.0 Task 8 (rulings 600-609): what Advice puts first at the end of each balance run, judged sensible and pinned. Read on the same runs the balance tests keep
// (the 10-year village at years 3, 6 and 10, the capital run, the late run to year 15, the grand district run), which this file never changes.
//
// Recorded on version-5-0 (cityAdvice(world)[0] and the three after it; weight in points: one home held back one tier from a Shack is 1). The capital, late and grand
// lines below are 5.0's; Version 6.0 (Track C, ruling 705) re-recorded them in the tests: a Townhouse stops there, so its entertainment and its street left the list.
//   village  year 3, 6, 10  home_need, 17 homes held back by pottery (85): no store for pottery near the bazaar, "Build a storehouse within 16 road tiles of them"
//                           (the village makes no pottery; the store comes first and the price line sums the makers behind it); then jobless (10.75; year 10: a raid
//                           needing 4 towers, 20), a raid short of towers (year 6: 10, year 10: 20), crime (10 -> 8)
//   capital  year 6        home_need, 18 homes held back by entertainment (108): "Build a booth near them" (50 gold); then 16 homes by desirability (100: a sphinx, 4 -> 14,
//                           needs 20), a raid needing 6 towers with 2 working (40), 6 homes by water (12)
//   late     year 15       the same two (108, 100), then 14 homes sick (42) and 17 at crime risk (34); 8 towers, no raid item
//   grand    year 10       home_need, 16 homes by entertainment (96), then crime in 25 homes (50), 8 homes held back by room for a manor (48), a raid short 3 towers (30)
//   the capital run's first raid warning (month 22, 18 raiders, 2 of 6 towers): the raid 120 (4 towers short, tripled while warned; ruling 600), booth 108, sphinx 100;
//                           the second warning (year 12, 24 raiders): the raid first at 180.
import { describe, it, expect } from '../../harness.js';
import { villageRun46 } from '../../stage46/balance/villageRun.js';
import { capitalRun } from '../../stage4/balance/capitalRun.js';
import { lateRun } from '../../stage47/pressure/lateRun.js';
import { grandRun } from '../grand/grandRun.js';
import { cityAdvice } from '../../../src/sim/advice.js';
import { adviceWords } from '../../../src/ui/adviceText.js';
import { isUnlocked } from '../../../src/sim/progression.js';
import { largePlotUnlocked } from '../../../src/sim/largePlots.js';
import { advanceDays } from '../../../src/sim/clock.js';
import { serialize, deserialize } from '../../../src/save/serialize.js';
import { ADVICE } from '../../../src/data/advice.js';

const VILLAGE = { farms: 2, towers: 2 };
const top = (w, n = 1) => cityAdvice(w).slice(0, n);
// An advice item is sensible when its words say what it is, it names a fix the sim accepts (the building unlocked, a price it can read) and it is not nothing.
function sensible(w, a) {
  const t = adviceWords(a, w);
  expect(t.what.length).toBeGreaterThan(0);
  expect(a.weight).toBeGreaterThan(0);
  if (a.fix && a.fix.item) { expect(a.fix.item === 'large_plot' ? largePlotUnlocked(w) : isUnlocked(w, a.fix.item)).toBe(true); expect(Number.isFinite(a.cost)).toBe(true); }
  return t;
}

describe('v50 balance advice: the top item at the end of each run', () => {
  it('the village names the 17 homes held back by pottery, at years 3, 6 and 10, with the store first', () => {
    for (const years of [3, 6, 10]) {
      const { w } = villageRun46(years === 10 ? VILLAGE : { ...VILLAGE, years });
      const [a] = top(w);
      const t = sensible(w, a);
      expect([years, a.kind, a.data.need, a.count, a.fix.item, a.weight]).toEqual([years, 'home_need', 'pottery', 17, 'storehouse', 85]);
      expect(t.what).toBe('17 homes are held back by pottery');
      expect(t.fix).toContain('storehouse');
    }
  });

  // Version 6.0 (Track C, ruling 705): small plots stop at Townhouse, so the 18 homes held back by entertainment and the 16 by desirability (a Townhouse's next tier) are
  // gone; the capital run's four Manors are Large plots, and the list opens with the raid (3 towers short of 5: the run has three), then the four Manors' street (a sphinx).
  it('the capital run names the 3 towers a raid will need first, then the four Manors\' street (a sphinx), sickness and water', () => {
    const { w } = capitalRun();
    const items = top(w, 4);
    const [a] = items;
    const t = sensible(w, a);
    expect([a.kind, a.count, a.fix.item, a.weight]).toEqual(['raid_towers', 3, 'tower', 30]);
    expect(t.what).toContain('needs 6 towers; 3 are working');
    expect(items.map((x) => x.kind)).toEqual(['raid_towers', 'home_need', 'illness', 'home_need']);
    expect([items[1].data.need, items[1].fix.item, items[1].count]).toEqual(['desirability', 'sphinx', 4]);   // the four Manors' street: a Fine manor wants 35
    expect([items[3].data.need, items[3].fix.item]).toEqual(['water', 'well']);
  });

  // Version 6.0 (Track C): the same 18 raiders at the first warning (3 of 6 towers now: the run builds a third), first again; the second warning is 23 raiders, 5 towers short.
  it('a raid that is warned and short of towers is first at the first warning (18 raiders, 3 of 6 towers) and at the second (23 raiders)', () => {
    const w = deserialize(serialize(capitalRun().w));
    const seen = [];
    for (let m = 0; m < 80 && seen.length < 2; m++) {
      const events = [];
      advanceDays(w, 30, events);
      if (events.some((e) => e.type === 'raid_warning')) { const items = top(w, 5); seen.push({ kinds: items.map((x) => x.kind), raid: items.find((x) => x.kind === 'raid_towers'), size: w.raid.warning && w.raid.warning.size }); }
    }
    expect(seen.length).toBe(2);
    expect(seen[0].kinds[0]).toBe('raid_towers');                                      // ruling 600: ahead of the Manors' street (28) and everything else
    expect([seen[0].size, seen[0].raid.data.need, seen[0].raid.data.have, seen[0].raid.count, seen[0].raid.weight]).toEqual([18, 6, 3, 3, 3 * ADVICE.tower * 3]);
    expect([seen[1].kinds[0], seen[1].size, seen[1].raid.count, seen[1].raid.weight]).toEqual(['raid_towers', 23, 5, 5 * ADVICE.tower * 3]);
    expect(ADVICE.towerWarned).toBe(3);
  });

  it('the late run, at year 15, names sickness in 13 homes, then the four Manors\' street, water and crime; its towers are enough, so no raid item', () => {
    const { w } = lateRun();
    const items = top(w, 4);
    for (const a of items) sensible(w, a);
    expect(items.map((x) => [x.kind, x.kind === 'home_need' ? x.data.need : null, x.weight])).toEqual([['illness', null, 39], ['home_need', 'desirability', 28], ['home_need', 'water', 12], ['crime', null, 10]]);
    expect(cityAdvice(w).some((x) => x.kind === 'raid_towers')).toBe(false);
  });

  it('the grand district run, at year 10, names the 91 jobs no worker fills first, then the towers a raid lacks, sickness and water', () => {
    const { w } = grandRun();
    const items = top(w, 4);
    for (const a of items) sensible(w, a);
    expect(items.map((x) => [x.kind, x.kind === 'home_need' ? x.data.need : null, x.count, x.weight])).toEqual([['workers_short', null, 91, 45.5], ['raid_towers', null, 3, 30], ['illness', null, 8, 24], ['home_need', 'water', 6, 12]]);
  });
});
