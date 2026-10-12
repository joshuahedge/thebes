// Toasts (spec 6.5): a short line, optionally with one action such as Undo. Two at most on a wide screen, one on a phone
// (ruling 169: the newest replaces the last); the oldest goes.
import { TOAST_MS } from '../data/ui.js';
import { el, button } from './components.js';

export const MAX_TOASTS = 2, MAX_TOASTS_PHONE = 1;

// max: how many may show at once now, a number or a function (createUI passes one that follows the layout).
export function createToasts({ container, max = MAX_TOASTS, setTimer = (fn, ms) => setTimeout(fn, ms), clearTimer = (id) => clearTimeout(id) }) {
  const live = [];      // { node, timer }

  function remove(entry) {
    const i = live.indexOf(entry);
    if (i < 0) return;
    live.splice(i, 1);
    if (entry.timer !== null) clearTimer(entry.timer);
    entry.node.remove();
  }

  return {
    show(text, { action = null, onAction = null, ms = TOAST_MS } = {}) {
      const entry = { node: null, timer: null };
      const parts = [el('span', { class: 'text', text })];
      if (action) parts.push(button(action, { class: 'action', onClick: () => { remove(entry); if (onAction) onAction(); } }));
      entry.node = el('div', { class: 'toast' }, parts);
      const limit = typeof max === 'function' ? max() : max;
      while (live.length >= limit) remove(live[0]);
      live.push(entry);
      container.append(entry.node);
      entry.timer = setTimer(() => remove(entry), ms);
      return entry.node;
    },
    clear() { while (live.length) remove(live[0]); },
  };
}
