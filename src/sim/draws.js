// Version 6.0, Track B1: what the new dangers may do now, and the seeded draws they share (src/sim/hazards.js re-exports dangerDraws, which
// the contract named there). Pure: nothing here reads the clock or Math.random; every draw is hash2(a, b, (world.seed + HAZARD_SALT.x) | 0).
// plague.js, crops.js, strikes.js and raids.js import this file (not hazards.js, which imports them), so no module cycles through the hub.
import { HAZARD_LEVELS, HAZARD_SALT, BAND_GROWTH } from '../data/hazards.js';
import { raidsOn, threatsOn } from './costs.js';
import { hash2 } from './rng.js';
import { DAYS_PER_MONTH, MONTHS_PER_YEAR } from './time.js';

// What the dangers may do now (ruling 623, 624), for the draws, the advice and the words:
//   open        false before world.hazards.graceUntil (three game years from the start, or from loading a version 8 save): no plague,
//               drought or locusts is drawn or warned, and raiders neither wreck nor loot a storehouse (they burn and take a granary's
//               food, as they always have)
//   graceUntil  the day the grace ends; daysLeft: days until then (0 once open)
//   chance      times how often each danger is drawn; severity: times how hard it strikes (HAZARD_LEVELS: Relaxed and Peaceful rarer and
//               milder, Hard more of both)
//   raids       whether the city has raids at all (Peaceful has none: DIFFICULTIES[..].raids)
//   plague, drought, locusts  whether that danger may be drawn now (open, and for the plague, a level that has disease: never Peaceful)
//   strikes     { burn, wreck, loot }: the strike hooks that may act now (src/sim/strikes.js); burn always (today's strike)
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

// A seeded draw in [0, 1): hash2(a, b, seed + HAZARD_SALT[salt]).
export const hazardDraw = (world, a, b, salt) => hash2(a, b, (world.seed + HAZARD_SALT[salt]) | 0);
// A whole number in [lo, hi] from a draw.
export const between = ([lo, hi], u) => lo + Math.min(hi - lo, Math.floor(u * (hi - lo + 1)));
// The days to the next draw of a danger: a range of days, divided by the level's chance (Relaxed rarer), at least 1. n tells draws apart.
export const gapDays = (world, range, salt, n = 0) => Math.max(1, Math.round(between(range, hazardDraw(world, world.day, n, salt)) / dangerDraws(world).chance));

// The game year a day falls in (1 from the first day) and the whole months between two days, rounded up.
export const yearOf = (day) => Math.floor(day / (DAYS_PER_MONTH * MONTHS_PER_YEAR)) + 1;
export const monthsBetween = (from, to) => Math.max(0, Math.ceil((to - from) / DAYS_PER_MONTH));

// Whether another new danger is already warned: a new warning waits until the last one has struck (one warning at a time).
export function otherWarned(world, kind) {
  const h = world.hazards;
  return Object.keys(h).some((k) => k !== kind && k !== 'graceUntil' && h[k] && h[k].warning);
}

// How many raiders the years since the grace ended add to a raid (ruling 683): BAND_GROWTH.perYear a year times the level's severity, at most
// BAND_GROWTH.max, rounded; 0 while the grace lasts, and for a city with no raids.
export function bandGrowth(world) {
  const d = dangerDraws(world);
  if (!d.open || !d.raids) return 0;
  const years = (world.day - d.graceUntil) / (DAYS_PER_MONTH * MONTHS_PER_YEAR);
  return Math.min(BAND_GROWTH.max, Math.round(BAND_GROWTH.perYear * d.severity * years));
}

// A new warning drops 2x or 3x to 1x, as a later raid's does (setSpeed in commands.js: a speed is 0 to 3); a paused or 1x game stays as it is.
export function slowToOne(world) {
  if (world.speed > 1) world.speed = 1;
}
