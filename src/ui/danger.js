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
import { BUILDINGS } from '../data/buildings.js';
import { allBuildings, housesOf } from '../sim/world.js';
import { roadReach, reachDistance } from '../sim/reach.js';
import { isWorking } from '../sim/labour.js';
import { openSheet, closeSheet } from './modes.js';
import { buildingName, tierName, DANGER_UI_TEXT, CRIME_TEXT } from './text.js';
import { tributeSheet, buildingParts, fireRow, homeRows, actionParts, summaryParts } from './dangerSheets.js';

// The homes a newly placed water provider is the first to water (spec 5.4's ripple): those it reaches by the coveredBy rule
// (src/sim/housing.js) that no other working water provider reaches. Plots count, as "Gives water to N homes" counts them.
export function firstWatered(world, well) {
  const def = BUILDINGS[well.type];
  const mine = roadReach(world, well, def.reach);
  const others = allBuildings(world).filter((b) => b.id !== well.id && BUILDINGS[b.type].provides === def.provides && isWorking(world, b));
  return housesOf(world).filter((h) => reachDistance(mine, world, h) <= def.reach
    && !others.some((o) => reachDistance(roadReach(world, o, BUILDINGS[o.type].reach), world, h) <= BUILDINGS[o.type].reach));
}

// A building in a sentence: a home by its tier ("the hut"), anything else by its type ("the potter").
export const placeName = (b) => (b.type === 'house' ? tierName(b.tier) : buildingName(b.type)).toLowerCase();

export function createDanger(ctx) {
  const D = DANGER_UI_TEXT;
  const reacted = new Set();      // buildings whose uncovered fire the speed already reacted to (a blaze that grows: once)

  // D2: the On a fire setting (spec 4.3), for a blaze or fire no staffed firehouse reaches after the city's first (the sim
  // paused for that one itself): Pause; Go to it (drop to 1x and move the camera there, an instant cut under reduced
  // motion); Just tell me (drop to 1x; the banner says the rest). Dropping to 1x leaves a paused game paused.
  function reactToFire(id) {
    const how = ctx.settings.get().fireReaction;
    if (how === 'pause') { if (ctx.world.speed !== 0) ctx.speedControl.set(0); return; }
    if (ctx.world.speed > 1) ctx.speedControl.set(1);
    const b = ctx.world.buildings[id];
    if (how === 'goto' && b) ctx.cameraControl.panTo(b.x + b.w / 2, b.y + b.d / 2);
  }

  // Captions are the info tier (spec 6.3): one line in the caption row, no sound, nothing to tap.
  const caption = (text) => ctx.celebrations.show({ tier: 'info', text });

  function onEvents(events) {
    let fireAt = null, paused = false;
    for (const e of events) {
      // The city's first (a new fire, or a blaze growing with no staffed firehouse: both carry first): the sim has paused.
      // It counts as reacted to, so when that blaze later grows into a fire (no first then) nothing reacts a second time.
      if ((e.type === 'fire' || e.type === 'fire_grow') && e.first) { paused = true; reacted.add(e.id); }
      else if ((e.type === 'fire' || e.type === 'fire_grow') && !e.covered && !reacted.has(e.id)) { reacted.add(e.id); if (fireAt === null) fireAt = e.id; }
      else if (e.type === 'fire_out') {
        reacted.delete(e.id);
        const b = ctx.world.buildings[e.id];
        if (b) caption(D.putOut(e.stage, placeName(b)));
      } else if (e.type === 'burned') reacted.delete(e.id);
      else if (e.type === 'theft') { caption(CRIME_TEXT.caption(e)); if (ctx.fireTip) ctx.fireTip('theft'); }   // Stage 4.5 (ruling 319): what a thief took, and the tip
      else if (e.type === 'illness') { if (ctx.fireTip) ctx.fireTip('illness'); }                               // Stage 4.5 (ruling 318): the tip, the first time a home falls ill
      else if (e.type === 'raid_warning') ctx.sfx.play('horn');              // once, as the warning appears (spec 5.5)
      else if (e.type === 'raid_end' && e.report) caption(D.raidReport(e.report));
      else if (e.type === 'month' && ctx.world.stats.lastMonth && ctx.world.stats.lastMonth.taxes > 0) ctx.sfx.play('coin');   // the month's taxes arrived
    }
    if (fireAt !== null && !paused) reactToFire(fireAt);
  }

  // D2: a well's ripple (spec 5.4): one ring on each home it is the first to water; effects.ripple is nothing under
  // reduced motion.
  function onCommand(e) {
    if (!e || !e.undoable || e.kind !== 'building' || !e.result || !e.result.ok) return;
    const b = ctx.world.buildings[e.result.id];
    if (!b || BUILDINGS[b.type].provides !== 'water') return;
    const at = ctx.now();
    for (const h of firstWatered(ctx.world, b)) ctx.effects.ripple(h.x + h.w / 2, h.y + h.d / 2, at);
  }

  // D1: the banner's other buttons (src/ui/alerts.js). View on a raid's alert moves the camera to its map point (it has no
  // building to select); "+N more" opens the minimap sheet, whose list holds every alert; a phone's countdown chip opens the
  // raid sheet, which is the tribute sheet (ruling 167).
  function onAlertAction(alert, action) {
    if (action === 'view' && Number.isFinite(alert.x) && Number.isFinite(alert.y)) {
      const s = ctx.store.get();
      if (s.sheet) ctx.store.set(closeSheet(s));
      ctx.cameraControl.panTo(alert.x + 0.5, alert.y + 0.5);
    } else if (action === 'more') ctx.store.set(openSheet(ctx.store.get(), 'minimap'));
    else if (action === 'tribute' || action === 'warning') ctx.store.set(openSheet(ctx.store.get(), 'tribute'));   // D3: the confirmation sheet
  }

  // D3: the sheets' parts (src/ui/dangerSheets.js). Each asks only of a real building in this city.
  const real = (b) => Boolean(ctx.world && b && BUILDINGS[b.type] && ctx.world.buildings[b.id] === b);
  return {
    sheets: { tribute: tributeSheet(ctx) },
    sheetParts: {
      building: (b) => (real(b) ? buildingParts(ctx, b) : []),
      house: (h) => (real(h) ? [...fireRow(ctx, h), ...homeRows(ctx, h)] : []),
      actions: (b) => (real(b) ? actionParts(ctx, b) : []),
      summary: () => (ctx.world ? summaryParts(ctx) : []),
    },
    onEvents,
    refresh() {},
    onAlertAction,
    onCommand,
    destroy() { reacted.clear(); },
  };
}
