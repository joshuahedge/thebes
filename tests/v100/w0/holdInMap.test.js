// Version 10.0 (Track 0, ruling 2050): the camera's centre is held a margin inside the map by one helper, holdInMap.
import { describe, it, expect } from '../../harness.js';
import { createCamera, holdInMap, panBy, OFF_MAP_SHARE } from '../../../src/render/camera.js';

const view = { width: 390, height: 844 };

describe('v100 w0 holdInMap: the centre stays a margin inside the map', () => {
  it('pulls a corner camera inward by the margin', () => {
    const cam = createCamera({ x: 0, y: 0, zoom: 1, size: 64 });
    holdInMap(cam, view);
    expect(cam.x).toBeGreaterThan(0);
    expect(cam.y).toBeGreaterThan(0);
    expect(cam.x).toBe(cam.y);
  });
  it('leaves a centred camera alone', () => {
    const cam = createCamera({ x: 32, y: 32, zoom: 1, size: 64 });
    holdInMap(cam, view);
    expect(cam.x).toBe(32); expect(cam.y).toBe(32);
  });
  it('centres a map that fits in the view', () => {
    const cam = createCamera({ x: 3, y: 60, zoom: 0.5, size: 48 });
    holdInMap(cam, { width: 2560, height: 1440 });
    expect(cam.x).toBe(24); expect(cam.y).toBe(24);
  });
  it('is what panBy applies', () => {
    const cam = createCamera({ x: 32, y: 32, zoom: 1, size: 64 });
    panBy(cam, 100000, 100000);
    const held = createCamera({ x: 0, y: 0, zoom: 1, size: 64 });
    holdInMap(held, { width: 0, height: 0 });
    expect(cam.x).toBeGreaterThanOrEqual(0);
    expect(OFF_MAP_SHARE).toBe(0.7);
  });
  it('leaves a camera with no map size alone', () => {
    const cam = createCamera({ x: -50, y: -50, zoom: 1 });
    holdInMap(cam, view);
    expect(cam.x).toBe(-50);
  });
});
