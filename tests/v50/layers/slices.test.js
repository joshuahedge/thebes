// Version 5.0 Task 3 review fix: every home's status is built a slice of homes at a time (src/sim/layers.js statuses), so no frame does it all. The sim is told how many
// homes, never how long; a list under way never replaces the one last completed until it is whole; and whole, it says what building it all at once says.
import { describe, it, expect } from '../../harness.js';
import { makeTestWorld, setRoad, addRaw, staffAll } from '../../helpers/testWorld.js';
import { homeProgress, goodSupply, statusWork } from '../../../src/sim/layers.js';
import { demolishAt } from '../../../src/sim/commands.js';
import { TIERS } from '../../../src/data/housing.js';
import { makeCanvas, pixelAt } from '../../helpers/canvas.js';
import { makeDraw } from '../../../src/render/art/ctx.js';
import { drawOverlay } from '../../../src/render/overlays.js';
import { pinSlice, sliceFor, SLICE_MIN, SLICE_MAX } from '../../../src/render/layers.js';
import { p } from '../../../src/render/iso.js';

// A 64-tile street with a home every two tiles on both sides (64 homes), tiers and stocks varying so the statuses differ, and a well, a temple and a bazaar to serve some.
function city() {
  const w = makeTestWorld({ size: 64 });
  w.milestone = 'capital';
  setRoad(w, 0, 10, 63, 10);
  let k = 0;
  for (const y of [11, 8]) {
    for (let x = 0; x < 64; x += 2, k++) {
      const tier = 1 + (k % 4);
      addRaw(w, 'house', x, y, { tier, residents: TIERS[tier].capacity, stockedFor: k % 3 ? TIERS[tier].capacity : 0, stock: k % 2 ? { grain: 30 } : {} });
    }
  }
  addRaw(w, 'well', 14, 12);
  addRaw(w, 'temple', 30, 12);
  addRaw(w, 'bazaar', 40, 12).store.grain = 200;
  staffAll(w);
  return w;
}
const homeCount = (w) => Object.values(w.buildings).filter((b) => b.type === 'house').length;
const shape = (list) => list.map((m) => [m.id, m.state, m.tier, m.n, m.first, m.missing.join()]);
const shapeSupply = (s) => [s.homes.map((h) => [h.id, h.has]), s.holders.map((h) => [h.id, h.amount])];

// Call fn(budget) until a call does no houseStatus work (the list is whole): the most houseStatus calls any one call made, the calls it took, the last result.
function drain(fn, budget) {
  let worst = 0, calls = 0, out;
  for (;;) {
    const before = statusWork.calls;
    out = fn(budget);
    const n = statusWork.calls - before;
    worst = Math.max(worst, n); calls++;
    if (n === 0) return { worst, calls, out };
    if (calls > 1000) throw new Error('the list never finished');
  }
}

describe('v50 layers slices: a budget in homes', () => {
  it('no call makes more houseStatus calls than its budget: 7 over 64 homes takes nine calls of work and one that finds it done', () => {
    const w = city();
    expect(homeCount(w)).toBe(64);
    const before = statusWork.calls;
    homeProgress(w, 7);
    expect(statusWork.calls - before).toBe(7);
    const { worst, calls } = drain((b) => homeProgress(w, b), 7);
    expect(worst).toBe(7);
    expect(calls).toBe(10);
    expect(statusWork.calls - before).toBe(64);
    const w2 = city(), each = [];
    for (let i = 0; i < 20; i++) { const n = statusWork.calls; goodSupply(w2, 'food', 5); each.push(statusWork.calls - n); }
    expect(Math.max(...each)).toBe(5);
    expect(each.reduce((a, b) => a + b, 0)).toBe(64);
  });
  it('with no budget the whole list is built in one call, as before', () => {
    const w = city();
    const before = statusWork.calls;
    expect(homeProgress(w).length).toBe(64);
    expect(statusWork.calls - before).toBe(64);
    expect(homeProgress(w)).toBe(homeProgress(w));
  });
  it('whole, the list equals the one built all at once (Home progress and Goods supply, every good)', () => {
    const sliced = city(), whole = city();
    drain((b) => homeProgress(sliced, b), 5);
    expect(shape(homeProgress(sliced, 5))).toEqual(shape(homeProgress(whole)));
    for (const good of ['food', 'pottery', 'beer']) {
      const a = city(), b = city();
      drain((n) => goodSupply(a, good, n), 3);
      expect(shapeSupply(goodSupply(a, good, 3))).toEqual(shapeSupply(goodSupply(b, good)));
    }
  });
  it('the first list shows the homes worked out so far, a slice at a time', () => {
    const w = city();
    expect(homeProgress(w, 4).length).toBe(4);
    expect(homeProgress(w, 4).length).toBe(8);
  });
  it('the render sizes a slice from the time a home took: fewer homes on a slow device, never fewer than the least or more than the most', () => {
    expect(sliceFor(0.46)).toBe(13);
    expect(sliceFor(2)).toBe(3);
    expect(sliceFor(1000)).toBe(SLICE_MIN);
    expect(sliceFor(0)).toBe(SLICE_MAX);
    expect(sliceFor(0.46) > sliceFor(2)).toBe(true);
  });
});

