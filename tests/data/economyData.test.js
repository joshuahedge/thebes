import { describe, it, expect } from '../harness.js';
import { GOODS, FOOD_GOODS, HOUSEHOLD_GOODS, RAW_GOODS, MATERIAL_GOODS } from '../../src/data/goods.js';
import { BUILDINGS, BUILDABLE } from '../../src/data/buildings.js';
import { TIERS, MAX_TIER } from '../../src/data/housing.js';
import { MILESTONES } from '../../src/data/progression.js';
import { DESIRABILITY, HOUSE_DESIRABILITY } from '../../src/data/desirability.js';
import { PARTNERS, CARAVAN_EVERY_MONTHS, PRICE_DRIFT, TRADE_REACH, ARBITRAGE_MARGIN } from '../../src/data/trade.js';
import { PRIORITY_LEVELS } from '../../src/data/labour.js';
import { TERRAIN_BY_NAME } from '../../src/sim/terrain.js';

const STAGE2 = ['garden', 'statue', 'farm_fig', 'clay_pit', 'potter', 'storehouse', 'booth', 'trading_post',
  'farm_barley', 'brewery', 'farm_flax', 'weaver', 'gem_mine', 'jeweller'];
const pick = (b, keys) => Object.fromEntries(keys.map((k) => [k, b[k]]));

describe('data goods', () => {
  it('lists the ten goods with their kinds and household use', () => {
    expect(Object.keys(GOODS)).toEqual(['grain', 'figs', 'pottery', 'beer', 'linen', 'jewellery', 'clay', 'barley', 'flax', 'gems', 'stone', 'bricks']);   // Stage 4: the two materials
    expect(FOOD_GOODS).toEqual(['grain', 'figs']);
    expect(HOUSEHOLD_GOODS).toEqual(['pottery', 'beer', 'linen', 'jewellery']);
    expect(RAW_GOODS).toEqual(['clay', 'barley', 'flax', 'gems']);
    expect(MATERIAL_GOODS).toEqual(['stone', 'bricks']);
    const use = Object.fromEntries([...FOOD_GOODS, ...HOUSEHOLD_GOODS].map((g) => [g, GOODS[g].perResidentPerMonth]));
    expect(use).toEqual({ grain: 0.25, figs: 0.25, pottery: 0.05, beer: 0.05, linen: 0.04, jewellery: 0.03 });
    for (const g of RAW_GOODS) expect([g, 'perResidentPerMonth' in GOODS[g]]).toEqual([g, false]);
    for (const [g, def] of Object.entries(GOODS)) expect([g, typeof def.name, def.name.length > 0]).toEqual([g, 'string', true]);
  });
});

