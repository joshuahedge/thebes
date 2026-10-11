import { MILESTONES } from '../data/progression.js';
import { population } from './world.js';

export const milestoneIndex = (id) => MILESTONES.findIndex((m) => m.id === id);

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
  while (i + 1 < MILESTONES.length && pop >= MILESTONES[i + 1].population) i++;
  const changed = MILESTONES[i].id !== world.milestone;
  for (let k = from + 1; k <= i; k++) {
    for (const type of MILESTONES[k].unlocks) if (!world.newItems.includes(type)) world.newItems.push(type);
    if (!Number.isInteger(world.splits[MILESTONES[k].id])) world.splits[MILESTONES[k].id] = world.day;   // spec 4.19: the day it first became one
  }
  world.milestone = MILESTONES[i].id;
  return changed;
}

export function isUnlocked(world, type) {
  const cur = milestoneIndex(world.milestone);
  for (let i = 0; i <= cur; i++) if (MILESTONES[i].unlocks.includes(type)) return true;
  return false;
}

export const atLeast = (world, id) => milestoneIndex(world.milestone) >= milestoneIndex(id);
