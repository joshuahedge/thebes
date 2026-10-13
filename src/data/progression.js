// Milestones (spec 4.14) and the buildings each unlocks. Byblos, the second trade partner, opens at Great city
// through src/data/trade.js. Stage 3: the firehouse comes with the Village (fire risk itself starts at Town), and the
// wall (whose gates are walls drawn on roads), tower and barracks with Market town, where the raid clock starts.
// Stage 4: the palace with Town; the builders' guild, quarry, brickworks, both obelisks and the plaza with City; the
// colossus, the small mastaba and the sphinx with Great city; the large mastaba with Capital. The two pyramids unlock by
// prestige as well (MONUMENTS[..].unlock, PRESTIGE_UNLOCKS in src/data/monuments.js), so they are in no list here.
export const MILESTONES = [
  { id: 'village', name: 'Village', population: 0, unlocks: ['house', 'well', 'farm_grain', 'granary', 'bazaar', 'temple', 'garden', 'firehouse'] },
  { id: 'town', name: 'Town', population: 150, unlocks: ['farm_fig', 'clay_pit', 'potter', 'storehouse', 'booth', 'statue', 'palace', 'physician'] },
  { id: 'market_town', name: 'Market town', population: 250, unlocks: ['trading_post', 'wall', 'tower', 'barracks', 'police_post'] },
  { id: 'city', name: 'City', population: 400, unlocks: ['farm_barley', 'brewery', 'builders_guild', 'quarry', 'brickworks', 'obelisk_small', 'obelisk_large', 'plaza'] },
  { id: 'great_city', name: 'Great city', population: 650, unlocks: ['farm_flax', 'weaver', 'colossus', 'mastaba_small', 'sphinx'] },
  { id: 'capital', name: 'Capital', population: 1000, unlocks: ['gem_mine', 'jeweller', 'mastaba_large'] },
];
