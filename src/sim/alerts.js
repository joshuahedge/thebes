import { BUILDINGS } from '../data/buildings.js';
import { FOOD_GOODS } from '../data/goods.js';
import { MOOD } from '../data/mood.js';
import { allBuildings, housesOf } from './world.js';
import { touchesRoad } from './reach.js';
import { atLeast } from './progression.js';
import { isWorking } from './labour.js';
import { storeTotal } from './production.js';
import { fireAlerts } from './fire.js';
import { raidAlerts } from './raids.js';

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
    if (def.workers && road && !b.paused && !(b.fire && b.fire.stage === 'fire') && !isWorking(world, b)) alerts.push({ code: 'understaffed', id: b.id });
    if (def.sells && isWorking(world, b) && FOOD_GOODS.every((g) => !((b.store[g] || 0) > 0))) alerts.push({ code: 'bazaar_empty', id: b.id });   // no food in stock
  }
  // Homes and plots with no road beside them (placement review P13): one warning for the lot, not one per plot (a hundred
  // plots painted away from the road would bury the list). ids is every one of them, in id order, so View can pan to the
  // nearest and the minimap can pin them all. A plot needs a road to be moved into, so it is as much a problem as a well's.
  const roadless = housesOf(world).filter((h) => !touchesRoad(world, h));
  if (roadless.length) alerts.push({ code: 'plots_no_road', count: roadless.length, ids: roadless.map((h) => h.id) });
  alerts.push(...fireAlerts(world), ...raidAlerts(world));   // Stage 3: fire (fire, blaze, fire_risk) and raids (raid_warning, raid)
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
