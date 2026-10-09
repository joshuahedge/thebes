// Index = tier. Tier 0 is an empty plot. Tiers 5–9 arrive in Stage 2.
// 'road' access is implied for every tier; needs lists the extra needs.
export const TIERS = [
  null,
  { tier: 1, name: 'Hut', size: 1, capacity: 5, tax: 1, needs: [] },
  { tier: 2, name: 'Shack', size: 1, capacity: 8, tax: 1, needs: ['water'] },
  { tier: 3, name: 'Cottage', size: 1, capacity: 12, tax: 2, needs: ['water', 'food'] },
  { tier: 4, name: 'House', size: 1, capacity: 16, tax: 2, needs: ['water', 'food', 'religion'] },
];

export const MAX_TIER = TIERS.length - 1;
export const LEAVE_CAP = 0.25;              // most of a house's residents that can leave in one month
export const DOWNGRADE_AFTER_MONTHS = 2;    // consecutive unmet months before a house drops a tier
