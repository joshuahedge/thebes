// Stage 4.6, the River track's dev scenes (open /?skipTitle=1&nosw=1&seed=11&sample=1 first; the sample city is a Capital in year 2):
//   s46-flood        the flood season over the floodplain: the water up on the loam beside the farms, with the caption that says the level and what
//                    the farms grow (options.level 'low' | 'fair' | 'good' | 'high', default 'good'; options.phase 'rising' | 'high' | 'draining')
//   s46-wildlife     herds of gazelle and ostriches on the desert beside the river, ibis and herons on the bank, a hippo in the water, a crocodile
//                    on its spot
//   s46-hunting      a hunting lodge at work: its hunters walking out to a herd, game hung on its rack (options.sheet: true opens the lodge's sheet)
//   s46-wharf        a fishing wharf at work: the boat on the water off its pier, with the sheet (options.sheet: true)
//   s46-nilometer    a Nilometer on the bank, the forecast just read, and its caption in the guidance row (options.sheet: true opens its sheet instead)
//   s46-farm-flood   a farm sheet on the floodplain: the Floodplain row with this year's flood
// Motion is left as the caller set it (tests/screenshot.ps1 callers set it before the scene). The scenes set the world's day and flood record
// directly (no ticking) so the shot is the same every time.
import { inGame, wait } from './base.js';
import { place, canPlace } from '../../sim/commands.js';
import { allBuildings, makeBuilding, insertBuilding } from '../../sim/world.js';
import { atLeast } from '../../sim/progression.js';
import { seasonDays, isFloodFarm, onFloodplain } from '../../sim/flood.js';
import { crocSpots, herdArrives, herdsInReach } from '../../sim/wildlife.js';
import { wharfSide } from '../../render/art/river.js';
import { FLOOD_LEVEL_IDS, floodLevelRow } from '../../data/river.js';
import { T, buildable } from '../../sim/terrain.js';
import { idx, inBounds } from '../../sim/grid.js';
import { screenToTile } from '../../render/camera.js';
import { freeTop } from '../../ui/layout.js';
import { select } from '../../ui/modes.js';
import { S46_RIVER_TEXT as R } from '../../ui/text.js';

// The camera on a map point, in the middle of the map's free area (as the Stage 3 scenes' focus).
function focus(g, x, y, kind = 'browse') {
  const c0 = g.ui.cameraControl.centre(), v = { width: c0.x * 2, height: c0.y * 2 };
  const map = document.querySelector('#map');
  const layout = g.ui.store.get().layout, top = freeTop(map && map.parentElement, map, layout);
  const i = layout === 'portrait'
    ? { top, left: 0, right: 0, bottom: kind === 'sheet' ? v.height * 0.6 : v.height * 0.2 }
    : { top, left: 0, bottom: 0, right: layout === 'compact' ? 56 + 268 : 320 };
  const midX = i.left + (v.width - i.left - i.right) / 2, midY = i.top + (v.height - i.top - i.bottom) / 2;
  const c = screenToTile({ x, y, zoom: g.cam.zoom }, v, v.width - midX, v.height - midY);
  g.ui.cameraControl.cancel();
  g.ui.cameraControl.jumpTo(c.x, c.y);
}
const zoomFor = (g, portrait, wide) => { g.cam.zoom = g.ui.store.get().layout === 'portrait' ? portrait : wide; };

// The river's flood record for a scene: the year's level known and the water up (or not yet), and the world's day inside it.
function setFlood(world, { year = 2, level = 'good', day = null, risen = true, applied = level } = {}) {
  const s = seasonDays(year);
  world.flood = { year, level, forecast: level, from: s.from, to: s.to, applied: risen ? level : applied, risen };
  if (day !== null) world.day = day;
}
const ensureTown = (world) => { if (!atLeast(world, 'town')) world.milestone = 'town'; };
const nearest = (list, p, at) => list.slice().sort((a, b) => Math.hypot(at(a).x - p.x, at(a).y - p.y) - Math.hypot(at(b).x - p.x, at(b).y - p.y))[0] || null;

