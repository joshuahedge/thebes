// Task 1c (ruling 310): a fire you can see under every Motion level. Gentle: flames change shape at most once a second, in
// place; a smoke column fades in place on every fire; the "Burning" label sits under the flames, clear of the smoke, and
// neighbouring labels never overlap. Every level: a scorch mark on the ground under a burning building and under rubble.
import { describe, it, expect } from '../harness.js';
import { drawFires, drawScorch, layoutLabels, labelSize, roofPoint, gentleShapes, FLAME, SCORCH, SMOKE_PUFFS, BLAZE_SMOKE_PUFFS, GENTLE_SMOKE_RISE_PX } from '../../src/render/fire.js';
import { createRenderer } from '../../src/render/renderer.js';
import { createCamera } from '../../src/render/camera.js';
import { makeDraw } from '../../src/render/art/ctx.js';
import { p } from '../../src/render/iso.js';
import { ART_TEXT } from '../../src/ui/text.js';
import { makeTestWorld, addRaw } from '../helpers/testWorld.js';
import { makeCanvas, pixelAt } from '../helpers/canvas.js';
import { rigUI } from '../helpers/uiWorld.js';

const BLAZE = { stage: 'blaze', days: 1, need: 2, fought: 0 }, FIRE = { stage: 'fire', days: 2, left: 9 };

// A draw object that records its calls (and still draws), on its own canvas.
function spyDraw() {
  const g = makeDraw(makeCanvas(64, 64).getContext('2d'), 1);
  const calls = [];
  for (const k of ['line', 'stroke', 'poly', 'radial', 'path', 'circ', 'ell', 'text']) {
    const f = g[k];
    g[k] = (...a) => { calls.push({ k, a }); return f(...a); };
  }
  return { g, calls };
}
const calls = (w, now, opts, range = null) => { const s = spyDraw(); drawFires(s.g, w, range, now, opts); return s.calls; };
const smokeCentres = (cs) => cs.filter((c) => c.k === 'radial' && c.a[3] === FLAME.smoke).map((c) => c.a[0]);

function oneBuilding(stage, type = 'potter') {
  const w = makeTestWorld({ fertile: [] });
  const b = addRaw(w, type, 10, 10);
  b.fire = { ...(stage === 'fire' ? FIRE : BLAZE) };
  return { w, b };
}

describe('s45 fire flames', () => {
  it('changes a flame between two shapes at most once a second under Gentle, in place, never in brightness', () => {
    const { w, b } = oneBuilding('blaze');
    const q = roofPoint(w, b);
    const sample = (t) => {
      const c = makeCanvas(160, 120), ctx = c.getContext('2d');
      ctx.translate(80 - q[0] * 2, 100 - q[1] * 2);
      const g = makeDraw(ctx, 2);
      g.radial = () => {};                                                    // the smoke is tested below; here the flame alone
      g.text = () => {};
      drawFires(g, w, null, t, { motion: 'gentle' });
      const d = ctx.getImageData(0, 0, c.width, c.height).data;
      let n = 0, top = 1e9, bottom = -1, h = 0;
      for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) {
        const i = (y * c.width + x) * 4;
        if (d[i + 3] < 128) continue;
        n++; top = Math.min(top, y); bottom = Math.max(bottom, y);
        h = (h * 31 + d[i] * 3 + d[i + 1] * 5 + d[i + 2] + x * 7 + y) | 0;
      }
      return { n, top, bottom, h };
    };
    const shots = [];
    for (let t = 0; t < 8000; t += 20) shots.push({ t, ...sample(t) });
    // A transition is a run of frames that differ from their neighbour; count the runs.
    let runs = 0, prevChanged = false;
    for (let i = 1; i < shots.length; i++) {
      const changed = shots[i].h !== shots[i - 1].h;
      if (changed && !prevChanged) runs++;
      prevChanged = changed;
    }
    expect(runs).toBeGreaterThan(4);                                         // it does change shape ...
    expect(runs).toBeLessThanOrEqual(8 + 1);                                 // ... at most once a second (8 s)
    expect(Math.min(...shots.map((s) => s.bottom))).toBe(Math.max(...shots.map((s) => s.bottom)));   // the base never moves
    expect(Math.max(...shots.map((s) => s.top)) - Math.min(...shots.map((s) => s.top))).toBeLessThanOrEqual(1);   // no rising
    expect(Math.min(...shots.map((s) => s.n)) / Math.max(...shots.map((s) => s.n))).toBeGreaterThan(0.85);        // no flashing
    expect(gentleShapes(0, 3).every(([s]) => s === 0 || s === 2)).toBe(true);
  });
});

