// Version 6.0, Track C's dev scene (src/dev/v60/index.js joins it): the Large plot and the 5.0 loose ends it ships with. Open /?skipTitle=1&nosw=1&seed=11&sample=1 first. It lays a
// fresh seed-11 sample Capital (as sampleCity does; its Manor is a home merged under the old rule) and then, by options.view:
//   lot       (default) an empty Large plot beside the homes, its sheet open: the "Opens when" list with what the street still lacks, and the step line
//   card      the Homes tray with the Large plot card (New, with its price per lot) and no lot laid yet
//   ready     a lot with every row met, the city's arrivals moved in: a Manor on a Large plot, its sheet open
//   progress  Home progress on, with two lots washed like homes: one waiting on its rows (an icon), one ready (a tick), and the legend's note
//   route     the road tool in Route mode over the river: the preview's bridge tiles drawn as planks, the bar's count and price of them
//   locked    a young city (a village, one plot) with the Layers picker open: Goods supply and Workers greyed with "From Town"
//   farm      a farm area dragged over fertile ground that does not fit a whole number of farms: the left-over tiles hatched amber, counted apart from the skipped ones
// Other options: seed (11), size (64), zoom, gold, motion ('gentle' | 'full' | 'still'), quick (no settling wait).
import { LARGE_PLOT } from '../../data/largePlots.js';
import { largePlotUnlocked, noteLargePlotUnlock, canPlaceLargePlot, isLot } from '../../sim/largePlots.js';
import { place, canPlace, paintHouses } from '../../sim/commands.js';
import { arrivalsBatch } from '../../sim/immigration.js';
import { lotReady } from '../../sim/housing.js';
import { BRIDGE_MAX } from '../../sim/bridges.js';
import { routeRoad } from '../../sim/route.js';
import { housesOf, allBuildings, createWorld } from '../../sim/world.js';
import { setGuide, setCityId } from '../../sim/commands.js';
import { assignLabour } from '../../sim/labour.js';
import { select, pickCategory } from '../../ui/modes.js';
import { T } from '../../sim/terrain.js';
import { idx } from '../../sim/grid.js';
import { sampleCity, look, wait } from './base.js';

// The first Large plot spot that takes the card with no warning, in rings out from (cx, cy): { x, y } or null.
function lotSpot(world, cx, cy, skip = []) {
  for (let r = 1; r <= 30; r++) {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
        const x = cx + dx, y = cy + dy;
        if (skip.some(([sx, sy]) => Math.abs(sx - x) < 3 && Math.abs(sy - y) < 3)) continue;
        const c = canPlaceLargePlot(world, x, y);
        if (c.ok && !c.warnings.length) return { x, y };
      }
    }
  }
  return null;
}

// The Townhouse nearest the middle of the homes (the card's unlock), or the first home: where the lots go beside.
function anchorOf(world) {
  const homes = housesOf(world).filter((h) => h.tier >= LARGE_PLOT.unlockTier);
  const list = homes.length ? homes : housesOf(world);
  const mx = list.reduce((s, h) => s + h.x, 0) / list.length, my = list.reduce((s, h) => s + h.y, 0) / list.length;
  return list.slice().sort((a, b) => Math.hypot(a.x - mx, a.y - my) - Math.hypot(b.x - mx, b.y - my) || a.id - b.id)[0];
}

// Lays a lot on the first clean spot in rings out from the anchor (touching a road, nothing in the way), and returns its building, or null.
function layLot(world, anchor, skip = []) {
  const s = lotSpot(world, anchor.x, anchor.y, skip);
  if (!s) return null;
  const r = place(world, LARGE_PLOT.type, s.x, s.y);
  return r.ok ? world.buildings[r.id] : null;
}

// The first spot in rings out from the lot where `type` goes with no warning (a road touches it, the ground takes it), placed through the sim's own command; false when none.
function placeAround(world, type, lot) {
  const cx = lot.x + 1, cy = lot.y + 1;
  for (let r = 1; r <= 9; r++) {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
        const c = canPlace(world, type, cx + dx, cy + dy);
        if (c.ok && !c.warnings.length) return place(world, type, cx + dx, cy + dy).ok;
      }
    }
  }
  return false;
}

