// Version 6.0, Track A's dev scenes (src/dev/v60/index.js joins them): the court's demands and the great work. Track 0 left minimal
// worlds; Track A owns this file and refines them. Open /?skipTitle=1&nosw=1&seed=11&sample=1 first.
import { courtDemands, greatWorkOf } from '../../sim/demands.js';
import { sampleCity, look, wait } from './base.js';

// The seed-11 sample city (a Capital) with one demand offered and not yet accepted: 400 linen within 12 months. options: gold, quick.
export async function demandScene(api, options = {}) {
  const world = sampleCity(api, 'v60-demand', options);
  const d = world.demands;
  d.open.push({ id: d.nextId++, kind: 'goods', good: 'linen', amount: 400, day: world.day, due: world.day + 12 * 30, accepted: false });
  look(api, world.focus.x, world.focus.y, 0.9);
  if (!options.quick) await wait(300);
  const open = courtDemands(world)[0];
  return `v60-demand: demand ${open.id} (${open.kind}, ${open.amount} ${open.good}, ${open.monthsLeft} months left, ${open.accepted ? 'accepted' : 'offered'})`;
}

// The seed-11 sample city (a Capital), no great work founded yet. options: gold, quick.
export async function greatWorkScene(api, options = {}) {
  const world = sampleCity(api, 'v60-greatwork', options);
  look(api, world.focus.x, world.focus.y, 0.7);
  if (!options.quick) await wait(300);
  const gw = greatWorkOf(world);
  return `v60-greatwork: ${world.milestone}, ${gw ? `great work ${gw.id}` : 'no great work founded'}, reign ${world.reign.won === null ? 'not won' : 'won'}`;
}
