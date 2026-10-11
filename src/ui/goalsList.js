// The goals list (spec 4.1): the first open goal as a strip under the top bar, up to three in a sheet,
// each with Show me. Goal state lives in the world (src/sim/goals.js); this file only reads it.
import { GOALS } from '../data/goals.js';
import { openGoals } from '../sim/goals.js';
import { alertsFor } from '../sim/alerts.js';
import { housesOf } from '../sim/world.js';
import { el, button, clear } from './components.js';
import { T, goalsProgressText } from './text.js';

const rewardText = (goal) => `+${goal.reward}`;

// Where a goal's Show me points. 'alert' aims at the first building with that alert (an event goal's trouble);
// a goal with no showMe (out of debt) and any target that finds nothing fall back to the city's focus.
export function showMeTarget(world, goal) {
  const show = goal.showMe;
  const kind = show ? show.target : null;
  if (kind === 'alert') {
    const a = alertsFor(world).find((x) => x.code === show.code && x.id && world.buildings[x.id]);
    if (a) { const b = world.buildings[a.id]; return { x: b.x + b.w / 2, y: b.y + b.d / 2 }; }
  }
  if (kind === 'startRoad' && world.startRoad.length) {
    const [x, y] = world.startRoad[world.startRoad.length - 1];
    return { x: x + 0.5, y: y + 0.5 };
  }
  if (kind === 'houses') {
    const homes = housesOf(world);
    if (homes.length) {
      const sx = homes.reduce((n, h) => n + h.x + h.w / 2, 0), sy = homes.reduce((n, h) => n + h.y + h.d / 2, 0);
      return { x: sx / homes.length, y: sy / homes.length };
    }
  }
  return { x: world.focus.x, y: world.focus.y };
}

function goalRow(goal, onShowMe) {
  return el('li', { class: 'goal' }, [
    el('span', { class: 'text' }, [goal.text, ' ', el('span', { class: 'reward small muted', text: `${rewardText(goal)} ${T.gold.toLowerCase()}` })]),
    button(T.showMe, { class: 'show-me quiet', onClick: () => onShowMe(goal) }),
  ]);
}

export function createGoalsStrip({ container, world, onShowMe, onOpen }) {
  const strip = el('div', { class: 'goal-strip', hidden: true });
  container.append(strip);
  let shownId = null;
  function render() {
    const [goal] = openGoals(world, 1);
    const id = goal ? goal.id : null;
    strip.hidden = !goal;
    if (id === shownId) return;                       // refreshChrome runs every day and command: keep the buttons (and their focus) unless the goal changed
    shownId = id;
    // The strip rebuilds when the goal changes, so remember which button had focus and put it back (spec 6.8).
    const focusedClass = strip.contains(document.activeElement) ? [...document.activeElement.classList].find((c) => c === 'show-me' || c === 'open-goals') : null;
    clear(strip);
    if (!goal) return;
    strip.append(
      el('span', { class: 'label small muted', text: T.goal }),
      el('span', { class: 'text' }, [goal.text, ' ', el('span', { class: 'reward small muted', text: rewardText(goal) })]),
      button(T.showMe, { class: 'show-me quiet', onClick: () => onShowMe(goal) }),
      button(T.goals, { class: 'open-goals quiet', onClick: onOpen }),
    );
    if (focusedClass) strip.querySelector(`.${focusedClass}`).focus();
  }
  render();
  return { render };
}

export function goalsSheet(world, { onShowMe }) {
  return (body) => {
    const open = openGoals(world, 3);
    body.append(el('p', { class: 'muted', text: goalsProgressText(world.goals.completed.length, GOALS.length) }));
    if (!open.length) { body.append(el('p', { text: T.goalsDone })); return; }
    body.append(el('ul', { class: 'goals' }, open.map((g) => goalRow(g, onShowMe))));
  };
}
