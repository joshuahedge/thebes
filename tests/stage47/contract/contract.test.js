// Stage 4.7 Task 0 (the contract): world version 8 and MIGRATIONS[7], the HILLS ground with the one passable and buildable rule, the
// Stage 4.7 salts in the game's salt table, the new-land gate (classic at Normal draws as before) and the dev scenes.
import { describe, it, expect } from '../../harness.js';
import { createWorld, WORLD_VERSION, STAGE46_TALLY, STAGE47_TALLY, newTally, makeBuilding, insertBuilding } from '../../../src/sim/world.js';
import { serialize, deserialize, validateWorld, REQUIRED, TALLY_KEYS } from '../../../src/save/serialize.js';
import { MIGRATIONS, CURRENT_VERSION } from '../../../src/save/migrate.js';
import { S47_SALT, S47_TALLY, LAND_VERSION, newLandFor, hasNewLand, CART_STATES } from '../../../src/data/s47.js';
import { T, passable, buildable, groundRefusal } from '../../../src/sim/terrain.js';
import { generateMap } from '../../../src/sim/mapgen.js';
import { MAP_VARIANTS } from '../../../src/data/map.js';
import { drawRoad, paintHouses, place, canPlace, previewRoadTiles, conditionsFor } from '../../../src/sim/commands.js';
import { previewWallTiles } from '../../../src/sim/defence.js';
import { tileCost, flowField } from '../../../src/sim/pathfinding.js';
import { landable } from '../../../src/sim/armies.js';
import { advanceDays } from '../../../src/sim/clock.js';
import { idx } from '../../../src/sim/grid.js';
import { reasonText } from '../../../src/ui/text.js';
import { STAGE47_SCENES } from '../../../src/dev/scenes.js';
import { FIRE_SALT } from '../../../src/data/fire.js';
import { HEALTH_SALT } from '../../../src/data/health.js';
import { CRIME_SALT } from '../../../src/data/crime.js';
import { RAID_SALT } from '../../../src/data/raids.js';
import { REMARK_SALT } from '../../../src/data/tips.js';
import { MAP, MAP_SALT } from '../../../src/data/map.js';
import { RIVER_SALT } from '../../../src/data/river.js';
import { COURT_SALT } from '../../../src/data/court.js';
import { WONDER_SALT } from '../../../src/data/wonders.js';

const NEW_KEYS = ['oases', 'carts'];

// A version 7 save as Stage 4.6 wrote it: a lived-in city with a granary, and none of the Stage 4.7 fields.
function v7City({ seed = 7, size = 64, mapVariant = 'classic' } = {}) {
  const w = createWorld({ seed, size, mapVariant });
  const { x, y } = w.focus;
  expect(drawRoad(w, x - 6, y, x + 6, y).reason || null).toBe(null);
  expect(paintHouses(w, x - 5, y + 1, x + 5, y + 1).ids.length).toBeGreaterThan(0);
  expect(place(w, 'well', x, y - 1).reason || null).toBe(null);
  const granary = place(w, 'granary', x + 2, y - 2);
  expect(granary.reason || null).toBe(null);
  advanceDays(w, 40);
  const v7 = JSON.parse(serialize(w));
  for (const k of NEW_KEYS) delete v7[k];
  for (const k of STAGE47_TALLY) delete v7.tally[k];
  for (const b of Object.values(v7.buildings)) delete b.orders;
  delete v7.mapParams.land;
  v7.version = 7;
  return { v7, granaryId: granary.id };
}

// A flat test world: a classic seed with a strip of dry desert, so a tile can be set to any ground by hand.
function flatWorld() {
  const w = createWorld({ seed: 4 });
  w.milestone = 'market_town';                                   // walls unlock here
  return w;
}

