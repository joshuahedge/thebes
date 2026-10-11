import { describe, it, expect } from '../harness.js';
import { makeDraw } from '../../src/render/art/ctx.js';
import {
  garden, seatedStatue, booth, figOrchard, farmBarley, farmFlax, farmGrain, cropTile, CROPS, FARM_DRAW, PLAIN_STAGE, SERVICE_EMBLEM,
} from '../../src/render/art/services.js';
import { farmStage, FARM_TYPES } from '../../src/render/art/stages.js';
import { ART, boundsFor, slotFor } from '../../src/render/art/registry.js';
import { INDUSTRY_TINT, GOLDC, PINK } from '../../src/render/art/palette.js';
import { CATEGORY_TINT } from '../../src/data/ui.js';
import { BUILDINGS } from '../../src/data/buildings.js';
import { drawThumb } from '../../src/ui/thumbs.js';
import { p, U } from '../../src/render/iso.js';
import { makeCanvas, pixelAt, canvasHash, nearColour } from '../helpers/canvas.js';

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
// How many pixels pass a colour test, over the whole canvas.
const count = (c, test) => {
  const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
  let n = 0;
  for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 200 && test(d[i], d[i + 1], d[i + 2])) n++;
  return n;
};
// Mean colour over a 7 x 7 grid inside tile (tx, ty), clear of the fence along the field's back edges.
function tileMean(c, tx, ty) {
  let r = 0, g = 0, b = 0, n = 0;
  for (let u = 0.2; u < 0.85; u += 0.1) {
    for (let v = 0.2; v < 0.85; v += 0.1) {
      const px = at(c, p(tx + u, ty + v));
      r += px[0]; g += px[1]; b += px[2]; n++;
    }
  }
  return { r: r / n, g: g / n, b: b / n };
}
const NEW_TYPES = ['garden', 'statue', 'booth', 'farm_fig', 'farm_barley', 'farm_flax'];
const blue = (r, g, b) => b > r + 40 && b > g + 20;                   // flax flowers
const purple = (r, g, b) => r > 80 && b > 70 && g < r - 25 && g < b - 15;   // ripe figs
const leafy = (r, g, b) => g > r + 25 && g > b + 25;                  // fig leaves (and a few grass tufts)

