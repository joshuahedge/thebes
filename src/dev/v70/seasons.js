// Version 7.0, Track S's dev scenes (src/dev/v70/index.js joins them): the seasons and the night. Track 0 left minimal worlds; Track S owns
// this file and refines them. Open /?skipTitle=1&nosw=1&seed=11&sample=1 first.
//   v70-season-flood | -growing | -harvest   the sample city moved on to the next day of that season (akhet, peret, shemu)
//   v70-night                                the sample city (Track S: the light loop held at night, lamps lit)
// Every scene takes { quick } (no settling wait).
import { seasonAt } from '../../sim/seasons.js';
import { lightAt } from '../../render/light.js';
import { sampleCity, look, wait } from './base.js';

// The first day from today (within a year) in this season.
function dayIn(world, season) {
  for (let d = world.day; d < world.day + 360; d++) if (seasonAt({ ...world, day: d }).season === season) return d;
  return world.day;
}

const seasonScene = (name, season) => async (api, options = {}) => {
  const world = sampleCity(api, name, options);
  world.day = dayIn(world, season);
  look(api, world.focus.x, world.focus.y, 0.9);
  if (!options.quick) await wait(300);
  const s = seasonAt(world);
  return `${name}: day ${world.day}, ${s.season} (blend ${s.blend})`;
};

export const seasonFloodScene = seasonScene('v70-season-flood', 'akhet');
export const seasonGrowingScene = seasonScene('v70-season-growing', 'peret');
export const seasonHarvestScene = seasonScene('v70-season-harvest', 'shemu');

export async function nightScene(api, options = {}) {
  const world = sampleCity(api, 'v70-night', options);
  look(api, world.focus.x, world.focus.y, 0.9);
  if (!options.quick) await wait(300);
  const l = lightAt(0);
  return `v70-night: light ${l.phase} (dark ${l.dark}), day and night ${api.game().ui.settings.get().dayNight ? 'on' : 'off'}`;
}
