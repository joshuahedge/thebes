// Stage 4.7 Task 6 (ruling 467): carts on screen. A cart is a walker entry on its road path (cartPath, cartFraction), at most CART_CAP of them, the nearest the middle of
// the view first; Still stands them at their store; the art slots exist for every good and draw inside their bounds; the id range meets no other figure's.
import { describe, it, expect } from '../../harness.js';
import { makeTestWorld, setRoad, addRaw } from '../../helpers/testWorld.js';
import { cartsAt, pointOnPath, CART_CAP, CART_ID_BASE, cartKind } from '../../../src/render/carts.js';
import { cartPath, setFetch, cartDay, cartOf, cartFraction } from '../../../src/sim/carts.js';
import { ART } from '../../../src/render/art/registry.js';
import { CART_LOADS, cart as drawCart } from '../../../src/render/art/carts.js';
import { collectObjects } from '../../../src/render/renderer.js';
import { GOODS } from '../../../src/data/goods.js';
import { BUILDINGS } from '../../../src/data/buildings.js';
import { WILDLIFE_ID_BASE } from '../../../src/render/wildlife.js';
import { PROCESSION_ID_BASE, DEDICATION_ID_BASE, STREAMER_ID_BASE } from '../../../src/render/walkers.js';
import { p } from '../../../src/render/art/primitives.js';

const step = (w, n = 1) => { for (let i = 0; i < n; i++) { cartDay(w); w.day += 1; } };
const tileOf = (w, x, y) => Math.floor(x) + Math.floor(y) * w.size;

// A street (y = 10) with a home at x 2 and a source at x 30 holding pottery, and the home fetching it: a cart set out on day 0.
function tripWorld() {
  const w = makeTestWorld({ size: 64, fertile: [] });
  setRoad(w, 0, 10, 63, 10);
  const home = addRaw(w, 'storehouse', 2, 11, { staff: 6, store: {} });
  const far = addRaw(w, 'storehouse', 30, 11, { staff: 6, store: { pottery: 80 } });
  setFetch(w, home.id, 'pottery');
  step(w);
  return { w, home, far };
}

describe('s47 carts render: where a cart is drawn', () => {
  it('walks the road path as far along it as the sim says, on road tiles, home first', () => {
    const { w, home } = tripWorld();
    const c = cartOf(w, home.id), path = cartPath(w, c);
    expect(path.length).toBeGreaterThan(10);
    for (const t of [1, 2, 3, 4, 5, 6.5]) {
      const [e] = cartsAt(w, t, null, 'full');
      expect(w.road[tileOf(w, e.x, e.y)]).toBe(1);                                  // always on a road tile
      const f = cartFraction(c, t - 1);                                                // the sim ticks, then the clock adds the day: drawn time is timeDays - 1
      const pt = pointOnPath(w, path, f);
      expect([e.x, e.y]).toEqual([pt.x, pt.y]);
      expect(e.id).toBe(CART_ID_BASE + home.id);
    }
    const start = cartsAt(w, 1, null, 'full')[0];                                      // set out: at its store's door (the path's first tile)
    expect([start.x, start.y]).toEqual([(path[0] % w.size) + 0.5, Math.floor(path[0] / w.size) + 0.5]);
    const end = cartsAt(w, c.turn + 1, null, 'full')[0];                               // at the source on its turn day
    const last = path[path.length - 1];
    expect([end.x, end.y]).toEqual([(last % w.size) + 0.5, Math.floor(last / w.size) + 0.5]);
  });

  it('moves under Gentle as walkers do (the same places as under Full), and stands at its store under Still', () => {
    const { w, home } = tripWorld();
    const path = cartPath(w, cartOf(w, home.id));
    const door = { x: (path[0] % w.size) + 0.5, y: Math.floor(path[0] / w.size) + 0.5 };
    const at = (t, m) => { const [e] = cartsAt(w, t, null, m); return [e.x, e.y]; };
    expect(at(3, 'gentle')).toEqual(at(3, 'full'));
    expect(String(at(3, 'gentle')) === String(at(4, 'gentle'))).toBe(false);                               // it moves with game time
    for (const t of [1, 2, 3.5, 6]) expect(at(t, 'still')).toEqual([door.x, door.y]); // Still: at the door, whatever the time
    expect(cartsAt(w, 3, null, 'still')[0].kind).toBe('cart_pottery');                  // facing right, loaded
  });

  it('faces the way it goes: right or left on screen by the leg it is on, and turns on the way back', () => {
    const { w, home } = tripWorld();
    const c = cartOf(w, home.id);
    // the street runs along x, so out is x growing: down-right on screen, a right-facing cart; back is the left-facing one
    const out = cartsAt(w, 3, null, 'full')[0];
    step(w, 5);                                                                          // on the way back (state back from its turn day)
    expect(c.state).toBe('back');
    const back = cartsAt(w, w.day + 0.5, null, 'full')[0];
    expect([out.kind, out.dir]).toEqual(['cart_pottery', 1]);
    expect([back.kind, back.dir]).toEqual(['cart_pottery_l', 3]);
  });

  it('shows its load until the goods go back on the shelf: a cart turned round on the way out is empty', () => {
    const { w, home } = tripWorld();
    step(w, 2);
    cartsAt(w, w.day + 0.5, null, 'full');                                              // drawn once on its way, so its route is remembered
    w.road[10 * w.size + 20] = 0; w.roadVersion++;                                      // cut the street
    cartDay(w);
    const c = cartOf(w, home.id);
    expect([c.state, c.dest]).toEqual(['return', 'home']);
    const [e] = cartsAt(w, w.day + 0.5, null, 'full');
    expect(e.kind.startsWith('cart_empty')).toBe(true);
    expect(cartKind(null, false)).toBe('cart_empty');
    expect(cartKind('nonsense', true)).toBe('cart_unknown_l');
  });

  it('draws nothing for a cart no road joins any more, and nothing when there are no carts', () => {
    const { w } = tripWorld();
    w.road[10 * w.size + 20] = 0; w.roadVersion++;                                      // cut before it was ever drawn: no route to draw it on
    expect(cartsAt(w, 3, null, 'full')).toEqual([]);
    w.carts.length = 0;
    expect(cartsAt(w, 3, null, 'full')).toEqual([]);
    expect(cartsAt({ ...w, carts: undefined }, 3, null, 'full')).toEqual([]);
  });
});

