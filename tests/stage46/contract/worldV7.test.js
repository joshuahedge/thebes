// World version 7 (Stage 4.6, ruling 344): the map's size and shape choices, the flood and the floodplain, the herds, the court, the
// army away, each unit's kind and each raid's mix, each monument's style, and the new tallies. Old saves keep their maps and play on.
import { describe, it, expect } from '../../harness.js';
import { createWorld, WORLD_VERSION, STAGE46_TALLY, newTally, makeBuilding, insertBuilding } from '../../../src/sim/world.js';
import { serialize, deserialize, validateWorld, REQUIRED, TALLY_KEYS } from '../../../src/save/serialize.js';
import { migrate, MIGRATIONS, CURRENT_VERSION } from '../../../src/save/migrate.js';
import { S46_TALLY } from '../../../src/data/s46.js';
import { RIVER_TALLY, newFloodState, newWildlifeState } from '../../../src/data/river.js';
import { COURT_TALLY, newCourtState, FAVOUR } from '../../../src/data/court.js';
import { ARMY_TALLY, newArmyState, footMix, ENEMY_KINDS } from '../../../src/data/armies.js';
import { MAP_TALLY } from '../../../src/data/map.js';
import { WONDER_TALLY, MONUMENT_STYLE_IDS } from '../../../src/data/wonders.js';
import { floodplainOf } from '../../../src/sim/flood.js';
import { T } from '../../../src/sim/terrain.js';
import { drawRoad, paintHouses, place } from '../../../src/sim/commands.js';
import { advanceDays } from '../../../src/sim/clock.js';

const NEW_KEYS = ['mapSize', 'mapParams', 'flood', 'floodplain', 'wildlife', 'court', 'army'];

// A version 6 save as Stage 4.5 wrote it: a lived-in classic city with a soldier, an obelisk site, a raid warning and a raid under
// way, and none of the Stage 4.6 fields.
function v6City() {
  const w = createWorld({ seed: 7 });
  const { x, y } = w.focus;
  expect(drawRoad(w, x - 6, y, x + 6, y).ok).toBe(true);
  expect(paintHouses(w, x - 5, y + 1, x + 5, y + 1).ids.length).toBeGreaterThan(0);
  expect(place(w, 'well', x, y - 1).ok).toBe(true);
  advanceDays(w, 40);
  const obelisk = insertBuilding(w, makeBuilding(w, 'obelisk_small', x + 3, y - 3));
  w.soldiers.push({ id: 900, barracks: 1, x: 3, y: 3, hp: 12, hit: false, task: 'wait' });
  w.raid.warning = { index: 1, entry: { x: 63, y: 32 }, dir: 'east', size: 5, tribute: 300, target: 'temple', day: 40, arrives: 130, first: false };
  w.raid.active = { index: 0, entry: { x: 63, y: 32 }, dir: 'east', size: 3, raiders: [{ id: 901, x: 60, y: 32, hp: 10, hit: false }], phase: 'attack' };
  w.raid.last = { index: 0, dir: 'east', size: 3, won: true, byTowers: 3, bySoldiers: 0, towers: 1, burned: 0, stolen: 0, day: 10 };
  const v6 = JSON.parse(serialize(w));
  for (const k of NEW_KEYS) delete v6[k];
  for (const k of STAGE46_TALLY) delete v6.tally[k];
  delete v6.buildings[obelisk.id].style;
  for (const u of v6.soldiers) delete u.kind;
  v6.version = 6;
  return { v6, obeliskId: obelisk.id };
}

