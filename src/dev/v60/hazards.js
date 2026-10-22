// Version 6.0, Track B1's dev scenes (src/dev/v60/index.js joins them): plague, drought, locusts and a raid that burns, wrecks and loots. Each
// sets its danger up through the sim's own functions (a draw's warning, a plague started and left to spread, a raid run through raidDay), so what a
// shot shows is what the game does. Open /?skipTitle=1&nosw=1&seed=11&sample=1 first. options: gold, quick (no waits), look (what to show; each
// scene says which), zoom.
import { dangerDraws } from '../../sim/hazards.js';
import { startPlague, plagueDay, sickHomes, quarantineDistrict } from '../../sim/plague.js';
import { droughtMonth, locustsMonth, isFarm } from '../../sim/crops.js';
import { raidDay, entryDir, raidTargetKind } from '../../sim/raids.js';
import { fireDay } from '../../sim/fire.js';
import { setBattleHooks } from '../../render/units.js';
import { setPaused } from '../../sim/commands.js';
import { allBuildings } from '../../sim/world.js';
import { assignLabour } from '../../sim/labour.js';
import { footMix } from '../../data/armies.js';
import { openSheet, select } from '../../ui/modes.js';
import { sampleCity, look, wait, endGrace, fullestHome } from './base.js';

// Selects a building so its sheet is open (the interface's own mode change).
const show = (api, id) => { const ui = api.game().ui; ui.store.set(select(ui.store.get(), id)); };
// Opens a sheet by its kind.
const sheet = (api, kind) => { const ui = api.game().ui; ui.store.set(openSheet(ui.store.get(), kind)); };

// Plague begun in the fullest home and left to spread through the sim's own days until five homes are sick (or a season has passed). options.look:
// 'sheet' (default) the Health layer on, the sick home's sheet open with the quarantine choice; 'layer' the layer alone; 'quarantine' the same with
// the district quarantined (its dashed edge).
export async function plagueScene(api, options = {}) {
  const world = sampleCity(api, 'v60-plague', options);
  endGrace(world);
  const home = fullestHome(world);
  for (const b of allBuildings(world)) if (b.type === 'physician') setPaused(world, b.id, true);   // no physician reaches anyone (the scene's fixture, as the fire scenes pause their firehouses)
  assignLabour(world);
  startPlague(world, home.id);
  for (let k = 0; k < 24 && sickHomes(world).length < 6; k++) { plagueDay(world); world.day += 1; }
  const g = api.game();
  g.ui.cameraControl.cancel();
  if (options.look === 'quarantine') { world.gold = Math.max(world.gold, 5000); quarantineDistrict(world, home.id); }
  g.ui.store.set({ overlay: 'health' });
  g.ui.refresh();
  look(api, home.x + home.w / 2, home.y + home.d / 2, options.zoom || 1.4);
  if (options.look !== 'layer') show(api, home.id);
  if (!options.quick) await wait(300);
  return `v60-plague: home ${home.id} (${home.residents} people), ${sickHomes(world).length} homes sick, plague ${dangerDraws(world).plague ? 'may be drawn' : 'off'}`;
}

// A low Nile warned by the draw (the Nile reading names the flood). options.look: 'alert' (default) the alert list; 'advice' the City advice sheet;
// 'summary' the summary's Dangers section.
export async function droughtScene(api, options = {}) {
  const world = sampleCity(api, 'v60-drought', options);
  endGrace(world);
  // The draw warns the next flood at least three months ahead: when this year's is nearer, the scene lets the months pass (as the clock's month ends
  // would) until the draw finds one.
  for (let k = 0; k < 14 && !world.hazards.drought.warning; k++) {
    world.hazards.drought.nextDay = world.day;
    droughtMonth(world, null);
    if (!world.hazards.drought.warning) world.day += 30;
  }
  const g = api.game();
  g.ui.cameraControl.cancel();
  g.ui.refresh();
  look(api, world.focus.x, world.focus.y, options.zoom || 0.8);
  const w = world.hazards.drought.warning;
  if (w) sheet(api, options.look === 'advice' ? 'advice' : options.look === 'summary' ? 'summary' : 'minimap');
  if (!options.quick) await wait(300);
  return w ? `v60-drought: low Nile warned for day ${w.strikes}` : 'v60-drought: no low Nile could be warned (the city has no flood yet)';
}

