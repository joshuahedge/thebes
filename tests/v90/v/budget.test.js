// Version 9.0 Track V (rulings 1600-1619, design T9): V's new layers fit their budget, the v70 test's way (tests/v70/s/budget.test.js). On the stress city
// with every effect live (tests/v90/v/stage.js), the layers' own time a frame: effectsV90's (the weather, the scaffolds, dust, a fire fought, the
// festival and the Victory, the beaten raid's moment) and the ground layer's (the river's flow, three wakes), median <= 2 ms at zoom 1 in 1280x800 and
// <= 4 ms at the Huge map's zoom floor in 1920x1080, and with the canvas flushed under the 14 ms gross-regression cap. Nothing is shed while it is
// measured (the dropper is not asked). V never loosens a bound: an effect that breaks one is cut and reported.
import { describe, it, expect } from '../../harness.js';
import { stressWorld } from '../../v60/b2/measure.js';
import { createCamera, visibleTileRange, artToScreen, zoomFloor } from '../../../src/render/camera.js';
import { viewCull, createRenderer } from '../../../src/render/renderer.js';
import { walkersAt } from '../../../src/render/walkers.js';
import { makeDraw } from '../../../src/render/art/ctx.js';
import { ART_SCALE } from '../../../src/render/iso.js';
import { makeCanvas } from '../../helpers/canvas.js';
import { drawV90 } from '../../../src/render/v90/effects.js';
import { drawFlow, riverRows } from '../../../src/render/ambient.js';
import { drawWake } from '../../../src/render/v90/wakes.js';
import { takeSpent } from '../../../src/render/v90/dropper.js';
import { scaffoldsAt, drawScaffold } from '../../../src/render/v90/scaffold.js';
import { stageEffects, walkersFor } from './stage.js';

const median = (a) => [...a].sort((x, y) => x - y)[a.length >> 1];
const RASTER_CAP_MS = 14;

export function rigV90(world, view, zoomMode) {
  const cam = createCamera({ x: world.size / 2, y: world.size / 2, zoom: 1, size: world.size });
  cam.zoom = zoomMode === 'floor' ? zoomFloor(cam, view) : 1;
  const canvas = makeCanvas(view.width, view.height), ctx = canvas.getContext('2d');
  const range = visibleTileRange(cam, view, world.size);
  const [ox, oy] = artToScreen(cam, view, 0, 0);
  const g = makeDraw(ctx, ART_SCALE * cam.zoom, ART_SCALE * cam.zoom);
  g.cull = viewCull(cam, view);
  const walkers = walkersFor(world, world.day + 0.3, range);
  const rows = riverRows(world, range.y0 - 2, range.y1 + 2);
  const mid = world.size / 2;
  const one = (i) => {
    const now = 1000 + i * 17;
    ctx.setTransform(1, 0, 0, 1, ox, oy);
    drawFlow(g, world, rows, range, now);
    for (let k = 0; k < 3; k++) drawWake(g, mid + k * 3, mid, 1, 0, now);
    for (const s of scaffoldsAt(world)) drawScaffold(g, world, s);             // the scaffolds, which the renderer draws in their buildings' depth slots
    drawV90(g, world, { range, now, walkers });
    takeSpent();
  };
  const flush = () => ctx.getImageData(0, 0, 1, 1);
  return {
    zoom: cam.zoom, walkers,
    js(n = 40) {
      for (let i = 0; i < 6; i++) one(i);
      flush();
      const times = [];
      for (let i = 0; i < n; i++) { const t = performance.now(); one(i); times.push(performance.now() - t); if (i % 8 === 7) flush(); }
      flush();
      return median(times);
    },
    raster(n = 12) {
      for (let i = 0; i < 3; i++) { one(i); flush(); }
      const times = [];
      for (let i = 0; i < n; i++) { const t = performance.now(); one(i); flush(); times.push(performance.now() - t); }
      return median(times);
    },
  };
}

