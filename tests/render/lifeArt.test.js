import { describe, it, expect } from '../harness.js';
import { granaryStage, bazaarStage, farmStage, FARM_CYCLE_DAYS } from '../../src/render/art/stages.js';
import { ART, slotFor } from '../../src/render/art/registry.js';
import { granary, bazaar, farmGrain, PLAIN_STAGE } from '../../src/render/art/services.js';
import { makeDraw } from '../../src/render/art/ctx.js';
import { p } from '../../src/render/iso.js';
import { BUILDINGS } from '../../src/data/buildings.js';
import { createRenderer } from '../../src/render/renderer.js';
import { createCamera } from '../../src/render/camera.js';
import { createSpriteCache } from '../../src/render/spriteCache.js';
import { createTerrainBaker } from '../../src/render/terrainBaker.js';
import { riverWorld } from '../helpers/renderWorld.js';
import { makeCanvas, pixelAt, canvasHash } from '../helpers/canvas.js';

const STAGE_SLOTS = {
  granary: ['granary.s0', 'granary.s1', 'granary.s2', 'granary.s3'],
  bazaar: ['bazaar.s0', 'bazaar.s1', 'bazaar.s2'],
  farm_grain: ['farm_grain.g0', 'farm_grain.g1', 'farm_grain.g2', 'farm_grain.g3'],
};

// A 2x2 building drawn alone at scale 2 with its art origin at canvas (160, 110), as servicesArt.test.js does.
function drawAlone(fn) {
  const c = makeCanvas(320, 260);
  const ctx = c.getContext('2d');
  ctx.translate(160, 110);
  fn(makeDraw(ctx, 2));
  return c;
}
const at = (c, ax, ay) => pixelAt(c, 160 + ax * 2, 110 + ay * 2);

// Mean colour over a 7 x 7 grid inside tile (tx, ty), clear of the fence along the field's back edges.
function tileMean(c, tx, ty) {
  let r = 0, g = 0, b = 0, n = 0;
  for (let u = 0.2; u < 0.85; u += 0.1) {
    for (let v = 0.2; v < 0.85; v += 0.1) {
      const q = p(tx + u, ty + v);
      const px = at(c, q[0], q[1]);
      r += px[0]; g += px[1]; b += px[2]; n++;
    }
  }
  return { r: r / n, g: g / n, b: b / n };
}