// The floodplain farm nearest `at` (the city's focus), else null.
function floodFarm(world, at = world.focus) {
  const farms = allBuildings(world).filter((b) => isFloodFarm(b.type) && onFloodplain(world, b));
  return nearest(farms, at, (b) => ({ x: b.x, y: b.y }));
}
// The middle of the widest stretch of open floodplain (no building, no road) within 7 tiles, the nearer the city's focus on a tie: where the water
// has room to read. { x, y, n } tiles.
function floodCentre(world) {
  let best = null;
  for (let y = 2; y < world.size - 2; y += 2) {
    for (let x = 2; x < world.size - 2; x += 2) {
      if (!world.floodplain[idx(world.size, x, y)]) continue;
      let n = 0;
      for (let dy = -7; dy <= 7; dy++) for (let dx = -7; dx <= 7; dx++) {
        if (!inBounds(world.size, x + dx, y + dy)) continue;
        const i = idx(world.size, x + dx, y + dy);
        if (world.floodplain[i] && !world.occ[i] && !world.road[i]) n++;
      }
      const d = Math.hypot(x - world.focus.x, y - world.focus.y);
      if (!best || n > best.n + 6 || (n >= best.n - 6 && d < best.d)) best = { x, y, n, d };
    }
  }
  return best || { x: world.focus.x, y: world.focus.y, n: 0, d: 0 };
}
// Up to n grain farms on the floodplain nearest `at` where the commands allow one (a road to come counts), spread 3 tiles apart, placed as the
// dev scenes do (the sample city's own farms stand off the loam by the river). Returns the farms.
function addFloodFarms(world, at, n = 3) {
  const found = [];
  for (let dy = -9; dy <= 9; dy++) {
    for (let dx = -9; dx <= 9; dx++) {
      const x = Math.round(at.x) + dx, y = Math.round(at.y) + dy;
      if (!inBounds(world.size, x + 1, y + 1) || !onFloodplain(world, { x, y, w: 2, d: 2 }) || !canPlace(world, 'farm_grain', x, y, { roadLater: true }).ok) continue;
      found.push({ x, y, d: Math.hypot(dx, dy) });
    }
  }
  found.sort((a, b) => a.d - b.d);
  const out = [];
  for (const f of found) {
    if (out.length >= n) break;
    if (out.some((o) => Math.abs(o.x - f.x) < 4 && Math.abs(o.y - f.y) < 4)) continue;
    const b = insertBuilding(world, makeBuilding(world, 'farm_grain', f.x, f.y));
    b.staff = 10;
    out.push(b);
    for (const j of [0, 1]) {                                   // a road tile beside each (so no problem marker hangs over the farm in the shot)
      const i = idx(world.size, b.x + 2, b.y + j);
      if (inBounds(world.size, b.x + 2, b.y + j) && buildable(world, i) && !world.occ[i]) world.road[i] = 1;
    }
  }
  world.roadVersion += 1;
  return out;
}

async function flood(api, options = {}) {
  const g = inGame(api, 's46-flood'), { world } = g;
  ensureTown(world);
  const level = FLOOD_LEVEL_IDS.includes(options.level) ? options.level : 'good';
  const s = seasonDays(2);
  const day = { rising: s.from + 12, draining: s.to + 12 }[options.phase] || s.from + 45;
  setFlood(world, { level, day });
  world.speed = 0;
  g.ui.refresh();
  const centre = floodCentre(world);
  addFloodFarms(world, centre, 3);
  const farm = floodFarm(world, centre);
  const at = { x: centre.x + 0.5, y: centre.y + 0.5 };
  zoomFor(g, 1.15, 1.3);
  focus(g, at.x, at.y);
  g.ui.celebrations.clear();
  g.ui.celebrations.show({ tier: 'info', text: R.riseCaption(level) });
  await wait(300);
  return `flood ${level} day ${world.day} farms ${allBuildings(world).filter((b) => isFloodFarm(b.type) && onFloodplain(world, b)).length} on the floodplain, ${centre.n} open floodplain tiles, view at ${at.x},${at.y}`;
}

// A free dry tile of the ground herds like (desert), at most `r` tiles from (x, y), nearest first.
function freeDesert(world, x, y, r, skip = []) {
  const out = [];
  for (let dy = -r; dy <= r; dy++) {
    for (let dx = -r; dx <= r; dx++) {
      const tx = x + dx, ty = y + dy;
      if (!inBounds(world.size, tx, ty)) continue;
      const i = idx(world.size, tx, ty);
      if (world.terrain[i] !== T.DESERT || world.occ[i] || world.road[i] || skip.some((s) => Math.hypot(s.x - tx, s.y - ty) < 3)) continue;
      out.push({ x: tx, y: ty, d: Math.hypot(dx, dy) });
    }
  }
  return out.sort((a, b) => a.d - b.d);
}
const moveHerd = (h, x, y) => { Object.assign(h, { x, y, hx: x, hy: y, px: x, py: y }); };

