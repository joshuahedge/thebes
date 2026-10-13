// Development scenes for the screenshots: window.__thebes.devScene(name) sets up one scene and resolves with a short
// description when it is ready to capture. boot.js exposes devScene before the title card shows; api is boot's returned
// object ({ phase, game, startGame, hooks }).
//
// The Stage 3 scenes (tools/shots.ps1 -Stage3, DEV_SCENES): 'peaceful' runs on the title card (/?nosw=1) and chooses
// Peaceful, so its hint shows. The others run in a game, opened on the seed-11 sample city
// (/?skipTitle=1&nosw=1&seed=11&sample=1), which starts paused, so each scene stays as it is set: 'fire' (a home burning
// next to a blaze, the firehouses that reach them paused), 'tribute' (a later raid's warning with the tribute sheet open),
// 'battle' (raiders at a wall with a gate and two towers, soldiers out), 'score' (the city summary) and 'ambient' (river
// life close up). Where the sim would take years to get there, a scene writes the contract's world state directly (a
// b.fire record, raid.warning, raid.active, soldiers, wall tiles), and it builds what a player would through the
// commands. A scene that needs motion (flames, ambient life) turns reduced motion off in the settings, because headless
// browsers ask for it.
//
// The mobile budget scenes (tools/shots.ps1 -Mobile, tests/ui/mobileBudget.test.js, MOBILE_SCENES): the busy moments of
// phone play from the mobile UX review (docs/superpowers/notes/2026-10-12-mobile-ux-review.md), each opened on the city
// MOBILE_SCENE_PARAMS names and driven through the sim's commands and the interface's own paths (afterCommand, the
// caption row, Show me, a tap's select), so the captions, tips and Undo toasts on screen come from the real code. They
// leave the text size and reduced motion to the caller, which sets them first. measureRows() reads the rows under the
// top bar off the page, for the review note's height budget (section 3). Two scenes come from the placement review
// (docs/superpowers/notes/2026-10-12-placement-ux-review.md): 'expanded' (P8) is a tip opened in place, whose limit is 40% of
// the height at every size and text size, and 'farm' and 'farm-raid' (P16) are a grain farm being placed, with the Ground
// overlay's legend alone in the guidance row, or under a raid warning's alert row.
//
// The Stage 4 scenes (tools/shots.ps1 -Stage4, STAGE4_SCENES): 'title' and 'tutorial' on the title card (/?nosw=1),
// the rest on the seed-11 sample city. They leave motion to the caller: the shots tool calls setMotion first
// (window.__thebes.setMotion), and takes every scene under both motions.
import { place, canPlace, drawRoad, paintHouses, setPaused } from '../sim/commands.js';
import { PALACE } from '../data/palace.js';
import { assignLabour, isWorking } from '../sim/labour.js';
import { holdFestival } from '../sim/festival.js';
import { tickDay } from '../sim/clock.js';
import { processionsAt, PROCESSION_ID_BASE } from '../render/walkers.js';
import { PROCESSION } from '../data/ambient.js';
import { allBuildings, housesOf } from '../sim/world.js';
import { coverageOf } from '../sim/fire.js';
import { roadReach, adjacentRoadTiles } from '../sim/reach.js';
import { raidSize, tributeFor, raidTargetKind, entryDir } from '../sim/raids.js';
import { idx, inBounds } from '../sim/grid.js';
import { T as TERRAIN } from '../sim/terrain.js';
import { DEFENCE, RAIDS, UNITS } from '../data/raids.js';
import { FIRE } from '../data/fire.js';
import { TIP_FIRST_DELAY_MS } from '../data/tips.js';
import { CHEER_GAP_MS, CHEER_MS } from '../data/ui.js';
import { screenToTile } from '../render/camera.js';
import { openSheet, closeSheet, select, toggleOverlay } from '../ui/modes.js';
import { freeTop } from '../ui/layout.js';
import { placeName } from '../ui/danger.js';
import { T, DANGER_UI_TEXT, CITIZEN_REMARKS, plotsPlacedText } from '../ui/text.js';
import { makeBuilding, insertBuilding } from '../sim/world.js';   // Track B's monument scenes
import { MONUMENTS, MONUMENT } from '../data/monuments.js';
import { BUILDINGS } from '../data/buildings.js';
import { tutorialScene } from './tutorialScenes.js';
import { riverIsle, riverPools } from '../render/terrainWater.js';
import { bridgeRuns, BRIDGE_MAX } from '../sim/bridges.js';

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

