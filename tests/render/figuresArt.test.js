import { describe, it, expect } from '../harness.js';
import { makeDraw } from '../../src/render/art/ctx.js';
import { fig, FIGURE_KINDS, FIGURE_ART } from '../../src/render/art/figures.js';
import { ART } from '../../src/render/art/registry.js';
import { makeCanvas, pixelAt, canvasHash } from '../helpers/canvas.js';

function drawAlone(fn) {
  const c = makeCanvas(120, 120);
  const ctx = c.getContext('2d');
  ctx.translate(60, 90);
  fn(makeDraw(ctx, 2));
  return c;
}

const inked = (c) => {
  let n = 0;
  for (let x = 0; x < c.width; x += 2) for (let y = 0; y < c.height; y += 2) if (pixelAt(c, x, y)[3] > 0) n++;
  return n;
};

describe('figure art', () => {
  it('draws every kind with ink and tells them apart', () => {
    const hashes = new Set();
    for (const kind of FIGURE_KINDS) {
      const c = drawAlone((g) => fig(g, 0, 0, kind));
      expect(inked(c)).toBeGreaterThan(30);
      hashes.add(canvasHash(c));
    }
    expect(hashes.size).toBe(FIGURE_KINDS.length);
  });
  it('stands on its feet point and fits the registered bounds', () => {
    const c = drawAlone((g) => fig(g, 0, 0, 'citizen'));
    // feet shadow at art (0, 0) -> canvas (60, 90); the head is about 11 art px up
    expect(pixelAt(c, 60, 90)[3]).toBeGreaterThan(0);
    expect(pixelAt(c, 60, 70)[3]).toBeGreaterThan(0);
    expect(pixelAt(c, 60, 20)[3]).toBe(0);
    for (const kind of FIGURE_KINDS) {
      const e = ART[`fig.${kind}`];
      expect(e.w).toBe(0);
      expect(e.bounds).toEqual([-14, -30, 14, 6]);
      expect(e.shadows).toEqual([]);
    }
    expect(Object.keys(FIGURE_ART).length).toBe(FIGURE_KINDS.length);
  });
});
