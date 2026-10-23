// Version 7.0, Track T's dev scenes (src/dev/v70/index.js joins them): trade and the Quay, on the seed-11 sample Capital. Open
// /?skipTitle=1&nosw=1&seed=11&sample=1 first. Each lays what trade needs through the public commands where a player could (a trading post
// joined to the trade entry, a Quay on the river with a road beside it, the routes opened and the orders set), and the rest as fixtures,
// said so: the game paused on a chosen day, last year's ledger, the great temple founded with its first offering owed (held: true).
//   v70-trade   the Trade sheet over Memphis, Byblos and Nubia (punt: true makes the city a Great Capital and opens Punt too); open: a route
//               id opens that card on a phone (the accordion); held: true adds the great temple, so grain shows "held for the temple"
//   v70-quay    the Quay's sheet (refuse: true instead starts placing a Quay on dry land, so the bar shows its refusal and Show me)
//   v70-boat    the day before a caravan day: a boat sailing in to the Quay (what: 'caravan' frames the caravan on the road instead;
//               moored: true the caravan day itself, the boat at rest). Motion is the caller's: the shots tool sets Full for the movement
// Every scene takes { quick } (no settling wait).
import { PARTNERS, QUAY_TYPE } from '../../data/trade.js';
import { GREAT_WORK } from '../../data/reign.js';
import { BUILDINGS, dimsOf } from '../../data/buildings.js';
import { canPlace, place } from '../../sim/commands.js';
import { drawRoute, routeRoad } from '../../sim/route.js';
import { openRoute, setTradeOrder, setKeepAtLeast, postConnected, tradePost, activeQuay, quays, nextCaravanDay } from '../../sim/trade.js';
import { adjacentRoadTiles, touchesRoad } from '../../sim/reach.js';
import { makeBuilding, insertBuilding, allBuildings } from '../../sim/world.js';
import { assignLabour } from '../../sim/labour.js';
import { buildable } from '../../sim/terrain.js';
import { footprint, idx, inBounds } from '../../sim/grid.js';
import { openSheet, select } from '../../ui/modes.js';
import { tradeWalkers, mooringOf } from '../../render/trade.js';
import { sampleCity, look, wait, waterNear } from './base.js';

const routesSaid = (world) => {
  const open = Object.keys(PARTNERS).filter((id) => world.trade.routes[id]);
  return open.length ? open.join(', ') : 'none';
};
const near = (world, f) => {
  const out = [];
  for (let y = 1; y < world.size - 2; y++) for (let x = 1; x < world.size - 2; x++) out.push({ x, y, d: Math.abs(x - f.x) + Math.abs(y - f.y) });
  return out.sort((a, b) => a.d - b.d || a.y - b.y || a.x - b.x);
};
const roadNear = (world, b) => adjacentRoadTiles(world, b)[0];

// A trading post beside a road near the city's middle, joined to the trade entry (a route laid when the streets are not).
function tradingPost(world) {
  let post = tradePost(world);
  if (!post) {
    const spot = near(world, world.focus).find((s) => canPlace(world, 'trading_post', s.x, s.y).ok);
    if (!spot) return null;
    post = world.buildings[place(world, 'trading_post', spot.x, spot.y).id];
  }
  if (!postConnected(world)) {
    const t = roadNear(world, post);
    if (t !== undefined) drawRoute(world, t % world.size, Math.floor(t / world.size), world.tradeEntry.x, world.tradeEntry.y);
  }
  return post;
}

// A Quay on the riverbank nearest the city's middle, with a road from beside it to the city's streets.
function quayOnRiver(world, post) {
  let q = quays(world)[0] || null;
  if (q) return q;
  const water = waterNear(world, world.focus.x, world.focus.y);
  if (!water) return null;
  const to = post ? roadNear(world, post) : null;
  for (const s of near(world, water).slice(0, 2000)) {
    for (const rot of [0, 1]) {
      if (!canPlace(world, QUAY_TYPE, s.x, s.y, { roadLater: true, rot }).ok) continue;
      const { w, d } = dimsOf(QUAY_TYPE, rot);
      const probe = { x: s.x, y: s.y, w, d };
      let land = null;
      if (!touchesRoad(world, probe)) {
        // a free land tile beside it that a road can reach from the post's road: the Quay goes only where its road can
        const ring = [];
        for (let x = s.x - 1; x <= s.x + w; x++) ring.push([x, s.y - 1], [x, s.y + d]);
        for (let y = s.y; y < s.y + d; y++) ring.push([s.x - 1, y], [s.x + w, y]);
        land = ring.find(([x, y]) => inBounds(world.size, x, y) && buildable(world, idx(world.size, x, y)) && !world.occ[idx(world.size, x, y)]
          && to !== undefined && to !== null && routeRoad(world, x, y, to % world.size, Math.floor(to / world.size)).ok);
        if (!land) continue;
      }
      const r = place(world, QUAY_TYPE, s.x, s.y, { roadLater: true, rot });
      if (!r.ok) continue;
      q = world.buildings[r.id];
      if (land) drawRoute(world, land[0], land[1], to % world.size, Math.floor(to / world.size));
      return q;
    }
  }
  return null;
}

