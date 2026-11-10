// Version 9.0, Track V (V3, ruling 1603): a building goes up. A building the player places stands behind scaffold poles for SCAFFOLD.placedDays game
// day, with a dust puff at its foot as the work starts; a home's upgrade shows the poles for SCAFFOLD.upgradeDays. Drawing only: the building is built
// and working from the tap, as before (the sprite still rises over effects.js's 900 ms). The poles stand at the footprint's three front corners, nine
// tenths as tall as the building's art (at least 8 art px and at most SCAFFOLD.maxHeight, 48, which only the very tallest art reaches), tied by two ledgers and a brace in
// the palette's wood; they fade out over the last fifth of their time. At most SCAFFOLD.cap sites at once (the newest). The renderer draws each in its
// building's depth slot, right after the building (ruling 1612), so a nearer building covers its poles. The interface notes a placing through
// effects.rise (noteBuilt, with the world the effects last drew) and an upgrade through effects.fromEvents (noteUpgrade); both are kept per world
// (ruling 1614). The times are game days, from the frame's game time (src/render/v90/clock.js), so a paused game holds the poles up.
import { p, U } from '../iso.js';
import { ART, slotFor } from '../art/registry.js';
import { BUILDINGS } from '../../data/buildings.js';
import { frameTimeOf } from './clock.js';
import { lookOfBuilding } from '../looks.js';

export const SCAFFOLD = { placedDays: 1, upgradeDays: 0.5, cap: 8, share: 0.9, minHeight: 8, maxHeight: 48, puffDays: 0.2, fadeShare: 0.2, pole: '#8A6A44', dust: '#D8C4A0' };

const sites = new WeakMap();                 // world -> Map(building id -> { at (game days), days })

const siteMap = (world) => { let m = sites.get(world); if (!m) { m = new Map(); sites.set(world, m); } return m; };
// Monuments raise their own courses (render/monuments.js), and rubble is not built: neither gets poles.
const scaffolded = (b) => Boolean(b) && b.type !== 'rubble' && !(BUILDINGS[b.type] && BUILDINGS[b.type].monument);

// Building `id` was just placed in `world` (effects.rise, on the tap): from the frame's game time. No world (no frame drawn yet), no poles.
export function noteBuilt(world, id) {
  if (!world || !scaffolded(world.buildings[id])) return;
  siteMap(world).set(id, { at: frameTimeOf(world), days: SCAFFOLD.placedDays });
}
// Building b's home went up a tier (effects.fromEvents, the sim's upgrade event).
export function noteUpgrade(world, b) {
  if (!world || !scaffolded(b)) return;
  siteMap(world).set(b.id, { at: world.day, days: SCAFFOLD.upgradeDays });
}

// Version 9.3 (Track M, ruling 1930): a building whose look changed (looks.js lookOfBuilding rose) stands behind poles for LOOK_SCAFFOLD_DAYS. Only a
// building drawn this frame is watched (watchLooks, from the renderer's visible objects), and only one watched within the last game day counts: a building
// off-screen when its front passed shows none when it is scrolled to later. A first sight of a building notes its look and shows nothing (a load).
export const LOOK_SCAFFOLD_DAYS = 1;
const watched = new WeakMap();               // world -> Map(building id -> { look, seen (game days) })
export function watchLooks(world, objects) {
  if (!world || !objects || !objects.length) return;
  let w = watched.get(world);
  if (!w) { w = new Map(); watched.set(world, w); }
  const now = frameTimeOf(world);
  for (const o of objects) {
    if (o.id >= 1e6) continue;                  // 9.3 speed fix: trees and walkers (ids from 1e6, renderer DECOR_ID_BASE) are no buildings
    const b = world.buildings[o.id];
    if (!b || !scaffolded(b)) continue;
    const look = lookOfBuilding(world, b), held = w.get(b.id);
    if (held && look > held.look && now - held.seen <= LOOK_SCAFFOLD_DAYS && now >= held.seen) siteMap(world).set(b.id, { at: now, days: LOOK_SCAFFOLD_DAYS, look: true });
    if (held) { held.look = look; held.seen = now; } else w.set(b.id, { look, seen: now });
  }
}

// The scaffolds standing at the frame's time: [{ b, t (0..1 through its time), days }], the newest SCAFFOLD.cap. With the frame's tile `range`, the sites
// on screen go first, so a rank-up that switches a hundred buildings spends the cap on the ones the player can see.
export function scaffoldsAt(world, range = null) {
  const m = sites.get(world);
  if (!m || !m.size) return [];
  const now = frameTimeOf(world), out = [];
  for (const [id, s] of m) {
    const b = world.buildings[id], t = (now - s.at) / s.days;
    if (!b || t >= 1 || t < -0.01) { m.delete(id); continue; }   // gone (an Undo, a demolish), done, or from a later time than this world shows (a load)
    out.push({ b, t: Math.max(0, t), days: s.days, at: s.at, look: Boolean(s.look), on: !range || (b.x + b.w >= range.x0 && b.x <= range.x1 + 1 && b.y + b.d >= range.y0 && b.y <= range.y1 + 1) });
  }
  out.sort((a, c) => Number(c.on) - Number(a.on) || c.at - a.at || c.b.id - a.b.id);
  return out.slice(0, SCAFFOLD.cap);
}

export function resetScaffolds(world) { if (world) { sites.delete(world); watched.delete(world); } }

// The poles' height for a building's art height: nine tenths of it, within [minHeight, maxHeight].
export const poleHeight = (artHeight) => Math.max(SCAFFOLD.minHeight, Math.min(SCAFFOLD.maxHeight, artHeight * SCAFFOLD.share));

// One site's poles, ledgers and brace (and its first puff of dust), in art px with the art origin set.
export function drawScaffold(g, world, s) {
  const { b, t } = s, def = ART[slotFor(b, world)];
  const h = poleHeight(def ? def.height : 12), fade = t > 1 - SCAFFOLD.fadeShare ? (1 - t) / SCAFFOLD.fadeShare : 1;
  const corners = [p(b.x, b.y + b.d), p(b.x + b.w, b.y + b.d), p(b.x + b.w, b.y)];   // left, front and right: the corners the building does not hide
  const segs = [];
  for (const c of corners) segs.push(['M', c], ['L', U(c, h)]);
  for (const k of [0.4, 0.75]) for (let i = 0; i < 2; i++) segs.push(['M', U(corners[i], h * k)], ['L', U(corners[i + 1], h * k)]);
  segs.push(['M', corners[0]], ['L', U(corners[1], h * 0.75)], ['M', corners[2]], ['L', U(corners[1], h * 0.4)]);   // a brace on each face
  g.stroke(segs, SCAFFOLD.pole, 0.7, 0.85 * fade);                         // one stroke a site: the poles, ledgers and braces together
  const puff = (s.t * s.days) / SCAFFOLD.puffDays;
  if (s.days === SCAFFOLD.placedDays && !s.look && puff < 1) {   // a look change raises no dust: the building has stood all along
    for (let i = 0; i < 5; i++) {
      const c = corners[i % 3], u = i / 5;
      g.circ([c[0] + (u - 0.5) * 8 * (0.5 + puff), c[1] - 1 - puff * 6], 2 + puff * 3, SCAFFOLD.dust, { alpha: (1 - puff) * 0.6 });
    }
  }
}
