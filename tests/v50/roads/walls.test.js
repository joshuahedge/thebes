// Version 5.0 Task 6 (folding in the Task 5 review): a route across a wall, a breach and a gate is priced as drawRoute charges it, its words say what a gate in a wall
// means (the sim's: a gate keeps the wall's hit points and raiders path it as wall), and a dragged route's end is searched once a frame at most, correct on lift.
import { describe, it, expect } from '../../harness.js';
import { makeTestWorld, setRoad } from '../../helpers/testWorld.js';
import { routeRoad, drawRoute, routeStats } from '../../../src/sim/route.js';
import { previewRoadTiles } from '../../../src/sim/commands.js';
import { costOf, roadCostOf } from '../../../src/sim/costs.js';
import { undo } from '../../../src/sim/undo.js';
import { DEFENCE } from '../../../src/data/raids.js';
import { idx } from '../../../src/sim/grid.js';
import { createPlacement } from '../../../src/ui/placement.js';
import { createStore, INITIAL_UI_STATE } from '../../../src/ui/store.js';
import { ROUTE_TEXT } from '../../../src/ui/routeText.js';

const town = () => makeTestWorld({ fertile: [], gold: 5000 });
const wallAt = (w, x, y0, y1, hp = 30) => { for (let y = y0; y <= y1; y++) w.wall[idx(w.size, x, y)] = hp; w.wallVersion++; };

