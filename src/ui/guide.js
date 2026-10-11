// The guided start (early-game pass 3.2). While the city's guide runs, the card its current step needs carries
// a "Suggested" tag and a teal ring, every other card and category is dimmed but stays usable, the suggested
// category carries a dot, and the map rings the step's target: two pulses when the step changes, then still.
// This module only reads the world and sets classes; createUI turns the guide on and off through setGuide.
import { GUIDE_GOALS } from '../data/goals.js';
import { categoryOfItem, GUIDE_PULSES, GUIDE_PULSE_MS } from '../data/ui.js';
import { guideActive, guideGoal, nextItemFor } from '../sim/goals.js';
import { showMeTarget } from './goalsList.js';
import { el } from './components.js';
import { T } from './text.js';

const OFF = { active: false, goal: null, item: null, category: null };

// What the guide points at now: its step, the item that step needs next and that item's category.
export function guideState(world) {
  const goal = guideActive(world) ? guideGoal(world) : null;
  if (!goal) return OFF;
  const item = nextItemFor(world, goal) || (goal.showMe ? goal.showMe.item : null);
  return { active: true, goal, item, category: item ? categoryOfItem(item) : null };
}

// How to play offers "Resume guide" only while the guide is off and one of its steps is still open: a guide
// resumed after every step is done would pay its 50-gold bonus for nothing it guided.
export function canResumeGuide(world) {
  const done = new Set(world.goals.completed);
  return !world.guide.on && !world.guide.done && GUIDE_GOALS.some((id) => !done.has(id));
}

export function createGuide({ world, store, root, reducedMotion = () => false }) {
  let current = OFF;
  let ringId = null, ringSince = 0;
  let marked = true;         // whether any guide class may be on the page; true at first, so the first pass clears

  // Cards are rebuilt whenever their tray, grid or drawer re-renders, so the classes go back on after every
  // store change (this subscription runs after the dock's, panel's and rail's) and every refreshChrome. Once the
  // guide is off and its marks are cleared, a rebuilt card has none, so there is nothing to sweep.
  function apply() {
    const { active, item, category } = current;
    if (!active && !marked) return;
    marked = active;
    root.classList.toggle('guide-on', active);
    for (const card of root.querySelectorAll('.card[data-item]')) {
      const suggested = active && card.dataset.item === item;
      card.classList.toggle('suggested', suggested);
      card.classList.toggle('dimmed', active && !suggested);
      const tag = card.querySelector('.tag');
      if (suggested && !tag) card.append(el('span', { class: 'tag', text: T.suggested }));
      if (!suggested && tag) tag.remove();
    }
    for (const b of root.querySelectorAll('.cat[data-category], .tab[data-category]')) {
      const suggested = active && b.dataset.category === category;
      b.classList.toggle('suggested', suggested);
      b.classList.toggle('dimmed', active && !suggested);
    }
  }
  function render() { current = guideState(world); apply(); return current; }

  render();
  const unsubscribe = store.subscribe(apply);
  return {
    state: () => current,
    render,
    // The map ring for one frame: { x, y, pulsing, age } at the step's Show me target, or null without a guide. age
    // is the time since the step began, so the pulses start at the step change. A new step pulses afresh; at rest
    // (and always under reduced motion) the ring is drawn still.
    marker(now) {
      if (!current.active) { ringId = null; return null; }
      if (current.goal.id !== ringId) { ringId = current.goal.id; ringSince = now; }
      const at = showMeTarget(world, current.goal);
      const age = now - ringSince;
      return { x: at.x, y: at.y, pulsing: !reducedMotion() && age < GUIDE_PULSES * GUIDE_PULSE_MS, age };
    },
    destroy() { unsubscribe(); current = OFF; apply(); },
  };
}
