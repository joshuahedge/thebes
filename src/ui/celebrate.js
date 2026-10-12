// Celebrations (early-game pass 3.6): captions in #cheer, the last row under the top bar (on a phone, the guidance row,
// spec 6.3), for firsts, goals, achievements, daily goals, the end of the guide and milestones. One caption at a time:
// each shows for CHEER_MS[tier], and the next starts CHEER_GAP_MS after the previous one started (or when it hides, if it
// shows longer). A caption is a short head (what happened), the gold beside it and, beneath, an optional why
// (why it matters; a phone at larger text hides it from sight, not from screen readers). A head may start with a lead
// ("Goal done: ") that a phone keeps for screen readers only, so a goal's caption reads as the strip itself changing.
// Nothing to tap and nothing takes focus: #cheer is a polite live region, so each caption is read once as it appears. An
// item's onShow runs when its caption appears, so sound and sparkle land with it.
// Ruling 165: every caption is also written to recent() (the last CHEER_RECENT_MAX, newest first; the Goals sheet lists
// them), and at most CHEER_WAITING_MAX wait their turn, so an older one goes to Recent only. While hold() is true the
// next caption waits (createUI holds them on a phone while a sheet, a tip or the overlay legend has the guidance row, or
// the alert row has a landscape phone's one row at large text); while dropHeld() is also true (a sheet is open, or that
// alert row has the one row) one held longer than CHEER_HELD_MAX_MS goes to Recent only, and
// resume() shows the next once nothing holds it and the row is free. skip(item) drops a caption to Recent only (on a phone under a banner only info captions show). onChange
// runs whenever a caption appears or hides.
// Stage 3: a caption may carry its own icon (a citizen remark's speech mark), busy() says whether the row is taken, and
// remarkFor picks a citizen remark (spec 4.19).
import { CHEER_MS, CHEER_GAP_MS, CHEER_WAITING_MAX, CHEER_HELD_MAX_MS, CHEER_RECENT_MAX } from '../data/ui.js';
import { REMARK_EVERY_MONTHS, REMARK_SALT, SEASONS } from '../data/tips.js';
import { allBuildings } from '../sim/world.js';
import { monthIndex } from '../sim/clock.js';
import { hash2 } from '../sim/rng.js';
import { el, clear } from './components.js';
import { cheerReward, CITIZEN_REMARKS } from './text.js';

// The citizen remark for the month that has just begun (spec 4.19, ruling 130), or null: only at a month index that is a
// multiple of REMARK_EVERY_MONTHS, from the season's remarks whose building the city has, chosen by
// hash2(seed, month index, REMARK_SALT), so a city hears the same line at the same month every time.
export function remarkFor(world) {
  const m = monthIndex(world);
  if (m <= 0 || m % REMARK_EVERY_MONTHS !== 0) return null;
  const season = SEASONS[m % SEASONS.length];
  const has = new Set(allBuildings(world).map((b) => b.type));
  const pool = CITIZEN_REMARKS.filter((r) => r.season === season && has.has(r.type));
  if (!pool.length) return null;
  return pool[Math.min(pool.length - 1, Math.floor(hash2(world.seed, m, REMARK_SALT) * pool.length))].text;
}

export function createCelebrations({
  container, setTimer = (fn, ms) => setTimeout(fn, ms), clearTimer = (id) => clearTimeout(id), hold = () => false,
  skip = () => false, dropHeld = () => true, now = () => performance.now(), onChange = () => {},
}) {
  const queue = [];
  const recent = [];        // { tier, text, why, reward }: the last captions, newest first, in full
  let node = null;          // the caption on screen
  let hideTimer = null;     // hides it after its tier's time
  let slotTimer = null;     // frees the row for the next caption; null while the row is free

  function hide() {
    hideTimer = null;
    if (node) { node.remove(); node = null; onChange(); }
  }

  function next() {
    slotTimer = null;
    if (hold()) {
      const t = now();
      if (dropHeld()) while (queue.length && t - queue[0].at > CHEER_HELD_MAX_MS) queue.shift();   // waited too long: Recent has it
      return;
    }
    let item = queue.shift();
    while (item && skip(item)) item = queue.shift();
    if (!item) return;
    if (hideTimer !== null) { clearTimer(hideTimer); hide(); }
    const ms = CHEER_MS[item.tier] || CHEER_MS.first;
    // The head and the gold sit on the first line, the why beneath (css/ui.css). The why stays in the live region
    // even where it is hidden from sight, so a screen reader hears all of it.
    node = el('div', { class: item.lead ? `cheer ${item.tier} led` : `cheer ${item.tier}` }, [
      el('span', { class: 'icon', 'aria-hidden': 'true', text: item.icon || '★' }),
      el('span', { class: 'text' }, [item.lead ? el('span', { class: 'lead', text: item.lead }) : null, item.text]),
      item.why ? el('span', { class: 'why', text: item.why }) : null,
      item.reward > 0 ? el('span', { class: 'reward', text: cheerReward(item.reward) }) : null,
    ]);
    container.append(node);
    hideTimer = setTimer(hide, ms);
    slotTimer = setTimer(next, Math.max(CHEER_GAP_MS, ms));
    if (typeof item.onShow === 'function') item.onShow();
    onChange();
  }

  return {
    show({ tier = 'first', text, lead = '', why = '', reward = 0, onShow = null, icon = null }) {
      const item = { tier, text, lead, why, reward, onShow, icon, at: now() };
      recent.unshift({ tier, text: `${lead}${text}`, why, reward });
      if (recent.length > CHEER_RECENT_MAX) recent.length = CHEER_RECENT_MAX;
      if (skip(item)) return;
      queue.push(item);
      while (queue.length > CHEER_WAITING_MAX) queue.shift();
      if (slotTimer === null) next();
    },
    // Shows the next caption if the row is free and nothing holds it; cheap enough to call once a frame.
    resume() { if (slotTimer === null) next(); },
    clear() {
      queue.length = 0;
      if (hideTimer !== null) clearTimer(hideTimer);
      if (slotTimer !== null) clearTimer(slotTimer);
      hideTimer = null;
      slotTimer = null;
      const had = node !== null;
      node = null;
      clear(container);
      if (had) onChange();
    },
    pending: () => queue.length,
    // Whether a caption is on screen now.
    showing: () => node !== null,
    // Whether the caption row is taken: a caption showing, its slot still running, or one waiting.
    busy: () => node !== null || slotTimer !== null || queue.length > 0,
    // The last captions, newest first, in full (a phone may cut a long one at two lines): { tier, text, why, reward }.
    recent: () => recent.slice(),
  };
}
