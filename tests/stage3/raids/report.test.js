import { describe, it, expect } from '../../harness.js';
import { raidDay } from '../../../src/sim/raids.js';
import { RAIDS } from '../../../src/data/raids.js';
import { makeTestWorld, setRoad, addRaw, staffAll } from '../../helpers/testWorld.js';

// The raid of raid.test.js: 3 raiders from (31, 16) at a storehouse at (6, 15), with or without a staffed tower at (20, 18).
// Returns the raid_end event and raid.last.
function raided(tower) {
  const w = makeTestWorld({ gold: 1000, raiderEntries: [{ x: 31, y: 16 }] });
  setRoad(w, 0, 13, 31, 13);
  w.milestone = 'market_town';
  addRaw(w, 'storehouse', 6, 15);
  if (tower) { addRaw(w, 'tower', 20, 18); staffAll(w); }
  w.raid.index = 1;
  w.raid.warning = { index: 0, entry: { x: 31, y: 16 }, dir: 'east', size: RAIDS.firstSize, tribute: null, target: 'storehouse', day: 910, arrives: 1000, first: true };
  w.day = 1000;
  const events = [];
  raidDay(w, events);
  for (let k = 0; k < 200 && w.raid.active; k++) { w.day += 1; raidDay(w, events); }
  return { w, end: events.find((e) => e.type === 'raid_end'), last: w.raid.last };
}

// The words of the report are Track D's (DANGER_UI_TEXT.raidReport, ruling 6); these tests hold the numbers it words.
describe('s3 raids report', () => {
  it('reports what the sim did, raid for raid: a lost raid its theft, a beaten one its tower and the raiders it stopped', () => {
    const lost = raided(false);
    expect([lost.last.won, lost.last.towers, lost.last.byTowers, lost.last.bySoldiers, lost.last.dir, lost.last.size]).toEqual([false, 0, 0, 0, 'east', RAIDS.firstSize]);
    expect(lost.last.stolen).toBeGreaterThan(0);
    expect(lost.last.stolen).toBe(lost.w.tally.goldStolen);
    const beaten = raided(true);
    expect([beaten.last.won, beaten.last.towers, beaten.last.byTowers, beaten.last.stolen, beaten.last.burned]).toEqual([true, 1, 3, 0, 0]);
  });
  it('keeps the contract fields in raid.last and sends a copy of it with raid_end', () => {
    const { w, end, last } = raided(true);
    for (const k of ['index', 'dir', 'size', 'won', 'byTowers', 'bySoldiers', 'towers', 'burned', 'stolen', 'day']) expect(k in last).toBe(true);
    expect([last.index, last.day]).toEqual([0, w.day]);
    expect([end.won, end.report]).toEqual([last.won, last]);
    end.report.stolen = 999;
    expect(last.stolen).toBe(0);                                                       // the event's copy is the UI's to keep
  });
});
