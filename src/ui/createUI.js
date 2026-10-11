// Wires every component to the store, the world, the camera and the renderer (spec 6). The world changes
// only through placement.js, speed.js and the sheets, which call src/sim/commands.js then assignLabour.
import { MILESTONES } from '../data/progression.js';
import { alertsFor } from '../sim/alerts.js';
import { BUILDINGS } from '../data/buildings.js';
import { CATEGORIES, toolForItem, UNDO_TOAST_MS, UPDATE_TOAST_MS, SHOW_ME_PULSES, SHOW_ME_PULSE_MS } from '../data/ui.js';
import { goalById } from '../sim/goals.js';
import { screenToTile, visibleTileRange } from '../render/camera.js';
import { walkersAt } from '../render/walkers.js';
import { drawOverlay, drawReachHighlight, drawGhost } from '../render/overlays.js';
import { createEffects } from '../render/effects.js';
import { createStore, INITIAL_UI_STATE } from './store.js';
import { select, deselect, back, openSheet, closeSheet, setDock, isToolMode, pickCategory } from './modes.js';
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
import { cardInfo, activeItemOf } from './cards.js';
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
import { createMenuSheets, createDialog } from './menu.js';
import { createGoalsStrip, goalsSheet, showMeTarget } from './goalsList.js';
import { welcomeSheet } from './welcomeBack.js';
import { el, setText, clear } from './components.js';
import { buildingName, reasonText, milestoneText, T } from './text.js';

