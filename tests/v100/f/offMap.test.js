// Version 10.0 (Track F, rulings 2112-2114): the ground past the map's edge is drawn: a rim shadow, dune strokes and a haze that pales with distance; the same pixels for the
// same inputs; nothing moves; the season's wash and the render budget hold.
import { describe, it, expect } from '../../harness.js';
import { createRenderer } from '../../../src/render/renderer.js';
import { createCamera } from '../../../src/render/camera.js';
import { createSpriteCache } from '../../../src/render/spriteCache.js';
import { createTerrainBaker } from '../../../src/render/terrainBaker.js';
import { TERRAIN } from '../../../src/render/art/palette.js';
import { drawOffMap, duneStrokes, duneCanvas, OFF_MAP_HAZE, OFF_MAP_REACH, DUNE_STROKES } from '../../../src/render/v100/offMap.js';
import { createWorld } from '../../../src/sim/world.js';
import { startCamera } from '../../../src/ui/cameraControl.js';
import { riverWorld } from '../../helpers/renderWorld.js';
import { makeCanvas, pixelAt, canvasHash, hexToRgb } from '../../helpers/canvas.js';

const lum = (c) => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
function frame(world, cam, { width = 400, height = 300, dpr = 1, season = null } = {}) {
  const canvas = makeCanvas(width * dpr, height * dpr);
  const renderer = createRenderer({ canvas, dpr, spriteCache: createSpriteCache(), baker: createTerrainBaker(), maxBakesPerFrame: Infinity });
  renderer.renderFrame(world, cam, { view: { width, height }, now: 1000 });
  return canvas;
}

