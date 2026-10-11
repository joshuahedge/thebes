// Celebrations (early-game pass 3.6): captions in #cheer, the last row under the top bar (below the goals strip), for
// firsts, goals, achievements, daily goals, the end of the guide and milestones. One caption at a time: each shows for
// CHEER_MS[tier], and the next starts CHEER_GAP_MS after the previous one started (or when it hides, if it
// shows longer). A caption is a short head (what happened), the gold beside it and, beneath, an optional why
// (why it matters; a phone at larger text hides it from sight, not from screen readers). Nothing to tap and nothing
// takes focus: #cheer is a polite live region, so each caption is read once as it appears. An item's onShow runs when
// its caption appears, so sound and sparkle land with it.
import { CHEER_MS, CHEER_GAP_MS } from '../data/ui.js';
import { el, clear } from './components.js';
import { cheerReward } from './text.js';

export function createCelebrations({ container, setTimer = (fn, ms) => setTimeout(fn, ms), clearTimer = (id) => clearTimeout(id) }) {
  const queue = [];
  let node = null;          // the caption on screen
  let hideTimer = null;     // hides it after its tier's time
  let slotTimer = null;     // frees the row for the next caption; null while the row is free

  function hide() {
    hideTimer = null;
    if (node) { node.remove(); node = null; }
  }

  function next() {
    slotTimer = null;
    const item = queue.shift();
    if (!item) return;
    if (hideTimer !== null) { clearTimer(hideTimer); hide(); }
    const ms = CHEER_MS[item.tier] || CHEER_MS.first;
    // The head and the gold sit on the first line, the why beneath (css/ui.css). The why stays in the live region
    // even where it is hidden from sight, so a screen reader hears all of it.
    node = el('div', { class: `cheer ${item.tier}` }, [
      el('span', { class: 'icon', 'aria-hidden': 'true', text: '★' }),
      el('span', { class: 'text', text: item.text }),
      item.why ? el('span', { class: 'why', text: item.why }) : null,
      item.reward > 0 ? el('span', { class: 'reward', text: cheerReward(item.reward) }) : null,
    ]);
    container.append(node);
    hideTimer = setTimer(hide, ms);
    slotTimer = setTimer(next, Math.max(CHEER_GAP_MS, ms));
    if (typeof item.onShow === 'function') item.onShow();
  }

  return {
    show({ tier = 'first', text, why = '', reward = 0, onShow = null }) {
      queue.push({ tier, text, why, reward, onShow });
      if (slotTimer === null) next();
    },
    clear() {
      queue.length = 0;
      if (hideTimer !== null) clearTimer(hideTimer);
      if (slotTimer !== null) clearTimer(slotTimer);
      hideTimer = null;
      slotTimer = null;
      node = null;
      clear(container);
    },
    pending: () => queue.length,
  };
}
