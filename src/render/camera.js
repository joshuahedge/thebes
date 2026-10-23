import { ART_SCALE, p, artToTile } from './iso.js';

export const MIN_ZOOM = 0.5;
export const MAX_ZOOM = 2;
export const CHUNK = 16;

export const clampZoom = (z, min = MIN_ZOOM) => (Number.isNaN(+z) ? 1 : Math.min(MAX_ZOOM, Math.max(min, z)));

// Version 6.0 (Track D1, ruling 741): the Huge map's zoom-out floor. The frame is how many tiles the view holds at a zoom (a tile is 64 x 32 px at
// zoom 1, a diamond of 64 x 32 / 2 = 1,024 px squared at zoom 1, so W x H / (1024 z squared)); at the least zoom (0.5) Large's frame is its whole map
// at most (80 x 80 tiles) and a bigger map may show at most FRAME_RATIO_OVER_LARGE times that, so drawing Huge costs about what drawing Large does.
// A screen that holds more than that at 0.5 (a very big monitor) cannot zoom a Huge map out as far; every other screen can.
export const FRAME_RATIO_OVER_LARGE = 1.25;
const LARGE_TILES = 80 * 80;
export const frameTiles = (view, zoom) => (view.width * view.height) / (1024 * zoom * zoom);
export function minZoomFor(size, view) {
  if (!(size > 80) || !view || !(view.width > 0) || !(view.height > 0)) return MIN_ZOOM;
  const cap = FRAME_RATIO_OVER_LARGE * Math.min(frameTiles(view, MIN_ZOOM), LARGE_TILES);
  return Math.max(MIN_ZOOM, Math.sqrt((view.width * view.height) / (1024 * cap)));
}
// The least zoom this camera may have in this view: MIN_ZOOM, or the Huge floor when the camera knows its map's size (createCamera's size).
export const zoomFloor = (cam, view) => (cam && cam.mapSize ? minZoomFor(cam.mapSize, view) : MIN_ZOOM);

// x, y: the tile coordinates (fractional) shown at the centre of the view. size: the map's tiles a side (Version 6.0: only the Huge map's zoom floor reads it).
export function createCamera({ x = 0, y = 0, zoom = 1, size = 0 } = {}) {
  return size ? { x, y, zoom: clampZoom(zoom), mapSize: size } : { x, y, zoom: clampZoom(zoom) };
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

// A drag, a fling or a pinch may carry the middle of the view to the map's own edge and no further (Version 6.0, the final review: zoomed out on a Huge map a pan
// could leave a screen of empty tan past the edge). A camera that knows its map's size (createCamera's size: every game's) is held to the map; one that does not
// (the title's backdrop, a test's) pans freely as before.
export function panBy(cam, dxPx, dyPx) {
  const k = pxPerArt(cam);
  const t = artToTile(dxPx / k, dyPx / k); // the projection is linear, so a delta converts the same way
  cam.x -= t.x;
  cam.y -= t.y;
  if (cam.mapSize) { cam.x = Math.min(cam.mapSize, Math.max(0, cam.x)); cam.y = Math.min(cam.mapSize, Math.max(0, cam.y)); }
  return cam;
}

export function zoomAt(cam, view, factor, sx, sy) {
  const before = screenToTile(cam, view, sx, sy);
  cam.zoom = clampZoom(cam.zoom * factor, zoomFloor(cam, view));
  const after = screenToTile(cam, view, sx, sy);
  cam.x += before.x - after.x;
  cam.y += before.y - after.y;
  return cam;
}

// Inclusive tile bounds that cover the view. Tall buildings rise towards smaller x + y on screen, so
// footprints just past the bottom edge can still show: `bottom` pads +x and +y further than the rest.
const DEFAULT_PAD = { side: 1, top: 1, bottom: 4 };
export function visibleTileRange(cam, view, size, padIn = {}) {
  const pad = { ...DEFAULT_PAD, ...padIn };
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
