// One browser-history entry per open step (sheet, tool mode, selection, dialog), so the phone's Back
// gesture closes one thing at a time and never leaves the game while something is open (spec 6.4).
import { back, isToolMode } from './modes.js';

const stepsOf = (s) => (s.confirmDialog ? 1 : 0) + (s.sheet && s.sheet.kind !== 'info' ? 1 : 0) + (isToolMode(s.mode) ? 1 : 0) + (s.mode === 'selected' ? 1 : 0);

export function createBackStack({
  store, history = window.history,
  addListener = (type, fn) => window.addEventListener(type, fn),
  removeListener = (type, fn) => window.removeEventListener(type, fn),
}) {
  let depth = 0;      // entries we pushed for steps that are still open
  let stale = 0;      // entries we pushed for steps that were closed another way (Esc, the x button)
  let lastSteps = 0;
  let applying = false;
  let unsubscribe = null;

  function onState(state) {
    const n = stepsOf(state);
    if (n > lastSteps) {
      for (let i = lastSteps; i < n; i++) history.pushState({ thebes: ++depth }, '');
    } else if (n < lastSteps && !applying) {
      stale += lastSteps - n;
      depth -= lastSteps - n;
    }
    lastSteps = n;
  }

  function onPop() {
    if (stale > 0) { stale--; return; }      // a step closed by other means; the entry just expires
    if (depth <= 0) return;                  // nothing open: let the browser go where it was going
    depth--;
    applying = true;
    const patch = back(store.get());
    if (patch) store.set(patch);
    applying = false;
  }

  return {
    start() {
      lastSteps = stepsOf(store.get());
      unsubscribe = store.subscribe(onState);
      addListener('popstate', onPop);
    },
    stop() {
      if (unsubscribe) unsubscribe();
      unsubscribe = null;
      removeListener('popstate', onPop);
    },
    depth: () => depth,
  };
}
