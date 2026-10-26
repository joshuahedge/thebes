// The tip row (early-game pass 3.4): one tip at a time in #tip, under the goals strip (on a phone, in its place), with
// Got it. A tip fires only on its trigger, at most once per device (settings.seenTips; showing it counts), never in the first
// TIP_FIRST_DELAY_MS of a session (on the wall clock), at least TIP_GAP_MS after the last one and at most
// TIP_HOURLY_MAX an hour (both on the play clock, which runs only while the game does).
// A tip triggered while a tool is active waits in a one-tip slot until flush() runs with no tool active; a tip that
// has waited longer than TIP_HELD_MAX_MS is dropped (it described something that is no longer news). A tip marked
// waits: false (its words are about the sheet or overlay on screen as it fires) is never held: busy, it is dropped unseen.
// The priority tip (Press Play) skips the delay, the gap and the tool rule. Nothing shows under Help: Off.
// autoCloseMs() is how long a tip may stay before tick() closes it (0: until Got it), measured on frameNow(), a clock
// that createUI runs only while the tip is on screen and the game is unpaused, so a tip never closes unseen (a hidden tab,
// a paused game, a sheet over it). A closed tip stays seen.
// setShown(false) takes a tip that is showing off the screen without closing it (on a phone a sheet or the overlay legend
// has the guidance row, spec 6.3); setShown(true) puts it back, written afresh so the live region reads it then.
// #tip is a polite live region: a tip is read once as it appears, and it never takes focus (Got it hands focus on if it had it).
// onChange runs whenever the tip showing changes.
// A phone cuts a tip at two lines (css/ui.css): measure() shows "More ▾" at its end while the words are cut, and a tap on More
// or on the words runs onToggle (createUI opens the tip in place and calls setOpen). An open tip shows all its words, with
// "Less ▴"; setOpen changes the row in place, without writing it again, so the live region never reads it twice.
import { TIPS, TIP_GAP_MS, TIP_HOURLY_MAX, TIP_FIRST_DELAY_MS, TIP_HELD_MAX_MS } from '../data/tips.js';
import { el, button, clear } from './components.js';
import { isCut, writeMore } from './expand.js';
import { TIP_TEXT, T } from './text.js';
import { portrait } from './v81/scribe.js';

const HOUR_MS = 60 * 60 * 1000;