// Puts tile (x, y) in the middle of the map the interface leaves free (the top bar, and on a phone the rows under it,
// measured as the camera measures them: layout.js freeTop; the side panel, the rail or a sheet take the rest), by a
// jump, so no camera tween is left running when the capture is taken.
function focus(g, x, y, kind = 'browse') {
  const v = viewOf(g);
  const map = document.querySelector('#map');
  const layout = g.ui.store.get().layout, top = freeTop(map && map.parentElement, map, layout);
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
// staffed firehouse reaches either. Returns the home in the fire stage.
function lightFire(world, name) {
  const near = (b) => Math.abs(b.x - world.focus.x) + Math.abs(b.y - world.focus.y);
  const homes = housesOf(world).filter((h) => h.residents > 0 && h.w === 1 && adjacentRoadTiles(world, h).length).sort((a, b) => near(a) - near(b));
  const neighbour = (h) => housesOf(world).find((o) => o.residents > 0 && o.y === h.y && Math.abs(o.x - h.x) === 1);
  const home = homes.find((h) => neighbour(h));
  if (!home) throw new Error(`devScene ${name}: no pair of homes side by side`);
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
  return home;
}

// The fire banner, flames and smoke: lightFire's home in the middle of the free map, motion on.
async function fire(api) {
  const g = inGame(api, 'fire'), { world } = g;
  const home = lightFire(world, 'fire');
  g.ui.settings.set({ reducedMotion: 'off' });
  g.ui.refresh();
  focus(g, home.x + 0.5, home.y + 0.5);
  await wait(100);
  return `fire ${home.id} ${coverageOf(world, home)}`;
}

// A later raid's warning (spec 4.13), so it carries a tribute: the first raid came from the east when the map has an
// east entry (the seed-11 sample city does; otherwise from its first raider entry) and was beaten, and the second's
// warning went up 30 days ago. Returns the warning.
function raiseWarning(world) {
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
  return r.warning;
}

// raiseWarning's warning with the tribute sheet open (the warning's Pay tribute).
async function tribute(api) {
  const g = inGame(api, 'tribute'), { world } = g;
  const w = raiseWarning(world);
  g.ui.refresh();
  const alert = g.ui.alerts.list().find((a) => a.code === 'raid_warning') || { code: 'raid_warning', x: w.entry.x, y: w.entry.y, dir: w.dir, arrives: w.arrives };
  g.ui.alerts.action(alert, 'tribute');
  await wait(100);
  return `tribute ${w.size} ${w.tribute}`;
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

// ── The mobile budget scenes ──

export const MOBILE_SCENES = ['early', 'plots', 'raid', 'raid-fire', 'raid-overlay', 'placing', 'farm', 'farm-raid', 'sheet', 'welcome', 'expanded', 'pyramid-placing'];

// The page query each mobile scene opens with (tools/shots.ps1 -Mobile adds nosw=1): 'early' and 'plots' on a new guided
// city, seed 7, which starts paused, as does 'expanded'; 'welcome' on Welcome back over the seed-11 sample city; the rest on that city.
const SAMPLE_CITY = 'skipTitle=1&seed=11&sample=1';
export const MOBILE_SCENE_PARAMS = {
  early: 'skipTitle=1&seed=7', plots: 'skipTitle=1&seed=7', raid: SAMPLE_CITY, 'raid-fire': SAMPLE_CITY, 'raid-overlay': SAMPLE_CITY,
  placing: SAMPLE_CITY, farm: SAMPLE_CITY, 'farm-raid': SAMPLE_CITY, sheet: SAMPLE_CITY, welcome: 'welcome=1&seed=11&sample=1', expanded: 'skipTitle=1&seed=7',
  'pyramid-placing': SAMPLE_CITY,
};

// A mobile scene's waits: as long as asked on the page, so the capture shows the settled screen; none with
// options.quick, for a test that measures the rows (its clock has already moved past the session's first seconds).
const settle = (options, ms) => wait(options && options.quick ? 0 : ms);

// A road of `length` tiles on from the end of the start road, north if the land is free, else east, through the
// command and afterCommand as the confirm bar's ✓ lays one (the Undo toast, the goal's caption, the tips it fires).
// Returns the tiles beside it on the near side, where plots can go.
function layRoad(g, length, name) {
  const { world, ui } = g;
  const [ex, ey] = world.startRoad[world.startRoad.length - 1];
  let result = drawRoad(world, ex, ey, ex, ey - length), beside = { x0: ex + 1, y0: ey - length, x1: ex + 1, y1: ey - 1 };
  if (!result.ok) { result = drawRoad(world, ex, ey, ex + length, ey); beside = { x0: ex + 1, y0: ey - 1, x1: ex + length, y1: ey - 1 }; }
  if (!result.ok) throw new Error(`devScene ${name}: no room for a road off the start road (${result.reason})`);
  assignLabour(world);
  ui.afterCommand({ kind: 'road', result, text: T.roadLaid, undoable: true });
  return beside;
}

// The house nearest the middle of the city, of the highest tier there is.
function finestHome(world) {
  const near = (b) => Math.abs(b.x - world.focus.x) + Math.abs(b.y - world.focus.y);
  return housesOf(world).filter((h) => h.residents > 0).sort((a, b) => (b.tier - a.tier) || (near(a) - near(b)))[0];
}

// The caption a firehouse's success shows (src/ui/danger.js): the info tier, the longest-lived.
const putOutCaption = (g, b) => g.ui.celebrations.show({ tier: 'info', text: DANGER_UI_TEXT.putOut('blaze', placeName(b)) });

// The first minutes: a road laid off the start road on the new city once tips may show (none in the session's first
// TIP_FIRST_DELAY_MS), captured once the goal's caption has gone: the goals strip with the next goal and Show me, and the
// Undo toast. The city is still paused, so on a phone the tip the goal brings waits for Play (ruling 176); a wide screen
// shows it under the strip. Quick, the caption row is emptied as the caption's end would leave it.
async function early(api, options) {
  const g = inGame(api, 'early');
  await settle(options, TIP_FIRST_DELAY_MS + 300);
  layRoad(g, 5, 'early');
  if (options && options.quick) g.ui.celebrations.clear();
  else await wait(CHEER_MS.first + 300);
  return `early tip ${g.ui.tips.current()}`;
}

// Plots while paused: a road, and once its caption's slot has passed, six plots beside it, the game still paused: Press
// Play, a caption, the Undo toasts (on a phone only the newest, ruling 169) and the guide's strip. Quick, the caption row is emptied as the slot's end would
// leave it, when nothing waits behind the road's caption.
async function plots(api, options) {
  const g = inGame(api, 'plots'), { world } = g;
  const a = layRoad(g, 6, 'plots');
  if (options && options.quick && !g.ui.celebrations.pending()) g.ui.celebrations.clear();
  else await wait(CHEER_GAP_MS + 100);
  const result = paintHouses(world, a.x0, a.y0, a.x1, a.y1);
  if (!result.ok) throw new Error(`devScene plots: no plots beside the road (${result.reason})`);
  assignLabour(world);
  g.ui.afterCommand({ kind: 'houses', result, text: plotsPlacedText(result.ids.length, result.ids.filter((id) => !adjacentRoadTiles(world, world.buildings[id]).length).length), undoable: true });
  await settle(options, 200);
  return `plots tip ${g.ui.tips.current()} speed ${world.speed}`;
}

// A raid warning (raiseWarning's) and a blaze put out elsewhere.
async function raid(api, options) {
  const g = inGame(api, 'raid');
  raiseWarning(g.world);
  g.ui.refresh();
  await settle(options, 100);
  putOutCaption(g, finestHome(g.world));
  return 'raid';
}

// A raid warning and a fire nobody reaches (lightFire's), with a blaze put out elsewhere.
async function raidFire(api, options) {
  const g = inGame(api, 'raid-fire');
  raiseWarning(g.world);
  const home = lightFire(g.world, 'raid-fire');
  g.ui.refresh();
  await settle(options, 100);
  putOutCaption(g, finestHome(g.world));
  return `raid-fire ${home.id}`;
}

// A raid warning with the fire risk overlay on and a citizen's remark (the first whose building the city has).
async function raidOverlay(api, options) {
  const g = inGame(api, 'raid-overlay'), { world, ui } = g;
  raiseWarning(world);
  ui.refresh();
  ui.store.set(toggleOverlay(ui.store.get(), 'fire'));
  await settle(options, 200);
  const has = new Set(allBuildings(world).map((b) => b.type));
  const remark = CITIZEN_REMARKS.find((r) => has.has(r.type));
  if (remark) ui.celebrations.show({ tier: 'remark', text: remark.text, icon: '❝' });
  return `raid-overlay ${ui.store.get().overlay}`;
}

// Placing a well with a raid warning up, through Show me at the middle of the city: the ghost, the confirm bar and the
// well's automatic Water overlay.
async function placing(api, options) {
  const g = inGame(api, 'placing'), { world, ui } = g;
  raiseWarning(world);
  ui.refresh();
  await settle(options, 100);
  ui.showMeAt({ category: 'services', item: 'well', x: world.focus.x, y: world.focus.y });
  await settle(options, 500);
  return `placing ${ui.store.get().mode}`;
}

// Placing a grain farm (placement review P16): the ghost, the confirm bar, and the Ground overlay a farm turns on, whose
// legend names the two kinds of ground and says whether there is room (the tallest guidance row). 'farm' is the calm city,
// where the legend alone has the guidance row (what a landscape phone at large text shows); 'farm-raid' has a raid warning
// up as well, so the alert row sits above the legend (a portrait phone, or a landscape phone at 100% text).
async function farmScene(api, options, name, warn) {
  const g = inGame(api, name), { world, ui } = g;
  if (warn) raiseWarning(world);
  ui.refresh();
  await settle(options, 100);
  ui.showMeAt({ category: 'food', item: 'farm_grain', x: world.focus.x, y: world.focus.y });
  await settle(options, 500);
  return `${name} ${ui.store.get().mode} ${ui.store.get().overlay}`;
}
const farm = (api, options) => farmScene(api, options, 'farm', false);
const farmRaid = (api, options) => farmScene(api, options, 'farm-raid', true);

// A house sheet with a raid warning up: finestHome selected as a tap on it selects it (createUI's actions.tap).
async function sheet(api, options) {
  const g = inGame(api, 'sheet'), { world, ui } = g;
  raiseWarning(world);
  ui.refresh();
  const h = finestHome(world);
  ui.store.set(select(ui.store.get(), h.id));
  await settle(options, 500);
  return `sheet ${h.id} tier ${h.tier}`;
}

// A tip opened in place (placement review P8): the goal tip that follows a finished goal, the longest, on the paused new
// city once tips may show (the session's first TIP_FIRST_DELAY_MS have passed), then a tap on More as the player makes it
// (setGuidanceOpen is what that tap runs): the row shows every word, up to 40% of the screen's height, and scrolls beyond.
async function expanded(api, options) {
  const g = inGame(api, 'expanded');
  await settle(options, TIP_FIRST_DELAY_MS + 300);
  if (!g.ui.tips.trigger('goalDone')) throw new Error('devScene expanded: the goal tip did not show');
  await settle(options, 100);
  if (!g.ui.setGuidanceOpen(true)) throw new Error('devScene expanded: the tip would not open');
  await settle(options, 300);
  return `expanded tip ${g.ui.tips.current()}`;
}

// Stage 4 (Track C, ruling 252): the great pyramid being placed, the biggest footprint: its ghost and silhouette, the Ground
// overlay's legend with the gold room line, and the confirm bar's two chip rows. The sample city is made a Capital with the
// great pyramid's prestige unlock reached and the gold to found it (the contract's state, written as a scene does), then the
// card is picked through Show me at the middle of the city, as a monument goal's Show me picks it.
async function pyramidPlacing(api, options) {
  const g = inGame(api, 'pyramid-placing'), { world, ui } = g;
  world.milestone = 'capital';
  for (const k of ['pyramid_small', 'pyramid_great']) world.prestigeUnlocks[k] = world.day;
  world.gold = Math.max(world.gold, 20000);
  ui.refresh();
  await settle(options, 100);
  ui.showMeAt({ category: 'monuments', item: 'pyramid_great', x: world.focus.x, y: world.focus.y });
  await settle(options, 500);
  return `pyramid-placing ${ui.store.get().mode} ${ui.store.get().overlay}`;
}

// Welcome back (/?welcome=1): the card as the city opens.
async function welcome(api, options) {
  const g = inGame(api, 'welcome');
  const open = g.ui.store.get().sheet;
  if (!open || open.kind !== 'welcome') throw new Error('devScene welcome: Welcome back is not open (use ?welcome=1&seed=11&sample=1)');
  await settle(options, 300);
  return 'welcome';
}

// ── The Stage 4 scenes ──

export const STAGE4_SCENES = ['title', 'tutorial', 'site', 'pyramid', 'capstone', 'procession', 'palace', 'sitesheet', 'motion'];

// The two motions every Stage 4 shot is taken under (review note 7.2, "Screenshots in both"; spec 5.4): full is Motion
// Full; reduced follows the device (Motion 'system'), which headless Edge, asking for less motion, resolves to Gentle.
// 'gentle' and 'still' choose those levels outright (for a shot or a test that wants one whatever the device says).
// Returns the motion it set. tools/shots.ps1 -Motion takes MOTIONS.
export const MOTIONS = ['full', 'reduced'];
const MOTION_FOR = { full: 'full', reduced: 'system', gentle: 'gentle', still: 'still' };
export function setMotion(settings, motion) {
  if (!(motion in MOTION_FOR)) throw new Error(`setMotion: no motion named ${motion} (${Object.keys(MOTION_FOR).join(', ')})`);
  settings.set({ motion: MOTION_FOR[motion] });
  return motion;
}

// Where a great pyramid (7x7) would go on open desert east of the river: the n x n square of desert, with a ring of
// unbuilt land around it and EDGE tiles between it and the map's edge (so the frame shows land, not the edge), whose
// middle is nearest the middle of the city. Returns its top-left tile and size.
const EDGE = 4;
export function monumentSpot(world, n = 7) {
  const N = world.size, at = (x, y) => idx(N, x, y);
  let riverEast = -1;
  for (let x = 0; x < N; x++) if (world.terrain[at(x, world.focus.y)] === TERRAIN.WATER) riverEast = x;
  let best = null;
  for (let y = EDGE; y + n + EDGE <= N; y++) {
    for (let x = Math.max(EDGE, riverEast + 2); x + n + EDGE <= N; x++) {
      let ok = true;
      for (let dy = -1; dy <= n && ok; dy++) {
        for (let dx = -1; dx <= n && ok; dx++) {
          const i = at(x + dx, y + dy), inside = dx >= 0 && dx < n && dy >= 0 && dy < n;
          if (world.occ[i] || world.road[i] || (world.wall && world.wall[i]) || world.terrain[i] === TERRAIN.WATER) ok = false;
          else if (inside && world.terrain[i] !== TERRAIN.DESERT) ok = false;
        }
      }
      if (!ok) continue;
      const d = Math.hypot(x + n / 2 - world.focus.x, y + n / 2 - world.focus.y);
      if (!best || d < best.d) best = { x, y, n, d };
    }
  }
  if (!best) throw new Error(`devScene: no ${n}x${n} of open desert east of the river`);
  return { x: best.x, y: best.y, n };
}

// The title card with its backdrop (Track F, spec 4.1, 5.7 item 7, review note 7.1 item 7): the camera's first drift point
// frames the sample city's colossus under way, its finished small obelisk and its palace in its third style
// (src/dev/sampleCity.js addShowcase), the view Gentle and Still hold. The description names what the backdrop shows.
async function title(api) {
  if (api.phase() !== 'title') throw new Error('devScene title: open the title card (/?nosw=1)');
  await wait(300);
  const view = api.titleView && api.titleView();
  const find = (type) => (view ? allBuildings(view.world).find((b) => b.type === type) : null);
  const ob = find('obelisk_small'), co = find('colossus'), pal = find('palace');
  if (!ob || !co || !pal) return 'title';
  return `title: small obelisk ${ob.site.done === null ? 'under way' : 'finished'}, colossus course ${co.site.course}, palace style ${pal.style}`;
}

// The picture cards (Track G, src/dev/tutorialScenes.js): on the title card, the cards' first card as a player first meets
// them ({ card: i } for card i); on seed 7's fresh city, { picture: id } sets up that card's picture for tools/tutorial.ps1.
const tutorial = (api, options) => tutorialScene(api, options);

// The nearest spot to (cx, cy), within r tiles, where `type` can be placed with a road touching it (the sim's strict
// canPlace), or null.
function spotFor(world, type, cx, cy, r) {
  let best = null;
  for (let y = Math.max(0, Math.floor(cy - r)); y <= Math.min(world.size - 1, Math.ceil(cy + r)); y++) {
    for (let x = Math.max(0, Math.floor(cx - r)); x <= Math.min(world.size - 1, Math.ceil(cx + r)); x++) {
      const d = Math.hypot(x - cx, y - cy);
      if (d > r || (best && d >= best.d) || !canPlace(world, type, x, y).ok) continue;
      best = { x, y, d };
    }
  }
  return best;
}

// Stage 4 (Track C): the town palace at its highest style (lapis and gold), in the town centre, its sheet open: the palace is
// placed through the command on the spot with a road nearest the point between the working temple and the bazaar nearest the
// middle of the city (the free 3x3 nearest that point, waiting for its road, when none has one), its style written to the
// contract's shape as the five enlargements would leave it, then selected as a tap on it selects it.
async function palace(api) {
  const g = inGame(api, 'palace'), { world, ui } = g, N = world.size;
  const near = (b) => Math.abs(b.x - world.focus.x) + Math.abs(b.y - world.focus.y);
  const nearest = (type) => allBuildings(world).filter((b) => b.type === type).sort((a, b) => near(a) - near(b))[0];
  const temple = nearest('temple'), bazaar = nearest('bazaar');
  const mid = (b) => ({ x: b.x + b.w / 2, y: b.y + b.d / 2 });
  const parts = [temple, bazaar].filter(Boolean).map(mid);
  const c = parts.length ? { x: parts.reduce((s, p) => s + p.x, 0) / parts.length, y: parts.reduce((s, p) => s + p.y, 0) / parts.length } : { ...world.focus };
  let best = null;
  for (let y = 0; y + 3 <= N; y++) {
    for (let x = 0; x + 3 <= N; x++) {
      const d = Math.hypot(x + 1.5 - c.x, y + 1.5 - c.y);
      if (d > 10 || (best && d >= best.d)) continue;
      let ok = true;
      for (let dy = 0; dy < 3 && ok; dy++) for (let dx = 0; dx < 3 && ok; dx++) if (!freeLand(world, x + dx, y + dy) || world.road[idx(N, x + dx, y + dy)] || (world.wall && world.wall[idx(N, x + dx, y + dy)])) ok = false;
      if (ok) best = { x, y, d };
    }
  }
  if (!['capital', 'great_city', 'city', 'market_town', 'town'].includes(world.milestone)) world.milestone = 'town';
  world.gold = Math.max(world.gold, 1000);
  const standing = allBuildings(world).find((b) => b.type === 'palace');      // the sample city has one (Track F): enlarge it
  const roadSpot = standing || spotFor(world, 'palace', c.x - 1.5, c.y - 1.5, 10);
  const at = roadSpot || best;
  if (!at) throw new Error('devScene palace: no free 3x3 in the town centre');
  const result = standing ? { ok: true, id: standing.id } : place(world, 'palace', at.x, at.y, { roadLater: !roadSpot });
  if (!result.ok) throw new Error(`devScene palace: the palace would not go down (${result.reason})`);
  world.buildings[result.id].style = PALACE.lastStyle;
  assignLabour(world);
  ui.refresh();
  g.cam.zoom = 1;
  focus(g, at.x + 1.5, at.y + 1.5, 'sheet');
  ui.store.set(select(ui.store.get(), result.id));
  await wait(300);
  return `palace ${at.x},${at.y} style ${world.buildings[result.id].style}${roadSpot ? '' : ' no road'}`;
}

// ── Track B: the monument scenes ──

// A great pyramid at monumentSpot, its site written to the contract's shapes (b.site: course, laid, stock, crews), a road
// along its front, and full builders' guilds on free desert beyond the road (as many as fit, at most `guilds`), whose
// ids are its crews, as a site under way would have them. The sample city starts paused, so the scene stays as set.
export function pyramidScene(world, { course, frac = 0, stock = { stone: 120, bricks: 40 }, guilds = 4 } = {}) {
  const s = monumentSpot(world), N = world.size;
  const b = insertBuilding(world, makeBuilding(world, 'pyramid_great', s.x, s.y));
  const front = s.y + s.n;
  for (let x = s.x - 1; x <= s.x + s.n; x++) world.road[idx(N, x, front)] = 1;
  world.roadVersion++;
  const crews = [], free = (x, y) => freeLand(world, x, y) && !world.road[idx(N, x, y)];
  for (let x = s.x - 1; x + 1 <= s.x + s.n && crews.length < guilds; x += 2) {
    if (![0, 1].every((dx) => [1, 2].every((dy) => free(x + dx, front + dy)))) continue;
    const g = insertBuilding(world, makeBuilding(world, 'builders_guild', x, front + 1));
    g.staff = BUILDINGS.builders_guild.workers;
    crews.push(g.id);
  }
  const c = MONUMENTS.pyramid_great.courses[Math.min(course, MONUMENTS.pyramid_great.courses.length - 1)];
  Object.assign(b.site, { course, laid: { stone: c.stone * frac, bricks: c.bricks * frac }, stock: { ...stock }, crews, idle: 0, reason: null });
  return b;
}

// A great pyramid's site part built (review note 3.3): the paved apron, stockpiled blocks, five courses laid and the
// sixth half laid, the ramp up the front, the guilds' crews at work; framed whole at zoom 0.75.
async function site(api) {
  const g = inGame(api, 'site');
  const b = pyramidScene(g.world, { course: 5, frac: 0.55 });
  g.cam.zoom = 0.75;
  focus(g, b.x + b.w / 2 - 0.8, b.y + b.d / 2 - 0.8);
  await wait(200);
  return `site ${b.x},${b.y} course ${b.site.course} crews ${b.site.crews.length}`;
}

// A pyramid course going up, framed close at zoom 1.5 on the course under way: blocks laid row by row, the ramp landing
// on it, the gangs and the masons (review note 3.3).
async function pyramid(api) {
  const g = inGame(api, 'pyramid');
  const b = pyramidScene(g.world, { course: 8, frac: 0.6, stock: { stone: 160, bricks: 120 } });
  g.cam.zoom = 1.5;
  focus(g, b.x + b.w / 2 - 2.2, b.y + b.d / 2 - 2.2);
  await wait(200);
  return `pyramid ${b.x},${b.y} course ${b.site.course}`;
}

// A great pyramid's capstone set: its last course is laid on screen, then a second later it is finished (course 12,
// done today, its crews gone), so the capture, 1.8 s after the scene, falls in the one slow shine and the sparkle under
// Full and in the still outline under Gentle. Framed whole at zoom 1.
async function capstone(api) {
  const g = inGame(api, 'capstone'), { world } = g;
  const b = pyramidScene(world, { course: 11, frac: 0.98, stock: { stone: 0, bricks: 0 } });
  g.cam.zoom = 1;
  focus(g, b.x + b.w / 2 - 1.2, b.y + b.d / 2 - 1.2);
  setTimeout(() => {
    Object.assign(b.site, { course: MONUMENTS.pyramid_great.courses.length, laid: { stone: 0, bricks: 0 }, crews: [], done: world.day, extraPaid: true });
  }, 1000);
  await wait(200);
  return `capstone ${b.x},${b.y}`;
}

// A festival at the working temple nearest the middle of the city, held through the sim's command as the temple
// sheet's button holds it (with its caption), and its procession framed close (spec 5.7 item 3): priests with the carried
// shrine, musicians and dancers walking the roads in the temple's reach, streamers at the temple's front corners. The
// sim then runs (its own tick, as play would) until the whole procession has filed out of the temple and the carried
// shrine stands where least is built just in front of it (the day from PROCESSION_DAYS to PROCESSION_DAYS_MAX with the
// most free tiles in the two rows before it, the earliest of equals), so nothing hides it; the
// city stays paused, so it holds still for the shot, framed on the shrine at zoom 1.5. Returns the temple, the
// festival's day and how many figures walk (render/walkers.js festivalSize).
const PROCESSION_DAYS = 6, PROCESSION_DAYS_MAX = 40;
async function procession(api) {
  const g = inGame(api, 'procession'), { world, ui } = g;
  const near = (b) => Math.abs(b.x - world.focus.x) + Math.abs(b.y - world.focus.y);
  const temple = allBuildings(world).filter((b) => b.type === 'temple' && isWorking(world, b)).sort((a, b) => near(a) - near(b))[0];
  if (!temple) throw new Error('devScene procession: no working temple');
  const result = holdFestival(world);
  if (!result.ok) throw new Error(`devScene procession: no festival (${result.reason})`);
  ui.toasts.show(DANGER_UI_TEXT.festivalHeld);
  ui.afterCommand({ kind: 'festival', result, text: DANGER_UI_TEXT.festivalHeld, undoable: false });
  const held = world.danger.festivalDay;
  const mine = (w) => w.id >= PROCESSION_ID_BASE + temple.id * 16 && w.id < PROCESSION_ID_BASE + temple.id * 16 + 16;
  const isShrine = (w) => w.id === PROCESSION_ID_BASE + temple.id * 16 + PROCESSION.order.indexOf('shrine');
  const FRONT = [[1, 0], [0, 1], [1, 1], [2, 1], [1, 2], [2, 2]];
  const open = (w) => FRONT.filter(([dx, dy]) => freeLand(world, Math.floor(w.x) + dx, Math.floor(w.y) + dy)).length;
  let days = PROCESSION_DAYS, best = -1;
  for (let d = PROCESSION_DAYS; d <= PROCESSION_DAYS_MAX; d++) {
    const s = processionsAt(world, held + d, null).find(isShrine);
    if (s && open(s) > best) { best = open(s); days = d; }
  }
  for (let i = 0; i < days; i++) tickDay(world);
  ui.refresh();
  const figures = processionsAt(world, world.day, null).filter(mine);
  if (!figures.length) throw new Error('devScene procession: no procession at the temple');
  const shrine = figures.find(isShrine) || figures[0];
  g.cam.zoom = 1.5;
  focus(g, shrine.x, shrine.y);
  await wait(300);
  return `procession ${temple.id} day ${held} figures ${figures.length}`;
}

// Stage 4 (Track C, review note 3.9): a small pyramid's site sheet: its course and share done, two crews, stone and bricks on
// site, what holds it up (bricks), last month's pace and gold, and its prestige. The city is made a Capital with the small
// pyramid unlocked; the site and two builders' guilds are placed through the commands on spots with a road near the middle of
// the city, and the site's state (courses, stock, crews, last month, the reason it waits) is written to the contract's shape,
// as a few years of Track A's crews would leave it. Then the site is selected as a tap on it selects it.
async function sitesheet(api) {
  const g = inGame(api, 'sitesheet'), { world, ui } = g;
  world.milestone = 'capital';
  world.prestigeUnlocks.pyramid_small = world.day;
  world.gold = Math.max(world.gold, 20000);
  const at = spotFor(world, 'pyramid_small', world.focus.x, world.focus.y, 16);
  if (!at) throw new Error('devScene sitesheet: no room for a small pyramid with a road near the middle of the city');
  const site = place(world, 'pyramid_small', at.x, at.y);
  if (!site.ok) throw new Error(`devScene sitesheet: the site would not go down (${site.reason})`);
  const guilds = [];
  for (let i = 0; i < 2; i++) {
    const s = spotFor(world, 'builders_guild', at.x + 2, at.y + 2, 10);
    const r = s ? place(world, 'builders_guild', s.x, s.y) : null;
    if (r && r.ok) guilds.push(r.id);
  }
  const b = world.buildings[site.id];
  Object.assign(b.site, {
    course: 3, laid: { stone: 408, bricks: 72 }, stock: { stone: 46, bricks: 0 }, crews: guilds, idle: 3, reason: 'no_bricks',
    // last month as the sim would pay it: a full crew-month each, at the work gold (130 a crew on Normal)
    last: { units: MONUMENT.unitsPerCrewMonth * guilds.length, gold: MONUMENT.unitsPerCrewMonth * guilds.length * MONUMENT.goldPerUnit, crews: guilds.length },
  });
  assignLabour(world);
  ui.refresh();
  g.cam.zoom = 1;
  focus(g, b.x + b.w / 2, b.y + b.d / 2, 'sheet');
  ui.store.set(select(ui.store.get(), b.id));
  await wait(300);
  return `sitesheet ${b.id} at ${at.x},${at.y} crews ${guilds.length}`;
}

// The Settings sheet scrolled to the Motion row (spec 5.4): its four choices, the status line saying what it is doing
// ("Motion: Gentle (your device asks for less motion)" under the reduced shots, "Motion: Full" under the full ones) and
// the line saying what that level moves.
async function motion(api) {
  const g = inGame(api, 'motion'), { ui } = g;
  const s = ui.store.get();
  ui.store.set(openSheet(s.sheet ? closeSheet(s) : s, 'settings'));
  await wait(150);
  const sheet = document.querySelector('#sheet');
  const choice = sheet && sheet.querySelector('.choice.motion');
  if (!choice) throw new Error('devScene motion: no Motion row in the Settings sheet');
  const row = choice.closest('.row'), head = sheet.querySelector('.head');
  sheet.scrollTop += row.getBoundingClientRect().top - (head ? head.getBoundingClientRect().bottom : sheet.getBoundingClientRect().top) - 8;
  await wait(100);
  return `motion ${ui.settings.get().motion} level ${ui.settings.motionLevel()}`;
}

// Stage 4.5 (Task 3, ruling 313): the river layouts. Open /?skipTitle=1&nosw=1&seed=<n>&variant=<name> (classic, east, middle,
// wide-bends, island or oasis), then devScene('variant') pulls the camera out to the whole map: the zoom goes below the
// buttons' minimum (zoom is set straight on the camera, as no player move can), so a phone shows the river's whole shape.
export const STAGE45_SCENES = ['variant', 'bridge', 'clay'];
// options.look: 'island' or 'oasis' frames that feature close (zoom 0.4), else the whole map; options.zoom overrides the zoom.
async function variant(api, options = {}) {
  const g = inGame(api, 'variant');
  const w = g.world, v = viewOf(g);
  g.ui.cameraControl.cancel();
  const feature = options.look === 'island' ? riverIsle(w) : options.look === 'oasis' ? riverPools(w) : [];
  const at = feature.length ? { x: feature.reduce((s, t) => s + t[0], 0) / feature.length + 0.5, y: feature.reduce((s, t) => s + t[1], 0) / feature.length + 0.5 } : { x: w.size / 2, y: w.size / 2 };
  g.cam.zoom = options.zoom || (feature.length ? 0.4 : Math.min(0.5, (v.width * 0.94) / (w.size * 64)));
  g.ui.cameraControl.jumpTo(at.x, at.y);
  await wait(300);
  return `variant ${w.mapVariant} zoom ${g.cam.zoom.toFixed(3)}`;
}

// 'bridge': a road laid straight across the river on the narrowest crossing nearest the start (the road tool's own command,
// so the bridge is the sim's), with homes painted along both banks, close up (zoom 1.6, or options.zoom).
async function bridge(api, options = {}) {
  const g = inGame(api, 'bridge');
  const w = g.world, n = w.size;
  w.gold = Math.max(w.gold, 20000);
  let best = null;
  for (let y = 4; y < n - 4; y++) {
    const row = [];
    for (let x = 0; x < n; x++) row.push([x, y]);
    for (const r of bridgeRuns(w, row)) {
      if (!(r.straight && r.bounded && r.n >= 3 && r.n <= BRIDGE_MAX)) continue;
      const score = Math.abs(y - w.focus.y) + (r.n === 3 ? 0 : 2);
      if (!best || score < best.score) best = { score, y, from: row[r.from][0], to: row[r.to][0] };
    }
  }
  if (!best) throw new Error('devScene bridge: no crossing of 3 or 4 tiles of water on this map');
  const result = drawRoad(w, best.from - 6, best.y, best.to + 6, best.y);
  if (!result.ok) throw new Error(`devScene bridge: the road would not go down (${result.reason})`);
  for (const [x0, x1] of [[best.from - 6, best.from - 1], [best.to + 1, best.to + 6]]) {
    paintHouses(w, x0, best.y - 1, x1, best.y - 1);
    paintHouses(w, x0, best.y + 1, x1, best.y + 1);
  }
  g.ui.cameraControl.cancel();
  g.cam.zoom = options.zoom || 1.6;
  const mid = (best.from + best.to) / 2 + 0.5;
  g.ui.cameraControl.jumpTo(mid, best.y + 0.5);
  await wait(400);
  return `bridge ${best.to - best.from + 1} tiles at y ${best.y}, ${result.bridges.length} bridge tiles for ${result.cost} gold`;
}

// 'clay': the Ground overlay on, with the 14 x 14 stretch of the map holding the most free clay in the middle.
async function clay(api, options = {}) {
  const g = inGame(api, 'clay');
  const w = g.world, n = w.size, K = 14;
  let best = null;
  for (let y0 = 0; y0 + K <= n; y0 += 2) {
    for (let x0 = 0; x0 + K <= n; x0 += 2) {
      let c = 0;
      for (let y = y0; y < y0 + K; y++) for (let x = x0; x < x0 + K; x++) if (w.terrain[idx(n, x, y)] === TERRAIN.CLAY && !w.occ[idx(n, x, y)] && !w.road[idx(n, x, y)]) c++;
      if (!best || c > best.c) best = { c, x: x0 + K / 2, y: y0 + K / 2 };
    }
  }
  g.ui.store.set({ overlay: 'ground' });
  g.ui.cameraControl.cancel();
  g.cam.zoom = options.zoom || 1;
  g.ui.cameraControl.jumpTo(best.x, best.y);
  await wait(400);
  return `clay ${best.c} free clay tiles round (${best.x}, ${best.y})`;
}

const SCENES = {
  peaceful, fire, tribute, battle, score, ambient,
  early, plots, raid, 'raid-fire': raidFire, 'raid-overlay': raidOverlay, placing, farm, 'farm-raid': farmRaid, sheet, welcome, expanded, 'pyramid-placing': pyramidPlacing,
  title, tutorial, site, pyramid, capstone, procession, palace, sitesheet, motion,
  variant, bridge, clay,
};

export async function devScene(api, name, options = {}) {
  const scene = SCENES[name];
  if (!scene) throw new Error(`devScene: no scene named ${name} (${[...DEV_SCENES, ...MOBILE_SCENES, ...STAGE4_SCENES, ...STAGE45_SCENES].join(', ')})`);
  return scene(api, options);
}

// ── Measuring the rows (the mobile budget) ──

// The layers under the top bar, by the container each lives in (index.html's #under-bar): the alert row (the critical
// banner), then what the guidance row may hold (the overlay legend, the goal with its threshold bar and nudge line, a
// tip, a caption).
const ROW_LAYERS = { alert: '#banner', legend: '#legend', goal: '#goals', tip: '#tip', caption: '#cheer' };

// The rows under the top bar, read off the page, for the height budget of the mobile UX review (section 3). frame is the
// element that stands for the screen (a test's mounted shell); by default the window. Every box is in CSS px from the
// screen's top left, { top, bottom, left, right }, or null when nothing of it shows.
//   topBar       the top bar
//   layers       each of ROW_LAYERS that shows (the union of its visible children)
//   rows         how many rows the layers make: layers side by side are one row
//   rowsEnd      where the last row ends (the top bar's bottom when there is none); rowsRight, the rows' right edge
//   sheet        the open sheet (at the bottom in portrait, a side column in compact), or null
//   bottomStart  where the first full-width bottom panel (dock, confirm bar, sheet) starts; rightEdge, where a side
//                panel (rail, drawer, sheet, confirm bar) starts; clearMap, the share of the screen left clear between
//   cornersTop   the top of the corner buttons
export function measureRows(frame = null) {
  const scope = frame || document;
  const at = frame ? frame.getBoundingClientRect() : { left: 0, top: 0, width: innerWidth, height: innerHeight };
  const W = at.width, H = at.height;
  const visible = (n) => {
    const cs = getComputedStyle(n);
    if (cs.display === 'none' || cs.visibility === 'hidden') return false;
    const r = n.getBoundingClientRect();
    return r.width > 2 && r.height > 2;
  };
  const box = (nodes) => {
    const rs = nodes.filter((n) => n && visible(n)).map((n) => n.getBoundingClientRect());
    if (!rs.length) return null;
    return {
      top: Math.min(...rs.map((r) => r.top)) - at.top, bottom: Math.max(...rs.map((r) => r.bottom)) - at.top,
      left: Math.min(...rs.map((r) => r.left)) - at.left, right: Math.max(...rs.map((r) => r.right)) - at.left,
    };
  };
  const one = (sel) => box([scope.querySelector(sel)]);
  const topBar = one('#topbar');
  const layers = {};
  for (const [name, sel] of Object.entries(ROW_LAYERS)) {
    const container = scope.querySelector(sel);
    const b = container ? box([...container.children]) : null;
    if (b) layers[name] = b;
  }
  const bands = [];
  for (const b of Object.values(layers).sort((p, q) => p.top - q.top)) {
    const last = bands[bands.length - 1];
    if (last && b.top < last.bottom - 1) last.bottom = Math.max(last.bottom, b.bottom);
    else bands.push({ top: b.top, bottom: b.bottom });
  }
  const shown = Object.values(layers);
  const rowsEnd = Math.max(topBar ? topBar.bottom : 0, ...shown.map((b) => b.bottom));
  const rowsRight = shown.length ? Math.max(...shown.map((b) => b.right)) : 0;
  const sheetBox = one('#sheet');
  const panels = { dock: one('#dock'), confirm: one('#confirm'), sheet: sheetBox, rail: one('#rail'), drawer: one('#rail .drawer') };
  const bottomStart = Math.min(H, ...['dock', 'confirm', 'sheet'].map((k) => panels[k]).filter((p) => p && p.left < W / 2 && p.right > W / 2).map((p) => p.top));
  const rightEdge = Math.min(W, ...['rail', 'drawer', 'sheet', 'confirm'].map((k) => panels[k]).filter((p) => p && p.left > W / 3).map((p) => p.left));
  const corners = box([...scope.querySelectorAll('#corners .group')]);
  return {
    width: W, height: H, layout: document.body.dataset.layout, textSize: Number(document.body.dataset.textSize),
    topBar, layers, rows: bands.length, rowsEnd, rowsRight, sheet: sheetBox, bottomStart, rightEdge,
    clearMap: Math.max(0, bottomStart - rowsEnd) * rightEdge / (W * H), cornersTop: corners ? corners.top : H,
  };
}
