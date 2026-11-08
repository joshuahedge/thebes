// Version 8.4, Track G: the test cities the sim and interface tests share (not a test file: tests/v84/g/all.js does not import it).
import { TIERS } from '../../../src/data/housing.js';
import { LUXURY_GOODS } from '../../../src/data/goods.js';
import { BUILDINGS } from '../../../src/data/buildings.js';
import { MONUMENTS } from '../../../src/data/monuments.js';
import { checkTiles } from '../../../src/sim/commands.js';
import { houseDesirability } from '../../../src/sim/desirability.js';
import { makeBuilding, insertBuilding, allBuildings } from '../../../src/sim/world.js';
import { grandDistrict } from '../../../src/dev/v50/grand.js';
import { makeTestWorld, setRoad, addRaw } from '../../helpers/testWorld.js';

export const add = (w, type, x, y, extra = {}) => { const b = makeBuilding(w, type, x, y); Object.assign(b, extra); insertBuilding(w, b); b.staff = BUILDINGS[type].workers; return b; };

// A straight city along a road at y = 10, with `crews` fully staffed guilds near the site (each within 12 road tiles: full speed) and a store of stone
// beside it (full supply).
// Version 9.2 (Track S, ruling 1800): the default site is the great sphinx (six courses of 120), where it was the colossus (six of 160): the colossus's six of 140 are not a whole number of days at a rushed pair's 8/3 units a day, which these tests' sums need.
export function rushCity({ type = 'great_sphinx', crews = 2, gold = 100000, difficulty = 'normal', milestone = 'capital', stone = 800, bricks = 0 } = {}) {
  const w = makeTestWorld({ size: 64, gold });
  setRoad(w, 0, 10, 63, 10);
  w.difficulty = difficulty;
  w.milestone = milestone;
  const guilds = [];
  for (let k = 0; k < crews; k++) guilds.push(addRaw(w, 'builders_guild', [24, 27, 36, 39][k], 11, { staff: 16 }));
  const site = addRaw(w, type, 30, 10 - MONUMENTS[type].d);
  addRaw(w, 'storehouse', 44, 11, { staff: 6, store: { stone, bricks } });
  return { w, site, guilds };
}

// The grand street (src/dev/v50/grand.js) with a home at `tier`, every other want of it and of the tier above met (water, a temple, a booth, three foods,
// every household good on the bazaar's stall and in stock), and the street decorated well above an Estate's "to keep", so luxury is the only need in play.
// luxury: what the home holds (none by default); stall: what the bazaar holds; jewellery: false keeps a Villa from rising (an Estate needs it).
export function luxuryStreet({ tier = 8, luxury = {}, stall = {}, jewellery = false } = {}) {
  const { world, home } = grandDistrict('street', 50000);
  const cap = TIERS[tier].capacity;
  Object.assign(home, { tier, residents: cap, stockedFor: cap });
  const bazaar = allBuildings(world).find((b) => b.type === 'bazaar');
  for (const g of LUXURY_GOODS) { delete bazaar.store[g]; delete home.stock[g]; }
  // A month of three foods in even thirds (the top-up keeps them so), and the household goods.
  Object.assign(home.stock, { pottery: 60, beer: 60, linen: 60, grain: 16, figs: 16, game: 16 }, jewellery ? { jewellery: 60 } : {}, luxury);
  if (!jewellery) delete bazaar.store.jewellery; else bazaar.store.jewellery = 300;
  Object.assign(bazaar.store, stall);
  for (let r = 1; r <= 5 && houseDesirability(world, home) < 75; r++) {
    for (let y = home.y - r; y <= home.y + 1 + r; y++) for (let x = home.x - r; x <= home.x + 1 + r; x++) {
      if (houseDesirability(world, home) >= 75 || y === 10 || checkTiles(world, 'statue', x, y) !== null) continue;
      add(world, 'statue', x, y);
    }
  }
  world.tradeEntry = { x: 39, y: 10 };   // the street's road runs to the map's edge: a trading post on it is joined to the trade entry
  return { world, home, bazaar };
}
