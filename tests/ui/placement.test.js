import { describe, it, expect } from '../harness.js';
import { createPlacement, snapGhost, toolPreview, ghostsFor } from '../../src/ui/placement.js';
import { createStore, INITIAL_UI_STATE } from '../../src/ui/store.js';
import { reasonText, T } from '../../src/ui/text.js';
import { BUILDINGS } from '../../src/data/buildings.js';
import { housesOf, allBuildings } from '../../src/sim/world.js';
import { makeTestWorld, setRoad } from '../helpers/testWorld.js';

function rig() {
  const world = makeTestWorld({ gold: 1000 });    // fertile land on x < 8, every row
  setRoad(world, 0, 10, 31, 10);
  const store = createStore(INITIAL_UI_STATE);
  const log = [];
  const pl = createPlacement({ world, store, afterCommand: (e) => log.push(e.kind), effects: { puff: () => log.push('puff'), rise: () => log.push('rise') }, now: () => 0 });
  return { world, store, pl, log };
}

describe('ui placement', () => {
  it('starts a building tool with a snapped ghost and the matching overlay', () => {
    const { world, store, pl } = rig();
    pl.start({ kind: 'building', type: 'well' }, { x: 40, y: -2 });
    expect(store.get().mode).toBe('placing');
    expect(store.get().ghost).toEqual({ x: 31, y: 9 });           // snapped onto the map, then down to the nearest tile where it fits
    expect(store.get().overlay).toBe('water');
    expect(snapGhost(world, { kind: 'building', type: 'temple' }, 31, 31)).toEqual({ x: 30, y: 30 });
    pl.moveGhost(5, 9);
    expect(pl.preview().state).toBe('ok');
    pl.moveGhost(5, 20);
    const p = pl.preview();
    expect(p.state).toBe('bad');
    expect(p.text).toBe(reasonText('needs_road'));
    expect(ghostsFor(world, store.get())).toEqual([{ x: 5, y: 20, w: 1, d: 1, state: 'bad' }]);
  });
  it('warns when a farm has no granary in reach, and places it on confirm', () => {
    const { world, store, pl, log } = rig();
    pl.start({ kind: 'building', type: 'farm_grain' }, { x: 2, y: 8 });
    const p = pl.preview();
    expect(p.state).toBe('warn');
    expect(p.warnings).toEqual(['no_storage']);
    expect(p.cost).toBe(BUILDINGS.farm_grain.cost);
    expect(ghostsFor(world, store.get())[0]).toEqual({ x: 2, y: 8, w: 2, d: 2, state: 'warn' });
    const gold = world.gold;
    expect(pl.confirm().ok).toBe(true);
    expect(allBuildings(world).some((b) => b.type === 'farm_grain' && b.x === 2 && b.y === 8)).toBe(true);
    expect(world.gold).toBe(gold - BUILDINGS.farm_grain.cost);
    expect(log).toEqual(['puff', 'rise', 'building']);
    expect(store.get().mode).toBe('placing');
    expect(store.get().ghost).toEqual({ x: 2, y: 8 });
    expect(pl.preview().state).toBe('bad');     // the spot is taken now
  });
  it('draws a road from two taps, flips the corner, and lays it', () => {
    const { world, store, pl, log } = rig();
    pl.start({ kind: 'road' });
    expect(store.get().mode).toBe('drawing');
    expect(pl.preview().text).toBe(T.tapStart);
    pl.pointAt(10, 12);
    expect(pl.preview().text).toBe(T.tapEnd);
    expect(pl.preview().tiles).toEqual([[10, 12]]);
    pl.pointAt(14, 14);
    let p = pl.preview();
    expect(p.state).toBe('ok');
    expect(p.count).toBe(7);
    expect(p.cost).toBe(14);
    expect(p.tiles[1]).toEqual([11, 12]);
    pl.flip();
    p = pl.preview();
    expect(p.tiles[1]).toEqual([10, 13]);
    expect(pl.confirm().ok).toBe(true);
    expect(world.road[13 * 32 + 10]).toBe(1);
    expect(store.get().line).toBe(null);
    expect(log).toEqual(['puff', 'road']);
  });
  it('paints plots in a rectangle, then demolishes them again', () => {
    const { world, store, pl, log } = rig();
    pl.start({ kind: 'houses' });
    pl.pointAt(12, 11);
    expect(pl.preview().text).toBe(T.tapCorner);
    pl.pointAt(14, 11);
    let p = pl.preview();
    expect(p.state).toBe('ok');
    expect(p.count).toBe(3);
    expect(p.cost).toBe(3 * BUILDINGS.house.cost);
    expect(pl.confirm().ok).toBe(true);
    expect(housesOf(world).length).toBe(3);
    expect(store.get().area).toBe(null);
    pl.start({ kind: 'demolish' });
    expect(store.get().mode).toBe('demolishing');
    pl.pointAt(12, 11);
    pl.pointAt(14, 11);
    p = pl.preview();
    expect(p.state).toBe('ok');
    expect(p.count).toBe(3);
    expect(p.refund).toBe(0);
    expect(ghostsFor(world, store.get()).map((g) => g.state)).toEqual(['demolish', 'demolish', 'demolish']);
    expect(pl.confirm().ok).toBe(true);
    expect(housesOf(world).length).toBe(0);
    expect(log).toEqual(['puff', 'houses', 'puff', 'demolish']);
  });
  it('drags a line with the mouse and demolishes a single tile', () => {
    const { world, store, pl } = rig();
    pl.start({ kind: 'houses' });
    pl.dragTo(12, 11, 'start');
    pl.dragTo(13, 11, 'move');
    expect(store.get().area).toEqual({ x0: 12, y0: 11, x1: 13, y1: 11 });
    expect(pl.preview().count).toBe(2);
    pl.confirm();
    expect(pl.demolishOne(12, 11).ok).toBe(true);
    expect(housesOf(world).length).toBe(1);
    expect(pl.demolishOne(20, 20).ok).toBe(false);
  });
  it('undoes with a full refund and asks first when people live there', () => {
    const { world, store, pl } = rig();
    pl.start({ kind: 'houses' });
    pl.pointAt(12, 11); pl.pointAt(13, 11);
    const gold = world.gold;
    pl.confirm();
    expect(pl.canUndo()).toBe(true);
    expect(pl.undoNeedsConfirm()).toBe(false);
    housesOf(world)[0].residents = 5;
    housesOf(world)[0].tier = 1;
    expect(pl.undoNeedsConfirm()).toBe(true);
    expect(pl.undo().ok).toBe(true);
    expect(housesOf(world).length).toBe(0);
    expect(world.gold).toBe(gold);
    expect(pl.canUndo()).toBe(false);
    pl.cancel();
    expect(store.get().mode).toBe('browse');
    expect(toolPreview(world, store.get())).toBe(null);
  });
});
