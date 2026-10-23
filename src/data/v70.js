// Version 7.0 (Track 0 contract, docs/superpowers/notes/2026-10-23-version-7-0-contract.md): every track's rows joined, in track order
// (T, E, S, A), for the shared lists that read them: BUILDINGS (buildings.js), GOODS (goods.js), GOALS and EVENT_GOALS (goals.js), FIRSTS
// (firsts.js), ACHIEVEMENTS (achievements.js), TIPS (tips.js) and the tallies (src/sim/world.js). A track adds its rows in its own data file
// (trade.js: T; cityEvents.js: E; seasons.js: S; adviceFixes.js: A), never here and never in those shared lists: this file only joins.
//
// Import rule: goods.js, buildings.js, firsts.js, achievements.js, goals.js and tips.js import this file, so the track data files must import
// none of them (each is a leaf: it imports nothing).
import {
  TRADE_TALLY, TRADE_BUILDINGS, TRADE_GOODS, TRADE_FIRSTS, TRADE_ACHIEVEMENTS, TRADE_TIPS, TRADE_GOALS, TRADE_EVENT_GOALS,
} from './trade.js';
import { CITY_EVENT_TALLY, CITY_EVENT_FIRSTS, CITY_EVENT_ACHIEVEMENTS, CITY_EVENT_TIPS } from './cityEvents.js';
import { SEASON_TIPS } from './seasons.js';
import { ADVICE_FIX_TIPS } from './adviceFixes.js';

export const V70_TALLY = [...TRADE_TALLY, ...CITY_EVENT_TALLY];
export const V70_BUILDINGS = { ...TRADE_BUILDINGS };
export const V70_GOODS = { ...TRADE_GOODS };
export const V70_FIRSTS = [...TRADE_FIRSTS, ...CITY_EVENT_FIRSTS];
export const V70_ACHIEVEMENTS = [...TRADE_ACHIEVEMENTS, ...CITY_EVENT_ACHIEVEMENTS];
export const V70_TIPS = [...TRADE_TIPS, ...CITY_EVENT_TIPS, ...SEASON_TIPS, ...ADVICE_FIX_TIPS];
export const V70_GOALS = [...TRADE_GOALS];
export const V70_EVENT_GOALS = [...TRADE_EVENT_GOALS];