const TOPBAR_PX = 48;                 // --topbar-h at 100% text size
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
  let lastDay = world.day, ghostsDirty = true, ghostState = null, ghostList = [];
  let saveFailed = false, destroyed = false;

  const settings = givenSettings || createSettings({ storage, root });
  const sfx = givenSfx || createSfx({ enabled: () => settings.get().sound, canVibrate: () => settings.get().vibration });
  const store = createStore({ ...INITIAL_UI_STATE, layout: pickLayout(view().width, view().height), ...(welcome ? { lastSpeed: welcome.lastSpeed } : {}) });
  const toasts = createToasts({ container: $('toasts') });
  const effects = createEffects({
    reducedMotion: settings.reducedMotion,
    onMilestone: (id) => { const m = MILESTONES.find((x) => x.id === id); toasts.show(milestoneText(m ? m.name : id)); },
  });
  const cameraControl = createCameraControl({ cam, view, reducedMotion: settings.reducedMotion, now });
  const placement = createPlacement({ world, store, afterCommand, effects, now });
  const speedControl = createSpeedControl({ world, store, afterCommand, onPausedHidden: () => toasts.show(T.pausedHidden), doc });
  const alerts = createAlerts({ world, banner: $('banner'), live: $('live'), onView: viewAlert, onNewCritical: () => sfx.play('alert'), root, getAlerts: () => (saveFailed ? [...alertsFor(world), { code: 'save_failed' }] : alertsFor(world)) });
  // Web Audio needs a user gesture before it plays (spec 5.5). A touch pointerdown is not an activation event
  // (pointerup and keydown are), so all three listen; they go once the context is running. While sound is off,
  // or the context has not resumed yet, unlock() returns false and they stay for the next gesture.
  const GESTURES = ['pointerdown', 'pointerup', 'keydown'];
  const onGesture = () => { if (sfx.unlock()) for (const t of GESTURES) root.removeEventListener(t, onGesture); };
  for (const t of GESTURES) root.addEventListener(t, onGesture);
  const panelMinimap = createMinimap({ world, cam, view, size: 160, dpr: renderer.dpr });
  const sheetMinimap = createMinimap({ world, cam, view, size: 200, dpr: renderer.dpr });

  const speedBar = el('div', { class: 'speed-bar' });
  speedControl.mountBar(speedBar);
  const hud = createHud({ world, store, container: $('topbar'), speedBar, onOpenSummary: () => toggleSheet('summary'), onOpenMenu: () => toggleSheet('menu') });
  const dock = createDock({ container: $('dock'), store, world, onPick: pick });
  const confirmBar = createConfirmBar({ container: $('ui'), store, placement, onCancel: () => placement.cancel(), onConfirm: confirm, onUndo: undo });
  const sidePanel = createSidePanel({ container: $('panel'), store, world, onPick: pick, minimapNode: panelMinimap.canvas });
  const rail = createRail({ container: $('rail'), store, world, onPick: pick, onConfirm: confirm, onCancel: () => placement.cancel(), placement });
  const legend = createOverlayLegend({ container: $('legend'), store });
  const corners = createCorners({ container: $('corners'), store, speedControl, onMinimap: () => toggleSheet('minimap'), onOverlay: () => legend.cycle(), alertCount: () => alerts.count() });
  const goalsStrip = createGoalsStrip({ container: $('goals'), world, onShowMe: showMe, onOpen: () => toggleSheet('goals') });
  const menus = createMenuSheets({ store, settings, toasts, hooks, onNewCity: typeof hooks.newCity === 'function' ? hooks.newCity : () => {} });
  const customSheets = { ...menus, goals: goalsSheet(world, { onShowMe: showMe }) };
  if (welcome) {
    customSheets.welcome = welcomeSheet({
      world, savedAt: welcome.savedAt, lastSpeed: welcome.lastSpeed, now: clock, getAlerts: () => alerts.list(), onView: viewAlert,
      onCarryOn: (speed) => { store.set(closeSheet(store.get())); speedControl.set(speed); },
      onStayPaused: () => store.set(closeSheet(store.get())),
    });
  }
  Object.assign(customSheets, extraSheets);
  const sheets = createSheets({ container: $('sheet'), store, world, placement, cameraControl, minimap: sheetMinimap, getAlerts: () => alerts.list(), onView: viewAlert, afterCommand, custom: customSheets });
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
  // Show me (spec 4.1): open the right card, then pan to and pulse the place the goal is about. A building
  // ghost lands on the nearest fit around the target (early-game pass 2.6). Task 11 moves this onto showMeAt.
  function showMe(goal) {
    const s = store.get();
    if (s.sheet) store.set(closeSheet(s));
    if (!goal.showMe) { store.set(openSheet(store.get(), 'summary')); return; }   // a city-wide goal (out of debt): the summary explains it
    store.set(pickCategory(store.get(), goal.showMe.category));
    const t = showMeTarget(world, goal);
    placement.start(toolForItem(goal.showMe.item), { x: Math.floor(t.x), y: Math.floor(t.y) });   // road and plot tools ignore the point
    cameraControl.panTo(t.x, t.y);
    const at = now();
    for (let i = 0; i < SHOW_ME_PULSES; i++) effects.pulse(t.x, t.y, at + i * SHOW_ME_PULSE_MS);
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
  function toggleSheet(kind) {
    const s = store.get();
    store.set(s.sheet && s.sheet.kind === kind ? closeSheet(s) : openSheet(s, kind));
  }
  function goBack() { const p = back(store.get()); if (p) store.set(p); }
  // View on an alert: a building's alert selects it and pans there; a city-wide one opens the summary.
  function viewAlert(alert) {
    if (alert.code === 'save_failed') { store.set(openSheet(store.get(), 'menu')); return; }
    const b = alert.id ? world.buildings[alert.id] : null;
    if (b) { store.set(select(store.get(), b.id)); cameraControl.panTo(b.x + b.w / 2, b.y + b.d / 2); }
    else store.set(openSheet(store.get(), 'summary'));
  }
  function afterCommand(e) {
    if (e.undoable) {                                  // a ✓ outcome: place, road, plots or demolish
      sfx.play(e.kind === 'road' ? 'road' : e.kind === 'demolish' ? 'demolish' : 'place');
      sfx.buzz(20);
      toasts.show(e.text, { action: T.undo, onAction: undo, ms: UNDO_TOAST_MS });
    } else if (e.kind === 'undo') toasts.show(T.undone);
    ghostsDirty = true;
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
    hud.render(); dock.render(); sidePanel.render(); rail.render(); confirmBar.render(); corners.render(); goalsStrip.render();
    setText($('map-summary'), mapSummaryText(world, alerts.list()));
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
  function onEvents(events) {
    for (const e of events) if (e.type === 'month') { autosave('month'); break; }
    for (const e of events) if (e.type === 'goal') { const g = goalById(e.id); if (g) toasts.show(`${T.goalDone}: ${g.text} (+${e.reward} ${T.gold.toLowerCase()})`); }
    for (const e of events) {
      if (e.type === 'upgrade') sfx.play('upgrade');
      else if (e.type === 'goal') sfx.play('goal');
      else if (e.type === 'milestone') { sfx.play('milestone'); sfx.buzz(40); }
    }
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
    category: (i) => { const s = store.get(); const category = CATEGORIES[i].id; store.set(s.layout === 'wide' ? { category } : { category, dock: 'tray' }); },
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
    if (s.selectedId !== lastSelected) {
      lastSelected = s.selectedId;
      const b = s.selectedId !== null ? world.buildings[s.selectedId] : null;
      if (b) cameraControl.keepVisible(b.x + b.w / 2, b.y + b.d / 2, sheetInsets(s));   // spec 6.3
    }
    panelDetails();
  });
  root.dataset.mode = store.get().mode;

  // Ghosts are recomputed only when the UI state object changes or a command ran (previews call canPlace).
  function ghosts() {
    const s = store.get();
    if (s !== ghostState || ghostsDirty) { ghostState = s; ghostsDirty = false; ghostList = isToolMode(s.mode) ? placement.ghosts() : []; }
    return ghostList;
  }

  function render({ timeDays, now: t }) {
    cameraControl.tick(t);
    const s = store.get();
    const v = view();
    const range = visibleTileRange(cam, v, world.size);
    const selected = s.selectedId !== null ? world.buildings[s.selectedId] : null;
    renderer.renderFrame(world, cam, {
      view: v, walkers: walkersAt(world, timeDays, range), effects, now: t, grid: isToolMode(s.mode),
      drawOverlay: (g, r) => {
        if (s.overlay) drawOverlay(g, world, s.overlay, r);
        if (selected) drawReachHighlight(g, world, selected);                  // spec 4.5: tapping a building shows its reach
        for (const ghost of ghosts()) drawGhost(g, ghost);
      },
    });
    hud.render();
    if (s.layout === 'wide' && !s.panelFolded) panelMinimap.render(alerts.list());
    if (s.sheet && s.sheet.kind === 'minimap') sheetMinimap.render(alerts.list());
    if (world.day !== lastDay) { lastDay = world.day; ghostsDirty = true; refreshDaily(); }
  }

  refreshDaily();
  if (welcome) store.set(openSheet(store.get(), 'welcome'));
  return {
    store, settings, sfx, placement, cameraControl, alerts, toasts, effects, speedControl, actions, render, afterCommand, refresh, onEvents, offerUpdate, autosave, setSaveFailed,
    destroy() {
      if (destroyed) return;
      destroyed = true;
      doc.removeEventListener('visibilitychange', onVisibility);
      for (const t of GESTURES) root.removeEventListener(t, onGesture);
      mapInput.detach(); keyboard.detach(); backStack.stop(); stopLayout(); stopVisibility(); toasts.clear();
      // The shell's containers outlive this UI (a new city builds another one on the same page): leave them empty.
      for (const id of ['topbar', 'dock', 'panel', 'rail', 'corners', 'goals', 'banner', 'legend', 'live', 'map-summary']) clear($(id));
      for (const id of ['sheet', 'dialog']) { const c = $(id); clear(c); c.hidden = true; }
      confirmBar.element.remove();
      document.body.style.removeProperty('--confirm-h');   // the bar's published height goes with it
      delete root.dataset.mode;
      root.classList.remove('has-banner', 'has-overlay');
    },
  };
}
