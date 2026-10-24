// Version 7.1, fix batch C (ferries follow-ups): a razed, undone or burnt landing drops its crossing at once; a burning landing stops the crossing; and a ferry can be laid
// from the start's own bank to the far bank of a wide Nile (every size) and of a delta by the ferry rule's own checks, after which a cart's route goes over it.
import { describe, it, expect } from '../../harness.js';
import { addRaw, setRoad } from '../../helpers/testWorld.js';
import { ferryWorld, dragLine, settle, RIVER_X, ROW } from '../f/helpers.js';
import { previewFerry, ferrySpot, ferryLinks, ferryEdges, landingBlocker, landingsOf, crossingTiles, FERRY } from '../../../src/sim/ferries.js';
import { drawFerry } from '../../../src/sim/ferryLay.js';
import { undo } from '../../../src/sim/undo.js';
import { demolishAt } from '../../../src/sim/commands.js';
import { burnBuilding } from '../../../src/sim/fire.js';
import { roadLen, cartPath } from '../../../src/sim/carts.js';
import { createWorld } from '../../../src/sim/world.js';
import { T, buildable } from '../../../src/sim/terrain.js';
import { idx, ring, inBounds } from '../../../src/sim/grid.js';
import { BUILDINGS } from '../../../src/data/buildings.js';
import { MAP_SIZES } from '../../../src/data/map.js';
import { ownLand } from '../m/check.js';

const SIZES = Object.values(MAP_SIZES);

// A running ferry on the dev river, a store on each bank beside its road, everything settled.
function running() {
  const w = ferryWorld(7);
  const west = addRaw(w, 'storehouse', 6, ROW + 1), east = addRaw(w, 'storehouse', RIVER_X + 10, ROW + 1);
  const [a, b] = drawFerry(w, dragLine(7)).ids.map((id) => w.buildings[id]);
  settle(w);
  return { w, west, east, a, b };
}

describe('v71 fc ferries: a landing that goes drops its crossing at once', () => {
  it('razing a landing cuts the carts\' road and the crossing link now, not at the next labour step', () => {
    const { w, west, east, a } = running();
    expect([roadLen(w, west, east) < Infinity, ferryLinks(w).length]).toEqual([true, 1]);
    const v = w.roadVersion;
    expect(demolishAt(w, a.x, a.y).ok).toBe(true);
    expect(w.roadVersion).toBeGreaterThan(v);
    expect([ferryLinks(w).length, ferryEdges(w).size, roadLen(w, west, east)]).toEqual([0, 0, Infinity]);
    expect(cartPath(w, { to: west.id, from: east.id })).toBe(null);
  });

  it('undoing the laying of a running ferry does the same, and refunds', () => {
    const w = ferryWorld(7);
    const west = addRaw(w, 'storehouse', 6, ROW + 1), east = addRaw(w, 'storehouse', RIVER_X + 10, ROW + 1);
    const gold = w.gold;
    drawFerry(w, dragLine(7));
    settle(w);
    expect(roadLen(w, west, east) < Infinity).toBe(true);
    expect(undo(w).ok).toBe(true);
    expect([landingsOf(w).length, ferryLinks(w).length, roadLen(w, west, east), w.gold]).toEqual([0, 0, Infinity, gold]);
  });

  it('a landing that burns down does the same', () => {
    const { w, west, east, a } = running();
    const v = w.roadVersion;
    expect(burnBuilding(w, a.id).length).toBeGreaterThan(0);
    expect(w.roadVersion).toBeGreaterThan(v);
    expect([landingsOf(w).length, ferryLinks(w).length, roadLen(w, west, east)]).toEqual([1, 0, Infinity]);
  });

  it('removing a building that is not a landing leaves the road version alone', () => {
    const { w } = running();
    const hut = addRaw(w, 'house', 20, 20, { tier: 1, residents: 0 });
    const v = w.roadVersion;
    expect(demolishAt(w, hut.x, hut.y).ok).toBe(true);
    expect(w.roadVersion).toBe(v);
  });
});

