// Task 4c (Stage 4.5): newcomers on the road. When families move into a home, a few figures with bundles on their heads walk in
// from the city's entry (the trade road's mouth at the map edge, world.tradeEntry) along the roads to the home's door and
// vanish there; when a month's leavers go, a few walk out the other way. Render-side only: the sim says how many arrived (a home's
// residents rose on an arrival day), never who walks, so nothing here is saved or read by the sim. The figures are a
// function of what the frames saw, kept per world outside it, and move on game time like the other walkers (they hold still
// while paused). Under Still nothing shows; Gentle and Full both walk. At most NEWCOMER_CAP walk at once.
import { MOOD } from '../data/mood.js';
import { DAYS_PER_MONTH } from '../sim/time.js';
import { housesOf } from '../sim/world.js';
import { roadReach, adjacentRoadTiles } from '../sim/reach.js';
import { idx, inBounds, NEIGHBOURS4 } from '../sim/grid.js';
import { passable } from '../sim/terrain.js';
import { ambientState } from './ambient.js';
import { pathBack, TILES_PER_DAY } from './walkers.js';

export const NEWCOMER_CAP = 12;            // figures walking at once, in all
export const NEWCOMER_GROUP = 3;           // at most this many figures for one home's arrivals
export const NEWCOMER_SPACING = 0.8;       // tiles between one figure and the next in a group
export const NEWCOMER_ID_BASE = 1200000;   // walker ids: base + a counter (units 100000, processions 200000+, streamers 900000+)
export const NEWCOMER_MAX_STEP_DAYS = 6;   // a frame that saw more days than this (a load, a long stall) shows no arrivals
export const NEWCOMER_VIEW_MARGIN = 6;     // tiles outside the view a home may be and still show its arrivals
const ARRIVAL_EVERY = DAYS_PER_MONTH / MOOD.arrivalBatchesPerMonth;

const states = new WeakMap();   // world -> { day, nextId, res: Map(home id -> { r: residents, w: footprint width }), figs: [], seq }
const trees = new WeakMap();    // world -> the one breadth-first walk from the entry along the roads, kept until the roads change

const crossed = (every, from, to) => Math.floor(to / every) > Math.floor(from / every);

// The breadth-first walk from the entry road tile: tile -> { d: steps from the entry, p: the tile before it }. One per road change.
function entryTree(world) {
  const e = world.tradeEntry, tile = inBounds(world.size, e.x, e.y) ? idx(world.size, e.x, e.y) : -1;
  const c = trees.get(world);
  if (c && c.version === world.roadVersion && c.tile === tile) return c.map;
  const map = new Map();
  if (tile >= 0 && world.road[tile]) {
    map.set(tile, { d: 0, p: -1 });
    const queue = [tile];
    for (let qi = 0; qi < queue.length; qi++) {
      const t = queue[qi], x = t % world.size, y = (t - x) / world.size;
      for (const [dx, dy] of NEIGHBOURS4) {
        if (!inBounds(world.size, x + dx, y + dy)) continue;
        const nt = idx(world.size, x + dx, y + dy);
        // Stage 4.7: the shared passable rule (src/sim/terrain.js; a road tile is always passable today).
        if (world.road[nt] && passable(world, nt) && !map.has(nt)) { map.set(nt, { d: map.get(t).d + 1, p: t }); queue.push(nt); }
      }
    }
  }
  trees.set(world, { version: world.roadVersion, tile, map });
  return map;
}

// The road path from the entry to a home's door as points in tile coordinates, or null when the roads do not join them. The walk
// starts at the entry road tile, read off the cached walk from it; when the entry tile is not a road joined to the home, it starts
// at the joined road tile nearest the entry instead (the rare case, found with a walk from the home).
export function entryPath(world, h) {
  const tree = entryTree(world);
  let door = -1, tiles;
  for (const t of adjacentRoadTiles(world, h)) {
    if (!tree.has(t)) continue;
    if (door < 0 || tree.get(t).d < tree.get(door).d || (tree.get(t).d === tree.get(door).d && t < door)) door = t;
  }
  if (door >= 0) {
    tiles = [];
    for (let t = door; t >= 0; t = tree.get(t).p) tiles.push(t);
    tiles.reverse();
  } else {
    const reach = roadReach(world, h, world.size * world.size, { cache: false });
    if (!reach.size) return null;
    const ex = world.tradeEntry.x, ey = world.tradeEntry.y;
    let from = -1, best = Infinity;
    for (const t of reach.keys()) {
      const x = t % world.size, y = (t - x) / world.size;
      const d = Math.abs(x - ex) + Math.abs(y - ey);
      if (d < best || (d === best && t < from)) { best = d; from = t; }
    }
    tiles = pathBack(world, reach, from).reverse();   // pathBack runs from the tile beside the home out to `from`
  }
  const pts = tiles.map((t) => ({ x: (t % world.size) + 0.5, y: Math.floor(t / world.size) + 0.5 }));
  const last = pts[pts.length - 1];
  // the door: the nearest point of the home's footprint to the last road tile
  pts.push({ x: Math.min(Math.max(last.x, h.x), h.x + h.w), y: Math.min(Math.max(last.y, h.y), h.y + h.d) });
  return pts;
}

