// Version 7.1.1, fix batch C: the render-only gaps of 7.1. Rapids on the cataract, the season wash and the glints on the 7.1 layouts' water (ruling 1024 mended),
// and a cart and a walker paced over a ferry crossing's own time (ruling 1044). No sim, save or timing change: the checks read what the render would draw.
import { describe, it, expect } from '../../harness.js';
import { createWorld } from '../../../src/sim/world.js';
import { T } from '../../../src/sim/terrain.js';
import { idx } from '../../../src/sim/grid.js';
import { MAP_VARIANTS } from '../../../src/data/map.js';
import { SEASON_LOOK } from '../../../src/data/seasons.js';
import { seasonAt } from '../../../src/sim/seasons.js';
import { drawRapids, rapidsOf, fleckAt } from '../../../src/render/rapids.js';
import { drawSeasonGround } from '../../../src/render/seasons.js';
import { createAmbient, glintAt } from '../../../src/render/ambient.js';
import { cartsAt, cartsOnFerries, pointOnPath } from '../../../src/render/carts.js';
import { ferryWalkers, FERRY_ID_BASE, RIDE_ID_BASE } from '../../../src/render/ferries.js';
import { walkersAt, walkerLoop, TILES_PER_DAY } from '../../../src/render/walkers.js';
import { hopCum } from '../../../src/render/ferryPace.js';
import { cartPath, cartOf, cartFraction, cartDay, setFetch } from '../../../src/sim/carts.js';
import { crossingTiles } from '../../../src/sim/ferries.js';
import { drawFerry } from '../../../src/sim/ferryLay.js';
import { hash2 } from '../../../src/sim/rng.js';
import { addRaw } from '../../helpers/testWorld.js';
import { ferryWorld, dragLine, settle, RIVER_X, ROW } from '../../v71/f/helpers.js';

const WHOLE = { x0: 0, y0: 0, x1: 99, y1: 99 };
// A drawing surface that records what is drawn: every call's name, colour and arguments.
function recorder() {
  const calls = [];
  const rec = (name) => (...a) => { calls.push({ name, a }); };
  const g = { calls, scale: 1, cssScale: 0, ctx: { setLineDash() {} } };
  for (const n of ['poly', 'polys', 'path', 'stroke', 'ell', 'circ', 'line', 'save', 'restore', 'radial', 'clip']) g[n] = rec(n);
  return g;
}
const count = (g, name, colour) => g.calls.filter((c) => c.name === name && (colour === undefined || c.a[1] === colour)).length;
const world = (variant, seed = 3, size = 64) => createWorld({ seed, size, mapVariant: variant });
const NEW = ['delta', 'confluence', 'twin', 'wide-nile', 'cataract', 'lake-fed'];

describe('v711 c rapids: white broken water round the cataract\'s islands', () => {
  it('is on the cataract only: water tiles within 3 of a small enclosed island, none on any other layout', () => {
    for (const seed of [3, 7, 11, 20]) {
      const w = world('cataract', seed), { tiles } = rapidsOf(w);
      expect([seed, tiles.length > 12]).toEqual([seed, true]);
      for (const t of tiles) expect([seed, w.terrain[idx(w.size, t.x, t.y)]]).toEqual([seed, T.WATER]);
    }
    for (const v of MAP_VARIANTS.filter((m) => m !== 'cataract')) {
      const w = world(v, 3), g = recorder();
      drawRapids(g, w, WHOLE, 1000, 'full');
      expect([v, rapidsOf(w).tiles.length, g.calls.length]).toEqual([v, 0, 0]);
    }
  });

  it('draws white flecks and shore foam on the cataract, in every Motion level', () => {
    const w = world('cataract', 3);
    for (const motion of ['full', 'gentle', 'still']) {
      const g = recorder();
      drawRapids(g, w, WHOLE, 1000, motion);
      expect([motion, count(g, 'stroke', '#FFFFFF') > 0, count(g, 'ell') > 0]).toEqual([motion, true, true]);
    }
  });

  it('moves only under Full motion: Gentle and Still draw one still texture whatever the clock says', () => {
    const w = world('cataract', 3), shot = (motion, now) => { const g = recorder(); drawRapids(g, w, WHOLE, now, motion); return JSON.stringify(g.calls); };
    expect(shot('gentle', 100)).toBe(shot('gentle', 4321));
    expect(shot('still', 100)).toBe(shot('still', 4321));
    expect(shot('gentle', 100)).toBe(shot('still', 100));
    expect(shot('full', 100) === shot('full', 2100)).toBe(false);
  });

  it('keeps every fleck on water, drifting downstream under Full', () => {
    const w = world('cataract', 3), { tiles, flow } = rapidsOf(w);
    let moved = 0, shown = 0;
    for (const t of tiles) {
      for (let k = 0; k < 3; k++) {
        for (const now of [0, 700, 1500, 2900]) {
          const f = fleckAt(w, t, k, now, true);
          if (!f) continue;
          shown++;
          expect(w.terrain[idx(w.size, Math.floor(f.x), Math.floor(f.y))]).toBe(T.WATER);
        }
        const a = fleckAt(w, t, k, 1000, true), b = fleckAt(w, t, k, 1010, true);
        if (a && b && Math.hypot(b.x - a.x, b.y - a.y) < 0.1) { moved++; expect((b.x - a.x) * flow[0] + (b.y - a.y) * flow[1]).toBeGreaterThan(0); }   // a jump is a fleck starting over
      }
    }
    expect(shown > 20 && moved > 5).toBe(true);
  });
});