describe('v71 fc ferries: a landing on fire', () => {
  it('stops the crossing while it burns (its own reason, and the mate\'s), and runs again when the fire is out', () => {
    const { w, west, east, a, b } = running();
    expect([landingBlocker(w, a), a.ferry.run, roadLen(w, west, east) < Infinity]).toEqual([null, true, true]);
    b.fire = { stage: 'fire', days: 0, left: 3 };
    settle(w);
    expect([landingBlocker(w, a), landingBlocker(w, b)]).toEqual(['mate_burning', 'burning']);
    expect([a.ferry.run, b.ferry.run, ferryLinks(w).length, roadLen(w, west, east)]).toEqual([false, false, 0, Infinity]);
    b.fire = null;
    settle(w);
    expect([landingBlocker(w, a), a.ferry.run, ferryLinks(w).length, roadLen(w, west, east) < Infinity]).toEqual([null, true, 1, true]);
  });

  it('is not stopped by a fire that is being put out (the blaze stage), which the sim does not count as burning', () => {
    const { w, a, b } = running();
    b.fire = { stage: 'blaze', days: 0, need: 3, fought: 0 };
    settle(w);
    expect([landingBlocker(w, a), b.ferry.run]).toEqual([null, true]);
  });
});

// ── A ferry on a generated map ──

// Every straight crossing of FERRY.min to FERRY.max tiles of water, with the road tile before the near landing and after the far one, the near landing on the start's own
// land and the far one off it, nearest the start first: [{ drag: [[x, y]...], near: [x, y], far: [x, y], roads: [[x, y], [x, y]] }].
function crossings(w) {
  const n = w.size, own = ownLand({ size: n, terrain: w.terrain, focus: w.focus }), out = [];
  const dry = (x, y) => inBounds(n, x, y) && w.terrain[idx(n, x, y)] !== T.WATER;
  for (let a = 0; a < n; a++) for (const vertical of [false, true]) {
    const cell = (b) => (vertical ? [a, b] : [b, a]);
    let start = -1;
    for (let b = 0; b <= n; b++) {
      const wet = b < n && w.terrain[idx(n, ...cell(b))] === T.WATER;
      if (wet && start < 0) start = b;
      if (wet || start < 0) continue;
      const len = b - start;
      if (len >= FERRY.min && len <= FERRY.max && start >= 2 && b + 1 < n && dry(...cell(start - 1)) && dry(...cell(b))) {
        const p = [cell(start - 2), cell(start - 1), cell(b), cell(b + 1)];
        let line = []; for (let k = start - 2; k <= b + 1; k++) line.push(cell(k));
        if (own[idx(n, ...p[1])] && !own[idx(n, ...p[2])]) out.push({ drag: line, near: p[1], far: p[2], roads: [p[0], p[3]] });
        else if (own[idx(n, ...p[2])] && !own[idx(n, ...p[1])]) out.push({ drag: line.slice().reverse(), near: p[2], far: p[1], roads: [p[3], p[0]] });
      }
      start = -1;
    }
  }
  const d = (c) => Math.hypot(c.near[0] - w.focus.x, c.near[1] - w.focus.y);
  return out.sort((x, y) => d(x) - d(y));
}

// A free place for a building (w x d) with a tile of its ring on `road`.
function siteBeside(w, type, road) {
  const { w: bw, d: bd } = BUILDINGS[type];
  for (let r = 0; r <= 4; r++) for (let dy = -bd - r; dy <= 1 + r; dy++) for (let dx = -bw - r; dx <= 1 + r; dx++) {
    const x = road[0] + dx, y = road[1] + dy;
    const tiles = [];
    for (let j = 0; j < bd; j++) for (let i = 0; i < bw; i++) tiles.push([x + i, y + j]);
    if (!tiles.every(([tx, ty]) => inBounds(w.size, tx, ty) && buildable(w, idx(w.size, tx, ty)) && !w.occ[idx(w.size, tx, ty)] && !w.road[idx(w.size, tx, ty)] && !(tx === road[0] && ty === road[1]))) continue;
    if (ring(x, y, bw, bd).some(([rx, ry]) => rx === road[0] && ry === road[1])) return [x, y];
  }
  return null;
}

