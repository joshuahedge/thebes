// Stage 4.6 (Track 0): every track's rows joined, in track order (map, river, court, armies, wonders), for the shared lists that read
// them: GOODS (goods.js), BUILDINGS (buildings.js), MILESTONES' unlocks (progression.js), the dock (ui.js CATEGORIES), FIRSTS,
// ACHIEVEMENTS, TIPS and the tallies (world.js). A track adds its rows in its own data file (map.js's s46 section, river.js,
// court.js, armies.js, wonders.js), never here and never in those shared lists: this file only joins.
//
// Import rule: goods.js, buildings.js, progression.js, ui.js, firsts.js, achievements.js and tips.js import this file, so the track
// data files must import none of them (src/data/river.js has the rule).
import { MAP_TALLY, MAP_FIRSTS, MAP_ACHIEVEMENTS, MAP_TIPS } from './map.js';
import { RIVER_GOODS, RIVER_BUILDINGS, RIVER_UNLOCKS, RIVER_DOCK, RIVER_TALLY, RIVER_FIRSTS, RIVER_ACHIEVEMENTS, RIVER_TIPS } from './river.js';
import { COURT_TALLY, COURT_FIRSTS, COURT_ACHIEVEMENTS, COURT_TIPS } from './court.js';
import { ARMY_BUILDINGS, ARMY_UNLOCKS, ARMY_DOCK, ARMY_TALLY, ARMY_FIRSTS, ARMY_ACHIEVEMENTS, ARMY_TIPS } from './armies.js';
import { WONDER_UNLOCKS, WONDER_TALLY, WONDER_FIRSTS, WONDER_ACHIEVEMENTS, WONDER_TIPS } from './wonders.js';

// milestone id (or category id) -> types, each track's after the one before.
const joinLists = (...maps) => {
  const out = {};
  for (const m of maps) for (const [k, list] of Object.entries(m)) out[k] = [...(out[k] || []), ...list];
  return out;
};

export const S46_GOODS = { ...RIVER_GOODS };
export const S46_BUILDINGS = { ...RIVER_BUILDINGS, ...ARMY_BUILDINGS };
export const S46_UNLOCKS = joinLists(RIVER_UNLOCKS, ARMY_UNLOCKS, WONDER_UNLOCKS);
export const S46_DOCK = joinLists(RIVER_DOCK, ARMY_DOCK);
export const S46_TALLY = [...MAP_TALLY, ...RIVER_TALLY, ...COURT_TALLY, ...ARMY_TALLY, ...WONDER_TALLY];
export const S46_FIRSTS = [...MAP_FIRSTS, ...RIVER_FIRSTS, ...COURT_FIRSTS, ...ARMY_FIRSTS, ...WONDER_FIRSTS];
export const S46_ACHIEVEMENTS = [...MAP_ACHIEVEMENTS, ...RIVER_ACHIEVEMENTS, ...COURT_ACHIEVEMENTS, ...ARMY_ACHIEVEMENTS, ...WONDER_ACHIEVEMENTS];
export const S46_TIPS = [...MAP_TIPS, ...RIVER_TIPS, ...COURT_TIPS, ...ARMY_TIPS, ...WONDER_TIPS];