describe('s47 contract world v8', () => {
  it('creates a version 8 world: no oases, no carts, the new tallies at 0, every store with empty orders', () => {
    const w = createWorld({ seed: 4 });
    expect([WORLD_VERSION, w.version, CURRENT_VERSION]).toEqual([8, 8, 8]);
    expect(Object.keys(w).sort()).toEqual([...REQUIRED].sort());
    for (const k of NEW_KEYS) expect(REQUIRED).toContain(k);
    expect([w.oases, w.carts]).toEqual([[], []]);
    expect(STAGE47_TALLY).toEqual(S47_TALLY);
    for (const k of S47_TALLY) { expect([k, w.tally[k]]).toEqual([k, 0]); expect(TALLY_KEYS).toContain(k); }
    expect(new Set(TALLY_KEYS).size).toBe(TALLY_KEYS.length);
    expect(w.tally).toEqual(newTally());
    expect([makeBuilding(w, 'granary', 2, 2).orders, makeBuilding(w, 'storehouse', 2, 2).orders]).toEqual([{}, {}]);
    expect(['house', 'well', 'potter'].map((t) => 'orders' in makeBuilding(w, t, 2, 2))).toEqual([false, false, false]);
    expect(validateWorld(JSON.parse(serialize(w)))).toBe(true);
  });

  it('checks the oases, the carts and the orders', () => {
    const bad = (fn) => {
      const w = createWorld({ seed: 3 });
      const s = insertBuilding(w, makeBuilding(w, 'storehouse', 5, 5));
      const o = JSON.parse(serialize(w));
      fn(o, s.id);
      return validateWorld(o);
    };
    const cart = { id: 9, from: 4, to: 9, good: 'pottery', amount: 20, len: 34, left: 10, turn: 15, due: 20, state: 'out' };
    expect(bad(() => {})).toBe(true);
    expect(bad((o, id) => { o.buildings[id].orders = { pottery: { fetch: 100 } }; o.carts = [cart]; o.oases = [{ x: 3, y: 4, r: 2 }]; })).toBe(true);
    expect(CART_STATES).toEqual(['out', 'back', 'return']);
    expect([
      bad((o) => { delete o.oases; }), bad((o) => { o.oases = [{ x: 1.5, y: 2, r: 1 }]; }), bad((o) => { o.carts = {}; }),
      bad((o) => { o.carts = [{ ...cart, state: 'lost' }]; }), bad((o) => { o.carts = [{ ...cart, amount: -1 }]; }),
      bad((o, id) => { delete o.buildings[id].orders; }), bad((o, id) => { o.buildings[id].orders = { grain: { fetch: 10 } }; }),
      bad((o, id) => { o.buildings[id].orders = { pottery: { fetch: -5 } }; }), bad((o, id) => { o.buildings[id].orders = { pottery: 40 }; }),
    ]).toEqual([false, false, false, false, false, false, false, false, false]);
  });

  it('migrates 7 to 8: the map kept exactly (terrain and mapParams untouched), stores given empty orders, no oases or carts, tallies at 0', () => {
    const { v7, granaryId } = v7City();
    const before = JSON.stringify(v7);
    const v8 = MIGRATIONS[7](v7);
    expect(JSON.stringify(v7)).toBe(before);                                         // the migration copies, never edits the save
    expect(v8.version).toBe(8);
    expect(Object.keys(v8).sort()).toEqual([...REQUIRED].sort());
    expect([v8.terrain, v8.mapParams, v8.mapSize, v8.size]).toEqual([v7.terrain, v7.mapParams, 64, 64]);
    expect([v8.oases, v8.carts]).toEqual([[], []]);
    expect(v8.buildings[granaryId].orders).toEqual({});
    for (const k of S47_TALLY) expect([k, v8.tally[k]]).toEqual([k, 0]);
    for (const k of STAGE46_TALLY) expect([k, v8.tally[k]]).toEqual([k, v7.tally[k]]);
    for (const b of Object.values(v8.buildings)) if (b.id !== granaryId) expect(b).toEqual(v7.buildings[b.id]);
    expect(validateWorld(v8)).toBe(true);
    expect(deserialize(JSON.stringify(v7)).version).toBe(8);                          // loading runs the chain
  });

  it('keeps an old city off the new land: a Stage 4.6 map of a varied layout migrates without the land key', () => {
    const { v7 } = v7City({ seed: 21, mapVariant: 'wide-bends' });
    expect(Object.keys(v7.mapParams).length).toBeGreaterThan(0);                    // Stage 4.6 shape choices
    for (let i = 0; i < v7.terrain.length; i++) if (v7.terrain[i] === T.HILLS) v7.terrain[i] = T.ROCKY;   // a city made before version 8 has no hills (the helper's map is a new one)
    const v8 = MIGRATIONS[7](v7);
    expect([v8.mapParams, v8.terrain, hasNewLand(v8)]).toEqual([v7.mapParams, v7.terrain, false]);
    expect(v8.terrain.includes(T.HILLS)).toBe(false);
  });
});

