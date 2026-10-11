// Index = tier. Tier 0 is an empty plot.
// 'road' access is implied for every tier; needs lists the extra needs, cumulative (spec 4.6). Tiers 6-9 are 2x2
// (size 2: merged from four plots) and need desirability: at least `rise` to grow into the tier, `keep` to hold it.
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
    needs: ['water', 'food', 'religion', 'pottery', 'entertainment', 'beer', 'twoFoods', 'linen'], desirability: { rise: 50, keep: 43 },
  },
  {
    tier: 9, name: 'Estate', size: 2, capacity: 180, tax: 8,
    needs: ['water', 'food', 'religion', 'pottery', 'entertainment', 'beer', 'twoFoods', 'linen', 'jewellery'], desirability: { rise: 65, keep: 57 },
  },
];

export const MAX_TIER = TIERS.length - 1;
export const LEAVE_CAP = 0.25;              // most of a house's residents that can leave in one month
export const DOWNGRADE_AFTER_MONTHS = 2;    // consecutive unmet months before a house drops a tier
