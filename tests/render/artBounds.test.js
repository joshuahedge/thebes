import { describe, it, expect } from '../harness.js';
import { ART } from '../../src/render/art/registry.js';
import { makeDraw } from '../../src/render/art/ctx.js';
import { makeCanvas } from '../helpers/canvas.js';

const M = 8;       // margin in art px around the declared bounds
const SCALE = 2;   // device px per art px

describe('art bounds', () => {
  it("keeps every slot's ink inside its bounds", () => {
    const failing = [];
    for (const [slot, def] of Object.entries(ART)) {
      if (!def.draw) continue;
      const [left, top, right, bottom] = def.bounds;
      const w = Math.ceil((right - left + 2 * M) * SCALE), h = Math.ceil((bottom - top + 2 * M) * SCALE);
      const canvas = makeCanvas(w, h);
      const ctx = canvas.getContext('2d');
      ctx.translate((-left + M) * SCALE, (-top + M) * SCALE);
      def.draw(makeDraw(ctx, SCALE), 0, 0);
      const data = ctx.getImageData(0, 0, w, h).data;
      const ring = M * SCALE;
      let overX = 0, overY = 0;
      for (let y = 0; y < h; y += 2) {
        for (let x = 0; x < w; x += 2) {
          if (x >= ring && x < w - ring && y >= ring && y < h - ring) continue;
          if (data[(y * w + x) * 4 + 3] === 0) continue;
          overX = Math.max(overX, x < ring ? ring - x : x >= w - ring ? x - (w - ring) + 1 : 0);
          overY = Math.max(overY, y < ring ? ring - y : y >= h - ring ? y - (h - ring) + 1 : 0);
        }
      }
      if (overX || overY) failing.push(`${slot}: ink ${overX / SCALE} art px outside in x, ${overY / SCALE} in y`);
    }
    expect(failing).toEqual([]);
  });
});
