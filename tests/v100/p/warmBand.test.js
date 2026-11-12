// Version 10.0, Track P (rulings 2284-2285, plan P.2): the warm band. On a quiet frame (no bake, under WARM_AFTER_MS) the renderer asks the sprite
// cache to render the slots of the buildings in the chunk ring one chunk outside the view (chunkIndex.js ringBuildings), at most WARM_BAND_MS a
// frame, nearest the view first, so a pan of a chunk draws from the cache: after the band is warm, the pan's frame misses nothing (the stress
// test's pattern), where a cache without the band renders sprites fresh in the middle of the pan.
import { describe, it, expect } from '../../harness.js';
import { createRenderer } from '../../../src/render/renderer.js';
import { createCamera, visibleTileRange, CHUNK } from '../../../src/render/camera.js';
import { createSpriteCache, WARM_BAND_MS, WARM_AFTER_MS } from '../../../src/render/spriteCache.js';
import { createTerrainBaker } from '../../../src/render/terrainBaker.js';
import { ringBuildings, buildingsInRange } from '../../../src/render/chunkIndex.js';
import { stressWorld } from '../../v60/b2/measure.js';
import { makeCanvas } from '../../helpers/canvas.js';

const VIEW = { width: 390, height: 844 };

// A renderer at 390x844 DPR 1 on the 112 stress city (a phone's narrow view: a one-chunk pan brings new looks and homes in), warmed: every chunk
// baked and every sprite in view cached. warm: whether the cache keeps its warm band.
function rig(world, warm) {
  const counter = {};
  const spriteCache = createSpriteCache({ counter });
  if (!warm) spriteCache.warmBand = undefined;
  const renderer = createRenderer({ canvas: makeCanvas(VIEW.width, VIEW.height), dpr: 1, maxBakesPerFrame: Infinity, spriteCache, baker: createTerrainBaker({ kind: 'desktop' }) });
  const cam = createCamera({ x: 40, y: 56, zoom: 1, size: world.size });
  const frame = () => renderer.renderFrame(world, cam, { view: VIEW, now: 1000 });
  return { counter, cam, frame, spriteCache };
}

describe('v100 p warm band', () => {
  it('lists the ring one chunk outside the view, each building once, the nearest chunks first, none of the view\'s own', () => {
    const world = stressWorld(112);
    const cam = createCamera({ x: 40, y: 56, zoom: 1, size: world.size });
    const range = visibleTileRange(cam, VIEW, world.size);
    const ring = ringBuildings(world, range);
    expect(ring.length).toBeGreaterThan(20);
    expect(new Set(ring.map((b) => b.id)).size).toBe(ring.length);
    const c = (t) => Math.floor(t / CHUNK);
    const box = { x0: c(range.x0), y0: c(range.y0), x1: c(range.x1), y1: c(range.y1) };
    const inBox = (b) => c(b.x) >= box.x0 && c(b.x + b.w - 1) <= box.x1 && c(b.y) >= box.y0 && c(b.y + b.d - 1) <= box.y1;
    expect(ring.filter(inBox).length).toBe(0);                                          // none wholly inside the view's chunks
    const near = (b) => c(b.x + b.w - 1) >= box.x0 - 1 && c(b.x) <= box.x1 + 1 && c(b.y + b.d - 1) >= box.y0 - 1 && c(b.y) <= box.y1 + 1;
    expect(ring.filter((b) => !near(b)).length).toBe(0);                               // and none past the ring
    const mx = (box.x0 + box.x1) / 2, my = (box.y0 + box.y1) / 2, d = (b) => Math.hypot(c(b.x) - mx, c(b.y) - my);
    expect(d(ring[0])).toBeLessThanOrEqual(d(ring[ring.length - 1]));                  // nearest first
    const view = new Set(buildingsInRange(world, { x0: box.x0 * CHUNK, y0: box.y0 * CHUNK, x1: box.x1 * CHUNK + CHUNK - 1, y1: box.y1 * CHUNK + CHUNK - 1 }).map((b) => b.id));
    expect(ring.filter((b) => view.has(b.id) && inBox(b)).length).toBe(0);
  });

  it('warms at most its budget a frame, only on a quiet frame, and never past the sprite budget', () => {
    expect([WARM_BAND_MS, WARM_AFTER_MS]).toEqual([2, 8]);
    const world = stressWorld(112);
    const cam = createCamera({ x: 40, y: 56, zoom: 1, size: world.size });
    let t = 0;
    const full = createSpriteCache({ maxBytes: 1, now: () => t });
    expect(full.warmBand(world, cam, VIEW, 2, 1)).toBe(1);                             // one sprite fills a one-byte budget, and the band stops there
    expect(full.warmBand(world, cam, VIEW, 2, 1)).toBe(0);
    const slow = createSpriteCache({ now: () => (t += 5) });                            // every render seems to take 5 ms: one sprite a frame
    expect(slow.warmBand(world, cam, VIEW, 2, 1)).toBe(1);
    // A frame with a bake warms nothing.
    const r = rig(world, true);
    const first = r.frame();
    expect(first.bakes).toBeGreaterThan(0);
    expect(first.warmed).toBe(0);
  });

  it('after the band is warm, a one-chunk pan renders no sprite fresh; without the band it does', () => {
    const world = stressWorld(112);
    const misses = {};
    for (const warm of [true, false]) {
      const r = rig(world, warm);
      for (let i = 0; i < 3; i++) r.frame();                                          // bake the view and cache its sprites
      let quiet = 0;
      for (let i = 0; i < 400 && quiet < 3; i++) { const s = r.frame(); quiet = s.warmed === 0 && s.bakes === 0 && s.prebakes === 0 ? quiet + 1 : 0; }
      const before = r.counter.misses || 0;
      r.cam.x += CHUNK;                                                                 // one chunk along x
      const missed = [], get = r.spriteCache.get;
      r.spriteCache.get = (...a) => { const n = r.spriteCache.size(); const s = get(...a); if (r.spriteCache.size() > n) missed.push(a[0]); return s; };
      r.frame();
      misses[warm ? 'warm' : 'cold'] = (r.counter.misses || 0) - before;
      if (warm) misses.slots = missed.join(' ');                                       // named, so a failure says which slots were rendered fresh
      if (warm) expect(r.counter.warmed).toBeGreaterThan(0);
    }
    expect(misses.cold).toBeGreaterThan(0);                                             // the pan does reach new slots
    expect(misses.slots).toBe('');
    expect(misses.warm).toBe(0);
  });
});
