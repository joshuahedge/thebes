import { BUILDINGS } from '../data/buildings.js';
import { ECONOMY } from '../data/economy.js';
import { PRIORITY_LEVELS, PRIORITY_LEVELS_BEFORE_TOWN, MIN_STAFF_RATIO } from '../data/labour.js';
import { atLeast } from './progression.js';
import { population, allBuildings } from './world.js';
import { touchesRoad } from './reach.js';
import { crewPlan, hasMonumentWork } from './monuments.js';
import { syncFerries } from './ferries.js';

// Version 9.2 (Track L, ruling 1758): the order workers fill the levels in now: services ahead of safety until the city is a Town, then 9.1's order.
export const priorityOrder = (world) => (atLeast(world, 'town') ? PRIORITY_LEVELS : PRIORITY_LEVELS_BEFORE_TOWN);

// Version 9.2 (Track L, design 2.6): why a short workplace is short, for its alert's words: the kind of building holding the most workers on the level just ahead of its own (in the
// order now used) that has any, or null when no level ahead of it holds a worker. Read from the staff assignLabour gave, never a stored guess.
export function workersWentTo(world, b) {
  const order = priorityOrder(world), mine = order.indexOf(BUILDINGS[b.type].priority);
  for (let k = mine - 1; k >= 0; k--) {
    const by = {};
    for (const o of allBuildings(world)) {
      const def = BUILDINGS[o.type];
      if (def.workers && def.priority === order[k] && o.staff > 0) by[o.type] = (by[o.type] || 0) + o.staff;
    }
    const best = Object.entries(by).sort((p, q) => q[1] - p[1] || (p[0] < q[0] ? -1 : 1))[0];
    if (best) return best[0];
  }
  return null;
}

export function assignLabour(world) {
  const workforce = Math.floor(population(world) * ECONOMY.workerShare);
  let remaining = workforce;
  let jobs = 0;
  let employed = 0;
  const byLevel = {};
  let plan = null;   // Stage 4: the crew plan, worked out once and only when a monuments workplace stands
  for (const b of allBuildings(world)) {
    const def = BUILDINGS[b.type];
    if (!def.workers) continue;
    b.staff = 0;
    if (b.paused || !touchesRoad(world, b)) continue;
    // Stage 4 (spec 4.8, 4.16, ruling 187): a monuments workplace with no work today (hasMonumentWork: a builders' guild
    // with no site, a quarry or brickworks no site needs) employs nobody, so pays no wages (upkeep still runs), and its
    // jobs are not counted.
    if (def.priority === 'monuments' && !hasMonumentWork(world, b, plan || (plan = crewPlan(world)))) continue;
    (byLevel[def.priority] = byLevel[def.priority] || []).push(b);
    jobs += def.workers;
  }
  const shortLevels = [];
  for (const level of priorityOrder(world)) {
    const list = byLevel[level] || [];
    if (!list.length) continue;
    const demand = list.reduce((s, b) => s + BUILDINGS[b.type].workers, 0);
    const give = Math.min(remaining, demand);
    if (give < demand) shortLevels.push(level);
    let given = 0;
    for (const b of list) {
      b.staff = Math.floor((BUILDINGS[b.type].workers * give) / demand);
      given += b.staff;
    }
    for (const b of list) {
      if (given >= give) break;
      if (b.staff < BUILDINGS[b.type].workers) { b.staff++; given++; }
    }
    remaining -= give;
    employed += give;
  }
  world.labour = { workforce, employed, jobs, shortLevels };
  syncFerries(world);   // Version 7.1 (Track F): a crossing opens or closes with its two ferrymen; the roads' version moves when it does
}

export function staffRatio(world, b) {
  const workers = BUILDINGS[b.type].workers;
  if (!workers) return b.paused ? 0 : 1;
  return b.staff / workers;
}

// A workplace works when it is not paused, not in the fire stage of a fire (spec 4.12: no production, service or storage
// use while it burns; a blaze does not stop it) and has at least MIN_STAFF_RATIO of its workers.
export const isWorking = (world, b) => !b.paused && !(b.fire && b.fire.stage === 'fire') && staffRatio(world, b) >= MIN_STAFF_RATIO;
