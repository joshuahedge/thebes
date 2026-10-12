import { describe, it, expect } from '../harness.js';
import { migrate, MIGRATIONS, CURRENT_VERSION } from '../../src/save/migrate.js';
import { serialize, deserialize, validateWorld, unpackSave, REQUIRED } from '../../src/save/serialize.js';
import { createWorld, population, STAGE3_TALLY } from '../../src/sim/world.js';
import { advanceDays } from '../../src/sim/clock.js';
import { drawRoad, paintHouses, place } from '../../src/sim/commands.js';
import { costOf, roadCostOf } from '../../src/sim/costs.js';

const V3_KEYS = ['difficulty', 'trade', 'newItems'];
const V3_TALLY = ['made', 'sold', 'bought', 'tradeIncome', 'caravans'];
const V4_KEYS = ['wall', 'wallVersion', 'raid', 'soldiers', 'nextUnitId', 'danger', 'splits', 'seals', 'feats', 'cityId'];   // version 4's (migrateV4.test.js)
const code = (fn) => { try { fn(); } catch (e) { return e.message; } return null; };

// A version 2 save as the early-game pass wrote it: a lived-in city without the version 3 fields.
function v2City() {
  const w = createWorld({ seed: 7 });
  const { x, y } = w.focus;
  expect(drawRoad(w, x - 6, y, x + 6, y).ok).toBe(true);
  expect(paintHouses(w, x - 5, y + 1, x + 5, y + 1).ids.length).toBeGreaterThan(0);
  expect(place(w, 'well', x, y - 1).ok).toBe(true);
  advanceDays(w, 75);
  const v2 = JSON.parse(serialize(w));
  for (const k of [...V3_KEYS, ...V4_KEYS]) delete v2[k];
  for (const k of [...V3_TALLY, ...STAGE3_TALLY]) delete v2.tally[k];
  for (const b of Object.values(v2.buildings)) { delete b.risk; delete b.fire; }
  v2.version = 2;
  return v2;
}

// A valid version 3 world as plain data, changed by fn, then validated.
function validAfter(fn) {
  const w = JSON.parse(serialize(createWorld({ seed: 3 })));
  fn(w);
  return validateWorld(w);
}

describe('migrate v2 to v3', () => {
  it('adds Normal difficulty, no trade, no new items and zero tallies, and keeps everything else', () => {
    const v2 = v2City();
    expect(population(v2)).toBeGreaterThan(0);
    expect(v2.tally.peakPeople).toBeGreaterThan(0);
    const before = JSON.stringify(v2);
    const v3 = MIGRATIONS[2](v2);
    expect(JSON.stringify(v2)).toBe(before);                      // the old object is not changed
    expect(v3.version).toBe(3);
    expect(v3.difficulty).toBe('normal');
    expect(v3.trade).toEqual({ routes: {}, orders: {}, drift: {}, used: {}, year: 1 });
    expect(v3.newItems).toEqual([]);
    expect(v3.tally).toEqual({ ...v2.tally, made: {}, sold: 0, bought: 0, tradeIncome: 0, caravans: 0 });
    expect(v3.tally === v2.tally).toBe(false);                    // a copy, not the same object
    for (const k of Object.keys(v2)) if (k !== 'version' && k !== 'tally') expect([k, v3[k]]).toEqual([k, v2[k]]);
    expect(Object.keys(v3).sort()).toEqual(REQUIRED.filter((k) => !V4_KEYS.includes(k)).sort());
    expect(validateWorld(MIGRATIONS[4](MIGRATIONS[3](v3)))).toBe(true);                    // valid once versions 4 and 5 add its fields
  });
  it('runs through migrate, deserialize and unpackSave, and keeps the old costs', () => {
    const v2 = v2City();
    expect(CURRENT_VERSION).toBe(5);
    expect(migrate(v2)).toEqual(MIGRATIONS[4](MIGRATIONS[3](MIGRATIONS[2](v2))));
    expect(deserialize(JSON.stringify(v2)).version).toBe(5);
    const back = unpackSave(JSON.stringify({ version: 1, savedAt: 1760000000000, lastSpeed: 2, world: v2 }));
    expect(back.savedAt).toBe(1760000000000);
    expect(back.lastSpeed).toBe(2);
    expect(back.world.version).toBe(5);
    expect(back.world.difficulty).toBe('normal');
    for (const [id, b] of Object.entries(v2.buildings)) expect(back.world.buildings[id]).toEqual({ ...b, risk: 0, fire: null });
    expect(back.world.gold).toBe(v2.gold);
    expect([costOf(back.world, 'well'), costOf(back.world, 'temple'), roadCostOf(back.world)]).toEqual([30, 120, 2]);   // a city from before plays on Normal
  });
  it('reports a malformed version 2 save as corrupt, not as a failed migration', () => {
    expect(code(() => deserialize(JSON.stringify({ version: 2 })))).toBe('corrupt_save');
    const v2 = v2City();
    v2.tally = null;
    expect(code(() => deserialize(JSON.stringify(v2)))).toBe('corrupt_save');
    const odd = v2City();
    odd.tally = [1, 2];
    expect(code(() => deserialize(JSON.stringify(odd)))).toBe('corrupt_save');
  });
});

