// Version 9.3, Track M (ruling 1931): the level-up moment on the map. When a rank brings a new look (Town, City, Capital: not Market town, Great City,
// Great Capital or Seat), one soft gold ring spreads over the ground from the look's centre (looks.js lookCentre) out past the farthest building over
// SWEEP.ms. It fades in and out smoothly (never a flash), stands still in the camera (the camera never moves, nothing shakes), is skipped when motion
// is not Full (reduced motion or Gentle), and is the first thing shed: it is not drawn while the 9.0 effects' running average is over a quarter of
// their budget (before the dropper sheds any of its own kinds). Drawing only: the sim never reads it. Kept per world, outside it (never saved).
import { p } from '../iso.js';
import { GOLD, GOLDC } from '../art/palette.js';
import { MILESTONES } from '../../data/progression.js';
import { AMBIENT } from '../../data/ambient.js';
import { lookOfRank, lookCentre } from '../looks.js';
import { v90Dropper, v90Off } from '../v90/dropper.js';

export const SWEEP = { ms: 3000, points: 56, margin: 2, minRadius: 6, fadeIn: 0.15, fadeOut: 0.4, wide: 8, thin: 2.4, wideAlpha: 0.28, thinAlpha: 0.9, shedShare: 0.25 };

const sweeps = new WeakMap();            // world -> { start (ms) }

// Whether reaching rank `id` brings a new look (the rank before it is in an older look).
export function bringsNewLook(id) {
  const i = MILESTONES.findIndex((m) => m.id === id);
  return i > 0 && lookOfRank(id) > lookOfRank(MILESTONES[i - 1].id);
}

// The interface's milestone event (effects.fromEvents), at `now` ms, under the effects' motion level. Only Full motion sweeps.
export function noteSweep(world, rankId, now, motion = 'full') {
  if (!world || motion !== 'full' || !bringsNewLook(rankId)) return false;
  sweeps.set(world, { start: now });
  return true;
}
export function resetSweep(world) { if (world) sweeps.delete(world); }

// The ring's state at `now`: { age (0..1), radius (tiles), alpha (0..1) }, or null when none is spreading.
export function sweepAt(world, now) {
  const s = sweeps.get(world);
  if (!s) return null;
  const age = (now - s.start) / SWEEP.ms;
  if (age >= 1) { sweeps.delete(world); return null; }
  if (age < 0) return null;
  const c = lookCentre(world), reach = Math.max(c.dMax, SWEEP.minRadius) + SWEEP.margin;
  const ease = 1 - (1 - age) * (1 - age);                                   // fast at first, slowing as it reaches the edge
  const alpha = Math.min(1, age / SWEEP.fadeIn, (1 - age) / SWEEP.fadeOut);
  const smooth = alpha * alpha * (3 - 2 * alpha);
  return { age, radius: ease * reach, alpha: smooth, cx: c.cx, cy: c.cy };
}

// Called each frame by the 9.0 effects (v90/effects.js drawV90), in art px with the art origin set. Returns whether it drew.
export function drawSweep(g, world, now) {
  if (v90Off('sweep') || v90Dropper.stats.avg > AMBIENT.v90BudgetMs * SWEEP.shedShare) return false;
  const s = sweepAt(world, now);
  if (!s || s.alpha <= 0.01) return false;
  const pts = [];
  for (let i = 0; i < SWEEP.points; i++) {
    const a = (i / SWEEP.points) * Math.PI * 2;
    pts.push(p(s.cx + Math.cos(a) * s.radius, s.cy + Math.sin(a) * s.radius));
  }
  g.poly(pts, 'none', { stroke: GOLD, strokeWidth: SWEEP.wide, strokeAlpha: SWEEP.wideAlpha * s.alpha });   // the soft halo
  g.poly(pts, 'none', { stroke: GOLDC[1], strokeWidth: SWEEP.thin, strokeAlpha: SWEEP.thinAlpha * s.alpha });   // the ring itself
  return true;
}
