// Version 9.1 Track H (design 7.1, rulings 1710, 1714-1716): the scripted players' habit for each heir's weakness (tests/v91/h/habits.js). The Steady has
// none, so a balance run given `adapt` with the Steady is the 9.0 run to the last number; each habit does what its sheet says, set up both ways.
import { describe, it, expect } from '../../harness.js';
import { heirHabit, TAXES } from './habits.js';
import { capitalRun, runCapital, CAPITAL_YEARS } from '../../stage4/balance/capitalRun.js';
import { serialize } from '../../../src/save/serialize.js';
import { scoreOf } from '../../../src/sim/score.js';
import { taxRateOf, palaceOf } from '../../../src/sim/palace.js';
import { makeTestWorld, setRoad, addRaw } from '../../helpers/testWorld.js';

describe('v91 h habits: the Steady plays as on 9.0', () => {
  it('gives the Steady, the Bountiful and the Generous no habit, and a fresh one to the Builder, the Unconquered and the Merchant', () => {
    expect([heirHabit('steady'), heirHabit('bountiful'), heirHabit('generous')]).toEqual([null, null, null]);
    for (const heir of ['builder', 'unconquered', 'merchant']) {
      const a = heirHabit(heir), b = heirHabit(heir);
      expect([heir, a.heir, typeof a.onMonth, a === b, a.rec === b.rec]).toEqual([heir, heir, 'function', false, false]);
    }
  });
  // The capital run's year-6 city with adapt on and the Steady: the 9.0 run's numbers (the v90 balance probe's Steady row), and the very same world.
  it('builds the same year-6 city with adapt on: Capital on day 570, 49,684 gold, lowest 255, score 340 (9.2: was 600, 50,457, 255, 360)', () => {
    const r = runCapital(CAPITAL_YEARS * 12, { adapt: true });
    expect(r.habit).toBe(null);
    expect([r.capitalMonth * 30, Math.round(r.w.gold), Math.round(r.lowestGold), scoreOf(r.w).total]).toEqual([570, 49684, 255, 340]);   // WAVE2-PIN 9.2 Track Q (ruling 1777): 50,657 gold on Q alone. WAVE2-PIN 9.2 Track S (rulings 1795, 1808): was [600, 50457, 255, 360] (score v3 and the crowded term dropped)
    expect(serialize(r.w) === serialize(capitalRun().w)).toBe(true);
  });
});

// A Builder's Seat of homes by a road, with or without a palace, with or without the great temple founded; the books say 5,000 gold a month of
// Normal-rate taxes (what the habit reads).
const MONTH = 5000;
function town(gold, { palace = true, temple = true } = {}) {
  const w = makeTestWorld({ size: 64, gold });
  setRoad(w, 0, 50, 63, 50);                                 // south of any ground a script claims
  w.milestone = 'seat';
  w.heir = 'builder';
  for (let x = 10; x < 16; x++) addRaw(w, 'house', x, 51, { tier: 3, residents: 7 });
  if (palace) addRaw(w, 'palace', 18, 51, { style: 0, works: null });
  if (temple) addRaw(w, 'great_temple', 40, 51);
  w.stats.lastMonth = { ...w.stats.lastMonth, taxesNormal: MONTH };
  return w;
}