export function createTips({ container, settings, now = () => performance.now(), playNow = now, frameNow = now, autoCloseMs = () => 0, restoreFocus = () => {}, onChange = () => {}, onToggle = () => {}, textFor = (id) => TIP_TEXT[id], showMeFor = () => null }) {
  const started = now();
  const shownAt = [];      // the play time at which each tip of this session appeared
  let showing = null;      // the id on screen
  let showingText = '';    // its words, worked out when it appeared (textFor: a tip may name the city's own numbers)
  let shownFrame = 0;      // the frame-clock time it appeared
  let waiting = null;      // { tip, at }: a tip held back by an active tool, and when
  let onScreen = true;     // false while setShown(false) keeps the tip off the screen
  let open = false;        // the tip is open in place (a phone): all its words show, and its timer is stopped (createUI)
  let row = null, words = null, more = null;   // the row on screen, its words and its More button

  const seen = () => (Array.isArray(settings.get().seenTips) ? settings.get().seenTips : []);
  const enabled = () => settings.get().help !== 'off';

  function allowed(tip, t) {
    if (tip.priority) return true;
    if (showing) return false;
    if (t - started < TIP_FIRST_DELAY_MS) return false;
    const played = playNow();
    if (shownAt.length && played - shownAt[shownAt.length - 1] < TIP_GAP_MS) return false;
    return shownAt.filter((s) => played - s < HOUR_MS).length < TIP_HOURLY_MAX;
  }

  function render() {
    clear(container);
    row = words = more = null;
    if (!showing || !onScreen) return;
    words = el('span', { class: 'text', text: showingText });
    more = el('button', { type: 'button', class: 'more quiet', 'aria-expanded': 'false', hidden: true });
    // A tap on More, or on the cut words, opens or closes the tip (More shows only while the words are cut, or open).
    const body = el('span', { class: 'body', onClick: () => { if (!more.hidden) onToggle(); } }, [el('span', { class: 'label small muted', text: T.tip }), words, more]);
    // Stage 4.5 (Task 4b): a tip may carry a Show me (showMeFor(id) gives its action, or null), which does it and closes the tip.
    const act = showMeFor(showing);
    const showMe = act ? button(T.showMe, { class: 'tip-show-me quiet', 'aria-label': `${T.showMe}: ${showingText}`, onClick: () => { api.dismiss(); act(); } }) : null;
    // Version 8.1 (Track T, ruling 1212): the first-time tips are Ipi's: the scribe's portrait leads the row (decoration; the words are the same).
    row = el('div', { class: 'tip-row ipi-voice' }, [portrait(32), body, showMe, button(T.gotIt, { class: 'got-it quiet', onClick: () => api.dismiss() })]);
    container.append(row);
    paintOpen();
  }
  function paintOpen() {
    if (!row) return;
    row.classList.toggle('open', open);
    more.setAttribute('aria-expanded', String(open));
    measure();
  }
  // "More ▾" while the words are cut, "Less ▴" while open; measured with the control hidden, so it never decides its own need.
  function measure() {
    if (!row) return false;
    more.hidden = true;
    const cut = !open && isCut(words);
    if (cut || open) { writeMore(more, open); more.hidden = false; }
    return cut;
  }

  function consider(tip, busy) {
    if (!enabled() || seen().includes(tip.id)) return false;
    const t = now();
    if (busy && !tip.priority) {
      if (tip.waits === false) return false;            // its words would be false by the time the slot is flushed; unseen, it may fire again
      // One slot: the first tip held keeps it, unless it has gone stale; the same tip triggering again is still news.
      if (!waiting || waiting.tip === tip || t - waiting.at > TIP_HELD_MAX_MS) waiting = { tip, at: t };
      return false;
    }
    if (!allowed(tip, t)) return false;
    showing = tip.id;
    showingText = textFor(tip.id);
    open = false;
    shownFrame = frameNow();
    shownAt.push(playNow());
    settings.set({ seenTips: [...seen(), tip.id] });
    render();
    onChange();
    return true;
  }

  const api = {
    trigger(key, { busy = false } = {}) {
      const tip = TIPS.find((x) => x.trigger === key);
      return tip ? consider(tip, busy) : false;
    },
    flush({ busy = false } = {}) {
      if (busy || !waiting) return false;
      const held = waiting;
      waiting = null;
      if (now() - held.at > TIP_HELD_MAX_MS) return false;
      return consider(held.tip, false);
    },
    // Once a frame: closes a tip that has stayed as long as autoCloseMs() allows. Returns true when it closed one.
    tick() {
      if (!showing || open) return false;               // a tip open in place stays until it is closed
      const ms = autoCloseMs();
      if (!(ms > 0) || frameNow() - shownFrame < ms) return false;
      api.dismiss();
      return true;
    },
    // A keyboard user who pressed Got it would lose focus with the button: restoreFocus (createUI) puts it back in the strip.
    dismiss() {
      if (!showing) return;
      const hadFocus = container.contains(document.activeElement);
      showing = null;
      open = false;
      render();
      onChange();                                       // first: on a phone the goal comes back into the row, so focus has somewhere to go
      if (hadFocus) restoreFocus();
    },
    setShown(on) {
      if (Boolean(on) === onScreen) return;
      onScreen = Boolean(on);
      render();
    },
    setOpen(on) {
      if (Boolean(on) === open) return;
      open = Boolean(on);
      paintOpen();
    },
    measure,
    current: () => showing,
  };
  return api;
}
