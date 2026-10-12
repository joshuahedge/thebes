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
import { TIPS, TIP_GAP_MS, TIP_HOURLY_MAX, TIP_FIRST_DELAY_MS, TIP_HELD_MAX_MS } from '../data/tips.js';
import { el, button, clear } from './components.js';
import { TIP_TEXT, T } from './text.js';

const HOUR_MS = 60 * 60 * 1000;

export function createTips({ container, settings, now = () => performance.now(), playNow = now, frameNow = now, autoCloseMs = () => 0, restoreFocus = () => {}, onChange = () => {} }) {
  const started = now();
  const shownAt = [];      // the play time at which each tip of this session appeared
  let showing = null;      // the id on screen
  let shownFrame = 0;      // the frame-clock time it appeared
  let waiting = null;      // { tip, at }: a tip held back by an active tool, and when
  let onScreen = true;     // false while setShown(false) keeps the tip off the screen

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
    if (!showing || !onScreen) return;
    container.append(el('div', { class: 'tip-row' }, [
      el('span', { class: 'label small muted', text: T.tip }),
      el('span', { class: 'text', text: TIP_TEXT[showing] }),
      button(T.gotIt, { class: 'got-it quiet', onClick: () => api.dismiss() }),
    ]));
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
      if (!showing) return false;
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
      render();
      onChange();                                       // first: on a phone the goal comes back into the row, so focus has somewhere to go
      if (hadFocus) restoreFocus();
    },
    setShown(on) {
      if (Boolean(on) === onScreen) return;
      onScreen = Boolean(on);
      render();
    },
    current: () => showing,
  };
  return api;
}
