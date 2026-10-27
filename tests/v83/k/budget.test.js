// Version 8.3 Track K (ruling 1417): the Supply lines layer fits the 6.0 frame budget at the Huge map's zoom floor, as the other layers do (tests/v70/s/budget.test.js:
// 2 ms a frame for a layer's own drawing in headless 1920x1080). The stress city at Huge (112) with every store keeping a good stocked (half from a chosen store,
// a third of them dry), lines of every width; its own cost per frame, the dashes moving (Full) and standing (Still), and with the canvas flushed against a looser cap.
import { describe, it, expect } from '../../harness.js';
import { stressWorld } from '../../v60/b2/measure.js';
import { createCamera, visibleTileRange, artToScreen, zoomFloor } from '../../../src/render/camera.js';
import { viewCull } from '../../../src/render/renderer.js';
import { makeDraw } from '../../../src/render/art/ctx.js';
import { ART_SCALE } from '../../../src/render/iso.js';
import { makeCanvas } from '../../helpers/canvas.js';
import { drawSupplyLines, linesFor } from '../../../src/render/layers.js';
import { storesOf } from '../../../src/sim/carts.js';
import { BUILDINGS } from '../../../src/data/buildings.js';

const BUDGET_MS = 2, RASTER_CAP_MS = 14;
const VIEW = { width: 1920, height: 1080 };
const median = (a) => [...a].sort((x, y) => x - y)[a.length >> 1];

function ordered(size) {
  const world = stressWorld(size);
  const stores = storesOf(world).sort((p, q) => p.id - q.id);
  // every store holds 200 of its first good and keeps 100 of it stocked (so each can spare 100); every other one draws on a chosen store of its kind; the
  // first store's own source holds only its order's 100, so that line is dry
  stores.forEach((b, i) => {
    const good = BUILDINGS[b.type].stores[0];
    const from = stores.find((o, j) => j !== i && o.type === b.type);
    b.store[good] = 200;
    b.orders = { [good]: { fetch: 100, lastMonth: (i * 37) % 240, ...((i % 2 || i === 0) && from ? { from: from.id } : {}) } };
  });
  const [good0, o0] = Object.entries(stores[0].orders)[0];
  if (Number.isInteger(o0.from)) world.buildings[o0.from].store[good0] = 100;
  return world;
}

describe('v83 k budget: the Supply lines layer', () => {
  it(`draws inside ${BUDGET_MS} ms a frame on the Huge stress city at its zoom floor in 1920x1080, moving and still`, () => {
    const world = ordered(112);
    const lines = linesFor(world);
    expect(lines.length).toBeGreaterThan(4);
    expect(lines.some((l) => l.stuck) && lines.some((l) => !l.stuck && l.pts)).toBe(true);
    const cam = createCamera({ x: world.size / 2, y: world.size / 2, zoom: 1, size: world.size });
    cam.zoom = zoomFloor(cam, VIEW);
    expect(cam.zoom).toBeLessThan(0.6);
    const canvas = makeCanvas(VIEW.width, VIEW.height), ctx = canvas.getContext('2d');
    const range = visibleTileRange(cam, VIEW, world.size);
    const [ox, oy] = artToScreen(cam, VIEW, 0, 0);
    const g = makeDraw(ctx, ART_SCALE * cam.zoom, ART_SCALE * cam.zoom);
    g.cull = viewCull(cam, VIEW);
    const flush = () => ctx.getImageData(0, 0, 1, 1);
    const one = (t, still) => { ctx.setTransform(1, 0, 0, 1, ox, oy); drawSupplyLines(g, world, range, t, still); };
    const js = (still) => {
      for (let i = 0; i < 6; i++) one(i * 16, still);
      flush();
      const times = [];
      for (let i = 0; i < 40; i++) { const t = performance.now(); one(i * 16, still); times.push(performance.now() - t); if (i % 8 === 7) flush(); }
      flush();
      return median(times);
    };
    const raster = () => { const times = []; for (let i = 0; i < 12; i++) { const t = performance.now(); one(i * 16, false); flush(); times.push(performance.now() - t); } return median(times); };
    const well = (measure, ok) => { let m = measure(); for (let i = 1; i < 3 && !ok(m); i++) m = measure(); return m; };
    for (const still of [false, true]) {
      const ms = well(() => js(still), (v) => v < BUDGET_MS);
      expect([still, ms < BUDGET_MS ? 'ok' : Math.round(ms * 100) / 100]).toEqual([still, 'ok']);
    }
    const px = well(raster, (v) => v < RASTER_CAP_MS);
    expect(px < RASTER_CAP_MS ? 'ok' : Math.round(px * 10) / 10).toBe('ok');
  });
});
