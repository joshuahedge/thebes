// Version 7.0, Track A's test cities (tests/v70/a): a road with the first-strike building beside it or far from it (raidCity), a street whose only pottery is kept far
// from its bazaar (street), and a Capital with a river along the top, a trading post joined to the trade entry and a storehouse in reach of it (tradeCity).
import { makeTestWorld, setRoad, addRaw, staffAll } from '../../helpers/testWorld.js';
import { TIERS } from '../../../src/data/housing.js';
import { T } from '../../../src/sim/terrain.js';
import { idx } from '../../../src/sim/grid.js';

export const EAST = { x: 31, y: 16 };
export const warn = (w, extra = {}) => { w.raid.clockDay = 0; w.raid.warning = { index: 1, size: 9, tribute: null, first: true, entry: { ...EAST }, dir: 'east', arrives: w.day + 100, target: 'trading_post', ...extra }; };

// A road along y = 13; a trading post (the warned kind) at (24, y) beside it or well away from it.
export function raidCity(postY = 14) {
  const w = makeTestWorld({ gold: 5000, raiderEntries: [EAST] });
  w.milestone = 'market_town';
  setRoad(w, 0, 13, 31, 13);
  const post = addRaw(w, 'trading_post', 24, postY);
  staffAll(w);
  warn(w);
  return { w, post };
}

// A road along y = 10 with a working well, temple and bazaar in reach of a House (tier 4) at (12, 11) that has its food; its next tier wants pottery, which the only store holding
// it keeps far away.
export function street({ farAt = 50, near = false, potter = false } = {}) {
  const w = makeTestWorld({ size: 64 });
  w.milestone = 'town';
  setRoad(w, 0, 10, 63, 10);
  addRaw(w, 'well', 14, 9);
  addRaw(w, 'temple', 20, 8);
  const bazaar = addRaw(w, 'bazaar', 9, 8);
  const home = addRaw(w, 'house', 12, 11, { tier: 4, residents: TIERS[4].capacity, stockedFor: TIERS[4].capacity, stock: { grain: 30 } });
  const store = addRaw(w, 'storehouse', farAt, 8, { store: { pottery: 40 } });
  const nearStore = near ? addRaw(w, 'storehouse', 4, 8) : null;
  const maker = potter ? addRaw(w, 'potter', 22, 11) : null;
  staffAll(w);
  return { w, bazaar, home, store, nearStore, maker };
}

// A Capital with the river along the top three rows, a road beside the bank, a trading post joined to the trade entry and a storehouse in reach of it.
export function tradeCity({ river = true } = {}) {
  const w = makeTestWorld({ size: 32, gold: 5000 });
  w.milestone = 'capital';
  if (river) for (let y = 0; y < 3; y++) for (let x = 0; x < w.size; x++) w.terrain[idx(w.size, x, y)] = T.WATER;
  setRoad(w, 0, 10, 31, 10);
  setRoad(w, 31, 10, w.tradeEntry.x, w.tradeEntry.y);
  const store = addRaw(w, 'storehouse', 19, 11, { store: { pottery: 60 } });
  const post = addRaw(w, 'trading_post', 16, 11);
  staffAll(w);
  return { w, store, post };
}

