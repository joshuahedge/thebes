// Pointer, wheel and context-menu events on the map canvas (spec 6.5-6.7). Panning and zooming happen
// here; everything with game meaning goes to `actions`, which createUI wires to placement and picking.
import { createGestures } from './gestures.js';
import { panBy, zoomAt } from '../render/camera.js';
import { isToolMode } from './modes.js';
import { WHEEL_ZOOM_STEP, ZOOM_STEP, GHOST_FINGER_OFFSET_PX } from '../data/ui.js';

export function createMapInput({ canvas, cam, view, cameraControl, store, actions, root = document.body }) {
  const local = (ev) => { const r = canvas.getBoundingClientRect(); return { x: ev.clientX - r.left, y: ev.clientY - r.top }; };
  let dragKind = null; // 'pan' | 'ghost' | 'draw'
  let cancelling = false; // true while gestures.cancel runs, so a cancelled draw drag does not commit

  const gestures = createGestures({
    onTap: (e) => { if (e.button === 0) actions.tap(e); },   // only a primary tap or click; right-click reaches us through contextmenu
    onDoubleTap: (e) => cameraControl.zoomStep(ZOOM_STEP, e.x, e.y),
    onDragStart: (e) => {
      const mode = store.get().mode;
      if (e.type === 'mouse' && e.button === 0 && isToolMode(mode) && mode !== 'placing') {
        dragKind = 'draw';
        actions.drawDrag({ x: e.x, y: e.y, phase: 'start' });
      } else if (e.type !== 'mouse' && e.button === 0 && mode === 'placing' && actions.ghostDragStart({ x: e.x, y: e.y, type: e.type })) {
        dragKind = 'ghost';
      } else {
        dragKind = 'pan';
        cameraControl.cancel();
        actions.panStarted();
      }
    },
    onDrag: (e) => {
      if (dragKind === 'pan') panBy(cam, e.dx, e.dy);
      else if (dragKind === 'ghost') actions.ghostDrag({ x: e.x, y: e.y - GHOST_FINGER_OFFSET_PX });
      else if (dragKind === 'draw') actions.drawDrag({ x: e.x, y: e.y, phase: 'move' });
    },
    onDragEnd: (e) => {
      if (dragKind === 'ghost') actions.ghostDragEnd();
      else if (dragKind === 'draw' && !cancelling) actions.drawDrag({ x: e.x, y: e.y, phase: 'end' });
      dragKind = null;
    },
    onPinchStart: () => { cameraControl.cancel(); actions.panStarted(); },
    onPinch: (e) => { panBy(cam, e.dx, e.dy); zoomAt(cam, view(), e.scale, e.cx, e.cy); },
  });

  const onDown = (ev) => {
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
  // Android Chrome fires contextmenu on a touch long-press; that must not count as a right-click (Back).
  // Every press records its input type first, so a touch long-press is seen as touch here.
  const onContext = (ev) => { ev.preventDefault(); if (store.get().inputType === 'touch') return; actions.secondary(); };

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
