// The danger interface (spec 4.3, 4.12, 4.13, 6.3): the speed reactions and the On a fire setting, the raid horn and the
// coin tick, the tribute confirmation sheet, the festival button, the fire row and the defence rows on building sheets,
// and the last raid's report in the summary. Stage 3 contract: Track D implements createDanger; createUI makes one per
// game (after the alerts, speed control and toasts, before the sheets) and calls it only through this shape.
//
// ctx: { world, store, settings, sfx, toasts, celebrations, effects, cameraControl, speedControl, alerts, root, doc, now,
// clock, hooks, afterCommand, refresh, onView, showMeAt, selectBuilding }. createDanger must not call refresh or
// afterCommand while it is being created (the sheets do not exist yet); every later call is fine.
//
// Returns:
//   sheets      custom sheet kinds it owns -> render(body, { close }) (createSheets' custom sheets; the heading is
//               T[kind], so each kind it adds needs a T entry in Track D's section of text.js)
//   sheetParts  { building(b), house(h), actions(b), summary() }, each returning an array of DOM nodes (empty for none):
//               rows after a building sheet's reach row, rows after a home's checklist, buttons at the front of a
//               building sheet's actions, and nodes in the summary after the goals
//   onEvents(events)  every batch of sim events: the loop's and those settle returns after a command
//   refresh()   after every command and every game day, once the alerts and the chrome are up to date
//   onAlertAction(alert, action)  an alert's button other than View was pressed (alerts.action; 'tribute' for Pay tribute)
//   onCommand(e)  after every command, with createUI's afterCommand record ({ kind, result, text, undoable }), before the
//               settle (a placed well's ripple, a tip on placing a firehouse)
//   destroy()   when the interface goes
// ctx.screenshotMode() enters screenshot mode (the store's screenshot flag; Back, Esc, a tap or a click leaves it).
// ctx.fireTip(trigger) asks for a tip (src/data/tips.js triggers), as createUI does for its own.
import { openSheet, closeSheet } from './modes.js';

export function createDanger(ctx) {
  // D1: the banner's other buttons (src/ui/alerts.js). View on a raid's alert moves the camera to its map point (it has no
  // building to select); "+N more" opens the minimap sheet, whose list holds every alert.
  function onAlertAction(alert, action) {
    if (action === 'view' && Number.isFinite(alert.x) && Number.isFinite(alert.y)) {
      const s = ctx.store.get();
      if (s.sheet) ctx.store.set(closeSheet(s));
      ctx.cameraControl.panTo(alert.x + 0.5, alert.y + 0.5);
    } else if (action === 'more') ctx.store.set(openSheet(ctx.store.get(), 'minimap'));
  }
  return {
    sheets: {},
    sheetParts: { building: () => [], house: () => [], actions: () => [], summary: () => [] },
    onEvents() {},
    refresh() {},
    onAlertAction,
    onCommand() {},
    destroy() {},
  };
}
