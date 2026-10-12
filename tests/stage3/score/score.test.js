import { describe, it, expect } from '../../harness.js';
import { createWorld, housesOf, population } from '../../../src/sim/world.js';
import { scoreOf, scorePreview, scoreRow, medalFor, nextMedal } from '../../../src/sim/score.js';
import { computeCoverage } from '../../../src/sim/housing.js';
import { bazaarsByHouse } from '../../../src/sim/distribution.js';
import { desirabilityField, houseDesirability } from '../../../src/sim/desirability.js';
import { runMonth } from '../../../src/sim/clock.js';
import { buildStressCity } from '../../../src/dev/sampleCity.js';
import { makeTestWorld, setRoad, addRaw, staffAll } from '../../helpers/testWorld.js';

// Road along y = 10 in a 32x32 test world.
function street(gold = 1000) {
  const w = makeTestWorld({ gold });
  setRoad(w, 0, 10, 31, 10);
  return w;
}
const homes = (w, n, tier, residents, y = 9) => { for (let i = 0; i < n; i++) addRaw(w, 'house', 10 + i, y, { tier, residents }); };

describe('s3 score parts', () => {
  it('scores an empty city by the formulas: only full jobs, a sound treasury and a safe record count', () => {
    const s = scoreOf(street());
    expect(s.parts).toEqual({ people: 0, prosperity: 50, culture: 0, safety: 100, monuments: 0 });
    expect([s.raw, s.total, s.factor, s.version, s.medal]).toEqual([150, 150, 1, 2, null]);
    expect(s.next).toEqual({ medal: 'bronze', points: 50 });   // score v2: bronze at 200
    expect(s.reasons).toEqual({
      people: { code: 'growth', milestone: 'town', people: 0, of: 150 },
      prosperity: { code: 'taxes', perPerson: 0 },
      culture: { code: 'no_homes' },
      safety: null,
      monuments: { code: 'prestige', prestige: 0 },                              // Stage 4: the contract's reason until Track D words the next step
    });
  });
  it('counts People as 60 x growth along the milestones by people now plus 40 x the residents\' average tier', () => {
    const w = street();
    w.milestone = 'town';
    homes(w, 10, 5, 20);                                                  // 200 people, every one in a Townhouse
    const s = scoreOf(w);
    expect(population(w)).toBe(200);
    expect(s.parts.people).toBe(Math.round(60 * ((1 + 0.5) / 5) + 40 * ((5 - 1) / 8)));   // halfway from Town to Market town
    expect(s.reasons.people).toEqual({ code: 'growth', milestone: 'market_town', people: 200, of: 250 });
    w.milestone = 'capital';
    for (const h of housesOf(w)) h.tier = 9;
    expect([scoreOf(w).parts.people, scoreOf(w).reasons.people]).toEqual([100, null]);
    w.milestone = 'great_city';
    for (const h of housesOf(w)) h.tier = 2;
    expect(scoreOf(w).reasons.people).toEqual({ code: 'homes', tier: 2 });   // growth 0.8 loses 12, homes 1/8 loses 35
  });
  it('weights the average tier by residents and names the tier most lived-in homes are at', () => {
    const w = street();
    homes(w, 3, 1, 1);
    addRaw(w, 'house', 20, 9, { tier: 9, residents: 9 });                 // (3 x 1 + 9 x 9) / 12 = 7
    addRaw(w, 'house', 21, 9, { tier: 0, residents: 0 });                 // an empty plot counts for nothing
    const s = scoreOf(w);
    expect(s.parts.people).toBe(Math.round(60 * (12 / 150 / 5) + 40 * ((7 - 1) / 8)));
    w.milestone = 'capital';
    expect(scoreOf(w).reasons.people).toEqual({ code: 'homes', tier: 1 });
  });
  it('counts Prosperity from taxes per person, jobs, the treasury and open routes', () => {
    const w = street(-250);
    homes(w, 10, 4, 20);
    w.stats.lastMonth = { taxes: 500, wages: 0, upkeep: 0, soldiers: 0, net: 500 };
    w.labour = { workforce: 100, employed: 80, jobs: 80, shortLevels: [] };
    w.trade.routes = { memphis: true };
    const s = scoreOf(w);
    expect(s.parts.prosperity).toBe(Math.round(30 * (2.5 / 5) + 30 * (1 - 0.15 / 0.25) + 20 * 0.5 + 20 * 0.5));
    expect(s.reasons.prosperity).toEqual({ code: 'jobless', percent: 20 });
    w.labour.employed = 100; w.stats.lastMonth.taxes = 1000; w.trade.routes = { memphis: true, byblos: true };
    expect(scoreOf(w).reasons.prosperity).toEqual({ code: 'debt', gold: 250 });
    w.gold = -600;
    expect(scoreOf(w).parts.prosperity).toBe(80);                         // 0 at -500 and below
    w.gold = 5; w.trade.routes = {};
    expect(scoreOf(w).reasons.prosperity).toEqual({ code: 'routes', n: 0 });
  });
  it('counts Culture from the homes a working temple, booth and bazaar reach, as the monthly check does, and pleasant streets', () => {
    const w = street();
    homes(w, 4, 3, 5);                                                    // x 10-13 north of the road
    addRaw(w, 'house', 30, 9, { tier: 3, residents: 5 });                 // far east: no temple reaches it
    addRaw(w, 'temple', 8, 11);
    addRaw(w, 'bazaar', 14, 11);
    addRaw(w, 'booth', 16, 11, { paused: true });                         // a paused booth reaches no one
    staffAll(w);
    const lived = housesOf(w);
    const cov = computeCoverage(w), bz = bazaarsByHouse(w), field = desirabilityField(w);
    const share = (set) => lived.filter((h) => set(h.id)).length / lived.length;
    const avg = lived.reduce((s, h) => s + houseDesirability(w, h, field), 0) / lived.length;
    const want = 25 * share((id) => cov.religion.has(id)) + 25 * share((id) => cov.entertainment.has(id)) + 25 * share((id) => bz.has(id)) + 25 * Math.max(0, Math.min(1, avg / 50));
    expect(share((id) => cov.religion.has(id))).toBe(0.8);
    expect(scoreOf(w).parts.culture).toBe(Math.round(want));
    expect(scoreOf(w).reasons.culture).toEqual({ code: 'no_booth', n: 5 });
  });
  it('counts Safety: the fire term only from Town, the share of burnable buildings a staffed firehouse covers', () => {
    const w = street();
    addRaw(w, 'firehouse', 2, 11);
    addRaw(w, 'potter', 4, 11);
    addRaw(w, 'potter', 28, 11);                                          // 26 road tiles away: out of reach
    addRaw(w, 'garden', 6, 11);                                           // never burns: not counted
    staffAll(w);
    expect(scoreOf(w).parts.safety).toBe(100);                            // a village: 1 before Town
    w.milestone = 'town';
    const s = scoreOf(w);
    expect(s.parts.safety).toBe(Math.round(40 * (2 / 3) + 40 + 20));
    expect(s.reasons.safety).toEqual({ code: 'fire_cover', n: 1, dir: 'east' });
    w.buildings[1].staff = 1;                                             // a quarter staffed: it works, but does not count as staffed
    expect(scoreOf(w).parts.safety).toBe(60);
  });
  it('counts defence against a raid sized now once the raid clock runs, and full on Peaceful', () => {
    const w = street();
    w.milestone = 'market_town';
    expect(scoreOf(w).parts.safety).toBe(100);                            // no raid clock yet
    w.raid.clockDay = 0;
    expect([scoreOf(w).parts.safety, scoreOf(w).reasons.safety]).toEqual([60, { code: 'towers', need: 1, towers: 0, soldiers: 0 }]);
    w.soldiers = [{ id: 1 }, { id: 2 }];
    expect(scoreOf(w).parts.safety).toBe(Math.round(40 * (2 / 3) + 60));
    addRaw(w, 'tower', 3, 11);
    staffAll(w);
    expect(scoreOf(w).parts.safety).toBe(100);                            // capped at 1
    w.difficulty = 'peaceful';
    w.soldiers = []; w.buildings[1].paused = true;
    expect(scoreOf(w).parts.safety).toBe(100);
  });
  it('counts the record: 0.2 a building burned and 0.5 a raid lost in the last 360 days', () => {
    const w = street();
    w.day = 1000;
    w.danger.burnDays = [600, 700, 990];                                  // 600 is more than 360 days ago
    expect([scoreOf(w).parts.safety, scoreOf(w).reasons.safety]).toEqual([92, { code: 'burned', n: 2 }]);
    w.raid.last = { index: 1, dir: 'east', size: 4, won: false, byTowers: 0, bySoldiers: 0, towers: 0, burned: 2, stolen: 30, day: 900 };
    expect([scoreOf(w).parts.safety, scoreOf(w).reasons.safety]).toEqual([82, { code: 'raid_lost' }]);
    w.raid.last.won = true;
    expect(scoreOf(w).parts.safety).toBe(92);
    w.danger.burnDays = [700, 701, 702, 703, 704, 705, 990];              // never below 0
    w.day = 1001;
    expect(scoreOf(w).parts.safety).toBe(80);
  });
  it('multiplies the parts by the level\'s factor and gives the medal on the parts\' total', () => {
    const w = street();
    w.difficulty = 'hard';
    const s = scoreOf(w);
    expect([s.raw, s.total, s.factor]).toEqual([150, Math.round(150 * 1.25), 1.25]);
    expect([s.medal, s.next]).toEqual([medalFor(150), nextMedal(w, 150)]);
    w.difficulty = 'peaceful';
    expect(scoreOf(w).total).toBe(105);
  });
  it('is the same every time for the same city, and runMonth stores it in the month-end row', () => {
    const w = street();
    homes(w, 4, 2, 6);
    addRaw(w, 'well', 9, 11);
    staffAll(w);
    expect(JSON.stringify(scoreOf(w))).toBe(JSON.stringify(scoreOf(w)));
    runMonth(w, []);
    const row = w.history[w.history.length - 1];
    expect({ score: row.score, parts: row.parts, version: row.version }).toEqual(scoreRow(w));
  });
  it('scores a big city quickly enough to show every game day', () => {
    const w = createWorld({ seed: 11 });
    buildStressCity(w);
    scoreOf(w);                                                           // the reach and desirability caches warm up
    const t0 = performance.now();
    for (let i = 0; i < 5; i++) scoreOf(w);
    expect((performance.now() - t0) / 5).toBeLessThan(20);
  });
});

