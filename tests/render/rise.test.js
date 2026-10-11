import { describe, it, expect } from '../harness.js';
import { createEffects, EFFECT_MS } from '../../src/render/effects.js';
import { hauler, fig } from '../../src/render/art/figures.js';
import { ART } from '../../src/render/art/registry.js';
import { makeDraw } from '../../src/render/art/ctx.js';
import { createRenderer } from '../../src/render/renderer.js';
import { createCamera } from '../../src/render/camera.js';
import { createPlacement } from '../../src/ui/placement.js';
import { createStore, INITIAL_UI_STATE } from '../../src/ui/store.js';
import { T } from '../../src/sim/terrain.js';
import { makeTestWorld, setRoad, addRaw } from '../helpers/testWorld.js';
import { rigUI } from '../helpers/uiWorld.js';
import { makeCanvas, pixelAt, canvasHash } from '../helpers/canvas.js';

const inked = (c) => {
  let n = 0;
  for (let x = 0; x < c.width; x += 2) for (let y = 0; y < c.height; y += 2) if (pixelAt(c, x, y)[3] > 0) n++;
  return n;
};

function scene() {
  const c = makeCanvas(200, 200);
  const ctx = c.getContext('2d');
  ctx.translate(100, 60);
  return { c, g: makeDraw(ctx, 2) };
}

// A temple at (15, 15) on rocky ground (which grows no trees), framed by a 240 x 240 view at zoom 1 and drawn
// with no terrain and no ground shadow, so every pixel that is not the plain fill belongs to the temple
// sprite. Its art origin p(15, 15) lands at screen (120, 88) and its sprite (bounds [-40, -48, 40, 40]) spans
// y -8 to 168, so a rise of t cuts it at y = -8 + 176 * (1 - t): 124 at a quarter, 80 at a half.
// Returns the topmost temple row and the number of temple pixels (sampled every 2 px).
function templeInk(t) {
  const w = makeTestWorld({ size: 32, fertile: [] });
  w.terrain.fill(T.ROCKY);
  const temple = addRaw(w, 'temple', 15, 15);
  const canvas = makeCanvas(240, 240);
  const renderer = createRenderer({
    canvas, dpr: 1,
    baker: { peek: () => ({ sprite: null, fresh: false }), get: () => null },
    registry: { temple: { ...ART.temple, shadows: [] } },
  });
  const rising = t === null ? undefined : new Map([[temple.id, t]]);
  renderer.renderFrame(w, createCamera({ x: 16, y: 16, zoom: 1 }), { view: { width: 240, height: 240 }, rising });
  const d = canvas.getContext('2d').getImageData(0, 0, 240, 240).data;
  const bg = [d[0], d[1], d[2]];
  let top = Infinity, count = 0;
  for (let y = 0; y < 240; y += 2) {
    for (let x = 0; x < 240; x += 2) {
      const k = (y * 240 + x) * 4;
      if (Math.abs(d[k] - bg[0]) + Math.abs(d[k + 1] - bg[1]) + Math.abs(d[k + 2] - bg[2]) <= 12) continue;
      top = Math.min(top, y);
      count++;
    }
  }
  return { top, count };
}

