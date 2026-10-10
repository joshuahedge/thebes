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
});