async function wildlife(api) {
  const g = inGame(api, 's46-wildlife'), { world } = g;
  ensureTown(world);
  setFlood(world, { risen: false });                      // the river at its ordinary level: the animals are the picture
  world.speed = 0;
  // The crocodile spot with the most open desert near it, far from buildings: the animals' picture needs room.
  const room = (sx, sy) => freeDesert(world, sx, sy, 9).filter((t) => allBuildings(world).every((o) => Math.hypot(o.x - t.x, o.y - t.y) > 5)).length;
  const ranked = crocSpots(world).map(([x, y]) => ({ x, y, n: room(x, y) })).sort((p, q) => q.n - p.n || Math.hypot(p.x - world.focus.x, p.y - world.focus.y) - Math.hypot(q.x - world.focus.x, q.y - world.focus.y));
  const spot = ranked[0] || { x: world.focus.x, y: world.focus.y, n: 0 };
  const used = [];
  const herds = world.wildlife.herds.slice(0, 2);
  while (herds.length < 2) { const h = herdArrives(world, []); if (!h) break; herds.push(world.wildlife.herds.find((x) => x.id === h.id)); }
  herds.forEach((h, k) => {
    const kind = k === 0 ? 'gazelle' : 'ostrich';
    const sites = freeDesert(world, spot.x, spot.y, 9, used).filter((t) => allBuildings(world).every((o) => Math.hypot(o.x - t.x, o.y - t.y) > 5));
    const s = sites[Math.min(sites.length - 1, 4 + k * 4)] || { x: spot.x + 4, y: spot.y };
    Object.assign(h, { kind, size: 7, max: 7 });
    moveHerd(h, s.x, s.y);
    used.push(s);
  });
  g.ui.refresh();
  g.ui.celebrations.clear();
  zoomFor(g, 1.5, 1.7);
  const mid = { x: (spot.x + (used[0] ? used[0].x : spot.x)) / 2, y: (spot.y + (used[0] ? used[0].y : spot.y)) / 2 };
  focus(g, mid.x, mid.y);
  await wait(300);
  return `wildlife ${world.wildlife.herds.map((h) => `${h.kind}@${h.x},${h.y}`).join(' ')} herds, croc spot ${spot.x},${spot.y}, view at ${Math.round(mid.x)},${Math.round(mid.y)}`;
}

// A spot for a building the commands accept near (x, y), nearest first; with none beside a road, the nearest where a road could come.
function spotFor(world, type, near, rots = [0]) {
  const c = [];
  for (let dy = -34; dy <= 34; dy++) {
    for (let dx = -34; dx <= 34; dx++) {
      const x = Math.round(near.x) + dx, y = Math.round(near.y) + dy;
      for (const rot of rots) {
        const p = canPlace(world, type, x, y, { rot });
        if (p.ok) c.push({ x, y, rot, d: Math.hypot(dx, dy), road: true });
      }
    }
  }
  if (c.length) return c.sort((a, b) => a.d - b.d)[0];
  for (let dy = -34; dy <= 34; dy++) {
    for (let dx = -34; dx <= 34; dx++) {
      const x = Math.round(near.x) + dx, y = Math.round(near.y) + dy;
      for (const rot of rots) if (canPlace(world, type, x, y, { rot, roadLater: true }).ok) c.push({ x, y, rot, d: Math.hypot(dx, dy), road: false });
    }
  }
  return c.sort((a, b) => a.d - b.d)[0] || null;
}
// Places a building where the commands allow it, or puts it there as the dev scenes do, staffed to its workers.
function placeAt(world, type, spot) {
  if (spot.road) { const r = place(world, type, spot.x, spot.y, { rot: spot.rot }); if (r.ok) return world.buildings[r.id]; }
  return insertBuilding(world, makeBuilding(world, type, spot.x, spot.y, spot.rot));
}

async function hunting(api, options = {}) {
  const g = inGame(api, 's46-hunting'), { world } = g;
  ensureTown(world);
  world.gold = Math.max(world.gold, 5000);
  setFlood(world, { risen: false });
  world.speed = 0;
  // A lodge on the desert's edge by a road, and a herd within its reach: the nearest herd moves to a free desert tile 6 tiles away.
  const spot = spotFor(world, 'hunting_lodge', { x: world.focus.x + 6, y: world.focus.y - 18 });
  if (!spot) throw new Error('devScene s46-hunting: no spot for a lodge');
  const lodge = placeAt(world, 'hunting_lodge', spot);
  lodge.staff = 3; lodge.blocked = null; lodge.paused = false;
  if (!world.wildlife.herds.length) herdArrives(world, []);
  const herd = nearest(world.wildlife.herds, lodge, (h) => h);
  const sites = freeDesert(world, lodge.x + 1, lodge.y + 1, 9).filter((s) => s.d >= 5);
  const s = sites[0] || { x: lodge.x + 6, y: lodge.y };
  Object.assign(herd, { kind: 'gazelle', size: 7, max: 7 });
  moveHerd(herd, s.x, s.y);
  const second = world.wildlife.herds.find((h) => h !== herd);
  if (second) { const s2 = freeDesert(world, s.x, s.y, 6, [s]).find((q) => q.d >= 3); if (s2) { second.kind = 'ostrich'; moveHerd(second, s2.x, s2.y); } }
  g.ui.refresh();
  g.ui.celebrations.clear();
  zoomFor(g, 1.4, 1.7);
  focus(g, (lodge.x + 1 + s.x) / 2, (lodge.y + 1 + s.y) / 2, options.sheet ? 'sheet' : 'browse');
  if (options.sheet) g.ui.store.set(select(g.ui.store.get(), lodge.id));
  await wait(300);
  return `hunting lodge ${lodge.x},${lodge.y} herds in reach ${herdsInReach(world, lodge).length} herd at ${s.x},${s.y}`;
}

