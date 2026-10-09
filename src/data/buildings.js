// w = footprint along x, d = footprint along y. reach values are in road tiles.
export const BUILDINGS = {
  house: { name: 'Housing plot', w: 1, d: 1, cost: 5, upkeep: 0, workers: 0, category: 'homes', needsRoad: false },
  well: { name: 'Well', w: 1, d: 1, cost: 30, upkeep: 3, workers: 0, category: 'services', needsRoad: true, provides: 'water', reach: 5 },
  farm_grain: {
    name: 'Grain farm', w: 2, d: 2, cost: 60, upkeep: 6, workers: 10, priority: 'essential', category: 'food',
    needsRoad: true, terrain: 'fertile', produces: { good: 'grain', perMonth: 30 }, producerReach: 12,
  },
  granary: {
    name: 'Granary', w: 2, d: 2, cost: 80, upkeep: 6, workers: 6, priority: 'essential', category: 'food',
    needsRoad: true, stores: ['grain'], capacity: 600,
  },
  bazaar: {
    name: 'Bazaar', w: 2, d: 2, cost: 60, upkeep: 8, workers: 6, priority: 'services', category: 'services',
    needsRoad: true, sells: ['grain'], capacity: 300, reach: 10, supplyReach: 16,
  },
  temple: {
    name: 'Temple', w: 2, d: 2, cost: 120, upkeep: 10, workers: 6, priority: 'services', category: 'services',
    needsRoad: true, provides: 'religion', reach: 10,
  },
};