describe('s46 contract world v7', () => {
  it('creates a version 7 world with every Stage 4.6 field, each track record from its own function', () => {
    const w = createWorld({ seed: 4 });
    expect([WORLD_VERSION, w.version, CURRENT_VERSION]).toEqual([10, 10, 10]);
    expect(Object.keys(w).sort()).toEqual([...REQUIRED].sort());
    for (const k of NEW_KEYS) expect(REQUIRED).toContain(k);
    expect([w.mapSize, w.mapParams]).toEqual([64, {}]);
    expect(w.flood).toEqual(newFloodState());
    expect(w.flood).toEqual({ year: null, level: null, forecast: null, from: null, to: null, applied: null, risen: false });   // the River track added applied and risen inside the record
    expect(w.wildlife).toEqual(newWildlifeState());
    expect(w.court).toEqual(newCourtState());
    expect([w.court.favour, FAVOUR.start, w.court.letters, w.court.request, w.court.cards]).toEqual([50, 50, [], null, []]);
    expect(w.army).toEqual(newArmyState());
    expect(w.floodplain).toEqual(floodplainOf(w.terrain, w.size));
    expect(validateWorld(JSON.parse(serialize(w)))).toBe(true);
  });
  it('joins every track tally into the world, the save check and newTally, starting at 0', () => {
    expect(STAGE46_TALLY).toEqual(S46_TALLY);
    expect(S46_TALLY).toEqual([...MAP_TALLY, ...RIVER_TALLY, ...COURT_TALLY, ...ARMY_TALLY, ...WONDER_TALLY]);
    expect(new Set(TALLY_KEYS).size).toBe(TALLY_KEYS.length);                     // no track reuses an older key
    expect(RIVER_TALLY).toContain('hunted');
    const w = createWorld({ seed: 4 });
    for (const k of STAGE46_TALLY) { expect([k, w.tally[k]]).toEqual([k, 0]); expect(TALLY_KEYS).toContain(k); }
    expect(w.tally).toEqual(newTally());
  });
  it('works out the floodplain: fertile tiles with water within 3 tiles, nothing else', () => {
    const w = createWorld({ seed: 9 });
    const n = w.size;
    let wet = 0;
    for (let i = 0; i < n * n; i++) {
      const x = i % n, y = Math.floor(i / n);
      let near = false;
      for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) {
        const nx = x + dx, ny = y + dy;
        if (nx >= 0 && ny >= 0 && nx < n && ny < n && w.terrain[ny * n + nx] === T.WATER) near = true;
      }
      const want = w.terrain[i] === T.FERTILE && near ? 1 : 0;
      if (w.floodplain[i] !== want) expect([i, w.floodplain[i]]).toEqual([i, want]);
      wet += want;
    }
    expect(wet).toBeGreaterThan(100);
  });
  it('gives a monument its style (default classic until the Wonders track names one) and a trained soldier its kind', () => {
    const w = createWorld({ seed: 4 });
    expect(makeBuilding(w, 'obelisk_small', 2, 2).style).toBe('classic');
    expect(makeBuilding(w, 'obelisk_small', 2, 2, 0, { style: 'gilded' }).style).toBe('gilded');
    expect(makeBuilding(w, 'obelisk_small', 2, 2, 0, { style: 'tartan' }).style).toBe('classic');
    expect('style' in makeBuilding(w, 'well', 2, 2)).toBe(false);
    expect(MONUMENT_STYLE_IDS).toEqual(['classic', 'whitewashed', 'painted', 'gilded']);
    const bad = JSON.parse(serialize(w));
    bad.buildings[99] = { ...makeBuilding(w, 'obelisk_small', 2, 2), id: 99, style: 'tartan' };
    bad.occ[2 * w.size + 2] = 99;
    expect(validateWorld(bad)).toBe(false);
    bad.buildings[99].style = 'painted';
    expect(validateWorld(bad)).toBe(true);
  });
  it('checks each track record with the track own check', () => {
    const bad = (fn) => { const w = JSON.parse(serialize(createWorld({ seed: 3 }))); fn(w); return validateWorld(w); };
    expect(bad(() => {})).toBe(true);
    expect([
      bad((w) => { w.floodplain = w.floodplain.slice(1); }), bad((w) => { w.floodplain[0] = 2; }), bad((w) => { w.mapParams = null; }),
      bad((w) => { w.flood.level = 'deluge'; }), bad((w) => { w.wildlife.herds = [{ id: 1, kind: 'lion', x: 1, y: 1, size: 3 }]; }),
      bad((w) => { w.court.favour = 101; }), bad((w) => { w.court.letters = [3]; }), bad((w) => { w.army.away = [{ kind: 'dragon', back: 3 }]; }),
      bad((w) => { w.soldiers = [{ id: 1, kind: 'dragon', barracks: 1, x: 0, y: 0, hp: 3, hit: false, task: 'wait' }]; }),
    ]).toEqual([false, false, false, false, false, false, false, false, false]);
    expect(bad((w) => { w.flood.level = 'high'; w.wildlife.herds = [{ id: 1, kind: 'gazelle', x: 1, y: 1, size: 3, max: 6, regrow: null }]; })).toBe(true);
  });

  it('migrates 6 to 7: the map kept at 64, the floodplain from its terrain, the track records new, kinds, mixes, classic monuments, tallies at 0', () => {
    const { v6, obeliskId } = v6City();
    const before = JSON.stringify(v6);
    const v7 = MIGRATIONS[6](v6);
    expect(JSON.stringify(v6)).toBe(before);                                         // the migration copies, never edits the save
    expect(v7.version).toBe(7);
    expect(Object.keys(v7).sort()).toEqual([...REQUIRED].sort());
    expect([v7.mapSize, v7.mapParams, v7.terrain]).toEqual([64, {}, v6.terrain]);
    expect(v7.floodplain).toEqual(floodplainOf(v6.terrain, 64));
    expect([v7.flood, v7.wildlife, v7.court, v7.army]).toEqual([newFloodState(), newWildlifeState(), newCourtState(), newArmyState()]);
    expect(v7.court.favour).toBe(50);
    for (const k of STAGE46_TALLY) expect(v7.tally[k]).toBe(0);
    expect(v7.buildings[obeliskId].style).toBe('classic');
    expect(Object.values(v7.buildings).filter((b) => b.id !== obeliskId).every((b) => !('style' in b) || b.type === 'palace')).toBe(true);
    expect(v7.soldiers.map((u) => u.kind)).toEqual(['soldier']);
    expect([v7.raid.warning.mix, v7.raid.active.mix, v7.raid.last.mix]).toEqual([footMix(5), footMix(3), footMix(3)]);
    expect(footMix(5)).toEqual({ foot: 5, archer: 0, chariot: 0, boat: 0 });
    expect(Object.keys(footMix(1))).toEqual(ENEMY_KINDS);
    expect(v7.raid.active.raiders.map((r) => r.kind)).toEqual(['foot']);
    for (const k of Object.keys(v6)) if (!['version', 'buildings', 'tally', 'soldiers', 'raid', 'newItems'].includes(k)) expect([k, v7[k]]).toEqual([k, v6[k]]);
    expect(v7.newItems).toEqual(v6.newItems);                                          // no track unlocks anything yet at this milestone
    expect(validateWorld(v7)).toBe(true);
  });
  it('leaves a raid state with nothing warned or under way as it was, and runs through migrate and deserialize', () => {
    const { v6 } = v6City();
    v6.raid.warning = null; v6.raid.active = null; v6.raid.last = null;
    const v7 = migrate(v6);
    expect([v7.raid.warning, v7.raid.active, v7.raid.last]).toEqual([null, null, null]);
    expect(deserialize(JSON.stringify(v6)).version).toBe(10);
    expect(migrate(v6)).toEqual(MIGRATIONS[9](MIGRATIONS[8](MIGRATIONS[7](MIGRATIONS[6](v6)))));
    let msg = null;
    try { deserialize(JSON.stringify({ version: 6 })); } catch (e) { msg = e.message; }
    expect(msg).toBe('corrupt_save');
  });
  it('plays a migrated city on: a year passes and it saves and loads', () => {
    const { v6 } = v6City();
    const w = deserialize(JSON.stringify(v6));
    w.raid.warning = null; w.raid.active = null;
    advanceDays(w, 360);
    expect(validateWorld(deserialize(serialize(w)))).toBe(true);
  });
});
