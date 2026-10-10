import { describe, it, expect } from '../harness.js';
import { createRenderer, decorAt, collectObjects } from '../../src/render/renderer.js';
import { createCamera } from '../../src/render/camera.js';
import { createSpriteCache } from '../../src/render/spriteCache.js';
import { createTerrainBaker } from '../../src/render/terrainBaker.js';
import { riverWorld } from '../helpers/renderWorld.js';
import { makeCanvas, pixelAt, canvasHash, nearColour } from '../helpers/canvas.js';
import { TERRAIN } from '../../src/render/art/palette.js';

function setup(opts = {}) {
  const canvas = makeCanvas(400, 300);
  const counters = { sprite: { hits: 0, misses: 0 }, baker: { bakes: 0 } };
  const renderer = createRenderer({
    canvas, dpr: 1,
    spriteCache: createSpriteCache({ counter: counters.sprite }),
    baker: createTerrainBaker({ counter: counters.baker }),
    maxBakesPerFrame: opts.maxBakesPerFrame === undefined ? Infinity : opts.maxBakesPerFrame,
  });
  return { canvas, renderer, counters, view: { width: 400, height: 300 } };
}

describe('renderer', () => {
  it('renders one frame without a loop and reports what it drew', () => {
    const w = riverWorld();
    const { canvas, renderer, view } = setup();
    const cam = createCamera({ x: 18, y: 14, zoom: 1 });
    const stats = renderer.renderFrame(w, cam, { view });
    expect(stats.chunks).toBeGreaterThan(0);
    expect(stats.objects).toBeGreaterThanOrEqual(9);
    expect(stats.sprites).toBeGreaterThanOrEqual(9);
    expect(canvas.width).toBe(400);
    expect(pixelAt(canvas, 200, 150)[3]).toBe(255);
    const again = canvasHash(canvas);
    renderer.renderFrame(w, cam, { view });
    expect(canvasHash(canvas)).toBe(again);
  });
  it('never changes the world', () => {
    const w = riverWorld();
    const before = JSON.stringify(w);
    const { renderer, view } = setup();
    renderer.renderFrame(w, createCamera({ x: 18, y: 14, zoom: 1.3 }), { view, grid: true });
    expect(JSON.stringify(w)).toBe(before);
  });
  it('culls objects and chunks outside the view', () => {
    const w = riverWorld();
    const { renderer, view } = setup();
    const near = renderer.renderFrame(w, createCamera({ x: 18, y: 14, zoom: 2 }), { view }).objects;
    const far = renderer.renderFrame(w, createCamera({ x: 2, y: 30, zoom: 2 }), { view }).objects;
    expect(far).toBeLessThan(near);
  });
  it('spreads chunk bakes over frames', () => {
    const w = riverWorld();
    const { renderer, view, counters } = setup({ maxBakesPerFrame: 1 });
    const cam = createCamera({ x: 16, y: 16, zoom: 0.5 });
    const first = renderer.renderFrame(w, cam, { view });
    expect(first.bakes).toBe(1);
    expect(first.chunks).toBe(1);
    for (let i = 0; i < 6; i++) renderer.renderFrame(w, cam, { view });
    const settled = renderer.renderFrame(w, cam, { view });
    expect(settled.bakes).toBe(0);
    expect(settled.chunks).toBe(4);
    expect(counters.baker.bakes).toBe(4);
  });
  it('places trees deterministically on free ground only', () => {
    const w = riverWorld();
    let trees = 0;
    for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
      const d = decorAt(w, x, y);
      expect(d).toBe(decorAt(w, x, y));
      if (d) { trees++; expect(w.occ[y * 32 + x]).toBe(0); expect(w.road[y * 32 + x]).toBe(0); }
    }
    expect(trees).toBeGreaterThan(0);
  });
  it('sorts objects by footprint centre with walkers between buildings', () => {
    const w = riverWorld();
    const objs = collectObjects(w, { x0: 0, y0: 0, x1: 31, y1: 31 }, [{ id: 1, kind: 'water', x: 14.5, y: 12.5 }]);
    for (let i = 1; i < objs.length; i++) expect(objs[i - 1].key <= objs[i].key).toBe(true);
    const walker = objs.find((o) => o.slot === 'fig.water');
    expect(walker.key).toBe(27.01);
    expect(objs.some((o) => o.slot === 'temple')).toBe(true);
  });
  it('draws shadows before sprites and calls the hooks in order', () => {
    const w = riverWorld();
    const canvas = makeCanvas(400, 300);
    const calls = [];
    const ctx = canvas.getContext('2d');
    const origFill = ctx.fill.bind(ctx);
    ctx.fill = (...a) => { calls.push('fill'); return origFill(...a); };
    const real = createSpriteCache();
    const cache = { get: (...a) => { calls.push('sprite'); return real.get(...a); } };
    const renderer = createRenderer({ canvas, dpr: 1, spriteCache: cache, baker: createTerrainBaker(), maxBakesPerFrame: Infinity });
    renderer.renderFrame(w, createCamera({ x: 18, y: 14, zoom: 1 }), {
      view: { width: 400, height: 300 },
      effects: { draw: (g, now) => calls.push(['effects', typeof g.poly, now]) },
      drawOverlay: (g, range) => calls.push(['overlay', range]),
      now: 1234,
    });
    const firstSprite = calls.indexOf('sprite');
    const lastSprite = calls.lastIndexOf('sprite');
    expect(calls.indexOf('fill') >= 0).toBe(true);
    expect(firstSprite >= 0).toBe(true);
    expect(calls.indexOf('fill') < firstSprite).toBe(true);
    const fx = calls.findIndex((c) => Array.isArray(c) && c[0] === 'effects');
    const ov = calls.findIndex((c) => Array.isArray(c) && c[0] === 'overlay');
    expect(fx > lastSprite).toBe(true);
    expect(calls[fx][1]).toBe('function');
    expect(calls[fx][2]).toBe(1234);
    expect(ov > fx).toBe(true);
    expect(calls[ov][1].x0 <= calls[ov][1].x1).toBe(true);
  });
  it('sizes the canvas for dpr 2', () => {
    const w = riverWorld();
    const canvas = makeCanvas(10, 10);
    const renderer = createRenderer({ canvas, dpr: 2, spriteCache: createSpriteCache(), baker: createTerrainBaker(), maxBakesPerFrame: Infinity });
    renderer.renderFrame(w, createCamera({ x: 18, y: 14, zoom: 1 }), { view: { width: 200, height: 150 } });
    expect(canvas.width).toBe(400);
    expect(canvas.height).toBe(300);
    expect(nearColour(pixelAt(canvas, 200, 150), TERRAIN.sandOff, 4)).toBe(false);
  });
  it('draws an in-view walker and culls one out of view', () => {
    const w = riverWorld();
    const { renderer, view } = setup();
    const cam = createCamera({ x: 18, y: 14, zoom: 1 });
    const none = renderer.renderFrame(w, cam, { view, walkers: [] }).sprites;
    const inView = renderer.renderFrame(w, cam, { view, walkers: [{ id: 1, kind: 'water', x: 18.5, y: 14.5 }] }).sprites;
    expect(inView).toBe(none + 1);
    const outOfView = renderer.renderFrame(w, cam, { view, walkers: [{ id: 2, kind: 'water', x: 0.5, y: 31.5 }] }).sprites;
    expect(outOfView).toBe(none);
  });
});
