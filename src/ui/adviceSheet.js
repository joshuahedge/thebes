// Version 5.0 (Task 1): the City advice sheet and the top-bar button's state. The sheet lists the top ADVICE.top items of cityAdvice (src/sim/advice.js),
// worst first: each a sentence with its numbers, its cause, what to do, what the fix costs (marked in words when the treasury cannot pay it) and a
// Show me or View. Nothing to fix says "All is well" and the next milestone. The advice is read when the sheet opens or is redrawn, and the
// button's dot is read from the same list at every command and every fifth game day (never per frame: it asks every home for its next step).
// The dot says something appeared that the player has not seen: the keys of the top items when the sheet was last open are kept in the settings
// (adviceSeen, per device), and the dot shows while the top items hold a key not in them (contract, section 5).
import { MILESTONES } from '../data/progression.js';
import { ADVICE } from '../data/advice.js';
import { cityAdvice } from '../sim/advice.js';
import { housesOf, population } from '../sim/world.js';
import { T } from './text.js';
import { ADVICE_TEXT, adviceWords } from './adviceText.js';
import { el, button } from './components.js';

// The button comes with the first house (or plot) placed: the first home is what a problem can hold back.
export const adviceUnlocked = (world) => housesOf(world).length > 0;

// The keys of the top items, in order.
export const adviceTopKeys = (world) => cityAdvice(world).slice(0, ADVICE.top).map((a) => a.key);

// True while the top items hold a key the sheet has not shown.
export const adviceHasNew = (keys, seen) => keys.some((k) => !(seen || []).includes(k));

const sameKeys = (a, b) => a.length === b.length && a.every((k, i) => k === b[i]);

// The next milestone after the city's, or null at the last.
export function nextMilestone(world) {
  const i = MILESTONES.findIndex((m) => m.id === world.milestone);
  return i >= 0 && i + 1 < MILESTONES.length ? MILESTONES[i + 1] : null;
}

// The custom sheet 'advice' (createUI registers it): onFix(item) does the item's Show me or View. Opening it, and every redraw of it, marks what it
// shows as seen.
export function adviceSheet({ world, settings, onFix = () => {} }) {
  return (body) => {
    const list = cityAdvice(world);
    const top = list.slice(0, ADVICE.top);
    const keys = top.map((a) => a.key);
    if (!sameKeys(keys, settings.get().adviceSeen || [])) settings.set({ adviceSeen: keys });
    if (!top.length) {
      const next = nextMilestone(world);
      body.append(el('p', { class: 'advice-well', text: ADVICE_TEXT.allWell }));
      body.append(el('p', { class: 'advice-next muted', text: next ? ADVICE_TEXT.next(next, Math.max(world.tally.peakPeople, population(world))) : ADVICE_TEXT.last(MILESTONES[MILESTONES.length - 1]) }));
      return;
    }
    body.append(el('p', { class: 'small muted advice-lead', text: T.adviceLead }));
    body.append(el('ol', { class: 'advice-list' }, top.map((a) => item(a))));
    if (list.length > top.length) body.append(el('p', { class: 'small muted advice-more', text: ADVICE_TEXT.more(list.length - top.length) }));
  };

  function item(a) {
    const w = adviceWords(a, world);
    const lines = [el('strong', { class: 'what', text: w.what })];
    const more = [];
    if (w.why) more.push(el('span', { class: 'why small muted', text: w.why }));
    if (w.fix) more.push(el('span', { class: 'fix-words small', text: w.fix }));
    if (w.cost) more.push(el('span', { class: w.short ? 'cost small short' : 'cost small', text: w.cost }));
    const act = w.action ? button(w.action.label, { class: w.action.label === ADVICE_TEXT.show ? 'show-me primary' : 'view quiet', 'aria-label': w.action.aria, onClick: () => onFix(a) }) : null;
    return el('li', { class: 'advice-item', dataset: { kind: a.kind, key: a.key } }, [
      el('div', { class: 'text' }, [...lines, ...more]),
      act,
    ]);
  }
}

