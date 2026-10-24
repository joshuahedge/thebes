// Desirability (spec 4.7, tunable). Each building adds its values to the tiles around it by distance from the
// nearest tile of its footprint: index 0 is distance 1 (touching), up to distance 6. Values add where they overlap.
// Roads add nothing; housing adds HOUSE_DESIRABILITY by its tier instead. From Stage 4 a monument's entry is its
// finished values (given with no road); a site under way gives SITE_DESIRABILITY instead (once a road touches it), and
// the palace its style's (PALACE_STYLES, while a road touches it): src/sim/desirability.js valuesOf reads them.
import { MONUMENTS, MONUMENT_KINDS } from './monuments.js';
import { PALACE_STYLES } from './palace.js';
import { S46_BUILDINGS } from './s46.js';

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
  ferry_landing: [-1],  // Version 7.1 (Track F, ruling 1042): a jetty and a ferryman's shed; a little noise, less than the quay
  quay: [-2, -1],       // Version 7.0 (Track T, ruling 871): bales, rope and porters, less than the trading post's yard
  // Stage 3 (spec 4.7). Rubble is 1x1, so each tile of a burned building's rubble counts on its own. Walls and gates
  // change nothing.
  firehouse: [-1],
  physician: [],        // Stage 4.5 (rulings 318, 319): neither pleasant nor unpleasant
  police_post: [],
  tower: [-2, -1],
  barracks: [-4, -2],
  rubble: [-3, -1],
  wall: [],
  gate: [],
  bridge: [],           // Stage 4.5 (ruling 314): a bridge tile changes nothing
  // Stage 4 (spec 4.7).
  builders_guild: WORKSHOP,
  quarry: [-6, -5, -4, -3, -2, -1],
  brickworks: WORKSHOP,
  plaza: [2, 1],
  sphinx: [10, 8, 6, 4, 2],
  palace: PALACE_STYLES[0].desirability,
  ...Object.fromEntries(MONUMENT_KINDS.map((k) => [k, MONUMENTS[k].desirability])),
  // Stage 4.6 (ruling 389): a track building's row carries its own values (desirability), [] when it has none.
  ...Object.fromEntries(Object.entries(S46_BUILDINGS).map(([t, b]) => [t, b.desirability || []])),
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