// Gives a lot what the street around it would: a well, a temple and a bazaar (grain and pottery on its stall) in reach, so its sheet shows water, food, a temple and pottery met; with
// full, a booth and statues beside it too, so every row is met. The buildings are the sim's own commands; the stall's stock is a fixture.
function dress(world, lot, full) {
  const types = full ? ['well', 'temple', 'bazaar', 'booth', 'statue', 'statue', 'statue', 'statue'] : ['well', 'temple', 'bazaar'];
  for (const type of types) placeAround(world, type, lot);
  assignLabour(world);
  for (const b of allBuildings(world)) if (b.type === 'bazaar') { b.store.grain = Math.max(b.store.grain || 0, 300); b.store.pottery = Math.max(b.store.pottery || 0, 100); }
}

export async function largePlotScene(api, options = {}) {
  const o = { view: 'lot', seed: 11, size: 64, ...options };
  if (o.view === 'locked') return lockedView(api, o);
  const world = sampleCity(api, 'v60-largeplot', o);
  noteLargePlotUnlock(world);
  const g = api.game();
  if (o.motion) g.ui.settings.set({ motion: o.motion });
  const anchor = anchorOf(world);
  const at = { x: anchor.x + anchor.w / 2, y: anchor.y + anchor.d / 2 };
  let said = '';
  if (o.view === 'card') {
    look(api, at.x, at.y, o.zoom || 1.1);
    g.ui.store.set(pickCategory(g.ui.store.get(), 'homes'));
    said = `card shown ${largePlotUnlocked(world)}, ${world.newItems.includes(LARGE_PLOT.type) ? 'New' : 'not new'}`;
  } else if (o.view === 'route') {
    said = routeView(g, world, o);
  } else if (o.view === 'farm') {
    said = farmView(g, world, o);
  } else {
    const lot = layLot(world, anchor);
    if (!lot) throw new Error('devScene v60-largeplot: no free spot for a Large plot near the homes');
    dress(world, lot, o.view === 'ready' || o.view === 'progress');   // the lot: water, food, a temple and pottery met, a booth and the street still to come; ready and progress: all of it
    if (o.view === 'progress') { const second = layLot(world, anchor, [[lot.x, lot.y]]); if (second) dress(world, second, false); }   // a second lot, waiting on its booth and street
    if (o.view === 'ready') { world.mood = Math.max(world.mood, 70); for (let i = 0; i < 12 && lot.tier === 0; i++) arrivalsBatch(world); }
    assignLabour(world);
    look(api, lot.x + lot.w / 2, lot.y + lot.d / 2, o.zoom || 1.25);
    if (o.view === 'progress') g.ui.store.set({ overlay: 'progress' });
    else g.ui.store.set(select(g.ui.store.get(), lot.id));
    said = `lot ${lot.id} at ${lot.x},${lot.y}, tier ${lot.tier}, ${isLot(lot) ? `${lotReady(world, lot) ? 'ready' : 'waiting'}` : `${lot.residents} people`}`;
  }
  if (!o.quick) await wait(300);
  g.ui.refresh();
  return `v60-largeplot: ${o.view}: ${said}`;
}

