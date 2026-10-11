import { describe, it, expect } from '../harness.js';
import { makeDraw } from '../../src/render/art/ctx.js';
import { H1, H2, H3, H4, H5, H6, H7, H8, H9, BIG, PERGOLA, ROOF_GARDEN, ROOF_POOL } from '../../src/render/art/housing.js';
import { ART, boundsFor, slotFor } from '../../src/render/art/registry.js';
import { RED, GOLD, TEAL, ORANGE, GREEN, PURP } from '../../src/render/art/palette.js';
import { p, U } from '../../src/render/iso.js';
import { makeCanvas, pixelAt, canvasHash, nearColour, hexToRgb } from '../helpers/canvas.js';

// Drawn alone at scale 2 (zoom 1 on a 1x screen), the footprint origin at canvas (160, 110), as the other art tests do.
const OX = 160, OY = 110;
function drawAlone(fn) {
  const c = makeCanvas(320, 260);
  const ctx = c.getContext('2d');
  ctx.translate(OX, OY);
  fn(makeDraw(ctx, 2), 0, 0);
  return c;
}
const at = (c, q) => pixelAt(c, OX + q[0] * 2, OY + q[1] * 2);
const inked = (c) => {
  let n = 0;
  for (let x = 0; x < c.width; x += 3) for (let y = 0; y < c.height; y += 3) if (pixelAt(c, x, y)[3] > 0) n++;
  return n;
};
const greenish = (px) => px[3] > 0 && px[1] > px[0] + 15 && px[1] > px[2] + 15;
const DRAW = { 5: H5, 6: H6, 7: H7, 8: H8, 9: H9 };
// A point on the lit (+y) face of a big home's main block, u along it and s up it (the block's own face mapper).
const mainFace = (u, s) => U(p(0.1 + 1.2 * u, 0.92), s);

