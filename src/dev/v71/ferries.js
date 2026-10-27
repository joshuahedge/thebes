// Version 7.1, Track F's dev scenes: ferries, on a map of their own (Track M's wide layouts are not merged yet): a straight river `width` tiles wide (default 8) down the
// middle of a 48 x 48 map, a town on each bank with a road along row 24 that ends at the water, a store and a well each side. Open /?skipTitle=1&nosw=1 first, then
// window.__thebes.devScene(name, options). The town is a fixture (homes put down whole with residents, so the labour step has hands for the ferrymen); the ferry and
// every refusal go through the public commands and the placing tool, as a player's would.
//   v71-ferry-laying    the Ferry tool picked and a line dragged bank to bank (options: width; wide: true a 13-tile river so the refusal shows; touch: true
//                       for the touch bar's words): the preview, its price and the bar
//   v71-ferry-working   the same crossing laid and staffed, the boat on its dashed line (options: width; sheet: true opens the west landing's sheet;
//                       idle: true leaves the ferrymen out so the sheet says why it does not run)
// Every scene takes { quick } (no settling wait). Motion is the caller's (headless Edge is Gentle: the boat sits at a landing).
import { createWorld, makeBuilding, insertBuilding } from '../../sim/world.js';
import { T } from '../../sim/terrain.js';
import { idx } from '../../sim/grid.js';
import { ferrySpot } from '../../sim/ferries.js';   // Version 8.2.1: v71-ferry-shown
import { drawRoute } from '../../sim/route.js';
import { setGuide } from '../../sim/commands.js';
import { assignLabour } from '../../sim/labour.js';
import { drawFerry } from '../../sim/ferryLay.js';
import { select } from '../../ui/modes.js';
import { inGame } from '../s46/base.js';
import { wait, look } from '../v70/base.js';

const SIZE = 48, ROW = 24, RIVER_X = 20;
// A tile along the river's width is 32 px across at zoom 1, so ten of them (two landings and the water) fit a phone at about 1.0 and a laptop at 1.3.
const zoomFor = (options) => options.zoom || (window.innerWidth < 600 ? 1.0 : 1.3);

function ferryMap(width) {
  const terrain = new Array(SIZE * SIZE).fill(T.DESERT);
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const i = idx(SIZE, x, y);
      if (x >= RIVER_X && x < RIVER_X + width) terrain[i] = T.WATER;
      else if (x === RIVER_X - 1 || x === RIVER_X + width) terrain[i] = T.BANK;
      else if (x < RIVER_X - 1 && x > RIVER_X - 8) terrain[i] = T.FERTILE;
    }
  }
  return { size: SIZE, terrain, tradeEntry: { x: SIZE - 1, y: ROW }, startRoad: [], focus: { x: RIVER_X - 6, y: ROW }, raiderEntries: [] };
}

const put = (world, type, x, y, extra = {}) => insertBuilding(world, Object.assign(makeBuilding(world, type, x, y), extra));

// The two towns: roads along row 24 from the map's edge to the water's edge's neighbour (the landing tile stays free), homes either side, a store and a well.
function town(world, width) {
  const east0 = RIVER_X + width + 1;
  for (let x = 6; x <= RIVER_X - 2; x++) world.road[idx(SIZE, x, ROW)] = 1;
  for (let x = east0; x <= SIZE - 8; x++) world.road[idx(SIZE, x, ROW)] = 1;
  world.roadVersion++;
  // a store and a well on each bank, on the road's south side, then homes along both sides wherever those left room
  put(world, 'storehouse', RIVER_X - 7, ROW + 1);
  put(world, 'well', RIVER_X - 4, ROW + 1);
  put(world, 'storehouse', east0 + 4, ROW + 1);
  put(world, 'well', east0 + 2, ROW + 1);
  for (const [x0, x1] of [[7, RIVER_X - 4], [east0 + 1, SIZE - 10]]) {
    for (let x = x0; x <= x1; x += 2) {
      for (const y of [ROW - 1, ROW + 1]) if (!world.occ[idx(SIZE, x, y)]) put(world, 'house', x, y, { tier: 2, residents: 6 });
    }
  }
  assignLabour(world);
}