describe('data buildings, Stage 2', () => {
  it('adds the fourteen buildings with the costs, upkeep, workers and priorities of the plan', () => {
    for (const t of STAGE2) expect([t, Boolean(BUILDINGS[t])]).toEqual([t, true]);
    const rows = Object.fromEntries(STAGE2.map((t) => [t, pick(BUILDINGS[t], ['cost', 'upkeep', 'workers', 'priority'])]));
    expect(rows).toEqual({
      garden: { cost: 12, upkeep: 0, workers: 0, priority: undefined },
      statue: { cost: 60, upkeep: 0, workers: 0, priority: undefined },
      farm_fig: { cost: 70, upkeep: 6, workers: 8, priority: 'essential' },
      clay_pit: { cost: 50, upkeep: 5, workers: 6, priority: 'industry' },
      potter: { cost: 90, upkeep: 8, workers: 8, priority: 'industry' },
      storehouse: { cost: 70, upkeep: 5, workers: 6, priority: 'essential' },
      booth: { cost: 50, upkeep: 4, workers: 4, priority: 'services' },
      trading_post: { cost: 150, upkeep: 10, workers: 6, priority: 'industry' },
      farm_barley: { cost: 60, upkeep: 6, workers: 8, priority: 'industry' },
      brewery: { cost: 100, upkeep: 8, workers: 8, priority: 'industry' },
      farm_flax: { cost: 60, upkeep: 6, workers: 8, priority: 'industry' },
      weaver: { cost: 110, upkeep: 8, workers: 8, priority: 'industry' },
      gem_mine: { cost: 140, upkeep: 10, workers: 10, priority: 'industry' },
      jeweller: { cost: 140, upkeep: 10, workers: 8, priority: 'industry' },
    });
  });
  it('gives each its footprint, category, road rule and ground', () => {
    const rows = Object.fromEntries(STAGE2.map((t) => [t, pick(BUILDINGS[t], ['w', 'd', 'category', 'needsRoad', 'terrain'])]));
    const big = (category, terrain) => ({ w: 2, d: 2, category, needsRoad: true, terrain });
    expect(rows).toEqual({
      garden: { w: 1, d: 1, category: 'homes', needsRoad: false, terrain: undefined },
      statue: { w: 1, d: 1, category: 'homes', needsRoad: false, terrain: undefined },
      farm_fig: big('food', 'fertile'),
      clay_pit: big('industry', undefined),
      potter: big('industry', undefined),
      storehouse: big('industry', undefined),
      booth: { w: 1, d: 1, category: 'services', needsRoad: true, terrain: undefined },
      trading_post: big('industry', undefined),
      farm_barley: big('industry', 'fertile'),
      brewery: big('industry', undefined),
      farm_flax: big('industry', 'fertile'),
      weaver: big('industry', undefined),
      gem_mine: big('industry', 'rocky'),
      jeweller: big('industry', undefined),
    });
    for (const b of Object.values(BUILDINGS)) if (b.terrain) expect(Object.keys(TERRAIN_BY_NAME)).toContain(b.terrain);
  });
  it('sets the monthly yields of spec 4.10, the workshops’ raw goods and a producer reach of 12', () => {
    const made = {}, used = {};
    for (const [t, b] of Object.entries(BUILDINGS)) {
      if (!b.produces) continue;
      made[t] = `${b.produces.good} ${b.produces.perMonth}`;
      if (b.consumes) used[t] = b.consumes;
      expect([t, b.producerReach]).toEqual([t, 12]);
    }
    expect(made).toEqual({
      farm_grain: 'grain 30', farm_fig: 'figs 24', clay_pit: 'clay 40', potter: 'pottery 30', farm_barley: 'barley 30',
      brewery: 'beer 25', farm_flax: 'flax 24', weaver: 'linen 20', gem_mine: 'gems 15', jeweller: 'jewellery 15', quarry: 'stone 30', brickworks: 'bricks 30',
    });
    expect(used).toEqual({ potter: 'clay', brewery: 'barley', weaver: 'flax', jeweller: 'gems', brickworks: 'clay' });
    for (const t of Object.keys(used).filter((k) => k !== 'brickworks')) {   // the brickworks makes a material (Stage 4)
      expect([t, GOODS[BUILDINGS[t].consumes].kind, GOODS[BUILDINGS[t].produces.good].kind]).toEqual([t, 'raw', 'household']);
    }
  });
  it('stores food in granaries and everything else in storehouses, and sells the six goods homes use', () => {
    expect(BUILDINGS.granary.stores).toEqual(['grain', 'figs']);
    expect(BUILDINGS.granary.capacity).toBe(600);
    expect(BUILDINGS.storehouse.stores).toEqual(['pottery', 'beer', 'linen', 'jewellery', 'clay', 'barley', 'flax', 'gems', 'stone', 'bricks']);
    expect(BUILDINGS.storehouse.capacity).toBe(800);
    for (const g of Object.keys(GOODS)) {
      const homes = [BUILDINGS.granary, BUILDINGS.storehouse].filter((s) => s.stores.includes(g));
      expect([g, homes.length]).toEqual([g, 1]);                                   // every good has exactly one kind of store
    }
    expect(BUILDINGS.bazaar.sells).toEqual(['grain', 'figs', 'pottery', 'beer', 'linen', 'jewellery']);
    expect(BUILDINGS.bazaar.stock).toEqual({ grain: 300, figs: 200, pottery: 100, beer: 100, linen: 100, jewellery: 100 });
    expect(Object.keys(BUILDINGS.bazaar.stock)).toEqual(BUILDINGS.bazaar.sells);
  });
  it('makes the booth an entertainment service with a reach of 8 road tiles', () => {
    expect(pick(BUILDINGS.booth, ['provides', 'reach', 'points'])).toEqual({ provides: 'entertainment', reach: 8, points: 10 });
    const providers = Object.entries(BUILDINGS).filter(([, b]) => b.provides).map(([t, b]) => `${t} ${b.provides}`);
    expect(providers).toEqual(['well water', 'temple religion', 'booth entertainment']);
  });
  it('only references goods that exist, and every building is staffed by a known priority', () => {
    for (const [t, b] of Object.entries(BUILDINGS)) {
      const refs = [b.produces && b.produces.good, b.consumes, ...(b.stores || []), ...(b.sells || []), ...Object.keys(b.stock || {})].filter(Boolean);
      for (const g of refs) expect([t, g, Boolean(GOODS[g])]).toEqual([t, g, true]);
      if (b.workers > 0) expect(PRIORITY_LEVELS).toContain(b.priority);
    }
  });
});