describe('rise', () => {
  it('raises a building over 900 ms and then forgets it', () => {
    expect(EFFECT_MS.rise).toBe(900);
    const fx = createEffects({ reducedMotion: () => false });
    fx.rise(7, 3, 4, 2, 2, 1000);
    const a = fx.risingIds(1000).get(7), b = fx.risingIds(1300).get(7), c = fx.risingIds(1800).get(7);
    expect(a).toBe(0);
    expect(b).toBeGreaterThan(a);
    expect(c).toBeGreaterThan(b);
    expect(c).toBeLessThan(1);
    expect(fx.count(1899)).toBe(1);
    expect(fx.risingIds(1900).has(7)).toBe(false);
    expect(fx.count(1901)).toBe(0);
  });
  it('raises nothing under reduced motion', () => {
    const fx = createEffects({ reducedMotion: () => true });
    fx.rise(7, 3, 4, 2, 2, 1000);
    expect(fx.risingIds(1000).size).toBe(0);
    expect(fx.count(1000)).toBe(0);
  });
  it('draws two haulers and dust while a building rises', () => {
    const fx = createEffects({ reducedMotion: () => false });
    fx.rise(1, 0, 0, 2, 2, 0);
    const { c, g } = scene();
    fx.draw(g, 300);
    expect(inked(c)).toBeGreaterThan(60);
    const { c: c2, g: g2 } = scene();
    fx.draw(g2, 950);                                   // over: nothing left to draw
    expect(inked(c2)).toBe(0);
  });
  it('draws a hauler with a brick on its head that bobs as it steps', () => {
    expect(typeof ART['fig.hauler'].draw).toBe('function');
    const draw = (fn) => { const c = makeCanvas(120, 120); const ctx = c.getContext('2d'); ctx.translate(60, 90); fn(makeDraw(ctx, 2)); return c; };
    const still = draw((g) => hauler(g, 0, 0, 0));
    expect(pixelAt(still, 60, 90 - 30)[3]).toBeGreaterThan(0);          // the brick, 15 art px up
    expect(canvasHash(still)).toBe(canvasHash(draw((g) => fig(g, 0, 0, 'hauler'))));
    expect(canvasHash(draw((g) => hauler(g, 0, 0, 0.5))) === canvasHash(still)).toBe(false);
    expect(canvasHash(still) === canvasHash(draw((g) => fig(g, 0, 0, 'porter')))).toBe(false);
  });
  it('reveals a rising building from the bottom up', () => {
    const full = templeInk(null), half = templeInk(0.5), quarter = templeInk(0.25), none = templeInk(0);
    expect(full.count).toBeGreaterThan(400);
    expect(half.top).toBeGreaterThanOrEqual(78);       // nothing above the cut at y 80
    expect(half.top).toBeGreaterThan(full.top + 10);   // the flags and pylon tops are still underground
    expect(quarter.top).toBeGreaterThanOrEqual(122);   // the cut at y 124
    expect(quarter.count).toBeLessThan(half.count);
    expect(half.count).toBeLessThan(full.count);
    expect(none.count).toBe(0);
  });
  it('raises a placed building but not roads or plots', () => {
    const world = makeTestWorld({ gold: 1000 });
    setRoad(world, 0, 10, 31, 10);
    const store = createStore(INITIAL_UI_STATE);
    const calls = [];
    const pl = createPlacement({ world, store, effects: { puff() {}, rise: (...a) => calls.push(a) }, now: () => 42 });
    pl.start({ kind: 'building', type: 'well' });
    pl.moveGhost(14, 9);
    const r = pl.confirm();
    expect(r.ok).toBe(true);
    expect(calls).toEqual([[r.id, 14, 9, 1, 1, 42]]);
    pl.start({ kind: 'road' });
    pl.pointAt(3, 12);
    pl.pointAt(6, 12);
    expect(pl.confirm().ok).toBe(true);
    pl.start({ kind: 'houses' });
    pl.pointAt(20, 11);
    pl.pointAt(21, 11);
    expect(pl.confirm().ok).toBe(true);
    expect(calls.length).toBe(1);
  });
  it('drops a rise, haulers and all, once its building is gone', () => {
    const world = makeTestWorld();
    const well = addRaw(world, 'well', 3, 4);
    const fx = createEffects({ reducedMotion: () => false });
    fx.rise(well.id, 3, 4, 1, 1, 0);
    expect(fx.risingIds(300, world).has(well.id)).toBe(true);
    const { c, g } = scene();
    fx.draw(g, 300, world);
    expect(inked(c)).toBeGreaterThan(30);
    delete world.buildings[well.id];                     // as an Undo inside the 900 ms would leave it
    expect(fx.risingIds(400, world).has(well.id)).toBe(false);
    const { c: c2, g: g2 } = scene();
    fx.draw(g2, 400, world);
    expect(inked(c2)).toBe(0);                           // no work gang at an empty site
    expect(fx.count(400)).toBe(0);
  });
  it('in the game, Undo inside the rise leaves no work gang behind', async () => {
    const r = await rigUI();
    try {
      r.ui.settings.set({ reducedMotion: 'off' });
      const seen = [];
      const real = r.renderer.renderFrame;
      r.renderer.renderFrame = (w, cam, opts) => { seen.push(opts.rising); return real(w, cam, opts); };
      r.ui.placement.start({ kind: 'building', type: 'well' });
      r.ui.placement.moveGhost(16, 9);
      const res = r.ui.placement.confirm();
      expect(res.ok).toBe(true);
      r.frame(100);
      expect(seen[seen.length - 1].has(res.id)).toBe(true);
      r.ui.placement.undo();
      expect(r.world.buildings[res.id]).toBe(undefined);
      r.frame(200);                                       // still inside the 900 ms
      expect(seen[seen.length - 1].has(res.id)).toBe(false);
      expect(r.ui.effects.active(200).some((e) => e.kind === 'rise')).toBe(false);
    } finally {
      r.cleanup();
    }
  });
  it('hands the rising buildings to the renderer each frame', async () => {
    const r = await rigUI();
    try {
      r.ui.settings.set({ reducedMotion: 'off' });
      const seen = [];
      const real = r.renderer.renderFrame;
      r.renderer.renderFrame = (w, cam, opts) => { seen.push(opts.rising); return real(w, cam, opts); };
      r.ui.placement.start({ kind: 'building', type: 'well' });
      r.ui.placement.moveGhost(16, 9);
      const res = r.ui.placement.confirm();
      expect(res.ok).toBe(true);
      r.frame(300);                                       // the rig's clock put the rise at 0
      const t = seen[seen.length - 1].get(res.id);
      expect(t).toBeGreaterThan(0.3);
      expect(t).toBeLessThan(0.4);
      r.frame(1000);
      expect(seen[seen.length - 1].has(res.id)).toBe(false);
    } finally {
      r.cleanup();
    }
  });
});
