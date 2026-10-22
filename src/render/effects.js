// Feedback effects (spec 5.4): a dust puff on placing, a glow and "+Shack" on upgrade, a coral pulse and
// "−Cottage" on downgrade, and a sparkle on a building for a first (early-game pass 3.6). The settle
// (early-game pass 2.4): a placed building rises from the ground while two haulers work at its front corners
// in a little dust; the renderer reveals the sprite bottom-up from risingIds. Under prefers-reduced-motion
// there are no puffs, glows, pulses or rises (the building simply appears), labels stay still and a sparkle is
// a still ring. The onMilestone hook stays for callers that want it; the interface celebrates milestones itself
// (celebrate.js). Stage 3 (Track D, spec 5.4): a ripple ring (0.8 s) on each home a newly placed well first waters;
// none under reduced motion.
//
// Stage 4 (spec 5.4, ruling 248, Track E): the Motion level, motionLevel() ('full' | 'gentle' | 'still'; without it,
// reducedMotion() true reads as Still, so Stage 1-3 callers keep their behaviour). Full is all of the above. Gentle is
// fades in place: an upgrade's glow is its gold tile fading (no widening ring), a downgrade's pulse its coral tile fading
// (no growing ring), the well's ripple one ring fading where it is (no widening), labels fade without rising, a first's
// sparkle is the still ring, and there are no dust puffs and no rise. Still is Stage 3's reduced motion: no puffs, glows,
// pulses, ripples or rises, labels fading in place and the still ring.
//
// Version 6.0 (Track B2, rulings 720-739): the sim's raid events draw their moments. raid_strike (a building struck): Full a burst of sparks and
// dust on it, Gentle one ring fading in place, Still nothing (the fire and the building say it). raid_wreck (a building wrecked, its rubble in its
// place): Full a dust cloud that lifts and settles over the footprint, Gentle a pale disc fading in place, Still none. raid_loot (goods carried off a
// store): Full sacks lifting off it, Gentle the sacks fading in place, and at every level a label naming what was taken (the event's own goods).
import { TIERS } from '../data/housing.js';
import { GOODS } from '../data/goods.js';
import { RAID_FX, SPARK } from '../data/battle.js';
import { p, U, quad } from './iso.js';
import { UI, GOLD, GOLDC, TERRAIN } from './art/palette.js';
import { hauler } from './art/figures.js';

export const EFFECT_MS = { puff: 600, glow: 1200, pulse: 1200, label: 1400, rise: 900, sparkle: 1200, ripple: 800, strike: RAID_FX.strike, wreck: RAID_FX.wreck, loot: RAID_FX.loot };
const SACK_COLOUR = '#C9A66B', SACK_SHADE = '#9C7A48', DUST = '#CDB894';
// What a raid event's label says of the goods taken: the two largest, "−14 grain, −6 linen" (the event's own numbers).
export const lootLabel = (goods) => Object.entries(goods || {}).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)).slice(0, 2)
  .map(([g, n]) => `−${n} ${(GOODS[g] ? GOODS[g].name : g).toLowerCase()}`).join(', ');
export const RISE_STEPS = 2;   // hauler steps per rise: about two a second

