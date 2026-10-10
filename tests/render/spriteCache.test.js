import { describe, it, expect } from '../harness.js';
import { ZOOM_BUCKETS, bucketFor, spriteKey, createSpriteCache, drawSprite } from '../../src/render/spriteCache.js';
import { ART } from '../../src/render/art/registry.js';
import { makeCanvas, pixelAt, nearColour } from '../helpers/canvas.js';

describe('sprite cache', () => {
  it('buckets zoom upwards to the nearest baked size', () => {
    expect(ZOOM_BUCKETS).toEqual([0.5, 0.75, 1, 1.5, 2]);
    expect(bucketFor(0.5)).toBe(0.5);
    expect(bucketFor(0.6)).toBe(0.75);
    expect(bucketFor(1)).toBe(1);
    expect(bucketFor(1.2)).toBe(1.5);
    expect(bucketFor(2)).toBe(2);
    expect(bucketFor(3)).toBe(2);
    expect(spriteKey('well', 1.5, 2)).toBe('well@1.5x2');
  });
  it('renders a slot once per bucket and dpr and counts hits', () => {
    const counter = { hits: 0, misses: 0 };
    const cache = createSpriteCache({ counter });
    const a = cache.get('well', 1, 1);
    const b = cache.get('well', 1, 1);
    const c = cache.get('well', 1.2, 1);
    const d = cache.get('well', 1, 2);
    expect(a).toBe(b);
    expect(a === c).toBe(false);
    expect(a === d).toBe(false);
    expect(counter).toEqual({ hits: 1, misses: 3 });
    expect(cache.size()).toBe(3);
    cache.clear();
    expect(cache.size()).toBe(0);
    expect(cache.get('no_such_slot', 1, 1)).toBe(null);
  });
  it('anchors the art origin and paints the well centre', () => {
    const cache = createSpriteCache();
    const s = cache.get('well', 1, 1);
    const [l, t] = ART.well.bounds;
    expect(s.scale).toBe(2);
    expect(s.ax).toBe(-l * 2);
    expect(s.ay).toBe(-t * 2);
    // the tile centre of a 1x1 footprint is art (0, 8)
    expect(pixelAt(s.canvas, s.ax, s.ay + 16)[3]).toBeGreaterThan(0);
    expect(pixelAt(s.canvas, 1, 1)[3]).toBe(0);
    const hi = cache.get('temple', 2, 2);
    expect(hi.scale).toBe(8);
    expect(hi.canvas.width).toBeGreaterThan(s.canvas.width);
  });
  it('draws a sprite onto a canvas at the right place and zoom', () => {
    const cache = createSpriteCache();
    const c = makeCanvas(200, 200);
    const ctx = c.getContext('2d');
    drawSprite(ctx, cache.get('house.t1', 1, 1), 100, 100, 1, 1);
    expect(pixelAt(c, 100, 112)[3]).toBeGreaterThan(0);
    expect(pixelAt(c, 10, 10)[3]).toBe(0);
    const z = makeCanvas(200, 200);
    drawSprite(z.getContext('2d'), cache.get('house.t1', 0.5, 1), 100, 100, 0.5, 1);
    let big = 0, small = 0;
    for (let x = 0; x < 200; x += 2) for (let y = 0; y < 200; y += 2) {
      if (pixelAt(c, x, y)[3] > 0) big++;
      if (pixelAt(z, x, y)[3] > 0) small++;
    }
    expect(small).toBeLessThan(big);
  });
  it('can serve a slot from a PNG with no other change', async () => {
    const src = makeCanvas(4, 4);
    const sctx = src.getContext('2d');
    sctx.fillStyle = '#C4473A';
    sctx.fillRect(0, 0, 4, 4);
    const registry = { 'test.png': { w: 1, d: 1, height: 4, bounds: [0, -4, 4, 0], shadows: [], png: { src: src.toDataURL(), ax: 0, ay: 4, scale: 1 } } };
    const counter = { hits: 0, misses: 0, pending: 0 };
    const cache = createSpriteCache({ registry, counter });
    const first = cache.get('test.png', 1, 1);
    await cache.ready('test.png');
    const s = cache.get('test.png', 1, 1);
    expect(s === null).toBe(false);
    expect(first === null || first === s).toBe(true);
    expect(nearColour(pixelAt(s.canvas, 4, 4), '#C4473A', 8)).toBe(true);
    expect(counter.misses).toBe(1);
  });
});
