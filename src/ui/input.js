// Pointer, wheel and context-menu events on the map canvas (spec 6.5-6.7). Panning and zooming happen
// here; everything with game meaning goes to `actions`, which createUI wires to placement and picking.
// In a drawing tool (road, wall, plots, Demolish) a one-finger touch or pen drag draws a stroke instead of panning, and two
// fingers pan and zoom (placement review P3); a stroke a second finger interrupts is taken back ('cancel'), since the player
// meant to move the map. The mouse keeps its own drag (drawDrag: start, then end). Double tap zooms only while no tool is
// open (P4).
// Version 5.0 (Task 6): a touch or pen swipe lifted still moving flings the map on (cameraControl.fling, from the speed over the last FLING_WINDOW_MS); any touch stops a
// fling, and the tap that stopped it does nothing else; two fingers tapped twice zoom out a step about their midpoint.
import { createGestures } from './gestures.js';
import { panBy, zoomAt } from '../render/camera.js';
import { isToolMode } from './modes.js';
import { WHEEL_ZOOM_STEP, ZOOM_STEP, GHOST_FINGER_OFFSET_PX, FLING_WINDOW_MS, FLING_REST_MS } from '../data/ui.js';

// Version 10.0 (Track M, ruling 2301, C12): tapWait is how long a finger's or pen's tap waits for a second tap before it counts, so a double tap zooms and selects nothing
// (0: no wait, the default: a tap counts at once). waitsFor({ x, y }) says whether this tap needs the wait at all: createUI says yes only for a tap that would select a building, and
// only while zoom on a double tap is on (no tool open), so a tap on bare ground, a tap in a tool and every mouse click stay instant.
export function createMapInput({ canvas, cam, view, cameraControl, store, actions, root = document.body, now = () => performance.now(), tapWait = 0, waitsFor = () => true, setTimer = (f, ms) => setTimeout(f, ms), clearTimer = (h) => clearTimeout(h) }) {
  const local = (ev) => { const r = canvas.getBoundingClientRect(); return { x: ev.clientX - r.left, y: ev.clientY - r.top }; };
  let dragKind = null; // 'pan' | 'ghost' | 'draw' (the mouse's) | 'stroke' (a finger's or pen's)
  let cancelling = false; // true while gestures.cancel runs, so a cancelled draw drag does not commit
  let samples = [];       // a pan drag's recent points { t, x, y } (touch and pen), for the fling
  let stoppedFling = false; // the touch that is down stopped a fling: its tap is not a tap

  let waiting = null;     // a tap held for tapWait: { e, handle }
  // Version 10.0 (Track M, ruling 2332): a held tap that wakes while a tool is open, or after the mode changed, is dropped: it must never land as a tool tap (place or select).
  const flushTap = () => { if (!waiting) return; const w = waiting; waiting = null; clearTimer(w.handle); if (!isToolMode(store.get().mode)) actions.tap(w.e); };
  const dropTap = () => { if (!waiting) return; clearTimer(waiting.handle); waiting = null; };
  let heldMode = store.get().mode;
  const unsubscribe = store.subscribe((s) => { if (s.mode !== heldMode) { heldMode = s.mode; dropTap(); } });

  const gestures = createGestures({
    // A primary tap or click is a tap; a right-button press-and-release is Back. A right-button drag is a pan and
    // produces no tap, so panning never goes Back (the DOM contextmenu event fires after a drag too).
    onTap: (e) => {
      if (stoppedFling) { stoppedFling = false; gestures.forgetTap(); return; }
      flushTap();                                                      // an earlier tap still waiting counts now, before this one (it was not the first of a double)
      if (e.button !== 0) { if (e.button === 2) actions.secondary(); return; }
      if (tapWait > 0 && e.type !== 'mouse' && !isToolMode(store.get().mode) && waitsFor(e)) { waiting = { e, handle: setTimer(() => { waiting = null; if (!isToolMode(store.get().mode)) actions.tap(e); }, tapWait) }; return; }
      actions.tap(e);
    },
    onDoubleTap: (e) => { dropTap(); cameraControl.zoomStep(ZOOM_STEP, e.x, e.y); },   // the first tap of the pair never selected
    onTwoFingerDoubleTap: (e) => cameraControl.zoomStep(1 / ZOOM_STEP, e.x, e.y),
    onDragStart: (e) => {
      flushTap();
      stoppedFling = false;
      samples = [];
      const mode = store.get().mode;
      if (e.type === 'mouse' && e.button === 0 && isToolMode(mode) && mode !== 'placing') {
        dragKind = 'draw';
        actions.drawDrag({ x: e.x, y: e.y, phase: 'start' });
      } else if (e.type !== 'mouse' && e.button === 0 && isToolMode(mode) && mode !== 'placing') {
        dragKind = 'stroke';
        actions.strokeDrag({ x: e.x, y: e.y, phase: 'start' });
      } else if (e.type !== 'mouse' && e.button === 0 && mode === 'placing' && actions.ghostDragStart({ x: e.x, y: e.y, type: e.type })) {
        dragKind = 'ghost';
      } else {
        dragKind = 'pan';
        cameraControl.cancel();
        actions.panStarted();
      }
    },
    onDrag: (e) => {
      if (dragKind === 'pan') {
        panBy(cam, e.dx, e.dy, view());   // Version 10.0 (Track F, ruling 2110): the pan holds the map in view
        if (e.type !== 'mouse') { const t = now(); samples.push({ t, x: e.x, y: e.y }); while (samples.length > 2 && t - samples[1].t > FLING_WINDOW_MS) samples.shift(); }
      }
      else if (dragKind === 'ghost') actions.ghostDrag({ x: e.x, y: e.y - GHOST_FINGER_OFFSET_PX });
      else if (dragKind === 'draw') actions.drawDrag({ x: e.x, y: e.y, phase: 'move' });
      else if (dragKind === 'stroke') actions.strokeDrag({ x: e.x, y: e.y, phase: 'move' });
    },
    onDragEnd: (e) => {
      if (dragKind === 'pan') flingFrom(e);
      else if (dragKind === 'ghost') actions.ghostDragEnd();
      else if (dragKind === 'draw' && !cancelling) actions.drawDrag({ x: e.x, y: e.y, phase: 'end' });
      else if (dragKind === 'stroke') actions.strokeDrag(cancelling || e.pinch ? { phase: 'cancel' } : { x: e.x, y: e.y, phase: 'end' });
      dragKind = null;
    },
    onPinchStart: () => { flushTap(); stoppedFling = false; cameraControl.cancel(); actions.panStarted(); },
    onPinch: (e) => { panBy(cam, e.dx, e.dy, view()); zoomAt(cam, view(), e.scale, e.cx, e.cy); },
  }, { doubleTap: () => !isToolMode(store.get().mode) });

  // A pan drag lifted: the speed over the last FLING_WINDOW_MS of it, in screen px a second, unless the finger rested FLING_REST_MS before lifting (or it was cancelled, or a
  // pinch's). The camera control decides whether the Motion level allows it.
  function flingFrom(e) {
    const list = samples;
    samples = [];
    if (cancelling || e.pinch || e.type === 'mouse' || list.length < 2) return;
    const last = list[list.length - 1], t = now();
    if (t - last.t > FLING_REST_MS) return;
    const first = list.find((q) => last.t - q.t <= FLING_WINDOW_MS) || list[0];
    const dt = last.t - first.t;
    if (dt <= 0) return;
    if (typeof cameraControl.fling === 'function') cameraControl.fling((last.x - first.x) / (dt / 1000), (last.y - first.y) / (dt / 1000));
  }

  const onDown = (ev) => {
    stoppedFling = Boolean(cameraControl.flinging);                     // any touch stops a fling, and is not a tap on whatever is under it
    cameraControl.cancel();                                              // and any touch stops a Show me glide or a zoom tween too (a fling alone also swallows the tap)
    const type = ev.pointerType === 'pen' ? 'pen' : ev.pointerType === 'touch' ? 'touch' : 'mouse';
    store.set({ inputType: type });
    root.dataset.input = type;
    const { x, y } = local(ev);
    if (canvas.setPointerCapture) { try { canvas.setPointerCapture(ev.pointerId); } catch (e) { /* not capturable in some test runners */ } }
    gestures.pointerDown(ev.pointerId, x, y, type, ev.button);
    ev.preventDefault();
  };
  const onMove = (ev) => {
    const { x, y } = local(ev);
    if (gestures.pointerCount === 0) { if (ev.pointerType === 'mouse' || ev.pointerType === 'pen') actions.hover({ x, y }); return; }
    gestures.pointerMove(ev.pointerId, x, y);
  };
  const onUp = (ev) => { const { x, y } = local(ev); gestures.pointerUp(ev.pointerId, x, y); };
  // gestures.cancel ends an active drag through onDragEnd; flag it so a cancelled draw drag is not committed.
  const onCancel = (ev) => { cancelling = true; try { gestures.cancel(ev.pointerId); } finally { cancelling = false; } };
  const onLeave = () => { if (gestures.pointerCount === 0) actions.hover(null); };
  const onWheel = (ev) => {
    ev.preventDefault();
    if (!ev.deltaY) return; // horizontal or shift-wheel: no zoom
    const { x, y } = local(ev);
    cameraControl.cancel();
    zoomAt(cam, view(), ev.deltaY < 0 ? WHEEL_ZOOM_STEP : 1 / WHEEL_ZOOM_STEP, x, y);
  };
  // The browser's context menu is only suppressed; Back comes from the recogniser's right-button tap above.
  const onContext = (ev) => { ev.preventDefault(); };

  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerup', onUp);
  canvas.addEventListener('pointercancel', onCancel);
  // A pointer whose capture is lost without a pointerup (e.g. the finger lifts outside the window) would
  // otherwise stay in the recogniser as a ghost, so treat it like a cancel.
  canvas.addEventListener('lostpointercapture', onCancel);
  canvas.addEventListener('pointerleave', onLeave);
  canvas.addEventListener('wheel', onWheel, { passive: false });
  canvas.addEventListener('contextmenu', onContext);

  return {
    detach() {
      dropTap();
      unsubscribe();
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerup', onUp);
      canvas.removeEventListener('pointercancel', onCancel);
      canvas.removeEventListener('lostpointercapture', onCancel);
      canvas.removeEventListener('pointerleave', onLeave);
      canvas.removeEventListener('wheel', onWheel);
      canvas.removeEventListener('contextmenu', onContext);
    },
  };
}
