import { describe, it, expect } from '../harness.js';
import { canPlace, place, demolishAt, setPaused, setSpeed } from '../../src/sim/commands.js';
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
  it('refunds nothing for a demolished housing plot', () => {
    const w = makeTestWorld({ gold: 1000 });
    place(w, 'house', 20, 20);
    const r = demolishAt(w, 20, 20);
    expect(r.refund).toBe(0);
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
