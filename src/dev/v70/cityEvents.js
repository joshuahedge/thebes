// Version 7.0, Track E's dev scenes (src/dev/v70/index.js joins them): city events. Track 0 left minimal worlds (the seed-11 sample Capital,
// the record as a new city's); Track E owns this file and refines them. Open /?skipTitle=1&nosw=1&seed=11&sample=1 first.
//   v70-event      an event waiting, its card open (Track E: one troublesome kind with three choices, one disabled for want of gold)
//   v70-festival   the Festival of Opet offered, with and without incense (Track E: { incense: true | false })
// Every scene takes { quick } (no settling wait).
import { sampleCity, look, wait } from './base.js';

const recordSaid = (world) => `next ${world.cityEvents.nextDay}, ${world.cityEvents.waiting ? `waiting ${world.cityEvents.waiting.kind}` : 'none waiting'}`;

async function eventsScene(api, name, options) {
  const world = sampleCity(api, name, options);
  look(api, world.focus.x, world.focus.y, 0.9);
  if (!options.quick) await wait(300);
  return `${name}: ${world.milestone}, ${recordSaid(world)}`;
}

export const eventScene = (api, options = {}) => eventsScene(api, 'v70-event', options);
export const festivalScene = (api, options = {}) => eventsScene(api, 'v70-festival', options);
