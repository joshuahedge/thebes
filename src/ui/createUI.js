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
import { population, housesOf, allBuildings } from '../sim/world.js';
import { screenToTile, visibleTileRange } from '../render/camera.js';
import { walkersAt } from '../render/walkers.js';
import { drawOverlay, drawReachHighlight, drawGhost, drawProblemMarkers, drawGuideMarker, drawDesirabilityTint } from '../render/overlays.js';
import { createEffects } from '../render/effects.js';
import { GOLD } from '../render/art/palette.js';
import { createStore, INITIAL_UI_STATE } from './store.js';
import { select, deselect, back, openSheet, closeSheet, setDock, isToolMode, pickCategory, enterScreenshot } from './modes.js';
import { pickLayout, watchLayout } from './layout.js';
import { createBackStack } from './backstack.js';
import { createSettings } from './settings.js';
import { createSfx } from '../audio/sfx.js';
import { createCameraControl } from './cameraControl.js';
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
import { createAlerts, mapSummaryText } from './alerts.js';
import { createOverlayLegend } from './overlayUi.js';
import { createToasts } from './toasts.js';
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
import { buildingName, reasonText, milestoneText, caravanText, FIRST_TEXT, ACHIEVEMENT_NAMES, ACHIEVEMENT_TEXT, DAILY_TEXT, T } from './text.js';

