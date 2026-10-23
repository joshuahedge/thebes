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
import { S46_ART, s46Slot } from './s46.js';
import { S47_ART } from './s47.js';
import { V70_ART, v70Slot } from './v70.js';

export { boundsFor } from '../iso.js';

export const ART = {
  ...HOUSE_ART, ...SERVICE_ART, ...INDUSTRY_ART, ...NATURE_ART, ...FIGURE_ART, ...DEFENCE_ART,
  ...SUPPLY_ART, ...PLAZA_ART, ...PALACE_ART, ...MONUMENT_ART,
  ...S46_ART,                                         // Stage 4.6: the River and Armies tracks' buildings and figures (art/s46.js)
  ...S47_ART,                                         // Stage 4.7: the carts (art/s47.js)
  ...V70_ART,                                         // Version 7.0: Track T's Quay, boats and caravans, Track S's season states (art/v70.js)
};

// The art slot a building shows: houses by tier, granaries, storehouses and bazaars by how full they are
// (stages.js), and farms by their crop's growth, which runs on the game day, so a farm needs the world (without
// one, its plain type slot). Rubble picks one of its heaps by id, so a burned 2x2 shows four different heaps.
// Stage 4 (Track B): the palace by its style, with scaffolding while it is enlarged (b.works); a builders' guild, quarry
// or brickworks nobody works at shows its idle look (supply.js supplySlot), the brickworks by its drying rows; a plaza by
// which of its neighbours are plazas (plaza.js plazaEdges) and a sphinx by the way it faces (sphinxFacing), both of which
// need the world (without one, their plain slots). Everything else is its type.
export function slotFor(b, world = null) {
  const s46 = s46Slot(b, world);                       // Stage 4.6: a River or Armies building's own slot (art/s46.js), else on as before
  if (s46) return s46;
  const v70 = v70Slot(b, world);                       // Version 7.0: a Track T building's or a season's own slot (art/v70.js), else on as before
  if (v70) return v70;
  if (b.type === 'house') return b.large === true && b.tier === 0 ? 'house.lot' : `house.t${b.tier}`;   // Version 6.0 (Track C): an empty Large plot is drawn as a marked lot
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
