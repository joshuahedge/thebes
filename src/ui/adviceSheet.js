// Version 5.0 (Task 1): the City advice sheet and the top-bar button's state. The sheet lists the top ADVICE.top items of cityAdvice (src/sim/advice.js),
// worst first: each a sentence with its numbers, its cause, what to do, what the fix costs (marked in words when the treasury cannot pay it) and a
// Show me or View. Nothing to fix says "All is well" and the next milestone. The advice is read when the sheet opens or is redrawn, and the
// button's dot is read from the same list at every command and every fifth game day (never per frame: it asks every home for its next step), and
// again each time the sheet is read (onRead), so the dot never compares what the sheet showed with keys cached days ago.
// The dot says something appeared that the player has not seen: the keys of the top items when the sheet was last open are kept in the settings
// (adviceSeen, per device), and the dot shows while the top items hold a key not in them (contract, section 5).
import { MILESTONES } from '../data/progression.js';
import { ADVICE } from '../data/advice.js';
import { cityAdvice } from '../sim/advice.js';
import { milestoneNeedsMet } from '../sim/progression.js';
import { housesOf, population } from '../sim/world.js';
import { T, TRAY_TEXT } from './text.js';
import { portrait } from './v81/scribe.js';
import { TRAY_MAX } from './tray.js';
import { ADVICE_TEXT, adviceWords } from './adviceText.js';
import { el, button } from './components.js';
import { cityTabs, markTabPanel } from './v81/stats.js';

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
// Version 8.0 (Track N, ruling 1160): the same sheet holds the message tray (src/ui/tray.js) above the advice. tray() answers { pinned, items, read } (createUI trayModel): pinned are the alerts that
// need a decision ({ code, title, fix, act }), items the kept messages, newest first ({ text, why, act: a function when the message has a place, else null }), and read() marks them read.
// With no message and nothing pinned the sheet is the City advice it was.
// Version 8.1 (Track B, ruling 1226): with onCity the sheet opens on its tabs, Messages (this) and City (the city summary: onCity opens it).
export function adviceSheet({ world, settings, onFix = () => {}, onRead = () => {}, tray = null, onCity = null }) {
  return (body, ctx = {}) => {
    // Integration (ruling 1268): the tabs go above the body (ctx.tabs), which is the Messages tab's panel; a host without that slot gets them at the body's top, as before.
    if (onCity && typeof ctx.tabs === 'function') { ctx.tabs(cityTabs('messages', { onMessages: () => {}, onCity })); markTabPanel(body, 'messages'); }
    else if (onCity) body.append(cityTabs('messages', { onMessages: () => {}, onCity }));
    const model = tray ? tray() : null;
    const hasTray = Boolean(model) && (model.pinned.length > 0 || model.items.length > 0);
    if (hasTray) {
      if (typeof ctx.setTitle === 'function') ctx.setTitle(TRAY_TEXT.sheetTitle);
      body.append(traySection(model));
    }
    const list = cityAdvice(world);
    const top = list.slice(0, ADVICE.top);
    const keys = top.map((a) => a.key);
    if (!sameKeys(keys, settings.get().adviceSeen || [])) settings.set({ adviceSeen: keys });
    onRead(keys);
    if (model) model.read();   // after the advice is marked seen, so the button's number and its dot both clear together
    if (hasTray) body.append(el('h3', { class: 'advice-head', text: TRAY_TEXT.adviceHead }));
    if (!top.length) {
      const next = nextMilestone(world);
      body.append(el('p', { class: 'advice-well', text: ADVICE_TEXT.allWell }));
      body.append(el('p', { class: 'advice-next muted', text: next ? ADVICE_TEXT.next(next, Math.max(world.tally.peakPeople, population(world)), milestoneNeedsMet(world, next)) : ADVICE_TEXT.last(MILESTONES[MILESTONES.length - 1]) }));
      return;
    }
    body.append(el('p', { class: 'small muted advice-lead ipi-lead' }, [portrait(32), el('span', { text: T.adviceLead })]));   // Version 8.1 (ruling 1211): Ipi suggests
    body.append(el('ol', { class: 'advice-list' }, top.map((a) => item(a))));
    if (list.length > top.length) body.append(el('p', { class: 'small muted advice-more', text: ADVICE_TEXT.more(list.length - top.length) }));
  };

  // The tray: what needs you first (pinned, each with a mark in words, so colour is never the cue), then the kept messages, newest first. A message with a place has a Show button
  // (44 px, named for its message) that closes the sheet and takes the view there; one without has nothing to press.
  function traySection(model) {
    // Show is tertiary (a plain link on every row); Open, on a pinned row that needs an answer, is the secondary that stands out (Version 8.0, ruling 1177).
    const go = (label, ariaLabel, act, weight = 'tertiary') => button(label, { class: `tray-go ${weight}`, 'aria-label': ariaLabel, onClick: act });
    const pinned = model.pinned.map((p) => el('li', { class: 'tray-item pinned', dataset: { code: p.code } }, [
      el('div', { class: 'text' }, [el('span', { class: 'pin small', text: `⚑ ${TRAY_TEXT.pinnedMark}` }), ' ', el('strong', { text: p.title }), p.fix ? el('span', { class: 'why small muted', text: p.fix }) : null]),
      go(p.open ? TRAY_TEXT.open : TRAY_TEXT.showMe, p.open ? TRAY_TEXT.openLabel(p.title) : TRAY_TEXT.showLabel(p.title), p.act, p.open ? 'secondary' : 'tertiary'),
    ]));
    const rows = model.items.map((m) => el('li', { class: m.read ? 'tray-item' : 'tray-item unread' }, [
      el('div', { class: 'text' }, [el('span', { text: m.text }), m.why ? el('span', { class: 'why small muted', text: m.why }) : null]),
      m.act ? go(TRAY_TEXT.showMe, TRAY_TEXT.showLabel(m.text), m.act) : null,
    ]));
    return el('section', { class: 'tray', 'aria-label': TRAY_TEXT.head }, [
      el('h3', { class: 'tray-head', text: TRAY_TEXT.head }),
      el('ul', { class: 'tray-list' }, [...pinned, ...rows]),
      model.items.length >= TRAY_MAX ? el('p', { class: 'small muted tray-keeps', text: TRAY_TEXT.keeps }) : null,
    ]);
  }

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

