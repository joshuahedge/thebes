// Version 5.0 Task 8 (rulings 600-609), part A: the review minors carried from Tasks 6 and 7. A road badge's lift follows its home's tier; a brief second finger after a drag is
// not a two-finger tap; the terrain ring round the view is baked ahead when the frame is idle; the crowd rule has hysteresis; the checklist rows for a workshop by its store and
// a hunting lodge by the herd say what their Show me starts.
import { describe, it, expect } from '../../harness.js';
import { flush } from '../../helpers/dom.js';
import { rigUI } from '../../helpers/uiWorld.js';
import { makeTestWorld, addRaw } from '../../helpers/testWorld.js';
import { makeCanvas } from '../../helpers/canvas.js';
import { roadlessPlotBadges } from '../../../src/render/overlays.js';
import { ART } from '../../../src/render/art/registry.js';
import { createGestures } from '../../../src/ui/gestures.js';
import { drawMarkers, CROWD } from '../../../src/render/markers.js';
import { createRenderer, cullControl } from '../../../src/render/renderer.js';
import { createSpriteCache } from '../../../src/render/spriteCache.js';
import { createCamera } from '../../../src/render/camera.js';
import { createWorld } from '../../../src/sim/world.js';
import { buildStressCity } from '../../../src/dev/sampleCity.js';
import { DRAG_THRESHOLD_PX, TWO_TAP_MS } from '../../../src/data/ui.js';
import { nextStep } from '../../../src/sim/advice.js';
import { stepWords } from '../../../src/ui/nextStepText.js';
import { select } from '../../../src/ui/modes.js';
import { grandDistrict } from '../../../src/dev/v50/grand.js';

describe('v50 balance: a road badge\'s lift follows the home\'s tier', () => {
  it('lifts the badge over the sprite of the tier the home has now, though the memo keys on neither tier nor staff', () => {
    const w = makeTestWorld();
    const h = addRaw(w, 'house', 20, 20, { tier: 0 });
    const lift = (tier) => (ART[`house.t${tier}`] ? ART[`house.t${tier}`].height : 0) + 4 * (h.w + h.d) + 6;
    expect(roadlessPlotBadges(w, null)[0].lift).toBe(lift(0));
    h.tier = 3;                                                          // a tier change touches neither the roads nor the buildings' places
    expect(roadlessPlotBadges(w, null)[0].lift).toBe(lift(3));
    expect(lift(3) === lift(0)).toBe(false);                                   // the premise: the tiers' sprites differ in height
    h.tier = 1;
    expect(roadlessPlotBadges(w, { x0: 0, y0: 0, x1: 39, y1: 39 })[0].lift).toBe(lift(1));
  });
});

describe('v50 balance: a second finger after a drag is not a two-finger tap', () => {
  function g() {
    const log = []; let t = 0;
    const gs = createGestures({ onTap: () => log.push('tap'), onTwoFingerDoubleTap: () => log.push('two') }, { now: () => t });
    return { gs, log, at: (v) => { t = v; } };
  }
  it('is not one when the first finger had already dragged, however briefly the second touches', () => {
    const r = g();
    for (const t0 of [0, 300]) {
      r.at(t0); r.gs.pointerDown(1, 100, 100, 'touch');
      r.at(t0 + 20); r.gs.pointerMove(1, 100 + DRAG_THRESHOLD_PX + 20, 100);
      r.at(t0 + 60); r.gs.pointerDown(2, 200, 100, 'touch');
      r.at(t0 + 100); r.gs.pointerUp(2, 200, 100); r.gs.pointerUp(1, 130, 100);
    }
    expect(r.log).toEqual([]);
  });
  it('is not one when the first finger had been down longer than the tap window before the second came', () => {
    const r = g();
    for (const t0 of [0, 600]) {
      r.at(t0); r.gs.pointerDown(1, 100, 100, 'touch');
      r.at(t0 + TWO_TAP_MS + 100); r.gs.pointerDown(2, 160, 100, 'touch');
      r.at(t0 + TWO_TAP_MS + 140); r.gs.pointerUp(1, 100, 100); r.gs.pointerUp(2, 160, 100);
    }
    expect(r.log).toEqual([]);
  });
  it('still counts two quick, still fingers down together as a tap, the second finger a few ms behind the first', () => {
    const r = g();
    for (const t0 of [0, 200]) {
      r.at(t0); r.gs.pointerDown(1, 100, 100, 'touch');
      r.at(t0 + 30); r.gs.pointerDown(2, 160, 100, 'touch');
      r.at(t0 + 90); r.gs.pointerUp(1, 100, 100); r.gs.pointerUp(2, 160, 100);
    }
    expect(r.log).toEqual(['two']);
  });
});

