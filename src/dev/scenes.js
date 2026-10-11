// Development scenes for the Stage 3 screenshots (tools/shots.ps1 -Stage3): window.__thebes.devScene(name) sets up one
// scene and resolves with a short description when it is ready to capture. boot.js exposes devScene before the title
// card shows; api is boot's returned object ({ phase, game, startGame, hooks }).
//
// 'peaceful' runs on the title card (/?nosw=1) and chooses Peaceful, so its hint shows. The others run in a game,
// opened on the seed-11 sample city (/?skipTitle=1&nosw=1&seed=11&sample=1), which starts paused, so each scene stays
// as it is set: 'fire' (a home burning next to a blaze, the firehouses that reach them paused), 'tribute' (a later
// raid's warning with the tribute sheet open), 'battle' (raiders at a wall with a gate and two towers, soldiers out),
// 'score' (the city summary) and 'ambient' (river life close up). Where the sim would take years to get there, a scene
// writes the contract's world state directly (a b.fire record, raid.warning, raid.active, soldiers, wall tiles), and it
// builds what a player would through the commands. A scene that needs motion (flames, ambient life) turns reduced
// motion off in the settings, because headless browsers ask for it.
import { place, drawRoad, setPaused } from '../sim/commands.js';
import { assignLabour } from '../sim/labour.js';
import { allBuildings, housesOf } from '../sim/world.js';
import { coverageOf } from '../sim/fire.js';
import { roadReach, adjacentRoadTiles } from '../sim/reach.js';
import { raidSize, tributeFor, raidTargetKind, entryDir } from '../sim/raids.js';
import { idx, inBounds } from '../sim/grid.js';
import { T as TERRAIN } from '../sim/terrain.js';
import { DEFENCE, RAIDS, UNITS } from '../data/raids.js';
import { FIRE } from '../data/fire.js';
import { screenToTile } from '../render/camera.js';
import { openSheet, closeSheet } from '../ui/modes.js';
import { T } from '../ui/text.js';

export const DEV_SCENES = ['peaceful', 'fire', 'tribute', 'battle', 'score', 'ambient'];

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function inGame(api, name) {
  const g = api.game();
  if (!g) throw new Error(`devScene ${name}: no city is open (use ?skipTitle=1&sample=1)`);
  return g;
}

// The map's size in CSS px, as the interface measures it (the camera control's centre is its middle).
function viewOf(g) {
  const c = g.ui.cameraControl.centre();
  return { width: c.x * 2, height: c.y * 2 };
}

// The top of the map the interface leaves free, in CSS px from the map's top: under the top bar, and on a portrait
// phone under the banner, the legend and the goals strip too, which run across the map there (read from the page,
// since their height follows their words and the text size).
function freeTop(layout) {
  let top = 48;
  const map = document.querySelector('#map');
  if (layout !== 'portrait' || !map) return top;
  const mapTop = map.getBoundingClientRect().top;
  for (const sel of ['#banner', '#legend', '#goals']) {
    const n = map.parentElement.querySelector(sel);
    const r = n ? n.getBoundingClientRect() : null;
    if (r && r.height > 0) top = Math.max(top, r.bottom - mapTop);
  }
  return top;
}

// Puts tile (x, y) in the middle of the map the interface leaves free (the top bar and what sits under it, and the
// side panel, the rail or a sheet take the rest), by a jump, so no camera tween is left running when the capture is
// taken.
function focus(g, x, y, kind = 'browse') {
  const v = viewOf(g);
  const layout = g.ui.store.get().layout, top = freeTop(layout);
  const i = layout === 'portrait'
    ? { top, left: 0, right: 0, bottom: kind === 'sheet' ? v.height * 0.6 : v.height * 0.2 }
    : { top, left: 0, bottom: 0, right: layout === 'compact' ? 56 + 268 : 320 };
  const midX = i.left + (v.width - i.left - i.right) / 2, midY = i.top + (v.height - i.top - i.bottom) / 2;
  const c = screenToTile({ x, y, zoom: g.cam.zoom }, v, v.width - midX, v.height - midY);
  g.ui.cameraControl.jumpTo(c.x, c.y);
}

// The tile north of the city where its north road ends (the sample city's road runs north from the start road).
function northRoadEnd(world) {
  const ex = world.tradeEntry.x;
  let y = world.size - 10;
  while (y > 0 && world.road[idx(world.size, ex, y - 1)]) y--;
  return { x: ex, y };
}

const freeLand = (world, x, y) => inBounds(world.size, x, y) && !world.occ[idx(world.size, x, y)] && world.terrain[idx(world.size, x, y)] !== TERRAIN.WATER;

// The title card with Peaceful chosen (spec 4.18): its hint names what the level changes.
async function peaceful(api) {
  if (api.phase() !== 'title') throw new Error('devScene peaceful: open the title card (/?nosw=1)');
  const choice = document.querySelector('#title .choice.difficulty[data-value="peaceful"]');
  if (!choice) throw new Error('devScene peaceful: no Peaceful choice on the title card');
  choice.click();
  return 'peaceful';
}

