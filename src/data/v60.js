// Version 6.0 (Track 0 contract, docs/superpowers/notes/2026-10-22-version-6-0-contract.md): every track's rows joined, in track order
// (A, B1, C), for the shared lists that read them: BUILDINGS (buildings.js), GOALS and EVENT_GOALS (goals.js), FIRSTS (firsts.js), ACHIEVEMENTS (achievements.js), TIPS
// (tips.js) and the tallies (src/sim/world.js). A track adds its rows in its own data file (reign.js: A; hazards.js: B1; largePlots.js:
// C), never here and never in those shared lists: this file only joins. Wave 2 and 3 tracks (B2, D1, D2) add no sim rows; a tip of
// theirs goes in their own section of src/data/tips.js.
//
// Import rule: buildings.js, firsts.js, achievements.js and tips.js import this file, so the track data files must import none of them
// (each is a leaf: it imports nothing).
import { REIGN_TALLY, REIGN_BUILDINGS, REIGN_FIRSTS, REIGN_ACHIEVEMENTS, REIGN_TIPS, REIGN_GOALS, REIGN_EVENT_GOALS } from './reign.js';
import { HAZARD_TALLY, HAZARD_FIRSTS, HAZARD_ACHIEVEMENTS, HAZARD_TIPS, HAZARD_EVENT_GOALS } from './hazards.js';
import { LARGE_TALLY, LARGE_BUILDINGS, LARGE_FIRSTS, LARGE_ACHIEVEMENTS, LARGE_TIPS, LARGE_GOALS } from './largePlots.js';

export const V60_TALLY = [...REIGN_TALLY, ...HAZARD_TALLY, ...LARGE_TALLY];
export const V60_BUILDINGS = { ...REIGN_BUILDINGS, ...LARGE_BUILDINGS };
export const V60_FIRSTS = [...REIGN_FIRSTS, ...HAZARD_FIRSTS, ...LARGE_FIRSTS];
export const V60_ACHIEVEMENTS = [...REIGN_ACHIEVEMENTS, ...HAZARD_ACHIEVEMENTS, ...LARGE_ACHIEVEMENTS];
export const V60_TIPS = [...REIGN_TIPS, ...HAZARD_TIPS, ...LARGE_TIPS];
export const V60_GOALS = [...REIGN_GOALS, ...LARGE_GOALS];
export const V60_EVENT_GOALS = [...REIGN_EVENT_GOALS, ...HAZARD_EVENT_GOALS];
