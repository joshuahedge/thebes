import { FOOD_GOODS, HOUSEHOLD_GOODS, RAW_GOODS, MATERIAL_GOODS } from './goods.js';
import { MONUMENTS, MONUMENT_KINDS, MONUMENT } from './monuments.js';

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
    needsRoad: true, terrain: 'clay', produces: { good: 'clay', perMonth: 40 }, producerReach: 12,
  },
  potter: {
    name: 'Potter', w: 2, d: 2, cost: 90, upkeep: 8, workers: 8, priority: 'industry', category: 'industry',
    needsRoad: true, produces: { good: 'pottery', perMonth: 30 }, consumes: 'clay', producerReach: 12,
  },
  storehouse: {
    name: 'Storehouse', w: 2, d: 2, cost: 70, upkeep: 5, workers: 6, priority: 'essential', category: 'industry',
    needsRoad: true, stores: [...HOUSEHOLD_GOODS, ...RAW_GOODS, ...MATERIAL_GOODS], capacity: 800,
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
  // Stage 3 (spec 4.12, 4.13). The firehouse's reach is road tiles, as every service's; a tower's range and a barracks'
  // patrol are straight-line tiles (src/data/raids.js DEFENCE). Walls and gates are a tile layer (world.wall), never
  // buildings in world.buildings: their entries give the name, the cost per tile and the card; tile: true keeps them
  // out of place(). A gate is a wall drawn on a road, so it has no card of its own. Rubble is what a burned building
  // that is not a home leaves on each tile of its footprint: no card, no road, no upkeep, never burns.
  // buildable: false means no card, no milestone and no place().
  firehouse: {
    name: 'Firehouse', w: 1, d: 1, cost: 50, upkeep: 4, workers: 4, priority: 'safety', category: 'services',
    needsRoad: true, reach: 8,
  },
  // Stage 4.5 (rulings 318, 319): the physician covers homes against illness and the police post against thefts, by road reach, as the
  // firehouse covers fires (src/sim/health.js, crime.js; their reach is kept equal to HEALTH.reach and CRIME.reach by a data test).
  physician: {
    name: 'Physician', w: 1, d: 1, cost: 60, upkeep: 4, workers: 1, priority: 'safety', category: 'services',
    needsRoad: true, reach: 8,
  },
  police_post: {
    name: 'Police post', w: 1, d: 1, cost: 50, upkeep: 4, workers: 1, priority: 'safety', category: 'services',
    needsRoad: true, reach: 8,
  },
  tower: { name: 'Tower', w: 1, d: 1, cost: 150, upkeep: 8, workers: 4, priority: 'safety', category: 'defence', needsRoad: true },
  barracks: { name: 'Barracks', w: 2, d: 2, cost: 200, upkeep: 12, workers: 6, priority: 'safety', category: 'defence', needsRoad: true },
  wall: { name: 'Wall', w: 1, d: 1, cost: 8, upkeep: 0, workers: 0, category: 'defence', needsRoad: false, tile: true },
  gate: { name: 'Gate', w: 1, d: 1, cost: 20, upkeep: 0, workers: 0, category: null, needsRoad: false, tile: true, buildable: false },
  // Stage 4.5 (ruling 314): a bridge tile is a road tile on water; this row is its price (costOf(world, 'bridge')). Never placed as a building.
  bridge: { name: 'Bridge', w: 1, d: 1, cost: 25, upkeep: 0, workers: 0, category: null, needsRoad: false, tile: true, buildable: false },
  rubble: { name: 'Rubble', w: 1, d: 1, cost: 0, upkeep: 0, workers: 0, category: null, needsRoad: false, buildable: false },
  // Stage 4 (spec 4.7, 4.14, 4.16, 4.20). The supply buildings work at the monuments priority, last (spec 4.8), and idle
  // with no workers and no wages when no site needs them (Track A: src/sim/monuments.js, labour.js). The builders' guild's
  // reach is its crew's road reach. Plazas are painted like plots (paintPlazaTiles), one 1x1 building a tile; the sphinx
  // is placed singly like a statue. The palace (palace: true) is one per city (oneOnly) and is enlarged through
  // PALACE_STYLES (src/data/palace.js). The plaza, sphinx and palace need no workers and never burn.
  builders_guild: {
    name: "Builders' guild", w: 2, d: 2, cost: 150, upkeep: 10, workers: 16, priority: 'monuments', category: 'monuments',
    needsRoad: true, reach: MONUMENT.crewReach,
  },
  quarry: {
    name: 'Quarry', w: 2, d: 2, cost: 100, upkeep: 6, workers: 10, priority: 'monuments', category: 'monuments',
    needsRoad: true, terrain: 'rocky', produces: { good: 'stone', perMonth: 30 }, producerReach: MONUMENT.producerReach,
  },
  brickworks: {
    name: 'Brickworks', w: 2, d: 2, cost: 90, upkeep: 6, workers: 8, priority: 'monuments', category: 'monuments',
    needsRoad: true, produces: { good: 'bricks', perMonth: 30 }, consumes: 'clay', producerReach: MONUMENT.producerReach,
  },
  plaza: { name: 'Plaza', w: 1, d: 1, cost: 8, upkeep: 0, workers: 0, category: 'homes', needsRoad: false },
  sphinx: { name: 'Sphinx', w: 1, d: 1, cost: 150, upkeep: 0, workers: 0, category: 'homes', needsRoad: false },
  palace: { name: 'Palace', w: 3, d: 3, cost: 300, upkeep: 0, workers: 0, category: 'services', needsRoad: true, palace: true, oneOnly: true },
  // The seven monuments (src/data/monuments.js): cost is the founding; a site has no workers or upkeep of its own (its
  // crews are the guilds'); rotates: the mastabas turn a quarter while placing (place's { rot }).
  ...Object.fromEntries(MONUMENT_KINDS.map((k) => {
    const m = MONUMENTS[k];
    return [k, { name: m.name, w: m.w, d: m.d, cost: m.founding, upkeep: 0, workers: 0, category: 'monuments', needsRoad: true, monument: true, rotates: m.rotates }];
  })),
};

// The size a type takes with a rotation (spec 7.3, ruling 234): rot 1 swaps w and d for a type that rotates; anything
// else, or a type that does not rotate, is the data's own footprint (rot 0).
export function dimsOf(type, rot = 0) {
  const def = BUILDINGS[type];
  const turn = rot === 1 && Boolean(def.rotates);
  return { w: turn ? def.d : def.w, d: turn ? def.w : def.d, rot: turn ? 1 : 0 };
}

// The types a player can build (a card, a milestone, place() or a drawing tool): every type but gate and rubble.
export const BUILDABLE = Object.keys(BUILDINGS).filter((t) => BUILDINGS[t].buildable !== false);
