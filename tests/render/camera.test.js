import { describe, it, expect } from '../harness.js';
import {
  createCamera, clampZoom, tileToScreen, screenToTile, screenToTileIndex, panBy, zoomAt,
  visibleTileRange, visibleChunks, MIN_ZOOM, MAX_ZOOM,
} from '../../src/render/camera.js';

const view = { width: 800, height: 600 };
const close = (a, b, eps = 1e-6) => Math.abs(a - b) < eps;

describe('camera', () => {
  it('clamps zoom to 0.5-2', () => {
    expect(clampZoom(0.1)).toBe(MIN_ZOOM);
    expect(clampZoom(9)).toBe(MAX_ZOOM);
    expect(createCamera({ zoom: 3 }).zoom).toBe(2);
  });
  it('puts the camera tile at the centre of the view', () => {
    const cam = createCamera({ x: 32, y: 32, zoom: 1 });
    expect(tileToScreen(cam, view, 32, 32)).toEqual([400, 300]);
    const [sx, sy] = tileToScreen(cam, view, 33, 32);
    expect(sx).toBe(432);
    expect(sy).toBe(316);
  });
  it('round-trips screen to tile and back at every zoom', () => {
    for (const zoom of [0.5, 1, 1.37, 2]) {
      const cam = createCamera({ x: 10.5, y: 20.25, zoom });
      for (const [sx, sy] of [[0, 0], [400, 300], [799, 599], [123, 456]]) {
        const t = screenToTile(cam, view, sx, sy);
        const [bx, by] = tileToScreen(cam, view, t.x, t.y);
        expect(close(bx, sx) && close(by, sy)).toBe(true);
      }
    }
  });
  it('floors to a tile index', () => {
    const cam = createCamera({ x: 32, y: 32, zoom: 1 });
    const [sx, sy] = tileToScreen(cam, view, 32.5, 32.5);
    expect(screenToTileIndex(cam, view, sx, sy)).toEqual({ x: 32, y: 32 });
  });
  it('pans by screen pixels', () => {
    const cam = createCamera({ x: 32, y: 32, zoom: 1 });
    const before = screenToTile(cam, view, 400, 300);
    panBy(cam, 64, 0);
    const after = screenToTile(cam, view, 464, 300);
    expect(close(after.x, before.x) && close(after.y, before.y)).toBe(true);
  });
  it('zooms around the cursor', () => {
    const cam = createCamera({ x: 32, y: 32, zoom: 1 });
    const before = screenToTile(cam, view, 100, 100);
    zoomAt(cam, view, 1.5, 100, 100);
    expect(cam.zoom).toBe(1.5);
    const after = screenToTile(cam, view, 100, 100);
    expect(close(after.x, before.x) && close(after.y, before.y)).toBe(true);
    zoomAt(cam, view, 10, 100, 100);
    expect(cam.zoom).toBe(MAX_ZOOM);
  });
  it('culls to the tiles on screen, with room for tall buildings', () => {
    const cam = createCamera({ x: 32, y: 32, zoom: 1 });
    const r = visibleTileRange(cam, view, 64);
    expect(r.x0 <= 32 && 32 <= r.x1 && r.y0 <= 32 && 32 <= r.y1).toBe(true);
    expect(r.x0 > 5 && r.y0 > 5).toBe(true);
    expect(r.x1 - r.x0).toBeLessThan(40);
    const edge = visibleTileRange(createCamera({ x: 0, y: 0, zoom: 0.5 }), view, 64);
    expect(edge.x0).toBe(0);
    expect(edge.y0).toBe(0);
  });
  it('lists the chunks a range touches', () => {
    expect(visibleChunks({ x0: 0, y0: 0, x1: 15, y1: 15 })).toEqual([{ cx: 0, cy: 0 }]);
    expect(visibleChunks({ x0: 10, y0: 14, x1: 20, y1: 17 })).toEqual([
      { cx: 0, cy: 0 }, { cx: 1, cy: 0 }, { cx: 0, cy: 1 }, { cx: 1, cy: 1 },
    ]);
  });
});
