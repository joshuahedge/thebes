// Tweened camera moves for selection and the +/- buttons. Reduced motion makes every move a jump (spec 5.4).
import { clampZoom, pxPerArt, screenToTile, tileToScreen, zoomAt, panBy, zoomFloor } from '../render/camera.js';
import { CAMERA_PAN_MS, FLING_MIN_PX_S, FLING_MAX_PX_S, FLING_STOP_PX_S, FLING_TAU_MS, SHOW_ME_GLIDE_MS, SHOW_ME_GLIDE_MAX_MS, SHOW_ME_GLIDE_MS_PER_TILE, SHOW_ME_GENTLE_MS } from '../data/ui.js';

const easeOut = (t) => 1 - (1 - t) ** 3;
const NO_INSETS = { top: 0, right: 0, bottom: 0, left: 0 };
// The margin a framed point keeps inside the free map, in CSS px. createUI's phone insets rely on it (they stop the free
// band twice this above a sheet or bar), so both read this one constant.
export const FRAME_MARGIN_PX = 48;

// The centre a camera looking at (cx, cy) must move to so tile point (x, y) sits inside the view minus the
// insets (plus a margin), moving as little as it can; null when the point is already there.
// extent { up, down } (art px; none by default) makes the point a building: it reaches `up` above the point and `down`
// below it, and all of that is kept in the free band. A building taller than the band is centred in it rather than
// pushed against one edge. extent.side (art px, optional) is how far it reaches to each side of the point (ruling 300: a
// mastaba picked near the edge of a phone kept its middle in view and lost a corner), kept in the same way.
function nudgedCentre(cam, v, cx, cy, x, y, insets, margin, extent = null) {
  const at = { x: cx, y: cy, zoom: cam.zoom };
  const [sx, sy] = tileToScreen(at, v, x, y);
  const minX = insets.left + margin, maxX = v.width - insets.right - margin;
  const minY = insets.top + margin, maxY = v.height - insets.bottom - margin;
  let dx = 0, dy = 0;
  if (extent && extent.side) {
    const k = pxPerArt(at);
    const left = sx - extent.side * k, right = sx + extent.side * k;
    if (right - left > maxX - minX) dx = (minX + maxX) / 2 - sx;
    else if (left < minX) dx = minX - left; else if (right > maxX) dx = maxX - right;
  } else if (sx < minX) dx = minX - sx; else if (sx > maxX) dx = maxX - sx;
  if (extent) {
    const k = pxPerArt(at);
    const top = sy - extent.up * k, bottom = sy + extent.down * k;
    if (bottom - top > maxY - minY) dy = (minY + maxY) / 2 - (top + bottom) / 2;
    else if (top < minY) dy = minY - top; else if (bottom > maxY) dy = maxY - bottom;
  } else if (sy < minY) dy = minY - sy; else if (sy > maxY) dy = maxY - sy;
  if (dx === 0 && dy === 0) return null;
  return screenToTile(at, v, v.width / 2 - dx, v.height / 2 - dy);
}

