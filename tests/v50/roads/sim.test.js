// Version 5.0 Task 5 (rulings 560-569): the routed road in the sim (src/sim/route.js). Each rule both ways: the world set up so it holds and then changed so it does not,
// and the price compared with the sim's own previewRoadTiles / roadCostOf / costOf, which is what the bar shows and what drawRoute charges.
import { describe, it, expect } from '../../harness.js';
import { makeTestWorld, setRoad, addRaw } from '../../helpers/testWorld.js';
import { routeRoad, drawRoute, ROUTE } from '../../../src/sim/route.js';
import { previewRoad, previewRoadTiles } from '../../../src/sim/commands.js';
import { costOf, roadCostOf } from '../../../src/sim/costs.js';
import { BRIDGE_MAX, bridgeRuns, runReason } from '../../../src/sim/bridges.js';
import { undo } from '../../../src/sim/undo.js';
import { T } from '../../../src/sim/terrain.js';
import { idx } from '../../../src/sim/grid.js';

const town = (opts = {}) => makeTestWorld({ fertile: [], ...opts });
const lay = (w, terrain, x0, y0, x1, y1) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) w.terrain[idx(w.size, x, y)] = terrain; };
const key = (p) => p.map(([x, y]) => `${x},${y}`).join(' ');
const turns = (p) => { let n = 0; for (let i = 2; i < p.length; i++) if ((p[i][0] - p[i - 1][0]) !== (p[i - 1][0] - p[i - 2][0]) || (p[i][1] - p[i - 1][1]) !== (p[i - 1][1] - p[i - 2][1])) n++; return n; };
const joined = (p) => p.every((q, i) => i === 0 || Math.abs(q[0] - p[i - 1][0]) + Math.abs(q[1] - p[i - 1][1]) === 1);

describe('v50 roads: the cheapest way', () => {
  it('runs straight over open ground, at the same price as the L, with one bend at most', () => {
    const w = town();
    const r = routeRoad(w, 4, 4, 14, 9);
    expect(r.ok).toBe(true);
    expect(r.path.length).toBe(16);                                     // 10 + 5 steps and the start
    expect(joined(r.path)).toBe(true);
    expect(turns(r.path)).toBeLessThanOrEqual(1);
    expect(r.cost).toBe(16 * roadCostOf(w));
    expect(r.cost).toBe(previewRoad(w, 4, 4, 14, 9).cost);
    expect(r.bridges).toEqual([]);
  });
  it('goes round a building and a hill, never through them, and the price is the preview of the tiles it chose', () => {
    const w = town();
    for (const [x, y] of [[9, 5], [9, 6], [9, 7]]) addRaw(w, 'well', x, y);
    lay(w, T.HILLS, 12, 3, 12, 9);
    const r = routeRoad(w, 5, 6, 16, 6);
    expect(r.ok).toBe(true);
    for (const [x, y] of r.path) { expect(w.occ[idx(w.size, x, y)]).toBe(0); expect(w.terrain[idx(w.size, x, y)] === T.HILLS).toBe(false); }
    expect(joined(r.path)).toBe(true);
    expect(key(r.path.slice(0, 1))).toBe('5,6');
    expect(key(r.path.slice(-1))).toBe('16,6');
    const p = previewRoadTiles(w, r.path);
    expect(p.ok).toBe(true);
    expect(r.cost).toBe(p.cost);
    expect(r.tiles).toEqual(p.tiles);
    expect(previewRoad(w, 5, 6, 16, 6).ok).toBe(false);                 // the straight road is refused here
  });
  it('is never dearer than the L when the L can be laid, and never lays a tile the road tool would refuse', () => {
    let s = 7;
    const rnd = (n) => { s = (Math.imul(s, 1103515245) + 12345) >>> 0; return (s >>> 8) % n; };
    let routed = 0, straight = 0;
    for (let round = 0; round < 40; round++) {
      const w = town({ size: 24 });
      for (let k = 0; k < 18; k++) { const x = rnd(24), y = rnd(24); if (!w.occ[idx(24, x, y)]) addRaw(w, 'well', x, y); }
      for (let k = 0; k < 4; k++) lay(w, T.HILLS, rnd(24), rnd(24), rnd(24), rnd(24));
      lay(w, T.WATER, 10 + rnd(8), 0, 10 + rnd(8), 23);
      const [x0, y0, x1, y1] = [rnd(24), rnd(24), rnd(24), rnd(24)];
      const r = routeRoad(w, x0, y0, x1, y1);
      if (!r.ok) continue;
      routed++;
      expect(joined(r.path)).toBe(true);
      expect(previewRoadTiles(w, r.path).cost).toBe(r.cost);
      for (const flip of [false, true]) {
        const l = previewRoad(w, x0, y0, x1, y1, flip);
        if (l.ok) { straight++; expect(r.cost).toBeLessThanOrEqual(l.cost); }
      }
    }
    expect(routed).toBeGreaterThan(10);
    expect(straight).toBeGreaterThan(3);
  });
  it('prefers a road that is there already, and says how many of its tiles it used', () => {
    const w = town();
    setRoad(w, 4, 10, 24, 10);
    const r = routeRoad(w, 4, 14, 24, 14);
    expect(r.ok).toBe(true);
    expect(r.used).toBe(21);                                            // the whole strip
    expect(r.cost).toBe(r.tiles.length * roadCostOf(w));
    expect(r.tiles.length).toBe(8);                                     // 4 tiles of new road at each end, the strip free
    const bare = town();
    expect(routeRoad(bare, 4, 14, 24, 14).used).toBe(0);                // no road, no use of one
  });
  it('is a function of the ground alone: the same answer twice, and from a world rebuilt the same way', () => {
    const make = () => { const w = town(); lay(w, T.HILLS, 10, 2, 10, 12); addRaw(w, 'well', 14, 8); return w; };
    const a = routeRoad(make(), 4, 8, 20, 8), b = routeRoad(make(), 4, 8, 20, 8), w = make();
    expect(key(a.path)).toBe(key(b.path));
    expect(key(routeRoad(w, 4, 8, 20, 8).path)).toBe(key(routeRoad(w, 4, 8, 20, 8).path));
  });
});

