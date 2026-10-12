// Problem markers pinned to their own buildings (spec 6.3, rulings 280, 281): a badge on a stem rising from a dot on the
// building's roof, a 2 px ring and faint wash on its footprint in the marker's colour, badges laid out so none overlaps
// (the one further back gets a longer stem; more than three in one place merge into a count badge with a ring on each
// footprint). Nothing pulses. Stage 4 contract: Track 0 fixed the names and the createUI wiring; Track B implements
// layoutMarkers and drawMarkers and owns this file; Track C owns what a tap on a marker does (createUI's tap seam and
// View's outline), reading the same layout.
//
// A marker, in the layout: { ids: [building ids, front first], x, y (the badge's centre, CSS px on screen), r (its radius,
// CSS px; at least 10), foot: { x, y } (the stem's foot on the roof, CSS px), glyph ('road' | '!' | 'down'), tone
// ('problem' | 'warning'), count (ids.length; more than one is a count badge) }.
//
// createUI lays the markers out once a frame after the camera moves (layoutMarkers(world, alerts, cam, view)), draws them
// in the overlay pass (drawMarkers(g, world, alerts, range, layout)) and, outside a tool, asks markerAt(layout, x, y) on
// every tap before it picks the building under the tap.
//
// Which buildings get one, and its mark, are Stage 3's rules (render/overlays.js problemMarkers: one per building with an
// alert, the road mark when it has no road, "↓" amber for a home about to lose a tier; roadlessPlotBadges: one road
// badge per group of plots with no road, each plot keeping its dashed amber outline). The layout is in the order to draw:
// back first, so the front badge is drawn last and asked first.
import { problemMarkers, roadlessPlots, roadlessPlotBadges } from './overlays.js';
import { artToScreen, visibleTileRange } from './camera.js';
import { makeDraw } from './art/ctx.js';
import { ART, slotFor } from './art/registry.js';
import { UI, INK } from './art/palette.js';
import { p, U, quad, depthKey } from './iso.js';
import { MONUMENT_LOOK } from './art/monuments.js';
import { monumentTop } from './monuments.js';

// The 44 px tap area round a badge and its stem (ruling 281): the half-width either side of the stem and the badge.
export const MARKER_TAP_PX = 22;
export const MARKER = {
  r: 11,          // the badge's radius, CSS px (22 across: P13's 20 at the least)
  stem: 10,       // the shortest stem, CSS px, from the roof dot to the badge's foot
  gap: 3,         // CSS px kept clear between two badges
  most: 3,        // more than this many in one place merge into a count badge
  ring: 2,        // the footprint ring's width, CSS px
  wash: 0.12,     // the footprint wash's strength
};

// The roof a building's stem stands on, in art px: a monument's top as it stands now; any other building's sprite at
// four fifths of its height over the footprint's middle (its roof, below its flags); a plot's ground.
export function roofOf(b) {
  if (MONUMENT_LOOK[b.type] && b.site) return monumentTop(b);
  const art = ART[slotFor(b)];
  return U(p(b.x + b.w / 2, b.y + b.d / 2), art ? art.height * 0.8 : 0);
}

const toneOf = (glyph) => (glyph === 'down' ? 'warning' : 'problem');

// Stage 3's markers as { id, ids, glyph, key }, one per building: a group of road-less plots' road badge first (the road
// decides the mark, P13), then every other building with an alert or a home about to lose a tier.
function candidates(world, alerts, range) {
  const out = [], seen = new Set();
  const add = (b, glyph) => { if (b && !seen.has(b.id)) { seen.add(b.id); out.push({ id: b.id, ids: [b.id], glyph, key: depthKey(b.x, b.y, b.w, b.d) }); } };
  for (const m of roadlessPlotBadges(world, range)) add(world.buildings[m.id], 'road');
  for (const m of problemMarkers(world, alerts, range)) add(world.buildings[m.id], m.kind === 'down' ? 'down' : m.cause === 'no_road' ? 'road' : '!');
  return out;
}

// The markers on screen, laid out (see the header). Pure: the same world, alerts, camera and view give the same layout.
export function layoutMarkers(world, alerts, cam, view) {
  const range = visibleTileRange(cam, view, world.size);
  const list = candidates(world, alerts, range);
  if (!list.length) return [];
  const { r, stem, gap, most } = MARKER, near = 2 * r + gap;
  for (const c of list) {
    const q = roofOf(world.buildings[c.id]);
    const [fx, fy] = artToScreen(cam, view, q[0], q[1]);
    c.foot = { x: fx, y: fy };
    c.base = fy - stem - r;                                                     // the badge's centre on the shortest stem
  }
  // Places: markers whose badges on their shortest stems would overlap, joined in chains; a chain of more than MARKER.most
  // is cut, front first, into places no wider than two badges' reach round their front marker, so a long crowded row at a
  // low zoom makes several count badges, not one.
  const byFront = (a, b) => b.key - a.key || a.id - b.id;
  list.sort(byFront);
  const link = list.map((_, i) => i);
  const find = (i) => (link[i] === i ? i : (link[i] = find(link[i])));
  for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
    if (Math.hypot(list[i].foot.x - list[j].foot.x, list[i].base - list[j].base) < near) link[find(j)] = find(i);
  }
  const chains = new Map();
  list.forEach((c, i) => { const k = find(i); if (!chains.has(k)) chains.set(k, []); chains.get(k).push(c); });
  const places = [];
  for (const chain of chains.values()) {
    if (chain.length <= most) { places.push(chain); continue; }
    const cut = [];
    for (const c of chain) {
      const home = cut.find((g) => Math.hypot(g[0].foot.x - c.foot.x, g[0].base - c.base) < 2 * near);
      if (home) home.push(c); else cut.push([c]);
    }
    places.push(...cut);
  }
  places.sort((a, b) => byFront(a[0], b[0]));
  const placed = [];
  const clear = (x, y) => placed.every((m) => Math.hypot(m.x - x, m.y - y) >= near);
  const put = (foot, ids, glyph, tone) => {
    let y = foot.y - stem - r;
    while (!clear(foot.x, y)) y -= near;                                       // further back: a longer stem
    const m = { ids, x: foot.x, y, r, foot: { ...foot }, glyph, tone, count: ids.length };
    placed.push(m);
    return m;
  };
  for (const g of places) {
    if (g.length > most) {
      const front = g[0], ids = g.map((c) => c.id);
      put(front.foot, ids, g.some((c) => c.glyph !== 'down') ? '!' : 'down', g.some((c) => toneOf(c.glyph) === 'problem') ? 'problem' : 'warning');
    } else for (const c of g) put(c.foot, c.ids, c.glyph, toneOf(c.glyph));
  }
  return placed.reverse();                                                      // back first: the front is drawn last
}

