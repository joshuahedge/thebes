import { BUILDINGS } from '../data/buildings.js';
import { MOOD } from '../data/mood.js';
import { allBuildings } from './world.js';
import { touchesRoad } from './reach.js';
import { atLeast } from './progression.js';
import { isWorking } from './labour.js';
import { storeTotal } from './production.js';

export function alertsFor(world) {
  const alerts = [];
  for (const b of allBuildings(world)) {
    const def = BUILDINGS[b.type];
    if (b.type === 'house') continue;
    const road = touchesRoad(world, b);
    if (def.needsRoad && !road) alerts.push({ code: 'no_road', id: b.id });
    if (b.blocked === 'no_storage') alerts.push({ code: 'no_storage', id: b.id });
    if (b.blocked === 'storage_full') alerts.push({ code: 'storage_full', id: b.id });
    if (b.blocked === 'no_input') alerts.push({ code: 'no_input', id: b.id });
    if (def.stores && storeTotal(b) >= def.capacity) alerts.push({ code: 'storage_full', id: b.id });   // any full store
    if (def.workers && road && !b.paused && !isWorking(world, b)) alerts.push({ code: 'understaffed', id: b.id });
    if (def.sells && isWorking(world, b) && def.sells.every((g) => !((b.store[g] || 0) > 0))) alerts.push({ code: 'bazaar_empty', id: b.id });
  }
  for (const level of world.labour.shortLevels || []) alerts.push({ code: 'labour_shortage', level });
  const L = world.labour;
  if (atLeast(world, 'town') && L.workforce > 0 && (L.workforce - L.employed) / L.workforce > MOOD.unemploymentThreshold) {
    alerts.push({ code: 'unemployment' });
  }
  if (world.gold < 0) alerts.push({ code: 'debt' });
  return alerts;
}

export function computeAlerts(world) {
  world.alerts = alertsFor(world);
  return world.alerts;
}