describe('data tiers 5-9', () => {
  it('follows the spec 4.6 ladder: names, sizes, residents and tax', () => {
    expect(MAX_TIER).toBe(9);
    const rows = TIERS.slice(5).map((t) => [t.tier, t.name, t.size, t.capacity, t.tax]);
    expect(rows).toEqual([
      [5, 'Townhouse', 1, 22, 3], [6, 'Manor', 2, 100, 4], [7, 'Fine manor', 2, 125, 5], [8, 'Villa', 2, 150, 6], [9, 'Estate', 2, 180, 8],
    ]);
    for (let t = 1; t <= MAX_TIER; t++) expect(TIERS[t].tier).toBe(t);
  });
  it('adds one new demand per tier, beer and two foods together at Fine manor', () => {
    const added = [];
    for (let t = 5; t <= MAX_TIER; t++) added.push(TIERS[t].needs.filter((n) => !TIERS[t - 1].needs.includes(n)));
    expect(added).toEqual([['pottery'], ['entertainment'], ['beer', 'twoFoods'], ['linen'], ['jewellery']]);
    for (let t = 2; t <= MAX_TIER; t++) for (const n of TIERS[t - 1].needs) expect([t, n, TIERS[t].needs.includes(n)]).toEqual([t, n, true]);
  });
  it('asks tiers 6-9 for desirability to rise and a lower value to keep, and nothing below', () => {
    for (let t = 1; t <= 5; t++) expect([t, TIERS[t].desirability]).toEqual([t, undefined]);
    expect(TIERS.slice(6).map((t) => t.desirability)).toEqual([
      { rise: 20, keep: 15 }, { rise: 35, keep: 29 }, { rise: 50, keep: 43 }, { rise: 65, keep: 57 },
    ]);
    for (let t = 6; t <= MAX_TIER; t++) {
      expect(TIERS[t].desirability.keep).toBeLessThan(TIERS[t].desirability.rise);
      if (t > 6) expect(TIERS[t].desirability.keep).toBeGreaterThan(TIERS[t - 1].desirability.keep);
    }
  });
  it('never lets a merge or an upgrade lower capacity or tax per tile', () => {
    const perTile = (t) => [TIERS[t].capacity / TIERS[t].size ** 2, (TIERS[t].capacity * TIERS[t].tax) / TIERS[t].size ** 2];
    for (let t = 1; t < MAX_TIER; t++) {
      const [capA, taxA] = perTile(t), [capB, taxB] = perTile(t + 1);
      expect([t, capB >= capA, taxB >= taxA]).toEqual([t, true, true]);
    }
    expect(perTile(6)).toEqual([25, 100]);                                         // four Townhouses: 22 and 66 a tile
  });
});

