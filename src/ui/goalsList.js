// The goals list (spec 4.1): the first open goal as a strip under the top bar, up to three in a sheet,
// each with Show me. Goal state lives in the world (src/sim/goals.js); this file only reads it.
import { GOALS } from '../data/goals.js';
import { openGoals } from '../sim/goals.js';
import { housesOf } from '../sim/world.js';
import { el, button, clear } from './components.js';
import { T } from './text.js';

const rewardText = (goal) => `+${goal.reward}`;

export function showMeTarget(world, goal) {
  const kind = goal.showMe.target;
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
  function render() {
    const [goal] = openGoals(world, 1);
    clear(strip);
    strip.hidden = !goal;
    if (!goal) return;
    strip.append(
      el('span', { class: 'label small muted', text: T.goal }),
      el('span', { class: 'text' }, [goal.text, ' ', el('span', { class: 'reward small muted', text: rewardText(goal) })]),
      button(T.showMe, { class: 'show-me quiet', onClick: () => onShowMe(goal) }),
      button(T.goals, { class: 'open-goals quiet', onClick: onOpen }),
    );
  }
  render();
  return { render };
}

export function goalsSheet(world, { onShowMe }) {
  return (body) => {
    const open = openGoals(world, 3);
    body.append(el('p', { class: 'muted', text: `${world.goals.completed.length} of ${GOALS.length} done` }));
    if (!open.length) { body.append(el('p', { text: T.goalsDone })); return; }
    body.append(el('ul', { class: 'goals' }, open.map((g) => goalRow(g, onShowMe))));
  };
}
