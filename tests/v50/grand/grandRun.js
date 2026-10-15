// Version 5.0, Task 7 (rulings 580-599): the grand district. The capital run (tests/stage4/balance/capitalRun.js: the same script, through the public
// commands, on Normal) on a 64-tile map, so the open ground east of its 48 tiles is there for what comes after, is lived on from year 6 to year 10
// by a player who does what the game says: each month end it reads the city advice (cityAdvice) for the city's dangers and for the grand district
// (every home from a Manor up: GRAND_TIER), and each grand home's next step (nextStep), and does each fix the way its Show me leads: a build where
// Show me's ghost lands (ui/placement.js nearestFit from the fix's target; a ground-bound maker from the nearest free tile of its ground), with a
// road routed to it when the ghost has none; a far good's fix sets the Fetch order on the store the sheet opens. As the confirm bar says, a maker
// with no store in reach gets the good's store beside it, and one that would still stand idle is taken back; a workshop with no room by its input
// is built in the open with a store that Fetches the input. It keeps RESERVE in the treasury, builds no workplace the workforce cannot staff and
// at most BUILDS_A_MONTH things a month, and sends the yearly tribute (the late run's rule). The Villa and the Estate come from the advice, with
// the hand-play below (a player's own moves that no advice line or next step says; ruling 586 records the satellite):
//   - the clay fetch and the beer ignore order, set on the first day (the capital run's own leftovers, below);
//   - the road to each ghost that needs one, routed to the nearest road, and a step taken back (undo) when it would stand idle: what the confirm
//     bar's "needs a road" and "no input in reach" say, but no advice names the route;
//   - the satellite workshop (satellite below): a workshop (the second weaver, the jeweller) in the open with its own store that Fetches its input
//     (flax, gems), when there is no room by the store holding it. No advice says that (moreOf names a workshop beside the store holding the input); without it the run
//     reaches a Villa (month 92) but no Estate in ten years (measured when this was written).
import { runCapital, CAPITAL_YEARS } from '../../stage4/balance/capitalRun.js';
import { advanceDays } from '../../../src/sim/clock.js';
import { place, canPlace, tileReason } from '../../../src/sim/commands.js';
import { drawRoute } from '../../../src/sim/route.js';
import { lacksRoad, buildingsInReach } from '../../../src/sim/reach.js';
import { storeAccepts } from '../../../src/sim/production.js';
import { undo } from '../../../src/sim/undo.js';
import { housesOf, population, allBuildings } from '../../../src/sim/world.js';
import { setTradeOrder } from '../../../src/sim/trade.js';
import { cityAdvice, nextStep, storeFor, inputHolder } from '../../../src/sim/advice.js';
import { isUnlocked } from '../../../src/sim/progression.js';
import { quotaOf, quotaStatus, sendQuota } from '../../../src/sim/pressure.js';
import { setFetch } from '../../../src/sim/carts.js';
import { costOf } from '../../../src/sim/costs.js';
import { BUILDINGS } from '../../../src/data/buildings.js';
import { DAYS_PER_MONTH, MONTHS_PER_YEAR } from '../../../src/sim/time.js';
import { nearestFit } from '../../../src/ui/placement.js';
import { nearestTerrainTile } from '../../../src/ui/goalsList.js';

export const GRAND_YEARS = 10;
export const GRAND_SIZE = 64;
export const GRAND_TIER = 6;          // the grand district: every home from a Manor up
const RESERVE = 400;
const BUILDS_A_MONTH = 6;             // a steady player's month: a handful of things, not the whole list at once
const NEAR_TILES = 8;                 // a ghost further than this from the fix's target is not where the fix helps: the player leaves it
const REACH_TILES = 12;               // a maker or store named beside a building: within a producer's reach of it (producerReach 12)
// Why the player passed a fix by, counted for the record (reset by each run): no_workers, no_spot, would_idle, satellite_failed and the placing rule's reasons.
let skips = {};
const skip = (why) => { skips[why] = (skips[why] || 0) + 1; return null; };

