import { describe, it, expect } from '../../harness.js';
import {
  createWorld, makeBuilding, WORLD_VERSION, STAGE3_TALLY, newTally, newRaidState, newDangerState,
} from '../../../src/sim/world.js';
import { serialize, deserialize, validateWorld, REQUIRED, TALLY_KEYS } from '../../../src/save/serialize.js';
import { canPlace } from '../../../src/sim/commands.js';
import { makeTestWorld, setRoad } from '../../helpers/testWorld.js';

describe('s3 contract world v4', () => {
  it('creates a version 4 world with no walls, no raid clock, no soldiers, no danger, no splits, seals or feats', () => {
    const w = createWorld({ seed: 4 });
    expect(WORLD_VERSION).toBe(7);
    expect(w.version).toBe(7);
    expect(w.wall.length).toBe(w.size * w.size);
    expect(w.wall.every((v) => v === 0)).toBe(true);
    expect(w.wallVersion).toBe(0);
    expect(w.raid).toEqual({ clockDay: null, nextWarnDay: null, index: 0, warning: null, active: null, adaptation: 1, last: null });
    expect(w.raid).toEqual(newRaidState());
    expect(w.soldiers).toEqual([]);
    expect(w.nextUnitId).toBe(1);
    expect(w.danger).toEqual({ burnDays: [], lastFireDay: null, festivalDay: null, firePaused: false, theftDays: [] });   // Stage 4.5: the days of the last 90 days' thefts
    expect(w.danger).toEqual(newDangerState());
    expect([w.splits, w.seals, w.feats, w.cityId]).toEqual([{}, [], { earned: [], lost: [], counters: {} }, null]);
    expect(JSON.parse(JSON.stringify(w))).toEqual(w);
    expect(Object.keys(w).sort()).toEqual([...REQUIRED].sort());
    expect(validateWorld(JSON.parse(serialize(w)))).toBe(true);
  });
  it('starts every Stage 3 tally at zero, and the save checks each one', () => {
    const w = createWorld({ seed: 4 });
    expect(STAGE3_TALLY).toEqual(['fires', 'blazesOut', 'firesOut', 'burned', 'rubbleCleared', 'raids', 'raidsBeaten', 'raidsLost', 'tributes',
      'raidersByTowers', 'raidersBySoldiers', 'soldiersWounded', 'goldStolen', 'festivals', 'wallTiles']);
    for (const k of STAGE3_TALLY) expect([k, w.tally[k]]).toEqual([k, 0]);
    expect(w.tally).toEqual(newTally());
    for (const k of STAGE3_TALLY) expect(TALLY_KEYS).toContain(k);
  });
  it('takes a city id from the interface, and none for anything that is not a non-empty string', () => {
    expect(createWorld({ seed: 4, cityId: 'k3x9-7' }).cityId).toBe('k3x9-7');
    for (const bad of [undefined, null, '', 7, {}]) expect(createWorld({ seed: 4, cityId: bad }).cityId).toBe(null);
  });
  it('gives each new world its own walls, raid state, soldiers, danger and lists', () => {
    const a = createWorld({ seed: 4 }), b = createWorld({ seed: 4 });
    a.wall[5] = 40; a.raid.index = 2; a.soldiers.push({ id: 1 }); a.danger.burnDays.push(3); a.splits.town = 9; a.seals.push({ day: 1 }); a.feats.earned.push('x');
    expect([b.wall[5], b.raid.index, b.soldiers, b.danger.burnDays, b.splits, b.seals, b.feats.earned]).toEqual([0, 0, [], [], {}, [], []]);
  });
  it('gives every building no fire risk and no fire', () => {
    const w = createWorld({ seed: 4 });
    for (const type of ['house', 'potter', 'firehouse', 'rubble', 'tower']) {
      const b = makeBuilding(w, type, 3, 3);
      expect([type, b.risk, b.fire]).toEqual([type, 0, null]);
    }
  });
  it('never places a wall, a gate or rubble as a building: walls are drawn, rubble is left by fire', () => {
    const w = makeTestWorld();
    setRoad(w, 0, 10, 31, 10);
    w.milestone = 'capital';
    expect(canPlace(w, 'wall', 12, 9).reason).toBe('unknown');
    expect(canPlace(w, 'gate', 12, 9).reason).toBe('unknown');
    expect(canPlace(w, 'rubble', 12, 9).reason).toBe('unknown');
    expect(canPlace(w, 'tower', 12, 9).ok).toBe(true);
    w.milestone = 'town';
    expect(canPlace(w, 'wall', 12, 9).reason).toBe('locked');                         // before Market town it is locked first
    expect(canPlace(w, 'firehouse', 12, 9).ok).toBe(true);                            // the firehouse comes with the Village
  });
  it('round-trips a world with walls, a raid, soldiers, fires, splits, seals and feats', () => {
    const w = createWorld({ seed: 6, cityId: 'abc' });
    w.wall[10] = 40; w.wall[11] = -1; w.wallVersion = 2;
    w.raid = { ...newRaidState(), clockDay: 30, nextWarnDay: 750, index: 1, adaptation: 0.8,
      warning: { index: 1, entry: { x: 63, y: 32 }, dir: 'east', size: 4, tribute: 240, target: 'storehouse', day: 760, arrives: 850, first: false } };
    w.soldiers.push({ id: 3, barracks: 9, x: 4.5, y: 6, hp: 12, hit: false, task: 'wait' });
    w.nextUnitId = 4;
    w.danger.burnDays.push(100, 140); w.danger.lastFireDay = 140; w.danger.festivalDay = 90; w.danger.firePaused = true;
    w.splits = { town: 400, market_town: 700 };
    w.seals.push({ day: 800, score: 240, parts: { people: 60, prosperity: 60, culture: 60, safety: 60 }, version: 1 });
    w.feats = { earned: ['swift_town'], lost: ['grain_alone'], counters: { fedMonths: 3 } };
    expect(deserialize(serialize(w))).toEqual(w);
  });
});
