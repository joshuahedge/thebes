// Goods (spec 4.10). kind: 'food' (homes eat it: grain from tier 3, figs as the second food from tier 7),
// 'household' (homes use it from the tier that needs it), 'raw' (only workshops use it). perResidentPerMonth is
// what a home uses, rounded up per home; raw goods have none.
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
};

const ofKind = (kind) => Object.keys(GOODS).filter((k) => GOODS[k].kind === kind);
export const FOOD_GOODS = ofKind('food');            // grain first: the food every home from tier 3 eats
export const HOUSEHOLD_GOODS = ofKind('household');
export const RAW_GOODS = ofKind('raw');
