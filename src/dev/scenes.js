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
// top bar off the page, for the review note's height budget (section 3).
import { place, drawRoad, paintHouses, setPaused } from '../sim/commands.js';
import { assignLabour } from '../sim/labour.js';
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
import { T, DANGER_UI_TEXT, CITIZEN_REMARKS } from '../ui/text.js';

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

export const MOBILE_SCENES = ['early', 'plots', 'raid', 'raid-fire', 'raid-overlay', 'placing', 'sheet', 'welcome'];

// The page query each mobile scene opens with (tools/shots.ps1 -Mobile adds nosw=1): 'early' and 'plots' on a new guided
// city, seed 7, which starts paused; 'welcome' on Welcome back over the seed-11 sample city; the rest on that city.
const SAMPLE_CITY = 'skipTitle=1&seed=11&sample=1';
export const MOBILE_SCENE_PARAMS = {
  early: 'skipTitle=1&seed=7', plots: 'skipTitle=1&seed=7', raid: SAMPLE_CITY, 'raid-fire': SAMPLE_CITY, 'raid-overlay': SAMPLE_CITY,
  placing: SAMPLE_CITY, sheet: SAMPLE_CITY, welcome: 'welcome=1&seed=11&sample=1',
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
  g.ui.afterCommand({ kind: 'houses', result, text: T.plotsPainted, undoable: true });
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

// Welcome back (/?welcome=1): the card as the city opens.
async function welcome(api, options) {
  const g = inGame(api, 'welcome');
  const open = g.ui.store.get().sheet;
  if (!open || open.kind !== 'welcome') throw new Error('devScene welcome: Welcome back is not open (use ?welcome=1&seed=11&sample=1)');
  await settle(options, 300);
  return 'welcome';
}

const SCENES = {
  peaceful, fire, tribute, battle, score, ambient,
  early, plots, raid, 'raid-fire': raidFire, 'raid-overlay': raidOverlay, placing, sheet, welcome,
};

export async function devScene(api, name, options = {}) {
  const scene = SCENES[name];
  if (!scene) throw new Error(`devScene: no scene named ${name} (${[...DEV_SCENES, ...MOBILE_SCENES].join(', ')})`);
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
