// Version 7.0 (Track 0): the tracks' render hooks, called from createUI's frame (src/ui/createUI.js render), as Stage 4.6's (render/s46.js).
// Each calls a function in a track-owned file, so a track fills in its own and never edits this file, createUI or renderer.js:
//   v70Ground(g, world, range, now, motion)              in art px with the art origin set, after Stage 4.6's ground layer (the flood) and under
//                                                        the ground shadows and Stage 3's ambient life: the season's grade (S, render/seasons.js),
//                                                        then a boat's wake (T, render/trade.js)
//   v70Walkers(world, timeDays, range, motion)           figures joined to the walkers and depth-sorted with them: caravans and boats (T)
//   v70Light(g, world, range, frame, now, motion, settings)   renderer.js's light pass, after the sprites and before fire, units, effects and
//                                                        overlays: night's tint and the lamps (S, render/light.js)
// motion is 'full' | 'gentle' | 'still' (motionLevel); now is the real clock (ms); settings is the device's (settings.get()).
import { drawSeasonGround } from './seasons.js';
import { drawTradeGround, tradeWalkers } from './trade.js';
import { drawLight } from './light.js';

export function v70Ground(g, world, range, now, motion) {
  drawSeasonGround(g, world, range, now, motion);
  drawTradeGround(g, world, range, now, motion);
}

export const v70Walkers = (world, timeDays, range, motion) => tradeWalkers(world, timeDays, range, motion);

export function v70Light(g, world, range, frame, now, motion, settings) {
  drawLight(g, world, range, frame, now, motion, settings);
}
