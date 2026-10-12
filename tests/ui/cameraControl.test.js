import { describe, it, expect } from '../harness.js';
import { createCamera, tileToScreen } from '../../src/render/camera.js';
import { createCameraControl } from '../../src/ui/cameraControl.js';

const view = () => ({ width: 800, height: 600 });
const close = (a, b, eps = 1e-6) => Math.abs(a - b) < eps;

describe('ui camera control', () => {
  it('tweens a pan with ease-out and lands exactly', () => {
    let t = 0;
    const cam = createCamera({ x: 10, y: 10, zoom: 1 });
    const ctl = createCameraControl({ cam, view, now: () => t });
    ctl.panTo(20, 10, 400);
    expect(ctl.animating).toBe(true);
    t = 200;
    expect(ctl.tick(t)).toBe(true);
    expect(cam.x > 15 && cam.x < 20).toBe(true);        // ease-out: more than halfway at half time
    t = 400;
    ctl.tick(t);
    expect(cam.x).toBe(20);
    expect(ctl.animating).toBe(false);
    expect(ctl.tick(500)).toBe(false);
  });
  it('jumps immediately under reduced motion and on jumpTo', () => {
    const cam = createCamera({ x: 0, y: 0, zoom: 1 });
    const ctl = createCameraControl({ cam, view, reducedMotion: () => true, now: () => 0 });
    ctl.panTo(5, 6);
    expect([cam.x, cam.y]).toEqual([5, 6]);
    expect(ctl.animating).toBe(false);
    const ctl2 = createCameraControl({ cam, view, now: () => 0 });
    ctl2.panTo(9, 9);
    ctl2.jumpTo(1, 1);
    expect([cam.x, cam.y]).toEqual([1, 1]);
    expect(ctl2.animating).toBe(false);
  });
  it('zooms towards a screen point and clamps', () => {
    let t = 0;
    const cam = createCamera({ x: 32, y: 32, zoom: 1 });
    const ctl = createCameraControl({ cam, view, now: () => t });
    ctl.zoomStep(1.25, 100, 100, 300);
    t = 300;
    ctl.tick(t);
    expect(close(cam.zoom, 1.25)).toBe(true);
    ctl.zoomTo(10, 100);
    t = 400;
    ctl.tick(t);
    expect(cam.zoom).toBe(2);
  });
  it('pans only as much as needed to keep a point visible above a sheet', () => {
    let t = 0;
    const cam = createCamera({ x: 32, y: 32, zoom: 1 });
    const ctl = createCameraControl({ cam, view, now: () => t });
    expect(ctl.keepVisible(32, 32, { top: 0, right: 0, bottom: 0, left: 0 })).toBe(false);
    expect(ctl.keepVisible(32, 32, { top: 0, right: 0, bottom: 300, left: 0 }, 48, 100)).toBe(true);
    t = 100;
    ctl.tick(t);
    const [sx, sy] = tileToScreen(cam, view(), 32, 32);
    expect(close(sx, 400, 0.01)).toBe(true);
    expect(close(sy, 252, 0.01)).toBe(true);
  });
  it('panToKeeping centres a place and nudges the least to keep a second point in the free map, tween or jump', () => {
    const insets = { top: 0, right: 0, bottom: 200, left: 0 };            // free map: y from 48 to 352 with the margin, x from 48 to 752
    for (const reduced of [true, false]) {
      let t = 0;
      const cam = createCamera({ x: 5, y: 5, zoom: 1 });
      const ctl = createCameraControl({ cam, view, reducedMotion: () => reduced, now: () => t });
      ctl.panToKeeping(32, 32, 33, 32, insets);                           // a point one tile away is already in the free map: plain centre
      if (!reduced) { t = 1000; ctl.tick(t); }
      expect(close(cam.x, 32, 1e-6) && close(cam.y, 32, 1e-6)).toBe(true);
      ctl.panToKeeping(32, 32, 32, 42, insets);                           // ten tiles down the y axis is below it: the nudge brings it in
      if (!reduced) { t = 2000; ctl.tick(t); }
      const [sx, sy] = tileToScreen(cam, view(), 32, 42);
      expect(close(sy, 352, 0.01)).toBe(true);
      expect(sx >= 48 && sx <= 752).toBe(true);
      const [tx, ty] = tileToScreen(cam, view(), 32, 32);                 // the place itself moved with it, by the same nudge
      expect(ty < 300 && ty >= 0 && close(tx - sx, 320, 0.01)).toBe(true);
    }
  });
  // A phone frames a place in the middle of the map the rows above and the sheet or bar below leave free, not in the
  // middle of the screen (ruling 168).
  it('frameKeeping puts a place in the middle of the free map and nudges the least to keep a second point there, tween or jump', () => {
    const insets = { top: 100, right: 0, bottom: 200, left: 0 };          // free map: y from 100 to 400 (middle 250), x from 0 to 800
    for (const reduced of [true, false]) {
      let t = 0;
      const cam = createCamera({ x: 5, y: 5, zoom: 1 });
      const ctl = createCameraControl({ cam, view, reducedMotion: () => reduced, now: () => t });
      ctl.frameKeeping(32, 32, 32, 32, insets);
      if (!reduced) { expect(ctl.animating).toBe(true); t = 1000; ctl.tick(t); }
      let [tx, ty] = tileToScreen(cam, view(), 32, 32);
      expect([close(tx, 400, 0.01), close(ty, 250, 0.01)]).toEqual([true, true]);
      ctl.frameKeeping(32, 32, 32, 42, insets);                           // ten tiles down the y axis lands 160 px lower, past the margin
      if (!reduced) { t = 2000; ctl.tick(t); }
      const [sx, sy] = tileToScreen(cam, view(), 32, 42);
      expect(close(sy, 600 - 200 - 48, 0.01)).toBe(true);                // brought just inside the free map
      [tx, ty] = tileToScreen(cam, view(), 32, 32);
      expect([close(tx - sx, 320, 0.01), close(ty, 250 - 58, 0.01)]).toEqual([true, true]);   // the place moved by the same nudge
    }
  });
});
