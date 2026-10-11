// Every art slot the renderer and sprite cache can draw. An entry is
//   { w, d, height, bounds: [left, top, right, bottom], shadows: [[dx, dy, w, d, h], ...], draw(g, x, y) }
// with the footprint in tiles, height and bounds in art px relative to p(x, y) of the footprint origin,
// and shadows as ground-shadow blocks relative to the origin tile. A slot can later point at a PNG by
// replacing `draw` with `png: { src, ax, ay, scale }` (see spriteCache.js); nothing else changes.
import { HOUSE_ART } from './housing.js';
import { SERVICE_ART } from './services.js';
import { NATURE_ART } from './nature.js';
import { FIGURE_ART } from './figures.js';
import { granaryStage, bazaarStage, farmStage } from './stages.js';

export { boundsFor } from '../iso.js';

export const ART = { ...HOUSE_ART, ...SERVICE_ART, ...NATURE_ART, ...FIGURE_ART };

// The art slot a building shows: houses by tier, granaries and bazaars by how full they are (stages.js), and
// grain farms by their crop's growth, which runs on the game day, so a farm needs the world (without one,
// the plain 'farm_grain' slot). Everything else is its type.
export function slotFor(b, world = null) {
  if (b.type === 'house') return `house.t${b.tier}`;
  if (b.type === 'granary') return `granary.s${granaryStage(b)}`;
  if (b.type === 'bazaar') return `bazaar.s${bazaarStage(b)}`;
  if (b.type === 'farm_grain') return world ? `farm_grain.g${farmStage(world, b)}` : 'farm_grain';
  return b.type;
}
