// The goals list (spec 4.1; early-game pass 2.7, 3.3 and 3.7). The strip under the top bar shows the first
// open goal with its progress ("2 of 6"), its reward, a filled Show me, Goals and, while the guide runs, Skip
// guide; the whole row hides when no goal is open. The goals sheet shows up to three open goals grouped by
// chapter, then today's daily goals. Goal state lives in the world (src/sim/goals.js, src/sim/daily.js):
// this file reads it, and changes it only through swapDaily.
import { DAILY_REWARD } from '../data/daily.js';
import { openGoals, goalProgress, guideActive, chainGoals } from '../sim/goals.js';
import { dailyProgress, swapDaily } from '../sim/daily.js';
import { alertsFor } from '../sim/alerts.js';
import { housesOf } from '../sim/world.js';
import { TERRAIN_BY_NAME } from '../sim/terrain.js';
import { el, button, clear, setText } from './components.js';
import { T, CHAPTER_NAMES, DAILY_TEXT, goalsProgressText, rewardText, progressText, progressLabel, dailyDoneText, swapLabel, showMeLabel } from './text.js';

const FOCUS_CLASSES = ['show-me', 'open-goals', 'skip-guide'];

// The device's local date as 'YYYY-MM-DD'. It is the only way the date reaches the sim (daily goals).
export function dateKeyOf(ms) {
  const d = new Date(ms);
  const two = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${two(d.getMonth() + 1)}-${two(d.getDate())}`;
}

// The free tile of a terrain ('fertile' or 'rocky') nearest to a point, as the tile's centre; null when there is none.
// Free means no building and no road on it, so Show me never aims at ground that is already built on. A farm or a mine
// needs its terrain (canPlace checks), and the nearest ground of it can lie beyond the ghost's search around a bazaar or a
// home: Show me aims here instead. The goals' rocky target and the house sheet's makers share it.
export function nearestTerrainTile(world, terrain, from) {
  let best = null, bestD = Infinity;
  for (let i = 0; i < world.terrain.length; i++) {
    if (world.terrain[i] !== TERRAIN_BY_NAME[terrain] || world.occ[i] || world.road[i]) continue;
    const x = (i % world.size) + 0.5, y = Math.floor(i / world.size) + 0.5;
    const d = (x - from.x) ** 2 + (y - from.y) ** 2;
    if (d < bestD) { bestD = d; best = { x, y }; }
  }
  return best;
}

// Where a goal's Show me points. 'alert' aims at the first building with that alert (an event goal's trouble; code can
// be a list); 'rocky' at the free rocky tile nearest the city's focus (a gem mine needs rocky ground, as canPlace checks);
// 'raid' (Stage 3) at the homes' side facing a warned or arriving raid, RAID_SHOW_ME_TILES from their centre towards
// its entry, else at the homes; a goal with no showMe (out of debt) and any target that finds nothing fall back to the
// city's focus.
// alerts: the city's alerts when the caller has them (alertsFor's).
const RAID_SHOW_ME_TILES = 6;
export function showMeTarget(world, goal, alerts = null) {
  const show = goal.showMe;
  const kind = show ? show.target : null;
  if (kind === 'alert') {
    const codes = [].concat(show.code);
    const a = (alerts || alertsFor(world)).find((x) => codes.includes(x.code) && x.id && world.buildings[x.id]);
    if (a) { const b = world.buildings[a.id]; return { x: b.x + b.w / 2, y: b.y + b.d / 2 }; }
  }
  if (kind === 'raid') {
    const r = world.raid.warning || world.raid.active;
    const homes = housesOf(world);
    if (r && r.entry && homes.length) {
      const cx = homes.reduce((n, h) => n + h.x + h.w / 2, 0) / homes.length, cy = homes.reduce((n, h) => n + h.y + h.d / 2, 0) / homes.length;
      const dx = r.entry.x + 0.5 - cx, dy = r.entry.y + 0.5 - cy, len = Math.hypot(dx, dy);
      const step = len > 0 ? Math.min(RAID_SHOW_ME_TILES, len) / len : 0;
      return { x: cx + dx * step, y: cy + dy * step };
    }
  }
  if (kind === 'startRoad' && world.startRoad.length) {
    const [x, y] = world.startRoad[world.startRoad.length - 1];
    return { x: x + 0.5, y: y + 0.5 };
  }
  if (kind === 'houses' || kind === 'raid') {
    const homes = housesOf(world);
    if (homes.length) {
      const sx = homes.reduce((n, h) => n + h.x + h.w / 2, 0), sy = homes.reduce((n, h) => n + h.y + h.d / 2, 0);
      return { x: sx / homes.length, y: sy / homes.length };
    }
  }
  if (kind === 'rocky') {
    const best = nearestTerrainTile(world, 'rocky', world.focus);
    if (best) return best;
  }
  return { x: world.focus.x, y: world.focus.y };
}

// "2 of 6" (and its words for screen readers) where a goal counts something, else null. Never past the target.
function countOf(world, goal) {
  const p = goalProgress(world, goal);
  if (!p) return null;
  const n = Math.min(p.n, p.of);
  return { text: progressText(n, p.of), label: progressLabel(n, p.of) };
}
const chip = (c) => el('span', { class: 'chip small', role: 'img', 'aria-label': c.label, text: c.text });
// Several Show me buttons can be on screen at once: each one's name starts with its visible words and says which goal.
const showMeButton = (goal, onShowMe) => button(T.showMe, { class: 'show-me primary', 'aria-label': showMeLabel(goal.text), onClick: () => onShowMe(goal) });

function goalRow(world, goal, onShowMe) {
  const c = countOf(world, goal);
  return el('li', { class: 'goal' }, [
    el('span', { class: 'text' }, [goal.text, ' ', c ? chip(c) : null, c ? ' ' : null, el('span', { class: 'reward small muted', text: rewardText(goal.reward) })]),
    showMeButton(goal, onShowMe),
  ]);
}

export function createGoalsStrip({ container, world, onShowMe, onOpen, onSkipGuide = () => {} }) {
  const strip = el('div', { class: 'goal-strip', hidden: true });
  container.append(strip);
  let shownId, parts = null;

  // Rebuilt only when the goal changes (refreshChrome runs every day and command), so focus survives refreshes.
  function build(goal) {
    const focusedClass = strip.contains(document.activeElement) ? [...document.activeElement.classList].find((c) => FOCUS_CLASSES.includes(c)) : null;
    clear(strip);
    parts = null;
    if (!goal) return;
    const progress = el('span', { class: 'chip small', role: 'img' });
    const text = el('span', { class: 'text' });
    const showMe = showMeButton(goal, onShowMe);
    const skip = button(T.skipGuide, { class: 'skip-guide quiet', onClick: () => onSkipGuide() });
    strip.append(
      el('span', { class: 'main' }, [
        el('span', { class: 'label small muted', text: T.goal }),
        text,
        progress,
        el('span', { class: 'reward small muted wide-only', text: rewardText(goal.reward) }),   // phones read the reward in the goals sheet
      ]),
      el('span', { class: 'buttons' }, [showMe, button(T.goals, { class: 'open-goals quiet', onClick: onOpen }), skip]),
    );
    parts = { text, progress, showMe, skip };
    update(goal);
    if (focusedClass) {
      const again = strip.querySelector(`.${focusedClass}`);
      (again && !again.hidden ? again : showMe).focus();
    }
  }
  // A goal's words can change while it stays first (Stage 3: "Build a tower facing the east" follows the raids' direction).
  function update(goal) {
    setText(parts.text, goal.text);
    parts.showMe.setAttribute('aria-label', showMeLabel(goal.text));
    const c = countOf(world, goal);
    parts.progress.hidden = !c;
    if (c) { setText(parts.progress, c.text); parts.progress.setAttribute('aria-label', c.label); }
    const hide = !guideActive(world);
    if (hide && document.activeElement === parts.skip) parts.showMe.focus();   // Skip guide hides itself: keep focus in the strip
    parts.skip.hidden = hide;
  }
  function render() {
    const [goal] = openGoals(world, 1);
    const id = goal ? goal.id : null;
    strip.hidden = !goal;
    container.hidden = !goal;                         // no empty row, and so no gap, in #under-bar
    if (id !== shownId) { shownId = id; build(goal); }
    else if (goal) update(goal);
  }
  render();
  return { render };
}

// The goals sheet: the chain's count, up to three open goals by chapter, then Today when daily goals are drawn.
export function goalsSheet(world, { onShowMe, onSwap = (i) => swapDaily(world, i).ok }) {
  function draw(body) {
    const chain = chainGoals(world);                   // Stage 3: a Peaceful city's chain has no raid goals
    const done = chain.filter((g) => world.goals.completed.includes(g.id)).length;   // event goals never count against the chain
    body.append(el('p', { class: 'muted', text: goalsProgressText(done, chain.length) }));
    const open = openGoals(world, 3);
    if (!open.length) body.append(el('p', { text: T.goalsDone }));
    const chapters = [];
    for (const g of open) if (!chapters.includes(g.chapter)) chapters.push(g.chapter);
    for (const ch of chapters) {
      body.append(el('h3', { text: CHAPTER_NAMES[ch] || '' }), el('ul', { class: 'goals' }, open.filter((g) => g.chapter === ch).map((g) => goalRow(world, g, onShowMe))));
    }
    if (world.daily) body.append(...today(body));
  }
  // Today (spec 3.7): no streaks, no countdowns. Swap is offered once a day, on a goal not yet done.
  function today(body) {
    const d = world.daily;
    const rows = d.picks.map((id, i) => {
      const done = d.done.includes(id);
      const p = dailyProgress(world, id);
      const text = DAILY_TEXT[id] || id;
      const status = done
        ? el('span', { class: 'status small teal' }, [el('span', { 'aria-hidden': 'true', text: `${T.doneMark} ` }), T.done])
        : p ? chip({ text: progressText(p.n, p.of), label: progressLabel(p.n, p.of) }) : null;
      const swap = !done && !d.swapped
        ? button(T.swap, { class: 'swap quiet', 'aria-label': swapLabel(text), onClick: () => { if (onSwap(i)) { clear(body); draw(body); body.querySelector('.today').focus(); } } })   // the Swap button is gone: focus stays on Today
        : null;
      return el('li', { class: done ? 'daily done' : 'daily' }, [
        el('span', { class: 'text' }, [text, ' ', status, done ? null : ' ', done ? null : el('span', { class: 'reward small muted', text: rewardText(DAILY_REWARD) })]),   // a finished goal has been paid: no reward to promise
        swap,
      ]);
    });
    return [el('h3', { class: 'today', tabindex: '-1', text: T.today }), el('ul', { class: 'goals' }, rows), el('p', { class: 'small muted', text: dailyDoneText(world.tally.dailyDone) })];
  }
  return (body) => draw(body);
}
