// Pure pointer-stream recogniser (spec 6.6): tap, double-tap, drag with per-move deltas, two-finger pinch.
// It knows nothing about the DOM; input.js feeds it pointer events and acts on the callbacks.
import { DRAG_THRESHOLD_PX, DOUBLE_TAP_MS, DOUBLE_TAP_PX } from '../data/ui.js';

export function createGestures(handlers, { now = () => performance.now() } = {}) {
  const pointers = new Map();
  let dragging = false;
  let pinch = null;
  let lastTap = null;
  const call = (name, arg) => { if (handlers[name]) handlers[name](arg); };

  function pair() {
    const [a, b] = [...pointers.values()];
    return { dist: Math.hypot(a.x - b.x, a.y - b.y), cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2 };
  }

  function pointerDown(id, x, y, type, button = 0) {
    pointers.set(id, { x, y, startX: x, startY: y, prevX: x, prevY: y, type, button, inPinch: false });
    if (pointers.size === 2) {
      if (dragging) { dragging = false; call('onDragEnd', { x, y, type, button }); }
      for (const p of pointers.values()) p.inPinch = true;
      pinch = pair();
      call('onPinchStart', { cx: pinch.cx, cy: pinch.cy });
    }
  }

  function pointerMove(id, x, y) {
    const p = pointers.get(id);
    if (!p) return;
    p.x = x; p.y = y;
    if (pinch && pointers.size >= 2) {
      const next = pair();
      call('onPinch', { scale: next.dist / (pinch.dist || 1), cx: next.cx, cy: next.cy, dx: next.cx - pinch.cx, dy: next.cy - pinch.cy });
      pinch = next;
      return;
    }
    if (pointers.size !== 1 || p.inPinch) return;
    if (!dragging) {
      if (Math.hypot(x - p.startX, y - p.startY) < DRAG_THRESHOLD_PX) return;
      dragging = true;
      call('onDragStart', { x: p.startX, y: p.startY, type: p.type, button: p.button });
      call('onDrag', { x, y, dx: x - p.startX, dy: y - p.startY, type: p.type, button: p.button });
    } else {
      call('onDrag', { x, y, dx: x - p.prevX, dy: y - p.prevY, type: p.type, button: p.button });
    }
    p.prevX = x; p.prevY = y;
  }

  function endPinchIfNeeded() {
    if (pinch && pointers.size < 2) {
      pinch = null;
      for (const q of pointers.values()) { q.startX = q.x; q.startY = q.y; q.prevX = q.x; q.prevY = q.y; }
      call('onPinchEnd');
    }
  }

  function pointerUp(id, x, y) {
    const p = pointers.get(id);
    if (!p) return;
    pointers.delete(id);
    if (pinch) { endPinchIfNeeded(); return; }
    if (p.inPinch) return;
    if (dragging) { dragging = false; call('onDragEnd', { x, y, type: p.type, button: p.button }); return; }
    const t = now();
    if (lastTap && p.type !== 'mouse' && t - lastTap.t <= DOUBLE_TAP_MS && Math.hypot(x - lastTap.x, y - lastTap.y) <= DOUBLE_TAP_PX) {
      lastTap = null;
      call('onDoubleTap', { x, y, type: p.type });
      return;
    }
    lastTap = { x, y, t };
    call('onTap', { x, y, type: p.type, button: p.button });
  }

  function cancel(id) {
    const p = pointers.get(id);
    if (!p) return;
    pointers.delete(id);
    if (pinch) endPinchIfNeeded();
    if (dragging && pointers.size === 0) { dragging = false; call('onDragEnd', { x: p.x, y: p.y, type: p.type, button: p.button }); }
  }

  return { pointerDown, pointerMove, pointerUp, cancel, get dragging() { return dragging; }, get pointerCount() { return pointers.size; } };
}
