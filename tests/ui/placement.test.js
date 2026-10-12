import { describe, it, expect } from '../harness.js';
import { createPlacement, snapGhost, toolPreview, ghostsFor, fourWaySteps } from '../../src/ui/placement.js';
import { createStore, INITIAL_UI_STATE } from '../../src/ui/store.js';
import { reasonText, T, CONDITION_TEXT, DRAW_TEXT } from '../../src/ui/text.js';
import { BUILDINGS } from '../../src/data/buildings.js';
import { housesOf, allBuildings, buildingAt } from '../../src/sim/world.js';
import { makeTestWorld, setRoad } from '../helpers/testWorld.js';

function rig(inputType = 'touch') {
  const world = makeTestWorld({ gold: 1000 });    // fertile land on x < 8, every row
  setRoad(world, 0, 10, 31, 10);
  const store = createStore({ ...INITIAL_UI_STATE, inputType });
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
    let p = pl.preview();
    expect(p.state).toBe('warn');                                    // no road touches it: it can be placed, in amber, and waits for one (P10)
    expect(p.warnings).toEqual(['needs_road']);
    expect(p.text).toBe(CONDITION_TEXT.roadHint);
    expect(ghostsFor(world, store.get())).toEqual([{ x: 5, y: 20, w: 1, d: 1, state: 'warn', badge: true, joins: [[5, 19], [5, 21], [4, 20], [6, 20]] }]);
    pl.moveGhost(12, 10);                                            // on the road itself: the ground is taken, which no road will change
    p = pl.preview();
    expect(p.state).toBe('bad');
    expect(p.text).toBe(reasonText('occupied'));
    expect(ghostsFor(world, store.get())).toEqual([{ x: 12, y: 10, w: 1, d: 1, state: 'bad', badge: true }]);
  });
  it('judges each condition of a building on its own, and marks each footprint tile on its own', () => {
    const { world, store, pl } = rig();
    pl.start({ kind: 'building', type: 'farm_grain' }, { x: 2, y: 8 });
    pl.moveGhost(7, 8);                                              // fertile land ends at x = 7: two tiles of four are sand
    const p = pl.preview();
    expect(p.state).toBe('bad');
    expect(p.text).toBe(reasonText('needs_fertile'));
    expect(p.conditions.map((c) => [c.key, c.state, c.text])).toEqual([
      ['ground', 'cant', 'Fertile land: 2 of 4 tiles'], ['road', 'met', 'Road beside it'], ['works', 'later', 'No granary near'],
    ]);
    expect(p.conditions.map((c) => c.mark).join('')).toBe('✕✓!');
    expect(p.conditions[0].label).toBe("Can't: Fertile land: 2 of 4 tiles");
    expect(p.joins).toEqual([]);                                     // the road is already there, and the spot is not fit to build on
    const [ghost] = ghostsFor(world, store.get());
    expect(ghost.tiles.map((t) => `${t.x},${t.y}:${t.state}`).sort()).toEqual(['7,8:met', '7,9:met', '8,8:cant', '8,9:cant']);
    pl.moveGhost(6, 8);                                              // all four tiles fertile: the whole ghost is one state again
    expect(ghostsFor(world, store.get())[0].tiles).toBe(undefined);
    expect(pl.preview().conditions.map((c) => [c.key, c.state, c.text])).toEqual([
      ['ground', 'met', 'Fertile land'], ['road', 'met', 'Road beside it'], ['works', 'later', 'No granary near'],
    ]);
    pl.moveGhost(20, 2);                                             // all sand and no road: every tile is wrong, so the whole ghost is
    expect(ghostsFor(world, store.get())[0].tiles).toBe(undefined);
    expect(pl.preview().conditions.map((c) => [c.key, c.state])).toEqual([['ground', 'cant'], ['road', 'later'], ['works', 'later']]);
  });
  it('shows the gold chip only when the treasury is short, and the road chip with the tiles a road would join', () => {
    const { world, pl } = rig();
    pl.start({ kind: 'building', type: 'well' }, { x: 5, y: 9 });
    expect(pl.preview().conditions.map((c) => c.key)).toEqual(['ground', 'road']);
    world.gold = -495;                                               // paying would cross the debt floor
    const p = pl.preview();
    expect(p.state).toBe('bad');
    expect(p.conditions.map((c) => [c.key, c.state])).toEqual([['ground', 'met'], ['road', 'met'], ['gold', 'cant']]);
    expect(p.conditions[2].text).toBe(CONDITION_TEXT.goldShort(30, -495));
    world.gold = 1000;
    pl.moveGhost(5, 20);
    expect(pl.preview().conditions.map((c) => [c.key, c.state, c.text])).toEqual([['ground', 'met', 'Free ground'], ['road', 'later', 'No road yet']]);
    expect(pl.preview().joins.length).toBe(4);
  });
  it('warns when a farm has no granary in reach, and places it on confirm', () => {
    const { world, store, pl, log } = rig();
    pl.start({ kind: 'building', type: 'farm_grain' }, { x: 2, y: 8 });
    const p = pl.preview();
    expect(p.state).toBe('warn');
    expect(p.warnings).toEqual(['no_storage']);
    expect(p.cost).toBe(BUILDINGS.farm_grain.cost);
    expect(ghostsFor(world, store.get())[0]).toEqual({ x: 2, y: 8, w: 2, d: 2, state: 'warn', badge: true });
    const gold = world.gold;
    expect(pl.confirm().ok).toBe(true);
    expect(allBuildings(world).some((b) => b.type === 'farm_grain' && b.x === 2 && b.y === 8)).toBe(true);
    expect(world.gold).toBe(gold - BUILDINGS.farm_grain.cost);
    expect(log).toEqual(['puff', 'rise', 'building']);
    expect(store.get().mode).toBe('placing');
    expect(store.get().ghost).toEqual({ x: 2, y: 8 });
    expect(pl.preview().state).toBe('bad');     // the spot is taken now
  });
  it('draws a road from two clicks, flips the corner, and lays it', () => {
    const { world, store, pl, log } = rig('mouse');
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
  it('says how to draw with a finger, follows it tile by tile, fills a skipped gap and takes back a step back (P3)', () => {
    const { store, pl } = rig();
    pl.start({ kind: 'road' });
    expect(pl.preview().text).toBe(DRAW_TEXT.idle);
    expect(pl.preview().state).toBe('idle');
    pl.stroke(10, 12, 'start');
    pl.stroke(11, 12, 'move');
    pl.stroke(14, 13, 'move');                                       // a quick finger: the gap is filled along x, then y
    expect(store.get().plan.tiles).toEqual([[10, 12], [11, 12], [12, 12], [13, 12], [14, 12], [14, 13]]);
    pl.stroke(14, 12, 'move');                                       // back over the last tile takes it off ...
    pl.stroke(13, 12, 'move');                                       // ... and the one before
    expect(store.get().plan.tiles).toEqual([[10, 12], [11, 12], [12, 12], [13, 12]]);
    pl.stroke(13, 14, 'end');
    expect(store.get().plan.tiles).toEqual([[10, 12], [11, 12], [12, 12], [13, 12], [13, 13], [13, 14]]);
    const p = pl.preview();
    expect([p.state, p.count, p.cost, p.text]).toEqual(['ok', 6, 12, '6 tiles']);
    expect(store.get().line).toBe(null);
    expect(fourWaySteps(0, 0, 1, 3)).toEqual([[0, 1], [0, 2], [0, 3], [1, 3]]);   // more down than across: down first
  });
  it('adds strokes and taps up into one plan, skips blocked tiles with a count, and lays it as one undo entry (P3, P5)', () => {
    const { world, store, pl, log } = rig();
    pl.start({ kind: 'building', type: 'well' });
    pl.moveGhost(13, 11);
    pl.confirm();
    pl.start({ kind: 'road' });
    pl.stroke(11, 11, 'start');
    pl.stroke(15, 11, 'end');                                        // across the well at (13, 11)
    pl.toggleTile(20, 12);                                           // a tap adds a tile ...
    pl.toggleTile(21, 12);
    pl.toggleTile(21, 12);                                           // ... and a second tap takes it off
    expect(store.get().plan.tiles).toEqual([[11, 11], [12, 11], [13, 11], [14, 11], [15, 11], [20, 12]]);
    let p = pl.preview();
    expect([p.state, p.count, p.cost]).toEqual(['ok', 5, 10]);
    expect(p.text).toBe(`5 tiles · ${DRAW_TEXT.skipped([{ reason: 'blocked' }])}`);
    expect(p.text).toBe('5 tiles · 1 skipped: something is in the way');
    expect(ghostsFor(world, store.get()).map((g) => `${g.x},${g.y}:${g.state}`)).toEqual(['11,11:ok', '12,11:ok', '13,11:bad', '14,11:ok', '15,11:ok', '20,12:ok']);
    pl.stroke(16, 11, 'start');                                      // a second finger turns the next stroke into a pan: it is taken back
    pl.stroke(18, 11, 'move');
    pl.stroke(null, null, 'cancel');
    expect(store.get().plan.tiles.length).toBe(6);
    const undos = world.undo.length, gold = world.gold;
    expect(pl.confirm().ok).toBe(true);
    expect([world.road[11 * 32 + 12], world.road[11 * 32 + 15], world.road[12 * 32 + 20]]).toEqual([1, 1, 1]);
    expect([world.undo.length, world.gold, store.get().plan]).toEqual([undos + 1, gold - 10, null]);
    expect(log.slice(-2)).toEqual(['puff', 'road']);
    expect(buildingAt(world, 13, 11).type).toBe('well');
    pl.toggleTile(13, 11);                                           // a plan of nothing but blocked tiles says why and cannot be ticked
    p = pl.preview();
    expect([p.state, p.text]).toEqual(['bad', reasonText('blocked')]);
    expect(pl.confirm().ok).toBe(false);
  });
  it('paints plots and demolishes in the rectangle a finger drags, and taps a tile on or off (P3)', () => {
    const { world, store, pl } = rig();
    pl.start({ kind: 'houses' });
    expect(pl.preview().text).toBe(DRAW_TEXT.idle);
    pl.stroke(12, 9, 'start');
    pl.stroke(14, 11, 'move');                                       // the rectangle crosses the road at y = 10
    pl.stroke(14, 11, 'end');
    pl.toggleTile(20, 9);
    let p = pl.preview();
    expect([p.state, p.count, p.text]).toEqual(['ok', 7, '7 plots · 3 skipped: something is already here']);
    expect(ghostsFor(world, store.get()).filter((g) => g.state === 'bad').map((g) => [g.x, g.y])).toEqual([[12, 10], [13, 10], [14, 10]]);
    expect(pl.confirm().ok).toBe(true);
    expect(housesOf(world).length).toBe(7);
    expect(world.undo[world.undo.length - 1].ids.length).toBe(7);
    pl.start({ kind: 'demolish' });
    pl.toggleTile(25, 25);                                           // nothing there: a demolish plan never holds a tile nothing marks
    expect(store.get().plan).toBe(null);
    pl.stroke(12, 9, 'start');
    pl.stroke(13, 9, 'end');
    pl.toggleTile(20, 9);
    p = pl.preview();
    expect([p.state, p.count, p.refund]).toEqual(['ok', 3, 0]);
    expect(ghostsFor(world, store.get()).map((g) => g.state)).toEqual(['demolish', 'demolish', 'demolish']);
    expect(pl.confirm().ok).toBe(true);
    expect(housesOf(world).length).toBe(4);
    pl.start({ kind: 'demolish' });                                  // a dragged rectangle keeps only the tiles with something on them (final review 13)
    pl.stroke(14, 8, 'start');
    pl.stroke(15, 9, 'end');                                         // four tiles, one plot (14, 9)
    expect(store.get().plan.tiles).toEqual([[14, 9]]);
    pl.stroke(24, 24, 'start');
    pl.stroke(26, 26, 'end');                                        // empty ground adds nothing
    expect(store.get().plan.tiles).toEqual([[14, 9]]);
    pl.toggleTile(14, 9);                                            // so every tile in the plan can be tapped off
    expect(store.get().plan).toBe(null);
  });
  it('lets a mouse click start a line over a touch plan, and the tool or a new one clears the plan', () => {
    const { store, pl } = rig();
    pl.start({ kind: 'road' });
    pl.toggleTile(10, 12);
    pl.pointAt(10, 13);
    expect([store.get().plan, store.get().line.x0]).toEqual([null, 10]);
    pl.toggleTile(10, 12);
    expect([store.get().plan.tiles, store.get().line]).toEqual([[[10, 12]], null]);
    pl.start({ kind: 'wall' });
    expect(store.get().plan).toBe(null);
    pl.toggleTile(10, 12);
    pl.cancel();
    expect([store.get().plan, store.get().mode]).toEqual([null, 'browse']);
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
