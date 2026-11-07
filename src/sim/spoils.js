// Version 8.4, Track R (ruling 1488): what a beaten raid leaves the city. src/sim/raids.js endRaid calls raidSpoils once a raid ends, after the report is made and the next
// warning drawn, with whether it was won; events is the tick's list, or null. A beaten raid's captured weapons cut every unit's pay (src/sim/costs.js soldiersPayOf, which reads
// soldiersPayWith here) by SPOILS.share for SPOILS.days days: raid.spoils = { until } (the first day the pay is whole again; absent means none). The next beaten raid restarts the
// year. A lost raid leaves none, and one paid off as tribute never reaches endRaid. No draw is made: it is the day and the pay.
import { SPOILS } from '../data/raids.js';
import { UNIT_TYPES } from '../data/armies.js';
import { TRAITS } from '../data/dynasty.js';

export function raidSpoils(world, report, won, events) {
  if (!won) return;
  const until = world.day + SPOILS.days;
  world.raid.spoils = { until };
  report.spoils = { until };      // the report says so too, so the beaten-raid moment can name the weapons
}

// The days of captured weapons left (0 when none, or they have run out): until - today.
export function spoilsLeft(world) {
  const s = world.raid.spoils;
  return s && Number.isInteger(s.until) && world.day < s.until ? s.until - world.day : 0;
}

// Every unit's pay for a month at the full rate (UNIT_TYPES[kind].pay; a soldier's is DEFENCE.soldierPay), before the captured weapons. Units away at the capital are not in
// world.soldiers, so they are not paid (ruling 386).
export const soldiersPayFull = (world) => world.soldiers.reduce((s, u) => s + (UNIT_TYPES[u.kind] || UNIT_TYPES.soldier).pay, 0);

// The pay with the weapons counted: SPOILS.share less while they last, rounded once to whole gold.
export const soldiersPayWith = (world) => (spoilsLeft(world) > 0 ? Math.round(soldiersPayFull(world) * (1 - SPOILS.share)) : soldiersPayFull(world));

// Version 9.0 (Track D's fix round, ruling 1568): what the weapons save off the pay the city would pay without them. The heir of the Unconquered pays its
// units TRAITS.unconquered.pay of the full pay first (src/sim/costs.js soldiersPayOf), so the weapons save the difference of the two rounded pays; read from
// the data leaf, as costs.js imports this file. Any other city's saving is 8.4's.
function weaponsSave(world) {
  const heir = (TRAITS[world.heir] || {}).pay;
  if (typeof heir !== 'number' || heir === 1) return soldiersPayFull(world) - soldiersPayWith(world);
  const full = soldiersPayFull(world);
  return spoilsLeft(world) > 0 ? Math.round(full * heir) - Math.round(full * heir * (1 - SPOILS.share)) : 0;
}

// What the weapons save this month, { less, daysLeft }, or null when there are none or no unit is paid: the forecast's soldiers row and the gold stat's explainer say it.
export function spoilsSaving(world) {
  const daysLeft = spoilsLeft(world);
  const less = weaponsSave(world);
  return daysLeft > 0 && less > 0 ? { less, daysLeft } : null;
}

// The month end (raidMonth, after the month's pay is taken): the pay the weapons saved goes to tally.spoilsGold.
export function spoilsMonth(world) {
  const less = weaponsSave(world);
  if (less > 0) world.tally.spoilsGold = (world.tally.spoilsGold || 0) + less;
}