describe('v50 roads: bridges', () => {
  const river = (wide, x = 14) => { const w = town(); lay(w, T.WATER, x, 0, x + wide - 1, 31); return w; };
  it('crosses water only by a bridge the sim\'s rule allows: straight, up to BRIDGE_MAX, land at both ends', () => {
    for (let wide = 1; wide <= BRIDGE_MAX; wide++) {
      const w = river(wide);
      const r = routeRoad(w, 8, 10, 24, 12);
      expect(r.ok).toBe(true);
      expect(r.bridges.length).toBe(wide);
      expect(r.bridgeCost).toBe(wide * costOf(w, 'bridge'));
      const runs = bridgeRuns(w, r.path);
      expect(runs.length).toBe(1);
      expect(runReason(runs[0])).toBe(null);                            // the rule's own verdict on the run
      expect(r.cost).toBe(previewRoadTiles(w, r.path).cost);
      expect(r.cost).toBe((r.tiles.length - wide) * roadCostOf(w) + wide * costOf(w, 'bridge'));
    }
  });
  it('refuses a river wider than a bridge may span, saying how wide and where', () => {
    const w = river(BRIDGE_MAX + 1);
    const r = routeRoad(w, 8, 10, 28, 12);
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('too_wide');
    expect(r.water).toBe(BRIDGE_MAX + 1);
    expect(r.at).toEqual([14, 0 + r.at[1]]);
    expect(r.path).toEqual([]);
    expect(r.cost).toBe(0);
    expect(previewRoad(w, 8, 10, 28, 12).ferries.length).toBe(1);         // Version 8.3 (Track X): the straight L lays a ferry; Route lays bridges only (ruling 1403)
    const ford = river(BRIDGE_MAX + 1);
    ford.terrain[idx(ford.size, 16, 20)] = T.DESERT;                    // a ford: two bridges of two tiles each, round a dry stone in the middle
    expect(routeRoad(ford, 8, 10, 28, 12).ok).toBe(true);
  });
  it('takes the narrow crossing even when it is further, when that is cheaper', () => {
    const w = town();
    lay(w, T.WATER, 14, 0, 17, 31);                                     // 4 wide everywhere...
    lay(w, T.DESERT, 15, 14, 16, 14);                                   // ...but two wide at y 14
    const r = routeRoad(w, 8, 12, 24, 12);
    expect(r.ok).toBe(true);
    expect(r.bridges.length).toBeLessThan(4);
    expect(r.bridges.every((t) => Math.floor(t / w.size) === 14)).toBe(true);
    expect(r.bridgeCost).toBeLessThan(4 * costOf(w, 'bridge'));            // two bridge tiles, not four
  });
  it('uses a standing bridge without paying for it again', () => {
    const w = river(3);
    for (let x = 14; x <= 16; x++) w.road[idx(w.size, x, 20)] = 1;
    w.roadVersion++;
    const r = routeRoad(w, 10, 20, 20, 20);
    expect(r.ok).toBe(true);
    expect(r.bridges).toEqual([]);
    expect(r.used).toBeGreaterThanOrEqual(3);
    expect(r.cost).toBe(r.tiles.length * roadCostOf(w));
  });
  it('needs free land to land on: a bank with a building on it is not a landing, and a bank of hills is not one', () => {
    const w = river(2);
    lay(w, T.HILLS, 16, 0, 16, 31);                                     // hills all along the east bank
    const r = routeRoad(w, 8, 10, 24, 10);
    expect(r.ok).toBe(false);
    expect(r.reason === 'too_wide').toBe(false);                        // the river is narrow enough; the bank is the trouble
    const v = river(2);
    for (let y = 0; y < 32; y++) addRaw(v, 'well', 16, y);
    expect(routeRoad(v, 8, 10, 24, 10).ok).toBe(false);
  });
});