// The great temple founded on free open land (a fixture: it unlocks only at the last rank), its first stage's offering owed.
function foundTemple(world) {
  const { w, d } = dimsOf(GREAT_WORK.type, 0);
  const free = (x, y) => footprint(x, y, w, d).every(([tx, ty]) => inBounds(world.size, tx, ty) && buildable(world, idx(world.size, tx, ty)) && !world.occ[idx(world.size, tx, ty)] && !world.road[idx(world.size, tx, ty)]);
  const spot = near(world, world.focus).find((s) => free(s.x, s.y));
  if (!spot) return null;
  const b = insertBuilding(world, makeBuilding(world, GREAT_WORK.type, spot.x, spot.y));
  world.reign.greatWork = b.id;
  world.reign.offered = 0;
  return b;
}

// The sample Capital trading: a post, a Quay, the routes open, the orders set, last year's ledger, paused.
function tradeCity(api, name, options) {
  const world = sampleCity(api, name, { ...options, gold: 1e6 });
  if (options.punt) world.milestone = 'great_capital';                       // a fixture: Punt opens at the Great Capital
  const post = tradingPost(world);
  const q = quayOnRiver(world, post);
  assignLabour(world);
  for (const b of allBuildings(world)) if (b.type === 'trading_post' || b.type === QUAY_TYPE) b.staff = BUILDINGS[b.type].workers;   // a fixture: staffed now
  for (const id of Object.keys(PARTNERS)) if (!world.trade.routes[id]) openRoute(world, id);
  for (const [good, mode, keep] of [['grain', 'sell', 200], ['pottery', 'sell', 60], ['linen', 'sell', 40], ['beer', 'sell', 80], ['clay', 'buy', 100], ['stone', 'buy', 200], ['gems', 'buy', 40]]) {
    setTradeOrder(world, good, mode, keep);
    setKeepAtLeast(world, good, keep);
  }
  if (options.held) foundTemple(world);
  // Last year's ledger (a fixture: a year of visits would take the scene minutes to run).
  world.trade.ledger = { year: world.trade.year, now: {}, last: { memphis: { income: 420, spent: 180 }, byblos: { income: 260, spent: 90 }, nubia: { income: 150, spent: 310 } } };
  world.gold = 2400;
  world.speed = 0;
  api.game().ui.speedControl.set(0);
  return { world, post, q };
}

export async function tradeScene(api, options = {}) {
  const { world, post } = tradeCity(api, 'v70-trade', options);
  look(api, world.focus.x, world.focus.y, 0.9);
  const ui = api.game().ui;
  ui.store.set(select(ui.store.get(), post ? post.id : null));
  ui.store.set(openSheet(ui.store.get(), 'trade', post ? post.id : null));
  if (options.open) {
    const head = document.querySelector(`#sheet .route-head[data-partner="${options.open}"]`);
    if (head && head.getAttribute('aria-expanded') === 'false') head.click();
  }
  if (!options.quick) await wait(300);
  return `v70-trade: ${world.milestone}, routes open ${routesSaid(world)}`;
}

export async function quayScene(api, options = {}) {
  const { world, q } = tradeCity(api, 'v70-quay', options);
  const w = waterNear(world, world.focus.x, world.focus.y);
  const ui = api.game().ui;
  if (q) look(api, q.x + 1, q.y + 0.5, 1.6);
  else if (w) look(api, w.x + 0.5, w.y + 0.5, 1.2);
  if (options.refuse && q) {
    // Dry land a few tiles from the water, inland of the Quay: the bar says "Must touch the river" with Show me.
    const dry = near(world, { x: q.x, y: q.y }).find((s) => s.d >= 3 && canPlace(world, QUAY_TYPE, s.x, s.y).reason === 'needs_water');
    ui.placement.start({ kind: 'building', type: QUAY_TYPE });
    if (dry) { ui.placement.moveGhost(dry.x, dry.y); look(api, dry.x + 1, dry.y + 0.5, 1.6); }
  } else if (q) ui.store.set(select(ui.store.get(), q.id));
  if (!options.quick) await wait(300);
  return `v70-quay: river at ${w ? `${w.x},${w.y}` : 'none'}, quay ${q ? `${q.x},${q.y}` : 'none'}`;
}

export async function boatScene(api, options = {}) {
  const { world, q } = tradeCity(api, 'v70-boat', options);
  const w = waterNear(world, world.focus.x, world.focus.y);
  // The day the boat (or the caravan) is half-way in, or (moored) the caravan day itself: a fixture, the game paused on it.
  const D = nextCaravanDay(world);
  const want = options.what === 'caravan' ? 'trader' : 'trade_boat';
  let day = D;
  if (!options.moored) {
    for (let d = D - 1; d > D - 9; d--) {
      const f = tradeWalkers(world, d, null, 'full').find((x) => x.kind.startsWith(want));
      if (f) day = d; else break;
    }
    day = Math.min(D - 1, Math.round((day + D) / 2));
  }
  world.day = day;
  const fig = tradeWalkers(world, day, null, 'full').find((x) => x.kind.startsWith(want));
  const at = fig || (q ? mooringOf(world, q) : w);
  if (at) look(api, at.x, at.y, 1.6);
  if (!options.quick) await wait(300);
  return `v70-boat: river at ${w ? `${w.x},${w.y}` : 'none'}, ${fig ? `${fig.kind} at ${fig.x.toFixed(1)},${fig.y.toFixed(1)} on day ${day}` : `nothing on day ${day}`}${activeQuay(world) ? '' : ', no working quay'}`;
}