describe('v50 roads: a route across a wall, a breach and a gate', () => {
  it('across a standing wall: one gate at the gate price, the price shown is what drawRoute charges, and undo puts the wall back as it was', () => {
    const w = town();
    wallAt(w, 12, 0, 31, 30);                                           // a damaged wall the whole way down: no way round
    const r = routeRoad(w, 8, 8, 16, 8);
    expect(r.ok).toBe(true);
    expect(r.gates.length).toBe(1);
    expect(r.gates[0]).toBe(idx(w.size, 12, 8));
    expect(r.cost).toBe((r.tiles.length - 1) * roadCostOf(w) + costOf(w, 'gate'));
    expect(r.cost).toBe(previewRoadTiles(w, r.path).cost);
    const gold = w.gold, undos = w.undo.length;
    const d = drawRoute(w, 8, 8, 16, 8);
    expect(d.ok).toBe(true);
    expect(gold - w.gold).toBe(r.cost);                                 // charged exactly what the preview showed
    expect(w.undo.length).toBe(undos + 1);
    expect(w.road[idx(w.size, 12, 8)]).toBe(1);
    expect(w.wall[idx(w.size, 12, 8)]).toBe(DEFENCE.gateHp);            // a gate keeps a wall's hit points: the raiders' view of it
    undo(w);
    expect(w.gold).toBe(gold);
    expect(w.wall[idx(w.size, 12, 8)]).toBe(30);                        // the wall as it was, damage and all
    expect(w.road[idx(w.size, 12, 8)]).toBe(0);
  });
  it('across a breach: the gap becomes a gate at the gate price, and undo leaves the breach', () => {
    const w = town();
    wallAt(w, 12, 0, 31, 30);
    w.wall[idx(w.size, 12, 8)] = -1;                                    // broken stone in the line
    const r = routeRoad(w, 8, 8, 16, 8);
    expect(r.ok).toBe(true);
    expect(r.gates).toEqual([idx(w.size, 12, 8)]);
    expect(r.cost).toBe((r.tiles.length - 1) * roadCostOf(w) + costOf(w, 'gate'));
    const gold = w.gold;
    expect(drawRoute(w, 8, 8, 16, 8).ok).toBe(true);
    expect(gold - w.gold).toBe(r.cost);
    expect(w.wall[idx(w.size, 12, 8)]).toBe(DEFENCE.gateHp);
    undo(w);
    expect(w.wall[idx(w.size, 12, 8)]).toBe(-1);
    expect(w.gold).toBe(gold);
  });
  it('through a gate that is there already: no second gate to pay for, the tile counts as road already there', () => {
    const w = town();
    wallAt(w, 12, 0, 31, 40);
    w.road[idx(w.size, 12, 8)] = 1; w.roadVersion++;                    // a gate: wall on a road
    const r = routeRoad(w, 8, 8, 16, 8);
    expect(r.ok).toBe(true);
    expect(r.gates).toEqual([]);
    expect(r.used).toBeGreaterThanOrEqual(1);
    expect(r.cost).toBe(r.tiles.length * roadCostOf(w));
    expect(r.path.some(([x, y]) => x === 12 && y === 8)).toBe(true);
    const gold = w.gold;
    expect(drawRoute(w, 8, 8, 16, 8).ok).toBe(true);
    expect(gold - w.gold).toBe(r.cost);
    expect(w.wall[idx(w.size, 12, 8)]).toBe(40);
    undo(w);
    expect(w.wall[idx(w.size, 12, 8)]).toBe(40);                        // the gate was not ours to take away
    expect(w.road[idx(w.size, 12, 8)]).toBe(1);
  });
  it('goes round the end of a short wall when the detour costs less than a gate, and through a long one when there is no way round', () => {
    const gate = costOf(town(), 'gate'), road = roadCostOf(town());
    expect(8 * road).toBeLessThan(gate - road);                         // the premise: eight more tiles of road cost less than the gate's extra price
    const short = town();
    wallAt(short, 12, 4, 11);                                           // ends at y 11: round it by y 12 is 8 more tiles
    const around = routeRoad(short, 8, 8, 16, 8);
    expect(around.ok).toBe(true);
    expect(around.gates).toEqual([]);
    expect(around.path.some(([x, y]) => x === 12 && y >= 4 && y <= 11)).toBe(false);
    const long = town();
    wallAt(long, 12, 0, 31);
    const gated = routeRoad(long, 8, 8, 16, 8);
    expect(gated.gates.length).toBe(1);
    expect(gated.cost).toBeGreaterThan(around.cost);                    // dearer than the detour: why the detour wins in the short wall's town
    expect(around.cost).toBe(previewRoadTiles(short, around.path).cost);
  });
  it('names the gate and what it means in the route\'s line and in the message after it is laid', () => {
    const w = town();
    wallAt(w, 12, 0, 31);
    const r = routeRoad(w, 8, 8, 16, 8);
    expect(ROUTE_TEXT.summary(r)).toBe(`${r.tiles.length} tiles · 1 gate in your wall (raiders still treat it as wall)`);
    expect(ROUTE_TEXT.gates(2)).toBe('2 gates in your wall (raiders still treat them as wall)');
    const d = drawRoute(w, 8, 8, 16, 8);
    expect(ROUTE_TEXT.laid(d)).toBe('Road laid · 1 gate');
    const none = routeRoad(town(), 8, 8, 16, 8);
    expect(ROUTE_TEXT.summary(none)).toBe(`${none.tiles.length} tiles`);
    expect(ROUTE_TEXT.laid(drawRoute(town(), 8, 8, 16, 8))).toBe('Road laid');
  });
  it('the bar says it too: the preview\'s words carry the gate and its price is the route\'s', () => {
    const w = town();
    wallAt(w, 12, 0, 31);
    const store = createStore({ ...INITIAL_UI_STATE, inputType: 'mouse' });
    const pl = createPlacement({ world: w, store, afterCommand: () => {}, effects: null, now: () => 0, roadMode: { get: () => 'route', set: () => {} } });
    pl.start({ kind: 'road' });
    pl.pointAt(8, 8); pl.pointAt(16, 8);
    const p = pl.preview(), r = routeRoad(w, 8, 8, 16, 8);
    expect(p.text.includes('1 gate in your wall (raiders still treat it as wall)')).toBe(true);
    expect(p.cost).toBe(r.cost);
    expect(p.gates).toEqual(r.gates);
  });
});