// Locusts or blight warned over a band of farms by the draw. options.look: 'sheet' (default) the first farm's sheet with Harvest now; 'alert' the
// alert list; 'advice' the City advice sheet.
export async function locustsScene(api, options = {}) {
  const world = sampleCity(api, 'v60-locusts', options);
  endGrace(world);
  world.hazards.locusts.nextDay = world.day;
  locustsMonth(world, null);
  const w = world.hazards.locusts.warning;
  const farms = w ? w.farms.map((id) => world.buildings[id]).filter(Boolean) : allBuildings(world).filter((b) => isFarm(b.type)).slice(0, 4);
  const at = farms[0] || { x: world.focus.x, y: world.focus.y, w: 1, d: 1 };
  const g = api.game();
  g.ui.cameraControl.cancel();
  g.ui.refresh();
  look(api, at.x + at.w / 2, at.y + at.d / 2, options.zoom || 1.1);
  if (w && (!options.look || options.look === 'sheet')) show(api, farms[0].id);
  else if (w) sheet(api, options.look === 'advice' ? 'advice' : 'minimap');
  if (!options.quick) await wait(300);
  return `v60-locusts: ${farms.length} farms warned for day ${w ? w.strikes : 'none'}`;
}

// A band of nine with a chieftain from the first raider entry, run through the real raid days (its defenders stood down, so it gets through) until
// the report: what it burned, wrecked and took. In a full run a few starting days are tried (each on a copy of the world) for one on which
// the draws wreck a building. options.look: 'report' (default) the summary sheet with the report; 'rubble' a wrecked building's rubble selected;
// Version 6.0 (Track B2): 'ruins' the map alone, close on what the raid left (the wrecked building's shell and dust, the burned one's charred shell and its
// smoke, a blaze still burning where there is one), the fires run on through the sim's own fire days; 'moment' the result in the alert row (Raid beaten
// or The raiders got through) over the ruins. options.hold (ms): hold every arrow, spark and fall at that age for a still picture.
export async function raidBurnScene(api, options = {}) {
  const world = sampleCity(api, 'v60-raid-burn', options);
  endGrace(world);
  for (const b of allBuildings(world)) if (b.type === 'tower' || b.type === 'barracks') setPaused(world, b.id, true);
  world.soldiers = [];
  assignLabour(world);
  const e = world.raiderEntries[0] || world.focus;
  const ruins = options.look === 'ruins' || options.look === 'moment', ending = [];
  const arrive = (w, offset) => {
    w.day += offset;
    w.raid.index = 3;
    w.raid.warning = { index: 2, entry: { x: e.x, y: e.y }, dir: entryDir(w, e), size: 9, tribute: 300, target: raidTargetKind(w), day: w.day - 90, arrives: w.day, first: false, mix: footMix(9), chiefs: [0] };
    ending.length = 0;
    raidDay(w, []);
    // The ruins looks run the fire days with the raid days (as the clock does), so the blazes the band lit burn down to shells, and on after it for a few days.
    // 'ruins' stops two days after the band's second strike (the raid still on, its first strike's ruin fresh); 'moment' plays the raid out.
    let after = null;
    for (let k = 0; k < 300 && w.raid.active; k++) {
      w.day += 1; const evs = []; raidDay(w, evs); ending.push(...evs.filter((x) => x.type === 'raid_end'));
      if (ruins) fireDay(w, []);
      if (options.look === 'ruins' && w.raid.active && w.raid.active.struck.length >= 2) { if (after === null) after = w.day; if (w.day - after >= 2) break; }
    }
    if (options.look === 'moment') for (let k = 0; k < 40 && allBuildings(w).some((b) => b.fire); k++) { w.day += 1; fireDay(w, []); }
    return w.raid.last;
  };
  let offset = 0;
  if (!options.quick) {
    for (let k = 0; k < 8; k++) {
      const last = arrive(structuredClone(world), k * 7);
      if (last && last.wrecked && last.taken) { offset = k * 7; break; }
    }
  }
  arrive(world, offset);
  const g = api.game();
  g.ui.cameraControl.cancel();
  g.ui.refresh();
  const rubble = allBuildings(world).find((b) => b.type === 'rubble' && b.was && b.was.cause === 'wreck');
  const burnt = allBuildings(world).find((b) => b.type === 'rubble' && b.was && b.was.cause === 'fire');
  const at = rubble || burnt;
  if (options.hold !== undefined) setBattleHooks({ hold: options.hold });
  if (options.look === 'moment' && ending.length) g.ui.onEvents(ending);   // the result reaches the interface as it would from the loop
  look(api, at ? at.x + 0.5 : e.x, at ? at.y + 0.5 : e.y, options.zoom || (ruins ? 2 : at ? 1.4 : 0.8));
  if (ruins) { /* the map alone: no sheet over the ruins */ }
  else if (options.look === 'rubble' && rubble) show(api, rubble.id);
  else sheet(api, 'summary');
  if (!options.quick) await wait(300);
  const s = dangerDraws(world).strikes;
  const r = world.raid.last;
  return `v60-raid-burn: entry ${e.x},${e.y}; report: burned ${r ? r.burned : 0}, wrecked ${r && r.wrecked ? r.wrecked : 0}, taken ${r && r.taken ? Object.values(r.taken).reduce((n, v) => n + v, 0) : 0}; strikes burn ${s.burn}, wreck ${s.wreck}, loot ${s.loot}`;
}
