// Achievements (spec 3.8): exact progress for every measure, so the summary sheet can say "12 of 50", and
// one 'achievement' event per unlock. No gold. Data in src/data/achievements.js.
import { ACHIEVEMENTS } from '../data/achievements.js';
import { allBuildings, housesOf, population } from './world.js';
import { coveredBy } from './housing.js';
import { laidRoadTiles } from './goals.js';
import { raidsOn } from './costs.js';
import { lacksRoad } from './reach.js';

// Road tiles the player laid: every road tile that is not part of the generator's start road. One rule,
// shared with the road goal (src/sim/goals.js).
export const roadsLaid = laidRoadTiles;

// Buildings of a type that count: one that needs a road counts only once a road touches it (ruling P11), as the
// "Build a" goals count them. Achievements and daily goals share it.
export const countType = (world, type) => allBuildings(world).filter((b) => b.type === type && !lacksRoad(world, b)).length;

// The counting measures; null for the yes/no ones.
function count(world, m) {
  switch (m.kind) {
    case 'roads': return roadsLaid(world);
    case 'homes': return housesOf(world).length;
    case 'buildings': return countType(world, m.type);
    case 'tier': return housesOf(world).filter((h) => h.tier >= m.tier).length;
    case 'people': return Math.max(world.tally.peakPeople, population(world));
    case 'tally': return world.tally[m.key] || 0;
    case 'made': return (world.tally.made || {})[m.good] || 0;
    case 'goals': return world.goals.completed.length;
    default: return null;
  }
}

// Every home at Cottage or above was fed at the last month end (house.met), in a city of `people` or more.
function fedAll(world, people) {
  if (population(world) < people) return false;
  const homes = housesOf(world).filter((h) => h.tier >= 3);
  return homes.length > 0 && homes.every((h) => Boolean(h.met && h.met.food));
}

// Every lived-in home is reached by a working well now, with at least `homes` lived-in homes.
function waterAll(world, homes) {
  const lived = housesOf(world).filter((h) => h.residents > 0);
  return lived.length >= homes && lived.every((h) => coveredBy(world, h, 'water'));
}

// Unemployment from the last labour assignment (world.labour), in a city of `people` or more.
function jobsFor(world, people, rate) {
  const L = world.labour;
  if (population(world) < people || !(L.workforce > 0)) return false;
  return (L.workforce - L.employed) / L.workforce <= rate;
}

// Stage 3: `people` or more and no building burned for `days`, counted from the day the city became a Town where the
// world knows it (a city from before Stage 3 had no fires, so its days run from when it was saved).
function safeYear(world, people, days) {
  if (population(world) < people) return false;
  const town = world.splits.town;
  if (Number.isInteger(town) && world.day - town < days) return false;
  return !world.danger.burnDays.some((d) => world.day - d < days);
}

function holds(world, m) {
  switch (m.kind) {
    case 'fedAll': return fedAll(world, m.people);
    case 'waterAll': return waterAll(world, m.homes);
    case 'jobs': return jobsFor(world, m.people, m.rate);
    case 'safeYear': return safeYear(world, m.people, m.days);
    default: return false;
  }
}

// The achievements this city can earn: all but the raid ones on Peaceful (spec 4.18).
export const achievementsFor = (world) => ACHIEVEMENTS.filter((a) => !a.raids || raidsOn(world));

// { n, of } with n never above of; the yes/no measures report { n: 0 or 1, of: 1 }. def is an ACHIEVEMENTS entry.
export function achievementProgress(world, def) {
  const m = def.measure || def;
  const n = count(world, m);
  if (n === null) return { n: holds(world, m) ? 1 : 0, of: 1 };
  return { n: Math.min(n, m.n), of: m.n };
}

const complete = (world, a) => { const p = achievementProgress(world, a); return p.n >= p.of; };

// Records every newly complete achievement and reports each one. A world whose achievements are null (a
// city migrated from version 1) has the complete ones marked silently. Returns the ids reported.
export function checkAchievements(world, events = null) {
  if (world.achievements === null) {
    world.achievements = achievementsFor(world).filter((a) => complete(world, a)).map((a) => a.id);
    return [];
  }
  const added = [];
  for (const a of achievementsFor(world)) {
    if (world.achievements.includes(a.id) || !complete(world, a)) continue;
    world.achievements.push(a.id);
    added.push(a.id);
    if (events) events.push({ type: 'achievement', id: a.id });
  }
  return added;
}
