// Version 6.0, Track B2's dev scene (src/dev/v60/index.js joins it): a battle you can see. Track 0 left a minimal world (the sample city,
// the camera at the first raider entry); Track B2 owns this file and refines it (a band met by soldiers and towers, options for motion).
// Open /?skipTitle=1&nosw=1&seed=11&sample=1 first.
import { sampleCity, look, wait, endGrace } from './base.js';

export async function battleScene(api, options = {}) {
  const world = sampleCity(api, 'v60-battle', options);
  endGrace(world);
  const e = world.raiderEntries[0] || world.focus;
  look(api, e.x, e.y, 1);
  if (!options.quick) await wait(300);
  return `v60-battle: entry ${e.x},${e.y}, ${world.soldiers.length} soldiers`;
}
