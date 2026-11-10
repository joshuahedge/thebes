// Toasts (spec 6.5): a short line, optionally with one action such as Undo. Two at most on a wide screen, one on a phone
// (ruling 169: the newest replaces the last); the oldest goes. A toast shown with keep (on a phone the Update ready toast,
// ruling 177) stands outside that limit: nothing replaces it and it has no timer, so it stays until its action is used or
// its ✕ (named by close) closes it.
import { TOAST_MS } from '../data/ui.js';
import { el, button, iconButton } from './components.js';

export const MAX_TOASTS = 2, MAX_TOASTS_PHONE = 1;

// max: how many may show at once now, a number or a function (createUI passes one that follows the layout).
// Version 7.1.1 (ruling 1100): held() says whether a card stands over the screen (the lesson's step card): a timed toast is then not shown at all (show answers null), since it
// reports something already done and would sit on the card's words; dropLoose() takes the timed ones that are up away when a card comes up. A kept toast (Update ready) waits.
// Version 8.0 (Track N, ruling 1160): record(text, { at }) keeps every toast that is not kept in the message tray (src/ui/tray.js) and returns its id, even one that is not shown because
// a card is up (the message is still news); forget(id) takes it out again when its action (the Undo) is used, since a placement taken back is no longer news.
export function createToasts({ container, max = MAX_TOASTS, setTimer = (fn, ms) => setTimeout(fn, ms), clearTimer = (id) => clearTimeout(id), held = () => false, record = null, forget = null }) {
  const live = [];      // { node, timer, keep, trayId, group }
  const queue = [];     // Version 9.2 (Track Q, ruling 1794): toasts that wait their turn { text, opts, trayId }
  const limitNow = () => (typeof max === 'function' ? max() : max);
  const counted = () => live.filter((e) => !e.keep);
  // A toast with a group never shows beside another of that group ("Paused while you were away" and the install ask are one: the first stays, the other waits); one with waits never
  // replaces a toast that is up (it waits until there is room), the install ask on a phone.
  const busy = (o) => Boolean(o.group && live.some((e) => e.group === o.group)) || Boolean(o.waits && counted().length >= limitNow());
  let placing = false;   // placing a toast takes the oldest away when the screen is full: that must not bring a waiting one in first
  function flush() {
    if (placing) return;
    while (queue.length && !busy(queue[0].opts)) { const q = queue.shift(); place(q.text, q.opts, q.trayId); }
  }

  function remove(entry) {
    const i = live.indexOf(entry);
    if (i < 0) return;
    live.splice(i, 1);
    if (entry.timer !== null) clearTimer(entry.timer);
    entry.node.remove();
    flush();
  }

  return {
    // actionKeys (Version 7.0, Track P): { title, keys } for the action's tooltip and aria-keyshortcuts (the Undo's Ctrl+Z, and Delete while single keys are on).
    // closable (Version 7.1.1, ruling 1101): a timed toast with a ✕ (named by close) that hides it; the Undo toast has one.
    // at (Version 8.0): the place on the map the message is about, { x, y } in tiles, for the tray's "show me".
    // tray: false keeps a message out of the tray (the Update ready offer has its own way of coming back).
    // group, waits (Version 9.2, Track Q, ruling 1794): see busy above; a toast that has to wait is shown, once, when it can.
    show(text, opts = {}) {
      const { keep = false, tray = true, at = null } = opts;
      const trayId = record && !keep && tray ? record(text, { at }) : null;
      if (!keep && held()) return null;
      if (!keep && busy(opts)) { queue.push({ text, opts, trayId }); return null; }
      return place(text, opts, trayId);
    },
    // Takes one toast away (the node show returned), if it is still up. forgetIt also takes its message out of the tray (an Undo that ran).
    hide(node, forgetIt = false) {
      const entry = live.find((e) => e.node === node);
      if (!entry) return;
      remove(entry);
      if (forgetIt && forget && entry.trayId !== null) forget(entry.trayId);
    },
    clear() { queue.length = 0; while (live.length) remove(live[0]); },
    dropLoose() { queue.length = 0; for (const e of live.filter((x) => !x.keep)) remove(e); },
  };

  function place(text, { action = null, onAction = null, ms = TOAST_MS, keep = false, close = null, closable = false, actionKeys = null, group = null } = {}, trayId = null) {
    {
      const entry = { node: null, timer: null, keep, trayId, group };
      const parts = [el('span', { class: 'text', text })];
      if (action) parts.push(button(action, { class: 'action', title: actionKeys && actionKeys.title, 'aria-keyshortcuts': actionKeys && actionKeys.keys, onClick: () => { remove(entry); if (forget && entry.trayId !== null) forget(entry.trayId); if (onAction) onAction(); } }));
      if ((keep || closable) && close) parts.push(iconButton(close, '✕', { class: 'close', onClick: () => remove(entry) }));
      entry.node = el('div', { class: 'toast' }, parts);
      const limit = limitNow();
      placing = true;
      if (!keep) while (counted().length >= limit) remove(counted()[0]);
      placing = false;
      live.push(entry);
      container.append(entry.node);
      if (!keep) entry.timer = setTimer(() => remove(entry), ms);
      return entry.node;
    }
  }
}
