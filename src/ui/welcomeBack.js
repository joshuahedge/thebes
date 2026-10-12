// The Welcome back card (spec 4.17; early-game pass 3.9): the date, how long ago, trends with ▲ and ▼ beside
// the words, open goals, today's goals, the achievement closest to done, alerts with View, Carry on.
import { population } from '../sim/world.js';
import { dateParts } from '../sim/clock.js';
import { openGoals, guideActive } from '../sim/goals.js';
import { dailyProgress } from '../sim/daily.js';
import { achievementProgress, achievementsFor } from '../sim/achievements.js';
import { CRITICAL } from './alerts.js';
import { scoreOf } from '../sim/score.js';
import { SCORE_VERSION } from '../data/scoring.js';
import { el, button } from './components.js';
import { alertText, dateText, plural, progressText, closestAchievementText, viewLabel, ACHIEVEMENT_NAMES, ACHIEVEMENT_TEXT, DAILY_TEXT, TREND_MARKS, SCORE_TEXT, T } from './text.js';

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

// Which way trendText's comparison went: 'up', 'down', 'steady', or null with no history.
export function trendDirection(current, history, key) {
  if (!history.length) return null;
  const then = history[Math.max(0, history.length - 4)][key];
  return current > then ? 'up' : current < then ? 'down' : 'steady';
}

// The mark is decoration (aria-hidden); the words carry the meaning, so colour and shape are never the only signal.
function trendRow(label, current, history, key) {
  const dir = trendDirection(current, history, key);
  return el('li', { class: dir ? `trend-row ${dir}` : 'trend-row' }, [
    TREND_MARKS[dir] ? el('span', { class: `trend ${dir}`, 'aria-hidden': 'true', text: TREND_MARKS[dir] }) : null,
    el('span', { class: 'words', text: trendText(label, current, history, key) }),
  ]);
}

// The month-end rows the score trend compares with (spec 4.17, 4.19; Track D): those holding a score made under this score
// version. A row without a version is a score v1 row (MIGRATIONS[4] marks them; ruling 203).
export const scoreTrendRows = (world) => world.history.filter((r) => Number.isFinite(r.score) && (Number.isInteger(r.version) ? r.version : 1) === SCORE_VERSION);

// The unfinished achievement nearest to done: the highest share of its count, ties to the earlier one in
// ACHIEVEMENTS. Recorded ones, ones already at their count, and ones not started are left out. Null if none.
export function closestAchievement(world) {
  const done = new Set(world.achievements || []);
  let best = null;
  for (const def of achievementsFor(world)) {      // Stage 3: none about raids on Peaceful
    if (done.has(def.id)) continue;
    const p = achievementProgress(world, def);
    if (p.n <= 0 || p.n >= p.of) continue;
    const share = p.n / p.of;
    if (!best || share > best.share) best = { def, n: p.n, of: p.of, share };
  }
  return best ? { def: best.def, n: best.n, of: best.of } : null;
}

// One of today's goals: its words, then Done or its count in words (the tick is decoration). A pick the pool no
// longer has (a save from an older version) has no count to show, as in the goals sheet.
function dailyRow(world, id) {
  const done = world.daily.done.includes(id);
  const p = dailyProgress(world, id);
  const status = done
    ? el('span', { class: 'status small teal' }, [el('span', { class: 'tick', 'aria-hidden': 'true', text: `${T.doneMark} ` }), T.done])
    : p ? el('span', { class: 'status small muted', text: progressText(p.n, p.of) }) : null;
  return el('li', { class: done ? 'goal done' : 'goal' }, [el('span', { class: 'text', text: DAILY_TEXT[id] || id }), status]);
}

export function welcomeSheet({ world, savedAt, lastSpeed, now = () => Date.now(), getAlerts = () => [], onView = () => {}, onCarryOn = () => {}, onStayPaused = () => {} }) {
  return (body) => {
    body.append(el('p', { text: dateText(dateParts(world)) }), el('p', { class: 'muted', text: `${T.lastPlayed} ${elapsedText(savedAt, now())}` }));
    body.append(el('ul', { class: 'trends' }, [
      trendRow(T.people, population(world), world.history, 'people'),
      trendRow(T.gold, world.gold, world.history, 'gold'),
      trendRow(T.mood, world.mood, world.history, 'mood'),
      // Stage 3 (spec 4.17, 4.19): the city score against the month-end rows that hold one (a version 3 save's rows do not).
      // Stage 4: only rows of this score version, so a city does not seem to drop overnight when the formula changes.
      trendRow(SCORE_TEXT.score, scoreOf(world).total, scoreTrendRows(world), 'score'),
    ]));
    const goals = openGoals(world, 3);
    body.append(el('h3', { text: T.goals }), goals.length ? el('ul', { class: 'goals' }, goals.map((g) => el('li', { class: 'goal', text: g.text }))) : el('p', { class: 'muted', text: T.goalsNone }));
    if (world.daily) body.append(el('h3', { text: T.today }), el('ul', { class: 'goals today' }, world.daily.picks.map((id) => dailyRow(world, id))));
    const closest = guideActive(world) ? null : closestAchievement(world);   // achievements stay hidden while the guide runs
    if (closest) body.append(el('p', { class: 'closest', text: closestAchievementText(ACHIEVEMENT_NAMES[closest.def.id], closest.n, closest.of, ACHIEVEMENT_TEXT[closest.def.id]) }));
    const alerts = [...getAlerts()].sort((a, b) => Number(CRITICAL.has(b.code)) - Number(CRITICAL.has(a.code)));   // critical ones first (stable)
    body.append(el('h3', { text: T.alerts }));
    if (!alerts.length) body.append(el('p', { class: 'muted', text: T.noAlerts }));
    else body.append(el('ul', { class: 'alert-list' }, alerts.map((a) => { const t = alertText(a, world); return el('li', {}, [el('strong', { text: t.title }), ' ', el('span', { class: 'muted', text: t.fix }), ' ', button(T.view, { class: 'view quiet', 'aria-label': viewLabel(t.title), onClick: () => onView(a) })]); })));
    body.append(el('div', { class: 'actions welcome-actions' }, [
      button(T.carryOn, { class: 'carry-on primary', onClick: () => onCarryOn(lastSpeed) }),
      button(T.stayPaused, { class: 'stay-paused', onClick: () => onStayPaused() }),
    ]));
  };
}
