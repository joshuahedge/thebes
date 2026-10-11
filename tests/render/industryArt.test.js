import { describe, it, expect } from '../harness.js';
import { makeDraw } from '../../src/render/art/ctx.js';
import { clayPit, potter, brewery, weaver, gemMine, jeweller, storehouse, tradingPost, INDUSTRY_ART, PLAIN_STORE_STAGE } from '../../src/render/art/industry.js';
import { storehouseStage } from '../../src/render/art/stages.js';
import { ART, boundsFor, slotFor } from '../../src/render/art/registry.js';
import { INDUSTRY_TINT } from '../../src/render/art/palette.js';
import { BUILDINGS } from '../../src/data/buildings.js';
import { drawThumb } from '../../src/ui/thumbs.js';
import { makeCanvas, canvasHash, hexToRgb } from '../helpers/canvas.js';

// A 2x2 building drawn alone at scale 2 (zoom 1 on a 1x screen) with its art origin at canvas (160, 110).
function drawAlone(fn) {
  const c = makeCanvas(320, 260);
  const ctx = c.getContext('2d');
  ctx.translate(160, 110);
  fn(makeDraw(ctx, 2), 0, 0);
  return c;
}
// How many solid pixels are within tol of any of the colours.
const countNear = (c, hexes, tol) => {
  const want = hexes.map(hexToRgb);
  const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
  let n = 0;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] < 250) continue;
    if (want.some(([r, g, b]) => Math.abs(d[i] - r) <= tol && Math.abs(d[i + 1] - g) <= tol && Math.abs(d[i + 2] - b) <= tol)) n++;
  }
  return n;
};
// How many solid pixels there are.
const solid = (c) => {
  const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
  let n = 0;
  for (let i = 3; i < d.length; i += 4) if (d[i] >= 250) n++;
  return n;
};
const TYPES = ['clay_pit', 'potter', 'brewery', 'weaver', 'gem_mine', 'jeweller', 'storehouse', 'trading_post'];
const DRAW = [clayPit, potter, brewery, weaver, gemMine, jeweller, storehouse, tradingPost];

describe('industry art', () => {
  it('draws every workshop, the storehouse and the trading post with ink and a look of its own', () => {
    const hashes = new Set();
    for (const fn of DRAW) {
      const c = drawAlone(fn);
      expect(solid(c)).toBeGreaterThan(2000);                                  // solid ink across a good part of the 2x2
      hashes.add(canvasHash(c));
    }
    expect(hashes.size).toBe(DRAW.length);
  });
  it('registers each with its real 2x2 footprint, bounds from its height, and ground shadows', () => {
    for (const type of TYPES) {
      const e = ART[type];
      expect([type, e.w, e.d]).toEqual([type, BUILDINGS[type].w, BUILDINGS[type].d]);
      expect([type, e.w, e.d]).toEqual([type, 2, 2]);
      expect([type, e.bounds]).toEqual([type, boundsFor(2, 2, e.height)]);
      expect([type, e.shadows.length > 0]).toEqual([type, true]);
      for (const s of e.shadows) expect(s.length).toBe(5);
      expect(slotFor({ type, store: {} }) === type || type === 'storehouse').toBe(true);
    }
    expect(ART.trading_post.height).toBeGreaterThan(ART.storehouse.height);   // its flag is the tallest thing in the yard
  });
  it('flies a pennant in the industry tint over every workshop, the storehouse, the trading post and the industry farms', () => {
    for (const type of [...TYPES, 'farm_barley', 'farm_flax']) {
      const c = drawAlone((g) => ART[type].draw(g, 0, 0));
      expect([type, countNear(c, [INDUSTRY_TINT], 6) > 15]).toEqual([type, true]);
    }
  });
  it('fills the storehouse yard in four stages by its share of capacity, counting every good', () => {
    const cap = BUILDINGS.storehouse.capacity;
    const stage = (n) => storehouseStage({ type: 'storehouse', store: { pottery: n } });
    expect(storehouseStage({ type: 'storehouse', store: {} })).toBe(0);
    expect([stage(0), stage(1), stage(cap / 3 - 1), stage(cap / 3), stage((2 * cap) / 3 - 1), stage((2 * cap) / 3), stage(cap)]).toEqual([0, 1, 1, 2, 2, 3, 3]);
    expect(storehouseStage({ type: 'storehouse', store: { pottery: cap / 3, clay: cap / 3 } })).toBe(3);
  });
  it('names the storehouse slot by its stock and registers each stage like the plain slot, each drawn differently', () => {
    const cap = BUILDINGS.storehouse.capacity;
    expect(slotFor({ type: 'storehouse', store: {} })).toBe('storehouse.s0');
    expect(slotFor({ type: 'storehouse', store: { clay: cap } }, { day: 3 })).toBe('storehouse.s3');
    const plain = ART.storehouse, hashes = new Set();
    for (let s = 0; s < 4; s++) {
      const e = INDUSTRY_ART[`storehouse.s${s}`];
      expect([s, e.w, e.d, e.height, e.bounds, e.shadows]).toEqual([s, plain.w, plain.d, plain.height, plain.bounds, plain.shadows]);
      hashes.add(canvasHash(drawAlone((g) => e.draw(g, 0, 0))));
    }
    expect(hashes.size).toBe(4);
    expect(PLAIN_STORE_STAGE).toBe(3);
    expect(canvasHash(drawAlone((g) => plain.draw(g, 0, 0)))).toBe(canvasHash(drawAlone((g) => ART['storehouse.s3'].draw(g, 0, 0))));
  });
  it('piles more crates, bales and jars in the yard at each stage', () => {
    const goods = (s) => countNear(drawAlone((g) => storehouse(g, 0, 0, s)), ['#C9A26A', '#A8814E', '#86705E', '#DCC27A', '#C4A85E', '#C9552F'], 8);
    const n = [0, 1, 2, 3].map(goods);
    expect(n[0]).toBe(0);
    expect(n[1]).toBeGreaterThan(n[0]);
    expect(n[2]).toBeGreaterThan(n[1]);
    expect(n[3]).toBeGreaterThan(n[2]);
  });
  it('draws a card picture for each', () => {
    for (const type of TYPES) {
      const c = drawThumb(document.createElement('canvas'), type, 1);
      expect([type, solid(c) > 150]).toEqual([type, true]);
    }
  });
});
