// Version 7.0, Track A's dev scenes (src/dev/v70/index.js joins them): the two Advice fixes. Track 0 left minimal worlds; Track A owns this
// file and refines them. Open /?skipTitle=1&nosw=1&seed=11&sample=1 first.
//   v70-advice-tower   the sample city (Track A: a raid warned, Advice open on the tower item, Show me at a spot that defends the first target)
//   v70-stranded       the sample city (Track A: a good stored far from the bazaar that needs it, Advice's storehouse fix shown)
// Every scene takes { quick } (no settling wait).
import { towerSpotsFor, strandedFix } from '../../sim/adviceFixes.js';
import { allBuildings } from '../../sim/world.js';
import { sampleCity, look, wait } from './base.js';

export async function adviceTowerScene(api, options = {}) {
  const world = sampleCity(api, 'v70-advice-tower', options);
  const target = allBuildings(world).find((b) => b.type === 'trading_post') || allBuildings(world)[0] || null;
  look(api, world.focus.x, world.focus.y, 0.9);
  if (!options.quick) await wait(300);
  return `v70-advice-tower: target ${target ? `${target.type} ${target.id}` : 'none'}, ${towerSpotsFor(world, target).length} spots`;
}

export async function strandedScene(api, options = {}) {
  const world = sampleCity(api, 'v70-stranded', options);
  const bazaar = allBuildings(world).find((b) => b.type === 'bazaar') || null;
  look(api, world.focus.x, world.focus.y, 0.9);
  if (!options.quick) await wait(300);
  const fix = strandedFix(world, 'pottery', bazaar);
  return `v70-stranded: bazaar ${bazaar ? bazaar.id : 'none'}, fix ${fix ? `${fix.item} at ${fix.x},${fix.y}` : 'none'}`;
}
