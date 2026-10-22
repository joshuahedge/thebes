// Version 6.0, Track D2 (rulings 760-779): the guided first city (the lesson). Track 0 (contract,
// docs/superpowers/notes/2026-10-22-version-6-0-contract.md) made the file; Track D2 owns it. A leaf data file: it imports nothing.
//
// The lesson's state is the device's, never a city's (ruling 626): two settings keys (src/ui/settings.js), lessonDone (true once the
// lesson has ended "Your first city stands") and lessonStep (the step reached, 0 before it starts, for a lesson left part-way), and
// src/ui/lesson.js lessonDue reads them. Nothing about the lesson is in the world, so no save changes with it.

// LESSON: the lesson's fixed map (seed, size, layout) and its steps, each { id, ... } (Track D2 shapes them: target, instruction, the
// sim's check that advances it). Empty until Track D2 fills it.
export const LESSON = { seed: 7, size: 48, variant: 'classic' };
export const LESSON_STEPS = [];