// A home in the fire stage and its neighbour in a blaze (spec 4.12), the firehouses that reach them paused, so no
// staffed firehouse reaches either: the critical fire banner, flames and smoke.
async function fire(api) {
  const g = inGame(api, 'fire'), { world } = g;
  const near = (b) => Math.abs(b.x - world.focus.x) + Math.abs(b.y - world.focus.y);
  const homes = housesOf(world).filter((h) => h.residents > 0 && h.w === 1 && adjacentRoadTiles(world, h).length).sort((a, b) => near(a) - near(b));
  const neighbour = (h) => housesOf(world).find((o) => o.residents > 0 && o.y === h.y && Math.abs(o.x - h.x) === 1);
  const home = homes.find((h) => neighbour(h));
  if (!home) throw new Error('devScene fire: no pair of homes side by side');
  const next = neighbour(home);
  for (const f of allBuildings(world)) {
    if (f.type !== 'firehouse') continue;
    const reach = roadReach(world, f, FIRE.reach);
    if ([home, next].some((b) => adjacentRoadTiles(world, b).some((t) => reach.has(t)))) setPaused(world, f.id, true);
  }
  assignLabour(world);
  home.fire = { stage: 'fire', days: 4, left: 8 };
  next.fire = { stage: 'blaze', days: 1, need: 2, fought: 0 };
  home.risk = 0; next.risk = 0;                      // risk goes back to 0 when a building catches fire
  world.danger.lastFireDay = world.day;
  world.danger.firePaused = true;                    // the city's first-time pause has happened (the game is paused)
  world.tally.fires += 2;
  g.ui.settings.set({ reducedMotion: 'off' });
  g.ui.refresh();
  focus(g, home.x + 0.5, home.y + 0.5);
  await wait(100);
  return `fire ${home.id} ${coverageOf(world, home)}`;
}

// A later raid's warning (spec 4.13), so it carries a tribute, with the tribute sheet open (the warning's Pay tribute).
async function tribute(api) {
  const g = inGame(api, 'tribute'), { world } = g;
  const r = world.raid;
  const entry = { ...(world.raiderEntries.find((e) => entryDir(world, e) === 'east') || world.raiderEntries[0]) };
  r.clockDay = r.clockDay === null ? 0 : r.clockDay;
  r.last = { index: 0, dir: entryDir(world, entry), size: RAIDS.firstSize, won: true, byTowers: RAIDS.firstSize, bySoldiers: 0, towers: 1, burned: 0, stolen: 0, day: Math.max(0, world.day - 200) };
  world.tally.raids += 1; world.tally.raidsBeaten += 1;
  r.index = 1;                                       // the first raid came and was beaten: this warning is the second's
  const size = raidSize(world);
  r.warning = { index: 1, entry, dir: entryDir(world, entry), size, tribute: tributeFor(world, size), target: raidTargetKind(world), day: world.day - 30, arrives: world.day - 30 + RAIDS.warningDays, first: false };
  r.index = 2;
  r.nextWarnDay = null;
  g.ui.refresh();
  const w = r.warning;
  const alert = g.ui.alerts.list().find((a) => a.code === 'raid_warning') || { code: 'raid_warning', x: entry.x, y: entry.y, dir: w.dir, arrives: w.arrives };
  g.ui.alerts.action(alert, 'tribute');
  await wait(100);
  return `tribute ${size} ${w.tribute}`;
}