describe('v50 roads: a dragged route is searched once a frame at most', () => {
  // slowMs: how long each store change takes (the preview's search runs inside it), added to the clock the placement reads.
  const rig = (inputType, slowMs = 0) => {
    const world = town();
    setRoad(world, 3, 3, 3, 3);
    let t = 0;
    const store = createStore({ ...INITIAL_UI_STATE, inputType });
    const pl = createPlacement({ world, store, afterCommand: () => {}, effects: null, now: () => t, roadMode: { get: () => 'route', set: () => {} } });
    store.subscribe(() => { pl.preview(); t += slowMs; });               // the map's tip watcher asks for the preview at every change
    return { world, store, pl, at: (v) => { t = v; } };
  };
  it('a finger\'s drag over ten tiles in one frame searches once, and the lift shows the route to the tile it lifted on', () => {
    const { world, store, pl, at } = rig('touch');
    pl.start({ kind: 'road' });
    pl.stroke(4, 20, 'start');
    const before = routeStats.searches;
    at(100); pl.stroke(5, 20, 'move');                                  // the first end is found at once
    expect(routeStats.searches - before).toBe(1);
    for (let k = 6; k <= 14; k++) pl.stroke(k, 20 + (k % 2), 'move');   // nine more tiles within the same frame: noted, not searched
    expect(routeStats.searches - before).toBe(1);
    expect(store.get().line.x1).toBe(5);                                // the preview is still the last route found
    at(130); pl.settle();                                               // the next frame
    expect(routeStats.searches - before).toBe(2);
    expect([store.get().line.x1, store.get().line.y1]).toEqual([14, 20]);
    pl.stroke(15, 22, 'move'); pl.stroke(16, 22, 'move');
    pl.stroke(17, 23, 'end');                                           // lifted at once after: the lift settles it
    expect([store.get().line.x1, store.get().line.y1]).toEqual([17, 23]);
    const r = routeRoad(world, 4, 20, 17, 23);
    expect(pl.preview().cost).toBe(r.cost);
    expect(pl.preview().tiles).toEqual(r.path);
  });
  it('searches only when the end tile changes: the same tile again asks for nothing, not even a store change', () => {
    const { store, pl, at } = rig('touch');
    pl.start({ kind: 'road' });
    pl.stroke(4, 20, 'start');
    at(100); pl.stroke(9, 20, 'move');
    const searches = routeStats.searches, line = store.get().line;
    at(200); pl.stroke(9, 20, 'move'); pl.settle();
    at(300); pl.stroke(9, 20, 'move'); pl.settle();
    expect(routeStats.searches).toBe(searches);
    expect(store.get().line).toBe(line);
  });
  it('waits twice as long as the last search took, so a slow search is never run back to back', () => {
    const { store, pl, at } = rig('touch', 50);                          // each end costs 50 ms
    pl.start({ kind: 'road' });
    pl.stroke(4, 20, 'start');
    at(100); pl.stroke(5, 20, 'move');                                  // found at 100, done at 150
    pl.stroke(9, 20, 'move');
    at(170); pl.settle();                                               // 20 ms on: a frame has passed, but not twice the search
    expect(store.get().line.x1).toBe(5);
    at(260); pl.settle();                                               // 110 ms on: past twice 50
    expect(store.get().line.x1).toBe(9);
  });
  it('a mouse\'s drag is the same: moves are noted, the release settles on its tile; a cancelled stroke leaves nothing pending', () => {
    const { store, pl, at } = rig('mouse');
    pl.start({ kind: 'road' });
    pl.dragTo(4, 20, 'start');
    const before = routeStats.searches;
    at(100); pl.dragTo(8, 20, 'move');
    for (let k = 9; k <= 14; k++) pl.dragTo(k, 20, 'move');
    expect(routeStats.searches - before).toBe(1);
    pl.dragTo(15, 21, 'end');
    expect([store.get().line.x1, store.get().line.y1]).toEqual([15, 21]);
    const t = rig('touch');
    t.pl.start({ kind: 'road' });
    t.pl.stroke(4, 20, 'start');
    t.at(100); t.pl.stroke(5, 20, 'move'); t.pl.stroke(9, 20, 'move');    // 9 is pending
    t.pl.stroke(null, null, 'cancel');
    t.at(500); t.pl.settle();
    expect(t.store.get().line).toBe(null);                              // the cancelled drag's end never comes back
  });
});
