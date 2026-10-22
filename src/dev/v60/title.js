// Version 6.0, Track D1's dev scenes (src/dev/v60/index.js joins them): the title card and the Huge map. Track 0 left minimal ones;
// Track D1 owns this file and refines them.
import { createWorld } from '../../sim/world.js';
import { setGuide } from '../../sim/commands.js';
import { buildSampleCity } from '../sampleCity.js';
import { HUGE_MAP_SIZE } from '../../data/map.js';
import { inGame, look, wait } from './base.js';

const click = (selector) => {
  const node = document.querySelector(selector);
  if (!node) throw new Error(`devScene v60-title: nothing matches ${selector}`);
  node.click();
  return node;
};

// The title card as it stands: its buttons, in order. Open /?nosw=1 (no skipTitle) first. options: size ('small' | 'normal' | 'large' |
// 'huge': chosen on the picker, so a phone shows the Huge note), level ('peaceful' | 'relaxed' | 'normal' | 'hard'), panel ('settings' opens
// the card's Settings panel, 'whatsnew' its What's new), quick (no wait). The text says the buttons, the size chosen and the note under it.
export async function titleScene(api, options = {}) {
  if (api.phase() !== 'title') throw new Error('devScene v60-title: open the title card (/?nosw=1)');
  if (!options.quick) await wait(300);
  if (options.level) click(`#title .choice.difficulty[data-value="${options.level}"]`);
  if (options.size) click(`#title .choice.mapsize[data-value="${options.size}"]`);
  if (options.panel === 'settings') click('#title .title-settings');
  else if (options.panel === 'whatsnew') click('#title .whats-new-button');
  if (!options.quick) await wait(150);
  const buttons = [...document.querySelectorAll('.title-buttons button')].filter((b) => !b.hidden).map((b) => b.textContent.trim());
  const picked = document.querySelector('#title .choice.mapsize[aria-pressed="true"]');
  const note = document.querySelector('#title .size-note');
  return `v60-title: ${buttons.join(' | ')}${picked ? ` | size ${picked.dataset.value}${note && !note.hidden ? ` (${note.textContent})` : ''}` : ''}`;
}

// A new seed-11 city on a Huge (112) map, guide off, the camera pulled out over the start: the sample city's streets laid on the start area (the dev
// cities' layout follows the map's start, so they hold at any size; the bare map when they do not), at the least zoom the screen allows. options:
// seed, zoom, bare (the map alone), quick. The text names the size and seed; the camera's zoom goes in the page's __thebes.cam.
export async function hugeScene(api, options = {}) {
  inGame(api, 'v60-huge');
  const world = createWorld({ seed: options.seed || 11, size: HUGE_MAP_SIZE, mapVariant: 'classic' });
  if (!options.bare) { try { buildSampleCity(world); } catch (e) { /* a half-built sample is still a city on a Huge map */ } }
  setGuide(world, false);
  api.startGame(world, { saveNow: false });
  look(api, world.focus.x, world.focus.y, options.zoom || 0.5);
  if (!options.quick) await wait(300);
  return `v60-huge: ${world.size}x${world.size}, seed ${world.seed}`;
}
