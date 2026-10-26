// Version 6.0, Track D2 (rulings 760-779): the guided first city. Track 0 (contract, docs/superpowers/notes/2026-10-22-version-6-0-contract.md)
// made the seam; Track D2 owns this file (the lesson's facts for its words, and its title offer). The lesson's state is two settings keys
// (src/ui/settings.js lessonDone, lessonStep), never the world's (ruling 626); its map and steps are src/data/lesson.js, its rules the sim's
// (src/sim/lesson.js), its run in the game src/ui/v60/lesson.js, its start and end src/boot.js.
import { LESSON_STEPS } from '../data/lesson.js';
import { LESSON_LENGTH, firstOf, warnedRaid, stepDone, playWhen } from '../sim/lesson.js';
import { towersNeeded, workingTowers, raidTargetKind } from '../sim/raids.js';
import { staffedCover } from '../sim/fire.js';
import { monthForecast } from '../sim/economy.js';
import { population } from '../sim/world.js';
import { say } from './v81/scribe.js';
import { V81T_TEXT } from './v81/lessonText.js';

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
  // Version 7.0 (Track P): "Press Play" is said only while the game is stopped AND the step is one that waits on it (play: 'card'). A step the player builds for ('act') plays again by
  // itself once built, so the card and its docked row never ask for Play there (the card says it the same way: src/ui/v60/lesson.js showCard).
  const f = { paused: world.speed === 0 && playWhen(world, step) === 'card', progress: null, warning: null, raidOn: null, missing: null, forecast: null, labour: { workforce: world.labour.workforce, jobs: world.labour.jobs } };
  if (w) {
    const need = towersNeeded(w.size);
    f.warning = { dir: w.dir, size: w.size, daysLeft: Math.max(0, w.arrives - world.day), need, have: workingTowers(world) };
  }
  if (a) f.raidOn = { left: a.raiders ? a.raiders.length : 0 };
  // Version 8.2 (Track L, ruling 1320): the kind of building the raid is after (the warning's own, else the raid under way's), which the ring on the raid step lights and the words name.
  f.target = w ? w.target : a ? a.target : raidTargetKind(world);
  if (step && (step.id === 'firehouse' || step.id === 'fire') && !firstOf(world, 'bazaar')) f.missing = 'bazaar';
  // Version 6.0.1 (ruling 820): whether a staffed firehouse still reaches the bazaar (its crew), so the fire step's words say who puts the staged blaze out.
  if (step && step.id === 'fire' && firstOf(world, 'bazaar')) f.crew = staffedCover(world, firstOf(world, 'bazaar'));
  // The raid step says whether staffed towers stand to stop the raiders (the sim's own count), never "watch the towers" with none.
  if (step && step.id === 'raid') f.towers = workingTowers(world);
  const fc = monthForecast(world);
  f.forecast = fc && Number.isFinite(fc.net) ? fc.net : null;
  f.people = population(world);
  return f;
}

// The step's check, with a name for tests and the row (which step the city is at is the interface's own count, src/ui/v60/lesson.js).
export const stepIsDone = (world, id) => stepDone(world, LESSON_STEPS.find((s) => s.id === id));

// Version 8.1 (Track T, ruling 1208): the hand-over, once the lesson's city has become the player's own (src/boot.js adoptLesson). Ipi says it in the docked bubble, right
// above the goals strip, which now shows the city's first real goal; it stays a little longer than a reaction, since it is the last thing the lesson says.
export const HANDOVER_MS = 8000;
export function sayHandOver() { return say(V81T_TEXT.handover, { ms: HANDOVER_MS }); }
