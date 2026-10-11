// Milestones (spec 4.14) and the buildings each unlocks. Buildings of later stages (defences, quarry, brickworks,
// the builders' guild, monuments) are listed only when their stage ships. Byblos, the second trade partner, opens
// at Great city through src/data/trade.js.
export const MILESTONES = [
  { id: 'village', name: 'Village', population: 0, unlocks: ['house', 'well', 'farm_grain', 'granary', 'bazaar', 'temple', 'garden'] },
  { id: 'town', name: 'Town', population: 150, unlocks: ['farm_fig', 'clay_pit', 'potter', 'storehouse', 'booth', 'statue'] },
  { id: 'market_town', name: 'Market town', population: 250, unlocks: ['trading_post'] },
  { id: 'city', name: 'City', population: 400, unlocks: ['farm_barley', 'brewery'] },
  { id: 'great_city', name: 'Great city', population: 650, unlocks: ['farm_flax', 'weaver'] },
  { id: 'capital', name: 'Capital', population: 1000, unlocks: ['gem_mine', 'jeweller'] },
];
