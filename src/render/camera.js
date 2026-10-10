import { ART_SCALE, p, artToTile } from './iso.js';

export const MIN_ZOOM = 0.5;
export const MAX_ZOOM = 2;
export const CHUNK = 16;

export const clampZoom = (z) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z));

// x, y: the tile coordinates (fractional) shown at the centre of the view.
export function createCamera({ x = 0, y = 0, zoom = 1 } = {}) {
  return { x, y, zoom: clampZoom(zoom) };
}

export const pxPerArt = (cam) => ART_SCALE * cam.zoom;

export function artToScreen(cam, view, ax, ay) {
  const c = p(cam.x, cam.y);
  const k = pxPerArt(cam);
  return [view.width / 2 + (ax - c[0]) * k, view.height / 2 + (ay - c[1]) * k];
}

export function tileToScreen(cam, view, x, y) {
  const q = p(x, y);
  return artToScreen(cam, view, q[0], q[1]);
}

export function screenToArt(cam, view, sx, sy) {
  const c = p(cam.x, cam.y);
  const k = pxPerArt(cam);
  return [c[0] + (sx - view.width / 2) / k, c[1] + (sy - view.height / 2) / k];
}

export function screenToTile(cam, view, sx, sy) {
  const [ax, ay] = screenToArt(cam, view, sx, sy);
  return artToTile(ax, ay);
}

export function screenToTileIndex(cam, view, sx, sy) {
  const t = screenToTile(cam, view, sx, sy);
  return { x: Math.floor(t.x), y: Math.floor(t.y) };
}

export function panBy(cam, dxPx, dyPx) {
  const k = pxPerArt(cam);
  const t = artToTile(dxPx / k, dyPx / k); // the projection is linear, so a delta converts the same way
  cam.x -= t.x;
  cam.y -= t.y;
  return cam;
}

export function zoomAt(cam, view, factor, sx, sy) {
  const before = screenToTile(cam, view, sx, sy);
  cam.zoom = clampZoom(cam.zoom * factor);
  const after = screenToTile(cam, view, sx, sy);
  cam.x += before.x - after.x;
  cam.y += before.y - after.y;
  return cam;
}

// Inclusive tile bounds that cover the view. Tall buildings rise towards smaller x + y on screen, so
// footprints just past the bottom edge can still show: `bottom` pads +x and +y further than the rest.
export function visibleTileRange(cam, view, size, pad = { side: 1, top: 1, bottom: 4 }) {
  const corners = [[0, 0], [view.width, 0], [0, view.height], [view.width, view.height]]
    .map(([sx, sy]) => screenToTile(cam, view, sx, sy));
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const t of corners) {
    x0 = Math.min(x0, t.x); y0 = Math.min(y0, t.y);
    x1 = Math.max(x1, t.x); y1 = Math.max(y1, t.y);
  }
  const last = size - 1;
  return {
    x0: Math.max(0, Math.floor(x0) - pad.side - pad.top),
    y0: Math.max(0, Math.floor(y0) - pad.side - pad.top),
    x1: Math.min(last, Math.ceil(x1) + pad.side + pad.bottom),
    y1: Math.min(last, Math.ceil(y1) + pad.side + pad.bottom),
  };
}

export function visibleChunks(range) {
  const out = [];
  for (let cy = Math.floor(range.y0 / CHUNK); cy <= Math.floor(range.y1 / CHUNK); cy++) {
    for (let cx = Math.floor(range.x0 / CHUNK); cx <= Math.floor(range.x1 / CHUNK); cx++) out.push({ cx, cy });
  }
  return out;
}
