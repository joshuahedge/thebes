// Goal evaluation: pure checks against the world, one completion per day, the reward paid into the treasury.
import { GOALS } from '../data/goals.js';
import { housesOf, population, allBuildings } from './world.js';

export const goalById = (id) => GOALS.find((g) => g.id === id) || null;

const countOf = (world, type) => allBuildings(world).filter((b) => b.type === type).length;
const roadTiles = (world) => { let n = 0; for (const v of world.road) if (v) n++; return n; };

export function goalMet(world, need) {
  switch (need.kind) {
    case 'road': return roadTiles(world) > world.startRoad.length;
    case 'houses': return housesOf(world).length >= need.n;
    case 'building': return countOf(world, need.type) >= (need.n || 1);
    case 'people': return population(world) >= need.n;
    case 'all': return need.of.every((x) => goalMet(world, x));
    default: return false;
  }
}

export function openGoals(world, limit = 3) {
  const done = new Set(world.goals.completed);
  return GOALS.filter((g) => !done.has(g.id)).slice(0, limit);
}

export function checkGoals(world, events = null) {
  for (const g of openGoals(world)) {
    if (!goalMet(world, g.need)) continue;
    world.goals.completed.push(g.id);
    world.gold += g.reward;
    if (events) events.push({ type: 'goal', id: g.id, reward: g.reward });
    return g;
  }
  return null;
}
