// Flames and smoke (spec 5.4), drawn from the world's fire state (b.fire, src/sim/fire.js), so they survive a reload.
// Stage 3 contract: createUI passes drawFires to renderFrame as opts.fire, which calls it once a frame in art px (the
// camera's origin set) after the depth-sorted sprites and before the effects and overlays.
//
// A blaze is one small flame on the roof; a fire is three larger flames and a column of the potter's soft smoke puffs.
// A flame's shape (its tip's sway and its embers) steps once every FLAME_STEP_MS, so it changes at 2 Hz at most, each
// building out of step by its id; its colours and size never change, so nothing flashes, and it is orange and gold,
// never a saturated red. Smoke puffs rise and fade smoothly over SMOKE_RISE_MS. Under reduced motion a burning building
// shows still flames and the word "Burning" (ART_TEXT.burning) on a pale label, and no smoke.
import { ART, slotFor } from './art/registry.js';
import { p, U } from './iso.js';
import { ART_TEXT } from '../ui/text.js';

export const FLAME_STEP_MS = 500;
export const SMOKE_RISE_MS = 3000;
export const SMOKE_PUFFS = 4;
export const FLAME = { outer: '#E07B39', mid: '#F2A93B', core: '#FCE6A6', ember: '#F6C05A', smoke: '#BDB3BE' };
const LEAN = [-0.8, 0.5, 1, -0.3];            // the tip's sway at each of four steps, in art px per unit of size
const LABEL = { fill: '#FFF8EA', text: '#3B2A14', size: 5.5 };

const inRange = (b, r) => !r || (b.x <= r.x1 && b.x + b.w - 1 >= r.x0 && b.y <= r.y1 && b.y + b.d - 1 >= r.y0);

// One flame standing on art point q: an orange teardrop, a gold heart, a pale core and two embers above its tip.
export function flame(g, q, size, step) {
  const [x, y] = q, w = 2.2 * size, h = 6.5 * size, lean = LEAN[step % LEAN.length] * size;
  const shape = (k, tip, fill) => g.path([
    ['M', [x - w * k, y]], ['Q', [x - w * k * 1.15, y - h * k * 0.55], [x + tip, y - h * k]],
    ['Q', [x + w * k * 1.15, y - h * k * 0.55], [x + w * k, y]], ['Q', [x, y + w * k * 0.45], [x - w * k, y]], ['Z'],
  ], fill);
  shape(1, lean, FLAME.outer);
  shape(0.62, lean * 0.7, FLAME.mid);
  g.ell([x, y - h * 0.12], w * 0.32, w * 0.26, FLAME.core);
  const side = step % 2 ? 1 : -1;
  g.circ([x + lean * 1.3 + side * size, y - h - (1 + (step % 3)) * size * 1.2], 0.45 * size, FLAME.ember);
  g.circ([x + lean * 0.6 - side * 1.4 * size, y - h * 0.8 - (step % 2) * size], 0.35 * size, FLAME.ember);
}

// Where a building's flames stand: on its roof, at the footprint's centre, about two thirds of its art height up.
export function roofPoint(world, b) {
  const def = ART[slotFor(b, world)];
  const z = Math.max(4, Math.round((def ? def.height : 10) * 0.62));
  return U(p(b.x + b.w / 2, b.y + b.d / 2), z);
}

function label(g, q, str) {
  const ctx = g.ctx;
  ctx.font = `700 ${LABEL.size * g.scale}px system-ui, -apple-system, "Segoe UI", sans-serif`;
  const w = ctx.measureText(str).width / g.scale + 5, h = LABEL.size + 2.6, [x, y] = q, r = h / 2;
  g.path([['M', [x - w / 2 + r, y - r]], ['L', [x + w / 2 - r, y - r]], ['Q', [x + w / 2, y - r], [x + w / 2, y]], ['Q', [x + w / 2, y + r], [x + w / 2 - r, y + r]],
    ['L', [x - w / 2 + r, y + r]], ['Q', [x - w / 2, y + r], [x - w / 2, y]], ['Q', [x - w / 2, y - r], [x - w / 2 + r, y - r]], ['Z']], LABEL.fill, { alpha: 0.94, outline: true });
  g.text([x, y + 0.2], str, { size: LABEL.size, color: LABEL.text, weight: '700' });
}

// A fire's column of smoke over art point q: SMOKE_PUFFS puffs, each rising about 22 art px and fading as it goes,
// spaced evenly in time and out of step with other buildings by id.
function smoke(g, q, now, id) {
  const offset = ((id * 0.618) % 1);
  for (let i = 0; i < SMOKE_PUFFS; i++) {
    const t = (now / SMOKE_RISE_MS + i / SMOKE_PUFFS + offset) % 1;
    const a = 0.5 * Math.min(1, t / 0.15) * (1 - t);
    const r = 2.6 + t * 3.6;
    g.radial([q[0] + 1.5 + t * 4, q[1] - 10 - t * 22], r, r * 0.8, FLAME.smoke, a);
  }
}

export function drawFires(g, world, range, now, { reducedMotion = false } = {}) {
  for (const id in world.buildings) {
    const b = world.buildings[id];
    if (!b.fire || !inRange(b, range)) continue;
    const q = roofPoint(world, b), big = b.fire.stage === 'fire';
    const step = reducedMotion ? 0 : Math.floor(now / FLAME_STEP_MS) + b.id;
    if (big && !reducedMotion) smoke(g, q, now, b.id);
    if (big) {
      const k = Math.min(2, b.w);
      flame(g, [q[0] - 5 * k, q[1] + 1.5], 1.15, step + 1);
      flame(g, [q[0] + 5 * k, q[1] + 2], 1.05, step + 2);
      flame(g, [q[0], q[1] - 1], 1.5, step);
    } else {
      flame(g, q, 0.85, step);
    }
    if (reducedMotion) label(g, [q[0], q[1] - (big ? 15 : 10)], ART_TEXT.burning);
  }
}
