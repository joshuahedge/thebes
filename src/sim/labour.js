import { BUILDINGS } from '../data/buildings.js';
import { ECONOMY } from '../data/economy.js';
import { PRIORITY_LEVELS, MIN_STAFF_RATIO } from '../data/labour.js';
import { population, allBuildings } from './world.js';
import { touchesRoad } from './reach.js';
import { crewPlan, hasMonumentWork } from './monuments.js';

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
  for (const level of PRIORITY_LEVELS) {
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
}

export function staffRatio(world, b) {
  const workers = BUILDINGS[b.type].workers;
  if (!workers) return b.paused ? 0 : 1;
  return b.staff / workers;
}

// A workplace works when it is not paused, not in the fire stage of a fire (spec 4.12: no production, service or storage
// use while it burns; a blaze does not stop it) and has at least MIN_STAFF_RATIO of its workers.
export const isWorking = (world, b) => !b.paused && !(b.fire && b.fire.stage === 'fire') && staffRatio(world, b) >= MIN_STAFF_RATIO;
