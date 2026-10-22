// Version 6.0 (Track 0 seam; Track B1 fills it, Track B2 draws what it leaves; rulings 625, 681, 682): what a raiding band does to a building it
// reaches that is not a home (a home's people flee: src/sim/raids.js frighten). src/sim/raids.js strike calls the three in STRIKE_KINDS
// order (src/data/hazards.js), then takes gold from anything that is not a granary, as before. Each is (world, active, b, events):
//   active   the raid under way (world.raid.active): a hook adds what it did to the raid's record, which becomes the report (raid.last)
//   b        the building struck; events: the clock's events array or null
//
//   burn(world, active, b, events) -> true when a blaze was started. Today's strike: a blaze through the fire rules (igniteBuilding,
//            cause 'raid', whose own 'fire' event B2 draws), followed while it burns (active.fires). A strike that wrecks the building
//            (wreckFate) does not also burn it.
//   wreck(world, active, b, events) -> the rubble ids it left ([] when it wrecked nothing). Once the grace is over, a share of the strikes
//            (WRECK.chance x severity, a draw by the building's id and the day) wrecks the building: it falls to rubble, one tile each, each
//            carrying was = { type, x, y, w, d, rot, day, cause: 'wreck' } (what stood there, so it can be cleared and rebuilt: rebuild below),
//            its stock lost with it (less what loot takes). Counts active.wrecked and active.wreckedKinds and the tally `wrecked`, pushes
//            { type: 'raid_wreck', id, kind, to } (to: the rubble ids) for B2's dust and debris.
//   loot(world, active, b, events) -> the units taken. A granary loses RAIDS.foodShare of each food it holds (as always, the grace or not);
//            once the grace is over a storehouse loses LOOT.storeShare x severity of each good it holds. Kept in active.taken ({ good: units }),
//            the tally `looted`, and { type: 'raid_loot', id, goods } for B2's carried sacks.
// The raid report (raid.last) lists burned, wrecked and taken: active.wrecked, active.wreckedKinds and active.taken stay there as burned does
// (absent means none: a report from before 6.0 has none of them).
import { RAIDS } from '../data/raids.js';
import { WRECK, LOOT } from '../data/hazards.js';
import { BUILDINGS } from '../data/buildings.js';
import { igniteBuilding } from './fire.js';
import { makeBuilding, insertBuilding, removeBuilding } from './world.js';
import { dangerDraws, hazardDraw } from './draws.js';
import { footprint } from './grid.js';
import { costOf, rubbleCostOf } from './costs.js';
import { canAfford, spend } from './money.js';
import { place } from './commands.js';
import { clearUndo } from './undo.js';

const fail = (reason, extra = {}) => ({ ok: false, reason, warnings: [], ...extra });

// A building a raid can wreck: anything it strikes that is not a home, rubble, a monument or the palace (those are never its targets).
const wreckable = (b) => b.type !== 'house' && b.type !== 'rubble' && !BUILDINGS[b.type].monument && !BUILDINGS[b.type].palace;

// Whether a strike on this building today wrecks it (the draw is the building's id and the day, so burn and wreck agree).
export function wreckFate(world, b) {
  const d = dangerDraws(world);
  return d.strikes.wreck && wreckable(b) && hazardDraw(world, b.id, world.day, 'wreck') < Math.min(1, WRECK.chance * d.severity);
}

// The share of each good a store loses, rounded up: { good: units taken }, taken out of the store.
function takeShare(b, share) {
  const out = {};
  for (const good of Object.keys(b.store)) {
    const take = Math.min(b.store[good], Math.ceil(b.store[good] * share));
    if (take > 0) { b.store[good] -= take; out[good] = take; }
  }
  return out;
}

