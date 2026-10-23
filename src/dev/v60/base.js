// Version 6.0 (Track 0): what the v60 dev scenes share. A scene is async (api, options) => a short description, run through
// window.__thebes.devScene(name, options) (src/dev/scenes.js); api is boot's ({ phase, game, startGame, freshWorld, ... }). Track 0 owns
// this file: a track that needs another helper writes it in its own scene file.
import { buildSampleCity } from '../sampleCity.js';
import { setGuide } from '../../sim/commands.js';
import { inGame, wait } from '../s46/base.js';

export { inGame, wait };

// Opens a new seed-11 sample city (classic, a Capital, guide off) at the given size and returns its world. options: seed, size, gold.
export function sampleCity(api, name, options = {}) {
  inGame(api, name);
  const world = api.freshWorld({ seed: options.seed || 11, variant: 'classic', size: options.size || 64 });
  buildSampleCity(world);
  setGuide(world, false);
  if (Number.isFinite(options.gold)) world.gold = options.gold;
  api.startGame(world, { saveNow: false });
  return world;
}

// Centres the camera on a tile (fractions allowed), at a zoom when one is given.
export function look(api, x, y, zoom = null) {
  const g = api.game();
  g.ui.cameraControl.cancel();
  if (zoom) g.cam.zoom = zoom;
  g.ui.cameraControl.jumpTo(x, y);
}

// The grace over: the new dangers may act from today (a scene shows a danger without waiting three game years).
export function endGrace(world) {
  world.hazards.graceUntil = Math.min(world.hazards.graceUntil, world.day);
}

// The home with the most residents (lowest id on a tie), or null.
export function fullestHome(world) {
  let best = null;
  for (const b of Object.values(world.buildings)) if (b.type === 'house' && b.residents > 0 && (!best || b.residents > best.residents)) best = b;
  return best;
}
