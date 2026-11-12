import { describe, it, expect } from '../harness.js';
import { createRenderer } from '../../src/render/renderer.js';
import { createCamera, visibleTileRange } from '../../src/render/camera.js';
import { createSpriteCache } from '../../src/render/spriteCache.js';
import { walkersAt } from '../../src/render/walkers.js';
import { createWorld } from '../../src/sim/world.js';
import { buildStressCity } from '../../src/dev/sampleCity.js';
import { makeCanvas } from '../helpers/canvas.js';

// Version 10.0, Track P (ruling 2281): the median frame, now with the canvas flushed (the raster the frame owes, as the phone frame test times it),
// is held to the 9.1 polish design's P2 target x 1.2 (20.0 ms at 390x844 DPR 2) scaled to 1280x800 DPR 1 by Track 0's harness ratio between the
// two sizes for the stress city (10.9 / 16.8 ms, ruling 2105): 13.0 ms, unthrottled (ruling 2105). Was 50 ms, the script's time alone.
export const STRESS_MEDIAN_MS = 13.0;
const flushed = (canvas) => canvas.getContext('2d').getImageData(0, 0, 1, 1);

describe('stress frame', () => {
  it('renders a full 64x64 city at laptop size well inside the frame budget once caches are warm', () => {
    const world = buildStressCity(createWorld({ seed: 3 }));
    const canvas = makeCanvas(1280, 800);
    const view = { width: 1280, height: 800 };
    const counter = {};
    const renderer = createRenderer({ canvas, dpr: 1, maxBakesPerFrame: Infinity, spriteCache: createSpriteCache({ counter }) });
    const cam = createCamera({ x: 32, y: 32, zoom: 1 });
    const frame = (t) => renderer.renderFrame(world, cam, { view, walkers: walkersAt(world, t, visibleTileRange(cam, view, world.size)) });
    for (let i = 0; i < 3; i++) { frame(i * 0.1); flushed(canvas); }          // warm the chunk and sprite caches
    const warmMisses = counter.misses || 0;
    const median = () => {
      const times = [];
      for (let i = 0; i < 15; i++) {
        const started = performance.now();
        const stats = frame(1 + i * 0.1);
        flushed(canvas);
        times.push(performance.now() - started);
        expect(stats.bakes).toBe(0);
        expect(stats.sprites).toBeGreaterThan(200);
      }
      return times.sort((a, b) => a - b)[7];
    };
    let ms = median();
    if (ms >= STRESS_MEDIAN_MS) ms = median();                // once more, as the v90 budget test does
    expect(counter.misses || 0).toBe(warmMisses);          // no sprite re-render once warm
    expect(ms < STRESS_MEDIAN_MS ? 'ok' : Math.round(ms * 10) / 10).toBe('ok');
    // Zoomed out, more is on screen; it must still finish in a sane time.
    const wide = createCamera({ x: 32, y: 32, zoom: 0.5 });
    renderer.renderFrame(world, wide, { view, walkers: walkersAt(world, 2) });
    const started = performance.now();
    renderer.renderFrame(world, wide, { view, walkers: walkersAt(world, 2.1) });
    expect(performance.now() - started).toBeLessThan(120);
  });
});
