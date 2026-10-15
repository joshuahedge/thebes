// Stage 4.7 Task 2: the dev scenes for the green band and the oases (src/dev/s47/index.js joins them). Each opens a fresh map with new land
// (any layout and size but classic at 64), optionally with the sample city on it, and puts the camera where the band or an oasis shows.
// options: seed (default 11), variant (default 'east'), size (default 64), zoom (default 1: the phone's default), at ('start' | 'river' | 'oasis' | 'whole'),
// city (default true: the sample city's houses and farms, so the shot shows the band beside real play).
import { buildSampleCity } from '../sampleCity.js';
import { setGuide, place } from '../../sim/commands.js';
import { T, buildable } from '../../sim/terrain.js';
import { idx, inBounds } from '../../sim/grid.js';
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
  const hill = (world.mapParams.hills || [])[o.hill || 0];
  let at = o.at === 'oasis' && world.oases.length ? { x: world.oases[0].x, y: world.oases[0].y } : o.at === 'hills' && hill ? { x: hill.x, y: hill.y } : null;
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

// Stage 4.7 Task 3: hills with their rocky skirt. options as above, plus hill (which cluster, default the first), at ('hills' | 'start' | 'whole'), and
// chrome (false: screenshot mode, the map without the bars), beside (default true): a well, a house and a granary on open ground just in front of the cluster, so the shot shows buildings and a walker's
// ground drawn at their own depth against the hill (a building in front of a hill covers it, one behind it is covered).
export const hillsScene = async (api, options = {}) => {
  const { world, o } = await open(api, 's47-hills', options, { at: 'hills', zoom: 1.4, city: false, seed: 11, variant: 'east' });
  const hill = (world.mapParams.hills || [])[o.hill || 0];
  let beside = 0;
  const why = [];
  if (hill && o.beside !== false) {
    world.gold = Math.max(world.gold, 5000);   // a fixture: the shot is of the ground, not of the treasury
    // open ground in front of the cluster (+x, +y is towards the viewer), nearest first
    const free = (x, y, w, d) => { for (let j = 0; j < d; j++) for (let i = 0; i < w; i++) { if (!inBounds(world.size, x + i, y + j) || !buildable(world, idx(world.size, x + i, y + j)) || world.occ[idx(world.size, x + i, y + j)] || world.terrain[idx(world.size, x + i, y + j)] === T.CLAY) return false; } return true; };
    for (const [type, w, d] of [['house', 1, 1], ['well', 1, 1], ['granary', 2, 2]]) {
      let best = null;
      for (let y = hill.y - 4; y <= hill.y + 9; y++) for (let x = hill.x - 4; x <= hill.x + 9; x++) {
        if (!free(x, y, w, d)) continue;
        const score = Math.hypot(x - (hill.x + 2.5), y - (hill.y + 2.5)) + (beside ? 0 : 0);
        if (!best || score < best.score) best = { x, y, score };
      }
      const r = best ? place(world, type, best.x, best.y, { roadLater: true }) : { ok: false, reason: 'no room' };
      if (r.ok) beside++; else why.push(`${type}: ${r.reason}`);
    }
    await wait(300);
  }
  if (o.chrome === false) api.game().ui.screenshotMode();   // the map alone, for a whole-map shot
  return `s47-hills: ${o.variant} ${world.size} seed ${o.seed}, hills ${JSON.stringify(world.mapParams.hills || [])}, ${beside} buildings beside${why.length ? ` (${why.join(', ')})` : ''}, zoom ${o.zoom}`;
};

export const oasisScene = async (api, options = {}) => {
  const { world, o } = await open(api, 's47-oasis', options, { at: 'oasis', zoom: 1.4, city: false });
  return `s47-oasis: ${o.variant} ${world.size} seed ${o.seed}, oases ${JSON.stringify(world.oases)}, zoom ${o.zoom}`;
};
