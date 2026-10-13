// Stage 4.6, the Map track's dev scenes (Track 0 made them; the Map track owns this file and fills in the stubs).
//   s46-sizes-small / -normal / -large  a seed-11 sample city at 48, 64 and 80, the whole map in view (works now)
//   s46-clay     a clay pit picked: Ground on, the ghost on the nearest spot that fits (stub)
//   s46-bridge   the road tool meeting water: the bridge's cost in the bar, the guidance row's tip (stub)
import { MAP_SIZES } from '../../data/map.js';
import { sampleAt, stub } from './base.js';

const sizeScene = (id) => async (api, options = {}) => {
  const world = await sampleAt(api, MAP_SIZES[id], options);
  return `size ${id} ${world.size}x${world.size} buildings ${Object.keys(world.buildings).length}`;
};

export const MAP_SCENES = {
  's46-sizes-small': sizeScene('small'),
  's46-sizes-normal': sizeScene('normal'),
  's46-sizes-large': sizeScene('large'),
  's46-clay': stub('s46-clay'),
  's46-bridge': stub('s46-bridge'),
};
