// Version 9.3 Track U (ruling 1981, with Track R's rulings 1956 and 1960): the numbers the interface shows are the ones the sim uses under a decree.
// Fire season's firehouse reaches 12 road tiles, not 8, in the reach overlay and in the placing count; Low Nile's granary holds double, as capacityOf says.
import { describe, it, expect } from '../../harness.js';
import { reachTiles } from '../../../src/render/overlays.js';
import { firehouseReachFrom } from '../../../src/ui/placement.js';
import { roadReach } from '../../../src/sim/reach.js';
import { capacityOf, ruleReach } from '../../../src/sim/rules.js';
import { BUILDINGS } from '../../../src/data/buildings.js';
import { FIRE } from '../../../src/data/fire.js';
import { DECREE } from '../../../src/data/decrees.js';
import { makeTestWorld, setRoad, addRaw } from '../../helpers/testWorld.js';

const under = (w, ids) => { w.decree = { week: '2026-47', ids, endDay: DECREE.endDay, ended: false }; return w; };
function roadWorld() {
  const w = makeTestWorld({ fertile: [] });
  setRoad(w, 1, 10, 30, 10);
  return w;
}

describe('v93 u rules: the interface reads the decree\'s numbers', () => {
  it('Fire season: the firehouse\'s reach overlay is 12 road tiles; no decree keeps 8', () => {
    const plain = roadWorld();
    const fh = addRaw(plain, 'firehouse', 15, 11);
    expect(reachTiles(plain, fh).length).toBe(roadReach(plain, fh, FIRE.reach).size);
    const fire = under(roadWorld(), ['fire_season']);
    const fh2 = addRaw(fire, 'firehouse', 15, 11);
    expect(ruleReach(fire, 'firehouse', FIRE.reach)).toBe(12);
    expect(reachTiles(fire, fh2).length).toBe(roadReach(fire, fh2, 12).size);
    expect(reachTiles(fire, fh2).length > reachTiles(plain, fh).length).toBe(true);
  });

  it('Fire season: the placing count reaches the homes 12 tiles away along the road', () => {
    const build = (w) => { for (const x of [3, 6, 24, 27]) addRaw(w, 'house', x, 11, { tier: 1, residents: 5 }); return w; };
    const plain = build(roadWorld()), fire = build(under(roadWorld(), ['fire_season']));
    expect(firehouseReachFrom(fire, 15, 11) > firehouseReachFrom(plain, 15, 11)).toBe(true);
  });

  it('Low Nile: a granary holds double, a storehouse as before', () => {
    const w = under(makeTestWorld(), ['low_nile']), plain = makeTestWorld();
    expect([capacityOf(w, 'granary'), capacityOf(w, 'storehouse'), capacityOf(plain, 'granary')])
      .toEqual([BUILDINGS.granary.capacity * 2, BUILDINGS.storehouse.capacity, BUILDINGS.granary.capacity]);
  });
});
