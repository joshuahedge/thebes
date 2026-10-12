// Toasts (spec 6.5): a short line, optionally with one action such as Undo. Two at most on a wide screen, one on a phone
// (ruling 169: the newest replaces the last); the oldest goes. A toast shown with keep (on a phone the Update ready toast,
// ruling 177) stands outside that limit: nothing replaces it and it has no timer, so it stays until its action is used or
// its ✕ (named by close) closes it.
import { TOAST_MS } from '../data/ui.js';
import { el, button, iconButton } from './components.js';

export const MAX_TOASTS = 2, MAX_TOASTS_PHONE = 1;

// max: how many may show at once now, a number or a function (createUI passes one that follows the layout).
export function createToasts({ container, max = MAX_TOASTS, setTimer = (fn, ms) => setTimeout(fn, ms), clearTimer = (id) => clearTimeout(id) }) {
  const live = [];      // { node, timer, keep }

  function remove(entry) {
    const i = live.indexOf(entry);
    if (i < 0) return;
    live.splice(i, 1);
    if (entry.timer !== null) clearTimer(entry.timer);
    entry.node.remove();
  }

  return {
    show(text, { action = null, onAction = null, ms = TOAST_MS, keep = false, close = null } = {}) {
      const entry = { node: null, timer: null, keep };
      const parts = [el('span', { class: 'text', text })];
      if (action) parts.push(button(action, { class: 'action', onClick: () => { remove(entry); if (onAction) onAction(); } }));
      if (keep && close) parts.push(iconButton(close, '✕', { class: 'close', onClick: () => remove(entry) }));
      entry.node = el('div', { class: 'toast' }, parts);
      const limit = typeof max === 'function' ? max() : max;
      const counted = () => live.filter((e) => !e.keep);
      if (!keep) while (counted().length >= limit) remove(counted()[0]);
      live.push(entry);
      container.append(entry.node);
      if (!keep) entry.timer = setTimer(() => remove(entry), ms);
      return entry.node;
    },
    // Takes one toast away (the node show returned), if it is still up.
    hide(node) { const entry = live.find((e) => e.node === node); if (entry) remove(entry); },
    clear() { while (live.length) remove(live[0]); },
  };
}
