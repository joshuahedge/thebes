import { BUILDINGS } from '../data/buildings.js';
import { GOODS } from '../data/goods.js';
import { allBuildings } from './world.js';
import { buildingsInReach } from './reach.js';
import { isWorking, staffRatio } from './labour.js';
import { DAYS_PER_MONTH } from './time.js';

export const storeTotal = (b) => Object.values(b.store).reduce((s, v) => s + v, 0);

const hasSpace = (s) => storeTotal(s) < BUILDINGS[s.type].capacity;

function storageFor(world, b, good, maxDist) {
  return buildingsInReach(world, b, maxDist, (o) => (BUILDINGS[o.type].stores || []).includes(good) && isWorking(world, o) && hasSpace(o))
    .map((r) => r.b);
}

export function produceDay(world) {
  for (const b of allBuildings(world)) {
    const def = BUILDINGS[b.type];
    if (!def.produces) continue;
    if (!isWorking(world, b)) { b.blocked = b.paused ? 'paused' : 'understaffed'; continue; }
    const { good, perMonth } = def.produces;
    const targets = storageFor(world, b, good, def.producerReach);
    if (!targets.length) { b.blocked = 'no_storage'; continue; }
    b.blocked = null;
    b.progress += (perMonth / DAYS_PER_MONTH) * staffRatio(world, b);
    while (b.progress >= 1 - 1e-9) {
      const t = targets.find(hasSpace);
      if (!t) { b.blocked = 'storage_full'; break; }
      t.store[good] = (t.store[good] || 0) + 1;
      if (GOODS[good].kind === 'food') world.tally.harvested += 1;   // every unit of food that reaches storage
      b.progress -= 1;
    }
  }
}