const tiers = (w) => {
  const out = {};
  for (const h of housesOf(w)) if (h.tier > 0) out[h.tier] = (out[h.tier] || 0) + 1;
  return out;
};


// Where the player puts it: Show me's ghost (nearestFit from the target, as showMeRefusal searches: the whole map). A ghost the placing rule
// takes only with a road to come ('needs_road') is placed so, and the player then routes a road from beside it to the nearest road (the road
// tool's Route, src/sim/route.js), as the confirm bar's "needs a road" asks. null when the rule refuses it.
function spotFor(w, type, at, fix) {
  const def = BUILDINGS[type];
  const ghost = nearestFit(w, { kind: 'building', type }, at.x - def.w / 2, at.y - def.d / 2, null, w.size);
  // A service far from the place it was asked for does not serve it, nor a maker from the store or herd it was named beside: the player leaves it. A maker
  // or a store asked for near the bazaar may go where there is room (its goods travel by cart).
  const maker = Boolean(def.produces || def.stores);
  const far = (!maker || fix.near !== undefined || fix.herd) && Math.hypot(ghost.x + def.w / 2 - at.x, ghost.y + def.d / 2 - at.y) > (maker ? REACH_TILES : NEAR_TILES);
  return !far && canPlace(w, type, ghost.x, ghost.y, { roadLater: true, rot: ghost.rot || 0 }).ok ? ghost : null;
}

// A road from the free tile beside the building nearest any road to that road tile, routed (one undo step). Returns whether it touches a road.
function connectRoad(w, b) {
  if (!lacksRoad(w, b)) return true;
  const size = w.size;
  let best = null;
  for (let i = 0; i < w.road.length; i++) {
    if (!w.road[i]) continue;
    const rx = i % size, ry = Math.floor(i / size);
    const d = Math.max(0, b.x - rx, rx - (b.x + b.w - 1)) + Math.max(0, b.y - ry, ry - (b.y + b.d - 1));
    if (!best || d < best.d) best = { rx, ry, d };
  }
  if (!best) return false;
  const beside = [];
  for (let x = b.x; x < b.x + b.w; x++) beside.push([x, b.y - 1], [x, b.y + b.d]);
  for (let y = b.y; y < b.y + b.d; y++) beside.push([b.x - 1, y], [b.x + b.w, y]);
  const free = beside.filter(([x, y]) => tileReason(w, 'well', x, y) === null).sort((p, q) => (Math.abs(p[0] - best.rx) + Math.abs(p[1] - best.ry)) - (Math.abs(q[0] - best.rx) + Math.abs(q[1] - best.ry)));
  for (const [x, y] of free) if (drawRoute(w, x, y, best.rx, best.ry).ok) return true;
  return false;
}

// A workshop named beside the store holding its input, with no room there: the player builds it in the open instead, with a store of its own
// beside it that Fetches the input from that store by cart (Stage 4.7's carts: the fix for goods held far away), the nearest room Show me's
// search finds to the holder. Its goods then reach the homes as any far good does (the advice's Fetch fix). Undone if any step fails.
function satellite(w, type) {
  const def = BUILDINGS[type], input = def.consumes, holder = w.buildings[inputHolder(w, type)];
  const st = storeFor(input);
  if (!holder || !st || !isUnlocked(w, st) || w.gold - costOf(w, st) - costOf(w, type) < RESERVE) return null;
  const L = w.labour;
  if (L.workforce - L.jobs < def.workers + BUILDINGS[st].workers) return null;
  const undoBefore = w.undo.length;
  const back = () => { while (w.undo.length > undoBefore) undo(w); return skip('satellite_failed'); };
  const sg = nearestFit(w, { kind: 'building', type: st }, holder.x, holder.y, null, w.size);
  const rs = canPlace(w, st, sg.x, sg.y, { roadLater: true }).ok ? place(w, st, sg.x, sg.y, { roadLater: true }) : { ok: false };
  if (!rs.ok || !connectRoad(w, w.buildings[rs.id])) return back();
  const store = w.buildings[rs.id];
  const mg = nearestFit(w, { kind: 'building', type }, store.x, store.y, null, w.size);
  const rm = canPlace(w, type, mg.x, mg.y, { roadLater: true }).ok ? place(w, type, mg.x, mg.y, { roadLater: true }) : { ok: false };
  if (!rm.ok || !connectRoad(w, w.buildings[rm.id])) return back();
  if (!buildingsInReach(w, w.buildings[rm.id], def.producerReach, (o) => o.id === store.id).length) return back();
  if (!setFetch(w, store.id, input, 100).ok) return back();
  return { day: w.day, type, x: mg.x, y: mg.y, store: { type: st, x: sg.x, y: sg.y, fetch: input } };
}

