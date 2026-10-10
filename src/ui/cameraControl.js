// Tweened camera moves for selection and the +/- buttons. Reduced motion makes every move a jump (spec 5.4).
import { clampZoom, screenToTile, tileToScreen, zoomAt } from '../render/camera.js';
import { CAMERA_PAN_MS } from '../data/ui.js';

const easeOut = (t) => 1 - (1 - t) ** 3;

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
    cancel() { tween = null; },
    tick(t = now()) {
      if (!tween) return false;
      const k = Math.min(1, (t - tween.start) / tween.ms);
      const e = easeOut(k);
      cam.x = tween.fromX + (tween.toX - tween.fromX) * e;
      cam.y = tween.fromY + (tween.toY - tween.fromY) * e;
      cam.zoom = tween.fromZ + (tween.toZ - tween.fromZ) * e;
      if (k >= 1) { cam.x = tween.toX; cam.y = tween.toY; cam.zoom = tween.toZ; tween = null; }
      return true;
    },
    get animating() { return tween !== null; },
    // Pan the least that puts tile point (x, y) inside the viewport minus the insets, with a margin.
    keepVisible(x, y, insets = { top: 0, right: 0, bottom: 0, left: 0 }, margin = 48, ms = CAMERA_PAN_MS) {
      const v = view();
      const [sx, sy] = tileToScreen(cam, v, x, y);
      const minX = insets.left + margin, maxX = v.width - insets.right - margin;
      const minY = insets.top + margin, maxY = v.height - insets.bottom - margin;
      let dx = 0, dy = 0;
      if (sx < minX) dx = minX - sx; else if (sx > maxX) dx = maxX - sx;
      if (sy < minY) dy = minY - sy; else if (sy > maxY) dy = maxY - sy;
      if (dx === 0 && dy === 0) return false;
      const centre = screenToTile(cam, v, v.width / 2 - dx, v.height / 2 - dy);
      begin(centre.x, centre.y, cam.zoom, ms);
      return true;
    },
  };
}
