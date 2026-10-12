// Tweened camera moves for selection and the +/- buttons. Reduced motion makes every move a jump (spec 5.4).
import { clampZoom, pxPerArt, screenToTile, tileToScreen, zoomAt } from '../render/camera.js';
import { CAMERA_PAN_MS } from '../data/ui.js';

const easeOut = (t) => 1 - (1 - t) ** 3;
const NO_INSETS = { top: 0, right: 0, bottom: 0, left: 0 };
// The margin a framed point keeps inside the free map, in CSS px. createUI's phone insets rely on it (they stop the free
// band twice this above a sheet or bar), so both read this one constant.
export const FRAME_MARGIN_PX = 48;

// The centre a camera looking at (cx, cy) must move to so tile point (x, y) sits inside the view minus the
// insets (plus a margin), moving as little as it can; null when the point is already there.
// extent { up, down } (art px; none by default) makes the point a building: it reaches `up` above the point and `down`
// below it, and all of that is kept in the free band. A building taller than the band is centred in it rather than
// pushed against one edge.
function nudgedCentre(cam, v, cx, cy, x, y, insets, margin, extent = null) {
  const at = { x: cx, y: cy, zoom: cam.zoom };
  const [sx, sy] = tileToScreen(at, v, x, y);
  const minX = insets.left + margin, maxX = v.width - insets.right - margin;
  const minY = insets.top + margin, maxY = v.height - insets.bottom - margin;
  let dx = 0, dy = 0;
  if (sx < minX) dx = minX - sx; else if (sx > maxX) dx = maxX - sx;
  if (extent) {
    const k = pxPerArt(at);
    const top = sy - extent.up * k, bottom = sy + extent.down * k;
    if (bottom - top > maxY - minY) dy = (minY + maxY) / 2 - (top + bottom) / 2;
    else if (top < minY) dy = minY - top; else if (bottom > maxY) dy = maxY - bottom;
  } else if (sy < minY) dy = minY - sy; else if (sy > maxY) dy = maxY - sy;
  if (dx === 0 && dy === 0) return null;
  return screenToTile(at, v, v.width / 2 - dx, v.height / 2 - dy);
}

export function createCameraControl({ cam, view, reducedMotion = () => false, now = () => performance.now() }) {
  let tween = null;

  function begin(toX, toY, toZoom, ms) {
    const z = clampZoom(toZoom);
    if (reducedMotion() || !(ms > 0)) {
      cam.x = toX; cam.y = toY; cam.zoom = z;
      tween = null;
      return;
    }
    tween = { fromX: cam.x, fromY: cam.y, fromZ: cam.zoom, toX, toY, toZ: z, start: now(), ms };
  }

  return {
    panTo(x, y, ms = CAMERA_PAN_MS) { begin(x, y, cam.zoom, ms); },
    zoomTo(zoom, ms = CAMERA_PAN_MS) { begin(cam.x, cam.y, zoom, ms); },
    zoomStep(factor, sx, sy, ms = CAMERA_PAN_MS) {
      const target = { x: cam.x, y: cam.y, zoom: cam.zoom };
      zoomAt(target, view(), factor, sx, sy);
      begin(target.x, target.y, target.zoom, ms);
    },
    jumpTo(x, y) { tween = null; cam.x = x; cam.y = y; },
    centre() { const v = view(); return { x: v.width / 2, y: v.height / 2 }; },
    cancel() { tween = null; },
    tick(t = now()) {
      if (!tween) return false;
      const k = Math.max(0, Math.min(1, (t - tween.start) / tween.ms));
      const e = easeOut(k);
      cam.x = tween.fromX + (tween.toX - tween.fromX) * e;
      cam.y = tween.fromY + (tween.toY - tween.fromY) * e;
      cam.zoom = tween.fromZ + (tween.toZ - tween.fromZ) * e;
      if (k >= 1) { cam.x = tween.toX; cam.y = tween.toY; cam.zoom = tween.toZ; tween = null; }
      return true;
    },
    get animating() { return tween !== null; },
    // Pan the least that puts tile point (x, y) inside the viewport minus the insets, with a margin. With an extent
    // ({ up, down }, art px) the whole drawn building around the point is kept inside (see nudgedCentre). With a zoom, the
    // camera goes to that zoom too, and the pan is worked out at it.
    keepVisible(x, y, insets = NO_INSETS, margin = FRAME_MARGIN_PX, ms = CAMERA_PAN_MS, extent = null, zoom = null) {
      const v = view();
      const z = zoom === null ? cam.zoom : clampZoom(zoom);
      const at = { x: cam.x, y: cam.y, zoom: z };
      const centre = nudgedCentre(at, v, cam.x, cam.y, x, y, insets, margin, extent);
      if (!centre && z === cam.zoom) return false;
      begin(centre ? centre.x : cam.x, centre ? centre.y : cam.y, z, ms);
      return true;
    },
    // Centre on (cx, cy), then nudge the least that keeps tile point (x, y) inside the viewport minus the insets:
    // Show me centres the place and still never leaves the ghost off screen. Works from where the camera will
    // be, not where it is, so it is right whether the move is tweened or a jump.
    // When the place and the point cannot both fit, the point wins and the place moves off centre.
    panToKeeping(cx, cy, x, y, insets = NO_INSETS, margin = FRAME_MARGIN_PX, ms = CAMERA_PAN_MS) {
      const centre = nudgedCentre(cam, view(), cx, cy, x, y, insets, margin) || { x: cx, y: cy };
      begin(centre.x, centre.y, cam.zoom, ms);
    },
    // As panToKeeping, but (cx, cy) goes to the middle of the map the insets leave free rather than the middle of the
    // screen: a phone frames a place between the rows under the top bar and the sheet or bar below (ruling 168).
    frameKeeping(cx, cy, x, y, insets = NO_INSETS, margin = FRAME_MARGIN_PX, ms = CAMERA_PAN_MS) {
      const v = view();
      const midX = insets.left + (v.width - insets.left - insets.right) / 2;
      const midY = insets.top + (v.height - insets.top - insets.bottom) / 2;
      const framed = screenToTile({ x: cx, y: cy, zoom: cam.zoom }, v, v.width - midX, v.height - midY);
      const centre = nudgedCentre(cam, v, framed.x, framed.y, x, y, insets, margin) || framed;
      begin(centre.x, centre.y, cam.zoom, ms);
    },
  };
}
