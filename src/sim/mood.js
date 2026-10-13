import { MOOD } from '../data/mood.js';
import { FORECAST } from '../data/economy.js';
import { DAYS_PER_MONTH } from './time.js';
import { housesOf } from './world.js';
import { atLeast } from './progression.js';
import { wantedNeeds } from './housing.js';
import { fireMood } from './fire.js';
import { healthMood } from './health.js';
import { crimeMood } from './crime.js';
import { raidMood } from './raids.js';
import { festivalMood } from './festival.js';
import { monumentMood } from './prestige.js';
import { palaceMood } from './palace.js';

// Stage 4.5 (ruling 325): the Town unemployment penalty comes in over FORECAST.phaseMonths months from the day the city first
// reached Town (world.splits.town, which updateMilestone records), so a city of homes with no work does not crash in one month.
// Computed from the state: { factor (0 to 1, the share of the full penalty in force), monthsLeft (whole months until it is full) }.
// A city whose Town day was never recorded (a save from before the splits existed) has the full penalty, as before.
export function unemploymentPhase(world) {
  const start = world.splits ? world.splits.town : undefined;
  if (!Number.isInteger(start)) return { factor: 1, monthsLeft: 0 };
  const months = Math.max(0, Math.floor((world.day - start) / DAYS_PER_MONTH));
  const factor = Math.min(1, months / FORECAST.phaseMonths);
  return { factor, monthsLeft: FORECAST.phaseMonths - Math.min(months, FORECAST.phaseMonths) };
}

// The Town unemployment penalty (mood points, 0 or negative): `now` is what is in force (phased), `full` what it will be once
// the phase-in is over, `monthsLeft` the months until then. All three are 0 before Town or with no workforce.
export function jobsPenalty(world) {
  const L = world.labour;
  if (!atLeast(world, 'town') || !(L.workforce > 0)) return { now: 0, full: 0, monthsLeft: 0 };
  const raw = Math.max(0, (L.workforce - L.employed) / L.workforce - MOOD.unemploymentThreshold) * MOOD.unemploymentWeight;
  const phase = unemploymentPhase(world);
  return { now: -Math.round(raw * phase.factor) + 0, full: -Math.round(raw) + 0, monthsLeft: phase.monthsLeft };
}

export function updateMood(world) {
  let wanting = 0;
  let fed = 0;
  for (const h of housesOf(world)) {
    if (h.tier < 1 || !wantedNeeds(h).includes('food')) continue;
    wanting += h.residents;
    if (h.met && h.met.food) fed += h.residents;
  }
  // Each breakdown term ends in `+ 0`, which turns -0 into 0 so it survives JSON and Object.is checks.
  const fedShare = wanting ? fed / wanting : 1;
  const food = Math.round(MOOD.fedWeight * (fedShare - 0.5) * 2) + 0;

  const jobs = jobsPenalty(world).now;

  const debt = world.gold < 0 ? -Math.min(MOOD.debtMax, Math.round(-world.gold / MOOD.debtPerPoint)) + 0 : 0;
  // Stage 3's danger terms (spec 4.9): each module reports only the terms that apply now, so a calm city's breakdown is
  // the same four rows as before. fire, burned (fire.js); raid (raids.js); festival (festival.js).
  const danger = { ...fireMood(world), ...raidMood(world), ...festivalMood(world), ...healthMood(world), ...crimeMood(world) };
  // Stage 4's rows (spec 4.9), each only while it is not 0: Monuments (+1 for every 70 prestige, at most +10) and Palace.
  const monuments = monumentMood(world), palace = palaceMood(world);
  if (monuments) danger.monuments = monuments;
  if (palace) danger.palace = palace;
  const dangerSum = Object.values(danger).reduce((s, v) => s + v, 0);
  world.mood = Math.max(0, Math.min(100, MOOD.base + food + jobs + debt + dangerSum));
  world.moodBreakdown = { base: MOOD.base, food, jobs, debt, ...danger };
  return world.mood;
}
