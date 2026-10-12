// Wires every component to the store, the world, the camera and the renderer (spec 6). The world changes
// only through placement.js, speed.js and the sheets, which call src/sim/commands.js then assignLabour.
import { MILESTONES } from '../data/progression.js';
import { alertsFor } from '../sim/alerts.js';
import { BUILDINGS } from '../data/buildings.js';
import { CATEGORIES, toolForItem, categoryOfItem, AUTO_OVERLAY, UNDO_TOAST_MS, UPDATE_TOAST_MS, SHOW_ME_PULSES, SHOW_ME_PULSE_MS } from '../data/ui.js';
import { goalById, nextItemFor, guideActive, openGoals, goalProgress } from '../sim/goals.js';
import { settle } from '../sim/settle.js';
import { startDaily } from '../sim/daily.js';
import { setGuide } from '../sim/commands.js';
import { checkFirsts } from '../sim/firsts.js';
import { checkAchievements } from '../sim/achievements.js';
import { allBuildings } from '../sim/world.js';
import { touchesRoad } from '../sim/reach.js';
import { screenToTile, visibleTileRange, pxPerArt, MIN_ZOOM } from '../render/camera.js';
import { walkersAt } from '../render/walkers.js';
import { drawOverlay, drawReachHighlight, drawGhost, drawProblemMarkers, drawGuideMarker, drawDesirabilityTint } from '../render/overlays.js';
import { createEffects } from '../render/effects.js';
import { GOLD } from '../render/art/palette.js';
import { createStore, INITIAL_UI_STATE } from './store.js';
import { select, deselect, cancelTool, back, openSheet, closeSheet, setDock, isToolMode, pickCategory, enterScreenshot } from './modes.js';
import { pickLayout, watchLayout, freeTop, cornersHeight, cornersBottom, TOPBAR_PX } from './layout.js';
import { createBackStack } from './backstack.js';
import { createSettings } from './settings.js';
import { createSfx } from '../audio/sfx.js';
import { createCameraControl, FRAME_MARGIN_PX } from './cameraControl.js';
import { ART } from '../render/art/registry.js';
import { createMapInput } from './input.js';
import { createKeyboard } from './keyboard.js';
import { pickBuilding } from './pick.js';
import { createPlacement, snapGhost } from './placement.js';
import { createHud } from './hud.js';
import { createSpeedControl } from './speed.js';
import { cardInfo, activeItemOf, shownItems } from './cards.js';
import { createDock } from './dock.js';
import { createConfirmBar } from './confirmBar.js';
import { createSidePanel } from './sidePanel.js';
import { createRail } from './rail.js';
import { createCorners } from './corners.js';
import { createSheets } from './sheets.js';
import { createMinimap } from './minimap.js';
import { createAlerts, mapSummaryText, nearestOf } from './alerts.js';
import { createOverlayLegend } from './overlayUi.js';
import { createLayersPicker } from './layersPicker.js';
import { createToasts, MAX_TOASTS, MAX_TOASTS_PHONE } from './toasts.js';
import { createCelebrations } from './celebrate.js';
import { createTips } from './tips.js';
import { createNudge, nudgeLineText, NUDGE_MAX_STEP_MS } from './nudge.js';
import { TIP_AUTO_CLOSE_MS } from '../data/tips.js';
import { createMenuSheets, createDialog } from './menu.js';
import { createGoalsStrip, goalsSheet, showMeTarget, dateKeyOf } from './goalsList.js';
import { welcomeSheet } from './welcomeBack.js';
import { tradeSheet } from './tradeSheet.js';
import { createGuide, canResumeGuide } from './guide.js';
import { el, setText, clear } from './components.js';
import { createDanger } from './danger.js';
import { createScoreUi } from './scoreUi.js';
import { unitsAt, drawUnitMarks } from '../render/units.js';
import { drawFires } from '../render/fire.js';
import { createAmbient, createFrameGate } from '../render/ambient.js';
import { buildingName, reasonText, milestoneText, caravanText, FIRST_TEXT, ACHIEVEMENT_NAMES, ACHIEVEMENT_TEXT, DAILY_TEXT, CONDITION_TEXT, T } from './text.js';

const WIDE_LONG_DATE_PX = 1000;       // the wide top bar shows the long date from this width up (at 100% and 125% text)
const PANEL_PX = 320, RAIL_PX = 56, DRAWER_PX = 268;   // --panel-w, --rail-w, --drawer-w
const OPEN_ROW_FRACTION = 0.4;         // an open guidance row may reach this share of the screen's height (spec 6.1's limit for the rows under the top bar)
const OPEN_ROW_MIN_PX = 44;            // ...and is never shorter than one button, however far down the rows begin
const LEAVE_MARGIN_PX = 8;           // the margin a new building keeps inside the phone's narrow free band when the tool ends (the camera's usual 48 is wider than the band at 150% text)

