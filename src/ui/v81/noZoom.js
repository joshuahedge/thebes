// Version 8.1 (Track D, ruling 1251): the interface never zooms the page. A pinch or a double tap on the tray, the bars, the sheets or the top bar zoomed the installed web app's whole page and was clumsy to
// get out of. Three layers, because no one of them holds on every phone:
//  1. the viewport meta (index.html: maximum-scale=1, user-scalable=no) and touch-action on the chrome (css/v81-d.css), which Chrome and most Android browsers honour;
//  2. iOS Safari's gesture events (gesturestart, gesturechange, gestureend): its pinch is not a touch-action matter, so the page asks it to do nothing;
//  3. the double-tap guard: a second quick tap on the page's bare chrome (a bar, a gap between cards: nothing pressable) is not allowed to become a zoom; a tap on a button, a card or a field is never touched,
//     so two quick taps on one control still press it twice.
// The map is left alone: its own pinch and double-tap zoom run through pointer events (src/ui/input.js) and the canvas has touch-action none.
export const DOUBLE_TAP_GUARD_MS = 350;
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
  const GESTURES = ['gesturestart', 'gesturechange', 'gestureend'];
  for (const type of GESTURES) doc.addEventListener(type, stop, { passive: false });
  doc.addEventListener('touchend', onTouchEnd, { passive: false });
  return {
    detach() {
      for (const type of GESTURES) doc.removeEventListener(type, stop);
      doc.removeEventListener('touchend', onTouchEnd);
    },
  };
}