describe('farms, orchard, garden, statue and booth art', () => {
  it('draws the garden, statue and booth with ink and a look of their own', () => {
    const hashes = new Set();
    for (const fn of [garden, seatedStatue, booth]) {
      const c = drawAlone(fn);
      expect(inked(c)).toBeGreaterThan(50);
      hashes.add(canvasHash(c));
    }
    expect(hashes.size).toBe(3);
  });
  it('registers every new type with its real footprint, bounds from its height and a pennant colour', () => {
    for (const type of NEW_TYPES) {
      const e = ART[type];
      expect([type, e.w, e.d]).toEqual([type, BUILDINGS[type].w, BUILDINGS[type].d]);
      expect([type, e.bounds]).toEqual([type, boundsFor(e.w, e.d, e.height)]);
      for (const s of e.shadows) expect(s.length).toBe(5);
      expect(typeof e.draw).toBe('function');
    }
    for (const type of ['farm_fig', 'farm_barley', 'farm_flax', 'booth']) expect(typeof SERVICE_EMBLEM[type]).toBe('string');
    expect(INDUSTRY_TINT).toBe(CATEGORY_TINT.industry);
    expect([SERVICE_EMBLEM.farm_barley, SERVICE_EMBLEM.farm_flax]).toEqual([INDUSTRY_TINT, INDUSTRY_TINT]);   // industry farms fly its tint
    expect(SERVICE_EMBLEM.farm_fig).toBe(SERVICE_EMBLEM.farm_grain);                                      // food farms fly the grain farm's green
  });
  it('grows every farm through four stages with the same slot shape, each stage drawn differently', () => {
    expect(FARM_TYPES).toEqual(['farm_grain', 'farm_fig', 'farm_barley', 'farm_flax']);
    expect(Object.keys(FARM_DRAW).sort()).toEqual([...FARM_TYPES].sort());
    for (const type of FARM_TYPES) {
      const plain = ART[type];
      const hashes = new Set();
      for (let s = 0; s < 4; s++) {
        const e = ART[`${type}.g${s}`];
        expect([type, s, e.w, e.d, e.height, e.bounds, e.shadows]).toEqual([type, s, plain.w, plain.d, plain.height, plain.bounds, plain.shadows]);
        hashes.add(canvasHash(drawAlone((g) => e.draw(g, 0, 0))));
      }
      expect([type, hashes.size]).toEqual([type, 4]);
      expect(canvasHash(drawAlone((g) => plain.draw(g, 0, 0)))).toBe(canvasHash(drawAlone((g) => ART[`${type}.g${PLAIN_STAGE[type]}`].draw(g, 0, 0))));
    }
    expect(PLAIN_STAGE).toEqual({ granary: 3, bazaar: 2, farm_grain: 2, farm_barley: 3, farm_flax: 3, farm_fig: 3 });
    // every fertile-land producer in the data is a farm with stage slots
    for (const [type, b] of Object.entries(BUILDINGS)) if (b.terrain === 'fertile') expect([type, FARM_TYPES.includes(type)]).toEqual([type, true]);
  });
  it('names a stage slot for every farm when the world is given, and its plain slot otherwise', () => {
    const world = { day: 3 };
    for (const type of FARM_TYPES) {
      const farm = { type, id: 1, staff: 8, paused: false, blocked: null };
      expect(slotFor(farm, world)).toBe(`${type}.g${farmStage(world, farm)}`);
      expect(slotFor(farm, world)).toBe(`${type}.g2`);                               // (3 + 17) % 60 = 20: growing
      expect(slotFor({ ...farm, staff: 0 }, world)).toBe(`${type}.g0`);              // idle: fallow, or bare trees
      expect(slotFor(farm)).toBe(type);
    }
    for (const type of ['garden', 'statue', 'booth']) expect(slotFor({ type })).toBe(type);
  });
  it('gives each crop its own look: golden barley, flax in blue flower, figs ripening on the trees', () => {
    expect(CROPS).toEqual(['grain', 'barley', 'flax']);
    // barley: blue-green while growing, golden when ripe (the front tiles show the stage itself)
    const barley = (s) => tileMean(drawAlone((g) => farmBarley(g, 0, 0, s)), 0, 1);
    expect(barley(2).g).toBeGreaterThan(barley(2).r);
    expect(barley(3).r).toBeGreaterThan(180);
    expect(barley(3).b).toBeLessThan(140);
    // flax: no flowers while sprouting, a few once the back row is in flower, the most when every tile is
    const flowers = (s) => count(drawAlone((g) => farmFlax(g, 0, 0, s)), blue);
    expect(flowers(1)).toBe(0);
    expect(flowers(2)).toBeGreaterThan(10);
    expect(flowers(3)).toBeGreaterThan(flowers(2));
    // grain keeps its Stage 1 look: green growing, golden ripe
    const grain = (s) => tileMean(drawAlone((g) => farmGrain(g, 0, 0, s)), 0, 1);
    expect(grain(2).g).toBeGreaterThan(grain(2).r);
    expect(grain(3).r).toBeGreaterThan(175);
    // a ripe field of each crop differs from the others
    expect(new Set(CROPS.map((k) => canvasHash(drawAlone((g) => cropTile(g, 0, 0, 3, k))))).size).toBe(3);
    // figs: bare branches when idle, leaves once growing, purple fruit when ripe (and full baskets at the farmhouse)
    const orchard = (s) => drawAlone((g) => figOrchard(g, 0, 0, s));
    expect(count(orchard(2), leafy)).toBeGreaterThan(5 * Math.max(1, count(orchard(0), leafy)));
    expect(count(orchard(1), purple)).toBe(0);
    expect(count(orchard(2), purple)).toBeGreaterThan(10);                    // the back row is a stage ahead
    expect(count(orchard(3), purple)).toBeGreaterThan(count(orchard(2), purple));
  });
  it('crowns the statue in gold and puts the booth under a red awning with a pink pennant', () => {
    const statue = drawAlone(seatedStatue);
    expect(nearColour(at(statue, U(p(0.5, 0.4725), 19.7)), GOLDC[1], 30)).toBe(true);
    const b = drawAlone(booth);
    const awning = at(b, U(p(0.5, 0.27), 14.8));
    expect(awning[0] > 180 && awning[1] < 120).toBe(true);
    const q = U(p(0.86, 0.12), 14.8);
    expect(nearColour(at(b, [q[0] + 2, q[1] - 4.5]), PINK, 12)).toBe(true);
  });
  it('draws a card picture for each new building', () => {
    for (const type of NEW_TYPES) {
      const c = drawThumb(document.createElement('canvas'), type, 1);
      const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
      let n = 0;
      for (let i = 3; i < d.length; i += 4) if (d[i] > 0) n++;
      expect([type, n > 150]).toEqual([type, true]);
    }
  });
});
