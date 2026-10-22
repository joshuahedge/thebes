// Version 6.0, Track D1's dev scenes (src/dev/v60/index.js joins them): the title card and the Huge map. Track 0 left minimal ones;
// Track D1 owns this file and refines them.
import { createWorld } from '../../sim/world.js';
import { setGuide } from '../../sim/commands.js';
import { HUGE_MAP_SIZE } from '../../data/map.js';
import { inGame, look, wait } from './base.js';

// The title card as it stands: its buttons, in order. Open /?nosw=1 (no skipTitle) first.
export async function titleScene(api, options = {}) {
  if (api.phase() !== 'title') throw new Error('devScene v60-title: open the title card (/?nosw=1)');
  if (!options.quick) await wait(300);
  const buttons = [...document.querySelectorAll('.title-buttons > button')].map((b) => b.textContent.trim());
  return `v60-title: ${buttons.join(' | ')}`;
}

// A new seed-11 city on a Huge (112) map, guide off, the camera pulled out over the start. The size is not offered on the title yet
// (MAP_SIZE_TABLE), so the world is made here directly. options: seed, zoom, quick.
export async function hugeScene(api, options = {}) {
  inGame(api, 'v60-huge');
  const world = createWorld({ seed: options.seed || 11, size: HUGE_MAP_SIZE, mapVariant: 'classic' });
  setGuide(world, false);
  api.startGame(world, { saveNow: false });
  look(api, world.focus.x, world.focus.y, options.zoom || 0.5);
  if (!options.quick) await wait(300);
  return `v60-huge: ${world.size}x${world.size}, seed ${world.seed}`;
}
