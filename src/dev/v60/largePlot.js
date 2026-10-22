// Version 6.0, Track C's dev scene (src/dev/v60/index.js joins it): a Large plot. Track 0 left a minimal world (the sample city, the
// camera on its first Townhouse, whose appearance unlocks the card); Track C owns this file and refines it (an empty marked lot with its
// Manor checklist, a lot moved into). Open /?skipTitle=1&nosw=1&seed=11&sample=1 first.
import { LARGE_PLOT } from '../../data/largePlots.js';
import { largePlotUnlocked } from '../../sim/largePlots.js';
import { sampleCity, look, wait } from './base.js';

export async function largePlotScene(api, options = {}) {
  const world = sampleCity(api, 'v60-largeplot', options);
  const town = Object.values(world.buildings).find((b) => b.type === 'house' && b.tier === LARGE_PLOT.unlockTier) || null;
  const at = town || { x: world.focus.x, y: world.focus.y, w: 1, d: 1 };
  look(api, at.x + at.w / 2, at.y + at.d / 2, 1.2);
  if (!options.quick) await wait(300);
  return `v60-largeplot: ${town ? `Townhouse ${town.id}` : 'no Townhouse'}, card ${largePlotUnlocked(world) ? 'unlocked' : 'locked'}`;
}