describe('v50 roads: refusals say why and where', () => {
  it('names the end that cannot take a road', () => {
    const w = town();
    lay(w, T.WATER, 10, 10, 11, 11);
    lay(w, T.HILLS, 20, 10, 20, 10);
    addRaw(w, 'well', 5, 5);
    expect(routeRoad(w, 10, 10, 2, 2).reason).toBe('water');
    expect(routeRoad(w, 2, 2, 20, 10).reason).toBe('hills');
    expect(routeRoad(w, 5, 5, 2, 2).reason).toBe('blocked');
    expect(routeRoad(w, 2, 2, -1, 2).reason).toBe('out_of_bounds');
    expect(routeRoad(w, 2, 2, 2.5, 2).reason).toBe('out_of_bounds');
    expect(routeRoad(w, 10, 10, 2, 2).at).toEqual([10, 10]);
  });
  it('says buildings close it off, and names the first one in the way', () => {
    const w = town();
    for (let k = 0; k < 3; k++) for (const [x, y] of [[9, 8 + k], [13, 8 + k]]) addRaw(w, 'well', x, y);
    for (let x = 9; x <= 13; x++) { addRaw(w, 'well', x, 7); addRaw(w, 'well', x, 11); }
    const r = routeRoad(w, 11, 9, 2, 2);
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('boxed_in');
    expect(w.occ[idx(w.size, r.at[0], r.at[1])]).toBeGreaterThan(0);
  });
  it('says hills close it off, and a mix of obstacles is no way at all', () => {
    const w = town();
    for (let x = 9; x <= 13; x++) { lay(w, T.HILLS, x, 7, x, 7); lay(w, T.HILLS, x, 11, x, 11); }
    lay(w, T.HILLS, 9, 8, 9, 10); lay(w, T.HILLS, 13, 8, 13, 10);
    const r = routeRoad(w, 11, 9, 2, 2);
    expect(r.reason).toBe('hemmed_in');
    expect(w.terrain[idx(w.size, r.at[0], r.at[1])]).toBe(T.HILLS);
    const m = town();
    const ring = (x0, y0, x1, y1, each) => { for (let x = x0; x <= x1; x++) { each(x, y0); each(x, y1); } for (let y = y0 + 1; y < y1; y++) { each(x0, y); each(x1, y); } };
    ring(9, 7, 13, 11, (x, y) => addRaw(m, 'well', x, y));              // wells inside, hills outside: each is passable only if the other is
    ring(8, 6, 14, 12, (x, y) => lay(m, T.HILLS, x, y, x, y));
    expect(routeRoad(m, 11, 9, 2, 2).reason).toBe('no_way');
  });
  it('cannot be fooled by an end that is walled in by water too wide: the island is too wide, not boxed in', () => {
    const w = town();
    lay(w, T.WATER, 3, 3, 18, 18);
    lay(w, T.DESERT, 10, 10, 12, 12);
    const r = routeRoad(w, 11, 11, 1, 1);
    expect(r.reason).toBe('too_wide');
    expect(r.water).toBeGreaterThan(BRIDGE_MAX);
  });
});

