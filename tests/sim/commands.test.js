import { describe, it, expect } from '../harness.js';
import { canPlace, conditionsFor, place, demolishAt, setPaused, setSpeed } from '../../src/sim/commands.js';
import { buildingAt } from '../../src/sim/world.js';
import { undo } from '../../src/sim/undo.js';
import { idx } from '../../src/sim/grid.js';
import { makeTestWorld, setRoad } from '../helpers/testWorld.js';

describe('commands: place', () => {
  it('places a building, charges for it and records undo', () => {
    const w = makeTestWorld({ gold: 1000 });
    setRoad(w, 0, 10, 31, 10);
    const r = place(w, 'temple', 12, 8);
    expect(r.ok).toBe(true);
    expect(buildingAt(w, 13, 9).id).toBe(r.id);
    expect(w.gold).toBe(880);
    expect(w.undo.length).toBe(1);
  });
  it('refuses overlapping, off-map, water and roadless placements with reasons', () => {
    const w = makeTestWorld();
    setRoad(w, 0, 10, 31, 10);
    place(w, 'temple', 12, 8);
    expect(canPlace(w, 'well', 13, 9).reason).toBe('occupied');
    expect(canPlace(w, 'well', 5, 10).reason).toBe('occupied');
    expect(canPlace(w, 'temple', 31, 9).reason).toBe('out_of_bounds');
    expect(canPlace(w, 'well', 20, 20).reason).toBe('needs_road');
    w.terrain[idx(w.size, 20, 11)] = 3;
    expect(canPlace(w, 'well', 20, 11).reason).toBe('water');
  });
  it('requires fertile land for farms', () => {
    const w = makeTestWorld();
    setRoad(w, 0, 10, 31, 10);
    expect(canPlace(w, 'farm_grain', 2, 8).ok).toBe(true);
    expect(canPlace(w, 'farm_grain', 12, 8).reason).toBe('needs_fertile');
  });
  it('refuses when the debt floor would be crossed', () => {
    const w = makeTestWorld({ gold: -450 });
    setRoad(w, 0, 10, 31, 10);
    expect(canPlace(w, 'temple', 12, 8).reason).toBe('no_gold');
  });
  it('lets house plots go down without a road, with a warning', () => {
    const w = makeTestWorld();
    const r = canPlace(w, 'house', 20, 20);
    expect(r.ok).toBe(true);
    expect(r.warnings).toContain('needs_road');
  });
  it('warns about missing storage and supply', () => {
    const w = makeTestWorld();
    setRoad(w, 0, 10, 31, 10);
    expect(canPlace(w, 'farm_grain', 2, 8).warnings).toContain('no_storage');
    expect(canPlace(w, 'bazaar', 14, 8).warnings).toContain('no_supply');
    place(w, 'granary', 5, 8);
    expect(canPlace(w, 'farm_grain', 2, 8).warnings).toEqual([]);
  });
  it('refuses locked buildings', () => {
    const w = makeTestWorld();
    w.milestone = 'nowhere';
    expect(canPlace(w, 'well', 1, 1).reason).toBe('locked');
  });
  it('rejects non-integer coordinates so no ghost tiles reach the save', () => {
    const w = makeTestWorld({ gold: 1000 });
    expect(place(w, 'house', 2.5, 3).reason).toBe('out_of_bounds');
    expect(place(w, 'house', 2, 3.5).reason).toBe('out_of_bounds');
    expect(place(w, 'house', NaN, 3).reason).toBe('out_of_bounds');
    expect(Object.keys(w.occ).length).toBe(w.size * w.size);
    expect(Object.keys(w.buildings).length).toBe(0);
    expect(w.gold).toBe(1000);
  });
});

