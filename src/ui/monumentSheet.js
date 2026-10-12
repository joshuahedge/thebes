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
//
// STUB: no sheets, no parts, no fit (the pick pans as for any building) and no marker handling of its own.
export function createMonumentUi(ctx) {
  return {
    sheets: {},
    sheetParts: {},
    onEvents(events) {},
    refresh() {},
    onAlertAction(alert, action) {},
    onCommand(e) {},
    pickFit(type, ghost, insets) { return null; },
    markerTap(marker) { return false; },
    destroy() {},
  };
}
