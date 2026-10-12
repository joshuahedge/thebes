import { describe, it, expect } from '../../harness.js';
import { buildStressCity } from '../../../src/dev/sampleCity.js';
import { createWorld } from '../../../src/sim/world.js';
import { createRenderer } from '../../../src/render/renderer.js';
import { createCamera, visibleTileRange } from '../../../src/render/camera.js';
import { createSpriteCache } from '../../../src/render/spriteCache.js';
import { walkersAt } from '../../../src/render/walkers.js';
import { drawMonument } from '../../../src/render/monuments.js';
import { makeCanvas } from '../../helpers/canvas.js';

// Spec 5.7 and 9: three monument sites within 1 ms a frame, measured in the stress city's own frame (its three sites,
// src/dev/sampleCity.js STRESS_SITES) with Track B's live draw, called as createUI calls it. A timing assertion: rerun
// once under load before investigating.
// Each frame is handed on once drawn (copied into a 1 x 1 canvas, untimed), as the page shows each frame it draws: a canvas
// that is never shown keeps recording frame after frame, and the call that happens to cross its limit pays to play back
// all of them (93 ms in one site's call, once in 30 frames, at the wrap-up: 3 ms a frame on the mean), which is no cost
// of the monuments' own.
describe('s4 balance live draw budget', () => {
  it('draws the stress city\'s three sites within 1 ms a frame in the game\'s own frame (spec 5.7, 9)', () => {
    const world = buildStressCity(createWorld({ seed: 3 }));
    const view = { width: 1280, height: 800 };
    const canvas = makeCanvas(1280, 800), shown = makeCanvas(1, 1).getContext('2d');
    const renderer = createRenderer({ canvas, dpr: 1, maxBakesPerFrame: Infinity, spriteCache: createSpriteCache({}) });
    const cam = createCamera({ x: 31, y: 31, zoom: 1 });
    let spent = 0, calls = 0;
    // The monument drawn live in its depth slot, timed call by call (the page's timer is coarse, so the mean over many
    // calls is what counts).
    const live = (g, o) => {
      const t0 = performance.now();
      drawMonument(g, world, o.b, { now: calls * 16, timeDays: world.day + calls * 0.008, motion: 'full', ghost: null, selectedId: null });
      spent += performance.now() - t0;
      calls++;
    };
    const frame = (t) => {
      const stats = renderer.renderFrame(world, cam, { view, live, walkers: walkersAt(world, t, visibleTileRange(cam, view, world.size)) });
      shown.drawImage(canvas, 0, 0, 1, 1);                                        // the frame handed on, as the page shows it
      return stats;
    };
    for (let i = 0; i < 3; i++) frame(i * 0.1);                                  // warm the chunk and sprite caches
    spent = 0; calls = 0;
    const FRAMES = 30;
    for (let i = 0; i < FRAMES; i++) expect(frame(1 + i * 0.1).live).toBe(3);   // all three on screen, drawn live
    expect(calls).toBe(3 * FRAMES);
    expect(spent / FRAMES).toBeLessThan(1);
  });
});
