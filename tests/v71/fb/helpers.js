// Version 7.1, fix batch B: a small trading city for the tests. uiWorld at Market town with a staffed trading post joined to the trade entry, a storehouse in its reach holding `stock`,
// and the given routes open (their gifts already landed).
import { setRoad, addRaw, staffAll } from '../../helpers/testWorld.js';
import { uiWorld } from '../../helpers/uiWorld.js';

export function tradeCity({ stock = {}, routes = ['memphis'] } = {}) {
  const w = uiWorld();
  w.milestone = 'market_town';
  w.gold = 5000;
  addRaw(w, 'trading_post', 17, 11);
  setRoad(w, 31, 10, w.tradeEntry.x, w.tradeEntry.y);
  const store = addRaw(w, 'storehouse', 20, 11, { store: { ...stock } });
  staffAll(w);
  for (const id of routes) w.trade.routes[id] = { since: 0, gifted: true };
  return { w, store };
}
