// Festivals (spec 4.9, 4.13): a small mood lever at a working temple, from Town. Complete in the Stage 3 contract (the
// rules are a few lines of data, and the temple's button needs them from the start); Track B owns the file from then on.
// State: world.danger.festivalDay (the day of the last festival, or null) and tally.festivals.
import { FESTIVAL } from '../data/raids.js';
import { allBuildings } from './world.js';
import { atLeast } from './progression.js';
import { isWorking } from './labour.js';
import { canAfford, spend } from './money.js';
import { festivalCostOf } from './costs.js';

const fail = (reason, extra = {}) => ({ ok: false, reason, warnings: [], ...extra });
const sinceLast = (world) => (world.danger.festivalDay === null ? Infinity : world.day - world.danger.festivalDay);

// What the temple sheet's button needs: { can, reason, cost, nextIn, activeFor }. reason (null when it can): 'locked'
// (before Town), 'no_temple' (no working temple), 'too_soon' (within FESTIVAL.every days of the last) or 'no_gold'
// (the treasury would go below the debt floor); nextIn: days until the next may be held (0 when it may); activeFor: days
// the last festival's mood bonus has left (0 when none).
export function festivalStatus(world) {
  const cost = festivalCostOf(world);
  const since = sinceLast(world);
  const nextIn = Math.max(0, FESTIVAL.every - since);
  const activeFor = Math.max(0, FESTIVAL.days - since);
  let reason = null;
  if (!atLeast(world, FESTIVAL.from)) reason = 'locked';
  else if (!allBuildings(world).some((b) => b.type === 'temple' && isWorking(world, b))) reason = 'no_temple';
  else if (nextIn > 0) reason = 'too_soon';
  else if (!canAfford(world, cost)) reason = 'no_gold';
  return { can: reason === null, reason, cost, nextIn, activeFor };
}

// The holdFestival command (spec 7.3): charges festivalCostOf, records the day, counts tally.festivals.
// { ok: true, cost, warnings: [] } or fails with festivalStatus's reason.
export function holdFestival(world) {
  const s = festivalStatus(world);
  if (!s.can) return fail(s.reason);
  spend(world, s.cost);
  world.danger.festivalDay = world.day;
  world.tally.festivals += 1;
  return { ok: true, cost: s.cost, warnings: [] };
}

// The festival's mood term (spec 4.9): { festival: FESTIVAL.mood } for FESTIVAL.days after one is held, else {}.
export function festivalMood(world) {
  return sinceLast(world) < FESTIVAL.days ? { festival: FESTIVAL.mood } : {};
}
