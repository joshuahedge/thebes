// Stage 4, Track E: ambient life a notch more visible under Full (spec 5.6, rulings 219, 257): a third more glints and a
// third brighter, larger and longer-lived smoke (a working kiln always has a puff in the air), rare life every 45-90 s,
// the brickworks' kiln smoking while it works, all within the 2 ms budget.
import { describe, it, expect } from '../../harness.js';
import { createAmbient, drawAmbientLate, glintAt, riverRows, rareAt, smokeBase, SMOKE_FROM } from '../../../src/render/ambient.js';
import { AMBIENT } from '../../../src/data/ambient.js';
import { drawFires } from '../../../src/render/fire.js';
import { createRenderer } from '../../../src/render/renderer.js';
import { createCamera, visibleTileRange } from '../../../src/render/camera.js';
import { makeDraw } from '../../../src/render/art/ctx.js';
import { createWorld } from '../../../src/sim/world.js';
import { buildStressCity } from '../../../src/dev/sampleCity.js';
import { riverWorld } from '../../helpers/renderWorld.js';
import { addRaw, setRoad, staffAll } from '../../helpers/testWorld.js';
import { makeCanvas } from '../../helpers/canvas.js';

const ALL = { x0: 0, y0: 0, x1: 31, y1: 31 };
function late(a, w, now, range = ALL) {
  const g = makeDraw(makeCanvas(64, 64).getContext('2d'), 1);
  const calls = [];
  const radial = g.radial;
  g.radial = (...args) => { calls.push(args); return radial(...args); };
  a.draw(g, w, range, now);
  drawAmbientLate(g);
  return calls;
}
const full = () => createAmbient({ enabled: () => true, level: () => 'full' });

describe('s4 motion ambient a notch up', () => {
  it('has a third more glints, a third brighter, larger and longer-lived puffs and rare life every 45-90 s', () => {
    expect([AMBIENT.glintShare, AMBIENT.glintAlpha, AMBIENT.smokeLifePeriods, AMBIENT.smokeRadius, AMBIENT.smokeAlpha, AMBIENT.rareEveryMs])
      .toEqual([0.93, 1, 3, [2.2, 3.8], 0.5, [45000, 90000]]);
    expect([Math.abs(AMBIENT.glintShare / 0.7 - 4 / 3) < 0.01, AMBIENT.glintAlpha / 0.75]).toEqual([true, 4 / 3]);   // Stage 3: 0.7 and 0.75
    const w = riverWorld();
    for (const kind of AMBIENT.rareKinds) {
      const starts = [];
      let was = false;
      for (let t = 0; t < 30 * 60000; t += 250) { const a = rareAt(w, kind, t); if (a && !was) starts.push(t); was = Boolean(a); }
      const gaps = starts.slice(1).map((s, i) => s - starts[i]);
      expect([kind, starts.length >= 20, Math.min(...gaps) >= 45000 - 250, Math.max(...gaps) <= 90000 + 250]).toEqual([kind, true, true, true]);
    }
  });
  it('shows at least six glints in a 390x844 phone view of the river at any moment', () => {
    const w = riverWorld();
    const rows = riverRows(w, 0, 31);
    const cam = createCamera({ x: 5, y: 16, zoom: 1 });
    const r = visibleTileRange(cam, { width: 390, height: 844 }, w.size);
    let fewest = Infinity;
    for (let t = 0; t < 20000; t += 250) {
      let n = 0;
      for (let y = r.y0; y <= r.y1; y++) for (let x = r.x0; x <= r.x1; x++) {
        if (w.terrain[y * 32 + x] !== 3) continue;
        const gl = glintAt(w, x, y, t, rows);
        if (gl && gl.alpha >= 0.3) n++;                                            // a glint plainly visible
      }
      fewest = Math.min(fewest, n);
    }
    expect(fewest).toBeGreaterThanOrEqual(6);
  });
  it('keeps a puff in the air over a working kiln at every moment', () => {
    const w = riverWorld();
    setRoad(w, 26, 16, 26, 30);
    addRaw(w, 'potter', 27, 18);
    staffAll(w);
    const a = full();
    for (let t = 0; t < 12000; t += 50) {
      const alphas = late(a, w, t).map((c) => c[4]);
      expect([t, alphas.length, Math.max(...alphas) >= 0.2]).toEqual([t, AMBIENT.smokeLifePeriods, true]);
    }
  });
  it('smokes from the brickworks\' kiln while it works, and not while it is idle, blocked or unstaffed', () => {
    const w = riverWorld();
    setRoad(w, 26, 16, 26, 30);
    const kiln = addRaw(w, 'brickworks', 27, 18);
    staffAll(w);
    expect(SMOKE_FROM.brickworks).toEqual([1.56, 0.46, 14]);
    const base = smokeBase(w, kiln);
    expect(Array.isArray(base)).toBe(true);
    const puffs = () => late(full(), w, 1000);
    expect(puffs().length).toBe(AMBIENT.smokeLifePeriods);
    for (const c of puffs()) expect([Math.abs(c[0][0] - base[0]) < 3, c[0][1] < base[1]]).toEqual([true, true]);   // over the kiln's mouth, rising
    kiln.blocked = 'idle';                                                         // no monument site needs bricks (Track A): nobody at work
    kiln.staff = 0;
    expect([smokeBase(w, kiln), puffs().length]).toEqual([null, 0]);
    staffAll(w);
    kiln.blocked = 'no_input';                                                     // staffed, but no clay: the kiln is cold
    expect(puffs().length).toBe(0);
    kiln.blocked = null;
    expect(puffs().length).toBe(AMBIENT.smokeLifePeriods);
  });
  it('costs well under its budget on the stress city at laptop size, under Full and Gentle', () => {
    const world = buildStressCity(createWorld({ seed: 3 }));
    const renderer = createRenderer({ canvas: makeCanvas(1280, 800), dpr: 1, maxBakesPerFrame: Infinity });
    const cam = createCamera({ x: 32, y: 32, zoom: 0.75 });
    const view = { width: 1280, height: 800 };
    for (const level of ['full', 'gentle']) {
      const a = createAmbient({ enabled: () => true, level: () => level });
      const ms = [];
      for (let i = 0; i < 30; i++) {
        const t = 1000 + i * 16;
        renderer.renderFrame(world, cam, { view, ambient: (g, r) => a.draw(g, world, r, t), fire: (g, r) => drawFires(g, world, r, t) });
        if (i >= 10) ms.push(a.stats.ms);
      }
      ms.sort((x, y) => x - y);
      expect([level, ms[10] < AMBIENT.budgetMs * 2]).toEqual([level, true]);
    }
  });
});
