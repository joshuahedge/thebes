// Feedback effects (spec 5.4): a dust puff on placing, a glow and "+Shack" on upgrade, a coral pulse and
// "-Cottage" on downgrade, and a hook for the milestone banner (the banner itself is 1c's DOM). Under
// prefers-reduced-motion there are no puffs, glows or pulses, and labels stay still.
import { TIERS } from '../data/housing.js';
import { p, U, quad } from './iso.js';
import { UI, GOLD, TERRAIN } from './art/palette.js';

export const EFFECT_MS = { puff: 600, glow: 1200, pulse: 1200, label: 1400 };

export function prefersReducedMotion() {
  try { return Boolean(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) { return false; }
}

export function createEffects({ reducedMotion = prefersReducedMotion(), onMilestone = null } = {}) {
  let list = [];
  const age = (e, now) => (now - e.start) / EFFECT_MS[e.kind];
  const prune = (now) => { list = list.filter((e) => age(e, now) < 1); };
  const add = (e) => { list.push(e); return e; };

  const fx = {
    reducedMotion,
    puff(x, y, now) { if (!reducedMotion) add({ kind: 'puff', x, y, start: now }); },
    glow(x, y, now) { if (!reducedMotion) add({ kind: 'glow', x, y, start: now }); },
    pulse(x, y, now) { if (!reducedMotion) add({ kind: 'pulse', x, y, start: now }); },
    label(x, y, text, color, now) { add({ kind: 'label', x, y, text, color, start: now }); },
    // How far (art px) a label has risen at progress t in 0..1. Still under reduced motion.
    labelLift(t) { return reducedMotion ? 0 : 10 * t; },
    fromEvents(world, events, now) {
      for (const ev of events) {
        if (ev.type === 'milestone') { if (onMilestone) onMilestone(ev.id); continue; }
        if (ev.type !== 'upgrade' && ev.type !== 'downgrade') continue;
        const b = world.buildings[ev.id];
        if (!b) continue;
        const cx = b.x + b.w / 2, cy = b.y + b.d / 2;
        const name = TIERS[ev.to] ? TIERS[ev.to].name : '';
        if (ev.type === 'upgrade') { fx.glow(cx, cy, now); fx.label(cx, cy, '+' + name, GOLD, now); }
        else { fx.pulse(cx, cy, now); fx.label(cx, cy, '−' + name, UI.bad, now); }
      }
    },
    active(now) { prune(now); return list.slice(); },
    count(now) { prune(now); return list.length; },
    draw(g, now) {
      prune(now);
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