describe('v50 layers slices: the list last completed stays until the next is whole', () => {
  it('a new day keeps the old list, then swaps the new one in whole', () => {
    const w = city();
    const old = shape(homeProgress(w));
    const home = Object.values(w.buildings).find((b) => b.type === 'house' && b.x === 4 && b.y === 11);   // a tier 3 home
    home.tier = 1; home.residents = 1;                          // what the day's tick would change
    w.day += 1;
    for (let i = 0; i < 4; i++) expect(shape(homeProgress(w, 8))).toEqual(old);   // 32 of 64 homes done: still the old list, not a mixture
    const done = drain((b) => homeProgress(w, b), 8).out;
    expect(shape(done)).toEqual(shape(homeProgress(w)));
    expect(JSON.stringify(shape(done)) === JSON.stringify(old)).toBe(false);
  });
  it('a day passing mid-way lets the list finish (it is not started again), and the next day then begins', () => {
    const w = city();
    homeProgress(w);
    const done = (fn) => { const n = statusWork.calls; fn(); return statusWork.calls - n; };
    w.day += 1;
    expect(done(() => homeProgress(w, 20))).toBe(20);
    w.day += 1;                                                 // another day while the first list is under way
    expect(done(() => homeProgress(w, 20))).toBe(20);
    expect(done(() => homeProgress(w, 20))).toBe(20);
    expect(done(() => homeProgress(w, 20))).toBe(4);            // the first list's last four: it finished, 64 in all
    expect(done(() => homeProgress(w, 20))).toBe(20);           // and the list for the second day began
  });
  it('a demolished home leaves the list at once, and a home placed later arrives when its slice does', () => {
    const w = city();
    homeProgress(w);
    const gone = Object.values(w.buildings).find((b) => b.type === 'house' && b.x === 4 && b.y === 11);
    expect(demolishAt(w, gone.x, gone.y).ok).toBe(true);
    const list = homeProgress(w, 3);
    expect(list.some((m) => m.id === gone.id)).toBe(false);
    expect(list.length).toBe(63);                               // the rest are the old statuses, still there
    const fresh = addRaw(w, 'house', 4, 11, { tier: 2, residents: 8, stock: {} });
    expect(homeProgress(w, 3).some((m) => m.id === fresh.id)).toBe(false);
    expect(drain((b) => homeProgress(w, b), 3).out.some((m) => m.id === fresh.id)).toBe(true);
  });
  it('a change to the buildings mid-way starts the list again (it would walk homes that are gone)', () => {
    const w = city();
    homeProgress(w, 10);
    addRaw(w, 'garden', 50, 20);
    const n = statusWork.calls;
    homeProgress(w, 10);
    expect(statusWork.calls - n).toBe(10);
    const { out } = drain((b) => homeProgress(w, b), 10);
    expect(out.length).toBe(64);
    expect(shape(out)).toEqual(shape(homeProgress(w)));
  });
});

describe('v50 layers slices: the map fills in over frames', () => {
  it('drawn four homes a frame, the first frame paints a few homes and the later frames the whole street', () => {
    pinSlice(4);
    try {
      const w = city();
      const c = makeCanvas(900, 420), ctx = c.getContext('2d'), [ax, ay] = p(32, 10);
      ctx.translate(450 - ax, 210 - ay);
      const g = makeDraw(ctx, 1, 1);
      const inked = () => { let n = 0; for (let x = 0; x < c.width; x += 2) for (let y = 0; y < c.height; y += 2) if (pixelAt(c, x, y)[3] > 0) n++; return n; };
      drawOverlay(g, w, 'progress', { x0: 0, y0: 0, x1: 63, y1: 63 });
      const first = inked();
      for (let i = 0; i < 20; i++) drawOverlay(g, w, 'progress', { x0: 0, y0: 0, x1: 63, y1: 63 });
      expect(first).toBeGreaterThan(0);
      expect(inked()).toBeGreaterThan(first * 4);
    } finally { pinSlice(null); }
  });
});

describe('v50 layers slices: a store with less than one of the good', () => {
  it('is not marked (its label would say 0); with half of one or more it says 1', () => {
    const w = makeTestWorld();
    setRoad(w, 0, 10, 31, 10);
    const bazaar = addRaw(w, 'bazaar', 9, 8);
    bazaar.store.pottery = 0.3;
    expect(goodSupply(w, 'pottery').holders).toEqual([]);
    bazaar.store.pottery = 0.5;
    w.day += 1;
    expect(goodSupply(w, 'pottery').holders.map((h) => h.amount)).toEqual([1]);
    bazaar.store.pottery = 0.49;
    w.day += 1;
    expect(goodSupply(w, 'pottery').holders).toEqual([]);
  });
});