export function prefersReducedMotion() {
  try { return Boolean(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) { return false; }
}

export function createEffects({ reducedMotion = prefersReducedMotion, motionLevel = null, onMilestone = null } = {}) {
  const reduced = () => (typeof reducedMotion === 'function' ? Boolean(reducedMotion()) : Boolean(reducedMotion));
  const level = () => (typeof motionLevel === 'function' ? motionLevel() : motionLevel || (reduced() ? 'still' : 'full'));
  const full = () => level() === 'full';
  let list = [];
  const age = (e, now) => (now - e.start) / EFFECT_MS[e.kind];
  // A rise ends early when its building is gone (an Undo or a demolish inside the 900 ms), so the work gang never
  // carries on at an empty site. Ids are never reused, so the id alone says whether it is the same building.
  const gone = (e, world) => e.kind === 'rise' && Boolean(world) && !world.buildings[e.id];
  const prune = (now, world = null) => { list = list.filter((e) => age(e, now) < 1 && !gone(e, world)); };
  const add = (e) => { list.push(e); return e; };

  const fx = {
    get reducedMotion() { return reduced(); },
    get motion() { return level(); },
    puff(x, y, now) { if (full()) add({ kind: 'puff', x, y, start: now }); },
    // Under Gentle a glow, pulse or ripple is drawn in place (e.still): it fades, but nothing widens or rises.
    glow(x, y, now) { if (level() !== 'still') add({ kind: 'glow', x, y, still: !full(), start: now }); },
    pulse(x, y, now) { if (level() !== 'still') add({ kind: 'pulse', x, y, still: !full(), start: now }); },
    ripple(x, y, now) { if (level() !== 'still') add({ kind: 'ripple', x, y, still: !full(), start: now }); },
    label(x, y, text, color, now) { add({ kind: 'label', x, y, text, color, start: now }); },
    // A first (early-game pass 3.6): a burst of small diamonds, or a still ring that fades under Gentle and Still.
    sparkle(x, y, color, now) { add({ kind: 'sparkle', x, y, color, still: !full(), start: now }); },
    // Building `id` with footprint w x d at tile (x, y) rises from the ground over EFFECT_MS.rise (Full only).
    rise(id, x, y, w, d, now) { if (full()) add({ kind: 'rise', id, x, y, w, d, start: now }); },
    // id -> how far each rising building is up, in [0, 1). Given the world, a building no longer in it is dropped.
    risingIds(now, world = null) {
      prune(now, world);
      const out = new Map();
      for (const e of list) if (e.kind === 'rise') out.set(e.id, Math.max(0, age(e, now)));
      return out;
    },
    // How far (art px) a label has risen at progress t in 0..1. Still under Gentle and Still.
    labelLift(t) { return full() ? 10 * t : 0; },
    // Version 6.0 (Track B2): what a raid does to a building, at the building's centre. Gentle's are drawn in place (e.still); Still has none.
    strike(x, y, now) { if (level() !== 'still') add({ kind: 'strike', x, y, still: !full(), start: now }); },
    wreck(x, y, w, d, now) { if (level() !== 'still') add({ kind: 'wreck', x, y, w, d, still: !full(), start: now }); },
    loot(x, y, goods, now) {
      const text = lootLabel(goods);
      if (!text) return;
      if (level() !== 'still') add({ kind: 'loot', x, y, still: !full(), n: Math.min(3, Math.max(1, Object.keys(goods).length)), start: now });
      fx.label(x, y, text, UI.bad, now);
    },
    fromEvents(world, events, now) {
      const wrecked = new Map();             // a wrecked building's id -> the centre of its old footprint (the building itself is gone)
      for (const ev of events) {
        if (ev.type !== 'raid_wreck') continue;
        const r = (ev.to || []).map((id) => world.buildings[id]).find((b) => b && b.was);
        if (r) wrecked.set(ev.id, { x: r.was.x + r.was.w / 2, y: r.was.y + r.was.d / 2, w: r.was.w, d: r.was.d });
      }
      for (const ev of events) {
        if (ev.type === 'raid_strike') {
          const b = world.buildings[ev.id];
          if (b) fx.strike(b.x + b.w / 2, b.y + b.d / 2, now);
          continue;
        }
        if (ev.type === 'raid_wreck') { const c = wrecked.get(ev.id); if (c) fx.wreck(c.x, c.y, c.w, c.d, now); continue; }
        if (ev.type === 'raid_loot') {
          const b = world.buildings[ev.id], c = b ? { x: b.x + b.w / 2, y: b.y + b.d / 2 } : wrecked.get(ev.id);
          if (c) fx.loot(c.x, c.y, ev.goods, now);
          continue;
        }
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
          g.poly(quad(e.x - 0.5, e.y - 0.5, 1, 1, 0), 'none', { stroke: GOLD, strokeWidth: e.still ? 1.5 : 1.5 + t * 2, strokeAlpha: 1 - t });
        } else if (e.kind === 'pulse') {
          const r = e.still ? 0.5 : 0.5 + t * 0.8;
          g.poly(quad(e.x - r, e.y - r, 2 * r, 2 * r, 0), 'none', { stroke: UI.bad, strokeWidth: e.still ? 1.5 : 2 - t, strokeAlpha: 1 - t });
          g.poly(quad(e.x - 0.5, e.y - 0.5, 1, 1, 0), UI.bad, { alpha: (1 - t) * 0.25 });
        } else if (e.kind === 'ripple') {
          // One water ring widening on the ground and fading (in place under Gentle): it never comes back, so it cannot flash.
          const r = e.still ? 0.75 : 0.35 + t * 0.75;
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
        } else if (e.kind === 'strike') {
          const q = U(c, 10);
          if (e.still) g.circ(q, 8, 'none', { stroke: SPARK.edge, strokeWidth: 1.4, strokeAlpha: (1 - t) * 0.9 });
          else {
            for (let i = 0; i < 9; i++) {
              const a = (i / 9) * Math.PI * 2 + e.x, r0 = 3 + t * 5, r1 = 6 + t * 13;
              g.line([q[0] + Math.cos(a) * r0, q[1] + Math.sin(a) * r0 * 0.7], [q[0] + Math.cos(a) * r1, q[1] + Math.sin(a) * r1 * 0.7 - t * 3], i % 2 ? SPARK.edge : SPARK.colour, 0.8, 1 - t);
            }
            for (let i = 0; i < 3; i++) g.circ([c[0] + (i - 1) * 7 * (0.4 + t), c[1] - 2 - t * 8], 2.4 + t * 3, DUST, { alpha: (1 - t) * 0.55 });
          }
        } else if (e.kind === 'wreck') {
          const k = Math.max(1, (e.w + e.d) / 2);
          if (e.still) g.radial([c[0], c[1] - 3], 18 * k, 9 * k, DUST, (1 - t) * 0.6);
          else {
            for (let i = 0; i < 8; i++) {
              const a = (i / 8) * Math.PI * 2 + e.y, r = (4 + t * 15) * k;
              g.circ([c[0] + Math.cos(a) * r, c[1] - 2 + Math.sin(a) * r * 0.5 - t * 10], (4 + t * 4) * Math.min(1.5, k), DUST, { alpha: (1 - t) * (1 - t) * 0.65 });
            }
            g.radial([c[0], c[1] - 2], 14 * k, 7 * k, DUST, (1 - t) * 0.35);
          }
        } else if (e.kind === 'loot') {
          for (let i = 0; i < e.n; i++) {
            const lift = e.still ? 0 : t * 14, side = (i - (e.n - 1) / 2) * 6;
            const s = [c[0] + side + (e.still ? 0 : t * 6), c[1] - 10 - lift - i * 1.5];
            const a = e.still ? 1 - t : Math.min(1, (1 - t) * 1.6);
            g.ell(s, 3, 2.5, SACK_COLOUR, { alpha: a, outline: true });
            g.ell([s[0] + 0.5, s[1] + 0.9], 2.3, 1.3, SACK_SHADE, { alpha: a * 0.5 });
            g.line([s[0] - 0.7, s[1] - 2.3], [s[0] + 0.8, s[1] - 3.1], '#6B4A3A', 0.7, a);
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