describe('life art', () => {
  it('fills a granary in four stages by its share of capacity', () => {
    const cap = BUILDINGS.granary.capacity;
    const stage = (grain) => granaryStage({ type: 'granary', store: { grain } });
    expect(granaryStage({ type: 'granary', store: {} })).toBe(0);
    expect([stage(0), stage(1), stage(cap / 3 - 1), stage(cap / 3), stage((2 * cap) / 3 - 1), stage((2 * cap) / 3), stage(cap)]).toEqual([0, 1, 1, 2, 2, 3, 3]);
  });
  it('stocks a bazaar in three stages by its share of capacity', () => {
    const cap = BUILDINGS.bazaar.capacity;
    const stage = (grain) => bazaarStage({ type: 'bazaar', store: { grain } });
    expect([stage(0), stage(1), stage(cap / 2 - 1), stage(cap / 2), stage(cap)]).toEqual([0, 1, 1, 2, 2]);
  });
  it('grows a working farm through three stages over sixty days, offset by id, and leaves an idle one fallow', () => {
    const farm = { type: 'farm_grain', id: 1, staff: 10, paused: false, blocked: null };
    expect(FARM_CYCLE_DAYS).toBe(60);
    // id 1 shifts the cycle by 17 days: day 2 is cycle day 19 (sprouting), day 3 is day 20 (green)
    expect([2, 3, 22, 23, 42, 43].map((day) => farmStage({ day }, farm))).toEqual([1, 2, 2, 3, 3, 1]);
    const counts = [0, 0, 0, 0];
    for (let day = 0; day < 60; day++) counts[farmStage({ day }, farm)]++;
    expect(counts).toEqual([0, 20, 20, 20]);
    expect(farmStage({ day: 3 }, { ...farm, id: 2 })).toBe(2);              // (3 + 34) % 60 = 37: green
    expect(farmStage({ day: 3 }, { ...farm, paused: true })).toBe(0);
    expect(farmStage({ day: 3 }, { ...farm, staff: 0 })).toBe(0);
    expect(farmStage({ day: 3 }, { ...farm, blocked: 'no_storage' })).toBe(0);
  });
  it('names stage slots for granaries, bazaars and farms, and keeps the rest as they were', () => {
    const world = { day: 3 };
    expect(slotFor({ type: 'granary', store: { grain: BUILDINGS.granary.capacity } })).toBe('granary.s3');
    expect(slotFor({ type: 'bazaar', store: {} }, world)).toBe('bazaar.s0');
    expect(slotFor({ type: 'farm_grain', id: 1, staff: 10, paused: false, blocked: null }, world)).toBe('farm_grain.g2');
    expect(slotFor({ type: 'farm_grain', id: 1, staff: 10, paused: false, blocked: null })).toBe('farm_grain');
    expect(slotFor({ type: 'house', tier: 2 }, world)).toBe('house.t2');
    expect(slotFor({ type: 'well' }, world)).toBe('well');
  });
  it('registers every stage slot with its building\'s footprint, height and shadows, each drawn differently', () => {
    for (const [type, slots] of Object.entries(STAGE_SLOTS)) {
      const plain = ART[type];
      const hashes = new Set();
      for (const slot of slots) {
        const e = ART[slot];
        expect([slot, e.w, e.d, e.height]).toEqual([slot, plain.w, plain.d, plain.height]);
        expect(e.bounds).toEqual(plain.bounds);
        expect(e.shadows).toEqual(plain.shadows);
        const c = drawAlone((g) => e.draw(g, 0, 0));
        hashes.add(canvasHash(c));
      }
      expect(hashes.size).toBe(slots.length);
    }
    expect(PLAIN_STAGE).toEqual({ granary: 3, bazaar: 2, farm_grain: 2 });
    // the plain slot is the full or middle stage, for card thumbnails and assets
    expect(canvasHash(drawAlone((g) => ART.granary.draw(g, 0, 0)))).toBe(canvasHash(drawAlone((g) => ART['granary.s3'].draw(g, 0, 0))));
  });
  it('shows grain in the silo tops once a granary holds some, and goods in front of the stalls once a bazaar does', () => {
    // the front silo's hatch: dome centre U(p(1.4, 1.4), 9) = (0, 13.4), hatch 8.2 above it, sampled just below
    const hatch = (stage) => at(drawAlone((g) => granary(g, 0, 0, stage)), 0, 5.5);
    expect(hatch(0)[0]).toBeLessThan(120);           // the dark empty hatch
    expect(hatch(3)[0]).toBeGreaterThan(200);        // grain
    // in front of the front stall's counter: the first heaped basket's goods at U(p(1.5, 1.9), 1.9) = (-6.4, 25.3),
    // the second's at U(p(1.74, 1.9), 1.9) = (-2.6, 27.2)
    const first = (stage) => at(drawAlone((g) => bazaar(g, 0, 0, stage)), -6.4, 25.3);
    const second = (stage) => at(drawAlone((g) => bazaar(g, 0, 0, stage)), -2.6, 27.2);
    expect(first(0)[3]).toBe(0);                      // bare ground in front of an empty stall
    expect(first(1)[0]).toBeGreaterThan(first(1)[1] + 60);   // a heap of red goods
    expect(second(1)[3]).toBe(0);
    expect(second(2)[0]).toBeGreaterThan(200);       // piled: a second heap, gold
    expect(second(2)[2]).toBeLessThan(100);
  });
  it('grows the field from fallow to golden with the back row a stage ahead', () => {
    const look = (stage) => { const c = drawAlone((g) => farmGrain(g, 0, 0, stage)); return { back: tileMean(c, 0, 0), front: tileMean(c, 0, 1) }; };
    const green = (m) => m.g > m.r;
    const golden = (m) => m.r > 175 && m.g < m.r;
    const loam = (m) => m.r < 170 && m.g < m.r;
    const f0 = look(0), f1 = look(1), f2 = look(2), f3 = look(3);
    expect([loam(f0.back), loam(f0.front)]).toEqual([true, true]);
    expect([green(f1.back), loam(f1.front)]).toEqual([true, true]);
    expect(f1.front.g - f1.front.r).toBeGreaterThan(f0.front.g - f0.front.r);   // sprouts on the ploughed rows
    expect([golden(f2.back), green(f2.front)]).toEqual([true, true]);
    expect([golden(f3.back), golden(f3.front)]).toEqual([true, true]);
  });
  it('asks the sprite cache for the stage each building is at', () => {
    const w = riverWorld();
    const granaryB = Object.values(w.buildings).find((b) => b.type === 'granary');
    const farm = Object.values(w.buildings).find((b) => b.type === 'farm_grain');
    granaryB.store = { grain: BUILDINGS.granary.capacity - 100 };
    const asked = [];
    const real = createSpriteCache();
    const cache = { get: (slot, ...rest) => { asked.push(slot); return real.get(slot, ...rest); } };
    const renderer = createRenderer({ canvas: makeCanvas(400, 300), dpr: 1, spriteCache: cache, baker: createTerrainBaker(), maxBakesPerFrame: Infinity });
    renderer.renderFrame(w, createCamera({ x: 18, y: 14, zoom: 1 }), { view: { width: 400, height: 300 } });
    expect(asked).toContain('granary.s3');
    expect(asked).toContain('bazaar.s1');                                     // 50 of 300
    expect(asked).toContain(`farm_grain.g${farmStage(w, farm)}`);
    expect(farmStage(w, farm)).toBeGreaterThan(0);                            // staffed, so growing
    expect(asked.includes('granary') || asked.includes('bazaar') || asked.includes('farm_grain')).toBe(false);
  });
});