// Lays the first ferry the rule accepts from the start's bank to the far one, roads beside both landings, a store beside each road, and some homes for the ferrymen.
function layFromStart(w) {
  w.gold = 100000;
  for (const c of crossings(w)) {
    const clear = c.roads.every(([x, y]) => buildable(w, idx(w.size, x, y)) && !w.occ[idx(w.size, x, y)] && !w.road[idx(w.size, x, y)]);
    if (!clear) continue;
    for (const [x, y] of c.roads) setRoad(w, x, y, x, y);
    const p = previewFerry(w, c.drag);
    if (!p.ok) { for (const [x, y] of c.roads) w.road[idx(w.size, x, y)] = 0; continue; }
    const sites = c.roads.map((r) => siteBeside(w, 'storehouse', r));
    if (sites.some((s) => !s)) continue;
    const stores = sites.map(([x, y]) => addRaw(w, 'storehouse', x, y));
    const homes = [];
    for (let y = w.focus.y - 6; y <= w.focus.y + 6 && homes.length < 4; y++) for (let x = w.focus.x - 6; x <= w.focus.x + 6 && homes.length < 4; x++) {
      const ok = [[0, 0], [1, 0], [0, 1], [1, 1]].every(([i, j]) => buildable(w, idx(w.size, x + i, y + j)) && !w.occ[idx(w.size, x + i, y + j)] && !w.road[idx(w.size, x + i, y + j)]);
      if (ok) homes.push(addRaw(w, 'house', x, y, { tier: 1, residents: 40 }));
    }
    return { c, p, stores, homes };
  }
  return null;
}

describe('v71 fc ferries: laid across a generated map', () => {
  const cases = [];
  for (const v of ['wide-nile', 'delta']) for (const size of SIZES) for (const seed of [1, 2, 3]) cases.push({ v, size, seed });
  for (const { v, size, seed } of cases) {
    it(`${v} ${size} #${seed}: a ferry from the start's bank to the far bank, then a cart's road over it`, () => {
      const w = createWorld({ seed, mapVariant: v, size });
      const spot = ferrySpot(w, w.focus);                                   // Show me finds a place somewhere on the map
      expect([v, size, seed, spot !== null && spot.water >= FERRY.min && spot.water <= FERRY.max]).toEqual([v, size, seed, true]);
      const lay = layFromStart(w);
      expect([v, size, seed, lay !== null]).toEqual([v, size, seed, true]);
      const { c, p, stores } = lay;
      expect(p.ok).toBe(true);
      const own = ownLand({ size: w.size, terrain: w.terrain, focus: w.focus });
      expect([own[idx(w.size, ...c.near)], own[idx(w.size, ...c.far)]]).toEqual([1, 0]);   // from the start's land to land it cannot reach on foot
      expect(roadLen(w, stores[0], stores[1])).toBe(Infinity);              // nothing joins the two banks yet
      const laid = drawFerry(w, c.drag);
      expect([laid.ok, laid.water]).toEqual([true, p.water]);
      expect(roadLen(w, stores[0], stores[1])).toBe(Infinity);              // laid, nobody works it yet
      settle(w);
      const [a, b] = laid.ids.map((id) => w.buildings[id]);
      expect([a.ferry.run, b.ferry.run, ferryLinks(w).length]).toEqual([true, true, 1]);
      const len = roadLen(w, stores[0], stores[1]);
      expect(len >= crossingTiles(p.water)).toBe(true);
      expect(len).toBeLessThan(Infinity);
      const path = cartPath(w, { to: stores[0].id, from: stores[1].id });
      const here = idx(w.size, ...c.roads[0]), there = idx(w.size, ...c.roads[1]);
      expect([path !== null && Math.abs(path.indexOf(there) - path.indexOf(here)), path !== null && path.includes(here)]).toEqual([1, true]);
    });
  }
});
