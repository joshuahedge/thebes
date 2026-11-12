// Version 10.0 (Track 0, rulings 2062, 2103, 2104): the phone frame test, with today's numbers. The stress city (64) and the Huge map (the stress city
// on 112) drawn at 390x844, DPR 2, with the phone's cache budgets (DEVICE_BUDGETS.phone: the sprites' and the caches' bytes), 600 frames with the
// camera panning a tile a frame (back and forth along x, so it stays on the map), the renderer's own bake limit (2 a frame), after a warm-up of
// one sweep. Each frame is timed twice: the renderer's own time (js) and with the canvas flushed (getImageData of one pixel: the raster the frame
// owes), and the flushed time is the frame. The 9.1 targets (polish design section 9) are P2, the stress city's median <= 16.7 ms and p95 <= 33 ms,
// and P4, the Huge map's median <= 33 ms, both at a 4x CPU throttle; the bounds are those times 1.2 (ruling 2062: life's headroom). They fail today
// (tools/profile.ps1 -Frames measures the throttled numbers; the rulings note has the table), so the bounds are off until Track P turns them on.
// The numbers print as a test of their own (the harness prints only names, so the measuring test adds one named with them: ruling 2104).
import { describe, it, expect } from '../../harness.js';
import { createRenderer } from '../../../src/render/renderer.js';
import { createCamera, visibleTileRange } from '../../../src/render/camera.js';
import { createSpriteCache, DEVICE_BUDGETS } from '../../../src/render/spriteCache.js';
import { walkersAt } from '../../../src/render/walkers.js';
import { createTerrainBaker } from '../../../src/render/terrainBaker.js';
import { stressWorld } from '../../v60/b2/measure.js';
import { makeCanvas } from '../../helpers/canvas.js';

// Track P turns these on (ruling 2062). Version 10.0, Track P (ruling 2280): on, unthrottled (ruling 2105: the harness cannot throttle; the 4x
// numbers are tools/profile.ps1 -Frames's).
export const BOUNDS_ON = true;
export const TARGETS = { stress: { p50: 16.7, p95: 33 }, huge: { p50: 33, p95: null } };
export const HEADROOM = 1.2;
// The bounds: the targets x HEADROOM, rounded to a tenth (stress p50 20.0, p95 39.6; Huge p50 39.6).
export const boundsFor = (name) => ({ p50: Math.round(TARGETS[name].p50 * HEADROOM * 10) / 10, p95: TARGETS[name].p95 ? Math.round(TARGETS[name].p95 * HEADROOM * 10) / 10 : null });
export const FRAMES = 600;
const SWEEP = 24;   // tiles each way from the middle: a sweep is 4 x SWEEP frames

const q = (xs, p) => { const s = [...xs].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; };
const r1 = (v) => Math.round(v * 10) / 10;

// measureFrames(world, { width, height, dpr, kind, frames }) -> { p50, p95, max, jsP50, jsP95, bakes, sprites }
export function measureFrames(world, { width, height, dpr, kind, frames = FRAMES, zoom = 1 }) {
  const view = { width, height };
  const canvas = makeCanvas(width * dpr, height * dpr), ctx = canvas.getContext('2d');
  const { sprites, caches } = DEVICE_BUDGETS[kind];
  // Version 10.0, Track P (ruling 2286): the device's terrain baker too (a phone's chunk ceiling and bake cap), as the device's own game makes it.
  const renderer = createRenderer({ canvas, dpr, cachesBudget: caches, spriteCache: createSpriteCache({ maxBytes: sprites }), baker: createTerrainBaker({ kind }) });
  const mid = world.size / 2, sweep = Math.min(SWEEP, Math.floor(world.size / 2) - 4);
  const cam = createCamera({ x: mid, y: mid, zoom, size: world.size });
  const at = (i) => { const k = i % (4 * sweep); return k < sweep ? k : k < 3 * sweep ? 2 * sweep - k : k - 4 * sweep; };   // 0 .. +sweep .. -sweep .. 0
  const frame = (i) => {
    cam.x = mid + at(i);
    const t = world.day + i / 60, range = visibleTileRange(cam, view, world.size);
    return renderer.renderFrame(world, cam, { view, now: 1000 + i * 17, walkers: walkersAt(world, t, range) });
  };
  for (let i = 0; i < 4 * sweep; i++) { frame(i); ctx.getImageData(0, 0, 1, 1); }   // the warm-up: one sweep
  const all = [], js = [];
  let bakes = 0, drawn = 0;
  for (let i = 0; i < frames; i++) {
    const t0 = performance.now();
    const stats = frame(i);
    const t1 = performance.now();
    ctx.getImageData(0, 0, 1, 1);
    const t2 = performance.now();
    js.push(t1 - t0); all.push(t2 - t0);
    bakes += stats.bakes || 0; drawn += stats.sprites || 0;
  }
  return { p50: r1(q(all, 0.5)), p95: r1(q(all, 0.95)), max: r1(Math.max(...all)), jsP50: r1(q(js, 0.5)), jsP95: r1(q(js, 0.95)), bakes, sprites: Math.round(drawn / frames) };
}