function measuredWell(measure, ok, tries = 3) {
  let m = measure();
  for (let i = 1; i < tries && !ok(m); i++) m = measure();
  return m;
}

// Version 10.0, Track P (rulings 2282, 2290): the whole frame of the Huge map, where the layers' bounds above stay as they were. The 112 stress city
// in 1920x1080 DPR 1 with the desktop budgets, the camera standing and the walkers walking, the canvas flushed each frame. At zoom 1 (where Track 0
// measured the ratio) the median is held to the 9.1 polish design's P4 (the Huge map's median <= 33 ms at 390x844 DPR 2) x 1.2, scaled to 1920x1080
// by Track 0's harness ratio for the Huge map between the two sizes (19.7 / 15.8 ms, ruling 2105): HUGE_FRAME_MS, unthrottled (ruling 2105). At the
// zoom floor (the far view, every building on the map in sight) the median is held under P4's other clause, no frame over 250 ms after warm-up.
export const HUGE_FRAME_MS = 49.4, HUGE_FLOOR_MS = 250;
describe('v90 v budget: the Huge frame (Version 10.0, Track P)', () => {
  for (const [zoomMode, bound] of [['zoom 1', HUGE_FRAME_MS], ['zoom floor', HUGE_FLOOR_MS]]) {
    it(`draws the 112 stress city at ${zoomMode} in 1920x1080 within the P4 bound once warm`, () => {
      const world = stressWorld(112), view = { width: 1920, height: 1080 };
      const canvas = makeCanvas(1920, 1080), flush = () => canvas.getContext('2d').getImageData(0, 0, 1, 1);
      const renderer = createRenderer({ canvas, dpr: 1 });
      const cam = createCamera({ x: 56, y: 56, zoom: 1, size: 112 });
      if (zoomMode === 'zoom floor') cam.zoom = zoomFloor(cam, view);
      const frame = (i) => renderer.renderFrame(world, cam, { view, now: 1000 + i * 17, walkers: walkersAt(world, world.day + i / 60, visibleTileRange(cam, view, 112)) });
      for (let i = 0; i < 40; i++) { frame(i); flush(); }                             // bake the view at two chunks a frame, and its ring
      const median = () => {
        const times = [];
        for (let i = 0; i < 15; i++) { const t = performance.now(); frame(40 + i); flush(); times.push(performance.now() - t); }
        return times.sort((a, b) => a - b)[7];
      };
      let ms = median();
      if (ms > bound) ms = median();
      expect([zoomMode, ms <= bound ? 'ok' : Math.round(ms * 10) / 10]).toEqual([zoomMode, 'ok']);
    });
  }
});

describe('v90 v budget', () => {
  for (const [size, view, zoomMode, budget] of [[64, { width: 1280, height: 800 }, 'default', 2], [112, { width: 1920, height: 1080 }, 'floor', 4]]) {
    it(`keeps V's layers inside ${budget} ms a frame on a ${size}x${size} stress city at the ${zoomMode} zoom in ${view.width}x${view.height}, every effect live`, () => {
      const world = stageEffects(stressWorld(size));
      const r = rigV90(world, view, zoomMode);
      if (zoomMode === 'floor') expect(r.zoom).toBeLessThan(0.6);
      expect(r.walkers.length).toBeGreaterThan(20);                                   // a real crowd, the band among it
      const ms = measuredWell(() => r.js(), (v) => v <= budget);
      expect([size, zoomMode, ms <= budget ? 'ok' : Math.round(ms * 100) / 100]).toEqual([size, zoomMode, 'ok']);
      const px = measuredWell(() => r.raster(), (v) => v < RASTER_CAP_MS);
      expect([size, zoomMode, 'flushed', px < RASTER_CAP_MS ? 'ok' : Math.round(px * 10) / 10]).toEqual([size, zoomMode, 'flushed', 'ok']);
    });
  }
});