describe('v711 c water: the 7.1 layouts\' water takes the season wash and the glints', () => {
  // The first day of the year (mid-month, so no blend) in each season.
  const dayIn = (season) => { for (let d = 3; d < 360; d += 30) if (seasonAt({ day: d }).season === season && seasonAt({ day: d }).blend === 0) return d; throw new Error(season); };
  const floodDay = () => dayIn('akhet');
  const wash = SEASON_LOOK.akhet.water[0];

  it('in flood season each new layout\'s water is washed in the flood colour, tile by tile; the older river is still washed as a band', () => {
    for (const v of NEW) {
      const w = world(v, 5);
      w.day = floodDay();
      const g = recorder();
      drawSeasonGround(g, w, WHOLE, 0, 'gentle');
      const washed = g.calls.filter((c) => c.name === 'polys' && c.a[1] === wash);
      let water = 0;
      for (let i = 0; i < w.size * w.size; i++) if (w.terrain[i] === T.WATER) water++;
      expect([v, washed.length, washed[0] && washed[0].a[0].length]).toEqual([v, 1, water]);
    }
    const old = world('classic', 5);
    old.day = floodDay();
    const g = recorder();
    drawSeasonGround(g, old, WHOLE, 0, 'gentle');
    expect([count(g, 'path', wash), count(g, 'polys', wash)]).toEqual([1, 0]);
  });

  it('the wash follows the season: each season lays its own colour on the same water, and only its own', () => {
    const w = world('delta', 5), looks = ['akhet', 'peret', 'shemu'].map((s) => SEASON_LOOK[s].water[0]);
    ['akhet', 'peret', 'shemu'].forEach((season, k) => {
      w.day = dayIn(season);
      const g = recorder();
      drawSeasonGround(g, w, WHOLE, 0, 'still');
      expect([season, looks.map((c) => count(g, 'polys', c))]).toEqual([season, looks.map((c, j) => (j === k ? 1 : 0))]);
    });
  });

  it('glints sit on water tiles of a new layout, and the ambient layer draws them under Full and Gentle but not Still', () => {
    for (const v of ['delta', 'lake-fed']) {
      const w = world(v, 5);
      let seen = 0;
      for (let y = 0; y < w.size; y++) {
        for (let x = 0; x < w.size; x++) {
          if (w.terrain[idx(w.size, x, y)] !== T.WATER) continue;
          for (const now of [0, 2000, 4500]) {
            const gl = glintAt(w, x, y, now, null, true);
            if (!gl) continue;
            seen++;
            expect(w.terrain[idx(w.size, Math.floor(gl.x), Math.floor(gl.y))]).toBe(T.WATER);
          }
        }
      }
      expect([v, seen > 100]).toEqual([v, true]);
      for (const [level, drawn] of [['full', true], ['gentle', true], ['still', false]]) {
        const amb = createAmbient({ enabled: () => level !== 'still', level: () => level, clock: () => 0 }), g = recorder();   // createUI turns it off under Still
        amb.draw(g, w, { x0: 0, y0: 0, x1: w.size - 1, y1: w.size - 1 }, 3000);
        expect([v, level, count(g, 'stroke') > 0]).toEqual([v, level, drawn]);
      }
    }
  });
});

