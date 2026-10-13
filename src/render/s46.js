// Stage 4.6 (Track 0): the tracks' render hooks, called from createUI's frame (src/ui/createUI.js render). Each calls a function in a
// track-owned file, so a track fills in its own and never edits this file, createUI or renderer.js:
//   s46Ground(g, world, range, now, motion)   in art px with the art origin set, over the terrain chunks and under the ground
//                                             shadows and Stage 3's ambient life: the River track's flood water (render/flood.js)
//   s46Walkers(world, timeDays, range, motion) figures joined to the walkers and depth-sorted with them: the River track's animals
//                                             (render/wildlife.js), each { id, kind, x, y } with art slot `fig.<kind>` (the River track
//                                             registers those slots in render/art/river.js) and ids from WILDLIFE_ID_BASE up
// The Armies track draws its unit kinds in render/units.js (unitsAt, drawUnitMarks), which it owns; the Wonders track draws its kinds
// and styles in render/monuments.js and art/monuments.js, which it owns. motion is 'full' | 'gentle' | 'still' (motionLevel).
import { drawFlood } from './flood.js';
import { animalsAt } from './wildlife.js';

export function s46Ground(g, world, range, now, motion) {
  drawFlood(g, world, range, now, motion);
}

export const s46Walkers = (world, timeDays, range, motion) => animalsAt(world, timeDays, range, motion);
