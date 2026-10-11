import { MILESTONES } from '../data/progression.js';
import { population } from './world.js';

export const milestoneIndex = (id) => MILESTONES.findIndex((m) => m.id === id);

// Reaching a milestone (spec 4.14) adds what it unlocks to world.newItems, once each and in the data's order, so
// their cards say "New" until one of them is placed (place in commands.js takes the type out). A city that passes
// two milestones in one month gets both lists.
export function updateMilestone(world) {
  const pop = population(world);
  const from = milestoneIndex(world.milestone);
  let i = from;
  while (i + 1 < MILESTONES.length && pop >= MILESTONES[i + 1].population) i++;
  const changed = MILESTONES[i].id !== world.milestone;
  for (let k = from + 1; k <= i; k++) {
    for (const type of MILESTONES[k].unlocks) if (!world.newItems.includes(type)) world.newItems.push(type);
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
