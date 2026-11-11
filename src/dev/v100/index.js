// Version 10.0 (Track 0, ruling 2103): the life scenes, for the before-and-after shots (tools/shots.ps1 -V100) and Track L's work. Each is one
// call to window.__thebes.devScene('<name>', options) (src/dev/scenes.js) and returns a short description starting with its name. Track 0 sets
// the stage; Track L fills it (the storm itself, the crowds). Every scene holds the game paused, so the light and the moment hold for the shot.
//   bazaar-crowd    the sample city (open /?skipTitle=1&nosw=1&seed=11&sample=1) with its first bazaar staffed and stocked with food, in the middle
//                   of the view at zoom 1.5 (options.zoom), at noon on the light loop
//   night-town      the same at the middle of the night phase
//   storm           the stress city (open /?skipTitle=1&nosw=1&stress=1) on a day in Shemu of its second year (storms never come in the first),
//                   at noon, the camera on its middle; Track L forces the storm on (weather.stormAt)
//   wharf           the Stage 4.6 wharf scene (s46-wharf: a staffed fishing wharf, its boat out) at zoom 1.5 (options.zoom)
//   festival-crowd  the 7.0 festival scene (v70-festival: the Festival of Opet offered), its card shut (options.open) so the town shows
//   fresh-corner    a fresh classic city (open /?skipTitle=1&nosw=1&seed=11) at its start camera, as a new player first sees it
import { allBuildings } from '../../sim/world.js';
import { BUILDINGS } from '../../data/buildings.js';
import { LIGHT } from '../../data/seasons.js';
import { SEASONS } from '../../data/tips.js';
import { DAYS_PER_MONTH, MONTHS_PER_YEAR } from '../../sim/time.js';
import { setLightClock } from '../../render/light.js';
import { festivalScene } from '../v70/cityEvents.js';
import { S46_SCENES } from '../s46/index.js';
import { inGame, wait } from '../s46/base.js';
import { look } from '../v60/base.js';

export const VERSION100_SCENES = ['bazaar-crowd', 'night-town', 'storm', 'wharf', 'festival-crowd', 'fresh-corner'];

// The light loop's clock (ms into the cycle) at noon (the middle of the day phase) and at the middle of the night.
export const NOON_MS = LIGHT.cycleMs * (LIGHT.day / 2);
export const NIGHT_MS = LIGHT.cycleMs * (LIGHT.day + LIGHT.dusk + LIGHT.night / 2);
const YEAR_DAYS = DAYS_PER_MONTH * MONTHS_PER_YEAR;
const SHEMU_MONTH = SEASONS.findIndex((s, m) => s === 'shemu' && SEASONS[(m + MONTHS_PER_YEAR - 1) % MONTHS_PER_YEAR] !== 'shemu');

// Paused, the light loop held at ms (lightClock does not advance while the game is paused).
function hold(world, ms) {
  world.speed = 0;
  setLightClock(world, ms);
}

async function bazaarAt(api, name, ms, options) {
  const g = inGame(api, name), { world } = g;
  const b = allBuildings(world).filter((x) => x.type === 'bazaar').sort((p, q) => p.id - q.id)[0];
  if (!b) throw new Error(`devScene ${name}: the city has no bazaar (open /?skipTitle=1&nosw=1&seed=11&sample=1)`);
  b.staff = BUILDINGS.bazaar.workers; b.paused = false; b.blocked = null;
  for (const food of ['grain', 'figs']) b.store[food] = Math.max(b.store[food] || 0, 120);
  hold(world, ms);
  g.ui.refresh();
  look(api, b.x + b.w / 2, b.y + b.d / 2, options.zoom || 1.5);
  if (!options.quick) await wait(300);
  return `${name}: bazaar ${b.id} at ${b.x},${b.y}, staff ${b.staff}, grain ${b.store.grain}, light ${Math.round(ms)} ms`;
}

async function storm(api, options = {}) {
  const g = inGame(api, 'storm'), { world } = g;
  const year = Math.max(1, Math.floor(world.day / YEAR_DAYS));
  let day = year * YEAR_DAYS + SHEMU_MONTH * DAYS_PER_MONTH + 10;
  if (day < world.day) day += YEAR_DAYS;
  world.day = day;
  hold(world, NOON_MS);
  g.ui.refresh();
  look(api, world.size / 2, world.size / 2, options.zoom || 1);
  if (!options.quick) await wait(300);
  return `storm: day ${world.day} (year ${Math.floor(world.day / YEAR_DAYS) + 1}, Shemu), noon; the storm is Track L's`;
}

async function wharf(api, options = {}) {
  const said = await S46_SCENES['s46-wharf'](api, options);
  const g = api.game();
  g.cam.zoom = options.zoom || 1.5;
  if (!options.quick) await wait(300);
  return `wharf: ${said}, zoom ${g.cam.zoom}`;
}

async function festivalCrowd(api, options = {}) {
  const said = await festivalScene(api, { open: false, ...options });
  return `festival-crowd: ${said}`;
}

async function freshCorner(api, options = {}) {
  const g = inGame(api, 'fresh-corner');
  if (!options.quick) await wait(300);
  return `fresh-corner: start camera ${g.cam.x.toFixed(1)},${g.cam.y.toFixed(1)} zoom ${g.cam.zoom}`;
}

export const V100_SCENE_FNS = {
  'bazaar-crowd': (api, options = {}) => bazaarAt(api, 'bazaar-crowd', NOON_MS, options),
  'night-town': (api, options = {}) => bazaarAt(api, 'night-town', NIGHT_MS, options),
  storm,
  wharf,
  'festival-crowd': festivalCrowd,
  'fresh-corner': freshCorner,
};
