// The monuments interface (spec 4.14, 4.16, 4.20, 6.3, 6.5; rulings 207-212, 229-236, 251, 258, 280, 281): the site sheet,
// the finished monument's, the builders' guild's, quarry's, brickworks' and palace's sheets (with Enlarge the palace),
// the summary's Monuments section, the stall warnings' View and Show me, the placing camera fit at the pick, and the
// marker taps. Stage 4 contract: Track 0 fixed the seam; Track C implements it and owns this file (and sheets.js,
// placement.js, confirmBar.js, cards.js, welcomeBack.js, alerts.js beyond the seams).
//
// createUI makes one with the Stage 3 seam context (src/ui/createUI.js seamCtx: world, store, settings, sfx, toasts,
// celebrations, effects, cameraControl, speedControl, alerts, root, doc, now, clock, hooks, afterCommand, refresh, onView,
// showMeAt, selectBuilding, screenshotMode, fireTip) and treats it as it treats the danger and score interfaces:
//   sheets: custom sheet kinds (each needs a T entry, in Track C's text section)
//   sheetParts: { building(b), house(h), actions(b), summary() } -> arrays of nodes at the Stage 3 places (a monument's,
//     guild's, quarry's, brickworks' or palace's rows go in building(b) and actions(b); C may also route a monument's info
//     sheet to its own kind in sheets.js)
//   onEvents(events), refresh(), onAlertAction(alert, action), onCommand(e), destroy(): as Stage 3's
// and two Stage 4 hooks:
//   pickFit(type, ghost, insets) -> null, or { zoom, extent }: called by createUI's pick() once a monument's ghost has
//     landed (ghost: { x, y } with the tool's footprint); createUI then keeps the ghost in view with that zoom (never in,
//     never past the least zoom, an instant cut under Gentle and Still: cameraControl follows settings.reducedMotion()) and
//     that extent ({ up, down } art px: the silhouette). Ruling 231.
//   markerTap(marker) -> true when it handled a tap on a problem marker (src/render/markers.js); createUI otherwise selects
//     the marker's front building. A count badge zooming in one step is C's (ruling 281).
// Show me (createUI's showMeAt: a goal, a site's "No crew" row, a stall's alert row) asks pickFit too when it lands a
// monument's ghost. And one optional hook (Task 0.5; createUI checks it is a function):
//   grabExtent(type, rot) -> null, or { up }: how far a monument's ghost can be grabbed above its footprint (spec 6.5
//     "drag by the body"), in art px at zoom 1 (createUI scales it with the camera as it draws).
//
// Track C. The seam context has no camera: the fit reads the one the minimap was given (src/ui/minimap.js cameraOf).
import { BUILDINGS, dimsOf } from '../data/buildings.js';
import { ART } from '../render/art/registry.js';
import { pxPerArt, MIN_ZOOM } from '../render/camera.js';
import { FRAME_MARGIN_PX } from './cameraControl.js';
import { cameraOf } from './minimap.js';

// The art px a building of `type` in rotation `rot` reaches about its footprint's middle: up (its drawn height plus the back
// half of the footprint, iso.js p(): a tile is 32 x 16 art px), down (the front half) and across (the footprint's width).
export function footprintExtent(type, rot = 0) {
  const { w, d } = dimsOf(type, rot);
  const art = ART[type];
  return { up: (art ? art.height : 0) + 4 * (w + d), down: 4 * (w + d), across: 16 * (w + d) };
}

// The pick's one camera move for a monument (spec 6.5, ruling 231): { extent } when the footprint and the finished monument's
// silhouette already fit the free map (the view less the insets and the camera's margin) at the current zoom, else
// { zoom, extent } with the zoom that just fits them, never past MIN_ZOOM and never in. view: { width, height } CSS px.
export function fitZoom(type, rot, zoom, view, insets, margin = FRAME_MARGIN_PX) {
  const e = footprintExtent(type, rot);
  const k = pxPerArt({ zoom: 1 });                                    // CSS px per art px at zoom 1
  const freeW = view.width - insets.left - insets.right - 2 * margin;
  const freeH = view.height - insets.top - insets.bottom - 2 * margin;
  const fits = Math.min(freeW / (e.across * k), freeH / ((e.up + e.down) * k));
  const extent = { up: e.up, down: e.down };
  if (fits >= zoom) return { extent };
  return { zoom: Math.max(MIN_ZOOM, fits), extent };
}

export function createMonumentUi(ctx) {
  const { world, store } = ctx;
  return {
    sheets: {},
    sheetParts: {},
    onEvents(events) {},
    refresh() {},
    onAlertAction(alert, action) {},
    onCommand(e) {},
    pickFit(type, ghost, insets) {
      const shown = cameraOf(world);
      if (!shown || !BUILDINGS[type] || !BUILDINGS[type].monument || !ghost) return null;
      const tool = store && store.get().tool;
      return fitZoom(type, tool && tool.rot ? 1 : 0, shown.cam.zoom, shown.view(), insets);
    },
    // The silhouette's drawn height in art px at zoom 1 (the art entry's height, not footprintExtent().up, which adds the back
    // half of the footprint); null for anything that is not a monument. Ruling 9 (controller).
    grabExtent(type, rot) {
      if (!BUILDINGS[type] || !BUILDINGS[type].monument) return null;
      const art = ART[type];
      return { up: art ? art.height : 0 };
    },
    markerTap(marker) { return false; },
    destroy() {},
  };
}
