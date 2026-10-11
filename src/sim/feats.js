// Feats (spec 4.19): named, optional style bonuses, per city; no gold, never gating. Stage 3 contract: Track E implements
// checkFeats and fills FEATS (src/data/feats.js) with their words (FEAT_TEXT in src/ui/text.js). State: world.feats =
// { earned, lost, counters }: earned and lost are feat ids (lost: can no longer be earned, e.g. Grain alone once a fig
// orchard stands past undo before Market town), counters a record of whole numbers the checks keep:
//   fedMonth  the month index (world.day / 30) of the last month end counted for Well fed
//   fedRun    month ends in a row, up to that one, with every home at Cottage or above fed and enough people
// runMonth and settle call checkFeats. Feats that ask how a milestone was reached are judged only where the world knows the
// day it was (world.splits): a city from before Stage 3 that passed it earlier can no longer earn them (featStatus says
// so) and nothing is written for it, so a plain city's state never changes until something happens.
import { FEATS } from '../data/feats.js';
import { allBuildings, housesOf, population } from './world.js';
import { atLeast } from './progression.js';
import { raidsOn } from './costs.js';
import { DAYS_PER_MONTH } from './time.js';

const known = (world, id) => Number.isInteger(world.splits[id]);
const reachedKnown = (world, id) => atLeast(world, id) && known(world, id);

// The ids of buildings placed by an action that can still be undone (world.undo's 'place' entries, this month only).
function undoableIds(world) {
  const ids = new Set();
  for (const e of world.undo || []) if (e.kind === 'place') for (const id of e.ids) ids.add(id);
  return ids;
}

// The feats this city can earn: all but the raid feats on Peaceful (spec 4.18).
export const featsFor = (world) => FEATS.filter((f) => !f.raids || raidsOn(world));

// Every home at Cottage or above fed at the last month end (house.met, as the No one hungry achievement reads it), with
// at least `people` people.
function fedNow(world, people) {
  if (population(world) < people) return false;
  const homes = housesOf(world).filter((h) => h.tier >= 3);
  return homes.length > 0 && homes.every((h) => Boolean(h.met && h.met.food));
}

// At a month end not yet counted, Well fed's run grows by one or starts again. Called on every check, so it counts each
// month end once whether runMonth or a later command gets there first.
function countMonth(world) {
  const def = FEATS.find((f) => f.check.kind === 'fedRun');
  if (!def || world.day <= 0 || world.day % DAYS_PER_MONTH !== 0) return;
  const m = world.day / DAYS_PER_MONTH;
  const c = world.feats.counters;
  if (c.fedMonth === m) return;
  c.fedMonth = m;
  c.fedRun = fedNow(world, def.check.people) ? (c.fedRun || 0) + 1 : 0;
}

// 'earned', 'lost' or null (still open) for one feat now.
function judge(world, c) {
  switch (c.kind) {
    case 'neverInDebt':
      if (world.gold < 0) return 'lost';
      return reachedKnown(world, c.milestone) ? 'earned' : null;
    case 'fedRun':
      return (world.feats.counters.fedRun || 0) >= c.months ? 'earned' : null;
    case 'without': {
      // A building of the type counts against the feat only once it is past undo (spec 4.19's Avoid list: never penalise
      // undo): one placed this month can still be undone, and the monthly tick clears the undo history (spec 6.5).
      const theirs = allBuildings(world).filter((b) => b.type === c.type);
      const undoable = undoableIds(world);
      if (theirs.some((b) => !undoable.has(b.id))) return 'lost';
      if (theirs.length) return null;                    // only undoable ones stand: decided once undone or the month ends
      return reachedKnown(world, c.milestone) ? 'earned' : null;
    }
    case 'noneBurned':                                   // fire starts at Town, so every building burned counts
      if (!reachedKnown(world, c.milestone)) return null;
      if (world.tally.burned > 0) return 'lost';
      return world.day - world.splits[c.milestone] >= c.days ? 'earned' : null;
    case 'cleanRaid': {
      const last = world.raid.last;
      // Track B's raid.last also lists the raid's fires still burning (`fires`), and its `burned` keeps counting while they
      // burn out: a raid is clean only once none of its fires is still alight.
      return last && last.won && last.burned === 0 && last.stolen === 0 && !(last.fires && last.fires.length) ? 'earned' : null;
    }
    case 'noTribute':
      if (world.tally.tributes > 0) return 'lost';
      return reachedKnown(world, c.milestone) ? 'earned' : null;
    case 'buildings':
      return allBuildings(world).filter((b) => c.types.includes(b.type)).length >= c.n ? 'earned' : null;
    case 'jobs': {
      const L = world.labour;
      return population(world) >= c.people && L.workforce > 0 && (L.workforce - L.employed) / L.workforce <= c.rate ? 'earned' : null;
    }
    case 'tally':
      return (world.tally[c.key] || 0) >= c.n ? 'earned' : null;
    case 'before':
      if (known(world, c.milestone)) return world.splits[c.milestone] < c.day ? 'earned' : 'lost';
      return !atLeast(world, c.milestone) && world.day >= c.day ? 'lost' : null;
    default:
      return null;
  }
}

// Records each feat newly earned (pushing { type: 'feat', id }) or ruled out; returns the ids earned by this call.
// Peaceful skips the raid feats (spec 4.18).
export function checkFeats(world, events = null) {
  countMonth(world);
  const f = world.feats;
  const added = [];
  for (const def of featsFor(world)) {
    if (f.earned.includes(def.id) || f.lost.includes(def.id)) continue;
    const v = judge(world, def.check);
    if (v === 'earned') {
      f.earned.push(def.id);
      added.push(def.id);
      if (events) events.push({ type: 'feat', id: def.id });
    } else if (v === 'lost') f.lost.push(def.id);
  }
  return added;
}

// What the interface says about one feat: 'earned', 'lost' (it can no longer be earned, including a milestone the city
// passed before the world kept its day) or 'open'.
export function featStatus(world, def) {
  if (world.feats.earned.includes(def.id)) return 'earned';
  if (world.feats.lost.includes(def.id)) return 'lost';
  const m = def.check.milestone;
  if (m && atLeast(world, m) && !known(world, m)) return 'lost';
  return 'open';
}