// Does one fix the way its Show me would: a build where the ghost lands (refused or unaffordable: nothing), a far good's Fetch order. Returns
// the record of what was done, or null.
function act(w, fix, good, tried) {
  if (!fix) return null;
  if (fix.select !== undefined) {
    if (!fix.fetch || !good) return null;
    const key = `fetch:${fix.select}:${good}`;
    const held = w.buildings[fix.select];
    if (tried.has(key) || !held || (held.orders && held.orders[good] && held.orders[good].fetch)) return null;   // already set: nothing to do
    tried.add(key);
    return setFetch(w, fix.select, good, 100).ok ? { day: w.day, fetch: good, id: fix.select } : null;
  }
  if (!fix.item || fix.item === 'road' || fix.item === 'house' || !BUILDINGS[fix.item]) return null;
  const type = fix.item, def = BUILDINGS[type];
  const key = `${type}:${Math.round(fix.target.x)}:${Math.round(fix.target.y)}`;
  if (tried.has(key)) return null;
  tried.add(key);
  if (def.produces && allBuildings(w).some((b) => b.type === type && b.blocked === 'no_input') && fix.near === undefined) return null;   // one already stands idle for want of its input: another would too
  if (w.gold - costOf(w, type) < RESERVE) return null;
  const L = w.labour;
  if (def.workers && L.workforce - L.jobs < def.workers) return skip('no_workers');   // no workers to spare for it: the summary's jobs and workers say so
  const at = fix.at === 'terrain' && def.terrain ? nearestTerrainTile(w, def.terrain, fix.target) || fix.target : fix.target;
  const spot = spotFor(w, type, at, fix);
  if (!spot) return def.consumes ? satellite(w, type) : skip('no_spot');
  const undoBefore = w.undo.length;
  const r = place(w, type, spot.x, spot.y, { roadLater: true, rot: spot.rot || 0 });
  if (!r.ok) return skip(r.reason);
  const b = w.buildings[r.id];
  // The player reads the confirm bar before the tick (the sim's own reach, by the road just routed). A maker with no store in reach to take its
  // goods gets that good's store laid beside it (the bar's "no store in reach" names it); one that still could not work, or a workshop with
  // none of its input in reach, would stand idle, so the step is taken back (undo: the roads and buildings, fully refunded).
  const outputs = () => buildingsInReach(w, b, def.producerReach, (o) => storeAccepts(o, def.produces.good)).length > 0;
  let ok = connectRoad(w, b) && !(def.consumes && !buildingsInReach(w, b, def.producerReach, (o) => (o.store[def.consumes] || 0) > 0).length);
  let store = null;
  if (ok && def.produces && !outputs()) {
    const st = storeFor(def.produces.good);
    const at2 = { x: b.x + b.w / 2, y: b.y + b.d / 2 };
    const s2 = st && isUnlocked(w, st) && w.gold - costOf(w, st) >= RESERVE ? spotFor(w, st, at2, { near: b.id }) : null;
    const r2 = s2 ? place(w, st, s2.x, s2.y, { roadLater: true }) : { ok: false };
    ok = r2.ok && connectRoad(w, w.buildings[r2.id]) && outputs();
    if (ok) store = { type: st, x: s2.x, y: s2.y };
  }
  if (!ok) {
    while (w.undo.length > undoBefore) undo(w);
    skip('would_idle');
    return def.consumes ? satellite(w, type) : null;   // a workshop with no input in reach where it was asked: in the open, with its own store
  }
  return { day: w.day, type, x: spot.x, y: spot.y, store };
}


