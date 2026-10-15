// Version 5.0 Task 2: the dev scene for a house sheet's next-step line (src/dev/v50/index.js joins it). A small flat street (a fixture, laid raw as the tests' streets
// are: a road along y = 10, a well, a temple, a booth and a bazaar beside it) with one home whose sheet is open, in the state options.state names:
//   'next'     a Townhouse's water is missing (the well is gone): the line says a well near here, its price, and Show me
//   'waiting'  everything it needs is there; its food is in the bazaar and comes at the next delivery (days to go)
//   'kept'     an Estate with every need met and a street pleasant enough: nothing more to do
// options: state ('next'), gold (2000; a small one makes the price read as more than the treasury has), quick (no settling wait: the mobile budget test).
import { createWorld, makeBuilding, insertBuilding, removeBuilding, allBuildings } from '../../sim/world.js';
import { houseDesirability } from '../../sim/desirability.js';
import { setGuide } from '../../sim/commands.js';
import { nextStep } from '../../sim/advice.js';
import { BUILDINGS } from '../../data/buildings.js';
import { TIERS, MAX_TIER } from '../../data/housing.js';
import { HOUSEHOLD_GOODS, GOODS } from '../../data/goods.js';
import { T } from '../../sim/terrain.js';
import { idx } from '../../sim/grid.js';
import { select } from '../../ui/modes.js';
import { wait, inGame } from '../s46/base.js';

const SIZE = 32;

function add(world, type, x, y, extra = {}) {
  const b = makeBuilding(world, type, x, y);
  Object.assign(b, extra);
  return insertBuilding(world, b);
}

// The street: a fertile west strip, a road along y = 10, and every service in reach of the home at (12, 11).
function street(state, gold) {
  const terrain = new Array(SIZE * SIZE).fill(T.DESERT);
  for (let y = 0; y < SIZE; y++) for (let x = 0; x < 8; x++) terrain[idx(SIZE, x, y)] = T.FERTILE;
  const map = { size: SIZE, terrain, tradeEntry: { x: SIZE - 1, y: SIZE - 1 }, startRoad: [], focus: { x: 14, y: 11 }, raiderEntries: [] };
  const world = createWorld({ seed: 11, size: SIZE, map });
  world.gold = gold;
  world.milestone = 'capital';
  for (let x = 0; x < SIZE; x++) world.road[idx(SIZE, x, 10)] = 1;
  world.roadVersion++;
  const well = add(world, 'well', 14, 9);
  add(world, 'temple', 20, 8);
  add(world, 'booth', 16, 9);
  const bazaar = add(world, 'bazaar', 9, 8);
  const tier = state === 'kept' ? MAX_TIER : 3;
  const cap = TIERS[tier].capacity;
  const home = add(world, 'house', 12, 11, state === 'kept' ? { tier, w: 2, d: 2, residents: cap, stockedFor: cap } : { tier, residents: cap, stockedFor: cap, stock: {} });
  if (state === 'kept') {
    bazaar.store = Object.fromEntries([['grain', 300], ['figs', 300], ['fish', 300], ...HOUSEHOLD_GOODS.map((g) => [g, 300])]);
    home.stock = Object.fromEntries([...HOUSEHOLD_GOODS.map((g) => [g, Math.ceil(cap * GOODS[g].perResidentPerMonth * 2)]), ['grain', 20], ['figs', 20], ['fish', 20]]);
    // Statues round it until the street is pleasant enough to keep an Estate.
    for (const [x, y] of [[11, 11], [11, 12], [11, 13], [12, 13], [13, 13], [14, 13], [14, 12], [14, 11], [10, 11], [10, 12], [10, 13], [11, 14], [12, 14], [13, 14], [14, 14], [15, 11], [15, 12], [15, 13]]) {
      if (houseDesirability(world, home) >= TIERS[MAX_TIER].desirability.rise) break;
      add(world, 'statue', x, y);
    }
  } else if (state === 'waiting') {
    bazaar.store = { grain: 300 };                       // food is in the bazaar: it reaches the home at the month's end
    home.stock = { grain: 0 };
    world.day = 22;                                      // eight days to the month's end
  } else {
    removeBuilding(world, well.id);                      // no well in reach: water is the first thing missing
    bazaar.store = { grain: 300 };
    home.stock = { grain: 30 };
  }
  for (const b of allBuildings(world)) b.staff = BUILDINGS[b.type].workers;
  return { world, home };
}

export const houseStepScene = async (api, options = {}) => {
  inGame(api, 'v50-house-step');
  const o = { state: 'next', gold: 2000, ...options };
  const { world, home } = street(o.state, o.gold);
  setGuide(world, false);
  api.startGame(world, { saveNow: false });
  const g = api.game();
  g.ui.cameraControl.jumpTo(14, 11);
  g.ui.store.set(select(g.ui.store.get(), home.id));
  if (!o.quick) await wait(400);
  g.ui.refresh();
  const step = nextStep(world, home);
  return `v50-house-step: ${o.state}, home ${home.id} tier ${home.tier}, step ${step.reason === null ? 'next' : step.reason}${step.need ? ` (${step.need})` : ''}, gold ${world.gold}`;
};
