// Version 5.0 Task 4: the dev scene for Build another and drag areas (src/dev/v50/index.js joins it). A small fixture (a fertile west bank with a pond, a road beside it,
// a storehouse with a Fetch order, a bazaar, a house), laid raw as the tests' streets are. options.view:
//   'another'      the storehouse's sheet open: Build another among its buttons
//   'another-bar'  Build another was tapped: the same storehouse's tool in hand, the ghost beside it, its copied Fetch order said in the bar
//   'refused'      the treasury is in debt (gold option, -450): Build another was tapped and the sheet says why, with Show me
//   'farm'         the farm tool dragged over the bank: "N farms · G gold", the pond and the sand skipped, the road missing for some
//   'garden'       a garden area at the chosen spacing (options.spacing, 2) over open sand beside the road
//   'broke'        the farm area costs more than the treasury can pay (gold option, default -300: debt stops at -500): the bar says how many it can pay for
// options: view ('farm'), gold (2000; 'broke' -300, 'refused' -450), spacing (2), motion ('gentle' | 'full' | 'still'), quick (no settling wait: the mobile budget test).
import { createWorld, makeBuilding, insertBuilding, allBuildings } from '../../sim/world.js';
import { setGuide } from '../../sim/commands.js';
import { setFetch } from '../../sim/carts.js';
import { BUILDINGS } from '../../data/buildings.js';
import { T } from '../../sim/terrain.js';
import { idx } from '../../sim/grid.js';
import { select } from '../../ui/modes.js';
import { wait, inGame } from '../s46/base.js';

const SIZE = 40;
const add = (world, type, x, y, extra = {}) => insertBuilding(world, Object.assign(makeBuilding(world, type, x, y), extra));

// Fertile land on x 0-13 with a pond at (5-8, 12-15) and sand beyond; a road down x = 14 and along y = 24; the storehouse, a bazaar and a house by the road.
function bank(gold) {
  const terrain = new Array(SIZE * SIZE).fill(T.DESERT);
  for (let y = 0; y < SIZE; y++) for (let x = 0; x < 14; x++) terrain[idx(SIZE, x, y)] = T.FERTILE;
  for (let y = 12; y <= 15; y++) for (let x = 5; x <= 8; x++) terrain[idx(SIZE, x, y)] = T.WATER;
  const map = { size: SIZE, terrain, tradeEntry: { x: SIZE - 1, y: SIZE - 1 }, startRoad: [], focus: { x: 16, y: 20 }, raiderEntries: [] };
  const world = createWorld({ seed: 11, size: SIZE, map });
  world.gold = gold;
  world.milestone = 'capital';
  for (let y = 0; y <= 24; y++) world.road[idx(SIZE, 14, y)] = 1;
  for (let x = 14; x < SIZE; x++) world.road[idx(SIZE, x, 24)] = 1;
  world.roadVersion++;
  add(world, 'house', 17, 22);
  const store = add(world, 'storehouse', 17, 25);
  add(world, 'storehouse', 22, 25, { store: { pottery: 200, linen: 120 } });
  add(world, 'bazaar', 25, 22);
  for (const b of allBuildings(world)) b.staff = BUILDINGS[b.type].workers;
  setFetch(world, store.id, 'pottery', 100);
  setFetch(world, store.id, 'linen', 40);
  return { world, store };
}

export const areasScene = async (api, options = {}) => {
  inGame(api, 'v50-areas');
  const o = { view: 'farm', spacing: 2, ...options };
  const { world, store } = bank(o.gold === undefined ? (o.view === 'broke' ? -300 : o.view === 'refused' ? -450 : 2000) : o.gold);
  setGuide(world, false);
  api.startGame(world, { saveNow: false });
  const g = api.game();
  if (o.motion) g.ui.settings.set({ motion: o.motion });
  g.ui.cameraControl.cancel();
  g.cam.zoom = o.zoom || 1.1;
  const ui = g.ui;
  let said = '';
  if (o.view === 'another' || o.view === 'another-bar' || o.view === 'refused') {
    g.ui.cameraControl.jumpTo(20, 24);
    ui.store.set(select(ui.store.get(), store.id));
    ui.refresh();
    if (o.view !== 'another') {
      const button = document.querySelector('#sheet button.another');
      if (!button) throw new Error('devScene v50-areas: no Build another button on the sheet');
      button.click();
    }
    const shown = document.querySelector('#sheet button.another');
    if (shown && shown.scrollIntoView) shown.scrollIntoView({ block: 'center' });   // the sheet is long: the button is what the shot is of
    said = `storehouse ${store.id}, Fetch ${Object.keys(store.orders).join(', ')}`;
  } else {
    g.ui.cameraControl.jumpTo(o.view === 'garden' ? 22 : 6, o.view === 'garden' ? 17 : 11.5);
    ui.placement.startArea(o.view === 'garden' ? 'garden' : 'farm_grain');
    if (o.view === 'garden') { ui.placement.setSpacing(o.spacing); ui.store.set({ area: { x0: 17, y0: 14, x1: 27, y1: 20 } }); }
    else ui.store.set({ area: { x0: 1, y0: 9, x1: 8, y1: 14 } });
    const t = ui.store.get().tool;
    const p = ui.placement.preview();
    said = `${t.type} area, ${p.count} laid for ${p.cost}, ${(p.skipped || []).length} skipped, ${p.state}`;
  }
  if (!o.quick) await wait(400);
  ui.refresh();
  return `v50-areas: ${o.view}, ${said}, gold ${world.gold}`;
};