describe('s45 fire smoke', () => {
  it('gives a blaze and a fire a smoke column under Full and Gentle, and a still one under Still (Version 6.0, ruling 720: it holds, it does not rise)', () => {
    for (const [stage, puffs] of [['blaze', BLAZE_SMOKE_PUFFS], ['fire', SMOKE_PUFFS]]) {
      const { w } = oneBuilding(stage);
      for (const motion of ['full', 'gentle', 'still']) expect([stage, motion, smokeCentres(calls(w, 1000, { motion })).length]).toEqual([stage, motion, puffs]);
      expect(smokeCentres(calls(w, 54321, { motion: 'still' }))).toEqual(smokeCentres(calls(w, 1000, { motion: 'still' })));   // the same puffs at any time
    }
  });
  it('fades the column in place under Gentle (no sideways drift, at most the rise limit up) and lets it rise under Full', () => {
    for (const stage of ['blaze', 'fire']) {
      const { w } = oneBuilding(stage);
      const series = (motion) => { const out = []; for (let t = 0; t < 3000; t += 50) out.push(smokeCentres(calls(w, t, { motion }))); return out; };
      const spread = (s) => s[0].map((_, i) => [Math.max(...s.map((r) => r[i][0])) - Math.min(...s.map((r) => r[i][0])), Math.max(...s.map((r) => r[i][1])) - Math.min(...s.map((r) => r[i][1]))]);
      for (const [dx, dy] of spread(series('gentle'))) expect([stage, dx < 1e-9, dy <= GENTLE_SMOKE_RISE_PX + 1e-9]).toEqual([stage, true, true]);
      expect(Math.max(...spread(series('full')).map(([, dy]) => dy))).toBeGreaterThan(10);
    }
  });
});

describe('s45 fire labels', () => {
  it('sits the "Burning" label under the flames, so no smoke puff is covered by it', () => {
    for (const stage of ['blaze', 'fire']) {
      const { w, b } = oneBuilding(stage);
      const q = roofPoint(w, b);
      for (const motion of ['gentle', 'still']) {
        for (let t = 0; t < 3000; t += 250) {
          const cs = calls(w, t, { motion });
          const text = cs.find((c) => c.k === 'text');
          expect(text.a[1]).toBe(ART_TEXT.burning);
          const [, y] = text.a[0];
          expect([stage, motion, y > q[1]]).toEqual([stage, motion, true]);                                  // under the roof point the flames stand on
          for (const [, py] of smokeCentres(cs)) expect([stage, motion, py < y - 4]).toEqual([stage, motion, true]);   // every puff is above the pill
        }
      }
    }
  });
  it('steps overlapping pills down so no two neighbouring fires\' labels overlap', () => {
    const pts = [[0, 0], [16, 8], [32, 16], [48, 24], [100, 0]];
    const w = 44, h = 9.6;
    const placed = layoutLabels(pts, w, h);
    for (let i = 0; i < placed.length; i++) for (let j = i + 1; j < placed.length; j++) {
      const overlap = Math.abs(placed[i][0] - placed[j][0]) < w && Math.abs(placed[i][1] - placed[j][1]) < h;
      expect([i, j, overlap]).toEqual([i, j, false]);
    }
    expect(placed[0]).toEqual([0, 0]);                                                                      // the first stays where it was
    expect(placed[4]).toEqual([100, 0]);                                                                    // a far one is not moved
    // And through drawFires: a row of five burning homes, Gentle and Still.
    const world = makeTestWorld({ fertile: [] });
    for (let i = 0; i < 5; i++) addRaw(world, 'house', 10 + i, 10).fire = { ...BLAZE };
    for (const motion of ['gentle', 'still']) {
      const texts = calls(world, 0, { motion }).filter((c) => c.k === 'text').map((c) => c.a[0]);
      expect(texts.length).toBe(5);
      const [bw, bh] = labelSize(spyDraw().g, ART_TEXT.burning);                                             // the pill's real size
      for (let i = 0; i < texts.length; i++) for (let j = i + 1; j < texts.length; j++) {
        expect([motion, i, j, Math.abs(texts[i][0] - texts[j][0]) < bw && Math.abs(texts[i][1] - texts[j][1]) < bh]).toEqual([motion, i, j, false]);
      }
    }
  });
  it('keeps Full without a label', () => {
    const { w } = oneBuilding('fire');
    expect(calls(w, 0, { motion: 'full' }).filter((c) => c.k === 'text').length).toBe(0);
  });
});

