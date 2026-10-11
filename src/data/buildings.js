import { FOOD_GOODS, HOUSEHOLD_GOODS, RAW_GOODS } from './goods.js';

// w = footprint along x, d = footprint along y. reach values are in road tiles. A producer makes `perMonth` units
// at full staff; one with `consumes` (a workshop) turns one unit of that good into one unit of its own.
export const BUILDINGS = {
  house: { name: 'Housing plot', w: 1, d: 1, cost: 5, upkeep: 0, workers: 0, category: 'homes', needsRoad: false },
  well: { name: 'Well', w: 1, d: 1, cost: 30, upkeep: 3, workers: 0, category: 'services', needsRoad: true, provides: 'water', reach: 5 },
  farm_grain: {
    name: 'Grain farm', w: 2, d: 2, cost: 60, upkeep: 6, workers: 10, priority: 'essential', category: 'food',
    needsRoad: true, terrain: 'fertile', produces: { good: 'grain', perMonth: 30 }, producerReach: 12,
  },
  granary: {
    name: 'Granary', w: 2, d: 2, cost: 80, upkeep: 6, workers: 6, priority: 'essential', category: 'food',
    needsRoad: true, stores: ['grain', 'figs'], capacity: 600,
  },
  // stock: the most of each good a bazaar keeps (spec 4.10).
  bazaar: {
    name: 'Bazaar', w: 2, d: 2, cost: 60, upkeep: 8, workers: 6, priority: 'services', category: 'services',
    needsRoad: true, sells: [...FOOD_GOODS, ...HOUSEHOLD_GOODS], capacity: 300, reach: 10, supplyReach: 16,
    stock: { grain: 300, figs: 200, pottery: 100, beer: 100, linen: 100, jewellery: 100 },
  },
  temple: {
    name: 'Temple', w: 2, d: 2, cost: 120, upkeep: 10, workers: 6, priority: 'services', category: 'services',
    needsRoad: true, provides: 'religion', reach: 10,
  },
  // Stage 2 (spec 4.7, 4.10, 4.14, 4.15). Gardens and statues need no workers and no road.
  garden: { name: 'Garden', w: 1, d: 1, cost: 12, upkeep: 0, workers: 0, category: 'homes', needsRoad: false },
  statue: { name: 'Statue', w: 1, d: 1, cost: 60, upkeep: 0, workers: 0, category: 'homes', needsRoad: false },
  farm_fig: {
    name: 'Fig orchard', w: 2, d: 2, cost: 70, upkeep: 6, workers: 8, priority: 'essential', category: 'food',
    needsRoad: true, terrain: 'fertile', produces: { good: 'figs', perMonth: 24 }, producerReach: 12,
  },
  clay_pit: {
    name: 'Clay pit', w: 2, d: 2, cost: 50, upkeep: 5, workers: 6, priority: 'industry', category: 'industry',
    needsRoad: true, produces: { good: 'clay', perMonth: 40 }, producerReach: 12,
  },
  potter: {
    name: 'Potter', w: 2, d: 2, cost: 90, upkeep: 8, workers: 8, priority: 'industry', category: 'industry',
    needsRoad: true, produces: { good: 'pottery', perMonth: 30 }, consumes: 'clay', producerReach: 12,
  },
  storehouse: {
    name: 'Storehouse', w: 2, d: 2, cost: 70, upkeep: 5, workers: 6, priority: 'essential', category: 'industry',
    needsRoad: true, stores: [...HOUSEHOLD_GOODS, ...RAW_GOODS], capacity: 800,
  },
  booth: {
    name: 'Booth', w: 1, d: 1, cost: 50, upkeep: 4, workers: 4, priority: 'services', category: 'services',
    needsRoad: true, provides: 'entertainment', reach: 8, points: 10,
  },
  trading_post: {
    name: 'Trading post', w: 2, d: 2, cost: 150, upkeep: 10, workers: 6, priority: 'industry', category: 'industry',
    needsRoad: true,
  },
  farm_barley: {
    name: 'Barley farm', w: 2, d: 2, cost: 60, upkeep: 6, workers: 8, priority: 'industry', category: 'industry',
    needsRoad: true, terrain: 'fertile', produces: { good: 'barley', perMonth: 30 }, producerReach: 12,
  },
  brewery: {
    name: 'Brewery', w: 2, d: 2, cost: 100, upkeep: 8, workers: 8, priority: 'industry', category: 'industry',
    needsRoad: true, produces: { good: 'beer', perMonth: 25 }, consumes: 'barley', producerReach: 12,
  },
  farm_flax: {
    name: 'Flax farm', w: 2, d: 2, cost: 60, upkeep: 6, workers: 8, priority: 'industry', category: 'industry',
    needsRoad: true, terrain: 'fertile', produces: { good: 'flax', perMonth: 24 }, producerReach: 12,
  },
  weaver: {
    name: 'Weaver', w: 2, d: 2, cost: 110, upkeep: 8, workers: 8, priority: 'industry', category: 'industry',
    needsRoad: true, produces: { good: 'linen', perMonth: 20 }, consumes: 'flax', producerReach: 12,
  },
  gem_mine: {
    name: 'Gem mine', w: 2, d: 2, cost: 140, upkeep: 10, workers: 10, priority: 'industry', category: 'industry',
    needsRoad: true, terrain: 'rocky', produces: { good: 'gems', perMonth: 15 }, producerReach: 12,
  },
  jeweller: {
    name: 'Jeweller', w: 2, d: 2, cost: 140, upkeep: 10, workers: 8, priority: 'industry', category: 'industry',
    needsRoad: true, produces: { good: 'jewellery', perMonth: 15 }, consumes: 'gems', producerReach: 12,
  },
};
