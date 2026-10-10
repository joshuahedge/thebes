import { MOOD } from '../data/mood.js';
import { DAYS_PER_MONTH, MONTHS_PER_YEAR, DAYS_PER_SECOND } from './time.js';
import { assignLabour } from './labour.js';
import { produceDay } from './production.js';
import { restockBazaars } from './distribution.js';
import { monthlyHousing } from './housing.js';
import { arrivalsBatch, departures } from './immigration.js';
import { monthlyEconomy } from './economy.js';
import { updateMood } from './mood.js';
import { updateMilestone } from './progression.js';
import { computeAlerts } from './alerts.js';
import { clearUndo } from './undo.js';

const ARRIVAL_EVERY = DAYS_PER_MONTH / MOOD.arrivalBatchesPerMonth;

// events is an optional array. When given, the sim pushes plain objects into it so the renderer can
// react (effects, banners). It is never read by the sim and never saved.
export function runMonth(world, events = null) {
  restockBazaars(world);
  monthlyHousing(world, events);
  departures(world);
  monthlyEconomy(world);
  updateMood(world);
  const milestoneChanged = updateMilestone(world);
  if (milestoneChanged && events) events.push({ type: 'milestone', id: world.milestone });
  computeAlerts(world);
  clearUndo(world);
}

export function tickDay(world, events = null) {
  assignLabour(world);
  produceDay(world);
  world.day += 1;
  if (world.day % ARRIVAL_EVERY === 0) {
    const count = arrivalsBatch(world);
    if (count > 0 && events) events.push({ type: 'arrivals', count });
  }
  if (world.day % DAYS_PER_MONTH === 0) runMonth(world, events);
}

export function advanceDays(world, n, events = null) {
  for (let i = 0; i < n; i++) tickDay(world, events);
}

export const monthIndex = (world) => Math.floor(world.day / DAYS_PER_MONTH);

export function dateParts(world) {
  const m = monthIndex(world);
  return { year: Math.floor(m / MONTHS_PER_YEAR) + 1, month: (m % MONTHS_PER_YEAR) + 1, day: (world.day % DAYS_PER_MONTH) + 1 };
}

export const daysForSeconds = (speed, seconds) => speed * DAYS_PER_SECOND * seconds;
