// Version 7.1, Track F (rulings 1040-1059): a ferry you can see. The crossing is a dashed line over the water between its two landings (solid dashes when
// it runs, short pale ones when it does not), and a small boat crosses on it:
//   ferryGround(g, world, range, now, motion)     the dashed line, in art px with the art origin set (render/v70.js calls it in the ground layer)
//   ferryWalkers(world, timeDays, range, motion)  the boat of each running crossing as a walker entry, depth-sorted with the figures (render/v70.js)
// Under Full motion the boat goes back and forth on the game's days; under Gentle (and Still) it sits at a landing, so the crossing reads either way.
import { p } from './iso.js';
import { ferryLinks, landingsOf, mateOf } from '../sim/ferries.js';

export const FERRY_ID_BASE = 4100000;   // after the trade figures (4000000 +): base + the lower landing's id

const inRange = (range, x, y, m = 3) => !range || (x >= range.x0 - m && x <= range.x1 + m && y >= range.y0 - m && y <= range.y1 + m);
const centre = (b) => [b.x + 0.5, b.y + 0.5];
const facesLeft = (dx, dy) => dx - dy < 0;   // on screen x grows with x - y

// Each crossing once (lower landing id first), running or not: [{ a, b, runs }].
function crossings(world) {
  const out = [];
  for (const a of landingsOf(world)) {
    const b = mateOf(world, a);
    if (b && a.id < b.id) out.push({ a, b, runs: a.ferry.run === true && b.ferry.run === true });
  }
  return out;
}

export function ferryGround(g, world, range) {
  for (const { a, b, runs } of crossings(world)) {
    const [ax, ay] = centre(a), [bx, by] = centre(b);
    if (!inRange(range, ax, ay, 14) && !inRange(range, bx, by, 14)) continue;
    const from = p(ax, ay), to = p(bx, by);
    g.line(from, to, '#1E3A5F', 3.2, runs ? 0.35 : 0.2);
    g.ctx.setLineDash(runs ? [4 * g.scale, 3 * g.scale] : [1.5 * g.scale, 4 * g.scale]);
    g.line(from, to, runs ? '#FFFFFF' : '#E8EEF4', runs ? 1.7 : 1.3, runs ? 0.95 : 0.75);
    g.ctx.setLineDash([]);
  }
}

// Where the boat is on a running crossing on a game day, as a fraction of the way from the lower landing to the other: a triangle wave, one way
// in a leg of 0.6 days and a tenth more for each tile of water, so a wider crossing is a slower trip.
export function boatFraction(water, timeDays, id) {
  const leg = 0.6 + water * 0.1;
  const t = ((timeDays / leg) + (id % 7) * 0.31) % 2;
  return t < 1 ? t : 2 - t;
}

export function ferryWalkers(world, timeDays, range = null, motion = 'full') {
  const out = [];
  for (const l of ferryLinks(world)) {
    const [ax, ay] = centre(l.a), [bx, by] = centre(l.b);
    const dx = bx - ax, dy = by - ay, len = Math.hypot(dx, dy) || 1;
    const sit = motion !== 'full';
    // At a landing the boat floats one tile off the bank, on the water, facing across.
    const f = sit ? 1 / len : Math.min(1 - 1 / len, Math.max(1 / len, boatFraction(l.water, timeDays, l.a.id)));
    const x = ax + dx * f, y = ay + dy * f;
    if (!inRange(range, x, y)) continue;
    let heading = facesLeft(dx, dy);
    if (!sit) { const g = boatFraction(l.water, timeDays + 0.05, l.a.id) - boatFraction(l.water, timeDays, l.a.id); if (g < 0) heading = !heading; }
    out.push({ id: FERRY_ID_BASE + l.a.id, kind: heading ? 'ferry_boat_l' : 'ferry_boat', x, y, dir: heading ? 3 : 1 });
  }
  return out;
}
