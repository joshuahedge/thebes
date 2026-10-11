// Desirability (spec 4.7, tunable). Each building adds its values to the tiles around it by distance from the
// nearest tile of its footprint: index 0 is distance 1 (touching), up to distance 6. Values add where they overlap.
// Roads add nothing; housing adds HOUSE_DESIRABILITY by its tier instead.
const FARM = [-2, -1];
const WORKSHOP = [-4, -3, -2, -1];

export const DESIRABILITY = {
  garden: [3, 2, 1],
  statue: [8, 6, 4, 2],
  temple: [6, 6, 4, 4, 2, 2],
  booth: [3, 2, 1],
  bazaar: [-2, -1, 0, 1, 2, 3],
  well: [1],
  granary: [-8, -6, -4, -2],
  storehouse: [-6, -4, -2],
  farm_grain: FARM,
  farm_fig: FARM,
  farm_barley: FARM,
  farm_flax: FARM,
  clay_pit: [-6, -5, -4, -3, -2, -1],
  potter: WORKSHOP,
  brewery: WORKSHOP,
  weaver: WORKSHOP,
  jeweller: WORKSHOP,
  gem_mine: [-8, -6, -4, -2],
  trading_post: [-3, -2, -1],
};

// Index = tier, as TIERS: an empty plot adds nothing; Hut -2, -1; Shack -1; Cottage 0; House 1; Townhouse 1, 1;
// Manor 2, 2; Fine manor 3, 2, 1; Villa 4, 3, 2; Estate 5, 4, 3, 2.
export const HOUSE_DESIRABILITY = [
  [],
  [-2, -1],
  [-1],
  [0],
  [1],
  [1, 1],
  [2, 2],
  [3, 2, 1],
  [4, 3, 2],
  [5, 4, 3, 2],
];
