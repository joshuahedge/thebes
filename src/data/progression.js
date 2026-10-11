// Milestones (spec 4.14) and the buildings each unlocks. Buildings of later stages (quarry, brickworks, the builders'
// guild, monuments) are listed only when their stage ships. Byblos, the second trade partner, opens at Great city
// through src/data/trade.js. Stage 3: the firehouse comes with the Village (fire risk itself starts at Town), and the
// wall (whose gates are walls drawn on roads), tower and barracks with Market town, where the raid clock starts.
export const MILESTONES = [
  { id: 'village', name: 'Village', population: 0, unlocks: ['house', 'well', 'farm_grain', 'granary', 'bazaar', 'temple', 'garden', 'firehouse'] },
  { id: 'town', name: 'Town', population: 150, unlocks: ['farm_fig', 'clay_pit', 'potter', 'storehouse', 'booth', 'statue'] },
  { id: 'market_town', name: 'Market town', population: 250, unlocks: ['trading_post', 'wall', 'tower', 'barracks'] },
  { id: 'city', name: 'City', population: 400, unlocks: ['farm_barley', 'brewery'] },
  { id: 'great_city', name: 'Great city', population: 650, unlocks: ['farm_flax', 'weaver'] },
  { id: 'capital', name: 'Capital', population: 1000, unlocks: ['gem_mine', 'jeweller'] },
];
