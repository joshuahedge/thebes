import { describe, it, expect } from '../../harness.js';
import { makeDraw } from '../../../src/render/art/ctx.js';
import { ART, slotFor } from '../../../src/render/art/registry.js';
import { RUBBLE_VARIANTS, FIREHOUSE_EMBLEM, DEFENCE_EMBLEM } from '../../../src/render/art/defence.js';
import { BUILDINGS } from '../../../src/data/buildings.js';
import { CATEGORY_TINT } from '../../../src/data/ui.js';
import { RED, TEAL, GOLD, TERRAIN } from '../../../src/render/art/palette.js';
import { makeCanvas, canvasHash, nearColour } from '../../helpers/canvas.js';

const SCALE = 3;
// A slot drawn alone, its footprint origin placed so the whole of its bounds fits the canvas.
function drawSlot(slot) {
  const def = ART[slot];
  const [l, t, r, b] = def.bounds;
  const c = makeCanvas(Math.ceil((r - l) * SCALE), Math.ceil((b - t) * SCALE));
  const ctx = c.getContext('2d');
  ctx.translate(-l * SCALE, -t * SCALE);
  def.draw(makeDraw(ctx, SCALE), 0, 0);
  return c;
}
// Solid pixels that pass test([r, g, b]).
function count(c, test = () => true) {
  const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
  let n = 0;
  for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 200 && test([d[i], d[i + 1], d[i + 2]])) n++;
  return n;
}
// The highest inked row, in art px above the footprint origin's ground point (p(0, 0) is the back corner).
function inkTop(slot) {
  const c = drawSlot(slot), [, t] = ART[slot].bounds;
  const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
  for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) if (d[(y * c.width + x) * 4 + 3] > 40) return y / SCALE + t;
  return null;
}

describe('s3 art buildings', () => {
  it('draws the firehouse, tower, barracks and rubble on their real footprints, each a picture of its own', () => {
    const hashes = new Set();
    for (const type of ['firehouse', 'tower', 'barracks', 'rubble', 'wall', 'gate']) {
      const def = ART[type];
      if (!BUILDINGS[type].tile) expect([type, def.w, def.d]).toEqual([type, BUILDINGS[type].w, BUILDINGS[type].d]);
      expect([type, typeof def.draw, def.bounds.length, def.height > 0]).toEqual([type, 'function', 4, true]);
      const c = drawSlot(type);
      expect([type, count(c) > 400]).toEqual([type, true]);
      hashes.add(canvasHash(c));
    }
    expect(hashes.size).toBe(6);
  });
  it('gives the firehouse its red emblem and the tower and barracks teal shields and the Defence colour (spec 5.3)', () => {
    expect([FIREHOUSE_EMBLEM, DEFENCE_EMBLEM]).toEqual([RED, CATEGORY_TINT.defence]);
    const red = (c) => count(c, (px) => nearColour(px, RED, 24));
    const teal = (c) => count(c, (px) => nearColour(px, TEAL, 24));
    const defence = (c) => count(c, (px) => nearColour(px, DEFENCE_EMBLEM, 16));
    const [fh, tw, bk] = ['firehouse', 'tower', 'barracks'].map(drawSlot);
    expect(red(fh)).toBeGreaterThan(150);                                        // the band, the awning and the pennant
    expect([teal(tw) > 30, defence(tw) > 20]).toEqual([true, true]);
    expect([teal(bk) > 60, defence(bk) > 60]).toEqual([true, true]);
    expect(red(tw)).toBeLessThan(red(fh) / 3);                                    // red is the firehouse's, not the tower's
  });
  it('draws rubble as a raised heap of broken brick in three variants, never as an empty plot', () => {
    expect(ART['house.t0']).toBe(undefined);                                     // an empty plot is the terrain's bare pad, with no sprite
    expect(inkTop('rubble')).toBeLessThan(8 - 3);                                // the heap and its stub rise above the tile's centre (art y 8)
    const variants = [];
    for (let v = 0; v < RUBBLE_VARIANTS; v++) variants.push(canvasHash(drawSlot(`rubble.v${v}`)));
    expect([RUBBLE_VARIANTS, new Set(variants).size]).toEqual([3, 3]);
    expect([4, 5, 6, 7].map((id) => slotFor({ id, type: 'rubble', x: 0, y: 0 }))).toEqual(['rubble.v1', 'rubble.v2', 'rubble.v0', 'rubble.v1']);
    expect(canvasHash(drawSlot('rubble'))).toBe(variants[0]);                    // the plain slot is the first heap
  });
  it('keeps each slot\'s height at its highest point, so taps and problem badges sit right', () => {
    for (const slot of ['firehouse', 'tower', 'barracks', 'rubble', 'rubble.v1', 'rubble.v2', 'wall', 'gate']) {
      const top = inkTop(slot), h = ART[slot].height;
      expect([slot, top >= -h - 1]).toEqual([slot, true]);                       // nothing drawn above the declared height
    }
    expect(ART.tower.height).toBeGreaterThan(Math.max(ART.firehouse.height, ART.barracks.height));
    expect(ART.rubble.height).toBeLessThan(ART.firehouse.height / 3);
  });
  it('draws the Wall card as a run of mudbrick and the gate as an arch over a road, in painted bands', () => {
    const gate = drawSlot('gate'), wall = drawSlot('wall');
    const road = (c) => count(c, (px) => nearColour(px, TERRAIN.roadEdge, 6));   // the road's worn edge: the wall has none of it
    expect([road(gate) > 300, road(wall) < 40]).toEqual([true, true]);
    for (const band of [RED, TEAL, GOLD]) expect([band, count(gate, (px) => nearColour(px, band, 20)) > 10]).toEqual([band, true]);
  });
});
