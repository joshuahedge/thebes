// Version 10.0, Track P (rulings 2283, 2286-2288, plan P.3): the far-view canvas. At zoom FAR_ZOOM (0.6) and under the chunks bake at 2 device px
// per art px, not 3; the chunk ceiling follows the 9.3 device rule (a phone's chunks at most 2); a phone bakes one chunk a frame after a bake that
// took over SLOW_BAKE_MS (ruling 1919's open cap); and a chunk is drawn in bands as wide as its diamond, the same picture as drawn whole. The
// Huge map's far view at DPR 2 holds under 64 MB of canvas (the 9.1 polish design's P3).
import { describe, it, expect } from '../../harness.js';
import { createRenderer } from '../../../src/render/renderer.js';
import { createCamera, zoomFloor } from '../../../src/render/camera.js';
import { createSpriteCache, DEVICE_BUDGETS } from '../../../src/render/spriteCache.js';
import { createTerrainBaker, chunkScaleFor, chunkBytes, CHUNK_CEILING, FAR_CHUNK_SCALE, SLOW_BAKE_MS, chunkBands, MAX_CHUNKS, TERRAIN_BUDGET_BY_DEVICE } from '../../../src/render/terrainBaker.js';
import { FAR_ZOOM } from '../../../src/render/art/registry.js';
import { createWorld } from '../../../src/sim/world.js';
import { stressWorld } from '../../v60/b2/measure.js';
import { makeCanvas } from '../../helpers/canvas.js';

const MB = 1024 * 1024;
const P3_BYTES = 64 * MB;   // the 9.1 polish design's P3: the canvas the caches hold at DPR 2