describe('s3 score previews', () => {
  it('previews the parts a building would change, counted as staffed, and leaves the city exactly as it was', () => {
    const w = street();
    homes(w, 4, 3, 5);
    staffAll(w);
    const before = JSON.stringify(w);
    const p = scorePreview(w, 'temple', 8, 11);
    expect(p.culture).toBeGreaterThan(0);
    expect([p.people, p.prosperity]).toEqual([0, 0]);
    expect(JSON.stringify(w)).toBe(before);
    expect(scorePreview(w, 'temple', 10, 9)).toEqual({ people: 0, prosperity: 0, culture: 0, safety: 0, monuments: 0 });   // on a home: nothing
    expect(scorePreview(w, 'temple', 31, 31)).toEqual({ people: 0, prosperity: 0, culture: 0, safety: 0, monuments: 0 });  // off the map
    expect(scorePreview(w, 'nothing', 3, 3)).toEqual({ people: 0, prosperity: 0, culture: 0, safety: 0, monuments: 0 });
  });
  it('previews a firehouse raising Safety and a potter lowering it, from Town', () => {
    const w = street();
    w.milestone = 'town';
    addRaw(w, 'potter', 4, 11);
    staffAll(w);
    expect(scorePreview(w, 'firehouse', 2, 11).safety).toBe(40);
    expect(scorePreview(w, 'potter', 28, 11).safety).toBe(0);            // still nothing covered: 0 of 2 as 0 of 1
    addRaw(w, 'firehouse', 2, 11);
    staffAll(w);
    expect(scorePreview(w, 'potter', 28, 11).safety).toBe(Math.round(40 * (2 / 3) + 60) - 100);
  });
});
