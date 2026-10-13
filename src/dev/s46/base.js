// Stage 4.6 (Track 0): what the tracks' dev scenes share. A scene is async (api, options) => a short description, run through
// window.__thebes.devScene(name, options) (src/dev/scenes.js); api is boot's ({ phase, game, startGame, freshWorld, hooks, ... }).
import { buildSampleCity } from '../sampleCity.js';
import { setGuide } from '../../sim/commands.js';

export const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export function inGame(api, name) {
  const g = api.game();
  if (!g) throw new Error(`devScene ${name}: no city is open (use ?skipTitle=1&nosw=1&seed=11&sample=1)`);
  return g;
}

// A stub for a scene its track has not filled in yet: the open city as it is, said plainly so a shot is never mistaken for the real one.
export const stub = (name) => async (api) => { inGame(api, name); await wait(100); return `stub ${name}: the track fills this scene in`; };

// Opens a new seed-11 sample city (classic) at the given map size, guide off, the camera pulled out over the whole map (the zoom goes
// below the buttons' minimum, as the 'variant' scene's does), and returns its world. options: seed, variant, zoom.
export async function sampleAt(api, size, options = {}) {
  const world = api.freshWorld({ seed: options.seed || 11, variant: options.variant || 'classic', size });
  buildSampleCity(world);
  setGuide(world, false);
  api.startGame(world, { saveNow: false });
  const g = api.game();
  const c = g.ui.cameraControl.centre();
  g.ui.cameraControl.cancel();
  g.cam.zoom = options.zoom || Math.min(0.5, (c.x * 2 * 0.94) / (world.size * 64));
  g.ui.cameraControl.jumpTo(world.size / 2, world.size / 2);
  await wait(300);
  return world;
}
