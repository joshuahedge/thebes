// Version 9.0, Track V (V5, ruling 1603): the beaten raid on the map, for the moment's 6 game days, at the last fight's spot (where blows were last
// traded, else where the last raider fell). The soldiers out near it raise their spears (a pose: units.js
// 'soldier_cheer'); a few gold diamonds turn slowly over it, fading in and out over seconds (never a flash); the raiders' dust runs from it to the edge
// they came from over the first RAID_MOMENT.dustDays; and where the chieftain fell his banner lies for the whole moment. Drawing only: the sim never reads it.
import { p, U } from '../iso.js';
import { GOLD, GOLDC } from '../art/palette.js';
import { FALL } from '../../data/battle.js';
import { drawBanner, fightOf } from '../units.js';
import { startMoment, momentOf } from './moment.js';
import { frameTimeOf } from './clock.js';

export const RAID_MOMENT = { freshDays: 20, dustDays: 2, dustPuffs: 5, sparkles: 5, sparkleMs: 2400, sparkleLift: 30 };

// The edge a band came from, as the map point straight out from (x, y) on that side.
function edgePoint(world, dir, x, y) {
  const n = world.size - 1;
  if (dir === 'west') return { x: 0, y };
  if (dir === 'east') return { x: n, y };
  if (dir === 'north') return { x, y: 0 };
  return { x, y: n };
}

// Called by the interface when a beaten raid's moment starts (its report). A raid lost has no moment on the map.
// The spot is found on the first frame drawn after it (the last raider's fall is seen by the frame after the sim's day that ended the raid).
export function beatenRaidOnMap(world, report) {
  if (!world || !report || !report.won) return;
  startMoment(world, { day: world.day, x: null, y: null, dir: report.dir, chiefsFell: report.chiefsFell || 0, edge: null, chief: null });
}
function settle(world, m) {
  if (m.x !== null) return true;
  const fresh = (k) => (k && k.day >= m.day - RAID_MOMENT.freshDays ? k : null);   // a spot from an earlier raid is not this one's
  const f = fightOf(world), at = fresh(f.clash) || fresh(f.fall) || fresh(f.chief);
  if (!at) return false;
  Object.assign(m, { x: at.x, y: at.y, edge: edgePoint(world, m.dir, at.x, at.y), chief: fresh(f.chief) && m.chiefsFell ? f.chief : null });
  return true;
}

// The moment's map marks, in art px with the art origin set; now is the real clock (the sparkle's slow turn).
export function drawRaidMoment(g, world, range, now) {
  const m = momentOf(world);
  if (!m || !settle(world, m)) return false;
  const days = frameTimeOf(world) - m.day;
  if (m.chief) drawBanner(g, m.chief.x, m.chief.y, now, 'full', 0, true);
  if (days < RAID_MOMENT.dustDays) {
    const k = days / RAID_MOMENT.dustDays;
    for (let i = 0; i < RAID_MOMENT.dustPuffs; i++) {
      const u = Math.min(1, k * 1.4 + i * 0.06), x = m.x + (m.edge.x - m.x) * u, y = m.y + (m.edge.y - m.y) * u;
      const q = p(x + (i % 2 ? 0.3 : -0.3), y);
      g.circ([q[0], q[1] - 2 - i], 3 + i * 0.6, FALL.dust, { alpha: 0.45 * (1 - k) });
    }
  }
  const c = U(p(m.x, m.y), RAID_MOMENT.sparkleLift);
  for (let i = 0; i < RAID_MOMENT.sparkles; i++) {
    const a = (i / RAID_MOMENT.sparkles) * Math.PI * 2 + now / 4000;          // a slow turn: one round in 25 s
    const tw = 0.5 + 0.5 * Math.sin((now / RAID_MOMENT.sparkleMs) * Math.PI * 2 + i * 1.3);
    const d = [c[0] + Math.cos(a) * 9, c[1] + Math.sin(a) * 4], s = 2.2 + tw;
    g.poly([[d[0], d[1] - s], [d[0] + s * 0.6, d[1]], [d[0], d[1] + s], [d[0] - s * 0.6, d[1]]], GOLD, { alpha: 0.35 + 0.55 * tw, stroke: GOLDC[2], strokeWidth: 0.7, strokeAlpha: 0.35 + 0.55 * tw });
  }
  return true;
}