// A ferry across 7 tiles of water with a temple (walkers, reach 10) beside the west landing's road and two storehouses (a cart) one each side.
function crossingWorld() {
  const w = ferryWorld(7);
  const temple = addRaw(w, 'temple', RIVER_X - 3, ROW + 1);
  const west = addRaw(w, 'storehouse', 6, ROW + 1, { staff: 6, store: {} });
  const east = addRaw(w, 'storehouse', RIVER_X + 10, ROW + 1, { staff: 6, store: { pottery: 80 } });
  const ids = drawFerry(w, dragLine(7)).ids;
  settle(w);
  return { w, temple, west, east, a: w.buildings[ids[0]], b: w.buildings[ids[1]] };
}
const hopIndex = (loop) => { for (let i = 0; i < loop.length; i++) { const a = loop[i], b = loop[(i + 1) % loop.length]; if (Math.abs(a.x - b.x) + Math.abs(a.y - b.y) > 1) return i; } return -1; };

describe('v711 c ferry: a walker crosses in the crossing\'s own time', () => {
  it('stands half way over the water half the crossing\'s time after it steps on, and covers the span at an even pace', () => {
    const { w, temple } = crossingWorld(), cost = crossingTiles(7);
    const loop = walkerLoop(w, temple, 10), at = hopIndex(loop);
    expect(at).toBeGreaterThanOrEqual(0);
    const cum = hopCum(w, loop, (t) => t.x + t.y * w.size, true);
    expect(cum[at + 1] - cum[at]).toBe(cost);
    const total = cum[loop.length], phase = hash2(temple.id, 0, 1) * total;
    const timeAt = (s) => { let d = (s - phase) / TILES_PER_DAY; while (d < 0) d += total / TILES_PER_DAY; return d; };
    const me = (t) => walkersAt(w, t).find((k) => k.id === temple.id);
    const a = loop[at], b = loop[(at + 1) % loop.length];
    const mid = me(timeAt(cum[at] + cost / 2));
    expect([mid.x, mid.y]).toEqual([(a.x + b.x) / 2 + 0.5, (a.y + b.y) / 2 + 0.5]);
    const q1 = me(timeAt(cum[at] + cost / 4)), q3 = me(timeAt(cum[at] + (3 * cost) / 4));
    expect(Math.abs(q1.x - (a.x + 0.5 + (b.x - a.x) / 4)) < 1e-9 && Math.abs(q3.x - (a.x + 0.5 + (3 * (b.x - a.x)) / 4)) < 1e-9).toBe(true);
    // a tile before the hop it is still on the bank, a tile after it on the far one
    const before = me(timeAt(cum[at] - 0.5)), after = me(timeAt(cum[at] + cost + 0.5));
    expect([before.x < RIVER_X, after.x > RIVER_X + 7]).toEqual([true, true]);
  });

  it('a loop with no running ferry paces exactly as before: one tile for each step', () => {
    const { w, temple, a } = crossingWorld();
    a.paused = true;
    settle(w);
    const loop = walkerLoop(w, temple, 10);
    expect(hopIndex(loop)).toBe(-1);
    expect(hopCum(w, loop, (t) => t.x + t.y * w.size, true)).toBe(null);
    const phase = hash2(temple.id, 0, 1) * loop.length, t0 = (2.5 - phase) / TILES_PER_DAY + loop.length / TILES_PER_DAY;
    const k = walkersAt(w, t0).find((m) => m.id === temple.id);
    expect([k.x, k.y]).toEqual([(loop[2].x + loop[3].x) / 2 + 0.5, (loop[2].y + loop[3].y) / 2 + 0.5]);
  });
});