// The advice the district's player acts on: the city's dangers (towers short of a raid, fire), and every other item that concerns a grand home
// (its homes or ids include one). The old town's own wants are the capital run's, left as it built them.
const CITY_WIDE = ['raid_towers', 'fire'];
function forDistrict(w, a) {
  if (CITY_WIDE.includes(a.kind)) return true;
  const ids = (a.data && (a.data.homes || a.data.ids)) || [];
  return ids.some((id) => w.buildings[id] && w.buildings[id].type === 'house' && w.buildings[id].tier >= GRAND_TIER);
}
// One month end's play: the advice, top first, then each grand home's next step, until BUILDS_A_MONTH things are done or nothing more is.
function playMonth(w, built) {
  const tried = new Set();
  let n = 0;
  for (let again = true; again && n < BUILDS_A_MONTH;) {
    again = false;
    const asks = [
      ...cityAdvice(w).filter((a) => forDistrict(w, a)).map((a) => ({ kind: a.kind, fix: a.fix, good: a.data && (a.data.good || (a.data.cause && a.data.cause.good)) })),
      ...housesOf(w).filter((h) => h.tier >= GRAND_TIER).map((h) => nextStep(w, h)).filter((s) => s.reason === null).map((s) => ({ fix: s.fix, good: s.cause.good })),
    ];
    for (const ask of asks) {
      const done = act(w, ask.fix, ask.good, tried);
      if (!done) continue;
      built.push(done);
      n++;
      again = true;
      break;                                                    // the city has changed: read the advice again
    }
  }
}

function sendTribute(w) {
  const q = quotaOf(w);
  if (!q || q.result !== null) return;
  const st = quotaStatus(w);
  const monthOfYear = (Math.floor(w.day / DAYS_PER_MONTH) % MONTHS_PER_YEAR) + 1;
  if (st.completes || (monthOfYear >= 10 && st.shipNow > 0)) sendQuota(w);
}

export function runGrand({ years = GRAND_YEARS } = {}) {
  const started = performance.now();
  skips = {};
  const base = runCapital(CAPITAL_YEARS * MONTHS_PER_YEAR, { size: GRAND_SIZE });
  const w = base.w;
  const built = [], months = [];
  // Two choices a player makes on the day, the capital run's own leftovers (no rule changed): the late run's clay fetch (the potters' storehouse
  // Fetches the clay stranded in the works quarter: without it the potters make no more pottery than the homes use), and the beer the capital
  // run sells above 40 kept for the homes instead (its Manors want beer to grow, and a sell order empties the bazaar's store).
  const main = allBuildings(w).find((b) => b.type === 'storehouse' && b.x === 22 && b.y === 18);
  const policies = { clay: Boolean(main) && setFetch(w, main.id, 'clay', 200).ok, beer: setTradeOrder(w, 'beer', 'ignore', 0).ok };
  const first = {};
  let lowestGold = w.gold;
  const firstMonth = Math.round(w.day / DAYS_PER_MONTH) + 1;
  for (let m = firstMonth; m <= years * MONTHS_PER_YEAR; m++) {
    advanceDays(w, DAYS_PER_MONTH);
    lowestGold = Math.min(lowestGold, w.gold);
    sendTribute(w);
    playMonth(w, built);
    const t = tiers(w);
    for (const tier of [7, 8, 9]) if (first[tier] === undefined && Object.keys(t).some((k) => Number(k) >= tier)) first[tier] = m;
    months.push({ month: m, gold: Math.round(w.gold), people: population(w), tiers: t, taxes: w.stats.lastMonth.taxes });
  }
  return { w, base, policies, built, months, first, lowestGold, skips, elapsed: performance.now() - started };
}

let shared = null;
export const grandRun = () => shared || (shared = runGrand());
