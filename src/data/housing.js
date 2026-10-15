// Index = tier. Tier 0 is an empty plot.
// 'road' access is implied for every tier; needs lists the extra needs, cumulative (spec 4.6). Tiers 6-9 are 2x2
// (size 2: merged from four plots) and need desirability: at least `rise` to grow into the tier, `keep` to hold it.
// Stage 4.7 (Task 7, ruling 471): the top two tiers are tougher. They ask for a third kind of food (threeFoods: any three of grain, figs, game,
// fish in stock) and use more of each household good: `use` multiplies GOODS[good].perResidentPerMonth for pottery, beer, linen and jewellery
// (src/sim/distribution.js monthlyNeed; 1 where absent). A home that loses one devolves by the usual rule (DOWNGRADE_AFTER_MONTHS, a tier at a time).
export const TIERS = [
  null,
  { tier: 1, name: 'Hut', size: 1, capacity: 5, tax: 1, needs: [] },
  { tier: 2, name: 'Shack', size: 1, capacity: 8, tax: 1, needs: ['water'] },
  { tier: 3, name: 'Cottage', size: 1, capacity: 12, tax: 2, needs: ['water', 'food'] },
  { tier: 4, name: 'House', size: 1, capacity: 16, tax: 2, needs: ['water', 'food', 'religion'] },
  { tier: 5, name: 'Townhouse', size: 1, capacity: 22, tax: 3, needs: ['water', 'food', 'religion', 'pottery'] },
  {
    tier: 6, name: 'Manor', size: 2, capacity: 100, tax: 4,
    needs: ['water', 'food', 'religion', 'pottery', 'entertainment'], desirability: { rise: 20, keep: 15 },
  },
  {
    tier: 7, name: 'Fine manor', size: 2, capacity: 125, tax: 5,
    needs: ['water', 'food', 'religion', 'pottery', 'entertainment', 'beer', 'twoFoods'], desirability: { rise: 35, keep: 29 },
  },
  {
    tier: 8, name: 'Villa', size: 2, capacity: 150, tax: 6,
    needs: ['water', 'food', 'religion', 'pottery', 'entertainment', 'beer', 'twoFoods', 'linen', 'threeFoods'], desirability: { rise: 50, keep: 43 }, use: 1.5,
  },
  {
    tier: 9, name: 'Estate', size: 2, capacity: 180, tax: 8,
    needs: ['water', 'food', 'religion', 'pottery', 'entertainment', 'beer', 'twoFoods', 'linen', 'threeFoods', 'jewellery'], desirability: { rise: 65, keep: 57 }, use: 2,
  },
];

export const MAX_TIER = TIERS.length - 1;
// How much more of each household good a resident of this tier uses (ruling 471): TIERS[tier].use, else 1.
export const useOf = (tier) => (tier >= 1 && tier <= MAX_TIER && TIERS[tier].use) || 1;
export const LEAVE_CAP = 0.25;              // most of a house's residents that can leave in one month
export const DOWNGRADE_AFTER_MONTHS = 2;    // consecutive unmet months before a house drops a tier