describe('s47 carts render: at most 30 on screen, the nearest the middle of the view', () => {
  // 40 stores on both sides of a long street, each with a cart to one source: the sim has one cart per store.
  function crowd() {
    const w = makeTestWorld({ size: 128, fertile: [] });
    setRoad(w, 0, 20, 127, 20);
    const src = addRaw(w, 'storehouse', 120, 21, { staff: 6, store: { pottery: 5000 } });
    const homes = [];
    for (let i = 0; i < 20; i++) homes.push(addRaw(w, 'storehouse', 2 + i * 5, 21, { staff: 6, store: {} }), addRaw(w, 'storehouse', 2 + i * 5, 18, { staff: 6, store: {} }));
    for (const h of homes) w.carts.push({ id: h.id, from: src.id, to: h.id, good: 'pottery', amount: 20, len: 100, left: 0, turn: 13, due: 25, state: 'out' });
    return { w, homes };
  }

  it('caps the crowd at CART_CAP', () => {
    const { w, homes } = crowd();
    expect(homes.length).toBe(40);
    expect(CART_CAP).toBe(30);
    expect(cartsAt(w, 6, null, 'full').length).toBe(30);
    expect(cartsAt(w, 6, { x0: 0, y0: 0, x1: 127, y1: 127 }, 'full').length).toBe(30);
    expect(cartsAt(w, 6, null, 'still').length).toBe(30);
    expect(new Set(cartsAt(w, 6, null, 'full').map((e) => e.id)).size).toBe(30);        // each its own figure id
  });

  it('keeps the ones nearest the middle of the view, and a view that holds fewer shows them all', () => {
    const { w } = crowd();
    const range = { x0: 20, y0: 10, x1: 120, y1: 30 };
    const shown = cartsAt(w, 6, range, 'full');
    expect(shown.length).toBe(30);
    // the 30 nearest the view's middle (the sum of the distances along each axis, store id on a tie), worked out here from the sim's own carts
    const mid = { x: 70, y: 20 };
    const placed = w.carts.map((c) => ({ id: CART_ID_BASE + c.id, ...pointOnPath(w, cartPath(w, c), cartFraction(c, 5)) }))
      .filter((e) => e.x >= range.x0 - 2 && e.x <= range.x1 + 2 && e.y >= range.y0 - 2 && e.y <= range.y1 + 2)
      .sort((a, b) => (Math.abs(a.x - mid.x) + Math.abs(a.y - mid.y)) - (Math.abs(b.x - mid.x) + Math.abs(b.y - mid.y)) || a.id - b.id);
    expect(placed.length).toBeGreaterThan(30);                                          // more than fit, so the cap chose
    expect(shown.map((e) => e.id)).toEqual(placed.slice(0, 30).map((e) => e.id));
    const tiny = cartsAt(w, 6, { x0: 40, y0: 10, x1: 60, y1: 30 }, 'full');
    expect(tiny.length).toBeLessThan(30);
    expect(tiny.length).toBeGreaterThan(0);
  });

  it('joins the walkers in the depth-sorted pass', () => {
    const { w } = crowd();
    const range = { x0: 0, y0: 0, x1: 127, y1: 127 };
    const objects = collectObjects(w, range, cartsAt(w, 6, range, 'full'), ART);
    const carts = objects.filter((o) => o.slot.startsWith('fig.cart_'));
    expect(carts.length).toBe(30);
    expect(carts.every((o) => ART[o.slot] && ART[o.slot].draw)).toBe(true);
    for (let i = 1; i < objects.length; i++) expect(objects[i - 1].key <= objects[i].key).toBe(true);   // back to front with the buildings
  });
});

