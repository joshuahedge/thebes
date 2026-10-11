// Goal evaluation (spec 4.1, early-game pass 3.2 and 3.3): pure checks against the world, rewards paid into
// the treasury. First-time event goals sit in front of the opening chain; the guided start is the chain's
// first five goals and pays once when they are all done.
import { GOALS, EVENT_GOALS, GUIDE_GOALS, GUIDE_REWARD } from '../data/goals.js';
import { MILESTONES } from '../data/progression.js';
import { housesOf, population, allBuildings } from './world.js';
import { alertsFor } from './alerts.js';
import { idx } from './grid.js';
import { atLeast, milestoneIndex } from './progression.js';
import { openRoutes } from './trade.js';

const SETTLE_MAX = 20;   // settleGoals stops after this many completions in one go

export const goalById = (id) => GOALS.find((g) => g.id === id) || EVENT_GOALS.find((g) => g.id === id) || null;

const countOf = (world, type) => allBuildings(world).filter((b) => b.type === type).length;
const homesAtTier = (world, tier) => housesOf(world).filter((h) => h.tier >= tier).length;
const hasAlert = (world, code) => alertsFor(world).some((a) => a.code === code);

// Road the player laid: road tiles that are not part of the generator's start road (an exact set
// difference, so taking up a start-road tile and laying one elsewhere still counts the new tile).
export function laidRoadTiles(world) {
  const start = new Set(world.startRoad.map(([x, y]) => idx(world.size, x, y)));
  let n = 0;
  for (let i = 0; i < world.road.length; i++) if (world.road[i] && !start.has(i)) n++;
  return n;
}

export function goalMet(world, need) {
  switch (need.kind) {
    case 'road': return laidRoadTiles(world) > 0;
    case 'houses': return housesOf(world).length >= need.n;
    case 'building': return countOf(world, need.type) >= (need.n || 1);
    case 'people': return population(world) >= need.n;
    case 'tier': return homesAtTier(world, need.tier) >= need.n;
    case 'routes': return openRoutes(world) >= need.n;
    case 'noAlert': return !hasAlert(world, need.code);
    case 'gold': return world.gold >= need.n;
    case 'all': return need.of.every((x) => goalMet(world, x));
    default: return false;
  }
}

// How far a counting goal has got, for the "2 of 6" chip; null for goals that do not count anything.
export function goalProgress(world, goal) {
  const need = goal.need;
  switch (need.kind) {
    case 'houses': return { n: Math.min(housesOf(world).length, need.n), of: need.n };
    case 'building': { const of = need.n || 1; return { n: Math.min(countOf(world, need.type), of), of }; }
    case 'people': return { n: Math.min(population(world), need.n), of: need.n };
    case 'tier': return { n: Math.min(homesAtTier(world, need.tier), need.n), of: need.n };
    case 'routes': return { n: Math.min(openRoutes(world), need.n), of: need.n };
    case 'all': return { n: need.of.filter((x) => goalMet(world, x)).length, of: need.of.length };
    default: return null;
  }
}

// The first time an alert with an event goal's trigger code appears, that goal joins the list (once per city).
export function triggerEventGoals(world) {
  const { completed, triggered } = world.goals;
  const waiting = EVENT_GOALS.filter((g) => !triggered.includes(g.id) && !completed.includes(g.id));
  if (!waiting.length) return [];
  const codes = new Set(alertsFor(world).map((a) => a.code));
  const fired = waiting.filter((g) => codes.has(g.trigger)).map((g) => g.id);
  triggered.push(...fired);
  return fired;
}

// A goal with a `from` milestone waits until the city has reached it. The milestone itself moves at month end,
// so it counts as reached once the city has had the people for it too (its peak, kept daily, so a few leaving
// before the month end do not take the goals away again): the goal before it (the one that names the people) is
// then done, and the list does not run dry until the month turns.
const waits = (world, g) => Boolean(g.from) && !atLeast(world, g.from)
  && Math.max(world.tally.peakPeople, population(world)) < MILESTONES[milestoneIndex(g.from)].population;

// What is not done yet: triggered event goals first (in EVENT_GOALS order), then the chain.
function unfinished(world) {
  const done = new Set(world.goals.completed);
  const triggered = new Set(world.goals.triggered);
  return {
    events: EVENT_GOALS.filter((g) => triggered.has(g.id) && !done.has(g.id)),
    chain: GOALS.filter((g) => !done.has(g.id)),
  };
}

// The goals the player sees: triggered event goals first, then the chain, both without the completed ones. The
// chain stops before its first goal that waits for a milestone, so no later goal shows ahead of it.
export function openGoals(world, limit = 3) {
  const { events, chain } = unfinished(world);
  const stop = chain.findIndex((g) => waits(world, g));
  return [...events, ...(stop < 0 ? chain : chain.slice(0, stop))].slice(0, limit);
}

// Every goal checkGoals can complete: all that are not done, in the same order, except those waiting for a
// milestone (the ones after a waiting goal are still checked).
const earnable = (world) => {
  const { events, chain } = unfinished(world);
  return [...events, ...chain.filter((g) => !waits(world, g))];
};

// Completes at most one earnable goal (any of them, so a met chain goal never waits behind event goals),
// then finishes the guide once its goals are all done.
export function checkGoals(world, events = null) {
  let goal = null;
  for (const g of earnable(world)) {
    if (!goalMet(world, g.need)) continue;
    world.goals.completed.push(g.id);
    world.gold += g.reward;
    if (events) events.push({ type: 'goal', id: g.id, reward: g.reward });
    goal = g;
    break;
  }
  const guide = world.guide;
  if (guide.on && !guide.done && GUIDE_GOALS.every((id) => world.goals.completed.includes(id))) {
    guide.done = true;
    world.gold += GUIDE_REWARD;
    if (events) events.push({ type: 'guide_done', reward: GUIDE_REWARD });
  }
  return goal;
}

// Every goal the city has already earned, in one go (after a command, so steps finish while paused).
export function settleGoals(world, events = null) {
  const done = [];
  for (let i = 0; i < SETTLE_MAX; i++) {
    const g = checkGoals(world, events);
    if (!g) break;
    done.push(g);
  }
  return done;
}

// The card a goal needs next: the first missing building of a compound goal, else its Show me card.
export function nextItemFor(world, goal) {
  if (!goal) return null;
  if (goal.need.kind === 'all') {
    const part = goal.need.of.find((p) => p.kind === 'building' && !goalMet(world, p));
    if (part) return part.type;
  }
  return goal.showMe ? goal.showMe.item : null;
}

export function guideActive(world) {
  const done = new Set(world.goals.completed);
  return Boolean(world.guide.on && !world.guide.done && GUIDE_GOALS.some((id) => !done.has(id)));
}

// The guide's current step: the first open goal that is one of its goals (event goals are skipped).
export function guideGoal(world) {
  return openGoals(world, 99).find((g) => GUIDE_GOALS.includes(g.id)) || null;
}
