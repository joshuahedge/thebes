// World version 6 (Stage 4.5, ruling 315): the map variant, clay on old maps, a home's health and crime risk and illness, and
// the new tallies. Old saves keep their maps.
import { describe, it, expect } from '../harness.js';
import { createWorld, WORLD_VERSION, STAGE45_TALLY, newTally, makeBuilding } from '../../src/sim/world.js';
import { serialize, deserialize, validateWorld, REQUIRED, TALLY_KEYS } from '../../src/save/serialize.js';
import { migrate, MIGRATIONS, CURRENT_VERSION } from '../../src/save/migrate.js';
import { MAP_VARIANTS } from '../../src/data/map.js';
import { T } from '../../src/sim/terrain.js';
import { idx } from '../../src/sim/grid.js';
import { drawRoad, paintHouses, place } from '../../src/sim/commands.js';
import { advanceDays } from '../../src/sim/clock.js';

// A version 5 save as Stage 4 wrote it: a lived-in classic city, with no clay, no map variant, no home risk fields.
function v5City() {
  const w = createWorld({ seed: 7 });
  const { x, y } = w.focus;
  expect(drawRoad(w, x - 6, y, x + 6, y).ok).toBe(true);
  expect(paintHouses(w, x - 5, y + 1, x + 5, y + 1).ids.length).toBeGreaterThan(0);
  expect(place(w, 'well', x, y - 1).ok).toBe(true);
  advanceDays(w, 40);
  const v5 = JSON.parse(serialize(w));
  v5.terrain = v5.terrain.map((t) => (t === T.CLAY ? T.BANK : t));
  delete v5.mapVariant;
  for (const k of STAGE45_TALLY) delete v5.tally[k];
  for (const b of Object.values(v5.buildings)) { delete b.health; delete b.crime; delete b.illness; }
  v5.version = 5;
  return v5;
}
const count = (terrain, t) => terrain.filter((v) => v === t).length;

