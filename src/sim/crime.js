// Crime and unrest (Stage 4.5, ruling 319). The fire pattern (src/sim/fire.js) for homes: risk, cover by a police post, a seeded
// theft, alerts, a mood row. Pure functions from state; nothing here reads the clock or Math.random: every draw is
// hash2(id, world.day, world.seed + CRIME_SALT.x).
//
// State (world version 6). Every home carries h.crime (risk points, 0 up). The city remembers world.danger.theftDays (the day of
// every theft in the last CRIME_MOOD.days days, oldest first). tally.thefts and tally.theftGold count them (theftGold is gold
// only). Events (pushed into the events array the clock passes; never saved):
//   { type: 'theft', id, kind: 'gold', amount, near }                        a thief skimmed the treasury; near: the type of the
//                                                                            nearest building that is not a home, or null
//   { type: 'theft', id, kind: 'goods', amount, good, from, store, near }    a thief took goods from a storehouse or bazaar
//                                                                            (from its id, store its type)
// Alerts (crimeAlerts), ascending id: { code: 'crime_risk', id, ids, count } warning (never critical), one per district (a
// square of CRIME.districtTiles tiles): the homes in it at High risk or above that no staffed police post reaches; id is the
// first of them.
//
// The day (crimeDay): every home with people in it adds crime risk for each of the three things that are true (tier low, city
// mood below 45, unemployment above 10%), times the difficulty's risk and (1 - cut x coverage); at the threshold a draw
// (hash2(id, day, seed + theft) < theftChance) causes a theft if there is anything to take: with both gold (at least the
// range's lowest) and goods to take, hash2(.., kind) < 0.5 picks the treasury; the gold is 2% of the treasury clamped to
// 5-100 and to what the treasury holds; goods come from the nearest storehouse or bazaar that has any (the straight-line
// distance from the home, ties by id): one good, drawn among those it holds in a fixed order, 5-20 units (at most what is
// there). A theft resets the home's risk to 0; with nothing to take the home stays at the threshold and tries again.
import { CRIME, CRIME_SALT, CRIME_BANDS, CRIME_MOOD } from '../data/crime.js';
import { housesOf, allBuildings } from './world.js';
import { atLeast } from './progression.js';
import { riskOf, threatsOn } from './costs.js';
import { hash2 } from './rng.js';
import { coverageMap, coverCause } from './serviceCover.js';

// The days of the thefts still inside the mood row's window (a save written before this field existed has none: it starts empty).
const theftDays = (world) => world.danger.theftDays || (world.danger.theftDays = []);

export const crimeStarted = (world) => threatsOn(world) && atLeast(world, CRIME.startsAt);

// Homes with people in it can cause thefts.
export const canCommitCrime = (b) => b.type === 'house' && b.tier >= 1 && b.residents > 0;

export const crimeRiskOf = (world, b) => (canCommitCrime(b) ? b.crime || 0 : 0);

// The band a risk falls in: 0 Low, 1 Rising, 2 High, 3 Can cause a theft.
export function crimeBand(risk) {
  let k = 0;
  for (let i = 0; i < CRIME_BANDS.length; i++) if (risk >= CRIME_BANDS[i]) k = i;
  return k;
}

export const crimeCoverage = (world) => coverageMap(world, 'police_post', CRIME.reach);
export const crimeCoverOf = (world, b) => crimeCoverage(world).get(b.id) || 0;
export const crimeCovered = (world, b) => crimeCoverOf(world, b) >= CRIME.staffedAt;
export const crimeCause = (world, b) => coverCause(world, b, 'police_post', CRIME.reach, CRIME.staffedAt);

// Unemployment as the alerts and the mood row see it: the share of the workforce with no job (0 with no workforce).
export const unemployment = (world) => (world.labour.workforce > 0 ? (world.labour.workforce - world.labour.employed) / world.labour.workforce : 0);

// What builds a home's risk now: { tier, mood, jobs }, each true when its condition holds. The daily rate adds CRIME.lowTier,
// .lowMood and .jobless for each that is true.
export function crimeFactors(world, b) {
  return {
    tier: b.tier >= 1 && b.tier <= CRIME.lowTierMax,
    mood: world.mood < CRIME.moodBelow,
    jobs: unemployment(world) > CRIME.unemployedAbove,
  };
}

export function dailyCrimeRiskOf(world, b) {
  if (!crimeStarted(world) || !canCommitCrime(b)) return 0;
  return riskToday(world, b, crimeCoverage(world));
}
function riskToday(world, b, cover) {
  const f = crimeFactors(world, b);
  const rate = (f.tier ? CRIME.lowTier : 0) + (f.mood ? CRIME.lowMood : 0) + (f.jobs ? CRIME.jobless : 0);
  return rate * riskOf(world) * (1 - CRIME.cut * (cover.get(b.id) || 0));
}

const draw = (world, a, b, kind) => hash2(a, b, (world.seed + CRIME_SALT[kind]) | 0);
const between = ([lo, hi], u) => lo + Math.min(hi - lo, Math.floor(u * (hi - lo + 1)));

