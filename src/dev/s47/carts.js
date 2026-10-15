// Stage 4.7 Task 5 (ruling 466): the dev scene for storehouse orders and carts (src/dev/s47/index.js joins it; Task 6 draws the carts and the order sheet on it,
// the balance task tunes against it). The seed-11 sample city (classic, 64), with its pottery taken away and its potter paused, so its homes that want pottery for
// the next tier have none within their bazaars' reach; a far district up the north road (a storehouse holding pottery and linen, a granary of grain, 40-odd
// road tiles from the bazaars); and the near storehouse (the sample city's, beside the bazaars) with no order yet: setting it to Fetch pottery is what the
// scene is for. options: seed (11), variant ('classic'), size (64), zoom (0.5), order (true sets the near storehouse to Fetch pottery up to 100, so a cart is
// on the road after a few days), days (days to run before the shot, 3 with an order), chrome (false: screenshot mode).
import { buildSampleCity } from '../sampleCity.js';
import { setGuide, place, drawRoad, setPaused } from '../../sim/commands.js';
import { allBuildings, housesOf } from '../../sim/world.js';
import { assignLabour } from '../../sim/labour.js';
import { advanceDays } from '../../sim/clock.js';
import { setFetch, farGoodTip, cartOf } from '../../sim/carts.js';
import { wait, inGame } from '../s46/base.js';

// Takes the city's pottery away, lays the far district and returns what the scene stands on: { near, far, farGranary, tip }. Works on the seed-11 classic 64 sample
// city (buildSampleCity); other maps may not have room for the district (the result then says so with far: null).
export function buildCartsCity(world) {
  const gold = world.gold;
  world.gold = 1e9;                                               // a fixture, as the stress city's: the roads and stores are laid, not paid for
  for (const b of allBuildings(world)) {
    if (b.type === 'potter') setPaused(world, b.id, true);        // no new pottery near the homes
    if (b.store && b.store.pottery) b.store.pottery = 0;
    if (b.type === 'house') b.stock = { ...b.stock, pottery: 0 };
  }
  const north = world.tradeEntry.x;                               // the main road runs north along this column from the trade entry
  let top = world.size;
  for (let y = world.size - 1; y >= 0; y--) if (world.road[north + y * world.size]) top = y;
  const at = (dy) => top - dy;
  const road = drawRoad(world, north, at(1), north, at(21));
  const far = place(world, 'storehouse', north + 1, at(20));
  const farGranary = place(world, 'granary', north - 2, at(20));
  world.gold = gold;
  const near = allBuildings(world).find((b) => b.type === 'storehouse' && !(far.ok && b.id === far.id)) || null;
  const out = { near: near ? near.id : null, far: far.ok ? far.id : null, farGranary: farGranary.ok ? farGranary.id : null, road: road.ok };
  if (far.ok) Object.assign(world.buildings[far.id], { staff: 6, store: { pottery: 400, linen: 200 } });
  if (farGranary.ok) Object.assign(world.buildings[farGranary.id], { staff: 6, store: { grain: 300 } });
  assignLabour(world);
  out.tip = farGoodTip(world);
  return out;
}

export const cartsScene = async (api, options = {}) => {
  inGame(api, 's47-carts');
  const o = { seed: 11, variant: 'classic', size: 64, zoom: 0.5, order: true, ...options };
  const world = api.freshWorld({ seed: o.seed, variant: o.variant, size: o.size });
  if (!allBuildings(world).length) buildSampleCity(world);   // with ?sample=1 freshWorld has laid it already
  setGuide(world, false);
  const info = buildCartsCity(world);
  let ordered = null;
  if (o.order && info.near) {
    ordered = setFetch(world, info.near, 'pottery', 100);
    advanceDays(world, Number.isInteger(o.days) ? o.days : 3);
  } else if (Number.isInteger(o.days)) advanceDays(world, o.days);
  api.startGame(world, { saveNow: false });
  const g = api.game();
  g.ui.cameraControl.cancel();
  g.cam.zoom = o.zoom;
  g.ui.cameraControl.jumpTo(world.size / 2, world.size / 2);
  await wait(400);
  if (o.chrome === false) g.ui.screenshotMode();
  const cart = info.near ? cartOf(world, info.near) : null;
  return `s47-carts: ${o.variant} ${world.size} seed ${o.seed}; near storehouse #${info.near} (${ordered ? (ordered.ok ? 'fetching pottery up to 100' : `order refused: ${ordered.reason}`) : 'no order yet'}), far storehouse #${info.far}, `
    + `${info.tip ? `${info.tip.count} homes wait on ${info.tip.good} held in the far store ${info.tip.len} road tiles away` : 'no home waits on a far good'}; ${cart ? `cart ${cart.state}, ${cart.amount} ${cart.good}, ${cart.len} road tiles` : 'no cart on the road'}`;
};
