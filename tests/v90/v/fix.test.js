// Version 9.0 Track V, the fix wave (rulings 1637-1639): the frame gate on 90 and 144 Hz screens is in effects.test.js; here, the two budgets count each
// layer once, a wake goes only with a drawn ferry, dust and sand gusts fade rather than pop, and V's effects have no Gentle or Still form.
import { describe, it, expect } from '../../harness.js';
import { makeCanvas } from '../../helpers/canvas.js';
import { makeTestWorld, addRaw, staffAll } from '../../helpers/testWorld.js';
import { riverWorld } from '../../helpers/renderWorld.js';
import { makeDraw } from '../../../src/render/art/ctx.js';
import { createAmbient, drawAmbientLate, FLOW } from '../../../src/render/ambient.js';
import { takeSpent, resetV90Dropper, spend } from '../../../src/render/v90/dropper.js';
import { drawDust, drawWeather, DUST, WEATHER } from '../../../src/render/v90/layers.js';
import { UNIT_ID_BASE } from '../../../src/render/units.js';
import { drawTradeGround } from '../../../src/render/trade.js';
import { ferryGround, ferryWalkers, FERRY_ID_BASE } from '../../../src/render/ferries.js';
import { noteFrameTime } from '../../../src/render/v90/clock.js';
import { cartOf, cartPath, cartDay, setFetch } from '../../../src/sim/carts.js';
import { hopCum } from '../../../src/render/ferryPace.js';
import { crossingTiles } from '../../../src/sim/ferries.js';
import { drawFerry } from '../../../src/sim/ferryLay.js';
import { ferryWorld, dragLine, settle, RIVER_X, ROW } from '../../v71/f/helpers.js';
import { SEASONS } from '../../../src/data/tips.js';
import { DAYS_PER_MONTH } from '../../../src/sim/time.js';
import { AMBIENT } from '../../../src/data/ambient.js';

const ALL = { x0: 0, y0: 0, x1: 31, y1: 31 };
// A draw object whose listed calls take a fake clock forward (and say so to V's budget, as the real layer does).
function spyDraw(onCall = {}) {
  const g = makeDraw(makeCanvas(64, 64).getContext('2d'), 1);
  const calls = [];
  for (const k of ['line', 'stroke', 'poly', 'polys', 'radial', 'path', 'circ', 'ell']) {
    const f = g[k];
    g[k] = (...a) => { calls.push({ k, a }); if (onCall[k]) onCall[k](...a); return f(...a); };
  }
  return { g, calls };
}
function frame(ambient, world, now, spy) {
  ambient.draw(spy.g, world, ALL, now);
  drawAmbientLate(spy.g);
}

describe('v90 v fix: the ambient and V budgets count each layer once (ruling 1638)', () => {
  it('leaves the river\'s flow out of ambient\'s budget and puts it in V\'s', () => {
    resetV90Dropper();
    const w = riverWorld();
    let t = 0, flowMs = 0;
    const spy = spyDraw({ stroke: (segs, colour) => { if (colour === FLOW.colour) { t += 3; flowMs += 3; spend(3); } } });
    const a = createAmbient({ enabled: () => true, clock: () => t });
    // the real drawFlow spends its time with performance.now(); the spy moves the fake clock and spends the same amount, as it would
    for (let now = 0; now < 8000; now += 100) frame(a, w, now, spy);
    expect(flowMs).toBeGreaterThan(0);
    expect(a.stats.dropped).toEqual([]);                                           // before the fix: flow's 3 ms a frame shed the rare life
    expect(takeSpent()).toBeGreaterThan(0);                                        // and V counted it
  });
  it('counts 9.0\'s workshop smoke in V\'s budget only, and the potter\'s in ambient\'s, each once', () => {
    resetV90Dropper();
    const w = makeTestWorld();
    addRaw(w, 'weaver', 12, 10);
    staffAll(w);
    let t = 0;
    const spy = spyDraw({ radial: () => { t += 1; } });
    const a = createAmbient({ enabled: () => true, clock: () => t });
    frame(a, w, 1000, spy);
    const weaverOnly = a.stats.ms, v = takeSpent();
    expect([weaverOnly, v > 0, v]).toEqual([0, true, t]);                          // all of the weaver's smoke time is V's, none ambient's
    addRaw(w, 'potter', 15, 10);
    staffAll(w);
    t = 0;
    frame(a, w, 2000, spyDraw({ radial: () => { t += 1; } }));
    const total = t, vShare = takeSpent();
    expect(vShare).toBeGreaterThan(0);
    expect(a.stats.ms + vShare).toBe(total);                                       // every ms is in exactly one of the two
    expect(a.stats.ms).toBeGreaterThan(0);
  });
  it('still sheds rare life, then smoke, then sway over ambient\'s own budget with a workshop smoking', () => {
    resetV90Dropper();
    const w = riverWorld();
    addRaw(w, 'weaver', 12, 10);
    addRaw(w, 'potter', 15, 10);
    staffAll(w);
    let t = 0, cost = 3;
    const spy = () => spyDraw({ radial: () => { t += cost; }, stroke: () => { t += cost; } });
    const a = createAmbient({ enabled: () => true, clock: () => t });
    let now = 0;
    const seen = [];
    for (let n = 0; n < 60000; n += 100) {
      now += 100;
      frame(a, w, now, spy());
      const d = a.stats.dropped.join();
      if (!seen.length || seen[seen.length - 1] !== d) seen.push(d);
    }
    cost = 0;
    expect(seen.slice(0, 4)).toEqual(['', 'rare', 'rare,smoke', 'rare,smoke,sway']);
    takeSpent();
  });
});