function open(api, name, options) {
  inGame(api, name);
  const width = options.width || (options.wide ? 13 : 8);
  const world = createWorld({ seed: 5, size: SIZE, map: ferryMap(width) });
  world.gold = 20000;
  town(world, width);
  setGuide(world, false);
  api.startGame(world, { saveNow: false });
  const g = api.game();
  g.ui.cameraControl.cancel();
  g.cam.zoom = zoomFor(options);
  return { g, world, width, west: [RIVER_X - 2, ROW], east: [RIVER_X + width + 1, ROW] };
}

export async function ferryLayingScene(api, options = {}) {
  const { g, world, width, west, east } = open(api, 'v71-ferry-laying', options);
  look(api, RIVER_X + width / 2, ROW + 0.5, zoomFor(options));
  const pl = g.ui.placement;
  pl.start({ kind: 'ferry' });
  pl.pointAt(west[0], west[1]);
  pl.pointAt(east[0], east[1]);
  if (!options.quick) await wait(300);
  const p = pl.preview();
  return `v71-ferry-laying: ${width} tiles of water, ${p.state}: ${p.text}`;
}

export async function ferryWorkingScene(api, options = {}) {
  const { g, world, width, west, east } = open(api, 'v71-ferry-working', options);
  const line = [];
  for (let x = west[0]; x <= east[0]; x++) line.push([x, ROW]);
  const r = drawFerry(world, line);
  if (!r.ok) throw new Error(`devScene v71-ferry-working: the ferry would not go down (${r.reason})`);
  if (options.idle) for (const id of r.ids) world.buildings[id].paused = true;
  assignLabour(world);
  look(api, RIVER_X + width / 2, ROW + 0.5, zoomFor(options));
  if (options.sheet) g.ui.store.set(select(g.ui.store.get(), r.ids[0]));
  if (!options.quick) await wait(300);
  return `v71-ferry-working: ${width} tiles of water, landings ${r.ids.join(' and ')}, ${world.buildings[r.ids[0]].ferry.run ? 'running' : 'not running'}`;
}

// Version 8.2.1 (rulings 1340-1359): v71-ferry-shown, a real city (options: variant, default 'wide-nile'; seed, default 1) whose road is routed from the start road to the bank
// nearest it, with the Ferry tool picked there: the crossings it shows. pick: true picks the first (the bar leads with it); built: true builds it (its stubs show).
export async function ferryShownScene(api, options = {}) {
  inGame(api, 'v71-ferry-shown');
  const world = createWorld({ seed: options.seed || 1, mapVariant: options.variant || 'wide-nile' });
  world.gold = 20000;
  setGuide(world, false);
  const st = world.startRoad[world.startRoad.length - 1];
  const s = ferrySpot(world, { x: st[0], y: st[1] });
  const d = (t) => Math.abs(t[0] - st[0]) + Math.abs(t[1] - st[1]);
  const [l, o] = d(s.from) <= d(s.to) ? [s.from, s.to] : [s.to, s.from];
  const away = s.vertical ? [0, Math.sign(l[1] - o[1])] : [Math.sign(l[0] - o[0]), 0];
  drawRoute(world, st[0], st[1], l[0] + 2 * away[0], l[1] + 2 * away[1]);
  api.startGame(world, { saveNow: false });
  const g = api.game();
  const at = { x: s.x + 0.5, y: s.y + 0.5 };
  look(api, at.x, at.y, options.zoom || (window.innerWidth < 600 ? 1.0 : 1.3));
  const pl = g.ui.placement;
  pl.start({ kind: 'ferry' }, at);
  const shown = pl.ferryChoices() || [];
  if ((options.pick || options.built) && shown.length) pl.pickCrossing(shown[0].key);
  if (options.built && shown.length) { pl.confirm(); assignLabour(world); }
  if (!options.quick) await wait(300);
  return `v71-ferry-shown: ${shown.length} crossings shown${options.built ? ', the first built' : options.pick ? ', the first picked' : ''}`;
}