// A route across the river: the road tool in Route mode with its two ends picked either side of the nearest crossing, so the preview shows the bridge tiles.
function routeView(g, world, o) {
  // The first pair of ends either side of the river, on free ground, that routeRoad can join with a bridge: rows near the middle first, the ends 3 to 7 tiles back from the water.
  const at = (x, y) => idx(world.size, x, y);
  const free = (x, y) => x >= 1 && y >= 1 && x <= world.size - 2 && y <= world.size - 2 && world.terrain[at(x, y)] !== T.WATER && !world.occ[at(x, y)] && !world.road[at(x, y)];
  const rows = [...Array(world.size - 4).keys()].map((k) => k + 2).sort((p, q) => Math.abs(p - world.focus.y) - Math.abs(q - world.focus.y) || p - q);
  for (const y of rows) {
    for (let x = 2; x < world.size - 3; x++) {
      if (world.terrain[at(x, y)] !== T.WATER || world.terrain[at(x - 1, y)] === T.WATER) continue;   // the first tile of a run of water in this row
      let e = x;
      while (e + 1 < world.size && world.terrain[at(e + 1, y)] === T.WATER) e++;
      if (e - x + 1 > BRIDGE_MAX) { x = e; continue; }
      for (const back of [7, 6, 5, 4, 3]) {
        const a = [x - back, y], b = [e + back, y];
        if (!free(a[0], a[1]) || !free(b[0], b[1])) continue;
        const r = routeRoad(world, a[0], a[1], b[0], b[1]);
        if (!r.ok || !r.bridges.length) continue;
        look({ game: () => g }, (x + e) / 2 + 0.5, y + 0.5, o.zoom || 1.4);
        g.ui.placement.start({ kind: 'road' });
        g.ui.placement.setRoute(true);
        g.ui.placement.pointAt(a[0], a[1]);
        g.ui.placement.pointAt(b[0], b[1]);
        return `route ${a} to ${b}: ${r.tiles.length} tiles, ${r.bridges.length} bridge tiles, ${r.cost} gold`;
      }
      x = e;
    }
  }
  throw new Error('devScene v60-largeplot: no river to cross with a bridge on this map');
}

// A farm area over fertile ground that is 5 tiles wide and 2 deep (two 2x2 farms and a column left over), with one water tile among them.
function farmView(g, world, o) {
  let spot = null;
  for (let y = 2; y < world.size - 4 && !spot; y++) {
    for (let x = 1; x < world.size - 6 && !spot; x++) {
      let all = true;
      for (let j = 0; j < 2 && all; j++) for (let i = 0; i < 5 && all; i++) all = world.terrain[idx(world.size, x + i, y + j)] === T.FERTILE && !world.occ[idx(world.size, x + i, y + j)] && !world.road[idx(world.size, x + i, y + j)];
      if (all) spot = { x, y };
    }
  }
  if (!spot) throw new Error('devScene v60-largeplot: no fertile ground free for a farm area');
  look({ game: () => g }, spot.x + 2.5, spot.y + 1, o.zoom || 1.6);
  g.ui.placement.startArea('farm_grain');
  g.ui.store.set({ area: { x0: spot.x, y0: spot.y, x1: spot.x + 4, y1: spot.y + 1 } });
  return `farm area at ${spot.x},${spot.y}: ${g.ui.placement.preview().text}`;
}

// A young city with the Layers picker open: a village with one plot, so Home progress is offered and Goods supply and Workers are greyed with the rank.
async function lockedView(api, o) {
  const g0 = api.game();
  if (!g0) throw new Error('devScene v60-largeplot: no city is open (use ?skipTitle=1&nosw=1&seed=11&sample=1)');
  const world = createWorld({ seed: o.seed, size: o.size, mapVariant: 'classic' });   // not api.freshWorld: with ?sample=1 that builds the sample city, and this one is a village
  setCityId(world, 'dev-largeplot');
  setGuide(world, false);
  paintHouses(world, world.focus.x - 1, world.focus.y, world.focus.x + 1, world.focus.y);
  api.startGame(world, { saveNow: false });
  const g = api.game();
  if (o.motion) g.ui.settings.set({ motion: o.motion });
  g.ui.cameraControl.cancel();
  g.cam.zoom = o.zoom || 1.1;
  g.ui.cameraControl.jumpTo(world.focus.x, world.focus.y);
  g.ui.store.set({ layersOpen: true });
  if (!o.quick) await wait(300);
  g.ui.refresh();
  return `v60-largeplot: locked: ${allBuildings(world).length} buildings, milestone ${world.milestone}, picker open`;
}