// Raiders at a wall (spec 4.13, 5.4): the north road runs on past a wall line with a gate on it and a tower either
// side of the gate; the band is at the gate with two raiders hurt, the gate is damaged and one wall tile broken, and
// the barracks' soldiers are out on the near side.
async function battle(api) {
  const g = inGame(api, 'battle'), { world } = g;
  const end = northRoadEnd(world), ex = end.x;
  const gold = world.gold;
  world.gold = Math.max(gold, 10000);                // the scene's road and towers, laid through the commands
  drawRoad(world, ex, end.y, ex, end.y - 3);
  const wallY = end.y - 2;
  let tiles = 0;
  for (let x = ex - 6; x <= ex + 6; x++) {
    const i = idx(world.size, x, wallY);
    if (!(world.road[i] || freeLand(world, x, wallY))) continue;
    world.wall[i] = world.road[i] ? DEFENCE.gateHp : DEFENCE.wallHp;
    tiles++;
  }
  world.wallVersion++;
  world.tally.wallTiles += tiles;
  const towers = [];
  for (const x of [ex - 1, ex + 1]) {
    const placed = place(world, 'tower', x, wallY);   // a tower on a standing wall tile gives the tile its 80 hit points
    if (placed.ok) towers.push(world.buildings[placed.id]);
  }
  world.gold = gold;
  assignLabour(world);
  world.wall[idx(world.size, ex, wallY)] = 22;       // the gate, hit
  if (world.wall[idx(world.size, ex + 4, wallY)] > 0) world.wall[idx(world.size, ex + 4, wallY)] = -1;   // a breach
  world.wallVersion++;
  const entry = { ...(world.raiderEntries.find((e) => entryDir(world, e) === 'north') || world.raiderEntries[0]) };
  const spots = [[ex, wallY - 1, 10], [ex - 1, wallY - 1, 6], [ex + 1, wallY - 2, 10], [ex + 3, wallY - 1, 4], [ex + 4, wallY - 2, 10], [ex - 2, wallY - 3, 10]];
  const raiders = spots.map(([x, y, hp]) => ({ id: world.nextUnitId++, x, y, hp, hit: hp < UNITS.raider.hp }));
  // Three soldiers out behind the wall: those the barracks has trained, then new ones. Each takes a fresh id (after
  // the raiders'), because the drawing glides a unit it has seen to its new spot over a game day (src/render/units.js),
  // which never passes while the game is paused: under its old id a trained soldier would stay drawn in the yard.
  const barracks = allBuildings(world).find((b) => b.type === 'barracks');
  if (barracks) {
    [[ex, wallY + 1], [ex - 3, wallY + 1], [ex + 2, wallY + 1]].forEach(([x, y], k) => {
      let s = world.soldiers[k];
      if (!s) { s = { barracks: barracks.id }; world.soldiers.push(s); }
      Object.assign(s, { id: world.nextUnitId++, x, y, hp: UNITS.soldier.hp, hit: false, task: 'out' });
    });
    world.soldiers.sort((a, b) => a.id - b.id);       // the contract keeps soldiers in ascending id
  }
  const target = allBuildings(world).find((b) => b.type === raidTargetKind(world));
  const r = world.raid;
  r.clockDay = r.clockDay === null ? 0 : r.clockDay;
  r.warning = null;
  r.index = Math.max(r.index, 2);
  r.active = {
    index: 1, entry, dir: entryDir(world, entry), size: raiders.length + 1, target: raidTargetKind(world), day: world.day - 3,
    raiders, phase: 'attack', targetId: target ? target.id : null, struck: [], wait: 0, byTowers: 1, bySoldiers: 0, burned: 0, stolen: 0,
    shots: towers.map((t, k) => ({ from: { x: t.x, y: t.y }, to: { x: raiders[k + 1].x, y: raiders[k + 1].y } })),
  };
  world.tally.raids += 1;
  world.tally.raidersByTowers += 1;
  g.ui.settings.set({ reducedMotion: 'off' });
  g.ui.refresh();
  focus(g, ex + 0.5, wallY + 0.5);
  await wait(100);
  return `battle ${raiders.length} raiders ${world.soldiers.length} soldiers ${towers.length} towers on the wall`;
}

// The city summary, scrolled to the score and its parts (spec 4.19): Track E's score section, or else the first of the
// sheet parts that follow the goals list (src/ui/sheets.js summarySheet).
async function score(api) {
  const g = inGame(api, 'score');
  const s = g.ui.store.get();
  g.ui.store.set(openSheet(s.sheet ? closeSheet(s) : s, 'summary'));
  await wait(100);
  const sheet = document.querySelector('#sheet');
  const heading = sheet && [...sheet.querySelectorAll('h3')].find((h) => h.textContent === T.goals);
  const part = sheet && (sheet.querySelector('.score-section') || (heading && heading.nextElementSibling && heading.nextElementSibling.nextElementSibling));
  if (part) {
    const head = sheet.querySelector('.head');
    sheet.scrollTop += part.getBoundingClientRect().top - (head ? head.getBoundingClientRect().bottom : sheet.getBoundingClientRect().top) - 8;
  }
  return 'score';
}

// River life close up (spec 5.6): the stretch of river nearest the city's middle street, ambient motion on.
async function ambient(api) {
  const g = inGame(api, 'ambient'), { world } = g;
  g.ui.settings.set({ ambient: true, reducedMotion: 'off' });
  const y = world.focus.y;
  let best = null;
  for (let x = world.focus.x; x >= 0 && !best; x--) if (world.terrain[idx(world.size, x, y)] === TERRAIN.WATER) best = { x, y };
  if (!best) throw new Error('devScene ambient: no river west of the city');
  g.cam.zoom = 1.5;
  focus(g, best.x + 2, best.y);
  await wait(600);
  return `ambient ${best.x},${best.y}`;
}

const SCENES = { peaceful, fire, tribute, battle, score, ambient };

export async function devScene(api, name) {
  const scene = SCENES[name];
  if (!scene) throw new Error(`devScene: no scene named ${name} (${DEV_SCENES.join(', ')})`);
  return scene(api);
}
