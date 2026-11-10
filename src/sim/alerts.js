import { BUILDINGS } from '../data/buildings.js';
import { capacityOf } from './rules.js';
import { MOOD } from '../data/mood.js';
import { bazaarFoodProblem } from './bazaarFood.js';
import { bazaarsByHouse } from './distribution.js';
import { allBuildings, housesOf, isFinished } from './world.js';
import { touchesRoad } from './reach.js';
import { atLeast } from './progression.js';
import { isWorking } from './labour.js';
import { storeTotal } from './production.js';
import { fireAlerts } from './fire.js';
import { healthAlerts } from './health.js';
import { crimeAlerts } from './crime.js';
import { raidAlerts } from './raids.js';
import { monumentAlerts, hasMonumentWork } from './monuments.js';
import { s46Alerts } from './s46.js';
import { v60Alerts } from './v60.js';
import { v70Alerts } from './v70.js';

// Version 9.2 (Track Q, ruling 1775): the roll-up by cause. alertsFor stays the flat, building-by-building truth (the markers, the advice and a building's own
// problem list read it); rollUpAlerts turns a list of alerts into rows, one per cause. Every alert of a ROLLED code becomes one row with its count, its ids (in
// id order) and `members` (the alerts it stands for), shaped as plots_no_road and crime_risk already were (id is the first id, so View still finds a building).
// A lone alert is its own row, untouched. Letters, warnings with a date or a place and one-off notices are never merged.
export const ROLLED = new Set(['no_road', 'no_storage', 'storage_full', 'no_input', 'understaffed', 'bazaar_empty', 'bazaar_sold_out', 'fire', 'blaze', 'fire_risk', 'site_stalled', 'illness', 'crime_risk', 'labour_shortage']);

export function rollUpAlerts(list) {
  const groups = new Map(), out = [];
  for (const a of list) {
    if (!ROLLED.has(a.code)) { out.push(a); continue; }
    const g = groups.get(a.code);
    if (g) g.push(a);
    else { const fresh = [a]; groups.set(a.code, fresh); out.push(fresh); }
  }
  return out.map((x) => {
    if (!Array.isArray(x)) return x;
    if (x.length === 1) return x[0];
    const ids = [...new Set(x.flatMap((a) => a.ids || (a.id !== undefined && a.id !== null ? [a.id] : [])))].sort((p, q) => p - q);
    return { ...x[0], id: ids.length ? ids[0] : x[0].id, ids, count: x.reduce((n, a) => n + (a.count || 1), 0), members: x };
  });
}

// The flat alerts a list of rows stands for.
export const flatAlerts = (rows) => rows.flatMap((a) => a.members || [a]);

export function alertsFor(world) {
  const alerts = [];
  let byHouse = null;
  const served = () => byHouse || (byHouse = bazaarsByHouse(world));   // asked at most once a call, and only for a bazaar with food in reach
  for (const b of allBuildings(world)) {
    const def = BUILDINGS[b.type];
    if (b.type === 'house') continue;
    const road = touchesRoad(world, b);
    if (def.needsRoad && !road && !isFinished(b)) alerts.push({ code: 'no_road', id: b.id });   // a finished monument needs no road (ruling 228)
    if (b.blocked === 'no_storage') alerts.push({ code: 'no_storage', id: b.id });
    if (b.blocked === 'storage_full') alerts.push({ code: 'storage_full', id: b.id });
    if (b.blocked === 'no_input') alerts.push({ code: 'no_input', id: b.id });
    if (def.stores && storeTotal(b) >= capacityOf(world, b.type)) alerts.push({ code: 'storage_full', id: b.id });   // any full store
    if (def.workers && road && !b.paused && !(b.fire && b.fire.stage === 'fire') && hasMonumentWork(world, b) && !isWorking(world, b)) alerts.push({ code: 'understaffed', id: b.id });
    // No food on the shelf (Version 8.2.1, rulings 1360-1364): an alert only when it is trouble, worded by its cause (bazaarFoodProblem).
    if (def.sells) { const food = bazaarFoodProblem(world, b, served); if (food) alerts.push(food); }
  }
  // Homes and plots with no road beside them (placement review P13): one warning for the lot, not one per plot (a hundred
  // plots painted away from the road would bury the list). ids is every one of them, in id order, so View can pan to the
  // nearest and the minimap can pin them all. A plot needs a road to be moved into, so it is as much a problem as a well's.
  const roadless = housesOf(world).filter((h) => !touchesRoad(world, h));
  if (roadless.length) alerts.push({ code: 'plots_no_road', count: roadless.length, ids: roadless.map((h) => h.id) });
  alerts.push(...fireAlerts(world), ...raidAlerts(world));   // Stage 3: fire (fire, blaze, fire_risk) and raids (raid_warning, raid)
  alerts.push(...healthAlerts(world), ...crimeAlerts(world));   // Stage 4.5: illness and crime_risk (warnings, never criticals)
  alerts.push(...monumentAlerts(world));                     // Stage 4: site_stalled (a warning, never a critical: ruling 211)
  alerts.push(...s46Alerts(world));                          // Stage 4.6: the tracks' alerts (src/sim/s46.js), e.g. the court's letters
  alerts.push(...v60Alerts(world));                          // Version 6.0: the demands' and the dangers' alerts (src/sim/v60.js)
  alerts.push(...v70Alerts(world));                          // Version 7.0: trade's and the waiting event's alerts (src/sim/v70.js)
  for (const level of world.labour.shortLevels || []) alerts.push({ code: 'labour_shortage', level });
  const L = world.labour;
  if (atLeast(world, 'town') && L.workforce > 0 && (L.workforce - L.employed) / L.workforce > MOOD.unemploymentThreshold) {
    alerts.push({ code: 'unemployment' });
  }
  if (world.gold < 0) alerts.push({ code: 'debt' });
  for (const a of alerts) {
    if (!a.ids && a.id !== undefined) a.ids = [a.id];
    if (a.count === undefined) a.count = 1;
  }
  return alerts;
}

export function computeAlerts(world) {
  world.alerts = alertsFor(world);
  return world.alerts;
}