describe('s47 contract new land gate', () => {
  it('gives every new map but classic at Normal the land key; classic at Normal keeps params {} and no oases', () => {
    const m = generateMap(5, 64, 'classic');
    expect([m.params, m.oases]).toEqual([{}, []]);
    expect(hasNewLand(createWorld({ seed: 5 }))).toBe(false);
    for (const v of MAP_VARIANTS) {
      for (const size of [48, 64, 80]) {
        const want = !(v === 'classic' && size === 64);
        expect([v, size, newLandFor(v, size), generateMap(5, size, v).params.land === LAND_VERSION]).toEqual([v, size, want, want]);
      }
    }
    const w = createWorld({ seed: 5, size: 80, mapVariant: 'classic' });
    expect([hasNewLand(w), w.mapParams.land, w.oases.length >= 1]).toEqual([true, 1, true]);   // Task 2: a Large map holds 1-3 oases
  });
});

describe('s47 contract passable and buildable', () => {
  it('reads the ground: open land both, water neither, a bridge passable only, hills neither', () => {
    const w = flatWorld();
    const i = idx(w.size, 3, 3);
    const read = (t, road = 0) => { w.terrain[i] = t; w.road[i] = road; return [buildable(w, i), passable(w, i), groundRefusal(w, i)]; };
    expect(T.HILLS).toBe(7);
    expect(read(T.DESERT)).toEqual([true, true, null]);
    expect(read(T.ROCKY)).toEqual([true, true, null]);
    expect(read(T.WATER)).toEqual([false, false, 'water']);
    expect(read(T.WATER, 1)).toEqual([false, true, 'water']);
    expect(read(T.HILLS)).toEqual([false, false, 'hills']);
    expect(reasonText('hills')).toBe('Hills: nothing can be built here');
  });

  it('refuses buildings, roads and walls on hills, and keeps raiders and boats off them', () => {
    const w = flatWorld();
    const { x, y } = w.focus;
    const hx = x + 4, hy = y - 6, i = idx(w.size, hx, hy);
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 3; dx++) { const j = idx(w.size, hx + dx, hy + dy); w.terrain[j] = T.DESERT; w.road[j] = 0; expect(w.occ[j]).toBe(0); }
    expect(canPlace(w, 'house', hx, hy).reason || null).toBe(null);
    expect(tileCost(w, hx, hy)).toBe(1);
    expect(landable(w, hx, hy)).toBe(true);
    w.terrain[i] = T.HILLS;
    expect(canPlace(w, 'house', hx, hy).reason).toBe('hills');
    expect(conditionsFor(w, 'house', hx, hy).conditions[0]).toEqual({ key: 'ground', state: 'cant', reason: 'hills' });
    expect(previewRoadTiles(w, [[hx, hy]]).reason).toBe('hills');
    expect(previewWallTiles(w, [[hx, hy]]).reason).toBe('hills');
    expect(tileCost(w, hx, hy)).toBe(Infinity);
    expect(landable(w, hx, hy)).toBe(false);
    // A raider's field goes round a hill: the search never carries on through the hill tile.
    const field = flowField(w, [[hx + 2, hy]]);
    expect(field.dist[idx(w.size, hx + 1, hy)]).toBe(1);
    expect(field.dist[idx(w.size, hx - 1, hy)]).toBe(5);                            // round the hill (2 + 1 + 2), not through it (3)
  });
});

describe('s47 contract salts and scenes', () => {
  const TABLE = {
    fire: FIRE_SALT, health: HEALTH_SALT, crime: CRIME_SALT, raid: RAID_SALT, remark: { remark: REMARK_SALT },
    map: { variant: MAP.variantSalt, clay: MAP.clay.salt, ...MAP_SALT }, river: RIVER_SALT, court: COURT_SALT, wonders: WONDER_SALT,
    s47: S47_SALT,
  };
  it('registers the Stage 4.7 salts in 4701-4719, unique across the game', () => {
    const all = Object.entries(TABLE).flatMap(([t, o]) => Object.entries(o).map(([k, v]) => [`${t}.${k}`, v]));
    const seen = new Map();
    for (const [name, v] of all) {
      expect([name, Number.isInteger(v)]).toEqual([name, true]);
      if (seen.has(v)) expect([name, v]).toEqual([seen.get(v), 'unique']);
      seen.set(v, name);
    }
    expect(Object.values(S47_SALT).every((v) => v >= 4701 && v <= 4719)).toBe(true);
    for (const k of ['hills', 'oases', 'grass', 'carts']) expect(Object.keys(S47_SALT)).toContain(k);
  });
  it('registers the Stage 4.7 dev scenes (Task 7 adds s47-quota, s47-raid-wealth, s47-estate)', () => {
    expect(STAGE47_SCENES).toEqual(['s47-grass', 's47-oasis', 's47-hills', 's47-house-spots', 's47-carts', 's47-quota', 's47-raid-wealth', 's47-estate']);
  });
});