describe('data milestones to Capital', () => {
  it('runs Village, Town, Market town, City, Great city and Capital with the spec 4.14 unlocks', () => {
    expect(MILESTONES.map((m) => [m.id, m.name, m.population])).toEqual([
      ['village', 'Village', 0], ['town', 'Town', 150], ['market_town', 'Market town', 250],
      ['city', 'City', 400], ['great_city', 'Great city', 650], ['capital', 'Capital', 1000],
    ]);
    expect(Object.fromEntries(MILESTONES.map((m) => [m.id, m.unlocks]))).toEqual({
      village: ['house', 'well', 'farm_grain', 'granary', 'bazaar', 'temple', 'garden', 'firehouse'],
      town: ['farm_fig', 'clay_pit', 'potter', 'storehouse', 'booth', 'statue', 'palace'],
      market_town: ['trading_post', 'wall', 'tower', 'barracks'],
      city: ['farm_barley', 'brewery', 'builders_guild', 'quarry', 'brickworks', 'obelisk_small', 'obelisk_large', 'plaza'],
      great_city: ['farm_flax', 'weaver', 'colossus', 'mastaba_small', 'sphinx'],
      capital: ['gem_mine', 'jeweller', 'mastaba_large'],
    });
  });
  it('unlocks every building exactly once, and nothing that does not exist', () => {
    const all = MILESTONES.flatMap((m) => m.unlocks);
    expect([...all].sort()).toEqual(BUILDABLE.filter((t) => !['pyramid_small', 'pyramid_great'].includes(t)).sort());   // gates and rubble never; the pyramids unlock by prestige (Stage 4)
  });
  it('unlocks each workshop no earlier than its raw good and the stores both need', () => {
    const at = (type) => MILESTONES.findIndex((m) => m.unlocks.includes(type));
    const rawMaker = (good) => Object.keys(BUILDINGS).find((t) => BUILDINGS[t].produces && BUILDINGS[t].produces.good === good);
    for (const t of ['potter', 'brewery', 'weaver', 'jeweller']) {
      const raw = rawMaker(BUILDINGS[t].consumes);
      expect([t, at(raw)]).toEqual([t, at(t)]);
      expect(at('storehouse')).toBeLessThanOrEqual(at(t));
    }
    expect(at('granary')).toBeLessThanOrEqual(at('farm_fig'));
  });
});

describe('data desirability', () => {
  it('gives every building but housing the spec 4.7 values, and only buildings that exist', () => {
    const types = Object.keys(BUILDINGS).filter((t) => t !== 'house');
    expect(Object.keys(DESIRABILITY).sort()).toEqual(types.sort());
    expect(DESIRABILITY).toEqual({
      garden: [3, 2, 1], statue: [8, 6, 4, 2], temple: [6, 6, 4, 4, 2, 2], booth: [3, 2, 1],
      bazaar: [-2, -1, 0, 1, 2, 3], well: [1], granary: [-8, -6, -4, -2], storehouse: [-6, -4, -2],
      farm_grain: [-2, -1], farm_fig: [-2, -1], farm_barley: [-2, -1], farm_flax: [-2, -1],
      clay_pit: [-6, -5, -4, -3, -2, -1], potter: [-4, -3, -2, -1], brewery: [-4, -3, -2, -1], weaver: [-4, -3, -2, -1],
      jeweller: [-4, -3, -2, -1], gem_mine: [-8, -6, -4, -2], trading_post: [-3, -2, -1],
      firehouse: [-1], tower: [-2, -1], barracks: [-4, -2], rubble: [-3, -1], wall: [], gate: [],
      // Stage 4: the supply buildings, plaza, sphinx, the palace's first style and each monument's finished values
      builders_guild: [-4, -3, -2, -1], quarry: [-6, -5, -4, -3, -2, -1], brickworks: [-4, -3, -2, -1], plaza: [2, 1], sphinx: [10, 8, 6, 4, 2], palace: [4, 3, 2, 1],
      obelisk_small: [6, 5, 4, 3, 2, 1], obelisk_large: [10, 8, 6, 4, 2, 1], colossus: [12, 10, 8, 6, 4, 2], mastaba_small: [10, 8, 6, 4, 2, 1],
      mastaba_large: [14, 12, 10, 8, 6, 4], pyramid_small: [16, 14, 12, 10, 8, 6], pyramid_great: [24, 20, 16, 12, 10, 8],
    });
  });
  it('gives homes values by tier, from an empty plot to an Estate', () => {
    expect(HOUSE_DESIRABILITY.length).toBe(MAX_TIER + 1);
    expect(HOUSE_DESIRABILITY).toEqual([[], [-2, -1], [-1], [0], [1], [1, 1], [2, 2], [3, 2, 1], [4, 3, 2], [5, 4, 3, 2]]);
  });
  it('keeps every list to whole numbers over at most six tiles', () => {
    for (const [k, v] of [...Object.entries(DESIRABILITY), ...HOUSE_DESIRABILITY.map((v, t) => [`tier ${t}`, v])]) {
      expect([k, Array.isArray(v), v.length <= 6, v.every(Number.isInteger)]).toEqual([k, true, true, true]);
    }
  });
});