export function createUI({
  world, canvas, cam, renderer,
  root = document.body, doc = document, win = window,
  getSize = null, subscribeResize = undefined, history = win.history,
  addListener = (type, fn) => win.addEventListener(type, fn), removeListener = (type, fn) => win.removeEventListener(type, fn),
  keyTarget = win, storage = undefined, hooks = {}, now = () => performance.now(), welcome = null, extraSheets = {},
  settings: givenSettings = null, clock = () => Date.now(), sfx: givenSfx = null,
}) {
  const $ = (id) => root.querySelector(`#${id}`);
  const view = getSize || (() => ({ width: canvas.clientWidth || win.innerWidth, height: canvas.clientHeight || win.innerHeight }));

  // Ghost and day bookkeeping lives up here: afterCommand is hoisted and may run during construction.
  let lastDay = world.day, ghostsDirty = true, ghostState = null, ghostList = [], tintList = [];
  // Stage 3: the danger and score interfaces, made below once their context exists. Until then (afterCommand can run
  // during construction) seams() is empty, so nothing calls them early.
  let danger = null, scoreUi = null;
  let toastLow = null;   // { dock, mode, sheet, layout } while the toast sits low after a touch tick (leavePlan, setToastLow)
  const seams = () => [danger, scoreUi].filter(Boolean);
  let saveFailed = false, destroyed = false;
  // The guidance row's controller (syncGuidance, below) runs from the tips' and captions' callbacks, which may fire
  // before it is wired up; until then it does nothing.
  let guidanceWired = false;
  let openCtx = null, measureKey = '', paintedOpen = null;   // the open guidance row's context, the last measure's key, which row was last painted open
  const tipOnScreen = () => Boolean(tips.current()) && (!phone() || guidanceKind() === 'tip');
  // Daily goals (spec 3.7) come from the device's local date, read once when this game starts, so nothing expires
  // mid-session (a session that crosses midnight keeps its goals; the next start draws the new day).
  const sessionDate = dateKeyOf(clock());

  const settings = givenSettings || createSettings({ storage, root });
  // A loaded or imported city follows this device's Help setting: under Tips only or Off its guide is turned off
  // (an exported city carries guide.on to another device). A new city already starts that way (boot.js).
  if (settings.get().help !== 'full' && world.guide.on) setGuide(world, false);
  // A city migrated from version 1 has null firsts and achievements until they are checked: mark the ones already met
  // now, silently (no gold, no captions), so the summary and Welcome back count them from the first look.
  if (world.firsts === null) checkFirsts(world);
  if (world.achievements === null) checkAchievements(world);
  const sfx = givenSfx || createSfx({ enabled: () => settings.get().sound, canVibrate: () => settings.get().vibration });
  // The input type starts as the device's main pointer (a mouse's fine pointer, else touch) and follows every press on the map
  // (input.js) and every click elsewhere, a card picked included, so a drawing tool's first words fit the hand that picked it
  // (placement review P3).
  const fine = Boolean(win.matchMedia && win.matchMedia('(pointer: fine)').matches);
  const store = createStore({ ...INITIAL_UI_STATE, layout: pickLayout(view().width, view().height), inputType: fine ? 'mouse' : 'touch', ...(welcome ? { lastSpeed: welcome.lastSpeed } : {}) });
  const toasts = createToasts({ container: $('toasts'), max: () => (store.get().layout === 'wide' ? MAX_TOASTS : MAX_TOASTS_PHONE) });
  const effects = createEffects({ reducedMotion: settings.reducedMotion });
  // Tips and the idle nudge (early-game pass 3.4, 3.5): quiet, never over the map, both off under Help: Off. frameNow is
  // the latest frame's time, so the nudge counts only time the player actually watched. The tips' 3-minute gap and
  // five-an-hour cap count play time (playMs), which runs only while the game does. On a phone a tip closes itself after
  // TIP_AUTO_CLOSE_MS of tipMs (ruling 171): unpaused play with the tip on screen, counted on the frames actually drawn
  // (a stalled frame counts a second at most), so a paused game, a sheet over it or a hidden tab never closes it unread.
  let frameNow = now(), lastFrameAt = null, playMs = 0, tipMs = 0;
  const phone = () => store.get().layout !== 'wide';
  // On a landscape phone at 125% or 150% text only one row sits under the top bar (ruling 172): while a banner is up the
  // alert row has it, so the guidance row steps aside as it does for a sheet (tips and captions wait).
  const alertHasRow = () => store.get().layout === 'compact' && settings.get().textSize >= 125 && root.classList.contains('has-banner');
  const tips = createTips({
    container: $('tip'), settings, now, playNow: () => playMs, frameNow: () => tipMs, autoCloseMs: () => (phone() ? TIP_AUTO_CLOSE_MS : 0),
    restoreFocus: () => handGuidanceFocus(guidance === undefined ? null : guidance),   // Got it's button is gone: on to what has the row now
    onChange: () => guidanceChanged(), onToggle: () => toggleGuidance(),
  });
  // Celebrations (early-game pass 3.6) replace the goal and milestone toasts. Created this early because afterCommand
  // (hoisted) forwards settle's events to onEvents, which shows them. On a phone they take the guidance row (spec 6.3,
  // rulings 163-165): a caption waits while a sheet, the overlay legend or a tip has the row, or the alert row has a
  // landscape phone's one row (behind a sheet or that alert row for 10 s at most, spec 6.3), and under a banner only info
  // captions show (the rest are in the Goals sheet's Recent list).
  const holdCaptions = () => { const s = store.get(); return phone() && Boolean(s.sheet || s.overlay || tips.current() || alertHasRow()); };
  const skipCaption = (item) => phone() && item.tier !== 'info' && root.classList.contains('has-banner');
  const celebrations = createCelebrations({ container: $('cheer'), hold: holdCaptions, skip: skipCaption, dropHeld: () => Boolean(store.get().sheet) || alertHasRow(), now, onChange: () => guidanceChanged(), onToggle: () => toggleGuidance() });
  const nudge = createNudge({ now: () => frameNow });
  const nudgeLine = el('p', { class: 'nudge-line', hidden: true });
  const nudgeRegion = el('div', { class: 'nudge', role: 'status', 'aria-live': 'polite' }, [nudgeLine]);   // stays rendered, so the line is announced when it appears
  let nudgeState = 'none';
  const helpOn = () => settings.get().help !== 'off';
  // A tip waits while a tool is active, and on a phone while a sheet, the overlay legend or (a landscape phone at large
  // text) the alert row has the row; a tip whose words are about that sheet or overlay (waits: false in data/tips.js) is
  // dropped unseen instead. On a phone a tip also waits while the game is paused (ruling 176), so a new player laying the
  // first road keeps the goal and Show me in sight; the per-frame flush shows it once Play is pressed. The Play tip is
  // the priority tip and never waits.
  const tipsBusy = (s) => isToolMode(s.mode) || (phone() && Boolean(s.sheet || s.overlay || alertHasRow() || world.speed === 0));
  const fireTip = (key) => tips.trigger(key, { busy: tipsBusy(store.get()) });
  const cameraControl = createCameraControl({ cam, view, reducedMotion: settings.reducedMotion, now });
  const placement = createPlacement({ world, store, afterCommand, effects, now });
  const speedControl = createSpeedControl({ world, store, afterCommand, onPausedHidden: () => toasts.show(T.pausedHidden), doc });
  const alerts = createAlerts({
    world, banner: $('banner'), live: $('live'), onView: viewAlert, onNewCritical: () => sfx.play('alert'), root,
    onAction: (a, kind) => { for (const s of seams()) s.onAlertAction(a, kind); },   // Stage 3: Pay tribute and the like
    getAlerts: () => (saveFailed ? [...alertsFor(world), { code: 'save_failed' }] : alertsFor(world)),
    phone: () => store.get().layout !== 'wide',                                     // the one-line alert row (ruling 167)
  });
  // Web Audio needs a user gesture before it plays (spec 5.5). A touch pointerdown is not an activation event
  // (pointerup and keydown are), so all three listen; they go once the context is running. While sound is off,
  // or the context has not resumed yet, unlock() returns false and they stay for the next gesture.
  const GESTURES = ['pointerdown', 'pointerup', 'keydown'];
  const onGesture = () => { if (sfx.unlock()) for (const t of GESTURES) root.removeEventListener(t, onGesture); };
  for (const t of GESTURES) root.addEventListener(t, onGesture);
  // Stage 3: the idle frame-rate cap (spec 5.6, render/ambient.js) counts from the last input.
  const frameGate = createFrameGate();
  // pointermove and touchmove keep a held pan or pinch counted as input (a drag sends moves, not repeated pointerdowns).
  const INPUTS = ['pointerdown', 'pointermove', 'touchmove', 'keydown', 'wheel'];
  const onInput = () => frameGate.noteInput(now());
  for (const t of INPUTS) root.addEventListener(t, onInput);
  // Set after the click has done its work (the bubble phase at the root): the confirm bar rebuilds when the state changes, and a
  // rebuild between a press and its click would lose the click. A click from the keyboard has no pointer type and changes nothing.
  const onPress = (ev) => { if (ev.pointerType) store.set({ inputType: ev.pointerType === 'pen' ? 'pen' : ev.pointerType === 'touch' ? 'touch' : 'mouse' }); };
  root.addEventListener('click', onPress);
  const panelMinimap = createMinimap({ world, cam, view, size: 160, dpr: renderer.dpr });
  const sheetMinimap = createMinimap({ world, cam, view, size: 200, dpr: renderer.dpr });

  const speedBar = el('div', { class: 'speed-bar' });
  speedControl.mountBar(speedBar);
  const hud = createHud({
    world, store, container: $('topbar'), speedBar, onOpenSummary: () => toggleSheet('summary'), onOpenMenu: () => toggleSheet('menu'),
    // The long date ("Year 2, month 1, day 1") only where the wide top bar has room for it beside a real city's numbers:
    // 1000 px and wider, below 150% text. Narrower, it would push the last number onto a second row.
    shortDate: () => store.get().layout !== 'wide' || settings.get().textSize >= 150 || view().width < WIDE_LONG_DATE_PX,
  });
  const dock = createDock({ container: $('dock'), store, world, onPick: pick });
  const confirmBar = createConfirmBar({ container: $('ui'), store, placement, onCancel: () => placement.cancel(), onConfirm: (type) => confirm(type), onUndo: undo });
  // The Layers picker (placement review P2): one popover for the corner button on a phone and one under the minimap on a wide
  // screen, sharing store.layersOpen; the layout's own host shows the one that counts. Closing it with focus inside hands focus
  // back to the Layers button that opened it.
  const toggleLayers = () => { const s = store.get(); store.set({ layersOpen: !s.layersOpen }); };
  const restoreLayersFocus = () => { const b = store.get().layout === 'wide' ? sidePanel.layersButton : corners.layersButton; if (b && b.offsetParent !== null) b.focus({ preventScroll: true }); };
  const cornerPicker = createLayersPicker({ store, restoreFocus: restoreLayersFocus, doc });
  const panelPicker = createLayersPicker({ store, restoreFocus: restoreLayersFocus, doc });
  const sidePanel = createSidePanel({ container: $('panel'), store, world, onPick: pick, minimapNode: panelMinimap.canvas, onLayers: toggleLayers, pickerNode: panelPicker.node });
  const rail = createRail({ container: $('rail'), store, world, onPick: pick });
  const guide = createGuide({ world, store, root, reducedMotion: settings.reducedMotion });   // after the dock, panel and rail, so its store subscription runs after theirs
  const legend = createOverlayLegend({ container: $('legend'), store, world });
  const corners = createCorners({ container: $('corners'), store, speedControl, onMinimap: () => toggleSheet('minimap'), onOverlay: toggleLayers, pickerNode: cornerPicker.node, alertCount: () => alerts.count(), viewHeight: () => view().height });
  // The next-threshold bar (spec 4.1): on a phone only in calm portrait play, outside the guide (a tip, a caption or a
  // sheet already takes the whole guidance row; a banner or a tool keeps the bar away too).
  const barAllowed = () => {
    const s = store.get();
    return s.layout === 'wide' || (s.layout === 'portrait' && !guideActive(world) && !isToolMode(s.mode) && !root.classList.contains('has-banner'));
  };
  const goalsStrip = createGoalsStrip({ container: $('goals'), world, onShowMe: showMe, onOpen: () => toggleSheet('goals'), onSkipGuide: skipGuide, onToggle: () => toggleGuidance(), phone, barAllowed });
  $('goals').append(nudgeRegion);                      // the nudge's one line sits under the strip and hides with it (early-game pass 3.5)
  // Stage 3 seams (the Stage 3 plan's contract): the danger interface (Track D, ui/danger.js) and the score interface
  // (Track E, ui/scoreUi.js) plug in here, each as one object with its own sheets, sheet parts, event, refresh and
  // alert-action hooks. Screenshot mode (spec 4.19) is the interface's own; both may enter it through the context.
  const screenshotMode = () => store.set(enterScreenshot(store.get()));
  const seamCtx = {
    world, store, settings, sfx, toasts, celebrations, effects, cameraControl, speedControl, alerts, root, doc, now, clock, hooks,
    afterCommand, refresh, onView: viewAlert, showMeAt, selectBuilding, screenshotMode, fireTip,
  };
  danger = createDanger(seamCtx);
  scoreUi = createScoreUi(seamCtx);
  const ambient = createAmbient({ enabled: () => settings.get().ambient && !settings.reducedMotion() });
  const menus = createMenuSheets({
    store, settings, toasts, hooks, onNewCity: typeof hooks.newCity === 'function' ? hooks.newCity : () => {},
    canResumeGuide: () => canResumeGuide(world, settings.get().help), onResumeGuide: () => { setGuide(world, true); refresh(); },
    onScreenshot: screenshotMode,
  });
  // Choosing Tips only or Off turns a running guide off at once (spec 3.1: all of it can be switched off).
  // Choosing Guide and tips again does not restart it; Resume guide in How to play does. A new text size can wrap the
  // side panel's tabs to more rows, so the panel measures them again.
  let lastHelp = settings.get().help;
  const stopSettingsWatch = settings.subscribe((v) => {
    sidePanel.render();
    corners.render();                                    // a new text size moves the tray's top edge: the corners may need to step away from it (or back)
    if (v.help === lastHelp) return;
    lastHelp = v.help;
    if (v.help !== 'full' && world.guide.on) { setGuide(world, false); refresh(); }
  });
  const customSheets = {
    ...menus, goals: goalsSheet(world, { onShowMe: showMe, recent: () => celebrations.recent(), skipHere: phone, onSkipGuide: skipGuide }),
    trade: tradeSheet({ world, afterCommand, onShowMe: showMeAt, toast: (text) => toasts.show(text) }),
    ...danger.sheets, ...scoreUi.sheets,
  };
  if (welcome) {
    customSheets.welcome = welcomeSheet({
      world, savedAt: welcome.savedAt, lastSpeed: welcome.lastSpeed, now: clock, getAlerts: () => alerts.list(), onView: viewAlert,
      onCarryOn: (speed) => { store.set(closeSheet(store.get())); speedControl.set(speed); },
      onStayPaused: () => store.set(closeSheet(store.get())),
    });
  }
  Object.assign(customSheets, extraSheets);
  const sheets = createSheets({ container: $('sheet'), store, world, placement, cameraControl, minimap: sheetMinimap, getAlerts: () => alerts.list(), onView: viewAlert, onShowMe: showMeAt, onFixAlert: fixAlert, onSelect: selectBuilding, afterCommand, custom: customSheets, parts: [scoreUi.sheetParts, danger.sheetParts] });
  createDialog({ container: $('dialog'), store });
  const backStack = createBackStack({ store, history, addListener, removeListener });
  backStack.start();
  const stopLayout = watchLayout({ root, getSize: view, subscribe: subscribeResize, onChange: (layout) => store.set({ layout }) });
  const stopVisibility = speedControl.watchVisibility();

  // Screen point -> tile, clamped onto the map, so drags past the edge still mean the edge tile.
  const tileUnder = (x, y) => {
    const t = screenToTile(cam, view(), x, y);
    const c = (v) => Math.max(0, Math.min(world.size - 1, Math.floor(v)));
    return { x: c(t.x), y: c(t.y) };
  };
  const reachOf = (def) => def.reach || def.supplyReach || def.producerReach || 0;
  function tooltipText(b) {
    const def = BUILDINGS[b.type];
    const parts = [buildingName(b.type)];
    if (def.workers) parts.push(`${T.workers.toLowerCase()} ${b.staff} of ${def.workers}`);
    if (reachOf(def)) parts.push(`${T.reach.toLowerCase()} ${reachOf(def)}`);
    const land = CONDITION_TEXT.terrainLine(b.type);   // a farm or a mine says what ground it stands on (placement review P15)
    if (land) parts.push(land.toLowerCase());
    return parts.join(', ');
  }

  // A card was picked: the ghost starts a little above mid-screen (on a phone, in the middle of the map the rows above
  // and the confirm bar below leave free, ruling 168) and lands on the nearest tile where it fits (spec 6.5, early-game
  // pass 2.6). That tile can be up to ten tiles away, so the view follows it off screen.
  function pick(item) {
    const v = view(), s = store.get();
    const at = s.layout === 'wide' ? { x: v.width / 2, y: v.height * 0.4 } : middleOf(placingInsets(s));
    const c = screenToTile(cam, v, at.x, at.y);
    const tool = toolForItem(item);
    placement.start(tool, { x: c.x, y: c.y });
    const g = store.get().ghost;
    if (g && tool.kind === 'building') {
      const def = BUILDINGS[tool.type];
      cameraControl.keepVisible(g.x + def.w / 2, g.y + def.d / 2, placingInsets(store.get()));
    }
  }
  const closeAnySheet = () => { const s = store.get(); if (s.sheet) store.set(closeSheet(s)); };
  // Show me (spec 4.1, early-game pass 2.6 and 2.10): close any sheet, open the right card, start its tool, pan to
  // the place and pulse it. A building's ghost lands on the nearest tile where it fits around the place, so it
  // never starts on top of a home, and the view keeps the ghost on screen even when that tile is several tiles
  // off. On a phone the place sits in the middle of the map left free below the rows (ruling 168). The goals strip, the
  // goals sheet and the house sheet all come through here.
  function showMeAt({ category, item, x, y }) {
    closeAnySheet();
    store.set(pickCategory(store.get(), category || categoryOfItem(item)));
    const tool = toolForItem(item);
    const def = tool.kind === 'building' ? BUILDINGS[tool.type] : null;
    placement.start(tool, def ? { x: x - def.w / 2, y: y - def.d / 2 } : null);   // road, plot and demolish tools ignore the point
    const g = def ? store.get().ghost : null;
    const keep = g ? { x: g.x + def.w / 2, y: g.y + def.d / 2 } : { x, y };
    if (store.get().layout !== 'wide') cameraControl.frameKeeping(x, y, keep.x, keep.y, placingInsets(store.get()));
    else if (g) cameraControl.panToKeeping(x, y, keep.x, keep.y, placingInsets(store.get()));
    else cameraControl.panTo(x, y);
    const at = now();
    for (let i = 0; i < SHOW_ME_PULSES; i++) effects.pulse(x, y, at + i * SHOW_ME_PULSE_MS);
  }
  // A goal's Show me: the next building it still needs, at its target. A goal with nowhere to point (debt)
  // opens the city summary instead, and the trade route goal, once a trading post stands, opens that post's trade
  // sheet: the route is opened there, not by placing another post.
  function showMe(goal) {
    if (goal.id === 'trade_route') {
      const post = allBuildings(world).find((b) => b.type === 'trading_post');
      if (post) { selectBuilding(post.id); store.set(openSheet(store.get(), 'trade', post.id)); return; }
    }
    if (!goal.showMe) { closeAnySheet(); store.set(openSheet(store.get(), 'summary')); return; }
    const item = nextItemFor(world, goal) || goal.showMe.item;
    const t = showMeTarget(world, goal);
    showMeAt({ category: categoryOfItem(item) || goal.showMe.category, item, x: t.x, y: t.y });
  }
  // The tick (spec 6.5, 6.7, placement review P6). A mouse or the keyboard keeps placing repeatedly; a touch or pen tick ends the
  // tool: the map goes to Browse, the dock is as it was when the card was picked (the tray on the same category, so the same
  // card is one tap away) and a service's overlay stays on. A building is panned the least that keeps the whole of it in sight
  // (leavePlan says where, and whether the toast moves or the map zooms out to make room).
  // `type` is the input type of the press ('touch', 'pen', 'mouse', 'keyboard'); nothing means keep placing.
  function confirm(type) {
    const before = store.get();
    const r = placement.confirm();
    if (!r.ok) { toasts.show(reasonText(r.reason)); return r; }
    if ((type === 'touch' || type === 'pen') && before.tool) {
      store.set(cancelTool(store.get()));
      if (before.tool.kind === 'building' && before.ghost) {
        const def = BUILDINGS[before.tool.type];
        // The whole drawn building is kept in the free band, not just its ground: it rises above the tile's centre by its height
        // plus the back half of its footprint (iso.js p(): the sprite's origin is the footprint's back corner) and drops by
        // the front half. A phone's band is narrow (the legend above, the toast and corners below), so the margin is small.
        const art = ART[before.tool.type];
        const extent = { up: (art ? art.height : 0) + 4 * (def.w + def.d), down: 4 * (def.w + def.d) };
        const portrait = store.get().layout === 'portrait';
        const margin = portrait ? LEAVE_MARGIN_PX : FRAME_MARGIN_PX;
        const need = (extent.up + extent.down) * pxPerArt(cam) + 2 * margin;
        const plan = leavePlan(store.get(), need, margin);
        setToastLow(plan.toastLow);
        cameraControl.keepVisible(before.ghost.x + def.w / 2, before.ghost.y + def.d / 2, plan.insets, margin, undefined, extent, plan.zoom);
      }
    }
    return r;
  }
  // Where a new building goes once a touch tick has ended the tool, kept whole (`need` px tall with its margins) and clear of the
  // rows under the top bar (the overlay legend stays on), the "placed · Undo" toast and the corner buttons, which ride on the
  // dock with the toast on them. On a phone held upright, in this order:
  // 1. the band between the rows above and the toast, when it is tall enough;
  // 2. at large text it is not, but the tray can be shorter than the room kept for it, leaving free map under the corner buttons:
  //    when the toast fits there, it moves down into it (toastLow: its bottom, px above the map's bottom edge) and the building
  //    takes the band between the rows above and the corner buttons;
  // 3. the free map under the corner buttons itself, when that alone holds the building;
  // 4. else the band above the toast, with the map zoomed out just enough for the building to fit it (never past the least zoom).
  // Every other layout keeps the sheet's insets.
  function leavePlan(s, need = 0, margin = 0) {
    const i = sheetInsets(s);
    const plain = { insets: i, toastLow: null, zoom: null };
    if (s.layout !== 'portrait') return plain;
    const h = view().height;
    const top = Math.max(TOPBAR_PX, freeTop(root, canvas, s.layout));
    const corners = cornersHeight(root, canvas, h) || placingInsets(s).bottom;
    const toast = $('toasts') ? $('toasts').getBoundingClientRect().height : 0;
    const withToast = corners + (toast > 0 ? toast + 8 : 0);
    if (h - top - withToast >= need) return { ...plain, insets: { ...i, top, bottom: withToast } };
    const dock = $('dock') ? $('dock').getBoundingClientRect().top - canvas.getBoundingClientRect().top : 0;
    const under = cornersBottom(root, canvas);
    const gap = dock > 0 && under > 0 ? dock - under : 0;
    if (toast > 0 && gap >= toast + 8 && h - top - corners >= need) {
      return { insets: { ...i, top, bottom: corners }, toastLow: h - dock + Math.round((gap - toast) / 2), zoom: null };
    }
    if (gap >= need) return { ...plain, insets: { ...i, top: under, bottom: h - dock } };
    const band = h - top - withToast;
    const zoom = band > 2 * margin && need > 2 * margin ? cam.zoom * (band - 2 * margin) / (need - 2 * margin) : MIN_ZOOM;
    return { insets: { ...i, top, bottom: withToast }, toastLow: null, zoom: Math.max(MIN_ZOOM, Math.min(cam.zoom, zoom)) };
  }
  // The toast moved down into the free map under the corner buttons (leavePlan, step 2), or put back (null). It goes back by
  // itself once no toast is showing, or when the dock, the mode, a sheet or the layout changes. toastLow is declared at the top.
  function setToastLow(px) {
    if (px === null) {
      if (toastLow === null) return;
      toastLow = null;
      root.classList.remove('toast-low');
      root.style.removeProperty('--toast-low');
      return;
    }
    const s = store.get();
    toastLow = { dock: s.dock, mode: s.mode, sheet: s.sheet, layout: s.layout };
    root.style.setProperty('--toast-low', `${px}px`);
    root.classList.add('toast-low');
  }
  store.subscribe((s) => {
    if (toastLow && (s.dock !== toastLow.dock || s.mode !== toastLow.mode || s.sheet !== toastLow.sheet || s.layout !== toastLow.layout)) setToastLow(null);
  });
  function undo() {
    if (!placement.canUndo()) return;
    if (placement.undoNeedsConfirm()) store.set({ confirmDialog: { text: T.undoOccupiedConfirm, confirmLabel: T.undo, onConfirm: () => placement.undo() } });
    else placement.undo();
  }
  // Skip guide (spec 3.2): one tap, no confirm. Resume guide in How to play brings it back.
  function skipGuide() { setGuide(world, false); refresh(); }
  // startDaily does nothing before the opening chain is done or once that date's goals exist, so calling it at
  // start, after every command and on every new game day is cheap: it draws the moment the chain finishes.
  function syncDaily() { startDaily(world, sessionDate); }
  function toggleSheet(kind) {
    const s = store.get();
    store.set(s.sheet && s.sheet.kind === kind ? closeSheet(s) : openSheet(s, kind));
  }
  function goBack() { const p = back(store.get()); if (p) store.set(p); }
  // plots_no_road stands for many plots: View goes to the one nearest the middle of the map on screen (placement review P13).
  function nearestPlot(alert) {
    const v = view();
    return nearestOf(world, alert, screenToTile(cam, v, v.width / 2, v.height / 2));
  }
  // The fix button on an alert in the list (Show me): the road tool, aimed at the nearest plot with no road.
  function fixAlert(alert) {
    const b = alert.code === 'plots_no_road' ? nearestPlot(alert) : null;
    if (b) showMeAt({ category: 'roads', item: 'road', x: b.x + b.w / 2, y: b.y + b.d / 2 });
  }
  // View on an alert: a building's alert selects it and pans there; a city-wide one opens the summary.
  function viewAlert(alert) {
    if (alert.code === 'save_failed') { store.set(openSheet(store.get(), 'menu')); return; }
    if (alert.code === 'plots_no_road') { const b = nearestPlot(alert); if (b && selectBuilding(b.id)) return; }
    if (!(alert.id && selectBuilding(alert.id))) store.set(openSheet(store.get(), 'summary'));
  }
  // Select a building: its sheet opens and the view centres on it, then moves the least that keeps it in the map
  // the sheet leaves free (spec 6.3), so a tall portrait sheet never covers it. On a phone it is framed in the middle
  // of the map between the rows under the top bar and the sheet (ruling 168). An alert's View and a house sheet's View
  // share this.
  function selectBuilding(id) {
    const b = world.buildings[id];
    if (!b) return false;
    store.set(select(store.get(), b.id));
    const s = store.get(), cx = b.x + b.w / 2, cy = b.y + b.d / 2;
    if (s.layout === 'wide') cameraControl.panToKeeping(cx, cy, cx, cy, sheetInsets(s));
    else cameraControl.frameKeeping(cx, cy, cx, cy, sheetInsets(s));
    return true;
  }
  const plotsTouchRoad = (e) => !e.result || !e.result.ids || e.result.ids.some((id) => world.buildings[id] && touchesRoad(world, world.buildings[id]));   // no list to check: as before
  function afterCommand(e) {
    if (e.undoable) {                                  // a ✓ outcome: place, road, plots or demolish
      sfx.play(e.kind === 'road' ? 'road' : e.kind === 'demolish' ? 'demolish' : 'place');
      sfx.buzz(20);
    }
    nudge.noteAction();                                // a command is a meaningful action (early-game pass 3.5)
    // The Play tip says the plots stay empty while paused: true only when one of them touches a road (placement review P14).
    if (e.undoable && e.kind === 'houses' && world.speed === 0 && plotsTouchRoad(e)) fireTip('plotsPaused');
    if (e.undoable && e.kind === 'building' && store.get().tool && AUTO_OVERLAY[store.get().tool.type] && BUILDINGS[store.get().tool.type].reach) fireTip('servicePlaced');   // a reach tip: a garden has none
    if (e.undoable && e.kind === 'demolish') fireTip('demolished');
    if (e.undoable && e.kind === 'building' && store.get().tool && store.get().tool.type === 'storehouse') fireTip('storehousePlaced');
    if (e.undoable && e.kind === 'building' && store.get().tool && store.get().tool.type === 'trading_post') fireTip('tradingPostPlaced');
    if (e.kind === 'speed' && world.speed > 0 && tips.current() === 'press_play') tips.dismiss();   // its condition has cleared
    for (const s of seams()) s.onCommand(e);           // Stage 3: the interfaces see every command (a well's ripple, a tip)
    ghostsDirty = true;
    // Goals, firsts, achievements and daily goals settle after every command (undo and speed included), so a
    // guided step finishes while the game is paused (early-game pass 3.2).
    const events = settle(world, []);
    if (events.length) { effects.fromEvents(world, events, now()); onEvents(events); }
    syncDaily();
    // Celebrations from the same command are captions in #cheer, not toasts, so nothing pushes the command's Undo toast out.
    if (e.undoable) toasts.show(e.text, { action: T.undo, onAction: undo, ms: UNDO_TOAST_MS });
    else if (e.kind === 'undo') toasts.show(T.undone);
    refresh();
  }
  // After a command: alerts, numbers, cards (affordability) and the open sheet all reflect the new world.
  function refresh() {
    refreshChrome();
    sheets.render();
  }
  // Once per game day: the same, so an open sheet's numbers keep up with the game. The sheet is rebuilt
  // unless keyboard focus is inside it (a rebuild would drop that focus); it catches up on the next command.
  function refreshDaily() {
    refreshChrome();
    const sheet = $('sheet');
    if (sheet && !sheet.contains(doc.activeElement)) sheets.render();
  }
  function refreshChrome() {
    alerts.refresh();
    hud.render(); dock.render(); sidePanel.render(); rail.render(); guide.render(); confirmBar.render(); corners.render(); legend.render(); goalsStrip.render();
    measureKey = '';                                   // a goal's words may have changed: "More ▾" is measured again next frame
    setText($('map-summary'), mapSummaryText(world, alerts.list()));
    // Tips that follow the alerts: asked for whenever a problem marker is on the map or a labour shortage is on, not only when
    // one first appears, because the gap or a tool may have turned the tip away then. Seen tips and the first 10 s turn the
    // question down cheaply, so a saved city never meets a tip on load. Goal progress feeds the nudge.
    const list = alerts.list();
    if (list.some((a) => a.id !== undefined && a.id !== null)) fireTip('problemMarker');
    if (list.some((a) => a.code === 'labour_shortage')) fireTip('labourShortage');
    nudge.noteProgress(progressSignature());
    for (const s of seams()) s.refresh();
    syncGuidance();                                    // another goal, or a tip or caption gone, closes the row opened in place
  }
  // Goal progress as one string: the nudge starts again whenever it changes (early-game pass 3.5).
  function progressSignature() {
    const [goal] = openGoals(world, 1);
    const p = goal ? goalProgress(world, goal) : null;
    return `${world.goals.completed.length}|${goal ? goal.id : ''}|${p ? p.n : ''}`;
  }

  // Autosave (spec 4.17): every game month and whenever the page is hidden. A failing save shows the
  // "save failing" banner (spec 6.3) until a save succeeds again.
  function setSaveFailed(flag) {
    if (destroyed || flag === saveFailed) return;
    saveFailed = flag;
    alerts.refresh();
    corners.render();
    goalsStrip.render();                               // the threshold bar steps aside for the banner on a phone
  }
  async function autosave(reason) {
    if (destroyed || typeof hooks.save !== 'function') return;
    let ok = false;
    try { ok = await hooks.save(reason); } catch (e) { ok = false; }
    setSaveFailed(!ok);                 // a no-op if the UI was destroyed while the save was in flight
  }
  // Celebrations queue in #cheer one at a time (early-game pass 3.6); each one's sound, buzz and sparkle come with its caption.
  function onEvents(events) {
    for (const e of events) if (e.type === 'month') { autosave('month'); break; }
    // Town brings a goal, the milestone and an achievement at once: the milestone and the goal are celebrated and the
    // achievement stays in the summary list, so a batch never queues three captions for one moment.
    const quiet = events.some((e) => e.type === 'milestone');
    for (const e of events) {
      if (e.type === 'upgrade') sfx.play('upgrade');
      else if (e.type === 'arrivals') fireTip('arrivals');
      else if (e.type === 'month') fireTip('monthEnd');
      else if (e.type === 'goal') fireTip('goalDone');
      const cheer = e.type === 'achievement' && quiet ? null : cheerFor(e);
      if (cheer) celebrations.show(cheer);
    }
    speedControl.render();                             // the sim may have changed the speed (a first fire or raid warning)
    for (const s of seams()) s.onEvents(events);
  }
  function cheerSound() { sfx.play('goal'); sfx.buzz(20); }
  // The caption for one sim event, or null. Achievements stay quiet while the guide runs (spec 3.8): the sim
  // still records them, and the summary shows them as done once the guide ends.
  function cheerFor(e) {
    if (e.type === 'milestone') {
      const m = MILESTONES.find((x) => x.id === e.id);
      return { tier: 'milestone', text: milestoneText(m ? m.name : e.id), onShow: () => { sfx.play('milestone'); sfx.buzz(40); } };
    }
    if (e.type === 'goal') {                           // on a phone it reads as the strip itself changing: "✓ Lay a road +25 gold"
      const g = goalById(e.id);
      return g ? { tier: 'first', lead: `${T.goalDone}: `, text: g.text, icon: phone() ? T.doneMark : null, reward: e.reward, onShow: cheerSound } : null;
    }
    if (e.type === 'first') {
      if (!FIRST_TEXT[e.id]) return null;
      const at = Number.isFinite(e.x) && Number.isFinite(e.y) ? { x: e.x, y: e.y } : null;
      return { tier: 'first', text: FIRST_TEXT[e.id].head, why: FIRST_TEXT[e.id].why, reward: e.reward, onShow: () => { cheerSound(); if (at) effects.sparkle(at.x, at.y, GOLD, now()); } };
    }
    if (e.type === 'achievement') {
      if (guideActive(world) || !ACHIEVEMENT_NAMES[e.id]) return null;
      return { tier: 'first', text: `${T.achievement}: ${ACHIEVEMENT_NAMES[e.id]}`, why: ACHIEVEMENT_TEXT[e.id], onShow: cheerSound };
    }
    if (e.type === 'daily') return DAILY_TEXT[e.id] ? { tier: 'first', text: `${T.dailyDone}: ${DAILY_TEXT[e.id]}`, reward: e.reward, onShow: cheerSound } : null;
    if (e.type === 'guide_done') return { tier: 'first', text: T.guideDone, reward: e.reward, onShow: cheerSound };
    if (e.type === 'caravan') { const c = caravanText(e); return { tier: 'first', text: c.text, why: c.why, onShow: cheerSound }; }
    return null;
  }
  // The "update ready" toast (spec 6.3) waits until no tool is active; Restart saves, then reloads (boot.js). On a phone
  // it is kept (ruling 177): outside the one-toast rule, with no timer, so the next Undo toast never takes its Restart
  // away; it goes when Restart is used or its ✕ closes it (an update not taken is offered again the next time the game opens).
  let pendingUpdate = null, updateToast = null;
  function showUpdateToast() {
    if (!pendingUpdate || isToolMode(store.get().mode)) return;
    const apply = pendingUpdate;
    pendingUpdate = null;
    if (updateToast) toasts.hide(updateToast);         // an offer made again replaces the one still up
    updateToast = toasts.show(T.updateReady, {
      action: T.restart, ms: UPDATE_TOAST_MS, keep: phone(), close: T.close,
      onAction: async () => {
        let ok = true;
        try { ok = (await apply()) !== false; } catch (e) { ok = false; }
        if (ok || destroyed) return;
        toasts.show(T.updateSaveFailed);                // the update waits; a later browse moment offers it again
        pendingUpdate = apply;
      },
    });
  }
  function offerUpdate(apply) { pendingUpdate = apply; showUpdateToast(); }
  // Registered after the speed control's own listener, so the game is already paused when this save is taken.
  const onVisibility = () => { if (doc.hidden) autosave('hidden'); };
  doc.addEventListener('visibilitychange', onVisibility);

  const actions = {
    tap({ x, y, type }) {
      const s = store.get();
      if (s.screenshot) { store.set({ screenshot: false }); return; }   // a tap or click brings the interface back (spec 6.4)
      if (s.guidanceOpen) setGuidanceOpen(false);                       // a tap on the map closes the guidance row opened in place (P8); the tap still does its own work
      const t = tileUnder(x, y);
      if (isToolMode(s.mode)) {
        if (s.tool.kind === 'building' && type === 'mouse') { placement.moveGhost(t.x, t.y); confirm(); }   // a click places (spec 6.5)
        else if (s.tool.kind !== 'building' && type !== 'mouse') placement.toggleTile(t.x, t.y);             // a finger or pen adds or takes off one tile (placement review P3)
        else placement.pointAt(t.x, t.y);                                                                      // a tap moves the ghost or sets a point
        return;
      }
      const b = pickBuilding(world, cam, view(), x, y);
      if (b) store.set(select(s, b.id));
      else if (s.mode === 'selected') store.set(deselect(s));
    },
    secondary: goBack,
    hover(p) {
      const s = store.get();
      if (s.mode === 'placing' && p) {                 // the ghost follows the mouse, re-set only when it moves a tile
        const t = tileUnder(p.x, p.y);
        const g = snapGhost(world, s.tool, t.x, t.y);
        if (!s.ghost || g.x !== s.ghost.x || g.y !== s.ghost.y) placement.moveGhost(t.x, t.y);
        return;
      }
      const b = p ? pickBuilding(world, cam, view(), p.x, p.y) : null;
      const id = b ? b.id : null;
      if (id !== s.hoverId) { store.set({ hoverId: id }); canvas.title = b ? tooltipText(b) : ''; }
    },
    ghostDragStart({ x, y }) {
      const s = store.get();
      if (!s.ghost || !s.tool || s.tool.kind !== 'building') return false;
      const def = BUILDINGS[s.tool.type];
      const t = screenToTile(cam, view(), x, y);
      return t.x >= s.ghost.x - 0.5 && t.x < s.ghost.x + def.w + 0.5 && t.y >= s.ghost.y - 0.5 && t.y < s.ghost.y + def.d + 0.5;
    },
    ghostDrag({ x, y }) { const t = tileUnder(x, y); placement.moveGhost(t.x, t.y); },
    ghostDragEnd() {},
    drawDrag({ x, y, phase }) { const t = tileUnder(x, y); placement.dragTo(t.x, t.y, phase); },
    // A finger's or pen's stroke in a drawing tool (placement review P3); 'cancel' takes it back.
    strokeDrag({ x, y, phase }) { if (phase === 'cancel') { placement.stroke(null, null, 'cancel'); return; } const t = tileUnder(x, y); placement.stroke(t.x, t.y, phase); },
    panStarted() {                                     // panning tucks the dock (spec 6.3); the confirm bar never tucks
      const s = store.get();
      if (s.layout === 'portrait' && !isToolMode(s.mode) && s.dock !== 'tucked') store.set(setDock(s, 'tucked'));
    },
  };

  const keyActions = {
    pause: () => speedControl.toggle(), speedUp: () => speedControl.faster(), speedDown: () => speedControl.slower(),
    category: (i) => {                                 // keys 1-7 keep their categories; one with no card to show does nothing (early-game pass 2.5, spec 4.14)
      const c = CATEGORIES[i];
      if (!c || !shownItems(world, c.id).length) return;
      const s = store.get();
      store.set(s.layout === 'wide' ? { category: c.id } : { category: c.id, dock: 'tray' });
    },
    rotate: () => {},                                  // nothing rotates in Stage 1 (mastabas come with monuments)
    minimap: () => toggleSheet('minimap'), overlay: () => legend.cycle(),
    confirm: () => {
      const s = store.get();
      if (s.confirmDialog) return;                     // a dialog's Enter belongs to its focused button (keyboard.js); never place behind the modal
      if (isToolMode(s.mode)) confirm();
    },
    // On a phone Esc closes a tip on screen first (spec 6.3, Small phones: Got it, Esc, its condition clearing or play
    // time), then goes Back; never ahead of an open sheet (the tip is off the screen under one). A wide screen keeps Esc
    // as Back (spec 6.8).
    back: () => { const s = store.get(); if (s.guidanceOpen || s.layersOpen) goBack(); else if (phone() && tipOnScreen() && !s.sheet && !s.confirmDialog && !s.screenshot) tips.dismiss(); else goBack(); },
    undo, help: () => toggleSheet('help'),
  };
  const mapInput = createMapInput({ canvas, cam, view, cameraControl, store, actions, root });
  const keyboard = createKeyboard({ target: keyTarget, settings, cam, cameraControl, actions: keyActions, hidden: () => Boolean(store.get().screenshot) });

  // The sheet's footprint in CSS px, so a selected building is panned into the part of the map it leaves free (in
  // compact with the corner buttons along the map's bottom, measured).
  function sheetInsets(s) {
    const v = view();
    if (s.layout === 'portrait') return phoneInsets(s, { right: 0, bottom: v.height * 0.6, left: 0 });
    if (s.layout === 'compact') return phoneInsets(s, { right: RAIL_PX + DRAWER_PX, bottom: cornersHeight(root, canvas, v.height), left: 0 });
    return { top: TOPBAR_PX, right: PANEL_PX, bottom: 0, left: 0 };
  }
  // The map a tool leaves free: in portrait the confirm bar and the corner buttons on it cover the bottom (allowed for,
  // not measured: a card is picked while the tray is open and the corners still ride above it).
  function placingInsets(s) {
    if (s.layout !== 'portrait') return sheetInsets(s);
    return phoneInsets(s, { right: 0, bottom: Math.min(view().height * 0.3, 240), left: 0 });
  }
  // A phone's free map starts below the rows under the top bar, measured (ruling 168). At large text they can reach far
  // down; the top then stops twice the camera's margin above the sheet or bar, so what is framed stays clear of that
  // panel even where the rows would cover it.
  function phoneInsets(s, sides) {
    const room = view().height - sides.bottom - 2 * FRAME_MARGIN_PX;
    return { top: Math.max(TOPBAR_PX, Math.min(freeTop(root, canvas, s.layout), room)), ...sides };
  }
  // The middle of the map the insets leave free, in screen px.
  function middleOf(i) {
    const v = view();
    return { x: i.left + (v.width - i.left - i.right) / 2, y: i.top + (v.height - i.top - i.bottom) / 2 };
  }
  function panelDetails() {
    const s = store.get();
    const b = s.hoverId !== null ? world.buildings[s.hoverId] : null;
    let text = T.hoverHint;
    if (b) text = tooltipText(b);
    else if (s.tool) { const c = cardInfo(world, activeItemOf(s.tool)); text = `${c.name}: ${c.costText}`; }
    setText(sidePanel.details, text);
  }
  let lastSelected = null, lastLayout = store.get().layout, lastStripLayout = store.get().layout, lastStripMode = store.get().mode;
  store.subscribe((s) => {
    root.dataset.mode = s.mode;
    if (s.layout !== lastLayout) { lastLayout = s.layout; alerts.refresh(); corners.render(); }   // the banner is one line on phones, full on wide screens
    if (s.layout !== lastStripLayout || s.mode !== lastStripMode) { lastStripLayout = s.layout; lastStripMode = s.mode; goalsStrip.render(); }   // one row on phones; the threshold bar steps aside for a tool
    if (pendingUpdate && !isToolMode(s.mode)) showUpdateToast();
    root.classList.toggle('has-overlay', Boolean(s.overlay));
    root.classList.toggle('screenshot', Boolean(s.screenshot));
    if (s.selectedId !== lastSelected) {
      lastSelected = s.selectedId;
      const b = s.selectedId !== null ? world.buildings[s.selectedId] : null;
      if (b) cameraControl.keepVisible(b.x + b.w / 2, b.y + b.d / 2, sheetInsets(s));   // spec 6.3
    }
    panelDetails();
  });
  root.dataset.mode = store.get().mode;
  // Tips and the nudge watch the interface: a tool starting (a card picked, Show me) and a sheet opening are
  // meaningful actions; a house sheet and an overlay turned on by hand have tips; a held tip shows once no tool is active.
  let seenMode = store.get().mode, seenSheet = store.get().sheet, seenOverlay = store.get().overlay;
  store.subscribe((s) => {
    const opened = Boolean(s.sheet) && s.sheet !== seenSheet;
    if ((isToolMode(s.mode) && !isToolMode(seenMode)) || opened) nudge.noteAction();
    if (opened && s.sheet.kind === 'info') {
      const b = world.buildings[s.sheet.id];
      if (b && b.type === 'house') {
        fireTip('houseSheet');
        if (b.tier >= 5) fireTip('desirabilityShown');   // its next tier needs a pleasant street (spec 4.7)
        if (b.tier === 5) fireTip('townhouseSheet');      // it grows by joining three plots beside it (spec 4.6)
      }
    }
    if (s.overlay && s.overlay !== 'ground' && s.overlay !== seenOverlay && !isToolMode(s.mode)) fireTip('overlayOn');   // Ground's legend says it all: the tip's dot and ring are other overlays'
    tips.flush({ busy: tipsBusy(s) });
    seenMode = s.mode; seenSheet = s.sheet; seenOverlay = s.overlay;
    syncGuidance();
  });
  // The guidance row (spec 6.3, rulings 163, 164, 168 and 172): on a phone one thing shows under the alert row, in this
  // order: the overlay legend, a tip, a caption, the goal; nothing while a sheet is open, or while a banner is up on a
  // landscape phone at 125% text or more (its one row is the alert row). root's data-guidance names it and the
  // stylesheet hides the rest; a tip that loses the row stays current, off the screen, and comes back when it has it again.
  // A wide screen keeps every row (no data-guidance). It is worked out again whenever the store, a tip or a caption
  // changes, and once a frame.
  let guidance, guidanceSyncing = false;
  // Keyboard focus and the guidance row (spec 6.8): the thing leaving the row is hidden (display: none) or rebuilt, which
  // would drop focus to the page. Focus inside the row moves to what comes in: Got it for a tip, the legend's ✕, Show me for
  // the goal; for a caption (no buttons) the banner's first button or the map, and for a sheet its first button. Focus put
  // there (parked) goes back to the row once the goal, a tip or the legend has it again, unless the player moved it on.
  // rowFocus is the row's element that last took focus, kept because a part rebuilt by its own store subscriber (the legend,
  // a tip) is gone before syncGuidance runs.
  let parkedFocus = null, rowFocus = null;
  const onScreen = (n) => Boolean(n) && n.isConnected && n.getClientRects().length > 0;
  const inGuidanceRow = (n) => Boolean(n) && ['goals', 'tip', 'cheer', 'legend'].some((id) => $(id).contains(n));
  const onFocusIn = (e) => { rowFocus = inGuidanceRow(e.target) ? e.target : null; };
  root.addEventListener('focusin', onFocusIn);
  function guidanceFocusTarget(kind) {
    const first = (scope, sel = 'button') => [...scope.querySelectorAll(sel)].find(onScreen) || null;
    if (kind === 'tip') return first($('tip'), '.got-it');
    if (kind === 'legend') return first($('legend'), '.close') || first($('legend'));
    if (kind === 'goal' || kind === null) return first($('goals'), '.show-me') || first($('goals'));
    if (kind === 'none' && store.get().sheet) { const b = first($('sheet')); if (b) return b; }
    return first($('banner')) || canvas;
  }
  function handGuidanceFocus(kind) {
    const target = guidanceFocusTarget(kind);
    if (!target) return;
    target.focus();
    parkedFocus = kind === 'caption' || kind === 'none' ? target : null;
  }
  function guidanceKind() {
    const s = store.get();
    if (!phone()) return null;
    if (s.sheet || alertHasRow()) return 'none';
    if (s.overlay) return 'legend';
    if (tips.current()) return 'tip';
    if (celebrations.showing()) return 'caption';
    return 'goal';
  }
  // The row opened in place (placement review P8, spec 6.3): a tap on a goal's words, or on "More ▾" of a tip or a caption, opens
  // it, and the row shows all its words (up to 40% of the screen's height, then it scrolls). store.guidanceOpen says so
  // (Back and Esc close it, the back stack counts it); openCtx remembers what it was opened over. It closes on a second tap,
  // a tap on the map, a sheet, a tool, an overlay or a screenshot taking over, a wide screen, or when the row's content changes
  // (another goal, the tip or caption gone).
  const rowKey = () => {
    const kind = guidanceKind();
    if (kind === 'goal') { const [g] = openGoals(world, 1); return g ? `goal:${g.id}` : null; }
    if (kind === 'tip') return `tip:${tips.current()}`;
    if (kind === 'caption') return 'caption:';
    return null;
  };
  function setGuidanceOpen(on) {
    const s = store.get();
    if (Boolean(on) === s.guidanceOpen) return false;
    if (on) {
      const key = phone() && !s.screenshot && !s.confirmDialog ? rowKey() : null;
      if (!key) return false;
      openCtx = { key, mode: s.mode, sheet: s.sheet, overlay: s.overlay };
    }
    store.set({ guidanceOpen: Boolean(on) });
    if (on) nudge.noteAction();                        // opening the row is a meaningful action: the idle nudge starts again
    return true;
  }
  const toggleGuidance = () => setGuidanceOpen(!store.get().guidanceOpen);
  function closeGuidanceIfStale() {
    const s = store.get();
    if (!s.guidanceOpen) return;
    const c = openCtx;
    if (!c || !phone() || s.sheet !== c.sheet || s.mode !== c.mode || s.overlay !== c.overlay || s.screenshot || s.confirmDialog || rowKey() !== c.key) setGuidanceOpen(false);
  }
  // The open row's tallest: the rest of the 40% the rows under the top bar may reach, from where the row starts.
  const guidanceRowOf = (kind) => ($(kind === 'tip' ? 'tip' : kind === 'caption' ? 'cheer' : 'goals'));
  function setOpenMax() {
    const c = openCtx, row = c && store.get().guidanceOpen ? guidanceRowOf(c.key.split(':')[0]) : null;
    if (!row) return 0;
    const top = Math.round(row.getBoundingClientRect().top - canvas.getBoundingClientRect().top);
    root.style.setProperty('--guidance-max', `${Math.max(OPEN_ROW_MIN_PX, Math.floor(OPEN_ROW_FRACTION * view().height - top))}px`);
    return top;
  }
  // Shows the row that is open as open, and the others as closed. Each part does only what changed.
  function paintGuidance() {
    const open = store.get().guidanceOpen && openCtx ? openCtx.key.split(':')[0] : null;
    goalsStrip.setOpen(open === 'goal'); tips.setOpen(open === 'tip'); celebrations.setOpen(open === 'caption');
    if (open === paintedOpen) return;
    paintedOpen = open;
    if (open) setOpenMax(); else { openCtx = null; root.style.removeProperty('--guidance-max'); }
  }
  // "More ▾" shows on a row whose words a phone cuts (and "Less ▴" on one that is open). Measured once a frame, but only when
  // what decides it has changed: the screen's size, the text size, which row is on show, a banner above it, how far down it starts.
  function measureGuidance() {
    const s = store.get(), v = view();
    const top = s.guidanceOpen ? setOpenMax() : 0;
    const key = [v.width, v.height, settings.get().textSize, guidanceKind(), s.guidanceOpen, top, root.classList.contains('has-banner')].join('|');
    if (key === measureKey) return;
    measureKey = key;
    goalsStrip.measure(); tips.measure(); celebrations.measure();
  }
  // A tip or a caption came or went: its words are measured again next frame (the key above is the same for the next caption).
  function guidanceChanged() { measureKey = ''; syncGuidance(); }
  function syncGuidance() {
    if (!guidanceWired || guidanceSyncing) return;
    closeGuidanceIfStale();
    guidanceSyncing = true;
    try {
      celebrations.resume();                           // a caption that waited for the row goes up as soon as it has it
      paintGuidance();
      const kind = guidanceKind();
      tips.setShown(kind === null || kind === 'tip');
      if (kind === guidance) return;
      guidance = kind;
      if (kind) root.dataset.guidance = kind;
      else delete root.dataset.guidance;
      if (!kind) return;                               // a wide screen hides nothing
      const current = document.activeElement, lost = current === document.body || current === null;
      if (rowFocus && (current === rowFocus || lost) && !onScreen(rowFocus)) { rowFocus = null; handGuidanceFocus(kind); return; }
      if (!parkedFocus) return;
      if (current !== parkedFocus && !lost) parkedFocus = null;   // the player moved on
      else if (kind === 'goal' || kind === 'tip' || kind === 'legend') handGuidanceFocus(kind);
    } finally { guidanceSyncing = false; }
  }
  guidanceWired = true;
  syncGuidance();

  // Ghosts are recomputed only when the UI state object changes or a command ran (previews call canPlace).
  function ghosts() {
    const s = store.get();
    if (s !== ghostState || ghostsDirty) {
      ghostState = s; ghostsDirty = false;
      ghostList = isToolMode(s.mode) ? placement.ghosts() : [];
      tintList = isToolMode(s.mode) ? placement.tint() : [];   // the desirability the ghost would change (spec 4.7)
    }
    return ghostList;
  }

  function render({ timeDays, now: t }) {
    if (lastFrameAt !== null) {                         // a stalled frame (a hidden tab, a long hitch) counts a second at most
      const dt = Math.min(NUDGE_MAX_STEP_MS, Math.max(0, t - lastFrameAt));
      if (world.speed > 0) playMs += dt;
      if (world.speed > 0 && tipOnScreen() && !store.get().guidanceOpen) tipMs += dt;   // an open tip's 20 s stops (P8)
    }
    lastFrameAt = t;
    frameNow = t;
    cameraControl.tick(t);
    if (toastLow && !$('toasts').querySelector('.toast')) setToastLow(null);   // the toast it was moved for has gone
    const s = store.get();
    const v = view();
    const range = visibleTileRange(cam, v, world.size);
    const selected = s.selectedId !== null ? world.buildings[s.selectedId] : null;
    const ring = guide.marker(t);                                              // the guide's ring on its step's target (spec 3.2)
    const still = { reducedMotion: settings.reducedMotion() };
    renderer.renderFrame(world, cam, {
      view: v, walkers: [...walkersAt(world, timeDays, range), ...unitsAt(world, timeDays, range)], effects, now: t, rising: effects.risingIds(t, world), grid: isToolMode(s.mode),
      treeSlot: (o) => ambient.treeSlot(world, o.x, o.y, o.slot, t),            // Stage 3: the swaying palm or acacia slot (render/ambient.js)
      ambient: (g, r) => ambient.draw(g, world, r, t),                          // Stage 3 (render/ambient.js, fire.js, units.js)
      fire: (g, r) => drawFires(g, world, r, t, still),
      units: (g, r) => drawUnitMarks(g, world, r, timeDays, t, still),
      drawOverlay: (g, r) => {
        if (s.overlay) drawOverlay(g, world, s.overlay, r, s.tool && s.tool.kind === 'building' ? s.tool.type : null);   // Ground brightens the tiles with room for the building being placed
        if (selected) drawReachHighlight(g, world, selected);                  // spec 4.5: tapping a building shows its reach
        if (ring) drawGuideMarker(g, ring.x, ring.y, ring.pulsing, ring.age);  // under the ghost, so the ghost stays readable; pulses from the step change
        const shapes = ghosts();                                                // refreshes the tint as well
        drawDesirabilityTint(g, tintList);                                     // spec 4.7: teal wash nicer, coral hatching worse, under the ghost
        for (const ghost of shapes) drawGhost(g, ghost);
        drawProblemMarkers(g, world, alerts.list(), r);                        // early-game pass 2.8: one badge per building with a problem
      },
    });
    hud.render();
    if (s.layout === 'wide' && !s.panelFolded) panelMinimap.render(alerts.list());
    if (s.sheet && s.sheet.kind === 'minimap') sheetMinimap.render(alerts.list());
    if (world.day !== lastDay) { lastDay = world.day; ghostsDirty = true; syncDaily(); refreshDaily(); }
    tickNudge(s);
  }
  // Once a frame (early-game pass 3.5): the nudge's glow on Show me, then its one line, then nothing more. The Play tip's
  // pulse on the speed control lasts while that tip shows and the game is paused (a paused game never closes it by
  // itself, ruling 171). Help: Off silences all of it.
  function tickNudge(s) {
    const on = helpOn();
    if (!on && tips.current()) tips.dismiss();
    tips.tick();
    tips.flush({ busy: tipsBusy(s) });                 // a tip held while a banner had a landscape phone's one row goes up once it clears
    syncGuidance();                                    // and a caption held while the row was taken goes up once it is free
    measureGuidance();
    root.classList.toggle('nudge-play', world.speed === 0 && tips.current() === 'press_play');
    const state = on ? nudge.tick({ running: world.speed > 0, busy: isToolMode(s.mode) || Boolean(s.sheet) || Boolean(s.confirmDialog) }) : 'none';
    const showMeButton = $('goals').querySelector('.show-me');
    if (showMeButton) showMeButton.classList.toggle('glow', state === 'glow');   // every frame: the strip is built again when a phone turns
    if (state === nudgeState) return;
    nudgeState = state;
    const text = state === 'line' ? nudgeLineText(world, alerts.list(), openGoals(world, 1)[0] || null) : '';
    setText(nudgeLine, text);
    nudgeLine.hidden = !text;
  }

  syncDaily();
  refreshDaily();
  if (welcome) store.set(openSheet(store.get(), 'welcome'));
  return {
    store, settings, sfx, placement, showMeAt, cameraControl, alerts, toasts, celebrations, tips, effects, guide, speedControl, actions, render, afterCommand, refresh, onEvents, offerUpdate, autosave, setSaveFailed,
    danger, scoreUi, ambient, screenshotMode, frameGate, setGuidanceOpen,
    allowFrame: (t) => frameGate.allow(t, world.speed === 0),
    destroy() {
      if (destroyed) return;
      destroyed = true;
      for (const s of seams()) s.destroy();
      cornerPicker.destroy(); panelPicker.destroy();
      guide.destroy(); stopSettingsWatch();            // the guide's store subscription and the shared settings' watch
      doc.removeEventListener('visibilitychange', onVisibility);
      for (const t of GESTURES) root.removeEventListener(t, onGesture);
      for (const t of INPUTS) root.removeEventListener(t, onInput);
      root.removeEventListener('click', onPress);
      root.removeEventListener('focusin', onFocusIn);
      mapInput.detach(); keyboard.detach(); backStack.stop(); stopLayout(); stopVisibility(); toasts.clear(); celebrations.clear();
      // The shell's containers outlive this UI (a new city builds another one on the same page): leave them empty.
      for (const id of ['topbar', 'dock', 'panel', 'rail', 'corners', 'goals', 'tip', 'cheer', 'banner', 'legend', 'live', 'map-summary']) clear($(id));
      $('goals').hidden = false;                       // the strip hides its row when no goal is open; the next UI decides again
      for (const id of ['sheet', 'dialog']) { const c = $(id); clear(c); c.hidden = true; }
      confirmBar.element.remove();
      document.body.style.removeProperty('--confirm-h');   // the bar's published height goes with it, and the tabs' edge
      document.body.style.removeProperty('--panel-tabs-bottom');
      delete root.dataset.mode;
      delete root.dataset.guidance;
      root.style.removeProperty('--guidance-max');
      root.style.removeProperty('--toast-low');
      root.classList.remove('has-banner', 'has-overlay', 'nudge-play', 'screenshot', 'toast-low');
      store.dispose();                                 // last: every component's subscription to this interface's store
    },
  };
}