describe('s47 carts render: the art and the ids', () => {
  // A recording draw surface: every point the drawing touches, so the bounds can be checked.
  function recorder() {
    const pts = [];
    const add = (q, rx = 0, ry = 0) => { pts.push([q[0] - rx, q[1] - ry], [q[0] + rx, q[1] + ry]); };
    const g = {
      poly: (list) => list.forEach((q) => add(q)), ell: (c, rx, ry) => add(c, rx, ry), circ: (c, r) => add(c, r, r),
      line: (a, b) => { add(a); add(b); }, stroke: (segs) => segs.forEach((s) => s.slice(1).forEach((q) => add(q))), path: (segs) => segs.forEach((s) => s.slice(1).forEach((q) => add(q))),
    };
    return { g, pts };
  }

  it('has a slot pair for every good, a fallback and an empty cart, each drawing inside its bounds', () => {
    const goods = [...Object.keys(GOODS), 'unknown', 'empty'];
    for (const good of goods) {
      for (const left of [false, true]) {
        const slot = ART[`fig.cart_${good}${left ? '_l' : ''}`];
        expect([good, left, Boolean(slot && slot.draw)]).toEqual([good, left, true]);
        const { g, pts } = recorder();
        slot.draw(g, 0, 0);
        expect(pts.length).toBeGreaterThan(20);
        const [l, t, r, b] = slot.bounds;
        const bad = pts.filter(([x, y]) => x < l - 0.5 || x > r + 0.5 || y < t - 0.5 || y > b + 0.5);
        expect([good, left, bad.length]).toEqual([good, left, 0]);
      }
    }
  });

  it('gives each good its own colour and its own load shape, so no good is told by colour alone', () => {
    const shapes = new Set(Object.values(CART_LOADS).map(([, s]) => s));
    expect([...shapes].sort()).toEqual(['blocks', 'bolts', 'fish', 'gems', 'heap', 'jars', 'none', 'sack']);
    for (const good of Object.keys(GOODS)) expect([good, Boolean(CART_LOADS[good])]).toEqual([good, true]);   // every good has its look
    // goods that share a shape differ in colour
    const byShape = {};
    for (const [good, [col, shape]] of Object.entries(CART_LOADS)) (byShape[shape] = byShape[shape] || []).push([good, col]);
    for (const list of Object.values(byShape)) expect(new Set(list.map(([, c]) => c)).size).toBe(list.length);
  });

  it('draws a left-facing cart as the right-facing one turned (the load and the pusher swap sides)', () => {
    const a = recorder(), b = recorder();
    drawCart(a.g, 0, 0, 'pottery', false);
    drawCart(b.g, 0, 0, 'pottery', true);
    expect(a.pts.length).toBe(b.pts.length);
    const X = p(0, 0)[0];
    const r2 = (v) => Math.round(v * 100) / 100, sorted = (list) => list.map(r2).sort((m, n) => m - n);   // the extremes of an ellipse swap ends when turned: compare the sorted x and y values
    expect(sorted(a.pts.map((q) => 2 * X - q[0]))).toEqual(sorted(b.pts.map((q) => q[0])));
    expect(sorted(a.pts.map((q) => q[1]))).toEqual(sorted(b.pts.map((q) => q[1])));
  });

  it('uses an id range no other figure uses', () => {
    expect(CART_ID_BASE).toBeGreaterThan(WILDLIFE_ID_BASE + 600000);
    for (const base of [PROCESSION_ID_BASE, DEDICATION_ID_BASE, STREAMER_ID_BASE]) expect(CART_ID_BASE).toBeGreaterThan(base + 100000);
    expect(BUILDINGS.storehouse.stores.length).toBeGreaterThan(5);
  });
});
