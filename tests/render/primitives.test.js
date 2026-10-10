import { describe, it, expect } from '../harness.js';
import { makeDraw } from '../../src/render/art/ctx.js';
import { WASH, WASH2, MUD, STONE, BLUE, GOLD, RED, TEAL, TEAL_DARK } from '../../src/render/art/palette.js';
import {
  tb, box, qd, crs, door, win, parapet, mat, rug, pots, fence, stairs, ladder, post, awn, col, bed, pool, statue,
  groundShadow, tile, p, U,
} from '../../src/render/art/primitives.js';
import { makeCanvas, pixelAt } from '../helpers/canvas.js';

// A 200 x 200 canvas at scale 2 with the art origin in the middle, so tile (0, 0) sits around (100, 100).
function scene() {
  const c = makeCanvas(200, 200);
  const ctx = c.getContext('2d');
  ctx.translate(100, 100);
  return { c, g: makeDraw(ctx, 2) };
}

const inked = (c, x0, y0, x1, y1) => {
  let n = 0;
  for (let x = x0; x < x1; x += 2) for (let y = y0; y < y1; y += 2) if (pixelAt(c, x, y)[3] > 0) n++;
  return n;
};

describe('art primitives', () => {
  it('maps block faces like the mock-up', () => {
    const { g } = scene();
    const F = tb(g, 0, 0, 1, 1, 10, 0, 0, WASH);
    expect(F.L(0, 0)).toEqual(U(p(0, 1), 0));
    expect(F.L(1, 10)).toEqual(U(p(1, 1), 10));
    expect(F.R(0, 0)).toEqual(U(p(1, 0), 0));
    expect(F.R(1, 0)).toEqual(U(p(1, 1), 0));
    const T = tb(g, 0, 0, 1, 1, 10, 0, 0.25, WASH);
    expect(T.L(0, 10)).toEqual(U(p(0.25, 0.75), 10));
  });
  it('paints a block and leaves the ground outside it clear', () => {
    const { c, g } = scene();
    box(g, 0, 0, 1, 1, 10, 0, WASH);
    expect(pixelAt(c, 100, 96)[3]).toBe(255);    // centre of the top face (art 0, -2)
    expect(pixelAt(c, 100, 120)[3]).toBe(255);   // inside the lit face (art 0, 10)
    expect(pixelAt(c, 20, 20)[3]).toBe(0);
  });
  it('lays two shadow layers at 12% and 8%', () => {
    const { c, g } = scene();
    groundShadow(g, 0, 0, 1, 1, 10);
    const a = pixelAt(c, 104, 116)[3];
    expect(a).toBeGreaterThan(20);
    expect(a).toBeLessThan(90);
  });
  it('draws every detail primitive without throwing and with ink', () => {
    const { c, g } = scene();
    const F = box(g, 0, 0, 1, 1, 10, 0, WASH);
    crs(g, F, 10, '#9C7A54', 2.2);
    door(g, F, 0.36, 0.6, 4.4);
    win(g, F.R, 0.3, 0.5, 5, 7);
    qd(g, F.L, 0, 1, 8, 9, TEAL);
    parapet(g, 0, 0, 1, 1, 10);
    mat(g, 0.2, 0.2, 0.4, 0.3, 10, BLUE, GOLD);
    rug(g, 0.3, 0.3, 0.4, 0.3, 10, RED, '#F2D7A8', GOLD);
    pots(g, U(p(0.8, 0.5), 10), 2);
    fence(g, -1, -1, 1, 0.07);
    stairs(g, -1, 0.5, 0.4, 0.13, 8, 5, WASH2);
    ladder(g, U(p(0.6, 0.7), 10), U(p(0.6, 0.6), 16));
    post(g, -1, 1, 0, 5);
    awn(g, 1.1, 0, 0.5, 0.5, 8, TEAL, TEAL_DARK);
    col(g, -0.5, 1.5, 9, 0);
    bed(g, 1, 1, 0.6, 0.3);
    pool(g, 1.5, 1.5, 0.5, 0.3);
    statue(g, -1.5, 1.5);
    tile(g, 2, 2, MUD[0]);
    expect(inked(c, 0, 0, 200, 200)).toBeGreaterThan(400);
  });
  it('draws plain faces when fx is 0', () => {
    const a = scene(), b = scene();
    box(a.g, 0, 0, 1, 1, 10, 0, STONE, 0);
    box(b.g, 0, 0, 1, 1, 10, 0, STONE);
    // With outlines and the gradient the bottom of the lit face is darker than the plain version.
    const pa = pixelAt(a.c, 86, 122), pb = pixelAt(b.c, 86, 122);
    expect(pa[0] + pa[1] + pa[2]).toBeGreaterThan(pb[0] + pb[1] + pb[2]);
  });
});
