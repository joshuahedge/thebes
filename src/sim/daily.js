// Daily goals (spec 3.7): three small goals per local day, seeded by the date and the city's seed, counted
// from a snapshot taken when the day is drawn. The sim never reads a clock: the interface passes the local
// date as a 'YYYY-MM-DD' key. No streaks: a new key simply replaces yesterday's goals. Data in src/data/daily.js.
import { DAILY_POOL, DAILY_COUNT, DAILY_REWARD, DAILY_AFTER } from '../data/daily.js';
import { housesOf, population } from './world.js';
import { isUnlocked, atLeast } from './progression.js';
import { openRoutes } from './trade.js';
import { createRng, hash2 } from './rng.js';
import { roadsLaid, countType } from './achievements.js';
import { raidsOn } from './costs.js';
import { allBuildings, isSite } from './world.js';
import { touchesRoad } from './reach.js';

const defOf = (id) => DAILY_POOL.find((d) => d.id === id) || null;
// What the city can do today: the goal's building unlocked, its milestone reached, enough trade routes open, and (Stage 3)
// raids on for a goal about defences.
// Stage 4: a goal about monuments (site: true) only while a site is under way: unpaused, unfinished and on a road.
export const siteUnderWay = (world) => allBuildings(world).some((b) => isSite(b) && !b.paused && touchesRoad(world, b));
const isAvailable = (world, def) => (!def.measure.type || isUnlocked(world, def.measure.type))
  && (!def.from || atLeast(world, def.from)) && (!def.routes || openRoutes(world) >= def.routes) && (!def.raids || raidsOn(world))
  && (!def.site || siteUnderWay(world));

export const dailyAvailable = (world) => world.goals.completed.includes(DAILY_AFTER);

// The number a pool entry counts, as it stands now. def is a DAILY_POOL entry.
export function dailyMeasure(world, def) {
  const m = def.measure || def;
  switch (m.kind) {
    case 'homes': return housesOf(world).length;
    case 'roads': return roadsLaid(world);
    case 'buildings': return countType(world, m.type);
    case 'people': return population(world);
    case 'tally': return Math.floor(world.tally[m.key] || 0);   // Stage 4: stone brought to sites can be a sum of fractions
    case 'made': return (world.tally.made || {})[m.good] || 0;
    default: return 0;
  }
}

// FNV-1a over the key's characters: the same 32-bit number for the same date on every device.
export function hashKey(key) {
  let h = 0x811c9dc5;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

// Every available pool id in this day's order: a Fisher-Yates shuffle seeded by the date and the city.
// The first DAILY_COUNT are the day's goals; the swap takes the next one not already picked.
export function dailyOrder(world, dateKey) {
  const ids = DAILY_POOL.filter((d) => isAvailable(world, d)).map((d) => d.id);
  const rng = createRng(Math.floor(hash2(hashKey(dateKey), world.seed, 0) * 4294967296));
  for (let i = ids.length - 1; i > 0; i--) {
    const j = rng.int(i + 1);
    [ids[i], ids[j]] = [ids[j], ids[i]];
  }
  return ids;
}

export const pickDaily = (world, dateKey) => dailyOrder(world, dateKey).slice(0, DAILY_COUNT);

// Draws the goals for dateKey. true when it drew a new day; false when daily goals are not open yet, the
// key is not a string, or this date is already drawn (so calling it on every check is safe).
export function startDaily(world, dateKey) {
  if (typeof dateKey !== 'string' || !dateKey || !dailyAvailable(world)) return false;
  if (world.daily && world.daily.date === dateKey) return false;
  const picks = pickDaily(world, dateKey);
  const base = {};
  for (const id of picks) base[id] = dailyMeasure(world, defOf(id));
  world.daily = { date: dateKey, picks, base, done: [], swapped: false };
  return true;
}

// { n, of } for one of today's picks: the gain since the snapshot, clamped to 0..of; a done pick stays full.
// null when there is no day or id is not one of its picks.
export function dailyProgress(world, id) {
  const day = world.daily;
  const def = defOf(id);
  if (!day || !def || !day.picks.includes(id)) return null;
  if (day.done.includes(id)) return { n: def.n, of: def.n };
  const base = Number.isFinite(day.base[id]) ? day.base[id] : dailyMeasure(world, def);
  return { n: Math.max(0, Math.min(def.n, dailyMeasure(world, def) - base)), of: def.n };
}

// Records each pick that has reached its target, pays DAILY_REWARD and counts it in tally.dailyDone.
// Returns the ids recorded by this call.
export function checkDaily(world, events = null) {
  const day = world.daily;
  if (!day) return [];
  const added = [];
  for (const id of day.picks) {
    if (day.done.includes(id)) continue;
    const p = dailyProgress(world, id);
    if (!p || p.n < p.of) continue;
    day.done.push(id);
    world.gold += DAILY_REWARD;
    world.tally.dailyDone += 1;
    added.push(id);
    if (events) events.push({ type: 'daily', id, reward: DAILY_REWARD });
  }
  return added;
}

// The one free swap a day: replaces an unfinished pick with the next id in the day's order that is not
// already picked, snapshotting its measure now.
export function swapDaily(world, index) {
  const day = world.daily;
  const fail = { ok: false, reason: 'no_swap' };
  if (!day || day.swapped || !Number.isInteger(index) || index < 0 || index >= day.picks.length) return fail;
  const old = day.picks[index];
  if (day.done.includes(old)) return fail;
  const id = dailyOrder(world, day.date).find((x) => !day.picks.includes(x));
  if (!id) return fail;
  day.picks[index] = id;
  delete day.base[old];
  day.base[id] = dailyMeasure(world, defOf(id));
  day.swapped = true;
  return { ok: true, id };
}
