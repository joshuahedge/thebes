// Stage 4 placeholder art (contract, Track 0): one plain slot for every Stage 4 building, so cards, thumbnails, the
// sprite cache and the renderer have something to show until Track B replaces them. STUB. Track B keeps every slot
// name and its { w, d } (a 2x2 stays 2x2), and may move the slots to art/industry.js, art/monuments.js, art/plaza.js and
// art/palace.js (registry.js imports them).
//   builders_guild, quarry, brickworks, plaza, sphinx   sprite slots like any building's
//   palace.s0 .. palace.s4                              one sprite per style (slotFor reads b.style); 'palace' is the card's
//   obelisk_small .. pyramid_great                      live: true. The renderer never caches these: in the depth-sorted pass
//                                                      it calls opts.live(g, o) (src/render/monuments.js drawMonument) with
//                                                      the art origin set; `draw` is only for the card's thumbnail.
import { box } from './primitives.js';
import { WASH, MUD, STONE } from './palette.js';
import { boundsFor } from '../iso.js';
import { MONUMENT_KINDS, MONUMENTS } from '../../data/monuments.js';
import { PALACE_STYLES } from '../../data/palace.js';

const slot = (w, d, height, draw, extra = {}) => ({ w, d, height, bounds: boundsFor(w, d, height), shadows: [[0.1, 0.1, w - 0.2, d - 0.2, Math.min(height, 12)]], draw, ...extra });
const block = (C, h, inset = 0.12) => (w, d) => (g, x, y) => box(g, x + inset, y + inset, w - 2 * inset, d - 2 * inset, h, 0, C);

// A stepped stack, one box a step, narrowing as it rises: the placeholder for every monument.
const stack = (w, d, steps, stepH, C) => (g, x, y) => {
  for (let i = 0; i < steps; i++) {
    const k = Math.min(w, d) * 0.4 * (i / steps);
    box(g, x + 0.08 + k, y + 0.08 + k, w - 0.16 - 2 * k, d - 0.16 - 2 * k, stepH, i * stepH, C);
  }
};

export const STAGE4_ART = {
  builders_guild: slot(2, 2, 14, block(WASH, 14)(2, 2)),
  quarry: slot(2, 2, 8, block(STONE, 8)(2, 2)),
  brickworks: slot(2, 2, 12, block(MUD, 12)(2, 2)),
  plaza: { w: 1, d: 1, height: 1, bounds: boundsFor(1, 1, 1), shadows: [], draw: block(STONE, 1, 0)(1, 1) },
  sphinx: slot(1, 1, 10, block(MUD, 10, 0.2)(1, 1)),
  palace: slot(3, 3, 18, block(WASH, 18)(3, 3)),
};
PALACE_STYLES.forEach((s, i) => { STAGE4_ART[`palace.s${i}`] = slot(3, 3, 14 + 4 * i, block(i >= 3 ? STONE : WASH, 14 + 4 * i)(3, 3)); });
for (const k of MONUMENT_KINDS) {
  const m = MONUMENTS[k];
  const h = Math.max(24, 10 * Math.min(m.w, m.d));
  // A rotated mastaba is drawn from b.w and b.d by the live draw; the slot keeps the data's footprint.
  STAGE4_ART[k] = slot(m.w, m.d, h, stack(m.w, m.d, Math.min(m.courses.length, 6), h / Math.min(m.courses.length, 6), k.startsWith('obelisk') ? STONE : WASH), { live: true });
}
