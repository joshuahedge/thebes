// Prestige (spec 4.16, 4.9, 4.19, rulings 199, 201, 202, 242): measured from the monuments standing, never stored.
// Complete in the contract (Track 0), because the score, the mood, the cards' locks, the confirm bar and the site sheet all
// read it; Track A owns it afterwards and may refine, never change, the behaviour. src/sim/monuments.js re-exports these.
// Pure: no world writes, no events.
import { MONUMENTS, MONUMENT_KINDS, PRESTIGE } from '../data/monuments.js';
import { allBuildings } from './world.js';

// One monument's prestige: its courses' share rounded down (half x courses done / courses), plus the completion share
// once finished. 0 for anything that is not a monument.
export function prestigeOfBuilding(b) {
  const m = b && MONUMENTS[b.type];
  if (!m || !b.site) return 0;
  const n = m.courses.length;
  const course = Math.max(0, Math.min(n, b.site.course));
  return Math.floor((m.prestige.courses * course) / n) + (b.site.done !== null ? m.prestige.done : 0);
}

// Each kind's share: the most any standing monument of that kind gives (one of each kind counts; a second adds
// desirability only). { kind: { prestige, id } } for every kind, id null when none stands.
export function prestigeByKind(world) {
  const out = Object.fromEntries(MONUMENT_KINDS.map((k) => [k, { prestige: 0, id: null }]));
  for (const b of allBuildings(world)) {
    if (!MONUMENTS[b.type]) continue;
    const p = prestigeOfBuilding(b), cur = out[b.type];
    if (cur.id === null || p > cur.prestige) out[b.type] = { prestige: p, id: b.id };   // ties keep the older (lower id)
  }
  return out;
}

// The city's prestige: the sum of the kinds' shares (0-700 with the data's numbers).
export function prestigeOf(world) {
  const by = prestigeByKind(world);
  return MONUMENT_KINDS.reduce((s, k) => s + by[k].prestige, 0);
}

// Whether this monument is the one whose prestige counts for its kind (a second of a kind says "One of each kind counts").
export const holdsPrestige = (world, b) => prestigeByKind(world)[b.type] !== undefined && prestigeByKind(world)[b.type].id === b.id;

// The mood term: +1 for every PRESTIGE.moodPer prestige, at most PRESTIGE.moodMax.
export const monumentMood = (world) => Math.min(PRESTIGE.moodMax, Math.floor(prestigeOf(world) / PRESTIGE.moodPer));

// The Monuments score part, 0-100: 100 x sqrt(prestige / PRESTIGE.scoreFull), at most 100, rounded.
export const monumentsPart = (prestige) => Math.round(100 * Math.min(1, Math.sqrt(Math.max(0, prestige) / PRESTIGE.scoreFull)));
