// Version 5.0 Task 3 (rulings 540-549): the three layers on the map (src/render/layers.js through drawOverlay). Read without colour: a wash against hatching, a tick, an icon or a
// number, and the same city drawn both ways (a need met, a worker hired) paints differently. Badges are left off when the map is too small to hold them.
import { describe, it, expect } from '../../harness.js';
import { makeTestWorld, setRoad, addRaw, staffAll } from '../../helpers/testWorld.js';
import { makeCanvas, pixelAt, canvasHash } from '../../helpers/canvas.js';
import { removeBuilding, allBuildings } from '../../../src/sim/world.js';
import { drawOverlay } from '../../../src/render/overlays.js';
import { NEED_ICONS, needIcon, badgeRadius, BADGE_MIN_CSS } from '../../../src/render/layers.js';
import { p } from '../../../src/render/iso.js';
import { makeDraw } from '../../../src/render/art/ctx.js';
import { TIERS } from '../../../src/data/housing.js';
import { GOODS } from '../../../src/data/goods.js';
import { LAYER_HUE } from '../../../src/data/layers.js';
import { NEED_NAMES } from '../../../src/ui/text.js';
import { OVERLAYS, OVERLAY_HUE } from '../../../src/render/overlays.js';

const ALL = { x0: 0, y0: 0, x1: 31, y1: 31 };

// A canvas whose art origin sits so tile (tx, ty) is at device (120, 60), drawn at 2 device px per art px (cssScale `css`, which decides whether badges are drawn).
function scene(tx, ty, css = 2, width = 240) {
  const c = makeCanvas(width, 200);
  const ctx = c.getContext('2d');
  const [ax, ay] = p(tx, ty);
  ctx.translate(120 - 2 * ax, 60 - 2 * ay);
  return { c, g: makeDraw(ctx, 2, css), at: (x, y) => { const q = p(x, y); return [120 + 2 * (q[0] - ax), 60 + 2 * (q[1] - ay)]; } };
}
const inked = (c) => { let n = 0; for (let x = 0; x < c.width; x += 2) for (let y = 0; y < 200; y += 2) if (pixelAt(c, x, y)[3] > 0) n++; return n; };
// The alpha values along the lower half of a footprint's middle row (below the badge): one value for a wash, several for stripes.
const washAlphas = (s, x, y, w, d) => {
  const [cx, cy] = s.at(x + w / 2, y + d / 2);
  const set = new Set();
  for (let dx = -8; dx <= 8; dx += 1) set.add(pixelAt(s.c, cx + dx, cy + 6)[3]);
  return set;
};

function street(tier = 4) {
  const w = makeTestWorld();
  w.milestone = 'capital';
  setRoad(w, 0, 10, 31, 10);
  const home = addRaw(w, 'house', 12, 11, { tier, residents: TIERS[tier].capacity, stockedFor: TIERS[tier].capacity, stock: { grain: 30 } });
  addRaw(w, 'well', 14, 9);
  addRaw(w, 'temple', 20, 8);
  const bazaar = addRaw(w, 'bazaar', 9, 8);
  bazaar.store.grain = 200;
  staffAll(w);
  return { w, home, bazaar };
}

