import { describe, it, expect } from '../harness.js';
import { createRenderer } from '../../src/render/renderer.js';
import { createCamera, visibleTileRange } from '../../src/render/camera.js';
import { createSpriteCache } from '../../src/render/spriteCache.js';
import { walkersAt } from '../../src/render/walkers.js';
import { createWorld } from '../../src/sim/world.js';
import { buildStressCity } from '../../src/dev/sampleCity.js';
import { makeCanvas } from '../helpers/canvas.js';

describe('stress frame', () => {
  it('renders a full 64x64 city at laptop size well inside the frame budget once caches are warm', () => {
    const world = buildStressCity(createWorld({ seed: 3 }));
    const canvas = makeCanvas(1280, 800);
    const view = { width: 1280, height: 800 };
    const counter = {};
    const renderer = createRenderer({ canvas, dpr: 1, maxBakesPerFrame: Infinity, spriteCache: createSpriteCache({ counter }) });
    const cam = createCamera({ x: 32, y: 32, zoom: 1 });
    const frame = (t) => renderer.renderFrame(world, cam, { view, walkers: walkersAt(world, t, visibleTileRange(cam, view, world.size)) });
    for (let i = 0; i < 3; i++) frame(i * 0.1);          // warm the chunk and sprite caches
    const warmMisses = counter.misses || 0;
    const times = [];
    for (let i = 0; i < 5; i++) {
      const started = performance.now();
      const stats = frame(1 + i * 0.1);
      times.push(performance.now() - started);
      expect(stats.bakes).toBe(0);
      expect(stats.sprites).toBeGreaterThan(200);
    }
    expect(counter.misses || 0).toBe(warmMisses);          // no sprite re-render once warm
    times.sort((a, b) => a - b);
    expect(times[2]).toBeLessThan(50);
    // Zoomed out, more is on screen; it must still finish in a sane time.
    const wide = createCamera({ x: 32, y: 32, zoom: 0.5 });
    renderer.renderFrame(world, wide, { view, walkers: walkersAt(world, 2) });
    const started = performance.now();
    renderer.renderFrame(world, wide, { view, walkers: walkersAt(world, 2.1) });
    expect(performance.now() - started).toBeLessThan(120);
  });
});
