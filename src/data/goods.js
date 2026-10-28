import { S46_GOODS } from './s46.js';
import { V70_GOODS } from './v70.js';

// Goods (spec 4.10). kind: 'food' (homes eat it: grain from tier 3, figs as the second food from tier 7),
// (Stage 4.6: game and fish are foods too, and any two foods meet the second-food need.) 'household' (homes use it from the tier that needs it), 'raw' (only workshops use it), and from Stage 4 'material'
// (only monument sites use it: homes never want it and bazaars never sell it). perResidentPerMonth is what a home uses,
// rounded up per home; raw goods and materials have none.
export const GOODS = {
  grain: { name: 'Grain', kind: 'food', perResidentPerMonth: 0.25 },
  figs: { name: 'Figs', kind: 'food', perResidentPerMonth: 0.25 },
  pottery: { name: 'Pottery', kind: 'household', perResidentPerMonth: 0.05 },
  beer: { name: 'Beer', kind: 'household', perResidentPerMonth: 0.05 },
  linen: { name: 'Linen', kind: 'household', perResidentPerMonth: 0.04 },
  jewellery: { name: 'Jewellery', kind: 'household', perResidentPerMonth: 0.03 },
  clay: { name: 'Clay', kind: 'raw' },
  barley: { name: 'Barley', kind: 'raw' },
  flax: { name: 'Flax', kind: 'raw' },
  gems: { name: 'Gems', kind: 'raw' },
  // Stage 4 (spec 4.10, 4.16): quarries make stone, brickworks turn clay into bricks; storehouses keep both.
  stone: { name: 'Stone', kind: 'material' },
  bricks: { name: 'Bricks', kind: 'material' },
  // Stage 4.6: the River track's game and fish (src/data/river.js RIVER_GOODS), joined by src/data/s46.js.
  ...S46_GOODS,
  // Version 7.0: Track T's incense (src/data/trade.js TRADE_GOODS), joined by src/data/v70.js.
  ...V70_GOODS,
  // Version 8.4 (wave 0, ruling 1461): the luxuries Villas and Estates want, one of any kind (Track G). Raw goods, so storehouses keep them;
  // bought from partners (cedar from Byblos, ivory from Nubia) and ivory from a fallen war elephant (Track E). Incense, Punt's festival good
  // since 7.0, is one too (it keeps its place in GOODS order).
  incense: { ...V70_GOODS.incense, luxury: true, perResidentPerMonth: 0.01 },
  cedar: { name: 'Cedar', kind: 'raw', luxury: true, perResidentPerMonth: 0.01 },
  ivory: { name: 'Ivory', kind: 'raw', luxury: true, perResidentPerMonth: 0.01 },
};

const ofKind = (kind) => Object.keys(GOODS).filter((k) => GOODS[k].kind === kind);
export const FOOD_GOODS = ofKind('food');            // grain first: the food every home from tier 3 eats
// Stage 4.6 (Track 0): the order foods are named in, everywhere a list of foods is shown or counted (the River track's game and fish
// take the last two slots once RIVER_GOODS has them). FOOD_GOODS keeps the goods that exist, in GOODS order.
export const FOOD_SLOTS = ['grain', 'figs', 'game', 'fish'];
export const HOUSEHOLD_GOODS = ofKind('household');
export const RAW_GOODS = ofKind('raw');
export const MATERIAL_GOODS = ofKind('material');    // Stage 4: stone, bricks (src/data/monuments.js MATERIALS)
// Version 8.4 (ruling 1461): the luxuries, in GOODS order (incense, cedar, ivory).
export const LUXURY_GOODS = Object.keys(GOODS).filter((k) => GOODS[k].luxury);
// The goods the court's requests and the city's demands may name: household and raw goods less the two new in 8.4, which are bought, never made
// (ruling 1461). Incense stays askable as in 7.0, so no letter or demand of an 8.3 city changes.
export const ASKABLE_GOODS = [...HOUSEHOLD_GOODS, ...RAW_GOODS].filter((g) => g !== 'cedar' && g !== 'ivory');