describe('commands: road later (rulings P10, P11)', () => {
  it('lets the player place a building that only lacks a road, with a needs_road warning', () => {
    const w = makeTestWorld({ gold: 1000 });
    expect(canPlace(w, 'well', 20, 20).reason).toBe('needs_road');                        // the default stays strict
    expect(canPlace(w, 'well', 20, 20, { roadLater: false }).reason).toBe('needs_road');
    const c = canPlace(w, 'well', 20, 20, { roadLater: true });
    expect(c.ok).toBe(true);
    expect(c.warnings).toEqual(['needs_road']);
    expect(canPlace(w, 'farm_grain', 2, 20, { roadLater: true }).warnings).toEqual(['needs_road', 'no_storage']);
  });
  it('still refuses ground, terrain and gold with road later', () => {
    const w = makeTestWorld({ gold: 1000 });
    place(w, 'house', 20, 20);
    expect(canPlace(w, 'well', 20, 20, { roadLater: true }).reason).toBe('occupied');
    expect(canPlace(w, 'farm_grain', 12, 20, { roadLater: true }).reason).toBe('needs_fertile');
    expect(canPlace(w, 'farm_grain', 7, 20, { roadLater: true }).reason).toBe('needs_fertile');   // half on the loam
    expect(canPlace(w, 'well', 1.5, 20, { roadLater: true }).reason).toBe('out_of_bounds');
    w.gold = -450;
    expect(canPlace(w, 'temple', 12, 20, { roadLater: true }).reason).toBe('no_gold');
  });
  it('places it with road later, charges for it and undo refunds it', () => {
    const w = makeTestWorld({ gold: 1000 });
    expect(place(w, 'well', 20, 20).reason).toBe('needs_road');
    expect(w.gold).toBe(1000);
    const r = place(w, 'well', 20, 20, { roadLater: true });
    expect(r.ok).toBe(true);
    expect(r.warnings).toEqual(['needs_road']);
    expect(buildingAt(w, 20, 20).id).toBe(r.id);
    expect(w.gold).toBe(970);
    undo(w);
    expect(buildingAt(w, 20, 20)).toBeFalsy();
    expect(w.gold).toBe(1000);
  });
  it('keeps the plot warning and gives buildings next to a road no road warning', () => {
    const w = makeTestWorld({ gold: 1000 });
    setRoad(w, 0, 10, 31, 10);
    expect(canPlace(w, 'house', 20, 20, { roadLater: true }).warnings).toEqual(['needs_road']);
    expect(canPlace(w, 'well', 20, 11, { roadLater: true }).warnings).toEqual([]);
    expect(canPlace(w, 'garden', 20, 20, { roadLater: true }).warnings).toEqual([]);           // gardens need no road
  });
});