describe('house art, tiers 5 to 9', () => {
  it('draws every tier with ink and a look of its own', () => {
    const hashes = new Set();
    for (const fn of [H1, H2, H3, H4, H5, H6, H7, H8, H9]) {
      const c = drawAlone(fn);
      expect(inked(c)).toBeGreaterThan(100);
      hashes.add(canvasHash(c));
    }
    expect(hashes.size).toBe(9);
  });
  it('registers the Townhouse as 1x1 and Manor to Estate as 2x2, each taller than the tier below', () => {
    const e5 = ART['house.t5'];
    expect([e5.w, e5.d, e5.draw]).toEqual([1, 1, H5]);
    expect(e5.height).toBeGreaterThan(ART['house.t4'].height);
    for (const t of [6, 7, 8, 9]) {
      const e = ART[`house.t${t}`];
      expect([t, e.w, e.d]).toEqual([t, 2, 2]);
      expect(e.shadows).toEqual([[0.1, 0.1, 1.2, 0.82, BIG[t].hA + 3], [1.25, 0.1, 0.65, 1.25, BIG[t].hB + 3]]);
      expect(typeof e.draw).toBe('function');
    }
    for (const t of [5, 6, 7, 8, 9]) expect(ART[`house.t${t}`].bounds).toEqual(boundsFor(ART[`house.t${t}`].w, ART[`house.t${t}`].d, ART[`house.t${t}`].height));
    expect(ART['house.t6'].height).toBeLessThan(ART['house.t7'].height);
    expect(ART['house.t7'].height).toBeLessThan(ART['house.t8'].height);
    expect(ART['house.t8'].height).toBeLessThan(ART['house.t9'].height);
    expect([6, 7, 8, 9].map((t) => BIG[t].hA)).toEqual([13, 14, 15, 18]);   // the mock-up's main blocks rise tier by tier
  });
  it('names a slot for every tier and nothing past the top', () => {
    for (let t = 1; t <= 9; t++) {
      expect(slotFor({ type: 'house', tier: t })).toBe(`house.t${t}`);
      expect(typeof ART[`house.t${t}`].draw).toBe('function');
    }
    expect(ART['house.t10']).toBe(undefined);
  });
  it('keeps the striped awning on the Townhouse roof and on the annexe of every big home', () => {
    // the Townhouse awning's top: tb(x + 0.12, y + 0.12, 0.44, 0.42, 1.2, 21.2) seen at its middle
    const t5 = at(drawAlone(H5), U(p(0.34, 0.33), 22.4));
    expect(t5[1] > t5[0] && t5[2] > t5[0]).toBe(true);                    // teal, under a pale stripe wash
    // the big homes' annexe awning top, in each tier's own colour under the same pale stripe wash (a quarter strength)
    const washed = (hex) => { const [r, g, b] = hexToRgb(hex), [sr, sg, sb] = hexToRgb('#F6ECD6'); return [r * 0.75 + sr * 0.25, g * 0.75 + sg * 0.25, b * 0.75 + sb * 0.25]; };
    const colours = { 6: ORANGE, 7: GREEN, 8: TEAL, 9: PURP };
    for (const t of [6, 7, 8, 9]) {
      const px = at(drawAlone(DRAW[t]), U(p(1.57, 0.455), BIG[t].hB + 4.2 + 1.2));
      const want = washed(colours[t]);
      expect([t, Math.max(...[0, 1, 2].map((k) => Math.abs(px[k] - want[k]))) <= 12]).toEqual([t, true]);
    }
  });
  it('shows one more roof tell at each tier from 6, readable at zoom 1', () => {
    const c = {};
    for (const t of [6, 7, 8, 9]) c[t] = drawAlone(DRAW[t]);
    // 6: the pergola's slats, brown timber over the roof mat, from tier 6 up
    for (const t of [6, 7, 8, 9]) {
      const slat = at(c[t], U(p(PERGOLA.x + PERGOLA.w * 0.6, PERGOLA.y + PERGOLA.d * 0.5), BIG[t].hA + PERGOLA.h + 0.7));
      expect([t, nearColour(slat, '#A9805A', 30)]).toEqual([t, true]);
    }
    // 7: the roof garden on the front of the annexe roof: mostly green from 7 up, bare roof on a Manor
    const gardenGreen = (t, hB) => {
      let n = 0;
      for (const [u, v] of [[0.3, 0.3], [0.5, 0.45], [0.7, 0.4], [0.4, 0.7], [0.75, 0.75]]) {
        if (greenish(at(c[t], U(p(ROOF_GARDEN.x + ROOF_GARDEN.w * u, ROOF_GARDEN.y + ROOF_GARDEN.d * v), hB + 1.4)))) n++;
      }
      return n;
    };
    expect(gardenGreen(6, BIG[6].hB)).toBe(0);
    for (const t of [7, 8, 9]) expect([t, gardenGreen(t, BIG[t].hB) >= 4]).toEqual([t, true]);
    // 8: a red parapet band below the teal one, which a Fine manor does not have
    expect(nearColour(at(c[8], mainFace(0.85, 13.2)), RED, 12)).toBe(true);
    expect(nearColour(at(c[7], mainFace(0.85, 13.2)), RED, 60)).toBe(false);
    expect(nearColour(at(c[7], mainFace(0.85, 13.2)), TEAL, 12)).toBe(true);
    expect(nearColour(at(c[9], mainFace(0.85, 17.2)), GOLD, 12)).toBe(true);   // the Estate's top band is gold
    // 9: a pink flag above the roof, and a pool on it
    const q = U(p(1.1, 0.25), BIG[9].hA);
    const flag = [q[0] + 2.3, q[1] - 12.5];
    expect(nearColour(at(c[9], flag), '#D9667A', 12)).toBe(true);
    expect(at(c[8], flag)[3]).toBe(0);
    const water = U(p(ROOF_POOL.x + ROOF_POOL.w * 0.8, ROOF_POOL.y + ROOF_POOL.d * 0.5), BIG[9].hA + 0.2);
    expect(nearColour(at(c[9], water), '#4FB3B5', 30)).toBe(true);
    expect(nearColour(at(c[8], U(p(ROOF_POOL.x + ROOF_POOL.w * 0.8, ROOF_POOL.y + ROOF_POOL.d * 0.5), BIG[8].hA)), '#4FB3B5', 60)).toBe(false);
  });
});
