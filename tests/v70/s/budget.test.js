// Version 7.0 Track S (rulings 930-959, 934): lighting and season grading add at most 2 ms a frame at the Huge map's zoom floor in headless 1920x1080, as
// 6.0's battle layers did (tests/v60/b2/budget.test.js). The cost is the two layers' own time for a frame (drawSeasonGround and drawLight, with the canvas
// calls they make) on the stress city (every lot built) at Huge (112) and Large (80), at the view's zoom floor and at the default zoom, by day, at dusk, at
// night with every lamp lit and in the middle of a season's turn. A canvas queues its drawing, so each is also measured with the queue flushed (the
// pixels really drawn, in this software canvas: headless Edge runs --disable-gpu), against a looser cap that catches a gross regression.
import { describe, it, expect } from '../../harness.js';
import { stressWorld } from '../../v60/b2/measure.js';
import { createCamera, visibleTileRange, artToScreen, zoomFloor } from '../../../src/render/camera.js';
import { viewCull } from '../../../src/render/renderer.js';
import { makeDraw } from '../../../src/render/art/ctx.js';
import { ART_SCALE } from '../../../src/render/iso.js';
import { makeCanvas } from '../../helpers/canvas.js';
import { drawLight, setLightClock } from '../../../src/render/light.js';
import { drawSeasonGround } from '../../../src/render/seasons.js';
import { LIGHT } from '../../../src/data/seasons.js';
import { SEASONS } from '../../../src/data/tips.js';
import { DAYS_PER_MONTH, MONTHS_PER_YEAR } from '../../../src/sim/time.js';
import { DEFAULT_SETTINGS } from '../../../src/ui/settings.js';

const BUDGET_MS = 2;            // the layers' budget (plan, Track S)
const RASTER_CAP_MS = 14;       // the same layers with the canvas flushed, in a software canvas: a gross-regression cap, not the budget
const VIEW = { width: 1920, height: 1080 };

const median = (a) => [...a].sort((x, y) => x - y)[a.length >> 1];
const clockAt = (share) => share * LIGHT.cycleMs;
const MOMENTS = {
  day: clockAt(0.25), dusk: clockAt(LIGHT.day + LIGHT.dusk * 0.6), night: clockAt(LIGHT.day + LIGHT.dusk + LIGHT.night / 2), dawn: clockAt(LIGHT.day + LIGHT.dusk + LIGHT.night + LIGHT.dawn * 0.5),
};

// A rig for one city at one zoom: the layers' own cost per frame, in ms, with and without the queue flushed.
function rig(world, zoomMode) {
  const cam = createCamera({ x: world.size / 2, y: world.size / 2, zoom: 1, size: world.size });
  cam.zoom = zoomMode === 'floor' ? zoomFloor(cam, VIEW) : 1;
  const canvas = makeCanvas(VIEW.width, VIEW.height), ctx = canvas.getContext('2d');
  const range = visibleTileRange(cam, VIEW, world.size);
  const [ox, oy] = artToScreen(cam, VIEW, 0, 0);
  const g = makeDraw(ctx, ART_SCALE * cam.zoom, ART_SCALE * cam.zoom);
  g.cull = viewCull(cam, VIEW);
  const frame = { ctx, W: VIEW.width, H: VIEW.height, ox, oy, dpr: 1 };
  world.speed = 0;
  const one = (moment, motion) => {
    ctx.setTransform(1, 0, 0, 1, ox, oy);
    setLightClock(world, MOMENTS[moment], 0);
    drawSeasonGround(g, world, range, 0, motion);
    drawLight(g, world, range, frame, 0, motion, DEFAULT_SETTINGS);
  };
  const flush = () => ctx.getImageData(0, 0, 1, 1);
  return {
    zoom: cam.zoom,
    js(moment, motion, n = 40) {
      for (let i = 0; i < 6; i++) one(moment, motion);
      flush();
      const times = [];
      for (let i = 0; i < n; i++) { const t = performance.now(); one(moment, motion); times.push(performance.now() - t); if (i % 8 === 7) flush(); }
      flush();
      return median(times);
    },
    raster(moment, motion, n = 16) {
      for (let i = 0; i < 3; i++) { one(moment, motion); flush(); }
      const times = [];
      for (let i = 0; i < n; i++) { const t = performance.now(); one(moment, motion); flush(); times.push(performance.now() - t); }
      return median(times);
    },
  };
}

// These are wall-clock limits, which a machine under load can break without the code being any slower: a measurement over its limit is taken again, up to
// three times, and counts only if every one was over (a real slowdown is over every time).
function measuredWell(measure, ok, tries = 3) {
  let m = measure();
  for (let i = 1; i < tries && !ok(m); i++) m = measure();
  return m;
}

describe('v70 s budget', () => {
  for (const size of [112, 80]) {
    for (const zoomMode of ['floor', 'default']) {
      it(`keeps the season grade and the light inside ${BUDGET_MS} ms a frame on a ${size}x${size} stress city at the ${zoomMode} zoom in 1920x1080, in every light and across a season's turn`, () => {
        const world = stressWorld(size);
        const r = rig(world, zoomMode);
        if (zoomMode === 'floor' && size === 112) expect(r.zoom).toBeLessThan(0.6);                  // the Huge floor itself: the frame cap's zoom, not the default
        const turn = SEASONS.findIndex((_, m) => SEASONS[(m + 1) % MONTHS_PER_YEAR] !== SEASONS[m]);
        for (const day of [3 * DAYS_PER_MONTH + 4, turn * DAYS_PER_MONTH + 15]) {                    // mid-season, then half way through a turn
          world.day = day;
          for (const moment of Object.keys(MOMENTS)) {
            for (const motion of ['gentle', 'full']) {
              const ms = measuredWell(() => r.js(moment, motion), (v) => v < BUDGET_MS);
              expect([size, zoomMode, day, moment, motion, ms < BUDGET_MS ? 'ok' : Math.round(ms * 100) / 100]).toEqual([size, zoomMode, day, moment, motion, 'ok']);
            }
            const px = measuredWell(() => r.raster(moment, 'gentle'), (v) => v < RASTER_CAP_MS);
            expect([size, zoomMode, day, moment, 'flushed', px < RASTER_CAP_MS ? 'ok' : Math.round(px * 10) / 10]).toEqual([size, zoomMode, day, moment, 'flushed', 'ok']);
          }
        }
      });
    }
  }
});
