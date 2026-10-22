// Version 6.0, Track D2 (rulings 760-779): the guided first city. Track 0 (contract, docs/superpowers/notes/2026-10-22-version-6-0-contract.md)
// made the seam; Track D2 owns this file (the lesson's run, its guidance row and its title offer). The lesson's state is two settings keys
// (src/ui/settings.js lessonDone, lessonStep), never the world's (ruling 626), and its map and steps are src/data/lesson.js.

// Whether the title should offer only "Start the lesson" (ruling 617): on a device that has not finished the lesson and has no saved city.
// settings: the settings' value (settings.get()); hasSavedCity: the title's loaded save is a city (boot's loaded.state === 'ok').
// Nothing calls it until Track D2 builds the title's offer, so the title is as before.
export const lessonDue = (settings, hasSavedCity) => !(settings && settings.lessonDone === true) && !hasSavedCity;