describe('commands: conditionsFor (ruling P9)', () => {
  const byKey = (c) => Object.fromEntries(c.conditions.map((x) => [x.key, x]));
  it('shows every condition of a farm at once: terrain counted per tile, road, works and gold', () => {
    const w = makeTestWorld({ gold: 1000 });
    const c = conditionsFor(w, 'farm_grain', 7, 20);                  // x 7 is loam, x 8 is sand; no road anywhere
    expect(c.ok).toBe(false);
    expect(c.reason).toBe('needs_fertile');
    expect(c.state).toBe('cant');
    expect(c.conditions.map((x) => x.key)).toEqual(['ground', 'road', 'works', 'gold']);
    const k = byKey(c);
    expect(k.ground).toEqual({ key: 'ground', state: 'cant', reason: 'needs_fertile', terrain: 'fertile', fit: 2, of: 4 });
    expect(k.road.state).toBe('cant');
    expect(k.road.reason).toBe('needs_road');
    expect(k.works).toEqual({ key: 'works', state: 'later', reason: 'no_storage' });
    expect(k.gold).toEqual({ key: 'gold', state: 'met', reason: null, cost: 60, have: 1000 });
    expect(c.tiles).toEqual([
      { x: 7, y: 20, state: 'met', reason: null }, { x: 8, y: 20, state: 'cant', reason: 'needs_fertile' },
      { x: 7, y: 21, state: 'met', reason: null }, { x: 8, y: 21, state: 'cant', reason: 'needs_fertile' },
    ]);
  });
  it('makes the road "later" with road later, and names the free tiles where a road would join', () => {
    const w = makeTestWorld({ gold: 1000 });
    place(w, 'house', 2, 19);                                         // one tile above the farm is taken
    w.terrain[idx(w.size, 0, 20)] = 3;                                 // one tile to its left is water
    const c = conditionsFor(w, 'farm_grain', 1, 20, { roadLater: true });
    expect(c.ok).toBe(true);
    expect(c.reason).toBe(null);
    expect(c.state).toBe('later');
    expect(c.warnings).toEqual(['needs_road', 'no_storage']);
    const road = byKey(c).road;
    expect(road.state).toBe('later');
    expect(road.reason).toBe('needs_road');
    const joins = road.joins.map(([x, y]) => `${x},${y}`).sort();
    expect(joins).toEqual(['0,21', '1,19', '1,22', '2,22', '3,20', '3,21'].sort());
    expect(byKey(c).ground).toEqual({ key: 'ground', state: 'met', reason: null, terrain: 'fertile', fit: 4, of: 4 });
  });
  it('is all met for a building on a road with its store in reach', () => {
    const w = makeTestWorld({ gold: 1000 });
    setRoad(w, 0, 10, 31, 10);
    place(w, 'granary', 5, 8);
    const c = conditionsFor(w, 'farm_grain', 2, 8);
    expect(c.state).toBe('ok');
    expect(c.ok).toBe(true);
    expect(c.warnings).toEqual([]);
    expect(c.conditions.every((x) => x.state === 'met')).toBe(true);
    expect(byKey(c).road).toEqual({ key: 'road', state: 'met', reason: null, joins: [] });
    expect(byKey(c).ground).toEqual({ key: 'ground', state: 'met', reason: null, terrain: 'fertile', fit: 4, of: 4 });
  });
  it('gives a well free ground and no works, a plot a road that is always later, a garden no road', () => {
    const w = makeTestWorld({ gold: 1000 });
    expect(conditionsFor(w, 'well', 20, 20).conditions.map((x) => x.key)).toEqual(['ground', 'road', 'gold']);
    expect(byKey(conditionsFor(w, 'well', 20, 20)).ground).toEqual({ key: 'ground', state: 'met', reason: null });
    const plot = conditionsFor(w, 'house', 20, 20);
    expect(plot.state).toBe('later');
    expect(byKey(plot).road.state).toBe('later');
    expect(conditionsFor(w, 'garden', 20, 20).conditions.map((x) => x.key)).toEqual(['ground', 'gold']);
    expect(byKey(conditionsFor(w, 'bazaar', 20, 20, { roadLater: true })).works).toEqual({ key: 'works', state: 'later', reason: 'no_supply' });
  });
  it('marks gold "can\'t" when short, beside the other conditions', () => {
    const w = makeTestWorld({ gold: -490 });
    const c = conditionsFor(w, 'well', 20, 20, { roadLater: true });
    expect(c.reason).toBe('no_gold');
    expect(byKey(c).gold).toEqual({ key: 'gold', state: 'cant', reason: 'no_gold', cost: 30, have: -490 });
    expect(byKey(c).road.state).toBe('later');
  });
  it('refuses before any tile for locked, unknown and fractional spots, with no conditions', () => {
    const w = makeTestWorld();
    expect(conditionsFor(w, 'gate', 1, 1)).toEqual({ ok: false, reason: 'unknown', warnings: [], state: 'cant', conditions: [], tiles: [] });
    expect(conditionsFor(w, 'well', 1.5, 1).reason).toBe('out_of_bounds');
    w.milestone = 'nowhere';
    expect(conditionsFor(w, 'well', 1, 1).reason).toBe('locked');
  });
  it('tells off-map tiles apart and agrees with canPlace everywhere, with and without road later', () => {
    const w = makeTestWorld({ gold: 1000 });
    setRoad(w, 0, 10, 31, 10);
    place(w, 'granary', 5, 8);
    place(w, 'temple', 12, 8);
    w.terrain[idx(w.size, 20, 12)] = 3;
    const edge = conditionsFor(w, 'temple', 31, 9);
    expect(edge.reason).toBe('out_of_bounds');
    expect(edge.tiles.filter((t) => t.reason === 'out_of_bounds').length).toBe(2);
    for (const type of ['well', 'farm_grain', 'temple', 'bazaar', 'house', 'garden']) {
      for (let y = 5; y < 15; y++) for (let x = 0; x < 32; x += 3) {
        for (const roadLater of [false, true]) {
          const a = canPlace(w, type, x, y, { roadLater });
          const c = conditionsFor(w, type, x, y, { roadLater });
          expect(`${type} ${x},${y} ${roadLater} ${c.ok} ${c.reason || null} ${c.warnings}`)
            .toBe(`${type} ${x},${y} ${roadLater} ${a.ok} ${a.reason || null} ${a.warnings}`);
        }
      }
    }
  });
});

