// Version 5.0 Task 7: the dev scene for the grand homes (src/dev/v50/index.js joins it). A small flat street (a fixture laid raw, as the house-step scene's
// is: a road along y = 10, a well, a temple, a booth, a bazaar, a storehouse and a granary beside it) with one Fine manor whose sheet is open, in the view options.view names:
//   'street'  every want of a Villa is met but the street: the next step names the decoration and its tile ("a statue beside this home ... from 38 to 46")
//   'food'    linen is there, but only two kinds of food: the next step is a hunting lodge by the nearest herd
//   'goals'   as 'street', with the Goals sheet open on the grand chapter (the street goal's count, Show me at the decoration)
// options: view ('street'), gold (5000), quick (no settling wait: the mobile budget test). grandDistrict is the fixture alone (tests/v50/grand use it).
import { createWorld, makeBuilding, insertBuilding, allBuildings } from '../../sim/world.js';
import { setGuide } from '../../sim/commands.js';
import { nextStep } from '../../sim/advice.js';
import { houseDesirability } from '../../sim/desirability.js';
import { BUILDINGS } from '../../data/buildings.js';
import { TIERS } from '../../data/housing.js';
import { GOALS } from '../../data/goals.js';
import { HOUSEHOLD_GOODS, GOODS } from '../../data/goods.js';
import { HERD_KIND_IDS } from '../../data/river.js';
import { T } from '../../sim/terrain.js';
import { idx } from '../../sim/grid.js';
import { select, openSheet } from '../../ui/modes.js';
import { wait, inGame } from '../s46/base.js';

const SIZE = 40;

function add(world, type, x, y, extra = {}) {
  const b = makeBuilding(world, type, x, y);
  Object.assign(b, extra);
  return insertBuilding(world, b);
}

export function grandDistrict(view = 'street', gold = 5000) {
  const terrain = new Array(SIZE * SIZE).fill(T.DESERT);
  for (let y = 0; y < SIZE; y++) for (let x = 0; x < 6; x++) terrain[idx(SIZE, x, y)] = T.FERTILE;
  const map = { size: SIZE, terrain, tradeEntry: { x: SIZE - 1, y: SIZE - 1 }, startRoad: [], focus: { x: 14, y: 11 }, raiderEntries: [] };
  const world = createWorld({ seed: 11, size: SIZE, map });
  world.gold = gold;
  world.milestone = 'capital';
  for (let x = 0; x < SIZE; x++) world.road[idx(SIZE, x, 10)] = 1;
  world.roadVersion++;
  add(world, 'well', 14, 9);
  add(world, 'temple', 20, 8);
  add(world, 'booth', 16, 9);
  const bazaar = add(world, 'bazaar', 9, 8);
  add(world, 'storehouse', 6, 8);
  add(world, 'granary', 2, 8);
  for (const [x, y] of [[11, 13], [13, 13]]) add(world, 'garden', x, y);   // a modest street: high enough for a Fine manor, short of a Villa
  const tier = 7, cap = TIERS[tier].capacity;
  const foods = view === 'food' ? ['grain', 'figs'] : ['grain', 'figs', 'game'];
  bazaar.store = Object.fromEntries([...foods.map((g) => [g, 300]), ...HOUSEHOLD_GOODS.filter((g) => g !== 'jewellery').map((g) => [g, 300])]);
  const home = add(world, 'house', 12, 11, { tier, w: 2, d: 2, residents: cap, stockedFor: cap });
  home.stock = Object.fromEntries([...HOUSEHOLD_GOODS.filter((g) => g !== 'jewellery').map((g) => [g, Math.ceil(cap * GOODS[g].perResidentPerMonth * 3)]), ...foods.map((g) => [g, 40])]);
  if (view === 'food') world.wildlife.herds.push({ id: world.wildlife.nextId++, kind: HERD_KIND_IDS[0], x: 26, y: 20, hx: 26, hy: 20, size: 6, max: 6, regrow: null });
  for (const b of allBuildings(world)) b.staff = BUILDINGS[b.type].workers;
  return { world, home };
}

export const grandScene = async (api, options = {}) => {
  inGame(api, 'v50-grand');
  const o = { view: 'street', gold: 5000, ...options };
  const { world, home } = grandDistrict(o.view, o.gold);
  setGuide(world, false);
  // The chain done up to the grand homes' wants (the street view has its third food already): the Goals sheet opens on the street goal.
  const upTo = GOALS.findIndex((x) => x.id === (o.view === 'food' ? 'third_food' : 'villa_street'));
  world.goals.completed.push(...GOALS.slice(0, upTo).map((x) => x.id));
  api.startGame(world, { saveNow: false });
  const g = api.game();
  g.ui.cameraControl.jumpTo(14, 12);
  if (o.view === 'goals') g.ui.store.set(openSheet(g.ui.store.get(), 'goals'));
  else g.ui.store.set(select(g.ui.store.get(), home.id));
  if (!o.quick) await wait(400);
  g.ui.refresh();
  const step = nextStep(world, home);
  return `v50-grand: ${o.view}, ${TIERS[home.tier].name} ${home.id} at desirability ${houseDesirability(world, home)}, step ${step.reason === null ? `${step.need}: ${step.fix && step.fix.item}` : step.reason}, gold ${world.gold}`;
};