describe('v50 balance: the crowd rule has hysteresis', () => {
  const plotsWorld = (n) => { const w = makeTestWorld({ size: 64, fertile: [] }); for (let i = 0; i < n; i++) addRaw(w, 'house', 4 + (i % 15), 4 + Math.floor(i / 15), { tier: 0 }); return w; };
  // Rows of 15 plots: with y1 = 2 + rows, `rows` rows (15 each) are in view.
  const drawn = (w, rows, cssScale = 2 * CROWD.zoom) => {
    let polys = 0;
    const g = { cull: null, cssScale, scale: cssScale, ctx: { setLineDash() {} }, poly() { polys++; }, polys() { polys++; } };
    drawMarkers(g, w, [], { x0: 0, y0: 0, x1: 63, y1: 2 + rows }, []);
    return polys;
  };
  it('hides the outlines above CROWD.plots and brings them back only at CROWD.show or fewer, a pan up and down the count not flipping them', () => {
    expect(CROWD.show).toBeLessThan(CROWD.plots);
    const w = plotsWorld(180);
    expect(drawn(w, 10)).toBe(3 * 150);                                  // 150 from the first frame: drawn
    expect(drawn(w, 11)).toBe(0);                                        // 165: hidden
    expect(drawn(w, 10)).toBe(0);                                        // back to 150: still hidden (it flipped here before)
    expect(drawn(w, 9)).toBe(0);                                         // 135: still hidden
    expect(drawn(w, 8)).toBe(3 * 120);                                   // 120 = CROWD.show: drawn again
    expect(drawn(w, 10)).toBe(3 * 150);                                  // and 150 does not hide it again
    expect(drawn(w, 11)).toBe(0);                                        // 165 does
    expect(drawn(w, 11, 2 * 1)).toBe(3 * 165);                           // nearer than CROWD.zoom: drawn whatever the count, and the memory is dropped
    expect(drawn(w, 9)).toBe(3 * 135);                                   // so 135 far out is drawn now
  });
});

describe('v50 balance: the terrain ring round the view is baked ahead when the frame is idle', () => {
  const V = { width: 390, height: 844 };
  const frames = (renderer, w, cam, n) => { let s; for (let i = 0; i < n; i++) s = renderer.renderFrame(w, cam, { view: V }); return s; };
  it('bakes ring chunks one a frame once nothing else needs baking, so a short pan finds every visible chunk ready, and stops when the ring is whole', () => {
    const w = buildStressCity(createWorld({ seed: 3, size: 64 }));
    const renderer = createRenderer({ canvas: makeCanvas(V.width, V.height), dpr: 1, spriteCache: createSpriteCache() });
    const cam = createCamera({ x: 20, y: 20, zoom: 1 });
    let sawPrebake = false, idleAt = -1;
    for (let i = 0; i < 80 && idleAt < 0; i++) {
      const s = renderer.renderFrame(w, cam, { view: V });
      if (s.prebakes > 0) { sawPrebake = true; expect(s.bakes).toBe(0); expect(s.prebakes).toBe(1); }   // only on a frame with nothing else to bake, one a frame
      if (s.bakes === 0 && s.prebakes === 0) idleAt = i;
    }
    expect(sawPrebake).toBe(true);
    expect(idleAt).toBeGreaterThan(0);
    const held = renderer.baker.size(w);
    expect(held).toBeLessThanOrEqual(renderer.baker.capacity);
    const settled = frames(renderer, w, cam, 5);
    expect([settled.bakes, settled.prebakes, renderer.baker.size(w)]).toEqual([0, 0, held]);   // whole: no new work a frame
    // A short pan (under a chunk) shows chunks the ring already baked: nothing bakes on the first frame.
    cam.x += 5; cam.y += 5;
    const moved = renderer.renderFrame(w, cam, { view: V });
    expect([moved.bakes, moved.stale]).toEqual([0, 0]);
  });
  it('is the old behaviour with the cull off: no pre-baking', () => {
    const w = buildStressCity(createWorld({ seed: 3, size: 64 }));
    cullControl.on = false;
    try {
      const renderer = createRenderer({ canvas: makeCanvas(V.width, V.height), dpr: 1, spriteCache: createSpriteCache() });
      const cam = createCamera({ x: 20, y: 20, zoom: 1 });
      expect(frames(renderer, w, cam, 12).prebakes).toBe(0);
    } finally { cullControl.on = true; }
  });
});

describe('v50 balance: a checklist row says what its Show me starts', () => {
  const rowOf = async (w, home, need) => {
    const r = await rigUI({ world: w });
    try {
      r.store.set(select(r.store.get(), home.id));
      await flush();
      const row = r.root.querySelector(`#sheet .checklist li[data-need="${need}"]`);
      return { said: row.querySelector('.fix .small').textContent, aria: row.querySelector('.show-me').getAttribute('aria-label') };
    } finally { r.cleanup(); }
  };
  const asStep = (w, home) => { const rest = stepWords(w, home, nextStep(w, home)).rest; return rest.charAt(0).toUpperCase() + rest.slice(1); };
  it('names the hunting lodge by the nearest herd, the price, and what it gives, as the next step does', async () => {
    const { world: w, home } = grandDistrict('food');
    const step = nextStep(w, home);
    expect([step.need, step.fix.item, step.fix.herd]).toEqual(['threeFoods', 'hunting_lodge', true]);
    const row = await rowOf(w, home, 'threeFoods');
    expect(row.said).toBe(asStep(w, home));
    expect(row.said).toContain('hunting lodge');
    expect(row.aria).toBe(`Show me: ${row.said}`);
  });
  it('names the workshop by the store holding its input, and its price, as the next step does', async () => {
    const { world: w, home } = grandDistrict('street');
    for (const b of Object.values(w.buildings)) if (b.store) delete b.store.linen;
    delete home.stock.linen;
    addRaw(w, 'farm_flax', 1, 14);
    addRaw(w, 'storehouse', 8, 13, { store: { flax: 60 } });
    const step = nextStep(w, home);
    expect([step.need, step.fix.item]).toEqual(['linen', 'weaver']);
    const row = await rowOf(w, home, 'linen');
    expect(row.said).toBe(asStep(w, home));
    expect(row.said).toContain('weaver');
    expect(/[0-9]+ gold/.test(row.said)).toBe(true);
    expect(row.aria).toBe(`Show me: ${row.said}`);
  });
});