describe('v50 roads: the price is what is charged', () => {
  it('draws the route, takes exactly the preview\'s cost from the treasury, and undoes in one step', () => {
    const w = town({ gold: 1000 });
    lay(w, T.WATER, 14, 0, 16, 31);
    addRaw(w, 'well', 10, 10);
    const r = routeRoad(w, 8, 10, 24, 10);
    expect(r.ok).toBe(true);
    expect(r.bridges.length).toBe(3);
    const before = w.gold, undos = w.undo.length;
    const d = drawRoute(w, 8, 10, 24, 10);
    expect(d.ok).toBe(true);
    expect(before - w.gold).toBe(r.cost);
    expect(d.cost).toBe(r.cost);
    expect(w.undo.length).toBe(undos + 1);
    for (const [x, y] of r.path) expect(w.road[idx(w.size, x, y)]).toBe(1);
    undo(w);
    expect(w.gold).toBe(before);
    for (const [x, y] of r.path) expect(w.road[idx(w.size, x, y)]).toBe(0);
  });
  it('is refused as the road tool is when the treasury cannot pay: the cost is still the preview\'s', () => {
    const w = town({ gold: -495 });                                     // debt stops at -500
    const r = routeRoad(w, 4, 4, 14, 4);
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('no_gold');
    expect(r.cost).toBe(11 * roadCostOf(w));
    expect(r.path.length).toBe(11);                                     // the route is still shown
    expect(drawRoute(w, 4, 4, 14, 4).ok).toBe(false);
    expect(w.gold).toBe(-495);
  });
  it('sees a change in the buildings and the roads (the answer is kept only while they hold)', () => {
    const w = town();
    const a = routeRoad(w, 4, 8, 20, 8);
    expect(a.cost).toBe(17 * roadCostOf(w));
    addRaw(w, 'well', 12, 8);
    const b = routeRoad(w, 4, 8, 20, 8);
    expect(b.path.some(([x, y]) => x === 12 && y === 8)).toBe(false);
    expect(b.cost).toBe(19 * roadCostOf(w));                            // round the well: two more tiles
    const c = town();
    expect(routeRoad(c, 4, 8, 20, 8).cost).toBe(17 * roadCostOf(c));
    setRoad(c, 4, 8, 20, 8);                                            // the road is laid: the same ends now cost nothing
    expect(routeRoad(c, 4, 8, 20, 8).cost).toBe(0);
  });
});

describe('v50 roads: a bound on the search', () => {
  it('looks at no more than ROUTE.expand states, and says too_far past that, on a map far larger than any the game makes', () => {
    const w = town({ size: 220 });
    const r = routeRoad(w, 0, 0, 219, 219);
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('too_far');
    expect(r.looked).toBeLessThanOrEqual(ROUTE.expand);
    expect(r.looked).toBeGreaterThan(ROUTE.expand - 1);
  });
  it('crosses the whole of the largest map the game makes (80), and says no way for an end nothing reaches, inside the bound', () => {
    const w = town({ size: 80 });
    lay(w, T.HILLS, 40, 0, 40, 79);
    const wall = routeRoad(w, 2, 2, 78, 78);
    expect(wall.ok).toBe(false);
    expect(wall.reason).toBe('hemmed_in');
    expect(wall.looked).toBeLessThanOrEqual(ROUTE.expand);
    const open = routeRoad(town({ size: 80 }), 0, 0, 79, 79);
    expect(open.ok).toBe(true);
    expect(open.path.length).toBe(159);
  });
});