function lengthOf(pts) {
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y));
  return cum;
}

function pointAt(f, s) {
  const { pts, cum } = f;
  let i = 1;
  while (i < pts.length - 1 && cum[i] < s) i++;
  const a = pts[i - 1], b = pts[i], span = cum[i] - cum[i - 1] || 1;
  const k = Math.min(1, Math.max(0, (s - cum[i - 1]) / span));
  const dir = Math.abs(b.x - a.x) >= Math.abs(b.y - a.y) ? (b.x > a.x ? 1 : 3) : (b.y > a.y ? 2 : 0);
  return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k, dir };
}

const inView = (h, range) => !range || (h.x + h.w - 1 + NEWCOMER_VIEW_MARGIN >= range.x0 && h.x - NEWCOMER_VIEW_MARGIN <= range.x1 &&
  h.y + h.d - 1 + NEWCOMER_VIEW_MARGIN >= range.y0 && h.y - NEWCOMER_VIEW_MARGIN <= range.y1);

function spawn(world, st, h, n, timeDays, leaving) {
  const room = NEWCOMER_CAP - st.figs.length;
  const k = Math.min(n, NEWCOMER_GROUP, room);
  if (k <= 0) return;
  let pts = entryPath(world, h);
  if (!pts || pts.length < 2) return;                         // no road path: nothing walks
  if (leaving) pts = pts.slice().reverse();
  const cum = lengthOf(pts);
  for (let i = 0; i < k; i++) st.figs.push({ id: NEWCOMER_ID_BASE + (st.seq++ % 100000), pts, cum, born: timeDays, lag: i * NEWCOMER_SPACING });
}

// The newcomers in view at timeDays, as walkers ({ id, kind: 'newcomer', x, y, dir }). Call it every frame: it is what notices a
// home's residents rising on an arrival day (or falling on a month's day). `level` is the Motion level (full, gentle or still).
export function newcomersAt(world, timeDays, range = null, level = ambientState(world).level) {
  let st = states.get(world);
  if (!st) { st = { day: world.day, nextId: world.nextId, res: new Map(), figs: [], seq: 0 }; states.set(world, st); for (const h of housesOf(world)) st.res.set(h.id, { r: h.residents, w: h.w }); }
  const shows = level === 'full' || level === 'gentle';
  const step = world.day - st.day;
  if (shows && step > 0 && step <= NEWCOMER_MAX_STEP_DAYS) {
    const arrival = crossed(ARRIVAL_EVERY, st.day, world.day), month = crossed(DAYS_PER_MONTH, st.day, world.day);
    if (arrival || month) {
      for (const h of housesOf(world)) {
        const before = st.res.get(h.id);
        if (before === undefined || h.w !== before.w || !inView(h, range)) continue;   // a merge or split changes the footprint: not arrivals or leavers
        if (arrival && h.residents > before.r) spawn(world, st, h, h.residents - before.r, timeDays, false);
        else if (month && h.residents < before.r) spawn(world, st, h, before.r - h.residents, timeDays, true);
      }
    }
  }
  if (world.day !== st.day || world.nextId !== st.nextId) {   // the snapshot only changes when a day passes or a building is added
    st.day = world.day;
    st.nextId = world.nextId;
    st.res.clear();
    for (const h of housesOf(world)) st.res.set(h.id, { r: h.residents, w: h.w });
  }
  if (!shows) { st.figs.length = 0; return []; }
  const out = [];
  st.figs = st.figs.filter((f) => {
    const s = (timeDays - f.born) * TILES_PER_DAY - f.lag;
    if (s > f.cum[f.cum.length - 1] || timeDays < f.born - 1) return false;   // arrived at the door, or time ran backwards (a load)
    if (s < 0) return true;                                                   // not set out yet
    const q = pointAt(f, s);
    if (!range || (q.x >= range.x0 - 1 && q.x <= range.x1 + 2 && q.y >= range.y0 - 1 && q.y <= range.y1 + 2)) out.push({ id: f.id, kind: 'newcomer', x: q.x, y: q.y, dir: q.dir });
    return true;
  });
  return out;
}