describe('validateWorld v3', () => {
  it('accepts a new world at every level and one that has traded', () => {
    expect(validAfter(() => {})).toBe(true);
    for (const d of ['relaxed', 'normal', 'hard']) expect(validAfter((w) => { w.difficulty = d; })).toBe(true);
    expect(validAfter((w) => {
      w.trade = { routes: { memphis: { opened: 30 } }, orders: { pottery: { mode: 'sell', keep: 50 } }, drift: { memphis: { pottery: 0.05 } }, used: { memphis: { pottery: 40 } }, year: 3 };
      w.newItems = ['booth', 'statue'];
      Object.assign(w.tally, { made: { pottery: 120, clay: 130 }, sold: 40, bought: 20, tradeIncome: 320, caravans: 2 });
    })).toBe(true);
  });
  it('requires each new field', () => {
    for (const k of V3_KEYS) expect([k, validAfter((w) => { delete w[k]; })]).toEqual([k, false]);
    for (const k of V3_TALLY) expect([k, validAfter((w) => { delete w.tally[k]; })]).toEqual([k, false]);
  });
  it('rejects a difficulty that is not a level', () => {
    expect(validAfter((w) => { w.difficulty = 'nightmare'; })).toBe(false);
    expect(validAfter((w) => { w.difficulty = 1; })).toBe(false);
    expect(validAfter((w) => { w.difficulty = 'toString'; })).toBe(false);
  });
  it('rejects a bad trade state', () => {
    expect(validAfter((w) => { w.trade = null; })).toBe(false);
    expect(validAfter((w) => { w.trade = []; })).toBe(false);
    for (const k of ['routes', 'orders', 'drift', 'used']) {
      expect([k, validAfter((w) => { delete w.trade[k]; })]).toEqual([k, false]);
      expect([k, validAfter((w) => { w.trade[k] = []; })]).toEqual([k, false]);
    }
    expect(validAfter((w) => { w.trade.year = 0; })).toBe(false);
    expect(validAfter((w) => { w.trade.year = 1.5; })).toBe(false);
  });
  it('rejects bad new items and bad trade tallies', () => {
    expect(validAfter((w) => { w.newItems = 'booth'; })).toBe(false);
    expect(validAfter((w) => { w.newItems = [3]; })).toBe(false);
    expect(validAfter((w) => { w.tally.made = []; })).toBe(false);
    expect(validAfter((w) => { w.tally.made = { pottery: '3' }; })).toBe(false);
    expect(validAfter((w) => { w.tally.sold = NaN; })).toBe(false);
    expect(validAfter((w) => { w.tally.tradeIncome = '10'; })).toBe(false);
  });
});
