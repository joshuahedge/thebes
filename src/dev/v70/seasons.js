// Version 7.0, Track S's dev scenes (src/dev/v70/index.js joins them): the seasons and the night. Track 0 left minimal worlds; Track S owns
// this file and refines them. Open /?skipTitle=1&nosw=1&seed=11&sample=1 first.
//   v70-season-flood | -growing | -harvest   the sample city moved on to the middle of a month of that season (akhet, peret, shemu), paused so the
//                                            day holds; options.turning: the middle of the season's last month instead, the land half turned
//                                            to the next season (the blend at 0.5)
//   v70-night                                the sample city paused with the light loop held at the middle of the night, lamps lit; options.phase
//                                            'dusk' | 'dawn' | 'day' holds that phase instead (dusk: early, the golden hour)
// Every scene takes { quick } (no settling wait).
import { seasonAt } from '../../sim/seasons.js';
import { setSpeed } from '../../sim/commands.js';
import { SEASONS } from '../../data/tips.js';
import { DAYS_PER_MONTH, MONTHS_PER_YEAR } from '../../sim/time.js';
import { LIGHT } from '../../data/seasons.js';
import { lightAt, lightOn, setLightClock } from '../../render/light.js';
import { sampleCity, look, wait } from './base.js';

// A day from today on (never back in time) in a month of this season: the middle of its first month that is not its last (the land is wholly the
// season's, blend 0), or with `turning` the middle of its last (the blend 0.5).
export function dayIn(world, season, turning = false) {
  const year = Math.floor(world.day / (DAYS_PER_MONTH * MONTHS_PER_YEAR)) * DAYS_PER_MONTH * MONTHS_PER_YEAR;
  for (let y = 0; y < 2; y++) {
    for (let m = 0; m < MONTHS_PER_YEAR; m++) {
      const last = SEASONS[m] === season && SEASONS[(m + 1) % MONTHS_PER_YEAR] !== season;
      if (SEASONS[m] !== season || last !== turning) continue;
      const day = year + y * DAYS_PER_MONTH * MONTHS_PER_YEAR + m * DAYS_PER_MONTH + DAYS_PER_MONTH / 2;
      if (day >= world.day) return day;
    }
  }
  return world.day;
}

const seasonScene = (name, season) => async (api, options = {}) => {
  const world = sampleCity(api, name, options);
  world.day = dayIn(world, season, Boolean(options.turning));
  setSpeed(world, 0);
  look(api, world.focus.x, world.focus.y, 0.9);
  if (!options.quick) await wait(300);
  const s = seasonAt(world);
  return `${name}: day ${world.day}, ${s.season} (blend ${s.blend})`;
};

export const seasonFloodScene = seasonScene('v70-season-flood', 'akhet');
export const seasonGrowingScene = seasonScene('v70-season-growing', 'peret');
export const seasonHarvestScene = seasonScene('v70-season-harvest', 'shemu');

// Where in the loop (ms) each phase is held: the night's middle, the golden hour early in dusk, the dawn partway through.
const HELD = {
  day: 0.25,
  dusk: LIGHT.day + LIGHT.dusk * 0.4,
  night: LIGHT.day + LIGHT.dusk + LIGHT.night / 2,
  dawn: LIGHT.day + LIGHT.dusk + LIGHT.night + LIGHT.dawn * 0.55,
};

export async function nightScene(api, options = {}) {
  const world = sampleCity(api, 'v70-night', options);
  const phase = HELD[options.phase] !== undefined ? options.phase : 'night';
  setSpeed(world, 0);                                       // the loop holds while the game is paused
  const at = HELD[phase] * LIGHT.cycleMs;
  setLightClock(world, at, 0);
  look(api, world.focus.x, world.focus.y, 0.9);
  if (!options.quick) await wait(300);
  const l = lightAt(at), settings = api.game().ui.settings;
  const on = lightOn(settings.motionLevel(), settings.get());
  return `v70-night: light ${l.phase} (dark ${Math.round(l.dark * 100) / 100}), lamps ${Math.round(l.lamps * 100) / 100}, day and night ${settings.get().dayNight ? 'on' : 'off'}${on ? '' : ' (not shown: Still or off)'}`;
}
