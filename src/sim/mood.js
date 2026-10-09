import { MOOD } from '../data/mood.js';
import { housesOf } from './world.js';
import { atLeast } from './progression.js';
import { wantedNeeds } from './housing.js';

export function updateMood(world) {
  let wanting = 0;
  let fed = 0;
  for (const h of housesOf(world)) {
    if (h.tier < 1 || !wantedNeeds(h).includes('food')) continue;
    wanting += h.residents;
    if (h.met && h.met.food) fed += h.residents;
  }
  // Each breakdown term ends in `+ 0`, which turns -0 into 0 so it survives JSON and Object.is checks.
  const fedShare = wanting ? fed / wanting : 1;
  const food = Math.round(MOOD.fedWeight * (fedShare - 0.5) * 2) + 0;

  let jobs = 0;
  const L = world.labour;
  if (atLeast(world, 'town') && L.workforce > 0) {
    const unemployment = (L.workforce - L.employed) / L.workforce;
    jobs = -Math.round(Math.max(0, unemployment - MOOD.unemploymentThreshold) * MOOD.unemploymentWeight) + 0;
  }

  const debt = world.gold < 0 ? -Math.min(MOOD.debtMax, Math.round(-world.gold / MOOD.debtPerPoint)) + 0 : 0;
  world.mood = Math.max(0, Math.min(100, MOOD.base + food + jobs + debt));
  world.moodBreakdown = { base: MOOD.base, food, jobs, debt };
  return world.mood;
}
