// Version 10.0 (Track F, ruling 2110): every write to the camera holds the map in view (holdInMap), not only a zoom.
import { describe, it, expect } from '../../harness.js';
import { createCamera, holdInMap } from '../../../src/render/camera.js';
import { createCameraControl, fitCamera } from '../../../src/ui/cameraControl.js';
import { createWorld } from '../../../src/sim/world.js';
import { drawRoad } from '../../../src/sim/commands.js';
import { createSaveStore } from '../../../src/save/store.js';
import { packSave } from '../../../src/save/serialize.js';
import { fakeIndexedDB } from '../../helpers/fakeStorage.js';
import { fire } from '../../helpers/dom.js';
import { bootAt } from './helpers.js';

const view = { width: 390, height: 844 };
const rig = (x, y, zoom = 1) => {
  const cam = createCamera({ x, y, zoom, size: 64 });
  let t = 0;
  const control = createCameraControl({ cam, view: () => view, reducedMotion: () => false, motionLevel: () => 'full', now: () => t });
  return { cam, control, at: (v) => { t = v; } };
};
const heldCopy = (cam) => holdInMap({ ...cam }, view);
const isHeld = (cam) => { const h = heldCopy(cam); return h.x === cam.x && h.y === cam.y; };

describe('v100 f camera writes: every one holds', () => {
  it('jumpTo holds', () => {
    const { cam, control } = rig(32, 32);
    control.jumpTo(0, 0);
    expect(isHeld(cam)).toBe(true);
    expect(cam.x).toBeGreaterThan(0);
  });
  it('a tween ends held, and every step on the way is held', () => {
    const { cam, control, at } = rig(32, 32);
    at(0);
    control.panTo(0, 0, 400);
    for (const t of [100, 250, 399, 400, 500]) { at(t); control.tick(t); expect(isHeld(cam)).toBe(true); }
    expect(cam.x).toBeGreaterThan(0);
  });
  it('a zoom step ends held', () => {
    const { cam, control, at } = rig(30, 62, 0.5);
    at(0);
    control.zoomStep(2, 195, 422, 300);
    for (const t of [100, 300, 400]) { at(t); control.tick(t); expect(isHeld(cam)).toBe(true); }
  });
  it('a fling holds at every step', () => {
    const { cam, control, at } = rig(20, 20);
    at(0);
    expect(control.fling(4000, 4000)).toBe(true);
    for (let t = 16; t < 4000; t += 16) { at(t); control.tick(t); expect(isHeld(cam)).toBe(true); }
    expect(cam.x).toBeGreaterThan(0);   // it ran into the edge and was held there, not carried to 0
  });
  it('fitCamera gives a held camera when it knows the map', () => {
    const bounds = { x0: 0, y0: 0, x1: 3, y1: 3 };
    const fit = fitCamera(view, bounds, { size: 64 });
    expect(isHeld({ ...fit, mapSize: 64 })).toBe(true);
    expect(fit.x).toBeGreaterThan(2);
    const free = fitCamera(view, bounds);   // without a size it is the pure fit, as before
    expect(free.x).toBeLessThan(fit.x);
  });
  it('a loaded save whose focus lies at the corner opens held on a 64 map', async () => {
    const store = createSaveStore({ idb: fakeIndexedDB(), local: null });
    const w = createWorld({ seed: 4, size: 64 });
    drawRoad(w, w.focus.x - 3, w.focus.y, w.focus.x + 3, w.focus.y);
    w.focus = { x: 0, y: 0 };
    await store.save(packSave(w, { savedAt: 1760000000000 - 7200000, lastSpeed: 1 }));
    const r = await bootAt(390, 844, { store });
    fire(r.root.querySelector('#title .continue'), 'click');
    const g = r.api.game();
    expect(g.world.size).toBe(64);
    expect(isHeld(g.cam)).toBe(true);
    r.cleanup();
  });
});
