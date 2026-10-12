// Every art slot the renderer and sprite cache can draw. An entry is
//   { w, d, height, bounds: [left, top, right, bottom], shadows: [[dx, dy, w, d, h], ...], draw(g, x, y) }
// with the footprint in tiles, height and bounds in art px relative to p(x, y) of the footprint origin,
// and shadows as ground-shadow blocks relative to the origin tile. A slot can later point at a PNG by
// replacing `draw` with `png: { src, ax, ay, scale }` (see spriteCache.js); nothing else changes.
import { HOUSE_ART } from './housing.js';
import { SERVICE_ART } from './services.js';
import { INDUSTRY_ART } from './industry.js';
import { NATURE_ART } from './nature.js';
import { FIGURE_ART } from './figures.js';
import { DEFENCE_ART, RUBBLE_VARIANTS } from './defence.js';
import { MONUMENT_ART } from './monuments.js';
import { SUPPLY_ART, SUPPLY_TYPES, supplySlot } from './supply.js';
import { PLAZA_ART, plazaEdges, sphinxFacing } from './plaza.js';
import { PALACE_ART } from './palace.js';
import { granaryStage, storehouseStage, bazaarStage, farmStage, FARM_TYPES } from './stages.js';

export { boundsFor } from '../iso.js';

export const ART = {
  ...HOUSE_ART, ...SERVICE_ART, ...INDUSTRY_ART, ...NATURE_ART, ...FIGURE_ART, ...DEFENCE_ART,
  ...SUPPLY_ART, ...PLAZA_ART, ...PALACE_ART, ...MONUMENT_ART,
};

// The art slot a building shows: houses by tier, granaries, storehouses and bazaars by how full they are
// (stages.js), and farms by their crop's growth, which runs on the game day, so a farm needs the world (without
// one, its plain type slot). Rubble picks one of its heaps by id, so a burned 2x2 shows four different heaps.
// Stage 4 (Track B): the palace by its style, with scaffolding while it is enlarged (b.works); a builders' guild, quarry
// or brickworks nobody works at shows its idle look (supply.js supplySlot), the brickworks by its drying rows; a plaza by
// which of its neighbours are plazas (plaza.js plazaEdges) and a sphinx by the way it faces (sphinxFacing), both of which
// need the world (without one, their plain slots). Everything else is its type.
export function slotFor(b, world = null) {
  if (b.type === 'house') return `house.t${b.tier}`;
  if (b.type === 'palace') return `palace.s${b.style || 0}${b.works ? '.w' : ''}`;   // spec 4.20; live monuments are their type
  if (SUPPLY_TYPES.includes(b.type)) return supplySlot(b);
  if (b.type === 'plaza') return world ? `plaza.e${plazaEdges(world, b)}` : 'plaza';
  if (b.type === 'sphinx') return world ? `sphinx.f${sphinxFacing(world, b)}` : 'sphinx';
  if (b.type === 'rubble') return `rubble.v${b.id % RUBBLE_VARIANTS}`;
  if (b.type === 'granary') return `granary.s${granaryStage(b)}`;
  if (b.type === 'storehouse') return `storehouse.s${storehouseStage(b)}`;
  if (b.type === 'bazaar') return `bazaar.s${bazaarStage(b)}`;
  if (FARM_TYPES.includes(b.type)) return world ? `${b.type}.g${farmStage(world, b)}` : b.type;
  return b.type;
}
