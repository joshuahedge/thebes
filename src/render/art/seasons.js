// Version 7.0, Track S: the seasons' art states (rulings 930-959): the farms' fields by season (looks only: farms work as in 6.0, ruling 851).
// Track 0 (contract, docs/superpowers/notes/2026-10-23-version-7-0-contract.md) left it empty; Track S owns this file (src/render/art/v70.js
// joins it into the registry).
//   SEASON_ART              slot -> art entry (src/render/art/registry.js's shape): `<farm type>.g<stage>.<season>` for every farm (src/render/art/
//                           stages.js FARM_TYPES), stage 0-3 and season akhet, peret, shemu: the farm's own drawing for that stage with the
//                           season's mark over its field tiles (the farmhouse's corner is left clear)
//   seasonSlot(b, world)    the season's slot for a farm, or null to let slotFor go on as before (asked after Track T's); null without a world
//                           (a card's thumbnail shows the plain farm)
import { SERVICE_ART } from './services.js';
import { FARM_TYPES, farmStage } from './stages.js';
import { SEASON_IDS, SEASON_LOOK } from '../../data/seasons.js';
import { seasonAt } from '../../sim/seasons.js';
import { p, hs } from './primitives.js';

// The field's tiles (offsets in the farm's 2x2) a mark may stand on, and how far across each: the farmhouse stands in the near corner of the
// last tile, so that one keeps only its far third.
const FIELD = [[0, 0, 1], [1, 0, 1], [0, 1, 1], [1, 1, 0.38]];

// One mark's place on a field tile: tile (x + i, y + j), the k-th of its marks, inside its allowed share.
const at = (x, y, i, j, k, reach) => p(x + i + 0.12 + hs(x + i, y + j, 80 + k) * 0.76 * reach, y + j + 0.12 + hs(x + i, y + j, 90 + k) * 0.76 * reach);

// Flood: the field stands damp, a shallow pool lying in the furrows, a pale glint on it.
function wet(g, x, y) {
  for (const [i, j, reach] of FIELD) {
    const c = p(x + i + 0.3 + 0.2 * reach, y + j + 0.3 + 0.2 * reach);
    g.ell(c, 6.2 * reach + 1, 2.3 * reach + 0.6, '#5FB6C4', { alpha: 0.42 });
    g.line([c[0] - 2.4, c[1] - 0.2], [c[0] + 1.6, c[1] - 0.2], '#DDF4F1', 0.6, 0.7);
  }
}
// Growing: fresh blades and a few blossoms along the furrows, lighter than the crop.
function green(g, x, y) {
  for (const [i, j, reach] of FIELD) {
    for (let k = 0; k < 5; k++) {
      const q = at(x, y, i, j, k, reach);
      g.line(q, [q[0] + 0.2, q[1] - 2.8], k % 2 ? '#9BD35A' : '#6FB23C', 0.7);
    }
    for (let k = 5; k < 7; k++) { const q = at(x, y, i, j, k, reach); g.circ([q[0], q[1] - 3], 0.75, k % 2 ? '#FFFFFF' : '#F4E48A'); }
  }
}
// Harvest: sheaves bound and stood in the stubble, golden; in an orchard, baskets of fruit on the grass.
function gold(g, x, y, type) {
  for (const [i, j, reach] of FIELD) {
    for (let k = 0; k < 2; k++) {
      const q = at(x, y, i, j, k, reach);
      if (type === 'farm_fig') {
        g.ell([q[0], q[1] - 0.4], 2.6, 1.2, '#7A5A32');
        g.ell([q[0], q[1] - 1.2], 2.1, 0.9, '#6B2F5E');
        g.circ([q[0] - 0.6, q[1] - 1.6], 0.5, '#A0588E');
        continue;
      }
      g.poly([[q[0] - 2.2, q[1] + 0.6], [q[0] + 2.2, q[1] + 0.6], [q[0] + 0.5, q[1] - 5], [q[0] - 0.4, q[1] - 5]], '#E3B94A', { outline: true });
      g.line([q[0] - 1.6, q[1] - 1.4], [q[0] + 1.6, q[1] - 1.4], '#9A6A22', 0.6);
      g.line([q[0] - 0.4, q[1] - 5], [q[0] - 1.4, q[1] - 6.2], '#F6D46A', 0.6);
      g.line([q[0] + 0.5, q[1] - 5], [q[0] + 1.4, q[1] - 6.2], '#F6D46A', 0.6);
    }
  }
}
const FIELD_MARKS = { wet, green, gold };

export const SEASON_ART = {};
for (const type of FARM_TYPES) {
  for (let stage = 0; stage < 4; stage++) {
    const base = SERVICE_ART[`${type}.g${stage}`];
    for (const season of SEASON_IDS) {
      const mark = FIELD_MARKS[SEASON_LOOK[season].fields];
      // A fallow field (stage 0) only holds the flood's water; it has nothing to show of the crop's seasons.
      const draws = stage === 0 && mark !== wet ? base.draw : (g, x, y) => { base.draw(g, x, y); mark(g, x, y, type); };
      SEASON_ART[`${type}.g${stage}.${season}`] = { ...base, draw: draws };
    }
  }
}

export function seasonSlot(b, world) {
  if (!world || !FARM_TYPES.includes(b.type)) return null;
  return `${b.type}.g${farmStage(world, b)}.${seasonAt(world).season}`;
}
