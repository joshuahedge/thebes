import { describe, it, expect } from '../harness.js';
import { makeDraw } from '../../src/render/art/ctx.js';
import { H1, H2, H3, H4, HOUSE_ART } from '../../src/render/art/housing.js';
import { ART, boundsFor, slotFor } from '../../src/render/art/registry.js';
import { groundShadow } from '../../src/render/art/primitives.js';
import { makeCanvas, pixelAt, canvasHash } from '../helpers/canvas.js';

function drawAlone(fn) {
  const c = makeCanvas(240, 200);
  const ctx = c.getContext('2d');
  ctx.translate(120, 80);
  fn(makeDraw(ctx, 2), 0, 0);
  return c;
}

const inked = (c) => {
  let n = 0;
  for (let x = 0; x < c.width; x += 3) for (let y = 0; y < c.height; y += 3) if (pixelAt(c, x, y)[3] > 0) n++;
  return n;
};

describe('house art', () => {
  it('draws each tier with ink and a different look', () => {
    const hashes = new Set();
    for (const fn of [H1, H2, H3, H4]) {
      const c = drawAlone(fn);
      expect(inked(c)).toBeGreaterThan(100);
      hashes.add(canvasHash(c));
    }
    expect(hashes.size).toBe(4);
  });
  it('grows taller up the ladder', () => {
    expect(HOUSE_ART['house.t2'].height).toBeLessThan(HOUSE_ART['house.t3'].height);
    expect(HOUSE_ART['house.t3'].height).toBeLessThan(HOUSE_ART['house.t4'].height);
    expect(HOUSE_ART['house.t1'].height).toBeLessThan(HOUSE_ART['house.t4'].height);
  });
  it('registers the four tiers with footprints, bounds and shadows', () => {
    for (const t of [1, 2, 3, 4]) {
      const e = ART[`house.t${t}`];
      expect(e.w).toBe(1);
      expect(e.d).toBe(1);
      expect(e.bounds.length).toBe(4);
      expect(e.bounds[1]).toBeLessThan(0);
      expect(e.shadows.length).toBeGreaterThan(0);
      for (const s of e.shadows) expect(s.length).toBe(5);
      expect(typeof e.draw).toBe('function');
    }
    expect(ART['house.t0']).toBe(undefined);
  });
  it('draws its shadows inside the footprint area', () => {
    const c = drawAlone((g) => { for (const [dx, dy, w, d, h] of HOUSE_ART['house.t4'].shadows) groundShadow(g, dx, dy, w, d, h); });
    expect(inked(c)).toBeGreaterThan(20);
  });
  it('computes bounds that contain a 1x1 footprint of the given height', () => {
    expect(boundsFor(1, 1, 14)).toEqual([-24, -22, 24, 24]);
    expect(boundsFor(2, 2, 20, 10)).toEqual([-42, -30, 42, 42]);
  });
  it('names slots by tier for houses and by type otherwise', () => {
    expect(slotFor({ type: 'house', tier: 3 })).toBe('house.t3');
    expect(slotFor({ type: 'well' })).toBe('well');
  });
});
