import { describe, it, expect } from '../harness.js';
import { makeDraw } from '../../src/render/art/ctx.js';
import { well, farmGrain, granary, bazaar, temple, fieldTile, SERVICE_ART, SERVICE_EMBLEM } from '../../src/render/art/services.js';
import { ART } from '../../src/render/art/registry.js';
import { BUILDINGS } from '../../src/data/buildings.js';
import { TERRAIN } from '../../src/render/art/palette.js';
import { makeCanvas, pixelAt, canvasHash, nearColour } from '../helpers/canvas.js';

function drawAlone(fn, w = 320, h = 260, ox = 160, oy = 110) {
  const c = makeCanvas(w, h);
  const ctx = c.getContext('2d');
  ctx.translate(ox, oy);
  fn(makeDraw(ctx, 2), 0, 0);
  return c;
}

const inked = (c) => {
  let n = 0;
  for (let x = 0; x < c.width; x += 3) for (let y = 0; y < c.height; y += 3) if (pixelAt(c, x, y)[3] > 0) n++;
  return n;
};

describe('service art', () => {
  it('draws every Stage 1 service with ink and a different look', () => {
    const hashes = new Set();
    for (const fn of [well, farmGrain, granary, bazaar, temple]) {
      const c = drawAlone(fn);
      // The well is a 1x1 footprint (738 inked device px, 84 at this sampling stride); the 2x2 services sample 486 and up.
      expect(inked(c)).toBeGreaterThan(50);
      hashes.add(canvasHash(c));
    }
    expect(hashes.size).toBe(5);
  });
  it('fills the farm with green field rows', () => {
    const c = drawAlone(farmGrain);
    // art (0, 16) is the centre of the 2x2 footprint -> canvas (160, 142) at scale 2
    const px = pixelAt(c, 160, 142);
    expect(px[1]).toBeGreaterThan(px[0]);
    expect(px[1]).toBeGreaterThan(px[2]);
    const f = drawAlone((g) => fieldTile(g, 0, 0, 'grain'));
    expect(nearColour(pixelAt(f, 160, 126), TERRAIN.field, 60)).toBe(true);
  });
  it('registers every Stage 1 building type with its real footprint', () => {
    for (const type of ['well', 'farm_grain', 'granary', 'bazaar', 'temple']) {
      const e = ART[type];
      expect(e.w).toBe(BUILDINGS[type].w);
      expect(e.d).toBe(BUILDINGS[type].d);
      expect(e.height).toBeGreaterThan(0);
      expect(e.bounds.length).toBe(4);
      expect(e.shadows.length).toBeGreaterThan(0);
      expect(typeof e.draw).toBe('function');
      expect(typeof SERVICE_EMBLEM[type]).toBe('string');
    }
    // well, granary, bazaar, temple, garden, statue and booth; 4 granary and 3 bazaar stage slots; four farms with a plain slot and 4 stage slots each
    expect(Object.keys(SERVICE_ART).length).toBe(34);
  });
  it('keeps the temple the tallest and the farm the lowest', () => {
    expect(SERVICE_ART.temple.height).toBeGreaterThan(SERVICE_ART.granary.height);
    expect(SERVICE_ART.farm_grain.height).toBeLessThan(SERVICE_ART.well.height);
  });
});
