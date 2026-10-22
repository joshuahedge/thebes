// Version 6.0, Track B1's dev scenes (src/dev/v60/index.js joins them): plague, drought, locusts and a raid that burns. Track 0 left
// minimal worlds (the sample city with the grace over and the danger's record set by hand); Track B1 owns this file and refines them with
// its own sim calls. Open /?skipTitle=1&nosw=1&seed=11&sample=1 first.
import { dangerDraws } from '../../sim/hazards.js';
import { sampleCity, look, wait, endGrace, fullestHome } from './base.js';

// Plague begun in the fullest home. options: gold, quick.
export async function plagueScene(api, options = {}) {
  const world = sampleCity(api, 'v60-plague', options);
  endGrace(world);
  const home = fullestHome(world);
  world.hazards.plague.active = { day: world.day, origin: home.id, homes: [home.id] };
  look(api, home.x + home.w / 2, home.y + home.d / 2, 1.2);
  if (!options.quick) await wait(300);
  return `v60-plague: home ${home.id} (${home.residents} people), plague ${dangerDraws(world).plague ? 'may be drawn' : 'off'}`;
}

// A low Nile warned three months ahead. options: gold, quick.
export async function droughtScene(api, options = {}) {
  const world = sampleCity(api, 'v60-drought', options);
  endGrace(world);
  world.hazards.drought.warning = { day: world.day, strikes: world.day + 90 };
  look(api, world.focus.x, world.focus.y, 0.8);
  if (!options.quick) await wait(300);
  return `v60-drought: low Nile warned for day ${world.hazards.drought.warning.strikes}`;
}

// Locusts warned a month ahead over the first four farms (lowest ids). options: gold, quick.
export async function locustsScene(api, options = {}) {
  const world = sampleCity(api, 'v60-locusts', options);
  endGrace(world);
  const farms = Object.values(world.buildings).filter((b) => b.type.startsWith('farm_')).slice(0, 4);
  world.hazards.locusts.warning = { day: world.day, strikes: world.day + 30, kind: 'locusts', farms: farms.map((b) => b.id) };
  const at = farms[0] || { x: world.focus.x, y: world.focus.y, w: 1, d: 1 };
  look(api, at.x + at.w / 2, at.y + at.d / 2, 0.9);
  if (!options.quick) await wait(300);
  return `v60-locusts: ${farms.length} farms warned for day ${world.hazards.locusts.warning.strikes}`;
}

// The grace over, the camera at the first raider entry: Track B1 sets a raid on its way that burns, wrecks and loots. options: gold, quick.
export async function raidBurnScene(api, options = {}) {
  const world = sampleCity(api, 'v60-raid-burn', options);
  endGrace(world);
  const e = world.raiderEntries[0] || world.focus;
  look(api, e.x, e.y, 0.8);
  if (!options.quick) await wait(300);
  const s = dangerDraws(world).strikes;
  return `v60-raid-burn: entry ${e.x},${e.y}; strikes burn ${s.burn}, wreck ${s.wreck}, loot ${s.loot}`;
}
