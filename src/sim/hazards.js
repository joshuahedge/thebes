// Version 6.0, Track B1 (rulings 680-699): plague, drought and the low Nile, locusts and blight. Track 0 (contract,
// docs/superpowers/notes/2026-10-22-version-6-0-contract.md) fixed the names and shapes here; Track B1 implements the functions marked
// STUB (each does nothing until then, so a city plays as before) and may add private helpers. Nothing here reads the clock or Math.random:
// every draw is hash2(a, b, (world.seed + HAZARD_SALT.x) | 0) (src/data/hazards.js), so a city's dangers are its seed's.
//
// State: world.hazards = { graceUntil, plague, drought, locusts } (newHazardState); each kind { warning, active, nextDay, last }.
// Every danger shows its warning (an alert and its Advice item, hazardAlerts and hazardItems) before it strikes, and none acts before
// graceUntil.
import { HAZARD_LEVELS } from '../data/hazards.js';
import { raidsOn, threatsOn } from './costs.js';

// What the dangers may do now (ruling 623, 624), for Track B1's draws, the advice and the words:
//   open        false before world.hazards.graceUntil (three game years from the start, or from loading a version 8 save): no plague,
//               drought or locusts is drawn or warned, and raiders neither wreck nor loot a storehouse (they burn and take a granary's
//               food, as they always have)
//   graceUntil  the day the grace ends; daysLeft: days until then (0 once open)
//   chance      times how often each danger is drawn; severity: times how hard it strikes (HAZARD_LEVELS: Relaxed and Peaceful rarer and
//               milder, Hard more of both)
//   raids       whether the city has raids at all (Peaceful has none: DIFFICULTIES[..].raids)
//   plague, drought, locusts  whether that danger may be drawn now (open, and for the plague, a level that has disease: never Peaceful)
//   strikes     { burn, wreck, loot }: the strike hooks that may act now (src/sim/strikes.js); burn always (today's strike)
// Pure: it reads the world and changes nothing.
export function dangerDraws(world) {
  const level = HAZARD_LEVELS[world.difficulty] || HAZARD_LEVELS.normal;
  const graceUntil = world.hazards.graceUntil;
  const open = world.day >= graceUntil;
  const raids = raidsOn(world);
  return {
    open, graceUntil, daysLeft: Math.max(0, graceUntil - world.day),
    chance: level.chance, severity: level.severity, raids,
    plague: open && level.plague && threatsOn(world), drought: open, locusts: open,
    strikes: { burn: true, wreck: open && raids, loot: open && raids },
  };
}

// STUB (Track B1): a day of the dangers, after the court's day (src/sim/v60.js v60Day): spreading plague, quarantines, locusts arriving.
export function hazardDay(world, events = null) {}

// STUB (Track B1): the month's end (v60Month): draws and warnings (never before graceUntil), the Nile reading's low flood, reports.
export function hazardMonth(world, events = null) {}

// STUB (Track B1): the dangers' alerts (src/sim/alerts.js through v60Alerts): each warning, then each danger under way. Codes are Track
// B1's (e.g. 'plague_warning'), their words ALERT_TEXT entries in its src/ui/text.js section.
export const hazardAlerts = (world) => [];

// STUB (Track B1): the dangers' advice items (src/sim/advice.js cityAdvice through v60Advice): push { key, kind, weight, count, id, data,
// fix, cost, afford } onto out, kind one of ADVICE_KINDS' 'plague', 'drought', 'locusts' (src/data/advice.js), weights in ADVICE.
export function hazardItems(world, alerts, out) {}