const TOPBAR_PX = 48;                 // --topbar-h at 100% text size
const WIDE_LONG_DATE_PX = 1000;       // the wide top bar shows the long date from this width up (at 100% and 125% text)
const PANEL_PX = 320, RAIL_PX = 56, DRAWER_PX = 268;   // --panel-w, --rail-w, --drawer-w

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
  const seams = () => [danger, scoreUi].filter(Boolean);
  let saveFailed = false, destroyed = false;
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
  const store = createStore({ ...INITIAL_UI_STATE, layout: pickLayout(view().width, view().height), ...(welcome ? { lastSpeed: welcome.lastSpeed } : {}) });
  const toasts = createToasts({ container: $('toasts') });
  const effects = createEffects({ reducedMotion: settings.reducedMotion });
  // Tips and the idle nudge (early-game pass 3.4, 3.5): quiet, never over the map, both off under Help: Off. frameNow is
  // the latest frame's time, so the nudge counts only time the player actually watched. The tips' 3-minute gap and
  // five-an-hour cap count play time (playMs), which runs only while the game does. A phone at 125% or 150% text has
  // no room for a tip to stay (it would cover the middle of the map), so there it closes itself, timed on seenMs: the
  // frames actually drawn (a stalled frame counts a second at most), so a hidden tab never closes an unread tip.
  let frameNow = now(), lastFrameAt = null, playMs = 0, seenMs = 0;
  const tipsTight = () => store.get().layout !== 'wide' && settings.get().textSize >= 125;
  const tips = createTips({
    container: $('tip'), settings, now, playNow: () => playMs, frameNow: () => seenMs, autoCloseMs: () => (tipsTight() ? TIP_AUTO_CLOSE_MS : 0),
    restoreFocus: () => { const b = $('goals').querySelector('.show-me'); if (b && !$('goals').hidden) b.focus(); },
  });
  // Celebrations (early-game pass 3.6) replace the goal and milestone toasts. Created this early because afterCommand
  // (hoisted) forwards settle's events to onEvents, which shows them. On a phone at larger text, and on any phone held
  // sideways (a screen 360-390 px tall), the goals strip, a tip and a caption together would reach the middle of the
  // map, so there a caption waits while a tip shows; the frame loop resumes the queue once the tip has closed.
  const holdCaptions = () => (tipsTight() || store.get().layout === 'compact') && Boolean(tips.current());
  const celebrations = createCelebrations({ container: $('cheer'), hold: holdCaptions });
  const nudge = createNudge({ now: () => frameNow });
  const nudgeLine = el('p', { class: 'nudge-line', hidden: true });
  const nudgeRegion = el('div', { class: 'nudge', role: 'status', 'aria-live': 'polite' }, [nudgeLine]);   // stays rendered, so the line is announced when it appears
  let nudgeState = 'none';
  const helpOn = () => settings.get().help !== 'off';
  const fireTip = (key) => tips.trigger(key, { busy: isToolMode(store.get().mode) });
  const cameraControl = createCameraControl({ cam, view, reducedMotion: settings.reducedMotion, now });
  const placement = createPlacement({ world, store, afterCommand, effects, now });
  const speedControl = createSpeedControl({ world, store, afterCommand, onPausedHidden: () => toasts.show(T.pausedHidden), doc });
  const alerts = createAlerts({
    world, banner: $('banner'), live: $('live'), onView: viewAlert, onNewCritical: () => sfx.play('alert'), root,
    onAction: (a, kind) => { for (const s of seams()) s.onAlertAction(a, kind); },   // Stage 3: Pay tribute and the like
    getAlerts: () => (saveFailed ? [...alertsFor(world), { code: 'save_failed' }] : alertsFor(world)),
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
  const confirmBar = createConfirmBar({ container: $('ui'), store, placement, onCancel: () => placement.cancel(), onConfirm: confirm, onUndo: undo });
  const sidePanel = createSidePanel({ container: $('panel'), store, world, onPick: pick, minimapNode: panelMinimap.canvas });
  const rail = createRail({ container: $('rail'), store, world, onPick: pick, onConfirm: confirm, onCancel: () => placement.cancel(), placement });
  const guide = createGuide({ world, store, root, reducedMotion: settings.reducedMotion });   // after the dock, panel and rail, so its store subscription runs after theirs
  const legend = createOverlayLegend({ container: $('legend'), store });
  const corners = createCorners({ container: $('corners'), store, speedControl, onMinimap: () => toggleSheet('minimap'), onOverlay: () => legend.cycle(), alertCount: () => alerts.count() });
  const goalsStrip = createGoalsStrip({ container: $('goals'), world, onShowMe: showMe, onOpen: () => toggleSheet('goals'), onSkipGuide: skipGuide });
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
    if (v.help === lastHelp) return;
    lastHelp = v.help;
    if (v.help !== 'full' && world.guide.on) { setGuide(world, false); refresh(); }
  });
  const customSheets = {
    ...menus, goals: goalsSheet(world, { onShowMe: showMe }),
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
  const sheets = createSheets({ container: $('sheet'), store, world, placement, cameraControl, minimap: sheetMinimap, getAlerts: () => alerts.list(), onView: viewAlert, onShowMe: showMeAt, onSelect: selectBuilding, afterCommand, custom: customSheets, parts: [danger.sheetParts, scoreUi.sheetParts] });
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
    return parts.join(', ');
  }

  // A card was picked: the ghost starts a little above mid-screen and lands on the nearest tile where it fits
  // (spec 6.5, early-game pass 2.6). That tile can be up to ten tiles away, so the view follows it off screen.
  function pick(item) {
    const v = view();
    const c = screenToTile(cam, v, v.width / 2, v.height * 0.4);
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
  // off. The goals strip, the goals sheet and the house sheet all come through here.
  function showMeAt({ category, item, x, y }) {
    closeAnySheet();
    store.set(pickCategory(store.get(), category || categoryOfItem(item)));
    const tool = toolForItem(item);
    const def = tool.kind === 'building' ? BUILDINGS[tool.type] : null;
    placement.start(tool, def ? { x: x - def.w / 2, y: y - def.d / 2 } : null);   // road, plot and demolish tools ignore the point
    const g = def ? store.get().ghost : null;
    if (g) cameraControl.panToKeeping(x, y, g.x + def.w / 2, g.y + def.d / 2, placingInsets(store.get()));
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
  function confirm() {
    const r = placement.confirm();
    if (!r.ok) toasts.show(reasonText(r.reason));
    return r;
  }
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
  // View on an alert: a building's alert selects it and pans there; a city-wide one opens the summary.
  function viewAlert(alert) {
    if (alert.code === 'save_failed') { store.set(openSheet(store.get(), 'menu')); return; }
    if (!(alert.id && selectBuilding(alert.id))) store.set(openSheet(store.get(), 'summary'));
  }
  // Select a building: its sheet opens and the view centres on it, then moves the least that keeps it in the map
  // the sheet leaves free (spec 6.3), so a tall portrait sheet never covers it. An alert's View and a house sheet's
  // View share this.
  function selectBuilding(id) {
    const b = world.buildings[id];
    if (!b) return false;
    store.set(select(store.get(), b.id));
    const cx = b.x + b.w / 2, cy = b.y + b.d / 2;
    cameraControl.panToKeeping(cx, cy, cx, cy, sheetInsets(store.get()));
    return true;
  }
  function afterCommand(e) {
    if (e.undoable) {                                  // a ✓ outcome: place, road, plots or demolish
      sfx.play(e.kind === 'road' ? 'road' : e.kind === 'demolish' ? 'demolish' : 'place');
      sfx.buzz(20);
    }
    nudge.noteAction();                                // a command is a meaningful action (early-game pass 3.5)
    if (e.undoable && e.kind === 'houses' && world.speed === 0) fireTip('plotsPaused');
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
    hud.render(); dock.render(); sidePanel.render(); rail.render(); guide.render(); confirmBar.render(); corners.render(); goalsStrip.render();
    setText($('map-summary'), mapSummaryText(world, alerts.list()));
    // Tips that follow the alerts: asked for whenever a problem marker is on the map or a labour shortage is on, not only when
    // one first appears, because the gap or a tool may have turned the tip away then. Seen tips and the first 10 s turn the
    // question down cheaply, so a saved city never meets a tip on load. Goal progress feeds the nudge.
    const list = alerts.list();
    if (list.some((a) => a.id !== undefined && a.id !== null)) fireTip('problemMarker');
    if (list.some((a) => a.code === 'labour_shortage')) fireTip('labourShortage');
    nudge.noteProgress(progressSignature());
    for (const s of seams()) s.refresh();
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
    if (e.type === 'goal') {
      const g = goalById(e.id);
      return g ? { tier: 'first', text: `${T.goalDone}: ${g.text}`, reward: e.reward, onShow: cheerSound } : null;
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
  // The "update ready" toast (spec 6.3) waits until no tool is active; Restart saves, then reloads (boot.js).
  let pendingUpdate = null;
  function showUpdateToast() {
    if (!pendingUpdate || isToolMode(store.get().mode)) return;
    const apply = pendingUpdate;
    pendingUpdate = null;
    toasts.show(T.updateReady, {
      action: T.restart, ms: UPDATE_TOAST_MS,
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
      const t = tileUnder(x, y);
      if (isToolMode(s.mode)) {
        if (s.tool.kind === 'building' && type === 'mouse') { placement.moveGhost(t.x, t.y); confirm(); }   // a click places (spec 6.5)
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
    back: goBack, undo, help: () => toggleSheet('help'),
  };
  const mapInput = createMapInput({ canvas, cam, view, cameraControl, store, actions, root });
  const keyboard = createKeyboard({ target: keyTarget, settings, cam, cameraControl, actions: keyActions });

  // The sheet's footprint in CSS px, so a selected building is panned into the part of the map it leaves free.
  function sheetInsets(s) {
    const v = view();
    if (s.layout === 'portrait') return { top: TOPBAR_PX, right: 0, bottom: v.height * 0.6, left: 0 };
    if (s.layout === 'compact') return { top: TOPBAR_PX, right: RAIL_PX + DRAWER_PX, bottom: 0, left: 0 };
    return { top: TOPBAR_PX, right: PANEL_PX, bottom: 0, left: 0 };
  }
  // The map a tool leaves free: in portrait the confirm bar and the corner buttons on it cover the bottom.
  function placingInsets(s) {
    if (s.layout !== 'portrait') return sheetInsets(s);
    return { top: TOPBAR_PX, right: 0, bottom: Math.min(view().height * 0.3, 240), left: 0 };
  }
  function panelDetails() {
    const s = store.get();
    const b = s.hoverId !== null ? world.buildings[s.hoverId] : null;
    let text = T.hoverHint;
    if (b) text = tooltipText(b);
    else if (s.tool) { const c = cardInfo(world, activeItemOf(s.tool)); text = `${c.name}: ${c.costText}`; }
    setText(sidePanel.details, text);
  }
  let lastSelected = null;
  store.subscribe((s) => {
    root.dataset.mode = s.mode;
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
    if (s.overlay && s.overlay !== seenOverlay && !isToolMode(s.mode)) fireTip('overlayOn');
    if (!isToolMode(s.mode)) tips.flush({ busy: false });
    seenMode = s.mode; seenSheet = s.sheet; seenOverlay = s.overlay;
  });

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
      seenMs += dt;
      if (world.speed > 0) playMs += dt;
    }
    lastFrameAt = t;
    frameNow = t;
    cameraControl.tick(t);
    const s = store.get();
    const v = view();
    const range = visibleTileRange(cam, v, world.size);
    const selected = s.selectedId !== null ? world.buildings[s.selectedId] : null;
    const ring = guide.marker(t);                                              // the guide's ring on its step's target (spec 3.2)
    const still = { reducedMotion: settings.reducedMotion() };
    renderer.renderFrame(world, cam, {
      view: v, walkers: [...walkersAt(world, timeDays, range), ...unitsAt(world, timeDays, range)], effects, now: t, rising: effects.risingIds(t, world), grid: isToolMode(s.mode),
      ambient: (g, r) => ambient.draw(g, world, r, t),                          // Stage 3 (render/ambient.js, fire.js, units.js)
      fire: (g, r) => drawFires(g, world, r, t, still),
      units: (g, r) => drawUnitMarks(g, world, r, timeDays, t, still),
      drawOverlay: (g, r) => {
        if (s.overlay) drawOverlay(g, world, s.overlay, r);
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
  // pulse on the speed control lasts while that tip shows and the game is paused. Where the tip closed itself unread
  // (a phone at larger text), the pulse stays on while the game is still paused with plots and no family yet, and
  // goes for good once that is no longer so. Help: Off silences all of it.
  let playRingHeld = false;
  function tickNudge(s) {
    const on = helpOn();
    if (!on && tips.current()) tips.dismiss();
    const showing = tips.current();
    if (tips.tick() && showing === 'press_play') playRingHeld = true;
    if (playRingHeld && !(on && world.speed === 0 && population(world) === 0 && housesOf(world).length > 0)) playRingHeld = false;
    celebrations.resume();                             // a caption held while a tip showed goes up once the tip has closed
    root.classList.toggle('nudge-play', world.speed === 0 && (tips.current() === 'press_play' || playRingHeld));
    const state = on ? nudge.tick({ running: world.speed > 0, busy: isToolMode(s.mode) || Boolean(s.sheet) || Boolean(s.confirmDialog) }) : 'none';
    if (state === nudgeState) return;
    nudgeState = state;
    const showMeButton = $('goals').querySelector('.show-me');
    if (showMeButton) showMeButton.classList.toggle('glow', state === 'glow');
    const text = state === 'line' ? nudgeLineText(world, alerts.list(), openGoals(world, 1)[0] || null) : '';
    setText(nudgeLine, text);
    nudgeLine.hidden = !text;
  }

  syncDaily();
  refreshDaily();
  if (welcome) store.set(openSheet(store.get(), 'welcome'));
  return {
    store, settings, sfx, placement, showMeAt, cameraControl, alerts, toasts, celebrations, tips, effects, guide, speedControl, actions, render, afterCommand, refresh, onEvents, offerUpdate, autosave, setSaveFailed,
    danger, scoreUi, ambient, screenshotMode, frameGate,
    allowFrame: (t) => frameGate.allow(t, world.speed === 0),
    destroy() {
      if (destroyed) return;
      destroyed = true;
      for (const s of seams()) s.destroy();
      guide.destroy(); stopSettingsWatch();            // the guide's store subscription and the shared settings' watch
      doc.removeEventListener('visibilitychange', onVisibility);
      for (const t of GESTURES) root.removeEventListener(t, onGesture);
      for (const t of INPUTS) root.removeEventListener(t, onInput);
      mapInput.detach(); keyboard.detach(); backStack.stop(); stopLayout(); stopVisibility(); toasts.clear(); celebrations.clear();
      // The shell's containers outlive this UI (a new city builds another one on the same page): leave them empty.
      for (const id of ['topbar', 'dock', 'panel', 'rail', 'corners', 'goals', 'tip', 'cheer', 'banner', 'legend', 'live', 'map-summary']) clear($(id));
      $('goals').hidden = false;                       // the strip hides its row when no goal is open; the next UI decides again
      for (const id of ['sheet', 'dialog']) { const c = $(id); clear(c); c.hidden = true; }
      confirmBar.element.remove();
      document.body.style.removeProperty('--confirm-h');   // the bar's published height goes with it, and the tabs' edge
      document.body.style.removeProperty('--panel-tabs-bottom');
      delete root.dataset.mode;
      root.classList.remove('has-banner', 'has-overlay', 'nudge-play', 'screenshot');
      store.dispose();                                 // last: every component's subscription to this interface's store
    },
  };
}
