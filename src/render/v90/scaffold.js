// Version 9.0, Track V (V3, ruling 1603): a building goes up. A building the player places stands behind scaffold poles for SCAFFOLD.placedDays game
// day, with a dust puff at its foot as the work starts; a home's upgrade shows the poles for SCAFFOLD.upgradeDays. Drawing only: the building is built
// and working from the tap, as before (the sprite still rises over effects.js's 900 ms). The poles stand at the footprint's three front corners,
// nine tenths as tall as the building's art (at most SCAFFOLD.maxHeight), tied by two ledgers and a brace, in the palette's wood; they fade out over the last fifth of their time. At most
// SCAFFOLD.cap sites at once (the newest). The interface notes a placing through effects.rise (noteBuilt) and an upgrade through effects.fromEvents
// (noteUpgrade); the times are game days, from the frame's game time (src/render/v90/clock.js), so a paused game holds the poles up.
import { p, U } from '../iso.js';
import { ART, slotFor } from '../art/registry.js';
import { BUILDINGS } from '../../data/buildings.js';
import { frameTimeOf } from './clock.js';

export const SCAFFOLD = { placedDays: 1, upgradeDays: 0.5, cap: 8, maxHeight: 24, puffDays: 0.2, fadeShare: 0.2, pole: '#8A6A44', dust: '#D8C4A0' };

const sites = new WeakMap();                 // world -> Map(building id -> { at (game days), days })
let pending = [];                            // placings noted before a frame with the world has seen them

const siteMap = (world) => { let m = sites.get(world); if (!m) { m = new Map(); sites.set(world, m); } return m; };
// Monuments raise their own courses (render/monuments.js), and rubble is not built: neither gets poles.
const scaffolded = (b) => Boolean(b) && b.type !== 'rubble' && !(BUILDINGS[b.type] && BUILDINGS[b.type].monument);

// Building `id` was just placed (effects.rise, on the tap).
export function noteBuilt(id) { pending.push(id); }
// Building b's home went up a tier (effects.fromEvents, the sim's upgrade event).
export function noteUpgrade(world, b) {
  if (!world || !scaffolded(b)) return;
  siteMap(world).set(b.id, { at: world.day, days: SCAFFOLD.upgradeDays });
}

// The scaffolds standing at the frame's time: [{ b, t (0..1 through its time), days }], the newest SCAFFOLD.cap.
export function scaffoldsAt(world) {
  const m = siteMap(world), now = frameTimeOf(world);
  if (pending.length) {
    for (const id of pending) if (scaffolded(world.buildings[id])) m.set(id, { at: now, days: SCAFFOLD.placedDays });
    pending = [];                            // the frame after a tap draws the city it was made in: nothing waits for another
  }
  const out = [];
  for (const [id, s] of m) {
    const b = world.buildings[id], t = (now - s.at) / s.days;
    if (!b || t >= 1 || t < -0.01) { m.delete(id); continue; }   // gone (an Undo, a demolish), done, or from a later time than this world shows (a load)
    out.push({ b, t: Math.max(0, t), days: s.days, at: s.at });
  }
  out.sort((a, c) => c.at - a.at || c.b.id - a.b.id);
  return out.slice(0, SCAFFOLD.cap);
}

export function resetScaffolds(world) { if (world) sites.delete(world); pending = []; }

// One site's poles, ledgers and brace (and its first puff of dust), in art px with the art origin set.
export function drawScaffold(g, world, s) {
  const { b, t } = s, def = ART[slotFor(b, world)];
  const h = Math.max(8, Math.min(SCAFFOLD.maxHeight, (def ? def.height : 12) * 0.9)), fade = t > 1 - SCAFFOLD.fadeShare ? (1 - t) / SCAFFOLD.fadeShare : 1;
  const corners = [p(b.x, b.y + b.d), p(b.x + b.w, b.y + b.d), p(b.x + b.w, b.y)];   // left, front and right: the corners the building does not hide
  const segs = [];
  for (const c of corners) segs.push(['M', c], ['L', U(c, h)]);
  for (const k of [0.4, 0.75]) for (let i = 0; i < 2; i++) segs.push(['M', U(corners[i], h * k)], ['L', U(corners[i + 1], h * k)]);
  segs.push(['M', corners[0]], ['L', U(corners[1], h * 0.75)], ['M', corners[2]], ['L', U(corners[1], h * 0.4)]);   // a brace on each face
  g.stroke(segs, SCAFFOLD.pole, 0.7, 0.85 * fade);                         // one stroke a site: the poles, ledgers and braces together
  const puff = (s.t * s.days) / SCAFFOLD.puffDays;
  if (s.days === SCAFFOLD.placedDays && puff < 1) {
    for (let i = 0; i < 5; i++) {
      const c = corners[i % 3], u = i / 5;
      g.circ([c[0] + (u - 0.5) * 8 * (0.5 + puff), c[1] - 1 - puff * 6], 2 + puff * 3, SCAFFOLD.dust, { alpha: (1 - puff) * 0.6 });
    }
  }
}