describe('s45 scorch marks', () => {
  const lum = ([r, g, b]) => 0.2126 * r + 0.7152 * g + 0.0722 * b;
  function ground(w, b) {
    const c = makeCanvas(200, 120), ctx = c.getContext('2d');
    ctx.fillStyle = '#E8D2A0'; ctx.fillRect(0, 0, 200, 120);
    const q = p(b.x + b.w / 2, b.y + b.d / 2);
    ctx.translate(100 - q[0] * 2, 60 - q[1] * 2);
    drawScorch(makeDraw(ctx, 2), w, null);
    return c;
  }
  it('darkens the ground under a burning building (a blaze or a fire) and under rubble, and nothing else', () => {
    for (const [name, make] of [['blaze', () => oneBuilding('blaze')], ['fire', () => oneBuilding('fire')], ['rubble', () => { const w = makeTestWorld({ fertile: [] }); return { w, b: addRaw(w, 'rubble', 10, 10) }; }]]) {
      const { w, b } = make();
      const dark = lum(pixelAt(ground(w, b), 100, 60)), clean = lum(pixelAt(ground(w, b), 4, 4));
      expect([name, clean - dark > 25]).toEqual([name, true]);
    }
    const w = makeTestWorld({ fertile: [] });
    const calm = addRaw(w, 'potter', 10, 10);
    const s = spyDraw();
    drawScorch(s.g, w, null);
    expect(s.calls.length).toBe(0);
    expect(SCORCH.rubble).toBeLessThan(SCORCH.burning);
    calm.fire = { ...BLAZE };
    drawScorch(s.g, w, null);
    expect(s.calls.length).toBeGreaterThan(0);
    const out = spyDraw();
    drawScorch(out.g, w, { x0: 20, y0: 20, x1: 30, y1: 30 });                                              // out of range: nothing
    expect(out.calls.length).toBe(0);
  });
  it('is drawn the same under every Motion level and the same on every frame', () => {
    const { w } = oneBuilding('fire');
    const run = () => { const s = spyDraw(); drawScorch(s.g, w, null); return JSON.stringify(s.calls.map((c) => [c.k, c.a])); };
    expect(run()).toBe(run());
  });
  it('runs under the sprites (renderFrame\'s scorch hook, before any sprite is fetched) and is wired at every level (createUI)', async () => {
    const w = makeTestWorld({ fertile: [] });
    const b = addRaw(w, 'potter', 10, 10);
    b.fire = { ...BLAZE };
    const order = [];
    const cache = { get: (...a) => { order.push('sprite'); return null; }, clear() {} };
    const canvas = makeCanvas(300, 200);
    const renderer = createRenderer({ canvas, spriteCache: cache, dpr: 1 });
    const cam = createCamera ? createCamera({ x: 10, y: 10, zoom: 1 }) : { x: 10, y: 10, zoom: 1 };
    renderer.renderFrame(w, cam, { view: { width: 300, height: 200 }, scorch: () => order.push('scorch'), fire: () => order.push('fire') });
    expect([order[0], order.indexOf('scorch') < order.indexOf('sprite'), order.indexOf('fire') > order.lastIndexOf('sprite')]).toEqual(['scorch', true, true]);
    const r = await rigUI();
    try {
      const seen = [];
      const render = r.renderer.renderFrame;
      r.renderer.renderFrame = (world, c2, opts) => { seen.push(opts); return render(world, c2, opts); };
      const hut = Object.values(r.world.buildings).find((x) => x.type === 'house' && x.residents > 0);
      hut.fire = { ...BLAZE };
      for (const motion of ['full', 'gentle', 'still']) { r.ui.settings.set({ motion }); r.frame(1000); }
      expect(seen.length).toBe(3);
      for (const opts of seen) {
        const s = spyDraw();
        opts.scorch(s.g, { x0: 0, y0: 0, x1: 63, y1: 63 });
        expect(s.calls.length).toBeGreaterThan(0);
      }
    } finally { r.cleanup(); }
  });
});