describe('v711 c ferry: a cart crosses on a boat, over the crossing\'s own time', () => {
  // The cart set out from the west store for the east store's pottery, and the day (timeDays) on which it is a share f of the way along its path by cost.
  function cartOut() {
    const s = crossingWorld(), { w, west } = s;
    setFetch(w, west.id, 'pottery');
    cartDay(w);
    w.day += 1;
    const c = cartOf(w, west.id), path = cartPath(w, c), cum = hopCum(w, path, (t) => t), n = path.length;
    let at = -1;
    for (let i = 0; i < n - 1; i++) if (cum[i + 1] - cum[i] > 1) at = i;
    const dayFor = (cost) => c.left + ((cum[at] + cost) / cum[n - 1]) * (c.turn - c.left) + 1;   // timeDays at which the cart is `cost` into the hop
    return { ...s, c, path, cum, at, dayFor, cost: crossingTiles(7) };
  }

  it('the cart is on the crossing for its whole share of the trip, moving along the water at an even pace', () => {
    const { w, c, path, cum, at, dayFor, cost } = cartOut();
    expect(c.state).toBe('out');
    expect(cum[at + 1] - cum[at]).toBe(cost);
    const a = path[at], b = path[at + 1], size = w.size;
    const ax = (a % size) + 0.5, ay = Math.floor(a / size) + 0.5, bx = (b % size) + 0.5, by = Math.floor(b / size) + 0.5;
    for (const share of [0.25, 0.5, 0.75]) {
      const [e] = cartsAt(w, dayFor(cost * share), null, 'full');
      expect([share, Math.abs(e.x - (ax + (bx - ax) * share)) < 1e-6, Math.abs(e.y - (ay + (by - ay) * share)) < 1e-6]).toEqual([share, true, true]);
    }
    // it takes the crossing's share of the trip: the sim's own len less the road tiles is the hop's cost
    const half = pointOnPath(w, path, (cum[at] + cost / 2) / cum[path.length - 1]);
    expect(half.hop).toEqual([a, b]);
    expect(pointOnPath(w, path, (cum[at] - 0.01) / cum[path.length - 1]).hop).toBe(undefined);
  });

  it('while it is on the water it rides a boat of its own (the crossing\'s regular boat steps aside); off the water the regular boat is back; under Still it stands at its door', () => {
    const { w, a, dayFor, cost, west } = cartOut();
    const t = dayFor(cost / 2), [cart] = cartsAt(w, t, null, 'full');
    const rides = cartsOnFerries(w, t, null, 'full');
    expect(rides.length).toBe(1);
    const boats = ferryWalkers(w, t, null, 'full');
    expect(boats.map((k) => k.id)).toEqual([RIDE_ID_BASE + west.id]);
    expect(boats.some((k) => k.id === FERRY_ID_BASE + a.id)).toBe(false);
    expect(Math.abs(boats[0].x - (cart.x - 0.1)) < 1e-9 && Math.abs(boats[0].y - (cart.y - 0.1)) < 1e-9).toBe(true);
    expect(boats[0].x + boats[0].y < cart.x + cart.y).toBe(true);   // behind the cart in the depth order, so the cart is drawn on it
    // before it reaches the water, the regular boat alone
    const early = ferryWalkers(w, dayFor(-1), null, 'full');
    expect(early.map((k) => k.id)).toEqual([FERRY_ID_BASE + a.id]);
    expect(cartsOnFerries(w, dayFor(-1), null, 'full')).toEqual([]);
    // Still: no ride
    expect(cartsOnFerries(w, t, null, 'still')).toEqual([]);
    expect(ferryWalkers(w, t, null, 'still').map((k) => k.id)).toEqual([FERRY_ID_BASE + a.id]);
  });

  it('a path with no ferry steps places the cart exactly as before: even steps along it', () => {
    const { w, c } = cartOut();
    for (const l of [Object.values(w.buildings).filter((b) => b.ferry)]) for (const b of l) b.paused = true;
    settle(w);
    const path = [10, 11, 12, 13].map((x) => x + ROW * w.size);
    expect(hopCum(w, path, (t) => t)).toBe(null);
    const pt = pointOnPath(w, path, 0.5);
    expect([pt.x, pt.y, pt.hop]).toEqual([12, ROW + 0.5, undefined]);
    expect(c.state).toBe('out');
  });
});
