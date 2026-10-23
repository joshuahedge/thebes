// Version 6.0, Track D2 (rulings 760-779): the guided first city. Track 0 (contract, docs/superpowers/notes/2026-10-22-version-6-0-contract.md)
// made the seam; Track D2 owns this file (the lesson's facts for its words, and its title offer). The lesson's state is two settings keys
// (src/ui/settings.js lessonDone, lessonStep), never the world's (ruling 626); its map and steps are src/data/lesson.js, its rules the sim's
// (src/sim/lesson.js), its run in the game src/ui/v60/lesson.js, its start and end src/boot.js.
import { LESSON_STEPS } from '../data/lesson.js';
import { LESSON_LENGTH, firstOf, warnedRaid, stepDone } from '../sim/lesson.js';
import { towersNeeded, workingTowers } from '../sim/raids.js';
import { monthForecast } from '../sim/economy.js';
import { population } from '../sim/world.js';

// Whether the title should offer only "Start the lesson" (ruling 617): on a device that has not finished the lesson and has no saved city.
// settings: the settings' value (settings.get()); hasSavedCity: the title's loaded save is a city (boot's loaded.state === 'ok').
export const lessonDue = (settings, hasSavedCity) => !(settings && settings.lessonDone === true) && !hasSavedCity;

// The step a lesson starts at: where a lesson left part-way stopped (clamped to the steps there are), or the first when the lesson is done (a replay).
export function lessonStartStep(settings) {
  if (!settings || settings.lessonDone === true) return 0;
  const n = Number.isInteger(settings.lessonStep) ? settings.lessonStep : 0;
  return Math.max(0, Math.min(n, LESSON_LENGTH - 1));
}

// A lesson left part-way: not done, and a step past the first reached (the title says Continue).
export const lessonPartWay = (settings) => Boolean(settings) && settings.lessonDone !== true && lessonStartStep(settings) > 0;

// What each line of the lesson is worded from (src/ui/text.js D2_TEXT.steps), read from the sim now.
export function lessonFacts(world, step) {
  const w = warnedRaid(world), a = world.raid.active;
  const f = { paused: world.speed === 0, progress: null, warning: null, raidOn: null, missing: null, forecast: null, labour: { workforce: world.labour.workforce, jobs: world.labour.jobs } };
  if (w) {
    const need = towersNeeded(w.size);
    f.warning = { dir: w.dir, size: w.size, daysLeft: Math.max(0, w.arrives - world.day), need, have: workingTowers(world) };
  }
  if (a) f.raidOn = { left: a.raiders ? a.raiders.length : 0 };
  if (step && (step.id === 'firehouse' || step.id === 'fire') && !firstOf(world, 'bazaar')) f.missing = 'bazaar';
  const fc = monthForecast(world);
  f.forecast = fc && Number.isFinite(fc.net) ? fc.net : null;
  f.people = population(world);
  return f;
}

// The step's check, with a name for tests and the row (which step the city is at is the interface's own count, src/ui/v60/lesson.js).
export const stepIsDone = (world, id) => stepDone(world, LESSON_STEPS.find((s) => s.id === id));
