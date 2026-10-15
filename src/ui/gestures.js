// Pure pointer-stream recogniser (spec 6.6): tap, double-tap, drag with per-move deltas, two-finger pinch.
// It knows nothing about the DOM; input.js feeds it pointer events and acts on the callbacks. doubleTap() says whether two
// quick taps make a double tap at all (placement review P4: not while a tool is open, so two neighbouring tiles can be tapped
// in quick succession); when it says no they are two taps. A drag that a second finger ends gets pinch: true on its onDragEnd.
// Version 5.0 (Task 6): a two-finger tap (both fingers down and up within TWO_TAP_MS, neither moving past the drag threshold) is not a pinch; two of them within DOUBLE_TAP_MS
// are onTwoFingerDoubleTap({ x, y }) at the fingers' midpoint (one tap of two fingers does nothing: it never reaches onTap).
import { DRAG_THRESHOLD_PX, DOUBLE_TAP_MS, DOUBLE_TAP_PX, TWO_TAP_MS } from '../data/ui.js';

export function createGestures(handlers, { now = () => performance.now(), doubleTap = () => true } = {}) {
  const pointers = new Map();
  let dragging = false;
  let pinch = null;
  let lastTap = null;
  let two = null;          // the two-finger touch in progress: { t, x, y, ok }, ok while it can still be a tap
  let lastTwo = null;      // the last two-finger tap: { t, x, y }
  const call = (name, arg) => { if (handlers[name]) handlers[name](arg); };

  function pair() {
    const [a, b] = [...pointers.values()];
    return { dist: Math.hypot(a.x - b.x, a.y - b.y), cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2 };
  }

  function pointerDown(id, x, y, type, button = 0) {
    pointers.set(id, { x, y, startX: x, startY: y, prevX: x, prevY: y, type, button, inPinch: false, downAt: now() });
    if (pointers.size === 2) {
      // Version 5.0 (Task 8): both fingers count from the first one's touch-down, and a finger that already moved past the drag threshold (a drag a second finger joins) is not a tap
      const lone = [...pointers.values()].some((p) => Math.hypot(p.x - p.startX, p.y - p.startY) >= DRAG_THRESHOLD_PX);
      if (dragging) { dragging = false; call('onDragEnd', { x, y, type, button, pinch: true }); }
      for (const p of pointers.values()) p.inPinch = true;
      pinch = pair();
      two = { t: Math.min(...[...pointers.values()].map((p) => p.downAt)), x: pinch.cx, y: pinch.cy, ok: !lone && !dragging };
      call('onPinchStart', { cx: pinch.cx, cy: pinch.cy });
    } else if (pointers.size > 2) { two = null; lastTwo = null; }
  }

  function pointerMove(id, x, y) {
    const p = pointers.get(id);
    if (!p) return;
    p.x = x; p.y = y;
    if (two && two.ok && Math.hypot(x - p.startX, y - p.startY) >= DRAG_THRESHOLD_PX) two.ok = false;
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

  // The last finger of a two-finger touch is up: a tap if it was quick and still, and the second of two quick ones a double.
  function endTwoIfDone() {
    if (pointers.size > 0 || !two) return;
    const tap = two; two = null;
    if (!tap.ok) { lastTwo = null; return; }
    const t = now();
    if (lastTwo && t - lastTwo.t <= DOUBLE_TAP_MS && Math.hypot(tap.x - lastTwo.x, tap.y - lastTwo.y) <= DOUBLE_TAP_PX * 2) { lastTwo = null; call('onTwoFingerDoubleTap', { x: tap.x, y: tap.y }); return; }
    lastTwo = { t, x: tap.x, y: tap.y };
  }

  function pointerUp(id, x, y) {
    const p = pointers.get(id);
    if (!p) return;
    pointers.delete(id);
    if (two && two.ok && now() - two.t > TWO_TAP_MS) two.ok = false;
    if (pinch) { endPinchIfNeeded(); return; }
    if (p.inPinch) { endTwoIfDone(); return; }
    if (dragging) { dragging = false; call('onDragEnd', { x, y, type: p.type, button: p.button }); return; }
    const t = now();
    if (lastTap && p.type !== 'mouse' && doubleTap() && t - lastTap.t <= DOUBLE_TAP_MS && Math.hypot(x - lastTap.x, y - lastTap.y) <= DOUBLE_TAP_PX) {
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
    if (two) two.ok = false;
    if (pinch) endPinchIfNeeded();
    if (pointers.size === 0) endTwoIfDone();
    if (dragging && pointers.size === 0) { dragging = false; call('onDragEnd', { x: p.x, y: p.y, type: p.type, button: p.button }); }
  }

  // Forgets the last tap, so the next one is not the second of a double (a tap that only stopped a fling, in input.js).
  const forgetTap = () => { lastTap = null; };

  return { pointerDown, pointerMove, pointerUp, cancel, forgetTap, get dragging() { return dragging; }, get pointerCount() { return pointers.size; } };
}
