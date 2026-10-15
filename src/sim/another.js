// Version 5.0 (Task 4, ruling 505): Build another. anotherOf(world, b) says whether a building like `b` (its type, style, turn and settings) can be built
// now, by the sim's own rules (the placing rule's: unlocked, only one of a kind, the price the treasury can pay); the UI adds the one thing it cannot
// know here, a tile where it fits (src/ui/another.js). A refusal carries what its words need. Settings a copy takes with it (settingsOf):
//   fetch   a store's Fetch orders, [{ good, fetch }] (src/sim/carts.js ordersOf)
//   refuses a storehouse's switches that are off, [good, ...] (b.accepts)
// applySettings(world, id, copy) writes them on the new building once it stands. An order is written as the player's own Fetch would be, but without
// setFetch's check for a store holding the good (the new store has no road yet when it is placed): until one does, the order waits, as a set order does.
import { BUILDINGS } from '../data/buildings.js';
import { costOf } from './costs.js';
import { canPay } from './commands.js';
import { isUnlocked } from './progression.js';
import { allBuildings } from './world.js';
import { ordersOf } from './carts.js';
import { storeAccepts } from './production.js';

// What a copy of b takes with it, or null when it has nothing to copy.
export function settingsOf(b) {
  const fetch = ordersOf(b);
  const refuses = b.accepts ? Object.keys(b.accepts).filter((g) => b.accepts[g] === false) : [];
  return fetch.length || refuses.length ? { fetch, refuses } : null;
}

// { ok: true, type, style, rot, cost, copy } or { ok: false, reason, type, cost, have, id }.
// reasons: 'unknown' (rubble and the like are never built), 'locked', 'one_only' (a palace: id is the one standing), 'no_gold' (cost and have).
export function anotherOf(world, b) {
  const def = BUILDINGS[b.type];
  if (!def || def.buildable === false || def.tile) return { ok: false, reason: 'unknown', type: b.type };
  const style = def.monument ? b.style : null;
  if (!isUnlocked(world, b.type)) return { ok: false, reason: 'locked', type: b.type };
  if (def.oneOnly) { const standing = allBuildings(world).find((o) => o.type === b.type); if (standing) return { ok: false, reason: 'one_only', type: b.type, id: standing.id }; }
  const cost = costOf(world, b.type, { style });
  if (!canPay(world, b.type, cost)) return { ok: false, reason: 'no_gold', type: b.type, cost, have: world.gold, monument: Boolean(def.monument) };
  return { ok: true, type: b.type, style, rot: b.rot || 0, cost, copy: settingsOf(b) };
}

// Writes a copy's settings on a building (or a stand-in of the same shape), only for goods it can hold. Returns { fetch, refuses } as written.
function writeSettings(b, copy) {
  const done = { fetch: [], refuses: [] };
  if (!b || !copy) return done;
  const stores = BUILDINGS[b.type].stores || [];
  for (const good of copy.refuses || []) {
    if (!b.accepts || !stores.includes(good)) continue;
    b.accepts[good] = false;
    done.refuses.push(good);
  }
  for (const o of copy.fetch || []) {
    if (!stores.includes(o.good) || !b.orders || !storeAccepts(b, o.good)) continue;   // a refused good is never fetched (setFetch's own 'refuses')
    b.orders[o.good] = { fetch: o.fetch };
    done.fetch.push(o);
  }
  return done;
}

// Writes a copy's settings on building `id` once it stands: only the goods the new building can hold.
export function applySettings(world, id, copy) {
  return writeSettings(world.buildings[id], copy);
}

// What applySettings would write on a new building of `type` (the same rule, run on a blank stand-in shaped as insertBuilding makes it), or null when
// nothing would be written: the bar says only this, so its line never lists a good the copy would drop.
export function settingsThatApply(type, copy) {
  const def = BUILDINGS[type];
  if (!def || !copy) return null;
  const stand = { type, ...(type === 'storehouse' ? { accepts: {} } : {}), ...(def.stores ? { orders: {} } : {}) };
  const done = writeSettings(stand, copy);
  return done.fetch.length || done.refuses.length ? done : null;
}
