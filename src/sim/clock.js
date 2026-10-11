import { MOOD } from '../data/mood.js';
import { DAYS_PER_MONTH, MONTHS_PER_YEAR, DAYS_PER_SECOND } from './time.js';
import { assignLabour } from './labour.js';
import { produceDay } from './production.js';
import { restockBazaars } from './distribution.js';
import { monthlyHousing } from './housing.js';
import { arrivalsBatch, departures } from './immigration.js';
import { monthlyEconomy } from './economy.js';
import { tradeMonth } from './trade.js';
import { updateMood } from './mood.js';
import { updateMilestone } from './progression.js';
import { computeAlerts } from './alerts.js';
import { checkFirsts } from './firsts.js';
import { checkAchievements } from './achievements.js';
import { checkDaily } from './daily.js';
import { clearUndo } from './undo.js';
import { checkGoals, triggerEventGoals } from './goals.js';
import { population, HISTORY_MONTHS } from './world.js';
import { goodsMonthStart, homeGoodsHeld, recordGoodsMonth } from './goodsMonth.js';
import { fireDay } from './fire.js';
import { raidDay, raidMonth } from './raids.js';
import { checkFeats } from './feats.js';
import { scoreRow } from './score.js';

const ARRIVAL_EVERY = DAYS_PER_MONTH / MOOD.arrivalBatchesPerMonth;

// events is an optional array. When given, the sim pushes plain objects into it so the renderer can
// react (effects, banners). It is never read by the sim and never saved.
export function runMonth(world, events = null) {
  const goods = goodsMonthStart(world);               // the month's goods record for the summary (goodsMonth.js)
  restockBazaars(world);
  const held = homeGoodsHeld(world);
  monthlyHousing(world, events);
  const heldAfter = homeGoodsHeld(world);
  departures(world);
  monthlyEconomy(world);
  const tradeSpent = tradeMonth(world, events);
  raidMonth(world, events);                            // Stage 3 (src/sim/raids.js)
  updateMood(world);
  const milestoneChanged = updateMilestone(world);
  if (milestoneChanged && events) events.push({ type: 'milestone', id: world.milestone });
  computeAlerts(world);
  checkAchievements(world, events);
  checkFeats(world, events);                           // Stage 3 (src/sim/feats.js)
  clearUndo(world);
  recordGoodsMonth(world, goods, held, heldAfter, tradeSpent);   // after monthlyEconomy (it starts stats.lastMonth) and tradeMonth
  // The month-end row: Welcome back's trends, and from Stage 3 the city score and its four parts (spec 4.19).
  world.history.push({ day: world.day, people: population(world), gold: world.gold, mood: world.mood, ...scoreRow(world) });
  if (world.history.length > HISTORY_MONTHS) world.history.splice(0, world.history.length - HISTORY_MONTHS);
  if (events) events.push({ type: 'month' });
}

export function tickDay(world, events = null) {
  assignLabour(world);
  produceDay(world);
  // Stage 3: fire, then raids and combat (src/sim/fire.js, raids.js). world.calm is a TEST-ONLY switch the Stage 3
  // contract gives the long runs and the sample cities until Track F builds their firehouses and defences and removes it:
  // never set by the game, not in the save's required fields.
  if (!world.calm) {
    fireDay(world, events);
    raidDay(world, events);
  }
  world.day += 1;
  if (world.day % ARRIVAL_EVERY === 0) {
    const count = arrivalsBatch(world);
    if (count > 0 && events) events.push({ type: 'arrivals', count });
  }
  if (world.day % DAYS_PER_MONTH === 0) runMonth(world, events);
  world.tally.peakPeople = Math.max(world.tally.peakPeople, population(world));
  triggerEventGoals(world);
  checkGoals(world, events);
  checkFirsts(world, events);
  if (world.daily) checkDaily(world, events);
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