// The most gold a theft would take now (0 when the treasury holds less than the range's lowest).
export function goldLoot(world) {
  const [lo, hi] = CRIME.goldRange;
  if (world.gold < lo) return 0;
  return Math.min(world.gold, Math.max(lo, Math.min(hi, Math.round(world.gold * CRIME.goldShare))));
}

// The nearest storehouse or bazaar to the home (straight-line, ties by id) that holds any good, and the goods it holds in
// the order of its store's keys; null when none does.
function nearestStore(world, h) {
  const cx = h.x + h.w / 2, cy = h.y + h.d / 2;
  let best = null, bestD = Infinity;
  for (const s of allBuildings(world)) {
    if (s.type !== 'storehouse' && s.type !== 'bazaar') continue;
    if (!Object.values(s.store || {}).some((n) => n > 0)) continue;
    const d = Math.hypot(s.x + s.w / 2 - cx, s.y + s.d / 2 - cy);
    if (d < bestD) { best = s; bestD = d; }
  }
  return best;
}

// The type of the nearest building to the home that is not a home (a bazaar, a temple, a well...), or null.
function nearestLandmark(world, h) {
  const cx = h.x + h.w / 2, cy = h.y + h.d / 2;
  let best = null, bestD = Infinity;
  for (const s of allBuildings(world)) {
    if (s.type === 'house' || s.type === 'rubble') continue;
    const d = Math.hypot(s.x + s.w / 2 - cx, s.y + s.d / 2 - cy);
    if (d < bestD) { best = s; bestD = d; }
  }
  return best ? best.type : null;
}

// A theft by this home now: the event (see the header) when something was taken, else null. Changes the treasury or a store.
export function steal(world, h, events = null) {
  const day = world.day;
  const gold = goldLoot(world);
  const store = nearestStore(world, h);
  let takeGold;
  if (gold > 0 && store) takeGold = draw(world, h.id, day, 'kind') < 0.5;
  else if (gold > 0) takeGold = true;
  else if (store) takeGold = false;
  else return null;
  let ev;
  if (takeGold) {
    world.gold -= gold;
    world.tally.theftGold += gold;
    ev = { type: 'theft', id: h.id, kind: 'gold', amount: gold, near: nearestLandmark(world, h) };
  } else {
    const goods = Object.keys(store.store).filter((g) => store.store[g] > 0);
    const good = goods[Math.min(goods.length - 1, Math.floor(draw(world, h.id, day, 'good') * goods.length))];
    const amount = Math.min(store.store[good], between(CRIME.goodsRange, draw(world, h.id, day, 'amount')));
    store.store[good] -= amount;
    if (store.store[good] <= 0) delete store.store[good];
    ev = { type: 'theft', id: h.id, kind: 'goods', amount, good, from: store.id, store: store.type, near: nearestLandmark(world, h) };
  }
  h.crime = 0;
  world.tally.thefts += 1;
  theftDays(world).push(day);
  if (events) events.push(ev);
  return ev;
}

export function crimeDay(world, events = null) {
  forgetThefts(world);
  if (!crimeStarted(world)) return;
  const day = world.day;
  const cover = crimeCoverage(world);
  for (const b of housesOf(world)) {
    if (!canCommitCrime(b)) continue;
    b.crime = (b.crime || 0) + riskToday(world, b, cover);
    if (b.crime >= CRIME.threshold && draw(world, b.id, day, 'theft') < CRIME.theftChance) steal(world, b, events);
  }
  forgetThefts(world);
}

// danger.theftDays keeps the days inside the mood row's window.
function forgetThefts(world) {
  const days = theftDays(world);
  let k = 0;
  while (k < days.length && days[k] < world.day - CRIME_MOOD.days) k++;
  if (k) days.splice(0, k);
}

// Crime's alerts (see the header), ascending first id.
export function crimeAlerts(world) {
  if (!crimeStarted(world)) return [];
  const groups = new Map();
  let cover = null;
  for (const b of housesOf(world)) {
    if (!canCommitCrime(b) || crimeBand(b.crime || 0) < 2) continue;
    if (((cover || (cover = crimeCoverage(world))).get(b.id) || 0) >= CRIME.staffedAt) continue;
    const key = `${Math.floor(b.x / CRIME.districtTiles)},${Math.floor(b.y / CRIME.districtTiles)}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(b.id);
  }
  return [...groups.values()].map((ids) => ({ code: 'crime_risk', id: ids[0], ids, count: ids.length })).sort((p, q) => p.id - q.id);
}

// The mood row: { thefts } for the thefts in the last CRIME_MOOD.days days, each CRIME_MOOD.each, at most CRIME_MOOD.max; no
// key at 0. updateMood adds it at the month end, after the day has turned.
export function crimeMood(world) {
  const n = theftDays(world).filter((d) => world.day - d <= CRIME_MOOD.days).length;
  return n ? { thefts: Math.max(CRIME_MOOD.max, n * CRIME_MOOD.each) } : {};
}