describe('v100 f off-map ground: desert that pales to a haze', () => {
  it('draws the same pixels twice for the same inputs, and the same at any time (nothing moves)', () => {
    const w = riverWorld();
    const cam = createCamera({ x: 21, y: 33, zoom: 1 });
    const view = { width: 400, height: 300 };
    const draw = (now, season = []) => { const c = makeCanvas(400, 300); drawOffMap({ ctx: c.getContext('2d'), scale: 2 }, w, cam, view, now, { season }); return canvasHash(c); };
    expect(draw(0)).toBe(draw(0));
    expect(draw(0)).toBe(draw(987654));                              // nothing moves
    expect(draw(0, [['#6FA0D0', 0.2]]) === draw(0)).toBe(false);     // and the wash changes it
    const c = makeCanvas(400, 300);                                  // the whole frame, on one renderer, twice
    const r = createRenderer({ canvas: c, dpr: 1, spriteCache: createSpriteCache(), baker: createTerrainBaker(), maxBakesPerFrame: Infinity });
    r.renderFrame(w, cam, { view, now: 5 });
    const first = canvasHash(c);
    r.renderFrame(w, cam, { view, now: 5 });
    expect(canvasHash(c)).toBe(first);
  });
  it('seeds its dune strokes by position: the same seed the same strokes, another seed others', () => {
    expect(duneStrokes(5)).toEqual(duneStrokes(5));
    expect(JSON.stringify(duneStrokes(5)) === JSON.stringify(duneStrokes(6))).toBe(false);
    expect(duneStrokes(5).length).toBe(DUNE_STROKES);
    const c1 = duneCanvas(7, 1, 0), c2 = duneCanvas(7, 1, 0);
    expect(c1).toBe(c2);                                             // baked once
    expect(c1.width).toBe(256); expect(c1.height).toBe(256);
    expect(duneCanvas(7, 2, 0).width).toBe(512);
    const ink = (c) => { const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i] > 0) n++; return n; };
    const all = ink(c1), mid = ink(duneCanvas(7, 1, 1)), thin = ink(duneCanvas(7, 1, 2));
    expect(all).toBeGreaterThan(1500);
    expect(all).toBeLessThan(256 * 256 * 0.2);                       // sparse
    expect(mid).toBeLessThan(all);                                   // the detail goes with the distance
    expect(thin).toBeLessThan(mid);
  });
  it('the off-map colour differs from every terrain palette colour (its alias aside)', () => {
    const others = Object.entries(TERRAIN).filter(([k, v]) => typeof v === 'string' && k !== 'offMap' && k !== 'sandOff').map(([, v]) => v.toLowerCase());
    expect(others.includes(TERRAIN.offMap.toLowerCase())).toBe(false);
    expect(TERRAIN.sandOff).toBe(TERRAIN.offMap);
  });
  it('is not a flat fill: the ground pales away from the rim, the rim is shadowed, and the dunes show', () => {
    const w = riverWorld();                                       // 32 x 32
    const cam = createCamera({ x: 21, y: 33, zoom: 1 });          // the map's lower-left edge crosses the view, the map to its right (the terrainLook scene)
    const canvas = frame(w, cam, { width: 1920, height: 1080 });   // the edge crosses the middle row at x 1024; a tile out across it is 28.6 px: x 8 is 15 tiles out
    const edge = pixelAt(canvas, 1018, 540), near = pixelAt(canvas, 980, 540), far = pixelAt(canvas, 8, 540);
    expect(lum(edge)).toBeLessThan(lum(near));                    // the rim's shadow
    expect(lum(far)).toBeGreaterThan(lum(near));                  // paler with distance
    // the dune strokes: a row of the near ground is not one colour
    const colours = new Set();
    for (let y = 480; y < 600; y++) for (let x = 940; x < 1000; x++) colours.add(pixelAt(canvas, x, y).join());
    expect(colours.size).toBeGreaterThan(3);
    // a 12-tile reach: past it the ground is the haze (the season's wash over it): one colour, no strokes
    const hz = hexToRgb(OFF_MAP_HAZE), farColours = new Set();
    for (let y = 520; y < 560; y++) for (let x = 0; x < 40; x++) farColours.add(pixelAt(canvas, x, y).join());
    expect(OFF_MAP_REACH).toBe(12);
    expect(farColours.size).toBe(1);
    expect(Math.abs(far[0] - hz[0]) < 30 && Math.abs(far[1] - hz[1]) < 30 && Math.abs(far[2] - hz[2]) < 30).toBe(true);
  });
  it('takes the season wash: the same off-map pixel differs between two seasons', () => {
    const w1 = riverWorld(), w2 = riverWorld();
    w2.day = w1.day + 60;                                         // a month on: another season's wash (or the same look blended: they must differ somewhere over a year)
    const cam = createCamera({ x: 21, y: 33, zoom: 1 });
    const seen = new Set();
    for (const d of [0, 30, 60, 90, 120, 150, 210, 270]) { const w = riverWorld(); w.day = d; seen.add(pixelAt(frame(w, cam), 20, 150).join()); }
    expect(seen.size).toBeGreaterThan(1);
  });
  it('is called with the g, world, camera, view and time of the frame, and writes nothing to the world', () => {
    const w = riverWorld();
    const before = JSON.stringify(w);
    const canvas = makeCanvas(200, 150), ctx = canvas.getContext('2d');
    const g = { ctx, scale: 2 };
    drawOffMap(g, w, createCamera({ x: 21, y: 33, zoom: 1 }), { width: 200, height: 150 }, 0, { season: [] });
    expect(JSON.stringify(w)).toBe(before);
    expect(pixelAt(canvas, 5, 75)[3]).toBe(255);
  });
  it('a view wholly inside the map draws nothing: no fill, no gradient, no pattern (ruling 2119)', () => {
    const w = createWorld({ seed: 11, size: 64 });
    const calls = [];
    const real = makeCanvas(400, 300).getContext('2d');
    const ctx = new Proxy({}, { get: (_, name) => (name === 'canvas' ? real.canvas : (...a) => { calls.push(name); return real[name] ? real[name](...a) : undefined; }), set: () => true });
    const view = { width: 400, height: 300 };
    drawOffMap({ ctx, scale: 2 }, w, { x: 32, y: 32, zoom: 1, mapSize: 64 }, view, 0, { season: [] });
    expect(calls.filter((c) => /fill|Gradient|Pattern/.test(c))).toEqual([]);
    drawOffMap({ ctx, scale: 2 }, w, { x: -8, y: 32, zoom: 1, mapSize: 64 }, view, 0, { season: [], bake: false });   // and one over the edge does draw
    expect(calls.some((c) => c === 'fillRect')).toBe(true);
  });
  it('the gradients and patterns are made once per context, not every frame (ruling 2119)', () => {
    const w = createWorld({ seed: 11, size: 64 });
    const real = makeCanvas(400, 300).getContext('2d');
    const made = { grad: 0, pat: 0 };
    const ctx = new Proxy({}, { get: (_, name) => (name === 'canvas' ? real.canvas : (...a) => { if (name === 'createLinearGradient') made.grad++; if (name === 'createPattern') made.pat++; return real[name](...a); }), set: (_, n, v) => { real[n] = v; return true; } });
    const view = { width: 400, height: 300 };
    for (const x of [-8, -9, -10]) drawOffMap({ ctx, scale: 2 }, w, { x, y: 32, zoom: 1, mapSize: 64 }, view, 0, { season: [], bake: false });
    expect(made).toEqual({ grad: 8, pat: 3 });
  });
  it('a still frame on the first view (fresh corner, 390x844, device ratio 2) is one blit, under 4 ms (ruling 2119)', () => {
    const world = createWorld({ seed: 11, size: 64 });
    const view = { width: 390, height: 844 };
    const cam = { ...startCamera(world, view, 0.54), mapSize: 64 };
    const canvas = makeCanvas(780, 1688);
    const ctx = canvas.getContext('2d'), g = { ctx, scale: 2 * cam.zoom * 2 };
    const t = (fn) => { fn(); const t0 = performance.now(); for (let i = 0; i < 40; i++) { fn(); ctx.getImageData(0, 0, 1, 1); } return (performance.now() - t0) / 40; };
    const still = t(() => drawOffMap(g, world, cam, view, 0, { season: [] }));
    expect(still).toBeLessThan(4);     // measured 0.9 ms (8.3 before the bake): a frame where the camera did not move is one drawImage
  });
  it('fits the frame budget: a frame wholly past the map costs under 16 ms on average once warm (software canvas, the worst case: a screen of ground)', () => {
    const w = riverWorld();
    const cam = createCamera({ x: 21, y: 40, zoom: 1 });          // far past the map: all ground
    const canvas = makeCanvas(1280, 800);
    const renderer = createRenderer({ canvas, dpr: 1, spriteCache: createSpriteCache(), baker: createTerrainBaker(), maxBakesPerFrame: Infinity });
    renderer.renderFrame(w, cam, { view: { width: 1280, height: 800 } });
    const t0 = performance.now();
    for (let i = 0; i < 20; i++) { renderer.renderFrame(w, cam, { view: { width: 1280, height: 800 } }); canvas.getContext('2d').getImageData(0, 0, 1, 1); }
    expect((performance.now() - t0) / 20).toBeLessThan(16);
  });
});
