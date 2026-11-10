// Version 9.3 Track P (rulings 1935-1939, spec section 7): the scenes the caches are measured on, and the camera's 600 frames over each. The stress
// city (tests/render/stress.test.js, 64x64) and the 112 map (tests/v90/v/budget.test.js), each in the Capital look (fully rebuilt) and mid-rebuild
// (the Capital's front a third of the way out, the City's two thirds, the Town's beyond: three looks on screen at once, and the rebuild's scaffolds).
import { createRenderer } from '../../../src/render/renderer.js';
import { createSpriteCache, canvasBytes } from '../../../src/render/spriteCache.js';
import { createTerrainBaker } from '../../../src/render/terrainBaker.js';
import { createCamera, visibleTileRange, zoomFloor } from '../../../src/render/camera.js';
import { walkersAt } from '../../../src/render/walkers.js';
import { REBUILD_DAYS } from '../../../src/render/looks.js';
import { createWorld } from '../../../src/sim/world.js';
import { buildStressCity } from '../../../src/dev/sampleCity.js';
import { makeCanvas } from '../../helpers/canvas.js';

export const DESKTOP = { width: 1280, height: 800 };
export const PHONE = { width: 390, height: 844 };

// A scene's world: 'capital' is fully rebuilt; 'rebuild' has the Capital's front at a third and the City's at two thirds of the way out.
export function sceneWorld(size, look) {
  const w = buildStressCity(createWorld({ seed: 3, size }));
  w.milestone = 'capital';
  if (w.day < 3 * REBUILD_DAYS) w.day = 3 * REBUILD_DAYS;
  w.splits = { ...(w.splits || {}), village: 0, town: 0, city: 0, capital: 0 };
  if (look === 'rebuild') { w.splits.city = Math.round(w.day - REBUILD_DAYS * 2 / 3); w.splits.capital = Math.round(w.day - REBUILD_DAYS / 3); }
  return w;
}

// The camera's 600 frames (a player's ten seconds at 60 a second, on a clock moved by hand): a loop round the middle at zoom 1, a closer loop
// at zoom 2, the far zoom (the map's floor), then 0.75 and back to 1. Each phase pans, so chunks and sprites come into view as a player's would.
export function cameraAt(i, size, cam, view) {
  const phases = [[150, 1, 0.25], [150, 2, 0.12], [150, 'far', 0.3], [75, 0.75, 0.25], [75, 1, 0.2]];
  let k = i, ph = 0;
  while (ph < phases.length - 1 && k >= phases[ph][0]) { k -= phases[ph][0]; ph++; }
  const [n, z, r] = phases[ph];
  const a = (2 * Math.PI * k) / n;
  cam.zoom = z === 'far' ? Math.max(0.5, zoomFloor(cam, view)) : z;
  cam.x = size / 2 + Math.cos(a) * size * r;
  cam.y = size / 2 + Math.sin(a) * size * r;
}

// Runs the 600 frames over a scene with the given sprite and caches budgets. Returns the peak bytes (sprites, terrain, both, and the most
// sprites one frame drew), the sprite draws, misses and evictions, the terrain bakes and re-bakes (a chunk baked again at the same scale: it
// was evicted), the most bakes in a frame, and each frame's time (for p50 and p95; only the timing run reads them).
export function runScene(world, { view, dpr, spriteBytes, cachesBytes, frames = 600, walkers = true }) {
  const counter = {}, tcount = {};
  const clock = { t: 0 };
  const cache = createSpriteCache({ counter, now: () => clock.t, maxBytes: spriteBytes });
  const realGet = cache.get;
  let drawn = new Map();
  cache.get = (slot, zoom, d) => { const s = realGet(slot, zoom, d); if (s) drawn.set(`${slot}@${zoom}`, canvasBytes(s.canvas)); return s; };
  const baker = createTerrainBaker({ counter: tcount });
  const bakedKeys = new Set();
  let rebakes = 0;
  const realBake = baker.get;
  baker.get = (w, cx, cy, zoom, d, allow) => {
    const before = tcount.bakes || 0;
    const s = realBake(w, cx, cy, zoom, d, allow);
    if ((tcount.bakes || 0) > before) { const key = `${cx},${cy},${s && s.scale}`; if (bakedKeys.has(key)) rebakes++; bakedKeys.add(key); }
    return s;
  };
  const renderer = createRenderer({ canvas: makeCanvas(view.width * dpr, view.height * dpr), dpr, spriteCache: cache, baker, cachesBudget: cachesBytes });
  const cam = createCamera({ x: world.size / 2, y: world.size / 2, zoom: 1, size: world.size });
  let maxSprites = 0, maxTerrain = 0, maxBoth = 0, maxFrameNeed = 0, maxBakes = 0;
  const times = [];
  for (let i = 0; i < frames; i++) {
    cameraAt(i, world.size, cam, view);
    clock.t = i * 1000 / 60;
    drawn = new Map();
    const ws = walkers ? walkersAt(world, i / 60, visibleTileRange(cam, view, world.size)) : [];
    const t0 = performance.now();
    const s = renderer.renderFrame(world, cam, { view, walkers: ws, now: 1000 + clock.t });
    times.push(performance.now() - t0);
    const c = renderer.cacheBytes();
    maxSprites = Math.max(maxSprites, c.spriteBytes); maxTerrain = Math.max(maxTerrain, c.terrainBytes);
    maxBoth = Math.max(maxBoth, c.spriteBytes + c.terrainBytes);
    maxFrameNeed = Math.max(maxFrameNeed, [...drawn.values()].reduce((a, b) => a + b, 0));
    maxBakes = Math.max(maxBakes, s.bakes);
  }
  const sorted = [...times].sort((a, b) => a - b);
  const draws = (counter.hits || 0) + (counter.misses || 0);
  return {
    maxSprites, maxTerrain, maxBoth, maxFrameNeed, draws, misses: counter.misses || 0, evicted: counter.evicted || 0,
    bakes: tcount.bakes || 0, rebakes, maxBakes,
    p50: sorted[Math.floor(frames * 0.5)], p95: sorted[Math.floor(frames * 0.95)], times,
  };
}