// Version 5.0 (Task 6, rulings 570-579). motionLevel() is 'full' | 'gentle' | 'still' (without it: reducedMotion() is Still, else Full, as before). Every move is as it was (a
// tween under Full, a jump under Gentle and Still) except a glide(), which is what Show me uses: under Full it tweens for as long as the distance asks, under Gentle a short
// glide, under Still a jump. fling(vx, vy) keeps a swipe's speed panning and slowing; any cancel() (a touch, a key, the wheel) stops it, and so does any other move.
export function createCameraControl({ cam, view, reducedMotion = () => false, motionLevel = null, now = () => performance.now() }) {
  let tween = null;
  let flinging = null;
  let gliding = false;
  const level = () => (motionLevel ? motionLevel() : (reducedMotion() ? 'still' : 'full'));

  // Version 6.0 (Track D1, ruling 741): the zoom the camera may not go below in this view (MIN_ZOOM, or the Huge map's floor).
  const floor = () => zoomFloor(cam, view());
  const clampTo = (zoom) => clampZoom(zoom, floor());

  function begin(toX, toY, toZoom, ms, anchor = null) {
    const z = clampTo(toZoom);
    flinging = null;
    if (gliding) {
      const lv = level();
      if (lv === 'still') ms = 0;
      else if (lv === 'gentle') ms = SHOW_ME_GENTLE_MS;
      else ms = Math.min(SHOW_ME_GLIDE_MAX_MS, SHOW_ME_GLIDE_MS + SHOW_ME_GLIDE_MS_PER_TILE * Math.hypot(toX - cam.x, toY - cam.y));
    } else if (reducedMotion()) ms = 0;
    if (!(ms > 0)) {
      cam.x = toX; cam.y = toY; cam.zoom = z;
      tween = null;
      return;
    }
    tween = { fromX: cam.x, fromY: cam.y, fromZ: cam.zoom, toX, toY, toZ: z, start: now(), ms, anchor };
  }

  return {
    panTo(x, y, ms = CAMERA_PAN_MS) { begin(x, y, cam.zoom, ms); },
    zoomTo(zoom, ms = CAMERA_PAN_MS) { begin(cam.x, cam.y, zoom, ms); },
    // A step in or out about the screen point (sx, sy): the tile under it stays under it all the way (the tween re-anchors at every frame, not only at the end).
    zoomStep(factor, sx, sy, ms = CAMERA_PAN_MS) {
      const target = { x: cam.x, y: cam.y, zoom: cam.zoom, mapSize: cam.mapSize };
      const under = screenToTile(cam, view(), sx, sy);
      zoomAt(target, view(), factor, sx, sy);
      begin(target.x, target.y, target.zoom, ms, { sx, sy, x: under.x, y: under.y });
    },
    jumpTo(x, y) { tween = null; flinging = null; cam.x = x; cam.y = y; },
    // Runs fn (a pan, keepVisible, frameKeeping...) as a glide: Show me's way of getting there (see above).
    glide(fn) { const was = gliding; gliding = true; try { return fn(); } finally { gliding = was; } },
    // A swipe lifted at (vx, vy) screen px a second keeps panning, slowing as exp(-t / tau) with tau for the Motion level (Full 350 ms, Gentle 110 ms); nothing under Still or
    // below FLING_MIN_PX_S. Returns whether it started.
    fling(vx, vy) {
      const lv = level();
      const speed = Math.hypot(vx, vy);
      if (lv === 'still' || !FLING_TAU_MS[lv] || !(speed >= FLING_MIN_PX_S)) return false;
      const k = Math.min(1, FLING_MAX_PX_S / speed);
      tween = null;
      flinging = { vx: vx * k, vy: vy * k, tau: FLING_TAU_MS[lv] / 1000, last: now() };
      return true;
    },
    get flinging() { return flinging !== null; },
    centre() { const v = view(); return { x: v.width / 2, y: v.height / 2 }; },
    // The map tile under the middle of the view (tile coordinates, where centre() is in screen pixels): what a Show me that looks for
    // the nearest place to where the player is looking starts from.
    centreTile() { const v = view(); return screenToTile(cam, v, v.width / 2, v.height / 2); },
    cancel() { tween = null; flinging = null; },
    tick(t = now()) {
      if (cam.mapSize && cam.zoom < floor()) cam.zoom = floor();   // a bigger window raised the Huge map's floor under a view that was further out
      if (flinging) {
        const f = flinging, dt = Math.max(0, Math.min(t - f.last, 64)) / 1000;   // a stalled frame counts 64 ms at most
        f.last = t;
        const decay = Math.exp(-dt / f.tau);
        panBy(cam, f.vx * f.tau * (1 - decay), f.vy * f.tau * (1 - decay));     // the whole of this frame's distance: the integral of the speed over it
        f.vx *= decay; f.vy *= decay;
        if (Math.hypot(f.vx, f.vy) < FLING_STOP_PX_S) flinging = null;
        return true;
      }
      if (!tween) return false;
      const k = Math.max(0, Math.min(1, (t - tween.start) / tween.ms));
      const e = easeOut(k);
      cam.x = tween.fromX + (tween.toX - tween.fromX) * e;
      cam.y = tween.fromY + (tween.toY - tween.fromY) * e;
      cam.zoom = tween.fromZ + (tween.toZ - tween.fromZ) * e;
      if (tween.anchor && k < 1) {                                              // a zoom about a point: the tile under it is still under it
        const a = tween.anchor, now2 = screenToTile(cam, view(), a.sx, a.sy);
        cam.x += a.x - now2.x; cam.y += a.y - now2.y;
      }
      if (k >= 1) { cam.x = tween.toX; cam.y = tween.toY; cam.zoom = tween.toZ; tween = null; }
      return true;
    },
    get animating() { return tween !== null || flinging !== null; },
    // Pan the least that puts tile point (x, y) inside the viewport minus the insets, with a margin. With an extent
    // ({ up, down, side? }, art px) the whole drawn building around the point is kept inside (see nudgedCentre). With a zoom, the
    // camera goes to that zoom too, and the pan is worked out at it.
    keepVisible(x, y, insets = NO_INSETS, margin = FRAME_MARGIN_PX, ms = CAMERA_PAN_MS, extent = null, zoom = null) {
      const v = view();
      const z = zoom === null ? cam.zoom : clampTo(zoom);
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
    // extent and zoom as keepVisible's (Stage 4: Show me for a monument passes the pick's fit, ruling 231).
    panToKeeping(cx, cy, x, y, insets = NO_INSETS, margin = FRAME_MARGIN_PX, ms = CAMERA_PAN_MS, extent = null, zoom = null) {
      const z = zoom === null ? cam.zoom : clampTo(zoom);
      const centre = nudgedCentre({ zoom: z }, view(), cx, cy, x, y, insets, margin, extent) || { x: cx, y: cy };
      begin(centre.x, centre.y, z, ms);
    },
    // As panToKeeping, but (cx, cy) goes to the middle of the map the insets leave free rather than the middle of the
    // screen: a phone frames a place between the rows under the top bar and the sheet or bar below (ruling 168).
    frameKeeping(cx, cy, x, y, insets = NO_INSETS, margin = FRAME_MARGIN_PX, ms = CAMERA_PAN_MS, extent = null, zoom = null) {
      const v = view();
      const z = zoom === null ? cam.zoom : clampTo(zoom);
      const midX = insets.left + (v.width - insets.left - insets.right) / 2;
      const midY = insets.top + (v.height - insets.top - insets.bottom) / 2;
      const framed = screenToTile({ x: cx, y: cy, zoom: z }, v, v.width - midX, v.height - midY);
      const centre = nudgedCentre({ zoom: z }, v, framed.x, framed.y, x, y, insets, margin, extent) || framed;
      begin(centre.x, centre.y, z, ms);
    },
  };
}
