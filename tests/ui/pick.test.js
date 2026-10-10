import { describe, it, expect } from '../harness.js';
import { tileAt, pickBuilding } from '../../src/ui/pick.js';
import { createCamera, tileToScreen, MIN_ZOOM } from '../../src/render/camera.js';
import { makeTestWorld, setRoad, addRaw } from '../helpers/testWorld.js';

const view = { width: 800, height: 600 };

describe('ui pick', () => {
  it('finds the tile under a point and nothing off the map', () => {
    const cam = createCamera({ x: 16, y: 16, zoom: 1 });
    const [sx, sy] = tileToScreen(cam, view, 10.5, 12.5);
    expect(tileAt(cam, view, 32, sx, sy)).toEqual({ x: 10, y: 12 });
    const [ox, oy] = tileToScreen(cam, view, -3, 5);
    expect(tileAt(cam, view, 32, ox, oy)).toBe(null);
  });
  it('picks the building under the tile, or the tall one whose height covers the point', () => {
    const w = makeTestWorld();
    setRoad(w, 0, 10, 31, 10);
    const well = addRaw(w, 'well', 5, 11);
    const temple = addRaw(w, 'temple', 12, 11);
    const cam = createCamera({ x: 12, y: 12, zoom: 1 });
    const [wx, wy] = tileToScreen(cam, view, 5.5, 11.5);
    expect(pickBuilding(w, cam, view, wx, wy)).toBe(well);
    // a point one tile up the diagonal from the temple's footprint lands on its drawn height
    const [tx, ty] = tileToScreen(cam, view, 11.5, 10.5);
    expect(pickBuilding(w, cam, view, tx, ty)).toBe(temple);
    // two tiles up: still the temple (40 art px tall), but not for a 1x1 well (18 px)
    const [tx2, ty2] = tileToScreen(cam, view, 10.5, 9.5);
    expect(pickBuilding(w, cam, view, tx2, ty2)).toBe(temple);
    const [wx2, wy2] = tileToScreen(cam, view, 3.5, 9.5);
    expect(pickBuilding(w, cam, view, wx2, wy2)).toBe(null);
  });
  it('snaps a tap between buildings to the nearest centre, and always at minimum zoom', () => {
    const w = makeTestWorld();
    setRoad(w, 0, 10, 31, 10);
    const a = addRaw(w, 'well', 5, 12);
    const b = addRaw(w, 'well', 8, 12);
    const cam = createCamera({ x: 6, y: 12, zoom: 1 });
    const [nx, ny] = tileToScreen(cam, view, 6.6, 12.5);
    expect(pickBuilding(w, cam, view, nx, ny)).toBe(a);
    const [fx, fy] = tileToScreen(cam, view, 6.6, 20.5);
    expect(pickBuilding(w, cam, view, fx, fy)).toBe(null);
    const far = createCamera({ x: 6, y: 12, zoom: MIN_ZOOM });
    const [mx, my] = tileToScreen(far, view, 7.4, 20.5);
    expect(pickBuilding(w, far, view, mx, my)).toBe(b);
  });
});
