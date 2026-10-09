import { MILESTONES } from '../data/progression.js';
import { population } from './world.js';

export const milestoneIndex = (id) => MILESTONES.findIndex((m) => m.id === id);

export function updateMilestone(world) {
  const pop = population(world);
  let i = milestoneIndex(world.milestone);
  while (i + 1 < MILESTONES.length && pop >= MILESTONES[i + 1].population) i++;
  const changed = MILESTONES[i].id !== world.milestone;
  world.milestone = MILESTONES[i].id;
  return changed;
}

export function isUnlocked(world, type) {
  const cur = milestoneIndex(world.milestone);
  for (let i = 0; i <= cur; i++) if (MILESTONES[i].unlocks.includes(type)) return true;
  return false;
}

export const atLeast = (world, id) => milestoneIndex(world.milestone) >= milestoneIndex(id);
