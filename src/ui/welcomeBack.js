// The Welcome back card (spec 4.17): the date, how long ago, trends, open goals, alerts with View, Carry on.
import { population } from '../sim/world.js';
import { dateParts } from '../sim/clock.js';
import { openGoals } from '../sim/goals.js';
import { CRITICAL } from './alerts.js';
import { el, button } from './components.js';
import { alertText, dateText, plural, T } from './text.js';

const MINUTE = 60 * 1000, HOUR = 60 * MINUTE, DAY = 24 * HOUR;

export function elapsedText(savedAt, now = Date.now()) {
  if (!Number.isFinite(savedAt)) return T.aWhileAgo;
  const ms = Math.max(0, now - savedAt);
  if (ms < MINUTE) return T.justNow;
  if (ms < HOUR) return `${plural(Math.floor(ms / MINUTE), 'minute', 'minutes')} ago`;
  if (ms < DAY) return `${plural(Math.floor(ms / HOUR), 'hour', 'hours')} ago`;
  return `${plural(Math.floor(ms / DAY), 'day', 'days')} ago`;
}

// Compares the current value with the row three months back (or the oldest row when there are fewer).
export function trendText(label, current, history, key) {
  if (!history.length) return `${label} ${current}`;
  const then = history[Math.max(0, history.length - 4)][key];
  if (current > then) return `${label} ${current}, ${T.upFrom} ${then}`;
  if (current < then) return `${label} ${current}, ${T.downFrom} ${then}`;
  return `${label} ${current}, ${T.steadyAt} ${then}`;
}

export function welcomeSheet({ world, savedAt, lastSpeed, now = () => Date.now(), getAlerts = () => [], onView = () => {}, onCarryOn = () => {}, onStayPaused = () => {} }) {
  return (body) => {
    body.append(el('p', { text: dateText(dateParts(world)) }), el('p', { class: 'muted', text: `${T.lastPlayed} ${elapsedText(savedAt, now())}` }));
    body.append(el('ul', { class: 'trends' }, [
      el('li', { text: trendText(T.people, population(world), world.history, 'people') }),
      el('li', { text: trendText(T.gold, world.gold, world.history, 'gold') }),
      el('li', { text: trendText(T.mood, world.mood, world.history, 'mood') }),
    ]));
    const goals = openGoals(world, 3);
    body.append(el('h3', { text: T.goals }), goals.length ? el('ul', { class: 'goals' }, goals.map((g) => el('li', { class: 'goal', text: g.text }))) : el('p', { class: 'muted', text: T.goalsNone }));
    const alerts = [...getAlerts()].sort((a, b) => Number(CRITICAL.has(b.code)) - Number(CRITICAL.has(a.code)));   // critical ones first (stable)
    body.append(el('h3', { text: T.alerts }));
    if (!alerts.length) body.append(el('p', { class: 'muted', text: T.noAlerts }));
    else body.append(el('ul', { class: 'alert-list' }, alerts.map((a) => { const t = alertText(a, world); return el('li', {}, [el('strong', { text: t.title }), ' ', el('span', { class: 'muted', text: t.fix }), ' ', button(T.view, { class: 'view quiet', onClick: () => onView(a) })]); })));
    body.append(el('div', { class: 'actions welcome-actions' }, [
      button(T.carryOn, { class: 'carry-on primary', onClick: () => onCarryOn(lastSpeed) }),
      button(T.stayPaused, { class: 'stay-paused', onClick: () => onStayPaused() }),
    ]));
  };
}