export const STRIKES = {
  burn(world, active, b, events) {
    if (wreckFate(world, b)) return false;
    if (!igniteBuilding(world, b.id, events, 'raid')) return false;
    active.fires.push({ id: b.id, type: b.type });
    return true;
  },
  wreck(world, active, b, events) {
    if (world.buildings[b.id] !== b || !wreckFate(world, b)) return [];
    const was = { type: b.type, x: b.x, y: b.y, w: b.w, d: b.d, rot: b.rot, day: world.day, cause: 'wreck' };
    removeBuilding(world, b.id);
    const to = footprint(b.x, b.y, b.w, b.d).map(([x, y]) => {
      const r = makeBuilding(world, 'rubble', x, y);
      r.was = { ...was };
      return insertBuilding(world, r).id;
    });
    if (active.fires) active.fires = active.fires.filter((f) => f.id !== b.id);
    active.wrecked = (active.wrecked || 0) + 1;
    (active.wreckedKinds = active.wreckedKinds || []).push(b.type);
    world.tally.wrecked += 1;
    if (events) events.push({ type: 'raid_wreck', id: b.id, kind: b.type, to });
    return to;
  },
  loot(world, active, b, events) {
    const d = dangerDraws(world);
    let goods = null;
    if (b.type === 'granary') goods = takeShare(b, RAIDS.foodShare);
    else if (b.type === 'storehouse' && d.strikes.loot) goods = takeShare(b, LOOT.storeShare * d.severity);
    if (!goods) return 0;
    const n = Object.values(goods).reduce((s, v) => s + v, 0);
    if (n <= 0 || !d.strikes.loot) return n;          // while the grace lasts a granary's food is taken and counted as it always was, nothing more
    active.taken = active.taken || {};
    for (const [good, units] of Object.entries(goods)) active.taken[good] = (active.taken[good] || 0) + units;
    world.tally.looted += n;
    if (events) events.push({ type: 'raid_loot', id: b.id, goods });
    return n;
  },
};

// ── Rebuilding what stood there ──
// Rubble that carries was (a wrecked or burned building, src/sim/fire.js burnBuilding) can be cleared and the building put back as it was: one
// command that pays the clearing of every rubble tile of it (rubbleCostOf) and the building's price in this city (costOf), and places it on
// its own place, turned as it was, through the placing rule (a road is not needed at once). The quote says what it costs and whether it can.
//   { ok, reason, type, x, y, tiles (the rubble ids), clear, build, cost } ; reason when not ok: 'no_rubble' (no such rubble, or nothing known
//   of what stood there), 'no_gold' (the sum would take the treasury below the debt floor)
export function rebuildQuote(world, rubbleId) {
  const r = world.buildings[rubbleId];
  if (!r || r.type !== 'rubble' || !r.was || !BUILDINGS[r.was.type]) return fail('no_rubble');
  const w = r.was;
  const tiles = footprint(w.x, w.y, w.w, w.d).map(([x, y]) => world.occ[y * world.size + x]).filter((id) => {
    const t = world.buildings[id];
    return t && t.type === 'rubble' && t.was && t.was.type === w.type && t.was.x === w.x && t.was.y === w.y && t.was.day === w.day;
  });
  if (tiles.length !== w.w * w.d) return fail('no_rubble');
  const clear = tiles.length * rubbleCostOf(world), build = costOf(world, w.type);
  const out = { type: w.type, x: w.x, y: w.y, rot: w.rot, tiles, clear, build, cost: clear + build };
  return canAfford(world, out.cost) ? { ok: true, reason: null, warnings: [], ...out } : fail('no_gold', out);
}

// The rebuild command (see above). { ok, id, cost, type, warnings } or the quote's refusal, or the placing rule's own reason (the ground is no
// longer free, say), with the rubble as it was.
export function rebuild(world, rubbleId) {
  const q = rebuildQuote(world, rubbleId);
  if (!q.ok) return q;
  const snaps = q.tiles.map((id) => JSON.parse(JSON.stringify(world.buildings[id])));
  for (const id of q.tiles) removeBuilding(world, id);
  const r = place(world, q.type, q.x, q.y, { roadLater: true, rot: q.rot });
  if (!r.ok) {
    for (const s of snaps) insertBuilding(world, s);
    return { ...q, ok: false, reason: r.reason };
  }
  spend(world, q.clear);
  world.tally.rubbleCleared += q.tiles.length;
  world.tally.rebuilt += 1;
  clearUndo(world);   // the placing's undo would put the building back to nothing and keep the clearing: neither can be undone alone
  return { ok: true, warnings: r.warnings || [], id: r.id, type: q.type, cost: q.cost };
}
