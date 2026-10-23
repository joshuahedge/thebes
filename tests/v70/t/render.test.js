// Version 7.0, Track T (ruling 876): caravans and boats you can see, sampled from trade's own arrival schedule. Render only: drawing them
// changes nothing in the world or the save. Full and Gentle show them on the way; Still shows nothing moving, only a caravan or a boat at
// rest while it stays.
import { describe, it, expect } from '../../harness.js';
import { makeTestWorld, setRoad, addRaw, staffAll } from '../../helpers/testWorld.js';
import { QUAY_TYPE } from '../../../src/data/trade.js';
import { ART } from '../../../src/render/art/registry.js';
import { tradeWalkers, visitAt, mooringOf, boatPath, caravanPath, ARRIVAL, TRADE_ID_BASE } from '../../../src/render/trade.js';
import { v70Walkers } from '../../../src/render/v70.js';
import { slotFor } from '../../../src/render/art/registry.js';
import { serialize } from '../../../src/save/serialize.js';
import { T } from '../../../src/sim/terrain.js';
import { idx } from '../../../src/sim/grid.js';

// The sim tests' river city: the river on the top three rows, a Quay at (20, 3), a trading post joined to the trade entry (31, 31).
function city(routes = ['memphis', 'nubia']) {
  const w = makeTestWorld({ gold: 5000 });
  for (let y = 0; y < 3; y++) for (let x = 0; x < w.size; x++) w.terrain[idx(w.size, x, y)] = T.WATER;
  setRoad(w, 0, 10, 31, 10);
  setRoad(w, 31, 10, 31, 31);
  setRoad(w, 16, 4, 24, 4);
  setRoad(w, 16, 4, 16, 10);
  w.milestone = 'capital';
  const q = addRaw(w, QUAY_TYPE, 20, 3);
  const post = addRaw(w, 'trading_post', 22, 8);
  staffAll(w);
  for (const id of routes) w.trade.routes[id] = { since: 0, gifted: true };
  return { w, q, post };
}
const wet = (w, f) => w.terrain[idx(w.size, Math.floor(f.x), Math.floor(f.y))] === T.WATER;
const onRoad = (w, f) => Boolean(w.road[idx(w.size, Math.floor(f.x), Math.floor(f.y))]);

describe('v70 t caravans and boats', () => {
  it('comes for each caravan day: on the way before it, at rest while it stays, on the way back after, and nowhere else', () => {
    const len = 12, inDays = Math.max(ARRIVAL.minDays, Math.min(ARRIVAL.maxDays, len / ARRIVAL.tilesPerDay));
    expect(visitAt(40, len, 0)).toBe(null);
    expect(visitAt(90 - inDays - 0.1, len, 0)).toBe(null);
    const coming = visitAt(90 - inDays / 2, len, 0);
    expect([coming.f, coming.stay, coming.left]).toEqual([0.5, false, false]);
    expect(visitAt(90.5, len, 0)).toEqual({ f: 1, stay: true, left: false });
    const going = visitAt(90 + ARRIVAL.stayDays + inDays / 2, len, 0);
    expect([going.f, going.left]).toEqual([0.5, true]);
    expect(visitAt(90 + ARRIVAL.stayDays + inDays + 0.1, len, 0)).toBe(null);
    expect(visitAt(89, len, 95)).toBe(null);                                             // a route opened after that caravan day
  });

  it('sails a boat up the river to the Quay and moors it there; walks the trader and his donkeys along the road to the post', () => {
    const { w, q, post } = city();
    expect(tradeWalkers(w, 45, null, 'full')).toEqual([]);
    const path = boatPath(w, q), road = caravanPath(w, post);
    expect([path.length > 0, road.length > 0, road[0]]).toEqual([true, true, idx(w.size, w.tradeEntry.x, w.tradeEntry.y)]);
    const near = tradeWalkers(w, 89.5, null, 'full');
    const boat = near.find((f) => f.kind.startsWith('trade_boat'));
    expect([Boolean(boat), wet(w, boat), boat.kind.includes('moored')]).toEqual([true, true, false]);
    const walkers = near.filter((f) => !f.kind.startsWith('trade_boat'));
    expect(walkers[0].kind.replace(/_l$/, '')).toBe('trader');
    expect(walkers.length >= 2 && walkers.every((f) => f.kind.startsWith('trader') || f.kind.startsWith('pack_donkey'))).toBe(true);
    expect(walkers.every((f) => onRoad(w, f))).toBe(true);
    const moored = tradeWalkers(w, 90.5, null, 'full').find((f) => f.kind.startsWith('trade_boat'));
    const m = mooringOf(w, q);
    expect([moored.kind.replace(/_l$/, ''), moored.x, moored.y]).toEqual(['trade_boat_moored', m.x, m.y]);
    for (const f of [...near, moored]) expect([f.kind, `fig.${f.kind}` in ART, f.id >= TRADE_ID_BASE]).toEqual([f.kind, true, true]);
    expect(new Set(near.map((f) => f.id)).size).toBe(near.length);
    expect(v70Walkers(w, 89.5, null, 'full')).toEqual(near);                             // what createUI's frame joins to the walkers
  });

  it('moves under Gentle as under Full, and under Still shows only a caravan and a boat at rest while they stay', () => {
    const { w } = city();
    expect(tradeWalkers(w, 89.5, null, 'gentle')).toEqual(tradeWalkers(w, 89.5, null, 'full'));
    expect(tradeWalkers(w, 89.5, null, 'still')).toEqual([]);
    const still = tradeWalkers(w, 90.5, null, 'still');
    expect(still.some((f) => f.kind.startsWith('trade_boat_moored')) && still.some((f) => f.kind.startsWith('trader'))).toBe(true);
  });

  it('comes only for an open route whose post or Quay works, and only into the view asked for', () => {
    const { w, q } = city(['nubia']);
    expect(tradeWalkers(w, 89.5, null, 'full').length).toBe(1);
    q.paused = true;
    expect(tradeWalkers(w, 89.5, null, 'full')).toEqual([]);
    q.paused = false;
    expect(tradeWalkers(w, 89.5, { x0: 0, y0: 20, x1: 10, y1: 31 }, 'full')).toEqual([]);   // the view is far from the river
    delete w.trade.routes.nubia;
    expect(tradeWalkers(w, 89.5, null, 'full')).toEqual([]);
  });

  it('keeps everything it draws out of the world and the save, and shows the Quay facing its water', () => {
    const { w, q } = city();
    const before = serialize(w);
    for (const t of [80, 88, 89.5, 90.5, 93, 95]) for (const m of ['full', 'gentle', 'still']) tradeWalkers(w, t, null, m);
    expect(serialize(w)).toBe(before);
    expect([slotFor(q, w), slotFor(q, w) in ART, slotFor(q, null)]).toEqual(['quay.n', true, 'quay']);
  });
});
