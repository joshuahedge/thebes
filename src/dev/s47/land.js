// Stage 4.7 Task 2: the dev scenes for the green band and the oases (src/dev/s47/index.js joins them). Each opens a fresh map with new land
// (any layout and size but classic at 64), optionally with the sample city on it, and puts the camera where the band or an oasis shows.
// options: seed (default 11), variant (default 'east'), size (default 64), zoom (default 1: the phone's default), at ('start' | 'river' | 'oasis' | 'whole'),
// city (default true: the sample city's houses and farms, so the shot shows the band beside real play).
import { buildSampleCity } from '../sampleCity.js';
import { setGuide } from '../../sim/commands.js';
import { wait, inGame } from '../s46/base.js';

async function open(api, name, options, defaults) {
  inGame(api, name);
  const o = { seed: 11, variant: 'east', size: 64, zoom: 1, city: true, ...defaults, ...options };
  const world = api.freshWorld({ seed: o.seed, variant: o.variant, size: o.size });
  if (o.city) buildSampleCity(world);
  setGuide(world, false);
  api.startGame(world, { saveNow: false });
  const g = api.game();
  g.ui.cameraControl.cancel();
  let at = o.at === 'oasis' && world.oases.length ? { x: world.oases[0].x, y: world.oases[0].y } : null;
  if (o.at === 'whole') {
    g.cam.zoom = Math.min(0.5, (g.ui.cameraControl.centre().x * 2 * 0.94) / (world.size * 64));
    at = { x: world.size / 2, y: world.size / 2 };
  } else g.cam.zoom = o.zoom;
  if (!at) at = o.at === 'river' ? { x: world.focus.x, y: world.focus.y - 10 } : { x: world.focus.x, y: world.focus.y - 4 };
  g.ui.cameraControl.jumpTo(at.x, at.y);
  await wait(400);
  return { world, o };
}

export const grassScene = async (api, options = {}) => {
  const { world, o } = await open(api, 's47-grass', options, { at: 'river' });
  return `s47-grass: ${o.variant} ${world.size} seed ${o.seed}, land ${world.mapParams.land || 0}, ${world.oases.length} oases, zoom ${o.zoom}`;
};

export const oasisScene = async (api, options = {}) => {
  const { world, o } = await open(api, 's47-oasis', options, { at: 'oasis', zoom: 1.4, city: false });
  return `s47-oasis: ${o.variant} ${world.size} seed ${o.seed}, oases ${JSON.stringify(world.oases)}, zoom ${o.zoom}`;
};