describe('v90 v fix: a wake goes only with a drawn boat (ruling 1639)', () => {
  it('draws no wake for a crossing while a cart rides it and the crossing\'s own boat is left out', () => {
    const w = ferryWorld(7);
    const west = addRaw(w, 'storehouse', 6, ROW + 1, { staff: 6, store: {} });
    addRaw(w, 'storehouse', RIVER_X + 10, ROW + 1, { staff: 6, store: { pottery: 80 } });
    const ids = drawFerry(w, dragLine(7)).ids;
    settle(w);
    const a = w.buildings[ids[0]];
    setFetch(w, west.id, 'pottery');
    cartDay(w);
    w.day += 1;
    const c = cartOf(w, west.id), path = cartPath(w, c), cum = hopCum(w, path, (t) => t), n = path.length;
    let at = -1;
    for (let i = 0; i < n - 1; i++) if (cum[i + 1] - cum[i] > 1) at = i;
    const cost = crossingTiles(7);
    let withBoat = 0, without = 0;
    for (let k = 0; k <= 40; k++) {
      const t = c.left + ((cum[at] + (cost * k) / 40) / cum[n - 1]) * (c.turn - c.left) + 1;
      w.day = Math.floor(t);
      noteFrameTime(w, t);
      const own = ferryWalkers(w, t, null, 'full').some((f) => f.id === FERRY_ID_BASE + a.id);
      const spy = spyDraw();
      ferryGround(spy.g, w, null);
      const wakes = spy.calls.filter((x) => x.k === 'stroke' && x.a[2] <= 0.8 && x.a[1] !== '#1E3A5F').length;
      if (!own) { without++; expect([k, wakes]).toEqual([k, 0]); } else withBoat++;
    }
    expect(without).toBeGreaterThan(0);                                            // the cart was on the water for part of the sweep
    expect(withBoat + without).toBe(41);
  });
});

describe('v90 v fix: dust and sand gusts fade (ruling 1639)', () => {
  it('fades a dust puff in over the start of its life as well as out over the rest', () => {
    const w = makeTestWorld();
    const raider = { id: UNIT_ID_BASE + 1, kind: 'raider', x: 20.5, y: 5.5, dir: 1 };
    const alphaAt = (ph) => {
      const spy = spyDraw();
      drawDust(spy.g, w, [raider], ALL, (ph * DUST.periodMs) - (raider.id % 97) * 0.37 * DUST.periodMs);   // puff 0 at age ph
      return spy.calls.filter((c) => c.k === 'circ').map((c) => c.a[3].alpha);
    };
    const start = alphaAt(0.01)[0], grown = alphaAt(DUST.fadeIn)[0], late = alphaAt(0.95)[0];
    expect(start).toBeLessThan(grown / 2);
    expect(late).toBeLessThan(grown / 2);
    expect(grown).toBeLessThanOrEqual(DUST.alpha);
  });
  it('fades the sand gusts in and out over their window, none at its edges', () => {
    const w = makeTestWorld();
    w.day = SEASONS.indexOf('shemu') * DAYS_PER_MONTH + 3;
    const alphas = [];
    for (const f of [0.002, 0.15, 0.5, 0.85, 0.998]) {
      let best = null;
      for (let win = 0; win < 20 && best === null; win++) {
        const spy = spyDraw();
        drawWeather(spy.g, w, ALL, (win + f) * WEATHER.gustMs);
        const s = spy.calls.find((c) => c.k === 'stroke');
        if (s) best = s.a[3];
      }
      alphas.push(best);
    }
    expect(alphas[0]).toBe(null);                                                   // too faint to draw at the very edge
    expect(alphas[4]).toBe(null);
    expect(alphas[1] < alphas[2] && alphas[3] < alphas[2]).toBe(true);
    expect(Math.abs(alphas[2] - 0.55) < 0.01).toBe(true);
  });
});

describe('v90 v fix: V\'s effects are Full only (ruling 1601)', () => {
  it('draws the river\'s flow whatever Motion level ambient is given, and the trade boats\' wake under motion still', () => {
    const w = riverWorld();
    const flow = (level) => {
      const spy = spyDraw();
      const a = createAmbient({ enabled: () => true, level: () => level });
      frame(a, w, 5000, spy);
      return spy.calls.filter((c) => c.k === 'stroke' && c.a[1] === FLOW.colour).length;
    };
    expect(flow('full')).toBeGreaterThan(0);
    expect(flow('gentle')).toBeGreaterThan(0);                                      // no Gentle branch of V's own: the flow is drawn
    const spy = spyDraw();
    drawTradeGround(spy.g, w, ALL, 0, 'still');                                      // no routes here: nothing to draw, and no early return for 'still' to hide behind
    expect(spy.calls.length).toBe(0);
    expect(AMBIENT.v90DropOrder.includes('flow')).toBe(true);
  });
});