describe('v100 p far view', () => {
  it('bakes the far view at 2 device px per art px, and a phone\'s chunks at most at 2', () => {
    expect([FAR_ZOOM, FAR_CHUNK_SCALE, CHUNK_CEILING.desktop, CHUNK_CEILING.phone]).toEqual([0.6, 2, 3, 2]);
    expect([chunkScaleFor(0.6, 2), chunkScaleFor(0.55, 2), chunkScaleFor(0.5, 2), chunkScaleFor(0.61, 2), chunkScaleFor(1, 2)]).toEqual([2, 2, 2, 3, 3]);
    expect([chunkScaleFor(0.6, 1), chunkScaleFor(0.5, 1), chunkScaleFor(1, 1)]).toEqual([1.5, 1, 2]);   // at DPR 1 the far view was under 2 already
    expect([chunkScaleFor(1, 2, CHUNK_CEILING.phone), chunkScaleFor(2, 2, CHUNK_CEILING.phone), chunkScaleFor(0.5, 1, CHUNK_CEILING.phone)]).toEqual([2, 2, 1]);
    const w = createWorld({ seed: 4 });
    const phone = createTerrainBaker({ kind: 'phone' }), desk = createTerrainBaker({ kind: 'desktop' });
    expect([phone.maxScale, desk.maxScale]).toEqual([2, 3]);
    expect([phone.get(w, 0, 0, 1, 2).scale, desk.get(w, 0, 0, 1, 2).scale, desk.get(w, 1, 0, 0.55, 2).scale]).toEqual([2, 3, 2]);
    expect(chunkBytes(2) * 2).toBeLessThan(chunkBytes(3));                             // a phone's chunk at DPR 2 and zoom 1 holds under half the bytes
  });

  it('caps a phone at one bake a frame after a bake over 8 ms; a desktop keeps two', () => {
    expect(SLOW_BAKE_MS).toBe(8);
    const w = createWorld({ seed: 4 });
    let t = 0, step = 20;
    const clock = () => (t += step);                                                   // each bake reads the clock twice: a bake takes `step` ms
    const phone = createTerrainBaker({ kind: 'phone', now: clock }), desk = createTerrainBaker({ kind: 'desktop', now: clock });
    expect([phone.bakeLimit(2), desk.bakeLimit(2)]).toEqual([2, 2]);                   // no bake yet
    phone.get(w, 0, 0, 1, 1); desk.get(w, 0, 0, 1, 1);
    expect([phone.lastBakeMs, phone.bakeLimit(2), desk.bakeLimit(2)]).toEqual([20, 1, 2]);
    step = 4;
    phone.get(w, 1, 0, 1, 1);
    expect(phone.bakeLimit(2)).toBe(2);                                                // a quick bake gives the second back
    // Through the renderer: a phone whose bakes are slow bakes one a frame after its first.
    step = 20;
    const slow = createTerrainBaker({ kind: 'phone', now: clock });
    const renderer = createRenderer({ canvas: makeCanvas(390, 844), dpr: 1, baker: slow });
    const world = stressWorld(64), cam = createCamera({ x: 32, y: 32, zoom: 1, size: 64 }), view = { width: 390, height: 844 };
    const bakes = [];
    for (let i = 0; i < 4; i++) bakes.push(renderer.renderFrame(world, cam, { view, now: 1000 }).bakes);
    expect(bakes[0]).toBe(2);
    expect(bakes.slice(1).every((n) => n <= 1)).toBe(true);
  });

  it('never evicts a chunk the frame shows for the count cap, which holds 64 (ruling 2289)', () => {
    expect(MAX_CHUNKS).toBe(64);
    const w = createWorld({ seed: 4 });
    const baker = createTerrainBaker({ maxChunks: 2 });
    baker.frame([{ cx: 0, cy: 0 }, { cx: 1, cy: 0 }, { cx: 2, cy: 0 }], w);
    for (const cx of [0, 1, 2]) baker.get(w, cx, 0, 1, 1);
    expect([0, 1, 2].map((cx) => baker.peek(w, cx, 0, 1, 1).fresh)).toEqual([true, true, true]);   // 9.1's cap dropped the oldest, shown or not
    baker.frame([{ cx: 2, cy: 0 }], w);
    baker.get(w, 3, 0, 1, 1);
    expect([baker.size(w), baker.peek(w, 0, 0, 1, 1).sprite]).toEqual([3, null]);       // the cap still lets the oldest unshown chunk go (one a bake, as before)
  });

  // Fix wave (ruling 2297): twice, once on an empty registry (nothing drawn but the terrain) and once with the real registry (the hills drawn into the
  // chunks, where the band seams overlap hill tiles).
  for (const [what, empty] of [['empty registry', true], ['real registry (hills drawn)', false]]) it(`draws a chunk in bands that make the same picture as the chunk drawn whole (${what})`, () => {
    const world = stressWorld(64), view = { width: 390, height: 844 };
    const shots = {};
    for (const n of [0, 8]) {
      chunkBands.n = n;
      try {
        const canvas = makeCanvas(780, 1688);
        const renderer = createRenderer({ canvas, dpr: 2, maxBakesPerFrame: Infinity, baker: createTerrainBaker({ kind: 'phone' }), ...(empty ? { registry: {}, spriteCache: createSpriteCache({ registry: {} }) } : {}) });
        const cam = createCamera({ x: 30.4, y: 33.7, zoom: 1, size: 64 });
        renderer.renderFrame(world, cam, { view, now: 1000 });
        shots[n] = canvas.getContext('2d').getImageData(0, 0, 780, 1688).data;
      } finally { chunkBands.n = 8; }
    }
    let off = 0, worst = 0;
    for (let i = 0; i < shots[0].length; i += 4) {
      const d = Math.max(Math.abs(shots[0][i] - shots[8][i]), Math.abs(shots[0][i + 1] - shots[8][i + 1]), Math.abs(shots[0][i + 2] - shots[8][i + 2]));
      if (d > 6) off++;
      if (d > worst) worst = d;
    }
    const share = off / (shots[0].length / 4);
    expect([share < 0.001 ? 'same' : Math.round(share * 10000) / 100, worst]).toEqual(['same', worst]);
  });

  // Fix round 1 (ruling 2295): Josh chose a larger desktop allowance over a cap. The desktop's caches are 160 MB (were 80), its terrain 120 MB (was 48).
  it('gives a desktop 160 MB of caches and 120 MB of terrain, and a phone what it had', () => {
    expect([DEVICE_BUDGETS.desktop.caches / MB, DEVICE_BUDGETS.phone.caches / MB, TERRAIN_BUDGET_BY_DEVICE.desktop / MB, TERRAIN_BUDGET_BY_DEVICE.phone / MB]).toEqual([160, 72, 120, 48]);
    expect([createTerrainBaker({ kind: 'desktop' }).budget / MB, createTerrainBaker({ kind: 'phone' }).budget / MB]).toEqual([120, 48]);
  });

  it('pans the Huge map at 1920x1080 (zoom 1, DPR 1) with no chunk re-baked once warm', () => {
    const world = stressWorld(112), view = { width: 1920, height: 1080 };
    for (const dpr of [1]) {   // DPR 2 at 1920x1080 (chunks of 4.9 MB) still re-bakes 4 in a 96-frame sweep at 120 MB: not held
      const { sprites, caches } = DEVICE_BUDGETS.desktop;
      const renderer = createRenderer({ canvas: makeCanvas(view.width * dpr, view.height * dpr), dpr, maxBakesPerFrame: Infinity, cachesBudget: caches,
        baker: createTerrainBaker({ kind: 'desktop' }), spriteCache: createSpriteCache({ maxBytes: sprites }) });
      const cam = createCamera({ x: 56, y: 56, zoom: 1, size: 112 });
      const sweep = (n) => { let bakes = 0; for (let i = 0; i < 96; i++) { cam.x = 56 + (i < 48 ? i : 96 - i) * 0.5; bakes += renderer.renderFrame(world, cam, { view, now: 1000 + n * 100 + i }).bakes || 0; } return bakes; };
      sweep(0);
      const again = sweep(1), { terrainBytes, spriteBytes } = renderer.cacheBytes();
      expect([`DPR ${dpr}`, again, terrainBytes + spriteBytes <= DEVICE_BUDGETS.desktop.caches]).toEqual([`DPR ${dpr}`, 0, true]);
    }
  });

  // P3 was set for a phone's view (tests/v91/p/caches.test.js); a desktop's caches keep 80 MB since 9.3 (ruling 1936), so it is held to that.
  it('holds the Huge map\'s far view at DPR 2 under 64 MB of canvas on a phone (P3), and a desktop\'s inside its own budget', () => {
    const world = stressWorld(112);
    // Fix round 1 (ruling 2294): and a desktop at 1920x1080, DPR 2 and 1, at the floor zoom, where all 49 chunks of the 112 map show (108 MB at scale 2).
    for (const [kind, view, cap, dpr] of [['phone', { width: 390, height: 844 }, P3_BYTES, 2], ['desktop', { width: 1280, height: 800 }, DEVICE_BUDGETS.desktop.caches, 2],
      ['desktop', { width: 1920, height: 1080 }, DEVICE_BUDGETS.desktop.caches, 2], ['desktop', { width: 1920, height: 1080 }, DEVICE_BUDGETS.desktop.caches, 1]]) {
      const { sprites, caches } = DEVICE_BUDGETS[kind];
      const renderer = createRenderer({ canvas: makeCanvas(view.width * dpr, view.height * dpr), dpr, maxBakesPerFrame: Infinity, cachesBudget: caches,
        baker: createTerrainBaker({ kind }), spriteCache: createSpriteCache({ maxBytes: sprites }) });
      const cam = createCamera({ x: 56, y: 56, zoom: 1, size: 112 });
      cam.zoom = Math.min(FAR_ZOOM, zoomFloor(cam, view) + 0.05);
      for (let i = 0; i < 3; i++) renderer.renderFrame(world, cam, { view, now: 1000 + i });
      const { terrainBytes, spriteBytes } = renderer.cacheBytes();
      const mb = Math.round((terrainBytes + spriteBytes) / MB * 10) / 10;
      it(`v100 p far view > measured: ${kind} ${view.width}x${view.height} DPR ${dpr} at zoom ${Math.round(cam.zoom * 100) / 100}: terrain ${Math.round(terrainBytes / MB * 10) / 10} MB, sprites ${Math.round(spriteBytes / MB * 10) / 10} MB, ${mb} MB of ${cap / MB}`, () => {});
      expect([`${kind} ${view.width}x${view.height} DPR ${dpr}`, cam.zoom <= FAR_ZOOM, terrainBytes + spriteBytes <= cap ? 'ok' : mb]).toEqual([`${kind} ${view.width}x${view.height} DPR ${dpr}`, true, 'ok']);
    }
  });
});
