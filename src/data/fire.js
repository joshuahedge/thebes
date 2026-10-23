// Fire (spec 4.3, 4.12), all tunable. Risk is points towards THRESHOLD: each day a building that can burn adds its
// type's rate (a home's by its tier) times the difficulty's risk multiplier (riskOf in src/sim/costs.js) times the
// firehouse cut (1 - CUT x coverage). Every random draw is stateless: hash2(building id, day, seed + a SALT).
export const FIRE = {
  startsAt: 'town',          // risk builds up only once the city is a Town
  threshold: 100,            // risk at which a building can catch fire
  ignitionChance: 0.03,      // a day, once at the threshold
  cut: 0.8,                  // a fully staffed firehouse cuts build-up by 80% (scaled by coverage)
  staffedAt: 0.5,            // coverage that counts as staffed, for putting fires out
  blazeDays: 3,              // a blaze not put out within this many days grows into a fire
  putOutDays: [1, 2],        // covered, staffed days a blaze needs to be put out (seeded at ignition)
  fireDays: [10, 15],        // days a fire burns before the building burns down (seeded when it grows)
  spreadChance: 0.06,        // a day, to each burnable neighbour sharing an edge
  outChance: 0.25,           // a day a covered fire goes out, times coverage
  rubbleCost: 5,             // gold per rubble tile cleared, times the difficulty's cost (rubbleCostOf)
  reach: 8,                  // the firehouse's road reach (BUILDINGS.firehouse.reach; a data test keeps them equal)
};

// Salts for hash2(id or a, day or b, world.seed + SALT): one per kind of draw, so no two draws share a stream.
export const FIRE_SALT = { ignite: 7101, putOut: 7102, length: 7103, spread: 7104, out: 7105 };

// Risk per day by building type (spec 4.12). A type not listed never burns: roads, empty plots, gardens, statues,
// wells, walls, gates, towers and rubble, and from Stage 4 plazas, sphinxes, the palace and monuments (sites, their
// stockpiles and finished ones alike). Homes burn by their tier (HOUSE_RISK), so 'house' is not listed here.
const FARMS = 0.15;
export const FIRE_RISK = {
  potter: 1.0, brewery: 1.0,
  weaver: 0.5, jeweller: 0.5,
  granary: 0.5, storehouse: 0.5, trading_post: 0.5,
  bazaar: 0.3, booth: 0.3, barracks: 0.3,
  farm_grain: FARMS, farm_fig: FARMS, farm_barley: FARMS, farm_flax: FARMS, clay_pit: FARMS, gem_mine: FARMS,
  temple: 0.1, firehouse: 0.1,
  quarry: FARMS, brickworks: 1.0, builders_guild: 0.3,   // Stage 4: the quarry as the gem mine, the brickworks a kiln, the guild timber and rope
  hunting_lodge: 0.3, fishing_wharf: 0.3,                // Stage 4.6 (River track, ruling 365): reed, hides and planks burn as the booth and bazaar do; the Nilometer is stone
  quay: 0.3,                                             // Version 7.0 (Track T, ruling 871): bales and planks, as the wharf
  archery_range: 0.3, stables: 0.5,                      // Stage 4.6 (ruling 416): the range like the barracks (timber and bowstrings), the stables higher (hay and straw)
};

// Index = tier, as TIERS: an empty plot (0) never burns; hut and shack 0.3; cottage, house, townhouse 0.25; manor up 0.2.
export const HOUSE_RISK = [0, 0.3, 0.3, 0.25, 0.25, 0.25, 0.2, 0.2, 0.2, 0.2];

// The fire-risk overlay's bands (spec 4.12): where each starts. Low 0-24, Rising 25-59, High 60-99, Can catch fire 100+.
export const FIRE_BANDS = [0, 25, 60, 100];
export const FIRE_BAND_IDS = ['low', 'rising', 'high', 'catch'];
