// Version 5.0 Task 3: the dev scene for the three new layers (src/dev/v50/index.js joins it). Opens the seed-11 sample city (a Capital: every layer is offered) with one layer on and
// the camera over the homes. options:
//   layer     'progress' (default), 'supply' or 'workers'
//   good      for supply: 'pottery' (default), 'beer', 'linen', 'jewellery' or 'food'
//   workers   for workers: 'jobless' (the sample city as it is: more people than jobs, so the districts are shaded) or 'short' (half the residents leave and the labour
//             is shared out again, so workplaces are short of staff)
//   motion    'gentle' | 'full' | 'still' (the Motion setting; headless Edge shows Gentle)
//   zoom      the map zoom (default 0.9), size (64), seed (11), variant ('classic'), quick (no settling wait: the mobile budget test)
import { buildSampleCity } from '../sampleCity.js';
import { setGuide } from '../../sim/commands.js';
import { assignLabour } from '../../sim/labour.js';
import { housesOf } from '../../sim/world.js';
import { wait, inGame } from '../s46/base.js';

export const layersScene = async (api, options = {}) => {
  inGame(api, 'v50-layers');
  const o = { seed: 11, variant: 'classic', size: 64, layer: 'progress', good: 'pottery', workers: 'jobless', motion: null, zoom: 0.9, ...options };
  const world = api.freshWorld({ seed: o.seed, variant: o.variant, size: o.size });
  buildSampleCity(world);
  setGuide(world, false);
  if (o.layer === 'workers' && o.workers === 'short') {
    for (const h of housesOf(world)) h.residents = Math.floor(h.residents / 2);
    assignLabour(world);
  }
  api.startGame(world, { saveNow: false });
  const g = api.game();
  if (o.motion) g.ui.settings.set({ motion: o.motion });
  g.ui.store.set({ overlay: o.layer, supplyGood: o.good });
  const homes = housesOf(world);
  const mid = homes.length ? { x: homes.reduce((s, h) => s + h.x, 0) / homes.length, y: homes.reduce((s, h) => s + h.y, 0) / homes.length } : world.focus;
  g.ui.cameraControl.cancel();
  g.cam.zoom = o.zoom;
  g.ui.cameraControl.jumpTo(mid.x, mid.y);
  if (!o.quick) await wait(400);
  g.ui.refresh();
  return `v50-layers: ${o.variant} ${world.size} seed ${o.seed}, layer ${o.layer}${o.layer === 'supply' ? ` (${o.good})` : o.layer === 'workers' ? ` (${o.workers})` : ''}, ${homes.length} homes, labour ${world.labour.employed}/${world.labour.jobs} jobs for ${world.labour.workforce} workers, zoom ${o.zoom}`;
};