describe('v91 h habits: the Builder raises its taxes when the treasury runs low (ruling 1714)', () => {
  it('sets High below a month of Normal-rate taxes and Normal again at two, and leaves the rate alone between', () => {
    expect(TAXES).toEqual({ highBelow: 1, normalAt: 2 });
    const h = heirHabit('builder'), w = town(0);
    const step = (gold) => { w.gold = gold; h.onMonth(w); return taxRateOf(w); };
    const [lo, hi] = [TAXES.highBelow * MONTH, TAXES.normalAt * MONTH];
    expect([step(lo), step(lo - 1), step(hi - 1), step(hi), step(lo)]).toEqual(['normal', 'high', 'high', 'normal', 'normal']);
    expect([h.rec.high, h.rec.normal, h.rec.palace]).toEqual([1, 1, null]);
  });
  it('waits for the great temple: an empty treasury before the founding keeps Normal', () => {
    const w = town(0, { temple: false }), h = heirHabit('builder');
    h.onMonth(w);
    expect(taxRateOf(w)).toBe('normal');
    addRaw(w, 'great_temple', 40, 51);
    h.onMonth(w);
    expect(taxRateOf(w)).toBe('high');
  });
  it('lays a palace for it when there is none and the treasury holds one with 400 to spare, else waits at Normal', () => {
    const poor = town(600, { palace: false }), h = heirHabit('builder');
    h.onMonth(poor);
    expect([taxRateOf(poor), palaceOf(poor), h.rec.palace]).toEqual(['normal', null, null]);
    const ok = town(2000, { palace: false });
    h.onMonth(ok);
    expect([taxRateOf(ok), palaceOf(ok) !== null, h.rec.palace !== null, ok.gold < 2000]).toEqual(['high', true, true, true]);
  });
  it('does nothing before the first month\'s books', () => {
    const w = town(0), h = heirHabit('builder');
    w.stats.lastMonth = { ...w.stats.lastMonth, taxesNormal: 0 };
    h.onMonth(w);
    expect(taxRateOf(w)).toBe('normal');
  });
});

// A Merchant's workshops by a road (south of any claimed ground): `potters` potters and a storehouse holding clay, workers to spare.
function works(potters, heir = 'merchant') {
  const w = makeTestWorld({ size: 64, gold: 5000 });
  setRoad(w, 0, 50, 63, 50);
  w.milestone = 'capital';
  w.heir = heir;
  addRaw(w, 'storehouse', 10, 51, { store: { clay: 300 }, staff: 6 });
  const laid = [];
  for (let i = 0; i < potters; i++) laid.push(addRaw(w, 'potter', 13 + 3 * i, 51, { store: {}, staff: 8 }));
  w.labour = { ...w.labour, workforce: 200, jobs: 0 };
  return { w, laid };
}
const count = (w, type) => Object.values(w.buildings).filter((b) => b.type === type).length;

describe('v91 h habits: the Merchant keeps round(n / 0.85) of each workshop (ruling 1716)', () => {
  it('lays a fourth potter by three, with its clay and a store in reach, once; and none by one or two', () => {
    for (const [n, want] of [[1, 1], [2, 2], [3, 4], [4, 5]]) {
      const { w } = works(n), h = heirHabit('merchant');
      h.onMonth(w);
      h.onMonth(w);                                                   // a second month end lays no more
      expect([n, count(w, 'potter'), h.rec.built.length]).toEqual([n, want, want - n]);
    }
  });
  it('lays none without the gold, the workers or the clay', () => {
    const poor = works(3); poor.w.gold = 450;
    const idle = works(3); idle.w.labour = { ...idle.w.labour, workforce: 0, jobs: 0 };
    const dry = works(3); Object.values(dry.w.buildings).find((b) => b.type === 'storehouse').store = {};
    for (const [name, c] of [['gold', poor], ['workers', idle], ['clay', dry]]) {
      const h = heirHabit('merchant');
      h.onMonth(c.w);
      expect([name, count(c.w, 'potter')]).toEqual([name, 3]);
    }
    expect(dry.w.gold).toBe(5000);                                    // the potter it tried was taken back, refunded
  });
});

describe('v91 h habits: the Unconquered meets every warned raid (ruling 1715)', () => {
  it('builds nothing with no raid warned', () => {
    const { w } = works(1, 'unconquered'), h = heirHabit('unconquered');
    const before = Object.keys(w.buildings).length;
    h.onMonth(w);
    expect([Object.keys(w.buildings).length, h.rec.towers]).toEqual([before, []]);
  });
});
