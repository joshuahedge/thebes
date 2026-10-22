import { MILESTONES } from '../data/progression.js';
import { PRESTIGE_UNLOCKS } from '../data/monuments.js';
import { GREAT_WORK } from '../data/reign.js';
import { population, housesOf, allBuildings } from './world.js';

export const milestoneIndex = (id) => MILESTONES.findIndex((m) => m.id === id);

// Version 6.0, Track A (ruling 653): a rank beyond Capital needs more than people (MILESTONES[..].needs): { tier } a home at that tier or
// above standing. true for a rank with no needs. The goals that lead to each say the same (src/data/reign.js REIGN_GOALS).
export function milestoneNeedsMet(world, m) {
  const n = m.needs;
  if (!n) return true;
  if (Number.isInteger(n.tier) && !housesOf(world).some((h) => h.tier >= n.tier)) return false;
  return true;
}

// Reaching a milestone (spec 4.14) adds what it unlocks to world.newItems, once each and in the data's order, so
// their cards say "New" until one of them is placed (place in commands.js takes the type out). A city that passes
// two milestones in one month gets both lists. A milestone is reached once the city has had its people: the most it
// has had (tally.peakPeople, kept at each day's end in tickDay) or has now, the measure goals use to list what waits
// for it (goals.js), so a goal listed for a milestone's people is buildable from that month's end. At the month end
// (runMonth) the peak covers every earlier day and the population covers this one.
export function updateMilestone(world) {
  const pop = Math.max(world.tally.peakPeople, population(world));
  const from = milestoneIndex(world.milestone);
  let i = from;
  while (i + 1 < MILESTONES.length && pop >= MILESTONES[i + 1].population && milestoneNeedsMet(world, MILESTONES[i + 1])) i++;
  const changed = MILESTONES[i].id !== world.milestone;
  for (let k = from + 1; k <= i; k++) {
    for (const type of MILESTONES[k].unlocks) if (!world.newItems.includes(type)) world.newItems.push(type);
    if (!Number.isInteger(world.splits[MILESTONES[k].id])) world.splits[MILESTONES[k].id] = world.day;   // spec 4.19: the day it first became one
  }
  world.milestone = MILESTONES[i].id;
  return changed;
}

// Stage 4: a kind that unlocks by prestige (the pyramids) is unlocked once the city has recorded the day it reached it
// (world.prestigeUnlocks, src/sim/monuments.js updatePrestigeUnlocks), which needs its milestone too (spec 4.14).
// Stage 4.5 (ruling 309): the Gate card comes with the wall, so 'gate' is unlocked whenever 'wall' is (it has no milestone entry of
// its own).
export function isUnlocked(world, type) {
  if (type === 'gate') type = 'wall';
  // Version 6.0 (ruling 652): one great temple a city. Once one stands (a site or finished) its card is locked, so the Seat's tray stops
  // showing it (src/ui/cards.js cardShown: nothing comes after the last rank) and the placing rule refuses a second.
  if (type === GREAT_WORK.type && allBuildings(world).some((b) => b.type === type)) return false;
  if (PRESTIGE_UNLOCKS.includes(type)) return Number.isInteger(world.prestigeUnlocks[type]);
  const cur = milestoneIndex(world.milestone);
  for (let i = 0; i <= cur; i++) if (MILESTONES[i].unlocks.includes(type)) return true;
  return false;
}

export const atLeast = (world, id) => milestoneIndex(world.milestone) >= milestoneIndex(id);