describe('data trade', () => {
  it('opens Memphis at Market town for 300 gold and Byblos at Great city for 600', () => {
    expect(Object.keys(PARTNERS)).toEqual(['memphis', 'byblos']);
    expect(Object.values(PARTNERS).map((p) => [p.name, p.milestone, p.routeCost])).toEqual([['Memphis', 'market_town', 300], ['Byblos', 'great_city', 600]]);
    for (const p of Object.values(PARTNERS)) expect(MILESTONES.some((m) => m.id === p.milestone)).toBe(true);
    expect([CARAVAN_EVERY_MONTHS, PRICE_DRIFT, TRADE_REACH, ARBITRAGE_MARGIN]).toEqual([3, 0.1, 16, 1.25]);
  });
  it('buys and sells the spec 4.15 goods at its prices and yearly quotas', () => {
    const list = (m) => Object.entries(m).map(([g, o]) => `${g} ${o.price} (${o.quota})`);
    expect(list(PARTNERS.memphis.buys)).toEqual(['grain 1 (300)', 'pottery 8 (200)', 'beer 10 (160)']);
    expect(list(PARTNERS.memphis.sells)).toEqual(['clay 2 (300)', 'figs 3 (200)', 'barley 3 (200)', 'stone 6 (200)']);   // Stage 4: stone, listed from City (from: 'city')
    expect(list(PARTNERS.byblos.buys)).toEqual(['pottery 8 (120)', 'linen 14 (120)', 'jewellery 20 (80)']);
    expect(list(PARTNERS.byblos.sells)).toEqual(['flax 3 (160)', 'gems 9 (100)', 'beer 14 (100)']);
  });
  it('brings 40 of the first good on the sale list as the first caravan’s gift', () => {
    for (const [id, p] of Object.entries(PARTNERS)) expect([id, p.gift]).toEqual([id, { good: Object.keys(p.sells)[0], n: 40 }]);
  });
  it('trades only goods that exist, with positive whole prices and quotas a caravan can split in four', () => {
    for (const [id, p] of Object.entries(PARTNERS)) {
      for (const [g, o] of [...Object.entries(p.buys), ...Object.entries(p.sells)]) {
        expect([id, g, Boolean(GOODS[g]), o.price > 0, Number.isInteger(o.quota) && o.quota > 0, o.quota % 4]).toEqual([id, g, true, true, true, 0]);
      }
      for (const g of Object.keys(p.buys)) expect([id, g, g in p.sells]).toEqual([id, g, false]);   // never both ways
    }
  });
  it('allows no arbitrage: no partner sells a good for less than 1.25 times what any partner pays', () => {
    for (const seller of Object.values(PARTNERS)) {
      for (const [g, sale] of Object.entries(seller.sells)) {
        for (const buyer of Object.values(PARTNERS)) {
          if (!buyer.buys[g]) continue;
          expect([seller.name, buyer.name, g, sale.price >= buyer.buys[g].price * ARBITRAGE_MARGIN]).toEqual([seller.name, buyer.name, g, true]);
        }
      }
    }
    expect(PARTNERS.byblos.sells.beer.price / PARTNERS.memphis.buys.beer.price).toBeGreaterThanOrEqual(ARBITRAGE_MARGIN);   // the one good both ways
  });
  it('keeps the margin wider than a full year’s drift both ways, so drift can never cross it', () => {
    expect(ARBITRAGE_MARGIN).toBeGreaterThan((1 + PRICE_DRIFT) / (1 - PRICE_DRIFT));
  });
});
