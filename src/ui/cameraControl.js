// Tweened camera moves for selection and the +/- buttons. Reduced motion makes every move a jump (spec 5.4).
import { clampZoom, screenToTile, tileToScreen, zoomAt } from '../render/camera.js';
import { CAMERA_PAN_MS } from '../data/ui.js';

const easeOut = (t) => 1 - (1 - t) ** 3;
const NO_INSETS = { top: 0, right: 0, bottom: 0, left: 0 };

// The centre a camera looking at (cx, cy) must move to so tile point (x, y) sits inside the view minus the
// insets (plus a margin), moving as little as it can; null when the point is already there.
function nudgedCentre(cam, v, cx, cy, x, y, insets, margin) {
  const at = { x: cx, y: cy, zoom: cam.zoom };
  const [sx, sy] = tileToScreen(at, v, x, y);
  const minX = insets.left + margin, maxX = v.width - insets.right - margin;
  const minY = insets.top + margin, maxY = v.height - insets.bottom - margin;
  let dx = 0, dy = 0;
  if (sx < minX) dx = minX - sx; else if (sx > maxX) dx = maxX - sx;
  if (sy < minY) dy = minY - sy; else if (sy > maxY) dy = maxY - sy;
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
    // Pan the least that puts tile point (x, y) inside the viewport minus the insets, with a margin.
    keepVisible(x, y, insets = NO_INSETS, margin = 48, ms = CAMERA_PAN_MS) {
      const v = view();
      const centre = nudgedCentre(cam, v, cam.x, cam.y, x, y, insets, margin);
      if (!centre) return false;
      begin(centre.x, centre.y, cam.zoom, ms);
      return true;
    },
    // Centre on (cx, cy), then nudge the least that keeps tile point (x, y) inside the viewport minus the insets:
    // Show me centres the place and still never leaves the ghost off screen. Works from where the camera will
    // be, not where it is, so it is right whether the move is tweened or a jump.
    // When the place and the point cannot both fit, the point wins and the place moves off centre.
    panToKeeping(cx, cy, x, y, insets = NO_INSETS, margin = 48, ms = CAMERA_PAN_MS) {
      const centre = nudgedCentre(cam, view(), cx, cy, x, y, insets, margin) || { x: cx, y: cy };
      begin(centre.x, centre.y, cam.zoom, ms);
    },
    // As panToKeeping, but (cx, cy) goes to the middle of the map the insets leave free rather than the middle of the
    // screen: a phone frames a place between the rows under the top bar and the sheet or bar below (ruling 168).
    frameKeeping(cx, cy, x, y, insets = NO_INSETS, margin = 48, ms = CAMERA_PAN_MS) {
      const v = view();
      const midX = insets.left + (v.width - insets.left - insets.right) / 2;
      const midY = insets.top + (v.height - insets.top - insets.bottom) / 2;
      const framed = screenToTile({ x: cx, y: cy, zoom: cam.zoom }, v, v.width - midX, v.height - midY);
      const centre = nudgedCentre(cam, v, framed.x, framed.y, x, y, insets, margin) || framed;
      begin(centre.x, centre.y, cam.zoom, ms);
    },
  };
}
