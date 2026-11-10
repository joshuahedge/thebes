// Version 9.3 (spec section 3, ruling 1885): the look of a tile or a building, worked out at draw time from the world. The eight ranks fold into four
// looks; when a rank brings a new look, it spreads from the centre (the palace, else the built-up area's middle) and reaches the farthest building
// REBUILD_DAYS after the rank-up (world.splits keeps the day each rank was first reached; a rank never falls). Pure: the sim never reads it.
import { MILESTONES } from '../data/progression.js';
import { allBuildings, buildingsVersion } from '../sim/world.js';
import { DAYS_PER_MONTH } from '../sim/time.js';

export const LOOKS = ['village', 'town', 'city', 'capital'];
const FIRST_RANK = ['village', 'town', 'city', 'capital'];          // the rank that brings each look
export const REBUILD_DAYS = 4 * DAYS_PER_MONTH;

const rankIndex = (id) => MILESTONES.findIndex((m) => m.id === id);
export function lookOfRank(rankId) {
  const i = rankIndex(rankId);
  for (let look = FIRST_RANK.length - 1; look > 0; look--) if (i >= rankIndex(FIRST_RANK[look])) return look;
  return 0;
}

const centres = new WeakMap();   // world -> { version, cx, cy, dMax }
export function lookCentre(world) {
  const v = buildingsVersion(world);
  const top = lookOfRank(world.milestone), rankDay = world.splits && world.splits[FIRST_RANK[top]];
  const held = centres.get(world);
  if (held && held.version === v && held.top === top && held.rankDay === rankDay) return held;
  // Version 9.3 speed fix (ruling 1943): the front's centre and reach come from the buildings standing on the rank day (no b.day counts as standing), so a well
  // built at the edge later, or pulled down, never moves the front for the rest of the city. With no rank day recorded, every building counts.
  const list = allBuildings(world).filter((b) => !Number.isInteger(rankDay) || !Number.isInteger(b.day) || b.day <= rankDay);
  const palace = list.find((b) => b.type === 'palace');
  let cx = 0, cy = 0;
  if (palace) { cx = palace.x + palace.w / 2; cy = palace.y + palace.d / 2; }
  else if (list.length) {
    for (const b of list) { cx += b.x + b.w / 2; cy += b.y + b.d / 2; }
    cx /= list.length; cy /= list.length;
  }
  let dMax = 0;
  for (const b of list) dMax = Math.max(dMax, Math.hypot(b.x + b.w / 2 - cx, b.y + b.d / 2 - cy));
  const out = { version: v, top, rankDay, cx, cy, dMax };
  centres.set(world, out);
  return out;
}

// The newest look whose front has reached (x, y). A look whose rank has no recorded day counts as fully rebuilt.
export function lookAt(world, x, y) {
  const top = lookOfRank(world.milestone);
  if (top === 0) return 0;
  const { cx, cy, dMax } = lookCentre(world);
  const share = dMax > 0 ? Math.min(1, Math.hypot(x - cx, y - cy) / dMax) : 0;
  for (let look = top; look > 0; look--) {
    const day = world.splits && world.splits[FIRST_RANK[look]];
    if (!Number.isInteger(day)) return look;
    if (world.day >= day + share * REBUILD_DAYS) return look;
  }
  return 0;
}

// A building's look: its centre's, unless it was placed after its rank's look arrived (b.day, Task 0.2), when it starts current.
// Version 9.3 speed fix (ruling 1940): every drawn building asks this every frame (slotFor, the scaffold watch), and it answers from the world's rank, day,
// splits and buildings, so it is kept per building and thrown away when any of those moves (in a rebuild the day moves it; at rest it holds for ever).
const held = new WeakMap();   // world -> { milestone, day, version, town, city, capital, byBuilding: WeakMap(b -> look) }
export function lookOfBuilding(world, b) {
  const v = buildingsVersion(world), sp = world.splits;
  const town = sp ? sp.town : undefined, city = sp ? sp.city : undefined, capital = sp ? sp.capital : undefined;
  let h = held.get(world);
  if (!h || h.milestone !== world.milestone || h.day !== world.day || h.version !== v || h.town !== town || h.city !== city || h.capital !== capital) {
    h = { milestone: world.milestone, day: world.day, version: v, town, city, capital, byBuilding: new WeakMap() };
    held.set(world, h);
  }
  let look = h.byBuilding.get(b);
  if (look === undefined) { look = lookOfBuildingFresh(world, b); h.byBuilding.set(b, look); }
  return look;
}
export function lookOfBuildingFresh(world, b) {
  const top = lookOfRank(world.milestone);
  const day = world.splits && world.splits[FIRST_RANK[top]];
  if (top > 0 && Number.isInteger(b.day) && Number.isInteger(day) && b.day > day) return top;
  return lookAt(world, b.x + b.w / 2, b.y + b.d / 2);
}