describe('s45 world v6', () => {
  it('creates a version 6 world: a classic map by default, no illness, no risk points, the new tallies at zero', () => {
    const w = createWorld({ seed: 4 });
    expect([WORLD_VERSION, w.version, CURRENT_VERSION]).toEqual([6, 6, 6]);
    expect(w.mapVariant).toBe('classic');
    expect(STAGE45_TALLY).toEqual(['illnesses', 'illnessesCured', 'thefts', 'theftGold']);
    for (const k of STAGE45_TALLY) { expect([k, w.tally[k]]).toEqual([k, 0]); expect(TALLY_KEYS).toContain(k); }
    expect(w.tally).toEqual(newTally());
    expect(Object.keys(w).sort()).toEqual([...REQUIRED].sort());
    expect(REQUIRED).toContain('mapVariant');
    expect(validateWorld(JSON.parse(serialize(w)))).toBe(true);
    const home = makeBuilding(w, 'house', 3, 3);
    expect([home.health, home.crime, home.illness]).toEqual([0, 0, null]);
    expect(['well', 'farm_grain'].map((t) => ['health' in makeBuilding(w, t, 3, 3), 'crime' in makeBuilding(w, t, 3, 3), 'illness' in makeBuilding(w, t, 3, 3)])).toEqual([[false, false, false], [false, false, false]]);
  });
  it('keeps the six variant names, and only a known one validates', () => {
    expect(MAP_VARIANTS).toEqual(['classic', 'east', 'middle', 'wide-bends', 'island', 'oasis']);
    const bad = (v) => { const w = JSON.parse(serialize(createWorld({ seed: 3 }))); w.mapVariant = v; return validateWorld(w); };
    expect(bad('classic')).toBe(true);
    expect([bad('swamp'), bad(null), bad(3)]).toEqual([false, false, false]);
  });
  it('requires a home to carry health, crime and an illness that is null or a record', () => {
    const withHome = (fn) => {
      const w = JSON.parse(serialize(createWorld({ seed: 3 })));
      w.buildings[1] = { ...makeBuilding(createWorld({ seed: 3 }), 'house', 2, 2), id: 1 };
      w.occ[2 * w.size + 2] = 1;
      fn(w.buildings[1]);
      return validateWorld(w);
    };
    expect(withHome(() => {})).toBe(true);
    expect(withHome((b) => { b.illness = { since: 4 }; })).toBe(true);
    expect([withHome((b) => { delete b.health; }), withHome((b) => { delete b.crime; }), withHome((b) => { b.illness = 'flu'; })]).toEqual([false, false, false]);
  });

  it('migrates 5 to 6: classic, clay on free bank tiles, homes with no risk and no illness, tallies at zero, everything else kept', () => {
    const v5 = v5City();
    const before = JSON.stringify(v5);
    const v6 = MIGRATIONS[5](v5);
    expect(JSON.stringify(v5)).toBe(before);                                       // the migration copies, never edits the save
    expect(v6.version).toBe(6);
    expect(v6.mapVariant).toBe('classic');
    expect(Object.keys(v6).sort()).toEqual([...REQUIRED].sort());
    for (const k of STAGE45_TALLY) expect(v6.tally[k]).toBe(0);
    const homes = Object.values(v6.buildings).filter((b) => b.type === 'house');
    expect(homes.length).toBeGreaterThan(0);
    for (const h of homes) expect([h.health, h.crime, h.illness]).toEqual([0, 0, null]);
    expect(Object.values(v6.buildings).filter((b) => b.type !== 'house').every((b) => !('illness' in b))).toBe(true);
    for (const k of Object.keys(v5)) if (!['version', 'mapVariant', 'terrain', 'buildings', 'tally'].includes(k)) expect([k, v6[k]]).toEqual([k, v5[k]]);
    expect(validateWorld(v6)).toBe(true);
  });
  it('lays clay on old maps by the generator rule: 40-90 tiles, only where bank or dry ground was free, nothing under a building or road', () => {
    const v5 = v5City();
    const v6 = MIGRATIONS[5](v5);
    const clay = count(v6.terrain, T.CLAY);
    expect(clay >= 40 && clay <= 90).toBe(true);
    for (let i = 0; i < v6.terrain.length; i++) {
      if (v6.terrain[i] === v5.terrain[i]) continue;
      expect([i, v6.terrain[i]]).toEqual([i, T.CLAY]);
      expect([i, v5.terrain[i] === T.WATER || v5.terrain[i] === T.ROCKY]).toEqual([i, false]);
      expect([i, v5.occ[i], v5.road[i], v5.wall[i]]).toEqual([i, 0, 0, 0]);
    }
    expect(migrate(v5)).toEqual(migrate(v5));                                      // seeded: the same save gives the same map twice
  });
  it('leaves banks that are built on, and a clay pit that already stands, where they are', () => {
    const v5 = v5City();
    // A road and a house on bank tiles, and an older pit on desert (before clay a pit stood anywhere).
    const banks = [];
    for (let i = 0; i < v5.terrain.length; i++) if (v5.terrain[i] === T.BANK && !v5.road[i] && !v5.occ[i]) banks.push(i);
    for (const i of banks) v5.road[i] = 1;                                         // every free bank tile roaded: none may turn to clay
    const w = createWorld({ seed: 7 });
    const pit = makeBuilding(w, 'clay_pit', 40, 10);
    pit.id = v5.nextId++;
    v5.buildings[pit.id] = pit;
    for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) v5.occ[idx(v5.size, 40 + dx, 10 + dy)] = pit.id;
    const v6 = MIGRATIONS[5](v5);
    for (const i of banks) expect(v6.terrain[i]).toBe(T.BANK);
    expect(v6.buildings[pit.id].type).toBe('clay_pit');
    for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) expect(v6.terrain[idx(v5.size, 40 + dx, 10 + dy)]).toBe(v5.terrain[idx(v5.size, 40 + dx, 10 + dy)]);
    expect(validateWorld(v6)).toBe(true);
  });
  it('drops the selling daily goal from today\'s picks, snapshots and done list on the way to 6, and leaves the other goals and a day with none alone', () => {
    const v5 = v5City();
    v5.daily = { date: '2026-10-12', picks: ['pottery30', 'sell20', 'gardens3'], base: { pottery30: 0, sell20: 4, gardens3: 1 }, done: ['sell20', 'gardens3'], swapped: false };
    const d = MIGRATIONS[5](v5).daily;
    expect(d).toEqual({ date: '2026-10-12', picks: ['pottery30', 'gardens3'], base: { pottery30: 0, gardens3: 1 }, done: ['gardens3'], swapped: false });
    expect(validateWorld(MIGRATIONS[5](v5))).toBe(true);
    const kept = { date: '2026-10-12', picks: ['pottery30', 'gardens3'], base: { pottery30: 0, gardens3: 1 }, done: [], swapped: true };
    v5.daily = kept;
    expect(MIGRATIONS[5](v5).daily).toEqual(kept);
    v5.daily = null;
    expect(MIGRATIONS[5](v5).daily).toBe(null);
  });
  it('runs through migrate and deserialize, and reports a malformed version 5 save as corrupt', () => {
    const v5 = v5City();
    expect(migrate(v5)).toEqual(MIGRATIONS[5](v5));
    expect(deserialize(JSON.stringify(v5)).version).toBe(6);
    expect(deserialize(JSON.stringify(v5)).mapVariant).toBe('classic');
    let msg = null;
    try { deserialize(JSON.stringify({ version: 5 })); } catch (e) { msg = e.message; }
    expect(msg).toBe('corrupt_save');
    const odd = v5City();
    odd.terrain = 'sand';
    try { deserialize(JSON.stringify(odd)); } catch (e) { msg = e.message; }
    expect(msg).toBe('corrupt_save');
  });
});
