// Version 7.0, Track A's dev scenes (src/dev/v70/index.js joins them): the Advice fixes. Track 0 left minimal worlds; Track A owns this file. Open
// /?skipTitle=1&nosw=1&seed=11&sample=1 first. Each scene takes { quick } (no settling wait) and { open: false } (leave City advice shut).
//   v70-advice-tower   the sample city with a trading post by its south street and a raid warned from the east entry (3 towers needed, 1 built), City advice open on the tower item: Show me goes to a
//                      tile a road touches within the tower's range of the trading post, the building the band strikes first. { lonely: true } puts the trading post (the
//                      warned kind) out on open ground with no road in range: the item says "Lay a road to here, then build the tower", Show me at the road's end
//   v70-stranded       the sample city with its storehouses gone and one bazaar left (the southernmost), one storehouse as far from it as the street goes holding the only pottery, and its stall empty: City advice names
//                      pottery kept too far away for a cart and says to build a storehouse near the bazaar, Show me at the spot (strandedFix)
import { allBuildings, removeBuilding } from '../../sim/world.js';
import { place, canPlace } from '../../sim/commands.js';
import { entryDir, raidTargetKind } from '../../sim/raids.js';
import { cityAdvice } from '../../sim/advice.js';
import { towerSpotsFor, strandedFix } from '../../sim/adviceFixes.js';
import { openSheet } from '../../ui/modes.js';
import { roadReach, reachDistance } from '../../sim/reach.js';
import { BUILDINGS } from '../../data/buildings.js';
import { sampleCity, look, wait } from './base.js';

const FAR_TILES = 26;   // road tiles from the bazaar the stranded scene's store stands at, or as far as the street goes (src/sim/adviceFixes.js cartMonthly: under an order's worth a month from there)

const openAdvice = (api, options) => {
  const g = api.game();
  g.ui.refresh();
  if (options.open !== false) g.ui.store.set(openSheet(g.ui.store.get(), 'advice'));
};
const itemOf = (world, kind) => cityAdvice(world).find((a) => a.kind === kind) || null;

export async function adviceTowerScene(api, options = {}) {
  const world = sampleCity(api, 'v70-advice-tower', options);
  const e = world.raiderEntries[0] || world.focus;
  // A trading post (the warned kind, so the first strike): by the south street with room for a tower beside the road, or, with { lonely: true }, alone on the open
  // ground east of the city beyond every road.
  const near = (x, y, roadLater) => canPlace(world, 'trading_post', x, y, { roadLater }).ok;
  let at = null;
  if (options.lonely) for (let x = 52; x >= 40 && !at; x--) { if (near(x, e.y, true)) at = { x, y: e.y }; }
  else for (let y = 58; y <= 62 && !at; y++) { if (near(21, y, false)) at = { x: 21, y }; }
  if (!at || !place(world, 'trading_post', at.x, at.y, { roadLater: Boolean(options.lonely) }).ok) throw new Error('devScene v70-advice-tower: no room for the trading post');
  world.raid.index = Math.max(world.raid.index, 1);
  world.raid.clockDay = world.raid.clockDay === null ? 0 : world.raid.clockDay;
  world.raid.warning = { index: world.raid.index, entry: { x: e.x, y: e.y }, dir: entryDir(world, e), size: 9, tribute: null, target: 'trading_post', day: world.day - 10, arrives: world.day + 80, first: false };
  const a = itemOf(world, 'raid_towers');
  if (!a) throw new Error('devScene v70-advice-tower: no tower item (the city has enough towers)');
  openAdvice(api, options);
  const f = a.fix;
  look(api, f ? f.target.x : world.focus.x, f ? f.target.y : world.focus.y, 0.9);
  if (!options.quick) await wait(300);
  const guard = a.data.guard ? world.buildings[a.data.guard.id] : null;
  return `v70-advice-tower: raid of 9 aimed at the ${raidTargetKind(world)}, first strike ${guard ? `${guard.type} ${guard.x},${guard.y}` : 'none'}, ${a.data.spot ? `spot ${a.data.spot.x},${a.data.spot.y} of ${towerSpotsFor(world, { x: guard.x + guard.w / 2, y: guard.y + guard.d / 2 }).length}` : a.data.road ? `road of ${a.data.road.tiles} tiles to ${a.data.road.x},${a.data.road.y}` : 'no spot'}`;
}

export async function strandedScene(api, options = {}) {
  const world = sampleCity(api, 'v70-stranded', options);
  for (const b of allBuildings(world).filter((o) => o.type === 'storehouse')) removeBuilding(world, b.id);
  // Where the only pottery is kept: a storehouse a road reaches that is far from every bazaar by road, the nearest to FAR_TILES road tiles away (a cart brings under an
  // order's worth a month from there); with none that far, the farthest.
  const south = allBuildings(world).filter((o) => o.type === 'bazaar').sort((p, q) => q.y - p.y)[0];   // the city is compact: the southernmost bazaar alone, so the north is far from it
  for (const b of allBuildings(world).filter((o) => o.type === 'bazaar' && o.id !== south.id)) removeBuilding(world, b.id);
  const bazaars = [south];
  // The homes the other bazaars served are gone with them (their streets would fill the advice with a missing bazaar): only the homes this one reaches stay.
  const served = roadReach(world, south, BUILDINGS.bazaar.reach);
  for (const h of allBuildings(world).filter((o) => o.type === 'house' && !(reachDistance(served, world, o) <= BUILDINGS.bazaar.reach))) removeBuilding(world, h.id);
  const reach = bazaars.map((b) => roadReach(world, b, Infinity));
  let far = null;
  for (let y = 0; y < world.size - 1; y++) {
    for (let x = 0; x < world.size - 1; x++) {
      if (!canPlace(world, 'storehouse', x, y).ok) continue;
      const len = Math.min(...bazaars.map((b, i) => reachDistance(reach[i], world, { x, y, w: 2, d: 2 })));
      if (!Number.isFinite(len)) continue;
      const rank = len >= FAR_TILES ? len - FAR_TILES : 1000 - len;
      if (!far || rank < far.rank) far = { x, y, len, rank };
    }
  }
  const placed = far ? place(world, 'storehouse', far.x, far.y) : { ok: false };
  if (!placed.ok) throw new Error('devScene v70-stranded: no room for the far storehouse');
  const store = world.buildings[placed.id];
  store.store.pottery = 120;
  store.staff = 6;
  for (const b of allBuildings(world)) { if (b.store && b.type === 'bazaar') b.store.pottery = 0; if (b.type === 'house') b.stock = { ...(b.stock || {}), pottery: 0 }; }
  world.milestone = world.milestone || 'capital';
  const a = itemOf(world, 'stranded');
  openAdvice(api, options);
  const bazaar = a ? world.buildings[a.data.bazaar] : allBuildings(world).find((b) => b.type === 'bazaar') || null;
  const fix = a && bazaar ? strandedFix(world, a.data.good, bazaar) : null;
  look(api, fix ? fix.x : world.focus.x, fix ? fix.y : world.focus.y, 0.9);
  if (!options.quick) await wait(300);
  return `v70-stranded: store ${store.x},${store.y}, ${a ? `${a.data.good} ${a.data.len} road tiles from bazaar ${a.data.bazaar}` : 'no stranded item'}, fix ${fix ? `${fix.item} at ${fix.x},${fix.y} (a cart brings ${fix.perMonth} a month)` : 'none'}`;
}
