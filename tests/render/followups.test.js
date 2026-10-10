import { describe, it, expect } from '../harness.js';
import { alertsFor, computeAlerts } from '../../src/sim/alerts.js';
import { clampZoom, visibleTileRange, createCamera } from '../../src/render/camera.js';
import { createTerrainBaker, CHUNK_MARGIN } from '../../src/render/terrainBaker.js';
import { createRenderer } from '../../src/render/renderer.js';
import { overlayMarks, drawOverlay } from '../../src/render/overlays.js';
import { TILES_PER_DAY } from '../../src/render/walkers.js';
import { TERRAIN } from '../../src/render/art/palette.js';
import { makeDraw } from '../../src/render/art/ctx.js';
import { riverWorld } from '../helpers/renderWorld.js';
import { makeTestWorld, setRoad, addRaw } from '../helpers/testWorld.js';
import { makeCanvas, pixelAt } from '../helpers/canvas.js';

describe('review carry-overs', () => {
  it('offers a pure alert query beside the monthly one', () => {
    const w = makeTestWorld();
    setRoad(w, 0, 10, 31, 10);
    addRaw(w, 'farm_grain', 2, 11);
    const live = alertsFor(w);
    expect(live.some((a) => a.code === 'no_storage' || a.code === 'understaffed')).toBe(true);
    expect(w.alerts).toEqual([]);
    expect(computeAlerts(w)).toEqual(live);
    expect(w.alerts).toEqual(live);
  });
  it('guards the camera maths against bad input', () => {
    expect(clampZoom(NaN)).toBe(1);
    expect(clampZoom(Infinity)).toBe(2);
    const r = visibleTileRange(createCamera({ x: 32, y: 32 }), { width: 800, height: 600 }, 64, { bottom: 6 });
    expect(Number.isFinite(r.x0) && Number.isFinite(r.y1)).toBe(true);
  });
  it('keeps a stale chunk on screen until the budget allows a re-bake, and drops other scales', () => {
    const w = riverWorld();
    const counter = { bakes: 0 };
    const baker = createTerrainBaker({ counter });
    const first = baker.get(w, 0, 1, 1, 1);
    addRaw(w, 'house', 12, 21);
    const peek = baker.peek(w, 0, 1, 1, 1);
    expect(peek.fresh).toBe(false);
    expect(peek.sprite).toBe(first);
    expect(counter.bakes).toBe(1);
    baker.get(w, 0, 1, 2, 1);                     // a new scale: the old-scale entry goes
    expect(baker.size(w)).toBe(1);
    expect(CHUNK_MARGIN).toBe(4);
  });
  it('draws stale chunks instead of holes when no bake budget is left', () => {
    const w = riverWorld();
    const canvas = makeCanvas(400, 300);
    const renderer = createRenderer({ canvas, dpr: 1, maxBakesPerFrame: Infinity });
    const cam = createCamera({ x: 16, y: 16, zoom: 0.5 });
    renderer.renderFrame(w, cam, { view: { width: 400, height: 300 } });
    addRaw(w, 'house', 12, 21);
    const tight = createRenderer({ canvas, dpr: 1, maxBakesPerFrame: 0, baker: renderer.baker, spriteCache: renderer.spriteCache });
    const stats = tight.renderFrame(w, cam, { view: { width: 400, height: 300 } });
    expect(stats.chunks).toBe(4);
    expect(stats.stale).toBe(1);
    expect(stats.bakes).toBe(0);
  });
  it('memoises overlay marks per tick and ignores unknown kinds', () => {
    const w = riverWorld();
    const a = overlayMarks(w, 'water');
    const b = overlayMarks(w, 'water');
    expect(a).toBe(b);
    w.day += 1;
    expect(overlayMarks(w, 'water') === a).toBe(false);
    const c = makeCanvas(100, 100);
    drawOverlay(makeDraw(c.getContext('2d'), 2), w, 'nonsense', { x0: 0, y0: 0, x1: 31, y1: 31 });
    expect(pixelAt(c, 50, 50)[3]).toBe(0);
  });
  it('tints overlapping reaches once and marks with a dark outer ring', () => {
    const w = makeTestWorld();
    setRoad(w, 0, 10, 31, 10);
    addRaw(w, 'well', 10, 9);
    addRaw(w, 'well', 11, 9);                      // the two reaches overlap almost completely
    const c = makeCanvas(400, 300);
    const ctx = c.getContext('2d');
    ctx.translate(250, -40);
    drawOverlay(makeDraw(ctx, 2), w, 'water', { x0: 0, y0: 0, x1: 31, y1: 31 });
    // tile (7, 10) is 4 road tiles from the first well and 5 from the second, so both reach it;
    // its centre p(7.5, 10.5) = art (-48, 144) lands at canvas (154, 248) with this translate and scale 2
    const alpha = pixelAt(c, 154, 248)[3];
    expect(alpha).toBeGreaterThan(20);
    expect(alpha).toBeLessThan(70);                // one 16% tint, not two stacked (would be about 75)
  });
  it('slows the walkers and tones the plot pad down', () => {
    expect(TILES_PER_DAY).toBe(2);
    expect(TERRAIN.plot).toBe('#E3CFA0');
  });
});
