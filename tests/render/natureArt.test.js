import { describe, it, expect } from '../harness.js';
import { makeDraw } from '../../src/render/art/ctx.js';
import { palmAt, acacia, reeds, rock, scrub, dune, tufts, NATURE_ART } from '../../src/render/art/nature.js';
import { ART } from '../../src/render/art/registry.js';
import { makeCanvas, pixelAt, canvasHash } from '../helpers/canvas.js';

function drawAlone(fn) {
  const c = makeCanvas(200, 200);
  const ctx = c.getContext('2d');
  ctx.translate(100, 120);
  fn(makeDraw(ctx, 2));
  return c;
}

const inked = (c) => {
  let n = 0;
  for (let x = 0; x < c.width; x += 2) for (let y = 0; y < c.height; y += 2) if (pixelAt(c, x, y)[3] > 0) n++;
  return n;
};

describe('nature art', () => {
  it('draws trees, reeds, rocks, scrub and dunes with ink', () => {
    expect(inked(drawAlone((g) => palmAt(g, 0.5, 0.5, 1)))).toBeGreaterThan(150);
    expect(inked(drawAlone((g) => acacia(g, 0.5, 0.5)))).toBeGreaterThan(150);
    expect(inked(drawAlone((g) => reeds(g, [0, 0])))).toBeGreaterThan(10);
    expect(inked(drawAlone((g) => rock(g, [0, 0])))).toBeGreaterThan(10);
    expect(inked(drawAlone((g) => scrub(g, [0, 0])))).toBeGreaterThan(10);
    expect(inked(drawAlone((g) => dune(g, [0, 0])))).toBeGreaterThan(5);
    expect(inked(drawAlone((g) => tufts(g, 0, 0, 9)))).toBeGreaterThan(5);
  });
  it('scales a palm', () => {
    const big = inked(drawAlone((g) => palmAt(g, 0.5, 0.5, 1)));
    const small = inked(drawAlone((g) => palmAt(g, 0.5, 0.5, 0.6)));
    expect(small).toBeLessThan(big);
  });
  it('places tufts deterministically by tile and salt', () => {
    const a = canvasHash(drawAlone((g) => tufts(g, 1, 1, 6, 0)));
    const b = canvasHash(drawAlone((g) => tufts(g, 1, 1, 6, 0)));
    const c = canvasHash(drawAlone((g) => tufts(g, 1, 1, 6, 5)));
    expect(a).toBe(b);
    expect(a === c).toBe(false);
  });
  it('registers palm and acacia slots', () => {
    for (const slot of ['palm', 'acacia']) {
      expect(NATURE_ART[slot].w).toBe(1);
      expect(ART[slot].bounds.length).toBe(4);
      expect(ART[slot].shadows).toEqual([]);
      expect(inked(drawAlone((g) => ART[slot].draw(g, 0, 0)))).toBeGreaterThan(100);
    }
  });
});
