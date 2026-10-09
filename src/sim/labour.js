import { BUILDINGS } from '../data/buildings.js';
import { ECONOMY } from '../data/economy.js';
import { PRIORITY_LEVELS, MIN_STAFF_RATIO } from '../data/labour.js';
import { population, allBuildings } from './world.js';
import { touchesRoad } from './reach.js';

export function assignLabour(world) {
  const workforce = Math.floor(population(world) * ECONOMY.workerShare);
  let remaining = workforce;
  let jobs = 0;
  let employed = 0;
  const byLevel = {};
  for (const b of allBuildings(world)) {
    const def = BUILDINGS[b.type];
    if (!def.workers) continue;
    b.staff = 0;
    if (b.paused || !touchesRoad(world, b)) continue;
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

export const isWorking = (world, b) => !b.paused && staffRatio(world, b) >= MIN_STAFF_RATIO;
