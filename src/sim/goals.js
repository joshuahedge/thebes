// Goal evaluation (spec 4.1, early-game pass 3.2 and 3.3): pure checks against the world, rewards paid into
// the treasury. First-time event goals sit in front of the opening chain; the guided start is the chain's
// first five goals and pays once when they are all done.
import { GOALS, EVENT_GOALS, GUIDE_GOALS, GUIDE_REWARD, OPENING_LAST } from '../data/goals.js';
import { MILESTONES } from '../data/progression.js';
import { housesOf, population, allBuildings } from './world.js';
import { alertsFor } from './alerts.js';
import { lacksRoad } from './reach.js';
import { idx } from './grid.js';
import { atLeast, milestoneIndex } from './progression.js';
import { openRoutes } from './trade.js';
import { raidsOn } from './costs.js';
import { MONUMENTS } from '../data/monuments.js';
import { isMonument, isFinished } from './world.js';
import { touchesRoad } from './reach.js';
import { prestigeOf, guildsNear, monumentAlerts } from './monuments.js';

const SETTLE_MAX = 20;   // settleGoals stops after this many completions in one go

export const goalById = (id) => GOALS.find((g) => g.id === id) || EVENT_GOALS.find((g) => g.id === id) || null;

// A "Build a" goal counts only buildings that can work: one placed off the road (ruling P11) counts once a road touches it.
const countOf = (world, type) => allBuildings(world).filter((b) => b.type === type && !lacksRoad(world, b)).length;
const homesAtTier = (world, tier) => housesOf(world).filter((h) => h.tier >= tier).length;
const hasAlert = (world, code) => alertsFor(world).some((a) => a.code === code);
// Stage 4: monuments of a type finished (a finished monument needs no road, ruling 228), and whether a monument on a road
// has a builders' guild within its crew reach (guildsNear: the guild yard's crew reach, src/sim/monuments.js).
const finishedOf = (world, type) => allBuildings(world).filter((b) => b.type === type && isFinished(b)).length;
const crewNear = (world) => allBuildings(world).some((b) => isMonument(b) && touchesRoad(world, b) && guildsNear(world, b).length > 0);

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
    case 'any': return need.of.some((x) => goalMet(world, x));                         // Stage 4
    case 'finished': return finishedOf(world, need.type) >= (need.n || 1);
    case 'unlocked': return Number.isInteger(world.prestigeUnlocks[need.type]);
    case 'crewNear': return crewNear(world);
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
    case 'finished': { const of = need.n || 1; return { n: Math.min(finishedOf(world, need.type), of), of }; }   // Stage 4
    case 'unlocked': {                                                                  // the prestige its unlock needs
      const of = MONUMENTS[need.type].unlock.prestige;
      return { n: goalMet(world, need) ? of : Math.min(prestigeOf(world), of), of };
    }
    default: return null;
  }
}

// Stage 3: a goal about raids (raids: true) is not for a Peaceful city (spec 4.18).
const forCity = (world, g) => !g.raids || raidsOn(world);
// Stage 4: a goal with `when` stays out of the list until that need is met, without holding up the goals after it.
const ready = (world, g) => !g.when || goalMet(world, g.when);

// The chain this city plays: every goal but the raid goals on Peaceful.
export const chainGoals = (world) => GOALS.filter((g) => forCity(world, g));

// The first time an alert with one of an event goal's trigger codes appears, that goal joins the list (once per city).
// A goal whose building already stands is not news (a covered first fire means a firehouse is there): it waits for a
// later trouble, if the building has gone by then. alerts: the city's alerts when the caller has them (alertsFor's).
export function triggerEventGoals(world, alerts = null) {
  const { completed, triggered } = world.goals;
  const waiting = EVENT_GOALS.filter((g) => !triggered.includes(g.id) && !completed.includes(g.id) && forCity(world, g));
  if (!waiting.length) return [];
  const codes = new Set((alerts || alertsFor(world)).map((a) => a.code));
  const fired = waiting.filter((g) => [].concat(g.trigger).some((c) => codes.has(c)) && !goalMet(world, g.need)).map((g) => g.id);
  triggered.push(...fired);
  return fired;
}

// A goal with a `from` milestone waits until the city has reached it. The milestone itself moves at month end,
// so it counts as reached once the city has had the people for it too (its peak, kept daily, so a few leaving
// before the month end do not take the goals away again): the goal before it (the one that names the people) is
// then done, and the list does not run dry until the month turns. updateMilestone counts the same peak, so that
// month end makes the milestone real and the goal's buildings placeable.
const waits = (world, g) => Boolean(g.from) && !atLeast(world, g.from)
  && Math.max(world.tally.peakPeople, population(world)) < MILESTONES[milestoneIndex(g.from)].population;

// What is not done yet: triggered event goals first (in EVENT_GOALS order), then the chain.
function unfinished(world) {
  const done = new Set(world.goals.completed);
  const triggered = new Set(world.goals.triggered);
  return {
    events: EVENT_GOALS.filter((g) => triggered.has(g.id) && !done.has(g.id) && forCity(world, g)),
    chain: chainGoals(world).filter((g) => !done.has(g.id) && ready(world, g)),
  };
}

// The direction raids come from now: the warning's, the band's, else the last raid's; null before any.
function raidDir(world) {
  const r = world.raid;
  const x = r.warning || r.active || r.last;
  return x ? x.dir : null;
}
// Stage 4: the first stalled site's alert ({ code, id, reason }), or null.
const firstStall = (world) => monumentAlerts(world)[0] || null;
// A goal worded for this city: one with dirText names the raiders' direction ("Build a tower facing the east"); one with
// causeText (Stage 4) names the first stalled site and its cause ("Get stone to the small obelisk"), and aims Show me by it.
function worded(world, g) {
  if (g.dirText && g.dirText[raidDir(world)]) return { ...g, text: g.dirText[raidDir(world)] };
  if (g.causeText) {
    const a = firstStall(world);
    if (a && a.reason in g.causeText) {
      return { ...g, text: g.causeText[a.reason].replace('{site}', MONUMENTS[world.buildings[a.id].type].name.toLowerCase()), showMe: g.causeShowMe[a.reason] };
    }
  }
  return g;
}

// The goals the player sees: triggered event goals first, then the chain, both without the completed ones. The
// chain stops before its first goal that waits for a milestone, so no later goal shows ahead of it.
export function openGoals(world, limit = 3) {
  const { events, chain } = unfinished(world);
  const stop = chain.findIndex((g) => waits(world, g));
  return [...events, ...(stop < 0 ? chain : chain.slice(0, stop))].slice(0, limit).map((g) => worded(world, g));
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

// The opening chain's count (spec 4.1): Founded Thebes, done from the start, and the goals up to OPENING_LAST, as
// { done, of } ("1 of 10" for a new city); null once every one of them is done.
export function openingProgress(world) {
  const opening = GOALS.slice(0, GOALS.findIndex((g) => g.id === OPENING_LAST) + 1);
  const done = opening.filter((g) => world.goals.completed.includes(g.id)).length;
  return done < opening.length ? { done: done + 1, of: opening.length + 1 } : null;
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
