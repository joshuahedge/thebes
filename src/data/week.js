// src/data/week.js
// Version 9.3, the weekly decree (spec section 1, rulings 1950-1951): the device's ISO week, its seed and its decrees. The interface reads the date; the sim never does.
import { DECREE_ORDER, DECREE_PAIRS, DECREE, DECREES } from './decrees.js';
import { hasRiver } from './map.js';
import { variantFor } from '../sim/mapgen.js';

const DAY = 86400000, WEEK = 7 * DAY;
const mod = (a, n) => ((a % n) + n) % n;

// The ISO week of a local date: { year, week } (6.0's helper, brought back).
export function isoWeek(date) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));                   // that week's Thursday
  const jan4 = new Date(d.getFullYear(), 0, 4);
  const thursday1 = new Date(jan4);
  thursday1.setDate(jan4.getDate() + 3 - ((jan4.getDay() + 6) % 7));      // week 1's Thursday
  return { year: d.getFullYear(), week: 1 + Math.round((d - thursday1) / WEEK) };
}

export const weekKey = (date) => { const { year, week } = isoWeek(date); return `${year}-${String(week).padStart(2, '0')}`; };
const parse = (key) => { const m = /^(\d{4})-(\d{2})$/.exec(String(key)); return m ? { year: Number(m[1]), week: Number(m[2]) } : null; };
const weeksIn = (year) => isoWeek(new Date(year, 11, 28)).week;
export const isWeekKey = (key) => { const p = parse(key); return Boolean(p) && p.week >= 1 && p.week <= weeksIn(p.year); };
export const weeklySeed = (key) => { const p = parse(key); return p ? p.year * 100 + p.week : 0; };

// The Monday (UTC ms) of an ISO year and week.
function mondayOf(year, week) {
  const jan4 = Date.UTC(year, 0, 4);
  const dow = (new Date(jan4).getUTCDay() + 6) % 7;
  return jan4 - dow * DAY + (week - 1) * WEEK;
}

// Weeks from the epoch's week (DECREE.epoch) to `key`: 0 on the epoch, negative before it; NaN for a bad key.
export function weekIndex(key) {
  if (!isWeekKey(key)) return NaN;
  const p = parse(key);
  return Math.round((mondayOf(p.year, p.week) - mondayOf(DECREE.epoch[0], DECREE.epoch[1])) / WEEK);
}

export const isPairWeek = (key) => mod(weekIndex(key), 4) === 3;

// The week's decree ids: every fourth week a pair, in DECREE_PAIRS' turn; the other weeks the next decree in DECREE_ORDER (no repeat in nine single weeks).
export function decreesOfWeek(key) {
  const i = weekIndex(key);
  if (!Number.isFinite(i)) return [];
  if (mod(i, 4) === 3) return [...DECREE_PAIRS[mod(Math.floor(i / 4), DECREE_PAIRS.length)]];
  return [DECREE_ORDER[mod(i - Math.floor((i + 1) / 4), DECREE_ORDER.length)]];
}

// The week's map: its seed and its layout, the one place the run, the ruler list's Play this map and a rival's row read it.
// The seed picks the layout as a new city's 'auto' does (mapgen variantFor), except that a decree needing a river (Sea Peoples:
// its raids come by boat) never falls on the Great oasis: that week takes the classic river on the same seed (Josh, 10 Nov 2026).
export function decreeMapOf(key) {
  const seed = weeklySeed(key);
  let mapVariant = variantFor(seed);
  if (decreesOfWeek(key).some((id) => DECREES[id] && DECREES[id].needsRiver) && !hasRiver(mapVariant)) mapVariant = 'classic';
  return { seed, mapVariant };
}
