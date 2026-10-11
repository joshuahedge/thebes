// Feedback effects (spec 5.4): a dust puff on placing, a glow and "+Shack" on upgrade, a coral pulse and
// "−Cottage" on downgrade, and a sparkle on a building for a first (early-game pass 3.6). The settle
// (early-game pass 2.4): a placed building rises from the ground while two haulers work at its front corners
// in a little dust; the renderer reveals the sprite bottom-up from risingIds. Under prefers-reduced-motion
// there are no puffs, glows, pulses or rises (the building simply appears), labels stay still and a sparkle is
// a still ring. The onMilestone hook stays for callers that want it; the interface celebrates milestones itself
// (celebrate.js). Stage 3 (Track D, spec 5.4): a ripple ring (0.8 s) on each home a newly placed well first waters;
// none under reduced motion.
import { TIERS } from '../data/housing.js';
import { p, U, quad } from './iso.js';
import { UI, GOLD, GOLDC, TERRAIN } from './art/palette.js';
import { hauler } from './art/figures.js';

export const EFFECT_MS = { puff: 600, glow: 1200, pulse: 1200, label: 1400, rise: 900, sparkle: 1200, ripple: 800 };
export const RISE_STEPS = 2;   // hauler steps per rise: about two a second

export function prefersReducedMotion() {
  try { return Boolean(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) { return false; }
}

export function createEffects({ reducedMotion = prefersReducedMotion, onMilestone = null } = {}) {
  const reduced = () => (typeof reducedMotion === 'function' ? Boolean(reducedMotion()) : Boolean(reducedMotion));
  let list = [];
  const age = (e, now) => (now - e.start) / EFFECT_MS[e.kind];
  // A rise ends early when its building is gone (an Undo or a demolish inside the 900 ms), so the work gang never
  // carries on at an empty site. Ids are never reused, so the id alone says whether it is the same building.
  const gone = (e, world) => e.kind === 'rise' && Boolean(world) && !world.buildings[e.id];
  const prune = (now, world = null) => { list = list.filter((e) => age(e, now) < 1 && !gone(e, world)); };
  const add = (e) => { list.push(e); return e; };

  const fx = {
    get reducedMotion() { return reduced(); },
    puff(x, y, now) { if (!reduced()) add({ kind: 'puff', x, y, start: now }); },
    glow(x, y, now) { if (!reduced()) add({ kind: 'glow', x, y, start: now }); },
    pulse(x, y, now) { if (!reduced()) add({ kind: 'pulse', x, y, start: now }); },
    ripple(x, y, now) { if (!reduced()) add({ kind: 'ripple', x, y, start: now }); },
    label(x, y, text, color, now) { add({ kind: 'label', x, y, text, color, start: now }); },
    // A first (early-game pass 3.6): a burst of small diamonds, or a still ring that fades under reduced motion.
    sparkle(x, y, color, now) { add({ kind: 'sparkle', x, y, color, still: reduced(), start: now }); },
    // Building `id` with footprint w x d at tile (x, y) rises from the ground over EFFECT_MS.rise.
    rise(id, x, y, w, d, now) { if (!reduced()) add({ kind: 'rise', id, x, y, w, d, start: now }); },
    // id -> how far each rising building is up, in [0, 1). Given the world, a building no longer in it is dropped.
    risingIds(now, world = null) {
      prune(now, world);
      const out = new Map();
      for (const e of list) if (e.kind === 'rise') out.set(e.id, Math.max(0, age(e, now)));
      return out;
    },
    // How far (art px) a label has risen at progress t in 0..1. Still under reduced motion.
    labelLift(t) { return reduced() ? 0 : 10 * t; },
    fromEvents(world, events, now) {
      for (const ev of events) {
        if (ev.type === 'milestone') { if (onMilestone) onMilestone(ev.id); continue; }
        if (ev.type !== 'upgrade' && ev.type !== 'downgrade') continue;
        const b = world.buildings[ev.id];
        if (!b) continue;
        const cx = b.x + b.w / 2, cy = b.y + b.d / 2;
        const toName = TIERS[ev.to] ? TIERS[ev.to].name : '';
        const fromName = TIERS[ev.from] ? TIERS[ev.from].name : '';
        if (ev.type === 'upgrade') { fx.glow(cx, cy, now); fx.label(cx, cy, '+' + toName, GOLD, now); }
        else { fx.pulse(cx, cy, now); fx.label(cx, cy, '−' + fromName, UI.bad, now); }
      }
    },
    active(now) { prune(now); return list.slice(); },
    count(now) { prune(now); return list.length; },
    draw(g, now, world = null) {
      prune(now, world);
      for (const e of list) {
        const t = age(e, now);
        const c = p(e.x, e.y);
        if (e.kind === 'puff') {
          for (let i = 0; i < 5; i++) {
            const a = (i / 5) * Math.PI * 2;
            const r = 4 + t * 10;
            g.circ([c[0] + Math.cos(a) * r, c[1] + Math.sin(a) * r * 0.5 - t * 4], 2.5 - t * 1.5, TERRAIN.dotLight, { alpha: (1 - t) * 0.8 });
          }
        } else if (e.kind === 'glow') {
          g.poly(quad(e.x - 0.5, e.y - 0.5, 1, 1, 0), GOLD, { alpha: (1 - t) * 0.45 });
          g.poly(quad(e.x - 0.5, e.y - 0.5, 1, 1, 0), 'none', { stroke: GOLD, strokeWidth: 1.5 + t * 2, strokeAlpha: 1 - t });
        } else if (e.kind === 'pulse') {
          const r = 0.5 + t * 0.8;
          g.poly(quad(e.x - r, e.y - r, 2 * r, 2 * r, 0), 'none', { stroke: UI.bad, strokeWidth: 2 - t, strokeAlpha: 1 - t });
          g.poly(quad(e.x - 0.5, e.y - 0.5, 1, 1, 0), UI.bad, { alpha: (1 - t) * 0.25 });
        } else if (e.kind === 'ripple') {
          // One water ring widening on the ground and fading: it never comes back, so it cannot flash.
          const r = 0.35 + t * 0.75;
          g.poly(quad(e.x - r, e.y - r, 2 * r, 2 * r, 0), 'none', { stroke: UI.halo, strokeWidth: 2.6, strokeAlpha: (1 - t) * 0.7 });
          g.poly(quad(e.x - r, e.y - r, 2 * r, 2 * r, 0), 'none', { stroke: UI.water, strokeWidth: 1.4, strokeAlpha: 1 - t });
        } else if (e.kind === 'rise') {
          const k = Math.max(0, t);
          // Dust along the two front edges, lifting and thinning as the walls go up.
          for (let i = 0; i < 4; i++) {
            const u = i % 2 ? 0.75 : 0.25;
            const q = i < 2 ? p(e.x + e.w * u, e.y + e.d) : p(e.x + e.w, e.y + e.d * u);
            g.circ([q[0], q[1] - 1 - k * 7], 1.5 + k * 2.5, TERRAIN.dotLight, { alpha: (1 - k) * 0.55 });
          }
          // Two haulers at the front corners, a half step apart.
          const step = (k * RISE_STEPS) % 1;
          hauler(g, e.x + 0.05, e.y + e.d + 0.25, step);
          hauler(g, e.x + e.w + 0.25, e.y + 0.05, (step + 0.5) % 1);
        } else if (e.kind === 'sparkle') {
          const q = U(c, 14);                                    // about a storey above the building's centre
          if (e.still) g.circ(q, 10, 'none', { stroke: e.color, strokeWidth: 1.5, strokeAlpha: 1 - t });
          else {
            for (let i = 0; i < 8; i++) {
              const a = (i / 8) * Math.PI * 2;
              const r = 5 + t * 16;
              const s = 3.6 * (1 - t * 0.5);                        // gold diamonds with a darker amber edge, so they read on sand
              const d = [q[0] + Math.cos(a) * r, q[1] + Math.sin(a) * r * 0.6 - t * 4];
              g.poly([[d[0], d[1] - s], [d[0] + s * 0.6, d[1]], [d[0], d[1] + s], [d[0] - s * 0.6, d[1]]], e.color, { alpha: 1 - t, stroke: GOLDC[2], strokeWidth: 0.9, strokeAlpha: 1 - t });
            }
          }
        } else if (e.kind === 'label') {
          const q = U(c, 16 + fx.labelLift(t));
          g.text([q[0] + 0.6, q[1] + 0.6], e.text, { size: 7, color: UI.halo, alpha: Math.min(1, (1 - t) * 1.5) });
          g.text(q, e.text, { size: 7, color: e.color, alpha: Math.min(1, (1 - t) * 1.5) });
        }
      }
    },
  };
  return fx;
}