async function wharf(api, options = {}) {
  const g = inGame(api, 's46-wharf'), { world } = g;
  ensureTown(world);
  world.gold = Math.max(world.gold, 5000);
  setFlood(world, { level: 'good', day: seasonDays(2).from + 45 });
  world.speed = 0;
  const spot = spotFor(world, 'fishing_wharf', world.focus, [0, 1]);
  if (!spot) throw new Error('devScene s46-wharf: no spot for a wharf');
  const b = placeAt(world, 'fishing_wharf', spot);
  b.staff = 3; b.blocked = null; b.paused = false;
  for (const [dx, dy] of [[-1, 0], [b.w, 0], [0, -1], [0, b.d]]) {   // a road tile on a dry side, so no problem marker hangs over the shot
    const x = b.x + dx, y = b.y + dy;
    if (inBounds(world.size, x, y) && buildable(world, idx(world.size, x, y)) && !world.occ[idx(world.size, x, y)]) { world.road[idx(world.size, x, y)] = 1; world.roadVersion += 1; break; }
  }
  g.ui.refresh();
  zoomFor(g, 1.9, 2);
  focus(g, b.x + b.w / 2, b.y + b.d / 2, options.sheet ? 'sheet' : 'browse');
  if (options.sheet) g.ui.store.set(select(g.ui.store.get(), b.id));
  g.ui.celebrations.clear();
  await wait(300);
  return `fishing wharf ${b.x},${b.y} ${b.w}x${b.d} water ${wharfSide(world, b)}`;
}

async function nilometer(api, options = {}) {
  const g = inGame(api, 's46-nilometer'), { world } = g;
  ensureTown(world);
  world.gold = Math.max(world.gold, 5000);
  const level = FLOOD_LEVEL_IDS.includes(options.level) ? options.level : 'low';
  const s3 = seasonDays(3);
  setFlood(world, { year: 3, level, day: s3.from - 70, risen: false, applied: 'good' });   // month 5 of year 3: two months before the water
  world.flood.applied = 'good';
  world.speed = 0;
  const spot = spotFor(world, 'nilometer', world.focus);
  if (!spot) throw new Error('devScene s46-nilometer: no spot for a nilometer');
  const b = placeAt(world, 'nilometer', spot);
  b.staff = 2; b.paused = false;
  for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
    const x = b.x + dx, y = b.y + dy;
    if (inBounds(world.size, x, y) && buildable(world, idx(world.size, x, y)) && !world.occ[idx(world.size, x, y)]) { world.road[idx(world.size, x, y)] = 1; world.roadVersion += 1; break; }
  }
  g.ui.refresh();
  zoomFor(g, 2, 2);
  focus(g, b.x + 0.5, b.y + 0.5, options.sheet ? 'sheet' : 'browse');
  if (options.sheet) g.ui.store.set(select(g.ui.store.get(), b.id));
  else { g.ui.celebrations.clear(); g.ui.celebrations.show({ tier: 'info', text: R.forecastCaption(level) }); }
  await wait(300);
  return `nilometer ${b.x},${b.y} forecast ${level} ${floodLevelRow(level).harvest}`;
}

async function farmFlood(api, options = {}) {
  const g = inGame(api, 's46-farm-flood'), { world } = g;
  ensureTown(world);
  setFlood(world, { level: FLOOD_LEVEL_IDS.includes(options.level) ? options.level : 'good', day: seasonDays(2).from + 45 });
  world.speed = 0;
  const centre = floodCentre(world);
  addFloodFarms(world, centre, 2);
  const farm = floodFarm(world, centre);
  if (!farm) throw new Error('devScene s46-farm-flood: no farm on the floodplain');
  g.ui.refresh();
  g.ui.celebrations.clear();
  zoomFor(g, 1.4, 1.4);
  focus(g, farm.x + 1, farm.y + 1, 'sheet');
  g.ui.store.set(select(g.ui.store.get(), farm.id));
  await wait(300);
  return `farm sheet ${farm.type} at ${farm.x},${farm.y} on the floodplain`;
}

export const RIVER_SCENES = {
  's46-flood': flood,
  's46-wildlife': wildlife,
  's46-hunting': hunting,
  's46-wharf': wharf,
  's46-nilometer': nilometer,
  's46-farm-flood': farmFlood,
};