describe('v50 layers: the map', () => {
  it('the table lists them after Ground, each with its own hue, and every need has an icon (an unknown one a dot, never nothing)', () => {
    expect(OVERLAYS.slice(-4)).toEqual(['progress', 'supply', 'workers', 'lines']);   // Version 8.3 (Track K): Supply lines after Workers
    expect(['progress', 'supply', 'workers'].map((k) => OVERLAY_HUE[k])).toEqual([LAYER_HUE.progress, LAYER_HUE.supply, LAYER_HUE.workers]);
    expect(new Set(OVERLAYS.map((k) => OVERLAY_HUE[k])).size).toBe(OVERLAYS.length);
    for (const need of Object.keys(NEED_NAMES)) expect([need, Boolean(NEED_ICONS[need])]).toEqual([need, true]);   // every need a checklist can name
    expect(needIcon('nonsense').segs.length).toBeGreaterThan(0);
  });
  it('Home progress: a home one need short is washed with an icon; with the need met it changes (a tick); two missing are hatched', () => {
    const { w, home, bazaar } = street();
    const one = scene(12, 11);
    drawOverlay(one.g, w, 'progress', ALL);
    expect(inked(one.c)).toBeGreaterThan(40);
    expect(washAlphas(one, home.x, home.y, 1, 1).size).toBe(1);                    // one wash, no stripes
    bazaar.store.pottery = 300;
    home.stock.pottery = Math.ceil(TIERS[5].capacity * GOODS.pottery.perResidentPerMonth * 2);
    w.day += 1;
    const ready = scene(12, 11);
    drawOverlay(ready.g, w, 'progress', ALL);
    expect(canvasHash(ready.c) === canvasHash(one.c)).toBe(false);
    const [bx, by] = ready.at(12.5, 11.5);
    expect(pixelAt(ready.c, bx, by - 12)[3]).toBe(255);                            // the tick's disc, opaque
    for (const b of allBuildings(w)) if (b.type === 'well' || b.type === 'temple') removeBuilding(w, b.id);   // the buildings changed: the list is worked out again
    const many = scene(12, 11);
    drawOverlay(many.g, w, 'progress', ALL);
    expect(washAlphas(many, home.x, home.y, 1, 1).size).toBeGreaterThan(1);        // hatching: a second cue besides the strength of the wash
  });
  it('Home progress states differ in more than colour: converted to grey, ready, one and many are three different pictures', () => {
    const grey = (c) => { const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; const out = []; for (let i = 0; i < d.length; i += 4) out.push(d[i + 3] ? Math.round((d[i] * 0.3 + d[i + 1] * 0.59 + d[i + 2] * 0.11) / 24) : -1); return out.join(','); };
    const draw = (mutate) => { const { w, home, bazaar } = street(); mutate({ w, home, bazaar }); w.day += 1; const s = scene(12, 11); drawOverlay(s.g, w, 'progress', ALL); return grey(s.c); };
    const one = draw(() => {});
    const ready = draw(({ home, bazaar }) => { bazaar.store.pottery = 300; home.stock.pottery = 40; });
    const many = draw(({ w }) => { for (const b of allBuildings(w)) if (b.type === 'well' || b.type === 'temple') removeBuilding(w, b.id); });
    expect(new Set([one, ready, many]).size).toBe(3);
  });
  it('Goods supply: homes that lack the good get a ring on hatching, homes that have it a dot, and a bazaar that holds some wears its amount', () => {
    const { w, home, bazaar } = street();
    const lacks = scene(12, 11);
    drawOverlay(lacks.g, w, 'supply', ALL, null, 'pottery');
    expect(washAlphas(lacks, home.x, home.y, 1, 1).size).toBeGreaterThan(1);       // hatched
    const [hx, hy] = lacks.at(12.5, 11.5);
    expect(pixelAt(lacks.c, hx, hy - 12)[3]).toBeGreaterThan(0);                   // the ring
    bazaar.store.pottery = 40;
    w.day += 1;
    const label = scene(9, 8);
    drawOverlay(label.g, w, 'supply', ALL, null, 'pottery');
    const [bx, by] = label.at(10, 9);
    let opaque = 0;
    for (let dx = -16; dx <= 16; dx++) if (pixelAt(label.c, bx + dx, by - 20)[3] === 255) opaque++;
    expect(opaque).toBeGreaterThan(8);                                              // the amount's label above the bazaar
    home.stock.pottery = 40;
    w.day += 1;
    const has = scene(12, 11);
    drawOverlay(has.g, w, 'supply', ALL, null, 'pottery');
    expect(canvasHash(has.c) === canvasHash(lacks.c)).toBe(false);
    expect(washAlphas(has, home.x, home.y, 1, 1).size).toBe(1);                    // no hatching once it has it
    home.stock = { pottery: 40 };                                                   // the same home now lacks food (and the bazaar has none)
    bazaar.store.grain = 0;
    w.day += 1;
    const food = scene(12, 11);
    drawOverlay(food.g, w, 'supply', ALL, null, 'food');
    expect(canvasHash(food.c) === canvasHash(has.c)).toBe(false);                         // the picked good decides what is drawn
  });
  it('Workers: a workplace short of staff is washed and labelled, hatched when it cannot work; hired in full it is clear', () => {
    const w = makeTestWorld();
    setRoad(w, 0, 10, 31, 10);
    const farm = addRaw(w, 'farm_grain', 2, 11);
    farm.staff = 6;
    const short = scene(2, 11);
    drawOverlay(short.g, w, 'workers', ALL);
    expect(inked(short.c)).toBeGreaterThan(40);
    expect(washAlphas(short, 2, 11, 2, 2).size).toBe(1);
    farm.staff = 1;
    w.day += 1;
    const stopped = scene(2, 11);
    drawOverlay(stopped.g, w, 'workers', ALL);
    expect(washAlphas(stopped, 2, 11, 2, 2).size).toBeGreaterThan(1);              // hatched: it does not work
    farm.staff = 10;
    w.day += 1;
    const full = scene(2, 11);
    drawOverlay(full.g, w, 'workers', ALL);
    expect(inked(full.c)).toBe(0);
  });
  it('Workers: the jobless are a wash over the districts that hold people, with the number drawn; water is left clear', () => {
    const w = makeTestWorld();
    addRaw(w, 'house', 2, 2, { tier: 2, residents: 30 });
    w.labour = { workforce: 100, employed: 60, jobs: 60, shortLevels: [] };
    const s = scene(3, 3, 2, 700);
    drawOverlay(s.g, w, 'workers', ALL);
    const [x, y] = s.at(3.5, 3.5);
    expect(pixelAt(s.c, x, y)[3]).toBeGreaterThan(0);                                // inside district 0,0
    const [ox, oy] = s.at(18.5, 3.5);
    expect(pixelAt(s.c, ox, oy)[3]).toBe(0);                                         // a district with nobody in it
    const [lx, ly] = s.at(6, 6);
    expect(pixelAt(s.c, lx, ly)[3]).toBe(255);                                       // the number's label at the district's middle
  });
  it('Workers: the jobless number sits at the own centre of its district, however the map is panned (a range that cuts the district does not move it)', () => {
    const w = makeTestWorld();
    addRaw(w, 'house', 2, 2, { tier: 2, residents: 30 });
    w.labour = { workforce: 100, employed: 60, jobs: 60, shortLevels: [] };
    for (const range of [ALL, { x0: 3, y0: 3, x1: 31, y1: 31 }, { x0: 0, y0: 0, x1: 8, y1: 8 }]) {
      const s = scene(3, 3, 2, 700);
      drawOverlay(s.g, w, 'workers', range);
      const [lx, ly] = s.at(6, 6);
      expect([range.x0, pixelAt(s.c, lx, ly)[3]]).toEqual([range.x0, 255]);
    }
  });
  it('only what is in the range is drawn, and the badges are left off when the map is too small to hold them (the washes stay)', () => {
    const { w } = street();
    const none = scene(12, 11);
    drawOverlay(none.g, w, 'progress', { x0: 25, y0: 25, x1: 31, y1: 31 });
    expect(inked(none.c)).toBe(0);
    const big = scene(12, 11, 2), small = scene(12, 11, BADGE_MIN_CSS / 2);
    drawOverlay(big.g, w, 'progress', ALL);
    drawOverlay(small.g, w, 'progress', ALL);
    const [bx, by] = big.at(12.5, 11.5);
    expect(pixelAt(big.c, bx, by - 12)[3]).toBe(255);
    expect(pixelAt(small.c, bx, by - 12)[3]).toBeLessThan(255);                      // a wash only
    expect(inked(small.c)).toBeGreaterThan(20);
    expect([badgeRadius(0.5), badgeRadius(1), badgeRadius(2), badgeRadius(8)]).toEqual([9, 8, 4.5, 4.5]);
  });
});