const TONE = { problem: UI.problem, warning: UI.warn };

// The road mark: two bars, white on the badge.
function roadMark(h, x, y, R) {
  const half = 0.55 * R, gap = 0.28 * R;
  for (const dy of [-gap, gap]) h.line([x - half, y + dy], [x + half, y + dy], UI.halo, Math.max(1.6, 0.3 * R), 1);
}

// A plot with no road beside it: a dashed amber outline on its tile (Stage 3's, kept with the pinned badges).
function dashedAmberTile(g, x, y) {
  const pts = quad(x, y, 1, 1, 0);
  g.poly(pts, UI.warn, { alpha: 0.18 });
  g.poly(pts, 'none', { stroke: UI.halo, strokeWidth: 2.4, strokeAlpha: 0.7 });
  g.ctx.setLineDash([3 * g.scale, 2 * g.scale]);
  g.poly(pts, 'none', { stroke: UI.warn, strokeWidth: 1.4 });
  g.ctx.setLineDash([]);
}

// Draws the layout: the road-less plots' dashed outlines, then each marker's footprint rings (in art px, on the map),
// then its stem, roof dot and badge (in CSS px, so they keep their size at any zoom), back to front.
export function drawMarkers(g, world, alerts, range, layout = []) {
  for (const t of roadlessPlots(world, range)) dashedAmberTile(g, t.x, t.y);
  if (!layout.length) return;
  const css = g.cssScale || g.scale, ringW = MARKER.ring / css;
  for (const m of layout) {
    const color = TONE[m.tone] || UI.problem;
    for (const id of m.ids) {
      const b = world.buildings[id];
      if (!b) continue;
      const pts = quad(b.x, b.y, b.w, b.d, 0);
      g.poly(pts, color, { alpha: MARKER.wash });
      g.poly(pts, 'none', { stroke: UI.halo, strokeWidth: ringW + 1.6 / css, strokeAlpha: 0.75 });
      g.poly(pts, 'none', { stroke: color, strokeWidth: ringW });
    }
  }
  const ctx = g.ctx, dpr = g.scale / css;
  if (!ctx || typeof ctx.setTransform !== 'function') return;                   // a stand-in drawing helper: the rings only
  ctx.save();
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const h = makeDraw(ctx, 1, 1);                                                // CSS px from here
  for (const m of layout) {
    const color = TONE[m.tone] || UI.problem, bottom = m.y + m.r;
    h.line([m.foot.x, m.foot.y], [m.x, bottom], UI.halo, 4, 0.9);                // the stem: ink on a white halo
    h.line([m.foot.x, m.foot.y], [m.x, bottom], INK, 2, 1);
    h.circ([m.foot.x, m.foot.y], 4, UI.halo, { alpha: 0.95 });                   // the dot on the roof
    h.circ([m.foot.x, m.foot.y], 2.6, color);
    h.circ([m.x, m.y], m.r + 2, UI.halo, { alpha: 0.95 });                        // the badge
    h.circ([m.x, m.y], m.r, color, { stroke: INK, strokeWidth: 0.8, strokeAlpha: 0.5 });
    const ink = m.tone === 'warning' ? UI.label : UI.halo;
    if (m.count > 1) h.text([m.x, m.y + 0.5], String(m.count), { size: m.count > 9 ? 0.95 * m.r : 1.2 * m.r, weight: '700', color: ink });
    else if (m.glyph === 'road') roadMark(h, m.x, m.y, m.r);
    else h.text([m.x, m.y + 0.5], m.glyph === 'down' ? '↓' : '!', { size: 1.4 * m.r, weight: '700', color: ink });
  }
  ctx.restore();
}

// The marker a tap at (x, y) (CSS px) hits, or null: within MARKER_TAP_PX of the badge's centre, or of the stem from the
// badge down to its foot; the front marker of the layout wins (the last laid out is drawn on top, so it is asked first).
// Complete in the contract.
export function markerAt(layout, x, y) {
  for (let i = layout.length - 1; i >= 0; i--) {
    const m = layout[i];
    const reach = Math.max(MARKER_TAP_PX, m.r || 0);
    if (Math.hypot(x - m.x, y - m.y) <= reach) return m;
    const foot = m.foot || { x: m.x, y: m.y };
    const top = Math.min(m.y, foot.y), bottom = Math.max(m.y, foot.y);
    if (Math.abs(x - foot.x) <= MARKER_TAP_PX && y >= top && y <= bottom) return m;
  }
  return null;
}