const said = (name, size, w, h, dpr, kind, m) => `${name} ${size} at ${w}x${h} DPR ${dpr} (${kind} budgets): frame p50 ${m.p50} ms, p95 ${m.p95} ms, worst ${m.max} ms; ` +
  `js p50 ${m.jsP50} ms, p95 ${m.jsP95} ms; ${m.bakes} bakes, ${m.sprites} sprites a frame`;
const results = (typeof window !== 'undefined' && (window.__v100Frames = window.__v100Frames || {})) || {};

describe('v100 w0 phone frame', () => {
  it('measures the stress city and the Huge map at 390x844 DPR 2 with the phone budgets, inside the 9.1 targets x 1.2 (rulings 2062, 2280)', () => {
    for (const [name, size] of [['stress', 64], ['huge', 112]]) {
      const bound = boundsFor(name);
      const within = (m) => m.p50 <= bound.p50 && (!bound.p95 || m.p95 <= bound.p95);
      let m = measureFrames(stressWorld(size), { width: 390, height: 844, dpr: 2, kind: 'phone' });
      if (BOUNDS_ON && !within(m)) m = measureFrames(stressWorld(size), { width: 390, height: 844, dpr: 2, kind: 'phone' });   // Track P (ruling 2280): once more, as the v90 budget test does
      results[`${name}-390x844`] = m;
      it(`v100 w0 phone frame > measured: ${said(name, size, 390, 844, 2, 'phone', m)}`, () => {});
      expect(m.p50).toBeGreaterThan(0);
      if (BOUNDS_ON) {
        expect([name, 'p50', m.p50 <= bound.p50 ? 'ok' : m.p50]).toEqual([name, 'p50', 'ok']);
        if (bound.p95) expect([name, 'p95', m.p95 <= bound.p95 ? 'ok' : m.p95]).toEqual([name, 'p95', 'ok']);
      }
    }
  });
  // The desktop sizes for the rulings note's table: measured only when the grep names them (-Grep "v100 w0 phone frame > desktop sizes"), so the
  // full suite does not pay for them.
  it('desktop sizes: the same two at 1280x800 and 1920x1080 DPR 1 with the desktop budgets (only when the grep names them)', () => {
    const grep = typeof location !== 'undefined' ? new URLSearchParams(location.search).get('grep') || '' : '';
    if (!grep.includes('desktop sizes')) return;
    for (const [w, h] of [[1280, 800], [1920, 1080]]) {
      for (const [name, size] of [['stress', 64], ['huge', 112]]) {
        const m = measureFrames(stressWorld(size), { width: w, height: h, dpr: 1, kind: 'desktop' });
        results[`${name}-${w}x${h}`] = m;
        it(`v100 w0 phone frame > desktop sizes measured: ${said(name, size, w, h, 1, 'desktop', m)}`, () => {});
      }
    }
  });
});
