// Version 5.0 Task 5: the dev scene for the routed road (src/dev/v50/index.js joins it). A small fixture laid raw as the tests' streets are: a river down the middle (3 tiles of
// water wide), a cluster of hills and a few buildings on the west bank between the start and the end, a road down the east bank. options.view:
//   'route'    the road tool in Route, a start on the west bank and an end on the east: the road goes round the hills and the buildings, crosses the river by a bridge and
//              joins the east road, "N tiles · 1 bridge (3 tiles, 75 gold) · M tiles of road already there" and the price, before the tick
//   'straight' the same two ends in Straight: the L is refused (the hills are in the way), which is where the Route button helps
//   'refused'  the river is 6 tiles wide all the way down: Route says "No way across: the water is too wide here", with Show me
//   'boxed'    the end stands inside a ring of buildings: "No way there: buildings close it off (...)", with Show me
// options: view ('route'), gold (2000), motion ('gentle' | 'full' | 'still'), zoom, quick (no settling wait: the mobile budget test).
import { createWorld, makeBuilding, insertBuilding, allBuildings } from '../../sim/world.js';
import { setGuide } from '../../sim/commands.js';
import { BUILDINGS } from '../../data/buildings.js';
import { T } from '../../sim/terrain.js';
import { idx } from '../../sim/grid.js';
import { wait, inGame } from '../s46/base.js';

const SIZE = 40;
const START = [4, 22], END = [29, 11];
const add = (world, type, x, y) => insertBuilding(world, makeBuilding(world, type, x, y));

function bank(gold, riverWidth, boxed) {
  const terrain = new Array(SIZE * SIZE).fill(T.DESERT);
  const x0 = riverWidth > 3 ? 14 : 16;
  for (let y = 0; y < SIZE; y++) for (let x = x0; x < x0 + riverWidth; x++) terrain[idx(SIZE, x, y)] = T.WATER;
  for (let y = 16; y <= 24; y++) for (let x = 8; x <= 11; x++) terrain[idx(SIZE, x, y)] = T.HILLS;   // hills square across the straight way
  for (const [x, y] of [[10, 25], [11, 25], [8, 15], [9, 15], [7, 17], [7, 18]]) terrain[idx(SIZE, x, y)] = T.HILLS;
  const map = { size: SIZE, terrain, tradeEntry: { x: SIZE - 1, y: SIZE - 1 }, startRoad: [], focus: { x: 16, y: 18 }, raiderEntries: [] };
  const world = createWorld({ seed: 11, size: SIZE, map });
  world.gold = gold;
  world.milestone = 'capital';
  for (let y = 4; y <= 32; y++) world.road[idx(SIZE, 24, y)] = 1;                                   // the east bank's road
  for (let x = 24; x <= 33; x++) world.road[idx(SIZE, x, 11)] = 1;
  world.roadVersion++;
  for (const [type, x, y] of [['granary', 12, 18], ['house', 13, 22], ['well', 13, 23], ['house', 12, 21], ['house', 13, 21], ['bazaar', 5, 17]]) add(world, type, x, y);
  if (boxed) {                                                                                       // the end stands in a ring of homes (the road is cut there)
    for (let x = END[0] - 1; x <= END[0] + 1; x++) for (let y = END[1] - 1; y <= END[1] + 1; y++) { world.road[idx(SIZE, x, y)] = 0; if (x !== END[0] || y !== END[1]) add(world, 'house', x, y); }
    world.roadVersion++;
  }
  for (const b of allBuildings(world)) b.staff = BUILDINGS[b.type].workers;
  return world;
}

export const roadsScene = async (api, options = {}) => {
  inGame(api, 'v50-roads');
  const o = { view: 'route', ...options };
  const world = bank(o.gold === undefined ? 2000 : o.gold, o.view === 'refused' ? 6 : 3, o.view === 'boxed');
  setGuide(world, false);
  api.startGame(world, { saveNow: false });
  const g = api.game();
  if (o.motion) g.ui.settings.set({ motion: o.motion });
  g.ui.cameraControl.cancel();
  const width = g.ui.cameraControl.centre().x * 2 || 390;   // the map's own width (a wide screen gives the side panel its share)
  g.cam.zoom = o.zoom || Math.max(0.28, Math.min(1.1, (width * 0.86) / 1200));
  g.ui.cameraControl.jumpTo(16.5, 16.5);
  const ui = g.ui;
  ui.placement.start({ kind: 'road' });
  ui.placement.setRoute(o.view !== 'straight');
  ui.store.set({ line: { x0: START[0], y0: START[1], x1: END[0], y1: END[1], flip: false } });
  const p = ui.placement.preview();
  if (!o.quick) await wait(400);
  ui.refresh();
  return `v50-roads: ${o.view}, ${p.state}${p.reason ? ` (${p.reason})` : ''}, ${p.count} tiles for ${p.cost}${p.bridges ? `, ${p.bridges.length} bridge tiles` : ''}, gold ${world.gold}`;
};
