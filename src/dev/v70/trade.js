// Version 7.0, Track T's dev scenes (src/dev/v70/index.js joins them): trade and the Quay. Track 0 left minimal worlds (the seed-11 sample
// Capital, the camera placed); Track T owns this file and refines them. Open /?skipTitle=1&nosw=1&seed=11&sample=1 first.
//   v70-trade   the Trade sheet over the sample city's routes (Track T: open it, with Nubia open)
//   v70-quay    the river bank by the city, where a Quay goes (Track T: a Quay standing, its sheet open)
//   v70-boat    the river by the city (Track T: a boat sailing in to the Quay, Motion Full)
// Every scene takes { quick } (no settling wait).
import { PARTNERS } from '../../data/trade.js';
import { sampleCity, look, wait, waterNear } from './base.js';

const routesSaid = (world) => {
  const open = Object.keys(PARTNERS).filter((id) => world.trade.routes[id]);
  return open.length ? open.join(', ') : 'none';
};

export async function tradeScene(api, options = {}) {
  const world = sampleCity(api, 'v70-trade', options);
  look(api, world.focus.x, world.focus.y, 0.9);
  if (!options.quick) await wait(300);
  return `v70-trade: ${world.milestone}, routes open ${routesSaid(world)}`;
}

async function riverScene(api, name, options) {
  const world = sampleCity(api, name, options);
  const w = waterNear(world, world.focus.x, world.focus.y);
  if (w) look(api, w.x + 0.5, w.y + 0.5, 1.2);
  if (!options.quick) await wait(300);
  return `${name}: river at ${w ? `${w.x},${w.y}` : 'none'}`;
}

export const quayScene = (api, options = {}) => riverScene(api, 'v70-quay', options);
export const boatScene = (api, options = {}) => riverScene(api, 'v70-boat', options);