describe('commands: demolish, pause, speed', () => {
  it('demolishes with a 25% refund and undo restores it', () => {
    const w = makeTestWorld({ gold: 1000 });
    setRoad(w, 0, 10, 31, 10);
    place(w, 'temple', 12, 8);
    const r = demolishAt(w, 12, 8);
    expect(r.ok).toBe(true);
    expect(r.refund).toBe(30);
    expect(w.gold).toBe(910);
    undo(w);
    expect(buildingAt(w, 12, 8).type).toBe('temple');
    expect(w.gold).toBe(880);
  });
  it('demolishes roads for free and reports empty tiles', () => {
    const w = makeTestWorld();
    setRoad(w, 0, 10, 31, 10);
    expect(demolishAt(w, 3, 10).refund).toBe(0);
    expect(w.road[idx(w.size, 3, 10)]).toBe(0);
    expect(demolishAt(w, 3, 3).reason).toBe('nothing_here');
  });
  it('bumps roadVersion when a road is demolished and undo restores the road', () => {
    const w = makeTestWorld();
    setRoad(w, 0, 10, 31, 10);
    const before = w.roadVersion;
    demolishAt(w, 3, 10);
    expect(w.roadVersion).toBeGreaterThan(before);
    undo(w);
    expect(w.road[idx(w.size, 3, 10)]).toBe(1);
  });
  it('rejects non-integer demolish coordinates', () => {
    const w = makeTestWorld();
    setRoad(w, 0, 10, 31, 10);
    expect(demolishAt(w, 3.5, 10).reason).toBe('out_of_bounds');
    expect(demolishAt(w, 3, 10.5).reason).toBe('out_of_bounds');
    expect(w.road[idx(w.size, 3, 10)]).toBe(1);
  });
  it('refunds nothing for a demolished housing plot', () => {
    const w = makeTestWorld({ gold: 1000 });
    place(w, 'house', 20, 20);
    const r = demolishAt(w, 20, 20);
    expect(r.refund).toBe(0);
  });
  it('refuses to pause a housing plot, which has no staff and no upkeep to save', () => {
    const w = makeTestWorld({ gold: 1000 });
    const { id } = place(w, 'house', 20, 20);
    const r = setPaused(w, id, true);
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('not_pausable');
    expect(w.buildings[id].paused).toBe(false);
  });
  it('still pauses an unstaffed building that costs upkeep, such as a well', () => {
    const w = makeTestWorld({ gold: 1000 });
    setRoad(w, 0, 10, 31, 10);
    const { id } = place(w, 'well', 12, 9);
    expect(setPaused(w, id, true).ok).toBe(true);
    expect(w.buildings[id].paused).toBe(true);
    expect(setPaused(w, id, false).ok).toBe(true);
    expect(w.buildings[id].paused).toBe(false);
  });
  it('reports nothing_here when pausing a building that does not exist', () => {
    expect(setPaused(makeTestWorld(), 999, true).reason).toBe('nothing_here');
  });
  it('pauses buildings and sets speed', () => {
    const w = makeTestWorld();
    setRoad(w, 0, 10, 31, 10);
    const { id } = place(w, 'temple', 12, 8);
    w.buildings[id].staff = 6;
    setPaused(w, id, true);
    expect(w.buildings[id].paused).toBe(true);
    expect(w.buildings[id].staff).toBe(0);
    expect(setSpeed(w, 3).ok).toBe(true);
    expect(w.speed).toBe(3);
    expect(setSpeed(w, 5).reason).toBe('bad_speed');
  });
});
