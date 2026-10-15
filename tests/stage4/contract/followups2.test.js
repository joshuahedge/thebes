import { describe, it, expect } from '../../harness.js';
import { dimsOf } from '../../../src/data/buildings.js';
import { rigUI } from '../../helpers/uiWorld.js';

// Task 0.5: the two createUI gaps Track C's plan raised (the ghost's grab box, and Show me's monument fit).
describe('s4 contract follow-ups 2: grabbing a monument\'s ghost', () => {
  it('grabs a turned 4x3 mastaba\'s ghost on its turned footprint, and by its body only through grabExtent, scaled with the zoom', async () => {
    const r = await rigUI({ width: 1280, height: 800 });
    try {
      r.ui.placement.start({ kind: 'building', type: 'mastaba_large' }, { x: 18, y: 3 });
      const s = r.store.get();
      r.store.set({ tool: { ...s.tool, rot: 1 } });                               // turned (Track C's rotate() sets tool.rot)
      const g = r.store.get().ghost;
      expect(dimsOf('mastaba_large', 1)).toEqual({ w: 3, d: 4, rot: 1 });
      const grab = (tx, ty, up = 0) => { const p = r.screenOf(tx, ty); return r.ui.actions.ghostDragStart({ x: p.x, y: p.y - up }); };
      expect(grab(g.x + 1.5, g.y + 2)).toBe(true);                                // the middle
      expect(grab(g.x + 1.5, g.y + 3.8)).toBe(true);                              // tile (x+1, y+3): inside the turned 3x4, past the unturned 4x3's slack
      expect(grab(g.x + 3.8, g.y + 1.5)).toBe(false);                             // tile (x+3, y+1): inside the unturned 4x3, outside the turned 3x4's slack
      expect(grab(g.x, g.y, 100)).toBe(false);                                    // the stub has no body to grab: 100 px above the footprint's top misses
      const asked = [];
      r.ui.monumentUi.grabExtent = (type, rot) => { asked.push([type, rot]); return { up: 120 }; };   // 120 art px: 240 CSS px at zoom 1
      expect([grab(g.x, g.y, 100), grab(g.x, g.y, 200), grab(g.x, g.y, 300)]).toEqual([true, true, false]);
      expect(asked[0]).toEqual(['mastaba_large', 1]);
      r.cam.zoom = 0.5;                                                           // 120 CSS px at the least zoom
      expect([grab(g.x, g.y, 100), grab(g.x, g.y, 200)]).toEqual([true, false]);
      expect([grab(g.x + 3.8, g.y + 1.5), grab(g.x + 1.5, g.y + 3.8)]).toEqual([false, true]);   // the body reaches up, never sideways
    } finally { r.cleanup(); }
  });
  it('never asks grabExtent for a building that is not a monument', async () => {
    const r = await rigUI({ width: 1280, height: 800 });
    try {
      let asked = 0;
      r.ui.monumentUi.grabExtent = () => { asked++; return { up: 400 }; };
      r.ui.placement.start({ kind: 'building', type: 'temple' }, { x: 18, y: 3 });
      const g = r.store.get().ghost;
      const p = r.screenOf(g.x, g.y);
      expect([r.ui.actions.ghostDragStart({ x: p.x, y: p.y - 100 }), asked]).toEqual([false, 0]);
    } finally { r.cleanup(); }
  });
});

describe('s4 contract follow-ups 2: Show me for a monument', () => {
  const standIn = (r, zoomOf) => {
    const asked = [];
    r.ui.monumentUi.pickFit = (type, ghost, insets) => { asked.push([type, typeof ghost.x, typeof insets.top]); return { zoom: zoomOf(), extent: { up: 300, down: 40 } }; };
    return asked;
  };
  it('asks pickFit when Show me lands a monument\'s ghost on a phone, and the camera ends at its zoom, never zooming in', async () => {
    const r = await rigUI({ width: 390, height: 844 });
    try {
      r.ui.settings.set({ motion: 'full' });                                      // a tweened move under Full
      let fitZoom = 0.6;
      const asked = standIn(r, () => fitZoom);
      const cc = r.ui.cameraControl, frame = cc.frameKeeping, framed = [];
      cc.frameKeeping = (...args) => { framed.push([args[7], args[8]]); return frame(...args); };
      r.ui.showMeAt({ category: 'monuments', item: 'pyramid_great', x: 20, y: 5 });
      expect(asked).toEqual([['pyramid_great', 'number', 'number']]);
      expect(framed).toEqual([[{ up: 300, down: 40 }, 0.6]]);                     // the fit's extent and zoom go to the camera
      expect([cc.animating, r.cam.zoom]).toEqual([true, 1]);
      cc.tick(1e12);
      expect(r.cam.zoom).toBe(0.6);
      fitZoom = 1.5;                                                              // a fit never zooms in (ruling 231)
      r.store.set({ tool: null });
      r.ui.showMeAt({ category: 'monuments', item: 'pyramid_great', x: 20, y: 5 });
      cc.tick(1e12);
      expect([asked.length, framed[1][1], r.cam.zoom]).toEqual([2, 0.6, 0.6]);
      r.store.set({ tool: null });
      r.ui.showMeAt({ category: 'homes', item: 'house', x: 14, y: 9 });           // not a monument: no fit asked
      expect([asked.length, framed[2]]).toEqual([2, [null, 0.75]]);               // Version 5.0 (Task 6): no fit, but Show me comes in to SHOW_ME_MIN_ZOOM from the 0.6 the last one left
    } finally { r.cleanup(); }
  });
  it('cuts to the fit at once under Gentle, and passes it to the wide screen\'s pan too', async () => {
    const r = await rigUI({ width: 1280, height: 800 });
    try {
      r.ui.settings.set({ motion: 'gentle' });
      const asked = standIn(r, () => 0.5);
      r.ui.showMeAt({ category: 'monuments', item: 'pyramid_great', x: 20, y: 5 });
      expect([asked.length, r.ui.cameraControl.animating]).toEqual([1, true]);
      r.ui.cameraControl.tick(1e12);
      expect([r.ui.cameraControl.animating, r.cam.zoom]).toEqual([false, 0.5]);
      r.ui.settings.set({ motion: 'still' });                                       // and a cut under Still
      r.cam.zoom = 1; r.store.set({ tool: null });
      r.ui.showMeAt({ category: 'monuments', item: 'pyramid_great', x: 20, y: 5 });
      expect([r.ui.cameraControl.animating, r.cam.zoom]).toEqual([false, 0.5]);
    } finally { r.cleanup(); }
  });
});
