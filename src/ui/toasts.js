// Toasts (spec 6.5): a short line, optionally with one action such as Undo. Two at most; the oldest goes.
import { TOAST_MS } from '../data/ui.js';
import { el, button } from './components.js';

const MAX_TOASTS = 2;

export function createToasts({ container, setTimer = (fn, ms) => setTimeout(fn, ms), clearTimer = (id) => clearTimeout(id) }) {
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
      while (live.length >= MAX_TOASTS) remove(live[0]);
      live.push(entry);
      container.append(entry.node);
      entry.timer = setTimer(() => remove(entry), ms);
      return entry.node;
    },
    clear() { while (live.length) remove(live[0]); },
  };
}
