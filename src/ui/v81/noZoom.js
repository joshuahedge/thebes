// Version 8.1 (Track D, ruling 1251): a pinch or a double tap on the tray, the bars, the sheets or the top bar zoomed the installed web app's whole page by accident and was clumsy to get out of.
// Version 9.2 (Track A, ruling 1829; Q7): a deliberate pinch on the page now zooms it (the viewport meta no longer forbids it, and the chrome's touch-action names pinch-zoom), because
// someone who needs it must be able to; what stays is the accident. Two layers remain:
//  1. iOS Safari's gesture events (gesturestart, gesturechange, gestureend) are cancelled only on the map, whose own pinch (src/ui/input.js) moves the camera;
//  2. the double-tap guard: a second quick tap on the page's bare chrome (a bar, a gap between cards: nothing pressable) is not allowed to become a zoom; a tap on a button, a card or a field is never touched,
//     so two quick taps on one control still press it twice.
// The map is left alone: its pinch and double-tap zoom run through pointer events and the canvas has touch-action none.
export const DOUBLE_TAP_GUARD_MS = 350;
export const BARS = '#topbar, #under-bar, #dock, #corners, #confirm';   // Version 10.0 (Track M, ruling 2305): the thin strips a two-finger accident lands on
const TWO_FINGER = ['touchstart', 'touchmove'];
const PRESSABLE = 'button, a, input, select, textarea, label, summary, [role="button"], [role="tab"], [role="slider"], [contenteditable], .card, canvas';

export function installNoZoom({ doc = document, now = () => performance.now() } = {}) {
  const stop = (ev) => { if (ev.cancelable !== false && typeof ev.preventDefault === 'function') ev.preventDefault(); };
  let lastEnd = -Infinity;
  const onTouchEnd = (ev) => {
    const t = now();
    const quick = t - lastEnd < DOUBLE_TAP_GUARD_MS;
    lastEnd = t;
    if (!quick || (ev.touches && ev.touches.length > 0)) return;
    const target = ev.target && typeof ev.target.closest === 'function' ? ev.target : null;
    if (target && target.closest(PRESSABLE)) return;
    stop(ev);
  };
  const within = (ev, selector) => ev.target && typeof ev.target.closest === 'function' && Boolean(ev.target.closest(selector));
  const onMap = (ev) => within(ev, 'canvas');
  // Version 10.0 (Track M, ruling 2305, S14): iOS Safari ignores the viewport's maximum-scale, so a two-finger touch that starts on a bar (the top bar, the rows under it, the dock, the corner
  // buttons, the placing bar) is cancelled too: a thin strip is where an accident happens, and where a page zoomed past 200% could not be pinched back. A sheet and the rest of the page keep
  // the deliberate pinch (ruling 1829). css/v100-m.css takes pinch-zoom out of the bars' touch-action for the browsers that read that.
  const onBar = (ev) => within(ev, BARS);
  const onGesture = (ev) => { if (onMap(ev) || onBar(ev)) stop(ev); };
  const onTwoFingers = (ev) => { if (ev.touches && ev.touches.length >= 2 && onBar(ev)) stop(ev); };
  const GESTURES = ['gesturestart', 'gesturechange', 'gestureend'];
  for (const type of GESTURES) doc.addEventListener(type, onGesture, { passive: false });
  doc.addEventListener('touchend', onTouchEnd, { passive: false });
  for (const type of TWO_FINGER) doc.addEventListener(type, onTwoFingers, { passive: false });
  return {
    detach() {
      for (const type of GESTURES) doc.removeEventListener(type, onGesture);
      doc.removeEventListener('touchend', onTouchEnd);
      for (const type of TWO_FINGER) doc.removeEventListener(type, onTwoFingers);
    },
  };
}
